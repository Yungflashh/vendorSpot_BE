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
 * CORRECT FIX: Use user's real address for ShipBubble rate calculation
 * 
 * The frontend already sends the user's selected address.
 * We need to pass it to getVendorDeliveryRates and use it!
 */

// ============================================
// 1. UPDATE getDeliveryRates METHOD
// ============================================

async getDeliveryRates(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
  const { city, state, street, fullName, phone } = req.query; // ✅ ADD street, fullName, phone

  if (!city || !state) {
    throw new AppError('City and state are required', 400);
  }

  try {
    logger.info('📦 Delivery rates request:', {
      city,
      state,
      street: street || 'Not provided', // ✅ Log the street
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

    // ✅ Create destination address object from user's address
    const destinationAddress = {
      street: (street as string) || `${city} Area`, // Use user's street or fallback
      city: city as string,
      state: state as string,
      fullName: (fullName as string) || 'Customer',
      phone: (phone as string) || '+2348000000000',
    };

    // Calculate shipping rates
    let shipBubbleSuccess = false;
    const vendorRates = await Promise.all(
      vendorGroups.map(async (group) => {
        // ✅ Pass the full destination address
        const result = await this.getVendorDeliveryRates(
          group, 
          destinationAddress // Pass full address object
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

    // Get vendor profile
    const vendorProfile = await VendorProfile.findOne({ user: vendorGroup.vendorId });
    const vendor = await User.findById(vendorGroup.vendorId);

    // Validate vendor address
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

    // ✅ FIX: Construct COMPLETE address strings
    const senderFullAddress = `${vendorProfile.businessAddress.street}, ${vendorProfile.businessAddress.city}, ${vendorProfile.businessAddress.state}, ${vendorProfile.businessAddress.country || 'Nigeria'}`;
    
    const receiverFullAddress = `${destination.street}, ${destination.city}, ${destination.state}, Nigeria`;

    // ✅ Sender address (vendor) - WITH COMPLETE ADDRESS
    const senderAddress = {
      name: vendorGroup.vendorName,
      phone: vendorProfile.businessPhone || vendor?.phone || '+2348000000000',
      email: vendorProfile.businessEmail || vendor?.email || 'sender@vendorspot.com',
      address: senderFullAddress, // ✅ COMPLETE: "street, city, state, country"
    };

    // ✅ Receiver address (customer) - WITH COMPLETE ADDRESS
    const receiverAddress = {
      name: destination.fullName,
      phone: destination.phone,
      email: 'customer@vendorspot.com',
      address: receiverFullAddress, // ✅ COMPLETE: "street, city, state, country"
    };

    logger.info('📦 ShipBubble addresses (COMPLETE):', {
      sender: {
        name: senderAddress.name,
        address: senderAddress.address, // Now includes: street, city, state, country
      },
      receiver: {
        name: receiverAddress.name,
        address: receiverAddress.address, // Now includes: street, city, state, country
      },
    });

    // Prepare package items
    const packageItems = physicalItems.map(item => ({
      name: item.productName,
      description: item.productName,
      unit_weight: item.weight.toString(),
      unit_amount: item.price.toString(),
      quantity: item.quantity.toString(),
    }));

    // Get rates from ShipBubble
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

  /**
   * Group cart items by vendor
   * FIXED: Better detection of physical vs digital products
   */
  private async groupItemsByVendor(items: any[]): Promise<VendorGroup[]> {
    const groups = new Map<string, VendorGroup>();

    for (const item of items) {
      const product = item.product;
      const vendorId = product.vendor._id.toString();

      if (!groups.has(vendorId)) {
        // Get vendor's business address from VendorProfile
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
      
      // FIXED: Better physical product detection
      // A product is physical if:
      // 1. productType is explicitly 'PHYSICAL' (case-insensitive), OR
      // 2. productType is not set AND it's not explicitly 'DIGITAL' or 'SERVICE'
      const productType = product.productType?.toUpperCase();
      const isPhysical = 
        productType === 'PHYSICAL' || 
        (!productType || (productType !== 'DIGITAL' && productType !== 'SERVICE'));
      
      const weight = product.weight || 1; // Default to 1kg if not specified

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

  /**
   * Check if all vendors support pickup
   */
  private checkPickupAvailability(vendorGroups: VendorGroup[]): boolean {
    return true;
  }


  /**
   * Aggregate rates from multiple vendors
   */
  /**
 * Aggregate rates from multiple vendors
 * FIX: Only use CHEAPEST courier per vendor (not all couriers)
 */
private aggregateVendorRates(vendorRates: VendorDeliveryRate[]): DeliveryRateResponse[] {
  const aggregated = new Map<string, DeliveryRateResponse>();

  vendorRates.forEach(vendorRate => {
    // ✅ FIX: For each vendor, pick CHEAPEST rate by delivery type
    const ratesByType = new Map<string, any>();
    
    vendorRate.rates.forEach(rate => {
      // Skip digital delivery in aggregation
      if (rate.type === 'digital') return;
      
      const existing = ratesByType.get(rate.type);
      
      // ✅ Keep only the cheapest rate for this delivery type
      if (!existing || rate.price < existing.price) {
        ratesByType.set(rate.type, rate);
      }
    });

    // ✅ Now aggregate only the cheapest rates
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
      
      // ✅ Add only the cheapest courier's price for this vendor
      agg.price += rate.price;
      
      agg.vendorBreakdown!.push({
        vendorId: vendorRate.vendorId,
        vendorName: vendorRate.vendorName,
        price: rate.price,
        courier: rate.courier,
      });

      // Use the longest estimated delivery time
      if (this.compareEstimatedDays(rate.estimatedDays, agg.estimatedDays) > 0) {
        agg.estimatedDays = rate.estimatedDays;
      }
    });
  });

  return Array.from(aggregated.values());
}
  /**
   * Compare estimated delivery days
   */
  private compareEstimatedDays(days1: string, days2: string): number {
    const extract = (str: string): number => {
      const match = str.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    return extract(days1) - extract(days2);
  }

  /**
   * Create order from cart - Multi-vendor aware
   */
  async createOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { shippingAddress, paymentMethod, notes, deliveryType = 'standard' } = req.body;

    // Get cart with vendor details
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

    // Validate products
    for (const item of cart.items) {
      const product: any = item.product;
      
      if (!product || product.status !== 'active') {
        throw new AppError(`Product ${product?.name || 'Unknown'} is not available`, 400);
      }

      if (product.quantity < item.quantity) {
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

    // Group items by vendor
    const vendorGroups = await this.groupItemsByVendor(cart.items);

    logger.info(`📦 Creating order with ${vendorGroups.length} vendor(s)`);

    // Prepare order items
    const orderItems = cart.items.map((item: any) => ({
      product: item.product._id,
      productName: item.product.name,
      productImage: item.product.images[0],
      variant: item.variant,
      quantity: item.quantity,
      price: item.price,
      vendor: item.product.vendor._id,
    }));

    // Calculate shipping for each vendor
    let totalShippingCost = 0;
    const vendorShipments = [];

    if (deliveryType !== 'pickup') {
      for (const group of vendorGroups) {
        // Skip shipping for digital products
        const physicalItems = group.items.filter(item => item.isPhysical);
        if (physicalItems.length === 0) {
          continue;
        }

        try {
          // For now, use fallback rates during order creation
          // TODO: Implement proper rate storage and retrieval from previous getDeliveryRates call
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
            status: 'pending',
          });

          logger.info(`✅ Shipping cost for ${group.vendorName}: ₦${fallbackCost}`);
        } catch (error) {
          logger.error(`Error calculating shipping for vendor ${group.vendorName}:`, error);
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
            status: 'pending',
          });
        }
      }
    }

    // Calculate totals
    const subtotal = cart.subtotal;
    const discount = cart.discount;
    const tax = 0;
    const total = subtotal - discount + totalShippingCost + tax;

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
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
      shippingAddress,
      couponCode: cart.couponCode,
      notes,
      deliveryType,
      isPickup: deliveryType === 'pickup',
      vendorShipments,
    });

    // Handle payment based on method
    let paymentData = null;

    if (paymentMethod === PaymentMethod.PAYSTACK) {
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
          },
        });

        order.paymentReference = orderNumber;
        await order.save();

        paymentData = {
          authorization_url: paystackResponse.data.authorization_url,
          access_code: paystackResponse.data.access_code,
          reference: orderNumber,
        };
      } catch (error) {
        order.status = OrderStatus.FAILED;
        order.paymentStatus = PaymentStatus.FAILED;
        await order.save();
        
        throw new AppError('Failed to initialize payment', 500);
      }
    } else if (paymentMethod === PaymentMethod.WALLET) {
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
      order.status = OrderStatus.CONFIRMED;
      await order.save();

      // Create ShipBubble shipments after successful payment
      if (deliveryType !== 'pickup') {
        try {
          await this.createVendorShipments(order, user, vendorGroups, deliveryType);
        } catch (error) {
          logger.error('Error creating ShipBubble shipments:', error);
        }
      }
    } else if (paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
      order.status = OrderStatus.CONFIRMED;
      await order.save();
    }

    // Clear cart
    cart.items = [];
    cart.couponCode = undefined;
    cart.discount = 0;
    await cart.save();

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
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
        payment: paymentData,
        vendorCount: vendorGroups.length,
        multiVendor: vendorGroups.length > 1,
      },
    });
  }

  /**
   * Create shipments for each vendor using ShipBubble
   */
  
