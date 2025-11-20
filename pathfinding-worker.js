/**
 * Web Worker for Pathfinding Algorithms
 * Handles both k-Alternatives and A* execution
 */
class KPathOptimizer {
    constructor(gridWidth, gridHeight, startNode, endNode, walls, pessimistic = false, maxK = 5) {
        this.width = gridWidth;
        this.height = gridHeight;
        this.startNode = startNode;
        this.endNode = endNode;
        this.walls = walls;
        this.maxK = maxK;
        this.currentK = 0;
        this.bestPath = null;
        this.bestCost = Infinity;
        this.visitedCount = 0;

        this.h = [];
        for (let x = 0; x < this.width; x++) {
            this.h[x] = [];
            for (let y = 0; y < this.height; y++) {
                if (pessimistic) {
                    const MANHATTAN = Math.abs(x - endNode.x) + Math.abs(y - endNode.y);
                    this.h[x][y] = MANHATTAN + 500;
                } else {
                    this.h[x][y] = Math.abs(x - endNode.x) + Math.abs(y - endNode.y);
                }
            }
        }
    }

    *solveGenerator() {
        this.currentK = 0;
        this.visitedCount = 0;
        let improvedInThisK = false;

        while (this.currentK <= this.maxK) {
            improvedInThisK = false;
            yield { type: 'k_start', k: this.currentK };

            const searchGen = this.search(this.startNode, [this.startNode], 0, this.currentK, new Set([`${this.startNode.x},${this.startNode.y}`]));

            for (const step of searchGen) {
                if (step.type === 'found_better') {
                    improvedInThisK = true;
                    this.updateHeuristics(step.path);
                    yield step;
                    break;
                }
                yield step;
            }

            if (improvedInThisK) {
                continue;
            } else {
                this.currentK++;
            }
        }
        yield { type: 'finished' };
    }

    *search(node, currentPath, currentG, kBudget, visitedSet) {
        if (node.x === this.endNode.x && node.y === this.endNode.y) {
            if (currentG < this.bestCost) {
                this.bestCost = currentG;
                this.bestPath = [...currentPath];
                yield { type: 'found_better', path: this.bestPath, cost: this.bestCost };
                return true;
            }
            return false;
        }

        if (currentG >= this.bestCost) return false;

        this.visitedCount++;
        yield { type: 'visiting', node: node };

        let neighbors = this.getNeighbors(node).filter(n => !visitedSet.has(`${n.x},${n.y}`));

        neighbors.sort((a, b) => {
            let fA = (currentG + 1) + this.h[a.x][a.y];
            let fB = (currentG + 1) + this.h[b.x][b.y];
            return fA - fB;
        });

        for (let i = 0; i < neighbors.length; i++) {
            let costK = i;
            if (kBudget >= costK) {
                let nextNode = neighbors[i];
                visitedSet.add(`${nextNode.x},${nextNode.y}`);
                currentPath.push(nextNode);
                const found = yield* this.search(nextNode, currentPath, currentG + 1, kBudget - costK, visitedSet);
                currentPath.pop();
                visitedSet.delete(`${nextNode.x},${nextNode.y}`);
                if (found) return true;
            } else {
                break;
            }
        }
        return false;
    }

    getNeighbors(node) {
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        const res = [];
        for (let d of dirs) {
            let nx = node.x + d[0];
            let ny = node.y + d[1];
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                if (!this.walls.has(`${nx},${ny}`)) {
                    res.push({ x: nx, y: ny });
                }
            }
        }
        return res;
    }

    updateHeuristics(path) {
        for (let i = 0; i < path.length; i++) {
            let node = path[i];
            let costToGoal = (path.length - 1) - i;
            if (costToGoal < this.h[node.x][node.y]) {
                this.h[node.x][node.y] = costToGoal;
            }
        }
    }
}

