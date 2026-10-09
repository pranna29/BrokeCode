import { describe, it, expect } from 'vitest';
import { AnomalyDetectorService } from '../server/services/anomalyDetector.js';

describe('BrokeCode Integration & Evaluation Benchmark', () => {
  it('Evaluates measurable metrics on synthetic ground truth benchmarks', () => {
    const predictions = [
      { isAnomaly: true, groundTruthAnomaly: true },
      { isAnomaly: true, groundTruthAnomaly: true },
      { isAnomaly: false, groundTruthAnomaly: false },
      { isAnomaly: false, groundTruthAnomaly: false },
      { isAnomaly: true, groundTruthAnomaly: false }, // FP
      { isAnomaly: false, groundTruthAnomaly: true }, // FN
    ];

    const metrics = AnomalyDetectorService.calculateEvaluationMetrics(predictions);

    expect(metrics.totalEvaluated).toBe(6);
    expect(metrics.truePositives).toBe(2);
    expect(metrics.falsePositives).toBe(1);
    expect(metrics.trueNegatives).toBe(2);
    expect(metrics.falseNegatives).toBe(1);
    expect(metrics.precision).toBeCloseTo(66.7, 0);
    expect(metrics.recall).toBeCloseTo(66.7, 0);
    expect(metrics.f1Score).toBeCloseTo(66.7, 0);
  });

  it('Calculates metrics when no ground truth is available', () => {
    const unlabelled = [{ isAnomaly: true }, { isAnomaly: false }];
    const metrics = AnomalyDetectorService.calculateEvaluationMetrics(unlabelled);
    expect(metrics.totalEvaluated).toBe(0);
    expect(metrics.f1Score).toBe(0);
  });
});
