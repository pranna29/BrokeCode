import React, { useState, useEffect } from 'react';
import { X, Delete, Check, AlertCircle, ChevronDown, Plus } from 'lucide-react';
import { IExpense, ICategory } from '../types';
import { api } from '../services/api';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<IExpense>) => Promise<void>;
  expenseToEdit?: IExpense | null;
  currencySymbol?: string;
  initialDate?: string;
}

export const ExpenseModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  expenseToEdit,
  currencySymbol = '₹',
  initialDate,
}) => {
  // 1. Amount input state
  const [amountStr, setAmountStr] = useState<string>('0');
  
  // 2. Payment account
  const [paymentAccount, setPaymentAccount] = useState<string>('upi');
  const [accountList, setAccountList] = useState<Array<{ id: string; name: string; type: string }>>([
    { id: 'upi', name: 'UPI & Digital Wallet', type: 'upi' },
    { id: 'bank_transfer', name: 'Bank Account / Savings', type: 'bank_transfer' },
    { id: 'card', name: 'Debit / Credit Card', type: 'card' },
    { id: 'cash', name: 'Cash', type: 'cash' },
    { id: 'crypto', name: 'Crypto Wallet', type: 'crypto' },
  ]);

  // 3. Category & type
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Food & Dining');

  // 4. Description (optional)
  const [description, setDescription] = useState<string>('');

  // Auxiliary date & status
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Load custom accounts from localStorage or DB
  useEffect(() => {
    try {
      const savedAccounts = localStorage.getItem('brokecode_accounts_config');
      if (savedAccounts) {
        const parsed = JSON.parse(savedAccounts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccountList(parsed.map((a: any) => ({ id: a.id || a.type, name: a.name, type: a.type || a.id })));
        }
      }
    } catch {
      // Ignore fallback
    }

    // Remember last selected account for faster future entry
    const lastAccount = localStorage.getItem('brokecode_last_payment_account');
    if (lastAccount) {
      setPaymentAccount(lastAccount);
    }
  }, [isOpen]);

  // Load user categories from MongoDB API
  useEffect(() => {
    if (!isOpen) return;

    api.categories.list().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setCategories(res.data);
        if (!expenseToEdit) {
          setSelectedCategory(res.data[0].name);
        }
      }
    }).catch(() => {
      // Fallback categories if network delay
    });
  }, [isOpen, expenseToEdit]);

  // Sync state on open / edit
  useEffect(() => {
    if (expenseToEdit) {
      setTxType(expenseToEdit.type || 'expense');
      setAmountStr(String(expenseToEdit.amount || '0'));
      setPaymentAccount(expenseToEdit.paymentMethod || 'upi');
      setSelectedCategory(expenseToEdit.category || 'Food & Dining');
      setDescription(expenseToEdit.description || expenseToEdit.merchant || '');
      setTxDate(new Date(expenseToEdit.date).toISOString().slice(0, 10));
    } else {
      setTxType('expense');
      setAmountStr('0');
      const lastAccount = localStorage.getItem('brokecode_last_payment_account') || 'upi';
      setPaymentAccount(lastAccount);
      setDescription('');
      setTxDate(initialDate || new Date().toISOString().slice(0, 10));
      if (categories.length > 0) {
        setSelectedCategory(categories[0].name);
      }
    }
    setError(null);
    setSaveSuccess(false);
  }, [expenseToEdit, isOpen, initialDate]);

  if (!isOpen) return null;

  // Keypad Handlers
  const handleKeypadPress = (val: string) => {
    setError(null);
    if (val === 'C') {
      setAmountStr('0');
      return;
    }
    if (val === '⌫') {
      if (amountStr.length <= 1) {
        setAmountStr('0');
      } else {
        setAmountStr(amountStr.slice(0, -1));
      }
      return;
    }
    if (val === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(amountStr + '.');
      }
      return;
    }

    // Number entered
    if (amountStr === '0') {
      setAmountStr(val);
    } else {
      // Limit to max 2 decimal places
      const parts = amountStr.split('.');
      if (parts.length === 2 && parts[1].length >= 2) {
        return; // Already 2 decimal places
      }
      if (amountStr.length < 10) {
        setAmountStr(amountStr + val);
      }
    }
  };

  // Keyboard support
  const handlePhysicalKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return; // typing inside description or other input
    }
    if (e.key >= '0' && e.key <= '9') {
      handleKeypadPress(e.key);
    } else if (e.key === '.') {
      handleKeypadPress('.');
    } else if (e.key === 'Backspace') {
      handleKeypadPress('⌫');
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSaveTransaction = async () => {
    setError(null);
    const parsedAmount = parseFloat(amountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    // Decimal-safe rounded monetary value
    const safeAmount = Math.round(parsedAmount * 100) / 100;

    // Persist last chosen payment account
    localStorage.setItem('brokecode_last_payment_account', paymentAccount);

    setLoading(true);
    try {
      await onSave({
        type: txType,
        amount: safeAmount,
        category: selectedCategory.trim(),
        merchant: description.trim() || selectedCategory.trim(),
        description: description.trim(),
        paymentMethod: paymentAccount as any,
        date: new Date(txDate).toISOString(),
        isRecurring: false,
        tags: [],
      });

      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 350);
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handlePhysicalKeyDown}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 outline-hidden overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="w-full sm:max-w-md bg-[#faf9f8] dark:bg-slate-900 border border-[#E0DDDA] dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E0DDDA]/70 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#2B2B2B] dark:text-white">
              {expenseToEdit ? 'Edit Transaction' : 'Add Transaction'}
            </span>
            <div className="flex p-0.5 bg-[#E0DDDA]/50 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setTxType('expense')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${
                  txType === 'expense'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setTxType('income')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${
                  txType === 'income'
                    ? 'bg-[#0B6121] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:text-[#2B2B2B] dark:hover:text-white hover:bg-[#E0DDDA]/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error / Success Banners */}
        {error && (
          <div className="mt-3 flex items-center gap-2 p-2.5 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        {saveSuccess && (
          <div className="mt-3 flex items-center gap-2 p-2.5 text-xs rounded-xl bg-[#0B6121]/10 border border-[#0B6121]/30 text-[#0B6121] font-bold animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>Transaction saved successfully!</span>
          </div>
        )}

        {/* SECTION 1: PROMINENT FORMATTED AMOUNT DISPLAY */}
        <div className="mt-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-[#E0DDDA] dark:border-slate-700/80 p-4 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {txType === 'expense' ? 'Expense Amount' : 'Income Amount'}
          </span>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-2xl font-black text-slate-400 tabular-nums">
              {currencySymbol}
            </span>
            <span
              className={`text-4xl sm:text-5xl font-black tracking-tight tabular-nums truncate max-w-[280px] ${
                txType === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-[#0B6121] dark:text-emerald-400'
              }`}
            >
              {amountStr}
            </span>
          </div>
        </div>

        {/* NUMERIC CALCULATOR KEYPAD */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
          {['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '.', '0'].map((key) => {
            if (key === '0') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="col-span-2 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 font-black text-base text-[#2B2B2B] dark:text-white border border-[#E0DDDA] dark:border-slate-700 shadow-xs transition"
                >
                  0
                </button>
              );
            }
            const isSpecial = key === 'C' || key === '⌫';
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypadPress(key)}
                className={`py-2.5 sm:py-3 rounded-xl active:scale-95 font-black text-base border transition shadow-xs flex items-center justify-center ${
                  isSpecial
                    ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/40 hover:bg-amber-500/20'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#2B2B2B] dark:text-white border-[#E0DDDA] dark:border-slate-700'
                }`}
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* SECTION 2: PAYMENT ACCOUNT DROPDOWN */}
        <div className="mt-4">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Payment Account
          </label>
          <div className="relative">
            <select
              value={paymentAccount}
              onChange={(e) => setPaymentAccount(e.target.value)}
              className="w-full appearance-none rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-[#2B2B2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B6121] transition shadow-xs"
            >
              {accountList.map((acc) => (
                <option key={acc.id} value={acc.type || acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* SECTION 3: CATEGORY WITH CUSTOMIZABLE EMOJIS */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Category
            </label>
            <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px]">
              Selected: <strong className="text-[#2B2B2B] dark:text-slate-200">{selectedCategory}</strong>
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white/70 dark:bg-slate-800/50 border border-[#E0DDDA] dark:border-slate-700/80 rounded-2xl">
            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition text-center group border ${
                    isSelected
                      ? 'border-[#0B6121] bg-[#0B6121]/10 dark:bg-[#0B6121]/20 shadow-xs'
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                  title={cat.name}
                >
                  <span className="text-xl sm:text-2xl leading-none filter drop-shadow-xs transition-transform group-hover:scale-110">
                    {cat.emoji || '🏷️'}
                  </span>
                  <span
                    className={`mt-1 text-[10px] font-bold leading-tight truncate w-full ${
                      isSelected ? 'text-[#0B6121] dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: DESCRIPTION (OPTIONAL) & DATE */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Add a note (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-[#2B2B2B] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0B6121] transition shadow-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="w-full rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-xs text-[#2B2B2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B6121] transition shadow-xs"
            />
          </div>
        </div>

        {/* SAVE BUTTON - CLEAR FOREST GREEN (#0B6121) */}
        <div className="mt-5 pt-3 border-t border-[#E0DDDA]/70 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={handleSaveTransaction}
            className="w-full py-3.5 px-4 rounded-xl bg-[#0B6121] hover:bg-[#094e1a] active:bg-[#073c14] disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-[#0B6121]/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving Transaction...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Transaction</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
