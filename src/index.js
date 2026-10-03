/**
 * k-Alternatives Optimization Library
 *
 * Systematic discrepancy meta-heuristic with adaptive candidate reordering.
 *
 * @author Mario Raúl Carbonell Martínez
 */

export { KDeviationOptimizer } from './k-optimizer.js';
export { TSPSolver } from './tsp-solver.js';
export { KnapsackSolver } from './knapsack-solver.js';
export {
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
} from './baselines.js';
