// TSPLIB Parser
class TSPLIBParser {
    constructor() {
        this.optimalSolutions = new Map();
        this.loadOptimalSolutions();
    }

    // Load optimal solutions from the text file
    async loadOptimalSolutions() {
        try {
            const response = await fetch('tsplib/Optimal solutions for symmetric TSPs.txt');
            const text = await response.text();
            const lines = text.split('\n');
            
            for (const line of lines) {
                const match = line.match(/^(\w+)\s*:\s*(\d+)$/);
                if (match) {
                    this.optimalSolutions.set(match[1].toLowerCase(), parseInt(match[2]));
                }
            }
        } catch (error) {
            console.error('Error loading optimal solutions:', error);
        }
    }

    // Parse TSP file content
    parseTSPContent(content) {
        const lines = content.split('\n');
        const result = {
            name: '',
            dimension: 0,
            edgeWeightType: '',
            cities: [],
            originalCities: [] // Keep original coordinates for distance calculation
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
                // Parse city coordinates
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 3) {
                    const x = parseFloat(parts[1]);
                    const y = parseFloat(parts[2]);
                    result.originalCities.push({ x, y });
                }
            }
        }

        // Scale coordinates for visualization
        result.cities = this.scaleCoordinates(result.originalCities);
        
        return result;
    }

    // Get optimal solution for a problem
    getOptimalSolution(problemName) {
        return this.optimalSolutions.get(problemName.toLowerCase()) || null;
    }

    // Scale coordinates to fit SVG canvas
    scaleCoordinates(cities, svgWidth = 800, svgHeight = 500, margin = 40) {
        if (cities.length === 0) return [];

        const minX = Math.min(...cities.map(c => c.x));
        const maxX = Math.max(...cities.map(c => c.x));
        const minY = Math.min(...cities.map(c => c.y));
        const maxY = Math.max(...cities.map(c => c.y));

        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;

        const scaleX = (svgWidth - 2 * margin) / rangeX;
        const scaleY = (svgHeight - 2 * margin) / rangeY;
        const scale = Math.min(scaleX, scaleY);

        return cities.map(city => ({
            x: margin + (city.x - minX) * scale,
            y: margin + (city.y - minY) * scale
        }));
    }

    // Load TSP file from URL
    async loadTSPFile(filename) {
        try {
            const response = await fetch(`tsplib/${filename}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const content = await response.text();
            const parsed = this.parseTSPContent(content);
            
            // Scale coordinates to fit our canvas
            parsed.cities = this.scaleCoordinates(parsed.cities);
            
            return parsed;
        } catch (error) {
            console.error('Error loading TSP file:', error);
            throw error;
        }
    }

    // Get list of available TSP problems (small ones for demo)
    getAvailableProblems() {
        return [
            { name: 'burma14', cities: 14, optimal: 3323 },
            { name: 'ulysses16', cities: 16, optimal: 6859 },
            { name: 'gr17', cities: 17, optimal: 2085 },
            { name: 'gr21', cities: 21, optimal: 2707 },
            { name: 'gr24', cities: 24, optimal: 1272 },
            { name: 'fri26', cities: 26, optimal: 937 },
            { name: 'bayg29', cities: 29, optimal: 1610 },
            { name: 'bays29', cities: 29, optimal: 2020 },
            { name: 'dantzig42', cities: 42, optimal: 699 },
            { name: 'att48', cities: 48, optimal: 10628 },
            { name: 'gr48', cities: 48, optimal: 5046 },
            { name: 'hk48', cities: 48, optimal: 11461 },
            { name: 'eil51', cities: 51, optimal: 426 },
            { name: 'berlin52', cities: 52, optimal: 7542 },
            { name: 'st70', cities: 70, optimal: 675 },
            { name: 'eil76', cities: 76, optimal: 538 },
            { name: 'pr76', cities: 76, optimal: 108159 },
            { name: 'kroA100', cities: 100, optimal: 21282 },
            { name: 'kroB100', cities: 100, optimal: 22141 },
            { name: 'kroC100', cities: 100, optimal: 20749 },
            { name: 'kroD100', cities: 100, optimal: 21294 },
            { name: 'kroE100', cities: 100, optimal: 22068 },
            { name: 'rd100', cities: 100, optimal: 7910 },
            { name: 'gil262', cities: 262, optimal: 2378 },
            { name: 'lin318', cities: 318, optimal: 42029 },
            { name: 'ch130', cities: 130, optimal: 6110 },
            { name: 'ch150', cities: 150, optimal: 6528 },
            { name: 'gr120', cities: 120, optimal: 6942 },
            { name: 'gr137', cities: 137, optimal: 69853 }
        ];
    }
}

// Export for use in main app
window.TSPLIBParser = TSPLIBParser;
