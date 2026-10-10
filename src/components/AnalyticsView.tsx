import React, { useState } from 'react';
import { Transaction, Category } from '../types.ts';
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  XCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  Check
} from 'lucide-react';
import { api } from '../services/api.ts';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
  onRefreshData: () => Promise<void>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  categories,
  currencySymbol,
  onRefreshData
}) => {
  const [reviewFilter, setReviewFilter] = useState<'all' | 'unreviewed' | 'confirmed' | 'expected'>('all');
  const [feedbackLoadingId, setFeedbackLoadingId] = useState<string | null>(null);

  const anomalies = transactions.filter((t) => t.anomaly && t.anomaly.isAnomaly);
  const unreviewedCount = anomalies.filter((a) => a.anomaly?.reviewStatus === 'unreviewed').length;
  const confirmedCount = anomalies.filter((a) => a.anomaly?.reviewStatus === 'confirmed').length;
  const expectedCount = anomalies.filter((a) => a.anomaly?.reviewStatus === 'expected').length;

  const filteredAnomalies = anomalies.filter((a) => {
    if (reviewFilter === 'all') return true;
    return a.anomaly?.reviewStatus === reviewFilter;
  });

  const handleFeedback = async (id: string, status: 'confirmed' | 'expected' | 'dismissed') => {
    setFeedbackLoadingId(id);
    try {
      await api.provideAnomalyFeedback(id, status);
      await onRefreshData();
    } finally {
      setFeedbackLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#2B2B2B]">
                Statistical Anomaly Detection Centre
              </h2>
              <p className="text-xs text-neutral-500">
                Explainable IQR (Interquartile Range) &amp; 24h merchant velocity burst monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              {unreviewedCount} unreviewed
            </span>
          </div>
        </div>

        {/* Audit filter tabs */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => setReviewFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              reviewFilter === 'all'
                ? 'bg-[#0B6121] text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All Outliers ({anomalies.length})
          </button>
          <button
            type="button"
            onClick={() => setReviewFilter('unreviewed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              reviewFilter === 'unreviewed'
                ? 'bg-[#0B6121] text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Unreviewed ({unreviewedCount})
          </button>
          <button
            type="button"
            onClick={() => setReviewFilter('confirmed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              reviewFilter === 'confirmed'
                ? 'bg-[#0B6121] text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Confirmed ({confirmedCount})
          </button>
          <button
            type="button"
            onClick={() => setReviewFilter('expected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              reviewFilter === 'expected'
                ? 'bg-[#0B6121] text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Expected ({expectedCount})
          </button>
        </div>
      </div>

      {/* Anomalies List */}
      {filteredAnomalies.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200/80 shadow-xs space-y-2">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-[#2B2B2B]">No anomalies in this view</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Your spending patterns match statistical expectations across all categories.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAnomalies.map((tx) => {
            const an = tx.anomaly!;
            const isPending = feedbackLoadingId === tx.id;

            return (
              <div
                key={tx.id}
                className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: `${tx.categoryColor || '#10b981'}20` }}
                    >
                      <span>{tx.categoryEmoji}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#2B2B2B]">
                        {tx.description || tx.merchant || tx.categoryName}
                      </h4>
                      <p className="text-xs text-neutral-400">
                        {tx.categoryName} • {tx.accountName} • {tx.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-[#2B2B2B] font-mono">
                      -{currencySymbol}{tx.amount.toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        an.severity === 'critical' || an.severity === 'high'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {an.severity}
                    </span>
                  </div>
                </div>

                {/* Statistical Reason Card */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
                  <strong>Statistical Explanation:</strong> {an.reason}
                  {an.baselineMedian !== undefined && (
                    <span className="block text-[11px] text-amber-800 mt-1">
                      Historical Median: {currencySymbol}{an.baselineMedian.toFixed(2)} • Baseline IQR:{' '}
                      {currencySymbol}{an.baselineIQR?.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Audit Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                  <div className="text-xs text-neutral-500 font-medium">
                    Status:{' '}
                    <span className="font-bold text-[#2B2B2B] uppercase text-[10px]">
                      {an.reviewStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleFeedback(tx.id, 'confirmed')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                        an.reviewStatus === 'confirmed'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmed Anomaly</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleFeedback(tx.id, 'expected')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                        an.reviewStatus === 'expected'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Expected Purchase</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleFeedback(tx.id, 'dismissed')}
                      className="px-2.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
