import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IMonthlyTrend, ICategoryBreakdown } from '../types';
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

export const StatisticsView: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol = user?.preferences?.currencySymbol || '₹';

  const [trends, setTrends] = useState<IMonthlyTrend[]>([]);
  const [categories, setCategories] = useState<ICategoryBreakdown[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [monthsCount, setMonthsCount] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [trRes, catRes, merRes] = await Promise.all([
          api.analytics.getMonthlyTrends(monthsCount),
          api.analytics.getCategoryBreakdown(),
          api.analytics.getMerchantInsights(),
        ]);

        if (trRes.success) setTrends(trRes.data);
        if (catRes.success) setCategories(catRes.data);
        if (merRes.success) setMerchants(merRes.data);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [monthsCount]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0B6121] border-t-transparent mx-auto mb-2" />
        <span className="text-xs font-semibold">Compiling statistical spending insights...</span>
      </div>
    );
  }

  const grandTotal = categories.reduce((sum, c) => sum + c.totalSpend, 0);
  const totalAnomaliesDetected = categories.reduce((sum, c) => sum + c.anomalyCount, 0);

  // Category palette colors
  const CATEGORY_COLORS: Record<string, string> = {
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
    'Other': '#64748b',
  };

  const pieData = categories
    .filter((c) => c.totalSpend > 0)
    .map((c) => ({
      name: c.category,
      value: c.totalSpend,
      color: CATEGORY_COLORS[c.category] || '#6366f1',
    }))
    .sort((a, b) => b.value - a.value);

  // Monthly trends data for bar chart
  const trendBarData = trends.map((t) => ({
    name: t.month,
    Spend: t.totalSpend,
    Normal: t.normalSpend,
    Anomalies: t.anomalySpend,
  }));

  return (
    <div className="space-y-6 text-xs">
      {/* Header and Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-[#2B2B2B] dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0B6121]" />
            Spending Statistics & Insights
          </h2>
          <p className="text-slate-500 mt-1">
            Category distributions, monthly trends, and explainable outlier breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-bold">Timeline:</span>
          <select
            value={monthsCount}
            onChange={(e) => setMonthsCount(Number(e.target.value))}
            className="rounded-xl border border-[#E0DDDA] dark:border-slate-800 bg-[#faf9f8] dark:bg-slate-800 px-3 py-1.5 font-bold text-[#2B2B2B] dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#0B6121]"
          >
            <option value={3}>Past 3 Months</option>
            <option value={6}>Past 6 Months</option>
            <option value={12}>Past 12 Months</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <span className="text-slate-500 font-bold block mb-1">Total Tracked Spending</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
            {currencySymbol}{grandTotal.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {categories.reduce((s, c) => s + c.count, 0)} transactions
          </span>
        </div>

        <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <span className="text-slate-500 font-bold block mb-1">Active Categories</span>
          <div className="text-2xl font-black text-[#2B2B2B] dark:text-white tabular-nums">
            {categories.filter((c) => c.totalSpend > 0).length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Top: {categories[0]?.category || 'None'} ({categories[0]?.percentage || 0}%)
          </span>
        </div>

        <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <span className="text-slate-500 font-bold block mb-1">Statistical Anomalies</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {totalAnomaliesDetected}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Detected via IQR mathematical threshold
          </span>
        </div>
      </div>

      {/* Category Breakdown (Donut Chart + List) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Donut Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-[#2B2B2B] dark:text-white mb-2">
            Category Spending Distribution
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Proportional breakdown of your expenses across all categories.
          </p>

          <div className="h-64 flex items-center justify-center">
            {pieData.length === 0 ? (
              <span className="text-slate-400">No expense records available yet</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${currencySymbol}${Number(val).toFixed(2)}`, 'Spend']}
                    contentStyle={{
                      backgroundColor: '#2B2B2B',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Category List Table */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-[#2B2B2B] dark:text-white mb-4">
            Category Ranking & Anomaly Count
          </h3>

          <div className="space-y-3">
            {categories.map((cat) => {
              const catColor = CATEGORY_COLORS[cat.category] || '#6366f1';
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: catColor }}
                      />
                      <span className="font-bold text-[#2B2B2B] dark:text-white">
                        {cat.category}
                      </span>
                      {cat.anomalyCount > 0 && (
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold inline-flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {cat.anomalyCount} outlier{cat.anomalyCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-[#2B2B2B] dark:text-white tabular-nums">
                        {currencySymbol}{cat.totalSpend.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5 tabular-nums">
                        ({cat.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#E0DDDA]/40 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor: catColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-[#2B2B2B] dark:text-white mb-1">
          Monthly Spending Trajectory
        </h3>
        <p className="text-[11px] text-slate-400 mb-4">
          Normal baseline vs. statistical anomalous expenditure over the past {monthsCount} months.
        </p>

        <div className="h-72">
          {trendBarData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              No trend data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${currencySymbol}${Number(val).toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: '#2B2B2B',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Normal" stackId="a" fill="#0B6121" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Anomalies" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Frequent Merchants & Payees */}
      <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-[#2B2B2B] dark:text-white mb-3">
          Top Merchants & Payees
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {merchants.slice(0, 8).map((m, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#E0DDDA]/70 dark:border-slate-800 bg-[#faf9f8] dark:bg-slate-800/40 p-3"
            >
              <div className="font-extrabold text-[#2B2B2B] dark:text-white truncate">
                {m.merchant || 'Unknown'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>{m.count} visit{m.count > 1 ? 's' : ''}</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {currencySymbol}{m.totalSpend?.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
