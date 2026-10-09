import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  emoji?: string;
  color: string;
  icon: string;
  budget?: number;
  order?: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    emoji: {
      type: String,
      default: '🏷️',
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    icon: {
      type: String,
      default: 'tag',
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    order: {
      type: Number,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', emoji: '🍔', color: '#f97316', icon: 'utensils', order: 0 },
  { name: 'Groceries', emoji: '🛒', color: '#10b981', icon: 'shopping-cart', order: 1 },
  { name: 'Transport', emoji: '🚗', color: '#06b6d4', icon: 'car', order: 2 },
  { name: 'Shopping', emoji: '🛍️', color: '#ec4899', icon: 'shopping-bag', order: 3 },
  { name: 'Education', emoji: '🎓', color: '#8b5cf6', icon: 'book-open', order: 4 },
  { name: 'Rent & Housing', emoji: '🏠', color: '#3b82f6', icon: 'home', order: 5 },
  { name: 'Bills & Utilities', emoji: '💡', color: '#eab308', icon: 'zap', order: 6 },
  { name: 'Healthcare', emoji: '💊', color: '#ef4444', icon: 'heart-pulse', order: 7 },
  { name: 'Entertainment', emoji: '🎬', color: '#a855f7', icon: 'film', order: 8 },
  { name: 'Travel', emoji: '✈️', color: '#14b8a6', icon: 'plane', order: 9 },
  { name: 'Personal Care', emoji: '💅', color: '#f43f5e', icon: 'smile', order: 10 },
  { name: 'Gifts', emoji: '🎁', color: '#84cc16', icon: 'gift', order: 11 },
  { name: 'Subscriptions', emoji: '📱', color: '#6366f1', icon: 'repeat', order: 12 },
  { name: 'Other', emoji: '💸', color: '#64748b', icon: 'more-horizontal', order: 13 },
];
