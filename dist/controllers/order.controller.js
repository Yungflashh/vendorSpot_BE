"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderController = exports.OrderController = void 0;
const types_1 = require("../types");
const Order_1 = __importDefault(require("../models/Order"));
const Cart_1 = __importDefault(require("../models/Cart"));
const Product_1 = __importDefault(require("../models/Product"));
const User_1 = __importDefault(require("../models/User"));
const VendorProfile_1 = __importDefault(require("../models/VendorProfile"));
const Additional_1 = require("../models/Additional");
const error_1 = require("../middleware/error");
const helpers_1 = require("../utils/helpers");
const paystack_service_1 = require("../services/paystack.service");
const shipbubble_service_1 = require("../services/shipbubble.service");
const email_1 = require("../utils/email");
const logger_1 = require("../utils/logger");
class OrderController {
    /**
     * Check if cart contains digital products
     */
    hasDigitalProducts(items) {
        return items.some((item) => {
            const productType = item.product.productType?.toUpperCase();
            return productType === 'DIGITAL' || productType === 'SERVICE';
        });
    }
    /**
     * Check if cart contains ONLY digital products
     */
    isDigitalOnly(items) {
        return items.every((item) => {
            const productType = item.product.productType?.toUpperCase();
            return productType === 'DIGITAL' || productType === 'SERVICE';
        });
    }
    /**
     * Validate payment method for cart contents
     */
    validatePaymentMethod(items, paymentMethod, deliveryType) {
        const hasDigital = this.hasDigitalProducts(items);
        const isDigitalOnly = this.isDigitalOnly(items);
        logger_1.logger.info('📦 Payment validation:', {
            hasDigital,
            isDigitalOnly,
            paymentMethod,
            deliveryType,
        });
        // Digital products cannot use Cash on Delivery
        if (hasDigital && paymentMethod === types_1.PaymentMethod.CASH_ON_DELIVERY) {
            throw new error_1.AppError('Cash on Delivery is not available for digital products. Please use Card Payment or Wallet.', 400);
        }
        // Digital-only orders should use pickup/digital delivery
        if (isDigitalOnly && deliveryType !== 'pickup' && deliveryType !== 'digital') {
            logger_1.logger.warn('Digital-only order with non-digital delivery type, auto-correcting');
        }
    }
    /**
     * Get delivery rates
     */
    async getDeliveryRates(req, res) {
        const { city, state, street, fullName, phone } = req.query;
        if (!city || !state) {
            throw new error_1.AppError('City and state are required', 400);
        }
        try {
            logger_1.logger.info('📦 Delivery rates request:', {
                city,
                state,
                street: street || 'Not provided',
                userId: req.user?.id,
            });
            // Get user's cart
            const cart = await Cart_1.default.findOne({
                user: req.user?.id
            }).populate({
                path: 'items.product',
                populate: {
                    path: 'vendor',
                    select: 'firstName lastName',
                },
            });
            if (!cart || cart.items.length === 0) {
                throw new error_1.AppError('Cart is empty', 400);
            }
            // Check if cart is digital-only
            const isDigitalOnly = this.isDigitalOnly(cart.items);
            if (isDigitalOnly) {
                logger_1.logger.info('📦 Digital-only cart - no delivery rates needed');
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
            logger_1.logger.info(`📦 Processing delivery rates for ${vendorGroups.length} vendor(s)`);
            const rates = [];
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
                street: street || `${city} Area`,
                city: city,
                state: state,
                fullName: fullName || 'Customer',
                phone: phone || '+2348000000000',
            };
            // Calculate shipping rates
            let shipBubbleSuccess = false;
            const vendorRates = await Promise.all(vendorGroups.map(async (group) => {
                const result = await this.getVendorDeliveryRates(group, destinationAddress);
                if (result.success) {
                    shipBubbleSuccess = true;
                }
                return result;
            }));
            // Aggregate rates
            const aggregatedRates = this.aggregateVendorRates(vendorRates);
            rates.push(...aggregatedRates);
            // Use fallback if all ShipBubble calls failed
            if (!shipBubbleSuccess && rates.filter(r => r.type !== 'pickup').length === 0) {
                logger_1.logger.warn('⚠️ All ShipBubble requests failed - Using fallback rates');
                rates.push(...this.getFallbackRates());
            }
            logger_1.logger.info(`✅ Returning ${rates.length} delivery options (ShipBubble: ${shipBubbleSuccess ? 'SUCCESS' : 'FAILED'})`);
            res.json({
                success: true,
                data: {
                    rates,
                    vendorCount: vendorGroups.length,
                    multiVendor: vendorGroups.length > 1,
                    source: shipBubbleSuccess ? 'shipbubble' : 'fallback',
                },
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Critical error in getDeliveryRates:', error);
            throw new error_1.AppError('Failed to get delivery rates', 500);
        }
    }
    async getVendorDeliveryRates(vendorGroup, destination) {
        const result = {
            vendorId: vendorGroup.vendorId,
            vendorName: vendorGroup.vendorName,
            rates: [],
            success: false,
        };
        // Skip shipping for digital products
        const physicalItems = vendorGroup.items.filter(item => item.isPhysical);
        logger_1.logger.info(`📦 Vendor ${vendorGroup.vendorName} items breakdown:`, {
            totalItems: vendorGroup.items.length,
            physicalItems: physicalItems.length,
            digitalItems: vendorGroup.items.length - physicalItems.length,
        });
        if (physicalItems.length === 0) {
            logger_1.logger.info(`✅ Vendor ${vendorGroup.vendorName} has only digital products`);
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
            logger_1.logger.info(`📦 Getting shipping rates for ${vendorGroup.vendorName}`);
            const vendorProfile = await VendorProfile_1.default.findOne({ user: vendorGroup.vendorId });
            const vendor = await User_1.default.findById(vendorGroup.vendorId);
            const hasValidAddress = vendorProfile?.businessAddress &&
                vendorProfile.businessAddress.street &&
                vendorProfile.businessAddress.street.trim().length > 5 &&
                vendorProfile.businessAddress.street !== '123 Main Street' &&
                vendorProfile.businessAddress.city &&
                vendorProfile.businessAddress.state;
            if (!hasValidAddress) {
                logger_1.logger.warn(`⚠️ Vendor ${vendorGroup.vendorName} has invalid address - using fallback`);
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
            logger_1.logger.info('📦 ShipBubble addresses (COMPLETE):', {
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
            const ratesResponse = await shipbubble_service_1.shipBubbleService.getDeliveryRates(senderAddress, receiverAddress, packageItems);
            if (ratesResponse.status === 'success' && ratesResponse.data?.couriers) {
                logger_1.logger.info(`✅ Got ${ratesResponse.data.couriers.length} courier options from ShipBubble`);
                ratesResponse.data.couriers.forEach((courier) => {
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
                result.requestToken = ratesResponse.data.request_token;
                result.success = true;
            }
            else {
                logger_1.logger.warn(`⚠️ No courier data from ShipBubble`);
            }
            if (result.rates.length === 0) {
                logger_1.logger.warn(`⚠️ Using fallback rates`);
                result.rates.push(...this.getVendorFallbackRates());
            }
        }
        catch (error) {
            logger_1.logger.error(`❌ Error getting rates:`, error.message);
            result.rates.push(...this.getVendorFallbackRates());
        }
        return result;
    }
    async groupItemsByVendor(items) {
        const groups = new Map();
        for (const item of items) {
            const product = item.product;
            const vendorId = product.vendor._id.toString();
            if (!groups.has(vendorId)) {
                const vendorProfile = await VendorProfile_1.default.findOne({ user: vendorId });
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
            const group = groups.get(vendorId);
            const productType = product.productType?.toUpperCase();
            const isPhysical = productType === 'PHYSICAL' ||
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
    checkPickupAvailability(vendorGroups) {
        return true;
    }
    aggregateVendorRates(vendorRates) {
        const aggregated = new Map();
        vendorRates.forEach(vendorRate => {
            const ratesByType = new Map();
            vendorRate.rates.forEach(rate => {
                if (rate.type === 'digital')
                    return;
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
                const agg = aggregated.get(type);
                agg.price += rate.price;
                agg.vendorBreakdown.push({
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
    compareEstimatedDays(days1, days2) {
        const extract = (str) => {
            const match = str.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        };
        return extract(days1) - extract(days2);
    }
    /**
     * Create order from cart - WITH DIGITAL PRODUCTS SUPPORT
     */
    async createOrder(req, res) {
        const { shippingAddress, paymentMethod, notes, deliveryType = 'standard' } = req.body;
        const cart = await Cart_1.default.findOne({ user: req.user?.id }).populate({
            path: 'items.product',
            populate: {
                path: 'vendor',
                select: 'firstName lastName email phone',
            },
        });
        if (!cart || cart.items.length === 0) {
            throw new error_1.AppError('Cart is empty', 400);
        }
        // ✅ VALIDATE PAYMENT METHOD FOR CART CONTENTS
        this.validatePaymentMethod(cart.items, paymentMethod, deliveryType);
        // Validate products
        for (const item of cart.items) {
            const product = item.product;
            if (!product || product.status !== 'active') {
                throw new error_1.AppError(`Product ${product?.name || 'Unknown'} is not available`, 400);
            }
            // Check stock for physical products only
            const productType = product.productType?.toUpperCase();
            const isPhysical = productType !== 'DIGITAL' && productType !== 'SERVICE';
            if (isPhysical && product.quantity < item.quantity) {
                throw new error_1.AppError(`Insufficient stock for ${product.name}. Only ${product.quantity} available`, 400);
            }
        }
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        const vendorGroups = await this.groupItemsByVendor(cart.items);
        const isDigitalOnly = this.isDigitalOnly(cart.items);
        logger_1.logger.info(`📦 Creating order with ${vendorGroups.length} vendor(s)`, {
            isDigitalOnly,
            paymentMethod,
            deliveryType,
        });
        const orderItems = cart.items.map((item) => ({
            product: item.product._id,
            productName: item.product.name,
            productImage: item.product.images[0],
            productType: item.product.productType || 'physical', // ✅ ADD productType
            variant: item.variant,
            quantity: item.quantity,
            price: item.price,
            vendor: item.product.vendor._id,
        }));
        // Calculate shipping (skip for digital-only)
        let totalShippingCost = 0;
        const vendorShipments = [];
        if (!isDigitalOnly && deliveryType !== 'pickup') {
            for (const group of vendorGroups) {
                const physicalItems = group.items.filter(item => item.isPhysical);
                if (physicalItems.length === 0) {
                    continue;
                }
                try {
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
                    logger_1.logger.info(`✅ Shipping cost for ${group.vendorName}: ₦${fallbackCost}`);
                }
                catch (error) {
                    logger_1.logger.error(`Error calculating shipping for vendor ${group.vendorName}:`, error);
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
        const subtotal = cart.subtotal;
        const discount = cart.discount;
        const tax = 0;
        const total = subtotal - discount + totalShippingCost + tax;
        const orderNumber = (0, helpers_1.generateOrderNumber)();
        const order = await Order_1.default.create({
            orderNumber,
            user: req.user?.id,
            items: orderItems,
            subtotal,
            discount,
            shippingCost: totalShippingCost,
            tax,
            total,
            status: types_1.OrderStatus.PENDING,
            paymentStatus: types_1.PaymentStatus.PENDING,
            paymentMethod,
            shippingAddress: isDigitalOnly ? undefined : shippingAddress, // ✅ Skip for digital
            couponCode: cart.couponCode,
            notes,
            deliveryType: isDigitalOnly ? 'digital' : deliveryType, // ✅ Set to 'digital'
            isPickup: deliveryType === 'pickup' || isDigitalOnly, // ✅ Mark as pickup for digital
            vendorShipments,
            isDigital: isDigitalOnly, // ✅ ADD isDigital flag
        });
        let paymentData = null;
        if (paymentMethod === types_1.PaymentMethod.PAYSTACK) {
            try {
                const paystackResponse = await paystack_service_1.paystackService.initializePayment({
                    email: user.email,
                    amount: total * 100,
                    reference: orderNumber,
                    callback_url: `${process.env.FRONTEND_URL}/orders/${orderNumber}/payment-callback`,
                    metadata: {
                        orderId: order._id.toString(),
                        orderNumber,
                        userId: user._id.toString(),
                        isDigital: isDigitalOnly, // ✅ Pass digital flag
                    },
                });
                order.paymentReference = orderNumber;
                await order.save();
                paymentData = {
                    authorization_url: paystackResponse.data.authorization_url,
                    access_code: paystackResponse.data.access_code,
                    reference: orderNumber,
                };
            }
            catch (error) {
                order.status = types_1.OrderStatus.FAILED;
                order.paymentStatus = types_1.PaymentStatus.FAILED;
                await order.save();
                throw new error_1.AppError('Failed to initialize payment', 500);
            }
        }
        else if (paymentMethod === types_1.PaymentMethod.WALLET) {
            const wallet = await Additional_1.Wallet.findOne({ user: req.user?.id });
            if (!wallet || wallet.balance < total) {
                throw new error_1.AppError('Insufficient wallet balance', 400);
            }
            wallet.balance -= total;
            wallet.totalSpent += total;
            wallet.transactions.push({
                type: types_1.TransactionType.DEBIT,
                amount: total,
                purpose: types_1.WalletPurpose.PURCHASE,
                reference: orderNumber,
                description: `Payment for order ${orderNumber}`,
                relatedOrder: order._id,
                status: 'completed',
                timestamp: new Date(),
            });
            await wallet.save();
            order.paymentStatus = types_1.PaymentStatus.COMPLETED;
            order.status = isDigitalOnly ? types_1.OrderStatus.DELIVERED : types_1.OrderStatus.CONFIRMED; // ✅ Digital = instant delivery
            await order.save();
            // ✅ For digital products, instant delivery
            if (isDigitalOnly) {
                logger_1.logger.info(`✅ Digital order completed instantly: ${orderNumber}`);
            }
            // ✅ AWARD POINTS AFTER WALLET PAYMENT
            try {
                const { rewardController } = await Promise.resolve().then(() => __importStar(require('./reward.controller')));
                await rewardController.awardOrderPoints(order._id.toString());
                logger_1.logger.info(`✅ Points awarded for order ${orderNumber}`);
            }
            catch (error) {
                logger_1.logger.error('Error awarding points:', error);
            }
            // Create ShipBubble shipments for physical products
            if (!isDigitalOnly && deliveryType !== 'pickup') {
                try {
                    await this.createVendorShipments(order, user, vendorGroups, deliveryType);
                }
                catch (error) {
                    logger_1.logger.error('Error creating ShipBubble shipments:', error);
                }
            }
        }
        else if (paymentMethod === types_1.PaymentMethod.CASH_ON_DELIVERY) {
            // Should never happen for digital due to validation
            order.status = types_1.OrderStatus.CONFIRMED;
            await order.save();
        }
        // Clear cart
        cart.items = [];
        cart.couponCode = undefined;
        cart.discount = 0;
        await cart.save();
        // Update coupon usage
        if (order.couponCode) {
            const { Coupon } = await Promise.resolve().then(() => __importStar(require('../models/Additional')));
            await Coupon.findOneAndUpdate({ code: order.couponCode }, {
                $inc: { usageCount: 1 },
                $push: { usedBy: user._id },
            });
        }
        // ✅ Update product sales
        for (const item of order.items) {
            await Product_1.default.findByIdAndUpdate(item.product, {
                $inc: {
                    totalSales: item.quantity,
                },
            });
        }
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
                isDigital: isDigitalOnly, // ✅ Let frontend know
            },
        });
    }
    async createVendorShipments(order, user, vendorGroups, deliveryType) {
        for (const group of vendorGroups) {
            const physicalItems = group.items.filter(item => item.isPhysical);
            if (physicalItems.length === 0) {
                continue;
            }
            try {
                const vendor = await User_1.default.findById(group.vendorId);
                const vendorProfile = await VendorProfile_1.default.findOne({ user: group.vendorId });
                if (!vendor)
                    continue;
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
                logger_1.logger.info('📦 Creating shipment with addresses:', {
                    sender: senderAddress.address,
                    receiver: receiverAddress.address,
                });
                const packageItems = physicalItems.map((item) => ({
                    name: item.productName,
                    description: item.productName,
                    unit_weight: item.weight.toString(),
                    unit_amount: item.price.toString(),
                    quantity: item.quantity.toString(),
                }));
                const ratesResponse = await shipbubble_service_1.shipBubbleService.getDeliveryRates(senderAddress, receiverAddress, packageItems);
                if (ratesResponse.status === 'success' && ratesResponse.data?.request_token) {
                    let selectedCourier;
                    if (deliveryType === 'express' || deliveryType === 'same_day') {
                        selectedCourier = ratesResponse.data.fastest_courier || ratesResponse.data.couriers[0];
                    }
                    else {
                        selectedCourier = ratesResponse.data.cheapest_courier || ratesResponse.data.couriers[0];
                    }
                    if (selectedCourier) {
                        const shipment = await shipbubble_service_1.shipBubbleService.createShipment(ratesResponse.data.request_token, selectedCourier.courier_id, false);
                        if (shipment.data?.tracking_number) {
                            const vendorShipment = order.vendorShipments.find((vs) => vs.vendor.toString() === group.vendorId);
                            if (vendorShipment) {
                                vendorShipment.trackingNumber = shipment.data.tracking_number;
                                vendorShipment.shipmentId = shipment.data.shipment_id || shipment.data.tracking_number;
                                vendorShipment.courier = selectedCourier.courier_name;
                                vendorShipment.status = 'created';
                            }
                            await order.save();
                            logger_1.logger.info(`✅ Shipment created for vendor ${group.vendorName}: ${shipment.data.tracking_number}`);
                        }
                    }
                }
            }
            catch (error) {
                logger_1.logger.error(`❌ Error creating shipment for vendor ${group.vendorName}:`, {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                });
            }
        }
    }
    /**
     * Verify payment - WITH DIGITAL PRODUCT ACCESS
     */
    async verifyPayment(req, res) {
        const { reference } = req.params;
        const order = await Order_1.default.findOne({ orderNumber: reference }).populate('items.product');
        if (!order) {
            throw new error_1.AppError('Order not found', 404);
        }
        if (order.paymentStatus === types_1.PaymentStatus.COMPLETED) {
            res.json({
                success: true,
                message: 'Payment already verified',
                data: { order },
            });
            return;
        }
        try {
            const verification = await paystack_service_1.paystackService.verifyPayment(reference);
            if (verification.data.status === 'success') {
                const isDigitalOnly = this.isDigitalOnly(order.items);
                order.paymentStatus = types_1.PaymentStatus.COMPLETED;
                order.status = isDigitalOnly ? types_1.OrderStatus.DELIVERED : types_1.OrderStatus.CONFIRMED; // ✅ Digital = instant delivery
                await order.save();
                // Reduce product quantities
                for (const item of order.items) {
                    const product = await Product_1.default.findById(item.product);
                    if (!product)
                        continue;
                    const productType = product.productType?.toUpperCase();
                    const isPhysical = productType !== 'DIGITAL' && productType !== 'SERVICE';
                    if (isPhysical) {
                        await Product_1.default.findByIdAndUpdate(item.product, {
                            $inc: {
                                quantity: -item.quantity,
                                totalSales: item.quantity,
                            },
                        });
                    }
                    else {
                        await Product_1.default.findByIdAndUpdate(item.product, {
                            $inc: {
                                totalSales: item.quantity,
                            },
                        });
                    }
                }
                // ✅ Digital products are instantly accessible
                if (isDigitalOnly) {
                    logger_1.logger.info(`✅ Digital order payment verified - instant access granted: ${order.orderNumber}`);
                }
                // Create ShipBubble shipments for physical products
                if (!isDigitalOnly && order.deliveryType !== 'pickup') {
                    try {
                        const user = await User_1.default.findById(order.user);
                        if (user) {
                            const cart = await Cart_1.default.findOne({ user: order.user }).populate('items.product');
                            if (cart && cart.items.length > 0) {
                                const vendorGroups = await this.groupItemsByVendor(cart.items);
                                await this.createVendorShipments(order, user, vendorGroups, order.deliveryType || 'standard');
                            }
                        }
                    }
                    catch (error) {
                        logger_1.logger.error('Error creating ShipBubble shipments after payment:', error);
                    }
                }
                // ✅ AWARD POINTS AFTER SUCCESSFUL PAYMENT
                try {
                    const { rewardController } = await Promise.resolve().then(() => __importStar(require('./reward.controller')));
                    await rewardController.awardOrderPoints(order._id.toString());
                    logger_1.logger.info(`✅ Points awarded for order ${order.orderNumber}`);
                }
                catch (error) {
                    logger_1.logger.error('Error awarding points:', error);
                }
                // Send confirmation email
                const user = await User_1.default.findById(order.user);
                if (user) {
                    await (0, email_1.sendOrderConfirmationEmail)(user.email, order.orderNumber, order.total);
                }
                logger_1.logger.info(`Payment verified for order ${order.orderNumber}`, {
                    isDigital: isDigitalOnly,
                });
                res.json({
                    success: true,
                    message: 'Payment verified successfully',
                    data: {
                        order,
                        isDigital: isDigitalOnly, // ✅ Let frontend know
                    },
                });
            }
            else {
                order.paymentStatus = types_1.PaymentStatus.FAILED;
                order.status = types_1.OrderStatus.FAILED;
                await order.save();
                throw new error_1.AppError('Payment verification failed', 400);
            }
        }
        catch (error) {
            logger_1.logger.error('Payment verification error:', error);
            throw new error_1.AppError('Failed to verify payment', 500);
        }
    }
    /**
     * Get user orders
     */
    async getUserOrders(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // ✅ FILTER BY STATUS IF PROVIDED
        const filter = { user: req.user?.id };
        if (req.query.status) {
            filter.status = req.query.status;
        }
        const orders = await Order_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('items.product', 'name images');
        const total = await Order_1.default.countDocuments(filter);
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
    async getOrder(req, res) {
        const order = await Order_1.default.findOne({
            _id: req.params.id,
            user: req.user?.id,
        })
            .populate('items.product', 'name images slug productType digitalFile')
            .populate('items.vendor', 'firstName lastName email')
            .populate('vendorShipments.vendor', 'firstName lastName');
        if (!order) {
            throw new error_1.AppError('Order not found', 404);
        }
        res.json({
            success: true,
            data: { order },
        });
    }
    /**
     * Get single order for vendor (vendor can view orders containing their products)
     */
    async getVendorOrder(req, res) {
        const order = await Order_1.default.findById(req.params.id)
            .populate('user', 'firstName lastName email phone')
            .populate('items.product', 'name images slug productType digitalFile')
            .populate('items.vendor', 'firstName lastName email')
            .populate('vendorShipments.vendor', 'firstName lastName');
        if (!order) {
            throw new error_1.AppError('Order not found', 404);
        }
        // Check that this vendor has items in the order
        const hasVendorItems = order.items.some(item => item.vendor && item.vendor.toString() === req.user?.id ||
            (typeof item.vendor === 'object' && item.vendor._id?.toString() === req.user?.id));
        if (!hasVendorItems) {
            throw new error_1.AppError('Not authorized to view this order', 403);
        }
        // Filter to only show this vendor's items
        const vendorItems = order.items.filter(item => item.vendor && (item.vendor.toString() === req.user?.id ||
            (typeof item.vendor === 'object' && item.vendor._id?.toString() === req.user?.id)));
        // Find this vendor's shipment
        const vendorShipment = order.vendorShipments?.find((shipment) => {
            const shipVendorId = typeof shipment.vendor === 'object'
                ? shipment.vendor._id?.toString()
                : shipment.vendor?.toString();
            return shipVendorId === req.user?.id;
        });
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
    async getUserDigitalProducts(req, res) {
        const orders = await Order_1.default.find({
            user: req.user?.id,
            paymentStatus: types_1.PaymentStatus.COMPLETED,
        })
            .populate('items.product')
            .sort({ createdAt: -1 });
        const digitalProducts = [];
        for (const order of orders) {
            for (let i = 0; i < order.items.length; i++) {
                const item = order.items[i];
                const product = item.product;
                if (!product)
                    continue;
                const productType = product.productType?.toUpperCase();
                const isDigital = productType === 'DIGITAL' || productType === 'SERVICE';
                if (isDigital) {
                    digitalProducts.push({
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        itemId: item._id || `${order._id}-${i}`, // ✅ Use product index as fallback
                        product: {
                            _id: product._id,
                            name: product.name,
                            slug: product.slug,
                            image: product.images[0],
                            productType: product.productType,
                        },
                        purchaseDate: order.createdAt,
                        downloadUrl: product.digitalFile?.url || product.downloadLink,
                        fileSize: product.digitalFile?.fileSize,
                        fileType: product.digitalFile?.fileType,
                        version: product.digitalFile?.version,
                    });
                }
            }
        }
        logger_1.logger.info(`📦 Found ${digitalProducts.length} digital products for user ${req.user?.id}`);
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
    async downloadDigitalProduct(req, res) {
        const { id: orderId, itemId } = req.params;
        const order = await Order_1.default.findOne({
            _id: orderId,
            user: req.user?.id,
            paymentStatus: types_1.PaymentStatus.COMPLETED,
        }).populate('items.product');
        if (!order) {
            throw new error_1.AppError('Order not found or payment not completed', 404);
        }
        // Find item by _id or by index if itemId looks like "orderId-index"
        let item = null;
        if (itemId.includes('-')) {
            // ItemId is in format "orderId-index"
            const index = parseInt(itemId.split('-').pop() || '0');
            item = order.items[index];
        }
        else {
            // ItemId is actual item._id
            item = order.items.find((i) => i._id?.toString() === itemId);
        }
        if (!item) {
            throw new error_1.AppError('Product not found in order', 404);
        }
        const product = item.product;
        if (!product) {
            throw new error_1.AppError('Product not found', 404);
        }
        const productType = product.productType?.toUpperCase();
        const isDigital = productType === 'DIGITAL' || productType === 'SERVICE';
        if (!isDigital) {
            throw new error_1.AppError('This product is not a digital product', 400);
        }
        const downloadUrl = product.digitalFile?.url || product.downloadLink;
        if (!downloadUrl) {
            throw new error_1.AppError('Download URL not available', 404);
        }
        logger_1.logger.info(`📥 User ${req.user?.id} downloading product ${product.name} from order ${order.orderNumber}`);
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
     * Track order shipment
     */
    async trackOrder(req, res) {
        const { id } = req.params;
        const order = await Order_1.default.findOne({
            _id: id,
            user: req.user?.id,
        }).populate('vendorShipments.vendor', 'firstName lastName');
        if (!order) {
            throw new error_1.AppError('Order not found', 404);
        }
        if (order.vendorShipments && order.vendorShipments.length > 0) {
            const trackingData = await Promise.all(order.vendorShipments.map(async (shipment) => {
                if (!shipment.trackingNumber) {
                    return {
                        vendor: shipment.vendorName,
                        trackingNumber: null,
                        tracking: null,
                        status: shipment.status,
                    };
                }
                try {
                    const tracking = await shipbubble_service_1.shipBubbleService.trackShipment(shipment.trackingNumber);
                    return {
                        vendor: shipment.vendorName,
                        trackingNumber: shipment.trackingNumber,
                        tracking: tracking.data,
                        status: shipment.status,
                    };
                }
                catch (error) {
                    logger_1.logger.error(`Error tracking shipment ${shipment.trackingNumber}:`, error);
                    return {
                        vendor: shipment.vendorName,
                        trackingNumber: shipment.trackingNumber,
                        tracking: null,
                        status: shipment.status,
                    };
                }
            }));
            res.json({
                success: true,
                data: {
                    order,
                    tracking: trackingData,
                    multiVendor: true,
                },
            });
        }
        else {
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
                const tracking = await shipbubble_service_1.shipBubbleService.trackShipment(order.trackingNumber);
                res.json({
                    success: true,
                    data: {
                        order,
                        tracking: tracking.data,
                    },
                });
            }
            catch (error) {
                logger_1.logger.error('Error tracking shipment:', error);
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
    async cancelOrder(req, res) {
        const { cancelReason } = req.body;
        const order = await Order_1.default.findOne({
            _id: req.params.id,
            user: req.user?.id,
        });
        if (!order) {
            throw new error_1.AppError('Order not found', 404);
        }
        if (![types_1.OrderStatus.PENDING, types_1.OrderStatus.CONFIRMED].includes(order.status)) {
            throw new error_1.AppError('Order cannot be cancelled at this stage', 400);
        }
        order.status = types_1.OrderStatus.CANCELLED;
        order.cancelReason = cancelReason;
        await order.save();
        // Cancel shipments
        if (order.vendorShipments && order.vendorShipments.length > 0) {
            for (const shipment of order.vendorShipments) {
                if (shipment.trackingNumber) {
                    try {
                        await shipbubble_service_1.shipBubbleService.cancelShipment(shipment.trackingNumber);
                        shipment.status = 'cancelled';
                        logger_1.logger.info(`ShipBubble shipment cancelled: ${shipment.trackingNumber}`);
                    }
                    catch (error) {
                        logger_1.logger.error(`Error cancelling ShipBubble shipment ${shipment.trackingNumber}:`, error);
                    }
                }
            }
            await order.save();
        }
        if (order.trackingNumber) {
            try {
                await shipbubble_service_1.shipBubbleService.cancelShipment(order.trackingNumber);
                logger_1.logger.info(`ShipBubble shipment cancelled: ${order.trackingNumber}`);
            }
            catch (error) {
                logger_1.logger.error('Error cancelling ShipBubble shipment:', error);
            }
        }
        // Restore product quantities (physical products only)
        for (const item of order.items) {
            const product = await Product_1.default.findById(item.product);
            if (!product)
                continue;
            const productType = product.productType?.toUpperCase();
            const isPhysical = productType !== 'DIGITAL' && productType !== 'SERVICE';
            if (isPhysical) {
                await Product_1.default.findByIdAndUpdate(item.product, {
                    $inc: {
                        quantity: item.quantity,
                        totalSales: -item.quantity,
                    },
                });
            }
        }
        // Refund if payment completed
        if (order.paymentStatus === types_1.PaymentStatus.COMPLETED) {
            const wallet = await Additional_1.Wallet.findOne({ user: req.user?.id });
            if (wallet) {
                wallet.balance += order.total;
                wallet.transactions.push({
                    type: types_1.TransactionType.CREDIT,
                    amount: order.total,
                    purpose: types_1.WalletPurpose.REFUND,
                    reference: `REF-${order.orderNumber}`,
                    description: `Refund for cancelled order ${order.orderNumber}`,
                    relatedOrder: order._id,
                    status: 'completed',
                    timestamp: new Date(),
                });
                await wallet.save();
            }
            order.paymentStatus = types_1.PaymentStatus.REFUNDED;
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
    async getVendorOrders(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const orders = await Order_1.default.find({
            'items.vendor': req.user?.id,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'firstName lastName email phone')
            .populate('items.product', 'name images');
        const filteredOrders = orders.map(order => {
            const vendorItems = order.items.filter(item => item.vendor.toString() === req.user?.id);
            const vendorShipment = order.vendorShipments?.find((shipment) => shipment.vendor.toString() === req.user?.id);
            return {
                ...order.toObject(),
                items: vendorItems,
                vendorShipment,
            };
        });
        const total = await Order_1.default.countDocuments({
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
    async updateOrderStatus(req, res) {
        const { status } = req.body;
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            throw new error_1.AppError('Order not found', 404);
        }
        const hasVendorItems = order.items.some(item => item.vendor.toString() === req.user?.id);
        if (!hasVendorItems) {
            throw new error_1.AppError('Not authorized', 403);
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
    getDefaultRate(deliveryType) {
        const defaultRates = {
            standard: 2500,
            express: 5000,
            same_day: 8000,
        };
        return defaultRates[deliveryType] || 2500;
    }
    getDefaultEstimate(deliveryType) {
        const defaultEstimates = {
            standard: '5-7 days',
            express: '2-3 days',
            same_day: 'Same day',
        };
        return defaultEstimates[deliveryType] || '5-7 days';
    }
    getDefaultDescription(deliveryType) {
        const descriptions = {
            standard: 'Delivery within 5-7 business days',
            express: 'Delivery within 2-3 business days',
            same_day: 'Delivery within 24 hours',
        };
        return descriptions[deliveryType] || 'Standard delivery';
    }
    getVendorFallbackRates() {
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
    getFallbackRates() {
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
exports.OrderController = OrderController;
exports.orderController = new OrderController();
//# sourceMappingURL=order.controller.js.map