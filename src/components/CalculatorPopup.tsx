import React, { useState, useEffect, useRef } from 'react';
import { Category, PaymentAccount, Transaction } from '../types.ts';
import { X, Delete, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

interface CalculatorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: PaymentAccount[];
  currencySymbol?: string;
  selectedDate?: string;
  editTransaction?: Transaction | null;
  initialValues?: {
    amount?: number;
    accountId?: string;
    categoryId?: string;
    description?: string;
    merchant?: string;
    date?: string;
  };
  onSave: (txData: {
    id?: string;
    amount: number;
    accountId: string;
    categoryId: string;
    description?: string;
    merchant?: string;
    date: string;
  }) => Promise<void>;
}

export const CalculatorPopup: React.FC<CalculatorPopupProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  currencySymbol = '$',
  selectedDate,
  editTransaction,
  initialValues,
  onSave
}) => {
  // Amount string buffer representation (e.g. "0", "15.50")
  const [amountStr, setAmountStr] = useState<string>('0');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<boolean>(false);

  // Initialize or reset state when opening
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setSuccessToast(false);

    if (editTransaction) {
      // Edit mode
      setAmountStr(editTransaction.amount.toFixed(2));
      setSelectedAccountId(editTransaction.accountId || (accounts[0]?.id || ''));
      setSelectedCategoryId(editTransaction.categoryId || (categories[0]?.id || ''));
      setDescription(editTransaction.description || editTransaction.merchant || '');
      setTxDate(editTransaction.date || new Date().toISOString().split('T')[0]);
    } else if (initialValues) {
      // Scanned receipt or custom prefill
      setAmountStr(initialValues.amount ? initialValues.amount.toFixed(2) : '0');
      const matchedCat = categories.find(c => c.id === initialValues.categoryId) || categories[0];
      setSelectedCategoryId(matchedCat?.id || '');

      const lastAcc = localStorage.getItem('spendwise_last_account');
      const validAcc = accounts.find(a => a.id === initialValues.accountId) ||
                       accounts.find(a => a.id === lastAcc) ||
                       accounts.find(a => a.isDefault) ||
                       accounts[0];
      setSelectedAccountId(validAcc?.id || '');
      setDescription(initialValues.description || initialValues.merchant || '');
      setTxDate(initialValues.date || selectedDate || new Date().toISOString().split('T')[0]);
    } else {
      // Fresh transaction
      setAmountStr('0');
      const lastAcc = localStorage.getItem('spendwise_last_account');
      const defaultAcc = accounts.find(a => a.id === lastAcc) || accounts.find(a => a.isDefault) || accounts[0];
      setSelectedAccountId(defaultAcc?.id || '');
      setSelectedCategoryId(categories[0]?.id || '');
      setDescription('');
      setTxDate(selectedDate || new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, editTransaction, initialValues, selectedDate, accounts, categories]);

  // Keypad actions
  const handleDigit = (digit: string) => {
    setErrorMsg(null);
    setAmountStr((prev) => {
      if (prev === '0' || prev === '') {
        return digit;
      }
      // Check decimal places: allow maximum 2 decimals
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1] && parts[1].length >= 2) {
          return prev; // don't add more than 2 decimals
        }
      }
      // Cap at 9 digits
      if (prev.replace('.', '').length >= 9) return prev;
      return prev + digit;
    });
  };

  const handleDecimal = () => {
    setErrorMsg(null);
    setAmountStr((prev) => {
      if (!prev || prev === '0') return '0.';
      if (prev.includes('.')) return prev;
      return prev + '.';
    });
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setAmountStr((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setErrorMsg(null);
    setAmountStr('0');
  };

  // Physical keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in the description text field
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, amountStr, selectedAccountId, selectedCategoryId, description, txDate]);

  // Decimal-safe parsed numerical amount
  const parsedAmount = Math.round(parseFloat(amountStr || '0') * 100) / 100;

  const handleSave = async () => {
    setErrorMsg(null);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter an amount greater than zero.');
      return;
    }
    if (!selectedAccountId) {
      setErrorMsg('Please select a payment account.');
      return;
    }
    if (!selectedCategoryId) {
      setErrorMsg('Please select a category.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Remember account for faster future entry
      localStorage.setItem('spendwise_last_account', selectedAccountId);

      await onSave({
        id: editTransaction?.id,
        amount: parsedAmount,
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        description: description.trim() || undefined,
        date: txDate
      });

      setSuccessToast(true);
      setTimeout(() => {
        onClose();
      }, 350);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2B2B2B]/70">
              {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </span>
            {txDate && (
              <span className="text-[11px] font-medium text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">
                {txDate}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-[#2B2B2B] hover:bg-neutral-200/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container for the 4 Sections */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 text-[#2B2B2B]">
          {/* SECTION 1: AMOUNT (MOST PROMINENT) */}
          <div className="bg-[#FAF9F8] rounded-2xl p-4 border border-neutral-200/80 shadow-2xs">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                Amount
              </span>
              <div className="flex items-center justify-center gap-1.5 min-h-[52px]">
                <span className="text-2xl sm:text-3xl font-semibold text-neutral-500">
                  {currencySymbol}
                </span>
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#2B2B2B] font-mono">
                  {amountStr}
                </span>
              </div>
            </div>

            {/* Compact 3-Column Calculator Keypad */}
            <div className="mt-3 grid grid-cols-3 gap-2 select-none">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigit(num)}
                  className="h-11 sm:h-12 rounded-xl bg-white text-[#2B2B2B] font-semibold text-lg sm:text-xl shadow-2xs border border-neutral-200 active:scale-95 active:bg-neutral-100 hover:bg-neutral-50 transition-all flex items-center justify-center"
                >
                  {num}
                </button>
              ))}

              {/* Bottom Keypad Row: . , 0 , ⌫ */}
              <button
                type="button"
                onClick={handleDecimal}
                className="h-11 sm:h-12 rounded-xl bg-white text-[#2B2B2B] font-bold text-xl shadow-2xs border border-neutral-200 active:scale-95 active:bg-neutral-100 hover:bg-neutral-50 transition-all flex items-center justify-center"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-11 sm:h-12 rounded-xl bg-white text-[#2B2B2B] font-semibold text-lg sm:text-xl shadow-2xs border border-neutral-200 active:scale-95 active:bg-neutral-100 hover:bg-neutral-50 transition-all flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 sm:h-12 rounded-xl bg-neutral-100 text-neutral-600 font-semibold text-base shadow-2xs border border-neutral-200 active:scale-95 active:bg-neutral-200 hover:bg-neutral-100 transition-all flex items-center justify-center"
                aria-label="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Clear All small button */}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-neutral-400 hover:text-neutral-700 font-medium px-2 py-0.5"
              >
                Clear (C)
              </button>
            </div>
          </div>

          {/* SECTION 2: PAYMENT ACCOUNT (COMPACT DROPDOWN) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
              Payment Account
            </label>
            <div className="relative">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#0B6121] pr-10 shadow-2xs"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.type ? `(${acc.type.toUpperCase()})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* SECTION 3: CATEGORY (COMPACT EMOJI GRID) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Category
              </label>
              {categories.find((c) => c.id === selectedCategoryId) && (
                <span className="text-xs font-bold text-[#0B6121]">
                  {categories.find((c) => c.id === selectedCategoryId)?.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1 bg-neutral-50/70 rounded-xl border border-neutral-200">
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setErrorMsg(null);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all text-center select-none ${
                      isSelected
                        ? 'bg-white ring-2 ring-[#0B6121] shadow-xs'
                        : 'hover:bg-white/70 active:scale-95'
                    }`}
                  >
                    <span className="text-xl leading-none mb-1">{cat.emoji}</span>
                    <span
                      className={`text-[10px] leading-tight font-medium truncate w-full ${
                        isSelected ? 'text-[#0B6121] font-bold' : 'text-neutral-600'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: DESCRIPTION (OPTIONAL SINGLE FIELD) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
              Description <span className="text-neutral-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note (optional)"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#0B6121] shadow-2xs placeholder:text-neutral-400"
            />
          </div>

          {/* Validation Error Feedback */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Flash Feedback */}
          {successToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#0B6121] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Transaction saved successfully!</span>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION: CLEAR FOREST GREEN SAVE BUTTON (#0B6121) */}
        <div className="p-4 bg-white border-t border-neutral-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || parsedAmount <= 0}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-white text-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            style={{ backgroundColor: '#0B6121' }}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{editTransaction ? 'Save Changes' : 'Save Transaction'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
