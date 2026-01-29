// models/PointsTransaction.ts - NEW MODEL FOR TRACKING ALL POINT ACTIVITIES

import { Schema, model, Document, Types } from 'mongoose';

export interface IPointsTransaction extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: 'earn' | 'spend' | 'expire';
  activity: 'login' | 'purchase' | 'review' | 'share' | 'referral' | 'redemption' | 'bonus' | 'other';
  points: number;
  description: string;
  reference?: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    streakDay?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const pointsTransactionSchema = new Schema<IPointsTransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['earn', 'spend', 'expire'],
      required: true,
    },
    activity: {
      type: String,
      enum: ['login', 'purchase', 'review', 'share', 'referral', 'redemption', 'bonus', 'other'],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      sparse: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
pointsTransactionSchema.index({ user: 1, createdAt: -1 });
pointsTransactionSchema.index({ user: 1, activity: 1 });
pointsTransactionSchema.index({ type: 1, createdAt: -1 });

const PointsTransaction = model<IPointsTransaction>('PointsTransaction', pointsTransactionSchema);

export default PointsTransaction;