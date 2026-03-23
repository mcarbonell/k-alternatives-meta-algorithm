#!/usr/bin/env node

/**
 * Benchmark Script for k-Alternatives TSP Algorithm
 * Runs comprehensive tests on TSPLIB problems
 */

import { runBenchmark } from './k-alternatives-cli.js';
import fs from 'fs';

// Define problem sets for different test scenarios
const PROBLEM_SETS = {
    small: [
        'tsplib/berlin52.tsp',
        'tsplib/eil51.tsp',
        'tsplib/st70.tsp',
        'tsplib/eil76.tsp',
        'tsplib/pr76.tsp',
    ],
    medium: [
        'tsplib/kroA100.tsp',
        'tsplib/kroB100.tsp',
        'tsplib/kroC100.tsp',
        'tsplib/kroD100.tsp',
        'tsplib/kroE100.tsp',
        'tsplib/rd100.tsp',
        'tsplib/lin105.tsp',
    ],
    large: [
        'tsplib/ch150.tsp',
        'tsplib/kroA150.tsp',
        'tsplib/kroB150.tsp',
        'tsplib/pr152.tsp',
        'tsplib/u159.tsp',
        'tsplib/rat195.tsp',
        'tsplib/d198.tsp',
    ],
    xlarge: [
        'tsplib/kroA200.tsp',
        'tsplib/kroB200.tsp',
        'tsplib/ts225.tsp',
        'tsplib/tsp225.tsp',
        'tsplib/pr226.tsp',
        'tsplib/gil262.tsp',
        'tsplib/pr264.tsp',
    ],
};

// Test configurations
const CONFIGURATIONS = {
    fast: { maxK: 3, description: 'Rápido (K=3)' },
    balanced: { maxK: 5, description: 'Equilibrado (K=5)' },
    thorough: { maxK: 7, description: 'Exhaustivo (K=7)' },
};

async function runBenchmarkSuite(setName = 'all', config = 'balanced') {
    console.log('🚀 k-Alternatives Benchmark Suite');
    console.log('=====================================');

    let problems;
    if (setName === 'all') {
        problems = [...PROBLEM_SETS.small, ...PROBLEM_SETS.medium];
    } else if (PROBLEM_SETS[setName]) {
        problems = PROBLEM_SETS[setName];
    } else {
        console.error(`❌ Conjunto de problemas no válido: ${setName}`);
        console.log('Conjuntos disponibles:', Object.keys(PROBLEM_SETS).join(', '));
        return;
    }

    const options = CONFIGURATIONS[config];
    if (!options) {
        console.error(`❌ Configuración no válida: ${config}`);
        console.log('Configuraciones disponibles:', Object.keys(CONFIGURATIONS).join(', '));
        return;
    }

    console.log(`📊 Conjunto: ${setName} (${problems.length} problemas)`);
    console.log(`⚙️  Configuración: ${options.description}`);
    console.log(`🎯 maxK: ${options.maxK}`);
    console.log('');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `benchmark-results-${setName}-${config}-${timestamp}.json`;

    try {
        const results = await runBenchmark(problems, { maxK: options.maxK, debug: false });

        // Save detailed results
        fs.writeFileSync(
            outputFile,
            JSON.stringify(
                {
                    metadata: {
                        timestamp: new Date().toISOString(),
                        setName,
                        config,
                        maxK: options.maxK,
                        totalProblems: problems.length,
                        successful: results.filter((r) => !r.error).length,
                        failed: results.filter((r) => r.error).length,
                    },
                    results,
                },
                null,
                2
            )
        );

        // Generate summary report
        generateSummaryReport(results, setName, config, outputFile);
    } catch (error) {
        console.error('❌ Error en benchmark:', error.message);
    }
}

