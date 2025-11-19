

let iteration = 0;
let improvements = 0;
let currentDistance = 0;
let bestDistance = 0;
let oldBestDistance = 0;
let bestPossibleDistance = 0;
let currentK = 0;
let maxK = 3;


let cities = [];
let bestRoute = [];
let regions = [];



let isRunning = false;
let worker;
let rootQuadTree;

let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;



function calcDistance(city1, city2) {
    return Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2));
}

function calculateTotalDistance(route) {
    let totalDistance = 0;
    for (let i = 0; i < route.length; i++) {
        let nextIndex = (i + 1) % route.length;
        totalDistance += calcDistance(route[i], route[nextIndex]);
    }
    return totalDistance;
}


class Tsp {

    cities = [];
    bestRoute = [];
    bestDistance = 0;
    oldBestDistance = 0;
    bestPossibleDistance = 0;

    constructor() {
        this.reset();
    }

    reset() {
        this.cities = [];
        this.bestRoute = [];
        this.bestDistance = 0;
        this.oldBestDistance = 0;
        this.bestPossibleDistance = 0;
    }

    generateRandomCities(numCities, minX = 15, width = (600 - 30), minY = 15, height = (600 - 30)) {
        reset();
        for (let i = 0; i < numCities; i++) {
            cities.push({
                x: (Math.random() * (width)) + minX,
                y: (Math.random() * (height - 30)) + minY
            });
        }
    }

    async parseTSPLIB(filePath) {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error('Error al cargar el archivo.');
        }
        const text = await response.text();

        const lines = text.split('\n');
        const tspData = {};

        let readingCoords = false;
        for (const line of lines) {
            if (line.startsWith('EOF')) break;

            if (readingCoords) {
                const [id, x, y] = line.trim().split(/\s+/).map(Number);
                tspData.nodes.push({ id, x, y });
            } else {
                const [key, value] = line.split(':').map(str => str.trim());
                if ((key === 'NODE_COORD_SECTION') || (key === 'DISPLAY_DATA_SECTION')) {
                    readingCoords = true;
                    tspData.nodes = [];
                } else if (key) {
                    tspData[key] = isNaN(value) ? value : Number(value);
                }
            }
        }

        return tspData;
    }

    drawTSP(tspData) {

        const minX = Math.min(...tspData.nodes.map(p => p.x));
        const maxX = Math.max(...tspData.nodes.map(p => p.x));
        const minY = Math.min(...tspData.nodes.map(p => p.y));
        const maxY = Math.max(...tspData.nodes.map(p => p.y));

        const scaleX = canvas.width / (maxX - minX);
        const scaleY = canvas.height / (maxY - minY);
        const scale = Math.min(scaleX, scaleY);

        cities = [];

        for (const point of tspData.nodes) {
            if (point.x == undefined) continue;

            const id = point.id;
            const x = (point.x - minX) * scale;
            // const y = canvas.height - (point.y - minY) * scaleY;
            const y = canvas.height - (point.y - minY) * scale;

            cities.push({ x, y });

            // console.log(point, id, x, y);

            ctx.beginPath();
            ctx.fillStyle = 'red';
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
            if (drawNumbersInput.checked) {
                // Dibujar el índice de la ciudad
                ctx.font = '12px Arial';
                ctx.fillStyle = 'black';
                ctx.fillText(point.id, x + 7, y + 4); // Ajusta las coordenadas según sea necesario
            }
        }
    }

    loadTspFile(filePath) {

    }

}



// Constante para el número máximo de ciudades por región
let MAX_CITIES_PER_REGION = 50;

// Clase para representar un nodo del Quadtree
class QuadTreeNode {
    constructor(x, y, width, height, id) {
        // ID of the quadree, 'R' for root, A, B, C, D for children, recursive
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.cities = [];
        this.children = null;
    }

