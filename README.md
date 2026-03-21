# k-Alternatives: A General-Purpose Meta-Heuristic

**Repository:**
[https://github.com/mcarbonell/k-alternatives-meta-algorithm](https://github.com/mcarbonell/k-alternatives-meta-algorithm)

**Author:** Mario Raúl Carbonell Martínez

**k-Alternatives** is a stochastic search algorithm designed to optimize
combinatorial problems by exploring controlled deviations from a heuristic
baseline.

Originally designed for the **Traveling Salesperson Problem (TSP)**, the
architecture has been generalized to solve other optimization problems, such as
the **Knapsack Problem**, demonstrating remarkable robustness.

## 🧠 The Core Concept

The algorithm combines **Limited Discrepancy Search (LDS)** with **Multi-Start
Construction** and introduces a **novel adaptive learning mechanism** that makes
it unique in the landscape of optimization algorithms.

### 1. Base Heuristic

The algorithm relies on a greedy heuristic to guide solution construction:

- **TSP**: "Nearest Neighbor" - at each step, choose the closest unvisited city
- **Knapsack**: "Value/Weight Ratio" - sort items by efficiency and choose the
  best available
- **General**: Any local decision heuristic that suggests the "best next choice"

### 2. k-Deviations

Instead of always following the heuristic, the algorithm allows up to **k
"sub-optimal" choices** (deviations) during construction:

- **k=0**: Pure greedy - always follow the best heuristic choice
- **k=1**: Try the second-best choice once
- **k=2**: Try alternatives twice, exploring a wider solution space
- **k=n**: Eventually reaches exhaustive search

### 3. Multi-Start Strategy

The solver builds solutions from different starting points to avoid local
minima:

- **TSP**: Start tours from different cities
- **Knapsack**: Force the greedy construction to start with different items
- This systematic exploration ensures diverse solution coverage

## 🧠 Adaptive Learning: Reinforcement Learning Without Neural Networks

**This is the most innovative aspect of k-Alternatives.**

The algorithm implements **Reinforcement Learning concepts** using simple data
structures instead of neural networks or Q-tables. Each decision point maintains
a **learned policy** that evolves based on successful solutions.

### How Learning Works

When the algorithm discovers a **better solution**, it **reinforces the
decisions** that led to that solution by reordering the heuristic lists:

```javascript
// When a better route is found, successful edges move to the front
function updateHeuristics(improvedRoute) {
    for (let i = 0; i < improvedRoute.length - 1; i++) {
        const city1 = improvedRoute[i];
        const city2 = improvedRoute[i + 1];

        // Move successful connection to front of heuristic list
        if (heuristics[city1][0] !== city2) {
            heuristics[city1] = [
                city2,
                ...heuristics[city1].filter((c) => c !== city2),
            ];
        }
        // Same for the reverse edge
        if (heuristics[city2][0] !== city1) {
            heuristics[city2] = [
                city1,
                ...heuristics[city2].filter((c) => c !== city1),
            ];
        }
    }
}
```

**Result**: Successful decisions become the "first choice" (k=0), allowing
future searches to exploit learned knowledge at minimal cost.

### Learning as RL Framework

| RL Concept       | k-Alternatives Implementation                 |
| ---------------- | --------------------------------------------- |
| **State**        | Current partial solution + remaining choices  |
| **Action**       | Choose next element (city/item)               |
| **Policy π**     | `heuristics[state]` - ordered list of choices |
| **Reward**       | Improvement in global solution quality        |
| **Q-values**     | Implicit in the ordering of heuristic list    |
| **Exploration**  | `k` parameter - higher k = more deviation     |
| **Exploitation** | `k=0` - follow learned best choices           |
| **Learning**     | Reordering heuristic lists based on success   |

### Why This Approach is Powerful

1. **No Hyperparameters**: Unlike Q-learning (α, γ) or Neural Networks (learning
   rate, architecture), k-Alternatives has a single parameter: `k`

2. **Interpretable**: You can inspect `heuristics[city]` to see what the
   algorithm has "learned" about good connections

3. **Fast Convergence**: Updates only happen on confirmed improvements, unlike
   gradient descent which may converge slowly

4. **Memory Efficient**: O(n²) storage vs exponential Q-tables

5. **Deterministic Control**: Randomization only affects exploration order, not
   the learning mechanism

## 🚀 Features

- **Generic Framework:** A `KDeviationOptimizer` base class that implements the
  core search logic, agnostic of the specific problem.
- **Adaptive Learning:** Heuristics evolve based on successful solutions,
  creating a "memory" of good decisions.
- **TSP Solver:**
    - Supports TSPLIB format (EUC_2D, GEO, EXPLICIT matrices).
    - Visualizer included (`index-legacy.html`).
    - Consistently finds solutions within **2-3% of the optimal** for
      medium-sized problems (N=50-100).
- **Knapsack Solver:**
    - Adapts the logic to use a **Global Heuristic** (Efficiency Ratio).
    - Successfully solves **Strongly Correlated** hard instances (Pisinger).
    - Demonstrates that a "Multi-Start Greedy" approach is extremely powerful
      for this domain.
- **CLI & Web Worker Support:** Runs in Node.js for benchmarks and in the
  browser for visualization.

---

## ⚖️ Comparison & Use Cases

Why use **k-Alternatives**? It occupies a "sweet spot" between naive algorithms
and complex academic solvers. It offers **80% of the performance of
state-of-the-art solvers with only 10% of the implementation complexity.**

| Algorithm                 | Implementation       | Solution Quality | Parameter Tuning     | Robustness   |
| ------------------------- | -------------------- | ---------------- | -------------------- | ------------ |
| **Greedy (NN)**           | ⭐⭐⭐⭐⭐ (Trivial) | ⭐⭐ (Poor)      | None                 | High         |
| **2-Opt (Hill Climbing)** | ⭐⭐⭐⭐ (Easy)      | ⭐⭐⭐ (Decent)  | Low                  | Medium       |
| **Simulated Annealing**   | ⭐⭐⭐⭐ (Easy)      | ⭐⭐⭐⭐ (Good)  | **High** (Difficult) | Low (Random) |
| **Genetic Algos (GA)**    | ⭐⭐⭐ (Medium)      | ⭐⭐⭐⭐ (Good)  | **Very High**        | Low (Slow)   |
| **k-Alternatives (This)** | ⭐⭐⭐⭐ (Easy)      | ⭐⭐⭐⭐ (Good)  | **Low** (Just K)     | **High**     |

### Ideal Scenarios

1.  **Game Development (RTS / RPG):** Units that need to visit multiple points
    or collect items smartly. LKH is overkill (too much C++ code), and Greedy
    looks stupid. k-Alternatives is lightweight and makes units appear
    intelligent.
2.  **Real-Time Logistics:** Mobile apps that need to route 20-50 stops quickly
    on the client-side (JavaScript/native) without draining battery or requiring
    a backend server.
3.  **"Zero-Config" Optimization:** Scenarios where you cannot afford to tune
    temperature parameters (SA) or mutation rates (GA). This algorithm works
    robustly "out of the box".

---

## 🌍 TSP Implementation & Benchmarks

The TSP solver (`tsp-solver.js`) uses the "Nearest Neighbor" approach as its
base heuristic. The `k-Alternatives` meta-algorithm then explores permutations
of starting cities and `k` deviations from this greedy path.

### Key Findings

- **Small/Medium Problems (N < 100):** The algorithm is highly effective and
  fast, consistently finding optimal or near-optimal solutions.
    - `berlin52` (N=52): Achieves **30.0% success rate** with K=3 in ~3 seconds,
      with an average cost only 2.27% above optimal.
    - `st70` (N=70): A harder landscape. With K=3, the average cost is 2.36%
      above optimal, but often requires more time to converge within a single
      run.
- **Larger Problems (N >= 100):** The search space grows exponentially, making
  higher K values computationally expensive.
    - `kroA100` (N=100): With K=2, it achieved an optimal solution in 10% of
      runs, with an average cost 1.62% above optimal, within 4 seconds.
    - `ch130` (N=130): Similar performance, with K=2 achieving solutions
      averaging 3.17% above optimal, within the 10-second time limit.

**Strategy for Larger TSP Instances:** For problems with N > 100, a multi-start
strategy with lower K (e.g., K=1 or K=2) across many runs is generally more
efficient than a single run with a very high K. Further optimizations, such as
candidate lists or integration with more advanced local search (e.g.,
2-opt/3-opt), would be necessary to tackle very large TSP instances (N > 1000).

---

## 🎒 Knapsack Implementation & Benchmarks

We adapted the algorithm to the 0/1 Knapsack Problem (`knapsack-solver.js`) to
test its generality.

### Architecture Adaptation

Unlike TSP, which uses local heuristics (nearest neighbors relative to the
current city), the Knapsack solver uses a **Single Global Heuristic**: items
sorted by their Value/Weight ratio.

- **K=0 (Multi-Start Greedy):** Tries to fill the knapsack greedily, but repeats
  the process forcing it to start with the 1st item, then the 2nd, then the 3rd,
  etc. This is enabled by setting `shuffle: false` in the `KDeviationOptimizer`
  options, which makes the multi-start deterministic based on the heuristic
  order.
- **K>0:** Allows skipping the "next best" item to try a lower-ratio item,
  filling gaps that a pure greedy approach leaves empty.

### Results on Hard Instances (Pisinger)

We tested against **Strongly Correlated** instances from the Pisinger benchmark
(known to be difficult for standard greedy algorithms).

| Instance              | Type                | N   | Result      | Notes                                         |
| :-------------------- | :------------------ | :-- | :---------- | :-------------------------------------------- |
| `knapPI_3_100_1000_1` | Strongly Correlated | 100 | **OPTIMAL** | Found even with K=0 (Multi-Start Greedy)      |
| `knapPI_3_200_1000_1` | Strongly Correlated | 200 | **OPTIMAL** | Found even with K=0 (Multi-Start Greedy)      |
| Trap Case (Synthetic) | Trap                | 3   | **OPTIMAL** | Solved where Pure Greedy (single start) fails |

**Insight:** The "Multi-Start" capability (trying $N$ different greedy seeds in
a deterministic order) proved to be incredibly effective for the Knapsack
problem, solving hard instances without needing deep $K$ deviations. This
highlights the power of exploring multiple construction paths, even with a
strong base heuristic.

---

## 🎁 Bonus: Recursive "Ripple" Insertion Algorithm

Included in this repository is a second, distinct experimental algorithm
designed specifically for **Dynamic TSP** (e.g., adding stops to an existing
route in real-time).

**Key Concept:** Spatially-Constrained Cheapest Insertion with Ripple Local
Search.

1.  **Insert:** A new city is inserted using KD-Tree accelerated Cheapest
    Insertion.
2.  **Ripple Effect:** A "shockwave" of re-optimization propagates from the
    insertion point.
3.  **Spatial Constraint:** Uses a **KD-Tree** for both insertion ($O(\log N)$)
    and neighbor queries, drastically reducing complexity from $O(N^2)$ to
    $O(N \times M)$ for optimization.

This algorithm behaves like an elastic band, organically adjusting the local
tour structure as new points are added.

### Ripple Insertion Benchmarks

Despite being designed for **dynamic insertion** (not static optimization),
Ripple Insertion achieves excellent results on standard TSPLIB instances:

| Instance | N   | Optimal | Ripple Insertion | Gap      |
| -------- | --- | ------- | ---------------- | -------- |
| eil51    | 51  | 426     | 445              | 4.4%     |
| berlin52 | 52  | 7542    | 7783             | 3.2%     |
| st70     | 70  | 675     | 701              | 3.8%     |
| kroA100  | 100 | 21282   | 21393            | **0.5%** |
| eil101   | 101 | 629     | 660              | 4.9%     |
| ch130    | 130 | 6110    | 6369             | 4.2%     |
| ch150    | 150 | 6528    | 6693             | 2.5%     |

**Average Gap: ~4%** - Remarkable for an $O(N \log N)$ algorithm that processes
cities incrementally!

**Demo:** Open `ripple-insertion-animated.html` in your browser to visualize the
algorithm and test against TSPLIB instances.

---

## 🛠️ Usage

### Running Benchmarks (Node.js)

```bash
# Run the Knapsack Benchmark (Pisinger instances)
node knapsack-benchmark-real.js

# Run the TSP Statistical Analysis
node tsp-stats.js
```

### Visualizer

Open `index-legacy.html` in a modern browser to watch the TSP solver in action.

## 📂 Project Structure

- `k-optimizer.js`: The abstract base class containing the meta-heuristic logic.
- `tsp-solver.js`: Specific implementation for the Traveling Salesperson
  Problem.
- `knapsack-solver.js`: Specific implementation for the 0/1 Knapsack Problem.
- `knapsack-loader.js`: Parser for Pisinger/OR-Library benchmark files.
- `tsplib-json/`: Directory containing pre-parsed TSPLIB instances in JSON
  format.
- `ripple-insertion-animated.html`: Interactive demo of the "Ripple Insertion"
  algorithm.

## 🙌 Acknowledgments

Special thanks to **Pisinger** for providing challenging Knapsack benchmarks and
to the creators of **TSPLIB** for their invaluable TSP datasets.

Thanks also to:

- **Gerhard Reinelt** for his work on TSPLIB and standardizing TSP benchmark
  formats
- The **OR-Library** team for maintaining a comprehensive collection of
  optimization problem instances and benchmarks
- All the researchers and practitioners who have advanced the field of
  combinatorial optimization
- The open source community for valuable feedback and suggestions

---

## 📜 License

MIT
