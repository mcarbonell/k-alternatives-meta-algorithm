/**
 * TSP Solver Legacy - Port of the original robust implementation
 * Adapted from old-k-search/solve-worker.js
 */

class TSPSolverLegacy {
    constructor(options = {}) {
        this.options = {
            maxK: options.maxK || 5,
            maxIterations: options.maxIterations || null,
            maxTime: options.maxTime || null,
            stopAtOptimal: options.stopAtOptimal !== false,
            onProgress: options.onProgress || null,
            onImprovement: options.onImprovement || null,
            onSolution: options.onSolution || null,
            onOptimalFound: options.onOptimalFound || null
        };

        this.cities = [];
        this.distances = [];
        this.initialHeuristics = [];
        this.localHeuristics = [];
        
        this.bestRoute = [];
        this.bestDistance = Infinity;
        this.optimalValue = null;
        
        this.iteration = 0;
        this.improvements = 0;
        this.currentK = 1;
        
        this.isRunning = false;
        this.startTime = null;
        this.optimalFoundTime = null;
    }

    initializeProblem(problemData) {
        this.cities = problemData.cities;
        this.optimalValue = problemData.metadata ? problemData.metadata.optimalDistance : null;
        
        // Calculate distances matrix
        this.distances = this.cities.map((_, i) =>
            this.cities.map((_, j) => this.calcDistance(this.cities[i], this.cities[j]))
        );

        // Initialize heuristics
        this.initialHeuristics = this.cities.map((_, i) =>
            this.cities.map((_, j) => j).filter(j => j !== i).sort((a, b) =>
                this.distances[i][a] - this.distances[i][b]
            )
        );

        // Clone for local heuristics
        this.localHeuristics = this.initialHeuristics.map(row => [...row]);
    }
    