    // Método para insertar una ciudad en el nodo
    insert(city) {
        if (this.children) {
            const index = this.getQuadrantIndex(city);
            return this.children[index].insert(city);
        }

        this.cities.push(city);

        if (this.cities.length > MAX_CITIES_PER_REGION && this.width > 1) {
            this.split();
        }

        return this;
    }

    // Método para dividir el nodo en cuatro cuadrantes
    split() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        this.children = [
            new QuadTreeNode(this.x, this.y, halfWidth, halfHeight, this.id + 'A'),
            new QuadTreeNode(this.x + halfWidth, this.y, halfWidth, halfHeight, this.id + 'B'),
            new QuadTreeNode(this.x, this.y + halfHeight, halfWidth, halfHeight, this.id + 'C'),
            new QuadTreeNode(this.x + halfWidth, this.y + halfHeight, halfWidth, halfHeight, this.id + 'D')
        ];

        for (const city of this.cities) {
            const index = this.getQuadrantIndex(city);
            this.children[index].insert(city);
        }

        this.cities = [];
    }

    // Método para determinar en qué cuadrante cae una ciudad
    getQuadrantIndex(city) {
        const midX = this.x + this.width / 2;
        const midY = this.y + this.height / 2;
        if (city.x < midX) {
            return city.y < midY ? 0 : 2;
        } else {
            return city.y < midY ? 1 : 3;
        }
    }

    // Método para obtener todas las regiones (nodos hoja)
    getRegions() {
        if (!this.children) {
            return [this];
        }
        return this.children.flatMap(child => child.getRegions());
    }

    setSolucion(regionId, route) {
        if (this.id == regionId) {
            let reorderedCities = route.map(index => this.cities[index]);
            this.cities = reorderedCities;

            /* route.forEach(index => {
                reorderedCities.push(cities[index]);
            }); */
        } else {
            if (!regionId.startsWith(this.id)) {
                console.log('ERROR Quadtre no encontrado', regionId);
            } else {
                if (this.children) {
                    if (regionId.startsWith(this.id + 'A')) return this.children[0].setSolucion(regionId, route);
                    if (regionId.startsWith(this.id + 'B')) return this.children[1].setSolucion(regionId, route);
                    if (regionId.startsWith(this.id + 'C')) return this.children[2].setSolucion(regionId, route);
                    if (regionId.startsWith(this.id + 'D')) return this.children[3].setSolucion(regionId, route);
                } else {
                    console.log('ERROR Quadtre no encontrado', regionId);
                }
            }
        }
    }

    optimize2Opt() {
        function calcDistance(city1, city2) {
            return Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2));
        }

        let improved = true;
        while (improved) {
            improved = false;
            for (let i = 0; i < this.cities.length - 1; i++) {
                let i1 = (i + 1) % this.cities.length;
                let i2 = (i + 2) % this.cities.length;
                let i3 = (i + 3) % this.cities.length;

                let currDistance =
                    calcDistance(this.cities[i], this.cities[i1]) +
                    calcDistance(this.cities[i1], this.cities[i2]) +
                    calcDistance(this.cities[i2], this.cities[i3]);

                let newDistance =
                    calcDistance(this.cities[i], this.cities[i2]) +
                    calcDistance(this.cities[i2], this.cities[i1]) +
                    calcDistance(this.cities[i1], this.cities[i3]);

                if (newDistance < currDistance) {
                    let aux = this.cities[i1];
                    this.cities[i1] = this.cities[i2];
                    this.cities[i2] = aux;
                    improved = true;
                    // break;
                }
            }
            // if (improved) continue;
        }

        // console.log('2-opt new optimization complete.');
    }

    optimizekOpt() {
        function calcDistance(city1, city2) {
            return Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2));
        }

        function calculateTotalDistance(route) {
            let totalDistance = 0;
            for (let i = 0; i < route.length; i++) {
                let nextIndex = (i + 1) % route.length;
                totalDistance += calcDistance(route[i], route[nextIndex]);
            }
            return totalDistance;
        }

        let improved = true;
        let bestDistance = calculateTotalDistance(this.cities);

        while (improved) {
            improved = false;
            for (let i = 0; i < this.cities.length - 2; i++) {
                for (let j = i + 2; j < this.cities.length - 1; j++) {
                    // Consider swapping cities[i+1] with cities[j]
                    let newRoute = [...this.cities];
                    newRoute.splice(i + 1, j - i, ...this.cities.slice(i + 1, j + 1).reverse());

                    let newDistance = calculateTotalDistance(newRoute);
                    if (newDistance < bestDistance) {
                        this.cities = newRoute;
                        bestDistance = newDistance;
                        improved = true;
                        break;
                    }
                }
                if (improved) break;
            }
        }

        // console.log('k-opt optimization complete. Final distance:', bestDistance);
    }


    mergeRoutes() {
        function calcDistance(city1, city2) {
            return Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2));
        }

        function calcCenterOfCities(cities) {
            let center = { x: 0, y: 0 }
            for (const city of cities) {
                center.x += city.x;
                center.y += city.y;
            }
            center.x /= cities.length;
            center.y /= cities.length;
            return center;
        }

        function mergeRoutes(cities1, cities2) {
            if (cities1.length === 0) return cities2;
            if (cities2.length === 0) return cities1;

            let center1 = calcCenterOfCities(cities1);
            let center2 = calcCenterOfCities(cities2);
            let minCost1 = Infinity;
            let minCost2 = Infinity;
            let bestSegment1 = null;
            let bestSegment2 = null;

            // Find best segments to connect
            for (let i = 0; i < cities1.length; i++) {
                let next = (i + 1) % cities1.length;
                let segmentCost = calcDistance(cities1[i], cities1[next]);
                let connectionCost = calcDistance(cities1[i], center2) + calcDistance(cities1[next], center2) - segmentCost;
                if (connectionCost < minCost1) {
                    minCost1 = connectionCost;
                    bestSegment1 = i;
                }
            }

            for (let i = 0; i < cities2.length; i++) {
                let next = (i + 1) % cities2.length;
                let segmentCost = calcDistance(cities2[i], cities2[next]);
                let connectionCost = calcDistance(cities2[i], center1) + calcDistance(cities2[next], center1) - segmentCost;
                if (connectionCost < minCost2) {
                    minCost2 = connectionCost;
                    bestSegment2 = i;
                }
            }

            // Connect the routes with 2-opt optimization
            let a = cities1[bestSegment1];
            let b = cities1[(bestSegment1 + 1) % cities1.length];
            let c = cities2[bestSegment2];
            let d = cities2[(bestSegment2 + 1) % cities2.length];

            let cost1 = calcDistance(a, d) + calcDistance(b, c);
            let cost2 = calcDistance(a, c) + calcDistance(b, d);

            let newRoute = [];
            if (cost1 <= cost2) {
                // A->D->C->B
                for (let i = 0; i <= bestSegment1; i++) {
                    newRoute.push(cities1[i]);
                }
                for (let i = bestSegment2 + 1; i < cities2.length; i++) {
                    newRoute.push(cities2[i]);
                }
                for (let i = 0; i <= bestSegment2; i++) {
                    newRoute.push(cities2[i]);
                }
                for (let i = bestSegment1 + 1; i < cities1.length; i++) {
                    newRoute.push(cities1[i]);
                }
            } else {
                // A->C->D->B
                for (let i = 0; i <= bestSegment1; i++) {
                    newRoute.push(cities1[i]);
                }
                for (let i = bestSegment2; i >= 0; i--) {
                    newRoute.push(cities2[i]);
                }
                for (let i = cities2.length - 1; i > bestSegment2; i--) {
                    newRoute.push(cities2[i]);
                }
                for (let i = bestSegment1 + 1; i < cities1.length; i++) {
                    newRoute.push(cities1[i]);
                }
            }

            return newRoute;
        }

        if (this.children) {
            this.children.forEach(child => child.mergeRoutes());

            console.log('mergeroutes', this.id);

            let citiesA = mergeRoutes(this.children[0].cities, this.children[1].cities);
            let citiesB = mergeRoutes(this.children[2].cities, this.children[3].cities);
            this.cities = mergeRoutes(citiesA, citiesB);

            if (this.cities.length < 500)
                this.optimizekOpt();
            else
                this.optimize2Opt();

            this.children = null;
        }
    }
}


