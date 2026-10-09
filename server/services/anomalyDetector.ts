import { IAnomalyStatus, IExpense } from '../models/Expense.js';

export interface AnomalyEvaluationContext {
  targetAmount: number;
  category: string;
  merchant: string;
  date: Date;
  historicalExpenses: Array<{
    _id?: any;
    amount: number;
    category: string;
    merchant: string;
    date: Date | string;
    anomalyStatus?: {
      reviewStatus?: string;
    };
  }>;
  sensitivity?: 'low' | 'medium' | 'high';
  minHistoryCount?: number;
  excludedCategories?: string[];
}

export interface MetricEvaluation {
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
}

// Percentile calculation using linear interpolation
export function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return calculatePercentile(sorted, 50);
}

// Median Absolute Deviation for ultra-robust scale estimation
export function calculateMAD(values: number[], median: number): number {
  if (values.length === 0) return 0;
  const deviations = values.map((v) => Math.abs(v - median));
  return calculateMedian(deviations);
}

export class AnomalyDetectorService {
  /**
   * Evaluates a single transaction against historical baseline data
   */
  public static evaluateTransaction(context: AnomalyEvaluationContext): IAnomalyStatus {
    const {
      targetAmount,
      category,
      merchant,
      date,
      historicalExpenses,
      sensitivity = 'medium',
      minHistoryCount = 5,
      excludedCategories = [],
    } = context;

    // Check if category is explicitly excluded by user
    if (excludedCategories.includes(category)) {
      return {
        isAnomaly: false,
        score: 0,
        severity: 'low',
        method: 'Category Excluded',
        explanation: `Category "${category}" is currently excluded from anomaly detection by user preference.`,
        baseline: {},
        detectedAt: new Date(),
        reviewStatus: 'unreviewed',
      };
    }

    // Filter historical data: consider past transactions, exclude ones user marked as anomalous outliers ifCorrupting
    // We include expected purchases in normal baseline, but filter out transactions that are the exact same record if updating
    const validHistory = historicalExpenses.filter((h) => {
      const amt = Number(h.amount);
      return !isNaN(amt) && amt > 0;
    });

    const categoryHistory = validHistory.filter(
      (h) => h.category.toLowerCase().trim() === category.toLowerCase().trim()
    );

    const categoryAmounts = categoryHistory.map((h) => Number(h.amount)).sort((a, b) => a - b);
    const overallAmounts = validHistory.map((h) => Number(h.amount)).sort((a, b) => a - b);

    const targetDate = new Date(date).getTime();

    // Check recent frequency bursts (same merchant within 24 hours)
    const recentMerchantTransactions = validHistory.filter((h) => {
      const isSameMerchant = h.merchant.toLowerCase().trim() === merchant.toLowerCase().trim();
      const hDate = new Date(h.date).getTime();
      const diffHours = Math.abs(targetDate - hDate) / (1000 * 60 * 60);
      return isSameMerchant && diffHours <= 24;
    });

    // Sensitivity multipliers
    // High sensitivity: k = 1.25 (more sensitive, lower threshold)
    // Medium sensitivity: k = 1.75 (standard robust outlier detector)
    // Low sensitivity: k = 2.5 (flags only large deviations)
    const kMultipliers = {
      low: 2.5,
      medium: 1.75,
      high: 1.25,
    };
    const k = kMultipliers[sensitivity] || 1.75;

    // Check 0: Velocity / Burst frequency at same merchant (2+ transactions within 24h)
    // This is an immediate alert pattern regardless of overall category history
    if (recentMerchantTransactions.length >= 2) {
      const burstScore = Math.min(95, 65 + recentMerchantTransactions.length * 10);
      return {
        isAnomaly: true,
        score: burstScore,
        severity: burstScore >= 80 ? 'critical' : 'high',
        method: 'High-Frequency Velocity Alert',
        explanation: `Rapid consecutive spending detected: ${recentMerchantTransactions.length + 1} transactions recorded at "${merchant}" within 24 hours.`,
        baseline: {
          historicalCount: categoryAmounts.length,
        },
        detectedAt: new Date(),
        reviewStatus: 'unreviewed',
      };
    }

    // Handle Sparse Data (< minHistoryCount)
    if (categoryAmounts.length < minHistoryCount) {
      // Not enough category history. Fall back to user overall spending baseline with caveat
      if (overallAmounts.length >= minHistoryCount) {
        const overallMedian = calculateMedian(overallAmounts);
        const overallQ1 = calculatePercentile(overallAmounts, 25);
        const overallQ3 = calculatePercentile(overallAmounts, 75);
        const overallIQR = Math.max(overallQ3 - overallQ1, overallMedian * 0.3);
        const overallUpper = overallQ3 + (k + 0.5) * overallIQR;

        if (targetAmount > overallUpper && targetAmount > overallMedian * 2.5) {
          const ratio = (targetAmount / (overallMedian || 1)).toFixed(1);
          return {
            isAnomaly: true,
            score: Math.min(85, Math.round(50 + (targetAmount / overallUpper) * 25)),
            severity: targetAmount > overallUpper * 1.5 ? 'high' : 'medium',
            method: 'Cross-Category Baseline (Sparse History)',
            explanation: `Only ${categoryAmounts.length} past record(s) exist for "${category}". However, this $${targetAmount.toFixed(2)} purchase is ${ratio}x higher than your overall spending median ($${overallMedian.toFixed(2)}).`,
            baseline: {
              median: overallMedian,
              iqr: overallIQR,
              q1: overallQ1,
              q3: overallQ3,
              upperBound: Number(overallUpper.toFixed(2)),
              historicalCount: categoryAmounts.length,
              overallMedian,
            },
            detectedAt: new Date(),
            reviewStatus: 'unreviewed',
          };
        }
      }

      // If sparse and not an extreme overall outlier
      return {
        isAnomaly: false,
        score: 10,
        severity: 'low',
        method: 'Sparse Data Normalization',
        explanation: `Insufficient historical data (${categoryAmounts.length}/${minHistoryCount} required transactions) in "${category}" to reliably flag as an anomaly.`,
        baseline: {
          historicalCount: categoryAmounts.length,
        },
        detectedAt: new Date(),
        reviewStatus: 'unreviewed',
      };
    }

    // Category Robust Statistics: Median, Q1, Q3, IQR
    const q1 = calculatePercentile(categoryAmounts, 25);
    const q3 = calculatePercentile(categoryAmounts, 75);
    const median = calculateMedian(categoryAmounts);
    let iqr = q3 - q1;

    // Zero-variance protection: If all transactions in history are identical (e.g. $15, $15, $15)
    // IQR will be 0. Avoid 0 threshold by using MAD or 20% of median.
    if (iqr <= 0) {
      const mad = calculateMAD(categoryAmounts, median);
      iqr = mad > 0 ? mad * 1.4826 : Math.max(median * 0.25, 2.0);
    }

    const upperBound = q3 + k * iqr;
    const lowerBound = Math.max(0, q1 - k * iqr);

    // Merchant specific history
    const merchantHistory = categoryHistory.filter(
      (h) => h.merchant.toLowerCase().trim() === merchant.toLowerCase().trim()
    );
    const merchantAmounts = merchantHistory.map((h) => Number(h.amount));
    const merchantAvg =
      merchantAmounts.length > 0
        ? merchantAmounts.reduce((a, b) => a + b, 0) / merchantAmounts.length
        : 0;

    let anomalyScore = 0;
    let isAnomaly = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let method = 'Robust IQR Category Model';
    let explanation = '';

    // Check 1: Significant Upper Bound Outlier
    if (targetAmount > upperBound) {
      isAnomaly = true;
      const deviationMagnitude = (targetAmount - upperBound) / (iqr || 1);
      anomalyScore = Math.min(98, Math.round(55 + deviationMagnitude * 15));

      const ratio = (targetAmount / (median || 1)).toFixed(1);

      if (anomalyScore >= 85 || targetAmount > upperBound * 2) {
        severity = 'critical';
        method = 'Severe Category Spike (IQR Outlier)';
        explanation = `Extremely high amount: $${targetAmount.toFixed(2)} is ${ratio}x higher than your typical "${category}" median ($${median.toFixed(2)}). Typical expected range is $${q1.toFixed(2)}–$${q3.toFixed(2)} (upper limit: $${upperBound.toFixed(2)}).`;
      } else if (anomalyScore >= 65) {
        severity = 'high';
        method = 'Significant Category Outlier';
        explanation = `Unusually high amount: $${targetAmount.toFixed(2)} exceeds normal spending threshold ($${upperBound.toFixed(2)}) for "${category}". Normal median is $${median.toFixed(2)}.`;
      } else {
        severity = 'medium';
        method = 'Moderate Category Deviation';
        explanation = `Moderately elevated amount: $${targetAmount.toFixed(2)} is above your typical 75th percentile ($${q3.toFixed(2)}) for "${category}".`;
      }
    }

    // Check 2: High Merchant Discrepancy (Known merchant, but transaction is 3x their usual)
    if (merchantAmounts.length >= 3 && targetAmount > merchantAvg * 2.8 && targetAmount > median * 1.5) {
      isAnomaly = true;
      const merchantRatio = (targetAmount / merchantAvg).toFixed(1);
      const spikeScore = Math.min(90, Math.round(60 + (targetAmount / merchantAvg) * 8));

      if (spikeScore > anomalyScore) {
        anomalyScore = spikeScore;
        severity = anomalyScore >= 80 ? 'critical' : 'high';
        method = 'Merchant-Specific Spike';
        explanation = `Unusual bill at "${merchant}": $${targetAmount.toFixed(2)} is ${merchantRatio}x your historical average at this merchant ($${merchantAvg.toFixed(2)} across ${merchantAmounts.length} visits).`;
      }
    }

    // Check 3: Velocity / Burst frequency at same merchant (3+ transactions within 24h)
    if (recentMerchantTransactions.length >= 2) {
      const burstScore = Math.min(92, 60 + recentMerchantTransactions.length * 10);
      if (burstScore > anomalyScore) {
        isAnomaly = true;
        anomalyScore = burstScore;
        severity = anomalyScore >= 80 ? 'critical' : 'high';
        method = 'High-Frequency Velocity Alert';
        explanation = `Rapid consecutive spending detected: ${recentMerchantTransactions.length + 1} transactions recorded at "${merchant}" within 24 hours.`;
      }
    }

    // Normal transaction
    if (!isAnomaly) {
      return {
        isAnomaly: false,
        score: Math.max(5, Math.round((targetAmount / (upperBound || 1)) * 30)),
        severity: 'low',
        method: 'Statistical Baseline',
        explanation: `Transaction of $${targetAmount.toFixed(2)} falls within typical statistical boundaries for "${category}" (median: $${median.toFixed(2)}, normal range: $${q1.toFixed(2)}–$${q3.toFixed(2)}).`,
        baseline: {
          median,
          iqr,
          q1,
          q3,
          lowerBound: Number(lowerBound.toFixed(2)),
          upperBound: Number(upperBound.toFixed(2)),
          historicalCount: categoryAmounts.length,
          merchantAvg: Number(merchantAvg.toFixed(2)),
        },
        detectedAt: new Date(),
        reviewStatus: 'unreviewed',
      };
    }

    return {
      isAnomaly: true,
      score: anomalyScore,
      severity,
      method,
      explanation,
      baseline: {
        median,
        iqr,
        q1,
        q3,
        lowerBound: Number(lowerBound.toFixed(2)),
        upperBound: Number(upperBound.toFixed(2)),
        historicalCount: categoryAmounts.length,
        merchantAvg: Number(merchantAvg.toFixed(2)),
      },
      detectedAt: new Date(),
      reviewStatus: 'unreviewed',
    };
  }

