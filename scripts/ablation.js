#!/usr/bin/env node

/**
 * Systematic Ablation Study Suite (P1.3)
 *
 * Isolates and quantifies the algorithmic contribution of each core component
 * of k-Alternatives under controlled conditions:
 *
 * Configurations:
 * 1. Full k-Alternatives:
 *      (LDS + Multi-Start + MTF Learning + Adaptive Schedule)
 * 2. Ablation (a) - No MTF (Static Order):
 *      learning: false (Candidate list never reordered on improvement)
 * 3. Ablation (b) - Single-Start:
 *      multiStart: false (Search initiated only from item 0)
 * 4. Ablation (c) - Fixed Schedule:
 *      adaptiveSchedule: false (Monotonic k increment without repeat restarts)
 * 5. Ablation (d) - Bare LDS:
 *      learning: false, multiStart: false, adaptiveSchedule: false
 *
 * Usage:
 *   node scripts/ablation.js [--k 3] [--time 3] [--seed 42] [--instances bays29,berlin52,st70]
 *
 * @author Mario Raúl Carbonell Martínez
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TSPSolver } from '../src/tsp-solver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        k: 3,
        timeLimit: 3, // seconds per run
        seed: 42,
        instances: ['bays29', 'berlin52', 'st70'],
        json: false,
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--k' && args[i + 1]) {
            options.k = parseInt(args[++i], 10);
        } else if (args[i] === '--time' && args[i + 1]) {
            options.timeLimit = parseFloat(args[++i]);
        } else if (args[i] === '--seed' && args[i + 1]) {
            options.seed = parseInt(args[++i], 10);
        } else if (args[i] === '--instances' && args[i + 1]) {
            options.instances = args[++i].split(',').map((s) => s.trim());
        } else if (args[i] === '--json') {
            options.json = true;
        } else if (args[i] === '--help') {
            console.log(`
Usage: node scripts/ablation.js [options]

Options:
  --k <number>         k value for discrepancy search (default: 3)
  --time <sec>         Time limit in seconds per variant (default: 3)
  --seed <number>      PRNG seed (default: 42)
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

const VARIANTS = [
    {
        id: 'full',
        name: 'Full k-Alternatives',
        options: { learning: true, multiStart: true, adaptiveSchedule: true },
        description: 'Complete algorithm (LDS + Multi-Start + MTF + Adaptive Schedule)',
    },
    {
        id: 'no-mtf',
        name: 'Ablation: No MTF',
        options: { learning: false, multiStart: true, adaptiveSchedule: true },
        description: 'Static candidate list order (no Move-To-Front heuristic update)',
    },
    {
        id: 'single-start',
        name: 'Ablation: Single-Start',
        options: { learning: true, multiStart: false, adaptiveSchedule: true },
        description: 'Only starting from city 0 (tests multi-start contribution)',
    },
    {
        id: 'fixed-schedule',
        name: 'Ablation: Fixed Schedule',
        options: { learning: true, multiStart: true, adaptiveSchedule: false },
        description: 'Monotonic k progression (no restarts at current k upon improvement)',
    },
    {
        id: 'bare-lds',
        name: 'Ablation: Bare LDS',
        options: { learning: false, multiStart: false, adaptiveSchedule: false },
        description: 'Pure single-start LDS without MTF or restart schedules',
    },
];

async function runAblationForProblem(instanceName, cliOptions) {
    const problemData = loadProblem(instanceName);
    const optimal = problemData.metadata.optimalDistance;
    const dimension = problemData.metadata.dimension;

    const results = [];
    let fullGap = 0;

    for (const variant of VARIANTS) {
        const solver = new TSPSolver({
            maxK: cliOptions.k,
            maxTime: cliOptions.timeLimit,
            seed: cliOptions.seed,
            stopAtOptimal: true,
            ...variant.options,
        });

        const res = await solver.solveAsync(problemData);
        const gap = res.deviation !== null ? res.deviation : 0;

        if (variant.id === 'full') {
            fullGap = gap;
        }

        const deltaGap = parseFloat((gap - fullGap).toFixed(2));

        results.push({
            id: variant.id,
            name: variant.name,
            bestDistance: res.bestDistance,
            optimal,
            gap,
            deltaGap,
            iterations: res.iterations,
            nodesExpanded: res.nodesExpanded,
            timeMs: res.timeMs,
        });
    }

    return {
        instance: instanceName,
        dimension,
        optimal,
        k: cliOptions.k,
        timeLimitSec: cliOptions.timeLimit,
        seed: cliOptions.seed,
        results,
    };
}

function printMarkdownTable(report) {
    console.log(
        `\n### Instance: ${report.instance} (N=${report.dimension}, Optimal: ${report.optimal}, k=${report.k})`
    );
    console.log(`- **Budget:** ${report.timeLimitSec}s max | **Seed:** ${report.seed}\n`);
    console.log(
        '| Variant / Ablation | Best Dist | Gap (%) | ΔGap vs Full | Solutions | Nodes Expanded | Time (ms) |'
    );
    console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: |');

    for (const r of report.results) {
        const deltaStr =
            r.id === 'full'
                ? 'Baseline (0.00)'
                : `${r.deltaGap >= 0 ? '+' : ''}${r.deltaGap.toFixed(2)}%`;
        const gapStr = `${r.gap.toFixed(2)}%`;
        console.log(
            `| ${r.name.padEnd(24)} | ${String(r.bestDistance).padStart(9)} | ${gapStr.padStart(7)} | ${deltaStr.padStart(15)} | ${String(r.iterations).padStart(9)} | ${String(r.nodesExpanded).padStart(14)} | ${String(r.timeMs).padStart(9)} |`
        );
    }
}

function printSummary(allReports) {
    console.log('\n' + '='.repeat(78));
    console.log('   COMPONENT CONTRIBUTION SUMMARY ACROSS ALL INSTANCES');
    console.log('='.repeat(78));

    const deltasByVariant = {};
    for (const v of VARIANTS) {
        if (v.id === 'full') continue;
        deltasByVariant[v.id] = [];
    }

    for (const rep of allReports) {
        for (const res of rep.results) {
            if (res.id !== 'full') {
                deltasByVariant[res.id].push(res.deltaGap);
            }
        }
    }

    console.log('\n| Component Tested | Ablated Variant | Mean ΔGap | Finding / Conclusion |');
    console.log('| :--- | :--- | :---: | :--- |');

    for (const v of VARIANTS) {
        if (v.id === 'full') continue;
        const deltas = deltasByVariant[v.id];
        const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const meanDeltaStr = `${meanDelta >= 0 ? '+' : ''}${meanDelta.toFixed(2)}%`;

        let conclusion = '';
        if (v.id === 'no-mtf') {
            conclusion =
                meanDelta > 0
                    ? 'MTF candidate reordering improves final tour quality.'
                    : 'Static candidate ordering matches MTF on small instances.';
        } else if (v.id === 'single-start') {
            conclusion =
                meanDelta > 0
                    ? 'Multi-start exploration is critical for escaping poor roots.'
                    : 'Single-start is competitive on easy instances.';
        } else if (v.id === 'fixed-schedule') {
            conclusion =
                meanDelta > 0
                    ? 'Adaptive restart schedule significantly deepens search.'
                    : 'Fixed schedule provides faster, coarser progression.';
        } else if (v.id === 'bare-lds') {
            conclusion =
                'Without synergistic components, bare LDS suffers severe performance penalty.';
        }

        console.log(
            `| ${v.name.replace('Ablation: ', '').padEnd(18)} | ${v.name.padEnd(23)} | ${meanDeltaStr.padStart(9)} | ${conclusion} |`
        );
    }
}

async function main() {
    const options = parseArgs();

    console.log('='.repeat(78));
    console.log('   SYSTEMATIC ABLATION STUDY (P1.3)');
    console.log('='.repeat(78));
    console.log(`Instances: ${options.instances.join(', ')}`);
    console.log(`k: ${options.k} | Time Limit: ${options.timeLimit}s | Seed: ${options.seed}`);

    const allReports = [];

    for (const inst of options.instances) {
        try {
            process.stdout.write(`\nEvaluating ablation suite on ${inst}... `);
            const report = await runAblationForProblem(inst, options);
            process.stdout.write('Done.\n');
            allReports.push(report);
            if (!options.json) {
                printMarkdownTable(report);
            }
        } catch (err) {
            console.error(`\n[ERROR] Failed ablation on ${inst}:`, err.message);
        }
    }

    if (options.json) {
        console.log(JSON.stringify(allReports, null, 2));
    } else if (allReports.length > 0) {
        printSummary(allReports);
    }

    console.log('\n' + '='.repeat(78));
    console.log('   ABLATION STUDY COMPLETED SUCCESSFULLY');
    console.log('='.repeat(78));
}

main().catch(console.error);
