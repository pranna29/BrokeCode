import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  RotateCw,
  ThumbsUp,
  EyeOff,
  Filter,
  BarChart,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IExpense, IEvaluationMetrics } from '../types';
import { AnomalyFeedbackModal } from '../components/AnomalyFeedbackModal';

export const AnomalyCentreView: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [anomalies, setAnomalies] = useState<IExpense[]>([]);
  const [metrics, setMetrics] = useState<IEvaluationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('unreviewed');
  const [page, setPage] = useState(1);

  // Modal feedback
  const [activeFeedbackExpense, setActiveFeedbackExpense] = useState<IExpense | null>(null);

  const currencySymbol = user?.preferences?.currencySymbol || '$';
  const sensitivity = user?.preferences?.sensitivity || 'medium';

  const loadAnomaliesAndMetrics = async () => {
    setLoading(true);
    try {
      const [anomRes, metricsRes] = await Promise.all([
        api.anomalies.list({
          severity: severityFilter,
          reviewStatus: reviewStatusFilter,
          page,
          limit: 12,
        }),
        api.anomalies.getMetrics(),
      ]);

      if (anomRes.success) {
        setAnomalies(anomRes.data);
      }
      if (metricsRes.success) {
        setMetrics(metricsRes);
      }
    } catch (err) {
      console.error('Failed to load anomaly centre data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnomaliesAndMetrics();
  }, [severityFilter, reviewStatusFilter, page]);

  const handleSensitivityChange = async (newSensitivity: 'low' | 'medium' | 'high') => {
    try {
      await updateProfile({
        preferences: {
          ...user?.preferences,
          sensitivity: newSensitivity,
        },
      });
      // Automatically prompt to recalculate
      handleRecalculate();
    } catch (err: any) {
      alert(err.message || 'Error updating sensitivity');
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await api.anomalies.recalculate();
      alert(
        `Baselines recalculated for ${res.summary.totalProcessed} transactions: ${res.summary.newlyFlagged} newly flagged, ${res.summary.clearedCount} cleared.`
      );
      loadAnomaliesAndMetrics();
    } catch (err: any) {
      alert(err.message || 'Error recalculating anomalies');
    } finally {
      setRecalculating(false);
    }
  };

  const handleDirectStatus = async (id: string, status: string) => {
    try {
      await api.anomalies.submitFeedback(id, status);
      loadAnomaliesAndMetrics();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleModalFeedback = async (id: string, status: string, notes?: string) => {
    await api.anomalies.submitFeedback(id, status, notes);
    loadAnomaliesAndMetrics();
  };

  return (
    <div className="space-y-6 pb-12 text-xs">
      {/* Control & Calibration Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Personalized Anomaly Detection Engine
              </h2>
            </div>
            <p className="mt-1 text-slate-500 text-xs max-w-2xl">
              Tuned to your personal spending history. Evaluates robust category-specific Interquartile Ranges (IQR),
              median absolute deviation (MAD), and high-frequency merchant bursts.
            </p>
          </div>

          {/* Sensitivity Calibration Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Sensitivity:
            </span>
            {(['low', 'medium', 'high'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleSensitivityChange(s)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition text-[11px] ${
                  sensitivity === s
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
                title={
                  s === 'low'
                    ? 'k = 2.5 IQR (flags only extreme outliers)'
                    : s === 'medium'
                    ? 'k = 1.75 IQR (balanced statistical detection)'
                    : 'k = 1.25 IQR (stricter, flags moderate spikes)'
                }
              >
                {s}
              </button>
            ))}

            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-1.5 ml-2 px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white font-semibold transition disabled:opacity-50 text-[11px]"
              title="Re-run statistical thresholds across your entire transaction history"
            >
              <RotateCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              <span>{recalculating ? 'Evaluating...' : 'Recalculate'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Measurable Evaluation Metrics Widget */}
      {metrics && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <BarChart className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Algorithm Evaluation & Reliability Metrics
              </h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full">
              Standardized Ground Truth Suite
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] text-slate-500">Precision</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {metrics.benchmarkMetrics.precision}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">True alerts / Total flagged</div>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] text-slate-500">Recall</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {metrics.benchmarkMetrics.recall}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Detected / Actual anomalies</div>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] text-slate-500">F1-Score</div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {metrics.benchmarkMetrics.f1Score}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Harmonic balance</div>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] text-slate-500">False Positive Rate</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {metrics.benchmarkMetrics.falsePositiveRate}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Normal flagged as anomaly</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Synthetic test suite: {metrics.benchmarkMetrics.totalEvaluated} test cases evaluated.
            </span>
            <span>
              User feedback precision:{' '}
              {metrics.userMetrics.hasSufficientUserFeedback
                ? `${metrics.userMetrics.userConfirmedPrecision}% (${metrics.userMetrics.totalUserReviewed} reviewed)`
                : 'Insufficient user feedback data yet (minimum 3 required)'}
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs for Anomalies */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Review Status Tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold overflow-x-auto">
          {[
            { key: 'unreviewed', label: 'Unreviewed' },
            { key: 'confirmed_anomaly', label: 'Confirmed' },
            { key: 'expected_purchase', label: 'Expected' },
            { key: 'dismissed', label: 'Dismissed' },
            { key: 'all', label: 'All Alerts' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setReviewStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                reviewStatusFilter === tab.key
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (85+)</option>
            <option value="high">High (65-84)</option>
            <option value="medium">Medium (45-64)</option>
            <option value="low">Low (&lt;45)</option>
          </select>
        </div>
      </div>

      {/* Anomaly Audit Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto mb-2" />
          Loading audit alerts...
        </div>
      ) : anomalies.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-500">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-emerald-500 opacity-80" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            No spending anomalies in this filter
          </h3>
          <p className="max-w-md mx-auto text-xs text-slate-500">
            Transactions comply with normal category baselines. Try switching to "All Alerts" or
            recalculating with higher sensitivity.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {anomalies.map((expense) => {
            const baseline = expense.anomalyStatus.baseline;
            const reviewStatus = expense.anomalyStatus.reviewStatus;
            return (
              <div
                key={expense._id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Merchant, Date, Amount & Severity badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {expense.merchant}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {expense.category} • {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-base text-rose-500">
                        {currencySymbol}{expense.amount.toFixed(2)}
                      </div>
                      <span
                        className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          expense.anomalyStatus.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-500'
                            : expense.anomalyStatus.severity === 'high'
                            ? 'bg-orange-500/20 text-orange-500'
                            : 'bg-amber-500/20 text-amber-500'
                        }`}
                      >
                        {expense.anomalyStatus.severity} ({expense.anomalyStatus.score}/100)
                      </span>
                    </div>
                  </div>

                  {/* Method & Human-Readable Explanation */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">
                      {expense.anomalyStatus.method}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                      {expense.anomalyStatus.explanation}
                    </p>
                  </div>

                  {/* Statistical Comparison Box */}
                  {baseline && baseline.median !== undefined && (
                    <div className="mt-3 grid grid-cols-3 gap-2 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">Category Median</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {currencySymbol}{baseline.median?.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">IQR Bound (Q1-Q3)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {currencySymbol}{baseline.q1?.toFixed(2)} – {currencySymbol}{baseline.q3?.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Upper Threshold</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {currencySymbol}{baseline.upperBound?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* User Feedback Notes if exists */}
                  {expense.anomalyStatus.userFeedback && (
                    <div className="mt-2 text-[11px] text-slate-500 italic">
                      "{expense.anomalyStatus.userFeedback}"
                    </div>
                  )}
                </div>

                {/* Bottom Action Strip: Review / Status Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[10px]">Status:</span>
                    <span
                      className={`font-semibold capitalize text-[10px] px-2 py-0.5 rounded-md ${
                        reviewStatus === 'confirmed_anomaly'
                          ? 'bg-rose-500/15 text-rose-500'
                          : reviewStatus === 'expected_purchase'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : reviewStatus === 'dismissed'
                          ? 'bg-slate-500/15 text-slate-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {reviewStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDirectStatus(expense._id, 'expected_purchase')}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-500 text-slate-500 transition"
                      title="Mark as Expected Purchase (one-off legitimate buy)"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDirectStatus(expense._id, 'confirmed_anomaly')}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-500 text-slate-500 transition"
                      title="Confirm Outlier"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setActiveFeedbackExpense(expense)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition shadow-xs"
                    >
                      Audit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Anomaly Feedback Audit Modal */}
      <AnomalyFeedbackModal
        isOpen={!!activeFeedbackExpense}
        onClose={() => setActiveFeedbackExpense(null)}
        expense={activeFeedbackExpense}
        onSubmit={handleModalFeedback}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};
