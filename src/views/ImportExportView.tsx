import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
} from 'lucide-react';
import Papa from 'papaparse';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ImportExportView: React.FC = () => {
  const { user } = useAuth();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Export filters
  const [exportCategory, setExportCategory] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const currencySymbol = user?.preferences?.currencySymbol || '$';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setImportSummary(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError('Failed to parse CSV file. Ensure valid headers and comma delimiters.');
          return;
        }

        // Normalize columns (handle variations like "Payee", "Amount ($)", "Timestamp", etc.)
        const normalized = results.data.map((row: any) => {
          const keys = Object.keys(row);
          const getVal = (possibleNames: string[]) => {
            const foundKey = keys.find((k) =>
              possibleNames.some((p) => k.toLowerCase().trim().includes(p.toLowerCase()))
            );
            return foundKey ? row[foundKey] : undefined;
          };

          return {
            amount: getVal(['amount', 'cost', 'total', 'price']),
            merchant: getVal(['merchant', 'payee', 'vendor', 'name', 'store']),
            category: getVal(['category', 'type', 'bucket']) || 'Miscellaneous',
            subcategory: getVal(['subcategory', 'sub_category', 'sub']) || '',
            date: getVal(['date', 'time', 'timestamp', 'created']) || new Date().toISOString(),
            description: getVal(['description', 'note', 'memo']) || '',
            paymentMethod: getVal(['payment', 'method', 'mode']) || 'card',
          };
        });

        setParsedRows(normalized);
      },
      error: (err) => {
        setError(err.message || 'Error reading CSV');
      },
    });
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      const res = await api.expenses.importCSV(parsedRows);
      if (res.success) {
        setImportSummary(res.summary);
        setParsedRows([]);
        setCsvFile(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error executing CSV import');
    } finally {
      setImporting(false);
    }
  };

  const triggerExport = () => {
    const url = api.expenses.exportCSVUrl(exportCategory, exportStartDate, exportEndDate);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `brokecode-expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 text-xs">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
          CSV Data Management & Export
        </h2>
        <p className="text-slate-500 mt-1">
          Import bank or card statements with smart duplicate detection and immediate anomaly scoring, or export your financial records anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CSV Import Card */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Upload className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Import Transactions
            </h3>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {importSummary && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Import Completed Successfully!
              </div>
              <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
                <li>{importSummary.imported} transaction(s) inserted.</li>
                <li>{importSummary.duplicatesSkipped} duplicate record(s) safely skipped.</li>
                <li>{importSummary.invalidSkipped} invalid row(s) ignored.</li>
                <li className="font-semibold text-rose-500">
                  {importSummary.anomaliesDetected} new potential spending anomalies flagged!
                </li>
              </ul>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 text-center transition cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
              <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {csvFile ? csvFile.name : 'Select or drag & drop a .csv bank file'}
              </span>
              <span className="text-[11px] text-slate-400">
                Auto-maps Date, Merchant, Amount, and Category columns.
              </span>
            </div>
          </div>

          {/* Preview Parsed Rows Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">
                  Preview: {parsedRows.length} valid rows recognized
                </span>
                <button
                  onClick={handleExecuteImport}
                  disabled={importing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importing ? 'Processing...' : 'Confirm & Ingest Transactions'}</span>
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Merchant</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    {parsedRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-1.5 px-3 whitespace-nowrap">{r.date?.slice(0, 10)}</td>
                        <td className="py-1.5 px-3 font-medium truncate max-w-[120px]">{r.merchant}</td>
                        <td className="py-1.5 px-3">{r.category}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {currencySymbol}{parseFloat(r.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <p className="text-[10px] text-slate-400 text-center">
                  Showing first 10 of {parsedRows.length} rows.
                </p>
              )}
            </div>
          )}
        </div>

        {/* CSV Export Card */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Download className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Export Filtered CSV
            </h3>
          </div>

          <p className="text-slate-500 text-xs">
            Download your full transaction history including anomaly flags, statistical confidence scores, and user review statuses.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Filter by Category (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Groceries, Dining & Food"
                value={exportCategory}
                onChange={(e) => setExportCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={triggerExport}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 font-semibold transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
