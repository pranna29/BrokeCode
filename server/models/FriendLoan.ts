import mongoose, { Document, Schema } from 'mongoose';

export interface ILoanRepayment {
  amount: number;
  date: Date;
  notes?: string;
}

export interface IFriendLoan extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  friendName: string;
  type: 'lent' | 'borrowed';
  amount: number;
  currency: string;
  date: Date;
  notes?: string;
  repayments: ILoanRepayment[];
  status: 'active' | 'settled';
  createdAt: Date;
  updatedAt: Date;
}

const FriendLoanSchema = new Schema<IFriendLoan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    friendName: {
      type: String,
      required: [true, 'Friend name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['lent', 'borrowed'],
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
    repayments: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0.01,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          default: '',
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'settled'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

FriendLoanSchema.index({ userId: 1, status: 1 });

export const FriendLoan = mongoose.model<IFriendLoan>('FriendLoan', FriendLoanSchema);
