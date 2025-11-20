#!/usr/bin/env node

/**
 * Local Minima Statistical Analysis for k-Alternatives
 * Analyzes the distribution and characteristics of local minima
 */

const { TSPSolver } = require('./tsp-solver.js');
const fs = require('fs');
const path = require('path');

class LocalMinimaAnalyzer {
    constructor() {
        this.results = {};
        this.analysis = {};
    }

    async analyzeLocalMinima(problemName, runs = 200) {
        console.log(`\n🔬 LOCAL MINIMA ANALYSIS: ${problemName}`);
        console.log('=' .repeat(50));

        const filePath = path.join('tsplib-json', `${problemName}.json`);
        if (!fs.existsSync(filePath)) {
            console.log(`❌ Problem file not found: ${problemName}`);
            return;
        }

        const problemData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const optimal = problemData.metadata.optimalDistance;

        console.log(`Problem: ${problemName}`);
        console.log(`Optimal: ${optimal}`);
        console.log(`Runs: ${runs}`);
        console.log(`Analyzing K=0,1,2,3 patterns...\n`);

        const kResults = {};

        // Test different K values
        for (const k of [0, 1, 2, 3]) {
            console.log(`Testing K=${k}...`);
            const solutions = [];
            
            for (let run = 0; run < runs; run++) {
                if (run % 20 === 0) process.stdout.write(`  Run ${run}/${runs}: `);
                
                const result = await this.singleRun(problemData, k, 5); // 5s limit
                solutions.push(result.bestDistance || result.distance);
                
                if (run % 20 === 19) console.log('✓');
            }

            kResults[k] = this.analyzeDistribution(solutions, optimal, k);
        }

        this.results[problemName] = {
            optimal,
            kResults,
            timestamp: new Date().toISOString()
        };

        this.printAnalysis(problemName, kResults, optimal);
        return kResults;
    }

    async singleRun(problemData, maxK, timeLimit) {
        return new Promise(resolve => {
            const solver = new TSPSolver({
                maxK,
                maxTime: timeLimit,
                stopAtOptimal: false, // Don't stop early
                onSolution: resolve,
                onMaxTimeReached: resolve
            });
            solver.start(JSON.parse(JSON.stringify(problemData)));
        });
    }

    analyzeDistribution(solutions, optimal, k) {
        // Basic statistics
        const sorted = [...solutions].sort((a, b) => a - b);
        const n = solutions.length;
        const min = sorted[0];
        const max = sorted[n - 1];
        const mean = solutions.reduce((a, b) => a + b, 0) / n;
        const median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];

        // Frequency distribution
        const frequency = {};
        solutions.forEach(sol => {
            frequency[sol] = (frequency[sol] || 0) + 1;
        });

        // Unique local minima
        const uniqueMinima = Object.keys(frequency).map(Number).sort((a, b) => a - b);
        const minimaCount = uniqueMinima.length;

        // Gap analysis
        const gaps = solutions.map(sol => ((sol - optimal) / optimal) * 100);
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const minGap = Math.min(...gaps);
        const maxGap = Math.max(...gaps);

        // Success rate (optimal found)
        const optimalCount = solutions.filter(sol => Math.abs(sol - optimal) < 0.001).length;
        const successRate = (optimalCount / n) * 100;

        // Most frequent minima
        const sortedByFreq = Object.entries(frequency)
            .map(([val, freq]) => ({ value: Number(val), frequency: freq, percentage: (freq/n)*100 }))
            .sort((a, b) => b.frequency - a.frequency);

