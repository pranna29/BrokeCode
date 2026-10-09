import mongoose, { Document, Schema } from 'mongoose';

export interface IExpenseSplit {
  userId: mongoose.Types.ObjectId;
  amount: number;
  percentage?: number;
}

export interface IGroupExpense extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  currency: string;
  paidBy: mongoose.Types.ObjectId;
  date: Date;
  category: string;
  splitType: 'equal' | 'exact' | 'percentage';
  splits: IExpenseSplit[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupExpenseSchema = new Schema<IGroupExpense>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0.01,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      default: 'Group',
    },
    splitType: {
      type: String,
      enum: ['equal', 'exact', 'percentage'],
      default: 'equal',
    },
    splits: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        percentage: {
          type: Number,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

GroupExpenseSchema.index({ groupId: 1, date: -1 });

export const GroupExpense = mongoose.model<IGroupExpense>('GroupExpense', GroupExpenseSchema);

export interface ISettlement extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  date: Date;
  notes?: string;
  createdAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

SettlementSchema.index({ groupId: 1, date: -1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);
