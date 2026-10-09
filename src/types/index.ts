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

export interface ICategory {
  _id: string;
  userId: string;
  name: string;
  emoji?: string;
  color: string;
  icon: string;
  budget?: number;
  order?: number;
  isDefault: boolean;
}

export interface IPendingTransaction {
  _id: string;
  userId: string;
  rawSms: string;
  amount: number;
  currency: string;
  merchant: string;
  date: string;
  paymentRef?: string;
  paymentMode: string;
  direction: 'debit' | 'credit';
  suggestedCategory: string;
  status: 'pending' | 'added' | 'ignored';
  confidence: number;
  isDuplicateWarning: boolean;
  createdAt: string;
}

export interface IGroupMember {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
}

export interface IGroup {
  _id: string;
  name: string;
  description?: string;
  currency: string;
  creatorId: string;
  inviteCode: string;
  members: IGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface IGroupExpense {
  _id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  date: string;
  category: string;
  splitType: 'equal' | 'exact' | 'percentage';
  splits: Array<{ userId: string; amount: number; percentage?: number }>;
  createdAt: string;
}

export interface ISettlement {
  _id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  date: string;
  notes?: string;
}

export interface IFriendLoan {
  _id: string;
  userId: string;
  friendName: string;
  type: 'lent' | 'borrowed';
  amount: number;
  currency: string;
  date: string;
  notes?: string;
  repayments: Array<{ amount: number; date: string; notes?: string }>;
  status: 'active' | 'settled';
}

export interface ICalendarDay {
  date: string;
  total: number;
  expenseTotal?: number;
  incomeTotal?: number;
  transactions: any[];
  categories: Array<{ name: string; total: number; color: string }>;
  anomalies: any[];
}

export interface ICalendarData {
  year: number;
  month: number;
  totalMonthSpend: number;
  totalMonthIncome?: number;
  netBalance?: number;
  highSpendingThreshold: number;
  days: Record<string, ICalendarDay>;
}

export interface IPeriodReport {
  view: 'weekly' | 'monthly' | 'annual';
  startDate: string;
  endDate: string;
  totalExpenditure: number;
  transactionCount: number;
  avgPerDay: number;
  highestDay: {
    date: string;
    amount: number;
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
    count: number;
    anomalyCount: number;
    percentage: number;
  }>;
  previousPeriod: {
    totalExpenditure: number;
    percentageChange: number;
  };
  budgetUtilization: number | null;
  anomalyCount: number;
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
  type?: 'expense' | 'income';
  paymentMethod: 'card' | 'cash' | 'upi' | 'bank_transfer' | 'crypto' | 'other';
  isRecurring: boolean;
  tags: string[];
  isTransfer?: boolean;
  excludeFromBudget?: boolean;
  sourceRef?: string;
  anomalyStatus: IAnomalyStatus;
  customOrder?: number;
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
