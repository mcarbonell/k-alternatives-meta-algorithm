import { describe, it, expect } from 'vitest';
import {
    createRNG,
    calculateTourDistance,
    calculateStats,
    nearestNeighborTour,
    runNearestNeighbor,
    runMultiStartNN,
    twoOpt,
    orOpt,
    runMultiStart2Opt,
    runSimulatedAnnealing,
} from '../src/baselines.js';
import { TSPSolver } from '../src/tsp-solver.js';

describe('Baselines Module', () => {
    // 4 cities forming a square of side 10:
    // (0,0), (10,0), (10,10), (0,10)
    // Distance matrix is Euclidean
    const squareCities = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
    ];

    const distEuclidean = (i, j) => {
        const dx = squareCities[i].x - squareCities[j].x;
        const dy = squareCities[i].y - squareCities[j].y;
        return Math.round(Math.sqrt(dx * dx + dy * dy));
    };

    describe('createRNG', () => {
        it('generates reproducible pseudo-random numbers with fixed seed', () => {
            const rng1 = createRNG(42);
            const rng2 = createRNG(42);
            expect(rng1()).toBe(rng2());
            expect(rng1()).toBe(rng2());
        });

        it('falls back to Math.random when seed is null', () => {
            const rng = createRNG(null);
            expect(rng).toBe(Math.random);
        });
    });

    describe('calculateTourDistance', () => {
        it('calculates optimal tour around square correctly', () => {
            const tour = [0, 1, 2, 3];
            const dist = calculateTourDistance(tour, distEuclidean);
            expect(dist).toBe(40);
        });

        it('calculates crossed (sub-optimal) tour correctly', () => {
            const tour = [0, 2, 1, 3];
            // 0->2 (sqrt(200)~14) + 2->1 (10) + 1->3 (sqrt(200)~14) + 3->0 (10) = ~48
            const dist = calculateTourDistance(tour, distEuclidean);
            expect(dist).toBe(48);
        });
    });

    describe('nearestNeighborTour', () => {
        it('produces a valid permutation of cities', () => {
            const tour = nearestNeighborTour(0, 4, distEuclidean);
            expect(tour).toHaveLength(4);
            expect(new Set(tour).size).toBe(4);
        });

        it('solves small convex problem optimally with NN', () => {
            const res = runNearestNeighbor(0, 4, distEuclidean);
            expect(res.distance).toBe(40);
            expect(res.evaluations).toBe(1);
        });
    });

    describe('twoOpt', () => {
        it('untangles crossed tour into optimal tour', () => {
            const crossedTour = [0, 2, 1, 3];
            const res = twoOpt(crossedTour, distEuclidean, { strategy: 'first' });
            expect(res.distance).toBe(40);
            expect(res.distance).toBeLessThan(res.initialDistance);
            expect(res.moves).toBeGreaterThanOrEqual(1);
        });

        it('works with best-improvement strategy', () => {
            const crossedTour = [0, 2, 1, 3];
            const res = twoOpt(crossedTour, distEuclidean, { strategy: 'best' });
            expect(res.distance).toBe(40);
        });

        it('does not worsen an already optimal tour', () => {
            const optimalTour = [0, 1, 2, 3];
            const res = twoOpt(optimalTour, distEuclidean);
            expect(res.distance).toBe(40);
            expect(res.moves).toBe(0);
        });
    });

    describe('orOpt', () => {
        it('improves or maintains tour quality', () => {
            const tour = [0, 2, 1, 3];
            const res = orOpt(tour, distEuclidean);
            expect(res.distance).toBeLessThanOrEqual(res.initialDistance);
        });
    });

    describe('Multi-Start baselines and Seed determinism', () => {
        it('runMultiStartNN is deterministic with fixed seed', () => {
            const res1 = runMultiStartNN(4, distEuclidean, { seed: 12345 });
            const res2 = runMultiStartNN(4, distEuclidean, { seed: 12345 });
            expect(res1.bestDistance).toBe(res2.bestDistance);
            expect(res1.bestTour).toEqual(res2.bestTour);
            expect(res1.stats.mean).toBe(res2.stats.mean);
        });

        it('runMultiStart2Opt produces valid tours and deterministic results', () => {
            const res1 = runMultiStart2Opt(4, distEuclidean, { seed: 42, maxStarts: 4 });
            const res2 = runMultiStart2Opt(4, distEuclidean, { seed: 42, maxStarts: 4 });
            expect(res1.bestDistance).toBe(40);
            expect(res1.bestDistance).toBe(res2.bestDistance);
            expect(res1.bestTour).toEqual(res2.bestTour);
        });

        it('runSimulatedAnnealing explores and returns valid tour', () => {
            const res = runSimulatedAnnealing([0, 2, 1, 3], distEuclidean, {
                seed: 999,
                maxIterations: 100,
            });
            expect(res.bestDistance).toBeLessThanOrEqual(48);
            expect(new Set(res.bestTour).size).toBe(4);
        });
    });

    describe('calculateStats', () => {
        it('calculates mean, median, std, and IQR accurately', () => {
            const sample = [10, 20, 30, 40, 50];
            const stats = calculateStats(sample);
            expect(stats.count).toBe(5);
            expect(stats.min).toBe(10);
            expect(stats.max).toBe(50);
            expect(stats.mean).toBe(30);
            expect(stats.median).toBe(30);
            expect(stats.q25).toBe(20);
            expect(stats.q75).toBe(40);
            expect(stats.iqr).toBe(20);
            expect(stats.std).toBeCloseTo(15.811, 2);
        });

        it('handles empty input gracefully', () => {
            const stats = calculateStats([]);
            expect(stats.count).toBe(0);
            expect(stats.mean).toBe(0);
        });
    });
});

describe('KDeviationOptimizer Ablation Flags', () => {
    const testProblem = {
        metadata: { name: 'pentagon5', edgeWeightType: 'EUC_2D', dimension: 5 },
        cities: [
            { x: 0, y: 0 },
            { x: 10, y: 5 },
            { x: 8, y: 16 },
            { x: -3, y: 14 },
            { x: -7, y: 4 },
        ],
    };

    it('respects learning: false flag without failing', async () => {
        const solver = new TSPSolver({
            maxK: 1,
            learning: false,
            stopAtOptimal: false,
            seed: 42,
        });

        const result = await solver.solveAsync(testProblem);
        expect(result.bestDistance).toBeGreaterThan(0);
        expect(solver.options.learning).toBe(false);
    });

    it('respects multiStart: false flag (evaluates fewer nodes)', async () => {
        const multiSolver = new TSPSolver({
            maxK: 1,
            multiStart: true,
            shuffle: false,
            stopAtOptimal: false,
            seed: 42,
        });
        const singleSolver = new TSPSolver({
            maxK: 1,
            multiStart: false,
            shuffle: false,
            stopAtOptimal: false,
            seed: 42,
        });

        const multiRes = await multiSolver.solveAsync(testProblem);
        const singleRes = await singleSolver.solveAsync(testProblem);

        expect(singleRes.nodesExpanded).toBeLessThan(multiRes.nodesExpanded);
        expect(singleSolver.options.multiStart).toBe(false);
    });

    it('respects adaptiveSchedule: false flag', async () => {
        const solver = new TSPSolver({
            maxK: 1,
            adaptiveSchedule: false,
            stopAtOptimal: false,
            seed: 42,
        });

        const result = await solver.solveAsync(testProblem);
        expect(result.bestDistance).toBeGreaterThan(0);
        expect(solver.options.adaptiveSchedule).toBe(false);
    });
});
