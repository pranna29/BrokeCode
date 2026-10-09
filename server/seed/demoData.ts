import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { AnomalyDetectorService } from '../services/anomalyDetector.js';

interface SeedTransactionItem {
  merchant: string;
  category: string;
  amount: number;
  days: number;
  hour?: number;
  description?: string;
  isRecurring?: boolean;
}

export async function seedDemoTransactions(userId: string | mongoose.Types.ObjectId): Promise<{ count: number; anomaliesCount: number }> {
  // Clear any existing demo transactions for this user first
  await Expense.deleteMany({ userId });

  const now = new Date();
  const daysAgo = (d: number, hour = 12) => {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    return date;
  };

  // Base normal transactions designed to build realistic student spending baselines
  const baseItems: SeedTransactionItem[] = [
    // Groceries (typical $25 - $55)
    { merchant: 'Trader Joe\'s', category: 'Groceries', amount: 38.5, days: 30 },
    { merchant: 'Campus Market', category: 'Groceries', amount: 22.1, days: 28 },
    { merchant: 'Whole Foods', category: 'Groceries', amount: 48.0, days: 25 },
    { merchant: 'Trader Joe\'s', category: 'Groceries', amount: 34.2, days: 21 },
    { merchant: 'Safeway', category: 'Groceries', amount: 41.6, days: 17 },
    { merchant: 'Campus Market', category: 'Groceries', amount: 19.5, days: 14 },
    { merchant: 'Trader Joe\'s', category: 'Groceries', amount: 36.8, days: 10 },
    { merchant: 'Safeway', category: 'Groceries', amount: 44.0, days: 6 },
    { merchant: 'Campus Market', category: 'Groceries', amount: 27.5, days: 2 },

    // Dining & Food (typical $9 - $18)
    { merchant: 'Campus Cafeteria', category: 'Dining & Food', amount: 11.5, days: 29 },
    { merchant: 'Chipotle', category: 'Dining & Food', amount: 14.8, days: 27 },
    { merchant: 'Starbucks', category: 'Dining & Food', amount: 6.75, days: 26 },
    { merchant: 'Subway', category: 'Dining & Food', amount: 10.2, days: 24 },
    { merchant: 'Campus Cafeteria', category: 'Dining & Food', amount: 12.0, days: 22 },
    { merchant: 'Panda Express', category: 'Dining & Food', amount: 13.4, days: 20 },
    { merchant: 'Starbucks', category: 'Dining & Food', amount: 7.25, days: 18 },
    { merchant: 'Campus Cafeteria', category: 'Dining & Food', amount: 11.0, days: 16 },
    { merchant: 'Chipotle', category: 'Dining & Food', amount: 15.2, days: 13 },
    { merchant: 'Boba Guys', category: 'Dining & Food', amount: 8.5, days: 11 },
    { merchant: 'Campus Cafeteria', category: 'Dining & Food', amount: 12.5, days: 8 },
    { merchant: 'In-N-Out Burger', category: 'Dining & Food', amount: 11.8, days: 5 },
    { merchant: 'Starbucks', category: 'Dining & Food', amount: 6.9, days: 3 },
    { merchant: 'Campus Cafeteria', category: 'Dining & Food', amount: 10.5, days: 1 },

    // Transportation (typical $2.75 - $15)
    { merchant: 'Metro Transit', category: 'Transportation', amount: 2.75, days: 28 },
    { merchant: 'Metro Transit', category: 'Transportation', amount: 2.75, days: 26 },
    { merchant: 'Lyft', category: 'Transportation', amount: 14.2, days: 22 },
    { merchant: 'Metro Transit', category: 'Transportation', amount: 2.75, days: 19 },
    { merchant: 'Metro Transit', category: 'Transportation', amount: 2.75, days: 15 },
    { merchant: 'Uber', category: 'Transportation', amount: 16.5, days: 12 },
    { merchant: 'Metro Transit', category: 'Transportation', amount: 2.75, days: 9 },
    { merchant: 'Metro Transit', category: 'Transportation', amount: 2.75, days: 4 },

    // Subscriptions & Tech (typical $6 - $15)
    { merchant: 'Spotify Student', category: 'Subscriptions & Tech', amount: 5.99, days: 27, isRecurring: true },
    { merchant: 'GitHub Copilot', category: 'Subscriptions & Tech', amount: 10.0, days: 25, isRecurring: true },
    { merchant: 'Notion Plus', category: 'Subscriptions & Tech', amount: 8.0, days: 20, isRecurring: true },
    { merchant: 'iCloud 200GB', category: 'Subscriptions & Tech', amount: 2.99, days: 14, isRecurring: true },

    // Education & Supplies (typical $15 - $35)
    { merchant: 'Campus Bookstore', category: 'Education', amount: 24.5, days: 27 },
    { merchant: 'Chegg Study', category: 'Education', amount: 15.95, days: 23 },
    { merchant: 'Staples Stationery', category: 'Education', amount: 18.2, days: 19 },
    { merchant: 'Library Printing', category: 'Education', amount: 4.5, days: 11 },

    // Entertainment (typical $12 - $25)
    { merchant: 'AMC Theatres', category: 'Entertainment', amount: 16.5, days: 24 },
    { merchant: 'Steam Game Store', category: 'Entertainment', amount: 19.99, days: 16 },
    { merchant: 'Bowling Alley', category: 'Entertainment', amount: 22.0, days: 7 },
  ];

  // Intentional Anomaly test items
  const anomaliesToInject: SeedTransactionItem[] = [
    {
      merchant: 'VIP Nightclub & Lounge',
      category: 'Dining & Food',
      amount: 195.0,
      days: 4,
      description: 'End-of-term celebration tab (Huge spike vs $12 dining median)',
    },
    {
      merchant: 'University Bookstore',
      category: 'Education',
      amount: 385.0,
      days: 8,
      description: 'Hardcover Organic Chemistry textbook & lab kit bundle',
    },
    {
      merchant: 'AWS Cloud Hosting',
      category: 'Subscriptions & Tech',
      amount: 182.4,
      days: 3,
      description: 'Accidental GPU instance left running over the weekend',
    },
    {
      merchant: 'Luxury Sneaker Depot',
      category: 'Shopping',
      amount: 230.0,
      days: 15,
      description: 'Limited edition high-top kicks',
    },
    // Burst frequency anomalies at same merchant on same day
    {
      merchant: 'Uber',
      category: 'Transportation',
      amount: 46.5,
      days: 2,
      hour: 22,
      description: 'Surge ride across town in rain',
    },
    {
      merchant: 'Uber',
      category: 'Transportation',
      amount: 52.0,
      days: 2,
      hour: 23,
      description: 'Second ride home after party (frequency burst)',
    },
  ];

  const allItemsToProcess = [
    ...baseItems.map((b) => ({ ...b, date: daysAgo(b.days) })),
    ...anomaliesToInject.map((a) => ({ ...a, date: daysAgo(a.days, a.hour || 14) })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const docsToInsert: any[] = [];
  const historyBuffer: any[] = [];
  let anomaliesCount = 0;

  for (const item of allItemsToProcess) {
    const anomalyStatus = AnomalyDetectorService.evaluateTransaction({
      targetAmount: item.amount,
      category: item.category,
      merchant: item.merchant,
      date: item.date,
      historicalExpenses: historyBuffer,
      sensitivity: 'medium',
      minHistoryCount: 4,
    });

    if (anomalyStatus.isAnomaly) {
      anomaliesCount++;
    }

    const doc = {
      userId,
      amount: item.amount,
      currency: 'USD',
      date: item.date,
      merchant: item.merchant,
      category: item.category,
      subcategory: '',
      description: item.description || '',
      paymentMethod: 'card',
      isRecurring: Boolean(item.isRecurring),
      tags: item.isRecurring ? ['subscription'] : ['college', 'demo'],
      anomalyStatus,
    };

    docsToInsert.push(doc);
    historyBuffer.push(doc);
  }

  await Expense.insertMany(docsToInsert);
  return { count: docsToInsert.length, anomaliesCount };
}
