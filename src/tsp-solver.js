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
        this.distances = [];
        this.localHeuristics = [];
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
        this.distances = [];
        for (let i = 0; i < dimension; i++) {
            this.distances[i] = new Array(dimension).fill(0);
        }

        if (this.edgeWeightFormat === 'LOWER_DIAG_ROW') {
            let k = 0;
            for (let i = 0; i < dimension; i++) {
                for (let j = 0; j < i; j++) {
                    const dist = weights[k++];
                    this.distances[i][j] = dist;
                    this.distances[j][i] = dist;
                }
                this.distances[i][i] = 0;
            }
        } else if (this.edgeWeightFormat === 'FULL_MATRIX') {
            let k = 0;
            for (let i = 0; i < dimension; i++) {
                for (let j = 0; j < dimension; j++) {
                    this.distances[i][j] = weights[k++];
                }
            }
        } else {
            // Fallback: Try to infer or assume LOWER_DIAG_ROW if length matches
            if (weights.length === (dimension * (dimension - 1)) / 2) {
                // Is lower diag row
                let k = 0;
                for (let i = 0; i < dimension; i++) {
                    for (let j = 0; j < i; j++) {
                        const dist = weights[k++];
                        this.distances[i][j] = dist;
                        this.distances[j][i] = dist;
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
     * @param {number} currentItem - Current city index
     * @param {Set} remainingItems - Set of unvisited city indices
     * @returns {Array<number>} Ordered list of nearest cities
     */
    getHeuristicChoices(currentItem, _remainingItems) {
        // For TSP, the heuristic is the list of nearest cities
        return this.localHeuristics[currentItem];
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
     * @param {Array<number>} improvedRoute - The improved route found
     */
    updateHeuristics(improvedRoute) {
        // When a better route is found, reinforce the connections (edges)
        // Match original behavior: do NOT wrap around, treat as open path for heuristic update
        for (let i = 0; i < improvedRoute.length - 1; i++) {
            const city1 = improvedRoute[i];
            const city2 = improvedRoute[i + 1];

            // Move successful connection to the front of the heuristic list for both cities
            if (this.localHeuristics[city1][0] !== city2) {
                this.localHeuristics[city1] = [
                    city2,
                    ...this.localHeuristics[city1].filter((c) => c !== city2),
                ];
            }
            if (this.localHeuristics[city2][0] !== city1) {
                this.localHeuristics[city2] = [
                    city1,
                    ...this.localHeuristics[city2].filter((c) => c !== city1),
                ];
            }
        }
    }

    // --- TSP-specific methods ---

    /**
     * Initializes the distance matrix from city coordinates.
     */
    initializeDistanceMatrix() {
        this.distances = [];
        for (let i = 0; i < this.cities.length; i++) {
            this.distances[i] = [];
            for (let j = 0; j < this.cities.length; j++) {
                this.distances[i][j] =
                    i === j ? 0 : this.calcDistance(this.cities[i], this.cities[j]);
            }
        }
    }

    /**
     * Initializes local heuristic lists (nearest neighbors for each city).
     */
    initializeLocalHeuristics() {
        this.localHeuristics = [];
        for (let i = 0; i < this.cities.length; i++) {
            const sortedNeighbors = this.allItems
                .filter((j) => i !== j)
                .sort((a, b) => this.distance(i, a) - this.distance(i, b));
            this.localHeuristics[i] = sortedNeighbors;
        }
    }

    /**
     * Returns the distance between two cities from the precomputed matrix.
     * @param {number} city1 - First city index
     * @param {number} city2 - Second city index
     * @returns {number} Distance between cities
     */
    distance(city1, city2) {
        return this.distances[city1][city2];
    }

    /**
     * Calculates total distance of a route.
     * @param {Array<number>} route - Array of city indices forming a tour
     * @returns {number} Total route distance
     */
    calculateRouteDistance(route) {
        let totalDistance = 0;
        for (let i = 0; i < route.length; i++) {
            totalDistance += this.distance(route[i], route[(i + 1) % route.length]);
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
