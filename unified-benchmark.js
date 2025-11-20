#!/usr/bin/env node

/**
 * Unified Benchmark Suite for k-Alternatives Algorithms
 * Tests TSP, Knapsack, and Pathfinding implementations
 */

const { TSPSolver } = require('./tsp-solver.js');
const { KnapsackSolver } = require('./knapsack-solver.js');
const { parsePisingerFile } = require('./knapsack-loader.js');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    tsp: {
        problems: ['berlin52', 'st70', 'kroA100', 'ch130'],
        kValues: [1, 2, 3],
        repetitions: 20,
        timeLimit: 10
    },
    knapsack: {
        problems: ['knapPI_3_100_1000_1', 'knapPI_3_200_1000_1'],
        kValues: [0, 1, 2, 3],
        repetitions: 10,
        timeLimit: 15
    }
};

class BenchmarkRunner {
    constructor() {
        this.results = {
            tsp: [],
            knapsack: [],
            summary: {}
        };
    }

    async runTSPBenchmark() {
        console.log('\n🌍 TSP BENCHMARK');
        console.log('================');

        for (const problem of CONFIG.tsp.problems) {
            const filePath = path.join('tsplib-json', `${problem}.json`);
            if (!fs.existsSync(filePath)) continue;

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const optimal = data.metadata.optimalDistance;

            console.log(`\n📍 ${problem} (Optimal: ${optimal})`);

            for (const k of CONFIG.tsp.kValues) {
                const results = [];
                process.stdout.write(`  K=${k}: `);

                for (let i = 0; i < CONFIG.tsp.repetitions; i++) {
                    const result = await this.runTSPSingle(data, k, CONFIG.tsp.timeLimit);
                    results.push(result);
                    if (i % 5 === 0) process.stdout.write('.');
                }

                const stats = this.calculateStats(results, optimal);
                console.log(` Success: ${stats.successRate}% | Gap: ${stats.meanGap.toFixed(2)}% | Time: ${stats.avgTime.toFixed(1)}s`);

                this.results.tsp.push({
                    problem,
                    k,
                    optimal,
                    ...stats,
                    rawResults: results
                });
            }
        }
    }

    async runKnapsackBenchmark() {
        console.log('\n🎒 KNAPSACK BENCHMARK');
        console.log('====================');

        for (const problem of CONFIG.knapsack.problems) {
            const filePath = path.join('temp_kp/pisinger_instances_01_KP/large_scale', problem);
            if (!fs.existsSync(filePath)) continue;

            const data = parsePisingerFile(filePath);
            console.log(`\n📦 ${problem} (N=${data.items.length}, Optimal: ${data.optimalValue || 'Unknown'})`);

            for (const k of CONFIG.knapsack.kValues) {
                const results = [];
                process.stdout.write(`  K=${k}: `);

                for (let i = 0; i < CONFIG.knapsack.repetitions; i++) {
                    const result = await this.runKnapsackSingle(data, k, CONFIG.knapsack.timeLimit);
                    results.push(result);
                    if (i % 3 === 0) process.stdout.write('.');
                }

                const stats = this.calculateKnapsackStats(results, data.optimalValue);
                console.log(` Best: ${stats.best} | Gap: ${stats.meanGap.toFixed(2)}% | Time: ${stats.avgTime.toFixed(1)}s`);

                this.results.knapsack.push({
                    problem,
                    k,
                    optimal: data.optimalValue,
                    ...stats,
                    rawResults: results
                });
            }
        }
    }

    async runTSPSingle(problemData, k, timeLimit) {
        return new Promise(resolve => {
            const solver = new TSPSolver({
                maxK: k,
                maxTime: timeLimit,
                stopAtOptimal: true,
                onSolution: resolve
            });
            solver.start(JSON.parse(JSON.stringify(problemData)));
        });
    }

    async runKnapsackSingle(problemData, k, timeLimit) {
        return new Promise(resolve => {
            const solver = new KnapsackSolver({
                maxK: k,
                maxTime: timeLimit,
                shuffle: false,
                onSolution: resolve,
                onMaxTimeReached: resolve
            });
            solver.start(problemData);
        });
    }

    calculateStats(results, optimal) {
        const values = results.map(r => r.bestDistance || r.distance);
        const times = results.map(r => r.totalTime);
        
        const successes = values.filter(v => Math.abs(v - optimal) < 0.001).length;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        
        return {
            successRate: (successes / values.length) * 100,
            meanGap: ((avg - optimal) / optimal) * 100,
            avgTime: times.reduce((a, b) => a + b, 0) / times.length,
            best: Math.min(...values),
            worst: Math.max(...values)
        };
    }

    calculateKnapsackStats(results, optimal) {
        const values = results.map(r => Math.abs(r.value));
        const times = results.map(r => r.totalTime);
        
        const best = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const gap = optimal ? ((optimal - best) / optimal) * 100 : 0;
        
        return {
            best,
            avg,
            meanGap: gap,
            avgTime: times.reduce((a, b) => a + b, 0) / times.length,
            worst: Math.min(...values)
        };
    }

    generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = `unified-benchmark-${timestamp}.json`;
        
        // Calculate summary statistics
        this.results.summary = {
            tsp: this.summarizeTSP(),
            knapsack: this.summarizeKnapsack(),
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
        
        console.log('\n📊 SUMMARY REPORT');
        console.log('=================');
        console.log(`TSP: ${this.results.summary.tsp.avgSuccessRate.toFixed(1)}% success rate, ${this.results.summary.tsp.avgGap.toFixed(2)}% avg gap`);
        console.log(`Knapsack: Best gap ${this.results.summary.knapsack.bestGap.toFixed(2)}%, avg gap ${this.results.summary.knapsack.avgGap.toFixed(2)}%`);
        console.log(`\n📄 Full report: ${reportFile}`);
    }

    summarizeTSP() {
        const tspResults = this.results.tsp;
        return {
            totalTests: tspResults.length,
            avgSuccessRate: tspResults.reduce((sum, r) => sum + r.successRate, 0) / tspResults.length,
            avgGap: tspResults.reduce((sum, r) => sum + Math.abs(r.meanGap), 0) / tspResults.length,
            bestK: this.findBestK(tspResults, 'successRate')
        };
    }

    summarizeKnapsack() {
        const knapResults = this.results.knapsack;
        return {
            totalTests: knapResults.length,
            bestGap: Math.min(...knapResults.map(r => Math.abs(r.meanGap))),
            avgGap: knapResults.reduce((sum, r) => sum + Math.abs(r.meanGap), 0) / knapResults.length,
            bestK: this.findBestK(knapResults, 'best')
        };
    }

    findBestK(results, metric) {
        const kPerformance = {};
        results.forEach(r => {
            if (!kPerformance[r.k]) kPerformance[r.k] = [];
            kPerformance[r.k].push(r[metric]);
        });

        let bestK = 0;
        let bestScore = -Infinity;
        
        Object.keys(kPerformance).forEach(k => {
            const avg = kPerformance[k].reduce((a, b) => a + b, 0) / kPerformance[k].length;
            if (avg > bestScore) {
                bestScore = avg;
                bestK = parseInt(k);
            }
        });

        return bestK;
    }
}

async function main() {
    console.log('🚀 k-ALTERNATIVES UNIFIED BENCHMARK');
    console.log('===================================');
    
    const runner = new BenchmarkRunner();
    
    try {
        await runner.runTSPBenchmark();
        await runner.runKnapsackBenchmark();
        runner.generateReport();
    } catch (error) {
        console.error('❌ Benchmark failed:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { BenchmarkRunner };