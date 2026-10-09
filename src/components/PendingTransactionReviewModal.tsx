import React, { useState } from 'react';
import {
  X,
  Check,
  AlertTriangle,
  EyeOff,
  Clock,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { IPendingTransaction } from '../types';

interface PendingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingTransactions: IPendingTransaction[];
  onConfirm: (id: string, data: any) => Promise<void>;
  onIgnore: (id: string) => Promise<void>;
  onBatchConfirm: (ids: string[]) => Promise<void>;
  currencySymbol?: string;
  categories: string[];
}

export const PendingTransactionReviewModal: React.FC<PendingReviewModalProps> = ({
  isOpen,
  onClose,
  pendingTransactions,
  onConfirm,
  onIgnore,
  onBatchConfirm,
  currencySymbol = '₹',
  categories,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!isOpen || pendingTransactions.length === 0) return null;

  const startEdit = (tx: IPendingTransaction) => {
    setEditingId(tx._id);
    setEditFormData({
      amount: tx.amount,
      merchant: tx.merchant,
      category: tx.suggestedCategory || 'Other',
      date: new Date(tx.date).toISOString().slice(0, 10),
    });
  };

  const handleSaveConfirmed = async (tx: IPendingTransaction) => {
    setLoadingAction(tx._id);
    try {
      if (editingId === tx._id) {
        await onConfirm(tx._id, editFormData);
        setEditingId(null);
      } else {
        await onConfirm(tx._id, {
          amount: tx.amount,
          merchant: tx.merchant,
          category: tx.suggestedCategory,
          date: tx.date,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleIgnore = async (id: string) => {
    setLoadingAction(id);
    try {
      await onIgnore(id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApproveAll = async () => {
    setLoadingAction('all');
    try {
      await onBatchConfirm(pendingTransactions.map((t) => t._id));
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs max-h-[90vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Pending Imported Transactions
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-500 font-bold">
                  {pendingTransactions.length} detected
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Parsed from your Google Pay / Bank SMS messages. Please review before adding to expenses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable list of pending transactions */}
        <div className="my-4 overflow-y-auto space-y-3 max-h-[55vh] pr-1">
          {pendingTransactions.map((tx) => {
            const isEditing = editingId === tx._id;
            return (
              <div
                key={tx._id}
                className={`p-3.5 rounded-xl border transition-all ${
                  tx.isDuplicateWarning
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                {/* Duplicate alert banner */}
                {tx.isDuplicateWarning && (
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-amber-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Potential Duplicate: Similar transaction or UPI reference exists.</span>
                  </div>
                )}

                {isEditing ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Merchant</label>
                        <input
                          type="text"
                          value={editFormData.merchant}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, merchant: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Amount ({currencySymbol})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editFormData.amount}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, amount: parseFloat(e.target.value) })
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Category</label>
                        <select
                          value={editFormData.category}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, category: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Date</label>
                        <input
                          type="date"
                          value={editFormData.date}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, date: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {tx.merchant}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {tx.suggestedCategory} • {new Date(tx.date).toLocaleDateString()}
                        {tx.paymentRef && ` • Ref: ${tx.paymentRef}`}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 italic line-clamp-1 max-w-md">
                        "{tx.rawSms}"
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {currencySymbol}{tx.amount.toFixed(2)}
                      </div>
                      <span className="inline-block text-[9px] uppercase font-bold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.2 rounded mt-0.5">
                        {tx.paymentMode.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions row */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-end gap-2">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => startEdit(tx)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 transition text-[11px]"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleIgnore(tx._id)}
                        disabled={loadingAction === tx._id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition text-[11px]"
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>Ignore</span>
                      </button>
                      <button
                        onClick={() => handleSaveConfirmed(tx)}
                        disabled={loadingAction === tx._id}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition text-[11px]"
                      >
                        <Check className="w-3 h-3" />
                        <span>Add Expense</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[11px]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveConfirmed(tx)}
                        disabled={loadingAction === tx._id}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition text-[11px]"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save & Add</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Strip */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition font-medium"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review Later</span>
          </button>

          <button
            onClick={handleApproveAll}
            disabled={loadingAction === 'all'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loadingAction === 'all' ? 'Ingesting...' : `Add All (${pendingTransactions.length})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
