import React, { useState, useEffect } from 'react';
import {
  Wallet,
  AlertTriangle,
  TrendingDown,
  ArrowUpRight,
  ShieldAlert,
  ArrowRight,
  Receipt,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  IDashboardSummary,
  IMonthlyTrend,
  ICategoryBreakdown,
  IExpense,
} from '../types';
import { SpendingTrendChart, CategoryBarChart } from '../components/Charts';
import { AnomalyFeedbackModal } from '../components/AnomalyFeedbackModal';

interface DashboardViewProps {
  onNavigateTab: (tab: any) => void;
  onOpenAddExpense: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenAddExpense,
}) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<IDashboardSummary | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<IMonthlyTrend[]>([]);
  const [categories, setCategories] = useState<ICategoryBreakdown[]>([]);
  const [recentAnomalies, setRecentAnomalies] = useState<IExpense[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<IExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [selectedAnomalyForReview, setSelectedAnomalyForReview] = useState<IExpense | null>(null);

  const currencySymbol = user?.preferences?.currencySymbol || '$';

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, trendsRes, catRes, anomRes, expRes] = await Promise.all([
        api.analytics.getSummary(),
        api.analytics.getMonthlyTrends(6),
        api.analytics.getCategoryBreakdown(),
        api.anomalies.list({ limit: 4, reviewStatus: 'unreviewed' }),
        api.expenses.list({ limit: 6, sortBy: 'date', sortOrder: 'desc' }),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (trendsRes.success) setMonthlyTrends(trendsRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (anomRes.success) setRecentAnomalies(anomRes.data);
      if (expRes.success) setRecentTransactions(expRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleFeedbackSubmit = async (id: string, reviewStatus: string, notes?: string) => {
    await api.anomalies.submitFeedback(id, reviewStatus, notes);
    loadDashboardData();
  };

  if (loading && !summary) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
          <span className="text-xs font-medium">Crunching spending metrics...</span>
        </div>
      </div>
    );
  }

  const currentMonth = summary?.currentMonth || {
    spend: 0,
    budget: user?.monthlyBudget || 800,
    budgetRemaining: 800,
    budgetUsedPercentage: 0,
    transactions: 0,
  };

  const anomaliesInfo = summary?.anomalies || {
    total: 0,
    unreviewed: 0,
    totalAnomalyAmount: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Alert Header if Unreviewed Anomalies exist */}
      {anomaliesInfo.unreviewed > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {anomaliesInfo.unreviewed} Unreviewed Spending Anomaly
                {anomaliesInfo.unreviewed > 1 ? 's' : ''} Detected
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Spikes in recent transactions exceeded your typical category interquartile thresholds.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('anomalies')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition shrink-0"
          >
            <span>Review Alerts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Month Spend Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Monthly Spend</span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {currencySymbol}{currentMonth.spend.toFixed(2)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Budget: {currencySymbol}{currentMonth.budget}</span>
              <span className="font-semibold">{currentMonth.budgetUsedPercentage}% used</span>
            </div>
            <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  currentMonth.budgetUsedPercentage > 90
                    ? 'bg-rose-500'
                    : currentMonth.budgetUsedPercentage > 75
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, currentMonth.budgetUsedPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Budget Remaining Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Remaining Allowance</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {currencySymbol}{currentMonth.budgetRemaining.toFixed(2)}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {currentMonth.budgetRemaining > 0
                ? `${currencySymbol}${(currentMonth.budgetRemaining / (30 - new Date().getDate() + 1)).toFixed(2)} daily runway left`
                : 'Budget exceeded for this month'}
            </div>
          </div>
        </div>

        {/* Flagged Anomalies Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Flagged Anomalies</span>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {anomaliesInfo.total}
              </div>
              {anomaliesInfo.unreviewed > 0 && (
                <span className="text-xs font-bold text-rose-500">
                  ({anomaliesInfo.unreviewed} unreviewed)
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {currencySymbol}{anomaliesInfo.totalAnomalyAmount.toFixed(2)} in unusual spending
            </div>
          </div>
        </div>

        {/* Total Transactions Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Total Logged</span>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary?.totalTransactions || 0}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Avg: {currencySymbol}{(summary?.avgTransaction || 0).toFixed(2)} per transaction
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spending Trend Area Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Spending Trend
              </h3>
              <p className="text-[11px] text-slate-500">
                Red nodes denote months containing statistical spending anomalies
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">Past 6 Months</span>
          </div>
          <div className="mt-4">
            <SpendingTrendChart data={monthlyTrends} currencySymbol={currencySymbol} />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top Spending Categories
              </h3>
              <p className="text-[11px] text-slate-500">Distribution across active budget buckets</p>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400"
            >
              Full Analytics
            </button>
          </div>
          <div className="mt-4">
            <CategoryBarChart data={categories} currencySymbol={currencySymbol} />
          </div>
        </div>
      </div>

      {/* Two Column Lower Section: Recent Anomalies & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Anomalies Card Feed */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Spending Outliers
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('anomalies')}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400"
            >
              View All
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {recentAnomalies.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                No unreviewed spending anomalies detected! All recent transactions fit your baseline.
              </div>
            ) : (
              recentAnomalies.map((a) => (
                <div key={a._id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {a.merchant}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {a.category} • {new Date(a.date).toLocaleDateString()}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                      {a.anomalyStatus.explanation}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-rose-500">
                      {currencySymbol}{a.amount.toFixed(2)}
                    </div>
                    <button
                      onClick={() => setSelectedAnomalyForReview(a)}
                      className="mt-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition"
                    >
                      Audit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Expenses
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400"
            >
              Manage
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No transactions recorded yet.{' '}
                <button
                  onClick={onOpenAddExpense}
                  className="text-indigo-500 underline font-medium"
                >
                  Add your first expense
                </button>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        tx.anomalyStatus.isAnomaly ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {tx.merchant}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {tx.category} • {new Date(tx.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {currencySymbol}{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <AnomalyFeedbackModal
        isOpen={!!selectedAnomalyForReview}
        onClose={() => setSelectedAnomalyForReview(null)}
        expense={selectedAnomalyForReview}
        onSubmit={handleFeedbackSubmit}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};
