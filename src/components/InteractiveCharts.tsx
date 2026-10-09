import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { ICategoryBreakdown, IMonthlyTrend } from '../types';

interface DonutChartProps {
  data: ICategoryBreakdown[];
  currencySymbol?: string;
}

const COLORS = [
  '#f97316', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6',
  '#eab308', '#3b82f6', '#ef4444', '#a855f7', '#14b8a6', '#6366f1',
];

export const CategoryDonutChart: React.FC<DonutChartProps> = ({ data, currencySymbol = '₹' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-slate-500">
        No category expenditure data to display.
      </div>
    );
  }

  const chartData = data.slice(0, 8).map((c) => ({
    name: c.category,
    value: c.totalSpend,
  }));

  return (
    <div className="w-full h-56 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => [`${currencySymbol}${Number(value).toFixed(2)}`, 'Spent']}
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '0.75rem',
              fontSize: '11px',
              color: '#fff',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

interface TrendChartProps {
  data: IMonthlyTrend[];
  currencySymbol?: string;
}

export const SpendingLineTrendChart: React.FC<TrendChartProps> = ({ data, currencySymbol = '₹' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-slate-500">
        No trend records available.
      </div>
    );
  }

  return (
    <div className="w-full h-56 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
          <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${currencySymbol}${v}`} />
          <Tooltip
            formatter={(val: any, name: any) => [
              `${currencySymbol}${Number(val).toFixed(2)}`,
              name === 'totalSpend' ? 'Total Spent' : 'Normal',
            ]}
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '0.75rem',
              fontSize: '11px',
              color: '#fff',
            }}
          />
          <Line
            type="monotone"
            dataKey="totalSpend"
            stroke="#6366f1"
            strokeWidth={3}
            dot={{ r: 4, fill: '#6366f1' }}
            activeDot={{ r: 7 }}
          />
          <Line
            type="monotone"
            dataKey="anomalySpend"
            stroke="#f43f5e"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4, fill: '#f43f5e' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface BudgetComparisonBarProps {
  budget: number;
  spent: number;
  currencySymbol?: string;
}

export const BudgetVsActualBarChart: React.FC<BudgetComparisonBarProps> = ({
  budget,
  spent,
  currencySymbol = '₹',
}) => {
  const data = [
    { name: 'Monthly Budget', amount: budget, fill: '#3b82f6' },
    { name: 'Current Spent', amount: spent, fill: spent > budget ? '#ef4444' : '#10b981' },
  ];

  return (
    <div className="w-full h-44 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${currencySymbol}${v}`} />
          <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={90} />
          <Tooltip
            formatter={(v: any) => [`${currencySymbol}${Number(v).toFixed(2)}`, 'Amount']}
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '0.75rem',
              fontSize: '11px',
              color: '#fff',
            }}
          />
          <Bar dataKey="amount" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
