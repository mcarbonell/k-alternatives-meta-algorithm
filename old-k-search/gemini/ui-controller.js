// ui-controller.js

class UIController {
    constructor(solver, drawer) {
        this.solver = solver;
        this.drawer = drawer;
        this.domElements = {
            canvas: document.getElementById('tspCanvas'),
            numNearestCitiesInput: document.getElementById('numNearestCities'),
            showNumbersCheckbox: document.getElementById('showNumbers'),
            showArrowsCheckbox: document.getElementById('showArrows'),
            btnRandomizeTour: document.getElementById('btnRandomizeTour'),
            btnDetectIntersections: document.getElementById('btnDetectIntersections'),
            btnConvexHull: document.getElementById('btnConvexHull'),
            btnClearCities: document.getElementById('btnClearCities'),
            currentDistanceSpan: document.getElementById('currentDistance'),
            bestOverallDistanceSpan: document.getElementById('bestOverallDistance'),
            optimizationStepsSpan: document.getElementById('optimizationSteps'),
            numCitiesDisplaySpan: document.getElementById('numCitiesDisplay'),
            citiesInputArea: document.getElementById('citiesInputArea'),
            btnLoadCities: document.getElementById('btnLoadCities'),
            logOutput: document.getElementById('logOutput'),
        };
        this._bindEvents();
        this._initializeDefaultValues();
    }

    _initializeDefaultValues() {
        this.domElements.numNearestCitiesInput.value = this.solver.config.nearestCitiesCount;
        this.domElements.showNumbersCheckbox.checked = this.drawer.config.showNumbers;
        this.domElements.showArrowsCheckbox.checked = this.drawer.config.showArrows;
        this.updateInfoPanel(); // Poner valores iniciales
    }

    _bindEvents() {
        this.domElements.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        this.domElements.numNearestCitiesInput.addEventListener('change', this.handleConfigChange.bind(this));
        this.domElements.showNumbersCheckbox.addEventListener('change', this.handleDisplayOptionChange.bind(this));
        this.domElements.showArrowsCheckbox.addEventListener('change', this.handleDisplayOptionChange.bind(this));

        this.domElements.btnRandomizeTour.addEventListener('click', this.handleOptimizeTour.bind(this));
        this.domElements.btnDetectIntersections.addEventListener('click', this.handleResolveIntersections.bind(this));
        this.domElements.btnConvexHull.addEventListener('click', this.handleShowConvexHull.bind(this));
        this.domElements.btnClearCities.addEventListener('click', this.handleClearCities.bind(this));

        this.domElements.btnLoadCities.addEventListener('click', this.handleLoadCitiesFromTextarea.bind(this));
        this.domElements.citiesInputArea.addEventListener('input', () => { /* Podríamos validar JSON en vivo */ });
    }

    // --- Handlers ---
    handleCanvasClick(event) {
        const rect = this.domElements.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.logEvent(`Nueva ciudad añadida en (${x.toFixed(0)}, ${y.toFixed(0)})`);
        const { cities, tour } = this.solver.addCity(x, y);
        this.domElements.citiesInputArea.value = JSON.stringify(cities.map(c => ({x: c.x, y: c.y})), null, 2);
        this.redrawAll();
        this.updateInfoPanel();
    }

    handleConfigChange() {
        const newNearestCount = parseInt(this.domElements.numNearestCitiesInput.value);
        if (!isNaN(newNearestCount) && newNearestCount > 0) {
            this.solver.updateConfig({ nearestCitiesCount: newNearestCount });
            this.logEvent(`Nº ciudades cercanas para optimización cambiado a: ${newNearestCount}`);
        } else {
            this.domElements.numNearestCitiesInput.value = this.solver.config.nearestCitiesCount; // Revertir
        }
    }

    handleDisplayOptionChange() {
        this.drawer.updateDrawingConfig({
            showNumbers: this.domElements.showNumbersCheckbox.checked,
            showArrows: this.domElements.showArrowsCheckbox.checked,
        });
        this.logEvent(`Opciones de visualización actualizadas.`);
        this.redrawAll();
    }

