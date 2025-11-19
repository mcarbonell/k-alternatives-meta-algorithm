const fs = require('fs');
const path = require('path');

function parsePisingerFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    // Parse Header
    const [nStr, cStr] = lines[0].trim().split(/\s+/);
    const N = parseInt(nStr, 10);
    const C = parseInt(cStr, 10);
    
    const items = [];
    // Parse Items
    for (let i = 1; i <= N; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/\s+/);
        const v = parseInt(parts[0], 10); 
        const w = parseInt(parts[1], 10); 
        
        items.push({
            index: i - 1,
            v: v,
            w: w
        });
    }
    
    // Parse Optimal Solution (Last Line) - Check if it exists and is a bitmask
    let optimalSelection = null;
    if (lines.length > N + 1) {
        const solLine = lines[lines.length - 1].trim();
        // Check if line contains only 0 and 1 spaces
        if (/^[01\s]+$/.test(solLine)) {
            const bits = solLine.split(/\s+/).map(b => parseInt(b, 10));
            if (bits.length === N) {
                optimalSelection = bits;
            }
        }
    }
    
    // Calculate Optimal Value if selection is present
    let optimalValue = null;
    if (optimalSelection) {
        optimalValue = 0;
        optimalSelection.forEach((bit, idx) => {
            if (bit === 1) optimalValue += items[idx].v;
        });
    }

    return {
        name: path.basename(filePath),
        items,
        maxWeight: C,
        optimalValue: optimalValue,
        metadata: {
            source: 'Pisinger',
            type: 'Strongly Correlated'
        }
    };
}

module.exports = { parsePisingerFile };