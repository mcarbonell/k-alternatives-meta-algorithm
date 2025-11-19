/**
 * k-Deviation Optimizer - Generic Base Class
 * Author: Mario Raúl Carbonell Martínez (Refactored by Gemini)
 */

class KDeviationOptimizer {
    constructor(options = {}) {
        this.options = {
            maxK: options.maxK || 5,
            maxIterations: options.maxIterations || null,
            maxTime: options.maxTime || null, // in seconds
            stopAtOptimal: options.stopAtOptimal !== false,
            onProgress: options.onProgress || null,
            onImprovement: options.onImprovement || null,
            onSolution: options.onSolution || null,
            onOptimalFound: options.onOptimalFound || null,
            onMaxIterationsReached: options.onMaxIterationsReached || null,
            onMaxTimeReached: options.onMaxTimeReached || null,
            shuffle: options.shuffle !== false // Default to true
        };

        // Generic state
        this.bestSolution = null;
        this.bestValue = Infinity;
        this.optimalValue = null;
        this.problemName = 'Unknown';

        // Runtime variables
        this.iteration = 0;
        this.improvements = 0;
        this.currentK = 0;
        this.isRunning = false;
        this.startTime = null;
        this.optimalFoundTime = null;
        this.limitReached = false;
        this.isFinished = false; // Flag to prevent duplicate final callbacks
    }

    // --- Methods to be implemented by subclasses ---

    initializeProblem(problemData) {
        throw new Error("initializeProblem() must be implemented by subclass");
    }

    getInitialSolution() {
        throw new Error("getInitialSolution() must be implemented by subclass");
    }

    getHeuristicChoices(currentItem, remainingItems) {
        throw new Error("getHeuristicChoices() must be implemented by subclass");
    }

    evaluateSolution(solution) {
        throw new Error("evaluateSolution() must be implemented by subclass");
    }

    updateHeuristics(improvedSolution) {
        // This method is optional for subclasses to implement
    }

    // --- Generic Algorithm Core ---

    checkSolution(solution) {
        this.iteration++;

        if (this.isFinished) return;

        // Check limits
        if (this.options.maxIterations && this.iteration >= this.options.maxIterations) {
            this.limitReached = true;
            this.isRunning = false;
            if (this.options.onMaxIterationsReached && !this.isFinished) {
                this.isFinished = true;
                this.options.onMaxIterationsReached(this.getFinalResult());
            }
            return;
        }
        if (this.options.maxTime) {
            const elapsedTime = (Date.now() - this.startTime) / 1000;
            if (elapsedTime >= this.options.maxTime) {
                this.limitReached = true;
                this.isRunning = false;
                if (this.options.onMaxTimeReached && !this.isFinished) {
                    this.isFinished = true;
                    this.options.onMaxTimeReached(this.getFinalResult());
                }
                return;
            }
        }

        if (this.iteration % 100000 === 0) this.reportProgress();

        const solutionValue = this.evaluateSolution(solution);
        if (solutionValue < this.bestValue) { // Assuming lower is better for now
            this.improvements++;
            this.bestValue = solutionValue;
            this.bestSolution = [...solution];
            this.updateHeuristics(this.bestSolution);

            if (this.options.onImprovement) {
                this.options.onImprovement(this.getStats());
            }

            if (this.optimalValue && this.bestValue <= this.optimalValue && !this.optimalFoundTime) {
                this.optimalFoundTime = Date.now() - this.startTime;
                if (this.options.onOptimalFound) {
                    this.options.onOptimalFound(this.getStats());
                }
                if (this.options.stopAtOptimal) {
                    this.isRunning = false;
                    this.limitReached = true;
                }
            }
        }
    }

    systematicSearch(remainingItems, currentSolution, alternativesLeft) {
        if (!this.isRunning) return;

        if (remainingItems.size === 0) {
            this.checkSolution(currentSolution);
            return;
        }

        const currentItem = currentSolution[currentSolution.length - 1];
        const choices = this.getHeuristicChoices(currentItem, remainingItems);
        let validChoicesFound = 0;

        for (let i = 0; i < choices.length && validChoicesFound <= alternativesLeft; i++) {
            const nextItem = choices[i];
            if (remainingItems.has(nextItem)) {
                validChoicesFound++;
                currentSolution.push(nextItem);
                remainingItems.delete(nextItem);
                this.systematicSearch(remainingItems, currentSolution, alternativesLeft - (validChoicesFound - 1));
                remainingItems.add(nextItem);
                currentSolution.pop();
            }
        }
    }

