---
description: Repository Information Overview
alwaysApply: true
---

# k-Alternatives Optimization Framework Information

## Summary

**k-Alternatives** is a general-purpose meta-heuristic optimization framework
designed to solve combinatorial problems such as the Traveling Salesperson
Problem (TSP) and the Knapsack Problem. The core algorithm combines **Limited
Discrepancy Search (LDS)** with a **Multi-Start Construction** strategy,
exploring the solution space by allowing a controlled number of deviations ($k$)
from a base greedy heuristic.

## Structure

- **Root**: Contains core solvers (`tsp-solver.js`, `knapsack-solver.js`), the
  base optimizer (`k-optimizer.js`), and benchmark scripts.
- [./tsplib/](./tsplib/): Raw TSPLIB benchmark data files for TSP.
- [./tsplib-json/](./tsplib-json/): Pre-parsed TSPLIB instances in JSON format.
- [./k-alternatives-memory-bank/](./k-alternatives-memory-bank/): Comprehensive
  documentation, algorithmic insights, and project roadmap.
- [./old-k-search/](./old-k-search/): Legacy implementations and experimental
  visualizations.
- [./temp_kp/](./temp_kp/): Benchmark instances for the Knapsack problem.

### Main Repository Components

- **k-Alternatives Meta-Heuristic**: Generic framework for combinatorial
  optimization (TSP, Knapsack) using Limited Discrepancy Search and Multi-Start.

## Language & Runtime

**Language**: JavaScript (Node.js)  
**Version**: Node.js >= 12.0.0  
**Build System**: npm scripts  
**Package Manager**: npm

## Dependencies

**Main Dependencies**:

- `vitest`: Testing framework (used in `.spec.js` files).
- `python3`: Required for running the demo server via `server.py`.

## Build & Installation

```bash
# Install dependencies
npm install

# Start the demo server (optional)
python server.py
```

## Main Files & Resources

- [./k-optimizer.js](./k-optimizer.js): Abstract base class containing the
  meta-heuristic logic.
- [./tsp-solver.js](./tsp-solver.js): Implementation for TSP using the Nearest
  Neighbor heuristic.
- [./knapsack-solver.js](./knapsack-solver.js): Implementation for 0/1 Knapsack
  using the Value/Weight ratio heuristic.
- [./k-alternatives-cli.js](./k-alternatives-cli.js): Main command-line
  interface for running solvers.
- [./benchmark.js](./benchmark.js): Suite for running automated benchmarks.

## Testing

**Framework**: Vitest  
**Test Location**: Root directory  
**Naming Convention**: `*.spec.js`  
**Run Command**:

```bash
# Run TSP tests/benchmarks
npm run test:tsp

# Run Knapsack tests/benchmarks
npm run test:knapsack

# Run general benchmarks
npm run benchmark
```

## Usage & Operations

**Key Commands**:

```bash
# Solve a specific TSP instance
node k-alternatives-cli.js tsplib/berlin52.tsp --maxK 5 --debug

# Run a quick benchmark suite
npm run benchmark:quick

# Run thorough benchmarks
npm run benchmark:thorough
```

**Integration Points**:

- **CLI**: Robust interface for batch processing and statistical analysis.
- **Web**: HTML/JS visualizers (e.g., `index.html`) can be served via
  `server.py` for real-time algorithm demonstration.
