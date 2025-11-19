const {TSPSolver} = require('./tsp-solver.js');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const REPETITIONS = 50;
const K_VALUES = [1, 2, 3]; // Max K=3
const TIME_LIMIT = 10; // Increased to 10s for larger problems
const PROBLEMS_DIR = 'tsplib-json';

const TARGET_PROBLEMS = [
    'berlin52',
    'st70',
    'kroA100',
    'ch130'
];

// ---------------------

async function runSingleExecution(problemData, k, timeLimit) {
    return new Promise(resolve => {
        const solver = new TSPSolver({
            maxK: k,
            maxTime: timeLimit,
            stopAtOptimal: true,
            onSolution: (result) => resolve(result)
        });
        
        // Pass full problem data (solver handles explicit weights now)
        const dataClone = JSON.parse(JSON.stringify(problemData));
        solver.start(dataClone);
    });
}

function calculateStats(results, optimal) {
    const values = results.map(r => r.bestDistance);
    const times = results.map(r => r.totalTime); // Assuming result has totalTime (elapsedTime)
    const iters = results.map(r => r.iterations);

    const n = values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / n;
    
    const avgTime = times.reduce((a, b) => a + b, 0) / n;
    const avgIters = iters.reduce((a, b) => a + b, 0) / n;

    // Success Rate
    // Tolerance for float math, though usually ints for TSP
    const successes = values.filter(v => Math.abs(v - optimal) < 0.001).length;
    const successRate = (successes / n) * 100;
    
    // Mean Gap
    const meanGap = ((avg - optimal) / optimal) * 100;

    // Efficiency (Success % per second of runtime)
    // Avoid division by zero
    const efficiency = avgTime > 0 ? (successRate / avgTime) : (successRate > 0 ? 9999 : 0);

    // Distribution
    const distribution = {};
    values.forEach(v => {
        distribution[v] = (distribution[v] || 0) + 1;
    });

    return { min, max, avg, avgTime, avgIters, successRate, meanGap, efficiency, distribution };
}

function printHistogram(distribution, optimal, runs) {
    const sortedKeys = Object.keys(distribution).map(Number).sort((a, b) => a - b);
    console.log('  Distribución de Mínimos Locales:');
    
    sortedKeys.forEach(val => {
        const count = distribution[val];
        const percentage = (count / runs) * 100;
        const isOptimal = Math.abs(val - optimal) < 0.001;
        const gap = ((val - optimal) / optimal) * 100;
        
        const barLength = Math.round(percentage / 2);
        const bar = '█'.repeat(barLength).padEnd(50, '░');
        
        const label = isOptimal ? `👑 ${val} (ÓPTIMO)` : `   ${val} (+${gap.toFixed(2)}%)`;
        console.log(`    ${label.padEnd(25)} | ${bar} | ${count} (${percentage.toFixed(1)}%)`);
    });
}

async function main() {
    console.log(`
📊 ANÁLISIS ESTADÍSTICO DE k-ALTERNATIVES (Mejorado)`);
    console.log(`====================================================`);
    console.log(`Repeticiones: ${REPETITIONS}`);
    console.log(`Valores de K: ${K_VALUES.join(', ')}`);
    console.log(`Problemas: ${TARGET_PROBLEMS.join(', ')}
`);

    for (const probName of TARGET_PROBLEMS) {
        const filePath = path.join(PROBLEMS_DIR, `${probName}.json`);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Archivo no encontrado: ${filePath}`);
            continue;
        }

        const problemContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Use content directly, TSPSolver is robust now
        const problemDataForSolver = problemContent;

        const optimal = problemContent.metadata.optimalDistance;
        console.log(`
🌍 PROBLEMA: ${probName} (Óptimo: ${optimal})`);
        console.log(`--------------------------------------------------`);

        for (const k of K_VALUES) {
            process.stdout.write(`  Testing K=${k} ... `);
            
            const results = [];
            const batchStart = Date.now();

            for (let i = 0; i < REPETITIONS; i++) {
                if (i % 10 === 0) process.stdout.write('.');
                const res = await runSingleExecution(problemDataForSolver, k, TIME_LIMIT);
                results.push(res);
            }

            const duration = ((Date.now() - batchStart) / 1000).toFixed(1);
            console.log(` Hecho (${duration}s total)`);

            const stats = calculateStats(results, optimal);

            console.log(`    Tasa de Éxito: ${stats.successRate.toFixed(1)}%`);
            console.log(`    Media Costo:   ${stats.avg.toFixed(2)} (Gap: ${stats.meanGap.toFixed(2)}%)`);
            console.log(`    Tiempo Medio:  ${stats.avgTime.toFixed(3)}s`);
            console.log(`    Iteraciones:   ${Math.round(stats.avgIters).toLocaleString()}`);
            console.log(`    Eficiencia:    ${stats.efficiency.toFixed(1)} (% éxito/seg)`);
            
            printHistogram(stats.distribution, optimal, REPETITIONS);
            console.log('');
        }
    }
}

main().catch(console.error);
