import { Response } from 'express';
import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AnomalyDetectorService } from '../services/anomalyDetector.js';

export class AnomalyController {
  /**
   * Get flagged anomalies with filters
   */
  public static async getAnomalies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { severity, reviewStatus, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
        'anomalyStatus.isAnomaly': true,
      };

      if (severity && severity !== 'all') {
        query['anomalyStatus.severity'] = severity;
      }

      if (reviewStatus && reviewStatus !== 'all') {
        query['anomalyStatus.reviewStatus'] = reviewStatus;
      }

      const [anomalies, total, stats] = await Promise.all([
        Expense.find(query).sort({ 'anomalyStatus.score': -1, date: -1 }).skip(skip).limit(limitNum).lean(),
        Expense.countDocuments(query),
        Expense.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId), 'anomalyStatus.isAnomaly': true } },
          {
            $group: {
              _id: '$anomalyStatus.severity',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
            },
          },
        ]),
      ]);

      const severityCounts: Record<string, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      stats.forEach((s) => {
        if (s._id) severityCounts[s._id] = s.count;
      });

      res.status(200).json({
        success: true,
        data: anomalies,
        summary: {
          totalFlagged: total,
          severityCounts,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching anomalies' });
    }
  }

  /**
   * Submit user feedback on flagged alert
   */
  public static async submitFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { reviewStatus, userFeedback = '' } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid transaction ID' });
        return;
      }

      const validStatuses = ['unreviewed', 'confirmed_anomaly', 'expected_purchase', 'dismissed'];
      if (!validStatuses.includes(reviewStatus)) {
        res.status(400).json({ success: false, message: 'Invalid review status value.' });
        return;
      }

      const expense = await Expense.findOne({ _id: id, userId });
      if (!expense) {
        res.status(404).json({ success: false, message: 'Expense not found' });
        return;
      }

      expense.anomalyStatus.reviewStatus = reviewStatus;
      expense.anomalyStatus.userFeedback = userFeedback.trim();
      expense.anomalyStatus.reviewedAt = new Date();

      await expense.save();

      res.status(200).json({
        success: true,
        message: 'Feedback recorded successfully',
        data: expense,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error submitting feedback' });
    }
  }

  /**
   * Recalculate anomaly baselines across user's history with updated sensitivity
   */
  public static async recalculateAnomalies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const user = req.user;

      const expenses = await Expense.find({ userId }).sort({ date: 1 });

      let newlyFlagged = 0;
      let clearedCount = 0;

      const historyBuffer: any[] = [];

      for (const expense of expenses) {
        // Skip re-flagging if user already reviewed as expected purchase or dismissed
        const priorReview = expense.anomalyStatus?.reviewStatus;

        const evaluated = AnomalyDetectorService.evaluateTransaction({
          targetAmount: expense.amount,
          category: expense.category,
          merchant: expense.merchant,
          date: expense.date,
          historicalExpenses: historyBuffer,
          sensitivity: user?.preferences?.sensitivity || 'medium',
          minHistoryCount: user?.preferences?.minHistoryCount || 5,
          excludedCategories: user?.preferences?.excludedCategories || [],
        });

        // If user already gave feedback, preserve it
        if (priorReview && priorReview !== 'unreviewed') {
          evaluated.reviewStatus = priorReview;
          evaluated.userFeedback = expense.anomalyStatus.userFeedback;
          evaluated.reviewedAt = expense.anomalyStatus.reviewedAt;
        }

        if (evaluated.isAnomaly && !expense.anomalyStatus.isAnomaly) {
          newlyFlagged++;
        } else if (!evaluated.isAnomaly && expense.anomalyStatus.isAnomaly && priorReview === 'unreviewed') {
          clearedCount++;
        }

        expense.anomalyStatus = evaluated;
        await expense.save();

        historyBuffer.push(expense.toObject());
      }

      res.status(200).json({
        success: true,
        message: `Baseline recalculation completed for ${expenses.length} transactions.`,
        summary: {
          totalProcessed: expenses.length,
          newlyFlagged,
          clearedCount,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error recalculating anomalies' });
    }
  }

  /**
   * Measurable evaluation metrics (synthetic benchmark suite + user feedback review precision)
   */
  public static async getEvaluationMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      // User's own reviewed anomalies
      const userReviewed = await Expense.find({
        userId,
        'anomalyStatus.isAnomaly': true,
        'anomalyStatus.reviewStatus': { $in: ['confirmed_anomaly', 'expected_purchase'] },
      }).select('anomalyStatus');

      let userPrecision = 0;
      if (userReviewed.length > 0) {
        const confirmedTruePositives = userReviewed.filter(
          (e) => e.anomalyStatus.reviewStatus === 'confirmed_anomaly'
        ).length;
        userPrecision = Number(((confirmedTruePositives / userReviewed.length) * 100).toFixed(1));
      }

      // Run benchmark against standardized synthetic test dataset
      // to calculate reliable Precision, Recall, F1 and False Positive Rate
      const syntheticGroundTruth = generateSyntheticBenchmarkDataset();
      const benchmarkMetrics = AnomalyDetectorService.calculateEvaluationMetrics(syntheticGroundTruth);

      res.status(200).json({
        success: true,
        userMetrics: {
          totalUserReviewed: userReviewed.length,
          userConfirmedPrecision: userReviewed.length >= 3 ? userPrecision : null,
          hasSufficientUserFeedback: userReviewed.length >= 3,
        },
        benchmarkMetrics,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error computing metrics' });
    }
  }
}

/**
 * Standardized synthetic benchmark dataset for measurable algorithm evaluation
 */
function generateSyntheticBenchmarkDataset() {
  const normalDining = [12, 14, 15, 18, 16, 22, 19, 15, 17, 20];
  const history = normalDining.map((amt, idx) => ({
    amount: amt,
    category: 'Dining',
    merchant: 'Campus Diner',
    date: new Date(Date.now() - (10 - idx) * 86400000),
  }));

  const testCases = [
    // True Negatives (normal)
    { amount: 16, groundTruth: false },
    { amount: 18, groundTruth: false },
    { amount: 21, groundTruth: false },
    { amount: 13, groundTruth: false },
    { amount: 24, groundTruth: false },
    // True Positives (anomalies)
    { amount: 89, groundTruth: true },
    { amount: 140, groundTruth: true },
    { amount: 210, groundTruth: true },
    { amount: 320, groundTruth: true },
    // Near boundary (test precision/false positives)
    { amount: 32, groundTruth: false },
    { amount: 55, groundTruth: true },
  ];

  return testCases.map((tc) => {
    const res = AnomalyDetectorService.evaluateTransaction({
      targetAmount: tc.amount,
      category: 'Dining',
      merchant: 'Campus Diner',
      date: new Date(),
      historicalExpenses: history,
      sensitivity: 'medium',
      minHistoryCount: 5,
    });
    return {
      isAnomaly: res.isAnomaly,
      groundTruthAnomaly: tc.groundTruth,
    };
  });
}
