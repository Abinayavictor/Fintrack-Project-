import React from 'react';
import {
  Menu,
  Plus,
  Database,
  Moon,
  Sun,
  RefreshCw,
  Repeat,
} from 'lucide-react';
import { NavigationTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavigationTab;
  onOpenMobileSidebar: () => void;
  onOpenAddExpense: () => void;
  onOpenAddSubscription: () => void;
  onSeedData: () => void;
  isSeeding: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onOpenAddExpense,
  onOpenAddSubscription,
  onSeedData,
  isSeeding,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const titles: Record<NavigationTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Financial Overview',
      subtitle: 'Real-time metrics, cashflow projections, and recurring commitments',
    },
    expenses: {
      title: 'Expenses & Ledger',
      subtitle: 'Complete transaction history, filters, and defensive CSV ingestion',
    },
    subscriptions: {
      title: 'Subscription Intelligence',
      subtitle: 'Normalized monthly burn rate, renewal countdowns, and lifecycle states',
    },
    budgets: {
      title: 'Category Budgets',
      subtitle: 'Monthly targets, live utilization percentages, and status alerts',
    },
    analytics: {
      title: 'Analytics & 30-Day Forecast',
      subtitle: 'Historical baseline breakdown and daily projected outflows',
    },
  };

  const currentInfo = titles[currentTab];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white lg:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {currentInfo.title}
          </h1>
          <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Seed Sample Data Button */}
        <button
          onClick={onSeedData}
          disabled={isSeeding}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50"
          title="Seed realistic demonstration data into SQLite database"
        >
          <Database className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>{isSeeding ? 'Seeding...' : 'Seed Sample Data'}</span>
        </button>

        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
          title="Toggle Dark / Light Mode"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Quick Add Subscription */}
        <button
          onClick={onOpenAddSubscription}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl transition-all shadow-sm"
        >
          <Repeat className="w-3.5 h-3.5 text-indigo-500" />
          <span>+ Subscription</span>
        </button>

        {/* Primary Add Expense Action */}
        <button
          onClick={onOpenAddExpense}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition-all shadow-sm shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>
    </header>
  );
};
