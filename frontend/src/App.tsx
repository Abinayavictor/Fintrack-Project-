import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { Sidebar, NavigationTab } from './layouts/Sidebar';
import { Header } from './layouts/Header';
import { OverviewPage } from './pages/OverviewPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LoginPage } from './pages/LoginPage';
import { ExpenseFormModal } from './components/expenses/ExpenseFormModal';
import { SubscriptionFormModal } from './components/subscriptions/SubscriptionFormModal';
import {
  analyticsApi,
  expensesApi,
  subscriptionsApi,
  systemApi,
  extractErrorMessage,
} from './services/api';
import {
  AnalyticsSummary,
  AuthUser,
  Expense,
  ExpenseCreatePayload,
  ForecastResponse,
  SubscriptionCreatePayload,
  SubscriptionUpdatePayload,
} from './types';

const MainApp: React.FC = () => {
  const { showToast } = useToast();

  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('fintrack_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('fintrack_theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fintrack_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fintrack_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Core Data State
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Global Quick Add Modals
  const [isGlobalExpenseModalOpen, setIsGlobalExpenseModalOpen] = useState(false);
  const [isGlobalSubModalOpen, setIsGlobalSubModalOpen] = useState(false);

  const fetchGlobalData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [summaryData, forecastData, recentExpData] = await Promise.all([
        analyticsApi.getSummary(),
        analyticsApi.getForecast(),
        expensesApi.list({ limit: 5, sort_by: 'date', order: 'desc' }),
      ]);
      setSummary(summaryData);
      setForecast(forecastData);
      setRecentExpenses(recentExpData.items);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchGlobalData();
    }
  }, [currentUser, fetchGlobalData]);

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    localStorage.setItem('fintrack_auth_user', JSON.stringify(user));
    localStorage.setItem('fintrack_auth_token', token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('fintrack_auth_user');
    localStorage.removeItem('fintrack_auth_token');
    setCurrentUser(null);
    showToast('You have been signed out.', 'info');
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await systemApi.seed(true);
      showToast(res.message || 'Realistic demo data seeded successfully!', 'success');
      await fetchGlobalData();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleQuickAddExpense = async (payload: ExpenseCreatePayload) => {
    try {
      await expensesApi.create(payload);
      showToast(`Recorded "${payload.title}"`, 'success');
      await fetchGlobalData();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
      throw err;
    }
  };

  const handleQuickAddSubscription = async (
    payload: SubscriptionCreatePayload | SubscriptionUpdatePayload
  ) => {
    try {
      await subscriptionsApi.create(payload as SubscriptionCreatePayload);
      showToast(`Added subscription "${payload.service_name}"`, 'success');
      await fetchGlobalData();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
      throw err;
    }
  };

  // If user is not logged in, render the login page!
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:pl-64 transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenAddExpense={() => setIsGlobalExpenseModalOpen(true)}
          onOpenAddSubscription={() => setIsGlobalSubModalOpen(true)}
          onSeedData={handleSeedData}
          isSeeding={isSeeding}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewPage
              summary={summary}
              forecast={forecast}
              recentExpenses={recentExpenses}
              isLoading={isLoading}
              onOpenAddExpense={() => setIsGlobalExpenseModalOpen(true)}
              onOpenAddSubscription={() => setIsGlobalSubModalOpen(true)}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesPage
              onDataMutated={fetchGlobalData}
              isAddModalOpenFromHeader={isGlobalExpenseModalOpen}
              onCloseHeaderAddModal={() => setIsGlobalExpenseModalOpen(false)}
            />
          )}

          {currentTab === 'subscriptions' && (
            <SubscriptionsPage
              onDataMutated={fetchGlobalData}
              isAddModalOpenFromHeader={isGlobalSubModalOpen}
              onCloseHeaderAddModal={() => setIsGlobalSubModalOpen(false)}
            />
          )}

          {currentTab === 'budgets' && <BudgetsPage onDataMutated={fetchGlobalData} />}

          {currentTab === 'analytics' && <AnalyticsPage />}
        </main>
      </div>

      {/* Global Add Modals */}
      <ExpenseFormModal
        isOpen={isGlobalExpenseModalOpen && currentTab !== 'expenses'}
        onClose={() => setIsGlobalExpenseModalOpen(false)}
        onSubmit={handleQuickAddExpense}
      />

      <SubscriptionFormModal
        isOpen={isGlobalSubModalOpen && currentTab !== 'subscriptions'}
        onClose={() => setIsGlobalSubModalOpen(false)}
        onSubmit={handleQuickAddSubscription}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
