const { KnapsackSolver } = require('./knapsack-solver');

// --- Helper: Problem Generator ---

function generateProblem(n, type = 'uncorrelated') {
    const items = [];
    const R = 1000;
    let totalWeight = 0;

    for (let i = 0; i < n; i++) {
        let w, v;
        if (type === 'uncorrelated') {
            w = Math.floor(Math.random() * R) + 1;
            v = Math.floor(Math.random() * R) + 1;
        } else if (type === 'weakly_correlated') {
            w = Math.floor(Math.random() * R) + 1;
            // Value is loosely based on weight
            const r = Math.floor(Math.random() * (R / 5)) - (R / 10); // Noise
            v = w + r;
            if (v <= 0) v = 1;
        } else if (type === 'strongly_correlated') {
            w = Math.floor(Math.random() * R) + 1;
            v = w + 100; // Fixed offset
        }
        
        items.push({ index: i, w, v, ratio: v/w });
        totalWeight += w;
    }

    // Capacity is typically 50% of total weight sum
    const maxWeight = Math.floor(totalWeight * 0.5);

    return {
        name: `${type}_n${n}`,
        items,
        maxWeight,
        metadata: { name: `${type}_n${n}` } // For compatibility
    };
}

// --- Helper: Solve & Measure ---

function runTest(problem, k) {
    return new Promise((resolve) => {
        const solver = new KnapsackSolver({
            maxK: k,
            stopAtOptimal: false,
            maxTime: 5, // 5 seconds timeout
            onSolution: (result) => {
                resolve({
                    k,
                    value: Math.abs(result.value),
                    time: (result.totalTime * 1000).toFixed(2), // Estimate based on internal timer
                    iterations: result.iterations
                });
            },
            onMaxTimeReached: (result) => {
                resolve({
                    k,
                    value: Math.abs(result.value),
                    time: '>5000',
                    iterations: result.iterations
                });
            }
        });
        
        // HACK: For benchmarking specific K, we want to force the solver to stay at that K 
        // or run UP TO that K. The base optimizer runs 0..maxK.
        // Since we want to compare K=0 vs K=1 vs K=2, letting it run up to K is fair.
        // K=0 will stop after K=0 loop. K=1 will run K=0 then K=1.
        
        solver.start(problem);
    });
}

// --- Main Execution ---

async function main() {
    const N = 50; // Number of items
    // --- Trap Case ---
    console.log('Generating TRAP problem (Greedy Fails)...');
    const trapProblem = {
        name: 'Trap_n3',
        items: [
            { index: 0, w: 6, v: 13, ratio: 2.16 }, // Greedy pick #1
            { index: 1, w: 5, v: 10, ratio: 2.0 },  // Optimal pick #1
            { index: 2, w: 5, v: 10, ratio: 2.0 }   // Optimal pick #2
        ],
        maxWeight: 10,
        metadata: { name: 'Trap_n3' }
    };
    
    // Greedy: Takes index 0 (w6). Remaining 4. Others don't fit. Total 13.
    // Optimal: Skip index 0. Take 1 and 2. Total 20.
    
    console.log(`Theoretical Optimal: 20`);
    
    const TYPES = ['uncorrelated', 'weakly_correlated', 'strongly_correlated']; // Define types here

    let trapBase = 0;
    for (const k of [0, 1, 2]) {
        const res = await runTest(trapProblem, k);
        if (k === 0) trapBase = res.value;
        const improvement = k === 0 ? 0 : ((res.value - trapBase) / trapBase * 100).toFixed(2);
        let bar = k === 0 ? "⬜" : (res.value > trapBase ? "🟩" : "➖");
        console.log(`  K=${k} | Val: ${res.value} | Improv: +${improvement}% | ${bar}`);
    }
    console.log('-'.repeat(50));

    for (const type of TYPES) {
        console.log(`Generating ${type} problem...`);
        const problem = generateProblem(N, type);
        
        // Calculate Upper Bound (Linear Relaxation) roughly for context
        // (Simple sort by ratio and take fractions)
        const sorted = problem.items.slice().sort((a, b) => b.ratio - a.ratio);
        let currentW = 0;
        let maxRelaxedVal = 0;
        for (const item of sorted) {
            if (currentW + item.w <= problem.maxWeight) {
                currentW += item.w;
                maxRelaxedVal += item.v;
            } else {
                const remaining = problem.maxWeight - currentW;
                maxRelaxedVal += item.v * (remaining / item.w);
                break;
            }
        }
        console.log(`Theoretical Upper Bound (Relaxed): ~${Math.floor(maxRelaxedVal)}`);

        // Test K=0, 1, 2
        let baselineVal = 0;
        for (const k of [0, 1, 2, 3]) {
            const res = await runTest(problem, k);
            
            if (k === 0) baselineVal = res.value;
            const improvement = k === 0 ? 0 : ((res.value - baselineVal) / baselineVal * 100).toFixed(2);
            const gap = ((maxRelaxedVal - res.value) / maxRelaxedVal * 100).toFixed(2);

            let bar = "";
            if (k===0) bar = "⬜ (Greedy)";
            else if (parseFloat(improvement) > 0) bar = "🟩 (Improved)";
            else bar = "➖";

            console.log(`  K=${k} | Val: ${res.value} | Gap to Bound: ${gap}% | Improv: +${improvement}% | Time: ${res.time}ms | ${bar}`);
        }
        console.log('-'.repeat(50));
    }
}

main();
