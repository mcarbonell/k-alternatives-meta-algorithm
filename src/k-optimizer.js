/**
 * k-Deviation Optimizer - Generic Base Class
 *
 * Abstract base class implementing the k-Alternatives meta-heuristic algorithm.
 * This algorithm combines:
 * - Limited Discrepancy Search (LDS) - Allows k "sub-optimal" heuristic choices
 * - Multi-Start Strategy - Builds solutions from different starting points
 * - Adaptive Learning - Reinforces successful decisions by reordering heuristic lists
 *
 * @author Mario Raúl Carbonell Martínez
 * @version 1.0.0
 */
class KDeviationOptimizer {
    /**
     * Creates a new K-Deviation Optimizer instance.
     * @param {Object} options - Configuration options
     * @param {number} [options.maxK=5] - Maximum number of alternative heuristic choices allowed
     * @param {number|null} [options.maxIterations=null] - Maximum number of iterations before stopping
     * @param {number|null} [options.maxTime=null] - Maximum time in seconds before stopping
     * @param {boolean} [options.stopAtOptimal=true] - Stop when optimal solution is found
     * @param {Function|null} [options.onProgress=null] - Callback fired periodically during search
     * @param {Function|null} [options.onImprovement=null] - Callback fired when a better solution is found
     * @param {Function|null} [options.onSolution=null] - Callback fired when search completes
     * @param {Function|null} [options.onOptimalFound=null] - Callback fired when optimal is found
     * @param {Function|null} [options.onMaxIterationsReached=null] - Callback when max iterations reached
     * @param {Function|null} [options.onMaxTimeReached=null] - Callback when time limit reached
     * @param {boolean} [options.shuffle=true] - Whether to randomize starting points
     * @param {boolean} [options.maximize=false] - If true, maximize value (e.g. Knapsack). Default minimizes (e.g. TSP).
     */
    constructor(options = {}) {
        this.options = {
            maxK: options.maxK || 5,
            maxIterations: options.maxIterations || null,
            maxTime: options.maxTime || null,
            stopAtOptimal: options.stopAtOptimal !== false,
            onProgress: options.onProgress || null,
            onImprovement: options.onImprovement || null,
            onSolution: options.onSolution || null,
            onOptimalFound: options.onOptimalFound || null,
            onMaxIterationsReached: options.onMaxIterationsReached || null,
            onMaxTimeReached: options.onMaxTimeReached || null,
            shuffle: options.shuffle !== false,
            maximize: options.maximize || false,
        };

        // Generic state
        this.bestSolution = null;
        this.bestValue = this.options.maximize ? -Infinity : Infinity;
        this.optimalValue = null;
        this.problemName = 'Unknown';

        // Runtime variables
        this.iteration = 0;
        this.improvements = 0;
        this.currentK = 0;
        this.isRunning = false;
        this.startTime = null;
        this.optimalFoundTime = null;
        this.limitReached = null; // null or reason string: 'maxIterations', 'maxTime', 'optimal'
        this.isFinished = false; // Flag to prevent duplicate final callbacks
    }

    // --- Methods to be implemented by subclasses ---

    /**
     * Initializes the problem-specific data.
     * Must be implemented by subclasses.
     * @abstract
     * @param {Object} problemData - The problem data structure
     * @throws {Error} If not implemented by subclass
     */
    initializeProblem(_problemData) {
        throw new Error('initializeProblem() must be implemented by subclass');
    }

    /**
     * Returns the initial solution to start the search.
     * Must be implemented by subclasses.
     * @abstract
     * @returns {Array} Initial solution array
     * @throws {Error} If not implemented by subclass
     */
    getInitialSolution() {
        throw new Error('getInitialSolution() must be implemented by subclass');
    }

    /**
     * Returns the heuristic choices for the current item.
     * Must be implemented by subclasses.
     * @abstract
     * @param {*} currentItem - The current item being processed
     * @param {Set} remainingItems - Set of remaining items to choose from
     * @returns {Array} Ordered list of choices (best first)
     * @throws {Error} If not implemented by subclass
     */
    getHeuristicChoices(_currentItem, _remainingItems) {
        throw new Error('getHeuristicChoices() must be implemented by subclass');
    }

    /**
     * Evaluates a solution and returns its value.
     * Must be implemented by subclasses.
     * @abstract
     * @param {Array} solution - The solution to evaluate
     * @returns {number} The solution value (lower is better for minimization)
     * @throws {Error} If not implemented by subclass
     */
    evaluateSolution(_solution) {
        throw new Error('evaluateSolution() must be implemented by subclass');
    }

    /**
     * Updates heuristics based on the improved solution.
     * Optional for subclasses to implement.
     * @param {Array} improvedSolution - The improved solution found
     */
    updateHeuristics(_improvedSolution) {
        // This method is optional for subclasses to implement
    }

    // --- Generic Algorithm Core ---

