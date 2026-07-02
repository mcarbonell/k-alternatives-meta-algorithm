#!/usr/bin/env node
/**
 * k-Alternatives Local Minima Analysis
 * Exhaustive analysis of local minima distribution for TSP problems
 */

import { TSPSolver } from '../src/tsp-solver.js';
import fs from 'fs';
import path from 'path';

// ===== CONFIGURATION =====
const CONFIG = {
    problems: ['berlin52', 'st70', 'dantzig42', 'bays29', 'ulysses22'],
    kValues: [0, 1, 2, 3],
    runsPerK: 50, // Number of independent runs per K value
    timeLimit: 60, // seconds per run
    shuffle: true,
};

// ===== ANALYZER =====
class LocalMinimaAnalyzer {
    constructor() {
        this.results = {};
    }

    async runSingle(problemData, maxK, timeLimit) {
        return new Promise((resolve) => {
            const solver = new TSPSolver({
                maxK,
                maxTime: timeLimit,
                stopAtOptimal: false,
                shuffle: CONFIG.shuffle,
                onSolution: (result) => resolve(result),
                onMaxTimeReached: (result) => resolve(result),
            });
            solver.start(JSON.parse(JSON.stringify(problemData)));
        });
    }

    computeStats(values, optimal) {
        const unique = new Set(values).size;
        const optimalCount = values.filter((v) => Math.abs(v - optimal) < 0.001).length;
        const successRate = (optimalCount / values.length) * 100;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const avgGap = ((avg - optimal) / optimal) * 100;
        const best = Math.min(...values);
        const worst = Math.max(...values);

        // Frequency distribution
        const freq = {};
        values.forEach((v) => {
            freq[v] = (freq[v] || 0) + 1;
        });
        const sorted = Object.entries(freq)
            .map(([val, count]) => ({
                value: Number(val),
                count,
                pct: ((count / values.length) * 100).toFixed(1),
            }))
            .sort((a, b) => b.count - a.count);

        // Gap buckets
        const buckets = { '0% (Opt)': 0, '0-1%': 0, '1-2%': 0, '2-3%': 0, '3-5%': 0, '5%+': 0 };
        values.forEach((v) => {
            const gap = ((v - optimal) / optimal) * 100;
            if (Math.abs(gap) < 0.01) buckets['0% (Opt)']++;
            else if (gap < 1) buckets['0-1%']++;
            else if (gap < 2) buckets['1-2%']++;
            else if (gap < 3) buckets['2-3%']++;
            else if (gap < 5) buckets['3-5%']++;
            else buckets['5%+']++;
        });

        // Minima close to optimal (< 2% gap)
        const closeToOptimal = new Set(
            values.filter((v) => {
                const gap = ((v - optimal) / optimal) * 100;
                return gap < 2;
            })
        ).size;

        return {
            unique,
            optimalCount,
            successRate,
            avg,
            avgGap,
            best,
            worst,
            sorted,
            buckets,
            closeToOptimal,
        };
    }

    async analyzeProblem(problemName) {
        const filePath = path.join('tsplib-json', `${problemName}.json`);
        if (!fs.existsSync(filePath)) {
            console.log(`  SKIP: ${problemName} not found`);
            return null;
        }

        const problemData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const optimal = problemData.metadata.optimalDistance;
        const n = problemData.cities.length;

        console.log(`\n${'═'.repeat(70)}`);
        console.log(`  ${problemName} (N=${n}, Optimal=${optimal})`);
        console.log(`${'═'.repeat(70)}`);

        const kResults = {};

        for (const k of CONFIG.kValues) {
            console.log(`\n  K=${k}: ${CONFIG.runsPerK} runs...`);

            const results = [];
            const startTime = Date.now();

            for (let i = 0; i < CONFIG.runsPerK; i++) {
                if (i % 10 === 0) process.stdout.write(`.`);
                const result = await this.runSingle(problemData, k, CONFIG.timeLimit);
                const dist = result.bestDistance || result.distance;
                results.push(dist);
            }

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            console.log(`✓ (${elapsed}s)`);

            kResults[k] = this.computeStats(results, optimal);
        }

        this.results[problemName] = { n, optimal, kResults };
        return kResults;
    }

