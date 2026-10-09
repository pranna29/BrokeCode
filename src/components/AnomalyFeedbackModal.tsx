import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, ThumbsUp, EyeOff, ShieldCheck } from 'lucide-react';
import { IExpense } from '../types';

interface AnomalyFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: IExpense | null;
  onSubmit: (id: string, reviewStatus: string, userFeedback?: string) => Promise<void>;
  currencySymbol?: string;
}

export const AnomalyFeedbackModal: React.FC<AnomalyFeedbackModalProps> = ({
  isOpen,
  onClose,
  expense,
  onSubmit,
  currencySymbol = '$',
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('expected_purchase');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !expense) return null;

  const baseline = expense.anomalyStatus.baseline;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(expense._id, selectedStatus, feedbackNotes);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Review Spending Alert
              </h2>
              <p className="text-[11px] text-slate-500">
                Audit and provide feedback for statistical calibration
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

        {/* Transaction Summary Card */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                {expense.merchant}
              </div>
              <div className="text-slate-500 text-[11px]">
                {expense.category} • {new Date(expense.date).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-base text-rose-500">
                {currencySymbol}{expense.amount.toFixed(2)}
              </div>
              <span className="inline-block uppercase tracking-wider font-semibold text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                Score: {expense.anomalyStatus.score}/100 • {expense.anomalyStatus.severity}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-indigo-500">Reason: </span>
            {expense.anomalyStatus.explanation}
          </div>

          {baseline && baseline.median !== undefined && (
            <div className="mt-2.5 grid grid-cols-3 gap-2 p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800 text-[10px]">
              <div>
                <span className="text-slate-400 block">Category Median</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currencySymbol}{baseline.median?.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Normal Range (IQR)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currencySymbol}{baseline.q1?.toFixed(2)} – {currencySymbol}{baseline.q3?.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Upper Threshold</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currencySymbol}{baseline.upperBound?.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Options */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <label className="block font-medium text-slate-700 dark:text-slate-300">
            How would you classify this transaction?
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedStatus('expected_purchase')}
              className={`p-3 rounded-xl border text-left transition flex flex-col items-start gap-1.5 ${
                selectedStatus === 'expected_purchase'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <div className="font-semibold text-[11px]">Expected Purchase</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Legitimate one-off expense. Do not treat as repeat alert.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('confirmed_anomaly')}
              className={`p-3 rounded-xl border text-left transition flex flex-col items-start gap-1.5 ${
                selectedStatus === 'confirmed_anomaly'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <div className="font-semibold text-[11px]">Confirmed Anomaly</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Accidental billing, spike, or unusual splurge.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('dismissed')}
              className={`p-3 rounded-xl border text-left transition flex flex-col items-start gap-1.5 ${
                selectedStatus === 'dismissed'
                  ? 'border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <EyeOff className="w-4 h-4" />
              <div className="font-semibold text-[11px]">Dismiss Alert</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Remove warning without updating baseline.
              </div>
            </button>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Feedback Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Bought chemistry lab manual for midterms; emergency car repair"
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{loading ? 'Submitting...' : 'Confirm Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
