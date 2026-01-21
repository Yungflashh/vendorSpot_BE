// services/shipbubble.service.ts
import axios from 'axios';
import { logger } from '../utils/logger';

const SHIPBUBBLE_API_KEY = process.env.SHIPBUBBLE_API_KEY || '';
const SHIPBUBBLE_BASE_URL = process.env.SHIPBUBBLE_BASE_URL || 'https://api.shipbubble.com/v1';

interface ShipBubbleAddress {
  name: string;
  phone: string;
  email: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface ValidatedAddress {
  address_code: number;
  formatted_address: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

interface PackageItem {
  name: string;
  description: string;
  unit_weight: string; // in KG
  unit_amount: string; // price
  quantity: string;
}

interface FetchRatesRequest {
  sender_address_code: number;
  reciever_address_code: number; // Note: ShipBubble uses 'reciever' (missing one 'e' and one 'i')
  pickup_date: string; // format: "yyyy-mm-dd"
  category_id: number;
  package_items: PackageItem[];
  package_dimension: {
    length: number;
    width: number;
    height: number;
  };
  service_type?: 'pickup' | 'dropoff';
  delivery_instructions?: string;
}

export class ShipBubbleService {
  private headers = {
    Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  // Cache for address codes to avoid duplicate API calls
  private addressCache = new Map<string, number>();

  constructor() {
    this.validateConfig();
  }

  private validateConfig() {
    logger.info('🔍 Validating ShipBubble configuration...');
    
    if (!SHIPBUBBLE_API_KEY) {
      logger.error('❌ SHIPBUBBLE_API_KEY is not set!');
    } else {
      logger.info('✅ ShipBubble API Key is set');
    }
  }

  /**
   * Generate cache key for an address
   */
  private getAddressCacheKey(address: ShipBubbleAddress): string {
    return `${address.email}-${address.phone}-${address.address}`;
  }

  /**
   * Validate and get address code
   */
  async validateAddress(address: ShipBubbleAddress): Promise<ValidatedAddress> {
    try {
      // Check cache first
      const cacheKey = this.getAddressCacheKey(address);
      const cachedCode = this.addressCache.get(cacheKey);
      
      if (cachedCode) {
        logger.info('✅ Using cached address code:', cachedCode);
        return {
          address_code: cachedCode,
          formatted_address: address.address,
          city: '',
          state: '',
          country: 'Nigeria',
        };
      }

      logger.info('📍 Validating ShipBubble address:', {
        name: address.name,
        address: address.address,
      });

      // Log the exact payload being sent
      const payload = {
        name: address.name,
        email: address.email,
        phone: address.phone,
        address: address.address,
        latitude: address.latitude,
        longitude: address.longitude,
      };
      
      logger.info('📤 Sending to ShipBubble:', payload);

      const response = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/address/validate`,
        payload,
        { headers: this.headers }
      );

      logger.info('📥 ShipBubble response:', {
        status: response.data.status,
        hasAddressCode: !!response.data.data?.address_code,
        data: response.data.data,
      });

      if (response.data.status === 'success' && response.data.data?.address_code) {
        const validatedData: ValidatedAddress = {
          address_code: response.data.data.address_code,
          formatted_address: response.data.data.formatted_address || address.address,
          city: response.data.data.city || '',
          state: response.data.data.state || '',
          country: response.data.data.country || 'Nigeria',
          postal_code: response.data.data.postal_code,
          latitude: response.data.data.latitude,
          longitude: response.data.data.longitude,
        };

        // Cache the address code
        this.addressCache.set(cacheKey, validatedData.address_code);

        logger.info('✅ Address validated with code:', validatedData.address_code);
        
        return validatedData;
      }

      throw new Error('Address validation failed - no address code returned');
    } catch (error: any) {
      logger.error('❌ ShipBubble address validation error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        requestPayload: {
          name: address.name,
          email: address.email,
          phone: address.phone,
          address: address.address,
        },
      });
      throw new Error('Failed to validate ShipBubble address');
    }
  }

  /**
   * Get delivery rates using ShipBubble's fetch_rates endpoint
   */
async getDeliveryRates(
  senderAddress: ShipBubbleAddress,
  receiverAddress: ShipBubbleAddress,
  packageItems: PackageItem[],
  packageDimension?: { length: number; width: number; height: number },
  categoryId?: number // Allow custom category
) {
  try {
    logger.info('📦 Fetching ShipBubble delivery rates');

    // 🔍 LOG BOTH ADDRESSES BEFORE VALIDATION
    logger.info('🔍 ================ SENDER ADDRESS ================');
    logger.info('📤 Sender Details:', {
      name: senderAddress.name,
      email: senderAddress.email,
      phone: senderAddress.phone,
      address: senderAddress.address,
      latitude: senderAddress.latitude,
      longitude: senderAddress.longitude,
    });

    logger.info('🔍 ================ RECEIVER ADDRESS ================');
    logger.info('📥 Receiver Details:', {
      name: receiverAddress.name,
      email: receiverAddress.email,
      phone: receiverAddress.phone,
      address: receiverAddress.address,
      latitude: receiverAddress.latitude,
      longitude: receiverAddress.longitude,
    });

    logger.info('🔍 ================================================');

    // Step 1: Validate sender and receiver addresses
    logger.info('🔄 Starting address validation...');
    
    let senderValidated: ValidatedAddress;
    let receiverValidated: ValidatedAddress;

    try {
      logger.info('📍 Validating SENDER address...');
      senderValidated = await this.validateAddress(senderAddress);
      logger.info('✅ Sender validated:', senderValidated);
    } catch (error: any) {
      logger.error('❌ SENDER validation failed:', error.message);
      throw error;
    }

    try {
      logger.info('📍 Validating RECEIVER address...');
      receiverValidated = await this.validateAddress(receiverAddress);
      logger.info('✅ Receiver validated:', receiverValidated);
    } catch (error: any) {
      logger.error('❌ RECEIVER validation failed:', error.message);
      throw error;
    }

    logger.info('✅ Both addresses validated:', {
      senderCode: senderValidated.address_code,
      receiverCode: receiverValidated.address_code,
    });

    // Step 2: Prepare pickup date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupDate = tomorrow.toISOString().split('T')[0]; // yyyy-mm-dd

    // Step 3: Determine category - use provided or default to Electronics and gadgets
    const selectedCategoryId = categoryId || 77179563; // Default to Electronics and gadgets (77179563)

    // Step 4: Fetch rates
    const requestBody: FetchRatesRequest = {
      sender_address_code: senderValidated.address_code,
      reciever_address_code: receiverValidated.address_code, // Note: ShipBubble uses 'reciever' (their spelling)
      pickup_date: pickupDate,
      category_id: selectedCategoryId,
      package_items: packageItems,
      package_dimension: packageDimension || {
        length: 20,
        width: 20,
        height: 20,
      },
      service_type: 'pickup',
    };

    logger.info('📡 ShipBubble fetch_rates request:', {
      endpoint: `${SHIPBUBBLE_BASE_URL}/shipping/fetch_rates`,
      senderAddressCode: senderValidated.address_code,
      receiverAddressCode: receiverValidated.address_code,
      pickupDate,
      categoryId: selectedCategoryId,
      itemCount: packageItems.length,
    });

    const response = await axios.post(
      `${SHIPBUBBLE_BASE_URL}/shipping/fetch_rates`,
      requestBody,
      { headers: this.headers, timeout: 30000 }
    );

    logger.info('✅ ShipBubble rates retrieved:', {
      status: response.data.status,
      courierCount: response.data.data?.couriers?.length || 0,
      requestToken: response.data.data?.request_token,
      hasCheapest: !!response.data.data?.cheapest_courier,
      hasFastest: !!response.data.data?.fastest_courier,
    });

    return response.data;
  } catch (error: any) {
    logger.error('❌ ShipBubble fetch_rates error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      logger.error('🔐 Unauthorized - Check your SHIPBUBBLE_API_KEY');
    } else if (error.response?.status === 400) {
      logger.error('⚠️ Bad Request - Invalid parameters');
    } else if (error.response?.status === 422) {
      logger.error('⚠️ Unprocessable Entity - Validation failed:', {
        errors: error.response?.data?.errors,
      });
    }

    throw error;
  }
}

/**
 * Get package categories
 */
async getCategories() {
  try {
    logger.info('📦 Fetching package categories...');

    const response = await axios.get(
      `${SHIPBUBBLE_BASE_URL}/shipping/labels/categories`,
      { headers: this.headers }
    );

    logger.info('✅ Categories retrieved:', response.data.data?.length || 0);
    
    return response.data;
  } catch (error: any) {
    logger.error('❌ ShipBubble categories error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw new Error('Failed to get categories');
  }
}

/**
 * Get category ID by name (helper function)
 * Updated with actual ShipBubble category IDs from their API
 */
getCategoryIdByName(categoryName: string): number {
  const categories: { [key: string]: number } = {
    'hot food': 98190590,
    'dry food': 24032950,
    'dry food and supplements': 24032950,
    'electronics': 77179563,
    'electronics and gadgets': 77179563,
    'electronic gadgets': 77179563,
    'groceries': 2178251,
    'sensitive items': 67658572,
    'documents': 67658572,
    'light weight': 20754594,
    'light weight items': 20754594,
    'machinery': 67008831,
    'medical supplies': 57487393,
    'health and beauty': 99652979,
    'beauty': 99652979,
    'furniture': 25590994,
    'furniture and fittings': 25590994,
    'fashion': 74794423,
    'fashion wears': 74794423,
    'default': 77179563, // Default to Electronics and gadgets
  };

  const normalized = categoryName.toLowerCase().trim();
  return categories[normalized] || categories['default'];
}

  /**
   * Get all validated addresses
   */
  async getAddresses() {
    try {
      logger.info('📍 Fetching all validated addresses');

      const response = await axios.get(
        `${SHIPBUBBLE_BASE_URL}/shipping/address`,
        { headers: this.headers }
      );

      logger.info('✅ Addresses retrieved:', response.data.data?.results?.length || 0);
      
      return response.data;
    } catch (error: any) {
      logger.error('❌ ShipBubble get addresses error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error('Failed to get addresses');
    }
  }

  /**
   * Get single address by code
   */
  async getAddressByCode(addressCode: number) {
    try {
      logger.info('📍 Fetching address:', addressCode);

      const response = await axios.get(
        `${SHIPBUBBLE_BASE_URL}/shipping/address/${addressCode}`,
        { headers: this.headers }
      );

      logger.info('✅ Address retrieved');
      
      return response.data;
    } catch (error: any) {
      logger.error('❌ ShipBubble get address error:', {
        addressCode,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error('Failed to get address');
    }
  }

  /**
   * Update address
   */
  async updateAddress(
    addressCode: number,
    updates: { name?: string; email?: string; phone?: string }
  ) {
    try {
      logger.info('📍 Updating address:', addressCode);

      const response = await axios.patch(
        `${SHIPBUBBLE_BASE_URL}/shipping/address/${addressCode}`,
        updates,
        { headers: this.headers }
      );

      logger.info('✅ Address updated');
      
      return response.data;
    } catch (error: any) {
      logger.error('❌ ShipBubble update address error:', {
        addressCode,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error('Failed to update address');
    }
  }

  /**
   * Create shipment (book a shipment after getting rates)
   */
  async createShipment(
    requestToken: string,
    courierId: string | number,
    isInvoiceRequired: boolean = false
  ) {
    try {
      logger.info('📦 Creating ShipBubble shipment:', {
        requestToken,
        courierId,
      });

      const response = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/labels`,
        {
          request_token: requestToken,
          courier_id: courierId,
          is_invoice_required: isInvoiceRequired,
        },
        { headers: this.headers }
      );

      logger.info('✅ ShipBubble shipment created:', {
        trackingNumber: response.data.data?.tracking_number,
        label: response.data.data?.label,
      });

      return response.data;
    } catch (error: any) {
      logger.error('❌ ShipBubble shipment creation error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error('Failed to create shipment');
    }
  }

  /**
   * Track shipment
   */
  async trackShipment(trackingNumber: string) {
    try {
      logger.info('📍 Tracking shipment:', trackingNumber);

      const response = await axios.get(
        `${SHIPBUBBLE_BASE_URL}/shipping/track/${trackingNumber}`,
        { headers: this.headers }
      );

      logger.info('✅ Tracking info retrieved:', trackingNumber);
      return response.data;
    } catch (error: any) {
      logger.error('❌ ShipBubble tracking error:', {
        trackingNumber,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error('Failed to track shipment');
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(trackingNumber: string) {
    try {
      logger.info('🚫 Cancelling shipment:', trackingNumber);

      const response = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/cancel`,
        { tracking_number: trackingNumber },
        { headers: this.headers }
      );

      logger.info('✅ Shipment cancelled:', trackingNumber);
      return response.data;
    } catch (error: any) {
      logger.error('❌ ShipBubble cancel error:', {
        trackingNumber,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error('Failed to cancel shipment');
    }
  }


  /**
   * Clear address cache
   */
  clearAddressCache() {
    this.addressCache.clear();
    logger.info('🗑️ Address cache cleared');
  }
}

export const shipBubbleService = new ShipBubbleService();