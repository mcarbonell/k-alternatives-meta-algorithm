/**
 * k-Alternatives V1 vs V2 Benchmark (ESM version)
 * Reasonable parameters for N^k complexity.
 */

import performance from 'node:perf_hooks';
import KAlternativesV2 from '../src/k-alternatives-v2.js';

function createTSPProblem(size, seed = 42) {
    const rng = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };

    const cities = Array.from({ length: size }, (_, i) => ({
        id: i,
        x: rng() * 1000,
        y: rng() * 1000,
    }));

    const dist = (c1, c2) => Math.sqrt((c1.x - c2.x) ** 2 + (c1.y - c2.y) ** 2);

    return {
        getInitialState: () => ({ visited: [0], current: 0 }),
        getTransitions: (state) => {
            const transitions = [];
            for (let i = 0; i < size; i++) {
                if (!state.visited.includes(i)) transitions.push(i);
            }
            return transitions;
        },
        applyTransition: (state, cityIdx) => ({
            visited: [...state.visited, cityIdx],
            current: cityIdx,
        }),
        getTransitionCost: (state, cityIdx) => dist(cities[state.current], cities[cityIdx]),
        isComplete: (state) => state.visited.length === size,
        getCost: (state) => {
            let total = 0;
            for (let i = 0; i < state.visited.length - 1; i++) {
                total += dist(cities[state.visited[i]], cities[state.visited[i + 1]]);
            }
            total += dist(
                cities[state.visited[state.visited.length - 1]],
                cities[state.visited[0]]
            );
            return total;
        },
        heuristic: (state, transitions) => {
            return transitions.sort(
                (a, b) =>
                    dist(cities[state.current], cities[a]) - dist(cities[state.current], cities[b])
            );
        },
    };
}

class KAlternativesV1 {
    constructor(problem, maxK = 1) {
        this.problem = problem;
        this.maxK = maxK;
        this.bestCost = Infinity;
    }
    solve() {
        this._search(this.problem.getInitialState(), 0, this.maxK);
        return { cost: this.bestCost };
    }
    _search(state, currentCost, kRemaining) {
        if (this.problem.isComplete(state)) {
            const cost = this.problem.getCost(state);
            if (cost < this.bestCost) this.bestCost = cost;
            return;
        }
        const transitions = this.problem.getTransitions(state);
        const ranked = this.problem.heuristic(state, transitions);
        const limit = Math.min(ranked.length, kRemaining + 1);
        for (let i = 0; i < limit; i++) {
            const nextK = i === 0 ? kRemaining : kRemaining - 1;
            const tCost = this.problem.getTransitionCost(state, ranked[i]);
            this._search(
                this.problem.applyTransition(state, ranked[i]),
                currentCost + tCost,
                nextK
            );
        }
    }
}

function runBenchmark(size, k) {
    const problem = createTSPProblem(size);
    const h = (s, t) => problem.heuristic(s, t);

    console.log(`\n--- Test TSP: ${size} cities, k=${k} ---`);

    const start1 = Date.now();
    const res1 = new KAlternativesV1(problem, k).solve();
    const end1 = Date.now();
    console.log(`V1: Cost = ${res1.cost.toFixed(2)} | Time = ${end1 - start1}ms`);

    const start2 = Date.now();
    const res2 = new KAlternativesV2(problem, h, k).solve();
    const end2 = Date.now();
    console.log(`V2: Cost = ${res2.cost.toFixed(2)} | Time = ${end2 - start2}ms`);
}

runBenchmark(40, 2);
runBenchmark(60, 1);
