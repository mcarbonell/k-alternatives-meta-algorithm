/**
 * k-Alternatives TSP Solver - Specific Implementation
 *
 * Implements the k-Alternatives meta-heuristic for the Traveling Salesman Problem.
 * Uses Nearest Neighbor heuristic as the base heuristic for constructing routes.
 * Supports multiple edge weight types: EUC_2D, CEIL_2D, GEO, ATT, EXPLICIT.
 *
 * @author Mario Raúl Carbonell Martínez
 * @extends KDeviationOptimizer
 */
import { KDeviationOptimizer } from './k-optimizer.js';

class TSPSolver extends KDeviationOptimizer {
    /**
     * Creates a new TSP Solver instance.
     * @param {Object} options - Configuration options (inherited from KDeviationOptimizer)
     */
    constructor(options = {}) {
        super(options);

        // TSP-specific state
        this.cities = [];
        this._distances = null; // Float64Array (flat, row-major: i * n + j)
        this._n = 0; // number of cities
        this.localHeuristics = [];
        this.candidateListSize = options.candidateListSize ?? 20;
        this.edgeWeightType = 'EUC_2D';
    }

    // --- Implementation of abstract methods ---

    /**
     * Initializes the TSP problem from problem data.
     * @param {Object} problemData - Problem data with cities and metadata
     */
    initializeProblem(problemData) {
        this.cities = problemData.cities || [];
        this.edgeWeightType = problemData.metadata.edgeWeightType || 'EUC_2D';
        this.edgeWeightFormat = problemData.metadata.edgeWeightFormat || '';
        this.problemName = problemData.metadata.name || 'Unknown';
        this.optimalValue = problemData.metadata.optimalDistance || null;

        // Explicit weights handling
        const explicitWeights = problemData.edgeWeights;
        const dimension = problemData.metadata.dimension;

        if (this.cities.length === 0 && dimension > 0) {
            // Create dummy cities for logic compatibility (indices)
            this.cities = Array.from({ length: dimension }, () => ({ x: 0, y: 0 }));
        }

        this.allItems = this.cities.map((_, i) => i);

        if (this.edgeWeightType === 'EXPLICIT' && explicitWeights) {
            this.initializeExplicitDistanceMatrix(explicitWeights, dimension);
        } else {
            if (this.cities.length === 0) {
                console.error('[TSPSolver] No cities provided to initializeProblem.');
                throw new Error('Cannot initialize TSP problem with 0 cities.');
            }
            this.initializeDistanceMatrix();
        }

        this.initializeLocalHeuristics();
    }

    /**
     * Initializes distance matrix from explicit edge weights.
     * @param {Array<number>} weights - Flat array of edge weights
     * @param {number} dimension - Number of cities
     */
    initializeExplicitDistanceMatrix(weights, dimension) {
        this._n = dimension;
        this._distances = new Float64Array(dimension * dimension);

        if (this.edgeWeightFormat === 'LOWER_DIAG_ROW') {
            let k = 0;
            for (let i = 0; i < dimension; i++) {
                for (let j = 0; j < i; j++) {
                    const dist = weights[k++];
                    this._distances[i * dimension + j] = dist;
                    this._distances[j * dimension + i] = dist;
                }
            }
        } else if (this.edgeWeightFormat === 'FULL_MATRIX') {
            let k = 0;
            for (let i = 0; i < dimension; i++) {
                for (let j = 0; j < dimension; j++) {
                    this._distances[i * dimension + j] = weights[k++];
                }
            }
        } else {
            if (weights.length === (dimension * (dimension - 1)) / 2) {
                let k = 0;
                for (let i = 0; i < dimension; i++) {
                    for (let j = 0; j < i; j++) {
                        const dist = weights[k++];
                        this._distances[i * dimension + j] = dist;
                        this._distances[j * dimension + i] = dist;
                    }
                }
            } else {
                console.warn(
                    `[TSPSolver] Unsupported explicit weight format: ${this.edgeWeightFormat}. Treating as 0.`
                );
            }
        }
    }

