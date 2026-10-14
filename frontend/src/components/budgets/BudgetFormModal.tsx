import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '../../types';

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: ExpenseCategory, monthlyLimit: string) => Promise<void>;
  initialCategory?: ExpenseCategory;
  initialLimit?: string;
  isLoading?: boolean;
}

export const BudgetFormModal: React.FC<BudgetFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialCategory = 'Food',
  initialLimit = '',
  isLoading = false,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>(initialCategory);
  const [limit, setLimit] = useState(initialLimit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setLimit(initialLimit);
      setError(null);
    }
  }, [isOpen, initialCategory, initialLimit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit <= 0) {
      setError('Monthly budget limit must be a strictly positive number (> 0.00).');
      return;
    }

    try {
      await onSubmit(category, numLimit.toFixed(2));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget target');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Category Monthly Budget"
      description="Define or adjust the monthly spending ceiling for a specific category"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Monthly Target Limit ($ USD) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2 text-sm text-slate-400 font-medium">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="500.00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full pl-8 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Save Budget
          </button>
        </div>
      </form>
    </Modal>
  );
};
