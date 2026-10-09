import { Response } from 'express';
import mongoose from 'mongoose';
import { PendingTransaction, IPendingTransaction } from '../models/PendingTransaction.js';
import { Expense } from '../models/Expense.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SmsParserService } from '../services/smsParser.js';
import { AnomalyDetectorService } from '../services/anomalyDetector.js';

export class SmsImportController {
  /**
   * Parse raw SMS text without saving
   */
  public static async parseRawSms(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) {
        res.status(400).json({ success: false, message: 'SMS text is required.' });
        return;
      }

      const parsed = SmsParserService.parseBatch(text);
      res.status(200).json({
        success: true,
        count: parsed.length,
        data: parsed,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error parsing SMS' });
    }
  }

  /**
   * Ingest parsed SMS transactions into PendingTransaction inbox
   */
  public static async ingestSmsTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { transactions } = req.body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        res.status(400).json({ success: false, message: 'Array of transactions required.' });
        return;
      }

      // Check duplicates against existing Expenses and PendingTransactions
      const existingExpenses = await Expense.find({ userId }).select('amount merchant date sourceRef').lean();
      const existingPending = await PendingTransaction.find({ userId }).select('amount merchant date paymentRef').lean();

      const createdDocs: any[] = [];
      let duplicateWarningCount = 0;

      for (const item of transactions) {
        const amt = Number(item.amount);
        if (isNaN(amt) || amt <= 0) continue;

        const date = new Date(item.date || Date.now());
        const paymentRef = (item.paymentRef || '').trim();
        const merchant = (item.merchant || 'Unknown Merchant').trim();

        // Check if duplicate exists
        const isExpenseDuplicate = existingExpenses.some((e) => {
          if (paymentRef && e.sourceRef && e.sourceRef === paymentRef) return true;
          const sameAmt = Math.abs(e.amount - amt) < 0.01;
          const sameMerch = e.merchant.toLowerCase() === merchant.toLowerCase();
          const timeDiff = Math.abs(new Date(e.date).getTime() - date.getTime()) / (1000 * 3600);
          return sameAmt && sameMerch && timeDiff <= 12;
        });

        const isPendingDuplicate = existingPending.some((p) => {
          if (paymentRef && p.paymentRef && p.paymentRef === paymentRef) return true;
          const sameAmt = Math.abs(p.amount - amt) < 0.01;
          const sameMerch = p.merchant.toLowerCase() === merchant.toLowerCase();
          return sameAmt && sameMerch;
        });

        const hasDuplicateWarning = isExpenseDuplicate || isPendingDuplicate;
        if (hasDuplicateWarning) duplicateWarningCount++;

        createdDocs.push({
          userId,
          rawSms: item.rawText || item.rawSms || 'Manual SMS paste',
          amount: amt,
          currency: item.currency || req.user?.currency || 'INR',
          merchant,
          date,
          paymentRef,
          paymentMode: item.paymentMode || 'gpay',
          direction: item.direction || 'debit',
          suggestedCategory: item.suggestedCategory || 'Other',
          status: 'pending',
          confidence: item.confidence || 80,
          isDuplicateWarning: hasDuplicateWarning,
        });
      }

      const inserted = await PendingTransaction.insertMany(createdDocs);

      res.status(201).json({
        success: true,
        message: `Imported ${inserted.length} transactions to Pending Review Inbox.`,
        importedCount: inserted.length,
        duplicateWarningCount,
        data: inserted,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error importing SMS transactions' });
    }
  }

  /**
   * Get all pending transactions for authenticated user
   */
  public static async getPendingTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
      const pending = await PendingTransaction.find({ userId, status: 'pending' }).sort({ date: -1 }).lean();

      res.status(200).json({
        success: true,
        count: pending.length,
        data: pending,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching pending transactions' });
    }
  }

  /**
   * Confirm a pending transaction and turn it into a real Expense
   */
  public static async confirmPendingTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { amount, merchant, category, date, paymentMethod = 'upi', description } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid transaction ID' });
        return;
      }

      const pending = await PendingTransaction.findOne({ _id: id, userId, status: 'pending' });
      if (!pending) {
        res.status(404).json({ success: false, message: 'Pending transaction not found or already processed.' });
        return;
      }

      const finalAmount = amount !== undefined ? Number(amount) : pending.amount;
      const finalMerchant = (merchant || pending.merchant).trim();
      const finalCategory = (category || pending.suggestedCategory || 'Other').trim();
      const finalDate = date ? new Date(date) : pending.date;

      // Statistical anomaly detection evaluation
      const history = await Expense.find({ userId, date: { $lte: finalDate } })
        .select('amount category merchant date anomalyStatus')
        .lean();

      const anomalyResult = AnomalyDetectorService.evaluateTransaction({
        targetAmount: finalAmount,
        category: finalCategory,
        merchant: finalMerchant,
        date: finalDate,
        historicalExpenses: history,
        sensitivity: req.user?.preferences?.sensitivity || 'medium',
        minHistoryCount: req.user?.preferences?.minHistoryCount || 5,
        excludedCategories: req.user?.preferences?.excludedCategories || [],
      });

      // Create confirmed expense
      const newExpense = await Expense.create({
        userId,
        amount: finalAmount,
        currency: pending.currency,
        date: finalDate,
        merchant: finalMerchant,
        category: finalCategory,
        description: description || `Imported via SMS (${pending.paymentMode.toUpperCase()})`,
        paymentMethod: paymentMethod || pending.paymentMode === 'gpay' ? 'upi' : 'card',
        sourceRef: pending.paymentRef || '',
        anomalyStatus: anomalyResult,
      });

      // Mark pending as added
      pending.status = 'added';
      await pending.save();

      res.status(201).json({
        success: true,
        message: 'Transaction confirmed and saved to expenses.',
        data: newExpense,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error confirming transaction' });
    }
  }

  /**
   * Ignore pending transaction
   */
  public static async ignorePendingTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid transaction ID' });
        return;
      }

      const pending = await PendingTransaction.findOneAndUpdate(
        { _id: id, userId, status: 'pending' },
        { $set: { status: 'ignored' } },
        { new: true }
      );

      if (!pending) {
        res.status(404).json({ success: false, message: 'Pending transaction not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Pending transaction ignored.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error ignoring transaction' });
    }
  }

  /**
   * Batch confirm multiple pending transactions
   */
  public static async batchConfirm(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, message: 'Array of transaction IDs required.' });
        return;
      }

      const pendingList = await PendingTransaction.find({
        _id: { $in: ids },
        userId,
        status: 'pending',
      });

      const history = await Expense.find({ userId })
        .select('amount category merchant date anomalyStatus')
        .lean();

      const createdExpenses: any[] = [];
      const historyBuffer: any[] = [...history];

      for (const p of pendingList) {
        const anomalyResult = AnomalyDetectorService.evaluateTransaction({
          targetAmount: p.amount,
          category: p.suggestedCategory,
          merchant: p.merchant,
          date: p.date,
          historicalExpenses: historyBuffer,
          sensitivity: req.user?.preferences?.sensitivity || 'medium',
          minHistoryCount: 5,
        });

        const newDoc = {
          userId,
          amount: p.amount,
          currency: p.currency,
          date: p.date,
          merchant: p.merchant,
          category: p.suggestedCategory,
          description: `Batch imported from SMS (${p.paymentMode.toUpperCase()})`,
          paymentMethod: 'upi',
          sourceRef: p.paymentRef || '',
          anomalyStatus: anomalyResult,
        };

        createdExpenses.push(newDoc);
        historyBuffer.push(newDoc);
        p.status = 'added';
        await p.save();
      }

      if (createdExpenses.length > 0) {
        await Expense.insertMany(createdExpenses);
      }

      res.status(200).json({
        success: true,
        message: `Successfully added ${createdExpenses.length} transactions to your expenses.`,
        addedCount: createdExpenses.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error batch confirming' });
    }
  }
}
