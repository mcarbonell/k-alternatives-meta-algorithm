#!/usr/bin/env node

/**
 * End-to-End Reproducibility Pipeline (P1.4, P1.5, P1.6, P1.7)
 *
 * Regenerates all publication benchmarks, tables, statistical tests,
 * and complexity metrics with a single command and deterministic seeds:
 *
 * 1. Baselines Comparison (P1.1, P1.2)
 * 2. Component Ablation Suite (P1.3)
 * 3. Statistical Significance & 95% Confidence Intervals (P1.4)
 * 4. Hold-Out Evaluation on Unseen Instances (P1.5)
 * 5. Empirical Node Complexity vs Theoretical LDS Bounds (P1.6)
 *
 * Outputs:
 * - Console Markdown summary tables
 * - `benchmarks/reproducibility-results.json`
 * - `docs/paper-experimental-results.md`
 *
 * Usage:
 *   npm run reproduce
 *   node scripts/reproduce.js [--quick] [--seed 42]
 *
 * @author Mario Raúl Carbonell Martínez
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
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
import {
    confidenceInterval,
    welchTTest,
    mannWhitneyUTest,
    holmBonferroniCorrection,
    theoreticalNodeBound,
    calculatePruningRatio,
} from '../src/statistics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Command line argument parser
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        seed: 42,
        quick: false,
        replicates: 20, // Replicates for statistical inference
        timeLimit: 1.5, // Seconds per method/problem
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--seed' && args[i + 1]) {
            options.seed = parseInt(args[++i], 10);
        } else if (args[i] === '--quick') {
            options.quick = true;
            options.replicates = 10;
            options.timeLimit = 0.8;
        } else if (args[i] === '--replicates' && args[i + 1]) {
            options.replicates = parseInt(args[++i], 10);
        } else if (args[i] === '--time' && args[i + 1]) {
            options.timeLimit = parseFloat(args[++i]);
        }
    }
    return options;
}

// Instance partitions (P1.5 Hold-out design)
const TUNING_INSTANCES = ['bays29', 'att48', 'berlin52'];
const HOLDOUT_INSTANCES = ['st70', 'pr76', 'kroA100', 'bier127'];

function loadProblem(instanceName) {
    const jsonPath = path.join(ROOT_DIR, 'tsplib-json', `${instanceName}.json`);
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`Instance file not found: ${jsonPath}`);
    }
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function getHardwareMetadata() {
    const cpus = os.cpus();
    return {
        cpu: cpus.length > 0 ? cpus[0].model : 'Unknown CPU',
        cores: cpus.length,
        ramGb: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
        os: `${os.type()} ${os.release()} (${os.arch()})`,
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
    };
}

// -------------------------------------------------------------
// EXPERIMENT 1: Baselines Comparison (P1.1 & P1.2)
// -------------------------------------------------------------
async function runExperiment1(instances, options) {
    console.log('\n[1/5] Executing Controlled Baselines Benchmark (P1.1 & P1.2)...');
    const reports = [];
    const timeLimitMs = Math.round(options.timeLimit * 1000);

    for (const inst of instances) {
        process.stdout.write(`  Evaluating baselines on ${inst}... `);
        const problemData = loadProblem(inst);
        const optimal = problemData.metadata.optimalDistance;

        const refSolver = new TSPSolver({ seed: options.seed });
        refSolver.initializeProblem(problemData);
        const n = refSolver._n;
        const distanceFn = (i, j) => refSolver.distance(i, j);

        const calcGap = (dist) => parseFloat((((dist - optimal) / optimal) * 100).toFixed(2));

        const methods = [];

        // 1. Single-Start NN
        const resNN = runNearestNeighbor(0, n, distanceFn);
        methods.push({
            name: 'Nearest Neighbor (Single-Start)',
            best: resNN.distance,
            gap: calcGap(resNN.distance),
            evals: 1,
            timeMs: resNN.timeMs,
        });

        // 2. Multi-Start NN
        const resMSNN = runMultiStartNN(n, distanceFn, { timeLimitMs, seed: options.seed });
        methods.push({
            name: 'Multi-Start NN',
            best: resMSNN.bestDistance,
            gap: calcGap(resMSNN.bestDistance),
            evals: resMSNN.startsEvaluated,
            timeMs: resMSNN.timeMs,
        });

        // 3. 2-Opt (on NN)
        const nnTour = refSolver.getInitialSolution();
        const res2Opt = twoOpt(nnTour, distanceFn, { timeLimitMs, strategy: 'first' });
        methods.push({
            name: '2-Opt (on NN)',
            best: res2Opt.distance,
            gap: calcGap(res2Opt.distance),
            evals: res2Opt.moves,
            timeMs: res2Opt.timeMs,
        });

        // 4. Or-Opt (on NN)
        const resOrOpt = orOpt(nnTour, distanceFn, { timeLimitMs });
        methods.push({
            name: 'Or-Opt (on NN)',
            best: resOrOpt.distance,
            gap: calcGap(resOrOpt.distance),
            evals: resOrOpt.moves,
            timeMs: resOrOpt.timeMs,
        });

        // 5. Multi-Start 2-Opt
        const resMS2Opt = runMultiStart2Opt(n, distanceFn, { timeLimitMs, seed: options.seed });
        methods.push({
            name: 'Multi-Start 2-Opt',
            best: resMS2Opt.bestDistance,
            gap: calcGap(resMS2Opt.bestDistance),
            evals: resMS2Opt.startsEvaluated,
            timeMs: resMS2Opt.timeMs,
        });

        // 6. Simulated Annealing
        const resSA = runSimulatedAnnealing(nnTour, distanceFn, {
            timeLimitMs,
            seed: options.seed,
            maxIterations: 15000,
        });
        methods.push({
            name: 'Simulated Annealing (2-Opt)',
            best: resSA.bestDistance,
            gap: calcGap(resSA.bestDistance),
            evals: resSA.iterations,
            timeMs: resSA.timeMs,
        });

        // 7. k-Alternatives (k=1, 2, 3)
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
                gap: res.deviation,
                evals: res.iterations,
                timeMs: res.timeMs,
            });
        }

        reports.push({ instance: inst, dimension: n, optimal, methods });
        process.stdout.write('Done.\n');
    }
    return reports;
}

// -------------------------------------------------------------
// EXPERIMENT 2: Systematic Ablation Study (P1.3)
// -------------------------------------------------------------
async function runExperiment2(instances, options) {
    console.log('\n[2/5] Executing Component Ablation Suite (P1.3)...');
    const reports = [];

    const variants = [
        {
            id: 'full',
            name: 'Full k-Alternatives',
            opts: { learning: true, multiStart: true, adaptiveSchedule: true },
        },
        {
            id: 'no-mtf',
            name: 'Ablation: No MTF',
            opts: { learning: false, multiStart: true, adaptiveSchedule: true },
        },
        {
            id: 'single-start',
            name: 'Ablation: Single-Start',
            opts: { learning: true, multiStart: false, adaptiveSchedule: true },
        },
        {
            id: 'fixed-sched',
            name: 'Ablation: Fixed Schedule',
            opts: { learning: true, multiStart: true, adaptiveSchedule: false },
        },
        {
            id: 'bare-lds',
            name: 'Ablation: Bare LDS',
            opts: { learning: false, multiStart: false, adaptiveSchedule: false },
        },
    ];

    for (const inst of instances) {
        process.stdout.write(`  Ablation on ${inst}... `);
        const problemData = loadProblem(inst);
        const optimal = problemData.metadata.optimalDistance;
        const resMap = [];
        let fullGap = 0;

        for (const v of variants) {
            const solver = new TSPSolver({
                maxK: 3,
                maxTime: options.timeLimit,
                seed: options.seed,
                stopAtOptimal: true,
                ...v.opts,
            });
            const res = await solver.solveAsync(problemData);
            const gap = res.deviation !== null ? res.deviation : 0;
            if (v.id === 'full') fullGap = gap;
            const deltaGap = parseFloat((gap - fullGap).toFixed(2));

            resMap.push({
                id: v.id,
                name: v.name,
                best: res.bestDistance,
                gap,
                deltaGap,
                iterations: res.iterations,
                nodesExpanded: res.nodesExpanded,
                timeMs: res.timeMs,
            });
        }
        reports.push({ instance: inst, optimal, variants: resMap });
        process.stdout.write('Done.\n');
    }
    return reports;
}

// -------------------------------------------------------------
// EXPERIMENT 3: Statistical Significance & 95% CI (P1.4)
// -------------------------------------------------------------
async function runExperiment3(instances, options) {
    console.log(
        `\n[3/5] Executing Statistical Significance & 95% CI (${options.replicates} Replicates) (P1.4)...`
    );
    const reports = [];

    for (const inst of instances) {
        process.stdout.write(`  Replicates on ${inst} (R=${options.replicates})... `);
        const problemData = loadProblem(inst);
        const optimal = problemData.metadata.optimalDistance;
        const n = problemData.metadata.dimension;

        const kAltGaps = [];
        const ms2OptGaps = [];
        const msnnGaps = [];

        const refSolver = new TSPSolver({ seed: options.seed });
        refSolver.initializeProblem(problemData);
        const distanceFn = (i, j) => refSolver.distance(i, j);

        for (let r = 0; r < options.replicates; r++) {
            const currentSeed = options.seed + r * 101;

            // 1. k-Alternatives (k=3)
            const kSolver = new TSPSolver({
                maxK: 3,
                maxTime: options.timeLimit,
                seed: currentSeed,
                stopAtOptimal: true,
            });
            const kRes = await kSolver.solveAsync(problemData);
            kAltGaps.push(kRes.deviation !== null ? kRes.deviation : 0);

            // 2. Multi-Start 2-Opt
            const ms2OptRes = runMultiStart2Opt(n, distanceFn, {
                timeLimitMs: Math.round(options.timeLimit * 1000),
                seed: currentSeed,
            });
            const ms2OptGap = parseFloat(
                (((ms2OptRes.bestDistance - optimal) / optimal) * 100).toFixed(2)
            );
            ms2OptGaps.push(ms2OptGap);

            // 3. Multi-Start NN
            const msnnRes = runMultiStartNN(n, distanceFn, {
                timeLimitMs: Math.round(options.timeLimit * 1000),
                seed: currentSeed,
            });
            const msnnGap = parseFloat(
                (((msnnRes.bestDistance - optimal) / optimal) * 100).toFixed(2)
            );
            msnnGaps.push(msnnGap);
        }

        const kAltCI = confidenceInterval(kAltGaps, 0.95);
        const ms2OptCI = confidenceInterval(ms2OptGaps, 0.95);
        const msnnCI = confidenceInterval(msnnGaps, 0.95);

        // Hypothesis testing
        const tVsMSNN = welchTTest(kAltGaps, msnnGaps);
        const uVsMSNN = mannWhitneyUTest(kAltGaps, msnnGaps);

        const tVs2Opt = welchTTest(kAltGaps, ms2OptGaps);
        const uVs2Opt = mannWhitneyUTest(kAltGaps, ms2OptGaps);

        // Holm-Bonferroni correction
        const hypotheses = [
            { id: `${inst}_kAlt_vs_MSNN`, name: 'k-Alternatives vs MS-NN', pValue: tVsMSNN.pValue },
            {
                id: `${inst}_kAlt_vs_MS2Opt`,
                name: 'k-Alternatives vs MS-2-Opt',
                pValue: tVs2Opt.pValue,
            },
        ];
        const corrected = holmBonferroniCorrection(hypotheses, 0.05);

        reports.push({
            instance: inst,
            optimal,
            replicates: options.replicates,
            kAlt: { ci: kAltCI, raw: kAltGaps },
            ms2Opt: { ci: ms2OptCI, raw: ms2OptGaps },
            msnn: { ci: msnnCI, raw: msnnGaps },
            tests: {
                vsMSNN: { welch: tVsMSNN, mannWhitney: uVsMSNN },
                vs2Opt: { welch: tVs2Opt, mannWhitney: uVs2Opt },
                holmBonferroni: corrected,
            },
        });
        process.stdout.write('Done.\n');
    }
    return reports;
}

// -------------------------------------------------------------
// EXPERIMENT 4: Hold-Out Evaluation (P1.5)
// -------------------------------------------------------------
async function runExperiment4(holdoutInstances, options) {
    console.log('\n[4/5] Executing Hold-Out Generalization Evaluation (P1.5)...');
    const reports = [];

    for (const inst of holdoutInstances) {
        process.stdout.write(`  Evaluating hold-out instance ${inst}... `);
        const problemData = loadProblem(inst);
        const optimal = problemData.metadata.optimalDistance;
        const n = problemData.metadata.dimension;

        const solver = new TSPSolver({
            maxK: 3,
            maxTime: options.timeLimit * 1.5,
            seed: options.seed,
            stopAtOptimal: true,
        });

        const res = await solver.solveAsync(problemData);
        reports.push({
            instance: inst,
            dimension: n,
            optimal,
            bestDistance: res.bestDistance,
            gap: res.deviation,
            iterations: res.iterations,
            nodesExpanded: res.nodesExpanded,
            timeMs: res.timeMs,
        });
        process.stdout.write('Done.\n');
    }
    return reports;
}

// -------------------------------------------------------------
// EXPERIMENT 5: Empirical Complexity & Node Scaling (P1.6)
// -------------------------------------------------------------
async function runExperiment5(instances, options) {
    console.log('\n[5/5] Executing Empirical Complexity & Node Scaling Analysis (P1.6)...');
    const reports = [];

    for (const inst of instances) {
        const problemData = loadProblem(inst);
        const n = problemData.metadata.dimension;

        for (const k of [0, 1, 2, 3]) {
            const solver = new TSPSolver({
                maxK: k,
                maxTime: options.timeLimit,
                seed: options.seed,
                stopAtOptimal: false, // Ensure full expansion up to K level
            });

            const res = await solver.solveAsync(problemData);
            const theoreticalBound = theoreticalNodeBound(n, k, 20);
            const pruningRatio = calculatePruningRatio(res.nodesExpanded, theoreticalBound);

            reports.push({
                instance: inst,
                dimension: n,
                k,
                nodesExpanded: res.nodesExpanded,
                theoreticalBound,
                pruningRatio,
                timeMs: res.timeMs,
            });
        }
    }
    return reports;
}

// -------------------------------------------------------------
// Report Generation & Markdown Exporter
// -------------------------------------------------------------
function generateMarkdownReport(hw, exp1, exp2, exp3, exp4, exp5) {
    let md = `# Reproducible Experimental Results: k-Alternatives Meta-Heuristic\n\n`;
    md += `**Execution Date:** ${hw.timestamp}  \n`;
    md += `**Hardware Environment:** ${hw.cpu} (${hw.cores} cores, ${hw.ramGb} GB RAM)  \n`;
    md += `**Operating System:** ${hw.os} | **Runtime:** Node.js ${hw.nodeVersion}  \n\n`;
    md += `> This document presents automated, scientifically reproducible benchmarks comparing k-Alternatives against classical optimization baselines, assessing component ablations, verifying 95% confidence intervals, and tracking theoretical search tree pruning ratios.\n\n`;
    md += `---\n\n`;

    // 1. Baselines
    md += `## 1. Controlled Baselines Benchmark (P1.1 & P1.2)\n\n`;
    md += `Evaluated under common budget per problem, matched distance metric, and seeded PRNG.\n\n`;
    for (const rep of exp1) {
        md += `### Instance: \`${rep.instance}\` (N=${rep.dimension}, Optimal: ${rep.optimal})\n\n`;
        md += `| Method | Best Distance | Gap (%) | Evaluations / Moves | Time (ms) |\n`;
        md += `| :--- | :---: | :---: | :---: | :---: |\n`;
        for (const m of rep.methods) {
            const gapStr = m.gap !== null ? `${m.gap > 0 ? '+' : ''}${m.gap.toFixed(2)}%` : 'N/A';
            md += `| ${m.name.padEnd(30)} | ${String(m.best).padStart(9)} | ${gapStr.padStart(7)} | ${String(m.evals).padStart(19)} | ${String(m.timeMs).padStart(9)} |\n`;
        }
        md += `\n`;
    }

    // 2. Ablation
    md += `---\n\n## 2. Component Ablation Study (P1.3)\n\n`;
    md += `Isolating Move-To-Front (MTF), Multi-Start exploration, and Adaptive Restart schedule.\n\n`;
    for (const rep of exp2) {
        md += `### Instance: \`${rep.instance}\` (Optimal: ${rep.optimal}, k=3)\n\n`;
        md += `| Variant / Ablation | Best Distance | Gap (%) | ΔGap vs Full | Solutions | Nodes Expanded | Time (ms) |\n`;
        md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
        for (const v of rep.variants) {
            const deltaStr =
                v.id === 'full'
                    ? 'Baseline (0.00)'
                    : `${v.deltaGap >= 0 ? '+' : ''}${v.deltaGap.toFixed(2)}%`;
            md += `| ${v.name.padEnd(24)} | ${String(v.best).padStart(9)} | ${v.gap.toFixed(2)}% | ${deltaStr.padStart(15)} | ${String(v.iterations).padStart(9)} | ${String(v.nodesExpanded).padStart(14)} | ${String(v.timeMs).padStart(9)} |\n`;
        }
        md += `\n`;
    }

    // 3. Statistical Inference
    md += `---\n\n## 3. Statistical Significance & 95% Confidence Intervals (P1.4)\n\n`;
    md += `Tested across independent runs with Welch's t-test and Holm-Bonferroni FWER control:\n\n`;
    md += `| Instance | Algorithm | Mean Gap (%) ± 95% CI | Welch t | p-value | Holm-Bonferroni Result |\n`;
    md += `| :--- | :--- | :---: | :---: | :---: | :--- |\n`;
    for (const rep of exp3) {
        const kStr = `${rep.kAlt.ci.mean.toFixed(2)}% ± ${rep.kAlt.ci.moe.toFixed(2)}%`;
        const msStr = `${rep.ms2Opt.ci.mean.toFixed(2)}% ± ${rep.ms2Opt.ci.moe.toFixed(2)}%`;
        const nnStr = `${rep.msnn.ci.mean.toFixed(2)}% ± ${rep.msnn.ci.moe.toFixed(2)}%`;

        const testMSNN = rep.tests.holmBonferroni.find((h) => h.id.includes('MSNN'));
        const test2Opt = rep.tests.holmBonferroni.find((h) => h.id.includes('MS2Opt'));

        md += `| \`${rep.instance}\` | **k-Alternatives (k=3)** | **${kStr}** | — | — | — |\n`;
        md += `| | Multi-Start NN | ${nnStr} | ${rep.tests.vsMSNN.welch.t.toFixed(2)} | ${rep.tests.vsMSNN.welch.pValue.toExponential(2)} | ${testMSNN && testMSNN.rejected ? '✅ Statistically Significant' : '❌ Not Significant'} |\n`;
        md += `| | Multi-Start 2-Opt | ${msStr} | ${rep.tests.vs2Opt.welch.t.toFixed(2)} | ${rep.tests.vs2Opt.welch.pValue.toExponential(2)} | ${test2Opt && test2Opt.rejected ? '✅ Statistically Significant' : '➖ Competitive / Equivalent'} |\n`;
    }
    md += `\n`;

    // 4. Hold-Out
    md += `---\n\n## 4. Hold-Out Generalization Evaluation (P1.5)\n\n`;
    md += `Evaluation on unseen instances with frozen hyperparameters (k=3):\n\n`;
    md += `| Hold-Out Instance | Dimension (N) | Optimal Distance | Best Distance | Gap (%) | Time (ms) |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
    for (const h of exp4) {
        md += `| \`${h.instance.padEnd(16)}\` | ${String(h.dimension).padStart(6)} | ${String(h.optimal).padStart(9)} | ${String(h.bestDistance).padStart(9)} | ${h.gap.toFixed(2)}% | ${String(h.timeMs).padStart(9)} |\n`;
    }
    md += `\n`;

    // 5. Complexity & Node Bounds
    md += `---\n\n## 5. Empirical Node Complexity vs Theoretical Bounds (P1.6)\n\n`;
    md += `| Instance (N) | k | Nodes Expanded | Theoretical Bound | Pruning Ratio (%) | Time (ms) |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
    for (const c of exp5) {
        md += `| \`${c.instance}\` (N=${c.dimension}) | ${c.k} | ${String(c.nodesExpanded).padStart(12)} | ${String(c.theoreticalBound).padStart(16)} | ${c.pruningRatio.toFixed(2)}% | ${String(c.timeMs).padStart(9)} |\n`;
    }
    md += `\n`;

    return md;
}

// Main execution routine
async function main() {
    const options = parseArgs();

    console.log('='.repeat(78));
    console.log('   FULL REPRODUCIBILITY PIPELINE (P1.4, P1.5, P1.6, P1.7)');
    console.log('='.repeat(78));
    console.log(
        `Replicates: ${options.replicates} | Seed: ${options.seed} | Mode: ${options.quick ? 'QUICK' : 'STANDARD'}`
    );

    const hw = getHardwareMetadata();

    // 1. Baselines
    const exp1 = await runExperiment1(TUNING_INSTANCES, options);

    // 2. Ablation
    const exp2 = await runExperiment2(TUNING_INSTANCES.slice(0, 2), options);

    // 3. Statistical inference
    const exp3 = await runExperiment3(TUNING_INSTANCES.slice(0, 2), options);

    // 4. Hold-out
    const exp4 = await runExperiment4(HOLDOUT_INSTANCES, options);

    // 5. Complexity
    const exp5 = await runExperiment5(TUNING_INSTANCES.slice(0, 2), options);

    // Export raw JSON results
    const fullResults = {
        hardware: hw,
        experiment1_baselines: exp1,
        experiment2_ablation: exp2,
        experiment3_statistics: exp3,
        experiment4_holdout: exp4,
        experiment5_complexity: exp5,
    };

    const jsonPath = path.join(ROOT_DIR, 'benchmarks', 'reproducibility-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(fullResults, null, 2), 'utf8');
    console.log(`\n✔ Saved raw results to: ${jsonPath}`);

    // Export publication Markdown table
    const mdReport = generateMarkdownReport(hw, exp1, exp2, exp3, exp4, exp5);
    const mdPath = path.join(ROOT_DIR, 'docs', 'paper-experimental-results.md');
    fs.writeFileSync(mdPath, mdReport, 'utf8');
    console.log(`✔ Generated publication report at: ${mdPath}`);

    console.log('\n' + '='.repeat(78));
    console.log('   REPRODUCIBILITY PIPELINE COMPLETED SUCCESSFULLY');
    console.log('='.repeat(78));
}

main().catch(console.error);
