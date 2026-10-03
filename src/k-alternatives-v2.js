/**
 * Experimental Prototype: k-Alternatives V2 (Discrepancy Unit Counter)
 *
 * NOTE: The canonical implementation of the k-Alternatives meta-heuristic
 * is `KDeviationOptimizer` in `src/k-optimizer.js`.
 *
 * Semantic Distinction:
 * - Canonical (`KDeviationOptimizer`): Deducts `(validChoicesFound - 1)`
 *   from `alternativesLeft` so choosing the m-th alternative expends m units of discrepancy.
 * - Prototype V2 (`KAlternativesV2`): Deducts a flat 1 unit of discrepancy whenever
 *   any non-greedy branch (i > 0) is taken, regardless of rank depth.
 *
 * Retained for backwards compatibility and ablation experiments (see `scripts/benchmark_v1_vs_v2.js`).
 */

class KAlternativesV2 {
    constructor(problem, heuristic, maxK = 5) {
        this.problem = problem; // { getInitialState, getTransitions, isComplete, getCost }
        this.heuristic = heuristic; // fn(state, transitions) -> sorted transitions
        this.maxK = maxK;
        this.bestSolution = null;
        this.bestCost = Infinity;
    }

    solve() {
        const initialState = this.problem.getInitialState();
        this.bestSolution = null;
        this.bestCost = Infinity;

        // DFS with discrepancy budget k
        this._search(initialState, 0, this.maxK, []);
        return { solution: this.bestSolution, cost: this.bestCost };
    }

    _search(state, currentCost, kRemaining, path) {
        // 1. Pruning: If current cost already exceeds best cost, stop
        if (currentCost >= this.bestCost) return;

        // 2. Base case: complete solution
        if (this.problem.isComplete(state)) {
            const finalCost = this.problem.getCost(state);
            if (finalCost < this.bestCost) {
                this.bestCost = finalCost;
                this.bestSolution = state;
            }
            return;
        }

        // 3. Get transitions and rank them by heuristic
        const transitions = this.problem.getTransitions(state);
        if (transitions.length === 0) return;

        const ranked = this.heuristic(state, transitions);

        // 4. Explore alternatives based on budget k
        // The 0-th alternative is the greedy choice (k cost = 0)
        // Alternatives 1..m cost 1 k-unit each
        const limit = Math.min(ranked.length, kRemaining + 1);

        for (let i = 0; i < limit; i++) {
            const transition = ranked[i];
            const nextState = this.problem.applyTransition(state, transition);
            const transitionCost = this.problem.getTransitionCost(state, transition);

            // If i > 0, we are spending 1 k-unit for this deviation
            const nextK = i === 0 ? kRemaining : kRemaining - 1;

            this._search(nextState, currentCost + transitionCost, nextK, [...path, transition]);
        }
    }
}

export default KAlternativesV2;
