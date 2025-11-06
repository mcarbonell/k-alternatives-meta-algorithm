#!/usr/bin/env node

/**
 * k-Alternatives CLI - Command Line Interface for TSP solving
 * Author: Mario Raúl Carbonell Martínez
 */

const { TSPSolver } = require('./k-alternatives-core.js');
const { loadTSPJSON, loadMultipleProblems, loadProblemSets } = require('./tsp-json-parser.js');
const fs = require('fs');
const path = require('path');

// Legacy TSPLIB Parser (for .tsp files)
function parseTSPFile(content) {
    const lines = content.split('\n');
    const result = {
        name: '',
        dimension: 0,
        edgeWeightType: '',
        cities: []
    };

    let inCoordsSection = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'EOF') break;
        
        if (trimmed.startsWith('NAME:')) {
            result.name = trimmed.substring(5).trim();
        } else if (trimmed.startsWith('NAME :')) {
            result.name = trimmed.substring(6).trim();
        } else if (trimmed.startsWith('DIMENSION:')) {
            result.dimension = parseInt(trimmed.substring(10).trim());
        } else if (trimmed.startsWith('DIMENSION :')) {
            result.dimension = parseInt(trimmed.substring(11).trim());
        } else if (trimmed.startsWith('EDGE_WEIGHT_TYPE:')) {
            result.edgeWeightType = trimmed.substring(18).trim();
        } else if (trimmed.startsWith('EDGE_WEIGHT_TYPE :')) {
            result.edgeWeightType = trimmed.substring(19).trim();
        } else if (trimmed === 'NODE_COORD_SECTION') {
            inCoordsSection = true;
        } else if (inCoordsSection && trimmed && !isNaN(trimmed.split(/\s+/)[0])) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 3) {
                const x = parseFloat(parts[1]);
                const y = parseFloat(parts[2]);
                result.cities.push({ x, y });
            }
        }
    }
    
    return result;
}

// Load optimal solutions (for legacy .tsp files)
function loadOptimalSolutions() {
    const optimalSolutions = new Map();
    try {
        const content = fs.readFileSync('tsplib/Optimal solutions for symmetric TSPs.txt', 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
            const match = line.match(/^(\w+)\s*:\s*(\d+)$/);
            if (match) {
                optimalSolutions.set(match[1].toLowerCase(), parseInt(match[2]));
            }
        }
    } catch (error) {
        console.warn('Warning: Could not load optimal solutions file');
    }
    return optimalSolutions;
}

// Load problem (supports both .json and .tsp)
function loadProblem(problemFile) {
    if (problemFile.endsWith('.json')) {
        const flatProblem = loadTSPJSON(problemFile);
        // Restructure it to match the solver's expectation
        return {
            metadata: {
                name: flatProblem.name,
                type: flatProblem.type,
                dimension: flatProblem.dimension,
                edgeWeightType: flatProblem.edgeWeightType,
                optimalDistance: flatProblem.optimalDistance,
                source: flatProblem.source
            },
            cities: flatProblem.cities
        };
    } else if (problemFile.endsWith('.tsp')) {
        // Legacy support
        const content = fs.readFileSync(problemFile, 'utf8');
        const problemData = parseTSPFile(content);
        const optimalSolutions = loadOptimalSolutions();
        const optimalDistance = optimalSolutions.get(problemData.name.toLowerCase());
        
        // Adapt legacy format to the new problem structure
        return {
            metadata: {
                name: problemData.name,
                type: 'TSP',
                dimension: problemData.dimension,
                edgeWeightType: problemData.edgeWeightType,
                optimalDistance: optimalDistance,
                source: problemFile
            },
            cities: problemData.cities
        };
    } else {
        throw new Error('Unsupported file format. Use .json or .tsp files.');
    }
}

