const { KnapsackSolver } = require('./knapsack-solver');
const { parsePisingerFile } = require('./knapsack-loader');
const fs = require('fs');
const path = require('path');

const INSTANCES_DIR = 'temp_kp/pisinger_instances_01_KP/large_scale';
// We focus on Strongly Correlated (Type 3) as they are the hardest
const TARGET_FILES = [
    'knapPI_3_100_1000_1',
    'knapPI_3_200_1000_1'
];

function runTest(problem, k) {
    return new Promise((resolve) => {
        const solver = new KnapsackSolver({
            maxK: k,
            stopAtOptimal: false,
            maxTime: 15, // 15 seconds per run (JS might be slow)
            shuffle: false, // Deterministic Greedy Base
            onSolution: (result) => {
                resolve({
                    k,
                    value: Math.abs(result.value),
                    time: (result.totalTime * 1000).toFixed(2)
                });
            },
            onMaxTimeReached: (result) => {
                resolve({
                    k,
                    value: Math.abs(result.value),
                    time: '>15000'
                });
            }
        });
        // Force strict K-run logic (start..end)
        solver.start(problem);
    });
}

async function main() {
    console.log('=== PISINGER BENCHMARK (Strongly Correlated) ===');
    
    for (const filename of TARGET_FILES) {
        const fullPath = path.join(INSTANCES_DIR, filename);
        if (!fs.existsSync(fullPath)) {
            console.log(`File not found: ${filename}`);
            continue;
        }
        
        const problem = parsePisingerFile(fullPath);
        console.log(`
Problem: ${filename} (N=${problem.items.length})`);
        console.log(`Capacity: ${problem.maxWeight}`);
        if (problem.optimalValue) {
            console.log(`Known Optimal: ${problem.optimalValue}`);
        } else {
            console.log('Known Optimal: Unknown (Parsed from file)');
        }

        let bestVal = 0;
        for (const k of [0, 1, 2, 3]) {
             const res = await runTest(problem, k);
             if (res.value > bestVal) bestVal = res.value;
             
             let gap = "";
             if (problem.optimalValue) {
                 const g = ((problem.optimalValue - res.value) / problem.optimalValue * 100).toFixed(4);
                 gap = `Gap: ${g}%`;
                 if (res.value === problem.optimalValue) gap = "🏆 OPTIMAL";
             }
             
             console.log(`  K=${k} | Val: ${res.value} | ${gap} | Time: ${res.time}ms`);
        }
    }
}

main();
