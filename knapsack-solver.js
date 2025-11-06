/**
 * k-Alternatives Knapsack Solver - Specific Implementation
 * Author: Mario Raúl Carbonell Martínez (Implemented by Gemini)
 */

const { KDeviationOptimizer } = require('./k-optimizer.js');

class KnapsackSolver extends KDeviationOptimizer {
    constructor(options = {}) {
        super(options);
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
        this.allItems = this.items.map(item => item.index);

        this.initializeLocalHeuristics();
    }

    getInitialSolution() {
        // The initial "solution" is just the default order of items to consider
        return this.allItems.slice().sort((a, b) => this.items[b].ratio - this.items[a].ratio);
    }

    getHeuristicChoices(currentItem, remainingItems) {
        // Heuristic: from the current item, which item is best to consider next?
        // This is based on the pre-sorted list of items by ratio.
        return this.localHeuristics[currentItem];
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
        // The same learning mechanism as TSP can apply: if a sequence of
        // considerations [..., itemA, itemB, ...] led to a good result,
        // we reinforce that sequence.
        for (let i = 0; i < improvedSolution.length - 1; i++) {
            const itemA = improvedSolution[i];
            const itemB = improvedSolution[i + 1];

            if (this.localHeuristics[itemA][0] !== itemB) {
                this.localHeuristics[itemA] = [itemB, ...this.localHeuristics[itemA].filter(i => i !== itemB)];
            }
        }
    }

    // --- Knapsack-specific methods ---

    initializeLocalHeuristics() {
        // Create a static, sorted list of items by value-ratio
        const sortedByRatio = this.items.slice().sort((a, b) => b.ratio - a.ratio).map(item => item.index);

        this.localHeuristics = [];
        for (let i = 0; i < this.items.length; i++) {
            // The heuristic for any item is always the globally best-ratio items that haven't been considered yet.
            // This is a simplification for Knapsack, as the "next choice" doesn't depend on the "current city".
            this.localHeuristics[i] = sortedByRatio.filter(j => j !== i);
        }
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
}
