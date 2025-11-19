# k-Alternatives: A General-Purpose Meta-Heuristic

**Repository:** [https://github.com/mcarbonell/k-alternatives-meta-algorithm](https://github.com/mcarbonell/k-alternatives-meta-algorithm)

**Author:** Mario Raúl Carbonell Martínez

**k-Alternatives** is a stochastic search algorithm designed to optimize combinatorial problems by exploring controlled deviations from a heuristic baseline.

Originally designed for the **Traveling Salesperson Problem (TSP)**, the architecture has been generalized to solve other optimization problems, such as the **Knapsack Problem**, demonstrating remarkable robustness.

## 🧠 The Core Concept

The algorithm is based on **Limited Discrepancy Search (LDS)** combined with a **Multi-Start Construction** strategy.

1.  **Base Heuristic:** The algorithm relies on a greedy heuristic (e.g., "Nearest Neighbor" for TSP, "Value/Weight Ratio" for Knapsack).
2.  **k-Deviations:** Instead of always following the heuristic, the algorithm is allowed to make up to $K$ "sub-optimal" choices (deviations) during the construction of a solution.
3.  **Multi-Start:** The solver attempts to build solutions starting from different initial states (e.g., starting the tour at different cities or packing the knapsack starting with different items).

## 🚀 Features

*   **Generic Framework:** A `KDeviationOptimizer` base class that implements the core search logic, agnostic of the specific problem.
*   **TSP Solver:**
    *   Supports TSPLIB format (EUC_2D, GEO, EXPLICIT matrices).
    *   Visualizer included (`index-legacy.html`).
    *   Consistently finds solutions within **2-3% of the optimal** for medium-sized problems (N=50-100).
*   **Knapsack Solver:**
    *   Adapts the logic to use a **Global Heuristic** (Efficiency Ratio).
    *   Successfully solves **Strongly Correlated** hard instances (Pisinger).
    *   Demonstrates that a "Multi-Start Greedy" approach is extremely powerful for this domain.
*   **CLI & Web Worker Support:** Runs in Node.js for benchmarks and in the browser for visualization.

---

## ⚖️ Comparison & Use Cases

Why use **k-Alternatives**? It occupies a "sweet spot" between naive algorithms and complex academic solvers. It offers **80% of the performance of state-of-the-art solvers with only 10% of the implementation complexity.**

| Algorithm | Implementation | Solution Quality | Parameter Tuning | Robustness |
| :--- | :---: | :---: | :---: | :---: |
| **Greedy (NN)** | ⭐⭐⭐⭐⭐ (Trivial) | ⭐⭐ (Poor) | None | High |
| **2-Opt (Hill Climbing)** | ⭐⭐⭐⭐ (Easy) | ⭐⭐⭐ (Decent) | Low | Medium |
| **Simulated Annealing** | ⭐⭐⭐⭐ (Easy) | ⭐⭐⭐⭐ (Good) | **High** (Difficult) | Low (Random) |
| **Genetic Algos (GA)** | ⭐⭐⭐ (Medium) | ⭐⭐⭐⭐ (Good) | **Very High** | Low (Slow) |
| **k-Alternatives (This)**| ⭐⭐⭐⭐ (Easy) | ⭐⭐⭐⭐ (Good) | **Low** (Just K) | **High** |

### Ideal Scenarios
1.  **Game Development (RTS / RPG):** Units that need to visit multiple points or collect items smartly. LKH is overkill (too much C++ code), and Greedy looks stupid. k-Alternatives is lightweight and makes units appear intelligent.
2.  **Real-Time Logistics:** Mobile apps that need to route 20-50 stops quickly on the client-side (JavaScript/native) without draining battery or requiring a backend server.
3.  **"Zero-Config" Optimization:** Scenarios where you cannot afford to tune temperature parameters (SA) or mutation rates (GA). This algorithm works robustly "out of the box".

---

## 🌍 TSP Implementation & Benchmarks

The TSP solver (`tsp-solver.js`) uses the "Nearest Neighbor" approach as its base heuristic. The `k-Alternatives` meta-algorithm then explores permutations of starting cities and `k` deviations from this greedy path.

### Key Findings

*   **Small/Medium Problems (N < 100):** The algorithm is highly effective and fast, consistently finding optimal or near-optimal solutions.
    *   `berlin52` (N=52): Achieves **30.0% success rate** with K=3 in ~3 seconds, with an average cost only 2.27% above optimal.
    *   `st70` (N=70): A harder landscape. With K=3, the average cost is 2.36% above optimal, but often requires more time to converge within a single run.
*   **Larger Problems (N >= 100):** The search space grows exponentially, making higher K values computationally expensive.
    *   `kroA100` (N=100): With K=2, it achieved an optimal solution in 10% of runs, with an average cost 1.62% above optimal, within 4 seconds.
    *   `ch130` (N=130): Similar performance, with K=2 achieving solutions averaging 3.17% above optimal, within the 10-second time limit.

**Strategy for Larger TSP Instances:** For problems with N > 100, a multi-start strategy with lower K (e.g., K=1 or K=2) across many runs is generally more efficient than a single run with a very high K. Further optimizations, such as candidate lists or integration with more advanced local search (e.g., 2-opt/3-opt), would be necessary to tackle very large TSP instances (N > 1000).

---

## 🎒 Knapsack Implementation & Benchmarks

We adapted the algorithm to the 0/1 Knapsack Problem (`knapsack-solver.js`) to test its generality.

### Architecture Adaptation
Unlike TSP, which uses local heuristics (nearest neighbors relative to the current city), the Knapsack solver uses a **Single Global Heuristic**: items sorted by their Value/Weight ratio.
*   **K=0 (Multi-Start Greedy):** Tries to fill the knapsack greedily, but repeats the process forcing it to start with the 1st item, then the 2nd, then the 3rd, etc. This is enabled by setting `shuffle: false` in the `KDeviationOptimizer` options, which makes the multi-start deterministic based on the heuristic order.
*   **K>0:** Allows skipping the "next best" item to try a lower-ratio item, filling gaps that a pure greedy approach leaves empty.

### Results on Hard Instances (Pisinger)
We tested against **Strongly Correlated** instances from the Pisinger benchmark (known to be difficult for standard greedy algorithms).

| Instance | Type | N | Result | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `knapPI_3_100_1000_1` | Strongly Correlated | 100 | **OPTIMAL** | Found even with K=0 (Multi-Start Greedy) |
| `knapPI_3_200_1000_1` | Strongly Correlated | 200 | **OPTIMAL** | Found even with K=0 (Multi-Start Greedy) |
| Trap Case (Synthetic) | Trap | 3 | **OPTIMAL** | Solved where Pure Greedy (single start) fails |

**Insight:** The "Multi-Start" capability (trying $N$ different greedy seeds in a deterministic order) proved to be incredibly effective for the Knapsack problem, solving hard instances without needing deep $K$ deviations. This highlights the power of exploring multiple construction paths, even with a strong base heuristic.

---

## 🎁 Bonus: Recursive "Ripple" Insertion Algorithm

Included in this repository is a second, distinct experimental algorithm designed specifically for **Dynamic TSP** (e.g., adding stops to an existing route in real-time).

**Key Concept:** Spatially-Constrained Cheapest Insertion with Ripple Local Search.
1.  **Insert:** A new city is inserted using standard Cheapest Insertion.
2.  **Ripple Effect:** A "shockwave" of re-optimization propagates from the insertion point.
3.  **Spatial Constraint:** Uses a **KD-Tree** to only check the $M$ nearest spatial neighbors for re-optimization, drastically reducing complexity from $O(N^2)$ to $O(N \times M)$.

This algorithm behaves like an elastic band, organically adjusting the local tour structure as new points are added.

**Demo:** Open `tsp-spatial-insertion-animated.html` in your browser to visualize the algorithm.

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

*   `k-optimizer.js`: The abstract base class containing the meta-heuristic logic.
*   `tsp-solver.js`: Specific implementation for the Traveling Salesperson Problem.
*   `knapsack-solver.js`: Specific implementation for the 0/1 Knapsack Problem.
*   `knapsack-loader.js`: Parser for Pisinger/OR-Library benchmark files.
*   `tsplib-json/`: Directory containing pre-parsed TSPLIB instances in JSON format.
*   `tsp-spatial-insertion-animated.html`: Interactive demo of the "Ripple Insertion" algorithm.

## 🙌 Acknowledgments

*   **Gemini (AI Assistant):** For significant contributions to code refactoring, algorithm analysis, debugging, and comprehensive documentation of this repository.

## 📜 License
MIT