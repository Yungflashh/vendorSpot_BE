// controllers/admin-webhook.controller.ts
import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import Order from '../models/Order';
import { AppError } from '../middleware/error';
import { shipBubbleWebhookService } from '../services/shipbubble-webhook.service';
import { logger } from '../utils/logger';

export class AdminWebhookController {
  /**
   * Simulate webhook for vendor's own order (vendors only)
   */
  async simulateVendorOwnWebhook(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { orderId, statusCode } = req.body;

    if (!orderId || !statusCode) {
      throw new AppError('orderId and statusCode are required', 400);
    }

    const validStatuses = ['pending', 'confirmed', 'picked_up', 'in_transit', 'completed', 'cancelled'];
    if (!validStatuses.includes(statusCode)) {
      throw new AppError(`Invalid status code. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    logger.info('🧪 ============================================');
    logger.info('🧪 VENDOR WEBHOOK SIMULATION (OWN ORDER)');
    logger.info('🧪 ============================================');
    logger.info('👤 Vendor:', req.user?.email);
    logger.info('📦 Order ID:', orderId);
    logger.info('📊 Status Code:', statusCode);

    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Verify vendor has items in this order
      const hasVendorItems = order.items.some(
        item => item.vendor.toString() === req.user?.id
      );

      if (!hasVendorItems) {
        throw new AppError('Not authorized - order does not contain your items', 403);
      }

      // Find vendor's shipment
      const vendorShipment = (order as any).vendorShipments?.find(
        (s: any) => s.vendor.toString() === req.user?.id
      );

      if (!vendorShipment?.trackingNumber) {
        throw new AppError('No tracking number found for your shipment', 400);
      }

      logger.info('📦 Simulating webhook for tracking:', vendorShipment.trackingNumber);

      // Simulate the webhook
      const result = await shipBubbleWebhookService.simulateWebhook({
        orderId: vendorShipment.trackingNumber,
        statusCode,
      });

      logger.info('✅ Webhook simulation completed');
      logger.info('🧪 ============================================\n');

      res.json({
        success: true,
        message: 'Shipment status updated successfully',
        data: {
          trackingNumber: vendorShipment.trackingNumber,
          newStatus: statusCode,
          result,
        },
      });
    } catch (error: any) {
      logger.error('❌ Vendor webhook simulation failed:', error);
      throw error;
    }
  }

  /**
   * Simulate webhook for testing (sandbox only)
   * This allows admins to trigger status updates manually for testing
   */
  async simulateWebhook(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { orderId, statusCode } = req.body;

    if (!orderId || !statusCode) {
      throw new AppError('orderId and statusCode are required', 400);
    }

    const validStatuses = ['pending', 'confirmed', 'picked_up', 'in_transit', 'completed', 'cancelled'];
    if (!validStatuses.includes(statusCode)) {
      throw new AppError(`Invalid status code. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    logger.info('🧪 ============================================');
    logger.info('🧪 ADMIN WEBHOOK SIMULATION REQUEST');
    logger.info('🧪 ============================================');
    logger.info('👤 Requested by:', req.user?.email);
    logger.info('📋 Parameters:', { orderId, statusCode });

    try {
      // Simulate the webhook
      const result = await shipBubbleWebhookService.simulateWebhook({
        orderId,
        statusCode,
      });

      logger.info('✅ Webhook simulation completed');
      logger.info('🧪 ============================================\n');

      res.json({
        success: true,
        message: 'Webhook simulated successfully. Check your webhook endpoint logs.',
        data: result,
      });
    } catch (error: any) {
      logger.error('❌ Webhook simulation failed:', error);
      throw new AppError('Failed to simulate webhook: ' + error.message, 500);
    }
  }

  /**
   * Get order shipment details for webhook simulation
   * Helps admins find the correct order_id to use
   */
  async getOrderShipmentDetails(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .select('orderNumber status vendorShipments trackingNumber');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const shipmentDetails = {
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      trackingNumber: order.trackingNumber,
      vendorShipments: (order as any).vendorShipments?.map((shipment: any) => ({
        vendorName: shipment.vendorName,
        trackingNumber: shipment.trackingNumber,
        shipmentId: shipment.shipmentId,
        status: shipment.status,
        courier: shipment.courier,
        trackingUrl: shipment.trackingUrl,
      })) || [],
    };

    res.json({
      success: true,
      message: 'Use the trackingNumber or shipmentId for webhook simulation',
      data: shipmentDetails,
    });
  }

  /**
   * Simulate webhook for specific vendor in multi-vendor order
   */
  async simulateVendorWebhook(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { orderNumber, vendorId, statusCode } = req.body;

    if (!orderNumber || !vendorId || !statusCode) {
      throw new AppError('orderNumber, vendorId, and statusCode are required', 400);
    }

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Find vendor's shipment
    const vendorShipment = (order as any).vendorShipments?.find(
      (s: any) => s.vendor.toString() === vendorId
    );

    if (!vendorShipment) {
      throw new AppError('Vendor shipment not found in this order', 404);
    }

    if (!vendorShipment.trackingNumber) {
      throw new AppError('No tracking number found for this vendor shipment', 400);
    }

    logger.info('🧪 Simulating webhook for vendor shipment:', {
      orderNumber,
      vendorName: vendorShipment.vendorName,
      trackingNumber: vendorShipment.trackingNumber,
      statusCode,
    });

    try {
      const result = await shipBubbleWebhookService.simulateWebhook({
        orderId: vendorShipment.trackingNumber,
        statusCode,
      });

      res.json({
        success: true,
        message: `Webhook simulated for ${vendorShipment.vendorName}'s shipment`,
        data: {
          vendorName: vendorShipment.vendorName,
          trackingNumber: vendorShipment.trackingNumber,
          result,
        },
      });
    } catch (error: any) {
      throw new AppError('Failed to simulate webhook: ' + error.message, 500);
    }
  }

  /**
   * Test webhook endpoint configuration
   */
  async testWebhookEndpoint(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    logger.info('🧪 Testing webhook endpoint configuration...');
    logger.info('👤 Requested by:', req.user?.email);

    try {
      const result = await shipBubbleWebhookService.testWebhookEndpoint();

      res.json({
        success: true,
        message: 'Webhook test initiated. Check your webhook endpoint logs.',
        data: result,
      });
    } catch (error: any) {
      throw new AppError('Failed to test webhook endpoint: ' + error.message, 500);
    }
  }
}

export const adminWebhookController = new AdminWebhookController();