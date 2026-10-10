import React, { useState } from 'react';
import { Transaction, Category } from '../types.ts';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Flame } from 'lucide-react';
import { SwipeableTransactionItem } from './SwipeableTransactionItem.tsx';

interface CalendarViewProps {
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
  onAddTransactionForDate: (dateStr: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  transactions,
  categories,
  currencySymbol,
  onAddTransactionForDate,
  onEditTransaction,
  onDeleteTransaction
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Map daily totals and category colors for this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  const dailyData: Record<string, { total: number; categories: { color: string; emoji: string }[] }> = {};

  transactions.forEach((tx) => {
    if (!dailyData[tx.date]) {
      dailyData[tx.date] = { total: 0, categories: [] };
    }
    dailyData[tx.date].total += tx.amount;
    if (!dailyData[tx.date].categories.some((c) => c.color === tx.categoryColor)) {
      dailyData[tx.date].categories.push({ color: tx.categoryColor || '#10b981', emoji: tx.categoryEmoji });
    }
  });

  // Calculate highest spending day in the active month
  let highestSpendingDayStr = '';
  let highestSpendingAmount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTotal = dailyData[dStr]?.total || 0;
    if (dayTotal > highestSpendingAmount && dayTotal > 0) {
      highestSpendingAmount = dayTotal;
      highestSpendingDayStr = dStr;
    }
  }

  // Selected day transactions
  const selectedDayTransactions = transactions.filter((t) => t.date === selectedDateStr);
  const selectedDayTotal = selectedDayTransactions.reduce((acc, t) => acc + t.amount, 0);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Calendar Card Surface */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs">
        {/* Navigation & Month Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#2B2B2B] tracking-tight">
              {monthName}
            </h2>
            <button
              onClick={goToToday}
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl text-neutral-500 hover:text-[#2B2B2B] hover:bg-neutral-100 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl text-neutral-500 hover:text-[#2B2B2B] hover:bg-neutral-100 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {daysOfWeek.map((d) => (
            <div key={d} className="text-xs font-bold text-neutral-400 py-1 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty cells for leading days */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-2xl bg-neutral-50/40 opacity-40" />
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const info = dailyData[dateStr];
            const hasSpend = (info?.total || 0) > 0;
            const isSelected = selectedDateStr === dateStr;
            const isHighest = dateStr === highestSpendingDayStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`relative h-16 sm:h-20 p-1 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isSelected
                    ? 'border-[#0B6121] bg-[#0B6121]/5 shadow-xs ring-2 ring-[#0B6121]/20'
                    : isHighest
                    ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
                    : 'border-neutral-100 bg-neutral-50/50 hover:bg-neutral-100/70 hover:border-neutral-200'
                }`}
              >
                {/* Day Number & Indicator Icons */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-[#0B6121] text-white'
                        : isSelected
                        ? 'text-[#0B6121]'
                        : 'text-[#2B2B2B]'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {isHighest && (
                    <span
                      title="Highest spending day"
                      className="p-0.5 rounded-full bg-amber-100 text-amber-600"
                    >
                      <Flame className="w-3 h-3 fill-amber-500" />
                    </span>
                  )}
                </div>

                {/* Daily Spending Total */}
                <div className="min-w-0">
                  {hasSpend ? (
                    <div className="text-[10px] sm:text-xs font-extrabold text-[#2B2B2B] truncate font-mono">
                      {currencySymbol}{info.total.toFixed(0)}
                    </div>
                  ) : (
                    <span className="text-[10px] text-neutral-300 block">-</span>
                  )}

                  {/* Category Color Dot Indicators */}
                  {hasSpend && (
                    <div className="flex items-center gap-0.5 mt-0.5 overflow-hidden">
                      {info.categories.slice(0, 3).map((c, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                      ))}
                      {info.categories.length > 3 && (
                        <span className="text-[8px] text-neutral-400 font-bold leading-none">
                          +{info.categories.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Transaction Breakdown Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#0B6121]" />
              <h3 className="text-base font-bold text-[#2B2B2B]">
                {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('default', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {selectedDayTransactions.length}{' '}
              {selectedDayTransactions.length === 1 ? 'transaction' : 'transactions'} • Total:{' '}
              <span className="font-bold text-[#0B6121]">
                {currencySymbol}{selectedDayTotal.toFixed(2)}
              </span>
            </p>
          </div>

          {/* "+ Add for this day" button: Opens Calculator popup with this day preselected */}
          <button
            type="button"
            onClick={() => onAddTransactionForDate(selectedDateStr)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95"
            style={{ backgroundColor: '#0B6121' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense for Date</span>
          </button>
        </div>

        {/* Transactions list for this day */}
        {selectedDayTransactions.length === 0 ? (
          <div className="py-10 text-center text-neutral-400">
            <p className="text-xs font-medium">No transactions recorded on this day.</p>
            <button
              onClick={() => onAddTransactionForDate(selectedDateStr)}
              className="text-xs font-semibold text-[#0B6121] hover:underline mt-2 inline-block"
            >
              + Tap to record an expense
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayTransactions.map((tx) => (
              <SwipeableTransactionItem
                key={tx.id}
                transaction={tx}
                currencySymbol={currencySymbol}
                isCustomOrder={false}
                canMoveUp={false}
                canMoveDown={false}
                onEdit={onEditTransaction}
                onDeleteRequest={onDeleteTransaction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
