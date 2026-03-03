import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  lastMessage: {
    text: string;
    sender: Types.ObjectId;
    timestamp: Date;
    messageType: 'text' | 'image' | 'file';
  };
  unreadCount: Map<string, number>;
  orderId?: Types.ObjectId;
  isActive: boolean;
}

const conversationSchema = new Schema<IConversation>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  lastMessage: {
    text: String,
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: Date,
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ participants: 1, orderId: 1 });

export default mongoose.model<IConversation>('Conversation', conversationSchema);
