import mongoose, { Document, Types } from 'mongoose';
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
declare const Review: mongoose.Model<IReview, {}, {}, {}, mongoose.Document<unknown, {}, IReview, {}, {}> & IReview & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Review;
//# sourceMappingURL=Review.d.ts.map