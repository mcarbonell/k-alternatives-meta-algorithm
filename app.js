// Global variables
let cities = [];
let worker = null;
let isRunning = false;
let maxK = 5;
let tspParser = null;
let currentProblem = null;
let visualizationCities = []; // Scaled cities for visualization
let showNumbers = true;
let timerInterval = null;
let startTime = null;
let optimalFoundTime = null; // Track when optimal was found
let currentStats = {
    iteration: 0,
    improvements: 0,
    bestDistance: Infinity,
    currentK: 0,
    bestPossibleDistance: 0,
    optimalDistance: null
};

// SVG dimensions
const SVG_WIDTH = 800;
const SVG_HEIGHT = 500;
const MARGIN = 40;

// Timer functions
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    stopTimer();
    document.getElementById('timer').textContent = '00:00';
}

function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / 60000);
    
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Control functions
function setControlsEnabled(enabled) {
    document.getElementById('citiesSlider').disabled = !enabled;
    document.getElementById('maxKSlider').disabled = !enabled;
    document.getElementById('tsplibSelect').disabled = !enabled;
    document.getElementById('presetSelect').disabled = !enabled;
    document.getElementById('showNumbers').disabled = !enabled;
    
    // Also disable/enable the generate random cities button
    const generateBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Generar Ciudades Aleatorias')
    );
    if (generateBtn) {
        generateBtn.disabled = !enabled;
        if (!enabled) {
            generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    if (!enabled) {
        document.getElementById('citiesSlider').classList.add('opacity-50');
        document.getElementById('maxKSlider').classList.add('opacity-50');
        document.getElementById('tsplibSelect').classList.add('opacity-50');
        document.getElementById('presetSelect').classList.add('opacity-50');
    } else {
        document.getElementById('citiesSlider').classList.remove('opacity-50');
        document.getElementById('maxKSlider').classList.remove('opacity-50');
        document.getElementById('tsplibSelect').classList.remove('opacity-50');
        document.getElementById('presetSelect').classList.remove('opacity-50');
    }
}

// Toggle city numbers visibility
function toggleCityNumbers() {
    showNumbers = document.getElementById('showNumbers').checked;
    drawCities();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    tspParser = new TSPLIBParser();
    initializeTSPLIBProblems();
    generateRandomCities();
    initializeWorker();
});

// Initialize Web Worker
function initializeWorker() {
    worker = new Worker('solve-worker.js?v=' + Date.now());
    
    worker.onmessage = function(e) {
        handleWorkerMessage(e.data);
    };
    
    worker.onerror = function(error) {
        console.error('Worker error:', error);
        updateStatus('Error en worker', 'error');
    };
}

// Handle messages from worker
function handleWorkerMessage(data) {
    switch(data.type) {
        case 'stats':
            updateStats(data);
            break;
        case 'improvement':
            updateStats(data);
            drawRoute(data.route);
            break;
        case 'solution':
            updateStats(data);
            drawRoute(data.route);
            stopTimer();
            stopSolving();
            updateStatus('✅ Solución encontrada', 'success');
            break;
    }
}

