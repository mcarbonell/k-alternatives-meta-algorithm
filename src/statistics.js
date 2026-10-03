/**
 * Rigorous Statistical Inference and Complexity Analysis
 *
 * Implements:
 * - Descriptive statistics (mean, variance, standard deviation, standard error)
 * - Two-sided Confidence Intervals (t-Student and Normal)
 * - Welch's Two-Sample t-Test (unequal variances, Welch-Satterthwaite df)
 * - Mann-Whitney U Test (non-parametric rank-sum with tie handling)
 * - Holm-Bonferroni step-down correction for Family-Wise Error Rate (FWER)
 * - Theoretical branch-and-bound node complexity bounds & pruning ratios
 *
 * @author Mario Raúl Carbonell Martínez
 */

/**
 * Standard Normal CDF approximation (Abramowitz & Stegun 26.2.17).
 * Absolute error < 7.5e-8.
 * @param {number} z
 * @returns {number} Probability P(Z <= z)
 */
export function normalCDF(z) {
    if (z < -8.0) return 0.0;
    if (z > 8.0) return 1.0;

    const isNegative = z < 0;
    const x = Math.abs(z);

    const p = 0.2316419;
    const b1 = 0.31938153;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;

    const t = 1.0 / (1.0 + p * x);
    const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
    const phi = (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
    const cdf = 1.0 - phi * poly;

    return isNegative ? 1.0 - cdf : cdf;
}

/**
 * Student's t critical values for two-tailed alpha=0.05 (95% CI).
 */
const T_CRITICAL_95 = [
    0, // 0 df (unused)
    12.706,
    4.303,
    3.182,
    2.776,
    2.571,
    2.447,
    2.365,
    2.306,
    2.262,
    2.228,
    2.201,
    2.179,
    2.16,
    2.145,
    2.131,
    2.12,
    2.11,
    2.101,
    2.093,
    2.086,
    2.08,
    2.074,
    2.069,
    2.064,
    2.06,
    2.056,
    2.052,
    2.048,
    2.045,
    2.042,
];

/**
 * Returns two-tailed t critical value for 95% confidence level.
 * @param {number} df - Degrees of freedom
 * @returns {number}
 */
export function getTCritical95(df) {
    const roundDf = Math.max(1, Math.round(df));
    if (roundDf <= 30) {
        return T_CRITICAL_95[roundDf];
    }
    // Asymptotic expansion for df > 30 towards z=1.95996
    return 1.95996 + 2.372 / roundDf + 2.82 / (roundDf * roundDf);
}

/**
 * Approximates two-tailed p-value for Student's t distribution.
 * Uses Hill's approximation (accurate to < 1e-4 for all df >= 1).
 * @param {number} tVal - Observed t value
 * @param {number} df - Degrees of freedom
 * @returns {number} Two-tailed p-value in [0, 1]
 */
export function studentTPValue(tVal, df) {
    const t = Math.abs(tVal);
    if (df <= 0) return 1.0;
    if (t === 0) return 1.0;

    // For large df, converges to standard normal
    if (df > 120) {
        const pOneTail = 1.0 - normalCDF(t);
        return Math.min(1.0, Math.max(0.0, 2.0 * pOneTail));
    }

    // Cornish-Fisher expansion for t distribution to equivalent normal Z
    const a = df - 0.5;
    const b = 48 * a * a;
    const z2 = a * Math.log(1.0 + (t * t) / df);
    const z = Math.sqrt(Math.max(0, z2));
    const term = (((-0.4 * z2 - 3.3) * z2 - 24.0) * z2 - 85.5) / (b * 10.0 + z2 * 3.0);
    const zApprox = z + (z * (z * z + 3.0)) / (b * 0.25) + term;

    const pOneTail = 1.0 - normalCDF(zApprox);
    return Math.min(1.0, Math.max(0.0, 2.0 * pOneTail));
}

/**
 * Calculates sample mean.
 * @param {Array<number>} values
 * @returns {number}
 */
export function mean(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculates sample variance (unbiased, denominator n - 1).
 * @param {Array<number>} values
 * @returns {number}
 */
export function variance(values) {
    if (!values || values.length <= 1) return 0;
    const avg = mean(values);
    return values.reduce((sum, v) => sum + (v - avg) * (v - avg), 0) / (values.length - 1);
}

/**
 * Calculates sample standard deviation.
 * @param {Array<number>} values
 * @returns {number}
 */
export function standardDeviation(values) {
    return Math.sqrt(variance(values));
}

/**
 * Calculates standard error of the mean (SE = s / sqrt(n)).
 * @param {Array<number>} values
 * @returns {number}
 */
export function standardError(values) {
    if (!values || values.length <= 1) return 0;
    return standardDeviation(values) / Math.sqrt(values.length);
}

/**
 * Computes 95% Confidence Interval for the mean.
 * @param {Array<number>} values
 * @param {number} [confidence=0.95]
 * @returns {Object} { mean, se, moe, ciLow, ciHigh, n }
 */
export function confidenceInterval(values, confidence = 0.95) {
    const n = values.length;
    if (n === 0) {
        return { mean: 0, se: 0, moe: 0, ciLow: 0, ciHigh: 0, n: 0 };
    }
    if (n === 1) {
        return { mean: values[0], se: 0, moe: 0, ciLow: values[0], ciHigh: values[0], n: 1 };
    }

    const avg = mean(values);
    const se = standardError(values);
    const df = n - 1;
    const crit = confidence === 0.95 ? getTCritical95(df) : 1.96;
    const moe = crit * se;

    return {
        mean: avg,
        se,
        moe,
        ciLow: avg - moe,
        ciHigh: avg + moe,
        n,
    };
}

/**
 * Performs Welch's two-sample t-test (does not assume equal variances).
 * @param {Array<number>} sampleA - First sample (e.g. k-Alternatives)
 * @param {Array<number>} sampleB - Second sample (e.g. Baseline)
 * @returns {Object} { t, df, pValue, meanDiff, cohenD, significant }
 */
export function welchTTest(sampleA, sampleB) {
    const n1 = sampleA.length;
    const n2 = sampleB.length;
    if (n1 < 2 || n2 < 2) {
        return { t: 0, df: 1, pValue: 1.0, meanDiff: 0, cohenD: 0, significant: false };
    }

    const m1 = mean(sampleA);
    const m2 = mean(sampleB);
    const v1 = variance(sampleA);
    const v2 = variance(sampleB);

    const se1 = v1 / n1;
    const se2 = v2 / n2;
    const seDiff = Math.sqrt(se1 + se2);

    if (seDiff === 0) {
        return {
            t: 0,
            df: n1 + n2 - 2,
            pValue: m1 === m2 ? 1.0 : 0.0,
            meanDiff: m1 - m2,
            cohenD: 0,
            significant: m1 !== m2,
        };
    }

    const t = (m1 - m2) / seDiff;

    // Welch-Satterthwaite degrees of freedom
    const dfNumerator = (se1 + se2) * (se1 + se2);
    const dfDenominator = (se1 * se1) / (n1 - 1) + (se2 * se2) / (n2 - 1);
    const df = Math.max(1, dfNumerator / dfDenominator);

    const pValue = studentTPValue(t, df);

    // Cohen's d effect size using pooled standard deviation
    const pooledStd = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
    const cohenD = pooledStd > 0 ? (m1 - m2) / pooledStd : 0;

    return {
        t,
        df,
        pValue,
        meanDiff: m1 - m2,
        cohenD,
        significant: pValue < 0.05,
    };
}

/**
 * Performs Mann-Whitney U test (non-parametric test of stochastic dominance).
 * @param {Array<number>} sampleA
 * @param {Array<number>} sampleB
 * @returns {Object} { u, z, pValue, significant }
 */
export function mannWhitneyUTest(sampleA, sampleB) {
    const n1 = sampleA.length;
    const n2 = sampleB.length;
    if (n1 === 0 || n2 === 0) {
        return { u: 0, z: 0, pValue: 1.0, significant: false };
    }

    // Combine and label elements
    const combined = [];
    for (let i = 0; i < n1; i++) combined.push({ val: sampleA[i], group: 'A' });
    for (let i = 0; i < n2; i++) combined.push({ val: sampleB[i], group: 'B' });

    combined.sort((a, b) => a.val - b.val);

    // Assign fractional ranks for ties
    const ranksA = [];
    let i = 0;
    while (i < combined.length) {
        let j = i;
        while (j < combined.length - 1 && combined[j + 1].val === combined[j].val) {
            j++;
        }
        const avgRank = (i + 1 + j + 1) / 2;
        for (let k = i; k <= j; k++) {
            if (combined[k].group === 'A') {
                ranksA.push(avgRank);
            }
        }
        i = j + 1;
    }

    const rankSumA = ranksA.reduce((sum, r) => sum + r, 0);
    const u1 = rankSumA - (n1 * (n1 + 1)) / 2;
    const u2 = n1 * n2 - u1;
    const u = Math.min(u1, u2);

    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);

    if (stdU === 0) {
        return { u, z: 0, pValue: 1.0, significant: false };
    }

    // Continuity correction
    const z = Math.abs(u - meanU) - 0.5 > 0 ? (Math.abs(u - meanU) - 0.5) / stdU : 0;
    const pValue = Math.min(1.0, Math.max(0.0, 2.0 * (1.0 - normalCDF(z))));

    return {
        u,
        z,
        pValue,
        significant: pValue < 0.05,
    };
}

/**
 * Applies Holm-Bonferroni correction to control Family-Wise Error Rate (FWER).
 * @param {Array<{ id: string, pValue: number }>} testResults
 * @param {number} [alpha=0.05]
 * @returns {Array<Object>} Sorted list of results with adjusted thresholds and rejection decisions
 */
export function holmBonferroniCorrection(testResults, alpha = 0.05) {
    const m = testResults.length;
    if (m === 0) return [];

    // Sort by ascending p-value
    const sorted = [...testResults]
        .map((t, idx) => ({ ...t, originalIndex: idx }))
        .sort((a, b) => a.pValue - b.pValue);

    let stopRejecting = false;
    const corrected = [];

    for (let k = 0; k < m; k++) {
        const threshold = alpha / (m - k);
        const canReject = !stopRejecting && sorted[k].pValue <= threshold;
        if (!canReject) {
            stopRejecting = true;
        }

        corrected.push({
            ...sorted[k],
            rank: k + 1,
            thresholdAlpha: threshold,
            rejected: canReject,
        });
    }

    // Restore original order
    return corrected.sort((a, b) => a.originalIndex - b.originalIndex);
}

/**
 * Calculates the theoretical upper bound on unpruned search tree nodes
 * for multi-start LDS with parameter k and candidate list size C.
 *
 * For each starting city, at level k:
 * Bound = sum_{j=0}^k [ binom(N-1, j) * (C-1)^j ]
 * Multiplied by N starting cities.
 *
 * @param {number} n - Number of cities
 * @param {number} k - Discrepancy budget
 * @param {number} [candidateSize=20] - Number of candidate choices
 * @returns {number} Theoretical maximum unpruned nodes
 */
export function theoreticalNodeBound(n, k, candidateSize = 20) {
    if (k === 0) return n * (n - 1);

    const cEff = Math.min(candidateSize, n - 1);
    let totalPerStart = 0;

    // Helper for combinations binom(N-1, j)
    const binom = (N, J) => {
        if (J < 0 || J > N) return 0;
        if (J === 0 || J === N) return 1;
        let res = 1;
        for (let i = 1; i <= J; i++) {
            res = (res * (N - i + 1)) / i;
        }
        return res;
    };

    for (let j = 0; j <= k; j++) {
        const waysToDeviate = binom(n - 1, j);
        const branchChoices = Math.pow(Math.max(1, cEff - 1), j);
        totalPerStart += waysToDeviate * branchChoices;
    }

    return n * totalPerStart;
}

/**
 * Calculates the branch-and-bound pruning ratio:
 * Pruning Ratio = 1 - (nodesExpanded / theoreticalBound)
 * @param {number} nodesExpanded
 * @param {number} theoreticalBound
 * @returns {number} Percentage of search tree pruned away (0 - 100%)
 */
export function calculatePruningRatio(nodesExpanded, theoreticalBound) {
    if (theoreticalBound <= 0) return 0;
    const ratio = Math.max(0, 1 - nodesExpanded / theoreticalBound);
    return parseFloat((ratio * 100).toFixed(4));
}
