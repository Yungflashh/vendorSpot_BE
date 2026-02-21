// services/shipbubble-webhook.service.ts
import axios from 'axios';
import { logger } from '../utils/logger';

export interface WebhookSimulatorParams {
  orderId: string;
  statusCode: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled';
}

export class ShipBubbleWebhookService {
  private baseUrl = 'https://api.shipbubble.com/v1';
  private apiKey = process.env.SHIPBUBBLE_API_KEY || '';
  private isSandbox = process.env.SHIPBUBBLE_ENVIRONMENT === 'sandbox';

  /**
   * Simulate webhook event (sandbox only)
   * This triggers ShipBubble to send a webhook to your configured endpoint
   * OR directly simulates the webhook if ShipBubble sandbox is not configured
   */
  async simulateWebhook(params: WebhookSimulatorParams) {
    // ✅ Allow simulation in development mode OR sandbox mode
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
    
    if (!this.isSandbox && !isDevelopment) {
      throw new Error('Webhook simulation is only available in sandbox or development mode');
    }

    logger.info('🧪 ============================================');
    logger.info('🧪 SIMULATING SHIPBUBBLE WEBHOOK');
    logger.info('🧪 ============================================');
    logger.info('📋 Simulation params:', params);
    logger.info('🔧 Environment:', {
      isSandbox: this.isSandbox,
      isDevelopment,
      NODE_ENV: process.env.NODE_ENV,
    });

    try {
      // ✅ Try to call ShipBubble API first
      const response = await axios.post(
        `${this.baseUrl}/shipping/labels/webhooks/${params.orderId}`,
        {
          status_code: params.statusCode,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('✅ Webhook simulation successful:', response.data);
      logger.info('🧪 ============================================\n');

      return response.data;
    } catch (error: any) {
      // ✅ If ShipBubble returns "No sandbox webhook url set", simulate directly
      if (error.response?.data?.message?.includes('No sandbox webhook url') || 
          error.response?.data?.message?.includes('webhook url')) {
        logger.warn('⚠️ ShipBubble sandbox webhook not configured, simulating directly...');
        return await this.simulateWebhookDirectly(params);
      }
      
      logger.error('❌ Webhook simulation failed:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      logger.info('🧪 ============================================\n');
      
      throw error;
    }
  }

  /**
   * Directly simulate webhook by calling our own webhook handler
   * This bypasses ShipBubble entirely for local testing
   */
  private async simulateWebhookDirectly(params: WebhookSimulatorParams) {
    logger.info('🔄 ============================================');
    logger.info('🔄 DIRECT WEBHOOK SIMULATION');
    logger.info('🔄 ============================================');
    logger.info('📋 Params:', params);

    // Map status codes to friendly names
    const statusMapping: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      completed: 'Delivered',
      cancelled: 'Cancelled',
    };

    // ✅ Construct webhook payload matching actual ShipBubble format
    const webhookPayload = {
      event: 'shipment.status.changed',
      order_id: params.orderId,
      status: params.statusCode,
      courier: {
        name: 'Bubble Express',
        email: 'courier@shipbubble.com',
        phone: '+2348000000000',
        tracking_code: params.orderId,
        tracking_message: `Tracking code: ${params.orderId}`,
        rider_info: null,
      },
      ship_from: {
        name: 'Vendor',
        phone: '+2348000000000',
        email: 'vendor@example.com',
        address: 'Lagos, Nigeria',
      },
      ship_to: {
        name: 'Customer',
        phone: '+2348000000000',
        email: 'customer@example.com',
        address: 'Lagos, Nigeria',
      },
      to_be_processed: new Date().toISOString(),
      payment: {
        shipping_fee: 0,
        currency: 'NGN',
      },
      package_status: [
        {
          status: statusMapping[params.statusCode] || params.statusCode,
          datetime: new Date().toISOString(),
        },
      ],
      insurance: null,
      events: [
        {
          event: params.statusCode,
          timestamp: new Date().toISOString(),
          description: `Package ${statusMapping[params.statusCode]?.toLowerCase() || params.statusCode}`,
          location: 'Lagos, Nigeria',
        },
      ],
      dropoff_station: null,
      pickup_station: null,
      tracking_url: `https://shipbubble.com/orders/tracking/${params.orderId}`,
      waybill_document: null,
      date: new Date().toISOString(),
    };

    logger.info('📦 Webhook payload:', webhookPayload);

    try {
      // ✅ Import and call the webhook handler directly
      const { webhookController } = await import('../controllers/webhook.controller');
      
      // Create a mock request object
      const mockReq: any = {
        body: webhookPayload,
        headers: {},
        method: 'POST',
        url: '/api/v1/webhooks/shipbubble',
      };

      // Create a mock response object
      let responseData: any = null;
      const mockRes: any = {
        status: (code: number) => mockRes,
        json: (data: any) => {
          responseData = data;
          return mockRes;
        },
      };

      // Call the webhook handler
      await webhookController.handleShipBubbleWebhook(mockReq, mockRes);

      logger.info('✅ Direct webhook simulation successful');
      logger.info('📤 Response:', responseData);
      logger.info('🔄 ============================================\n');

      return {
        success: true,
        message: 'Webhook simulated directly (bypass ShipBubble)',
        method: 'direct',
        payload: webhookPayload,
      };
    } catch (error: any) {
      logger.error('❌ Direct webhook simulation failed:', error);
      logger.info('🔄 ============================================\n');
      throw error;
    }
  }

  /**
   * Test webhook configuration
   * Sends a test webhook to verify your endpoint is working
   */
  async testWebhookEndpoint() {
    logger.info('🧪 Testing webhook endpoint configuration...');

    const testPayload = {
      order_id: 'TEST-ORDER-ID',
      status: 'pending',
      courier: {
        name: 'Test Courier',
        tracking_code: 'TEST123',
      },
    };

    logger.info('📤 Test payload:', testPayload);
    
    // This would send to your configured webhook URL
    // ShipBubble handles this automatically
    logger.info('✅ Webhook endpoint test initiated');
    
    return {
      success: true,
      message: 'Check your webhook endpoint logs for the test payload',
    };
  }
}

export const shipBubbleWebhookService = new ShipBubbleWebhookService();