// Update statistics display
function updateStats(data) {
    currentStats = {
        iteration: data.iteration,
        improvements: data.improvements,
        bestDistance: data.distance || data.bestDistance,
        currentK: data.currentK,
        bestPossibleDistance: data.bestPossibleDistance || currentStats.bestPossibleDistance,
        optimalDistance: currentStats.optimalDistance
    };
    
    document.getElementById('iteration').textContent = currentStats.iteration.toLocaleString('es-ES');
    document.getElementById('improvements').textContent = currentStats.improvements.toLocaleString('es-ES');
    document.getElementById('currentK').textContent = currentStats.currentK;
    document.getElementById('bestDistance').textContent = Math.round(currentStats.bestDistance).toLocaleString('es-ES');
    
    // Check if optimal solution was found
    if (currentStats.optimalDistance && 
        Math.round(currentStats.bestDistance) <= currentStats.optimalDistance && 
        !optimalFoundTime) {
        
        optimalFoundTime = Date.now();
        const optimalTime = Math.floor((optimalFoundTime - startTime) / 1000);
        const minutes = Math.floor(optimalTime / 60);
        const seconds = optimalTime % 60;
        
        document.getElementById('optimalTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        updateStatus('🎯 ¡Óptimo encontrado! Deteniendo...', 'success');
        
        // Stop the algorithm automatically
        setTimeout(() => {
            stopSolving();
            updateStatus('✅ ¡Óptimo encontrado y verificado!', 'success');
        }, 500);
    }
    
    // Update optimal distance and deviation
    if (currentStats.optimalDistance) {
        document.getElementById('optimalDistance').textContent = currentStats.optimalDistance.toLocaleString('es-ES');
        const roundedDistance = Math.round(currentStats.bestDistance);
        const deviation = ((roundedDistance / currentStats.optimalDistance - 1) * 100);
        document.getElementById('deviation').textContent = deviation.toFixed(2) + '%';
        
        // Color code deviation
        const deviationEl = document.getElementById('deviation');
        if (deviation < 1) {
            deviationEl.className = 'font-mono text-green-400';
        } else if (deviation < 5) {
            deviationEl.className = 'font-mono text-yellow-400';
        } else {
            deviationEl.className = 'font-mono text-red-400';
        }
    } else {
        document.getElementById('optimalDistance').textContent = '-';
        document.getElementById('deviation').textContent = '-';
    }
    
    if (currentStats.bestPossibleDistance > 0) {
        // Calculate progress based on optimal distance if available, otherwise estimated
        const targetDistance = currentStats.optimalDistance || currentStats.bestPossibleDistance;
        const roundedDistance = Math.round(currentStats.bestDistance);
        const progress = Math.min(100, (targetDistance / roundedDistance) * 100);
        document.getElementById('progress').textContent = progress.toFixed(1) + '%';
        document.getElementById('progressBar').style.width = progress + '%';
    }
}

// Generate random cities
function generateRandomCities() {
    const count = parseInt(document.getElementById('citiesSlider').value);
    cities = [];
    visualizationCities = [];
    
    for (let i = 0; i < count; i++) {
        const city = {
            x: MARGIN + Math.random() * (SVG_WIDTH - 2 * MARGIN),
            y: MARGIN + Math.random() * (SVG_HEIGHT - 2 * MARGIN)
        };
        cities.push(city);
        visualizationCities.push(city); // Same for random generation
    }
    
    drawCities();
    clearRoute();
    resetStats();
    updateStatus('Ciudades generadas', 'ready');
}

// Load preset city configurations
function loadPreset(preset) {
    const count = parseInt(document.getElementById('citiesSlider').value);
    cities = [];
    visualizationCities = [];
    
    switch(preset) {
        case 'circle':
            const centerX = SVG_WIDTH / 2;
            const centerY = SVG_HEIGHT / 2;
            const radius = Math.min(SVG_WIDTH, SVG_HEIGHT) / 2 - MARGIN - 20;
            
            for (let i = 0; i < count; i++) {
                const angle = (2 * Math.PI * i) / count;
                const city = {
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                };
                cities.push(city);
                visualizationCities.push(city);
            }
            break;
            
        case 'grid':
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            const cellWidth = (SVG_WIDTH - 2 * MARGIN) / cols;
            const cellHeight = (SVG_HEIGHT - 2 * MARGIN) / rows;
            
            for (let i = 0; i < count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const city = {
                    x: MARGIN + cellWidth * (col + 0.5) + (Math.random() - 0.5) * cellWidth * 0.3,
                    y: MARGIN + cellHeight * (row + 0.5) + (Math.random() - 0.5) * cellHeight * 0.3
                };
                cities.push(city);
                visualizationCities.push(city);
            }
            break;
            
        case 'clusters':
            const numClusters = Math.min(4, Math.floor(count / 5));
            const citiesPerCluster = Math.floor(count / numClusters);
            
            for (let c = 0; c < numClusters; c++) {
                const clusterX = MARGIN + Math.random() * (SVG_WIDTH - 2 * MARGIN);
                const clusterY = MARGIN + Math.random() * (SVG_HEIGHT - 2 * MARGIN);
                const clusterRadius = 50 + Math.random() * 50;
                
                const clusterSize = (c === numClusters - 1) ? 
                    count - c * citiesPerCluster : citiesPerCluster;
                
                for (let i = 0; i < clusterSize; i++) {
                    const angle = Math.random() * 2 * Math.PI;
                    const r = Math.random() * clusterRadius;
                    const city = {
                        x: clusterX + r * Math.cos(angle),
                        y: clusterY + r * Math.sin(angle)
                    };
                    cities.push(city);
                    visualizationCities.push(city);
                }
            }
            break;
    }
    
    drawCities();
    clearRoute();
    resetStats();
    updateStatus('Configuración cargada: ' + preset, 'ready');
}

// Draw cities on SVG
function drawCities() {
    const svg = document.getElementById('tspCanvas');
    
    // Clear existing cities
    const existingCities = svg.querySelectorAll('.city-group');
    existingCities.forEach(el => el.remove());
    
    // Create city group
    const cityGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    cityGroup.classList.add('city-group');
    
    visualizationCities.forEach((city, index) => {
        // City circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', city.x);
        circle.setAttribute('cy', city.y);
        circle.setAttribute('r', 6);
        circle.setAttribute('fill', '#60A5FA');
        circle.setAttribute('stroke', '#1E40AF');
        circle.setAttribute('stroke-width', 2);
        circle.classList.add('city-node');
        
        cityGroup.appendChild(circle);
        
        // City label (only if showNumbers is true)
        if (showNumbers) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', city.x);
            text.setAttribute('y', city.y - 10);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', 'bold');
            text.textContent = index;
            cityGroup.appendChild(text);
        }
    });
    
    svg.appendChild(cityGroup);
}