    printResults() {
        console.log(`\n${'═'.repeat(70)}`);
        console.log('  RESUMEN GENERAL');
        console.log(`${'═'.repeat(70)}`);

        // Cross-problem summary
        console.log('\n  K | Avg Success | Avg Gap | Avg Unique Minima');
        console.log('  --|-------------|---------|-----------------');

        for (const k of CONFIG.kValues) {
            let totalSuccess = 0,
                totalGap = 0,
                totalUnique = 0,
                count = 0;
            Object.values(this.results).forEach((pd) => {
                const r = pd.kResults[k];
                totalSuccess += r.successRate;
                totalGap += Math.abs(r.avgGap);
                totalUnique += r.unique;
                count++;
            });
            console.log(
                `  ${k} | ${(totalSuccess / count).toFixed(1).padStart(10)}% | ${(totalGap / count).toFixed(2).padStart(7)}% | ${Math.round(
                    totalUnique / count
                )
                    .toString()
                    .padStart(15)}`
            );
        }

        // Per-problem detail
        for (const [problemName, pd] of Object.entries(this.results)) {
            console.log(`\n${'─'.repeat(70)}`);
            console.log(`  ${problemName} (N=${pd.n}, Optimal=${pd.optimal})`);
            console.log(`${'─'.repeat(70)}`);

            // Summary table
            console.log('\n    K | Unique | Success | Avg Gap | Best | Close<2% | Top Minima');
            console.log('    --|--------|---------|---------|------|----------|-----------');

            for (const k of CONFIG.kValues) {
                const r = pd.kResults[k];
                const top3 = r.sorted
                    .slice(0, 3)
                    .map((m) => {
                        const gap = (((m.value - pd.optimal) / pd.optimal) * 100).toFixed(2);
                        return `${m.value}(${m.pct}%)`;
                    })
                    .join(', ');

                console.log(
                    `    ${k} | ${String(r.unique).padStart(6)} | ${r.successRate.toFixed(1).padStart(6)}% | ${Math.abs(r.avgGap).toFixed(2).padStart(6)}% | ${r.best} | ${String(r.closeToOptimal).padStart(8)} | ${top3}`
                );
            }

            // Gap distribution for each K
            console.log('\n    Gap Distribution:');
            for (const k of CONFIG.kValues) {
                const r = pd.kResults[k];
                console.log(`\n      K=${k}:`);
                Object.entries(r.buckets).forEach(([label, count]) => {
                    const pct = (count / r.optimalCount + r.unique ? CONFIG.runsPerK : 1) * 100; // simplified
                    const bar = '█'.repeat(Math.max(0, Math.round((count / CONFIG.runsPerK) * 40)));
                    console.log(`        ${label.padEnd(10)} ${bar} ${count}/${CONFIG.runsPerK}`);
                });
            }
        }
    }

    generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // JSON report
        const report = {
            title: 'k-Alternatives Local Minima Analysis',
            timestamp: new Date().toISOString(),
            config: CONFIG,
            problems: this.results,
        };

        fs.writeFileSync(`local-minima-${timestamp}.json`, JSON.stringify(report, null, 2));

        // Markdown report
        let md = `# k-Alternatives: Análisis de Mínimos Locales\n\n`;
        md += `## Configuración\n`;
        md += `- Problemas: ${CONFIG.problems.join(', ')}\n`;
        md += `- K values: ${CONFIG.kValues.join(', ')}\n`;
        md += `- Runs por K: ${CONFIG.runsPerK}\n\n`;

        md += `## Resumen Cross-Problema\n\n`;
        md += `| K | Éxito Promedio | Gap Promedio | Mínimos Únicos |\n`;
        md += `|---|---|---|---|\n`;

        for (const k of CONFIG.kValues) {
            let totalSuccess = 0,
                totalGap = 0,
                totalUnique = 0,
                count = 0;
            Object.values(this.results).forEach((pd) => {
                const r = pd.kResults[k];
                totalSuccess += r.successRate;
                totalGap += Math.abs(r.avgGap);
                totalUnique += r.unique;
                count++;
            });
            md += `| ${k} | ${(totalSuccess / count).toFixed(1)}% | ${(totalGap / count).toFixed(2)}% | ${Math.round(totalUnique / count)} |\n`;
        }

        md += `\n## Resultados por Problema\n\n`;
        for (const [problemName, pd] of Object.entries(this.results)) {
            md += `### ${problemName} (N=${pd.n}, Óptimo=${pd.optimal})\n\n`;
            md += `| K | Únicos | Éxito | Gap | Mejor | Cerca<2% |\n`;
            md += `|---|---|---|---|---|---|\n`;
            for (const k of CONFIG.kValues) {
                const r = pd.kResults[k];
                md += `| ${k} | ${r.unique} | ${r.successRate.toFixed(1)}% | ${Math.abs(r.avgGap).toFixed(2)}% | ${r.best} | ${r.closeToOptimal} |\n`;
            }
            md += '\n';
        }

        md += `---\n*Generated by k-Alternatives Local Minima Analysis*\n`;

        fs.writeFileSync(`local-minima-${timestamp}.md`, md);
        console.log(`\n📄 Reportes generados:`);
        console.log(`   - local-minima-${timestamp}.json`);
        console.log(`   - local-minima-${timestamp}.md`);
    }
}

// ===== MAIN =====
async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  k-Alternatives: Análisis Exhaustivo de Mínimos Locales     ║
╚══════════════════════════════════════════════════════════════╝
`);
    console.log(`Config: K=${CONFIG.kValues.join(', ')}, Runs=${CONFIG.runsPerK}/K`);
    console.log(`Problemas: ${CONFIG.problems.join(', ')}\n`);

    const analyzer = new LocalMinimaAnalyzer();

    for (const problem of CONFIG.problems) {
        await analyzer.analyzeProblem(problem);
    }

    analyzer.printResults();
    analyzer.generateReport();

    console.log(`\n✅ Análisis completo!`);
}

main().catch(console.error);
