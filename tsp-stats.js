#!/usr/bin/env node

/**
 * TSP Statistics Viewer
 * Shows statistics for TSP problems in JSON format
 * Author: Mario Raúl Carbonell Martínez
 */

const { getStatistics, getProblemIndex, searchProblems, loadProblemSets } = require('./tsp-json-parser.js');
const fs = require('fs');
const path = require('path');

function formatNumber(num) {
    return num.toLocaleString();
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showStatistics(jsonDir = 'tsplib-json/') {
    console.log('📊 TSP Statistics Viewer');
    console.log('========================');
    
    try {
        const stats = getStatistics(jsonDir);
        
        if (stats.totalProblems === 0) {
            console.log(`❌ No problems found in ${jsonDir}`);
            return;
        }
        
        console.log(`📂 Directory: ${jsonDir}`);
        console.log(`📋 Total problems: ${formatNumber(stats.totalProblems)}`);
        console.log(`✅ With optimal: ${formatNumber(stats.withOptimal)} (${((stats.withOptimal/stats.totalProblems)*100).toFixed(1)}%)`);
        console.log(`❌ Without optimal: ${formatNumber(stats.withoutOptimal)} (${((stats.withoutOptimal/stats.totalProblems)*100).toFixed(1)}%)`);
        console.log(`🏙️  City range: ${stats.minCities} - ${stats.maxCities} (avg: ${stats.avgCities})`);
        console.log(`📏 Edge weight types: ${stats.edgeWeightTypes.join(', ')}`);
        console.log(`🏷️  Problem types: ${stats.problemTypes.join(', ')}`);
        
        // Calculate directory size
        const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
        let totalSize = 0;
        for (const file of files) {
            const filePath = path.join(jsonDir, file);
            totalSize += fs.statSync(filePath).size;
        }
        console.log(`💾 Total size: ${formatFileSize(totalSize)} (${files.length} files)`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function showProblemList(jsonDir = 'tsplib-json/', filter = null) {
    console.log('📋 TSP Problem List');
    console.log('====================');
    
    try {
        const index = getProblemIndex(jsonDir);
        let problems = index.problems;
        
        // Apply filter
        if (filter) {
            if (filter.type === 'small') {
                problems = problems.filter(p => p.cities <= 80);
            } else if (filter.type === 'medium') {
                problems = problems.filter(p => p.cities > 80 && p.cities <= 150);
            } else if (filter.type === 'large') {
                problems = problems.filter(p => p.cities > 150 && p.cities <= 200);
            } else if (filter.type === 'xlarge') {
                problems = problems.filter(p => p.cities > 200);
            } else if (filter.type === 'edge') {
                problems = problems.filter(p => p.edgeWeightType === filter.value);
            } else if (filter.type === 'search') {
                problems = searchProblems(jsonDir, filter.value);
            }
        }
        
        console.log(`📂 Directory: ${jsonDir}`);
        console.log(`📋 Showing ${problems.length}/${index.problems.length} problems\n`);
        
        // Sort by city count
        problems.sort((a, b) => a.cities - b.cities);
        
        console.log('Name'.padEnd(15) + 'Cities'.padEnd(10) + 'Optimal'.padEnd(12) + 'Type'.padEnd(12) + 'File');
        console.log('-'.repeat(60));
        
        for (const problem of problems) {
            const name = problem.name.padEnd(15);
            const cities = problem.cities.toString().padEnd(10);
            const optimal = (problem.optimal || 'N/A').toString().padEnd(12);
            const type = problem.edgeWeightType.padEnd(12);
            const file = problem.file;
            
            console.log(name + cities + optimal + type + file);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function showProblemSets(jsonDir = 'tsplib-json/') {
    console.log('📦 TSP Problem Sets');
    console.log('====================');
    
    try {
        const sets = loadProblemSets(jsonDir);
        
        console.log(`📂 Directory: ${jsonDir}\n`);
        
        for (const [setName, problems] of Object.entries(sets)) {
            console.log(`🏷️  ${setName.toUpperCase()} (${problems.length} problems):`);
            console.log(`   ${problems.slice(0, 10).join(', ')}${problems.length > 10 ? '...' : ''}\n`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function showProblemDetails(jsonDir, problemName) {
    console.log(`🔍 TSP Problem Details: ${problemName}`);
    console.log('=====================================');
    
    try {
        const index = getProblemIndex(jsonDir);
        const problem = index.problems.find(p => p.name.toLowerCase() === problemName.toLowerCase());
        
        if (!problem) {
            console.log(`❌ Problem "${problemName}" not found`);
            return;
        }
        
        console.log(`📋 Name: ${problem.name}`);
        console.log(`🏙️  Cities: ${formatNumber(problem.cities)}`);
        console.log(`🎯 Optimal: ${problem.optimal ? formatNumber(problem.optimal) : 'N/A'}`);
        console.log(`📏 Edge weight type: ${problem.edgeWeightType}`);
        console.log(`📁 File: ${problem.file}`);
        
        // Load full problem details
        const { loadTSPJSON } = require('./tsp-json-parser.js');
        const fullProblem = loadTSPJSON(path.join(jsonDir, problem.file));
        
        // Load raw JSON for metadata
        const rawContent = fs.readFileSync(path.join(jsonDir, problem.file), 'utf8');
        const rawProblem = JSON.parse(rawContent);
        
        console.log(`\n📊 Metadata:`);
        console.log(`   Type: ${rawProblem.metadata.type || 'TSP'}`);
        console.log(`   Dimension: ${rawProblem.metadata.dimension || fullProblem.cities.length}`);
        console.log(`   Source: ${rawProblem.metadata.source || 'Unknown'}`);
        console.log(`   Converted at: ${rawProblem.metadata.convertedAt ? new Date(rawProblem.metadata.convertedAt).toLocaleString() : 'Unknown'}`);
        
        if (fullProblem.cities.length > 0) {
            console.log(`\n🗺️  First 5 cities:`);
            for (let i = 0; i < Math.min(5, fullProblem.cities.length); i++) {
                const city = fullProblem.cities[i];
                console.log(`   ${i + 1}: (${city.x}, ${city.y})`);
            }
            if (fullProblem.cities.length > 5) {
                console.log(`   ... and ${fullProblem.cities.length - 5} more`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Command line interface
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        showStatistics();
        return;
    }
    
    if (args[0] === '--help') {
        console.log(`
📊 TSP Statistics Viewer

Uso:
  node tsp-stats.js                              [Mostrar estadísticas generales]
  node tsp-stats.js --list                       [Listar todos los problemas]
  node tsp-stats.js --list --small               [Problemas pequeños (≤80 ciudades)]
  node tsp-stats.js --list --medium              [Problemas medianos (81-150 ciudades)]
  node tsp-stats.js --list --large               [Problemas grandes (151-200 ciudades)]
  node tsp-stats.js --list --xlarge              [Problemas muy grandes (>200 ciudades)]
  node tsp-stats.js --list --edge EUC_2D         [Filtrar por tipo de distancia]
  node tsp-stats.js --list --search berlin       [Buscar problemas por nombre]
  node tsp-stats.js --sets                       [Mostrar conjuntos de problemas]
  node tsp-stats.js --details <problem_name>     [Detalles de un problema específico]
  node tsp-stats.js --dir <directory>            [Usar directorio específico]

Opciones:
  --dir <path>        Directorio de problemas JSON (default: tsplib-json/)
  --help              Mostrar esta ayuda

Ejemplos:
  node tsp-stats.js
  node tsp-stats.js --list --small
  node tsp-stats.js --list --edge GEO
  node tsp-stats.js --details berlin52
  node tsp-stats.js --dir problems/ --list
        `);
        return;
    }
    
    // Parse directory
    let jsonDir = 'tsplib-json/';
    const dirIndex = args.indexOf('--dir');
    if (dirIndex !== -1 && args[dirIndex + 1]) {
        jsonDir = args[dirIndex + 1];
    }
    
    // Parse command
    const command = args[0];
    
    switch (command) {
        case '--list':
            let filter = null;
            if (args.includes('--small')) filter = { type: 'small' };
            else if (args.includes('--medium')) filter = { type: 'medium' };
            else if (args.includes('--large')) filter = { type: 'large' };
            else if (args.includes('--xlarge')) filter = { type: 'xlarge' };
            else if (args.includes('--edge')) {
                const edgeIndex = args.indexOf('--edge');
                if (args[edgeIndex + 1]) {
                    filter = { type: 'edge', value: args[edgeIndex + 1] };
                }
            } else if (args.includes('--search')) {
                const searchIndex = args.indexOf('--search');
                if (args[searchIndex + 1]) {
                    filter = { type: 'search', value: args[searchIndex + 1] };
                }
            }
            showProblemList(jsonDir, filter);
            break;
            
        case '--sets':
            showProblemSets(jsonDir);
            break;
            
        case '--details':
            const problemName = args[1];
            if (problemName) {
                showProblemDetails(jsonDir, problemName);
            } else {
                console.error('❌ Error: --details requires a problem name');
            }
            break;
            
        default:
            showStatistics(jsonDir);
            break;
    }
}

// Export for programmatic use
module.exports = { showStatistics, showProblemList, showProblemSets, showProblemDetails };

// Run CLI if called directly
if (require.main === module) {
    main();
}
