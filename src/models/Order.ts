import mongoose, { Schema, Document, Types } from 'mongoose';
import { OrderStatus, PaymentStatus, PaymentMethod, IOrderItem, IShippingDetails, IAddress } from '../types';

export interface IOrder extends Document {
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  shippingAddress: IAddress;
  billingAddress?: IAddress;
  shippingDetails?: IShippingDetails;
  couponCode?: string;
  notes?: string;
  cancelReason?: string;
  refundAmount?: number;
  refundReason?: string;
  affiliateUser?: Types.ObjectId;
  affiliateCommission?: number;
  statusHistory: {
    status: OrderStatus;
    timestamp: Date;
    note?: string;
  }[];
}

const orderItemSchema = new Schema<IOrderItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  productImage: {
    type: String,
    required: true,
  },
  variant: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { _id: false });

const shippingDetailsSchema = new Schema<IShippingDetails>({
  method: String,
  cost: Number,
  estimatedDelivery: Date,
  trackingNumber: String,
  carrier: String,
}, { _id: false });

const addressSchema = new Schema<IAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  zipCode: String,
  isDefault: Boolean,
  label: String,
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: true,
  },
  paymentReference: String,
  shippingAddress: {
    type: addressSchema,
    required: true,
  },
  billingAddress: addressSchema,
  shippingDetails: shippingDetailsSchema,
  couponCode: String,
  notes: String,
  cancelReason: String,
  refundAmount: Number,
  refundReason: String,
  affiliateUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  affiliateCommission: Number,
  statusHistory: [{
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: String,
  }],
}, {
  timestamps: true,
});

// Add status to history before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }
  next();
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'items.vendor': 1 });

const Order = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
