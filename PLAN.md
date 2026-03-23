# k-Alternatives Improvement Plan

**Created:** 2026-03-21  
**Status:** In Progress  
**Author:** Mario Raúl Carbonell Martínez + AI Assistant

---

## 📋 Overview

This document tracks all proposed improvements to the k-Alternatives repository,
organized by priority and category. Use this as a reference for development
sessions and progress tracking.

---

## 🎯 Priority 1: Code Quality & Maintainability

### Linting & Formatting

- [x] Add ESLint configuration (`eslint.config.js`)
- [x] Add Prettier configuration (`.prettierrc`)
- [x] Add `.prettierignore`
- [x] Install dev dependencies: `eslint`, `prettier`, `globals`, `@eslint/js`,
      `eslint-config-prettier`
- [x] Add npm scripts: `npm run lint`, `npm run format`, `npm run format:check`,
      `npm run check`
- [x] Run initial lint pass and fix all issues (reduced from 422 to 30 warnings)
- [ ] Add linting to CI workflow

### Module System Standardization

- [x] Migrate all files to ES Modules (`import`/`export`)
- [x] Update `package.json` with `"type": "module"`
- [x] Fix all CommonJS references (`require`, `module.exports`)
- [ ] Update imports in HTML files to use ES modules
- [ ] Test all scripts after migration

### JSDoc Documentation

- [ ] Add complete JSDoc to `k-optimizer.js`
- [ ] Add complete JSDoc to `tsp-solver.js`
- [ ] Add complete JSDoc to `knapsack-solver.js`
- [ ] Add JSDoc to all benchmark files
- [ ] Add JSDoc to utility functions
- [ ] Generate HTML documentation with `jsdoc` tool
- [ ] Deploy docs to GitHub Pages

### TypeScript Support

- [ ] Create `k-optimizer.d.ts` type definitions
- [ ] Create `tsp-solver.d.ts` type definitions
- [ ] Create `knapsack-solver.d.ts` type definitions
- [ ] Add `tsconfig.json` for type checking
- [ ] Add `npm run typecheck` script
- [ ] Consider migrating core to TypeScript

### Code Cleanup

- [ ] Archive or remove `tsp-solver-legacy.js`
- [ ] Clean up `old-k-search/` directory (archive or delete)
- [ ] Remove unused files in root directory
- [ ] Organize files into logical folder structure
- [ ] Update all imports after reorganization

---

## 🧪 Priority 2: Testing Coverage

### Core Tests

- [x] Install `vitest` and add `npm run test` script
- [ ] Create `k-optimizer.spec.js` - Base class contract tests
- [ ] Test `systematicSearch()` method behavior
- [ ] Test `checkSolution()` improvement detection
- [ ] Test `start()` initialization flow
- [ ] Test callback handlers (onImprovement, onSolution, etc.)
- [ ] Test limit enforcement (maxIterations, maxTime)

### Solver Tests

- [ ] Expand `tsp-solver.spec.js` with more instances
- [ ] Expand `knapsack-solver.spec.js` with edge cases
- [ ] Test TSPLIB file parsing
- [ ] Test explicit distance matrix handling

### Property-Based Testing

- [ ] Install `fast-check` library
- [ ] Add property tests for TSP (triangle inequality, etc.)
- [ ] Add property tests for Knapsack (weight constraints)
- [ ] Add property tests for solution validity
- [ ] Add property tests for heuristic ordering

### Performance Tests

- [ ] Create performance regression test suite
- [ ] Set baseline benchmarks for key instances
- [ ] Add performance budget checks to CI
- [ ] Track performance trends over time

### CI/CD Integration

- [ ] Create `.github/workflows/ci.yml`
- [ ] Add test job running on push/PR
- [ ] Add benchmark job (quick mode) on PR
- [ ] Add lint job to CI
- [ ] Add test coverage reporting
- [ ] Add status badges to README

---

## 📚 Priority 3: Documentation Improvements

### Getting Started

- [ ] Create `QUICKSTART.md` with 5-minute examples
- [ ] Add installation instructions
- [ ] Add basic usage examples (TSP, Knapsack)
- [ ] Add troubleshooting section
- [ ] Add FAQ section

### API Reference

