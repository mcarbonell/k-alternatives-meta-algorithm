#!/usr/bin/env node

/**
 * Controlled Baselines Benchmark Suite (P1.1 & P1.2)
 *
 * Evaluates classical heuristics against k-Alternatives under common budget,
 * identical distance metrics, and reproducible random seeds:
 *
 * Baselines:
 * 1. Nearest Neighbor (Single start)
 * 2. Multi-Start Nearest Neighbor (MS-NN)
 * 3. 2-Opt local search (on top of NN)
 * 4. Or-Opt local search (on top of NN)
 * 5. Multi-Start 2-Opt
 * 6. Simulated Annealing (SA over 2-opt)
 * 7. k-Alternatives (k=1, k=2, k=3)
 *
 * Usage:
 *   node scripts/baselines.js [--time 2] [--seed 42] [--instances berlin52,st70,bays29]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TSPSolver } from '../src/tsp-solver.js';
import {
    runNearestNeighbor,
    runMultiStartNN,
    twoOpt,
    orOpt,
    runMultiStart2Opt,
    runSimulatedAnnealing,
} from '../src/baselines.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Parse CLI arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        timeLimit: 2, // seconds per method/problem
        seed: 42,
        instances: ['bays29', 'berlin52', 'st70'],
        json: false,
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--time' && args[i + 1]) {
            options.timeLimit = parseFloat(args[++i]);
        } else if (args[i] === '--seed' && args[i + 1]) {
            options.seed = parseInt(args[++i], 10);
        } else if (args[i] === '--instances' && args[i + 1]) {
            options.instances = args[++i].split(',').map((s) => s.trim());
        } else if (args[i] === '--json') {
            options.json = true;
        } else if (args[i] === '--help') {
            console.log(`
Usage: node scripts/baselines.js [options]

Options:
  --time <sec>         Time limit in seconds per method (default: 2)
  --seed <number>      Deterministic PRNG seed (default: 42)
  --instances <list>   Comma-separated problem names (default: bays29,berlin52,st70)
  --json               Output machine-readable JSON
  --help               Show this help message
`);
            process.exit(0);
        }
    }
    return options;
}

function loadProblem(instanceName) {
    const jsonPath = path.join(ROOT_DIR, 'tsplib-json', `${instanceName}.json`);
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`Instance file not found: ${jsonPath}`);
    }
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

async function runBaselinesForProblem(instanceName, options) {
    const problemData = loadProblem(instanceName);
    const optimal = problemData.metadata.optimalDistance;
    const timeLimitMs = Math.round(options.timeLimit * 1000);

    // Initialize TSPSolver to extract exact distance matrix and distance function
    const referenceSolver = new TSPSolver({ seed: options.seed });
    referenceSolver.initializeProblem(problemData);
    const n = referenceSolver._n;
    const distanceFn = (i, j) => referenceSolver.distance(i, j);

    const methods = [];

    // Helper to calculate gap percentage
    const calcGap = (dist) => {
        if (!optimal) return null;
        return parseFloat((((dist - optimal) / optimal) * 100).toFixed(2));
    };

    // 1. Single-Start Nearest Neighbor
    {
        const res = runNearestNeighbor(0, n, distanceFn);
        methods.push({
            name: 'Nearest Neighbor (Single-Start)',
            best: res.distance,
            mean: res.distance,
            median: res.distance,
            iqr: 0,
            gap: calcGap(res.distance),
            evals: res.evaluations,
            timeMs: res.timeMs,
        });
    }

    // 2. Multi-Start Nearest Neighbor (MS-NN)
    {
        const res = runMultiStartNN(n, distanceFn, {
            timeLimitMs,
            seed: options.seed,
        });
        methods.push({
            name: 'Multi-Start NN (All Starts)',
            best: res.bestDistance,
            mean: parseFloat(res.stats.mean.toFixed(1)),
            median: parseFloat(res.stats.median.toFixed(1)),
            iqr: parseFloat(res.stats.iqr.toFixed(1)),
            gap: calcGap(res.bestDistance),
            evals: res.startsEvaluated,
            timeMs: res.timeMs,
        });
    }

    // 3. 2-Opt (Single Start on NN)
    {
        const nnTour = referenceSolver.getInitialSolution();
        const res = twoOpt(nnTour, distanceFn, {
            timeLimitMs,
            strategy: 'first',
        });
        methods.push({
            name: '2-Opt (First-Improvement on NN)',
            best: res.distance,
            mean: res.distance,
            median: res.distance,
            iqr: 0,
            gap: calcGap(res.distance),
            evals: res.moves,
            timeMs: res.timeMs,
        });
    }

    // 4. Or-Opt (Single Start on NN)
    {
        const nnTour = referenceSolver.getInitialSolution();
        const res = orOpt(nnTour, distanceFn, { timeLimitMs });
        methods.push({
            name: 'Or-Opt (Relocation on NN)',
            best: res.distance,
            mean: res.distance,
            median: res.distance,
            iqr: 0,
            gap: calcGap(res.distance),
            evals: res.moves,
            timeMs: res.timeMs,
        });
    }

    // 5. Multi-Start 2-Opt
    {
        const res = runMultiStart2Opt(n, distanceFn, {
            timeLimitMs,
            useNN: true,
            seed: options.seed,
        });
        methods.push({
            name: 'Multi-Start 2-Opt (MS-NN + 2-Opt)',
            best: res.bestDistance,
            mean: parseFloat(res.stats.mean.toFixed(1)),
            median: parseFloat(res.stats.median.toFixed(1)),
            iqr: parseFloat(res.stats.iqr.toFixed(1)),
            gap: calcGap(res.bestDistance),
            evals: res.startsEvaluated,
            timeMs: res.timeMs,
        });
    }

    // 6. Simulated Annealing (over 2-Opt moves)
    {
        const nnTour = referenceSolver.getInitialSolution();
        const res = runSimulatedAnnealing(nnTour, distanceFn, {
            timeLimitMs,
            seed: options.seed,
            maxIterations: 20000,
        });
        methods.push({
            name: 'Simulated Annealing (on 2-Opt)',
            best: res.bestDistance,
            mean: res.bestDistance,
            median: res.bestDistance,
            iqr: 0,
            gap: calcGap(res.bestDistance),
            evals: res.iterations,
            timeMs: res.timeMs,
        });
    }

    // 7. k-Alternatives (k=1, k=2, k=3)
    for (const k of [1, 2, 3]) {
        const solver = new TSPSolver({
            maxK: k,
            maxTime: options.timeLimit,
            seed: options.seed,
            stopAtOptimal: true,
        });
        const res = await solver.solveAsync(problemData);
        methods.push({
            name: `k-Alternatives (k=${k})`,
            best: res.bestDistance,
            mean: res.bestDistance,
            median: res.bestDistance,
            iqr: 0,
            gap: res.deviation,
            evals: res.iterations,
            timeMs: res.timeMs,
        });
    }

    return {
        instance: instanceName,
        dimension: n,
        optimal,
        timeLimitSec: options.timeLimit,
        seed: options.seed,
        methods,
    };
}

function printMarkdownTable(report) {
    console.log(
        `\n### Benchmark: ${report.instance} (N=${report.dimension}, Optimal: ${report.optimal})`
    );
    console.log(
        `- **Budget:** ${report.timeLimitSec}s max per method | **Seed:** ${report.seed}\n`
    );
    console.log(
        '| Method | Best Dist | Mean Dist | Median | IQR | Gap (%) | Evals / Iter | Time (ms) |'
    );
    console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

    for (const m of report.methods) {
        const gapStr = m.gap !== null ? `${m.gap > 0 ? '+' : ''}${m.gap.toFixed(2)}%` : 'N/A';
        console.log(
            `| ${m.name.padEnd(32)} | ${String(m.best).padStart(9)} | ${String(m.mean).padStart(9)} | ${String(m.median).padStart(6)} | ${String(m.iqr).padStart(5)} | ${gapStr.padStart(7)} | ${String(m.evals).padStart(12)} | ${String(m.timeMs).padStart(9)} |`
        );
    }
}

async function main() {
    const options = parseArgs();

    console.log('='.repeat(78));
    console.log('   CONTROLLED BASELINES BENCHMARK SUITE (P1.1 & P1.2)');
    console.log('='.repeat(78));
    console.log(`Instances: ${options.instances.join(', ')}`);
    console.log(`Time Limit: ${options.timeLimit}s | Seed: ${options.seed}`);

    const allReports = [];

    for (const inst of options.instances) {
        try {
            process.stdout.write(`\nEvaluating ${inst}... `);
            const report = await runBaselinesForProblem(inst, options);
            process.stdout.write('Done.\n');
            allReports.push(report);
            if (!options.json) {
                printMarkdownTable(report);
            }
        } catch (err) {
            console.error(`\n[ERROR] Failed evaluating ${inst}:`, err.message);
        }
    }

    if (options.json) {
        console.log(JSON.stringify(allReports, null, 2));
    }

    console.log('\n' + '='.repeat(78));
    console.log('   BENCHMARK COMPLETED SUCCESSFULLY');
    console.log('='.repeat(78));
}

main().catch(console.error);
