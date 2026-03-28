# k-Alternatives Improvement Plan

**Created:** 2026-03-21 **Last Updated:** 2026-03-28 **Author:** Mario Raúl
Carbonell Martínez + AI Assistant **Current Status:** Phase 1 complete, starting
Phase 2

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

## Phase 2: Test Coverage (HIGH PRIORITY)

### `k-optimizer.spec.js` (new file — unit tests for base class)

- [ ] Test `start()` initializes state correctly
- [ ] Test `checkSolution()` detects improvements and updates `bestValue`
- [ ] Test `checkSolution()` fires `onImprovement` callback
- [ ] Test `onSolution` callback fires on completion
- [ ] Test `onOptimalFound` fires when optimal is reached
- [ ] Test `stopAtOptimal` halts search immediately
- [ ] Test `maxIterations` limit enforcement + `onMaxIterationsReached` callback
- [ ] Test `maxTime` limit enforcement + `onMaxTimeReached` callback
- [ ] Test `shuffle` option (true = random order, false = deterministic)
- [ ] Test `getStats()` returns correct fields
- [ ] Test `getFinalResult()` structure and field types

### Expand `tsp-solver.spec.js`

- [ ] Add edge case: 2 cities (minimum viable TSP)
- [ ] Add edge case: cities at identical coordinates
- [ ] Test EXPLICIT distance matrix (LOWER_DIAG_ROW format)
- [ ] Test `calculateRouteDistance()` with known routes
- [ ] Test `updateHeuristics()` reorders neighbor lists correctly
- [ ] Test `geoDistance()` and `attDistance()` against known values

### Expand `knapsack-solver.spec.js`

- [ ] Add edge case: items heavier than capacity (all skipped)
- [ ] Add edge case: single item that fits
- [ ] Add edge case: single item that doesn't fit
- [ ] Test `evaluateSolution()` returns negative value (minimization convention)
- [ ] Test `getFinalResult()` returns positive values
- [ ] Test with `K=0` (pure greedy, no deviations)

### Fix Integration Tests

- [ ] Fix berlin52 timeout (increase to 30s or reduce K)
- [ ] Make `benchmark.integration.spec.js` deterministic where possible

### CI Improvements

- [ ] Add test coverage reporting (`vitest --coverage`)
- [ ] Fix CI benchmark step — use `./convert-tsplib-to-json.js` (relative path)

---

## Phase 3: Code Quality (MEDIUM PRIORITY)

### Knapsack Sign Convention

- [ ] Document or refactor the `-totalValue` minimization trick in
      `knapsack-solver.js`. It works but is confusing for anyone extending the
      class. Consider using a `maximize` option in the base class instead.

### JSDoc (remaining)

- [ ] Add JSDoc to benchmark scripts in `scripts/`

### Lint Warnings

- [ ] Investigate remaining 30 ESLint warnings and resolve or suppress
      explicitly.

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
| 2. Testing             | 22     | 0         | 0%      |
| 3. Code Quality        | 3      | 0         | 0%      |
| 4. Performance         | 4      | 0         | 0%      |
| **Total (actionable)** | **33** | **4**     | **12%** |

Plus 45 tasks already completed in prior sessions.

---

**Current Focus:** Phase 2 — unit tests for KDeviationOptimizer **Next:** Phase
3 — code quality (knapsack sign convention, JSDoc, lint warnings)