// Función principal para descomponer el espacio y distribuir las ciudades
function decomposeSpace(cities) {

    MAX_CITIES_PER_REGION = maxCitiesRegionInput.value;

    // Encontrar los límites del espacio
    const bounds = cities.reduce((acc, city) => ({
        minX: Math.min(acc.minX, city.x),
        minY: Math.min(acc.minY, city.y),
        maxX: Math.max(acc.maxX, city.x),
        maxY: Math.max(acc.maxY, city.y)
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    // Crear el nodo raíz del Quadtree
    rootQuadTree = new QuadTreeNode(bounds.minX, bounds.minY, width, height, 'R');

    // Insertar todas las ciudades en el Quadtree
    for (const city of cities) {
        rootQuadTree.insert(city);
    }

    // Obtener todas las regiones (nodos hoja)
    // return root.getRegions();
    regions = rootQuadTree.getRegions();
}

















function generarPuntosClusterizados(numeroClusters, numeroPuntosPorCluster, anchoMapa, altoMapa) {
    let puntos = [];

    for (let i = 0; i < numeroClusters; i++) {
        // Generar un punto central para el cluster
        let xCentral = Math.random() * anchoMapa;
        let yCentral = Math.random() * altoMapa;

        for (let j = 0; j < numeroPuntosPorCluster; j++) {
            // Generar puntos alrededor del centro utilizando una distribución normal
            let x = xCentral + (Math.random() * 2 - 1) * Math.sqrt(3);
            let y = yCentral + (Math.random() * 2 - 1) * Math.sqrt(3);

            // Asegurarse de que los puntos estén dentro del mapa
            x = Math.max(0, Math.min(x, anchoMapa));
            y = Math.max(0, Math.min(y, altoMapa));

            puntos.push({ x, y });
        }
    }

    return puntos;
}

// Ejemplo de uso
let anchoMapa = 1000;
let altoMapa = 1000;
let numeroClusters = 5;
let numeroPuntosPorCluster = 20;

// let ciudades = generarPuntosClusterizados(numeroClusters, numeroPuntosPorCluster, anchoMapa, altoMapa);


function getRandomGaussian(mean, stdDev) {
    let u1 = Math.random();
    let u2 = Math.random();
    let randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    return mean + stdDev * randStdNormal;
}

function generateClusteredCities(numCities, numClusters, width, height, clusterRadius) {
    let cities = [];
    let clusterCenters = [];

    // Genera centros de clusters
    for (let i = 0; i < numClusters; i++) {
        let centerX = Math.random() * width;
        let centerY = Math.random() * height;
        clusterCenters.push({ x: centerX, y: centerY });
    }

    // Genera ciudades alrededor de cada centro de cluster
    for (let i = 0; i < numCities; i++) {
        let cluster = clusterCenters[Math.floor(Math.random() * numClusters)];
        let x = getRandomGaussian(cluster.x, clusterRadius);
        let y = getRandomGaussian(cluster.y, clusterRadius);
        cities.push({ x: x, y: y });
    }

    return cities;
}

// Parámetros
let numCities = 100;
let numClusters = 5;
let width = 1000;
let height = 1000;
let clusterRadius = 50;

// let cities = generateClusteredCities(numCities, numClusters, width, height, clusterRadius);
