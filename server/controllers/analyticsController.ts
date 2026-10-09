import { Response } from 'express';
import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class AnalyticsController {
  /**
   * High-level KPI summary for dashboard
   */
  public static async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
      const user = req.user;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [overallStats, currentMonthStats, anomalyStats] = await Promise.all([
        Expense.aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: null,
              totalSpend: { $sum: '$amount' },
              totalTransactions: { $sum: 1 },
              avgTransaction: { $avg: '$amount' },
            },
          },
        ]),
        Expense.aggregate([
          {
            $match: {
              userId,
              date: { $gte: startOfMonth, $lte: endOfMonth },
            },
          },
          {
            $group: {
              _id: null,
              monthSpend: { $sum: '$amount' },
              monthTransactions: { $sum: 1 },
            },
          },
        ]),
        Expense.aggregate([
          { $match: { userId, 'anomalyStatus.isAnomaly': true } },
          {
            $group: {
              _id: '$anomalyStatus.reviewStatus',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
            },
          },
        ]),
      ]);

      const totalSpend = overallStats[0]?.totalSpend || 0;
      const totalTransactions = overallStats[0]?.totalTransactions || 0;
      const avgTransaction = overallStats[0]?.avgTransaction || 0;

      const monthSpend = currentMonthStats[0]?.monthSpend || 0;
      const monthTransactions = currentMonthStats[0]?.monthTransactions || 0;

      let totalAnomalies = 0;
      let unreviewedAnomalies = 0;
      let totalAnomalyAmount = 0;

      anomalyStats.forEach((stat) => {
        totalAnomalies += stat.count;
        totalAnomalyAmount += stat.totalAmount;
        if (stat._id === 'unreviewed') {
          unreviewedAnomalies += stat.count;
        }
      });

      const monthlyBudget = user?.monthlyBudget || 800;
      const budgetRemaining = Math.max(0, monthlyBudget - monthSpend);
      const budgetUsedPercentage = monthlyBudget > 0 ? Number(((monthSpend / monthlyBudget) * 100).toFixed(1)) : 0;

      res.status(200).json({
        success: true,
        data: {
          totalSpend: Number(totalSpend.toFixed(2)),
          totalTransactions,
          avgTransaction: Number(avgTransaction.toFixed(2)),
          currentMonth: {
            spend: Number(monthSpend.toFixed(2)),
            transactions: monthTransactions,
            budget: monthlyBudget,
            budgetRemaining: Number(budgetRemaining.toFixed(2)),
            budgetUsedPercentage,
          },
          anomalies: {
            total: totalAnomalies,
            unreviewed: unreviewedAnomalies,
            totalAnomalyAmount: Number(totalAnomalyAmount.toFixed(2)),
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching summary' });
    }
  }

  /**
   * Monthly trend over past 6-12 months
   */
  public static async getMonthlyTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
      const { months = '6' } = req.query;
      const monthsNum = Math.min(12, Math.max(3, parseInt(months as string, 10) || 6));

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsNum + 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const trends = await Expense.aggregate([
        {
          $match: {
            userId,
            date: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
            },
            totalSpend: { $sum: '$amount' },
            normalSpend: {
              $sum: {
                $cond: [{ $eq: ['$anomalyStatus.isAnomaly', true] }, 0, '$amount'],
              },
            },
            anomalySpend: {
              $sum: {
                $cond: [{ $eq: ['$anomalyStatus.isAnomaly', true] }, '$amount', 0],
              },
            },
            anomalyCount: {
              $sum: {
                $cond: [{ $eq: ['$anomalyStatus.isAnomaly', true] }, 1, 0],
              },
            },
            transactionCount: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]);

      const formatted = trends.map((t) => {
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ];
        const monthLabel = `${monthNames[t._id.month - 1]} ${t._id.year}`;
        return {
          month: monthLabel,
          year: t._id.year,
          monthIndex: t._id.month,
          totalSpend: Number(t.totalSpend.toFixed(2)),
          normalSpend: Number(t.normalSpend.toFixed(2)),
          anomalySpend: Number(t.anomalySpend.toFixed(2)),
          anomalyCount: t.anomalyCount,
          transactionCount: t.transactionCount,
        };
      });

      res.status(200).json({ success: true, data: formatted });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching monthly trends' });
    }
  }

  /**
   * Category spending breakdown
   */
  public static async getCategoryBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
      const { startDate, endDate } = req.query;

      const match: any = { userId };
      if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = new Date(startDate as string);
        if (endDate) match.date.$lte = new Date(endDate as string);
      }

      const categories = await Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$category',
            totalSpend: { $sum: '$amount' },
            count: { $sum: 1 },
            anomalyCount: {
              $sum: {
                $cond: [{ $eq: ['$anomalyStatus.isAnomaly', true] }, 1, 0],
              },
            },
          },
        },
        { $sort: { totalSpend: -1 } },
      ]);

      const grandTotal = categories.reduce((sum, c) => sum + c.totalSpend, 0);

      const formatted = categories.map((c) => ({
        category: c._id || 'Uncategorized',
        totalSpend: Number(c.totalSpend.toFixed(2)),
        count: c.count,
        anomalyCount: c.anomalyCount,
        percentage: grandTotal > 0 ? Number(((c.totalSpend / grandTotal) * 100).toFixed(1)) : 0,
      }));

      res.status(200).json({
        success: true,
        data: formatted,
        grandTotal: Number(grandTotal.toFixed(2)),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching category breakdown' });
    }
  }

  /**
   * Anomaly distributions by severity, reviewStatus and category
   */
  public static async getAnomalyDistribution(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);

      const [bySeverity, byCategory, byStatus] = await Promise.all([
        Expense.aggregate([
          { $match: { userId, 'anomalyStatus.isAnomaly': true } },
          {
            $group: {
              _id: '$anomalyStatus.severity',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
            },
          },
        ]),
        Expense.aggregate([
          { $match: { userId, 'anomalyStatus.isAnomaly': true } },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
            },
          },
          { $sort: { count: -1 } },
        ]),
        Expense.aggregate([
          { $match: { userId, 'anomalyStatus.isAnomaly': true } },
          {
            $group: {
              _id: '$anomalyStatus.reviewStatus',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      res.status(200).json({
        success: true,
        data: {
          bySeverity,
          byCategory,
          byStatus,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching anomaly distribution' });
    }
  }

  /**
   * Top merchants analysis
   */
  public static async getMerchantInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);

      const merchants = await Expense.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$merchant',
            totalSpend: { $sum: '$amount' },
            visitCount: { $sum: 1 },
            avgPerVisit: { $avg: '$amount' },
            category: { $first: '$category' },
            anomalies: {
              $sum: {
                $cond: [{ $eq: ['$anomalyStatus.isAnomaly', true] }, 1, 0],
              },
            },
          },
        },
        { $sort: { totalSpend: -1 } },
        { $limit: 10 },
      ]);

      const formatted = merchants.map((m) => ({
        merchant: m._id,
        totalSpend: Number(m.totalSpend.toFixed(2)),
        visitCount: m.visitCount,
        avgPerVisit: Number(m.avgPerVisit.toFixed(2)),
        category: m.category,
        anomalies: m.anomalies,
      }));

      res.status(200).json({ success: true, data: formatted });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching merchant insights' });
    }
  }
}