function generateSummaryReport(results, setName, config, outputFile) {
    const successful = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);

    if (successful.length === 0) {
        console.log('❌ No se pudo resolver ningún problema');
        return;
    }

    // Calculate statistics
    const stats = {
        totalProblems: results.length,
        successful: successful.length,
        failed: failed.length,
        optimalFound: successful.filter((r) => r.deviation === 0).length,
        avgDeviation: successful.reduce((sum, r) => sum + r.deviation, 0) / successful.length,
        maxDeviation: Math.max(...successful.map((r) => r.deviation)),
        minDeviation: Math.min(...successful.map((r) => r.deviation)),
        totalTime: successful.reduce((sum, r) => sum + r.totalTime, 0),
        avgTime: successful.reduce((sum, r) => sum + r.totalTime, 0) / successful.length,
        totalIterations: successful.reduce((sum, r) => sum + r.iterations, 0),
        avgIterations: Math.round(
            successful.reduce((sum, r) => sum + r.iterations, 0) / successful.length
        ),
    };

    // Generate markdown report
    const report = `
# k-Alternatives Benchmark Report

## 📊 Test Configuration
- **Problem Set**: ${setName}
- **Configuration**: ${CONFIGURATIONS[config].description}
- **maxK**: ${CONFIGURATIONS[config].maxK}
- **Date**: ${new Date().toLocaleString()}

## 🏆 Overall Results
- **Problems Solved**: ${stats.successful}/${stats.totalProblems} (${((stats.successful / stats.totalProblems) * 100).toFixed(1)}%)
- **Optimal Solutions Found**: ${stats.optimalFound}/${stats.successful} (${((stats.optimalFound / stats.successful) * 100).toFixed(1)}%)
- **Average Deviation**: ${stats.avgDeviation.toFixed(2)}%
- **Max Deviation**: ${stats.maxDeviation.toFixed(2)}%
- **Min Deviation**: ${stats.minDeviation.toFixed(2)}%

## ⏱️ Performance Metrics
- **Total Time**: ${stats.totalTime}s
- **Average Time**: ${stats.avgTime.toFixed(1)}s
- **Total Iterations**: ${stats.totalIterations.toLocaleString()}
- **Average Iterations**: ${stats.avgIterations.toLocaleString()}

## 📋 Detailed Results

| Problem | Distance | Optimal | Deviation | Time | Optimal Time | Iterations | Improvements |
|---------|----------|---------|-----------|------|--------------|------------|--------------|
${successful
    .map(
        (r) =>
            `| ${r.problem} | ${r.distance.toLocaleString()} | ${r.optimal || 'N/A'} | ${r.deviation.toFixed(2)}% | ${r.totalTime}s | ${r.optimalTime || '-'}s | ${r.iterations.toLocaleString()} | ${r.improvements} |`
    )
    .join('\n')}

${
    failed.length > 0
        ? `
## ❌ Failed Problems
${failed.map((r) => `- ${r.problem}: ${r.error}`).join('\n')}
`
        : ''
}

## 📄 Files
- **Detailed Results**: [${outputFile}](${outputFile})
- **Generated**: ${new Date().toISOString()}

---
*Generated by k-Alternatives CLI*
`;

    const reportFile = outputFile.replace('.json', '.md');
    fs.writeFileSync(reportFile, report);

    console.log(`\n📋 Reporte generado: ${reportFile}`);
    console.log(`💾 Datos detallados: ${outputFile}`);
    console.log(`\n🎯 Resumen ejecutivo:`);
    console.log(`   ✅ ${stats.successful}/${stats.totalProblems} problemas resueltos`);
    console.log(`   🏆 ${stats.optimalFound}/${stats.successful} óptimos encontrados`);
    console.log(`   📊 Desviación promedio: ${stats.avgDeviation.toFixed(2)}%`);
    console.log(`   ⏱️  Tiempo promedio: ${stats.avgTime.toFixed(1)}s`);
}

// Command line interface
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
🎯 k-Alternatives Benchmark Suite

Uso:
  node benchmark.js [conjunto] [configuración]

Conjuntos de problemas:
  small    - Problemas pequeños (50-80 ciudades)
  medium   - Problemas medianos (100-150 ciudades)
  large    - Problemas grandes (150-200 ciudades)
  xlarge   - Problemas extra grandes (200+ ciudades)
  all      - Todos los problemas pequeños y medianos (default)

Configuraciones:
  fast      - Rápido (K=3)
  balanced  - Equilibrado (K=5) - default
  thorough  - Exhaustivo (K=7)

Ejemplos:
  node benchmark.js small balanced
  node benchmark.js medium fast
  node benchmark.js all thorough
        `);
        return;
    }

    const setName = args[0] || 'all';
    const config = args[1] || 'balanced';

    runBenchmarkSuite(setName, config);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { runBenchmarkSuite, PROBLEM_SETS, CONFIGURATIONS };
