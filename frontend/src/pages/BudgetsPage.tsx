import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart,
  Plus,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  DollarSign,
} from 'lucide-react';
import { BudgetUtilization, ExpenseCategory } from '../types';
import { budgetsApi, extractErrorMessage } from '../services/api';
import { BudgetFormModal } from '../components/budgets/BudgetFormModal';
import { useToast } from '../components/common/Toast';
import {
  CATEGORY_COLORS,
  formatCurrency,
  getStatusBadgeStyle,
} from '../utils/formatters';

interface BudgetsPageProps {
  onDataMutated: () => void;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({ onDataMutated }) => {
  const { showToast } = useToast();

  const [utilizations, setUtilizations] = useState<BudgetUtilization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory>('Food');
  const [editingLimit, setEditingLimit] = useState<string>('');

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await budgetsApi.getUtilization();
      setUtilizations(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleSaveBudget = async (category: ExpenseCategory, monthlyLimit: string) => {
    try {
      await budgetsApi.setBudget(category, monthlyLimit);
      showToast(`Set monthly budget for ${category} to ${formatCurrency(monthlyLimit)}`, 'success');
      fetchBudgets();
      onDataMutated();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleOpenEdit = (category: ExpenseCategory, currentLimit: string | null) => {
    setEditingCategory(category);
    setEditingLimit(currentLimit || '');
    setIsModalOpen(true);
  };

  // Summaries
  const configuredCount = utilizations.filter((u) => u.monthly_limit !== null).length;
  const warningCount = utilizations.filter((u) => u.status === 'WARNING').length;
  const exceededCount = utilizations.filter((u) => u.status === 'EXCEEDED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner and Summary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-brand-50 dark:bg-brand-950/60 text-brand-600 rounded-xl">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Configured Categories</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {configuredCount} of {utilizations.length}
            </p>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Warning (80%–99%)</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {warningCount} Categories
            </p>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Exceeded (≥100%)</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              {exceededCount} Categories
            </p>
          </div>
        </div>
      </div>

      {/* Main Category Cards */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Current Month Category Budgets
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track actual month-to-date spending against spending targets
            </p>
          </div>

          <button
            onClick={() => handleOpenEdit('Food', '')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Set Target</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading category budgets...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">Failed to load: {error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {utilizations.map((item) => {
              const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Misc;
              const badgeStyle = getStatusBadgeStyle(item.status);
              const percent = item.percentage_used ? parseFloat(item.percentage_used) : 0;
              const hasBudget = item.monthly_limit !== null;
              const remainingNum = item.remaining ? parseFloat(item.remaining) : 0;

              return (
                <div
                  key={item.category}
                  className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Category name and status badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-lg border ${catColor.bg} ${catColor.border}`}
                          style={{ backgroundColor: catColor.hex }}
                        />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.category}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                          {item.status}
                        </span>
                        <button
                          onClick={() => handleOpenEdit(item.category, item.monthly_limit)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                          title="Edit budget target"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.status === 'EXCEEDED'
                            ? 'bg-rose-500'
                            : item.status === 'WARNING'
                            ? 'bg-amber-500'
                            : item.status === 'OK'
                            ? 'bg-emerald-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                      />
                    </div>

                    {/* Numbers grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 block">Spent (MTD)</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                          {formatCurrency(item.current_spend)}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Monthly Target</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
                          {hasBudget ? formatCurrency(item.monthly_limit) : 'None'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-500 block">Remaining</span>
                        <span
                          className={`font-mono font-semibold mt-0.5 block ${
                            remainingNum < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {hasBudget ? formatCurrency(item.remaining) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Percentage footer indicator */}
                  <div className="mt-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {hasBudget
                        ? `${item.percentage_used}% of budget consumed`
                        : 'No monthly ceiling set'}
                    </span>
                    {item.status === 'EXCEEDED' && (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Budget Overrun
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget Form Modal */}
      <BudgetFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveBudget}
        initialCategory={editingCategory}
        initialLimit={editingLimit}
      />
    </div>
  );
};