// Draw route on SVG
function drawRoute(route) {
    const svg = document.getElementById('tspCanvas');
    
    // Remove existing route
    clearRoute();
    
    if (!route || route.length < 2) return;
    
    // Create route group
    const routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    routeGroup.classList.add('route-group');
    
    // Draw route lines
    for (let i = 0; i < route.length - 1; i++) {
        const city1 = visualizationCities[route[i]];
        const city2 = visualizationCities[route[i + 1]];
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', city1.x);
        line.setAttribute('y1', city1.y);
        line.setAttribute('x2', city2.x);
        line.setAttribute('y2', city2.y);
        line.setAttribute('stroke', '#10B981');
        line.setAttribute('stroke-width', 2);
        line.setAttribute('opacity', 0.8);
        line.classList.add('route-line');
        
        routeGroup.appendChild(line);
    }
    
    // Draw return line
    if (route.length > 2) {
        const firstCity = visualizationCities[route[0]];
        const lastCity = visualizationCities[route[route.length - 1]];
        
        const returnLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        returnLine.setAttribute('x1', lastCity.x);
        returnLine.setAttribute('y1', lastCity.y);
        returnLine.setAttribute('x2', firstCity.x);
        returnLine.setAttribute('y2', firstCity.y);
        returnLine.setAttribute('stroke', '#10B981');
        returnLine.setAttribute('stroke-width', 2);
        returnLine.setAttribute('opacity', 0.8);
        returnLine.setAttribute('stroke-dasharray', '5,5');
        returnLine.classList.add('route-line');
        
        routeGroup.appendChild(returnLine);
    }
    
    svg.appendChild(routeGroup);
}

// Clear route from SVG
function clearRoute() {
    const svg = document.getElementById('tspCanvas');
    const existingRoutes = svg.querySelectorAll('.route-group');
    existingRoutes.forEach(el => el.remove());
}

// Start solving TSP
function startSolving() {
    if (isRunning) return;
    
    if (cities.length < 3) {
        updateStatus('Se necesitan al menos 3 ciudades', 'error');
        return;
    }
    
    isRunning = true;
    optimalFoundTime = null; // Reset optimal time
    setControlsEnabled(false);
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    
    resetTimer();
    startTimer();
    updateStatus('Resolviendo...', 'running');
    
    // Create new worker to ensure clean state
    if (worker) {
        worker.terminate();
    }
    worker = new Worker('solve-worker.js?v=' + Date.now());
    
    worker.onmessage = function(e) {
        handleWorkerMessage(e.data);
    };
    
    worker.onerror = function(error) {
        console.error('Worker error:', error);
        updateStatus('Error en worker', 'error');
        stopSolving();
    };
    
    // Send start message to worker
    worker.postMessage({
        type: 'start',
        id: Date.now().toString(),
        cities: cities,
        maxK: maxK,
        edgeWeightType: currentProblem ? currentProblem.edgeWeightType : 'EUC_2D',
        debug: false
    });
}

