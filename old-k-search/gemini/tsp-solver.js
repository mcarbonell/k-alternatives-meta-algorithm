// tsp-solver.js

class TSPSolver {
    constructor(config = {}) {
        this.cities = []; // Array de objetos {x, y, id (opcional, podría ser el índice)}
        this.nextInTour = []; // nextInTour[i] es el índice de la ciudad siguiente a la ciudad i
        this.prevInTour = []; // prevInTour[i] es el índice de la ciudad previa a la ciudad i

        this.distances = []; // Matriz de distancias precalculadas
        this.nearest = [];   // nearest[i] es un array ordenado de los índices de las ciudades más cercanas a i

        this.currentTourCost = Infinity;
        this.bestOverallTourCost = Infinity;
        this.optimizationSteps = 0; // Contador para soluciones/mejoras

        this.config = {
            nearestCitiesCount: parseInt(config.nearestCitiesCount) || 5,
        };
    }

    // --- Métodos de gestión de ciudades y datos ---
    addCity(x, y) {
        const newCityIndex = this.cities.length;
        this.cities.push({ x, y, id: newCityIndex });

        if (this.cities.length === 1) {
            this.nextInTour[0] = 0;
            this.prevInTour[0] = 0;
            this._initializeMatrices(); // Solo para la primera ciudad, inicializa vacíos
            this.currentTourCost = 0;
        } else {
            this._initializeMatrices(); // Recalcular para todas las ciudades
            this._insertCityOptimally(newCityIndex);
        }
        this.currentTourCost = this._calculateTotalTourCost();
        this._updateBestOverallCost();
        return { cities: this.cities, tour: this.getTourData() };
    }

    loadCities(parsedCities) {
        if (!Array.isArray(parsedCities) || parsedCities.some(c => typeof c.x !== 'number' || typeof c.y !== 'number')) {
            console.error("Formato de ciudades inválido.");
            return null;
        }
        this.cities = parsedCities.map((city, index) => ({ ...city, id: index }));
        this.optimizationSteps = 0;
        this.bestOverallTourCost = Infinity;

        if (this.cities.length > 0) {
            // Construir un tour inicial simple (0-1-2-...-0)
            this.nextInTour = this.cities.map((_, index) => (index + 1) % this.cities.length);
            this.prevInTour = this.cities.map((_, index) => (index - 1 + this.cities.length) % this.cities.length);
            this._initializeMatrices();
            this.currentTourCost = this._calculateTotalTourCost();
        } else {
            this.nextInTour = [];
            this.prevInTour = [];
            this.distances = [];
            this.nearest = [];
            this.currentTourCost = 0;
        }
        this._updateBestOverallCost();
        return { cities: this.cities, tour: this.getTourData() };
    }

    clearCities() {
        this.cities = [];
        this.nextInTour = [];
        this.prevInTour = [];
        this.distances = [];
        this.nearest = [];
        this.currentTourCost = 0;
        this.bestOverallTourCost = Infinity;
        this.optimizationSteps = 0;
        return { cities: this.cities, tour: this.getTourData() };
    }

    updateConfig(newConfig) {
        if (newConfig.nearestCitiesCount) {
            this.config.nearestCitiesCount = parseInt(newConfig.nearestCitiesCount);
        }
    }

    _initializeMatrices() {
        const numCities = this.cities.length;
        if (numCities === 0) {
            this.distances = [];
            this.nearest = [];
            return;
        }

        this.distances = Array(numCities).fill(null).map(() => Array(numCities).fill(0));
        this.nearest = Array(numCities).fill(null).map(() => []);

        for (let i = 0; i < numCities; i++) {
            for (let j = i; j < numCities; j++) {
                if (i === j) {
                    this.distances[i][j] = 0;
                } else {
                    const dist = this._euclideanDist(this.cities[i], this.cities[j]);
                    this.distances[i][j] = dist;
                    this.distances[j][i] = dist;
                }
            }
        }

        for (let i = 0; i < numCities; i++) {
            this.nearest[i] = Array(numCities).fill(0).map((_, j) => j)
                .filter(j => j !== i)
                .sort((a, b) => this.distances[i][a] - this.distances[i][b]);
        }
    }

