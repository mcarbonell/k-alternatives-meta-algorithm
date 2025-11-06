/**
 * k-Alternatives Web Worker
 * Uses the core KAlternativesSolver class
 */

// Import core (in worker context, this will be loaded via importScripts)
importScripts('k-alternatives-core.js');

let solver = null;

function startSolving(data) {
    try {
        solver = new KAlternativesSolver({
            maxK: data.maxK,
            debug: data.debug,
            onProgress: (stats) => {
                self.postMessage({
                    type: 'stats',
                    id: data.id,
                    iteration: stats.iteration,
                    improvements: stats.improvements,
                    distance: stats.bestDistance,
                    currentK: stats.currentK,
                    bestPossibleDistance: 0 // Not used in web interface
                });
            },
            onImprovement: (stats) => {
                self.postMessage({
                    type: 'improvement',
                    id: data.id,
                    iteration: stats.iteration,
                    improvements: stats.improvements,
                    distance: stats.distance,
                    route: stats.route,
                    currentK: stats.currentK
                });
            },
            onSolution: (result) => {
                self.postMessage({
                    type: 'solution',
                    id: data.id,
                    route: result.route,
                    distance: result.distance,
                    iteration: result.iterations,
                    improvements: result.improvements,
                    currentK: result.currentK
                });
            }
        });
        
        solver.initialize(data.cities, {
            edgeWeightType: data.edgeWeightType || 'EUC_2D',
            problemName: data.problemName || 'Web Problem',
            optimalDistance: data.optimalDistance || null
        });
        
        solver.start();
        
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