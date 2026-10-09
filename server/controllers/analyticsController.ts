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

  /**
   * Weekly, Monthly and Annual structured reports with period-over-period comparisons
   */
  public static async getPeriodReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
      const user = req.user;
      const { view = 'monthly', date = new Date().toISOString() } = req.query;

      const targetDate = new Date(date as string);
      let startDate: Date;
      let endDate: Date;
      let prevStartDate: Date;
      let prevEndDate: Date;

      if (view === 'weekly') {
        // Monday to Sunday
        const day = targetDate.getDay();
        const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(targetDate.setDate(diff));
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        // Previous week
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(startDate.getDate() - 7);
        prevEndDate = new Date(endDate);
        prevEndDate.setDate(endDate.getDate() - 7);
      } else if (view === 'annual') {
        const year = targetDate.getFullYear();
        startDate = new Date(year, 0, 1, 0, 0, 0, 0);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);

        // Previous year
        prevStartDate = new Date(year - 1, 0, 1, 0, 0, 0, 0);
        prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      } else {
        // Monthly
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        startDate = new Date(year, month, 1, 0, 0, 0, 0);
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

        // Previous month
        prevStartDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        prevEndDate = new Date(year, month, 0, 23, 59, 59, 999);
      }

      // Query current period expenses (exclude transfers)
      const currentExpenses = await Expense.find({
        userId,
        date: { $gte: startDate, $lte: endDate },
        excludeFromBudget: { $ne: true },
      }).lean();

      // Query previous period expenses
      const prevExpenses = await Expense.find({
        userId,
        date: { $gte: prevStartDate, $lte: prevEndDate },
        excludeFromBudget: { $ne: true },
      }).lean();

      const totalExpenditure = currentExpenses.reduce((s, e) => s + e.amount, 0);
      const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
      const percentageChange = prevTotal > 0 ? Number((((totalExpenditure - prevTotal) / prevTotal) * 100).toFixed(1)) : 0;

      // Group by category
      const categoryMap: Record<string, { total: number; count: number; anomalyCount: number }> = {};
      currentExpenses.forEach((e) => {
        if (!categoryMap[e.category]) {
          categoryMap[e.category] = { total: 0, count: 0, anomalyCount: 0 };
        }
        categoryMap[e.category].total += e.amount;
        categoryMap[e.category].count += 1;
        if (e.anomalyStatus?.isAnomaly) {
          categoryMap[e.category].anomalyCount += 1;
        }
      });

      const categoryBreakdown = Object.entries(categoryMap).map(([category, stats]) => ({
        category,
        total: Number(stats.total.toFixed(2)),
        count: stats.count,
        anomalyCount: stats.anomalyCount,
        percentage: totalExpenditure > 0 ? Number(((stats.total / totalExpenditure) * 100).toFixed(1)) : 0,
      })).sort((a, b) => b.total - a.total);

      // Anomaly count
      const anomalyCount = currentExpenses.filter((e) => e.anomalyStatus?.isAnomaly).length;

      // Daily breakdown
      const dailyMap: Record<string, number> = {};
      currentExpenses.forEach((e) => {
        const dStr = new Date(e.date).toISOString().slice(0, 10);
        dailyMap[dStr] = (dailyMap[dStr] || 0) + e.amount;
      });

      let highestDay = { date: '', amount: 0 };
      Object.entries(dailyMap).forEach(([dStr, amt]) => {
        if (amt > highestDay.amount) {
          highestDay = { date: dStr, amount: amt };
        }
      });

      const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
      const avgPerDay = totalExpenditure / daysInPeriod;

      res.status(200).json({
        success: true,
        data: {
          view,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalExpenditure: Number(totalExpenditure.toFixed(2)),
          transactionCount: currentExpenses.length,
          avgPerDay: Number(avgPerDay.toFixed(2)),
          highestDay: {
            date: highestDay.date,
            amount: Number(highestDay.amount.toFixed(2)),
          },
          categoryBreakdown,
          previousPeriod: {
            totalExpenditure: Number(prevTotal.toFixed(2)),
            percentageChange,
          },
          budgetUtilization: user?.monthlyBudget ? Number(((totalExpenditure / user.monthlyBudget) * 100).toFixed(1)) : null,
          anomalyCount,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error generating period report' });
    }
  }

  /**
   * Master Colour-Coded Spending Calendar Data
   */
  public static async getCalendarData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
      const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

      const y = parseInt(year as string, 10);
      const m = parseInt(month as string, 10);

      const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);

      const expenses = await Expense.find({
        userId,
        date: { $gte: startDate, $lte: endDate },
        excludeFromBudget: { $ne: true },
      }).sort({ date: 1 }).lean();

      // Category color mapping
      const categoryColors: Record<string, string> = {
        'Food and dining': '#f97316',
        'Groceries': '#10b981',
        'Transport and fuel': '#06b6d4',
        'Shopping': '#ec4899',
        'Education': '#8b5cf6',
        'Bills and utilities': '#eab308',
        'Housing and rent': '#3b82f6',
        'Healthcare': '#ef4444',
        'Entertainment': '#a855f7',
        'Travel': '#14b8a6',
        'Subscriptions': '#6366f1',
        'Personal care': '#f43f5e',
        'Transfers to friends': '#84cc16',
        'Other': '#64748b',
      };

      // Group expenses by date (YYYY-MM-DD)
      const dayMap: Record<string, {
        date: string;
        total: number;
        expenseTotal: number;
        incomeTotal: number;
        transactions: any[];
        categories: Array<{ name: string; total: number; color: string }>;
        anomalies: any[];
      }> = {};

      const daysInMonth = endDate.getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dayMap[dayStr] = {
          date: dayStr,
          total: 0,
          expenseTotal: 0,
          incomeTotal: 0,
          transactions: [],
          categories: [],
          anomalies: [],
        };
      }

      let totalMonthSpend = 0;
      let totalMonthIncome = 0;

      expenses.forEach((e: any) => {
        const dStr = new Date(e.date).toISOString().slice(0, 10);
        if (dayMap[dStr]) {
          const isIncome = e.type === 'income';
          if (isIncome) {
            dayMap[dStr].incomeTotal += e.amount;
            totalMonthIncome += e.amount;
          } else {
            dayMap[dStr].expenseTotal += e.amount;
            dayMap[dStr].total += e.amount;
            totalMonthSpend += e.amount;
          }
          dayMap[dStr].transactions.push(e);
          if (e.anomalyStatus?.isAnomaly && !isIncome) {
            dayMap[dStr].anomalies.push(e);
          }
        }
      });

      // Calculate category breakdown for each day
      Object.values(dayMap).forEach((day) => {
        const catTotals: Record<string, number> = {};
        day.transactions.forEach((t) => {
          if (t.type !== 'income') {
            catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
          }
        });
        day.categories = Object.entries(catTotals).map(([cat, tot]) => ({
          name: cat,
          total: Number(tot.toFixed(2)),
          color: categoryColors[cat] || '#6366f1',
        })).sort((a, b) => b.total - a.total);
        day.total = Number(day.expenseTotal.toFixed(2));
        day.expenseTotal = Number(day.expenseTotal.toFixed(2));
        day.incomeTotal = Number(day.incomeTotal.toFixed(2));
      });

      // Compute statistical threshold for "highest-spending days"
      // Use 75th percentile of days that have spending
      const activeDailyAmounts = Object.values(dayMap)
        .map((d) => d.expenseTotal)
        .filter((t) => t > 0)
        .sort((a, b) => a - b);

      let highSpendingThreshold = 0;
      if (activeDailyAmounts.length > 0) {
        const p75Index = Math.floor(activeDailyAmounts.length * 0.75);
        highSpendingThreshold = activeDailyAmounts[p75Index] || 0;
      }

      res.status(200).json({
        success: true,
        year: y,
        month: m,
        totalMonthSpend: Number(totalMonthSpend.toFixed(2)),
        totalMonthIncome: Number(totalMonthIncome.toFixed(2)),
        netBalance: Number((totalMonthIncome - totalMonthSpend).toFixed(2)),
        highSpendingThreshold: Number(highSpendingThreshold.toFixed(2)),
        days: dayMap,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching calendar data' });
    }
  }
}
