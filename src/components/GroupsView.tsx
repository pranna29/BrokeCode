import React, { useState } from 'react';
import { FriendBalance } from '../types.ts';
import { Users, Plus, CheckCircle2, ArrowUpRight, ArrowDownLeft, DollarSign } from 'lucide-react';
import { api } from '../services/api.ts';

interface GroupsViewProps {
  friendBalances: FriendBalance[];
  currencySymbol: string;
  onRefreshData: () => Promise<void>;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  friendBalances,
  currencySymbol,
  onRefreshData
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [friendName, setFriendName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isOwed, setIsOwed] = useState<boolean>(true); // true = they owe me, false = I owe them
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const totalOwedToYou = friendBalances
    .filter((f) => f.amount > 0)
    .reduce((acc, f) => acc + f.amount, 0);

  const totalYouOwe = friendBalances
    .filter((f) => f.amount < 0)
    .reduce((acc, f) => acc + Math.abs(f.amount), 0);

  const handleAddSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName || !amount) return;

    setIsSubmitting(true);
    try {
      await api.addSplitExpense({
        friendName: friendName.trim(),
        amount: parseFloat(amount),
        isOwed,
        notes: notes.trim() || undefined
      });
      await onRefreshData();
      setShowAddModal(false);
      setFriendName('');
      setAmount('');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettle = async (id: string) => {
    if (window.confirm('Mark this balance as fully settled?')) {
      await api.settleGroupBalance(id);
      await onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Summary Banner */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0B6121]/10 text-[#0B6121] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#2B2B2B]">
                Group Expense Splitting &amp; IOUs
              </h2>
              <p className="text-xs text-neutral-500">
                Track money lent, shared dinners, rent shares and pending settlements
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs"
            style={{ backgroundColor: '#0B6121' }}
          >
            <Plus className="w-4 h-4" />
            <span>Record Split / IOU</span>
          </button>
        </div>

        {/* Totals Grid */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-neutral-100">
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-1">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>You are Owed</span>
            </div>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-900 font-mono">
              +{currencySymbol}{totalOwedToYou.toFixed(2)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 mb-1">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>You Owe Others</span>
            </div>
            <span className="text-xl sm:text-2xl font-extrabold text-rose-900 font-mono">
              -{currencySymbol}{totalYouOwe.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Add Split Modal */}
      {showAddModal && (
        <form
          onSubmit={handleAddSplit}
          className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200 space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#2B2B2B]">Record Split or Lent Money</h4>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Friend's Name
              </label>
              <input
                type="text"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="e.g. Marcus Cole"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Amount ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25.00"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
              Direction
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOwed(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  isOwed
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                They owe me (+{currencySymbol})
              </button>
              <button
                type="button"
                onClick={() => setIsOwed(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  !isOwed
                    ? 'border-rose-600 bg-rose-50 text-rose-800'
                    : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                I owe them (-{currencySymbol})
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Split grocery bill at Costco"
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: '#0B6121' }}
            >
              Save Record
            </button>
          </div>
        </form>
      )}

      {/* Friends Balance List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#2B2B2B] px-1">Friend Balances</h3>

        {friendBalances.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-neutral-200/80 text-neutral-400 text-xs">
            No group expenses or friend balances tracked yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {friendBalances.map((fb) => (
              <div
                key={fb.id}
                className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-neutral-600 shrink-0">
                    {fb.friendName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#2B2B2B]">{fb.friendName}</h4>
                    <p className="text-xs text-neutral-400">
                      {fb.notes || 'Group split'} • Updated {fb.lastUpdated}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className={`text-base font-extrabold font-mono ${
                        fb.amount > 0
                          ? 'text-emerald-700'
                          : fb.amount < 0
                          ? 'text-rose-700'
                          : 'text-neutral-400'
                      }`}
                    >
                      {fb.amount > 0 ? `+${currencySymbol}` : fb.amount < 0 ? `-${currencySymbol}` : ''}
                      {Math.abs(fb.amount).toFixed(2)}
                    </span>
                    <span className="block text-[10px] text-neutral-400 font-medium">
                      {fb.amount > 0 ? 'owes you' : fb.amount < 0 ? 'you owe' : 'settled'}
                    </span>
                  </div>

                  {fb.amount !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleSettle(fb.id)}
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
                    >
                      Settle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
