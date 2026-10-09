import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Flame,
  AlertTriangle,
  X,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { ICalendarData, ICalendarDay } from '../types';

interface SpendingCalendarProps {
  currencySymbol?: string;
  onRefreshTrigger?: number;
}

export const SpendingCalendar: React.FC<SpendingCalendarProps> = ({
  currencySymbol = '₹',
  onRefreshTrigger = 0,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<ICalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<ICalendarDay | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const res = await api.analytics.getCalendarData(year, month);
      if (res.success) {
        setCalendarData(res);
      }
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [year, month, onRefreshTrigger]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDay(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Calendar matrix calculations
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month, 0).getDate();

  const daysMatrix: Array<{ dayNum: number | null; dateStr: string | null }> = [];

  // Padding cells before day 1
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysMatrix.push({ dayNum: null, dateStr: null });
  }

  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysMatrix.push({ dayNum: d, dateStr: dStr });
  }

  const highThreshold = calendarData?.highSpendingThreshold || 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs text-xs">
      {/* Month Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Master Colour-Coded Spending Calendar
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Statistical threshold for high-spending days this month: {currencySymbol}{highThreshold.toFixed(2)} (75th percentile)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-2 hidden sm:block">
            <span className="text-[10px] text-slate-400 block">Total Month Spend</span>
            <span className="font-black text-xs text-slate-900 dark:text-white">
              {currencySymbol}{(calendarData?.totalMonthSpend || 0).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-slate-900 dark:text-white min-w-[120px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-4 text-center font-bold text-[11px] text-slate-400">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-2">
        {daysMatrix.map((item, index) => {
          if (!item.dayNum || !item.dateStr) {
            return (
              <div
                key={`empty-${index}`}
                className="h-20 sm:h-24 rounded-xl bg-slate-50/30 dark:bg-slate-800/20 border border-transparent"
              />
            );
          }

          const dayData = calendarData?.days[item.dateStr];
          const hasSpending = dayData && dayData.total > 0;
          const isHighSpending = hasSpending && dayData.total >= highThreshold && highThreshold > 0;
          const hasAnomalies = dayData && dayData.anomalies.length > 0;
          const isSelected = selectedDay?.date === item.dateStr;

          return (
            <div
              key={item.dateStr}
              onClick={() => dayData && setSelectedDay(dayData)}
              className={`h-20 sm:h-24 p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                isSelected
                  ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30'
                  : isHighSpending
                  ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-500'
                  : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold ${
                    isSelected
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.dayNum}
                </span>

                <div className="flex items-center gap-1">
                  {isHighSpending && (
                    <span title="High-spending day">
                      <Flame className="w-3 h-3 text-amber-500" />
                    </span>
                  )}
                  {hasAnomalies && (
                    <span title="Spending anomaly flagged">
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                    </span>
                  )}
                </div>
              </div>

              {/* Day spend info */}
              <div>
                {hasSpending ? (
                  <>
                    <div className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-white truncate">
                      {currencySymbol}{dayData.total.toFixed(0)}
                    </div>

                    {/* Category mini color pills */}
                    <div className="flex items-center gap-1 mt-1 overflow-hidden">
                      {dayData.categories.slice(0, 3).map((cat, idx) => (
                        <span
                          key={idx}
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                          title={`${cat.name}: ${currencySymbol}${cat.total}`}
                        />
                      ))}
                      {dayData.categories.length > 3 && (
                        <span className="text-[9px] text-slate-400 font-bold">
                          +{dayData.categories.length - 3}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-[9px] text-slate-400 block italic">No spend</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Detail Drawer / Popup */}
      {selectedDay && (
        <div className="mt-5 p-4 rounded-xl border border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-200 dark:border-indigo-900/40">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Transactions for {new Date(selectedDay.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="rounded-full bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-black">
                  Total: {currencySymbol}{selectedDay.total.toFixed(2)}
                </span>
              </h4>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category breakdown pills for day */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Categories:</span>
            {selectedDay.categories.map((c) => (
              <span
                key={c.name}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-white"
                style={{ backgroundColor: c.color }}
              >
                <span>{c.name}</span>
                <span className="opacity-90">({currencySymbol}{c.total.toFixed(2)})</span>
              </span>
            ))}
          </div>

          {/* Transactions list */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto pr-1">
            {selectedDay.transactions.map((tx) => (
              <div key={tx._id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {tx.merchant}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {tx.category} • {tx.paymentMethod.toUpperCase()}
                    {tx.anomalyStatus?.isAnomaly && (
                      <span className="ml-2 font-bold text-rose-500">
                        • Flagged Anomaly ({tx.anomalyStatus.score}/100)
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {currencySymbol}{tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
