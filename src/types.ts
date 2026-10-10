export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  order: number;
  isCustom?: boolean;
}

export interface PaymentAccount {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'debit' | 'credit' | 'custom';
  balance?: number;
  currency?: string;
  isDefault?: boolean;
}

export interface AnomalyInfo {
  isAnomaly: boolean;
  score: number; // 0 - 100
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  baselineMedian?: number;
  baselineIQR?: number;
  reviewStatus: 'unreviewed' | 'confirmed' | 'expected' | 'dismissed';
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  date: string; // ISO date string (YYYY-MM-DD or full timestamp)
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  categoryColor: string;
  description?: string;
  merchant?: string;
  receiptUrl?: string;
  customOrder?: number;
  anomaly?: AnomalyInfo;
  groupId?: string;
  splitDetails?: {
    paidBy: string;
    splits: { friendName: string; share: number; settled: boolean }[];
  };
  createdAt: string;
}

export interface UserPreferences {
  currency: string;
  currencySymbol: string;
  sensitivity: 'low' | 'medium' | 'high';
  theme: 'light' | 'dark' | 'system';
  monthlyBudget: number;
  lastSelectedAccountId?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  preferences: UserPreferences;
}

export interface Budget {
  id: string;
  categoryId?: string; // undefined for total monthly budget
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
}

export interface FriendBalance {
  id: string;
  friendName: string;
  amount: number; // positive = they owe you, negative = you owe them
  notes?: string;
  lastUpdated: string;
}

export interface GroupExpense {
  id: string;
  name: string;
  members: string[];
  totalSpend: number;
}
