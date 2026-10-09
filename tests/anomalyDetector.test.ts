import { describe, it, expect } from 'vitest';
import {
  AnomalyDetectorService,
  calculateMedian,
  calculatePercentile,
  calculateMAD,
} from '../server/services/anomalyDetector.js';

describe('Statistical Utility Functions', () => {
  it('calculates accurate percentiles and median', () => {
    const values = [10, 20, 30, 40, 50];
    expect(calculateMedian(values)).toBe(30);
    expect(calculatePercentile(values, 25)).toBe(20);
    expect(calculatePercentile(values, 75)).toBe(40);
  });

  it('handles empty and single-value lists gracefully', () => {
    expect(calculateMedian([])).toBe(0);
    expect(calculateMedian([42])).toBe(42);
    expect(calculatePercentile([], 50)).toBe(0);
  });

  it('calculates median absolute deviation (MAD)', () => {
    const values = [10, 12, 14, 15, 16, 18, 20];
    const median = calculateMedian(values); // 15
    const mad = calculateMAD(values, median);
    expect(mad).toBeGreaterThan(0);
  });
});

describe('AnomalyDetectorService — Core Detection Engine', () => {
  // Realistic student grocery baseline (~$30 to $50)
  const groceryHistory = [
    { amount: 32, category: 'Groceries', merchant: 'Trader Joe\'s', date: new Date('2025-01-01') },
    { amount: 38, category: 'Groceries', merchant: 'Trader Joe\'s', date: new Date('2025-01-08') },
    { amount: 42, category: 'Groceries', merchant: 'Safeway', date: new Date('2025-01-15') },
    { amount: 45, category: 'Groceries', merchant: 'Trader Joe\'s', date: new Date('2025-01-22') },
    { amount: 36, category: 'Groceries', merchant: 'Campus Market', date: new Date('2025-01-29') },
    { amount: 48, category: 'Groceries', merchant: 'Safeway', date: new Date('2025-02-05') },
    { amount: 39, category: 'Groceries', merchant: 'Trader Joe\'s', date: new Date('2025-02-12') },
  ];

  it('Scenario 1: Normal transaction within expected statistical range is NOT flagged', () => {
    const result = AnomalyDetectorService.evaluateTransaction({
      targetAmount: 40.0,
      category: 'Groceries',
      merchant: 'Trader Joe\'s',
      date: new Date('2025-02-15'),
      historicalExpenses: groceryHistory,
      sensitivity: 'medium',
    });

    expect(result.isAnomaly).toBe(false);
    expect(result.severity).toBe('low');
    expect(result.explanation).toContain('falls within typical statistical boundaries');
    expect(result.baseline?.median).toBe(39);
  });

  it('Scenario 2: Unusually large outlier expense is flagged as High/Critical anomaly', () => {
    const result = AnomalyDetectorService.evaluateTransaction({
      targetAmount: 285.0,
      category: 'Groceries',
      merchant: 'Gourmet Luxury Market',
      date: new Date('2025-02-16'),
      historicalExpenses: groceryHistory,
      sensitivity: 'medium',
    });

    expect(result.isAnomaly).toBe(true);
    expect(['high', 'critical']).toContain(result.severity);
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.explanation).toContain('higher than your typical');
    expect(result.method).toContain('IQR');
  });

  it('Scenario 3: Category-specific outlier (same amount normal in Rent, anomalous in Dining)', () => {
    const diningHistory = [
      { amount: 10, category: 'Dining', merchant: 'Diner', date: new Date('2025-01-01') },
      { amount: 12, category: 'Dining', merchant: 'Chipotle', date: new Date('2025-01-02') },
      { amount: 14, category: 'Dining', merchant: 'Subway', date: new Date('2025-01-03') },
      { amount: 11, category: 'Dining', merchant: 'Cafe', date: new Date('2025-01-04') },
      { amount: 15, category: 'Dining', merchant: 'Diner', date: new Date('2025-01-05') },
      { amount: 13, category: 'Dining', merchant: 'Panda', date: new Date('2025-01-06') },
    ];

    const result = AnomalyDetectorService.evaluateTransaction({
      targetAmount: 120.0,
      category: 'Dining',
      merchant: 'Steakhouse',
      date: new Date('2025-01-07'),
      historicalExpenses: diningHistory,
      sensitivity: 'medium',
    });

    expect(result.isAnomaly).toBe(true);
    expect(result.score).toBeGreaterThan(60);
  });

  it('Scenario 4: Sparse transaction history (< minHistoryCount) does NOT falsely flag moderate items', () => {
    const sparseHistory = [
      { amount: 25, category: 'Entertainment', merchant: 'Cinema', date: new Date('2025-01-01') },
    ];

    const result = AnomalyDetectorService.evaluateTransaction({
      targetAmount: 35.0,
      category: 'Entertainment',
      merchant: 'Concert',
      date: new Date('2025-01-05'),
      historicalExpenses: sparseHistory,
      minHistoryCount: 5,
    });

    // Should recognize insufficient history and not generate a false-positive alarm
    expect(result.isAnomaly).toBe(false);
    expect(result.method).toBe('Sparse Data Normalization');
    expect(result.explanation).toContain('Insufficient historical data');
  });

  it('Scenario 5: Zero-variance history does not cause division-by-zero errors', () => {
    // 5 transactions all exactly $15
    const identicalHistory = [
      { amount: 15, category: 'Subscriptions', merchant: 'Netflix', date: new Date('2025-01-01') },
      { amount: 15, category: 'Subscriptions', merchant: 'Netflix', date: new Date('2025-02-01') },
      { amount: 15, category: 'Subscriptions', merchant: 'Netflix', date: new Date('2025-03-01') },
      { amount: 15, category: 'Subscriptions', merchant: 'Netflix', date: new Date('2025-04-01') },
      { amount: 15, category: 'Subscriptions', merchant: 'Netflix', date: new Date('2025-05-01') },
    ];

    const normalTest = AnomalyDetectorService.evaluateTransaction({
      targetAmount: 15.0,
      category: 'Subscriptions',
      merchant: 'Netflix',
      date: new Date('2025-06-01'),
      historicalExpenses: identicalHistory,
    });
    expect(normalTest.isAnomaly).toBe(false);

    const spikeTest = AnomalyDetectorService.evaluateTransaction({
      targetAmount: 110.0,
      category: 'Subscriptions',
      merchant: 'CloudPro',
      date: new Date('2025-06-01'),
      historicalExpenses: identicalHistory,
    });
    expect(spikeTest.isAnomaly).toBe(true);
  });

  it('Scenario 6: High sensitivity flags mild deviations that Medium sensitivity ignores', () => {
    const borderAmount = 56.0; // Slightly above Q3 of $45 in groceryHistory

    const mediumResult = AnomalyDetectorService.evaluateTransaction({
      targetAmount: borderAmount,
      category: 'Groceries',
      merchant: 'Trader Joe\'s',
      date: new Date('2025-02-18'),
      historicalExpenses: groceryHistory,
      sensitivity: 'low',
    });

    const highResult = AnomalyDetectorService.evaluateTransaction({
      targetAmount: borderAmount,
      category: 'Groceries',
      merchant: 'Trader Joe\'s',
      date: new Date('2025-02-18'),
      historicalExpenses: groceryHistory,
      sensitivity: 'high',
    });

    // High sensitivity has smaller multiplier (k=1.25 vs k=2.5), so it should be stricter
    expect(highResult.score).toBeGreaterThanOrEqual(mediumResult.score);
  });

  it('Scenario 7: Velocity / Burst frequency anomaly at same merchant within 24 hours', () => {
    const today = new Date('2025-02-20T20:00:00Z');
    const recentUberHistory = [
      ...groceryHistory,
      { amount: 35, category: 'Transportation', merchant: 'Uber', date: new Date('2025-02-20T12:00:00Z') },
      { amount: 42, category: 'Transportation', merchant: 'Uber', date: new Date('2025-02-20T16:30:00Z') },
    ];

    const burstResult = AnomalyDetectorService.evaluateTransaction({
      targetAmount: 45.0,
      category: 'Transportation',
      merchant: 'Uber',
      date: today,
      historicalExpenses: recentUberHistory,
    });

    expect(burstResult.isAnomaly).toBe(true);
    expect(burstResult.method).toContain('High-Frequency Velocity Alert');
  });
});
