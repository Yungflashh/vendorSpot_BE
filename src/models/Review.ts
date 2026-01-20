import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  product: Types.ObjectId;
  user: Types.ObjectId;
  order: Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  verified: boolean;
  helpful: number;
  unhelpful: number;
  helpfulBy: Types.ObjectId[];
  vendorResponse?: {
    comment: string;
    respondedAt: Date;
  };
  status: 'pending' | 'approved' | 'rejected';
  reported?: boolean;
  reportReason?: string;
}

const reviewSchema = new Schema<IReview>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    maxlength: 100,
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  images: [String],
  verified: {
    type: Boolean,
    default: false,
  },
  helpful: {
    type: Number,
    default: 0,
  },
  unhelpful: {
    type: Number,
    default: 0,
  },
  helpfulBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  vendorResponse: {
    comment: String,
    respondedAt: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  },
  reported: {
    type: Boolean,
    default: false,
  },
  reportReason: String,
}, {
  timestamps: true,
});

// Indexes
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });

// Compound index to ensure one review per user per product per order
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

const Review = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
