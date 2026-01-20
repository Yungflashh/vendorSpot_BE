import axios from 'axios';
import { logger } from '../utils/logger';

const SHIPBUBBLE_API_KEY = process.env.SHIPBUBBLE_API_KEY || '';
const SHIPBUBBLE_BASE_URL = process.env.SHIPBUBBLE_BASE_URL || 'https://api.shipbubble.com/v1';

interface ShipmentData {
  sender: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
  receiver: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
  shipment: {
    items: {
      name: string;
      description: string;
      weight: number; // in kg
      quantity: number;
      value: number;
    }[];
    delivery_type: 'standard' | 'express' | 'same_day';
    payment_type: 'prepaid' | 'postpaid';
  };
}

interface DeliveryQuote {
  origin: string;
  destination: string;
  weight: number;
  delivery_type: string;
}

export class ShipBubbleService {
  private headers = {
    Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  /**
   * Get delivery quote/estimate
   */
  async getDeliveryQuote(data: DeliveryQuote) {
    try {
      const response = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/rates`,
        data,
        { headers: this.headers }
      );

      logger.info('ShipBubble quote retrieved');
      return response.data;
    } catch (error: any) {
      logger.error('ShipBubble quote error:', error.response?.data || error.message);
      throw new Error('Failed to get delivery quote');
    }
  }

  /**
   * Create shipment
   */
  async createShipment(data: ShipmentData) {
    try {
      const response = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/shipment`,
        data,
        { headers: this.headers }
      );

      logger.info('ShipBubble shipment created:', response.data.data?.tracking_number);
      return response.data;
    } catch (error: any) {
      logger.error('ShipBubble shipment error:', error.response?.data || error.message);
      throw new Error('Failed to create shipment');
    }
  }

  /**
   * Track shipment
   */
  async trackShipment(trackingNumber: string) {
    try {
      const response = await axios.get(
        `${SHIPBUBBLE_BASE_URL}/shipping/track/${trackingNumber}`,
        { headers: this.headers }
      );

      logger.info('ShipBubble tracking retrieved:', trackingNumber);
      return response.data;
    } catch (error: any) {
      logger.error('ShipBubble tracking error:', error.response?.data || error.message);
      throw new Error('Failed to track shipment');
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(trackingNumber: string) {
    try {
      const response = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/cancel/${trackingNumber}`,
        {},
        { headers: this.headers }
      );

      logger.info('ShipBubble shipment cancelled:', trackingNumber);
      return response.data;
    } catch (error: any) {
      logger.error('ShipBubble cancel error:', error.response?.data || error.message);
      throw new Error('Failed to cancel shipment');
    }
  }

  /**
   * Get available couriers
   */
  async getCouriers(city: string, state: string) {
    try {
      const response = await axios.get(
        `${SHIPBUBBLE_BASE_URL}/shipping/couriers`,
        {
          params: { city, state },
          headers: this.headers,
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('ShipBubble couriers error:', error.response?.data || error.message);
      throw new Error('Failed to get couriers');
    }
  }

  /**
   * Verify address
   */
  async verifyAddress(address: string, city: string, state: string) {
    try {
      const response = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/verify-address`,
        { address, city, state },
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      logger.error('ShipBubble address verification error:', error.response?.data || error.message);
      return { valid: false };
    }
  }
}

export const shipBubbleService = new ShipBubbleService();
