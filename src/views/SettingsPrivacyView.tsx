import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Trash2,
  Download,
  Database,
  Lock,
  User,
  Sliders,
  Check,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

export const SettingsPrivacyView: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [monthlyBudget, setMonthlyBudget] = useState(String(user?.monthlyBudget || 800));
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>(
    user?.preferences?.sensitivity || 'medium'
  );
  const [minHistoryCount, setMinHistoryCount] = useState(
    user?.preferences?.minHistoryCount || 5
  );
  const [excludedCategories, setExcludedCategories] = useState<string[]>(
    user?.preferences?.excludedCategories || []
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dbHealth, setDbHealth] = useState<any>(null);

  useEffect(() => {
    api.system.getHealth().then((h) => setDbHealth(h));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updateProfile({
        name,
        currency,
        monthlyBudget: parseFloat(monthlyBudget) || 800,
        preferences: {
          ...user?.preferences,
          sensitivity,
          minHistoryCount: Number(minHistoryCount) || 5,
          excludedCategories,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportFullData = async () => {
    try {
      const data = await api.auth.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brokecode-user-data-export-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'Failed to export user archive');
    }
  };

  const handlePermanentAccountDeletion = async () => {
    setDeleting(true);
    try {
      await api.auth.deleteAccount();
      logout();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const allCategories = [
    'Groceries',
    'Dining & Food',
    'Rent & Housing',
    'Utilities',
    'Transportation',
    'Subscriptions & Tech',
    'Entertainment',
    'Healthcare',
    'Education',
    'Shopping',
    'Travel',
    'Miscellaneous',
  ];

  const toggleExcludeCategory = (cat: string) => {
    setExcludedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="space-y-6 pb-12 text-xs">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          Settings, Budgets & Privacy Controls
        </h2>
        <p className="text-slate-500 mt-1">
          Configure financial goals, calibrate statistical sensitivity, and manage your data ownership rights.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile & Budget Form */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Profile & Monthly Budget
                </h3>
              </div>
              {saveSuccess && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                  <Check className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Currency Symbol
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Monthly Spending Budget Limit
              </label>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Used to compute spending velocity and runway alerts on your dashboard.
              </span>
            </div>

            {/* Anomaly Detection Preferences */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Anomaly Detection Tuning
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Sensitivity Threshold
                  </label>
                  <select
                    value={sensitivity}
                    onChange={(e) => setSensitivity(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low (k = 2.5 IQR - Fewer alerts)</option>
                    <option value="medium">Medium (k = 1.75 IQR - Standard)</option>
                    <option value="high">High (k = 1.25 IQR - Strict alerts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Min History Count Before Flagging
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={minHistoryCount}
                    onChange={(e) => setMinHistoryCount(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Exclude Specific Categories from Anomaly Flagging
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {allCategories.map((cat) => {
                    const isExcluded = excludedCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleExcludeCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition ${
                          isExcluded
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                            : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {cat} {isExcluded ? '✕' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shadow-xs disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Database Status & Privacy & Security */}
        <div className="lg:col-span-5 space-y-6">
          {/* Database & MERN Architecture Diagnostics */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Database className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Database & Deployment Status
              </h3>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Database Engine:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  MongoDB Atlas via Mongoose
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Connection Mode:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                  {dbHealth?.database?.connectionType || 'Active'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Tenant Isolation:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Strict (Indexed User ID)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">API Gateway:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Express + TypeScript REST
                </span>
              </div>
            </div>
          </div>

          {/* Privacy & Account Deletion */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Privacy & Data Ownership
              </h3>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              In BrokeCode, you retain 100% ownership of your financial records. You can export an unencrypted JSON snapshot of your data or permanently wipe your account at any time.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleExportFullData}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Complete Account Data (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete Account & Wipe Records</span>
              </button>
            </div>
          </div>

          {/* Explicit Sign Out / Logout */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <LogOut className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Account Session
              </h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Sign out from this device. Your historical transactions, categories, budgets, and accounts remain securely saved in MongoDB.
            </p>
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2B2B2B] hover:bg-black text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4 text-[#0B6121]" />
              <span>Log Out of BrokeCode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handlePermanentAccountDeletion}
        title="Permanently Delete Account"
        message="This will immediately and permanently delete your user account and all transaction records from the database. This action is irreversible."
        confirmLabel="Wipe Account"
        loading={deleting}
      />
    </div>
  );
};
