import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Calendar,
  Repeat,
  Calculator,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { ForecastResponse } from '../types';
import { analyticsApi, extractErrorMessage } from '../services/api';
import { ForecastTimelineChart } from '../components/charts/ForecastTimelineChart';
import { formatCurrency, formatDate } from '../utils/formatters';

export const AnalyticsPage: React.FC = () => {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getForecast();
      setForecast(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm text-slate-400">
        Computing 30-day cashflow forecast...
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="p-8 text-center text-rose-600 text-sm">
        Failed to calculate forecast: {error || 'No forecast data returned'}
      </div>
    );
  }

  const { breakdown, thirty_day_forecast_total, daily_projections } = forecast;

  // Count total renewal occurrences in 30 days
  const totalRenewalEvents = daily_projections.reduce(
    (acc, curr) => acc + curr.renewals.length,
    0
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Formula Explanation Banner */}
      <div className="p-5 bg-gradient-to-r from-brand-900 to-indigo-950 text-white rounded-2xl shadow-sm border border-brand-800/60">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/10 text-white shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">
              Financial Forecasting Engine (30-Day Window)
            </h3>
            <p className="text-xs text-brand-100 leading-relaxed max-w-2xl">
              Projected Total = Scheduled Subscription Renewals in 30-day window + (Historical
              Average Daily Discretionary Spending × 30 days). Calculated dynamically using SQLite
              records with Python Decimal precision.
            </p>
          </div>
        </div>
      </div>

      {/* Component Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projected Outflow */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total 30-Day Projected Outflow
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-brand-600 dark:text-brand-400 mt-2">
            {formatCurrency(thirty_day_forecast_total)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Combined discretionary + commitments
          </span>
        </div>

        {/* Projected Discretionary Spend */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Projected Discretionary Outflow
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {formatCurrency(breakdown.total_projected_discretionary)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {formatCurrency(breakdown.historical_daily_average)}/day × 30 days
          </span>
        </div>

        {/* Scheduled Renewals Outflow */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Scheduled Subscription Charges
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {formatCurrency(breakdown.total_scheduled_renewals)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalRenewalEvents} renewal events in next 30 days
          </span>
        </div>

        {/* Baseline Daily Rate */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Historical Daily Baseline
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {formatCurrency(breakdown.historical_daily_average)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Preceding {breakdown.historical_period_days}-day expense average
          </span>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Daily Cashflow Trajectory & Renewal Events
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hover over any day to inspect discretionary spending and individual renewal charges
          </p>
        </div>

        <ForecastTimelineChart data={daily_projections} />
      </div>

      {/* Day-by-Day Forecast Schedule Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Complete 30-Day Outflow Schedule
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Breakdown per calendar day starting from reference date ({forecast.reference_date})
          </p>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider border-b border-slate-200/80 dark:border-slate-800/80">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Discretionary</th>
                <th className="py-2.5 px-4 text-right">Scheduled Renewals</th>
                <th className="py-2.5 px-4">Renewal Events</th>
                <th className="py-2.5 px-4 text-right">Day Outflow</th>
                <th className="py-2.5 px-4 text-right">Cumulative Outflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {daily_projections.map((p, idx) => {
                const hasRenewals = p.renewals.length > 0;
                return (
                  <tr
                    key={p.date}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                      hasRenewals ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {formatDate(p.date)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(p.projected_discretionary)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {parseFloat(p.scheduled_renewals) > 0
                        ? formatCurrency(p.scheduled_renewals)
                        : '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      {hasRenewals ? (
                        <div className="flex flex-wrap gap-1">
                          {p.renewals.map((r, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            >
                              {r.service_name} ({formatCurrency(r.amount)})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No renewals</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                      {formatCurrency(p.daily_total)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-brand-600 dark:text-brand-400">
                      {formatCurrency(p.cumulative_total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
