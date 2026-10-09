import { Response } from 'express';
import mongoose from 'mongoose';
import { Expense, IExpense } from '../models/Expense.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AnomalyDetectorService } from '../services/anomalyDetector.js';

export class ExpenseController {
  /**
   * List expenses with pagination, search, sorting and filters
   */
  public static async getExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const {
        page = '1',
        limit = '15',
        category,
        type,
        paymentMethod,
        search,
        startDate,
        endDate,
        anomalyOnly,
        severity,
        reviewStatus,
        sortBy = 'date',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 15));
      const skip = (pageNum - 1) * limitNum;

      // Filter object strictly isolated by userId
      const query: any = { userId: new mongoose.Types.ObjectId(userId) };

      if (category && category !== 'all') {
        query.category = category;
      }

      if (type && type !== 'all') {
        query.type = type;
      }

      if (paymentMethod && paymentMethod !== 'all') {
        query.paymentMethod = paymentMethod;
      }

      if (search) {
        const searchRegex = new RegExp(search as string, 'i');
        query.$or = [
          { merchant: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { subcategory: searchRegex },
          { tags: searchRegex },
        ];
      }

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate as string);
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      if (anomalyOnly === 'true') {
        query['anomalyStatus.isAnomaly'] = true;
      }

      if (severity && severity !== 'all') {
        query['anomalyStatus.severity'] = severity;
      }

      if (reviewStatus && reviewStatus !== 'all') {
        query['anomalyStatus.reviewStatus'] = reviewStatus;
      }

      const sortDir = sortOrder === 'asc' ? 1 : -1;
      let sortObj: any;
      if (sortBy === 'custom' || sortBy === 'customOrder') {
        sortObj = { customOrder: 1, date: -1 };
      } else {
        sortObj = { [sortBy as string]: sortDir };
      }

      const [expenses, total] = await Promise.all([
        Expense.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
        Expense.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: expenses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching expenses' });
    }
  }

  /**
   * Create single expense and evaluate anomaly status in real time
   */
  public static async createExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const {
        amount,
        merchant,
        category,
        subcategory = '',
        description = '',
        date = new Date(),
        currency = req.user?.currency || 'INR',
        paymentMethod = 'card',
        type = 'expense',
        isRecurring = false,
        tags = [],
      } = req.body;

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({ success: false, message: 'Valid positive amount is required.' });
        return;
      }

      if (!category || !category.trim()) {
        res.status(400).json({ success: false, message: 'Category is required.' });
        return;
      }

      // If merchant not provided (simple calculator form), default to category or description
      const finalMerchant = (merchant && merchant.trim()) ? merchant.trim() : (description && description.trim()) ? description.trim() : category.trim();

      // Decimal-safe amount rounding to 2 decimal places to avoid floating point imprecision
      const numAmount = Math.round(Number(amount) * 100) / 100;
      const parsedDate = new Date(date);

      // Fetch user's historical expenses for statistical evaluation
      const history = await Expense.find({
        userId,
        date: { $lte: parsedDate },
      })
        .select('amount category merchant date anomalyStatus')
        .lean();

      // Run real statistical anomaly detector
      const anomalyResult = AnomalyDetectorService.evaluateTransaction({
        targetAmount: numAmount,
        category: category.trim(),
        merchant: finalMerchant,
        date: parsedDate,
        historicalExpenses: history,
        sensitivity: req.user?.preferences?.sensitivity || 'medium',
        minHistoryCount: req.user?.preferences?.minHistoryCount || 5,
        excludedCategories: req.user?.preferences?.excludedCategories || [],
      });

      const newExpense = await Expense.create({
        userId,
        amount: numAmount,
        currency,
        date: parsedDate,
        merchant: finalMerchant,
        category: category.trim(),
        subcategory: subcategory.trim(),
        description: description.trim(),
        type: type === 'income' ? 'income' : 'expense',
        paymentMethod,
        isRecurring: Boolean(isRecurring),
        tags: Array.isArray(tags) ? tags : [],
        anomalyStatus: anomalyResult,
      });

      res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        data: newExpense,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error creating expense' });
    }
  }

  /**
   * Get single expense
   */
  public static async getExpenseById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid expense ID' });
        return;
      }

      const expense = await Expense.findOne({ _id: id, userId });
      if (!expense) {
        res.status(404).json({ success: false, message: 'Expense not found' });
        return;
      }

      res.status(200).json({ success: true, data: expense });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error retrieving expense' });
    }
  }

  /**
   * Update expense
   */
  public static async updateExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid expense ID' });
        return;
      }

      const existingExpense = await Expense.findOne({ _id: id, userId });
      if (!existingExpense) {
        res.status(404).json({ success: false, message: 'Expense not found' });
        return;
      }

      const updatedAmount = updateData.amount !== undefined 
        ? Math.round(Number(updateData.amount) * 100) / 100 
        : existingExpense.amount;
      const updatedCategory = updateData.category !== undefined ? updateData.category.trim() : existingExpense.category;
      const updatedMerchant = updateData.merchant !== undefined && updateData.merchant.trim() 
        ? updateData.merchant.trim() 
        : (updateData.description && updateData.description.trim())
        ? updateData.description.trim()
        : updatedCategory || existingExpense.merchant;
      const updatedDate = updateData.date !== undefined ? new Date(updateData.date) : existingExpense.date;

      // Re-evaluate anomaly status if amount, category, or merchant changed
      let anomalyResult = existingExpense.anomalyStatus;
      if (
        updateData.amount !== undefined ||
        updateData.category !== undefined ||
        updateData.merchant !== undefined
      ) {
        const history = await Expense.find({
          userId,
          _id: { $ne: id },
          date: { $lte: updatedDate },
        })
          .select('amount category merchant date anomalyStatus')
          .lean();

        anomalyResult = AnomalyDetectorService.evaluateTransaction({
          targetAmount: updatedAmount,
          category: updatedCategory,
          merchant: updatedMerchant,
          date: updatedDate,
          historicalExpenses: history,
          sensitivity: req.user?.preferences?.sensitivity || 'medium',
          minHistoryCount: req.user?.preferences?.minHistoryCount || 5,
          excludedCategories: req.user?.preferences?.excludedCategories || [],
        });
        // Retain prior review status if already user-reviewed
        if (existingExpense.anomalyStatus.reviewStatus !== 'unreviewed') {
          anomalyResult.reviewStatus = existingExpense.anomalyStatus.reviewStatus;
          anomalyResult.userFeedback = existingExpense.anomalyStatus.userFeedback;
        }
      }

      const updatedExpense = await Expense.findOneAndUpdate(
        { _id: id, userId },
        {
          $set: {
            ...updateData,
            amount: updatedAmount,
            category: updatedCategory,
            merchant: updatedMerchant,
            date: updatedDate,
            anomalyStatus: anomalyResult,
          },
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: 'Expense updated successfully',
        data: updatedExpense,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error updating expense' });
    }
  }

  /**
   * Delete expense
   */
  public static async deleteExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid expense ID' });
        return;
      }

      const deleted = await Expense.findOneAndDelete({ _id: id, userId });
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Expense not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Expense deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error deleting expense' });
    }
  }

  /**
   * Bulk delete expenses
   */
  public static async bulkDeleteExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, message: 'Array of expense IDs required.' });
        return;
      }

      const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
      const result = await Expense.deleteMany({ _id: { $in: validIds }, userId });

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} expense(s).`,
        deletedCount: result.deletedCount,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error deleting expenses' });
    }
  }

  /**
   * Reorder expenses for custom ordering
   */
  public static async reorderExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { orderedIds } = req.body;

      if (!Array.isArray(orderedIds)) {
        res.status(400).json({ success: false, message: 'orderedIds array is required.' });
        return;
      }

      const bulkOps = orderedIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string, index: number) => ({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) },
            update: { $set: { customOrder: index } },
          },
        }));

      if (bulkOps.length > 0) {
        await Expense.bulkWrite(bulkOps);
      }

      res.status(200).json({
        success: true,
        message: 'Transactions reordered successfully.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error reordering expenses' });
    }
  }

  /**
   * Import CSV transactions with validation, duplicate detection and batch anomaly scoring
   */
  public static async importCSV(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { rows } = req.body;

      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ success: false, message: 'No valid transaction rows received.' });
        return;
      }

      // Load existing expenses to detect duplicates and build history
      const existingExpenses = await Expense.find({ userId })
        .select('amount merchant date category anomalyStatus')
        .lean();

      let importedCount = 0;
      let duplicateCount = 0;
      let invalidCount = 0;
      let anomaliesCount = 0;

      const createdDocs: any[] = [];
      const historyBuffer: any[] = [...existingExpenses];

      for (const row of rows) {
        const rawAmount = parseFloat(String(row.amount).replace(/[^0-9.-]+/g, ''));
        const merchant = (row.merchant || row.payee || row.description || 'Unknown').trim();
        const category = (row.category || 'Miscellaneous').trim();
        const dateStr = row.date || row.timestamp || new Date().toISOString();
        const date = new Date(dateStr);

        if (isNaN(rawAmount) || rawAmount <= 0 || isNaN(date.getTime()) || !merchant) {
          invalidCount++;
          continue;
        }

        // Check for duplicates: identical amount, merchant (case-insensitive), within ±6 hours
        const isDuplicate = historyBuffer.some((item) => {
          const sameAmount = Math.abs(Number(item.amount) - rawAmount) < 0.01;
          const sameMerchant = item.merchant.toLowerCase() === merchant.toLowerCase();
          const itemTime = new Date(item.date).getTime();
          const timeDiffHours = Math.abs(itemTime - date.getTime()) / (1000 * 60 * 60);
          return sameAmount && sameMerchant && timeDiffHours <= 6;
        });

        if (isDuplicate) {
          duplicateCount++;
          continue;
        }

        // Evaluate anomaly status
        const anomalyResult = AnomalyDetectorService.evaluateTransaction({
          targetAmount: rawAmount,
          category,
          merchant,
          date,
          historicalExpenses: historyBuffer,
          sensitivity: req.user?.preferences?.sensitivity || 'medium',
          minHistoryCount: req.user?.preferences?.minHistoryCount || 5,
          excludedCategories: req.user?.preferences?.excludedCategories || [],
        });

        if (anomalyResult.isAnomaly) {
          anomaliesCount++;
        }

        const newDoc = {
          userId,
          amount: rawAmount,
          currency: row.currency || req.user?.currency || 'USD',
          date,
          merchant,
          category,
          subcategory: (row.subcategory || '').trim(),
          description: (row.description || '').trim(),
          paymentMethod: row.paymentMethod || 'card',
          isRecurring: Boolean(row.isRecurring),
          tags: Array.isArray(row.tags) ? row.tags : [],
          anomalyStatus: anomalyResult,
        };

        createdDocs.push(newDoc);
        historyBuffer.push(newDoc);
        importedCount++;
      }

      if (createdDocs.length > 0) {
        await Expense.insertMany(createdDocs);
      }

      res.status(200).json({
        success: true,
        message: `Import processed: ${importedCount} imported, ${duplicateCount} duplicates skipped, ${invalidCount} invalid rows.`,
        summary: {
          imported: importedCount,
          duplicatesSkipped: duplicateCount,
          invalidSkipped: invalidCount,
          anomaliesDetected: anomaliesCount,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error importing CSV' });
    }
  }

  /**
   * Export expenses to CSV string
   */
  public static async exportCSV(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { category, startDate, endDate } = req.query;

      const query: any = { userId };
      if (category && category !== 'all') query.category = category;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate as string);
        if (endDate) query.date.$lte = new Date(endDate as string);
      }

      const expenses = await Expense.find(query).sort({ date: -1 }).lean();

      // Build CSV string
      const headers = [
        'Transaction ID',
        'Date',
        'Merchant',
        'Category',
        'Subcategory',
        'Amount',
        'Currency',
        'Payment Method',
        'Is Recurring',
        'Tags',
        'Is Anomaly',
        'Anomaly Score',
        'Anomaly Severity',
        'Detection Method',
        'Explanation',
        'Review Status',
      ];

      const csvRows = [headers.join(',')];

      for (const e of expenses) {
        const row = [
          `"${e._id}"`,
          `"${new Date(e.date).toISOString().slice(0, 10)}"`,
          `"${(e.merchant || '').replace(/"/g, '""')}"`,
          `"${(e.category || '').replace(/"/g, '""')}"`,
          `"${(e.subcategory || '').replace(/"/g, '""')}"`,
          e.amount,
          `"${e.currency || 'USD'}"`,
          `"${e.paymentMethod || 'card'}"`,
          e.isRecurring ? 'true' : 'false',
          `"${(e.tags || []).join(';')}"`,
          e.anomalyStatus?.isAnomaly ? 'true' : 'false',
          e.anomalyStatus?.score || 0,
          `"${e.anomalyStatus?.severity || 'low'}"`,
          `"${(e.anomalyStatus?.method || '').replace(/"/g, '""')}"`,
          `"${(e.anomalyStatus?.explanation || '').replace(/"/g, '""')}"`,
          `"${e.anomalyStatus?.reviewStatus || 'unreviewed'}"`,
        ];
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="brokecode-expenses-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.status(200).send(csvRows.join('\n'));
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error exporting CSV' });
    }
  }
}
