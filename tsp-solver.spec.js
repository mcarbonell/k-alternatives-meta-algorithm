
import { describe, it, expect } from 'vitest';
import { TSPSolver } from './tsp-solver.js';
import berlin52 from './tsplib-json/berlin52.json';

describe('TSPSolver', () => {
  it('should find a near-optimal solution for berlin52', async () => {
    const solver = new TSPSolver({
      maxK: 5,
      maxTime: 20, // 20 second time limit
      stopAtOptimal: true,
    });

    const result = await new Promise(resolve => {
      solver.options.onSolution = resolve;
      solver.options.onMaxTimeReached = resolve; // Resolve if time limit is hit
      solver.start(berlin52); // Pass problem data directly to start
    });

    const finalDistance = result.distance ?? result.bestDistance;

    // The optimal distance for berlin52 is 7542
    const deviation = (finalDistance / berlin52.metadata.optimalDistance - 1) * 100;
    console.log(`Found solution for berlin52: ${finalDistance} (Deviation: ${deviation.toFixed(2)}%)`);

    expect(finalDistance).toBeGreaterThan(0);
    // Expect the result to be within 5% of the optimal distance
    expect(finalDistance).toBeLessThanOrEqual(berlin52.metadata.optimalDistance * 1.05);
  }, 30000); // Test timeout of 30 seconds
});
