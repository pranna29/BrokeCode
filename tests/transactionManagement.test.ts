import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES } from '../server/models/Category.js';

describe('BrokeCode Transaction Management & UX Logic', () => {
  describe('Predefined Category Definitions', () => {
    it('Includes all 14 required categories with emojis and colors', () => {
      const expectedCategories = [
        'Food & Dining',
        'Groceries',
        'Transport',
        'Shopping',
        'Education',
        'Rent & Housing',
        'Bills & Utilities',
        'Healthcare',
        'Entertainment',
        'Travel',
        'Personal Care',
        'Gifts',
        'Subscriptions',
        'Other',
      ];

      const categoryNames = DEFAULT_CATEGORIES.map((c) => c.name);
      expectedCategories.forEach((cat) => {
        expect(categoryNames).toContain(cat);
      });

      DEFAULT_CATEGORIES.forEach((cat) => {
        expect(cat.emoji).toBeDefined();
        expect(cat.emoji.length).toBeGreaterThan(0);
        expect(cat.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('Decimal-Safe Monetary Calculations', () => {
    it('Accurately rounds floating point numbers to 2 decimal places without precision loss', () => {
      const amount1 = 19.99;
      const amount2 = 0.01;
      const rawSum = amount1 + amount2; // Standard JS floating point test
      const safeAmount = Math.round(rawSum * 100) / 100;
      expect(safeAmount).toBe(20.0);

      const complexFloat = 42.125;
      const safeComplex = Math.round(complexFloat * 100) / 100;
      expect(safeComplex).toBe(42.13);

      const stringFloat = parseFloat('129.999');
      const rounded = Math.round(stringFloat * 100) / 100;
      expect(rounded).toBe(130.0);
    });
  });

  describe('Receipt Parsing Patterns', () => {
    it('Extracts total amount from receipt text lines', () => {
      const sampleReceipt = `
        WHOLE FOODS MARKET
        STORE #1024
        ORGANIC APPLES     $4.99
        ALMOND MILK        $3.49
        TAX                $0.68
        TOTAL: $9.16
        THANK YOU FOR SHOPPING!
      `;

      const lines = sampleReceipt.split('\n').map((l) => l.trim()).filter(Boolean);
      let detectedAmount = 0;
      const amountRegex = /(?:total|amount\s+due|grand\s+total)[\s:=-]+(?:[₹$€£]\s*)?([0-9]+(?:\.[0-9]{2})?)/i;

      for (const line of lines) {
        const match = line.match(amountRegex);
        if (match && match[1]) {
          detectedAmount = parseFloat(match[1]);
          break;
        }
      }

      expect(detectedAmount).toBe(9.16);
    });

    it('Correctly identifies merchant from first non-generic line', () => {
      const sampleReceipt = `
        TAX INVOICE
        STARBUCKS COFFEE
        RECEIPT #4928
        1 LATTE   ₹280.00
        TOTAL:    ₹280.00
      `;

      const lines = sampleReceipt.split('\n').map((l) => l.trim()).filter(Boolean);
      let merchant = '';
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('tax invoice') || lower.includes('receipt') || lower.includes('bill')) {
          continue;
        }
        merchant = line;
        break;
      }

      expect(merchant).toBe('STARBUCKS COFFEE');
    });
  });

  describe('Custom Transaction Ordering', () => {
    it('Preserves user-defined order array when reordering', () => {
      const initialTransactions = [
        { _id: 'tx-1', amount: 50, date: '2026-10-01' },
        { _id: 'tx-2', amount: 150, date: '2026-10-02' },
        { _id: 'tx-3', amount: 25, date: '2026-10-03' },
      ];

      // Reorder tx-3 to first position
      const reordered = [initialTransactions[2], initialTransactions[0], initialTransactions[1]];
      const orderedIds = reordered.map((t) => t._id);

      expect(orderedIds).toEqual(['tx-3', 'tx-1', 'tx-2']);
      // Original transaction data remains unchanged
      expect(reordered[0].amount).toBe(25);
      expect(reordered[1].amount).toBe(50);
    });
  });
});
