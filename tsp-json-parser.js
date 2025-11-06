/**
 * TSP JSON Parser
 * Handles structured JSON TSP files
 * Author: Mario Raúl Carbonell Martínez
 */

const fs = require('fs');
const path = require('path');

// Load TSP problem from JSON file
function loadTSPJSON(jsonFile) {
    try {
        const content = fs.readFileSync(jsonFile, 'utf8');
        const problem = JSON.parse(content);
        
        // Validate structure
        if (!problem.metadata || !problem.cities) {
            throw new Error('Invalid JSON TSP format: missing metadata or cities');
        }
        
        return {
            name: problem.metadata.name,
            type: problem.metadata.type || 'TSP',
            dimension: problem.metadata.dimension,
            edgeWeightType: problem.metadata.edgeWeightType,
            optimalDistance: problem.metadata.optimalDistance,
            cities: problem.cities,
            source: jsonFile
        };
        
    } catch (error) {
        throw new Error(`Error loading JSON TSP file ${jsonFile}: ${error.message}`);
    }
}

// Load multiple problems from directory
function loadMultipleProblems(jsonDir, filter = null) {
    const problems = [];
    
    if (!fs.existsSync(jsonDir)) {
        throw new Error(`Directory not found: ${jsonDir}`);
    }
    
    const jsonFiles = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
    
    for (const file of jsonFiles) {
        if (file === 'index.json' || file === 'problem-sets.json') {
            continue; // Skip metadata files
        }
        
        try {
            const problem = loadTSPJSON(path.join(jsonDir, file));
            
            // Apply filter if specified
            if (filter) {
                if (filter.name && !problem.name.toLowerCase().includes(filter.name.toLowerCase())) {
                    continue;
                }
                if (filter.minCities && problem.cities.length < filter.minCities) {
                    continue;
                }
                if (filter.maxCities && problem.cities.length > filter.maxCities) {
                    continue;
                }
                if (filter.edgeWeightType && problem.edgeWeightType !== filter.edgeWeightType) {
                    continue;
                }
                if (filter.hasOptimal !== undefined && ((filter.hasOptimal && !problem.optimalDistance) || (!filter.hasOptimal && problem.optimalDistance))) {
                    continue;
                }
            }
            
            problems.push(problem);
        } catch (error) {
            console.warn(`Warning: Skipping ${file}: ${error.message}`);
        }
    }
    
    return problems;
}

// Load problem sets from JSON
function loadProblemSets(jsonDir) {
    const setsFile = path.join(jsonDir, 'problem-sets.json');
    
    if (!fs.existsSync(setsFile)) {
        // Generate default sets if file doesn't exist
        const problems = loadMultipleProblems(jsonDir);
        return {
            small: problems.filter(p => p.cities.length <= 80).map(p => p.name),
            medium: problems.filter(p => p.cities.length > 80 && p.cities.length <= 150).map(p => p.name),
            large: problems.filter(p => p.cities.length > 150 && p.cities.length <= 200).map(p => p.name),
            xlarge: problems.filter(p => p.cities.length > 200).map(p => p.name)
        };
    }
    
    try {
        const content = fs.readFileSync(setsFile, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Error loading problem sets: ${error.message}`);
    }
}

// Get problem index
function getProblemIndex(jsonDir) {
    const indexFile = path.join(jsonDir, 'index.json');
    
    if (!fs.existsSync(indexFile)) {
        // Generate index if file doesn't exist
        const problems = loadMultipleProblems(jsonDir);
        return {
            metadata: {
                totalProblems: problems.length,
                withOptimal: problems.filter(p => p.optimalDistance).length,
                withoutOptimal: problems.filter(p => !p.optimalDistance).length,
                generatedAt: new Date().toISOString()
            },
            problems: problems.map(p => ({
                name: p.name,
                cities: p.cities.length,
                optimal: p.optimalDistance,
                edgeWeightType: p.edgeWeightType,
                file: `${p.name}.json`
            }))
        };
    }
    
    try {
        const content = fs.readFileSync(indexFile, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Error loading problem index: ${error.message}`);
    }
}

// Search problems
function searchProblems(jsonDir, query) {
    const problems = loadMultipleProblems(jsonDir);
    
    return problems.filter(p => {
        const searchString = `${p.name} ${p.edgeWeightType} ${p.cities.length}`.toLowerCase();
        return searchString.includes(query.toLowerCase());
    });
}

// Get statistics
function getStatistics(jsonDir) {
    const problems = loadMultipleProblems(jsonDir);
    
    if (problems.length === 0) {
        return { totalProblems: 0 };
    }
    
    const withOptimal = problems.filter(p => p.optimalDistance);
    const edgeWeightTypes = [...new Set(problems.map(p => p.edgeWeightType))];
    const cityCounts = problems.map(p => p.cities.length);
    
    return {
        totalProblems: problems.length,
        withOptimal: withOptimal.length,
        withoutOptimal: problems.length - withOptimal.length,
        edgeWeightTypes: edgeWeightTypes,
        minCities: Math.min(...cityCounts),
        maxCities: Math.max(...cityCounts),
        avgCities: Math.round(cityCounts.reduce((a, b) => a + b, 0) / cityCounts.length),
        problemTypes: [...new Set(problems.map(p => p.type))]
    };
}

// Export functions
module.exports = {
    loadTSPJSON,
    loadMultipleProblems,
    loadProblemSets,
    getProblemIndex,
    searchProblems,
    getStatistics
};
