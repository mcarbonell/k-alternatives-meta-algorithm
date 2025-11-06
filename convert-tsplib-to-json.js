#!/usr/bin/env node

/**
 * TSPLIB to JSON Converter
 * Converts TSPLIB .tsp files to structured JSON format with optimal solutions
 * Author: Mario Raúl Carbonell Martínez
 */

const fs = require('fs');
const path = require('path');

// Parse TSPLIB file
function parseTSPFile(content) {
    const lines = content.split('\n');
    const result = {
        name: '',
        type: 'TSP',
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
        } else if (trimmed.startsWith('TYPE:')) {
            result.type = trimmed.substring(5).trim();
        } else if (trimmed.startsWith('TYPE :')) {
            result.type = trimmed.substring(6).trim();
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

// Load optimal solutions
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

// Convert single file
function convertTSPFile(inputFile, outputFile, optimalSolutions) {
    try {
        console.log(`🔄 Convirtiendo ${path.basename(inputFile)}...`);
        
        const content = fs.readFileSync(inputFile, 'utf8');
        const problem = parseTSPFile(content);
        const optimalDistance = optimalSolutions.get(problem.name.toLowerCase());
        
        // Add metadata
        const jsonProblem = {
            metadata: {
                name: problem.name,
                type: problem.type,
                dimension: problem.dimension,
                edgeWeightType: problem.edgeWeightType,
                optimalDistance: optimalDistance || null,
                source: path.basename(inputFile),
                convertedAt: new Date().toISOString()
            },
            cities: problem.cities
        };
        
        // Write JSON file
        fs.writeFileSync(outputFile, JSON.stringify(jsonProblem, null, 2));
        console.log(`✅ Guardado: ${path.basename(outputFile)} (${problem.cities.length} ciudades, óptimo: ${optimalDistance || 'N/A'})`);
        
        return {
            name: problem.name,
            cities: problem.cities.length,
            optimal: optimalDistance,
            edgeWeightType: problem.edgeWeightType
        };
        
    } catch (error) {
        console.error(`❌ Error convirtiendo ${inputFile}:`, error.message);
        return null;
    }
}

// Batch conversion
function convertTSPLIBDirectory(inputDir = 'tsplib/', outputDir = 'tsplib-json/') {
    console.log('🚀 TSPLIB to JSON Converter');
    console.log('============================');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`📁 Creado directorio: ${outputDir}`);
    }
    
    // Load optimal solutions
    const optimalSolutions = loadOptimalSolutions();
    console.log(`📊 Cargados ${optimalSolutions.size} óptimos conocidos`);
    
    // Find all .tsp files
    const tspFiles = fs.readdirSync(inputDir).filter(f => f.endsWith('.tsp'));
    console.log(`🔍 Encontrados ${tspFiles.length} archivos .tsp\n`);
    
    const results = [];
    
    // Convert each file
    for (const file of tspFiles) {
        const inputFile = path.join(inputDir, file);
        const outputFile = path.join(outputDir, file.replace('.tsp', '.json'));
        
        const result = convertTSPFile(inputFile, outputFile, optimalSolutions);
        if (result) {
            results.push(result);
        }
    }
    
    // Generate summary
    console.log('\n📋 RESUMEN DE CONVERSIÓN:');
    console.log('='.repeat(50));
    
    const withOptimal = results.filter(r => r.optimal !== null);
    const withoutOptimal = results.filter(r => r.optimal === null);
    
    console.log(`Total convertidos: ${results.length}/${tspFiles.length}`);
    console.log(`Con óptimo conocido: ${withOptimal.length}`);
    console.log(`Sin óptimo conocido: ${withoutOptimal.length}`);
    
    // Generate index file
    const index = {
        metadata: {
            totalProblems: results.length,
            withOptimal: withOptimal.length,
            withoutOptimal: withoutOptimal.length,
            generatedAt: new Date().toISOString()
        },
        problems: results.map(r => ({
            name: r.name,
            cities: r.cities,
            optimal: r.optimal,
            edgeWeightType: r.edgeWeightType,
            file: `${r.name}.json`
        }))
    };
    
    fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2));
    console.log(`📚 Índice generado: index.json`);
    
    // Generate problem sets
    const problemSets = {
        small: results.filter(r => r.cities <= 80).map(r => r.name),
        medium: results.filter(r => r.cities > 80 && r.cities <= 150).map(r => r.name),
        large: results.filter(r => r.cities > 150 && r.cities <= 200).map(r => r.name),
        xlarge: results.filter(r => r.cities > 200).map(r => r.name)
    };
    
    fs.writeFileSync(path.join(outputDir, 'problem-sets.json'), JSON.stringify(problemSets, null, 2));
    console.log(`📦 Conjuntos de problemas generados: problem-sets.json`);
    
    console.log('\n🎯 CONVERSIÓN COMPLETADA');
    console.log(`📂 Archivos guardados en: ${outputDir}`);
    
    return results;
}

// Command line interface
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🎯 TSPLIB to JSON Converter

Uso:
  node convert-tsplib-to-json.js                    [Convertir todo el directorio tsplib/]
  node convert-tsplib-to-json.js <directorio>       [Convertir directorio específico]
  node convert-tsplib-to-json.js <archivo.tsp>      [Convertir archivo individual]

Opciones:
  --output <dir>    Directorio de salida (default: tsplib-json/)
  --help            Mostrar esta ayuda

Ejemplos:
  node convert-tsplib-to-json.js
  node convert-tsplib-to-json.js tsplib/
  node convert-tsplib-to-json.js tsplib/berlin52.tsp --output problems/
        `);
        return;
    }
    
    if (args[0] === '--help') {
        main();
        return;
    }
    
    const inputPath = args[0];
    const outputDir = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'tsplib-json/';
    
    if (fs.existsSync(inputPath)) {
        const stats = fs.statSync(inputPath);
        
        if (stats.isDirectory()) {
            // Convert directory
            convertTSPLIBDirectory(inputPath, outputDir);
        } else if (inputPath.endsWith('.tsp')) {
            // Convert single file
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const optimalSolutions = loadOptimalSolutions();
            const outputFile = path.join(outputDir, path.basename(inputPath).replace('.tsp', '.json'));
            convertTSPFile(inputPath, outputFile, optimalSolutions);
        } else {
            console.error('❌ El archivo debe tener extensión .tsp');
        }
    } else {
        console.error(`❌ No existe: ${inputPath}`);
    }
}

// Export for programmatic use
module.exports = { convertTSPFile, convertTSPLIBDirectory, parseTSPFile };

// Run CLI if called directly
if (require.main === module) {
    main();
}
