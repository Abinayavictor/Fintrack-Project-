import React from 'react';
import {
  TrendingDown,
  Repeat,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { AnalyticsSummary, Expense, ForecastResponse } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { CategoryDonutChart } from '../components/charts/CategoryDonutChart';
import { ForecastTimelineChart } from '../components/charts/ForecastTimelineChart';
import { formatCurrency, formatDate, getStatusBadgeStyle } from '../utils/formatters';

interface OverviewPageProps {
  summary: AnalyticsSummary | null;
  forecast: ForecastResponse | null;
  recentExpenses: Expense[];
  isLoading: boolean;
  onOpenAddExpense: () => void;
  onOpenAddSubscription: () => void;
  onNavigateTab: (tab: 'expenses' | 'subscriptions' | 'budgets' | 'analytics') => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  summary,
  forecast,
  recentExpenses,
  isLoading,
  onOpenAddExpense,
  onOpenAddSubscription,
  onNavigateTab,
}) => {
  if (isLoading && !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const burnRate = summary?.monthly_recurring_burn_rate ?? '0.00';
  const mtdSpend = summary?.month_to_date_spend ?? '0.00';
  const upcoming7d = summary?.upcoming_7_day_renewals ?? '0.00';
  const topCategory = summary?.top_spend_category ?? 'None';
  const budgetAlertCount =
    summary?.budget_utilizations.filter(
      (b) => b.status === 'WARNING' || b.status === 'EXCEEDED'
    ).length ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Recurring Baseline"
          value={formatCurrency(burnRate)}
          subtitle="Active normalized subscriptions"
          icon={Repeat}
          iconColorClass="text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60"
          onClick={() => onNavigateTab('subscriptions')}
        />

        <MetricCard
          title="Month-to-Date Spend"
          value={formatCurrency(mtdSpend)}
          subtitle="First of current month to today"
          icon={TrendingDown}
          iconColorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60"
          onClick={() => onNavigateTab('expenses')}
        />

        <MetricCard
          title="Upcoming Renewals — 7 Days"
          value={formatCurrency(upcoming7d)}
          subtitle="Scheduled eligible renewals"
          icon={Calendar}
          iconColorClass="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60"
          badge={
            parseFloat(upcoming7d) > 0
              ? { text: 'Scheduled', variant: 'warning' }
              : undefined
          }
          onClick={() => onNavigateTab('subscriptions')}
        />

        <MetricCard
          title="Top Spend Category"
          value={topCategory}
          subtitle="Current calendar month"
          icon={Layers}
          iconColorClass="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60"
          badge={
            budgetAlertCount > 0
              ? { text: `${budgetAlertCount} Budget Alerts`, variant: 'critical' }
              : undefined
          }
          onClick={() => onNavigateTab('budgets')}
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-Day Forecast Timeline */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Thirty-Day Cashflow Projection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Combines historical discretionary average (
                {formatCurrency(forecast?.breakdown.historical_daily_average)}
                /day) with upcoming subscription renewals
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              Details <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {forecast ? (
            <ForecastTimelineChart data={forecast.daily_projections} />
          ) : (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">
              Loading forecast...
            </div>
          )}
        </div>

        {/* Category Spending Donut Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Spending by Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Current month distribution
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              Ledger <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {summary?.category_spending ? (
            <CategoryDonutChart data={summary.category_spending} />
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No category spending recorded
            </div>
          )}
        </div>
      </div>

      {/* Split Section: Budget Utilization & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Budgets Snapshot */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Category Budget Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monthly limits and real-time utilization
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('budgets')}
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              Manage Budgets <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {summary?.budget_utilizations && summary.budget_utilizations.length > 0 ? (
              summary.budget_utilizations.slice(0, 5).map((b) => {
                const percent = b.percentage_used ? parseFloat(b.percentage_used) : 0;
                const badgeStyle = getStatusBadgeStyle(b.status);
                const isExceeded = b.status === 'EXCEEDED';
                const isWarning = b.status === 'WARNING';

                return (
                  <div key={b.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {b.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono">
                        {formatCurrency(b.current_spend)} /{' '}
                        {b.monthly_limit ? formatCurrency(b.monthly_limit) : 'No Target'}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExceeded
                            ? 'bg-rose-500'
                            : isWarning
                            ? 'bg-amber-500'
                            : b.status === 'OK'
                            ? 'bg-emerald-500'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400">No budget data configured</p>
            )}
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Recent Ledger Transactions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest recorded financial outflows
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('expenses')}
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentExpenses.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentExpenses.slice(0, 5).map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {exp.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(exp.date)} • {exp.category} • {exp.payment_method}
                      </p>
                    </div>
                    <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent transactions recorded. Add an expense or import CSV.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
            <button
              onClick={onOpenAddSubscription}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Add Subscription</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