// Stop solving
function stopSolving() {
    if (!isRunning) return;
    
    isRunning = false;
    setControlsEnabled(true);
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    
    stopTimer();
    
    // Force terminate worker immediately
    if (worker) {
        worker.terminate();
        worker = null;
    }
    
    updateStatus('Detenido', 'stopped');
}

// Update status display
function updateStatus(message, type = 'ready') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    
    // Update status color
    statusEl.className = 'px-3 py-1 rounded-full text-sm ';
    switch(type) {
        case 'running':
            statusEl.className += 'bg-yellow-600 pulse-soft';
            break;
        case 'success':
            statusEl.className += 'bg-green-600';
            break;
        case 'error':
            statusEl.className += 'bg-red-600';
            break;
        case 'stopped':
            statusEl.className += 'bg-gray-600';
            break;
        default:
            statusEl.className += 'bg-gray-700';
    }
}

// Update cities count
function updateCitiesCount(value) {
    document.getElementById('citiesValue').textContent = value;
    if (!isRunning) {
        generateRandomCities();
    }
}

// Update max K
function updateMaxK(value) {
    maxK = parseInt(value);
    document.getElementById('maxKValue').textContent = maxK;
}

// Reset statistics
function resetStats() {
    currentStats = {
        iteration: 0,
        improvements: 0,
        bestDistance: Infinity,
        currentK: 0,
        bestPossibleDistance: 0,
        optimalDistance: currentStats.optimalDistance
    };
    
    optimalFoundTime = null; // Reset optimal time
    resetTimer();
    
    // Update problem name
    const problemNameEl = document.getElementById('problemName');
    if (currentProblem) {
        problemNameEl.textContent = currentProblem.name;
    } else {
        problemNameEl.textContent = 'Aleatorio';
    }
    
    document.getElementById('iteration').textContent = '0';
    document.getElementById('improvements').textContent = '0';
    document.getElementById('currentK').textContent = '0';
    document.getElementById('bestDistance').textContent = '∞';
    document.getElementById('optimalTime').textContent = '-';
    
    if (currentStats.optimalDistance && currentStats.optimalDistance !== null) {
        document.getElementById('optimalDistance').textContent = currentStats.optimalDistance.toLocaleString('es-ES');
        document.getElementById('deviation').textContent = '∞%';
    } else {
        document.getElementById('optimalDistance').textContent = '-';
        document.getElementById('deviation').textContent = '-';
    }
    
    document.getElementById('progress').textContent = '0%';
    document.getElementById('progressBar').style.width = '0%';
}

// Initialize TSPLIB problems dropdown
function initializeTSPLIBProblems() {
    const select = document.getElementById('tsplibSelect');
    const problems = tspParser.getAvailableProblems();
    
    problems.forEach(problem => {
        const option = document.createElement('option');
        option.value = problem.name;
        option.textContent = `${problem.name} (${problem.cities} ciudades, óptimo: ${problem.optimal})`;
        select.appendChild(option);
    });
}

// Load TSPLIB problem
async function loadTSPLIBProblem(problemName) {
    if (!problemName) return;
    
    if (isRunning) {
        stopSolving();
    }
    
    try {
        updateStatus('Cargando problema TSPLIB...', 'running');
        
        const problem = await tspParser.loadTSPFile(problemName + '.tsp');
        currentProblem = problem;
        cities = problem.originalCities; // Use original coordinates for worker
        visualizationCities = problem.cities; // Use scaled coordinates for visualization
        
        // Update optimal distance
        currentStats.optimalDistance = tspParser.getOptimalSolution(problemName);
        
        // Update UI
        document.getElementById('citiesValue').textContent = cities.length;
        document.getElementById('citiesSlider').value = cities.length;
        
        drawCities();
        clearRoute();
        resetStats();
        
        updateStatus(`Problema cargado: ${problem.name}`, 'success');
        
    } catch (error) {
        console.error('Error loading TSPLIB problem:', error);
        updateStatus('Error cargando problema', 'error');
    }
}

// Toggle info modal
function toggleInfo() {
    const modal = document.getElementById('infoModal');
    modal.classList.toggle('hidden');
}

// Close modal when clicking outside
document.getElementById('infoModal').addEventListener('click', function(e) {
    if (e.target === this) {
        toggleInfo();
    }
});