class AStarOptimizer {
    constructor(gridWidth, gridHeight, startNode, endNode, walls) {
        this.width = gridWidth;
        this.height = gridHeight;
        this.startNode = startNode;
        this.endNode = endNode;
        this.walls = walls;
    }

    *solveGenerator() {
        // A* with proper open/closed set management
        const openSet = [];
        const closedSet = new Set();

        // Maps for tracking costs and paths
        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();

        // Initialize with start node
        const startKey = `${this.startNode.x},${this.startNode.y}`;
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(this.startNode));
        openSet.push(this.startNode);

        while (openSet.length > 0) {
            // Find node with lowest f-score
            let currentIndex = 0;
            let lowestF = fScore.get(`${openSet[0].x},${openSet[0].y}`);

            for (let i = 1; i < openSet.length; i++) {
                const f = fScore.get(`${openSet[i].x},${openSet[i].y}`);
                if (f < lowestF) {
                    lowestF = f;
                    currentIndex = i;
                }
            }

            const current = openSet[currentIndex];
            const currentKey = `${current.x},${current.y}`;

            // Check if we reached the goal
            if (current.x === this.endNode.x && current.y === this.endNode.y) {
                const path = this.reconstructPath(cameFrom, current);
                yield { type: 'found', path: path, cost: gScore.get(currentKey) };
                yield { type: 'finished' };
                return;
            }

            // Remove current from openSet
            openSet.splice(currentIndex, 1);
            closedSet.add(currentKey);

            yield { type: 'visiting', node: current };

            // Check all neighbors
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                // Skip if already evaluated
                if (closedSet.has(neighborKey)) {
                    continue;
                }

                const tentativeG = gScore.get(currentKey) + 1;

                // Check if this path to neighbor is better
                const neighborG = gScore.get(neighborKey);
                if (neighborG === undefined || tentativeG < neighborG) {
                    // Record the best path to this neighbor
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + this.heuristic(neighbor));

                    // Add to openSet if not already there
                    const inOpen = openSet.some(n => n.x === neighbor.x && n.y === neighbor.y);
                    if (!inOpen) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        // No path found
        yield { type: 'finished' };
    }

    heuristic(node) {
        // Manhattan distance
        return Math.abs(node.x - this.endNode.x) + Math.abs(node.y - this.endNode.y);
    }

    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 },  // up
            { x: 1, y: 0 },   // right
            { x: 0, y: 1 },   // down
            { x: -1, y: 0 }   // left
        ];

        for (const dir of directions) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;

            // Check bounds
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                // Check if not a wall
                if (!this.walls.has(`${nx},${ny}`)) {
                    neighbors.push({ x: nx, y: ny });
                }
            }
        }

        return neighbors;
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;

        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            currentKey = `${current.x},${current.y}`;
            path.unshift(current);
        }

        return path;
    }
}

self.onmessage = function (e) {
    try {
        const msg = e.data;
        if (msg.type === 'init_and_run') {
            const config = msg.config;
            const walls = new Set(config.walls);

            console.log('Worker starting algorithm:', config.algorithm);

            let optimizer;
            if (config.algorithm === 'k') {
                optimizer = new KPathOptimizer(config.width, config.height, config.startNode, config.endNode, walls, config.options.pessimistic, config.options.maxK);
            } else {
                optimizer = new AStarOptimizer(config.width, config.height, config.startNode, config.endNode, walls);
            }

            const generator = optimizer.solveGenerator();

            // Batch events to avoid flooding postMessage
            let batch = [];
            let count = 0;
            for (let event of generator) {
                batch.push(event);
                count++;
                if (batch.length >= 100) {
                    self.postMessage(batch);
                    batch = [];
                }
            }
            if (batch.length > 0) {
                self.postMessage(batch);
            }
            console.log('Worker finished. Total events:', count);
            self.postMessage({ type: 'finished_signal' });
        }
    } catch (err) {
        console.error('Worker Error:', err);
        self.postMessage({ type: 'error', message: err.toString(), stack: err.stack });
    }
};
