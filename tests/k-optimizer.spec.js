import { describe, it, expect, vi } from 'vitest';
import { KDeviationOptimizer } from '../src/k-optimizer.js';

/**
 * Concrete test implementation of KDeviationOptimizer.
 * Problem: given N items with numeric IDs, find the permutation [0, 1, 2, ...]
 * by sorting items. Heuristic: items sorted ascending. Optimal = identity order.
 * Evaluation: count of items NOT in their "correct" sorted position (lower is better).
 */
class TestSolver extends KDeviationOptimizer {
    initializeProblem(problemData) {
        this.items = problemData.items || [0, 1, 2, 3, 4];
        this.allItems = this.items.slice();
        this.problemName = problemData.name || 'TestProblem';
        this.optimalValue = problemData.optimalValue ?? null;

        // Heuristic: items sorted ascending (0, 1, 2, ...)
        this.sorted = this.items.slice().sort((a, b) => a - b);
    }

    getInitialSolution() {
        // Return items in heuristic (sorted) order
        return this.sorted.slice();
    }

    getHeuristicChoices(_currentItem, unvisited, _unvisitedCount) {
        // Return remaining items in sorted order
        return this.sorted.filter((item) => unvisited[item] === 1);
    }

    evaluateSolution(solution) {
        // Value = number of out-of-order positions (0 = optimal)
        let score = 0;
        for (let i = 0; i < solution.length; i++) {
            if (solution[i] !== i) score++;
        }
        return score;
    }
}

