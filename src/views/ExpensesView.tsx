import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  CheckSquare,
  Square,
  Plus,
  Download,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IExpense, IPagination } from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface ExpensesViewProps {
  onOpenAddExpense: () => void;
  onEditExpense: (expense: IExpense) => void;
  onNavigateTab: (tab: any) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onOpenAddExpense,
  onEditExpense,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [pagination, setPagination] = useState<IPagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Multi-select for bulk delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Deletion modals
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk';
    id?: string;
  }>({ isOpen: false, type: 'single' });
  const [deleting, setDeleting] = useState(false);

  const currencySymbol = user?.preferences?.currencySymbol || '$';

  const loadExpenses = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.expenses.list({
        page,
        limit: 15,
        search,
        category,
        anomalyOnly,
        sortBy,
        sortOrder,
      });

      if (res.success) {
        setExpenses(res.data);
        setPagination(res.pagination);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses(1);
  }, [category, anomalyOnly, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadExpenses(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === expenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(expenses.map((e) => e._id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const confirmDeleteSingle = (id: string) => {
    setDeleteModalState({ isOpen: true, type: 'single', id });
  };

  const confirmDeleteBulk = () => {
    if (selectedIds.length === 0) return;
    setDeleteModalState({ isOpen: true, type: 'bulk' });
  };

  const executeDelete = async () => {
    setDeleting(true);
    try {
      if (deleteModalState.type === 'single' && deleteModalState.id) {
        await api.expenses.delete(deleteModalState.id);
      } else if (deleteModalState.type === 'bulk') {
        await api.expenses.bulkDelete(selectedIds);
      }
      setDeleteModalState({ isOpen: false, type: 'single' });
      loadExpenses(pagination.page);
    } catch (err: any) {
      alert(err.message || 'Error deleting transactions');
    } finally {
      setDeleting(false);
    }
  };

  const categoriesList = [
    'all',
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
    'Miscellaneous',
  ];

  return (
    <div className="space-y-4 pb-12 text-xs">
      {/* Top Filter and Actions Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search merchants, categories, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs"
          />
        </form>

        {/* Filter Badges & Sorts */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            {categoriesList.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Anomaly Only Filter */}
          <button
            onClick={() => setAnomalyOnly(!anomalyOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-semibold transition ${
              anomalyOnly
                ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Outliers Only</span>
          </button>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="capitalize">{sortOrder}</span>
          </button>

          {/* Add Expense Action */}
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Bulk Delete Bar (if selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 text-xs text-indigo-400">
          <span>{selectedIds.length} expense(s) selected</span>
          <button
            onClick={confirmDeleteBulk}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      {/* Expense Records Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <button onClick={toggleSelectAll} className="flex items-center">
                    {selectedIds.length > 0 && selectedIds.length === expenses.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Anomaly Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto mb-2" />
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No matching transactions found.{' '}
                    <button
                      onClick={onOpenAddExpense}
                      className="text-indigo-500 underline font-semibold"
                    >
                      Record an expense
                    </button>{' '}
                    or{' '}
                    <button
                      onClick={() => onNavigateTab('import-export')}
                      className="text-indigo-500 underline font-semibold"
                    >
                      import CSV
                    </button>
                    .
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const isSelected = selectedIds.includes(expense._id);
                  const isAnomaly = expense.anomalyStatus?.isAnomaly;
                  return (
                    <tr
                      key={expense._id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectOne(expense._id)}
                          className="flex items-center text-slate-400 hover:text-indigo-500"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-[180px] truncate">
                        {expense.merchant}
                        {expense.description && (
                          <div className="text-[10px] text-slate-400 font-normal truncate">
                            {expense.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-500 whitespace-nowrap">
                        {expense.paymentMethod}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {currencySymbol}{expense.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {isAnomaly ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              expense.anomalyStatus.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-500'
                                : expense.anomalyStatus.severity === 'high'
                                ? 'bg-orange-500/20 text-orange-500'
                                : 'bg-amber-500/20 text-amber-500'
                            }`}
                            title={expense.anomalyStatus.explanation}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>
                              {expense.anomalyStatus.severity.toUpperCase()} ({expense.anomalyStatus.score})
                            </span>
                          </span>
                        ) : (
                          <span className="inline-block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditExpense(expense)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => confirmDeleteSingle(expense._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition"
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

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-slate-500 text-[11px]">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadExpenses(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadExpenses(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, type: 'single' })}
        onConfirm={executeDelete}
        title={deleteModalState.type === 'bulk' ? 'Delete Selected Transactions' : 'Delete Transaction'}
        message={
          deleteModalState.type === 'bulk'
            ? `Are you sure you want to delete ${selectedIds.length} transactions? This cannot be undone.`
            : 'Are you sure you want to permanently delete this expense?'
        }
        loading={deleting}
      />
    </div>
  );
};
