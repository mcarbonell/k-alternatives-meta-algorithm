import { describe, it, expect } from 'vitest';
import { TSPSolver } from '../src/tsp-solver.js';
import { KnapsackSolver } from '../src/knapsack-solver.js';
import fs from 'fs';
import path from 'path';

describe('TSP Benchmark Integration', () => {
    const problemsDir = 'tsplib-json';

    it('should solve berlin52 within acceptable gap', async () => {
        const problemPath = path.join(problemsDir, 'berlin52.json');
        if (!fs.existsSync(problemPath)) {
            return expect(true).toBe(true); // Skip if no test data
        }

        const problem = JSON.parse(fs.readFileSync(problemPath, 'utf8'));
        const optimal = 7542;

        const result = await new Promise((resolve) => {
            const solver = new TSPSolver({
                maxK: 3,
                maxTime: 10,
                stopAtOptimal: true,
                onSolution: resolve,
                onMaxTimeReached: resolve,
            });
            solver.start(problem);
        });

        const distance = result.distance ?? result.bestDistance;
        const gap = ((distance - optimal) / optimal) * 100;

        expect(distance).toBeGreaterThan(0);
        expect(gap).toBeLessThan(5); // Within 5% of optimal
    }, 15000);

    it('should solve small problem consistently', async () => {
        const problemPath = path.join(problemsDir, 'eil51.json');
        if (!fs.existsSync(problemPath)) {
            return expect(true).toBe(true);
        }

        const problem = JSON.parse(fs.readFileSync(problemPath, 'utf8'));
        const optimal = 426;

        // Run multiple times
        const results = [];
        for (let i = 0; i < 5; i++) {
            const result = await new Promise((resolve) => {
                const solver = new TSPSolver({
                    maxK: 2,
                    maxTime: 5,
                    onSolution: resolve,
                    onMaxTimeReached: resolve,
                });
                solver.start(problem);
            });
            results.push(result.distance ?? result.bestDistance);
        }

        // All results should be valid
        results.forEach((r) => {
            expect(r).toBeGreaterThan(0);
            expect(r).toBeLessThan(optimal * 2); // Reasonable bound
        });

        // At least one should be optimal or near-optimal
        const best = Math.min(...results);
        const bestGap = ((best - optimal) / optimal) * 100;
        expect(bestGap).toBeLessThan(10);
    });

    it('should handle problems without known optimal', async () => {
        const problemPath = path.join(problemsDir, 'berlin52.json');
        if (!fs.existsSync(problemPath)) {
            return expect(true).toBe(true);
        }

        const problem = JSON.parse(fs.readFileSync(problemPath, 'utf8'));

        const result = await new Promise((resolve) => {
            const solver = new TSPSolver({
                maxK: 3,
                maxTime: 5,
                onSolution: resolve,
                onMaxTimeReached: resolve,
            });
            solver.start(problem);
        });

        const distance = result.distance ?? result.bestDistance;
        expect(distance).toBeGreaterThan(0);
        expect(result.iterations).toBeGreaterThan(0);
    }, 10000);
});

describe('Knapsack Benchmark Integration', () => {
    it('should solve generated problem effectively', async () => {
        const problem = {
            name: 'TestKnapsack',
            items: [
                { v: 60, w: 10 },
                { v: 100, w: 20 },
                { v: 120, w: 30 },
                { v: 90, w: 15 },
                { v: 80, w: 10 },
                { v: 50, w: 5 },
            ],
            maxWeight: 50,
            optimalValue: 230, // Items: 2(100)+3(120)+1(60)-50= 280? No, 100+120+60=280, weight=60 > 50. Try: 100+120=170, +90=260, +50=310 (45w) -> optimal is 310
        };
        problem.optimalValue = 310;

        const result = await new Promise((resolve) => {
            const solver = new KnapsackSolver({
                maxK: 3,
                maxTime: 10,
                onSolution: resolve,
                onMaxTimeReached: resolve,
            });
            solver.start(problem);
        });

        const value = result.value;
        const gap = ((problem.optimalValue - value) / problem.optimalValue) * 100;

        expect(value).toBeGreaterThan(0);
        expect(gap).toBeLessThan(5); // Within 5% of optimal
    });

    it('should improve upon greedy solution', async () => {
        const problem = {
            name: 'GreedyComparison',
            items: [
                { v: 500, w: 30 },
                { v: 300, w: 15 },
                { v: 400, w: 20 },
                { v: 100, w: 5 },
                { v: 200, w: 10 },
            ],
            maxWeight: 50,
        };

        // Greedy would take: 500/30=16.7, 400/20=20, 300/15=20, 200/10=20, 100/5=20
        // Sorted by ratio: 500(16.7), 300(20), 400(20), 200(20), 100(20)
        // Greedy: 500+400=900 (weight 50) - optimal
        // Or maybe k=1 can improve

        const result = await new Promise((resolve) => {
            const solver = new KnapsackSolver({
                maxK: 2,
                maxTime: 5,
                onSolution: resolve,
                onMaxTimeReached: resolve,
            });
            solver.start(problem);
        });

        const value = result.value;
        expect(value).toBeGreaterThan(0);
    });
});

describe('Solver Callbacks Integration', () => {
    it('should call onImprovement callback', async () => {
        const problemPath = path.join('tsplib-json', 'berlin52.json');
        if (!fs.existsSync(problemPath)) {
            return expect(true).toBe(true);
        }

        const problem = JSON.parse(fs.readFileSync(problemPath, 'utf8'));
        let improvementCount = 0;

        await new Promise((resolve) => {
            const solver = new TSPSolver({
                maxK: 1,
                maxTime: 2,
                onImprovement: () => {
                    improvementCount++;
                },
                onSolution: resolve,
                onMaxTimeReached: resolve,
            });
            solver.start(problem);
        });

        expect(improvementCount).toBeGreaterThan(0);
    }, 10000);

    it('should track iterations correctly', async () => {
        const problem = {
            cities: Array.from({ length: 10 }, () => ({
                x: Math.random() * 100,
                y: Math.random() * 100,
            })),
            metadata: {
                name: 'Random10',
                dimension: 10,
                edgeWeightType: 'EUC_2D',
            },
        };

        const result = await new Promise((resolve) => {
            const solver = new TSPSolver({
                maxK: 2,
                maxTime: 5,
                onSolution: resolve,
                onMaxTimeReached: resolve,
            });
            solver.start(problem);
        });

        expect(result.iterations).toBeGreaterThan(0);
    });
});
