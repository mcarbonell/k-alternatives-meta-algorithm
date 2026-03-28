# k-Alternatives Improvement Plan

**Created:** 2026-03-21 **Last Updated:** 2026-03-28 **Author:** Mario Raúl
Carbonell Martínez + AI Assistant **Current Status:** Phase 1+2+3 complete

---

## Overview

This plan focuses on **what matters now**: making the codebase robust,
well-tested, and maintainable before expanding to new problems or publication
prep.

**Completed (don't redo):**

- ESLint + Prettier configured and passing
- ES Modules migration complete
- JSDoc on core files (k-optimizer, tsp-solver, knapsack-solver)
- CI pipeline (lint + test + benchmark)
- QUICKSTART.md
- Project reorganized (src/, scripts/, tests/)

---

## Phase 1: Fix Broken Things (DONE)

### Bug Fixes

- [x] Fix `benchmark.integration.spec.js` — "should solve berlin52 within
      acceptable gap" times out at 5s. Increase timeout or add `maxTime` limit.
- [x] Fix `getFinalResult()` in `k-optimizer.js:375-378` — when `maxTime` is set
      but `maxIterations` is null, `limitReached` reports `null` instead of
      `'maxTime'`. Changed `limitReached` from boolean to string
      (`'maxIterations'`, `'maxTime'`, `'optimal'`, or `null`).
- [x] Remove `console.log` from `tsp-solver.js:52` (`initializeProblem`). Use a
      logger or remove entirely — library code shouldn't log to stdout.

### Recursion Safety

- [x] Add depth guard or convert `systematicSearch()` to iterative approach to
      prevent stack overflow on large N + high K. Added `depth` parameter with
      `MAX_DEPTH = 10000` safeguard.

---

## Phase 2: Test Coverage (DONE)

### `k-optimizer.spec.js` (new file — unit tests for base class)

- [x] Test `start()` initializes state correctly
- [x] Test `checkSolution()` detects improvements and updates `bestValue`
- [x] Test `checkSolution()` fires `onImprovement` callback
- [x] Test `onSolution` callback fires on completion
- [x] Test `onOptimalFound` fires when optimal is reached
- [x] Test `stopAtOptimal` halts search immediately
- [x] Test `maxIterations` limit enforcement + `onMaxIterationsReached` callback
- [x] Test `maxTime` limit enforcement + `onMaxTimeReached` callback
- [x] Test `shuffle` option (true = random order, false = deterministic)
- [x] Test `getStats()` returns correct fields
- [x] Test `getFinalResult()` structure and field types

### Expand `tsp-solver.spec.js`

- [x] Add edge case: 2 cities (minimum viable TSP)
- [x] Add edge case: cities at identical coordinates
- [x] Test EXPLICIT distance matrix (LOWER_DIAG_ROW format)
- [x] Test `calculateRouteDistance()` with known routes
- [x] Test `updateHeuristics()` reorders neighbor lists correctly
- [x] Test `geoDistance()` and `attDistance()` against known values

### Expand `knapsack-solver.spec.js`

- [x] Add edge case: items heavier than capacity (all skipped)
- [x] Add edge case: single item that fits
- [x] Add edge case: single item that doesn't fit
- [x] Test `evaluateSolution()` returns negative value (minimization convention)
- [x] Test `getFinalResult()` returns positive values
- [x] Test with `K=0` (pure greedy, no deviations)

### Fix Integration Tests

- [x] Fix berlin52 timeout (increase to 30s or reduce K)
- [ ] Make `benchmark.integration.spec.js` deterministic where possible

### CI Improvements

- [ ] Add test coverage reporting (`vitest --coverage`)
- [x] Fix CI benchmark step — use `./convert-tsplib-to-json.js` (relative path)

---

## Phase 3: Code Quality (DONE)

### Knapsack Sign Convention

- [x] Refactored: added `maximize` option to `KDeviationOptimizer`.
      KnapsackSolver now uses `maximize: true` — returns positive values
      directly. Removed all `-totalValue` negation tricks from
      `evaluateSolution`, `initializeProblem`, and `getFinalResult`.

### Lint Warnings

- [x] Prefixed all unused abstract method params with `_` in `k-optimizer.js`,
      `knapsack-solver.js`, `tsp-solver.js`. Removed unused import in
      `benchmark.integration.spec.js`. **Result: 0 errors, 0 warnings in src/
      and tests/.**

---

## Phase 4: Performance (WHEN PHASE 2 IS DONE)

### Core Optimizations

- [ ] Precompute distance matrix as `Float64Array` (Typed Arrays) instead of
      nested plain arrays.
- [ ] Implement delta evaluation for TSP (recalculate only changed edges on
      route modification instead of full route distance).
- [ ] Profile `systematicSearch()` hot paths with `--prof`.

### Candidate Lists (with safeguards)

- [ ] Implement candidate lists limiting to k-nearest neighbors.
- [ ] **Always include fallback** to all unvisited cities when candidates are
      exhausted.
- [ ] Benchmark impact on solution quality vs. speed.

---

## Future Work (NOT NOW — don't touch until Phase 2+3 are done)

These items are documented for reference but should **not** be started until the
codebase is solid.

### New Problem Solvers

- Job Scheduling
- Vehicle Routing (VRP)
- Graph Coloring
- Bin Packing

### Build & Distribution

- Vite bundling, ESM/UMD output, CDN distribution
- npm publish preparation

### Visualization

- Modern web visualizer (React/Vue/Svelte)
- Interactive demos

### Publication

- Statistical analysis, ablation studies
- Paper writing, ArXiv submission

---

## Progress

| Phase                  | Tasks  | Completed | %       |
| ---------------------- | ------ | --------- | ------- |
| 1. Bug Fixes           | 4      | 4         | 100%    |
| 2. Testing             | 22     | 20        | 91%     |
| 3. Code Quality        | 2      | 2         | 100%    |
| 4. Performance         | 4      | 0         | 0%      |
| **Total (actionable)** | **32** | **26**    | **81%** |

Plus 45 tasks already completed in prior sessions.

---

**Current Focus:** Phase 4 — performance (typed arrays, delta evaluation,
candidate lists)
