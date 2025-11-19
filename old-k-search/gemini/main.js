// main.js

document.addEventListener('DOMContentLoaded', () => {
    // Configuración inicial (podría venir de inputs o ser fija)
    const initialSolverConfig = {
        nearestCitiesCount: 5 // Valor por defecto si el input no está seteado
    };
    const initialDrawerConfig = {
        showNumbers: true,
        showArrows: true
    };

    const tspSolver = new TSPSolver(initialSolverConfig);
    const tspDrawer = new TSPDrawer('tspCanvas', initialDrawerConfig);
    const uiController = new UIController(tspSolver, tspDrawer);

    // Carga inicial de ciudades si hay algo en el textarea (opcional)
    // uiController.handleLoadCitiesFromTextarea(); // Descomentar si se quiere cargar al inicio

    uiController.logEvent("Aplicación TSP iniciada. Lista para añadir ciudades.");
    uiController.redrawAll(); // Dibujo inicial (canvas vacío)
});