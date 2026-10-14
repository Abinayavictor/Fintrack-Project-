import axios, { AxiosError } from 'axios';
import {
  AnalyticsSummary,
  Budget,
  BudgetUtilization,
  CsvImportReport,
  Expense,
  ExpenseCategory,
  ExpenseCreatePayload,
  ExpensePagination,
  ForecastResponse,
  Subscription,
  SubscriptionCreatePayload,
  SubscriptionUpdatePayload,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ApiError {
  success: boolean;
  error_code: string;
  message: string;
  details?: Array<{ field?: string; reason?: string }>;
}

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const serverError = err.response?.data as ApiError | undefined;
    if (serverError?.message) {
      if (serverError.details && serverError.details.length > 0) {
        const detailsList = serverError.details
          .map((d) => (d.field ? `${d.field}: ${d.reason}` : d.reason))
          .filter(Boolean)
          .join(', ');
        return `${serverError.message} (${detailsList})`;
      }
      return serverError.message;
    }
    return err.message || 'Network request failed';
  }
  return err instanceof Error ? err.message : 'An unexpected error occurred';
}

export const expensesApi = {
  list: async (params?: {
    start_date?: string;
    end_date?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sort_by?: 'date' | 'amount';
    order?: 'asc' | 'desc';
  }): Promise<ExpensePagination> => {
    const res = await apiClient.get<ExpensePagination>('/expenses', { params });
    return res.data;
  },

  create: async (payload: ExpenseCreatePayload): Promise<Expense> => {
    const res = await apiClient.post<Expense>('/expenses', payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },

  importCsv: async (file: File): Promise<CsvImportReport> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<CsvImportReport>('/expenses/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};

export const subscriptionsApi = {
  list: async (status?: string): Promise<Subscription[]> => {
    const res = await apiClient.get<Subscription[]>('/subscriptions', {
      params: status ? { status } : undefined,
    });
    return res.data;
  },

  create: async (payload: SubscriptionCreatePayload): Promise<Subscription> => {
    const res = await apiClient.post<Subscription>('/subscriptions', payload);
    return res.data;
  },

  update: async (id: number, payload: SubscriptionUpdatePayload): Promise<Subscription> => {
    const res = await apiClient.patch<Subscription>(`/subscriptions/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/subscriptions/${id}`);
  },
};

export const budgetsApi = {
  list: async (): Promise<Budget[]> => {
    const res = await apiClient.get<Budget[]>('/budgets');
    return res.data;
  },

  getUtilization: async (): Promise<BudgetUtilization[]> => {
    const res = await apiClient.get<BudgetUtilization[]>('/budgets/utilization');
    return res.data;
  },

  setBudget: async (category: ExpenseCategory, monthly_limit: number | string): Promise<Budget> => {
    const res = await apiClient.post<Budget>('/budgets', {
      category,
      monthly_limit,
    });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/budgets/${id}`);
  },
};

export const analyticsApi = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    const res = await apiClient.get<AnalyticsSummary>('/analytics/summary');
    return res.data;
  },

  getForecast: async (): Promise<ForecastResponse> => {
    const res = await apiClient.get<ForecastResponse>('/analytics/forecast');
    return res.data;
  },
};

export const systemApi = {
  health: async (): Promise<{ status: string; service: string }> => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  seed: async (reset: boolean = true): Promise<{ message: string }> => {
    const res = await apiClient.post('/seed', null, { params: { reset } });
    return res.data;
  },
};
