import React, { useState, useEffect } from 'react';
import {
  Target,
  Edit2,
  Check,
  AlertTriangle,
  CheckCircle2,
  X,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ICategory, ICategoryBreakdown } from '../types';

export const BudgetsView: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol = user?.preferences?.currencySymbol || '₹';

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [breakdown, setBreakdown] = useState<ICategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit budget modal / inline
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newBudgetValue, setNewBudgetValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, breakRes] = await Promise.all([
        api.categories.list(),
        api.analytics.getCategoryBreakdown(),
      ]);

      if (catRes.success) setCategories(catRes.data);
      if (breakRes.success) setBreakdown(breakRes.data);
    } catch (err) {
      console.error('Failed to load budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalMonthlyBudget = user?.monthlyBudget || 25000;
  const totalSpent = breakdown.reduce((sum, b) => sum + b.totalSpend, 0);
  const overallUsedPct = totalMonthlyBudget > 0 ? (totalSpent / totalMonthlyBudget) * 100 : 0;
  const overallRemaining = Math.max(0, totalMonthlyBudget - totalSpent);

  const startEditBudget = (cat: ICategory) => {
    setEditingCatId(cat._id);
    setNewBudgetValue(String(cat.budget || 0));
  };

  const saveBudget = async (catId: string) => {
    const num = parseFloat(newBudgetValue);
    if (isNaN(num) || num < 0) return;

    setSaving(true);
    try {
      await api.categories.update(catId, { budget: num });
      setEditingCatId(null);
      await loadData();
    } catch (err) {
      console.error('Save budget error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0B6121] border-t-transparent mx-auto mb-2" />
        <span className="text-xs font-semibold">Loading budget targets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      {/* Top Header Card: Overall Monthly Budget Progress */}
      <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E0DDDA] dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#0B6121]" />
              <h2 className="text-base font-extrabold text-[#2B2B2B] dark:text-white">
                Monthly Budget Health
              </h2>
            </div>
            <p className="text-slate-500 mt-0.5">
              Track overall and category limits with real-time utilization progress.
            </p>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Total Budget
              </span>
              <span className="text-sm font-black text-[#2B2B2B] dark:text-white tabular-nums">
                {currencySymbol}{totalMonthlyBudget.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Spent So Far
              </span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                {currencySymbol}{totalSpent.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Remaining
              </span>
              <span className={`text-sm font-black tabular-nums ${
                overallRemaining > 0 ? 'text-[#0B6121] dark:text-emerald-400' : 'text-rose-600'
              }`}>
                {currencySymbol}{overallRemaining.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Master Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between font-bold text-slate-600 dark:text-slate-300">
            <span>Overall Utilization</span>
            <span className="tabular-nums">{overallUsedPct.toFixed(1)}%</span>
          </div>

          <div className="w-full bg-[#E0DDDA]/40 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-[#E0DDDA]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallUsedPct > 100
                  ? 'bg-rose-600'
                  : overallUsedPct >= 75
                  ? 'bg-amber-500'
                  : 'bg-[#0B6121]'
              }`}
              style={{ width: `${Math.min(overallUsedPct, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0B6121]" /> Under 75%: Healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> 75-100%: Warning
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" /> Over 100%: Exceeded
            </span>
          </div>
        </div>
      </div>

      {/* Category Budget Cards Grid */}
      <div>
        <h3 className="text-sm font-extrabold text-[#2B2B2B] dark:text-white mb-4">
          Category Budgets & Thresholds
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const spentItem = breakdown.find((b) => b.category === cat.name);
            const spent = spentItem ? spentItem.totalSpend : 0;
            const target = cat.budget || 0;
            const pct = target > 0 ? (spent / target) * 100 : 0;
            const isOver = target > 0 && spent > target;
            const isEditing = editingCatId === cat._id;

            return (
              <div
                key={cat._id}
                className={`rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-xs transition space-y-3 ${
                  isOver
                    ? 'border-rose-300 dark:border-rose-900/60'
                    : 'border-[#E0DDDA] dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">
                      {cat.emoji || '🏷️'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <h4 className="font-extrabold text-[#2B2B2B] dark:text-white truncate max-w-[130px]">
                          {cat.name}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Inline edit button */}
                  {!isEditing && (
                    <button
                      onClick={() => startEditBudget(cat)}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#0B6121] hover:bg-[#E0DDDA]/40 transition"
                      title="Set / edit budget limit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Editing Form */}
                {isEditing ? (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={newBudgetValue}
                        onChange={(e) => setNewBudgetValue(e.target.value)}
                        className="w-full pl-6 pr-2 py-1 rounded-lg border border-[#0B6121] text-xs font-bold text-[#2B2B2B] dark:text-white bg-white dark:bg-slate-800"
                        autoFocus
                      />
                    </div>
                    <button
                      disabled={saving}
                      onClick={() => saveBudget(cat._id)}
                      className="p-1.5 rounded-lg bg-[#0B6121] text-white hover:bg-[#0B6121]/90"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingCatId(null)}
                      className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Spent</span>
                      <span className="font-black text-[#2B2B2B] dark:text-white tabular-nums">
                        {currencySymbol}{spent.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block">Budget Limit</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                        {target > 0 ? `${currencySymbol}${target.toFixed(0)}` : 'No Limit'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Category Progress Bar */}
                {target > 0 ? (
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-[#E0DDDA]/40 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct > 100
                            ? 'bg-rose-600'
                            : pct >= 75
                            ? 'bg-amber-500'
                            : 'bg-[#0B6121]'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                      <span>{pct.toFixed(0)}% used</span>
                      <span className={isOver ? 'text-rose-600' : 'text-[#0B6121]'}>
                        {isOver
                          ? `Exceeded by ${currencySymbol}${(spent - target).toFixed(0)}`
                          : `${currencySymbol}${(target - spent).toFixed(0)} left`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic pt-1">
                    No target set.{' '}
                    <button
                      onClick={() => startEditBudget(cat)}
                      className="text-[#0B6121] font-bold hover:underline"
                    >
                      Set limit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
