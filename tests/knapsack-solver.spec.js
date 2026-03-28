import { describe, it, expect } from 'vitest';
import { KnapsackSolver } from '../src/knapsack-solver.js';

describe('KnapsackSolver', () => {
    // --- Full solve tests ---

    it('should solve a simple knapsack problem optimally', async () => {
        const problem = {
            name: 'SimpleKnapsack',
            items: [
                { v: 10, w: 5 }, // 0
                { v: 40, w: 4 }, // 1
                { v: 30, w: 6 }, // 2
                { v: 50, w: 3 }, // 3
            ],
            maxWeight: 15,
            optimalValue: 120,
        };

        const result = await new Promise((resolve) => {
            const solver = new KnapsackSolver({
                maxK: 3,
                stopAtOptimal: true,
            });
            solver.options.onSolution = resolve;
            solver.start(problem);
        });

        expect(result.value).toBe(problem.optimalValue);
    }, 10000);

    // --- Edge cases ---

    it('should handle items heavier than capacity (all skipped)', async () => {
        const problem = {
            name: 'all-too-heavy',
            items: [{ v: 100, w: 50 }],
            maxWeight: 10,
        };

        const result = await new Promise((resolve) => {
            const solver = new KnapsackSolver({ maxK: 0 });
            solver.options.onSolution = resolve;
            solver.start(problem);
        });

        expect(result.value).toBe(0);
    });

    it('should handle single item that fits', async () => {
        const problem = {
            name: 'single-fits',
            items: [{ v: 50, w: 5 }],
            maxWeight: 10,
            optimalValue: 50,
        };

        const result = await new Promise((resolve) => {
            const solver = new KnapsackSolver({ maxK: 0, stopAtOptimal: true });
            solver.options.onSolution = resolve;
            solver.start(problem);
        });

        expect(result.value).toBe(50);
    });

    it('should handle single item that does not fit', async () => {
        const problem = {
            name: 'single-no-fit',
            items: [{ v: 50, w: 20 }],
            maxWeight: 10,
        };

        const result = await new Promise((resolve) => {
            const solver = new KnapsackSolver({ maxK: 0 });
            solver.options.onSolution = resolve;
            solver.start(problem);
        });

        expect(result.value).toBe(0);
    });

    it('should solve with K=0 (pure greedy)', async () => {
        const problem = {
            name: 'greedy-test',
            items: [
                { v: 60, w: 10 }, // ratio: 6
                { v: 100, w: 20 }, // ratio: 5
                { v: 120, w: 30 }, // ratio: 4
            ],
            maxWeight: 30,
            optimalValue: 160, // items 0+1 = 60+100, weight=30
        };

        const result = await new Promise((resolve) => {
            const solver = new KnapsackSolver({ maxK: 0 });
            solver.options.onSolution = resolve;
            solver.start(problem);
        });

        // Greedy by ratio: pick item 0 (60, w=10), then item 1 (100, w=20) = 160
        expect(result.value).toBe(160);
    });

    // --- evaluateSolution / getFinalResult ---

    describe('evaluateSolution', () => {
        it('should return positive value (maximize mode)', () => {
            const solver = new KnapsackSolver();
            solver.items = [
                { v: 10, w: 5, ratio: 2, index: 0 },
                { v: 20, w: 3, ratio: 6.67, index: 1 },
            ];
            solver.maxWeight = 10;

            const val = solver.evaluateSolution([0, 1]);
            // Both items fit: value = 10+20 = 30
            expect(val).toBe(30);
        });

        it('should skip items exceeding capacity', () => {
            const solver = new KnapsackSolver();
            solver.items = [
                { v: 10, w: 5, ratio: 2, index: 0 },
                { v: 20, w: 10, ratio: 2, index: 1 },
            ];
            solver.maxWeight = 5;

            const val = solver.evaluateSolution([0, 1]);
            // Only item 0 fits (w=5 ≤ 5). Item 1 (w=10) exceeds.
            expect(val).toBe(10);
        });
    });

    describe('getFinalResult', () => {
        it('should return positive value field', async () => {
            const problem = {
                name: 'final-result',
                items: [
                    { v: 30, w: 5 },
                    { v: 20, w: 3 },
                ],
                maxWeight: 10,
            };

            const result = await new Promise((resolve) => {
                const solver = new KnapsackSolver({ maxK: 0 });
                solver.options.onSolution = resolve;
                solver.start(problem);
            });

            expect(result.value).toBe(50); // 30+20, both fit
            expect(result.distance).toBe(50);
            expect(result.value).toBeGreaterThan(0); // not negative
        });
    });

    // --- Heuristic ordering ---

    describe('heuristic ordering', () => {
        it('should sort items by value/weight ratio (descending)', async () => {
            const problem = {
                name: 'ratio-order',
                items: [
                    { v: 10, w: 10 }, // ratio: 1
                    { v: 30, w: 5 }, // ratio: 6
                    { v: 20, w: 10 }, // ratio: 2
                ],
                maxWeight: 100,
            };

            const solver = new KnapsackSolver({ maxK: 0 });
            await new Promise((resolve) => {
                solver.options.onSolution = resolve;
                solver.start(problem);
            });

            // globalSortedIndices should be [1, 2, 0] (ratios: 6, 2, 1)
            expect(solver.globalSortedIndices).toEqual([1, 2, 0]);
        });
    });
});