    solve() {
        if (!this.isRunning) {
            this.finishSolving();
            return;
        }

        const improvementsBeforeK = this.improvements;

        // Create the execution order of starting items.
        // If shuffle is true (default), we randomize to explore diverse starting points (good for TSP).
        // If shuffle is false, we stick to the order provided in this.allItems (good for Knapsack/Greedy).
        let order = [...Array(this.allItems.length).keys()];
        if (this.options.shuffle) {
            this.shuffle(order);
        }

        const allItemsSet = new Set(this.allItems);

        for (let i = 0; i < order.length && this.isRunning; i++) {
            // order[i] is the index in this.allItems array
            // We need the actual item ID from this.allItems
            const startItem = this.allItems[order[i]];
            
            // Optimized: Reuse the Set instead of creating a new one every time
            allItemsSet.delete(startItem);
            this.systematicSearch(allItemsSet, [startItem], this.currentK);
            allItemsSet.add(startItem);
        }

        // If improvements were made at this K level, repeat the search for the same K
        // with a new random shuffle of starting points (ONLY if shuffling is enabled).
        if (this.improvements > improvementsBeforeK && this.isRunning && this.options.shuffle) {
            setTimeout(() => this.solve(), 0);
            return;
        }

        // Otherwise, move to the next K
        this.currentK++;
        if (this.currentK <= this.options.maxK && this.isRunning) {
            setTimeout(() => this.solve(), 0);
        } else {
            this.finishSolving();
        }
    }

    finishSolving() {
        if (this.options.onSolution && !this.isFinished) {
            this.isFinished = true;
            this.options.onSolution(this.getFinalResult());
        }
    }

    // --- Control & Utility Methods ---

    start(problemData) {
        if (this.isRunning) throw new Error('Solver is already running.');

        // 1. Initialize problem-specific data
        this.initializeProblem(problemData);

        // 2. Reset state
        this.bestValue = Infinity;
        this.iteration = 0;
        this.improvements = 0;
        this.currentK = 0;
        this.optimalFoundTime = null;
        this.limitReached = false;
        this.isRunning = true;
        this.startTime = Date.now();

        // 3. Auto-determine maxK if not set
        if (!this.options.maxK) {
            this.options.maxK = Math.floor(Math.log(this.allItems.length));
        }

        // 4. Get initial solution
        this.bestSolution = this.getInitialSolution();
        this.checkSolution(this.bestSolution);

        // 5. Start solving or finish if optimum is already found
        if (this.isRunning) {
            this.solve();
        } else {
            this.finishSolving();
        }
    }

    stop() {
        this.isRunning = false;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getStats() {
        const deviation = this.optimalValue ? ((this.bestValue / this.optimalValue - 1) * 100) : 'N/A';
        return {
            iteration: this.iteration,
            improvements: this.improvements,
            bestValue: this.bestValue,
            currentK: this.currentK,
            optimalValue: this.optimalValue,
            deviation: deviation,
            elapsedTime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
            isRunning: this.isRunning
        };
    }
    
    getFinalResult() {
        const totalTime = Math.floor((Date.now() - this.startTime) / 1000);
        const deviation = this.optimalValue ? ((this.bestValue / this.optimalValue - 1) * 100) : null;
        return {
            problem: this.problemName,
            distance: this.bestValue, // Using 'distance' for compatibility with test
            bestDistance: this.bestValue,
            optimal: this.optimalValue,
            deviation: deviation !== null ? parseFloat(deviation.toFixed(2)) : null,
            totalTime: totalTime,
            iterations: this.iteration,
            route: this.bestSolution,
            limitReached: this.limitReached ? (this.options.maxIterations ? 'maxIterations' : 'maxTime') : null
        };
    }
    
    reportProgress() {
        if (this.options.onProgress) {
            this.options.onProgress(this.getStats());
        }
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KDeviationOptimizer };
} else {
    self.KDeviationOptimizer = KDeviationOptimizer;
}
