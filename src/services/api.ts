import {
  IUser,
  IExpense,
  IPagination,
  IDashboardSummary,
  IMonthlyTrend,
  ICategoryBreakdown,
  IEvaluationMetrics,
} from '../types';

const TOKEN_KEY = 'brokecode_jwt_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    register: (body: any) =>
      request<{ success: boolean; token: string; user: IUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: any) =>
      request<{ success: boolean; token: string; user: IUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getMe: () => request<{ success: boolean; user: IUser }>('/api/auth/me'),
    updateProfile: (body: any) =>
      request<{ success: boolean; user: IUser }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    deleteAccount: () =>
      request<{ success: boolean; message: string }>('/api/auth/account', {
        method: 'DELETE',
      }),
    exportData: () => request<any>('/api/auth/export-data'),
  },

  // Expenses
  expenses: {
    list: (params: Record<string, string | number | boolean | undefined> = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') searchParams.append(k, String(v));
      });
      return request<{ success: boolean; data: IExpense[]; pagination: IPagination }>(
        `/api/expenses?${searchParams.toString()}`
      );
    },
    get: (id: string) => request<{ success: boolean; data: IExpense }>(`/api/expenses/${id}`),
    create: (data: Partial<IExpense>) =>
      request<{ success: boolean; data: IExpense }>('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<IExpense>) =>
      request<{ success: boolean; data: IExpense }>(`/api/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/expenses/${id}`, {
        method: 'DELETE',
      }),
    bulkDelete: (ids: string[]) =>
      request<{ success: boolean; deletedCount: number }>('/api/expenses/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    importCSV: (rows: any[]) =>
      request<{
        success: boolean;
        message: string;
        summary: {
          imported: number;
          duplicatesSkipped: number;
          invalidSkipped: number;
          anomaliesDetected: number;
        };
      }>('/api/expenses/import-csv', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      }),
    seedDemo: () =>
      request<{ success: boolean; message: string; result: { count: number; anomaliesCount: number } }>(
        '/api/expenses/seed-demo',
        { method: 'POST' }
      ),
    exportCSVUrl: (category?: string, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      return `/api/expenses/export-csv?${params.toString()}`;
    },
  },

  // Anomalies
  anomalies: {
    list: (params: Record<string, string | number | undefined> = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') searchParams.append(k, String(v));
      });
      return request<{
        success: boolean;
        data: IExpense[];
        summary: { totalFlagged: number; severityCounts: Record<string, number> };
        pagination: IPagination;
      }>(`/api/anomalies?${searchParams.toString()}`);
    },
    submitFeedback: (id: string, reviewStatus: string, userFeedback?: string) =>
      request<{ success: boolean; data: IExpense }>(`/api/anomalies/${id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ reviewStatus, userFeedback }),
      }),
    recalculate: () =>
      request<{
        success: boolean;
        message: string;
        summary: { totalProcessed: number; newlyFlagged: number; clearedCount: number };
      }>('/api/anomalies/recalculate', {
        method: 'POST',
      }),
    getMetrics: () => request<{ success: boolean } & IEvaluationMetrics>('/api/anomalies/metrics'),
  },

  // Analytics
  analytics: {
    getSummary: () => request<{ success: boolean; data: IDashboardSummary }>('/api/analytics/summary'),
    getMonthlyTrends: (months = 6) =>
      request<{ success: boolean; data: IMonthlyTrend[] }>(`/api/analytics/monthly-trends?months=${months}`),
    getCategoryBreakdown: (startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      return request<{ success: boolean; data: ICategoryBreakdown[]; grandTotal: number }>(
        `/api/analytics/category-breakdown?${params.toString()}`
      );
    },
    getAnomalyDistribution: () => request<any>('/api/analytics/anomaly-distribution'),
    getMerchantInsights: () => request<{ success: boolean; data: any[] }>('/api/analytics/merchant-insights'),
  },

  // System Health
  system: {
    getHealth: async () => {
      const res = await fetch('/api/health');
      return res.json();
    },
  },
};