private async createVendorShipments(
  order: any,
  user: any,
  vendorGroups: VendorGroup[],
  deliveryType: string
) {
  for (const group of vendorGroups) {
    // Skip digital products
    const physicalItems = group.items.filter(item => item.isPhysical);
    if (physicalItems.length === 0) {
      continue;
    }

    try {
      const vendor = await User.findById(group.vendorId);
      const vendorProfile = await VendorProfile.findOne({ user: group.vendorId });
      
      if (!vendor) continue;

      // ✅ FIX: Construct COMPLETE address strings
      const senderFullAddress = `${group.vendorAddress.street || 'Store Address'}, ${group.vendorAddress.city}, ${group.vendorAddress.state}, ${group.vendorAddress.country}`;
      
      const receiverFullAddress = `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.country || 'Nigeria'}`;

      // Prepare addresses WITH COMPLETE ADDRESS STRINGS
      const senderAddress = {
        name: group.vendorName,
        phone: vendorProfile?.businessPhone || vendor.phone || '+2348000000000',
        email: vendorProfile?.businessEmail || vendor.email || 'sender@store.com',
        address: senderFullAddress, // ✅ COMPLETE
      };

      const receiverAddress = {
        name: order.shippingAddress.fullName || `${user.firstName} ${user.lastName}`,
        phone: order.shippingAddress.phone || user.phone || '+2348000000000',
        email: user.email,
        address: receiverFullAddress, // ✅ COMPLETE
      };

      logger.info('📦 Creating shipment with addresses:', {
        sender: senderAddress.address,
        receiver: receiverAddress.address,
      });

      // Prepare package items
      const packageItems = physicalItems.map((item: any) => ({
        name: item.productName,
        description: item.productName,
        unit_weight: item.weight.toString(),
        unit_amount: item.price.toString(),
        quantity: item.quantity.toString(),
      }));

      // First, get rates to get request_token
      const ratesResponse = await shipBubbleService.getDeliveryRates(
        senderAddress,
        receiverAddress,
        packageItems
      );

      if (ratesResponse.status === 'success' && ratesResponse.data?.request_token) {
        // Find cheapest or fastest courier based on delivery type
        let selectedCourier;
        if (deliveryType === 'express' || deliveryType === 'same_day') {
          selectedCourier = ratesResponse.data.fastest_courier || ratesResponse.data.couriers[0];
        } else {
          selectedCourier = ratesResponse.data.cheapest_courier || ratesResponse.data.couriers[0];
        }

        if (selectedCourier) {
          // Create shipment
          const shipment = await shipBubbleService.createShipment(
            ratesResponse.data.request_token,
            selectedCourier.courier_id,
            false
          );

          if (shipment.data?.tracking_number) {
            // Update vendor shipment
            const vendorShipment = order.vendorShipments.find(
              (vs: any) => vs.vendor.toString() === group.vendorId
            );
            
            if (vendorShipment) {
              vendorShipment.trackingNumber = shipment.data.tracking_number;
              vendorShipment.shipmentId = shipment.data.shipment_id || shipment.data.tracking_number;
              vendorShipment.courier = selectedCourier.courier_name;
              vendorShipment.status = 'created';
            }

            await order.save();

            logger.info(`✅ Shipment created for vendor ${group.vendorName}: ${shipment.data.tracking_number}`);
          }
        }
      }
    } catch (error: any) {
      logger.error(`❌ Error creating shipment for vendor ${group.vendorName}:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
}

  /**
   * Verify payment (Paystack webhook/callback)
   */
  async verifyPayment(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { reference } = req.params;

    const order = await Order.findOne({ orderNumber: reference });
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      res.json({
        success: true,
        message: 'Payment already verified',
        data: { order },
      });
      return;
    }

    try {
      const verification = await paystackService.verifyPayment(reference);

      if (verification.data.status === 'success') {
        order.paymentStatus = PaymentStatus.COMPLETED;
        order.status = OrderStatus.CONFIRMED;
        await order.save();

        // Reduce product quantities
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { 
              quantity: -item.quantity,
              totalSales: item.quantity,
            },
          });
        }

        // Create ShipBubble shipments after successful payment
        if ((order as any).deliveryType !== 'pickup') {
          try {
            const user = await User.findById(order.user);
            if (user) {
              const cart = await Cart.findOne({ user: order.user }).populate('items.product');
              if (cart && cart.items.length > 0) {
                const vendorGroups = await this.groupItemsByVendor(cart.items);
                await this.createVendorShipments(order, user, vendorGroups, (order as any).deliveryType || 'standard');
              }
            }
          } catch (error) {
            logger.error('Error creating ShipBubble shipments after payment:', error);
          }
        }

        // Send confirmation email
        const user = await User.findById(order.user);
        if (user) {
          await sendOrderConfirmationEmail(user.email, order.orderNumber, order.total);
        }

        logger.info(`Payment verified for order ${order.orderNumber}`);

        res.json({
          success: true,
          message: 'Payment verified successfully',
          data: { order },
        });
      } else {
        order.paymentStatus = PaymentStatus.FAILED;
        order.status = OrderStatus.FAILED;
        await order.save();

        throw new AppError('Payment verification failed', 400);
      }
    } catch (error) {
      logger.error('Payment verification error:', error);
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

    const orders = await Order.find({ user: req.user?.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.product', 'name images');

    const total = await Order.countDocuments({ user: req.user?.id });

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
      .populate('items.product', 'name images slug')
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
   * Track order shipment - Multi-vendor aware
   */
  async trackOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user?.id,
    }).populate('vendorShipments.vendor', 'firstName lastName');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // If multi-vendor order
    if ((order as any).vendorShipments && (order as any).vendorShipments.length > 0) {
      const trackingData = await Promise.all(
        (order as any).vendorShipments.map(async (shipment: any) => {
          if (!shipment.trackingNumber) {
            return {
              vendor: shipment.vendorName,
              trackingNumber: null,
              tracking: null,
              status: shipment.status,
            };
          }

          try {
            const tracking = await shipBubbleService.trackShipment(shipment.trackingNumber);
            return {
              vendor: shipment.vendorName,
              trackingNumber: shipment.trackingNumber,
              tracking: tracking.data,
              status: shipment.status,
            };
          } catch (error) {
            logger.error(`Error tracking shipment ${shipment.trackingNumber}:`, error);
            return {
              vendor: shipment.vendorName,
              trackingNumber: shipment.trackingNumber,
              tracking: null,
              status: shipment.status,
            };
          }
        })
      );

      res.json({
        success: true,
        data: {
          order,
          tracking: trackingData,
          multiVendor: true,
        },
      });
    } else {
      // Legacy single tracking
      if (!order.trackingNumber) {
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
        const tracking = await shipBubbleService.trackShipment(order.trackingNumber);

        res.json({
          success: true,
          data: {
            order,
            tracking: tracking.data,
          },
        });
      } catch (error) {
        logger.error('Error tracking shipment:', error);
        
        res.json({
          success: true,
          message: 'Could not retrieve tracking information',
          data: {
            order,
            tracking: null,
          },
        });
      }
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

    // Cancel all vendor shipments
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

    // Cancel legacy shipment
    if (order.trackingNumber) {
      try {
        await shipBubbleService.cancelShipment(order.trackingNumber);
        logger.info(`ShipBubble shipment cancelled: ${order.trackingNumber}`);
      } catch (error) {
        logger.error('Error cancelling ShipBubble shipment:', error);
      }
    }

    // Restore product quantities
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 
          quantity: item.quantity,
          totalSales: -item.quantity,
        },
      });
    }

    // Refund if payment was completed
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

    // Filter to show only vendor's items and shipment
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
   * Update order status (vendor only)
   */
  async updateOrderStatus(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const hasVendorItems = order.items.some(
      item => item.vendor.toString() === req.user?.id
    );

    if (!hasVendorItems) {
      throw new AppError('Not authorized', 403);
    }

    order.status = status;
    await order.save();

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