// CLI interface
function solveTSP(problemFile, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`🚀 Resolviendo ${problemFile} con k-alternatives (maxK=${options.maxK || 'auto'})`);
            
            const problem = loadProblem(problemFile);
            
            const solver = new TSPSolver({
                maxK: options.maxK,
                maxTime: options.maxTime,
                stopAtOptimal: options.stopAtOptimal !== false,
                onProgress: (stats) => {
                    let limitStr = stats.limitInfo || '';
                    console.log(`[${stats.time}] Iter: ${stats.iteration.toLocaleString()}, Improvements: ${stats.improvements}, K: ${stats.currentK}, Best: ${stats.bestValue.toLocaleString()}, Optimal: ${stats.optimalValue || 'N/A'}, Dev: ${stats.deviation.toFixed(2)}%`);
                },
                onSolution: (result) => {
                    console.log('\n🎯 SOLUCIÓN FINAL:');
                    console.log(`Problema: ${result.problem}`);
                    console.log(`Distancia: ${result.distance.toLocaleString()}`);
                    console.log(`Óptimo: ${result.optimal || 'N/A'}`);
                    console.log(`Desviación: ${result.deviation}%`);
                    console.log(`Tiempo total: ${result.totalTime}s`);
                    if (options.showRoute) {
                        console.log(`Ruta: [${result.route.join(', ')}]`);
                    }
                    resolve(result);
                },
                onMaxTimeReached: (result) => {
                     console.log('\n⏰ LÍMITE DE TIEMPO ALCANZADO');
                     console.log('\n🎯 SOLUCIÓN FINAL:');
                     console.log(`Problema: ${result.problem}`);
                     console.log(`Distancia: ${result.distance.toLocaleString()}`);
                     console.log(`Óptimo: ${result.optimal || 'N/A'}`);
                     console.log(`Desviación: ${result.deviation}%`);
                     console.log(`Tiempo total: ${result.totalTime}s`);
                     resolve(result);
                }
            });
            
            solver.start(problem);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Batch benchmark function
async function runBenchmark(files, options = {}) {
    const results = [];
    const startTime = Date.now();
    
    console.log(`🏁 Iniciando benchmark de ${files.length} problemas...`);
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`\n📂 Procesando ${i + 1}/${files.length}: ${path.basename(file)}`);
        
        try {
            const result = await solveTSP(file, {
                maxK: options.maxK,
                maxIterations: options.maxIterations,
                maxTime: options.maxTime,
                stopAtOptimal: false, // Never stop at optimal for benchmark - process all problems
                debug: options.debug,
                verbose: options.verbose,
                showRoute: options.showRoute
            });
            
            results.push(result);
            
        } catch (error) {
            console.error(`❌ Error procesando ${file}: ${error.message}`);
            results.push({
                error: error.message,
                file: path.basename(file)
            });
        }
    }
    
    // Print summary
    console.log('\n🏆 RESUMEN DEL BENCHMARK:');
    console.log('='.repeat(80));
    
    const successful = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);
    
    if (successful.length > 0) {
        const avgDeviation = successful.reduce((sum, r) => sum + r.deviation, 0) / successful.length;
        const optimalFound = successful.filter(r => r.deviation === 0).length;
        
        console.log(`Problemas resueltos: ${successful.length}/${files.length}`);
        console.log(`Problemas fallidos: ${failed.length}`);
        console.log(`Óptimos encontrados: ${optimalFound}/${successful.length} (${((optimalFound/successful.length)*100).toFixed(1)}%)`);
        console.log(`Desviación promedio: ${avgDeviation.toFixed(2)}%`);
        console.log(`Tiempo total: ${successful.reduce((sum, r) => sum + r.totalTime, 0)}s`);
        
        // Detailed results
        console.log('\n📋 RESULTADOS DETALLADOS:');
        console.log('Problema\t\tDistancia\tÓptimo\t\tDesviación\tTiempo\t\tTiempoÓptimo');
        console.log('-'.repeat(80));
        
        successful.forEach(r => {
            const name = r.problem.padEnd(15);
            const distance = r.distance.toString().padStart(8);
            const optimal = (r.optimal || 'N/A').toString().padStart(8);
            const deviation = r.deviation.toFixed(2) + '%'.padStart(8);
            const time = r.totalTime + 's'.padStart(8);
            const optTime = (r.optimalTime || '-') + 's'.padStart(8);
            console.log(`${name}\t${distance}\t${optimal}\t${deviation}\t${time}\t${optTime}`);
        });
    }
    
    if (failed.length > 0) {
        console.log('\n❌ PROBLEMAS FALLIDOS:');
        failed.forEach(r => {
            console.log(`${r.problem}: ${r.error}`);
        });
    }
    
    return results;
}

// Command line interface
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🎯 k-Alternatives CLI - Optimización TSP por línea de comandos

Uso:
  node k-alternatives-cli.js <archivo.tsp|json>         [Resolver un problema]
  node k-alternatives-cli.js --batch <directorio>      [Benchmark masivo]
  node k-alternatives-cli.js --help                     [Ayuda]

