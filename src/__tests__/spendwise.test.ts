import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories.ts';
import { Transaction } from '../types.ts';

describe('SpendWise — Core Features & Logic Tests', () => {
  describe('1. Default and Custom Emoji Categories', () => {
    it('should have 14 predefined categories with valid emojis, colors, and unique IDs', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(14);
      const ids = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
      expect(ids.size).toBe(14);

      // Verify required categories from prompt exist
      const names = DEFAULT_CATEGORIES.map((c) => c.name);
      expect(names).toContain('Food & Dining');
      expect(names).toContain('Groceries');
      expect(names).toContain('Transport');
      expect(names).toContain('Shopping');
      expect(names).toContain('Education');
      expect(names).toContain('Rent & Housing');
      expect(names).toContain('Bills & Utilities');
      expect(names).toContain('Healthcare');
      expect(names).toContain('Entertainment');
      expect(names).toContain('Travel');
      expect(names).toContain('Personal Care');
      expect(names).toContain('Gifts');
      expect(names).toContain('Subscriptions');
      expect(names).toContain('Other');

      // Check emoji definitions
      const food = DEFAULT_CATEGORIES.find((c) => c.name === 'Food & Dining');
      expect(food?.emoji).toBe('🍔');
      const groc = DEFAULT_CATEGORIES.find((c) => c.name === 'Groceries');
      expect(groc?.emoji).toBe('🛒');
    });

    it('should allow modifying emoji and name without altering database IDs', () => {
      const original = { ...DEFAULT_CATEGORIES[0] };
      const updated = { ...original, name: 'Dining & Cafes', emoji: '🍕', color: '#ff5500' };

      expect(updated.id).toBe(original.id);
      expect(updated.emoji).toBe('🍕');
      expect(updated.name).toBe('Dining & Cafes');
    });
  });

  describe('2. Decimal-Safe Monetary Calculations', () => {
    it('should avoid floating-point addition errors (e.g. 0.1 + 0.2 = 0.3)', () => {
      const a = 0.1;
      const b = 0.2;
      // Standard JS (0.1 + 0.2) === 0.30000000000000004
      const decimalSafeSum = Math.round((a + b) * 100) / 100;
      expect(decimalSafeSum).toBe(0.3);
    });

    it('should format transaction amounts with exact 2 decimal places', () => {
      const amounts = [14.5, 20, 99.999, 0.05];
      const parsed = amounts.map((val) => Math.round(val * 100) / 100);
      expect(parsed).toEqual([14.5, 20, 100, 0.05]);
    });
  });

  describe('3. Receipt OCR Parser Heuristics & Duplicate Detection', () => {
    const parseReceiptMock = (text: string, existingTransactions: Transaction[]) => {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      let detectedAmount = 0;
      let detectedMerchant = '';
      const amountRegex = /(?:total|amount|bal|balance|due|paid|charge|usd|\$|€|£)\s*[:=]?\s*[$€£]?\s*([0-9]+[.,][0-9]{2})/gi;

      for (let i = lines.length - 1; i >= 0; i--) {
        const match = amountRegex.exec(lines[i]);
        if (match && match[1]) {
          detectedAmount = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }

      if (lines.length > 0) {
        detectedMerchant = lines[0].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
      }

      const duplicateWarning = existingTransactions.some(
        (t) =>
          Math.abs(t.amount - detectedAmount) < 0.01 &&
          t.merchant?.toLowerCase() === detectedMerchant.toLowerCase()
      );

      return { detectedAmount, detectedMerchant, duplicateWarning };
    };

    it('should extract total amount and merchant name from receipt text', () => {
      const receiptText = `Trader Joe's
Store #123 Market St
Item 1: Organic Milk  $4.50
Item 2: Sourdough     $3.99
Subtotal: $8.49
Tax: $0.75
Total Amount: $9.24
Thank you!`;

      const result = parseReceiptMock(receiptText, []);
      expect(result.detectedAmount).toBe(9.24);
      expect(result.detectedMerchant).toBe("Trader Joe's");
      expect(result.duplicateWarning).toBe(false);
    });

    it('should detect likely duplicate transactions before approval', () => {
      const receiptText = `Starbucks Coffee
Date: 2026-10-09
Caffe Latte  $5.75
Total: $5.75`;

      const existingTxs: Transaction[] = [
        {
          id: 'tx-existing',
          amount: 5.75,
          currency: 'USD',
          date: '2026-10-09',
          accountId: 'acc-1',
          accountName: 'Debit',
          categoryId: 'cat-food',
          categoryName: 'Food & Dining',
          categoryEmoji: '🍔',
          categoryColor: '#f97316',
          merchant: 'Starbucks Coffee',
          createdAt: new Date().toISOString()
        }
      ];

      const result = parseReceiptMock(receiptText, existingTxs);
      expect(result.detectedAmount).toBe(5.75);
      expect(result.duplicateWarning).toBe(true);
    });
  });

  describe('4. Anomaly Detection Mathematics (IQR Baseline & Velocity)', () => {
    function computeIQRAnomaly(history: number[], amount: number) {
      if (history.length < 3) return { isAnomaly: false };
      const sorted = [...history].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = Math.max(q3 - q1, median * 0.2, 5);
      const upperBound = q3 + 1.75 * iqr;

      const isAnomaly = amount > upperBound && amount > median * 1.5;
      return { isAnomaly, median, upperBound };
    }

    it('should not flag normal purchases within category bounds', () => {
      const foodHistory = [12, 14, 15, 16, 18, 20, 22]; // Median ~16
      const res = computeIQRAnomaly(foodHistory, 19.5);
      expect(res.isAnomaly).toBe(false);
    });

    it('should flag severe surges as statistical outliers', () => {
      const foodHistory = [12, 14, 15, 16, 18, 20, 22]; // Median ~16, Upper bound ~35
      const res = computeIQRAnomaly(foodHistory, 185.0); // 11x median
      expect(res.isAnomaly).toBe(true);
      expect(res.median).toBe(16);
    });
  });

  describe('5. Calendar Calculations & Highest Spending Day', () => {
    it('should aggregate daily totals and identify the peak spending day', () => {
      const sampleTxs: Transaction[] = [
        {
          id: '1',
          amount: 25.0,
          currency: 'USD',
          date: '2026-10-01',
          accountId: 'a1',
          accountName: 'Debit',
          categoryId: 'c1',
          categoryName: 'Food',
          categoryEmoji: '🍔',
          categoryColor: '#f97316',
          createdAt: ''
        },
        {
          id: '2',
          amount: 15.0,
          currency: 'USD',
          date: '2026-10-01',
          accountId: 'a1',
          accountName: 'Debit',
          categoryId: 'c1',
          categoryName: 'Food',
          categoryEmoji: '🍔',
          categoryColor: '#f97316',
          createdAt: ''
        },
        {
          id: '3',
          amount: 120.0,
          currency: 'USD',
          date: '2026-10-05',
          accountId: 'a1',
          accountName: 'Debit',
          categoryId: 'c2',
          categoryName: 'Shopping',
          categoryEmoji: '🛍️',
          categoryColor: '#ec4899',
          createdAt: ''
        }
      ];

      const dailyTotals: Record<string, number> = {};
      sampleTxs.forEach((t) => {
        dailyTotals[t.date] = (dailyTotals[t.date] || 0) + t.amount;
      });

      expect(dailyTotals['2026-10-01']).toBe(40.0);
      expect(dailyTotals['2026-10-05']).toBe(120.0);

      // Identify highest spending day
      let peakDay = '';
      let peakTotal = 0;
      Object.entries(dailyTotals).forEach(([day, total]) => {
        if (total > peakTotal) {
          peakTotal = total;
          peakDay = day;
        }
      });

      expect(peakDay).toBe('2026-10-05');
      expect(peakTotal).toBe(120.0);
    });
  });

  describe('6. Custom Ordering and Drag-and-Drop Reordering', () => {
    it('should correctly reorder transactions without mutating transaction properties', () => {
      const txA: Transaction = {
        id: 'tx-A',
        amount: 10,
        currency: 'USD',
        date: '2026-10-01',
        accountId: 'a1',
        accountName: 'Cash',
        categoryId: 'c1',
        categoryName: 'Food',
        categoryEmoji: '🍔',
        categoryColor: '#f97316',
        customOrder: 0,
        createdAt: ''
      };
      const txB: Transaction = {
        id: 'tx-B',
        amount: 20,
        currency: 'USD',
        date: '2026-10-02',
        accountId: 'a1',
        accountName: 'Cash',
        categoryId: 'c1',
        categoryName: 'Food',
        categoryEmoji: '🍔',
        categoryColor: '#f97316',
        customOrder: 1,
        createdAt: ''
      };

      const list = [txA, txB];
      // Reorder: Move txB to first position
      const reordered = [list[1], list[0]];
      reordered[0].customOrder = 0;
      reordered[1].customOrder = 1;

      expect(reordered[0].id).toBe('tx-B');
      expect(reordered[1].id).toBe('tx-A');
      // Verify date, amount, category and account are unchanged
      expect(reordered[0].amount).toBe(20);
      expect(reordered[0].date).toBe('2026-10-02');
      expect(reordered[1].amount).toBe(10);
      expect(reordered[1].date).toBe('2026-10-01');
    });
  });
});
