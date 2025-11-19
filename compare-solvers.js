const { TSPSolver } = require('./tsp-solver.js');
const { TSPSolverLegacy } = require('./tsp-solver-legacy.js');
const fs = require('fs');

const problemPath = 'tsplib-json/berlin52.json';
const problem = JSON.parse(fs.readFileSync(problemPath, 'utf8'));
const ITERATIONS = 200000;
const MAX_TIME = 5; // seconds

console.log('--- Comparison: berlin52 (Opt: 7542) ---');

async function runSolver(SolverClass, name) {
    return new Promise(resolve => {
        console.log(`Starting ${name}...`);
        const solver = new SolverClass({
            maxK: 3,
            maxTime: MAX_TIME,
            stopAtOptimal: true,
            onSolution: (res) => {
                const time = res.elapsedTime || res.totalTime;
                console.log(`${name} Finished: Distance ${res.bestDistance || res.distance} | Time: ${time}s | K: ${res.currentK}`);
                resolve(res);
            }
        });
        
        // Adapt problem data structure if needed
        const problemData = {
            cities: problem.cities || problem.originalCities,
            metadata: {
                optimalDistance: problem.optimal,
                name: 'berlin52'
            }
        };
        
        solver.start(problemData);
    });
}

async function run() {
    const resLegacy = await runSolver(TSPSolverLegacy, 'LEGACY');
    const resModern = await runSolver(TSPSolver, 'MODERN');
    
    console.log('\n--- Results ---');
    console.log(`LEGACY: ${resLegacy.bestDistance} (Dev: ${resLegacy.deviation?.toFixed(2)}%)`);
    console.log(`MODERN: ${resModern.bestDistance} (Dev: ${resModern.deviation?.toFixed(2)}%)`);
    
    if (resLegacy.bestDistance < resModern.bestDistance) {
        console.log('🏆 LEGACY Wins!');
    } else if (resModern.bestDistance < resLegacy.bestDistance) {
        console.log('🏆 MODERN Wins!');
    } else {
        console.log('🤝 Tie!');
    }
    process.exit(0);
}

run();
