import React, { useState } from 'react';
import { Budget, Category, Transaction } from '../types.ts';
import { Plus, Check, Edit2, Wallet, AlertCircle } from 'lucide-react';

interface BudgetsViewProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  currencySymbol: string;
  monthlyTotal: number;
  monthlyBudgetLimit: number;
  onSetBudget: (budget: { categoryId?: string; amount: number }) => Promise<void>;
  onUpdateTotalBudget: (amount: number) => Promise<void>;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgets,
  categories,
  transactions,
  currencySymbol,
  monthlyTotal,
  monthlyBudgetLimit,
  onSetBudget,
  onUpdateTotalBudget
}) => {
  const [editingTotal, setEditingTotal] = useState<boolean>(false);
  const [totalInput, setTotalInput] = useState<string>(monthlyBudgetLimit.toString());

  const [addingCatBudget, setAddingCatBudget] = useState<boolean>(false);
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || '');
  const [catAmountInput, setCatAmountInput] = useState<string>('200');

  // Calculate current month category spending
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(currentMonth));

  const catSpending: Record<string, number> = {};
  currentMonthTxs.forEach((t) => {
    catSpending[t.categoryId] = (catSpending[t.categoryId] || 0) + t.amount;
  });

  const handleSaveTotal = async () => {
    const val = parseFloat(totalInput);
    if (!isNaN(val) && val > 0) {
      await onUpdateTotalBudget(val);
      setEditingTotal(false);
    }
  };

  const handleSaveCatBudget = async () => {
    const val = parseFloat(catAmountInput);
    if (!isNaN(val) && val > 0 && selectedCatId) {
      await onSetBudget({ categoryId: selectedCatId, amount: val });
      setAddingCatBudget(false);
    }
  };

  const totalPercent = Math.min(Math.round((monthlyTotal / Math.max(monthlyBudgetLimit, 1)) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Monthly Total Budget Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Monthly Budget Allowance
            </span>
            {editingTotal ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold">{currencySymbol}</span>
                <input
                  type="number"
                  value={totalInput}
                  onChange={(e) => setTotalInput(e.target.value)}
                  className="w-32 px-3 py-1.5 rounded-xl border border-neutral-300 text-lg font-bold text-[#2B2B2B]"
                />
                <button
                  type="button"
                  onClick={handleSaveTotal}
                  className="px-3 py-1.5 rounded-xl bg-[#0B6121] text-white text-xs font-bold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTotal(false)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#2B2B2B] font-mono">
                  {currencySymbol}{monthlyBudgetLimit.toFixed(0)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTotalInput(monthlyBudgetLimit.toString());
                    setEditingTotal(true);
                  }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700"
                  title="Edit Total Budget"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-neutral-500 mt-1">
              Spent so far: <strong>{currencySymbol}{monthlyTotal.toFixed(2)}</strong> ({totalPercent}%)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddingCatBudget(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs"
            style={{ backgroundColor: '#0B6121' }}
          >
            <Plus className="w-4 h-4" />
            <span>Set Category Budget</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                totalPercent > 90
                  ? 'bg-red-500'
                  : totalPercent > 75
                  ? 'bg-amber-500'
                  : 'bg-[#0B6121]'
              }`}
              style={{ width: `${totalPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-400 font-medium">
            <span>0%</span>
            <span>50%</span>
            <span>100% ({currencySymbol}{monthlyBudgetLimit.toFixed(0)})</span>
          </div>
        </div>
      </div>

      {/* Add Category Budget Modal / Inline Form */}
      {addingCatBudget && (
        <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#2B2B2B]">Set Category Monthly Budget</h4>
            <button
              type="button"
              onClick={() => setAddingCatBudget(false)}
              className="text-neutral-400 hover:text-neutral-700 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Select Category
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Budget Limit ({currencySymbol})
              </label>
              <input
                type="number"
                value={catAmountInput}
                onChange={(e) => setCatAmountInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-sm"
                placeholder="200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddingCatBudget(false)}
              className="px-3.5 py-1.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCatBudget}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: '#0B6121' }}
            >
              Save Budget
            </button>
          </div>
        </div>
      )}

      {/* Category Budget Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#2B2B2B] px-1">Category Budgets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {categories.map((cat) => {
            const b = budgets.find((b) => b.categoryId === cat.id);
            const limit = b ? b.amount : 0;
            const spent = catSpending[cat.id] || 0;
            const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
            const isOver = limit > 0 && spent > limit;

            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-sm font-bold text-[#2B2B2B]">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#2B2B2B] block">
                      {currencySymbol}{spent.toFixed(0)} /{' '}
                      {limit > 0 ? `${currencySymbol}${limit.toFixed(0)}` : 'No limit'}
                    </span>
                  </div>
                </div>

                {limit > 0 ? (
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-[#0B6121]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>{percent}% used</span>
                      <span>
                        {isOver ? (
                          <strong className="text-red-600">
                            Over by {currencySymbol}{(spent - limit).toFixed(0)}
                          </strong>
                        ) : (
                          <span>{currencySymbol}{(limit - spent).toFixed(0)} remaining</span>
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCatId(cat.id);
                      setCatAmountInput('150');
                      setAddingCatBudget(true);
                    }}
                    className="text-xs text-[#0B6121] font-semibold hover:underline"
                  >
                    + Set limit for {cat.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
