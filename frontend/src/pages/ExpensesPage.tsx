import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Upload,
  Trash2,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  Expense,
  ExpenseCategory,
  ExpenseCreatePayload,
} from '../types';
import { expensesApi, extractErrorMessage } from '../services/api';
import { ExpenseFormModal } from '../components/expenses/ExpenseFormModal';
import { CsvImportModal } from '../components/expenses/CsvImportModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';
import { formatCurrency, formatDate, CATEGORY_COLORS } from '../utils/formatters';

interface ExpensesPageProps {
  onDataMutated: () => void;
  isAddModalOpenFromHeader?: boolean;
  onCloseHeaderAddModal?: () => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  onDataMutated,
  isAddModalOpenFromHeader = false,
  onCloseHeaderAddModal,
}) => {
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Synchronize with header trigger
  useEffect(() => {
    if (isAddModalOpenFromHeader) {
      setIsAddModalOpen(true);
    }
  }, [isAddModalOpenFromHeader]);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await expensesApi.list({
        search: search.trim() || undefined,
        category: category || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_by: sortBy,
        order: order,
        limit,
        offset: (page - 1) * limit,
      });
      setExpenses(data.items);
      setTotalCount(data.total);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [search, category, startDate, endDate, sortBy, order, page, limit]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleCreateExpense = async (payload: ExpenseCreatePayload) => {
    await expensesApi.create(payload);
    showToast('Expense created successfully!', 'success');
    fetchExpenses();
    onDataMutated();
  };

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await expensesApi.delete(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.title}"`, 'success');
      setDeleteTarget(null);
      fetchExpenses();
      onDataMutated();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCsvImportSuccess = () => {
    showToast('CSV import batch completed!', 'success');
    fetchExpenses();
    onDataMutated();
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Transactions ({totalCount})
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-brand-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition-all shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls Card */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search by title */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
              title="End Date"
            />
          </div>
        </div>

        {/* Sorting options & Reset */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setOrder(order === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('date');
                  setOrder('desc');
                }
              }}
              className={`flex items-center gap-1 font-semibold ${
                sortBy === 'date' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Date ({order === 'desc' ? 'Newest' : 'Oldest'})
            </button>
            <button
              onClick={() => {
                if (sortBy === 'amount') {
                  setOrder(order === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('amount');
                  setOrder('desc');
                }
              }}
              className={`flex items-center gap-1 font-semibold ${
                sortBy === 'amount' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" /> Amount (
              {order === 'desc' ? 'High → Low' : 'Low → High'})
            </button>
          </div>

          {(search || category || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="text-xs text-brand-600 hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading expenses ledger...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            Failed to load expenses: {error}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Expenses Found"
            description={
              search || category || startDate || endDate
                ? 'No transactions matched your search or filter criteria.'
                : 'Your transaction ledger is empty. Add your first expense or upload a CSV.'
            }
            actionLabel="Add Expense"
            onAction={() => setIsAddModalOpen(true)}
            secondaryActionLabel="Import CSV"
            onSecondaryAction={() => setIsImportModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800/80 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {expenses.map((exp) => {
                  const catStyle = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Misc;
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {exp.title}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {exp.payment_method}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteTarget(exp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount}{' '}
              records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <ExpenseFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          if (onCloseHeaderAddModal) onCloseHeaderAddModal();
        }}
        onSubmit={handleCreateExpense}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(file) => expensesApi.importCsv(file)}
        onSuccess={handleCsvImportSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message={`Are you sure you want to permanently delete "${deleteTarget?.title}" (${formatCurrency(
          deleteTarget?.amount
        )})? This action will adjust month-to-date spending and budget utilization.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
};
