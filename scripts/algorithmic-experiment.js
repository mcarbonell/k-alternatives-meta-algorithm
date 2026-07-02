#!/usr/bin/env node

/**
 * Algorithmic Experiment for k-Alternatives
 * Measures performance scaling with N and k, probability of finding optimal,
 * and tracks the "auto-grow" progression.
 */

import { TSPSolver } from '../src/tsp-solver.js';
import fs from 'fs';
import path from 'path';

class AlgorithmicExperiment {
    constructor() {
        this.results = {
            phase1: {},
            phase2: {},
        };
    }

    async runPhase1(problems, maxK = 5, runs = 50) {
        console.log('\n=============================================================');
        console.log('PHASE 1: Parametric Sweep (N and K scaling)');
        console.log('=============================================================');

        for (const problemName of problems) {
            console.log(`\n▶ Analyzing Problem: ${problemName}`);
            const filePath = path.join('tsplib-json', `${problemName}.json`);
            if (!fs.existsSync(filePath)) {
                console.log(`❌ Problem file not found: ${problemName}`);
                continue;
            }

            const problemData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const optimal = problemData.metadata.optimalDistance;

            this.results.phase1[problemName] = { optimal, kData: {} };

            for (let k = 0; k <= maxK; k++) {
                process.stdout.write(`  Testing K=${k}... `);

                let totalTime = 0;
                let totalImprovements = 0;
                let optimalCount = 0;
                const bestDistances = [];
                let overallBest = Infinity;

                for (let r = 0; r < runs; r++) {
                    const runResult = await this.singleRun(problemData, k, 10); // 10s max per run

                    totalTime += runResult.totalTime;
                    totalImprovements += runResult.improvements;
                    bestDistances.push(runResult.bestDistance);

                    if (runResult.bestDistance < overallBest) {
                        overallBest = runResult.bestDistance;
                    }

                    if (Math.abs(runResult.bestDistance - optimal) <= 0.001) {
                        optimalCount++;
                    }
                }

                const avgTime = totalTime / runs;
                const avgImprovements = totalImprovements / runs;
                const probability = (optimalCount / runs) * 100;

                const avgDistance = bestDistances.reduce((a, b) => a + b, 0) / runs;
                const avgGap = ((avgDistance - optimal) / optimal) * 100;
                const bestGap = ((overallBest - optimal) / optimal) * 100;

                const uniqueMinima = new Set(bestDistances).size;

                this.results.phase1[problemName].kData[k] = {
                    avgTime,
                    avgImprovements,
                    probability,
                    avgGap,
                    bestGap,
                    uniqueMinima,
                };

                console.log(
                    `Prob: ${probability.toFixed(1)}%, AvgGap: ${avgGap.toFixed(2)}%, UniqueMin: ${uniqueMinima}, AvgTime: ${avgTime.toFixed(3)}s`
                );
            }
        }
    }

    async runPhase2(problems, maxLimitK = 20) {
        console.log('\n=============================================================');
        console.log('PHASE 2: Auto-Grow K Experiment (Single continuous run)');
        console.log('=============================================================');

        for (const problemName of problems) {
            console.log(`\n▶ Auto-growing K for: ${problemName}`);
            const filePath = path.join('tsplib-json', `${problemName}.json`);
            if (!fs.existsSync(filePath)) {
                console.log(`❌ Problem file not found: ${problemName}`);
                continue;
            }

            const problemData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            let optimalKFound = null;

            const result = await new Promise((resolve) => {
                const solver = new TSPSolver({
                    maxK: maxLimitK,
                    maxTime: 60, // Give it up to 60s
                    stopAtOptimal: true,
                    onOptimalFound: (stats) => {
                        optimalKFound = stats.currentK;
                    },
                    onSolution: resolve,
                    onMaxTimeReached: resolve,
                });

                solver.start(JSON.parse(JSON.stringify(problemData)));
            });

            this.results.phase2[problemName] = {
                optimalKFound,
                reachedOptimal: optimalKFound !== null,
                finalDistance: result.bestDistance,
                totalTime: result.totalTime,
                limitReached: result.limitReached,
            };

            if (optimalKFound !== null) {
                console.log(
                    `  ✅ Optimal reached at K = ${optimalKFound} (Time: ${result.totalTime}s)`
                );
            } else {
                console.log(
                    `  ❌ Optimal NOT reached. Best gap: ${result.deviation}% (Time limit or Max K hit)`
                );
            }
        }
    }

    async singleRun(problemData, maxK, timeLimit) {
        return new Promise((resolve) => {
            let improvements = 0;
            const solver = new TSPSolver({
                maxK,
                maxTime: timeLimit,
                stopAtOptimal: true,
                onImprovement: () => improvements++,
                onSolution: (res) => resolve({ ...res, improvements }),
                onMaxTimeReached: (res) => resolve({ ...res, improvements }),
            });
            solver.start(JSON.parse(JSON.stringify(problemData)));
        });
    }

    saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = `algorithmic-experiment-${timestamp}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Results saved to: ${reportFile}`);
    }
}

async function main() {
    const problems = ['burma14', 'ulysses22', 'bays29', 'dantzig42', 'berlin52'];
    const experiment = new AlgorithmicExperiment();

    // Using 50 runs for Phase 1 as approved
    await experiment.runPhase1(problems, 5, 50);

    // Using max K=20 for Phase 2 auto-grow
    await experiment.runPhase2(problems, 20);

    experiment.saveResults();
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
    main();
} else {
    // Fallback for Windows if import.meta.url check fails
    main();
}

export { AlgorithmicExperiment };