    calcDistance(city1, city2) {
        // Assuming EUC_2D as per original implementation
        return Math.round(Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2)));
    }

    calculateTotalDistance(route) {
        let totalDistance = this.distances[route[route.length - 1]][route[0]];
        for (let i = 0; i < route.length - 1; i++) {
            totalDistance += this.distances[route[i]][route[i + 1]];
        }
        return totalDistance;
    }

    getInitialSolution() {
        // Original implementation used a simple greedy or random approach
        // For consistency, let's use a greedy nearest neighbor from node 0
        const route = [0];
        const visited = new Set([0]);
        
        while (visited.size < this.cities.length) {
            const current = route[route.length - 1];
            // Use initial heuristic (sorted neighbors)
            for (const neighbor of this.initialHeuristics[current]) {
                if (!visited.has(neighbor)) {
                    route.push(neighbor);
                    visited.add(neighbor);
                    break;
                }
            }
        }
        return route;
    }

    start(problemData) {
        if (this.isRunning) return;
        
        this.initializeProblem(problemData);
        this.isRunning = true;
        this.startTime = Date.now();
        
        // Initial solution
        this.bestRoute = this.getInitialSolution();
        this.bestDistance = this.calculateTotalDistance(this.bestRoute);
        
        // Initial check
        this.checkRoute(this.bestRoute);
        
        // Start solving loop
        this.solveLoop();
    }

    stop() {
        this.isRunning = false;
    }

    solveLoop() {
        if (!this.isRunning) return;

        let improvedInThisK = true;
        
        const runStep = () => {
            if (!this.isRunning) return;
            
            // Check time limits
            if (this.options.maxTime && (Date.now() - this.startTime) / 1000 > this.options.maxTime) {
                this.finish();
                return;
            }
            
            if (improvedInThisK) {
                improvedInThisK = false;
                let order = [...Array(this.cities.length).keys()];
                this.shuffle(order);
                
                // Using setImmediate/setTimeout pattern to not block loop completely
                // But original was synchronous inside the while(improved).
                // We'll execute one full pass of cities per tick to allow stopping/reporting
                
                for (let i = 0; i < this.cities.length; i++) {
                    if (!this.isRunning) return;
                    
                    let startCity = order[i];
                    // Optimized Set creation as per your recent fix, but sticking to logic
                    let remainingCities = new Set(this.cities.map((_, index) => index));
                    remainingCities.delete(startCity);
                    
                    // Track improvements in this specific search
                    const improvementsBefore = this.improvements;
                    this.systematicAlternativesSearch(remainingCities, [startCity], this.currentK);
                    
                    if (this.improvements > improvementsBefore) {
                        improvedInThisK = true;
                    }
                }
                
                // Schedule next iteration
                if (typeof setImmediate !== 'undefined') setImmediate(runStep);
                else setTimeout(runStep, 0);
                
            } else {
                // No improvements in this K level, increase K
                this.currentK++;
                if (this.currentK <= this.options.maxK) {
                    improvedInThisK = true; // Reset for new K
                    if (typeof setImmediate !== 'undefined') setImmediate(runStep);
                    else setTimeout(runStep, 0);
                } else {
                    this.finish();
                }
            }
        };
        
        runStep();
    }

    systematicAlternativesSearch(remainingCities, currentRoute, alternativesLeft) {
        if (remainingCities.size === 0) {
            this.checkRoute(currentRoute);
            return;
        }

        let currentCity = currentRoute[currentRoute.length - 1];
        let heuristic = this.localHeuristics[currentCity];
        let validCitiesFound = 0;

        for (let i = 0; i < heuristic.length && validCitiesFound <= alternativesLeft; i++) {
            if (!this.isRunning) return;

            let nextCity = heuristic[i];
            if (remainingCities.has(nextCity)) {
                validCitiesFound++;
                currentRoute.push(nextCity);
                remainingCities.delete(nextCity);
                this.systematicAlternativesSearch(remainingCities, currentRoute, alternativesLeft - (validCitiesFound - 1));
                remainingCities.add(nextCity);
                currentRoute.pop();
            }
        }
    }

    checkRoute(currentRoute) {
        this.iteration++;
        
        if (this.iteration % 100000 === 0 && this.options.onProgress) {
            this.options.onProgress(this.getStats());
        }

        let routeDistance = this.calculateTotalDistance(currentRoute);
        
        if (routeDistance < this.bestDistance) {
            this.updateBestRoute(routeDistance, currentRoute);
        }
    }

    updateBestRoute(routeDistance, currentRoute) {
        this.improvements++;
        this.bestDistance = routeDistance;
        this.bestRoute = [...currentRoute];
        this.updateLocalHeuristics(this.bestRoute);
        
        if (this.options.onImprovement) {
            this.options.onImprovement(this.getStats());
        }
        
        if (this.optimalValue && this.bestDistance <= this.optimalValue) {
            if (!this.optimalFoundTime) {
                this.optimalFoundTime = Date.now() - this.startTime;
                if (this.options.onOptimalFound) this.options.onOptimalFound(this.getStats());
                if (this.options.stopAtOptimal) this.isRunning = false;
            }
        }
    }

    updateLocalHeuristics(improvedRoute) {
        for (let i = 0; i < improvedRoute.length - 1; i++) { // Match original: length - 1
            let city1 = improvedRoute[i];
            let city2 = improvedRoute[i + 1];

            if (this.localHeuristics[city1][0] !== city2) {
                this.localHeuristics[city1] = [city2, ...this.localHeuristics[city1].filter(c => c !== city2)];
            }
            if (this.localHeuristics[city2][0] !== city1) {
                this.localHeuristics[city2] = [city1, ...this.localHeuristics[city2].filter(c => c !== city1)];
            }
        }
    }

    shuffle(array) {
        let currentIndex = array.length;
        while (currentIndex != 0) {
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
    }

    finish() {
        this.isRunning = false;
        if (this.options.onSolution) {
            this.options.onSolution(this.getFinalResult());
        }
    }

    getStats() {
        const deviation = this.optimalValue ? ((this.bestDistance / this.optimalValue - 1) * 100) : null;
        return {
            iteration: this.iteration,
            improvements: this.improvements,
            bestValue: this.bestDistance, // Consistent naming for CLI
            bestDistance: this.bestDistance,
            currentK: this.currentK,
            elapsedTime: (Date.now() - this.startTime) / 1000,
            deviation: deviation,
            route: this.bestRoute
        };
    }

    getFinalResult() {
        return {
            ...this.getStats(),
            problem: this.options.problemName || 'Unknown',
            optimal: this.optimalValue
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TSPSolverLegacy };
} else {
    self.TSPSolverLegacy = TSPSolverLegacy;
}
