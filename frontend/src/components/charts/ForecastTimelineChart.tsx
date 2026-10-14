import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { DailyForecastPoint } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface ForecastTimelineChartProps {
  data: DailyForecastPoint[];
}

export const ForecastTimelineChart: React.FC<ForecastTimelineChartProps> = ({ data }) => {
  const chartData = data.map((point) => {
    // Show short date like "Oct 14"
    const shortDate = point.date.split('-').slice(1).join('/');
    return {
      date: point.date,
      displayDate: shortDate,
      discretionary: parseFloat(point.projected_discretionary),
      renewals: parseFloat(point.scheduled_renewals),
      dailyTotal: parseFloat(point.daily_total),
      cumulative: parseFloat(point.cumulative_total),
      renewalEvents: point.renewals,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="p-3.5 bg-slate-900/95 text-white rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md max-w-xs">
          <p className="font-semibold text-sm border-b border-slate-800 pb-1.5 mb-2">
            {formatDate(p.date)}
          </p>
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between gap-4">
              <span>Cumulative Outflow:</span>
              <span className="font-mono font-bold text-brand-400">
                {formatCurrency(p.cumulative)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Daily Total:</span>
              <span className="font-mono font-medium text-white">
                {formatCurrency(p.dailyTotal)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-slate-400">
              <span>• Discretionary:</span>
              <span className="font-mono">{formatCurrency(p.discretionary)}</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-400">
              <span>• Subscriptions:</span>
              <span className="font-mono">{formatCurrency(p.renewals)}</span>
            </div>

            {p.renewalEvents && p.renewalEvents.length > 0 && (
              <div className="pt-2 mt-2 border-t border-slate-800">
                <p className="text-[11px] font-semibold text-amber-300 mb-1">
                  Scheduled Renewals:
                </p>
                <ul className="space-y-0.5">
                  {p.renewalEvents.map((r: any, idx: number) => (
                    <li key={idx} className="flex justify-between text-[11px]">
                      <span>{r.service_name}</span>
                      <span className="font-mono text-amber-200">
                        {formatCurrency(r.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0c87eb" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0c87eb" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
          <XAxis
            dataKey="displayDate"
            tickLine={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
            interval={3}
          />
          <YAxis
            yAxisId="left"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(val) => `$${val}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => (
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {value}
              </span>
            )}
          />
          <Bar
            yAxisId="right"
            dataKey="renewals"
            name="Scheduled Renewals"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="cumulative"
            name="Cumulative Projected Outflow"
            stroke="#0c87eb"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#cumulativeGrad)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
