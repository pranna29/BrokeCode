import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Flame,
  AlertTriangle,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Edit2,
  Calendar as CalendarIcon,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { ICalendarData, ICalendarDay, IExpense, ICategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { AnomalyFeedbackModal } from '../components/AnomalyFeedbackModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface CalendarViewProps {
  onOpenAddExpenseWithDate: (dateStr: string) => void;
  onEditExpense: (expense: IExpense) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenAddExpenseWithDate,
  onEditExpense,
}) => {
  const { user } = useAuth();
  const currencySymbol = user?.preferences?.currencySymbol || '₹';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<ICalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [allCategoriesMap, setAllCategoriesMap] = useState<Record<string, ICategory>>({});

  // Anomaly modal state
  const [anomalyToReview, setAnomalyToReview] = useState<IExpense | null>(null);

  // Delete modal state
  const [expenseToDelete, setExpenseToDelete] = useState<IExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed (1..12)

  // Fetch full category list for emojis and color syncing
  useEffect(() => {
    api.categories.list().then((res) => {
      if (res.success) {
        const map: Record<string, ICategory> = {};
        res.data.forEach((c) => {
          map[c.name.toLowerCase()] = c;
        });
        setAllCategoriesMap(map);
      }
    }).catch(() => {});
  }, []);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const res = await api.analytics.getCalendarData(year, month);
      if (res.success) {
        setCalendarData(res);

        // Collect all unique categories in this month for filter dropdown
        const cats = new Set<string>();
        Object.values(res.days || {}).forEach((d) => {
          d.transactions?.forEach((t: any) => {
            if (t.category) cats.add(t.category);
          });
        });
        setCategoriesList(Array.from(cats));
      }
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().slice(0, 10));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Calendar matrix calculations
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month, 0).getDate();

  const daysMatrix: Array<{ dayNum: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysMatrix.push({ dayNum: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysMatrix.push({ dayNum: d, dateStr: dStr });
  }

  // Selected Day data
  const selectedDayData: ICalendarDay | undefined = calendarData?.days[selectedDateStr];

  // Filter transactions for selected day
  const filteredDayTransactions = (selectedDayData?.transactions || []).filter((t: any) => {
    if (typeFilter === 'expense' && t.type === 'income') return false;
    if (typeFilter === 'income' && t.type !== 'income') return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  const highThreshold = calendarData?.highSpendingThreshold || 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Month totals
  const totalSpend = calendarData?.totalMonthSpend ?? 0;
  const totalIncome = calendarData?.totalMonthIncome ?? 0;
  const netBalance = calendarData?.netBalance ?? (totalIncome - totalSpend);

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      await api.expenses.delete(expenseToDelete._id);
      setExpenseToDelete(null);
      await loadCalendar();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card: Month Navigation, Summary figures, and Filters */}
      <div className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E0DDDA] dark:border-slate-800">
          {/* Left: Month Navigator & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#faf9f8] dark:bg-slate-800/80 p-1 rounded-xl border border-[#E0DDDA] dark:border-slate-700">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-[#E0DDDA]/50 dark:hover:bg-slate-700 transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-sm sm:text-base text-[#2B2B2B] dark:text-white px-3 whitespace-nowrap">
                {monthNames[month - 1]} {year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-[#E0DDDA]/50 dark:hover:bg-slate-700 transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-[#2B2B2B] dark:text-slate-200 hover:bg-[#E0DDDA]/30 transition"
            >
              Today
            </button>
          </div>

          {/* Center/Right: Monthly Totals */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Income */}
            <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 px-3.5 py-1.5">
              <ArrowDownLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-bold tracking-wider block">
                  Income
                </span>
                <span className="text-xs font-black text-blue-700 dark:text-blue-300 tabular-nums">
                  +{currencySymbol}{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Expenses */}
            <div className="flex items-center gap-2 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 px-3.5 py-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <div>
                <span className="text-[10px] text-rose-700 dark:text-rose-300 uppercase font-bold tracking-wider block">
                  Expenses
                </span>
                <span className="text-xs font-black text-rose-700 dark:text-rose-300 tabular-nums">
                  -{currencySymbol}{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Net Balance */}
            <div className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 border ${
              netBalance >= 0
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50 text-[#0B6121] dark:text-emerald-400'
                : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-400'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
                  Net Balance
                </span>
                <span className="text-xs font-black tabular-nums">
                  {netBalance >= 0 ? '+' : ''}{currencySymbol}{netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          {/* Transaction Type Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#faf9f8] dark:bg-slate-800/60 rounded-xl border border-[#E0DDDA] dark:border-slate-800">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-[#2B2B2B] dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#2B2B2B]'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                typeFilter === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                typeFilter === 'income'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              Income
            </button>
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-[#0B6121]"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Calendar + Selected Day Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Grid (7 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-[#E0DDDA]/60 dark:border-slate-800">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-2">
            {daysMatrix.map((item, index) => {
              if (!item.dayNum || !item.dateStr) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="h-20 sm:h-24 rounded-xl bg-[#faf9f8]/50 dark:bg-slate-800/20 border border-transparent"
                  />
                );
              }

              const dayData = calendarData?.days[item.dateStr];
              const dayExpense = dayData?.expenseTotal ?? dayData?.total ?? 0;
              const dayIncome = dayData?.incomeTotal ?? 0;
              const hasSpend = dayExpense > 0;
              const hasIncome = dayIncome > 0;
              const isHigh = hasSpend && dayExpense >= highThreshold && highThreshold > 0;
              const hasAnomalies = dayData && dayData.anomalies && dayData.anomalies.length > 0;
              const isToday = item.dateStr === todayStr;
              const isSelected = item.dateStr === selectedDateStr;

              return (
                <div
                  key={item.dateStr}
                  onClick={() => setSelectedDateStr(item.dateStr!)}
                  className={`h-20 sm:h-24 p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'ring-2 ring-[#0B6121] border-[#0B6121] bg-[#E0DDDA]/30 dark:bg-[#0B6121]/15 shadow-sm'
                      : isToday
                      ? 'border-[#0B6121]/50 bg-[#faf9f8] dark:bg-slate-800/80'
                      : 'border-[#E0DDDA]/70 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-[#0B6121]/40 hover:bg-[#faf9f8]'
                  }`}
                >
                  {/* Day header: Day number and anomaly indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold flex items-center justify-center rounded-full h-5 w-5 ${
                        isToday
                          ? 'bg-[#0B6121] text-white shadow-xs'
                          : isSelected
                          ? 'text-[#0B6121] dark:text-emerald-400 font-black'
                          : 'text-[#2B2B2B] dark:text-slate-300'
                      }`}
                    >
                      {item.dayNum}
                    </span>

                    <div className="flex items-center gap-1">
                      {isHigh && (
                        <span title="High spending day">
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                        </span>
                      )}
                      {hasAnomalies && (
                        <span title="Spending anomaly flagged">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day totals */}
                  <div className="space-y-0.5">
                    {hasIncome && (typeFilter === 'all' || typeFilter === 'income') && (
                      <div className="text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate tabular-nums">
                        +{currencySymbol}{dayIncome >= 1000 ? `${(dayIncome / 1000).toFixed(1)}k` : dayIncome.toFixed(0)}
                      </div>
                    )}
                    {hasSpend && (typeFilter === 'all' || typeFilter === 'expense') && (
                      <div className="text-[10px] sm:text-[11px] font-bold text-rose-600 dark:text-rose-400 truncate tabular-nums">
                        -{currencySymbol}{dayExpense >= 1000 ? `${(dayExpense / 1000).toFixed(1)}k` : dayExpense.toFixed(0)}
                      </div>
                    )}
                    {!hasSpend && !hasIncome && (
                      <span className="text-[9px] text-slate-300 dark:text-slate-600 block italic">
                        —
                      </span>
                    )}

                    {/* Category dots */}
                    {dayData && dayData.categories && dayData.categories.length > 0 && (
                      <div className="flex items-center gap-1 overflow-hidden pt-0.5">
                        {dayData.categories.slice(0, 3).map((cat, idx) => (
                          <span
                            key={idx}
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                            title={`${cat.name}: ${currencySymbol}${cat.total}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Day Details & Transactions */}
        <div className="lg:col-span-4 rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
          {/* Day Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E0DDDA] dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Selected Date
              </span>
              <h3 className="text-sm font-extrabold text-[#2B2B2B] dark:text-white">
                {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
            </div>

            <button
              onClick={() => onOpenAddExpenseWithDate(selectedDateStr)}
              className="flex items-center gap-1 rounded-xl bg-[#0B6121] hover:bg-[#0B6121]/90 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Selected Day Summary Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-[#faf9f8] dark:bg-slate-800/60 p-2.5 border border-[#E0DDDA] dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">Day Spent</span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                {currencySymbol}{(selectedDayData?.expenseTotal ?? selectedDayData?.total ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="rounded-xl bg-[#faf9f8] dark:bg-slate-800/60 p-2.5 border border-[#E0DDDA] dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">Day Income</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums">
                {currencySymbol}{(selectedDayData?.incomeTotal ?? 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Transactions List for Selected Date */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>Day Activity</span>
              <span>{filteredDayTransactions.length} items</span>
            </div>

            {filteredDayTransactions.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-xl border border-dashed border-[#E0DDDA] dark:border-slate-800 bg-[#faf9f8]/40 dark:bg-slate-900/40">
                <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No transactions recorded for this day
                </p>
                <button
                  onClick={() => onOpenAddExpenseWithDate(selectedDateStr)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#0B6121] dark:text-emerald-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log transaction for this date</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredDayTransactions.map((tx: any) => {
                  const isIncome = tx.type === 'income';
                  const isAnomaly = tx.anomalyStatus?.isAnomaly && !isIncome;

                  return (
                    <div
                      key={tx._id}
                      className="rounded-xl border border-[#E0DDDA]/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 p-3 hover:border-[#0B6121]/40 transition space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncome ? 'bg-blue-100 text-blue-700' : 'bg-[#E0DDDA]/50 text-[#0B6121]'
                            }`}
                          >
                            <span className="text-sm">
                              {allCategoriesMap[tx.category?.toLowerCase()]?.emoji || (isIncome ? '💰' : '🏷️')}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#2B2B2B] dark:text-white truncate">
                              {tx.merchant || tx.category}
                            </h4>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                              <span>{tx.category}</span>
                              <span>·</span>
                              <span className="capitalize">{tx.paymentMethod || 'UPI'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-black tabular-nums ${
                              isIncome ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Description / Note */}
                      {tx.description && (
                        <p className="text-[11px] text-slate-500 italic pl-9">
                          "{tx.description}"
                        </p>
                      )}

                      {/* Anomaly Badge & Action Controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#E0DDDA]/50 dark:border-slate-800 text-[10px]">
                        <div>
                          {isAnomaly && (
                            <button
                              onClick={() => setAnomalyToReview(tx)}
                              className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold hover:underline"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>Anomaly Flagged</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditExpense(tx)}
                            className="p-1 text-slate-400 hover:text-[#0B6121] transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(tx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
            loadCalendar();
          }}
          currencySymbol={currencySymbol}
        />
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <DeleteConfirmModal
          isOpen={true}
          title="Delete Transaction"
          message={`Are you sure you want to delete ${expenseToDelete.merchant || expenseToDelete.category} (${currencySymbol}${expenseToDelete.amount.toFixed(2)})?`}
          onConfirm={handleDeleteExpense}
          onClose={() => setExpenseToDelete(null)}
          loading={isDeleting}
        />
      )}
    </div>
  );
};
