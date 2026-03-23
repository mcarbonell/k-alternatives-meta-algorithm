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
     * Note: Forces shuffle:false for deterministic behavior.
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        super({ ...options, shuffle: false });
        this.bestValue = Infinity;
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
        this.optimalValue = problemData.optimalValue ? -problemData.optimalValue : null; // Store as negative

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
     * @param {Set} remainingItems - Set of remaining item indices
     * @returns {Array<number>} Available items sorted by ratio
     */
    getHeuristicChoices(currentItem, remainingItems) {
        // In Knapsack, the "next best choice" does NOT depend on the "current item".
        // It simply depends on the Global Heuristic (Efficiency Ratio).
        // We iterate through our global sorted list and return valid candidates that are in 'remainingItems'.

        const choices = [];
        // Optimization: We iterate the pre-sorted global list.
        // Since remainingItems is a Set, lookup is O(1). Total complexity O(N).
        for (let i = 0; i < this.globalSortedIndices.length; i++) {
            const idx = this.globalSortedIndices[i];
            if (remainingItems.has(idx)) {
                choices.push(idx);
            }
        }
        return choices;
    }

    /**
     * Evaluates a solution by running greedy algorithm on the permutation.
     * @param {Array<number>} solution - Permutation of item indices
     * @returns {number} Negative total value (for minimization)
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

        return -totalValue;
    }

    /**
     * Updates heuristics - disabled for Knapsack (uses global ratio).
     * @param {Array<number>} improvedSolution - The improved solution
     */
    updateHeuristics(improvedSolution) {
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
     * Returns final result with positive values.
     * @returns {Object} Final result with value instead of distance
     */
    getFinalResult() {
        const result = super.getFinalResult();
        result.distance = -result.distance; // Convert back to positive value
        result.bestDistance = -result.bestDistance;
        result.optimal = this.optimalValue ? -this.optimalValue : null;
        result.value = result.distance;
        return result;
    }
}

export { KnapsackSolver };