  /**
   * Evaluates performance metrics (Precision, Recall, F1) against synthetic test suite
   */
  public static calculateEvaluationMetrics(
    predictions: Array<{ isAnomaly: boolean; groundTruthAnomaly?: boolean }>
  ): MetricEvaluation {
    const labelled = predictions.filter((p) => p.groundTruthAnomaly !== undefined);

    if (labelled.length === 0) {
      return {
        precision: 0,
        recall: 0,
        f1Score: 0,
        falsePositiveRate: 0,
        totalEvaluated: 0,
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 0,
        isSyntheticBenchmark: false,
      };
    }

    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (const item of labelled) {
      const pred = item.isAnomaly;
      const actual = !!item.groundTruthAnomaly;

      if (pred && actual) tp++;
      else if (pred && !actual) fp++;
      else if (!pred && !actual) tn++;
      else if (!pred && actual) fn++;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const falsePositiveRate = fp + tn > 0 ? fp / (fp + tn) : 0;

    return {
      precision: Number((precision * 100).toFixed(1)),
      recall: Number((recall * 100).toFixed(1)),
      f1Score: Number((f1Score * 100).toFixed(1)),
      falsePositiveRate: Number((falsePositiveRate * 100).toFixed(1)),
      totalEvaluated: labelled.length,
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn,
      isSyntheticBenchmark: true,
    };
  }
}
