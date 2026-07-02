/**
 * k-Alternatives Knapsack Solver - Specific Implementation
 *
 * Implements the k-Alternatives meta-heuristic for the 0/1 Knapsack Problem.
 * Uses Value/Weight ratio heuristic as the base heuristic.
 *
 * @author Mario Raúl Carbonell Martínez
 * @extends KDeviationOptimizer
 */
import { KDeviationOptimizer } from './k-optimizer.js';

class KnapsackSolver extends KDeviationOptimizer {
    /**
     * Creates a new Knapsack Solver instance.
     * Uses maximize:true since Knapsack maximizes total value.
     * Forces shuffle:false for deterministic multi-start behavior.
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        super({ ...options, shuffle: false, maximize: true });
    }

    // --- Implementation of abstract methods ---

    /**
     * Initializes the Knapsack problem from problem data.
     * @param {Object} problemData - Problem data with items and maxWeight
     * @throws {Error} If items or maxWeight is missing
     */
    initializeProblem(problemData) {
        if (!problemData.items || !problemData.maxWeight) {
            throw new Error(
                'Invalid problem data for Knapsack. Required: { items: [{v, w}], maxWeight } '
            );
        }
        this.items = problemData.items.map((item, index) => ({
            ...item,
            ratio: item.v / item.w,
            index,
        }));
        this.maxWeight = problemData.maxWeight;
        this.problemName = problemData.name || 'KnapsackProblem';
        this.optimalValue = problemData.optimalValue || null;

        // Initialize heuristics FIRST to populate globalSortedIndices
        this.initializeGlobalHeuristics();

        // CRITICAL: For shuffle:false to work as a "Greedy" iterator,
        // allItems must be in the preferred heuristic order.
        this.allItems = this.globalSortedIndices.slice();
    }

    /**
     * Returns initial solution in greedy order (by value/weight ratio).
     * @returns {Array<number>} Initial solution as array of item indices
     */
    getInitialSolution() {
        return this.globalSortedIndices.slice();
    }

    /**
     * Returns available items sorted by global heuristic (efficiency ratio).
     * @param {number} currentItem - Current item (unused for Knapsack)
     * @param {Uint8Array} unvisited - Array indicating unvisited items
     * @param {number} unvisitedCount - Number of remaining items
     * @returns {Array<number>} Available items sorted by ratio
     */
    getHeuristicChoices(currentItem, unvisited, unvisitedCount) {
        // In Knapsack, the "next best choice" does NOT depend on the "current item".
        // It simply depends on the Global Heuristic (Efficiency Ratio).
        // We iterate through our global sorted list and return valid candidates that are in 'unvisited'.

        const choices = [];
        // Optimization: We iterate the pre-sorted global list.
        for (let i = 0; i < this.globalSortedIndices.length; i++) {
            const idx = this.globalSortedIndices[i];
            if (unvisited[idx] === 1) {
                choices.push(idx);
            }
        }
        return choices;
    }

    /**
     * Evaluates a solution by running greedy algorithm on the permutation.
     * @param {Array<number>} solution - Permutation of item indices
     * @returns {number} Total value (higher is better, maximize mode)
     */
    evaluateSolution(solution) {
        let totalValue = 0;
        let totalWeight = 0;

        for (const itemIndex of solution) {
            const item = this.items[itemIndex];
            if (totalWeight + item.w <= this.maxWeight) {
                totalWeight += item.w;
                totalValue += item.v;
            }
        }

        return totalValue;
    }

    /**
     * Updates heuristics - disabled for Knapsack (uses global ratio).
     * @param {Array<number>} improvedSolution - The improved solution
     */
    updateHeuristics(_improvedSolution) {
        // Disable dynamic learning for strict K-deviation behavior from global ratio.
        // This adheres to the "Single Global Heuristic" requirement.
    }

    // --- Knapsack-specific methods ---

    /**
     * Initializes global heuristic (single sorted list by value/weight ratio).
     */
    initializeGlobalHeuristics() {
        this.globalSortedIndices = this.items
            .slice()
            .sort((a, b) => b.ratio - a.ratio)
            .map((item) => item.index);

        this.localHeuristics = null;
    }

    /**
     * Returns final result with value field for Knapsack.
     * @returns {Object} Final result with value (same as bestDistance)
     */
    getFinalResult() {
        const result = super.getFinalResult();
        result.value = result.bestDistance;
        return result;
    }
}

export { KnapsackSolver };
