import { describe, it, expect } from 'vitest';
import { KnapsackSolver } from './knapsack-solver.js';

describe('KnapsackSolver', () => {
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
      optimalValue: 120, // items 3(50), 1(40), 2(30) -> w:13, v:120
    };

    const solver = new KnapsackSolver({
      maxK: 3, // A small K should be enough for this
      stopAtOptimal: true,
    });

    const result = await new Promise(resolve => {
      solver.options.onSolution = resolve;
      solver.start(problem);
    });

    console.log(`Knapsack solution found: Value=${result.value}, Weight=${result.totalWeight || 'N/A'}`);

    expect(result.value).toBe(problem.optimalValue);
  }, 10000); // 10-second timeout for this test
});
