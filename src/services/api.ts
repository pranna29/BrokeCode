import {
  Category,
  PaymentAccount,
  Transaction,
  Budget,
  FriendBalance,
  User
} from '../types.ts';

const BASE_URL = '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('spendwise_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include' // Ensures HttpOnly cookie is transmitted across refreshes
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }

  return data as T;
}

export const api = {
  // Auth
  async register(body: { email: string; password: string; name: string; currency?: string }): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (res.token) localStorage.setItem('spendwise_token', res.token);
    return res;
  },

  async login(body: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (res.token) localStorage.setItem('spendwise_token', res.token);
    return res;
  },

  async getCurrentUser(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    localStorage.removeItem('spendwise_token');
    await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
  },

  async updateProfile(body: { name?: string; preferences?: Partial<User['preferences']> }): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  // Categories
  async getCategories(): Promise<{ categories: Category[] }> {
    return request<{ categories: Category[] }>('/api/categories');
  },

  async createCategory(body: { name: string; emoji: string; color?: string }): Promise<{ category: Category }> {
    return request<{ category: Category }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async updateCategory(id: string, body: Partial<Category>): Promise<{ category: Category }> {
    return request<{ category: Category }>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/categories/${id}`, {
      method: 'DELETE'
    });
  },

  async resetCategories(): Promise<{ categories: Category[] }> {
    return request<{ categories: Category[] }>('/api/categories/reset', {
      method: 'POST'
    });
  },

  async reorderCategories(orderedIds: string[]): Promise<{ categories: Category[] }> {
    return request<{ categories: Category[] }>('/api/categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds })
    });
  },

  // Accounts
  async getAccounts(): Promise<{ accounts: PaymentAccount[] }> {
    return request<{ accounts: PaymentAccount[] }>('/api/accounts');
  },

  async createAccount(body: { name: string; type?: string; balance?: number; currency?: string }): Promise<{ account: PaymentAccount }> {
    return request<{ account: PaymentAccount }>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async updateAccount(id: string, body: Partial<PaymentAccount>): Promise<{ account: PaymentAccount }> {
    return request<{ account: PaymentAccount }>(`/api/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  async deleteAccount(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/accounts/${id}`, {
      method: 'DELETE'
    });
  },

  // Expenses / Transactions
  async getTransactions(params?: {
    categoryId?: string;
    accountId?: string;
    search?: string;
    sort?: string;
    startDate?: string;
    endDate?: string;
    anomalyOnly?: boolean;
  }): Promise<{ transactions: Transaction[] }> {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.accountId) searchParams.set('accountId', params.accountId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.anomalyOnly) searchParams.set('anomalyOnly', 'true');

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<{ transactions: Transaction[] }>(`/api/expenses${query}`);
  },

  async createTransaction(body: {
    amount: number;
    accountId: string;
    categoryId: string;
    description?: string;
    merchant?: string;
    date?: string;
  }): Promise<{ transaction: Transaction }> {
    return request<{ transaction: Transaction }>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async updateTransaction(id: string, body: Partial<Transaction>): Promise<{ transaction: Transaction }> {
    return request<{ transaction: Transaction }>(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  async deleteTransaction(id: string): Promise<{ success: boolean; transaction: Transaction }> {
    return request<{ success: boolean; transaction: Transaction }>(`/api/expenses/${id}`, {
      method: 'DELETE'
    });
  },

  async reorderTransactions(orderedIds: string[]): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/expenses/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds })
    });
  },

  // Receipts parse
  async parseReceiptText(text: string): Promise<{
    amount?: number;
    merchant?: string;
    date?: string;
    suggestedCategory?: string;
    duplicateWarning?: boolean;
  }> {
    return request('/api/receipts/parse-text', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  // Budgets
  async getBudgets(): Promise<{ budgets: Budget[] }> {
    return request<{ budgets: Budget[] }>('/api/budgets');
  },

  async setBudget(body: { categoryId?: string; amount: number; period?: string }): Promise<{ budget: Budget }> {
    return request<{ budget: Budget }>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  // Anomalies
  async getAnomalies(): Promise<{ anomalies: Transaction[] }> {
    return request<{ anomalies: Transaction[] }>('/api/anomalies');
  },

  async provideAnomalyFeedback(id: string, status: 'confirmed' | 'expected' | 'dismissed'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/anomalies/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  },

  // Groups
  async getGroupBalances(): Promise<{ friendBalances: FriendBalance[] }> {
    return request<{ friendBalances: FriendBalance[] }>('/api/groups');
  },

  async addSplitExpense(body: { friendName: string; amount: number; isOwed: boolean; notes?: string }): Promise<{ friendBalances: FriendBalance[] }> {
    return request<{ friendBalances: FriendBalance[] }>('/api/groups/split', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async settleGroupBalance(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/groups/settle/${id}`, {
      method: 'POST'
    });
  },

  // Analytics
  async getAnalyticsSummary(): Promise<{
    currentMonthTotal: number;
    transactionCount: number;
    categoryBreakdown: { name: string; emoji: string; color: string; total: number; count: number }[];
    dailyTotals: Record<string, number>;
    highestDay: string;
    highestAmount: number;
    unreviewedAnomaliesCount: number;
  }> {
    return request('/api/analytics/summary');
  }
};
