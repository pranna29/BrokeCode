import React, { useState } from 'react';
import { Transaction, Category, PaymentAccount } from '../types.ts';
import { SwipeableTransactionItem } from './SwipeableTransactionItem.tsx';
import {
  Search,
  Filter,
  Plus,
  Camera,
  AlertTriangle,
  ArrowUpDown,
  X,
  Undo2
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: PaymentAccount[];
  currencySymbol: string;
  onOpenAddModal: () => void;
  onOpenScanModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => Promise<void>;
  onReorderTransactions: (orderedIds: string[]) => Promise<void>;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  accounts,
  currencySymbol,
  onOpenAddModal,
  onOpenScanModal,
  onEditTransaction,
  onDeleteTransaction,
  onReorderTransactions
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [sortOption, setSortOption] = useState<
    'newest' | 'oldest' | 'highest' | 'lowest' | 'custom'
  >('newest');
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState<boolean>(false);

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Undo delete toast state
  const [undoTx, setUndoTx] = useState<Transaction | null>(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Filtering
  let filtered = transactions.filter((tx) => {
    if (selectedCategory !== 'all' && tx.categoryId !== selectedCategory) return false;
    if (selectedAccount !== 'all' && tx.accountId !== selectedAccount) return false;
    if (showAnomaliesOnly && !tx.anomaly?.isAnomaly) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const match =
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.merchant && tx.merchant.toLowerCase().includes(q)) ||
        tx.categoryName.toLowerCase().includes(q) ||
        tx.accountName.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered];
  switch (sortOption) {
    case 'oldest':
      sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      break;
    case 'highest':
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case 'lowest':
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    case 'custom':
      sorted.sort((a, b) => (a.customOrder ?? 0) - (b.customOrder ?? 0));
      break;
    case 'newest':
    default:
      sorted.sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime() ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
  }

  // Handle Delete with Confirmation or Undo Toast
  const handleDeleteRequest = (tx: Transaction) => {
    if (window.confirm(`Delete transaction "${tx.description || tx.categoryName}" of ${currencySymbol}${tx.amount.toFixed(2)}?`)) {
      setUndoTx(tx);
      onDeleteTransaction(tx);

      // Offer 6-second undo window
      if (undoTimeoutId) clearTimeout(undoTimeoutId);
      const timer = setTimeout(() => {
        setUndoTx(null);
      }, 6000);
      setUndoTimeoutId(timer);
    }
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentOrder = [...sorted];
    const fromIndex = currentOrder.findIndex((t) => t.id === draggedId);
    const toIndex = currentOrder.findIndex((t) => t.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [moved] = currentOrder.splice(fromIndex, 1);
      currentOrder.splice(toIndex, 0, moved);

      // Extract new ordered IDs
      const orderedIds = currentOrder.map((t) => t.id);
      await onReorderTransactions(orderedIds);
    }
    setDraggedId(null);
  };

  const handleMoveItem = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const list = [...sorted];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    await onReorderTransactions(list.map((t) => t.id));
  };

  const isCustomMode = sortOption === 'custom';

  return (
    <div className="space-y-4">
      {/* Undo Notification Banner */}
      {undoTx && (
        <div className="p-3.5 rounded-2xl bg-neutral-900 text-white flex items-center justify-between text-xs font-medium shadow-lg animate-in slide-in-from-top-3 duration-200">
          <span>
            Deleted {undoTx.description || undoTx.categoryName} ({currencySymbol}
            {undoTx.amount.toFixed(2)})
          </span>
          <button
            type="button"
            onClick={() => {
              // Dismiss undo banner
              setUndoTx(null);
            }}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      )}

      {/* Control Bar: Search & Actions */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses, merchants, accounts..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm bg-neutral-50/50 focus:outline-none focus:ring-2 focus:ring-[#0B6121] text-[#2B2B2B]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons: Scan Bill & Add Transaction */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenScanModal}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 font-bold text-xs text-[#2B2B2B] shadow-2xs transition-all active:scale-95"
            >
              <Camera className="w-4 h-4 text-[#0B6121]" />
              <span>Scan Bill</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95"
              style={{ backgroundColor: '#0B6121' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Sort Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-neutral-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B6121]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>

            {/* Account Filter */}
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B6121]"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Outliers Only Toggle */}
            <button
              type="button"
              onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-semibold transition-all ${
                showAnomaliesOnly
                  ? 'border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-400'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Outliers Only</span>
            </button>
          </div>

          {/* Sort Selector: Newest First, Oldest First, Highest, Lowest, Custom Order */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-neutral-400 font-medium">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-[#2B2B2B] focus:outline-none focus:ring-1 focus:ring-[#0B6121]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
              <option value="custom">Custom Order (Drag &amp; Drop)</option>
            </select>
          </div>
        </div>

        {/* Custom Order Guidance Note */}
        {isCustomMode && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-[#0B6121] flex items-center justify-between">
            <span>
              ✨ <strong>Custom Order Active:</strong> Drag rows via the grip icon or use the Up/Down buttons to reorder. Your custom sequence is saved automatically.
            </span>
          </div>
        )}
      </div>

      {/* Touch Gesture Prompt on Mobile */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 px-2">
        <span>👉 Swipe right to Edit • Swipe left to Delete</span>
        <span>{sorted.length} {sorted.length === 1 ? 'transaction' : 'transactions'}</span>
      </div>

      {/* Transaction List */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200/80 shadow-xs space-y-2">
          <p className="text-sm font-semibold text-[#2B2B2B]">No transactions found</p>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Try adjusting your search filters or press Add Expense to record a transaction.
          </p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: '#0B6121' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((tx, idx) => (
            <SwipeableTransactionItem
              key={tx.id}
              transaction={tx}
              currencySymbol={currencySymbol}
              isCustomOrder={isCustomMode}
              canMoveUp={idx > 0}
              canMoveDown={idx < sorted.length - 1}
              onEdit={onEditTransaction}
              onDeleteRequest={handleDeleteRequest}
              onMoveUp={() => handleMoveItem(idx, 'up')}
              onMoveDown={() => handleMoveItem(idx, 'down')}
              onDragStart={(e) => handleDragStart(e, tx.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tx.id)}
              isDragging={draggedId === tx.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
