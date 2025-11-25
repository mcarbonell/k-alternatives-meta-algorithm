# Ripple Insertion: A Spatially-Constrained Dynamic TSP Solver

**Author:** Mario Raúl Carbonell Martínez

**Ripple Insertion** (Recursive Cheapest Insertion) is an experimental algorithm designed for **Dynamic TSP** scenarios. Unlike traditional solvers that calculate a route from scratch, this algorithm specializes in **integrating new points into an existing route in real-time**, optimizing locally via a cascading "ripple" effect.

## 🌊 The Core Concept

Imagine the TSP tour as a tight elastic band stretched around nails (cities).
1.  **Insertion:** When you add a new nail, you stretch the band to cover it (Cheapest Insertion).
2.  **Tension (Ripple):** This action creates local "tension" at the insertion point. The new city might pull the route into a shape that makes a neighboring city's position inefficient.
3.  **Relaxation:** The algorithm checks the "stressed" cities. If moving a city to a nearby edge releases tension (shortens distance), it moves.
4.  **Propagation:** Moving that city creates *new* tension at its old and new positions. The check propagates outwards like a ripple until the route stabilizes.

## ⚙️ Architecture

The algorithm relies on three key components working in unison:

### 1. Initial Insertion (Global Cheapest Insertion)
When a new node $N_{new}$ is added:
*   We scan the current tour to find the edge $(A, B)$ where inserting $N_{new}$ results in the minimum total distance increase.
*   Complexity: $O(N)$ (where $N$ is current tour size).

### 2. Spatial Query (KD-Tree)
To optimize efficiently, we avoid checking every possible position in the tour.
*   A **KD-Tree** maintains the spatial index of all cities.
*   When optimizing a node, we query its **$M$ Nearest Neighbors** (e.g., $M=20$).
*   We *only* consider moving the node to edges adjacent to these spatial neighbors. This assumes that a city's optimal position in the tour is likely near its physical location.

### 3. Cascade Queue (The Ripple)
This is the recursive/iterative engine.
*   A `Set` (queue) tracks "Active Nodes" that need optimization.
*   Initially, the inserted node and its immediate neighbors are added.
*   **Loop:** While the set is not empty:
    1.  Pop a node $C$.
    2.  Use KD-Tree to find candidate positions (edges near $C$).
    3.  Calculate the **Gain** of moving $C$ to a new position vs. keeping it.
    4.  **If Gain > 0:**
        *   Move $C$.
        *   Add $C$'s *old* neighbors to the queue (edge broken).
        *   Add $C$'s *new* neighbors to the queue (edge created).
        *   (Optional) Add $C$ back to queue.

## 📝 Pseudo-Code

```python
function AddCity(newCity):
    KDTree.insert(newCity)
    
    # Step 1: Standard Insertion
    best_edge = FindCheapestInsertion(newCity, current_tour)
    Insert(newCity, best_edge)
    
    # Step 2: Trigger Ripple
    Queue.add(newCity)
    Queue.add(best_edge.startNode)
    Queue.add(best_edge.endNode)
    
    ProcessRipple(Queue)

function ProcessRipple(Queue):
    while Queue is not empty:
        node = Queue.pop()
        
        # Constrained Search
        spatial_neighbors = KDTree.nearest(node, K=20)
        candidate_edges = GetEdgesConnectedTo(spatial_neighbors)
        
        best_move = null
        
        # Check if moving 'node' to a candidate edge improves cost
        for edge in candidate_edges:
            gain = CostOfRemoving(node) - CostOfInserting(node, edge)
            if gain > 0:
                best_move = edge
                
        if best_move:
            # Apply topology change
            old_neighbors = GetNeighbors(node)
            MoveNode(node, best_move)
            
            # Propagate instability
            Queue.add(old_neighbors)
            Queue.add(best_move.startNode)
            Queue.add(best_move.endNode)
```

## 📊 Complexity & Performance

Let $N$ be the number of cities and $M$ be the number of spatial neighbors checked.

*   **Standard Local Search (2-Opt/Relocate):** Typically scans $O(N^2)$ moves to find an improvement.
*   **Ripple Insertion:**
    *   Insertion: $O(N)$
    *   Optimization Step: $O(M)$ (Checking $M$ neighbors is constant time relative to $N$).
    *   Total Complexity: $O(N + C \cdot M)$, where $C$ is the number of cascade steps (ripples).
    *   In practice, $C$ is small for local adjustments.

**Result:** An algorithm that scales almost linearly $O(N)$ for inserting points, making it capable of handling real-time interactions with hundreds or thousands of nodes without lag.

## 🎯 Use Cases

| Scenario | Recommended Solver | Why? |
| :--- | :--- | :--- |
| **Static Planning** (Route 100 stops from scratch) | **k-Alternatives** | Better global optimization power. |
| **Dynamic/Online** (Add stop to active route) | **Ripple Insertion** | Retains existing route structure while locally optimizing. Instant feedback. |
| **Interactive UI** (User clicks to add points) | **Ripple Insertion** | Visually pleasing "organic" adjustment; zero UI freeze. |
| **Gaming AI** (RTS Unit Pathing) | **Ripple Insertion** | Fast, "good enough" routing that reacts to map changes. |

## 🔍 Demo

Open `tsp-spatial-insertion-animated.html` in your browser to visualize the algorithm.
*   **Green Node:** The newly inserted city.
*   **Yellow Nodes:** Cities currently being evaluated/moved by the ripple effect.
*   **Blue Lines (Inspect Mode):** Visualizes the KD-Tree neighbor queries.