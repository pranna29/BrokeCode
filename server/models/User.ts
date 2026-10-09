import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPreferences {
  sensitivity: 'low' | 'medium' | 'high';
  minHistoryCount: number;
  excludedCategories: string[];
  theme: 'light' | 'dark' | 'system';
  currencySymbol: string;
  notificationsEnabled: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  currency: string;
  monthlyBudget: number;
  preferences: IUserPreferences;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      default: 'SpendWise User',
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    monthlyBudget: {
      type: Number,
      default: 25000,
      min: [0, 'Budget must be a non-negative number'],
    },
    resetPasswordToken: {
      type: String,
      index: true,
    },
    resetPasswordExpires: {
      type: Date,
    },
    preferences: {
      sensitivity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      minHistoryCount: {
        type: Number,
        default: 5,
        min: 1,
      },
      excludedCategories: {
        type: [String],
        default: [],
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'dark',
      },
      currencySymbol: {
        type: String,
        default: '₹',
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