- [ ] Generate API docs from JSDoc
- [ ] Create `docs/api/` directory
- [ ] Document all public classes and methods
- [ ] Document all callback signatures
- [ ] Add usage examples to API docs

### Benchmark Documentation

- [ ] Create `BENCHMARKS.md` with comprehensive results
- [ ] Add visual charts (solution quality, time)
- [ ] Compare k-Alternatives vs other algorithms
- [ ] Document benchmark methodology
- [ ] Add hardware specifications for benchmarks

### Developer Documentation

- [ ] Create `CONTRIBUTING.md`
- [ ] Document development setup process
- [ ] Document code style guidelines
- [ ] Document commit message conventions
- [ ] Document PR review process

### Additional Documentation

- [ ] Create `CHANGELOG.md`
- [ ] Move memory-bank to `docs/` directory
- [ ] Create `docs/algorithms/` for algorithm details
- [ ] Create `docs/problems/` for problem-specific guides
- [ ] Add architecture diagram

---

## ⚡ Priority 4: Performance Optimizations

### Core Optimizations

- [ ] Implement Typed Arrays for distance matrices
- [ ] Implement Delta Evaluation for route changes
- [ ] Add object pooling for Sets/Arrays in search
- [ ] Optimize `systematicSearch()` recursion
- [ ] Profile and optimize hot paths

### Candidate Lists (⚠️ See Warning Below)

- [ ] Research proper candidate list implementation
- [ ] Implement with fallback for edge cases
- [ ] Create `OPTIMIZATIONS.md` and document limitations
- [ ] Test with various problem instances
- [ ] Benchmark performance improvement

### Parallelization

- [ ] Implement Web Workers for multi-start
- [ ] Add worker pool for parallel exploration
- [ ] Implement shared memory for improvements
- [ ] Add `npm run benchmark:parallel` script
- [ ] Document parallel scaling results

### Memory Optimizations

- [ ] Profile memory usage
- [ ] Reduce garbage collection pressure
- [ ] Implement efficient Set/Map usage
- [ ] Add memory benchmarks

---

## ⚠️ Candidate Lists Warning

**Issue Identified:** 2026-03-21

Candidate lists (limiting heuristic choices to k-nearest neighbors) can
introduce **bugs** in TSP solving:

### Problem Scenario

When building a tour, if all k-nearest neighbors of the current city have
already been visited, the algorithm must connect to a **more distant unvisited
city**. If candidate lists are too restrictive, this can cause:

1. **Incomplete tours** - No valid next city found
2. **Suboptimal solutions** - Forced to use poor connections
3. **Algorithm failure** - Search terminates prematurely

### Required Safeguards

- [ ] Always include fallback to ALL unvisited cities
- [ ] Document this limitation in `OPTIMIZATIONS.md`
- [ ] Add tests for edge cases (dense clusters, etc.)
- [ ] Consider adaptive candidate list sizing
- [ ] Benchmark impact of different candidate list sizes

### Documentation Update Needed

Add warning section to `OPTIMIZATIONS.md`:

```markdown
## ⚠️ Candidate Lists: Important Caveat

Candidate lists can cause issues when all k-nearest neighbors are already
visited. Always implement a fallback mechanism to consider ALL remaining
unvisited cities.
```

---

## 🎲 Priority 5: Expand Problem Coverage

### Job Scheduling (High Priority)

- [ ] Research problem structure and heuristics
- [ ] Create `scheduling-solver.js`
- [ ] Implement shortest-job-first heuristic
- [ ] Implement earliest-deadline-first heuristic
- [ ] Create benchmark instances
- [ ] Create `scheduling-solver.spec.js`
- [ ] Document usage and results

### Vehicle Routing Problem (High Priority)

- [ ] Research VRP variants (CVRP, VRPTW)
- [ ] Create `vrp-solver.js`
- [ ] Implement capacity constraints
- [ ] Implement time window constraints
- [ ] Create benchmark instances (CVRPLIB)
- [ ] Create `vrp-solver.spec.js`
- [ ] Document usage and results

### Graph Coloring (Medium Priority)

- [ ] Research problem structure
- [ ] Create `graph-coloring-solver.js`
- [ ] Implement DSatur heuristic
- [ ] Create benchmark instances (DIMACS)
- [ ] Create `graph-coloring-solver.spec.js`
- [ ] Document usage and results

