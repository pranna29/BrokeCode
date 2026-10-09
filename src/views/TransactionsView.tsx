import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Trash2,
  Edit2,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  CheckSquare,
  Square,
  Plus,
  Download,
  Filter,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  GripVertical,
  Camera,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IExpense, IPagination, ICategory } from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { AnomalyFeedbackModal } from '../components/AnomalyFeedbackModal';

interface TransactionsViewProps {
  onOpenAddExpense: () => void;
  onOpenScanReceipt?: () => void;
  onEditExpense: (expense: IExpense) => void;
  onNavigateTab?: (tab: any) => void;
}

type SortPreset = 'newest' | 'oldest' | 'highest' | 'lowest' | 'custom';

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onOpenAddExpense,
  onOpenScanReceipt,
  onEditExpense,
}) => {
  const { user } = useAuth();
  const currencySymbol = user?.preferences?.currencySymbol || '₹';

  const [transactions, setTransactions] = useState<IExpense[]>([]);
  const [categoriesList, setCategoriesList] = useState<ICategory[]>([]);
  const [pagination, setPagination] = useState<IPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [category, setCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [sortPreset, setSortPreset] = useState<SortPreset>('newest');

  // Multi-select for bulk delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Deletion modals
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk';
    id?: string;
  }>({ isOpen: false, type: 'single' });
  const [deleting, setDeleting] = useState(false);

  // Anomaly modal
  const [anomalyToReview, setAnomalyToReview] = useState<IExpense | null>(null);

  // Drag-and-drop state
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  // Swipe Action State (rowId -> active swipe direction / offset)
  const [swipeActiveId, setSwipeActiveId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    api.categories
      .list()
      .then((res) => {
        if (res.success) {
          setCategoriesList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const getSortParams = () => {
    switch (sortPreset) {
      case 'oldest':
        return { sortBy: 'date', sortOrder: 'asc' };
      case 'highest':
        return { sortBy: 'amount', sortOrder: 'desc' };
      case 'lowest':
        return { sortBy: 'amount', sortOrder: 'asc' };
      case 'custom':
        return { sortBy: 'customOrder', sortOrder: 'asc' };
      case 'newest':
      default:
        return { sortBy: 'date', sortOrder: 'desc' };
    }
  };

  const loadTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const { sortBy, sortOrder } = getSortParams();
      const res = await api.expenses.list({
        page,
        limit: 25,
        search,
        category: category !== 'all' ? category : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
        anomalyOnly: anomalyOnly ? true : undefined,
        sortBy,
        sortOrder,
      });

      if (res.success) {
        setTransactions(res.data);
        setPagination(res.pagination);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(1);
  }, [category, typeFilter, paymentMethod, anomalyOnly, sortPreset]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTransactions(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((e) => e._id));
    }
  };

  const toggleSelectId = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteModalState.type === 'single' && deleteModalState.id) {
        await api.expenses.delete(deleteModalState.id);
      } else if (deleteModalState.type === 'bulk' && selectedIds.length > 0) {
        await api.expenses.bulkDelete(selectedIds);
      }
      setDeleteModalState({ isOpen: false, type: 'single' });
      await loadTransactions(pagination.page);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    window.open(api.expenses.exportCSVUrl(category !== 'all' ? category : undefined), '_blank');
  };

  // Reordering Logic
  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= transactions.length || toIndex >= transactions.length) {
      return;
    }
    const updated = [...transactions];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setTransactions(updated);

    try {
      await api.expenses.reorder(updated.map((t) => t._id));
    } catch (err) {
      console.error('Failed to persist custom transaction order:', err);
      loadTransactions(pagination.page);
    }
  };

  // Touch Gesture handlers (Swipe right = Edit, Swipe left = Delete)
  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    if (swipeActiveId !== id) {
      setSwipeActiveId(id);
      setSwipeOffset(0);
    }
  };

  const handleTouchMove = (id: string, e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;

    // Only handle horizontal swipes, do not interfere with vertical scrolling
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      // Clamp swipe distance to -100px (left delete) to +100px (right edit)
      const clamped = Math.max(-100, Math.min(100, deltaX));
      setSwipeOffset(clamped);
    }
  };

  const handleTouchEnd = (id: string, tx: IExpense) => {
    if (!touchStartRef.current) return;
    touchStartRef.current = null;

    if (swipeOffset > 60) {
      // Swiped right -> Trigger Edit
      onEditExpense(tx);
      setSwipeActiveId(null);
      setSwipeOffset(0);
    } else if (swipeOffset < -60) {
      // Swiped left -> Trigger Delete confirmation
      setDeleteModalState({ isOpen: true, type: 'single', id: tx._id });
      setSwipeActiveId(null);
      setSwipeOffset(0);
    } else {
      // Snap back
      setSwipeOffset(0);
      setSwipeActiveId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-[#2B2B2B] dark:text-white">
              Transactions Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, filter, rearrange, and audit all historical expenses and income transactions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-[#faf9f8] dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-[#E0DDDA]/50 transition cursor-pointer"
              title="Export filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {onOpenScanReceipt && (
              <button
                onClick={onOpenScanReceipt}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#0B6121]/40 bg-[#0B6121]/10 hover:bg-[#0B6121]/20 text-[#0B6121] dark:text-emerald-400 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Bill</span>
              </button>
            )}

            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0B6121] hover:bg-[#0B6121]/90 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 pt-4 border-t border-[#E0DDDA] dark:border-slate-800 text-xs">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-3 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search merchant, note, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-[#faf9f8] dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0B6121]"
            />
          </form>

          {/* Type Filter */}
          <div className="md:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0B6121] cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0B6121] cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.emoji || '🏷️'} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div className="md:col-span-2">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0B6121] cursor-pointer"
            >
              <option value="all">All Accounts</option>
              <option value="cash">Cash</option>
              <option value="card">Debit / Card</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>

          {/* Sort Order Selector (Requirements: Newest, Oldest, Highest, Lowest, Custom Order) */}
          <div className="md:col-span-2">
            <select
              value={sortPreset}
              onChange={(e) => setSortPreset(e.target.value as SortPreset)}
              className="w-full py-2 px-3 rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0B6121] dark:text-emerald-400 font-bold focus:outline-hidden focus:ring-1 focus:ring-[#0B6121] cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
              <option value="custom">Custom Order (Drag & Drop)</option>
            </select>
          </div>

          {/* Anomaly Checkbox */}
          <div className="md:col-span-1 flex items-center justify-end">
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={anomalyOnly}
                onChange={(e) => setAnomalyOnly(e.target.checked)}
                className="rounded border-[#E0DDDA] text-rose-600 focus:ring-rose-500 h-4 w-4"
              />
              <span className="text-[11px] whitespace-nowrap">Flagged</span>
            </label>
          </div>
        </div>

        {sortPreset === 'custom' && (
          <div className="mt-3 p-2 rounded-xl bg-[#0B6121]/10 border border-[#0B6121]/20 text-[11px] text-[#0B6121] dark:text-emerald-300 font-semibold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <GripVertical className="w-4 h-4" />
              <span>Custom Order is active: Drag rows or use the Move buttons to rearrange transactions.</span>
            </div>
            <span className="text-[10px] text-slate-500">Order automatically saved to MongoDB</span>
          </div>
        )}
      </div>

      {/* Bulk Action Bar (when selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#2B2B2B] text-white text-xs">
          <span className="font-bold">
            {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-slate-300 hover:text-white transition cursor-pointer"
            >
              Deselect
            </button>
            <button
              onClick={() => setDeleteModalState({ isOpen: true, type: 'bulk' })}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table & Mobile Gesture List */}
      <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf9f8] dark:bg-slate-800/60 border-b border-[#E0DDDA] dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                {sortPreset === 'custom' && <th className="py-3 px-2 w-8 text-center">Order</th>}
                <th className="py-3 px-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedIds.length === transactions.length && transactions.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#0B6121]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4">Merchant / Title</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0DDDA]/60 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={sortPreset === 'custom' ? 9 : 8} className="py-12 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={sortPreset === 'custom' ? 9 : 8} className="py-12 text-center text-slate-400">
                    No transactions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx, index) => {
                  const isSelected = selectedIds.includes(tx._id);
                  const isIncome = tx.type === 'income';
                  const isAnomaly = tx.anomalyStatus?.isAnomaly && !isIncome;
                  const isSwipingThis = swipeActiveId === tx._id;
                  const currentSwipe = isSwipingThis ? swipeOffset : 0;

                  return (
                    <tr
                      key={tx._id}
                      draggable={sortPreset === 'custom'}
                      onDragStart={() => setDraggedRowIndex(index)}
                      onDragOver={(e) => {
                        if (sortPreset === 'custom') {
                          e.preventDefault();
                        }
                      }}
                      onDrop={(e) => {
                        if (sortPreset === 'custom' && draggedRowIndex !== null) {
                          e.preventDefault();
                          handleReorder(draggedRowIndex, index);
                          setDraggedRowIndex(null);
                        }
                      }}
                      onTouchStart={(e) => handleTouchStart(tx._id, e)}
                      onTouchMove={(e) => handleTouchMove(tx._id, e)}
                      onTouchEnd={() => handleTouchEnd(tx._id, tx)}
                      style={{
                        transform: currentSwipe !== 0 ? `translateX(${currentSwipe}px)` : undefined,
                        transition: isSwipingThis ? 'none' : 'transform 0.2s ease',
                      }}
                      className={`relative hover:bg-[#faf9f8] dark:hover:bg-slate-800/40 transition select-none ${
                        isSelected ? 'bg-[#E0DDDA]/30 dark:bg-slate-800/60' : ''
                      } ${draggedRowIndex === index ? 'opacity-40 bg-slate-100' : ''}`}
                    >
                      {/* Drag Handle & Accessible Move Buttons when Custom Order is Active */}
                      {sortPreset === 'custom' && (
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-0.5">
                            <span
                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1"
                              title="Drag to rearrange"
                            >
                              <GripVertical className="w-4 h-4" />
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleReorder(index, index - 1)}
                                className="p-0.5 text-slate-300 hover:text-[#0B6121] disabled:opacity-20 cursor-pointer"
                                title="Move up"
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === transactions.length - 1}
                                onClick={() => handleReorder(index, index + 1)}
                                className="p-0.5 text-slate-300 hover:text-[#0B6121] disabled:opacity-20 cursor-pointer"
                                title="Move down"
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectId(tx._id)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#0B6121]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Merchant & Description */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#2B2B2B] dark:text-white truncate max-w-[200px]">
                          {tx.merchant}
                        </div>
                        {tx.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {tx.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        {(() => {
                          const catObj = categoriesList.find(
                            (c) => c.name.toLowerCase() === tx.category.toLowerCase()
                          );
                          return (
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="text-base leading-none">
                                {catObj?.emoji || '🏷️'}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {tx.category}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Payment Account */}
                      <td className="py-3 px-3">
                        <span className="capitalize text-slate-500 font-medium">
                          {tx.paymentMethod || 'UPI'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-black tabular-nums whitespace-nowrap">
                        <span
                          className={
                            isIncome
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {isIncome ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isAnomaly ? (
                          <button
                            onClick={() => setAnomalyToReview(tx)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                            title="Click to view explainable anomaly details"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Flagged</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Normal</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditExpense(tx)}
                            className="p-1 text-slate-400 hover:text-[#0B6121] transition cursor-pointer"
                            title="Edit Transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteModalState({ isOpen: true, type: 'single', id: tx._id })
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Swipe Guidance Note */}
        <div className="py-2 px-4 bg-slate-50 dark:bg-slate-800/40 border-t border-[#E0DDDA]/60 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between md:hidden">
          <span>💡 Swipe Right to Edit • Swipe Left to Delete</span>
          {sortPreset === 'custom' && <span>Hold & drag handles to reorder</span>}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[#E0DDDA] dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadTransactions(pagination.page - 1)}
                className="px-3 py-1 rounded-lg border border-[#E0DDDA] dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="font-bold text-[#2B2B2B] dark:text-white px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadTransactions(pagination.page + 1)}
                className="px-3 py-1 rounded-lg border border-[#E0DDDA] dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Anomaly Review Modal */}
      {anomalyToReview && (
        <AnomalyFeedbackModal
          expense={anomalyToReview}
          isOpen={true}
          onClose={() => setAnomalyToReview(null)}
          onSubmit={async (id, status, feedback) => {
            await api.anomalies.submitFeedback(id, status, feedback);
            setAnomalyToReview(null);
            loadTransactions(pagination.page);
          }}
          currencySymbol={currencySymbol}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.type === 'bulk' ? 'Bulk Delete Transactions' : 'Delete Transaction'}
        message={
          deleteModalState.type === 'bulk'
            ? `Are you sure you want to permanently delete ${selectedIds.length} selected transactions?`
            : 'Are you sure you want to permanently delete this transaction? All associated budgets, calendars, and analytics will be updated.'
        }
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalState({ isOpen: false, type: 'single' })}
        loading={deleting}
      />
    </div>
  );
};