    // --- Métodos de cálculo y heurísticas TSP ---
    _euclideanDist(city1, city2) {
        return Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2));
    }

    _getDistance(cityIdx1, cityIdx2) {
        if (cityIdx1 < 0 || cityIdx1 >= this.cities.length || cityIdx2 < 0 || cityIdx2 >= this.cities.length) {
            // console.warn(`Índice fuera de rango: ${cityIdx1}, ${cityIdx2}`);
            return Infinity; // O manejar error
        }
        return this.distances[cityIdx1][cityIdx2];
    }

    _calculateInsertionCost(cityToInsertIdx, prevInTourIdx, nextInTourIdx) {
        return this._getDistance(prevInTourIdx, cityToInsertIdx) +
            this._getDistance(cityToInsertIdx, nextInTourIdx) -
            this._getDistance(prevInTourIdx, nextInTourIdx);
    }

    _calculateTotalTourCost() {
        if (this.cities.length < 2) return 0;
        let cost = 0;
        let current = 0; // Empezar desde la ciudad 0
        for (let i = 0; i < this.cities.length; i++) {
            cost += this._getDistance(current, this.nextInTour[current]);
            current = this.nextInTour[current];
        }
        return cost;
    }

    _insertCityOptimally(cityIndexToInsert) {
        if (this.cities.length <= 1) return; // No hay dónde insertar
        if (this.cities.length === 2) { // Tour simple 0-1-0
            this.nextInTour[0] = 1; this.prevInTour[0] = 1;
            this.nextInTour[1] = 0; this.prevInTour[1] = 0;
            return;
        }

        let bestInsertion = { cost: Infinity, prevNode: -1, nextNode: -1 };

        // Iterar sobre todas las aristas del tour actual
        // Empezamos con cualquier nodo del tour, por ejemplo, el primero (0)
        let currentNodeInTour = 0;
        for (let i = 0; i < this.cities.length - 1; i++) { // -1 porque la nueva ciudad aún no está "en" el tour
            const nextNodeInTour = this.nextInTour[currentNodeInTour];
            const cost = this._calculateInsertionCost(cityIndexToInsert, currentNodeInTour, nextNodeInTour);

            if (cost < bestInsertion.cost) {
                bestInsertion = { cost, prevNode: currentNodeInTour, nextNode: nextNodeInTour };
            }
            currentNodeInTour = nextNodeInTour; // Avanzar al siguiente nodo del tour
        }


        // Realizar la inserción
        const { prevNode, nextNode } = bestInsertion;
        this.nextInTour[prevNode] = cityIndexToInsert;
        this.prevInTour[cityIndexToInsert] = prevNode;
        this.nextInTour[cityIndexToInsert] = nextNode;
        this.prevInTour[nextNode] = cityIndexToInsert;

        // Optimizar localmente alrededor de la inserción
        if (this.cities.length > 3) {
            let modified = new Set(this._findNearestCitiesInTour(cityIndexToInsert, this.config.nearestCitiesCount));
            modified.add(cityIndexToInsert);
            modified.add(this.nextInTour[cityIndexToInsert]);
            modified.add(this.prevInTour[cityIndexToInsert]);
            this._optimizeByNeighborMoves(modified);
        }
    }

    _findNearestCitiesInTour(cityIndex, count) {
        // Devuelve 'count' ciudades más cercanas a 'cityIndex' QUE YA ESTÁN EN EL TOUR (excluyendo cityIndex)
        // Esta es una simplificación; la original usaba nearest[cityIndex] directamente.
        // Para ser más fiel a la original, necesitaríamos filtrar nearest[cityIndex]
        // para incluir solo los que están en el tour.
        // Por ahora, para la inserción, es más importante las aristas existentes.
        // Para la optimización, nearest[cityIndex] global es mejor.
        return this.nearest[cityIndex]
            .filter(n => n !== cityIndex) // Asegurarse de que no se incluya a sí mismo
            .slice(0, count);
    }

    _optimizeByNeighborMoves(initialModifiedSet = null) {
        if (this.cities.length < 3) return false;
        let overallModified = false;

        let modified = initialModifiedSet ? new Set(initialModifiedSet) : new Set(this.cities.map((_, i) => i));

        while (modified.size > 0) {
            const currentCityIdx = modified.values().next().value;
            modified.delete(currentCityIdx);

            const originalPrev = this.prevInTour[currentCityIdx];
            const originalNext = this.nextInTour[currentCityIdx];

            // Costo de mantener currentCityIdx donde está
            const currentSegmentCost = this._getDistance(originalPrev, currentCityIdx) + this._getDistance(currentCityIdx, originalNext);

            let bestMove = { costDelta: 0, newPrev: originalPrev, newNext: originalNext };

            // Considerar mover currentCityIdx entre city1 y city2 (nextInTour[city1])
            const neighborsToConsider = this._findNearestCitiesInTour(currentCityIdx, this.config.nearestCitiesCount);

            for (const city1Idx of neighborsToConsider) {
                if (city1Idx === currentCityIdx || city1Idx === originalPrev || city1Idx === originalNext) continue;

                const city2Idx = this.nextInTour[city1Idx];
                if (city2Idx === currentCityIdx || city2Idx === originalPrev || city2Idx === originalNext) continue;
                if (city1Idx === city2Idx) continue; // Evitar bucles en tours muy pequeños

                // Costo si movemos currentCityIdx entre city1Idx y city2Idx
                const newSegmentCost = this._getDistance(city1Idx, currentCityIdx) + this._getDistance(currentCityIdx, city2Idx);
                const costToRemoveOldLink = this._getDistance(originalPrev, originalNext);
                const costToLinkNewGap = this._getDistance(city1Idx, city2Idx);

                // Delta: (costo de quitar original) + (costo de nueva inserción) - (costo de quitar antigua arista de inserción) - (costo de tener currentCityIdx donde estaba)
                // Delta = (costToLinkNewGap - this._getDistance(city1Idx, city2Idx)) // incorrecto
                // Delta = (costo nuevo) - (costo viejo)
                // Costo viejo = dist(originalPrev, current) + dist(current, originalNext) + dist(city1Idx, city2Idx)
                // Costo nuevo = dist(originalPrev, originalNext) + dist(city1Idx, current) + dist(current, city2Idx)
                const costDelta = (this._getDistance(originalPrev, originalNext) + this._getDistance(city1Idx, currentCityIdx) + this._getDistance(currentCityIdx, city2Idx)) -
                    (this._getDistance(originalPrev, currentCityIdx) + this._getDistance(currentCityIdx, originalNext) + this._getDistance(city1Idx, city2Idx));


                if (costDelta < bestMove.costDelta - 1e-9) { // Usar epsilon para flotantes
                    bestMove = { costDelta, newPrev: city1Idx, newNext: city2Idx };
                }
            }

            if (bestMove.newPrev !== originalPrev) { // Si se encontró una mejora
                overallModified = true;
                this.optimizationSteps++;

                // 1. Sacar currentCityIdx de su posición original
                this.nextInTour[originalPrev] = originalNext;
                this.prevInTour[originalNext] = originalPrev;

                // 2. Insertar currentCityIdx en la nueva posición
                const newPrevCity = bestMove.newPrev;
                const newNextCity = this.nextInTour[newPrevCity]; // que era bestMove.newNext ANTES de cualquier cambio

                this.nextInTour[newPrevCity] = currentCityIdx;
                this.prevInTour[currentCityIdx] = newPrevCity;
                this.nextInTour[currentCityIdx] = newNextCity;
                this.prevInTour[newNextCity] = currentCityIdx;

                // Añadir nodos afectados al conjunto modificado para re-evaluación
                modified.add(currentCityIdx);
                modified.add(originalPrev);
                modified.add(originalNext);
                modified.add(newPrevCity);
                modified.add(newNextCity);
            }
        }
        if (overallModified) {
            this.currentTourCost = this._calculateTotalTourCost();
            this._updateBestOverallCost();
        }
        return overallModified;
    }

    optimizeTourIteratively() {
        if (this.cities.length < 3) return { tourChanged: false, tour: this.getTourData() };
        let tourChangedInIteration;
        let anyChangeInLoop = false;
        const maxIterations = this.cities.length * 2; // Salvaguarda
        let iter = 0;
        do {
            tourChangedInIteration = this._optimizeByNeighborMoves();
            if (tourChangedInIteration) anyChangeInLoop = true;
            iter++;
        } while (tourChangedInIteration && iter < maxIterations);

        this.currentTourCost = this._calculateTotalTourCost();
        this._updateBestOverallCost();
        return { tourChanged: anyChangeInLoop, tour: this.getTourData() };
    }


    // --- 2-Opt para eliminar cruces ---
    resolveIntersections2Opt() {
        if (this.cities.length < 4) return { tourChanged: false, tour: this.getTourData() };
        let tourChanged = false;
        let madeChangeInPass = true;

        while (madeChangeInPass) {
            madeChangeInPass = false;
            const orderedTourIndices = this._getTourAsOrderedArray();

            for (let i = 0; i < orderedTourIndices.length - 2; i++) {
                for (let j = i + 2; j < orderedTourIndices.length - (i === 0 ? 1 : 0); j++) { // Evitar último segmento si i es 0
                    const p1 = orderedTourIndices[i];
                    const q1 = orderedTourIndices[i + 1]; // nextInTour[p1]
                    const p2 = orderedTourIndices[j];
                    const q2 = orderedTourIndices[(j + 1) % orderedTourIndices.length]; // nextInTour[p2]

                    if (q1 === p2 || q1 === q2 || p1 === p2 || p1 === q2) continue; // Adyacentes o misma arista

                    if (this._checkIfSegmentsIntersect(this.cities[p1], this.cities[q1], this.cities[p2], this.cities[q2])) {
                        // Distancia antes: d(p1,q1) + d(p2,q2)
                        // Distancia después: d(p1,p2) + d(q1,q2) (2-opt swap)
                        // El chequeo de intersección euclidiana ya implica que el swap es mejor
                        this._perform2OptSwap(p1, q1, p2, q2);
                        this.optimizationSteps++;
                        madeChangeInPass = true;
                        tourChanged = true;
                        // Romper bucles internos y reiniciar desde el principio, ya que el tour cambió
                        // Esto es más simple que tratar de continuar inteligentemente
                        break;
                    }
                }
                if (madeChangeInPass) break;
            }
        }
        if (tourChanged) {
            this.currentTourCost = this._calculateTotalTourCost();
            this._updateBestOverallCost();
        }
        return { tourChanged, tour: this.getTourData() };
    }

    _perform2OptSwap(p1, q1, p2, q2) {
        // El tour era: ... -> p1 -> q1 -> ... -> p2 -> q2 -> ...
        // Queremos:   ... -> p1 -> p2 -> ... -> q1 -> q2 -> ...
        // Se invierte el segmento (q1, ..., p2)
        // 1. next[p1] = p2, prev[p2] = p1
        // 2. next[q1] = q2, prev[q2] = q1
        // 3. Invertir punteros entre q1 y p2 (exclusive p2, inclusive q1)

        this.nextInTour[p1] = p2;
        this.prevInTour[p2] = p1;

        this.nextInTour[q1] = q2;
        this.prevInTour[q2] = q1;

        // Invertir la cadena desde q1 hasta llegar al nodo ANTES de p2
        let current = q1;
        let nextNode = this.prevInTour[current]; // El que era el prev de q1 ANTES del swap de q1 y q2
        // pero ahora queremos que sea el next en el segmento invertido
        let prevNodeStore;

        // El segmento a invertir es q1 ... p2.
        // En el tour original: p1 -> q1 -> ... -> prev_p2 -> p2 -> q2
        // Enlaces a cambiar:
        // nextInTour[p1] = p2
        // prevInTour[p2] = p1
        // nextInTour[q1] = q2
        // prevInTour[q2] = q1

        // Ahora invertir el path entre q1 y p2 (los nodos en medio)
        // El camino original era q1 -> next(q1) -> ... -> prev(p2) -> p2
        // El nuevo camino será q1 <- next(q1) <- ... <- prev(p2) <- p2
        // lo que significa: next(q1) = q2 (ya hecho)
        //                  prev(q1) = p2_original_prev
        //                  next(p2_original_prev) = q1
        //                  ...

        let curr = q1;
        let prev = p2; // p2 es el nuevo "anterior" de q1 en el segmento invertido.
        // Pero los punteros de p2 ya están actualizados para unirse a p1.
        // Necesitamos caminar hacia atrás desde p2 usando los *antiguos* prev.

        // El camino original era: ... -> p1 -> q1 -> c1 -> c2 -> ... -> ck -> p2 -> q2 -> ...
        // Nuevos enlaces principales: p1-p2 y q1-q2
        // El segmento a invertir es (q1, c1, ..., ck, p2) en el tour original.
        // Esto se convierte en (p1)-[p2 -> ck -> ... -> c1 -> q1]-(q2)
        // this.nextInTour[p1] = p2; this.prevInTour[p2] = p1; (ya hecho)
        // this.nextInTour[q1] = q2; this.prevInTour[q2] = q1; (ya hecho)

        // Invertir:
        let currentReverse = p2; // El nodo p2 es el nuevo sucesor de p1
        let nextToReverse = this.prevInTour[currentReverse]; // El que era el prev de p2, ahora es su next
        // (excepto que p2 ahora apunta a p1)
        // Necesitamos el prev de p2 en el *segmento* a invertir
        // Es el nodo que ANTES apuntaba a p2
        let tempPrev, tempNext;
        curr = q1; // Empezamos a re-enlazar desde q1 hacia p2
        let stopNode = p2;

        while (curr !== stopNode) {
            tempNext = this.nextInTour[curr];
            this.nextInTour[curr] = this.prevInTour[curr];
            this.prevInTour[curr] = tempNext;
            curr = tempNext; // Avanzamos por el camino *original* para invertirlo
            // pero como los punteros se cambian, usamos el guardado tempNext
        }
        // Finalmente, ajustar los enlaces de los extremos del segmento invertido:
        // this.nextInTour[p1] = p2; (ya está)
        // this.prevInTour[q1] = ? (debe ser p2) -> No, prevInTour[q1] es lo que era prevInTour[p2]
        // this.nextInTour[p2] = ? (debe ser q1) -> No, nextInTour[p2] es lo que era nextInTour[q1]

        // La función repairIntersection del código original es más clara:
        // repairIntersection(i, j) donde i es p1 y j es p2.
        // end1 = nextInTour[i]; (q1)
        // end2 = nextInTour[j]; (q2)
        // nextInTour[j] = end1; (nextInTour[p2] = q1)
        // nextInTour[i] = j;    (nextInTour[p1] = p2)
        //
        // prevInTour[end1] = j; (prevInTour[q1] = p2)
        // prevInTour[end2] = i; (prevInTour[q2] = p1)
        //
        // let aux = end1; (q1)
        // do {
        //     let aux2 = nextInTour[aux];
        //     nextInTour[aux] = prevInTour[aux];
        //     prevInTour[aux] = aux2;
        //     aux = prevInTour[aux]; // Avanzar por el nuevo next (que era el old prev)
        // } while (aux !== j); (p2)

        // Aplicando la lógica original, adaptada:
        // p1 es el primer nodo de la primera arista (i)
        // q1 es el segundo nodo de la primera arista (nextInTour[i])
        // p2 es el primer nodo de la segunda arista (j)
        // q2 es el segundo nodo de la segunda arista (nextInTour[j])

        // Enlaces a romper: (p1, q1) y (p2, q2)
        // Enlaces a crear: (p1, p2) y (q1, q2)
        // Segmento a invertir: desde q1 hasta p2 (inclusive)

        this.nextInTour[p1] = p2;
        this.prevInTour[p2] = p1;

        this.nextInTour[q1] = q2;
        this.prevInTour[q2] = q1;

        let currentPathNode = q1;
        let temp;
        // El camino entre q1 y p2 debe invertirse.
        // Si antes era q1 -> cA -> cB -> p2
        // Ahora es q1 <- cA <- cB <- p2 (en términos de punteros originales)
        // Es decir, next(q1)=q2, prev(q1)=cA (viejo next(q1))
        //            next(cA)=q1, prev(cA)=cB (viejo next(cA))
        //            next(cB)=cA, prev(cB)=p2 (viejo next(cB))
        //            next(p2)=cB (viejo next(p2)), prev(p2)=p1
        //
        // El bucle de inversión:
        let nodeToReverse = q1;
        let prevNode = p2; // El nodo p2 se convierte en el "prev" de q1 en el segmento invertido
        // lógicamente, pero no como puntero directo inmediato.
        // let nextNode;

        while (true) {
            nextNode = this.prevInTour[nodeToReverse]; // Guardamos el que era el previo
            this.prevInTour[nodeToReverse] = this.nextInTour[nodeToReverse]; // El nuevo prev es el viejo next
            this.nextInTour[nodeToReverse] = nextNode; // El nuevo next es el viejo prev

            if (nodeToReverse === p2) break; // Hemos llegado al final del segmento a invertir
            nodeToReverse = nextNode; // Avanzamos al siguiente nodo (que era el prev original)
        }
    }

    _getTourAsOrderedArray() {
        if (this.cities.length === 0) return [];
        const tourArray = [];
        let current = 0; // Empezar en la ciudad 0 (o la primera del tour)
        for (let i = 0; i < this.cities.length; i++) {
            tourArray.push(current);
            current = this.nextInTour[current];
            if (i > 0 && current === tourArray[0] && i < this.cities.length - 1) {
                // console.warn("Tour subcíclico detectado antes de completar todas las ciudades.", tourArray, this.nextInTour, this.prevInTour);
                // Esto puede pasar si hay errores en la manipulación del tour.
                // Para este helper, simplemente devolvemos lo que tenemos.
                break;
            }
        }
        return tourArray;
    }

    _orientation(p, q, r) {
        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (val === 0) return 0;  // Colineal
        return (val > 0) ? 1 : 2; // Horario o Antihorario
    }

    _onSegment(p, q, r) {
        return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y));
    }

    _checkIfSegmentsIntersect(p1, q1, p2, q2) {
        const o1 = this._orientation(p1, q1, p2);
        const o2 = this._orientation(p1, q1, q2);
        const o3 = this._orientation(p2, q2, p1);
        const o4 = this._orientation(p2, q2, q1);

        if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) {
            if (o1 !== o2 && o3 !== o4) return true; // Caso general de intersección
        }

        // Casos especiales de colinealidad (no los contamos como intersección para 2-opt típico)
        // if (o1 === 0 && this._onSegment(p1, p2, q1)) return true;
        // if (o2 === 0 && this._onSegment(p1, q2, q1)) return true;
        // if (o3 === 0 && this._onSegment(p2, p1, q2)) return true;
        // if (o4 === 0 && this._onSegment(p2, q1, q2)) return true;

        return false; // No se cruzan o son colineales tocándose en un extremo
    }


    // --- Envolvente Convexa (Andrew's Monotone Chain) ---
    getConvexHull() {
        if (this.cities.length <= 2) return [...this.cities];

        const points = [...this.cities].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
        const hull = [];

        // Mitad inferior
        for (const p of points) {
            while (hull.length >= 2 && this._crossProduct(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
                hull.pop();
            }
            hull.push(p);
        }

        // Mitad superior
        // Empezar de nuevo, pero ignorando el último punto de la mitad inferior (ya está)
        const t = hull.length + 1;
        for (let i = points.length - 2; i >= 0; i--) { // Empezar desde el penúltimo
            const p = points[i];
            while (hull.length >= t && this._crossProduct(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
                hull.pop();
            }
            hull.push(p);
        }
        hull.pop(); // Quitar el primer punto que se repite al final
        return hull;
    }

    _crossProduct(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    // --- Getters para UI ---
    getTourData() {
        return {
            next: this.nextInTour,
            prev: this.prevInTour, // Útil para depuración o visualizaciones bidireccionales
            cost: this.currentTourCost,
            bestCost: this.bestOverallTourCost,
            steps: this.optimizationSteps,
            numCities: this.cities.length
        };
    }

    _updateBestOverallCost() {
        if (this.currentTourCost < this.bestOverallTourCost) {
            this.bestOverallTourCost = this.currentTourCost;
        }
    }
}