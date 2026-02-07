// controllers/order.controller.ts
import { Response } from 'express';
import { AuthRequest, ApiResponse, OrderStatus, PaymentStatus, PaymentMethod, TransactionType, WalletPurpose } from '../types';
import { VendorGroup, VendorDeliveryRate, DeliveryRateResponse } from '../types/shipping.types';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';
import User from '../models/User';
import VendorProfile from '../models/VendorProfile';
import { Wallet } from '../models/Additional';
import { AppError } from '../middleware/error';
import { generateOrderNumber } from '../utils/helpers';
import { paystackService } from '../services/paystack.service';
import { shipBubbleService } from '../services/shipbubble.service';
import { sendOrderConfirmationEmail } from '../utils/email';
import { logger } from '../utils/logger';

export class OrderController {
  /**
   * Check if cart contains digital products
   */
  private hasDigitalProducts(items: any[]): boolean {
    return items.some((item: any) => {
      const productType = item.product.productType?.toUpperCase();
      return productType === 'DIGITAL' || productType === 'SERVICE';
    });
  }

  /**
   * Check if cart contains ONLY digital products
   */
  private isDigitalOnly(items: any[]): boolean {
    return items.every((item: any) => {
      const productType = item.product.productType?.toUpperCase();
      return productType === 'DIGITAL' || productType === 'SERVICE';
    });
  }

  /**
   * Validate payment method for cart contents
   */
  private validatePaymentMethod(
    items: any[],
    paymentMethod: PaymentMethod,
    deliveryType: string
  ): void {
    const hasDigital = this.hasDigitalProducts(items);
    const isDigitalOnly = this.isDigitalOnly(items);

    logger.info('📦 Payment validation:', {
      hasDigital,
      isDigitalOnly,
      paymentMethod,
      deliveryType,
    });

    // Digital products cannot use Cash on Delivery
    if (hasDigital && paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
      throw new AppError(
        'Cash on Delivery is not available for digital products. Please use Card Payment or Wallet.',
        400
      );
    }

    // Digital-only orders should use pickup/digital delivery
    if (isDigitalOnly && deliveryType !== 'pickup' && deliveryType !== 'digital') {
      logger.warn('Digital-only order with non-digital delivery type, auto-correcting');
    }
  }