    /**
     * Checks and evaluates a solution, updating best if improved.
     * @param {Array} solution - The solution to check
     */
    checkSolution(solution) {
        this.iteration++;

        if (this.isFinished) return;

        // Check limits
        if (this.options.maxIterations && this.iteration >= this.options.maxIterations) {
            this.limitReached = 'maxIterations';
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
                this.limitReached = 'maxTime';
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
        const isBetter = this.options.maximize
            ? solutionValue > this.bestValue
            : solutionValue < this.bestValue;
        if (isBetter) {
            this.improvements++;
            this.bestValue = solutionValue;
            this.bestSolution = [...solution];
            this.updateHeuristics(this.bestSolution);

            if (this.options.onImprovement) {
                this.options.onImprovement(this.getStats());
            }

            if (
                this.optimalValue !== null &&
                this.optimalValue !== undefined &&
                (this.options.maximize
                    ? this.bestValue >= this.optimalValue
                    : this.bestValue <= this.optimalValue) &&
                !this.optimalFoundTime
            ) {
                this.optimalFoundTime = Date.now() - this.startTime;
                if (this.options.onOptimalFound) {
                    this.options.onOptimalFound(this.getStats());
                }
                if (this.options.stopAtOptimal) {
                    this.isRunning = false;
                    this.limitReached = 'optimal';
                }
            }
        }
    }

    /**
     * Performs systematic search with limited discrepancies.
     * Implements depth-first search allowing up to k alternative choices.
     * @param {Set} remainingItems - Set of unvisited items
     * @param {Array} currentSolution - Current partial solution
     * @param {number} alternativesLeft - Number of alternative choices remaining
     * @param {number} [depth=0] - Current recursion depth (safety guard)
     */
    systematicSearch(remainingItems, currentSolution, alternativesLeft, depth = 0) {
        if (!this.isRunning) return;

        const MAX_DEPTH = 10000;
        if (depth > MAX_DEPTH) return;

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
                this.systematicSearch(
                    remainingItems,
                    currentSolution,
                    alternativesLeft - (validChoicesFound - 1),
                    depth + 1
                );
                remainingItems.add(nextItem);
                currentSolution.pop();
            }
        }
    }

    /**
     * Main solving loop - iterates through starting points and k values.
     * @private
     */
    solve() {
        if (!this.isRunning) {
            this.finishSolving();
            return;
        }

        const improvementsBeforeK = this.improvements;

        // Create the execution order of starting items.
        // If shuffle is true (default), we randomize to explore diverse starting points (good for TSP).
        // If shuffle is false, we stick to the order provided in this.allItems (good for Knapsack/Greedy).
        const order = [...Array(this.allItems.length).keys()];
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

    /**
     * Handles cleanup when solving finishes.
     * @private
     */
    finishSolving() {
        if (this.options.onSolution && !this.isFinished) {
            this.isFinished = true;
            this.options.onSolution(this.getFinalResult());
        }
    }

    // --- Control & Utility Methods ---

    /**
     * Starts the optimization process.
     * @param {Object} problemData - The problem data to solve
     * @throws {Error} If solver is already running
     */
    start(problemData) {
        if (this.isRunning) throw new Error('Solver is already running.');

        // 1. Initialize problem-specific data
        this.initializeProblem(problemData);

        // 2. Reset state
        this.bestValue = this.options.maximize ? -Infinity : Infinity;
        this.iteration = 0;
        this.improvements = 0;
        this.currentK = 0;
        this.optimalFoundTime = null;
        this.limitReached = null;
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

    /**
     * Stops the optimization process.
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Fisher-Yates shuffle algorithm.
     * @param {Array} array - Array to shuffle in place
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Returns current statistics about the search.
     * @returns {Object} Current stats including iteration, improvements, bestValue, etc.
     */
    getStats() {
        let deviation = 'N/A';
        if (this.optimalValue !== null && this.optimalValue !== undefined) {
            deviation = this.options.maximize
                ? ((this.optimalValue - this.bestValue) / this.optimalValue) * 100
                : ((this.bestValue - this.optimalValue) / this.optimalValue) * 100;
        }
        return {
            iteration: this.iteration,
            improvements: this.improvements,
            bestValue: this.bestValue,
            currentK: this.currentK,
            optimalValue: this.optimalValue,
            deviation: deviation,
            elapsedTime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
            isRunning: this.isRunning,
        };
    }

    /**
     * Returns the final result object with all solution details.
     * @returns {Object} Final result including distance, iterations, time, etc.
     */
    getFinalResult() {
        const totalTime = Math.floor((Date.now() - this.startTime) / 1000);
        let deviation = null;
        if (this.optimalValue !== null && this.optimalValue !== undefined) {
            deviation = this.options.maximize
                ? ((this.optimalValue - this.bestValue) / this.optimalValue) * 100
                : ((this.bestValue - this.optimalValue) / this.optimalValue) * 100;
            deviation = parseFloat(deviation.toFixed(2));
        }
        return {
            problem: this.problemName,
            distance: this.bestValue, // Using 'distance' for compatibility with test
            bestDistance: this.bestValue,
            optimal: this.optimalValue,
            deviation: deviation !== null ? parseFloat(deviation.toFixed(2)) : null,
            totalTime: totalTime,
            iterations: this.iteration,
            route: this.bestSolution,
            limitReached: this.limitReached,
        };
    }

    /**
     * Reports progress to the onProgress callback if configured.
     * @private
     */
    reportProgress() {
        if (this.options.onProgress) {
            this.options.onProgress(this.getStats());
        }
    }
}

export { KDeviationOptimizer };
