// tsp-drawer.js

class TSPDrawer {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas con ID "${canvasId}" no encontrado.`);
        this.ctx = this.canvas.getContext('2d');

        this.config = {
            cityRadius: 4,
            cityColor: 'red',
            cityLabelColor: 'black',
            cityLabelFont: '12px Arial',
            tourColor: 'blue',
            tourLineWidth: 1.5,
            arrowSize: 8,
            convexHullColor: 'green',
            convexHullLineWidth: 2,
            showNumbers: config.showNumbers !== undefined ? config.showNumbers : true,
            showArrows: config.showArrows !== undefined ? config.showArrows : true,
        };
    }

    updateDrawingConfig(newConfig) {
        if (newConfig.showNumbers !== undefined) this.config.showNumbers = newConfig.showNumbers;
        if (newConfig.showArrows !== undefined) this.config.showArrows = newConfig.showArrows;
        // Podríamos añadir más configuraciones aquí (colores, tamaños)
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawCities(cities) {
        this.ctx.fillStyle = this.config.cityColor;
        cities.forEach((city, index) => {
            this.ctx.beginPath();
            this.ctx.arc(city.x, city.y, this.config.cityRadius, 0, 2 * Math.PI);
            this.ctx.fill();

            if (this.config.showNumbers) {
                this.ctx.fillStyle = this.config.cityLabelColor;
                this.ctx.font = this.config.cityLabelFont;
                this.ctx.fillText(city.id !== undefined ? city.id : index, city.x + 7, city.y + 7);
            }
        });
    }

    drawTour(cities, nextInTour) {
        if (!cities || cities.length < 2 || !nextInTour || nextInTour.length === 0) return;

        this.ctx.strokeStyle = this.config.tourColor;
        this.ctx.lineWidth = this.config.tourLineWidth;
        this.ctx.beginPath();

        let currentCityIndex = 0; // Asumimos que el tour empieza o incluye la ciudad 0 si existe
        if (!cities[currentCityIndex]) return; // No hay ciudad 0

        this.ctx.moveTo(cities[currentCityIndex].x, cities[currentCityIndex].y);

        for (let i = 0; i < cities.length; i++) {
            const nextCityIndex = nextInTour[currentCityIndex];
            if (nextCityIndex === undefined || !cities[nextCityIndex]) {
                 // console.warn(`Índice siguiente no válido: ${nextCityIndex} desde ${currentCityIndex}. Ciudades: ${cities.length}, Tour:`, nextInTour);
                break; // Romper si hay un enlace inválido
            }
            const fromCity = cities[currentCityIndex];
            const toCity = cities[nextCityIndex];

            if (this.config.showArrows) {
                this._drawArrow(fromCity, toCity);
            } else {
                this.ctx.lineTo(toCity.x, toCity.y);
            }
            currentCityIndex = nextCityIndex;
            if (currentCityIndex === 0 && i < cities.length -1) {
                // Si vuelve al inicio antes de recorrer todas, es un tour completo.
                // Si queremos asegurar que dibuje todas las aristas, necesitaríamos asegurar
                // que el bucle no termine prematuramente si 0 no es el "último" visitado antes de cerrar.
                // Para este caso, si vuelve a 0, el ciclo está completo.
            }
        }
        if (!this.config.showArrows) { // Si no hay flechas, trazar la línea completa al final
            this.ctx.stroke();
        }
    }

    _drawArrow(cityA, cityB) {
        const dx = cityB.x - cityA.x;
        const dy = cityB.y - cityA.y;
        const angle = Math.atan2(dy, dx);
        const headLength = this.config.arrowSize;

        // Línea principal
        this.ctx.beginPath(); // Iniciar un nuevo path para cada flecha para aplicar stroke individual
        this.ctx.moveTo(cityA.x, cityA.y);
        this.ctx.lineTo(cityB.x, cityB.y);
        this.ctx.stroke(); // Trazar la línea

        // Cabeza de la flecha
        this.ctx.beginPath(); // Nuevo path para la cabeza
        this.ctx.moveTo(cityB.x, cityB.y);
        this.ctx.lineTo(cityB.x - headLength * Math.cos(angle - Math.PI / 6), cityB.y - headLength * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(cityB.x, cityB.y);
        this.ctx.lineTo(cityB.x - headLength * Math.cos(angle + Math.PI / 6), cityB.y - headLength * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke(); // Trazar la cabeza
    }

    drawConvexHull(hullPoints) {
        if (!hullPoints || hullPoints.length < 3) return;

        this.ctx.strokeStyle = this.config.convexHullColor;
        this.ctx.lineWidth = this.config.convexHullLineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(hullPoints[0].x, hullPoints[0].y);
        for (let i = 1; i < hullPoints.length; i++) {
            this.ctx.lineTo(hullPoints[i].x, hullPoints[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }
}