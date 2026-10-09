import {
  IUser,
  IExpense,
  IPagination,
  IDashboardSummary,
  IMonthlyTrend,
  ICategoryBreakdown,
  IEvaluationMetrics,
  ICategory,
  IPendingTransaction,
  IGroup,
  IFriendLoan,
  IPeriodReport,
  ICalendarData,
} from '../types';

const TOKEN_KEY = 'spendwise_jwt_token';

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
    logout: () =>
      request<{ success: boolean; message: string }>('/api/auth/logout', {
        method: 'POST',
      }),
    forgotPassword: (email: string) =>
      request<{ success: boolean; message: string; resetToken?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (body: { token: string; newPassword: string }) =>
      request<{ success: boolean; message: string }>('/api/auth/reset-password', {
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

  // Categories
  categories: {
    list: () => request<{ success: boolean; data: ICategory[] }>('/api/categories'),
    create: (data: Partial<ICategory>) =>
      request<{ success: boolean; data: ICategory }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reorder: (orderedIds: string[]) =>
      request<{ success: boolean; data: ICategory[] }>('/api/categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ orderedIds }),
      }),
    restoreDefaults: () =>
      request<{ success: boolean; message: string; data: ICategory[] }>('/api/categories/restore-defaults', {
        method: 'POST',
      }),
    update: (id: string, data: Partial<ICategory>) =>
      request<{ success: boolean; data: ICategory }>(`/api/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/categories/${id}`, {
        method: 'DELETE',
      }),
  },

  // SMS Import & Pending Transactions
  sms: {
    parse: (text: string) =>
      request<{ success: boolean; count: number; data: any[] }>('/api/sms/parse', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    ingest: (transactions: any[]) =>
      request<{
        success: boolean;
        message: string;
        importedCount: number;
        duplicateWarningCount: number;
        data: IPendingTransaction[];
      }>('/api/sms/ingest', {
        method: 'POST',
        body: JSON.stringify({ transactions }),
      }),
    getPending: () =>
      request<{ success: boolean; count: number; data: IPendingTransaction[] }>('/api/sms/pending'),
    confirmPending: (id: string, data: any) =>
      request<{ success: boolean; message: string; data: IExpense }>(`/api/sms/pending/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    ignorePending: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/sms/pending/${id}/ignore`, {
        method: 'POST',
      }),
    batchConfirm: (ids: string[]) =>
      request<{ success: boolean; message: string; addedCount: number }>('/api/sms/pending/batch-confirm', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
  },

  // Group Expenses
  groups: {
    list: () => request<{ success: boolean; data: IGroup[] }>('/api/groups'),
    create: (data: { name: string; description?: string; currency?: string }) =>
      request<{ success: boolean; data: IGroup }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    join: (inviteCode: string) =>
      request<{ success: boolean; message: string; data: IGroup }>('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      }),
    getDetails: (id: string) =>
      request<{
        success: boolean;
        data: {
          group: IGroup;
          expenses: any[];
          settlements: any[];
          netBalances: Record<string, number>;
          simplifiedSettlements: any[];
        };
      }>(`/api/groups/${id}`),
    addExpense: (groupId: string, data: any) =>
      request<{ success: boolean; data: any }>(`/api/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    recordSettlement: (groupId: string, data: any) =>
      request<{ success: boolean; data: any }>(`/api/groups/${groupId}/settlements`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Friend Loans
  loans: {
    list: () =>
      request<{
        success: boolean;
        summary: { totalLent: number; totalBorrowed: number; netOutstanding: number };
        data: IFriendLoan[];
      }>('/api/loans'),
    create: (data: any) =>
      request<{ success: boolean; data: IFriendLoan }>('/api/loans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addRepayment: (id: string, data: any) =>
      request<{ success: boolean; data: IFriendLoan }>(`/api/loans/${id}/repayments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/loans/${id}`, {
        method: 'DELETE',
      }),
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
    getPeriodReport: (view: 'weekly' | 'monthly' | 'annual' = 'monthly', date?: string) => {
      const params = new URLSearchParams({ view });
      if (date) params.append('date', date);
      return request<{ success: boolean; data: IPeriodReport }>(`/api/analytics/period-report?${params.toString()}`);
    },
    getCalendarData: (year: number, month: number) =>
      request<{ success: boolean } & ICalendarData>(`/api/analytics/calendar?year=${year}&month=${month}`),
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