### Bin Packing (Medium Priority)

- [ ] Research problem structure
- [ ] Create `bin-packing-solver.js`
- [ ] Implement First Fit Decreasing heuristic
- [ ] Create benchmark instances
- [ ] Create `bin-packing-solver.spec.js`
- [ ] Document usage and results

### Additional Problems (Low Priority)

- [ ] Quadratic Assignment Problem (QAP)
- [ ] Traveling Purchaser Problem
- [ ] Generalized TSP
- [ ] Multiple TSP (mTSP)

---

## 🔧 Priority 6: Modernize Build System

### Package Configuration

- [x] Update `package.json` with `"type": "module"`
- [ ] Add `"exports"` field for subpath exports
- [ ] Add `"files"` field for npm publish
- [ ] Add `"types"` field for TypeScript
- [ ] Add `"sideEffects": false` for tree-shaking

### Build Tools

- [ ] Install Vite for bundling
- [ ] Create `vite.config.js`
- [ ] Add `npm run build` script
- [ ] Add `npm run dev` for development server
- [ ] Configure output formats (ESM, UMD)

### Distribution

- [ ] Create `dist/` directory structure
- [ ] Build browser bundles
- [ ] Add CDN distribution (unpkg, jsDelivr)
- [ ] Test bundles in browser
- [ ] Add bundle size tracking

### Benchmark Automation

- [ ] Create benchmark runner with result tracking
- [ ] Store historical benchmark data
- [ ] Generate trend charts
- [ ] Add benchmark comparison tool
- [ ] Integrate with CI for regression detection

---

## 🎨 Priority 7: Visualization & Demos

### Modern Web Visualizer

- [ ] Create new visualizer with modern framework (React/Vue/Svelte)
- [ ] Implement real-time algorithm visualization
- [ ] Add controls for parameters (k, time limit, etc.)
- [ ] Add problem instance loader
- [ ] Add solution export functionality

### Interactive Demos

- [ ] Create ObservableHQ notebook
- [ ] Create CodeSandbox templates
- [ ] Create StackBlitz templates
- [ ] Embed demos in documentation

### Comparison Tools

- [ ] Create side-by-side algorithm comparison
- [ ] Compare k-Alternatives vs 2-Opt vs SA vs GA
- [ ] Add performance charts
- [ ] Add solution quality comparison

### Enhanced Existing Visualizers

- [ ] Update `index-legacy.html` with modern UI
- [ ] Add mobile responsiveness
- [ ] Add accessibility features

---

## 📝 Priority 8: Academic Publication Prep

### Repository Setup

- [ ] Create clean GitHub repo for publication
- [ ] Write professional README.md
- [ ] Add LICENSE (MIT)
- [ ] Add CITATION.cff file
- [ ] Organize code for reproducibility

### Statistical Analysis

- [ ] Add confidence interval calculations
- [ ] Implement t-tests for significance
- [ ] Add statistical analysis scripts
- [ ] Generate publication-quality tables
- [ ] Generate publication-quality charts

### Benchmark Comparisons

- [ ] Compare against Google OR-Tools
- [ ] Compare against LKH (if feasible)
- [ ] Compare against Concorde (if feasible)
- [ ] Compare against Simulated Annealing
- [ ] Compare against Genetic Algorithms
- [ ] Document comparison methodology

### Ablation Studies

- [ ] With/without adaptive learning comparison
- [ ] Different k values impact analysis
- [ ] Multi-start vs single-start comparison
- [ ] Different heuristic orderings comparison
- [ ] Random seed sensitivity analysis

### Paper Writing

- [ ] Write introduction section
- [ ] Write related work section
- [ ] Write algorithm description section
- [ ] Write theoretical analysis section
- [ ] Write experiments section
- [ ] Write results section
- [ ] Write conclusion section
- [ ] Create bibliography
- [ ] Format for target venue

### Submission

- [ ] Select target venue (conference/journal)
- [ ] Format paper according to venue guidelines
- [ ] Prepare supplementary materials
- [ ] Submit to ArXiv preprint
- [ ] Submit to venue

---

## 🚀 Quick Wins (1-2 hours each)

### Immediate Tasks