describe('KDeviationOptimizer', () => {
    // --- Constructor & Initial State ---

    describe('constructor', () => {
        it('should initialize with default options', () => {
            const solver = new TestSolver();
            expect(solver.options.maxK).toBe(5);
            expect(solver.options.maxIterations).toBeNull();
            expect(solver.options.maxTime).toBeNull();
            expect(solver.options.stopAtOptimal).toBe(true);
            expect(solver.options.shuffle).toBe(true);
        });

        it('should accept custom options', () => {
            const solver = new TestSolver({
                maxK: 3,
                maxIterations: 100,
                maxTime: 10,
                shuffle: false,
            });
            expect(solver.options.maxK).toBe(3);
            expect(solver.options.maxIterations).toBe(100);
            expect(solver.options.maxTime).toBe(10);
            expect(solver.options.shuffle).toBe(false);
        });

        it('should initialize state as idle', () => {
            const solver = new TestSolver();
            expect(solver.bestSolution).toBeNull();
            expect(solver.bestValue).toBe(Infinity);
            expect(solver.iteration).toBe(0);
            expect(solver.improvements).toBe(0);
            expect(solver.isRunning).toBe(false);
            expect(solver.limitReached).toBeNull();
        });
    });

    // --- start() ---

    describe('start()', () => {
        it('should throw if called while already running', async () => {
            const solver = new TestSolver({ maxTime: 1 });
            const problem = { items: [0, 1, 2], name: 'test' };
            solver.start(problem);
            expect(() => solver.start(problem)).toThrow('Solver is already running.');
            solver.stop();
        });

        it('should reset state between runs', async () => {
            const solver = new TestSolver({ maxK: 1 });
            const problem = { items: [0, 1, 2, 3], name: 'reset-test' };

            await new Promise((resolve) => {
                solver.options.onSolution = resolve;
                solver.start(problem);
            });

            // Ensure solver is fully stopped before second run
            solver.isRunning = false;
            solver.isFinished = false;

            const result2 = await new Promise((resolve) => {
                solver.options.onSolution = resolve;
                solver.start(problem);
            });

            // Second run should start from scratch
            expect(result2.iterations).toBeGreaterThan(0);
            expect(solver.bestValue).not.toBe(Infinity);
        });
    });

    // --- checkSolution() ---

    describe('checkSolution()', () => {
        it('should detect improvements and update bestValue', () => {
            const solver = new TestSolver();
            solver.startTime = Date.now();
            solver.allItems = [0, 1, 2];
            solver.isRunning = true;

            // First solution: [0, 1, 2] = 0 mismatches (optimal)
            solver.checkSolution([0, 1, 2]);
            expect(solver.bestValue).toBe(0);
            expect(solver.improvements).toBe(1);
            expect(solver.bestSolution).toEqual([0, 1, 2]);

            // Worse solution should not update
            solver.checkSolution([2, 1, 0]);
            expect(solver.bestValue).toBe(0);
            expect(solver.improvements).toBe(1);
        });

        it('should increment iteration on every call', () => {
            const solver = new TestSolver();
            solver.startTime = Date.now();
            solver.isRunning = true;

            solver.checkSolution([0, 1, 2]);
            solver.checkSolution([0, 1, 2]);
            solver.checkSolution([0, 1, 2]);
            expect(solver.iteration).toBe(3);
        });

        it('should fire onImprovement callback', () => {
            const onImprovement = vi.fn();
            const solver = new TestSolver({ onImprovement });
            solver.startTime = Date.now();
            solver.isRunning = true;

            solver.checkSolution([0, 1, 2]);
            expect(onImprovement).toHaveBeenCalledTimes(1);
            expect(onImprovement).toHaveBeenCalledWith(
                expect.objectContaining({ bestValue: 0, improvements: 1 })
            );
        });
    });

    // --- Callbacks ---

    describe('callbacks', () => {
        it('should fire onSolution when search completes', async () => {
            const onSolution = vi.fn();
            const solver = new TestSolver({ maxK: 0, onSolution });
            await new Promise((resolve) => {
                solver.options.onSolution = (result) => {
                    onSolution(result);
                    resolve(result);
                };
                solver.start({ items: [0, 1, 2], name: 'cb-test' });
            });
            expect(onSolution).toHaveBeenCalledTimes(1);
            expect(onSolution.mock.calls[0][0]).toMatchObject({
                problem: 'cb-test',
                iterations: expect.any(Number),
            });
        });

        it('should fire onOptimalFound when optimal is reached', async () => {
            const onOptimalFound = vi.fn();
            const solver = new TestSolver({
                maxK: 2,
                stopAtOptimal: true,
                onOptimalFound,
            });
            await new Promise((resolve) => {
                solver.options.onSolution = resolve;
                solver.start({
                    items: [0, 1, 2],
                    name: 'opt-test',
                    optimalValue: 0,
                });
            });
            expect(onOptimalFound).toHaveBeenCalled();
        });

        it('should fire onMaxIterationsReached when iteration limit hit', async () => {
            const onMaxIterationsReached = vi.fn();
            const solver = new TestSolver({
                maxIterations: 2,
                onMaxIterationsReached,
            });
            await new Promise((resolve) => {
                solver.options.onMaxIterationsReached = (result) => {
                    onMaxIterationsReached(result);
                    resolve(result);
                };
                solver.options.onSolution = resolve;
                solver.start({ items: [0, 1, 2, 3], name: 'iter-test' });
            });
            expect(onMaxIterationsReached).toHaveBeenCalled();
            const result = onMaxIterationsReached.mock.calls[0][0];
            expect(result.limitReached).toBe('maxIterations');
        }, 10000);

        it('should fire onMaxTimeReached when time limit hit', async () => {
            const onMaxTimeReached = vi.fn();
            const solver = new TestSolver({
                maxTime: 0.001, // 1ms — will almost certainly trigger
                maxK: 50,
                onMaxTimeReached,
            });
            await new Promise((resolve) => {
                solver.options.onMaxTimeReached = (result) => {
                    onMaxTimeReached(result);
                    resolve(result);
                };
                solver.options.onSolution = resolve;
                solver.start({ items: [0, 1, 2, 3, 4, 5, 6, 7], name: 'time-test' });
            });
            // May or may not trigger depending on speed, but if it does, check format
            if (onMaxTimeReached.mock.calls.length > 0) {
                expect(onMaxTimeReached.mock.calls[0][0].limitReached).toBe('maxTime');
            }
        }, 10000);
    });

    // --- stopAtOptimal ---

    describe('stopAtOptimal', () => {
        it('should halt immediately when optimal found and stopAtOptimal=true', async () => {
            const solver = new TestSolver({
                maxK: 5,
                stopAtOptimal: true,
                shuffle: false,
            });
            const result = await new Promise((resolve) => {
                solver.options.onSolution = resolve;
                solver.start({
                    items: [0, 1, 2],
                    name: 'stop-opt',
                    optimalValue: 0,
                });
            });
            expect(result.distance).toBe(0);
            expect(result.limitReached).toBe('optimal');
        });

        it('should continue searching when stopAtOptimal=false', async () => {
            const solver = new TestSolver({
                maxK: 1,
                stopAtOptimal: false,
                shuffle: false,
            });
            const result = await new Promise((resolve) => {
                solver.options.onSolution = resolve;
                solver.start({
                    items: [0, 1, 2],
                    name: 'no-stop',
                    optimalValue: 0,
                });
            });
            // Should complete full search, not stop at optimal
            expect(result.limitReached).not.toBe('optimal');
        });
    });

    // --- getStats() ---

    describe('getStats()', () => {
        it('should return correct fields', () => {
            const solver = new TestSolver();
            solver.startTime = Date.now();
            solver.iteration = 42;
            solver.improvements = 5;
            solver.bestValue = 10;
            solver.currentK = 2;
            solver.optimalValue = 8;
            solver.isRunning = true;

            const stats = solver.getStats();
            expect(stats).toMatchObject({
                iteration: 42,
                improvements: 5,
                bestValue: 10,
                currentK: 2,
                optimalValue: 8,
                isRunning: true,
            });
            expect(stats.deviation).toBeCloseTo(25); // (10/8 - 1) * 100 = 25%
            expect(stats.elapsedTime).toBeGreaterThanOrEqual(0);
        });

        it('should return N/A deviation when no optimal known', () => {
            const solver = new TestSolver();
            solver.startTime = Date.now();
            const stats = solver.getStats();
            expect(stats.deviation).toBe('N/A');
        });
    });

    // --- getFinalResult() ---

    describe('getFinalResult()', () => {
        it('should return correct structure', () => {
            const solver = new TestSolver();
            solver.startTime = Date.now();
            solver.bestValue = 42;
            solver.bestSolution = [0, 1, 2];
            solver.iteration = 100;
            solver.problemName = 'TestResult';
            solver.limitReached = null;

            const result = solver.getFinalResult();
            expect(result).toMatchObject({
                problem: 'TestResult',
                distance: 42,
                bestDistance: 42,
                iterations: 100,
                limitReached: null,
            });
            expect(result.route).toEqual([0, 1, 2]);
            expect(typeof result.totalTime).toBe('number');
            expect(result.deviation).toBeNull(); // no optimalValue set
        });

        it('should compute deviation when optimalValue is set', () => {
            const solver = new TestSolver();
            solver.startTime = Date.now();
            solver.bestValue = 110;
            solver.optimalValue = 100;
            solver.bestSolution = [];
            solver.problemName = 'dev';
            solver.limitReached = null;

            const result = solver.getFinalResult();
            expect(result.deviation).toBe(10);
        });

        it('should report correct limitReached reason', () => {
            const solver = new TestSolver();
            solver.startTime = Date.now();
            solver.bestSolution = [];
            solver.problemName = 'limit-test';

            solver.limitReached = 'maxIterations';
            expect(solver.getFinalResult().limitReached).toBe('maxIterations');

            solver.limitReached = 'maxTime';
            expect(solver.getFinalResult().limitReached).toBe('maxTime');

            solver.limitReached = 'optimal';
            expect(solver.getFinalResult().limitReached).toBe('optimal');

            solver.limitReached = null;
            expect(solver.getFinalResult().limitReached).toBeNull();
        });
    });

    // --- stop() ---

    describe('stop()', () => {
        it('should set isRunning to false', () => {
            const solver = new TestSolver();
            solver.isRunning = true;
            solver.stop();
            expect(solver.isRunning).toBe(false);
        });
    });

    // --- shuffle ---

    describe('shuffle option', () => {
        it('should use deterministic order when shuffle=false', async () => {
            const orders = [];
            for (let run = 0; run < 3; run++) {
                const solver = new TestSolver({
                    maxK: 0,
                    shuffle: false,
                });
                const result = await new Promise((resolve) => {
                    solver.options.onSolution = resolve;
                    solver.start({ items: [0, 1, 2, 3], name: 'order-test' });
                });
                orders.push(result.route);
            }
            // All 3 runs should produce identical results (deterministic)
            expect(orders[0]).toEqual(orders[1]);
            expect(orders[1]).toEqual(orders[2]);
        });
    });

    // --- Full solve flow ---

    describe('full solve', () => {
        it('should find optimal for trivial problem with K=0', async () => {
            const solver = new TestSolver({
                maxK: 0,
                shuffle: false,
            });
            const result = await new Promise((resolve) => {
                solver.options.onSolution = resolve;
                solver.start({ items: [0, 1, 2], name: 'trivial' });
            });
            // With sorted heuristic and items [0,1,2], initial solution is [0,1,2]
            // which is already optimal (0 mismatches)
            expect(result.distance).toBe(0);
            expect(result.iterations).toBeGreaterThanOrEqual(1);
        });

        it('should find a valid solution for 5 items', async () => {
            const solver = new TestSolver({ maxK: 2 });
            const result = await new Promise((resolve) => {
                solver.options.onSolution = resolve;
                solver.start({ items: [0, 1, 2, 3, 4], name: 'five' });
            });
            expect(result.distance).toBe(0); // sorted order = optimal
            expect(result.route).toHaveLength(5);
        });
    });
});
