import React from 'react';
import { IMonthlyTrend, ICategoryBreakdown } from '../types';

interface TrendChartProps {
  data: IMonthlyTrend[];
  currencySymbol?: string;
}

export const SpendingTrendChart: React.FC<TrendChartProps> = ({ data, currencySymbol = '$' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-500">
        No monthly trend data available yet.
      </div>
    );
  }

  const maxSpend = Math.max(...data.map((d) => d.totalSpend), 100);
  const chartHeight = 200;
  const chartWidth = 550;
  const paddingX = 45;
  const paddingY = 30;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * usableWidth;
    const y = chartHeight - paddingY - (d.totalSpend / maxSpend) * usableHeight;
    return { ...d, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-56 select-none font-sans"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = chartHeight - paddingY - pct * usableHeight;
          const val = Math.round(pct * maxSpend);
          return (
            <g key={i}>
              <line
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingX - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-400 dark:fill-slate-500 text-[10px]"
              >
                {currencySymbol}{val}
              </text>
            </g>
          );
        })}

        {/* Gradient Area Fill */}
        <path d={areaPath} fill="url(#trendGradient)" />

        {/* Main Spending Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#6366f1"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r={p.anomalyCount > 0 ? 6 : 4}
              fill={p.anomalyCount > 0 ? '#f43f5e' : '#6366f1'}
              stroke="#ffffff"
              strokeWidth="2"
              className="transition-all hover:r-8"
            />
            {/* Anomaly badge pulse */}
            {p.anomalyCount > 0 && (
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.5"
                opacity="0.6"
              />
            )}
            {/* Tooltip trigger label */}
            <text
              x={p.x}
              y={chartHeight - 10}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium"
            >
              {p.month.split(' ')[0]}
            </text>
            <title>{`${p.month}: ${currencySymbol}${p.totalSpend.toFixed(2)} (${p.anomalyCount} anomalies)`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};

interface CategoryChartProps {
  data: ICategoryBreakdown[];
  currencySymbol?: string;
}

export const CategoryBarChart: React.FC<CategoryChartProps> = ({ data, currencySymbol = '$' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-xs text-slate-500">
        No category breakdown available.
      </div>
    );
  }

  const topCategories = data.slice(0, 6);
  const maxSpend = Math.max(...topCategories.map((c) => c.totalSpend), 1);

  const colors = [
    'bg-indigo-500',
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-violet-500',
    'bg-pink-500',
  ];

  return (
    <div className="space-y-3.5">
      {topCategories.map((cat, idx) => {
        const widthPct = Math.max(6, (cat.totalSpend / maxSpend) * 100);
        return (
          <div key={cat.category} className="space-y-1 text-xs">
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="font-medium truncate max-w-[140px]">{cat.category}</span>
              <div className="flex items-center gap-2">
                {cat.anomalyCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-500 font-semibold">
                    {cat.anomalyCount} alert{cat.anomalyCount > 1 ? 's' : ''}
                  </span>
                )}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {currencySymbol}{cat.totalSpend.toFixed(2)}
                </span>
                <span className="text-slate-400 text-[10px]">({cat.percentage}%)</span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colors[idx % colors.length]}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
