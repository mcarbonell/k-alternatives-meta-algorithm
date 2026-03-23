# Quick Start Guide

Get up and running with k-Alternatives in 5 minutes.

## Installation

```bash
git clone https://github.com/mcarbonell/k-alternatives-meta-algorithm.git
cd k-alternatives-meta-algorithm
npm install
```

## Quick Example: TSP

```javascript
import { TSPSolver } from './tsp-solver.js';
import fs from 'fs';

// Load a TSP problem
const problem = JSON.parse(
    fs.readFileSync('tsplib-json/berlin52.json', 'utf8')
);

// Create solver
const solver = new TSPSolver({
    maxK: 3, // Allow 3 deviations from greedy
    maxTime: 10, // 10 second time limit
    stopAtOptimal: true,
});

// Solve
solver.start(problem);

// Or with callbacks
const result = await new Promise((resolve) => {
    solver.options.onSolution = resolve;
    solver.options.onMaxTimeReached = resolve;
    solver.start(problem);
});

console.log(`Best distance: ${result.bestDistance}`);
console.log(`Deviation: ${result.deviation}%`);
```

## Quick Example: Knapsack

```javascript
import { KnapsackSolver } from './knapsack-solver.js';

const problem = {
    name: 'MyKnapsack',
    items: [
        { v: 60, w: 10 }, // value, weight
        { v: 100, w: 20 },
        { v: 120, w: 30 },
    ],
    maxWeight: 50,
    optimalValue: 280,
};

const solver = new KnapsackSolver({
    maxK: 3,
    maxTime: 10,
});

const result = await new Promise((resolve) => {
    solver.options.onSolution = resolve;
    solver.start(problem);
});

console.log(`Best value: ${result.value}`);
```

## CLI Usage

```bash
# Solve a TSP file
node k-alternatives-cli.js -f tsplib-json/berlin52.json -k 3 -t 10

# Run benchmarks
npm run benchmark:tiny      # Fast (~15s)
npm run benchmark:quick      # Medium (~5min)
npm run benchmark:standard   # Full (~15min)
```

## Configuration Options

| Option          | Type     | Default | Description                       |
| --------------- | -------- | ------- | --------------------------------- |
| `maxK`          | number   | 5       | Maximum deviations from heuristic |
| `maxTime`       | number   | null    | Time limit in seconds             |
| `maxIterations` | number   | null    | Maximum iterations                |
| `stopAtOptimal` | boolean  | true    | Stop when optimal found           |
| `shuffle`       | boolean  | true    | Randomize starting points         |
| `onSolution`    | function | null    | Callback when solution found      |
| `onImprovement` | function | null    | Callback on improvement           |
| `onProgress`    | function | null    | Callback on progress              |

## Running Tests

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Project Structure

```
k-alternatives/
├── k-optimizer.js       # Core meta-heuristic (base class)
├── tsp-solver.js       # TSP implementation
├── knapsack-solver.js  # Knapsack implementation
├── benchmark.*.js      # Benchmark scripts
├── tsplib-json/        # TSP benchmark problems
└── .github/workflows/  # CI configuration
```

## Next Steps

- See [README.md](./README.md) for algorithm details
- Check [PLAN.md](./PLAN.md) for development roadmap
- Run `npm run benchmark:tiny` to test the algorithm
