export interface IUserPreferences {
  sensitivity: 'low' | 'medium' | 'high';
  minHistoryCount: number;
  excludedCategories: string[];
  theme: 'light' | 'dark' | 'system';
  currencySymbol: string;
  notificationsEnabled: boolean;
}

export interface IUser {
  _id: string;
  email: string;
  name: string;
  currency: string;
  monthlyBudget: number;
  preferences: IUserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface IAnomalyBaseline {
  median?: number;
  iqr?: number;
  q1?: number;
  q3?: number;
  lowerBound?: number;
  upperBound?: number;
  historicalCount?: number;
  merchantAvg?: number;
  overallMedian?: number;
}

export interface IAnomalyStatus {
  isAnomaly: boolean;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  method: string;
  explanation: string;
  baseline?: IAnomalyBaseline;
  detectedAt?: string;
  reviewStatus: 'unreviewed' | 'confirmed_anomaly' | 'expected_purchase' | 'dismissed';
  userFeedback?: string;
  reviewedAt?: string;
}

export interface IExpense {
  _id: string;
  userId: string;
  amount: number;
  currency: string;
  date: string;
  merchant: string;
  category: string;
  subcategory?: string;
  description?: string;
  paymentMethod: 'card' | 'cash' | 'upi' | 'bank_transfer' | 'crypto' | 'other';
  isRecurring: boolean;
  tags: string[];
  anomalyStatus: IAnomalyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IDashboardSummary {
  totalSpend: number;
  totalTransactions: number;
  avgTransaction: number;
  currentMonth: {
    spend: number;
    transactions: number;
    budget: number;
    budgetRemaining: number;
    budgetUsedPercentage: number;
  };
  anomalies: {
    total: number;
    unreviewed: number;
    totalAnomalyAmount: number;
  };
}

export interface IMonthlyTrend {
  month: string;
  year: number;
  monthIndex: number;
  totalSpend: number;
  normalSpend: number;
  anomalySpend: number;
  anomalyCount: number;
  transactionCount: number;
}

export interface ICategoryBreakdown {
  category: string;
  totalSpend: number;
  count: number;
  anomalyCount: number;
  percentage: number;
}

export interface IEvaluationMetrics {
  userMetrics: {
    totalUserReviewed: number;
    userConfirmedPrecision: number | null;
    hasSufficientUserFeedback: boolean;
  };
  benchmarkMetrics: {
    precision: number;
    recall: number;
    f1Score: number;
    falsePositiveRate: number;
    totalEvaluated: number;
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    isSyntheticBenchmark: boolean;
  };
}
