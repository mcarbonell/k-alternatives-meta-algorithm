/**
 * k-Alternatives Knapsack Solver - Specific Implementation
 * Author: Mario Raúl Carbonell Martínez (Implemented by Gemini)
 */

// Universal import for KDeviationOptimizer
let BaseOptimizer;
if (typeof require !== 'undefined') {
    // Node.js environment
    BaseOptimizer = require('./k-optimizer.js').KDeviationOptimizer;
} else {
    // Browser/Worker environment (loaded via importScripts)
    BaseOptimizer = self.KDeviationOptimizer;
}

class KnapsackSolver extends BaseOptimizer {
    constructor(options = {}) {
        // Force deterministic order for Knapsack
        super({ ...options, shuffle: false });
        // The base optimizer is a minimizer. By returning negative value from evaluateSolution,
        // we are effectively maximizing. The base this.bestValue starts at Infinity, which is correct.
        this.bestValue = Infinity;
    }

    // --- Implementation of abstract methods ---

    initializeProblem(problemData) {
        if (!problemData.items || !problemData.maxWeight) {
            throw new Error('Invalid problem data for Knapsack. Required: { items: [{v, w}], maxWeight } ');
        }
        this.items = problemData.items.map((item, index) => ({ ...item, ratio: item.v / item.w, index }));
        this.maxWeight = problemData.maxWeight;
        this.problemName = problemData.name || 'KnapsackProblem';
        this.optimalValue = problemData.optimalValue ? -problemData.optimalValue : null; // Store as negative
        
        // Initialize heuristics FIRST to populate globalSortedIndices
        this.initializeGlobalHeuristics();

        // CRITICAL: For shuffle:false to work as a "Greedy" iterator, 
        // allItems must be in the preferred heuristic order.
        this.allItems = this.globalSortedIndices.slice();
    }

    getInitialSolution() {
        // The initial "solution" is the strict Greedy order
        return this.globalSortedIndices.slice();
    }

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

    evaluateSolution(solution) {
        // The "solution" from the optimizer is a PERMUTATION of items to consider.
        // We evaluate it by running a greedy algorithm based on that permutation.
        let totalValue = 0;
        let totalWeight = 0;

        for (const itemIndex of solution) {
            const item = this.items[itemIndex];
            if (totalWeight + item.w <= this.maxWeight) {
                totalWeight += item.w;
                totalValue += item.v;
            }
        }
        
        // Since the optimizer minimizes, we return the negative value.
        return -totalValue;
    }

    updateHeuristics(improvedSolution) {
        // Disable dynamic learning for strict K-deviation behavior from global ratio.
        // This adheres to the "Single Global Heuristic" requirement.
    }

    // --- Knapsack-specific methods ---

    initializeGlobalHeuristics() {
        // SINGLE GLOBAL HEURISTIC
        // Sort all items by ratio (Value / Weight) descending.
        this.globalSortedIndices = this.items
            .slice()
            .sort((a, b) => b.ratio - a.ratio)
            .map(item => item.index);
            
        this.localHeuristics = null; 
    }
    
    // Override getFinalResult to return positive value
    getFinalResult() {
        const result = super.getFinalResult();
        result.distance = -result.distance; // Convert back to positive value
        result.bestDistance = -result.bestDistance;
        result.optimal = this.optimalValue ? -this.optimalValue : null;
        result.value = result.distance;
        return result;
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KnapsackSolver };
} else {
    self.KnapsackSolver = KnapsackSolver;
}
