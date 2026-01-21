// models/User.ts
import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument, UserRole, UserStatus, IAddress } from '../types';

const addressSchema = new Schema<IAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true, default: 'Nigeria' },
  zipCode: String,
  postalCode: String,
  isDefault: { type: Boolean, default: false },
  label: String,
  // ADD THESE FIELDS FOR SHIPBUBBLE INTEGRATION
  fullName: String,
  phone: String,
  // ShipBubble integration data
  shipBubble: {
    addressCode: {
      type: Number,
      description: 'ShipBubble validated address code',
    },
    formattedAddress: {
      type: String,
      description: 'ShipBubble formatted address',
    },
    latitude: {
      type: Number,
      description: 'Address latitude from ShipBubble',
    },
    longitude: {
      type: Number,
      description: 'Address longitude from ShipBubble',
    },
    validatedAt: {
      type: Date,
      default: Date.now,
      description: 'When address was last validated with ShipBubble',
    },
  },
}, { _id: true, timestamps: true });

const userSchema = new Schema<IUserDocument>({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    sparse: true,
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CUSTOMER,
  },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.PENDING_VERIFICATION,
  },
  avatar: String,
  addresses: [addressSchema],
  emailVerified: {
    type: Boolean,
    default: false,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  fcmTokens: [String],
  lastLogin: Date,
  isAffiliate: {
    type: Boolean,
    default: false,
  },
  affiliateCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  points: {
    type: Number,
    default: 0,
  },
  badges: [String],
  achievements: [String],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ affiliateCode: 1 });
userSchema.index({ role: 1, status: 1 });
// Add index for ShipBubble address codes for faster lookups
userSchema.index({ 'addresses.shipBubble.addressCode': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);

export default User;