Opciones:
  --maxK N              Máximo valor de K (default: log(n))
  --max-iterations N    Límite máximo de iteraciones
  --max-time N          Límite máximo de tiempo en segundos
  --no-stop-optimal     No detenerse al encontrar óptimo (default: sí se detiene)
  --report-every N      Reportar progreso cada N iteraciones (default: 100000)
  --debug               Modo verbose
  --verbose             Mostrar mejoras en tiempo real
  --show-route          Mostrar ruta completa al final
  --output file.json    Guardar resultados en archivo JSON

Formatos soportados:
  .json                 Formato JSON estructurado (recomendado)
  .tsp                  Formato TSPLIB tradicional (legacy)

Ejemplos:
  node k-alternatives-cli.js tsplib-json/berlin52.json
  node k-alternatives-cli.js tsplib-json/berlin52.json --max-time 30
  node k-alternatives-cli.js tsplib-json/berlin52.json --no-stop-optimal --max-iterations 5000000
  node k-alternatives-cli.js tsplib-json/berlin52.json --report-every 50000
  node k-alternatives-cli.js --batch tsplib-json/ --maxK 5 --max-time 60 --output results.json
        `);
        return;
    }
    
    if (args[0] === '--help') {
        main();
        return;
    }
    
    if (args[0] === '--batch') {
        const dir = args[1] || 'tsplib/';
        const maxK = args.includes('--maxK') ? parseInt(args[args.indexOf('--maxK') + 1]) : undefined;
        const maxIterations = args.includes('--max-iterations') ? parseInt(args[args.indexOf('--max-iterations') + 1]) : undefined;
        const maxTime = args.includes('--max-time') ? parseInt(args[args.indexOf('--max-time') + 1]) : undefined;
        const stopAtOptimal = !args.includes('--no-stop-optimal');
        const debug = args.includes('--debug');
        const verbose = args.includes('--verbose');
        const showRoute = args.includes('--show-route');
        const reportEvery = args.includes('--report-every') ? parseInt(args[args.indexOf('--report-every') + 1]) : 100000;
        const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
        
        try {
            // Support both .json and .tsp files
            const allFiles = fs.readdirSync(dir);
            const jsonFiles = allFiles.filter(f => f.endsWith('.json') && !f.includes('index') && !f.includes('problem-sets')).map(f => path.join(dir, f));
            const tspFiles = allFiles.filter(f => f.endsWith('.tsp')).map(f => path.join(dir, f));
            const files = [...jsonFiles, ...tspFiles];
            
            if (files.length === 0) {
                console.error(`❌ No se encontraron archivos .json o .tsp en ${dir}`);
                return;
            }
            
            console.log(`📁 Encontrados ${jsonFiles.length} archivos JSON y ${tspFiles.length} archivos TSP`);
            
            runBenchmark(files, { 
                maxK, 
                maxIterations, 
                maxTime, 
                stopAtOptimal,
                debug, 
                verbose, 
                showRoute,
                reportEvery
            }).then(results => {
                if (outputFile) {
                    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
                    console.log(`\n💾 Resultados guardados en ${outputFile}`);
                }
            });
            
        } catch (error) {
            console.error('Error:', error.message);
        }
        return;
    }
    
    // Single problem solving
    const problemFile = args[0];
    const maxK = args.includes('--maxK') ? parseInt(args[args.indexOf('--maxK') + 1]) : undefined;
    const maxIterations = args.includes('--max-iterations') ? parseInt(args[args.indexOf('--max-iterations') + 1]) : undefined;
    const maxTime = args.includes('--max-time') ? parseInt(args[args.indexOf('--max-time') + 1]) : undefined;
    const stopAtOptimal = !args.includes('--no-stop-optimal');
    const debug = args.includes('--debug');
    const verbose = args.includes('--verbose');
    const showRoute = args.includes('--show-route');
    const reportEvery = args.includes('--report-every') ? parseInt(args[args.indexOf('--report-every') + 1]) : 100000;
    
    if (!fs.existsSync(problemFile)) {
        console.error(`❌ Archivo no encontrado: ${problemFile}`);
        return;
    }
    
    solveTSP(problemFile, { 
        maxK, 
        maxIterations, 
        maxTime, 
        stopAtOptimal,
        debug, 
        verbose, 
        showRoute,
        reportEvery
    }).catch(console.error);
}

// Export for programmatic use
module.exports = { solveTSP, runBenchmark };

// Run CLI if called directly
if (require.main === module) {
    main();
}
