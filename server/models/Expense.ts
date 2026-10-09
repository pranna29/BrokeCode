import mongoose, { Document, Schema } from 'mongoose';

export interface IAnomalyBaseline {
  median?: number;
  iqr?: number;
  q1?: number;
  q3?: number;
  lowerBound?: number;
  upperBound?: number;
  historicalCount?: number;
  merchantAvg?: number;
  overallMedian?: number;
}

export interface IAnomalyStatus {
  isAnomaly: boolean;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  method: string;
  explanation: string;
  baseline?: IAnomalyBaseline;
  detectedAt?: Date;
  reviewStatus: 'unreviewed' | 'confirmed_anomaly' | 'expected_purchase' | 'dismissed';
  userFeedback?: string;
  reviewedAt?: Date;
}

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  date: Date;
  merchant: string;
  category: string;
  subcategory?: string;
  description?: string;
  paymentMethod: 'card' | 'cash' | 'upi' | 'bank_transfer' | 'crypto' | 'other';
  isRecurring: boolean;
  tags: string[];
  anomalyStatus: IAnomalyStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
      index: true,
    },
    merchant: {
      type: String,
      required: [true, 'Merchant is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'cash', 'upi', 'bank_transfer', 'crypto', 'other'],
      default: 'card',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    anomalyStatus: {
      isAnomaly: {
        type: Boolean,
        default: false,
        index: true,
      },
      score: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
      },
      method: {
        type: String,
        default: 'Statistical Baseline',
      },
      explanation: {
        type: String,
        default: 'Normal spending within typical statistical boundaries.',
      },
      baseline: {
        type: Schema.Types.Mixed,
        default: {},
      },
      detectedAt: {
        type: Date,
        default: Date.now,
      },
      reviewStatus: {
        type: String,
        enum: ['unreviewed', 'confirmed_anomaly', 'expected_purchase', 'dismissed'],
        default: 'unreviewed',
      },
      userFeedback: {
        type: String,
        default: '',
      },
      reviewedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-performance tenant filtering
ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, category: 1 });
ExpenseSchema.index({ userId: 1, 'anomalyStatus.isAnomaly': 1, 'anomalyStatus.reviewStatus': 1 });
ExpenseSchema.index({ userId: 1, merchant: 1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
