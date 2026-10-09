import { Response } from 'express';
import mongoose from 'mongoose';
import { FriendLoan } from '../models/FriendLoan.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class FriendLoanController {
  public static async getLoans(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
      const loans = await FriendLoan.find({ userId }).sort({ date: -1 }).lean();

      // Summary of total lent, total borrowed, total recovered
      let totalLent = 0;
      let totalBorrowed = 0;
      let totalRecovered = 0;

      loans.forEach((l) => {
        const repaid = (l.repayments || []).reduce((s, r) => s + r.amount, 0);
        if (l.type === 'lent') {
          totalLent += l.amount;
          totalRecovered += repaid;
        } else {
          totalBorrowed += l.amount;
        }
      });

      res.status(200).json({
        success: true,
        summary: {
          totalLent,
          totalBorrowed,
          netOutstanding: totalLent - totalRecovered,
        },
        data: loans,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching loans' });
    }
  }

  public static async createLoan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { friendName, type, amount, date = new Date(), notes = '', currency = req.user?.currency || 'INR' } = req.body;

      if (!friendName || !friendName.trim()) {
        res.status(400).json({ success: false, message: 'Friend name is required.' });
        return;
      }

      if (!['lent', 'borrowed'].includes(type)) {
        res.status(400).json({ success: false, message: 'Type must be lent or borrowed.' });
        return;
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ success: false, message: 'Positive amount required.' });
        return;
      }

      const loan = await FriendLoan.create({
        userId,
        friendName: friendName.trim(),
        type,
        amount: numAmount,
        currency,
        date: new Date(date),
        notes: notes.trim(),
        repayments: [],
        status: 'active',
      });

      res.status(201).json({
        success: true,
        data: loan,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error creating loan record' });
    }
  }

  public static async addRepayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { amount, date = new Date(), notes = '' } = req.body;

      const loan = await FriendLoan.findOne({ _id: id, userId });
      if (!loan) {
        res.status(404).json({ success: false, message: 'Loan record not found.' });
        return;
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ success: false, message: 'Positive amount required.' });
        return;
      }

      loan.repayments.push({
        amount: numAmount,
        date: new Date(date),
        notes: notes.trim(),
      });

      const totalRepaid = loan.repayments.reduce((s, r) => s + r.amount, 0);
      if (totalRepaid >= loan.amount) {
        loan.status = 'settled';
      }

      await loan.save();

      res.status(200).json({
        success: true,
        data: loan,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error adding repayment' });
    }
  }

  public static async deleteLoan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const deleted = await FriendLoan.findOneAndDelete({ _id: id, userId });
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Loan record not found.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Loan record deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error deleting loan' });
    }
  }
}
