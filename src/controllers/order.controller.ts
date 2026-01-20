import { Response } from 'express';
import { AuthRequest, ApiResponse, OrderStatus, PaymentStatus, PaymentMethod, TransactionType, WalletPurpose } from '../types';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';
import User from '../models/User';
import { Wallet } from '../models/Additional';
import { AppError } from '../middleware/error';
import { generateOrderNumber } from '../utils/helpers';
import { paystackService } from '../services/paystack.service';
import { sendOrderConfirmationEmail } from '../utils/email';
import { logger } from '../utils/logger';

export class OrderController {
  /**
   * Create order from cart
   */
  async createOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { shippingAddress, paymentMethod, notes } = req.body;

    // Get cart
    const cart = await Cart.findOne({ user: req.user?.id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    // Validate products availability and stock
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

    // Get user
    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prepare order items
    const orderItems = cart.items.map((item: any) => ({
      product: item.product._id,
      productName: item.product.name,
      productImage: item.product.images[0],
      variant: item.variant,
      quantity: item.quantity,
      price: item.price,
      vendor: item.product.vendor,
    }));

    // Calculate totals
    const subtotal = cart.subtotal;
    const discount = cart.discount;
    const shippingCost = 0; // Will be calculated with ShipBubble in next step
    const tax = 0; // Add tax calculation if needed
    const total = subtotal - discount + shippingCost + tax;

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const order = await Order.create({
      orderNumber,
      user: req.user?.id,
      items: orderItems,
      subtotal,
      discount,
      shippingCost,
      tax,
      total,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod,
      shippingAddress,
      couponCode: cart.couponCode,
      notes,
    });

    // Handle payment based on method
    let paymentData = null;

    if (paymentMethod === PaymentMethod.PAYSTACK) {
      // Initialize Paystack payment
      try {
        const paystackResponse = await paystackService.initializePayment({
          email: user.email,
          amount: total * 100, // Convert to kobo
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
        // If payment initialization fails, mark order as failed
        order.status = OrderStatus.FAILED;
        order.paymentStatus = PaymentStatus.FAILED;
        await order.save();
        
        throw new AppError('Failed to initialize payment', 500);
      }
    } else if (paymentMethod === PaymentMethod.WALLET) {
      // Use wallet payment
      const wallet = await Wallet.findOne({ user: req.user?.id });
      
      if (!wallet || wallet.balance < total) {
        throw new AppError('Insufficient wallet balance', 400);
      }

      // Deduct from wallet
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

      // Update order
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.status = OrderStatus.CONFIRMED;
      await order.save();
    }

    // Clear cart
    cart.items = [];
    cart.couponCode = undefined;
    cart.discount = 0;
    await cart.save();

    // Update coupon usage if applied
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
      },
    });
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
      // Verify with Paystack
      const verification = await paystackService.verifyPayment(reference);

      if (verification.data.status === 'success') {
        // Update order
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
      .populate('items.vendor', 'firstName lastName email');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    res.json({
      success: true,
      data: { order },
    });
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

    // Can only cancel pending or confirmed orders (not shipped)
    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new AppError('Order cannot be cancelled at this stage', 400);
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelReason = cancelReason;
    await order.save();

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
      order.refundAmount = order.total;
      order.refundReason = cancelReason;
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

    // Find orders that contain items from this vendor
    const orders = await Order.find({
      'items.vendor': req.user?.id,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name images');

    // Filter items to only show vendor's items
    const filteredOrders = orders.map(order => {
      const vendorItems = order.items.filter(
        item => item.vendor.toString() === req.user?.id
      );
      return {
        ...order.toObject(),
        items: vendorItems,
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

    // Verify vendor owns items in this order
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
}

export const orderController = new OrderController();
