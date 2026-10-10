import React, { useState } from 'react';
import { User, Category, PaymentAccount } from '../types.ts';
import { CategoryManager } from './CategoryManager.tsx';
import {
  User as UserIcon,
  LogOut,
  Sliders,
  DollarSign,
  CreditCard,
  Plus,
  Trash2,
  Download,
  CheckCircle2
} from 'lucide-react';

interface SettingsViewProps {
  user: User;
  categories: Category[];
  accounts: PaymentAccount[];
  onLogout: () => Promise<void>;
  onUpdatePreferences: (prefs: Partial<User['preferences']>) => Promise<void>;
  onCategoryCreated: (cat: { name: string; emoji: string; color: string }) => Promise<void>;
  onCategoryUpdated: (id: string, updates: Partial<Category>) => Promise<void>;
  onCategoryDeleted: (id: string) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  onReorderCategories: (orderedIds: string[]) => Promise<void>;
  onCreateAccount: (acc: { name: string; type?: string; balance?: number }) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  categories,
  accounts,
  onLogout,
  onUpdatePreferences,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
  onResetDefaults,
  onReorderCategories,
  onCreateAccount,
  onDeleteAccount
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'accounts' | 'preferences'>('categories');

  // Account creation form
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccType, setNewAccType] = useState<string>('custom');
  const [newAccBalance, setNewAccBalance] = useState<string>('0');
  const [isAddingAcc, setIsAddingAcc] = useState<boolean>(false);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    await onCreateAccount({
      name: newAccName.trim(),
      type: newAccType,
      balance: parseFloat(newAccBalance) || 0
    });
    setNewAccName('');
    setNewAccBalance('0');
    setIsAddingAcc(false);
  };

  const handleCurrencyChange = async (currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥'
    };
    await onUpdatePreferences({
      currency,
      currencySymbol: symbols[currency] || '$'
    });
  };

  const handleSensitivityChange = async (sensitivity: 'low' | 'medium' | 'high') => {
    await onUpdatePreferences({ sensitivity });
  };

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0B6121]/10 text-[#0B6121] flex items-center justify-center font-bold text-lg shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#2B2B2B]">{user.name}</h2>
            <p className="text-xs text-neutral-500">{user.email}</p>
            <span className="text-[11px] font-semibold text-[#0B6121] bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Active Session (30-day persistent)
            </span>
          </div>
        </div>

        {/* Explicit Logout Option (Item 2 Requirement) */}
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl p-1 bg-white border border-neutral-200 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'categories'
              ? 'bg-[#0B6121] text-white shadow-xs'
              : 'text-neutral-500 hover:text-[#2B2B2B]'
          }`}
        >
          Categories &amp; Emojis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'accounts'
              ? 'bg-[#0B6121] text-white shadow-xs'
              : 'text-neutral-500 hover:text-[#2B2B2B]'
          }`}
        >
          Payment Accounts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'preferences'
              ? 'bg-[#0B6121] text-white shadow-xs'
              : 'text-neutral-500 hover:text-[#2B2B2B]'
          }`}
        >
          Preferences
        </button>
      </div>

      {/* TAB 1: Category Manager */}
      {activeTab === 'categories' && (
        <CategoryManager
          categories={categories}
          onCategoryCreated={onCategoryCreated}
          onCategoryUpdated={onCategoryUpdated}
          onCategoryDeleted={onCategoryDeleted}
          onResetDefaults={onResetDefaults}
          onReorder={onReorderCategories}
        />
      )}

      {/* TAB 2: Accounts Manager */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-bold text-[#2B2B2B]">Payment Accounts</h3>
              <p className="text-xs text-neutral-500">Manage cash, bank accounts, debit and credit cards</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingAcc(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: '#0B6121' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </button>
          </div>

          {isAddingAcc && (
            <form onSubmit={handleAddAccount} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <h4 className="text-xs font-bold text-[#2B2B2B]">Add New Payment Account</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="Account Name (e.g. Apple Card)"
                  required
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-xs"
                />
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-xs"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Account</option>
                  <option value="debit">Debit Card</option>
                  <option value="credit">Credit Card</option>
                  <option value="custom">Custom</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  placeholder="Initial Balance"
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAcc(false)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 text-xs text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0B6121]"
                >
                  Save Account
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200 bg-white shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#2B2B2B]">{acc.name}</h4>
                    <span className="text-[11px] text-neutral-400 uppercase font-semibold">
                      {acc.type} {acc.isDefault ? '• Default' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-[#2B2B2B]">
                    ${(acc.balance || 0).toFixed(2)}
                  </span>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteAccount(acc.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-700"
                      title="Delete Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Preferences */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-6">
          {/* Currency Selection */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-[#2B2B2B]">Display Currency</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { code: 'USD', name: 'US Dollar ($)' },
                { code: 'EUR', name: 'Euro (€)' },
                { code: 'GBP', name: 'Pound (£)' },
                { code: 'INR', name: 'Rupee (₹)' },
                { code: 'CAD', name: 'CAD (C$)' },
                { code: 'AUD', name: 'AUD (A$)' },
                { code: 'JPY', name: 'Yen (¥)' }
              ].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCurrencyChange(c.code)}
                  className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                    user.preferences?.currency === c.code
                      ? 'border-[#0B6121] bg-emerald-50 text-[#0B6121] ring-1 ring-[#0B6121]'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Anomaly Detection Sensitivity */}
          <div className="space-y-2 pt-4 border-t border-neutral-100">
            <h4 className="text-sm font-bold text-[#2B2B2B]">Anomaly Detection Sensitivity</h4>
            <p className="text-xs text-neutral-500">
              Calibrates the multiplier for statistical outliers against category baseline IQRs
            </p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { level: 'low' as const, label: 'Low (2.5x IQR)', desc: 'Flags only extreme surges' },
                { level: 'medium' as const, label: 'Medium (1.75x IQR)', desc: 'Standard statistical baseline' },
                { level: 'high' as const, label: 'High (1.25x IQR)', desc: 'Flags moderate deviations' }
              ].map((s) => (
                <button
                  key={s.level}
                  type="button"
                  onClick={() => handleSensitivityChange(s.level)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    (user.preferences?.sensitivity || 'medium') === s.level
                      ? 'border-[#0B6121] bg-emerald-50 text-[#0B6121] ring-1 ring-[#0B6121]'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <span className="block text-xs font-bold">{s.label}</span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
