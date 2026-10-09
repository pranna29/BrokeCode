import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Edit2,
  Check,
  Smartphone,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IPendingTransaction } from '../types';

export const SmsImportView: React.FC = () => {
  const { user } = useAuth();
  const [smsText, setSmsText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  // Pending inbox
  const [pendingList, setPendingList] = useState<IPendingTransaction[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // Edit pending item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const currencySymbol = user?.preferences?.currencySymbol || '₹';

  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const res = await api.sms.getPending();
      if (res.success) {
        setPendingList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleParse = async () => {
    if (!smsText.trim()) return;
    setParsing(true);
    try {
      const res = await api.sms.parse(smsText);
      if (res.success) {
        setParsedPreview(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Error parsing SMS');
    } finally {
      setParsing(false);
    }
  };

  const handleIngestToInbox = async () => {
    if (parsedPreview.length === 0) return;
    setIngesting(true);
    try {
      const res = await api.sms.ingest(parsedPreview);
      if (res.success) {
        alert(res.message);
        setSmsText('');
        setParsedPreview([]);
        loadPending();
      }
    } catch (err: any) {
      alert(err.message || 'Error ingesting SMS transactions');
    } finally {
      setIngesting(false);
    }
  };

  const handleConfirmPending = async (tx: IPendingTransaction) => {
    try {
      if (editingId === tx._id) {
        await api.sms.confirmPending(tx._id, editData);
        setEditingId(null);
      } else {
        await api.sms.confirmPending(tx._id, {
          amount: tx.amount,
          merchant: tx.merchant,
          category: tx.suggestedCategory,
          date: tx.date,
        });
      }
      loadPending();
    } catch (err: any) {
      alert(err.message || 'Error confirming transaction');
    }
  };

  const handleIgnorePending = async (id: string) => {
    try {
      await api.sms.ignorePending(id);
      loadPending();
    } catch (err: any) {
      alert(err.message || 'Error ignoring transaction');
    }
  };

  const handleBatchConfirm = async () => {
    if (pendingList.length === 0) return;
    try {
      await api.sms.batchConfirm(pendingList.map((p) => p._id));
      loadPending();
    } catch (err: any) {
      alert(err.message || 'Error approving pending transactions');
    }
  };

  return (
    <div className="space-y-6 pb-12 text-xs">
      {/* Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-500" />
          Google Pay & Bank Transaction SMS Importer
        </h2>
        <p className="text-slate-500 mt-1 max-w-2xl">
          Paste bank SMS texts from Google Pay, UPI, SBI, HDFC, ICICI, Axis, or card alerts.
          Extracted transactions land in your Pending Review Inbox for your verification before being saved as expenses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SMS Paste & Parser */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Paste Transaction Messages
            </span>
            <span className="text-[10px] text-slate-400">Supports GPay, UPI, Card, NetBanking</span>
          </div>

          <div>
            <textarea
              rows={6}
              placeholder={`Paste one or multiple SMS messages here, e.g.:

Paid Rs. 450 to Swiggy via Google Pay. UPI Ref: 312345678901 on 09-10-2026.
Rs. 1,200.00 debited from A/C **5678 on 08-10-26 to AMAZON PAY. Ref 456789.`}
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleParse}
              disabled={parsing || !smsText.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-50"
            >
              {parsing ? 'Parsing...' : 'Extract Transactions'}
            </button>
          </div>

          {/* Parsed Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">
                  Detected {parsedPreview.length} Transaction(s)
                </span>
                <button
                  onClick={handleIngestToInbox}
                  disabled={ingesting}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition disabled:opacity-50"
                >
                  {ingesting ? 'Saving...' : 'Send to Review Inbox'}
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {parsedPreview.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{item.merchant}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.suggestedCategory} • {item.paymentMode.toUpperCase()}
                        {item.paymentRef && ` • Ref: ${item.paymentRef}`}
                      </div>
                    </div>
                    <div className="font-black text-slate-900 dark:text-white">
                      {currencySymbol}{item.amount?.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pending Review Inbox */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Pending Review Inbox ({pendingList.length})
            </span>
            {pendingList.length > 0 && (
              <button
                onClick={handleBatchConfirm}
                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px]"
              >
                Approve All
              </button>
            )}
          </div>

          {loadingPending ? (
            <div className="py-12 text-center text-slate-500">Checking pending inbox...</div>
          ) : pendingList.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              Your pending transactions inbox is clear! Paste an SMS to ingest new transactions.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {pendingList.map((item) => (
                <div
                  key={item._id}
                  className={`p-3 rounded-xl border transition ${
                    item.isDuplicateWarning
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  {item.isDuplicateWarning && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-semibold mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Potential duplicate detected. Please verify before adding.</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{item.merchant}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.suggestedCategory} • {new Date(item.date).toLocaleDateString()}
                        {item.paymentRef && ` • Ref: ${item.paymentRef}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 dark:text-white">
                        {currencySymbol}{item.amount.toFixed(2)}
                      </div>
                      <span className="text-[9px] uppercase font-bold text-indigo-500">{item.paymentMode}</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-1.5">
                    <button
                      onClick={() => handleIgnorePending(item._id)}
                      className="px-2.5 py-1 text-slate-400 hover:text-rose-500 font-semibold text-[11px]"
                    >
                      Ignore
                    </button>
                    <button
                      onClick={() => handleConfirmPending(item)}
                      className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[11px]"
                    >
                      <Check className="w-3 h-3" />
                      <span>Add to Expenses</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
