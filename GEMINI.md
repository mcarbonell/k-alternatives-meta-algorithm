# k-Alternatives Optimization Framework

## Project Overview

**k-Alternatives** is a general-purpose meta-heuristic optimization framework designed to solve combinatorial problems like the Traveling Salesperson Problem (TSP) and the Knapsack Problem.

The core algorithm combines **Limited Discrepancy Search (LDS)** with a **Multi-Start Construction** strategy. It explores the solution space by allowing a controlled number of deviations ($k$) from a base greedy heuristic.

### Key Features
*   **Generic Framework:** `KDeviationOptimizer` base class for implementing custom solvers.
*   **TSP Solver:** High-performance solver for TSPLIB instances.
*   **Knapsack Solver:** Adapts the logic using a global efficiency ratio heuristic.
*   **Visualizers:** HTML/JS visualizers for algorithm demonstration.
*   **CLI:** Robust command-line interface for running solvers and benchmarks.

### Architecture
*   **Core Logic:**
    *   `k-optimizer.js`: Abstract base class containing the meta-heuristic logic.
    *   `tsp-solver.js`: Implementation for TSP (Nearest Neighbor heuristic).
    *   `knapsack-solver.js`: Implementation for Knapsack (Value/Weight ratio heuristic).
*   **CLI & Tools:**
    *   `k-alternatives-cli.js`: Main entry point for the CLI.
    *   `benchmark.js`: Suite for running automated benchmarks.
    *   `knapsack-loader.js`: Parser for benchmark files.

## Building and Running

### Prerequisites
*   Node.js >= 12.0.0

### Installation
```bash
npm install
```

### CLI Usage
To solve a specific TSP instance:
```bash
node k-alternatives-cli.js tsplib/berlin52.tsp --maxK 5 --debug
```
*   `--maxK N`: Maximum number of deviations allowed (default: log(n)).
*   `--debug`: Enable verbose output.
*   `--output file`: Save results to a JSON file.

### Benchmarks
The project includes several pre-configured benchmark scripts:
```bash
# Run all small benchmarks (50-80 cities)
npm run benchmark:small

# Run medium benchmarks (100-150 cities)
npm run benchmark:medium

# Run a fast benchmark suite (K=3)
npm run benchmark:fast

# Run a thorough benchmark suite (K=7)
npm run benchmark:thorough
```

### Testing
The project uses `vitest` for testing.
```bash
npm test
```

## Development Conventions

*   **Language:** JavaScript (Node.js).
*   **Code Style:** Standard JavaScript conventions.
*   **Documentation:**
    *   General project docs in `README.md` and `README-CLI.md`.
    *   Deep algorithmic details in `k-alternatives-memory-bank/algorithm.md`.
*   **Data:**
    *   TSPLIB instances are located in `tsplib/`.
    *   JSON parsed instances in `tsplib-json/`.
*   **Algorithm Design:**
    *   Solvers should extend `KDeviationOptimizer`.
    *   Implementations must define problem-specific heuristics and state management.

## Directory Structure

*   `k-alternatives-memory-bank/`: Detailed documentation and roadmap.
*   `tsplib/`: Raw benchmark data files.
*   `results/`: Output directory for benchmark runs (generated).
*   `old-k-search/`: Legacy implementations and experiments.
