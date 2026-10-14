import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { CategorySpendingItem } from '../../types';
import { CATEGORY_COLORS, formatCurrency } from '../../utils/formatters';

interface CategoryDonutChartProps {
  data: CategorySpendingItem[];
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ data }) => {
  const chartData = data
    .filter((item) => parseFloat(item.total_amount) > 0)
    .map((item) => ({
      name: item.category,
      value: parseFloat(item.total_amount),
      percentage: item.percentage_of_total,
      count: item.transaction_count,
      color: CATEGORY_COLORS[item.category]?.hex || '#64748b',
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm">
        <p>No expense data recorded for this period</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="p-3 bg-slate-900/95 text-white rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-semibold text-sm">{entry.name}</span>
          </div>
          <div className="space-y-0.5 text-slate-300">
            <p>
              Amount:{' '}
              <span className="font-mono font-medium text-white">
                {formatCurrency(entry.value)}
              </span>
            </p>
            <p>
              Share:{' '}
              <span className="font-mono font-medium text-brand-300">
                {entry.percentage}%
              </span>
            </p>
            <p className="text-[11px] text-slate-400">
              {entry.count} {entry.count === 1 ? 'transaction' : 'transactions'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
