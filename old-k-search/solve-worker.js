/**
 * k-Deviation TSP Solver (Optimized Version)
 * Author: Mario Raúl Carbonell Martínez
 * Optimized with Branch & Bound and In-Place Memory Management
 */

let id = '';
let cities = [];
let bestRoute = [];
let bestDistance = Infinity;
let bestPossibleDistance = 0;

let iteration = 0;
let improvements = 0;
let maxK = 0;

let currentK = 1;
let distances = []; // Matriz de adyacencia pre-calculada
let initialHeuristics = [];
let localHeuristics = [];

let isRunning = true;
let improved = true;
let debug = false;

// --- Utility Functions ---

function shuffle(array) {
    let currentIndex = array.length;
    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}

function calcEuclidean(city1, city2) {
    return Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2));
}

function calculateFullRouteDistance(route) {
    let totalDistance = distances[route[route.length - 1]][route[0]];
    for (let i = 0; i < route.length - 1; i++) {
        totalDistance += distances[route[i]][route[i + 1]];
    }
    return totalDistance;
}

// --- Communication ---

function sendStats() {
    self.postMessage({
        type: 'stats',
        id: id,
        iteration,
        improvements,
        bestDistance,
        currentK,
        bestPossibleDistance
    });
}

function updateBestRoute(routeDistance, currentRoute) {
    improved = true;
    improvements += 1;
    bestDistance = routeDistance;
    // Copiamos la ruta para guardarla (slice es más rápido que spread operator)
    bestRoute = currentRoute.slice();

    // Aprendizaje: Actualizamos la heurística con la nueva mejor ruta
    updateLocalHeuristics(bestRoute);

    sendStats();
    self.postMessage({
        type: 'improvement',
        id: id,
        route: bestRoute,
        distance: bestDistance,
        iteration,
        improvements,
        currentK
    });
}

// --- Core Algorithm ---

/**
 * Búsqueda sistemática con Poda (Branch & Bound)
 * @param {Set} remainingCities - Ciudades que faltan por visitar
 * @param {Array} currentRoute - Ruta actual construida
 * @param {Number} alternativesLeft - Presupuesto de desviaciones (k)
 * @param {Number} currentDist - Distancia acumulada hasta el momento (CRUCIAL para la poda)
 */
function systematicAlternativesSearch(remainingCities, currentRoute, alternativesLeft, currentDist) {
    // PODA 1: Si lo que llevamos ya es peor que el mejor récord, abortamos esta rama.
    if (currentDist >= bestDistance) {
        return;
    }

    // Caso Base: No quedan ciudades, cerramos el ciclo volviendo al inicio
    if (remainingCities.size === 0) {
        // Sumar distancia de vuelta al origen
        let startCity = currentRoute[0];
        let lastCity = currentRoute[currentRoute.length - 1];
        let totalDist = currentDist + distances[lastCity][startCity];

        // Verificamos si hemos mejorado el récord global
        if (totalDist < bestDistance) {
            updateBestRoute(totalDist, currentRoute);
        }
        return;
    }

    let currentCity = currentRoute[currentRoute.length - 1];
    let heuristic = localHeuristics[currentCity];
    let validCitiesFound = 0;

    // Iteramos sobre las opciones sugeridas por la heurística
    for (let i = 0; i < heuristic.length; i++) {
        // Si gastamos el presupuesto de desviaciones 'k', paramos de explorar opciones peores
        if (validCitiesFound > alternativesLeft) break;

        if (!isRunning) return;

        let nextCity = heuristic[i];

        // Verificamos si la ciudad está disponible (O(1) gracias al Set)
        if (remainingCities.has(nextCity)) {
            validCitiesFound++;

            let distToNext = distances[currentCity][nextCity];
            let nextTotalDist = currentDist + distToNext;

            // PODA 2: Look-ahead. Si dar este paso ya nos pasa del límite, 'continue'
            if (nextTotalDist >= bestDistance) continue;

            // Avanzamos (Forward)
            currentRoute.push(nextCity);
            remainingCities.delete(nextCity);

            // Recursión: Nótese el cálculo del coste de desviación
            systematicAlternativesSearch(
                remainingCities,
                currentRoute,
                alternativesLeft - (validCitiesFound - 1),
                nextTotalDist
            );

            // Retrocedemos (Backtracking)
            remainingCities.add(nextCity);
            currentRoute.pop();
        }
    }

    iteration++;
    if ((iteration % 200000) == 0) sendStats();
}