- [x] Create `PLAN.md` for tracking
- [x] Add ESLint + Prettier configuration
- [x] Add npm scripts for linting/formatting
- [ ] Create `CONTRIBUTING.md`
- [ ] Create `CHANGELOG.md`
- [ ] Add GitHub Issues templates
- [x] Run initial lint pass (422 → 30 warnings)
- [ ] Create `examples/` directory
- [ ] Add basic examples (TSP, Knapsack)
- [ ] Add performance profiling script
- [ ] Add GitHub Actions CI workflow
- [ ] Create PR template
- [ ] Add issue templates (bug report, feature request)

---

## 📊 Progress Tracking

### Summary by Priority

| Priority         | Total Tasks | Completed | In Progress | Pending | % Complete |
| ---------------- | ----------- | --------- | ----------- | ------- | ---------- |
| 1. Code Quality  | 35          | 10        | 0           | 25      | 29%        |
| 2. Testing       | 31          | 1         | 0           | 30      | 3%         |
| 3. Documentation | 25          | 0         | 0           | 25      | 0%         |
| 4. Performance   | 15          | 0         | 0           | 15      | 0%         |
| 5. New Problems  | 30          | 0         | 0           | 30      | 0%         |
| 6. Build System  | 20          | 1         | 0           | 19      | 5%         |
| 7. Visualization | 15          | 0         | 0           | 15      | 0%         |
| 8. Publication   | 30          | 0         | 0           | 30      | 0%         |
| Quick Wins       | 13          | 4         | 0           | 9       | 31%        |
| **TOTAL**        | **214**     | **13**    | **0**       | **201** | **6.1%**   |

### Recent Activity

| Date       | Task                                              | Status        |
| ---------- | ------------------------------------------------- | ------------- |
| 2026-03-21 | Created PLAN.md                                   | ✅ Completed  |
| 2026-03-21 | Identified candidate lists bug                    | ⚠️ Documented |
| 2026-03-21 | Added ESLint + Prettier configuration             | ✅ Completed  |
| 2026-03-21 | Fixed 392 lint errors automatically               | ✅ Completed  |
| 2026-03-21 | Fixed remaining 6 errors manually                 | ✅ Completed  |
| 2026-03-21 | Added .editorconfig and .gitattributes            | ✅ Completed  |
| 2026-03-21 | Added npm scripts: lint, format, check            | ✅ Completed  |
| 2026-03-21 | Final status: 0 errors, 30 warnings (unused vars) | ✅ Completed  |
| 2026-03-23 | Migrated all files to ES Modules                  | ✅ Completed  |
| 2026-03-23 | Verified benchmarks work                          | ✅ Completed  |
| 2026-03-23 | Installed Vitest and configured test script       | ✅ Completed  |
| 2026-03-23 | Tests pass (2/2: TSP + Knapsack)                  | ✅ Completed  |

---

## 🎯 Milestone Checklist

### Milestone 1: Code Quality Foundation (Week 1)

- [x] ESLint + Prettier configured
- [x] All code passes linting (0 errors, 30 warnings)
- [ ] ES Modules migration complete
- [ ] Basic JSDoc added to core files

### Milestone 2: Testing Infrastructure (Week 2)

- [ ] CI/CD pipeline working
- [ ] Test coverage > 50%
- [ ] Performance tests running
- [ ] All tests passing on CI

### Milestone 3: Documentation Complete (Week 3)

- [ ] QUICKSTART.md published
- [ ] API reference generated
- [ ] CONTRIBUTING.md published
- [ ] BENCHMARKS.md with charts

### Milestone 4: New Problem Solver (Week 4-5)

- [ ] Job Scheduling solver implemented
- [ ] Tests passing
- [ ] Benchmarks run
- [ ] Documentation complete

### Milestone 5: Publication Ready (Month 2-3)

- [ ] Clean repository created
- [ ] Statistical analysis complete
- [ ] Paper draft written
- [ ] ArXiv preprint submitted

---

## 📝 Notes

- Update this document regularly as tasks are completed
- Move completed tasks from "Pending" to "Completed"
- Add new tasks as they are discovered
- Track time spent on each priority area
- Update milestone dates as needed

---

**Last Updated:** 2026-03-23  
**Current Focus:** Priority 2 - Add more tests to k-optimizer  
**Next Steps:** Continue with ES Modules migration or start Testing
Infrastructure
