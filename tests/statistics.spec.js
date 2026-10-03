import { describe, it, expect } from 'vitest';
import {
    normalCDF,
    getTCritical95,
    studentTPValue,
    mean,
    variance,
    standardDeviation,
    standardError,
    confidenceInterval,
    welchTTest,
    mannWhitneyUTest,
    holmBonferroniCorrection,
    theoreticalNodeBound,
    calculatePruningRatio,
} from '../src/statistics.js';

describe('Statistics Module', () => {
    describe('normalCDF and studentTPValue', () => {
        it('calculates standard normal CDF accurately', () => {
            expect(normalCDF(0)).toBeCloseTo(0.5, 4);
            expect(normalCDF(1.96)).toBeCloseTo(0.975, 3);
            expect(normalCDF(-1.96)).toBeCloseTo(0.025, 3);
        });

        it('returns correct two-tailed p-values for t distribution', () => {
            // At t = 0, p-value is 1.0
            expect(studentTPValue(0, 10)).toBe(1.0);

            // With large t, p-value approaches 0
            expect(studentTPValue(10, 20)).toBeLessThan(0.0001);

            // Critical t for df=20 at alpha=0.05 is ~2.086
            expect(studentTPValue(2.086, 20)).toBeCloseTo(0.05, 2);
        });

        it('returns proper t critical values for 95% CI', () => {
            expect(getTCritical95(1)).toBeCloseTo(12.706, 2);
            expect(getTCritical95(10)).toBeCloseTo(2.228, 2);
            expect(getTCritical95(30)).toBeCloseTo(2.042, 2);
            expect(getTCritical95(100)).toBeCloseTo(1.984, 2);
        });
    });

    describe('Descriptive Statistics', () => {
        const sample = [2, 4, 4, 4, 5, 5, 7, 9];
        // Mean = 40/8 = 5
        // Sum of squares of deviations: (2-5)^2 + 3*(4-5)^2 + 2*(5-5)^2 + (7-5)^2 + (9-5)^2
        // = 9 + 3*1 + 0 + 4 + 16 = 32
        // Unbiased sample variance: 32 / (8 - 1) = 32/7 ~ 4.5714
        // Sample std = sqrt(32/7) ~ 2.138

        it('calculates mean, variance, and standard deviation', () => {
            expect(mean(sample)).toBe(5);
            expect(variance(sample)).toBeCloseTo(32 / 7, 4);
            expect(standardDeviation(sample)).toBeCloseTo(Math.sqrt(32 / 7), 4);
        });

        it('calculates standard error of the mean', () => {
            const expectedSE = Math.sqrt(32 / 7) / Math.sqrt(8);
            expect(standardError(sample)).toBeCloseTo(expectedSE, 4);
        });

        it('handles edge cases gracefully', () => {
            expect(mean([])).toBe(0);
            expect(variance([5])).toBe(0);
            expect(standardDeviation([])).toBe(0);
            expect(standardError([5])).toBe(0);
        });
    });

    describe('Confidence Interval (95% CI)', () => {
        it('calculates 95% CI with t-Student correction for small sample', () => {
            const sample = [10, 12, 11, 13, 12, 14]; // n = 6
            const ci = confidenceInterval(sample, 0.95);

            expect(ci.n).toBe(6);
            expect(ci.mean).toBe(12);
            expect(ci.ciLow).toBeLessThan(ci.mean);
            expect(ci.ciHigh).toBeGreaterThan(ci.mean);
            expect(ci.mean - ci.ciLow).toBeCloseTo(ci.moe, 4);
            expect(ci.ciHigh - ci.mean).toBeCloseTo(ci.moe, 4);
        });
    });

    describe('Hypothesis Testing: Welch t-test & Mann-Whitney U', () => {
        it('detects significant difference between distinct groups', () => {
            const groupA = [10, 11, 12, 10, 11, 12];
            const groupB = [25, 26, 27, 25, 26, 28];

            const tRes = welchTTest(groupA, groupB);
            expect(tRes.significant).toBe(true);
            expect(tRes.pValue).toBeLessThan(0.001);
            expect(tRes.t).toBeLessThan(0);

            const uRes = mannWhitneyUTest(groupA, groupB);
            expect(uRes.significant).toBe(true);
            expect(uRes.pValue).toBeLessThan(0.01);
        });

        it('does not reject null hypothesis for identical distributions', () => {
            const groupA = [50, 52, 51, 49, 50];
            const groupB = [50, 52, 51, 49, 50];

            const tRes = welchTTest(groupA, groupB);
            expect(tRes.significant).toBe(false);
            expect(tRes.pValue).toBeCloseTo(1.0, 1);
        });
    });

    describe('Holm-Bonferroni Correction', () => {
        it('controls family-wise error rate across multiple hypotheses', () => {
            const tests = [
                { id: 'test1', pValue: 0.005 },
                { id: 'test2', pValue: 0.02 },
                { id: 'test3', pValue: 0.06 },
            ];

            const corrected = holmBonferroniCorrection(tests, 0.05);

            // test1: p=0.005 <= 0.05 / 3 (0.0167) -> Reject H0
            // test2: p=0.020 <= 0.05 / 2 (0.0250) -> Reject H0
            // test3: p=0.060 > 0.05 / 1 (0.0500) -> Retain H0
            const t1 = corrected.find((c) => c.id === 'test1');
            const t2 = corrected.find((c) => c.id === 'test2');
            const t3 = corrected.find((c) => c.id === 'test3');

            expect(t1.rejected).toBe(true);
            expect(t2.rejected).toBe(true);
            expect(t3.rejected).toBe(false);
        });
    });

    describe('Theoretical Node Bounds & Pruning Ratios', () => {
        it('calculates unpruned tree bounds and pruning ratio', () => {
            const boundK0 = theoreticalNodeBound(10, 0, 20);
            expect(boundK0).toBe(10 * 9); // 90

            const boundK1 = theoreticalNodeBound(10, 1, 20);
            expect(boundK1).toBeGreaterThan(boundK0);

            const pruning = calculatePruningRatio(150, 1000);
            expect(pruning).toBe(85.0); // 1 - 150/1000 = 85%
        });
    });
});
