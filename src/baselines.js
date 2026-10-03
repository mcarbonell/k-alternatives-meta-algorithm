/**
 * Classical TSP Baseline Algorithms
 *
 * Provides benchmark-ready implementations of classical heuristics for the
 * Traveling Salesman Problem:
 * - Nearest Neighbor (Single start)
 * - Multi-Start Nearest Neighbor (MS-NN)
 * - 2-Opt local search (First-Improvement and Best-Improvement)
 * - Or-Opt local search (relocation of 3-, 2-, and 1-city chains)
 * - Multi-Start 2-Opt (2-opt applied to NN or random tours)
 * - Simulated Annealing (SA over 2-opt neighborhood)
 *
 * All algorithms operate on a common distance function: `(i, j) => number`.
 *
 * @author Mario Raúl Carbonell Martínez
 */

/**
 * Creates a deterministic Mulberry32 PRNG.
 * @param {number|null} seed
 * @returns {function(): number} PRNG returning [0, 1)
 */
export function createRNG(seed) {
    if (seed === null || seed === undefined) {
        return Math.random;
    }
    let s = (Math.floor(Math.abs(seed)) || 1) >>> 0;
    return function mulberry32() {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Calculates total roundtrip distance for a tour.
 * @param {Array<number>} tour - Ordered array of city indices
 * @param {function(number, number): number} distanceFn - Function returning distance between two cities
 * @returns {number} Rounded total tour distance
 */
export function calculateTourDistance(tour, distanceFn) {
    const n = tour.length;
    if (n <= 1) return 0;
    let dist = 0;
    for (let i = 0; i < n; i++) {
        dist += distanceFn(tour[i], tour[(i + 1) % n]);
    }
    return Math.round(dist);
}

/**
 * Computes descriptive statistics for a series of numerical values.
 * @param {Array<number>} values
 * @returns {Object} { count, min, max, mean, std, median, q25, q75, iqr }
 */
export function calculateStats(values) {
    if (!values || values.length === 0) {
        return { count: 0, min: 0, max: 0, mean: 0, std: 0, median: 0, q25: 0, q75: 0, iqr: 0 };
    }
    const count = values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[count - 1];
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;

    const variance =
        count > 1 ? sorted.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (count - 1) : 0;
    const std = Math.sqrt(variance);

    const quantile = (q) => {
        const pos = (count - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (sorted[base + 1] !== undefined) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        }
        return sorted[base];
    };

    const median = quantile(0.5);
    const q25 = quantile(0.25);
    const q75 = quantile(0.75);
    const iqr = q75 - q25;

    return { count, min, max, mean, std, median, q25, q75, iqr };
}

/**
 * Reverses a subsegment of an array in place between indices [from, to] inclusive.
 * @param {Array<number>} array
 * @param {number} from
 * @param {number} to
 */
function reverseSubsegment(array, from, to) {
    while (from < to) {
        const tmp = array[from];
        array[from] = array[to];
        array[to] = tmp;
        from++;
        to--;
    }
}

/**
 * Pure Nearest Neighbor tour construction starting from a given city.
 * @param {number} startCity - Initial city index
 * @param {number} n - Total number of cities
 * @param {function(number, number): number} distanceFn
 * @returns {Array<number>} Complete tour
 */
export function nearestNeighborTour(startCity, n, distanceFn) {
    const tour = new Array(n);
    const visited = new Uint8Array(n);

    let current = startCity;
    tour[0] = current;
    visited[current] = 1;

    for (let step = 1; step < n; step++) {
        let nearest = -1;
        let minDist = Infinity;

        for (let candidate = 0; candidate < n; candidate++) {
            if (visited[candidate] === 0) {
                const d = distanceFn(current, candidate);
                if (d < minDist) {
                    minDist = d;
                    nearest = candidate;
                }
            }
        }

        tour[step] = nearest;
        visited[nearest] = 1;
        current = nearest;
    }

    return tour;
}

/**
 * Executes Single-Start Nearest Neighbor.
 * @param {number} startCity
 * @param {number} n
 * @param {function(number, number): number} distanceFn
 * @returns {Object} { tour, distance, timeMs, evaluations }
 */
export function runNearestNeighbor(startCity, n, distanceFn) {
    const startTime = Date.now();
    const tour = nearestNeighborTour(startCity, n, distanceFn);
    const distance = calculateTourDistance(tour, distanceFn);
    const timeMs = Date.now() - startTime;
    return {
        tour,
        distance,
        timeMs,
        evaluations: 1,
    };
}

/**
 * Executes Multi-Start Nearest Neighbor (MS-NN) evaluating multiple starting cities.
 * @param {number} n - Total number of cities
 * @param {function(number, number): number} distanceFn
 * @param {Object} [options={}]
 * @param {number} [options.maxStarts=n] - Maximum start cities to test
 * @param {number} [options.timeLimitMs=Infinity] - Maximum wall-clock time in ms
 * @param {number|null} [options.seed=null] - Seed for randomizing start order if maxStarts < n
 * @returns {Object} Result summary including stats
 */
export function runMultiStartNN(n, distanceFn, options = {}) {
    const startTime = Date.now();
    const timeLimitMs = options.timeLimitMs || Infinity;
    const maxStarts = Math.min(n, options.maxStarts || n);
    const rng = createRNG(options.seed);

    const starts = [...Array(n).keys()];
    if (options.seed !== null && options.seed !== undefined) {
        // Shuffle starts deterministically
        for (let i = starts.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [starts[i], starts[j]] = [starts[j], starts[i]];
        }
    }

    let bestTour = null;
    let bestDistance = Infinity;
    const allDistances = [];
    let startsEvaluated = 0;

    for (let i = 0; i < maxStarts; i++) {
        if (Date.now() - startTime > timeLimitMs) break;

        const startCity = starts[i];
        const tour = nearestNeighborTour(startCity, n, distanceFn);
        const dist = calculateTourDistance(tour, distanceFn);
        allDistances.push(dist);
        startsEvaluated++;

        if (dist < bestDistance) {
            bestDistance = dist;
            bestTour = tour;
        }
    }

    const timeMs = Date.now() - startTime;
    const stats = calculateStats(allDistances);

    return {
        bestTour,
        bestDistance,
        stats,
        startsEvaluated,
        timeMs,
    };
}

/**
 * Applies 2-Opt local search to an initial tour.
 * Supports First-Improvement (fast, standard) and Best-Improvement.
 * @param {Array<number>} initialTour
 * @param {function(number, number): number} distanceFn
 * @param {Object} [options={}]
 * @param {'first'|'best'} [options.strategy='first']
 * @param {number} [options.maxMoves=Infinity]
 * @param {number} [options.timeLimitMs=Infinity]
 * @returns {Object} { tour, distance, initialDistance, moves, evaluations, timeMs }
 */
export function twoOpt(initialTour, distanceFn, options = {}) {
    const startTime = Date.now();
    const strategy = options.strategy || 'first';
    const maxMoves = options.maxMoves || Infinity;
    const timeLimitMs = options.timeLimitMs || Infinity;

    const tour = [...initialTour];
    const n = tour.length;
    let currentDistance = calculateTourDistance(tour, distanceFn);
    const initialDistance = currentDistance;

    let moves = 0;
    let evaluations = 0;
    let improved = true;

    while (improved && moves < maxMoves) {
        improved = false;
        if (Date.now() - startTime >= timeLimitMs) break;

        let bestDelta = 0;
        let bestI = -1;
        let bestJ = -1;

        for (let i = 0; i < n - 1; i++) {
            const c_i = tour[i];
            const c_i1 = tour[i + 1];
            const d_i_i1 = distanceFn(c_i, c_i1);

            for (let j = i + 2; j < n; j++) {
                if (i === 0 && j === n - 1) continue; // edges are adjacent in tour cycle

                evaluations++;
                const c_j = tour[j];
                const c_j1 = tour[(j + 1) % n];

                const currentEdges = d_i_i1 + distanceFn(c_j, c_j1);
                const newEdges = distanceFn(c_i, c_j) + distanceFn(c_i1, c_j1);
                const delta = newEdges - currentEdges;

                if (delta < 0) {
                    if (strategy === 'first') {
                        reverseSubsegment(tour, i + 1, j);
                        currentDistance += delta;
                        moves++;
                        improved = true;
                        break;
                    } else if (delta < bestDelta) {
                        bestDelta = delta;
                        bestI = i;
                        bestJ = j;
                    }
                }
            }

            if (improved && strategy === 'first') break;
            if (Date.now() - startTime >= timeLimitMs) break;
        }

        if (strategy === 'best' && bestDelta < 0) {
            reverseSubsegment(tour, bestI + 1, bestJ);
            currentDistance += bestDelta;
            moves++;
            improved = true;
        }
    }

    const finalDistance = calculateTourDistance(tour, distanceFn);
    return {
        tour,
        distance: finalDistance,
        initialDistance,
        moves,
        evaluations,
        timeMs: Date.now() - startTime,
    };
}

/**
 * Applies Or-Opt local search (relocation of chains of 3, 2, or 1 cities).
 * Guarantees monotonic descent in tour length.
 * @param {Array<number>} initialTour
 * @param {function(number, number): number} distanceFn
 * @param {Object} [options={}]
 * @returns {Object} { tour, distance, initialDistance, moves, timeMs }
 */
export function orOpt(initialTour, distanceFn, options = {}) {
    const startTime = Date.now();
    const timeLimitMs = options.timeLimitMs || Infinity;
    const maxMoves = options.maxMoves || Infinity;

    let tour = [...initialTour];
    const n = tour.length;
    let currentDistance = calculateTourDistance(tour, distanceFn);
    const initialDistance = currentDistance;
    let moves = 0;
    let improved = true;

    while (improved && moves < maxMoves) {
        improved = false;
        if (Date.now() - startTime >= timeLimitMs) break;

        for (const length of [3, 2, 1]) {
            if (n <= length + 2) continue;

            for (let i = 0; i <= n - length; i++) {
                if (Date.now() - startTime >= timeLimitMs) break;

                const prev = (i - 1 + n) % n;
                const next = (i + length) % n;

                const c_prev = tour[prev];
                const c_start = tour[i];
                const c_end = tour[i + length - 1];
                const c_next = tour[next];

                const costRemoved =
                    distanceFn(c_prev, c_start) +
                    distanceFn(c_end, c_next) -
                    distanceFn(c_prev, c_next);

                for (let j = 0; j < n; j++) {
                    // Cannot insert inside the chain or adjacent to endpoints
                    if (j >= prev && j < i + length) continue;

                    const j1 = (j + 1) % n;
                    const c_j = tour[j];
                    const c_j1 = tour[j1];

                    const costAdded =
                        distanceFn(c_j, c_start) + distanceFn(c_end, c_j1) - distanceFn(c_j, c_j1);

                    const delta = costAdded - costRemoved;
                    if (delta < 0) {
                        const chain = tour.slice(i, i + length);
                        const remainder = tour.slice(0, i).concat(tour.slice(i + length));
                        const newJ = remainder.indexOf(c_j);
                        remainder.splice(newJ + 1, 0, ...chain);
                        const newDist = calculateTourDistance(remainder, distanceFn);

                        if (newDist < currentDistance) {
                            tour = remainder;
                            currentDistance = newDist;
                            moves++;
                            improved = true;
                            break;
                        }
                    }
                }
                if (improved) break;
            }
            if (improved) break;
        }
    }

    return {
        tour,
        distance: currentDistance,
        initialDistance,
        moves,
        timeMs: Date.now() - startTime,
    };
}

/**
 * Runs Multi-Start 2-Opt: generates initial tours (from NN or random), then refines via 2-opt.
 * @param {number} n - Number of cities
 * @param {function(number, number): number} distanceFn
 * @param {Object} [options={}]
 * @param {number} [options.maxStarts=n]
 * @param {number} [options.timeLimitMs=Infinity]
 * @param {boolean} [options.useNN=true] - If true, starts from NN tours; if false, random tours
 * @param {number|null} [options.seed=null] - Deterministic PRNG seed
 * @returns {Object} Aggregated results
 */
export function runMultiStart2Opt(n, distanceFn, options = {}) {
    const startTime = Date.now();
    const timeLimitMs = options.timeLimitMs || Infinity;
    const maxStarts = options.maxStarts || n;
    const useNN = options.useNN !== false;
    const rng = createRNG(options.seed);

    let bestTour = null;
    let bestDistance = Infinity;
    const allDistances = [];
    let startsEvaluated = 0;
    let totalMoves = 0;
    let totalEvals = 0;

    const starts = [...Array(n).keys()];
    if (options.seed !== null && options.seed !== undefined) {
        for (let i = starts.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [starts[i], starts[j]] = [starts[j], starts[i]];
        }
    }

    for (let s = 0; s < maxStarts; s++) {
        const remainingMs = timeLimitMs - (Date.now() - startTime);
        if (remainingMs <= 0) break;

        let initialTour;
        if (useNN) {
            const startCity = starts[s % starts.length];
            initialTour = nearestNeighborTour(startCity, n, distanceFn);
        } else {
            initialTour = [...Array(n).keys()];
            for (let i = initialTour.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [initialTour[i], initialTour[j]] = [initialTour[j], initialTour[i]];
            }
        }

        const res2Opt = twoOpt(initialTour, distanceFn, {
            strategy: 'first',
            timeLimitMs: remainingMs,
        });

        allDistances.push(res2Opt.distance);
        totalMoves += res2Opt.moves;
        totalEvals += res2Opt.evaluations;
        startsEvaluated++;

        if (res2Opt.distance < bestDistance) {
            bestDistance = res2Opt.distance;
            bestTour = res2Opt.tour;
        }
    }

    const timeMs = Date.now() - startTime;
    const stats = calculateStats(allDistances);

    return {
        bestTour,
        bestDistance,
        stats,
        startsEvaluated,
        totalMoves,
        totalEvals,
        timeMs,
    };
}

/**
 * Runs Simulated Annealing on 2-opt neighborhood.
 * @param {Array<number>} initialTour
 * @param {function(number, number): number} distanceFn
 * @param {Object} [options={}]
 * @param {number} [options.initialTemp=100]
 * @param {number} [options.coolingRate=0.999]
 * @param {number} [options.maxIterations=20000]
 * @param {number} [options.timeLimitMs=5000]
 * @param {number|null} [options.seed=null]
 * @returns {Object} { bestTour, bestDistance, iterations, timeMs }
 */
export function runSimulatedAnnealing(initialTour, distanceFn, options = {}) {
    const startTime = Date.now();
    const timeLimitMs = options.timeLimitMs || 5000;
    const maxIterations = options.maxIterations || 20000;
    const coolingRate = options.coolingRate || 0.999;
    const rng = createRNG(options.seed);

    const tour = [...initialTour];
    const n = tour.length;
    let currentDistance = calculateTourDistance(tour, distanceFn);

    let bestTour = [...tour];
    let bestDistance = currentDistance;

    let temp = options.initialTemp || Math.max(10, currentDistance * 0.05);
    let iter = 0;

    while (iter < maxIterations && temp > 1e-4) {
        if (Date.now() - startTime >= timeLimitMs) break;
        iter++;

        if (n < 4) break;
        let i = Math.floor(rng() * n);
        let j = Math.floor(rng() * n);
        if (i > j) {
            const tmp = i;
            i = j;
            j = tmp;
        }
        if (j - i <= 1 || (i === 0 && j === n - 1)) continue;

        const c_i = tour[i];
        const c_i1 = tour[i + 1];
        const c_j = tour[j];
        const c_j1 = tour[(j + 1) % n];

        const delta =
            distanceFn(c_i, c_j) +
            distanceFn(c_i1, c_j1) -
            (distanceFn(c_i, c_i1) + distanceFn(c_j, c_j1));

        if (delta < 0 || rng() < Math.exp(-delta / temp)) {
            reverseSubsegment(tour, i + 1, j);
            currentDistance += delta;

            if (currentDistance < bestDistance) {
                bestDistance = currentDistance;
                bestTour = [...tour];
            }
        }

        temp *= coolingRate;
    }

    return {
        bestTour,
        bestDistance: calculateTourDistance(bestTour, distanceFn),
        iterations: iter,
        timeMs: Date.now() - startTime,
    };
}
