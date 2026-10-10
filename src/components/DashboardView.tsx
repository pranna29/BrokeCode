import React from 'react';
import { Transaction, Category, PaymentAccount, User } from '../types.ts';
import {
  TrendingUp,
  CreditCard,
  Plus,
  Camera,
  AlertTriangle,
  ArrowRight,
  Flame,
  PieChart as PieIcon
} from 'lucide-react';
import { SwipeableTransactionItem } from './SwipeableTransactionItem.tsx';

interface DashboardViewProps {
  user: User;
  transactions: Transaction[];
  categories: Category[];
  accounts: PaymentAccount[];
  currencySymbol: string;
  monthlyTotal: number;
  monthlyBudget: number;
  categoryBreakdown: { name: string; emoji: string; color: string; total: number; count: number }[];
  unreviewedAnomaliesCount: number;
  highestDay: string;
  highestAmount: number;
  onOpenAddModal: () => void;
  onOpenScanModal: () => void;
  onNavigateToAnomalies: () => void;
  onNavigateToTransactions: () => void;
  onNavigateToCalendar: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  transactions,
  categories,
  accounts,
  currencySymbol,
  monthlyTotal,
  monthlyBudget,
  categoryBreakdown,
  unreviewedAnomaliesCount,
  highestDay,
  highestAmount,
  onOpenAddModal,
  onOpenScanModal,
  onNavigateToAnomalies,
  onNavigateToTransactions,
  onNavigateToCalendar,
  onEditTransaction,
  onDeleteTransaction
}) => {
  const budgetPercentage = Math.min(Math.round((monthlyTotal / Math.max(monthlyBudget, 1)) * 100), 100);
  const remainingBudget = Math.max(0, monthlyBudget - monthlyTotal);
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Unreviewed Anomaly Alert Banner */}
      {unreviewedAnomaliesCount > 0 && (
        <div
          onClick={onNavigateToAnomalies}
          className="p-4 rounded-3xl bg-amber-50 border border-amber-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-200/60 text-amber-900 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {unreviewedAnomaliesCount} Unusual Expense Spikes Detected
              </h4>
              <p className="text-xs text-amber-800/80">
                Statistical anomalies flagged for review (surges vs. category baselines).
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-200/80 px-3 py-1.5 rounded-xl shrink-0"
          >
            <span>Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Monthly Spend & Budget Allowance */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Spent This Month
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#2B2B2B] tracking-tight font-mono">
                {currencySymbol}{monthlyTotal.toFixed(2)}
              </span>
              <span className="text-xs text-neutral-400 font-semibold">
                of {currencySymbol}{monthlyBudget.toFixed(0)} limit
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {remainingBudget > 0 ? (
                <span>
                  Remaining runway:{' '}
                  <strong className="text-[#0B6121]">{currencySymbol}{remainingBudget.toFixed(2)}</strong>
                </span>
              ) : (
                <span className="text-red-600 font-bold">
                  Exceeded budget by {currencySymbol}{(monthlyTotal - monthlyBudget).toFixed(2)}
                </span>
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenScanModal}
              className="px-4 py-3 rounded-2xl border border-neutral-300 hover:bg-neutral-50 text-xs font-bold text-[#2B2B2B] flex items-center gap-2 transition-all shadow-2xs"
            >
              <Camera className="w-4 h-4 text-[#0B6121]" />
              <span>Scan Bill</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-5 py-3 rounded-2xl text-xs font-bold text-white flex items-center gap-2 shadow-md transition-all active:scale-95"
              style={{ backgroundColor: '#0B6121' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs font-semibold text-neutral-500 mb-1.5">
            <span>Budget Utilization</span>
            <span>{budgetPercentage}%</span>
          </div>
          <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPercentage > 90
                  ? 'bg-red-500'
                  : budgetPercentage > 75
                  ? 'bg-amber-500'
                  : 'bg-[#0B6121]'
              }`}
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Key Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Metric 1: Highest Day */}
        <div
          onClick={onNavigateToCalendar}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-2xs cursor-pointer hover:border-neutral-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-400">Peak Spend Day</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-lg sm:text-xl font-extrabold text-[#2B2B2B] font-mono block">
            {highestAmount > 0 ? `${currencySymbol}${highestAmount.toFixed(0)}` : '-'}
          </span>
          <span className="text-[11px] text-neutral-400 truncate block mt-0.5">
            {highestDay || 'No data yet'}
          </span>
        </div>

        {/* Metric 2: Top Category */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-400">Top Category</span>
            <PieIcon className="w-4 h-4 text-[#0B6121]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">{categoryBreakdown[0]?.emoji || '💸'}</span>
            <span className="text-sm sm:text-base font-extrabold text-[#2B2B2B] truncate">
              {categoryBreakdown[0]?.name || 'None'}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 truncate block mt-0.5">
            {categoryBreakdown[0] ? `${currencySymbol}${categoryBreakdown[0].total.toFixed(0)} total` : 'No spend'}
          </span>
        </div>

        {/* Metric 3: Active Accounts */}
        <div className="col-span-2 sm:col-span-1 bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-400">Payment Accounts</span>
            <CreditCard className="w-4 h-4 text-neutral-500" />
          </div>
          <span className="text-lg sm:text-xl font-extrabold text-[#2B2B2B] block">
            {accounts.length}
          </span>
          <span className="text-[11px] text-neutral-400 truncate block mt-0.5">
            Default: {accounts.find((a) => a.isDefault)?.name || accounts[0]?.name || 'Debit'}
          </span>
        </div>
      </div>

      {/* Category Spending Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2B2B2B]">Monthly Category Breakdown</h3>
            <span className="text-xs text-neutral-400 font-medium">
              {categoryBreakdown.length} active
            </span>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.slice(0, 5).map((cat) => {
              const catPercent = Math.round((cat.total / Math.max(monthlyTotal, 1)) * 100);
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#2B2B2B] flex items-center gap-1.5">
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </span>
                    <span className="font-mono font-bold text-[#2B2B2B]">
                      {currencySymbol}{cat.total.toFixed(2)}{' '}
                      <span className="text-neutral-400 text-[10px] font-normal">({catPercent}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: cat.color || '#10b981',
                        width: `${catPercent}%`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions List with Swipe Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-[#2B2B2B]">Recent Transactions</h3>
          <button
            type="button"
            onClick={onNavigateToTransactions}
            className="text-xs font-bold text-[#0B6121] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-neutral-200/80 text-neutral-400 text-xs">
            No transactions yet. Click Add Expense to record your first purchase.
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <SwipeableTransactionItem
                key={tx.id}
                transaction={tx}
                currencySymbol={currencySymbol}
                isCustomOrder={false}
                canMoveUp={false}
                canMoveDown={false}
                onEdit={onEditTransaction}
                onDeleteRequest={onDeleteTransaction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
