import { describe, it, expect } from 'vitest';
import { TSPSolver } from '../src/tsp-solver.js';
import berlin52 from '../tsplib-json/berlin52.json';

describe('TSPSolver', () => {
    // --- Full solve tests ---

    it('should find a near-optimal solution for berlin52', async () => {
        const solver = new TSPSolver({
            maxK: 5,
            maxTime: 20,
            stopAtOptimal: true,
        });

        const result = await new Promise((resolve) => {
            solver.options.onSolution = resolve;
            solver.options.onMaxTimeReached = resolve;
            solver.start(berlin52);
        });

        const finalDistance = result.distance ?? result.bestDistance;
        expect(finalDistance).toBeGreaterThan(0);
        expect(finalDistance).toBeLessThanOrEqual(berlin52.metadata.optimalDistance * 1.05);
    }, 30000);

    // --- Edge cases ---

    it('should solve a 2-city problem', async () => {
        const problem = {
            cities: [
                { x: 0, y: 0 },
                { x: 3, y: 4 },
            ],
            metadata: { name: 'two-cities', dimension: 2, edgeWeightType: 'EUC_2D' },
        };

        const result = await new Promise((resolve) => {
            const solver = new TSPSolver({ maxK: 0, onSolution: resolve });
            solver.start(problem);
        });

        // 3-4-5 triangle, distance = 5 each way = 10
        expect(result.distance).toBe(10);
        expect(result.route).toHaveLength(2);
    });

    it('should handle cities at identical coordinates', async () => {
        const problem = {
            cities: [
                { x: 5, y: 5 },
                { x: 5, y: 5 },
                { x: 5, y: 5 },
            ],
            metadata: { name: 'same-coords', dimension: 3, edgeWeightType: 'EUC_2D' },
        };

        const result = await new Promise((resolve) => {
            const solver = new TSPSolver({ maxK: 0, onSolution: resolve });
            solver.start(problem);
        });

        // All cities overlap, distance between any pair = 0
        expect(result.distance).toBe(0);
    });

    it('should throw for 0 cities', () => {
        const solver = new TSPSolver();
        expect(() =>
            solver.start({
                cities: [],
                metadata: { name: 'empty', dimension: 0, edgeWeightType: 'EUC_2D' },
            })
        ).toThrow('Cannot initialize TSP problem with 0 cities.');
    });

    // --- Distance calculations ---

    describe('distance calculations', () => {
        it('should calculate EUC_2D distance correctly', () => {
            const solver = new TSPSolver();
            solver.start({
                cities: [
                    { x: 0, y: 0 },
                    { x: 3, y: 4 },
                ],
                metadata: { name: 'euc', dimension: 2, edgeWeightType: 'EUC_2D' },
            });
            // 3-4-5 triangle
            expect(solver.calcDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
        });

        it('should calculate EUC_2D with ceil variant', () => {
            const solver = new TSPSolver();
            solver.edgeWeightType = 'CEIL_2D';
            // sqrt(2) ≈ 1.414 → ceil = 2
            expect(solver.calcDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(2);
        });

        it('should calculate GEO distance correctly', () => {
            const solver = new TSPSolver();
            solver.edgeWeightType = 'GEO';
            const d = solver.calcDistance({ x: 96.1, y: 16.47 }, { x: 94.44, y: 16.47 });
            expect(d).toBeGreaterThan(0);
            expect(d).toBeLessThan(200);
        });

        it('should calculate ATT distance correctly', () => {
            const solver = new TSPSolver();
            solver.edgeWeightType = 'ATT';
            // ATT: rij = sqrt((xd²+yd²)/10), tij = round(rij), tij < rij → tij+1
            const d = solver.calcDistance({ x: 0, y: 0 }, { x: 10, y: 0 });
            // rij = sqrt(100/10) = sqrt(10) ≈ 3.16, tij = 3, 3 < 3.16 → 4
            expect(d).toBe(4);
        });

        it('should default to EUC_2D for unknown edge weight type', () => {
            const solver = new TSPSolver();
            solver.edgeWeightType = 'UNKNOWN';
            expect(solver.calcDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
        });
    });

    // --- Route distance ---

    describe('calculateRouteDistance', () => {
        it('should calculate total tour distance', () => {
            const solver = new TSPSolver();
            solver.start({
                cities: [
                    { x: 0, y: 0 },
                    { x: 0, y: 10 },
                    { x: 10, y: 10 },
                    { x: 10, y: 0 },
                ],
                metadata: { name: 'square', dimension: 4, edgeWeightType: 'EUC_2D' },
            });
            // Square: each side = 10, total tour = 40
            expect(solver.calculateRouteDistance([0, 1, 2, 3])).toBe(40);
        });

        it('should wrap around for tour', () => {
            const solver = new TSPSolver();
            solver.start({
                cities: [
                    { x: 0, y: 0 },
                    { x: 5, y: 0 },
                ],
                metadata: { name: 'wrap', dimension: 2, edgeWeightType: 'EUC_2D' },
            });
            // 0→1 (5) + 1→0 (5) = 10
            expect(solver.calculateRouteDistance([0, 1])).toBe(10);
        });
    });

    // --- Heuristic updates ---

    describe('updateHeuristics', () => {
        it('should move successful edges to front of neighbor lists', () => {
            const solver = new TSPSolver();
            solver.start({
                cities: [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                    { x: 10, y: 0 },
                    { x: 11, y: 0 },
                ],
                metadata: { name: 'heur-test', dimension: 4, edgeWeightType: 'EUC_2D' },
            });

            // Before update: localHeuristics[0] is sorted by distance
            // City 0 is closest to city 1 (dist=1), then city 2 (dist=10), then city 3 (dist=11)
            const before = solver.localHeuristics[0].slice();
            expect(before[0]).toBe(1); // nearest neighbor

            // Simulate finding route [0, 2, 1, 3] as improvement
            solver.updateHeuristics([0, 2, 1, 3]);

            // After: city 2 should now be first for city 0 (edge 0→2 was in the route)
            expect(solver.localHeuristics[0][0]).toBe(2);

            // City 1 should now be first for city 2 (edge 2→1 was in the route)
            expect(solver.localHeuristics[2][0]).toBe(1);
        });
    });

    // --- EXPLICIT distance matrix ---

    describe('EXPLICIT distance matrix', () => {
        it('should handle LOWER_DIAG_ROW format', async () => {
            // 3 cities, lower diag: d(1,0), d(2,0), d(2,1)
            const problem = {
                cities: [],
                edgeWeights: [10, 20, 30], // d(1,0)=10, d(2,0)=20, d(2,1)=30
                metadata: {
                    name: 'explicit-lower',
                    dimension: 3,
                    edgeWeightType: 'EXPLICIT',
                    edgeWeightFormat: 'LOWER_DIAG_ROW',
                },
            };

            const result = await new Promise((resolve) => {
                const solver = new TSPSolver({ maxK: 0, onSolution: resolve });
                solver.start(problem);
            });

            // Matrix should be symmetric: d(0,1)=10, d(0,2)=20, d(1,2)=30
            // Best tour: 0→1→2→0 = 10+30+20 = 60
            // Or: 0→2→1→0 = 20+30+10 = 60
            expect(result.distance).toBe(60);
        });

        it('should handle FULL_MATRIX format', async () => {
            const problem = {
                cities: [],
                edgeWeights: [0, 5, 10, 5, 0, 15, 10, 15, 0],
                metadata: {
                    name: 'explicit-full',
                    dimension: 3,
                    edgeWeightType: 'EXPLICIT',
                    edgeWeightFormat: 'FULL_MATRIX',
                },
            };

            const result = await new Promise((resolve) => {
                const solver = new TSPSolver({ maxK: 0, onSolution: resolve });
                solver.start(problem);
            });

            // d(0,1)=5, d(0,2)=10, d(1,2)=15
            // Tour: 0→1→2→0 = 5+15+10 = 30
            expect(result.distance).toBe(30);
        });
    });
});
