// types/shipping.types.ts
import { Types } from 'mongoose';

export interface VendorGroup {
  vendorId: string;
  vendorName: string;
  vendorAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
  items: {
    productId: string;
    productName: string;
    quantity: number;
    weight: number;
    isPhysical: boolean;
    price: number;
  }[];
  totalWeight: number;
}

export interface VendorDeliveryRate {
  vendorId: string;
  vendorName: string;
  rates: {
    type: string;
    name: string;
    description: string;
    price: number;
    estimatedDays: string;
    courier: string;
    logo?: string;
  }[];
  success: boolean;
}

export interface DeliveryRateResponse {
  type: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
  courier: string;
  logo?: string;
  pickupAddress?: string;
  vendorBreakdown?: {
    vendorId: string;
    vendorName: string;
    price: number;
    courier: string;
  }[];
}