function initializeLocalHeuristics() {
    // 1. Pre-calcular matriz de distancias completa
    distances = cities.map((_, i) =>
        cities.map((_, j) => calcEuclidean(cities[i], cities[j]))
    );

    // 2. Generar heurística inicial (Vecino más cercano estático)
    initialHeuristics = cities.map((_, i) =>
        cities.map((_, j) => j)
            .filter(j => j !== i) // Excluirse a sí mismo
            .sort((a, b) => distances[i][a] - distances[i][b])
    );

    // 3. Clonar para la heurística dinámica
    // Usamos slice() para copia superficial de los arrays internos
    localHeuristics = initialHeuristics.map(row => row.slice());

    // 4. Calcular cota inferior teórica aproximada (para visualización)
    bestPossibleDistance = 0;
    for (let i = 0; i < cities.length; i++) {
        // Promedio de las 2 aristas más cortas por nodo
        let neighbors = initialHeuristics[i];
        if (neighbors.length >= 2) {
            bestPossibleDistance += distances[i][neighbors[0]] + distances[i][neighbors[1]];
        }
    }
    bestPossibleDistance = bestPossibleDistance / 2;
}

/**
 * Optimización In-Place: Mueve las conexiones exitosas al principio del array
 * sin crear nuevos arrays, reduciendo el uso de memoria.
 */
function updateLocalHeuristics(improvedRoute) {
    const len = improvedRoute.length;
    for (let i = 0; i < len; i++) {
        // Obtenemos los índices circulares (para conectar último con primero también)
        let city1 = improvedRoute[i];
        let city2 = improvedRoute[(i + 1) % len];

        // --- Aprendizaje Bidireccional ---

        // 1. City1 -> City2
        moveToFront(localHeuristics[city1], city2);

        // 2. City2 -> City1 (Simetría)
        moveToFront(localHeuristics[city2], city1);
    }
}

// Helper para mover elemento al frente sin crear garbage
function moveToFront(array, item) {
    if (array[0] === item) return; // Ya es el mejor

    let idx = -1;
    // Buscamos índice (generalmente estará cerca del principio)
    for (let k = 0; k < array.length; k++) {
        if (array[k] === item) {
            idx = k;
            break;
        }
    }

    if (idx > 0) {
        // Eliminamos de la posición actual
        array.splice(idx, 1);
        // Insertamos al principio
        array.unshift(item);
    }
}

function solve() {
    improved = true;
    let round = 0;

    while (improved && isRunning) {
        improved = false;
        // Orden aleatorio de nodos iniciales para diversificar
        let order = shuffle([...Array(cities.length).keys()]);
        round++;

        for (let i = 0; i < cities.length; i++) {
            if (debug) console.log(`Round ${round}, K=${currentK}, StartNode=${order[i]}`);

            let startCity = order[i];
            // Set eficiente para las ciudades restantes
            let remainingCities = new Set();
            for (let c = 0; c < cities.length; c++) {
                if (c !== startCity) remainingCities.add(c);
            }

            // Iniciamos la búsqueda con distancia 0
            systematicAlternativesSearch(
                remainingCities,
                [startCity],
                currentK,
                0 // currentDist inicial
            );

            if (!isRunning) return;
        }
    }

    // Si no hubo mejoras en toda una ronda de todos los nodos iniciales, subimos K
    currentK++;
    if (currentK <= maxK && isRunning) {
        setTimeout(solve, 0); // SetTimeout para no bloquear el hilo UI si fuese necesario
    } else {
        if (debug) console.log("FINISHED", iteration, improvements);
        sendStats();
        self.postMessage({
            type: 'solution',
            id: id,
            route: bestRoute,
            distance: bestDistance,
            iteration,
            improvements,
            currentK: currentK - 1
        });
    }
}

self.onmessage = function (e) {
    if (e.data.type === 'start') {
        console.log('Worker started', e.data);
        id = e.data.id;
        cities = e.data.cities;
        debug = e.data.debug;
        maxK = e.data.maxK;

        bestRoute = [];
        bestDistance = Infinity;
        iteration = 0;
        improvements = 0;
        currentK = 0; // Empezamos en 0 (Greedy puro)

        initializeLocalHeuristics();

        // Generar una solución inicial rápida Greedy (k=0) desde la ciudad 0
        // para tener una bestDistance base y que la poda funcione desde el principio
        let initialSet = new Set();
        for (let c = 1; c < cities.length; c++) initialSet.add(c);
        systematicAlternativesSearch(initialSet, [0], 0, 0);

        setTimeout(solve, 0);

    } else if (e.data.type === 'stop') {
        isRunning = false;
        console.log('Worker stopped');
    }
};

// Enviar estadísticas cada segundo para no saturar el bus de mensajes
setInterval(() => {
    if (isRunning) sendStats();
}, 1000);