    /**
     * Returns initial solution using Nearest Neighbor heuristic.
     * @returns {Array<number>} Initial route (array of city indices)
     */
    getInitialSolution() {
        // Simple greedy (nearest neighbor) initial solution
        const initialRoute = [];
        const visited = new Set();
        let currentCity = 0; // Start from city 0 for consistency

        initialRoute.push(currentCity);
        visited.add(currentCity);

        while (visited.size < this.cities.length) {
            let nearestCity = -1;
            let minDistance = Infinity;
            for (let i = 0; i < this.cities.length; i++) {
                if (!visited.has(i)) {
                    const dist = this.distance(currentCity, i);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestCity = i;
                    }
                }
            }
            if (nearestCity !== -1) {
                initialRoute.push(nearestCity);
                visited.add(nearestCity);
                currentCity = nearestCity;
            } else {
                // This should not happen for a connected graph
                console.warn('No nearest city found!', {
                    currentCity,
                    remaining: this.cities.length - visited.size,
                });
                // Fallback: Pick a random unvisited city
                const unvisited = [...this.allItems].filter((c) => !visited.has(c));
                if (unvisited.length > 0) {
                    const randomCity = unvisited[Math.floor(Math.random() * unvisited.length)];
                    initialRoute.push(randomCity);
                    visited.add(randomCity);
                    currentCity = randomCity;
                } else {
                    console.error('No unvisited cities left, yet route is incomplete!');
                    break; // Escape infinite loop if somehow stuck
                }
            }
        }
        return initialRoute;
    }

    /**
     * Returns nearest neighbor list for the current city.
     * Uses candidate list (top N nearest) with fallback to all remaining cities.
     * @param {number} currentItem - Current city index
     * @param {Set} remainingItems - Set of unvisited city indices
     * @returns {Array<number>} Ordered list of candidate cities
     */
    getHeuristicChoices(currentItem, remainingItems) {
        const candidates = this.localHeuristics[currentItem];
        // Check if any candidates are still remaining
        for (let i = 0; i < candidates.length; i++) {
            if (remainingItems.has(candidates[i])) {
                return candidates; // At least one candidate is valid, use the list
            }
        }
        // Fallback: no candidates remaining, return all remaining items
        return [...remainingItems];
    }

    /**
     * Evaluates a TSP solution by calculating total route distance.
     * @param {Array<number>} solution - Route as array of city indices
     * @returns {number} Total distance of the route
     */
    evaluateSolution(solution) {
        return this.calculateRouteDistance(solution);
    }

    /**
     * Updates local heuristics by reinforcing successful edges.
     * Moves successful connections to the front of neighbor lists.
     * @param {Array<number>} improvedRoute - The improved route found
     */
    updateHeuristics(improvedRoute) {
        for (let i = 0; i < improvedRoute.length - 1; i++) {
            const city1 = improvedRoute[i];
            const city2 = improvedRoute[i + 1];
            this._moveToFront(city1, city2);
            this._moveToFront(city2, city1);
        }
    }

    /**
     * Moves target to front of city's neighbor list (swap-based, no allocation).
     * @param {number} city - The city whose list to reorder
     * @param {number} target - The neighbor to promote
     * @private
     */
    _moveToFront(city, target) {
        const list = this.localHeuristics[city];
        if (list[0] === target) return;
        const idx = list.indexOf(target);
        if (idx > 0) {
            // Swap down to front
            for (let k = idx; k > 0; k--) {
                list[k] = list[k - 1];
            }
            list[0] = target;
        }
    }

    // --- TSP-specific methods ---

    /**
     * Initializes the distance matrix from city coordinates as a flat Float64Array.
     */
    initializeDistanceMatrix() {
        const n = this.cities.length;
        this._n = n;
        this._distances = new Float64Array(n * n);
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const d = this.calcDistance(this.cities[i], this.cities[j]);
                this._distances[i * n + j] = d;
                this._distances[j * n + i] = d;
            }
        }
    }

    /**
     * Initializes local heuristic lists (nearest neighbors for each city).
     * Uses candidate lists (top N nearest) with fallback to all cities.
     */
    initializeLocalHeuristics() {
        const n = this._n;
        const candidateSize = Math.min(this.candidateListSize, n - 1);
        this.localHeuristics = [];

        for (let i = 0; i < n; i++) {
            const neighbors = [];
            for (let j = 0; j < n; j++) {
                if (j !== i) neighbors.push(j);
            }
            neighbors.sort((a, b) => this.distance(i, a) - this.distance(i, b));
            this.localHeuristics[i] =
                candidateSize < n - 1 ? neighbors.slice(0, candidateSize) : neighbors;
        }
    }

    /**
     * Returns the distance between two cities from the precomputed matrix.
     * @param {number} city1 - First city index
     * @param {number} city2 - Second city index
     * @returns {number} Distance between cities
     */
    distance(city1, city2) {
        return this._distances[city1 * this._n + city2];
    }

    /**
     * Calculates total distance of a route.
     * @param {Array<number>} route - Array of city indices forming a tour
     * @returns {number} Total route distance
     */
    calculateRouteDistance(route) {
        const dist = this._distances;
        const n = this._n;
        const len = route.length;
        let totalDistance = 0;
        for (let i = 0; i < len; i++) {
            totalDistance += dist[route[i] * n + route[(i + 1) % len]];
        }
        return Math.round(totalDistance);
    }

    // --- Distance Calculation Functions (TSP-specific) ---

    /**
     * Calculates distance between two cities based on edge weight type.
     * @param {Object} city1 - First city {x, y}
     * @param {Object} city2 - Second city {x, y}
     * @returns {number} Calculated distance
     */
    calcDistance(city1, city2) {
        switch (this.edgeWeightType) {
            case 'EUC_2D':
                return Math.round(
                    Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2))
                );
            case 'CEIL_2D':
                return Math.ceil(
                    Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2))
                );
            case 'GEO':
                return this.geoDistance(city1, city2);
            case 'ATT':
                return this.attDistance(city1, city2);
            default:
                return Math.round(
                    Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2))
                );
        }
    }

    /**
     * Calculates geographical (great circle) distance between cities.
     * @param {Object} c1 - First city {x, y}
     * @param {Object} c2 - Second city {x, y}
     * @returns {number} Geographical distance
     */
    geoDistance(c1, c2) {
        const R = 6378.388;
        const toRad = (deg) => (deg * Math.PI) / 180.0;
        const lat1 = toRad(c1.y);
        const lon1 = toRad(c1.x);
        const lat2 = toRad(c2.y);
        const lon2 = toRad(c2.x);
        const q1 = Math.cos(lon1 - lon2);
        const q2 = Math.cos(lat1 - lat2);
        const q3 = Math.cos(lat1 + lat2);
        return Math.floor(R * Math.acos(0.5 * ((1.0 + q1) * q2 - (1.0 - q1) * q3)) + 1.0);
    }

    /**
     * Calculates ATT (Airport Tank Truck) distance between cities.
     * @param {Object} c1 - First city {x, y}
     * @param {Object} c2 - Second city {x, y}
     * @returns {number} ATT distance
     */
    attDistance(c1, c2) {
        const xd = c1.x - c2.x;
        const yd = c1.y - c2.y;
        const rij = Math.sqrt((xd * xd + yd * yd) / 10.0);
        const tij = Math.round(rij);
        return tij < rij ? tij + 1 : tij;
    }
}

export { TSPSolver };