  /**
   * Get delivery rates
   */
  async getDeliveryRates(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { city, state, street, fullName, phone } = req.query;

    if (!city || !state) {
      throw new AppError('City and state are required', 400);
    }

    try {
      logger.info('📦 Delivery rates request:', {
        city,
        state,
        street: street || 'Not provided',
        userId: req.user?.id,
      });

      // Get user's cart
      const cart = await Cart.findOne({ 
        user: req.user?.id 
      }).populate({
        path: 'items.product',
        populate: {
          path: 'vendor',
          select: 'firstName lastName',
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError('Cart is empty', 400);
      }

      // Check if cart is digital-only
      const isDigitalOnly = this.isDigitalOnly(cart.items);
      
      if (isDigitalOnly) {
        logger.info('📦 Digital-only cart - no delivery rates needed');
        res.json({
          success: true,
          data: { 
            rates: [{
              type: 'digital',
              name: 'Digital Delivery',
              description: 'Instant access after payment',
              price: 0,
              estimatedDays: 'Instant',
              courier: 'Digital',
            }],
            vendorCount: 0,
            multiVendor: false,
            source: 'digital',
            isDigitalOnly: true,
          },
        });
        return;
      }

      // Group items by vendor
      const vendorGroups = await this.groupItemsByVendor(cart.items);

      logger.info(`📦 Processing delivery rates for ${vendorGroups.length} vendor(s)`);

      const rates: DeliveryRateResponse[] = [];

      // Add pickup option
      const allVendorsSupportPickup = this.checkPickupAvailability(vendorGroups);
      
      if (allVendorsSupportPickup) {
        rates.push({
          type: 'pickup',
          name: 'Store Pickup',
          description: vendorGroups.length > 1 
            ? `Pickup from ${vendorGroups.length} different vendor locations`
            : 'Pickup from vendor location',
          price: 0,
          estimatedDays: 'Available immediately',
          courier: 'Self Pickup',
          pickupAddress: vendorGroups.length === 1 
            ? `${vendorGroups[0].vendorAddress.city}, ${vendorGroups[0].vendorAddress.state}`
            : 'Multiple locations',
        });
      }

      // Create destination address object
      const destinationAddress = {
        street: (street as string) || `${city} Area`,
        city: city as string,
        state: state as string,
        fullName: (fullName as string) || 'Customer',
        phone: (phone as string) || '+2348000000000',
      };

      // Calculate shipping rates
      let shipBubbleSuccess = false;
      const vendorRates = await Promise.all(
        vendorGroups.map(async (group) => {
          const result = await this.getVendorDeliveryRates(
            group, 
            destinationAddress
          );
          if (result.success) {
            shipBubbleSuccess = true;
          }
          return result;
        })
      );

      // Aggregate rates
      const aggregatedRates = this.aggregateVendorRates(vendorRates);
      rates.push(...aggregatedRates);

      // Use fallback if all ShipBubble calls failed
      if (!shipBubbleSuccess && rates.filter(r => r.type !== 'pickup').length === 0) {
        logger.warn('⚠️ All ShipBubble requests failed - Using fallback rates');
        rates.push(...this.getFallbackRates());
      }

      logger.info(`✅ Returning ${rates.length} delivery options (ShipBubble: ${shipBubbleSuccess ? 'SUCCESS' : 'FAILED'})`);

      res.json({
        success: true,
        data: { 
          rates,
          vendorCount: vendorGroups.length,
          multiVendor: vendorGroups.length > 1,
          source: shipBubbleSuccess ? 'shipbubble' : 'fallback',
        },
      });
    } catch (error: any) {
      logger.error('❌ Critical error in getDeliveryRates:', error);
      throw new AppError('Failed to get delivery rates', 500);
    }
  }

  private async getVendorDeliveryRates(
    vendorGroup: VendorGroup,
    destination: {
      street: string;
      city: string;
      state: string;
      fullName: string;
      phone: string;
    }
  ): Promise<VendorDeliveryRate> {
    const result: VendorDeliveryRate = {
      vendorId: vendorGroup.vendorId,
      vendorName: vendorGroup.vendorName,
      rates: [],
      success: false,
    };

    // Skip shipping for digital products
    const physicalItems = vendorGroup.items.filter(item => item.isPhysical);
    
    logger.info(`📦 Vendor ${vendorGroup.vendorName} items breakdown:`, {
      totalItems: vendorGroup.items.length,
      physicalItems: physicalItems.length,
      digitalItems: vendorGroup.items.length - physicalItems.length,
    });
    
    if (physicalItems.length === 0) {
      logger.info(`✅ Vendor ${vendorGroup.vendorName} has only digital products`);
      result.success = true;
      result.rates.push({
        type: 'digital',
        name: 'Digital Delivery',
        description: 'Instant download/access',
        price: 0,
        estimatedDays: 'Instant',
        courier: 'Digital',
      });
      return result;
    }

    try {
      logger.info(`📦 Getting shipping rates for ${vendorGroup.vendorName}`);

      const vendorProfile = await VendorProfile.findOne({ user: vendorGroup.vendorId });
      const vendor = await User.findById(vendorGroup.vendorId);

      const hasValidAddress = vendorProfile?.businessAddress && 
                             vendorProfile.businessAddress.street && 
                             vendorProfile.businessAddress.street.trim().length > 5 &&
                             vendorProfile.businessAddress.street !== '123 Main Street' &&
                             vendorProfile.businessAddress.city &&
                             vendorProfile.businessAddress.state;

      if (!hasValidAddress) {
        logger.warn(`⚠️ Vendor ${vendorGroup.vendorName} has invalid address - using fallback`);
        result.rates.push(...this.getVendorFallbackRates());
        return result;
      }

      const senderFullAddress = `${vendorProfile.businessAddress.street}, ${vendorProfile.businessAddress.city}, ${vendorProfile.businessAddress.state}, ${vendorProfile.businessAddress.country || 'Nigeria'}`;
      const receiverFullAddress = `${destination.street}, ${destination.city}, ${destination.state}, Nigeria`;

      const senderAddress = {
        name: vendorGroup.vendorName,
        phone: vendorProfile.businessPhone || vendor?.phone || '+2348000000000',
        email: vendorProfile.businessEmail || vendor?.email || 'sender@vendorspot.com',
        address: senderFullAddress,
      };

      const receiverAddress = {
        name: destination.fullName,
        phone: destination.phone,
        email: 'customer@vendorspot.com',
        address: receiverFullAddress,
      };

      logger.info('📦 ShipBubble addresses (COMPLETE):', {
        sender: {
          name: senderAddress.name,
          address: senderAddress.address,
        },
        receiver: {
          name: receiverAddress.name,
          address: receiverAddress.address,
        },
      });

      const packageItems = physicalItems.map(item => ({
        name: item.productName,
        description: item.productName,
        unit_weight: item.weight.toString(),
        unit_amount: item.price.toString(),
        quantity: item.quantity.toString(),
      }));

      const ratesResponse = await shipBubbleService.getDeliveryRates(
        senderAddress,
        receiverAddress,
        packageItems
      );

      if (ratesResponse.status === 'success' && ratesResponse.data?.couriers) {
        logger.info(`✅ Got ${ratesResponse.data.couriers.length} courier options from ShipBubble`);

        ratesResponse.data.couriers.forEach((courier: any) => {
          result.rates.push({
            type: courier.service_type === 'pickup' ? 'standard' : 'express',
            name: courier.courier_name,
            description: `${courier.service_type} - ${courier.delivery_eta}`,
            price: courier.total || courier.rate_card_amount,
            estimatedDays: courier.delivery_eta || 'Within 3-5 days',
            courier: courier.courier_name,
            logo: courier.courier_image,
          });
        });

        (result as any).requestToken = ratesResponse.data.request_token;
        result.success = true;
      } else {
        logger.warn(`⚠️ No courier data from ShipBubble`);
      }

      if (result.rates.length === 0) {
        logger.warn(`⚠️ Using fallback rates`);
        result.rates.push(...this.getVendorFallbackRates());
      }

    } catch (error: any) {
      logger.error(`❌ Error getting rates:`, error.message);
      result.rates.push(...this.getVendorFallbackRates());
    }

    return result;
  }

  private async groupItemsByVendor(items: any[]): Promise<VendorGroup[]> {
    const groups = new Map<string, VendorGroup>();

    for (const item of items) {
      const product = item.product;
      const vendorId = product.vendor._id.toString();

      if (!groups.has(vendorId)) {
        const vendorProfile = await VendorProfile.findOne({ user: vendorId });
        
        let vendorAddress = {
          street: '',
          city: process.env.SHIPBUBBLE_SENDER_CITY || '',
          state: process.env.SHIPBUBBLE_SENDER_STATE || '',
          country: process.env.SHIPBUBBLE_SENDER_COUNTRY || 'Nigeria',
        };

        if (vendorProfile && vendorProfile.businessAddress) {
          vendorAddress = {
            street: vendorProfile.businessAddress.street || '',
            city: vendorProfile.businessAddress.city,
            state: vendorProfile.businessAddress.state,
            country: vendorProfile.businessAddress.country,
          };
        }

        const vendorName = vendorProfile?.businessName || 
                          `${product.vendor.firstName} ${product.vendor.lastName}`;

        groups.set(vendorId, {
          vendorId,
          vendorName,
          vendorAddress,
          items: [],
          totalWeight: 0,
        });
      }

      const group = groups.get(vendorId)!;
      
      const productType = product.productType?.toUpperCase();
      const isPhysical = 
        productType === 'PHYSICAL' || 
        (!productType || (productType !== 'DIGITAL' && productType !== 'SERVICE'));
      
      const weight = product.weight || 1;

      group.items.push({
        productId: product._id.toString(),
        productName: product.name,
        quantity: item.quantity,
        weight: weight,
        isPhysical: isPhysical,
        price: item.price,
      });
      
      if (isPhysical) {
        group.totalWeight += weight * item.quantity;
      }
    }

    return Array.from(groups.values());
  }

  private checkPickupAvailability(vendorGroups: VendorGroup[]): boolean {
    return true;
  }

  private aggregateVendorRates(vendorRates: VendorDeliveryRate[]): DeliveryRateResponse[] {
    const aggregated = new Map<string, DeliveryRateResponse>();

    vendorRates.forEach(vendorRate => {
      const ratesByType = new Map<string, any>();
      
      vendorRate.rates.forEach(rate => {
        if (rate.type === 'digital') return;
        
        const existing = ratesByType.get(rate.type);
        
        if (!existing || rate.price < existing.price) {
          ratesByType.set(rate.type, rate);
        }
      });

      ratesByType.forEach((rate, type) => {
        if (!aggregated.has(type)) {
          aggregated.set(type, {
            type: rate.type,
            name: rate.name,
            description: rate.description,
            price: 0,
            estimatedDays: rate.estimatedDays,
            courier: vendorRates.length > 1 ? 'Multiple Couriers' : rate.courier,
            vendorBreakdown: [],
          });
        }

        const agg = aggregated.get(type)!;
        
        agg.price += rate.price;
        
        agg.vendorBreakdown!.push({
          vendorId: vendorRate.vendorId,
          vendorName: vendorRate.vendorName,
          price: rate.price,
          courier: rate.courier,
        });

        if (this.compareEstimatedDays(rate.estimatedDays, agg.estimatedDays) > 0) {
          agg.estimatedDays = rate.estimatedDays;
        }
      });
    });

    return Array.from(aggregated.values());
  }

  private compareEstimatedDays(days1: string, days2: string): number {
    const extract = (str: string): number => {
      const match = str.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    return extract(days1) - extract(days2);
  }

  /**
   * Create order from cart - WITH DIGITAL PRODUCTS SUPPORT
   */
  async createOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
     const { 
    shippingAddress, 
    paymentMethod, 
    notes, 
    deliveryType = 'standard',
    selectedDeliveryPrice,    // ✅ NEW - actual price from checkout
    selectedCourier,          // ✅ NEW - courier name from checkout
    vendorBreakdown,          // ✅ NEW - breakdown for multi-vendor orders
  } = req.body;

    logger.info('🛒 ============================================');
    logger.info('🛒 CREATE ORDER STARTED');
    logger.info('🛒 ============================================');
    logger.info('📋 Order request:', {
      userId: req.user?.id,
      paymentMethod,
      deliveryType,
      hasShippingAddress: !!shippingAddress,
    });

    const cart = await Cart.findOne({ user: req.user?.id }).populate({
      path: 'items.product',
      populate: {
        path: 'vendor',
        select: 'firstName lastName email phone',
      },
    });
    
    if (!cart || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    // ✅ VALIDATE PAYMENT METHOD FOR CART CONTENTS
    this.validatePaymentMethod(cart.items, paymentMethod, deliveryType);

    // Validate products
    for (const item of cart.items) {
      const product: any = item.product;
      
      if (!product || product.status !== 'active') {
        throw new AppError(`Product ${product?.name || 'Unknown'} is not available`, 400);
      }

      // Check stock for physical products only
      const productType = product.productType?.toUpperCase();
      const isPhysical = productType !== 'DIGITAL' && productType !== 'SERVICE';
      
      if (isPhysical && product.quantity < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${product.name}. Only ${product.quantity} available`,
          400
        );
      }
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const vendorGroups = await this.groupItemsByVendor(cart.items);
    const isDigitalOnly = this.isDigitalOnly(cart.items);

    logger.info(`📦 Creating order with ${vendorGroups.length} vendor(s)`, {
      isDigitalOnly,
      paymentMethod,
      deliveryType,
    });

    const orderItems = cart.items.map((item: any) => ({
      product: item.product._id,
      productName: item.product.name,
      productImage: item.product.images[0],
      productType: item.product.productType || 'physical',
      variant: item.variant,
      quantity: item.quantity,
      price: item.price,
      vendor: item.product.vendor._id,
    }));


    // Calculate shipping (skip for digital-only)
  let totalShippingCost = 0;
  const vendorShipments = [];

  if (!isDigitalOnly && deliveryType !== 'pickup') {
    logger.info('📦 Calculating shipping costs...');
    
    // ✅ USE SELECTED PRICE FROM CHECKOUT
    if (selectedDeliveryPrice !== undefined && selectedDeliveryPrice !== null) {
      logger.info('✅ Using selected delivery price from checkout:', selectedDeliveryPrice);
      
      // ✅ FOR MULTI-VENDOR ORDERS WITH BREAKDOWN
      if (vendorBreakdown && vendorBreakdown.length > 0) {
        logger.info('📦 Multi-vendor order - using vendor breakdown');
        
        for (const group of vendorGroups) {
          const physicalItems = group.items.filter(item => item.isPhysical);
          if (physicalItems.length === 0) {
            logger.info(`⏭️ Skipping ${group.vendorName} - no physical items`);
            continue;
          }

          // Find this vendor's shipping cost from breakdown
          const vendorShipping = vendorBreakdown.find(
            (v: any) => v.vendorId === group.vendorId
          );
          
          const shippingCost = vendorShipping?.price || this.getDefaultRate(deliveryType);
          totalShippingCost += shippingCost;

          vendorShipments.push({
            vendor: group.vendorId,
            vendorName: group.vendorName,
            items: group.items.map(item => item.productId),
            origin: {
              street: group.vendorAddress.street || '',
              city: group.vendorAddress.city,
              state: group.vendorAddress.state,
              country: group.vendorAddress.country,
            },
            shippingCost: shippingCost,  // ✅ REAL PRICE from breakdown
            courier: vendorShipping?.courier || selectedCourier,
            status: 'pending',
          });

          logger.info(`✅ Shipping for ${group.vendorName}: ₦${shippingCost} (${vendorShipping?.courier || selectedCourier})`);
        }
      } 
      // ✅ FOR SINGLE-VENDOR ORDERS
      else {
        logger.info('📦 Single vendor order - using total price');
        
        totalShippingCost = selectedDeliveryPrice;
        
        for (const group of vendorGroups) {
          const physicalItems = group.items.filter(item => item.isPhysical);
          if (physicalItems.length === 0) {
            logger.info(`⏭️ Skipping ${group.vendorName} - no physical items`);
            continue;
          }

          vendorShipments.push({
            vendor: group.vendorId,
            vendorName: group.vendorName,
            items: group.items.map(item => item.productId),
            origin: {
              street: group.vendorAddress.street || '',
              city: group.vendorAddress.city,
              state: group.vendorAddress.state,
              country: group.vendorAddress.country,
            },
            shippingCost: selectedDeliveryPrice,  // ✅ REAL PRICE
            courier: selectedCourier,
            status: 'pending',
          });

          logger.info(`✅ Shipping for ${group.vendorName}: ₦${selectedDeliveryPrice} (${selectedCourier})`);
        }
      }
    } 
    // ✅ FALLBACK ONLY IF NO PRICE PROVIDED
    else {
      logger.warn('⚠️ No delivery price provided - using fallback rates');
      
      for (const group of vendorGroups) {
        const physicalItems = group.items.filter(item => item.isPhysical);
        if (physicalItems.length === 0) {
          logger.info(`⏭️ Skipping ${group.vendorName} - no physical items`);
          continue;
        }

        const fallbackCost = this.getDefaultRate(deliveryType);
        totalShippingCost += fallbackCost;

        vendorShipments.push({
          vendor: group.vendorId,
          vendorName: group.vendorName,
          items: group.items.map(item => item.productId),
          origin: {
            street: group.vendorAddress.street || '',
            city: group.vendorAddress.city,
            state: group.vendorAddress.state,
            country: group.vendorAddress.country,
          },
          shippingCost: fallbackCost,
          courier: selectedCourier || 'Standard Courier',
          status: 'pending',
        });

        logger.info(`⚠️ Using fallback for ${group.vendorName}: ₦${fallbackCost}`);
      }
    }
    
    logger.info(`💰 Total shipping cost: ₦${totalShippingCost}`);
  }
    const subtotal = cart.subtotal;
    const discount = cart.discount;
    const tax = 0;
    const total = subtotal - discount + totalShippingCost + tax;

    const orderNumber = generateOrderNumber();

    logger.info('💾 Creating order document...', { orderNumber });

    const order = await Order.create({
      orderNumber,
      user: req.user?.id,
      items: orderItems,
      subtotal,
      discount,
      shippingCost: totalShippingCost,
      tax,
      total,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod,
      shippingAddress: isDigitalOnly ? undefined : shippingAddress,
      couponCode: cart.couponCode,
      notes,
      deliveryType: isDigitalOnly ? 'digital' : deliveryType,
      isPickup: deliveryType === 'pickup' || isDigitalOnly,
      vendorShipments,
      isDigital: isDigitalOnly,
    });

    logger.info(`✅ Order created: ${order._id}`);

    let paymentData = null;

    if (paymentMethod === PaymentMethod.PAYSTACK) {
      logger.info('💳 Initializing Paystack payment...');
      
      try {
        const paystackResponse = await paystackService.initializePayment({
          email: user.email,
          amount: total * 100,
          reference: orderNumber,
          callback_url: `${process.env.FRONTEND_URL}/orders/${orderNumber}/payment-callback`,
          metadata: {
            orderId: order._id.toString(),
            orderNumber,
            userId: user._id.toString(),
            isDigital: isDigitalOnly,
          },
        });

        order.paymentReference = orderNumber;
        await order.save();

        paymentData = {
          authorization_url: paystackResponse.data.authorization_url,
          access_code: paystackResponse.data.access_code,
          reference: orderNumber,
        };
        
        logger.info('✅ Paystack payment initialized');
      } catch (error) {
        logger.error('❌ Paystack initialization failed:', error);
        order.status = OrderStatus.FAILED;
        order.paymentStatus = PaymentStatus.FAILED;
        await order.save();
        
        throw new AppError('Failed to initialize payment', 500);
      }
    } else if (paymentMethod === PaymentMethod.WALLET) {
      logger.info('💰 Processing wallet payment...');
      
      const wallet = await Wallet.findOne({ user: req.user?.id });
      
      if (!wallet || wallet.balance < total) {
        throw new AppError('Insufficient wallet balance', 400);
      }

      wallet.balance -= total;
      wallet.totalSpent += total;
      wallet.transactions.push({
        type: TransactionType.DEBIT,
        amount: total,
        purpose: WalletPurpose.PURCHASE,
        reference: orderNumber,
        description: `Payment for order ${orderNumber}`,
        relatedOrder: order._id,
        status: 'completed',
        timestamp: new Date(),
      } as any);
      await wallet.save();

      order.paymentStatus = PaymentStatus.COMPLETED;
      order.status = isDigitalOnly ? OrderStatus.DELIVERED : OrderStatus.CONFIRMED;
      await order.save();

      logger.info('✅ Wallet payment completed');

      // ✅ For digital products, instant delivery
      if (isDigitalOnly) {
        logger.info(`✅ Digital order completed instantly: ${orderNumber}`);
      }

      // ✅ AWARD POINTS AFTER WALLET PAYMENT
      try {
        const { rewardController } = await import('./reward.controller');
        await rewardController.awardOrderPoints(order._id.toString());
        logger.info(`✅ Points awarded for order ${orderNumber}`);
      } catch (error) {
        logger.error('Error awarding points:', error);
      }

      // Create ShipBubble shipments for physical products
      if (!isDigitalOnly && deliveryType !== 'pickup') {
        logger.info('🚚 Creating ShipBubble shipments after wallet payment...');
        try {
          await this.createVendorShipments(order, user, vendorGroups, deliveryType);
        } catch (error) {
          logger.error('Error creating ShipBubble shipments:', error);
        }
      }
    } else if (paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
      logger.info('💵 Cash on delivery order created');
      order.status = OrderStatus.CONFIRMED;
      await order.save();
    }

    // Clear cart
    cart.items = [];
    cart.couponCode = undefined;
    cart.discount = 0;
    await cart.save();

    logger.info('🛒 Cart cleared');

    // Update coupon usage
    if (order.couponCode) {
      const { Coupon } = await import('../models/Additional');
      await Coupon.findOneAndUpdate(
        { code: order.couponCode },
        {
          $inc: { usageCount: 1 },
          $push: { usedBy: user._id },
        }
      );
      logger.info(`🎟️ Coupon usage updated: ${order.couponCode}`);
    }

    // ✅ Update product sales
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 
          totalSales: item.quantity,
        },
      });
    }

    logger.info('📊 Product sales updated');
    logger.info('🛒 ============================================');
    logger.info('🛒 CREATE ORDER COMPLETED');
    logger.info('🛒 ============================================');

    res.status(201).json({
      success: true,
      message: isDigitalOnly 
        ? 'Digital order created - awaiting payment' 
        : 'Order created successfully',
      data: {
        order,
        payment: paymentData,
        vendorCount: vendorGroups.length,
        multiVendor: vendorGroups.length > 1,
        isDigital: isDigitalOnly,
      },
    });
  }

  /**
   * Create vendor shipments with ShipBubble
   */
  private async createVendorShipments(
    order: any,
    user: any,
    vendorGroups: VendorGroup[],
    deliveryType: string
  ) {
    logger.info('🚚 ============================================');
    logger.info('🚚 CREATE VENDOR SHIPMENTS STARTED');
    logger.info('🚚 ============================================');
    logger.info('📋 Shipment info:', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      vendorCount: vendorGroups.length,
      deliveryType,
    });

    for (let i = 0; i < vendorGroups.length; i++) {
      const group = vendorGroups[i];
      
      logger.info(`\n📦 -------- Vendor ${i + 1}/${vendorGroups.length} --------`);
      logger.info(`📦 Vendor: ${group.vendorName} (${group.vendorId})`);

      const physicalItems = group.items.filter(item => item.isPhysical);
      
      if (physicalItems.length === 0) {
        logger.info(`⏭️ Skipping ${group.vendorName} - no physical items`);
        continue;
      }

      logger.info(`📦 Physical items: ${physicalItems.length}/${group.items.length}`);

      try {
        const vendor = await User.findById(group.vendorId);
        const vendorProfile = await VendorProfile.findOne({ user: group.vendorId });
        
        if (!vendor) {
          logger.warn(`⚠️ Vendor user not found: ${group.vendorId}`);
          continue;
        }

        logger.info('👤 Vendor details:', {
          name: `${vendor.firstName} ${vendor.lastName}`,
          email: vendor.email,
          phone: vendor.phone,
        });

        logger.info('🏢 Vendor profile:', {
          hasProfile: !!vendorProfile,
          businessName: vendorProfile?.businessName,
          businessAddress: vendorProfile?.businessAddress,
        });

        // Build addresses
        const senderFullAddress = `${group.vendorAddress.street || 'Store Address'}, ${group.vendorAddress.city}, ${group.vendorAddress.state}, ${group.vendorAddress.country}`;
        const receiverFullAddress = `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.country || 'Nigeria'}`;

        const senderAddress = {
          name: group.vendorName,
          phone: vendorProfile?.businessPhone || vendor.phone || '+2348000000000',
          email: vendorProfile?.businessEmail || vendor.email || 'sender@store.com',
          address: senderFullAddress,
        };

        const receiverAddress = {
          name: order.shippingAddress.fullName || `${user.firstName} ${user.lastName}`,
          phone: order.shippingAddress.phone || user.phone || '+2348000000000',
          email: user.email,
          address: receiverFullAddress,
        };

        logger.info('📍 SENDER ADDRESS:', {
          name: senderAddress.name,
          phone: senderAddress.phone,
          email: senderAddress.email,
          address: senderAddress.address,
        });

        logger.info('📍 RECEIVER ADDRESS:', {
          name: receiverAddress.name,
          phone: receiverAddress.phone,
          email: receiverAddress.email,
          address: receiverAddress.address,
        });

        const packageItems = physicalItems.map((item: any) => ({
          name: item.productName,
          description: item.productName,
          unit_weight: item.weight.toString(),
          unit_amount: item.price.toString(),
          quantity: item.quantity.toString(),
        }));

        logger.info('📦 Package items:', packageItems);

        // Step 1: Get delivery rates
        logger.info('🔍 Fetching delivery rates from ShipBubble...');
        
        const ratesResponse = await shipBubbleService.getDeliveryRates(
          senderAddress,
          receiverAddress,
          packageItems
        );

        logger.info('📊 Rates response:', {
          status: ratesResponse.status,
          message: ratesResponse.message,
          hasData: !!ratesResponse.data,
          requestToken: ratesResponse.data?.request_token,
          courierCount: ratesResponse.data?.couriers?.length || 0,
        });

        if (ratesResponse.status === 'success' && ratesResponse.data?.request_token) {
          logger.info('✅ Delivery rates fetched successfully');

          // Select courier based on delivery type
          let selectedCourier;
          if (deliveryType === 'express' || deliveryType === 'same_day') {
            selectedCourier = ratesResponse.data.fastest_courier || ratesResponse.data.couriers[0];
            logger.info('⚡ Selected fastest courier');
          } else {
            selectedCourier = ratesResponse.data.cheapest_courier || ratesResponse.data.couriers[0];
            logger.info('💰 Selected cheapest courier');
          }

          if (selectedCourier) {
            logger.info('🚚 Selected courier:', {
              name: selectedCourier.courier_name,
              id: selectedCourier.courier_id,
              serviceCode: selectedCourier.service_code,
              price: selectedCourier.total || selectedCourier.rate_card_amount,
              eta: selectedCourier.delivery_eta,
            });

            // Step 2: Create shipment
            logger.info('📝 Creating ShipBubble shipment...');
            logger.info('📤 Shipment request:', {
              requestToken: ratesResponse.data.request_token,
              courierId: selectedCourier.courier_id,
              serviceCode: selectedCourier.service_code,
            });

            const shipment = await shipBubbleService.createShipment(
              ratesResponse.data.request_token,
              selectedCourier.courier_id,
              selectedCourier.service_code,
              false // isInvoiceRequired
            );

            logger.info('📥 Shipment creation response:', {
              status: shipment.status,
              message: shipment.message,
              hasData: !!shipment.data,
              orderId: shipment.data?.order_id,
              trackingNumber: shipment.data?.tracking_number,
              shipmentId: shipment.data?.shipment_id,
            });

            // ✅ Extract tracking info - prioritize tracking URL and order_id
            const orderId = shipment.data?.order_id;
            const trackingUrl = shipment.data?.tracking_url;
            
            if (orderId && trackingUrl) {
              logger.info('✅ Shipment created successfully:', {
                orderId: orderId,
                trackingUrl: trackingUrl,
                shipmentId: shipment.data.shipment_id,
                courier: selectedCourier.courier_name,
              });

              // Update order with tracking info
              const vendorShipment = order.vendorShipments.find(
                (vs: any) => vs.vendor.toString() === group.vendorId
              );
              
              if (vendorShipment) {
                // Use order_id as the primary identifier
                vendorShipment.trackingNumber = orderId; // ✅ Using order_id for reference
                vendorShipment.shipmentId = shipment.data.shipment_id || orderId;
                vendorShipment.courier = selectedCourier.courier_name;
                vendorShipment.status = 'created';
                vendorShipment.trackingUrl = trackingUrl; // ✅ Primary tracking method
                
                logger.info('✅ Updated order with tracking info:', {
                  trackingNumber: vendorShipment.trackingNumber,
                  shipmentId: vendorShipment.shipmentId,
                  courier: vendorShipment.courier,
                  trackingUrl: vendorShipment.trackingUrl,
                });
              }

              await order.save();
              logger.info(`✅ Shipment created for vendor ${group.vendorName}. Order ID: ${orderId}`);
            } else {
              logger.error('❌ Missing order_id or tracking_url in shipment response:', {
                hasOrderId: !!orderId,
                hasTrackingUrl: !!trackingUrl,
                response: shipment,
              });
            }
          } else {
            logger.error('❌ No courier selected from rates');
          }
        } else {
          logger.error('❌ Failed to get delivery rates:', {
            status: ratesResponse.status,
            message: ratesResponse.message,
          });
        }
      } catch (error: any) {
        logger.error(`❌ Error creating shipment for vendor ${group.vendorName}:`, {
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          stack: error.stack,
        });
      }
    }

    logger.info('🚚 ============================================');
    logger.info('🚚 CREATE VENDOR SHIPMENTS COMPLETED');
    logger.info('🚚 ============================================\n');
  }

  /**
   * Verify payment - WITH DIGITAL PRODUCT ACCESS
   */
  async verifyPayment(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { reference } = req.params;

    logger.info('💳 ============================================');
    logger.info('💳 VERIFY PAYMENT STARTED');
    logger.info('💳 ============================================');
    logger.info('🔍 Payment reference:', reference);

    const order = await Order.findOne({ orderNumber: reference }).populate('items.product');
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    logger.info('📦 Order found:', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
    });

    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      logger.info('✅ Payment already verified');
      res.json({
        success: true,
        message: 'Payment already verified',
        data: { order },
      });
      return;
    }

    try {
      logger.info('🔍 Verifying payment with Paystack...');
      
      const verification = await paystackService.verifyPayment(reference);

      logger.info('📥 Paystack verification response:', {
        status: verification.data.status,
        amount: verification.data.amount,
        // currency: verification.data.currency,
      });

      if (verification.data.status === 'success') {
        logger.info('✅ Payment verified successfully');
        
        const isDigitalOnly = this.isDigitalOnly(order.items);
        
        logger.info('📦 Order type:', { isDigitalOnly });

        order.paymentStatus = PaymentStatus.COMPLETED;
        order.status = isDigitalOnly ? OrderStatus.DELIVERED : OrderStatus.CONFIRMED;
        await order.save();

        logger.info('✅ Order status updated:', {
          status: order.status,
          paymentStatus: order.paymentStatus,
        });

        // Reduce product quantities
        logger.info('📊 Updating product quantities...');
        
        for (const item of order.items) {
          const product: any = await Product.findById(item.product);
          if (!product) continue;
          
          const productType = product.productType?.toUpperCase();
          const isPhysical = productType !== 'DIGITAL' && productType !== 'SERVICE';
          
          if (isPhysical) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { 
                quantity: -item.quantity,
                totalSales: item.quantity,
              },
            });
            logger.info(`✅ Updated physical product: ${product.name}`);
          } else {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { 
                totalSales: item.quantity,
              },
            });
            logger.info(`✅ Updated digital product: ${product.name}`);
          }
        }

        // ✅ Digital products are instantly accessible
        if (isDigitalOnly) {
          logger.info(`✅ Digital order payment verified - instant access granted: ${order.orderNumber}`);
        }

        // Create ShipBubble shipments for physical products
        if (!isDigitalOnly && (order as any).deliveryType !== 'pickup') {
          logger.info('🚚 Creating ShipBubble shipments after payment verification...');
          
          try {
            const user = await User.findById(order.user);
            if (user) {
              const cart = await Cart.findOne({ user: order.user }).populate('items.product');
              if (cart && cart.items.length > 0) {
                const vendorGroups = await this.groupItemsByVendor(cart.items);
                await this.createVendorShipments(order, user, vendorGroups, (order as any).deliveryType || 'standard');
              } else {
                logger.warn('⚠️ Cart is empty - cannot create shipments');
              }
            } else {
              logger.error('❌ User not found');
            }
          } catch (error) {
            logger.error('Error creating ShipBubble shipments after payment:', error);
          }
        }

        // ✅ AWARD POINTS AFTER SUCCESSFUL PAYMENT
        try {
          const { rewardController } = await import('./reward.controller');
          await rewardController.awardOrderPoints(order._id.toString());
          logger.info(`✅ Points awarded for order ${order.orderNumber}`);
        } catch (error) {
          logger.error('Error awarding points:', error);
        }

        // Send confirmation email
        const user = await User.findById(order.user);
        if (user) {
          await sendOrderConfirmationEmail(user.email, order.orderNumber, order.total);
          logger.info('✅ Confirmation email sent');
        }

        logger.info('💳 ============================================');
        logger.info('💳 VERIFY PAYMENT COMPLETED');
        logger.info('💳 ============================================\n');

        res.json({
          success: true,
          message: 'Payment verified successfully',
          data: { 
            order,
            isDigital: isDigitalOnly,
          },
        });
      } else {
        logger.error('❌ Payment verification failed:', verification.data.status);
        
        order.paymentStatus = PaymentStatus.FAILED;
        order.status = OrderStatus.FAILED;
        await order.save();

        throw new AppError('Payment verification failed', 400);
      }
    } catch (error) {
      logger.error('❌ Payment verification error:', error);
      throw new AppError('Failed to verify payment', 500);
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // ✅ FILTER BY STATUS IF PROVIDED
    const filter: any = { user: req.user?.id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.product', 'name images');

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: { orders },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * Get single order
   */
  async getOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user?.id,
    })
      .populate('items.product', 'name images slug productType digitalFile')
      .populate('items.vendor', 'firstName lastName email')
      .populate('vendorShipments.vendor', 'firstName lastName');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    res.json({
      success: true,
      data: { order },
    });
  }

  /**
   * Get single order for vendor (vendor can view orders containing their products)
   */
  async getVendorOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name images slug productType digitalFile')
      .populate('items.vendor', 'firstName lastName email')
      .populate('vendorShipments.vendor', 'firstName lastName');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Check that this vendor has items in the order
    const hasVendorItems = order.items.some(
      item => item.vendor && item.vendor.toString() === req.user?.id ||
              (typeof item.vendor === 'object' && (item.vendor as any)._id?.toString() === req.user?.id)
    );

    if (!hasVendorItems) {
      throw new AppError('Not authorized to view this order', 403);
    }

    // Filter to only show this vendor's items
    const vendorItems = order.items.filter(
      item => item.vendor && (
        item.vendor.toString() === req.user?.id ||
        (typeof item.vendor === 'object' && (item.vendor as any)._id?.toString() === req.user?.id)
      )
    );

    // Find this vendor's shipment
    const vendorShipment = (order as any).vendorShipments?.find(
      (shipment: any) => {
        const shipVendorId = typeof shipment.vendor === 'object' 
          ? shipment.vendor._id?.toString() 
          : shipment.vendor?.toString();
        return shipVendorId === req.user?.id;
      }
    );

    // Build response with vendor-specific data
    const orderData = {
      ...order.toObject(),
      items: vendorItems,
      vendorShipment: vendorShipment || null,
    };

    res.json({
      success: true,
      data: { order: orderData },
    });
  }

  /**
   * Get user's digital products
   */
  async getUserDigitalProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const orders = await Order.find({
      user: req.user?.id,
      paymentStatus: PaymentStatus.COMPLETED,
    })
      .populate('items.product')
      .sort({ createdAt: -1 });

    const digitalProducts = [];
    
    for (const order of orders) {
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const product: any = item.product;
        if (!product) continue;
        
        const productType = product.productType?.toUpperCase();
        const isDigital = productType === 'DIGITAL' || productType === 'SERVICE';
        
        if (isDigital) {
          digitalProducts.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            itemId: (item as any)._id || `${order._id}-${i}`,
            product: {
              _id: product._id,
              name: product.name,
              slug: product.slug,
              image: product.images[0],
              productType: product.productType,
            },
            purchaseDate: (order as any).createdAt,
            downloadUrl: product.digitalFile?.url || product.downloadLink,
            fileSize: product.digitalFile?.fileSize,
            fileType: product.digitalFile?.fileType,
            version: product.digitalFile?.version,
          });
        }
      }
    }

    logger.info(`📦 Found ${digitalProducts.length} digital products for user ${req.user?.id}`);

    res.json({
      success: true,
      data: { 
        digitalProducts,
        total: digitalProducts.length,
      },
    });
  }

  /**
   * Download digital product
   */
  async downloadDigitalProduct(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { id: orderId, itemId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user?.id,
      paymentStatus: PaymentStatus.COMPLETED,
    }).populate('items.product');

    if (!order) {
      throw new AppError('Order not found or payment not completed', 404);
    }

    // Find item by _id or by index if itemId looks like "orderId-index"
    let item: any = null;
    
    if (itemId.includes('-')) {
      const index = parseInt(itemId.split('-').pop() || '0');
      item = order.items[index];
    } else {
      item = order.items.find((i: any) => i._id?.toString() === itemId);
    }
    
    if (!item) {
      throw new AppError('Product not found in order', 404);
    }

    const product: any = item.product;
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const productType = product.productType?.toUpperCase();
    const isDigital = productType === 'DIGITAL' || productType === 'SERVICE';
    
    if (!isDigital) {
      throw new AppError('This product is not a digital product', 400);
    }

    const downloadUrl = product.digitalFile?.url || product.downloadLink;
    
    if (!downloadUrl) {
      throw new AppError('Download URL not available', 404);
    }

    logger.info(`📥 User ${req.user?.id} downloading product ${product.name} from order ${order.orderNumber}`);

    res.json({
      success: true,
      data: {
        downloadUrl,
        product: {
          name: product.name,
          fileSize: product.digitalFile?.fileSize,
          fileType: product.digitalFile?.fileType,
          version: product.digitalFile?.version,
        },
      },
    });
  }

  /**
   * Track order shipment - UPDATED TO USE TRACKING URL
   */
  async trackOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { id } = req.params;

    logger.info('📍 ============================================');
    logger.info('📍 TRACK ORDER REQUEST');
    logger.info('📍 ============================================');
    logger.info('📦 Order ID:', id);

    const order = await Order.findOne({
      _id: id,
      user: req.user?.id,
    }).populate('vendorShipments.vendor', 'firstName lastName');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    logger.info('📦 Order found:', {
      orderNumber: order.orderNumber,
      status: order.status,
      hasVendorShipments: !!(order as any).vendorShipments?.length,
    });

    // ✅ Handle multi-vendor shipments
    if ((order as any).vendorShipments && (order as any).vendorShipments.length > 0) {
      logger.info(`📦 Multi-vendor order with ${(order as any).vendorShipments.length} shipment(s)`);
      
      const trackingData = await Promise.all(
        (order as any).vendorShipments.map(async (shipment: any) => {
          const trackingInfo = {
            vendor: shipment.vendorName,
            trackingNumber: shipment.trackingNumber,
            trackingUrl: shipment.trackingUrl, // ✅ Include tracking URL
            tracking: null as any,
            status: shipment.status,
            courier: shipment.courier,
          };

          // ✅ Use tracking URL if available, otherwise try ShipBubble API
          if (!shipment.trackingNumber && !shipment.trackingUrl) {
            logger.warn(`⚠️ No tracking info for vendor ${shipment.vendorName}`);
            return trackingInfo;
          }

          // If we have a tracking number, try to get detailed tracking from ShipBubble
          if (shipment.trackingNumber) {
            try {
              logger.info(`🔍 Fetching tracking for ${shipment.trackingNumber}...`);
              const tracking = await shipBubbleService.trackShipment(shipment.trackingNumber);
              trackingInfo.tracking = tracking.data;
              logger.info(`✅ Tracking retrieved for ${shipment.trackingNumber}`);
            } catch (error) {
              logger.error(`❌ Error tracking shipment ${shipment.trackingNumber}:`, error);
              // Don't throw - just return tracking URL
            }
          }

          return trackingInfo;
        })
      );

      logger.info(`✅ Returning tracking data for ${trackingData.length} shipment(s)`);

      res.json({
        success: true,
        data: {
          order,
          tracking: trackingData,
          multiVendor: true,
        },
      });
      return;
    }

    // ✅ Single shipment handling
    logger.info('📦 Single shipment order');

    // Check for tracking URL first
    if ((order as any).trackingUrl) {
      logger.info('✅ Tracking URL available:', (order as any).trackingUrl);
      
      res.json({
        success: true,
        data: {
          order,
          trackingUrl: (order as any).trackingUrl,
          tracking: null,
        },
      });
      return;
    }

    // Fallback to tracking number
    if (!order.trackingNumber) {
      logger.info('⚠️ No tracking information available yet');
      
      res.json({
        success: true,
        message: 'Tracking information not available yet',
        data: {
          order,
          tracking: null,
        },
      });
      return;
    }

    try {
      logger.info(`🔍 Fetching tracking for ${order.trackingNumber}...`);
      
      const tracking = await shipBubbleService.trackShipment(order.trackingNumber);

      logger.info('✅ Tracking retrieved successfully');

      res.json({
        success: true,
        data: {
          order,
          tracking: tracking.data,
        },
      });
    } catch (error) {
      logger.error('❌ Error tracking shipment:', error);
      
      res.json({
        success: true,
        message: 'Could not retrieve tracking information',
        data: {
          order,
          tracking: null,
          trackingUrl: (order as any).trackingUrl || null,
        },
      });
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { cancelReason } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user?.id,
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new AppError('Order cannot be cancelled at this stage', 400);
    }

    order.status = OrderStatus.CANCELLED;
    (order as any).cancelReason = cancelReason;
    await order.save();

    // Cancel shipments
    if ((order as any).vendorShipments && (order as any).vendorShipments.length > 0) {
      for (const shipment of (order as any).vendorShipments) {
        if (shipment.trackingNumber) {
          try {
            await shipBubbleService.cancelShipment(shipment.trackingNumber);
            shipment.status = 'cancelled';
            logger.info(`ShipBubble shipment cancelled: ${shipment.trackingNumber}`);
          } catch (error) {
            logger.error(`Error cancelling ShipBubble shipment ${shipment.trackingNumber}:`, error);
          }
        }
      }
      await order.save();
    }

    if (order.trackingNumber) {
      try {
        await shipBubbleService.cancelShipment(order.trackingNumber);
        logger.info(`ShipBubble shipment cancelled: ${order.trackingNumber}`);
      } catch (error) {
        logger.error('Error cancelling ShipBubble shipment:', error);
      }
    }

    // Restore product quantities (physical products only)
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      
      const productType = product.productType?.toUpperCase();
      const isPhysical = productType !== 'DIGITAL' && productType !== 'SERVICE';
      
      if (isPhysical) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { 
            quantity: item.quantity,
            totalSales: -item.quantity,
          },
        });
      }
    }

    // Refund if payment completed
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      const wallet = await Wallet.findOne({ user: req.user?.id });
      if (wallet) {
        wallet.balance += order.total;
        wallet.transactions.push({
          type: TransactionType.CREDIT,
          amount: order.total,
          purpose: WalletPurpose.REFUND,
          reference: `REF-${order.orderNumber}`,
          description: `Refund for cancelled order ${order.orderNumber}`,
          relatedOrder: order._id,
          status: 'completed',
          timestamp: new Date(),
        } as any);
        await wallet.save();
      }

      order.paymentStatus = PaymentStatus.REFUNDED;
      (order as any).refundAmount = order.total;
      (order as any).refundReason = cancelReason;
      await order.save();
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order },
    });
  }

  /**
   * Get vendor orders
   */
  async getVendorOrders(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const orders = await Order.find({
      'items.vendor': req.user?.id,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name images');

    const filteredOrders = orders.map(order => {
      const vendorItems = order.items.filter(
        item => item.vendor.toString() === req.user?.id
      );
      
      const vendorShipment = (order as any).vendorShipments?.find(
        (shipment: any) => shipment.vendor.toString() === req.user?.id
      );

      return {
        ...order.toObject(),
        items: vendorItems,
        vendorShipment,
      };
    });

    const total = await Order.countDocuments({
      'items.vendor': req.user?.id,
    });

    res.json({
      success: true,
      data: { orders: filteredOrders },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * Update order status (vendor)
   */
  async updateOrderStatus(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { status } = req.body;

    logger.info('🔄 ============================================');
    logger.info('🔄 UPDATE ORDER STATUS STARTED');
    logger.info('🔄 ============================================');
    logger.info('📋 Status update request:', {
      orderId: req.params.id,
      newStatus: status,
      vendorId: req.user?.id,
    });

    const order = await Order.findById(req.params.id)
      .populate('user')
      .populate('items.product');
      
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    logger.info('📦 Order found:', {
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      isDigital: (order as any).isDigital,
      deliveryType: (order as any).deliveryType,
    });

    const hasVendorItems = order.items.some(
      item => item.vendor.toString() === req.user?.id
    );

    if (!hasVendorItems) {
      throw new AppError('Not authorized', 403);
    }

    logger.info('✅ Vendor has items in order');

    // Update status
    const oldStatus = order.status;
    order.status = status;
    await order.save();

    logger.info('✅ Order status updated:', {
      from: oldStatus,
      to: status,
    });

    // ✅ Create shipment when vendor confirms/processes (only for physical products)
    // Check if we need to create shipment AND shipment doesn't already exist
    const vendorShipment = (order as any).vendorShipments?.find(
      (shipment: any) => {
        const shipVendorId = typeof shipment.vendor === 'object' 
          ? shipment.vendor._id?.toString() 
          : shipment.vendor?.toString();
        return shipVendorId === req.user?.id;
      }
    );
    
    const shouldCreateShipment = 
      (status === 'confirmed' || status === 'processing' || status === 'shipped') && 
      !(order as any).isDigital && 
      (order as any).deliveryType !== 'pickup' &&
      (!vendorShipment?.trackingNumber); // Only if no tracking number exists
    
    if (shouldCreateShipment) {
      logger.info('🚚 Status change triggers shipment creation');
      logger.info('📋 Conditions met:', {
        newStatus: status,
        isDigital: (order as any).isDigital,
        deliveryType: (order as any).deliveryType,
        oldStatus,
        hasExistingTracking: !!vendorShipment?.trackingNumber,
      });

      const user = order.user as any;
      
      try {
        // Get fresh cart data
        logger.info('🛒 Fetching cart for shipment creation...');
        
        const cart = await Cart.findOne({ user: user._id }).populate({
          path: 'items.product',
          populate: {
            path: 'vendor',
            select: 'firstName lastName email phone',
          },
        });
        
        if (cart && cart.items.length > 0) {
          logger.info(`✅ Cart found with ${cart.items.length} items`);
          
          const vendorGroups = await this.groupItemsByVendor(cart.items);
          
          logger.info(`📦 Grouped into ${vendorGroups.length} vendor(s)`);
          
          // Only create shipment for THIS vendor's items
          const vendorGroup = vendorGroups.find(g => g.vendorId === req.user?.id);
          
          if (vendorGroup) {
            logger.info('✅ Found vendor group for current vendor:', {
              vendorId: vendorGroup.vendorId,
              vendorName: vendorGroup.vendorName,
              itemCount: vendorGroup.items.length,
            });
            
            await this.createVendorShipments(
              order, 
              user, 
              [vendorGroup], // Only this vendor
              (order as any).deliveryType || 'standard'
            );
          } else {
            logger.warn('⚠️ No vendor group found for current vendor');
          }
        } else {
          logger.warn('⚠️ Cart is empty or not found - cannot create shipments');
        }
      } catch (error: any) {
        logger.error('❌ Error creating shipment on status update:', {
          error: error.message,
          stack: error.stack,
        });
      }
    } else {
      const skipReason = (order as any).isDigital 
        ? 'Digital order' 
        : (order as any).deliveryType === 'pickup'
        ? 'Pickup delivery'
        : vendorShipment?.trackingNumber
        ? 'Tracking number already exists'
        : 'Status not confirmed/processing/shipped';
        
      logger.info('⏭️ Shipment creation not triggered:', {
        reason: skipReason,
        currentStatus: status,
        hasTracking: !!vendorShipment?.trackingNumber,
      });
    }

    logger.info('🔄 ============================================');
    logger.info('🔄 UPDATE ORDER STATUS COMPLETED');
    logger.info('🔄 ============================================\n');

    res.json({
      success: true,
      message: 'Order status updated',
      data: { order },
    });
  }

  /**
   * Helper methods
   */
  private getDefaultRate(deliveryType: string): number {
    const defaultRates: { [key: string]: number } = {
      standard: 2500,
      express: 5000,
      same_day: 8000,
    };
    return defaultRates[deliveryType] || 2500;
  }

  private getDefaultEstimate(deliveryType: string): string {
    const defaultEstimates: { [key: string]: string } = {
      standard: '5-7 days',
      express: '2-3 days',
      same_day: 'Same day',
    };
    return defaultEstimates[deliveryType] || '5-7 days';
  }

  private getDefaultDescription(deliveryType: string): string {
    const descriptions: { [key: string]: string } = {
      standard: 'Delivery within 5-7 business days',
      express: 'Delivery within 2-3 business days',
      same_day: 'Delivery within 24 hours',
    };
    return descriptions[deliveryType] || 'Standard delivery';
  }

  private getVendorFallbackRates(): any[] {
    return [
      {
        type: 'standard',
        name: 'Standard Delivery',
        description: 'Delivery within 5-7 business days',
        price: 2500,
        estimatedDays: '5-7 days',
        courier: 'Standard Courier',
      },
      {
        type: 'express',
        name: 'Express Delivery',
        description: 'Delivery within 2-3 business days',
        price: 5000,
        estimatedDays: '2-3 days',
        courier: 'Express Courier',
      },
    ];
  }

  private getFallbackRates(): DeliveryRateResponse[] {
    return [
      {
        type: 'standard',
        name: 'Standard Delivery',
        description: 'Delivery within 5-7 business days',
        price: 2500,
        estimatedDays: '5-7 days',
        courier: 'Standard Courier',
      },
      {
        type: 'express',
        name: 'Express Delivery',
        description: 'Delivery within 2-3 business days',
        price: 5000,
        estimatedDays: '2-3 days',
        courier: 'Express Courier',
      },
    ];
  }
}

export const orderController = new OrderController();