    handleOptimizeTour() {
        if (this.solver.cities.length < 3) {
            this.logEvent("Se necesitan al menos 3 ciudades para optimizar el tour.");
            return;
        }
        this.logEvent("Iniciando optimización iterativa del tour...");
        // Usar setTimeout para permitir que la UI se actualice antes de un cálculo largo
        setTimeout(() => {
            const { tourChanged } = this.solver.optimizeTourIteratively();
            if (tourChanged) {
                this.logEvent(`Tour optimizado. Nueva distancia: ${this.solver.currentTourCost.toFixed(2)}`);
            } else {
                this.logEvent("No se encontraron más mejoras en el tour con esta optimización.");
            }
            this.redrawAll();
            this.updateInfoPanel();
        }, 0);
    }

    handleResolveIntersections() {
        if (this.solver.cities.length < 4) {
            this.logEvent("Se necesitan al menos 4 ciudades para resolver cruces con 2-Opt.");
            return;
        }
        this.logEvent("Buscando y eliminando cruces (2-Opt)...");
        setTimeout(() => {
            const { tourChanged } = this.solver.resolveIntersections2Opt();
            if (tourChanged) {
                this.logEvent(`Cruces eliminados. Nueva distancia: ${this.solver.currentTourCost.toFixed(2)}`);
            } else {
                this.logEvent("No se encontraron cruces o no se pudieron mejorar con 2-Opt.");
            }
            this.redrawAll();
            this.updateInfoPanel();
        }, 0);
    }

    handleShowConvexHull() {
        if (this.solver.cities.length < 3) {
            this.logEvent("Se necesitan al menos 3 ciudades para calcular la envolvente convexa.");
            return;
        }
        this.logEvent("Calculando y mostrando envolvente convexa.");
        const hullPoints = this.solver.getConvexHull();
        this.redrawAll(hullPoints); // Pasar hullPoints para que se dibuje
        // El hull no afecta los datos del tour, así que no se actualiza el panel de info
    }

    handleClearCities() {
        this.logEvent("Todas las ciudades han sido eliminadas.");
        this.solver.clearCities();
        this.domElements.citiesInputArea.value = "";
        this.redrawAll();
        this.updateInfoPanel();
    }

    handleLoadCitiesFromTextarea() {
        const jsonText = this.domElements.citiesInputArea.value.trim();
        if (!jsonText) {
            this.logEvent("Textarea de ciudades vacío. No se cargaron ciudades.");
            return;
        }
        try {
            const parsedCities = JSON.parse(jsonText);
            if (!Array.isArray(parsedCities)) throw new Error("El JSON debe ser un array.");

            this.logEvent(`Cargando ${parsedCities.length} ciudades desde el textarea.`);
            this.solver.loadCities(parsedCities);
            this.redrawAll();
            this.updateInfoPanel();

        } catch (error) {
            this.logEvent(`Error al parsear JSON de ciudades: ${error.message}`);
            console.error("Error al cargar ciudades:", error);
            alert(`JSON inválido: ${error.message}\nAsegúrate que sea un array de objetos con 'x' e 'y', ej: [{ "x": 10, "y": 20 }, { "x": 30, "y": 40 }]`);
        }
    }

    // --- Métodos de UI ---
    redrawAll(convexHullToShow = null) {
        this.drawer.clear();
        this.drawer.drawCities(this.solver.cities);
        if (this.solver.cities.length > 1) {
            this.drawer.drawTour(this.solver.cities, this.solver.nextInTour);
        }
        if (convexHullToShow) {
            this.drawer.drawConvexHull(convexHullToShow);
        }
    }

    updateInfoPanel() {
        const tourData = this.solver.getTourData();
        this.domElements.currentDistanceSpan.textContent = tourData.cost > 0 ? tourData.cost.toFixed(2) : '-';
        this.domElements.bestOverallDistanceSpan.textContent = tourData.bestCost !== Infinity && tourData.bestCost > 0 ? tourData.bestCost.toFixed(2) : '-';
        this.domElements.optimizationStepsSpan.textContent = tourData.steps.toLocaleString();
        this.domElements.numCitiesDisplaySpan.textContent = tourData.numCities.toLocaleString();
    }

    logEvent(message) {
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        this.domElements.logOutput.textContent = `[${timeString}] ${message}\n` + this.domElements.logOutput.textContent;
        // Limitar el log a N líneas si se desea
        const lines = this.domElements.logOutput.textContent.split('\n');
        if (lines.length > 50) {
            this.domElements.logOutput.textContent = lines.slice(0, 50).join('\n');
        }
    }
}