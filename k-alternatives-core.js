/**
 * k-Alternatives TSP Solver - Specific Implementation
 * Author: Mario Raúl Carbonell Martínez (Refactored by Gemini)
 */

const { KDeviationOptimizer } = require('./k-optimizer.js');

class TSPSolver extends KDeviationOptimizer {
    constructor(options = {}) {
        super(options);

        // TSP-specific state
        this.cities = [];
        this.distances = [];
        this.localHeuristics = [];
        this.edgeWeightType = 'EUC_2D';
    }

    // --- Implementation of abstract methods ---

    initializeProblem(problemData) {
        this.cities = problemData.cities;
        this.edgeWeightType = problemData.metadata.edgeWeightType || 'EUC_2D';
        this.problemName = problemData.metadata.name || 'Unknown';
        this.optimalValue = problemData.metadata.optimalDistance || null;
        this.allItems = this.cities.map((_, i) => i);

        this.initializeDistanceMatrix();
        this.initializeLocalHeuristics();
    }

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
            }
        }
        return initialRoute;
    }

    getHeuristicChoices(currentItem, remainingItems) {
        // For TSP, the heuristic is the list of nearest cities
        return this.localHeuristics[currentItem];
    }

    evaluateSolution(solution) {
        // For TSP, evaluation is calculating the total route distance
        return this.calculateRouteDistance(solution);
    }

    updateHeuristics(improvedRoute) {
        // When a better route is found, reinforce the connections (edges)
        for (let i = 0; i < improvedRoute.length; i++) {
            const city1 = improvedRoute[i];
            const city2 = improvedRoute[(i + 1) % improvedRoute.length]; // Wrap around for the last edge

            // Move successful connection to the front of the heuristic list for both cities
            if (this.localHeuristics[city1][0] !== city2) {
                this.localHeuristics[city1] = [city2, ...this.localHeuristics[city1].filter(c => c !== city2)];
            }
            if (this.localHeuristics[city2][0] !== city1) {
                this.localHeuristics[city2] = [city1, ...this.localHeuristics[city2].filter(c => c !== city1)];
            }
        }
    }

    // --- TSP-specific methods ---

    initializeDistanceMatrix() {
        this.distances = [];
        for (let i = 0; i < this.cities.length; i++) {
            this.distances[i] = [];
            for (let j = 0; j < this.cities.length; j++) {
                this.distances[i][j] = (i === j) ? 0 : this.calcDistance(this.cities[i], this.cities[j]);
            }
        }
    }

    initializeLocalHeuristics() {
        this.localHeuristics = [];
        for (let i = 0; i < this.cities.length; i++) {
            const sortedNeighbors = this.allItems
                .filter(j => i !== j)
                .sort((a, b) => this.distance(i, a) - this.distance(i, b));
            this.localHeuristics[i] = sortedNeighbors;
        }
    }

    distance(city1, city2) {
        return this.distances[city1][city2];
    }

    calculateRouteDistance(route) {
        let totalDistance = 0;
        for (let i = 0; i < route.length; i++) {
            totalDistance += this.distance(route[i], route[(i + 1) % route.length]);
        }
        return Math.round(totalDistance);
    }

    // --- Distance Calculation Functions (TSP-specific) ---

    calcDistance(city1, city2) {
        switch (this.edgeWeightType) {
            case 'EUC_2D':
                return Math.round(Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2)));
            case 'CEIL_2D':
                return Math.ceil(Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2)));
            case 'GEO':
                return this.geoDistance(city1, city2);
            case 'ATT':
                return this.attDistance(city1, city2);
            default:
                return Math.round(Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2)));
        }
    }

    geoDistance(c1, c2) {
        const R = 6378.388;
        const toRad = (deg) => deg * Math.PI / 180.0;
        const lat1 = toRad(c1.y);
        const lon1 = toRad(c1.x);
        const lat2 = toRad(c2.y);
        const lon2 = toRad(c2.x);
        const q1 = Math.cos(lon1 - lon2);
        const q2 = Math.cos(lat1 - lat2);
        const q3 = Math.cos(lat1 + lat2);
        return Math.floor(R * Math.acos(0.5 * ((1.0 + q1) * q2 - (1.0 - q1) * q3)) + 1.0);
    }

    attDistance(c1, c2) {
        const xd = c1.x - c2.x;
        const yd = c1.y - c2.y;
        const rij = Math.sqrt((xd * xd + yd * yd) / 10.0);
        const tij = Math.round(rij);
        return (tij < rij) ? tij + 1 : tij;
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TSPSolver };
} else {
    self.TSPSolver = TSPSolver;
}