        return {
            k,
            basic: { min, max, mean, median, n },
            distribution: { minimaCount, frequency, uniqueMinima },
            gaps: { avgGap, minGap, maxGap },
            success: { optimalCount, successRate },
            topMinima: sortedByFreq.slice(0, 10),
            rawSolutions: solutions
        };
    }

    printAnalysis(problemName, kResults, optimal) {
        console.log(`\n📊 ANALYSIS RESULTS FOR ${problemName}`);
        console.log('─'.repeat(60));

        // Summary table
        console.log('\n📈 Summary by K:');
        console.log('K | Unique Minima | Success Rate | Avg Gap | Best Gap | Most Frequent');
        console.log('--|---------------|--------------|---------|----------|---------------');
        
        Object.values(kResults).forEach(result => {
            const topMinima = result.topMinima[0];
            const topValue = topMinima.value;
            const topFreq = topMinima.percentage.toFixed(1);
            const topGap = ((topValue - optimal) / optimal * 100).toFixed(2);
            
            console.log(
                `${result.k} | ${result.distribution.minimaCount.toString().padStart(13)} | ` +
                `${result.success.successRate.toFixed(1).padStart(11)}% | ` +
                `${result.gaps.avgGap.toFixed(2).padStart(7)}% | ` +
                `${result.gaps.minGap.toFixed(2).padStart(8)}% | ` +
                `${topValue} (${topFreq}%, +${topGap}%)`
            );
        });

        // Detailed distribution for each K
        Object.values(kResults).forEach(result => {
            console.log(`\n🎯 K=${result.k} - Top Local Minima:`);
            result.topMinima.slice(0, 5).forEach((minima, i) => {
                const gap = ((minima.value - optimal) / optimal * 100).toFixed(2);
                const isOptimal = Math.abs(minima.value - optimal) < 0.001;
                const crown = isOptimal ? '👑' : `${i + 1}.`;
                
                console.log(
                    `  ${crown} ${minima.value} | ` +
                    `${minima.frequency} times (${minima.percentage.toFixed(1)}%) | ` +
                    `Gap: ${isOptimal ? '0.00' : '+' + gap}%`
                );
            });
        });

        // K-progression analysis
        console.log('\n📈 K-Progression Insights:');
        const k0Success = kResults[0].success.successRate;
        const k1Success = kResults[1].success.successRate;
        const k2Success = kResults[2].success.successRate;
        const k3Success = kResults[3].success.successRate;

        console.log(`  • K=0→K=1: Success rate ${k0Success.toFixed(1)}% → ${k1Success.toFixed(1)}% (${(k1Success - k0Success).toFixed(1)}% improvement)`);
        console.log(`  • K=1→K=2: Success rate ${k1Success.toFixed(1)}% → ${k2Success.toFixed(1)}% (${(k2Success - k1Success).toFixed(1)}% improvement)`);
        console.log(`  • K=2→K=3: Success rate ${k2Success.toFixed(1)}% → ${k3Success.toFixed(1)}% (${(k3Success - k2Success).toFixed(1)}% improvement)`);

        const k0Minima = kResults[0].distribution.minimaCount;
        const k3Minima = kResults[3].distribution.minimaCount;
        console.log(`  • Exploration: K=0 finds ${k0Minima} minima, K=3 finds ${k3Minima} minima`);
        
        // Convergence pattern
        const bestAtK = Object.values(kResults).reduce((best, curr) => 
            curr.success.successRate > best.success.successRate ? curr : best
        );
        console.log(`  • Best K for this problem: K=${bestAtK.k} (${bestAtK.success.successRate.toFixed(1)}% success)`);
    }

    async runFullAnalysis() {
        const problems = ['berlin52', 'st70', 'kroA100'];
        
        console.log('🔬 k-ALTERNATIVES LOCAL MINIMA ANALYSIS');
        console.log('======================================');
        console.log('Analyzing local minima distribution patterns...\n');

        for (const problem of problems) {
            await this.analyzeLocalMinima(problem, 100);
        }

        this.generateReport();
    }

    generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = `local-minima-analysis-${timestamp}.json`;

        // Cross-problem analysis
        const crossAnalysis = this.performCrossAnalysis();
        
        const fullReport = {
            analysis: crossAnalysis,
            problemResults: this.results,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(reportFile, JSON.stringify(fullReport, null, 2));

        console.log('\n🎯 CROSS-PROBLEM ANALYSIS');
        console.log('=========================');
        console.log(`Average K=0 success rate: ${crossAnalysis.avgK0Success.toFixed(1)}%`);
        console.log(`Average K=3 success rate: ${crossAnalysis.avgK3Success.toFixed(1)}%`);
        console.log(`Average improvement K=0→K=3: ${crossAnalysis.avgImprovement.toFixed(1)}%`);
        console.log(`Most effective K overall: K=${crossAnalysis.bestK}`);
        
        console.log(`\n📄 Full analysis: ${reportFile}`);
    }

    performCrossAnalysis() {
        const problems = Object.keys(this.results);
        const kSuccessRates = { 0: [], 1: [], 2: [], 3: [] };

        problems.forEach(problem => {
            const result = this.results[problem];
            Object.keys(kSuccessRates).forEach(k => {
                kSuccessRates[k].push(result.kResults[k].success.successRate);
            });
        });

        const avgSuccessRates = {};
        Object.keys(kSuccessRates).forEach(k => {
            const rates = kSuccessRates[k];
            avgSuccessRates[k] = rates.reduce((a, b) => a + b, 0) / rates.length;
        });

        const bestK = Object.keys(avgSuccessRates).reduce((best, k) => 
            avgSuccessRates[k] > avgSuccessRates[best] ? k : best
        );

        return {
            avgK0Success: avgSuccessRates[0],
            avgK3Success: avgSuccessRates[3],
            avgImprovement: avgSuccessRates[3] - avgSuccessRates[0],
            bestK: parseInt(bestK),
            avgSuccessRates
        };
    }
}

async function main() {
    const analyzer = new LocalMinimaAnalyzer();
    await analyzer.runFullAnalysis();
}

if (require.main === module) {
    main();
}

module.exports = { LocalMinimaAnalyzer };