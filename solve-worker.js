/**
 * k-Alternatives Web Worker
 * Uses the TSPSolver class
 */

// Import core (in worker context, this will be loaded via importScripts)
const timestamp = Date.now();
importScripts(`k-optimizer.js?v=${timestamp}`, `tsp-solver.js?v=${timestamp}`);

let solver = null;

function startSolving(data) {
    try {
        // Initialize solver with callbacks
        solver = new TSPSolver({
            maxK: data.maxK,
            stopAtOptimal: true,
            debug: data.debug,
            onProgress: (stats) => {
                self.postMessage({
                    type: 'stats',
                    id: data.id,
                    iteration: stats.iteration,
                    improvements: stats.improvements,
                    distance: stats.bestValue, // Note: k-optimizer uses bestValue
                    currentK: stats.currentK,
                    bestPossibleDistance: 0 
                });
            },
            onImprovement: (stats) => {
                self.postMessage({
                    type: 'improvement',
                    id: data.id,
                    iteration: stats.iteration,
                    improvements: stats.improvements,
                    distance: stats.bestValue,
                    route: solver.bestSolution, // Need to access the solution directly or from stats if available
                    currentK: stats.currentK
                });
            },
            onSolution: (result) => {
                self.postMessage({
                    type: 'solution',
                    id: data.id,
                    route: result.route,
                    distance: result.bestDistance,
                    iteration: result.iterations,
                    improvements: solver.improvements,
                    currentK: solver.currentK
                });
            },
            onOptimalFound: (stats) => {
                 self.postMessage({
                    type: 'improvement', // Treat as improvement to update UI
                    id: data.id,
                    iteration: stats.iteration,
                    improvements: stats.improvements,
                    distance: stats.bestValue,
                    route: solver.bestSolution,
                    currentK: stats.currentK
                });
            }
        });
        
        // Structure problem data for TSPSolver.initializeProblem
        const problemData = {
            cities: data.cities,
            metadata: {
                edgeWeightType: data.edgeWeightType || 'EUC_2D',
                name: data.problemName || 'Web Problem',
                optimalDistance: data.optimalDistance || null
            }
        };
        
        solver.start(problemData);
        
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({
            type: 'error',
            id: data.id,
            error: error.message
        });
    }
}

function stopSolving() {
    if (solver) {
        solver.stop();
        solver = null;
    }
}

// Message handler
self.onmessage = function(e) {
    switch(e.data.type) {
        case 'start':
            startSolving(e.data);
            break;
        case 'stop':
            stopSolving();
            break;
        default:
            console.warn('Unknown message type:', e.data.type);
    }
};
