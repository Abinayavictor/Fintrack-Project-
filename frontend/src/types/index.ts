export type ExpenseCategory =
  | 'Housing'
  | 'Food'
  | 'Utilities'
  | 'Transport'
  | 'Entertainment'
  | 'Healthcare'
  | 'Misc';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Housing',
  'Food',
  'Utilities',
  'Transport',
  'Entertainment',
  'Healthcare',
  'Misc',
];

export type PaymentMethod = 'Credit Card' | 'Debit Card' | 'Cash' | 'Bank Transfer';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Credit Card',
  'Debit Card',
  'Cash',
  'Bank Transfer',
];

export interface Expense {
  id: number;
  title: string;
  amount: string;
  category: ExpenseCategory;
  date: string;
  payment_method: PaymentMethod;
  created_at: string;
}

export interface ExpensePagination {
  items: Expense[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExpenseCreatePayload {
  title: string;
  amount: number | string;
  category: ExpenseCategory;
  date: string;
  payment_method: PaymentMethod;
}

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface Subscription {
  id: number;
  service_name: string;
  cost: string;
  billing_cycle: BillingCycle;
  next_renewal_date: string;
  status: SubscriptionStatus;
  auto_renew: boolean;
  normalized_monthly_cost: string;
  days_until_renewal: number;
  is_imminent: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionCreatePayload {
  service_name: string;
  cost: number | string;
  billing_cycle: BillingCycle;
  next_renewal_date?: string;
  status?: SubscriptionStatus;
  auto_renew?: boolean;
}

export interface SubscriptionUpdatePayload {
  service_name?: string;
  cost?: number | string;
  billing_cycle?: BillingCycle;
  next_renewal_date?: string;
  status?: SubscriptionStatus;
  auto_renew?: boolean;
}

export interface Budget {
  id: number;
  category: ExpenseCategory;
  monthly_limit: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetUtilization {
  category: ExpenseCategory;
  monthly_limit: string | null;
  current_spend: string;
  remaining: string | null;
  percentage_used: string | null;
  status: 'OK' | 'WARNING' | 'EXCEEDED' | 'UNSET';
}

export interface CategorySpendingItem {
  category: ExpenseCategory;
  total_amount: string;
  percentage_of_total: string;
  transaction_count: number;
}

export interface ForecastRenewalEvent {
  subscription_id: number;
  service_name: string;
  amount: string;
  billing_cycle: string;
}

export interface DailyForecastPoint {
  date: string;
  projected_discretionary: string;
  scheduled_renewals: string;
  daily_total: string;
  cumulative_total: string;
  renewals: ForecastRenewalEvent[];
}

export interface ForecastBreakdown {
  total_scheduled_renewals: string;
  total_projected_discretionary: string;
  historical_daily_average: string;
  historical_period_days: number;
  forecast_window_days: number;
}

export interface ForecastResponse {
  reference_date: string;
  thirty_day_forecast_total: string;
  breakdown: ForecastBreakdown;
  daily_projections: DailyForecastPoint[];
}

export interface AnalyticsSummary {
  monthly_recurring_burn_rate: string;
  month_to_date_spend: string;
  upcoming_7_day_renewals: string;
  top_spend_category: string | null;
  thirty_day_forecast_total: string;
  forecast_breakdown: ForecastBreakdown;
  category_spending: CategorySpendingItem[];
  budget_utilizations: BudgetUtilization[];
}

export interface CsvRowError {
  row: number;
  field: string;
  reason: string;
}

export interface CsvImportReport {
  total_rows: number;
  imported_count: number;
  failed_count: number;
  errors: CsvRowError[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  created_at?: string;
  last_login?: string;
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  token: string;
}

export interface LoginAuditRecord {
  id: string;
  email: string;
  timestamp: string;
  status: string;
  ip_address: string;
  user_agent: string;
}

export interface LoginAuditData {
  file_path: string;
  total_registered_users: number;
  total_login_events: number;
  users: AuthUser[];
  recent_logins: LoginAuditRecord[];
}
