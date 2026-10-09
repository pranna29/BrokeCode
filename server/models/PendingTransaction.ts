import mongoose, { Document, Schema } from 'mongoose';

export interface IPendingTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rawSms: string;
  amount: number;
  currency: string;
  merchant: string;
  date: Date;
  paymentRef?: string;
  paymentMode: string;
  direction: 'debit' | 'credit';
  suggestedCategory: string;
  status: 'pending' | 'added' | 'ignored';
  confidence: number;
  isDuplicateWarning: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PendingTransactionSchema = new Schema<IPendingTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rawSms: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    merchant: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentRef: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMode: {
      type: String,
      default: 'gpay',
    },
    direction: {
      type: String,
      enum: ['debit', 'credit'],
      default: 'debit',
    },
    suggestedCategory: {
      type: String,
      default: 'Other',
    },
    status: {
      type: String,
      enum: ['pending', 'added', 'ignored'],
      default: 'pending',
      index: true,
    },
    confidence: {
      type: Number,
      default: 85,
    },
    isDuplicateWarning: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

PendingTransactionSchema.index({ userId: 1, status: 1 });
PendingTransactionSchema.index({ userId: 1, paymentRef: 1 });

export const PendingTransaction = mongoose.model<IPendingTransaction>(
  'PendingTransaction',
  PendingTransactionSchema
);
