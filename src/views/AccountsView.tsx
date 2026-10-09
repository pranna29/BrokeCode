import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Wallet,
  Landmark,
  Smartphone,
  Coins,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Edit2,
  X,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IExpense } from '../types';

interface AccountConfig {
  id: string;
  name: string;
  type: string;
  icon: any;
  initialBalance: number;
  color: string;
}

const DEFAULT_ACCOUNTS: AccountConfig[] = [
  { id: 'upi', name: 'UPI & Digital Wallet', type: 'upi', icon: Smartphone, initialBalance: 15000, color: '#0B6121' },
  { id: 'card', name: 'Bank Debit / Card', type: 'card', icon: CreditCard, initialBalance: 40000, color: '#2563eb' },
  { id: 'cash', name: 'Cash in Hand', type: 'cash', icon: Wallet, initialBalance: 5000, color: '#d97706' },
  { id: 'bank_transfer', name: 'Savings Account', type: 'bank_transfer', icon: Landmark, initialBalance: 80000, color: '#7c3aed' },
  { id: 'crypto', name: 'Crypto Wallet', type: 'crypto', icon: Coins, initialBalance: 0, color: '#e11d48' },
];

export const AccountsView: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol = user?.preferences?.currencySymbol || '₹';

  const [transactions, setTransactions] = useState<IExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountConfig[]>(() => {
    const saved = localStorage.getItem('brokecode_accounts_config');
    return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
  });

  // Editing initial balance
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editBalanceInput, setEditBalanceInput] = useState<string>('');

  // New Account modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('card');
  const [newAccBalance, setNewAccBalance] = useState('0');

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const res = await api.expenses.list({ limit: 100 });
        if (res.success) {
          setTransactions(res.data);
        }
      } catch (err) {
        console.error('Failed to load accounts transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const saveAccountsToStorage = (updated: AccountConfig[]) => {
    setAccounts(updated);
    localStorage.setItem('brokecode_accounts_config', JSON.stringify(updated));
  };

  // Calculate balances for each account
  const accountStats = accounts.map((acc) => {
    const accTxs = transactions.filter((t) => t.paymentMethod === acc.type);
    const totalOut = accTxs
      .filter((t) => t.type !== 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalIn = accTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = acc.initialBalance + totalIn - totalOut;

    return {
      ...acc,
      txCount: accTxs.length,
      totalOut,
      totalIn,
      currentBalance,
    };
  });

  const totalNetWorth = accountStats.reduce((sum, a) => sum + a.currentBalance, 0);

  const handleStartEdit = (acc: AccountConfig) => {
    setEditingAccountId(acc.id);
    setEditBalanceInput(String(acc.initialBalance));
  };

  const handleSaveEdit = (accId: string) => {
    const val = parseFloat(editBalanceInput) || 0;
    const updated = accounts.map((a) => (a.id === accId ? { ...a, initialBalance: val } : a));
    saveAccountsToStorage(updated);
    setEditingAccountId(null);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const newAcc: AccountConfig = {
      id: `acc_${Date.now()}`,
      name: newAccName.trim(),
      type: newAccType,
      icon: CreditCard,
      initialBalance: parseFloat(newAccBalance) || 0,
      color: '#0B6121',
    };

    saveAccountsToStorage([...accounts, newAcc]);
    setShowAddModal(false);
    setNewAccName('');
    setNewAccBalance('0');
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0B6121] border-t-transparent mx-auto mb-2" />
        <span className="text-xs font-semibold">Calculating account balances...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      {/* Net Worth Summary Header Card */}
      <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Estimated Total Balance / Net Worth
            </span>
            <div className="text-3xl font-black text-[#2B2B2B] dark:text-white tabular-nums">
              {currencySymbol}{totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-slate-500 mt-1">
              Derived from initial account deposits plus verified income and expenses.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B6121] hover:bg-[#0B6121]/90 text-white font-bold transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accountStats.map((acc) => {
          const IconComponent = acc.icon || CreditCard;
          const isEditing = editingAccountId === acc.id;

          return (
            <div
              key={acc.id}
              className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 hover:border-[#0B6121]/40 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: acc.color }}
                  >
                    <IconComponent className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#2B2B2B] dark:text-white text-xs">
                      {acc.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 capitalize">
                      {acc.type} account
                    </span>
                  </div>
                </div>

                {!isEditing && (
                  <button
                    onClick={() => handleStartEdit(acc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#0B6121] hover:bg-[#E0DDDA]/40 transition"
                    title="Adjust starting balance"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Current balance */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Current Balance</span>
                <div className="text-xl font-black text-[#2B2B2B] dark:text-white tabular-nums">
                  {currencySymbol}{acc.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* In / Out Statistics */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E0DDDA]/60 dark:border-slate-800 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Inflow</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    +{currencySymbol}{acc.totalIn.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Outflow</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    -{currencySymbol}{acc.totalOut.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Edit Starting Balance */}
              {isEditing && (
                <div className="p-3 rounded-xl bg-[#faf9f8] dark:bg-slate-800/80 border border-[#E0DDDA] space-y-2">
                  <label className="text-[10px] text-slate-500 font-bold block">
                    Starting / Base Balance ({currencySymbol})
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="100"
                      value={editBalanceInput}
                      onChange={(e) => setEditBalanceInput(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-[#0B6121] bg-white dark:bg-slate-900"
                    />
                    <button
                      onClick={() => handleSaveEdit(acc.id)}
                      className="p-1.5 rounded-lg bg-[#0B6121] text-white hover:bg-[#0B6121]/90"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingAccountId(null)}
                      className="p-1.5 rounded-lg bg-slate-200 text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-[#E0DDDA] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E0DDDA]">
              <h3 className="text-sm font-bold text-[#2B2B2B] dark:text-white">
                Add New Account
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Salary, PayPal, Pocket Cash"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Account Type
                </label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
                >
                  <option value="upi">UPI / Digital Wallet</option>
                  <option value="card">Bank Debit / Credit Card</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="bank_transfer">Savings Bank Account</option>
                  <option value="crypto">Crypto Wallet</option>
                  <option value="other">Other Account</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Initial Starting Balance ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="100"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E0DDDA]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0B6121] hover:bg-[#0B6121]/90 text-white font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
