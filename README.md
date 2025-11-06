# k-Alternatives Optimization Framework

🚀 **Un framework metaheurístico para resolver problemas de optimización combinatoria (TSP, Knapsack, etc.)**

Autor: Mario Raúl Carbonell Martínez  
Versión: 2.1.0

## 📋 Tabla de Contenidos

- [🎯 Descripción](#-descripción)
- [✨ Características](#-características)
- [🏗️ Arquitectura](#️-arquitectura)
- [🚀 Instalación](#-instalación)
- [💻 Uso](#-uso)
- [📚 Documentación de API](#-documentación-de-api)
- [🤝 Contribución](#-contribución)
- [📄 Licencia](#-licencia)

## 🎯 Descripción

**k-Alternatives** es un innovador framework de optimización basado en el meta-algoritmo de búsqueda con k-desviaciones. Combina búsqueda sistemática con aprendizaje adaptativo para resolver de forma eficiente una gran variedad de problemas de optimización combinatoria.

Este proyecto ha evolucionado de ser un solver específico para el **Problema del Viajante (TSP)** a un framework genérico que puede ser extendido para resolver otros problemas como el **Problema de la Mochila (Knapsack)** y más.

### 🧠 ¿Cómo Funciona?

1. **Heurística Local Inicial**: Se parte de una solución greedy basada en una heurística específica del problema (ej. ratio valor/peso para Knapsack, distancia para TSP).
2. **Búsqueda Sistemática por Desviaciones**: En lugar de seguir siempre la mejor opción heurística, el algoritmo explora de forma controlada hasta `k` desviaciones de la ruta ideal.
3. **Aprendizaje Adaptativo**: Las secuencias de decisiones que llevan a mejores soluciones son reforzadas, haciendo que el algoritmo aprenda y mejore su heurística local.

## ✨ Características

### 🎯 **Características Principales**
- ⭐ **Meta-Algoritmo Genérico**: El motor `KDeviationOptimizer` es agnóstico al problema.
- 🧩 **Implementaciones Específicas**: Incluye solvers listos para usar para TSP (`TSPSolver`) y Knapsack (`KnapsackSolver`).
- ⚡ **Alta Performance**: Encuentra óptimos o soluciones casi-óptimas en problemas estándar rápidamente.
- 🎛️ **Configurable**: Parámetros ajustables (`maxK`, `maxTime`, etc.) para controlar la profundidad y duración de la búsqueda.
- 🎯 **Parada Inteligente**: Se detiene automáticamente al encontrar óptimos conocidos.
- 🛠️ **Extensible**: Diseñado para que puedas añadir solvers para tus propios problemas de optimización.

## 🏗️ Arquitectura

La nueva arquitectura separa el motor del algoritmo de las implementaciones específicas:

```
k-alternatives/
├── 📁 Core Framework
│   └── k-optimizer.js             # Motor genérico del algoritmo (KDeviationOptimizer)
├── 📁 Implementations
│   ├── k-alternatives-core.js     # Implementación para TSP (TSPSolver)
│   └── knapsack-solver.js         # Implementación para Knapsack (KnapsackSolver)
├── 📁 Examples (CLI & Web)
│   ├── k-alternatives-cli.js      # CLI de ejemplo para el solver de TSP
│   └── index.html                 # Interfaz web de ejemplo para el solver de TSP
├── 📁 Data
│   ├── tsplib/                    # Problemas TSPLIB originales
│   └── tsplib-json/               # Problemas convertidos a JSON
└── 📁 Tests
    ├── k-alternatives-core.spec.js  # Tests para TSPSolver
    └── knapsack-solver.spec.js    # Tests para KnapsackSolver
```

## 🚀 Instalación

### 📋 **Requisitos Previos**
- Node.js 14.0 o superior
- NPM (incluido con Node.js)

### 🔧 **Instalación Rápida**
```bash
# Clonar el repositorio
git clone <repository-url>
cd k-alternatives

# Instalar dependencias (incluye vitest para testing)
npm install

# Verificar la instalación ejecutando los tests
npm test
```

## 💻 Uso

El uso principal del framework es programático, a través de sus clases. Se incluyen ejemplos de CLI y web para el problema de TSP.

### 📊 **Referencia de API**

El framework se consume importando la clase del solver que necesites.

#### **Ejemplo 1: Resolver un Problema del Viajante (TSP)**

```javascript
const { TSPSolver } = require('./k-alternatives-core.js');
const tspProblem = require('./tsplib-json/berlin52.json');

const solver = new TSPSolver({
    maxK: 5,
    stopAtOptimal: true,
    onSolution: (result) => {
        console.log('¡Solución TSP encontrada!');
        console.log(`Distancia: ${result.distance} (Óptimo: ${result.optimal})`);
    }
});

// Iniciar el solver con los datos del problema
solver.start(tspProblem);
```

#### **Ejemplo 2: Resolver un Problema de la Mochila (Knapsack)**

```javascript
const { KnapsackSolver } = require('./knapsack-solver.js');

const knapsackProblem = {
    items: [
      { v: 10, w: 5 }, { v: 40, w: 4 },
      { v: 30, w: 6 }, { v: 50, w: 3 },
    ],
    maxWeight: 15,
    optimalValue: 120
};

const solver = new KnapsackSolver({
    maxK: 3,
    stopAtOptimal: true,
    onSolution: (result) => {
        console.log('¡Solución Knapsack encontrada!');
        console.log(`Valor: ${result.value} (Óptimo: ${result.optimal})`);
    }
});

// Iniciar el solver con los datos del problema
solver.start(knapsackProblem);
```

## 🤝 Contribución

### 🛠️ **Cómo Contribuir**

1. **Fork** el repositorio
2. Crear rama de feature (`git checkout -b feature/amazing-feature`)
3. Hacer commit de cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir **Pull Request**

### 🐛 **Reporte de Issues**

- Usar plantillas de issues proporcionadas
- Incluir información del sistema
- Proporcionar ejemplos reproducibles
- Adjuntar archivos de log si es posible

### ✅ **Guía de Estilo**

- JavaScript ES6+ con comentarios JSDoc
- Nombres descriptivos en inglés
- Indentación de 2 espacios
- Tests para nuevas funcionalidades

### 🧪 **Testing**

```bash
# Ejecutar tests
npm test

# Tests de rendimiento
npm run benchmark

# Tests de integración
npm run test:all
```

## 📄 Licencia

Este proyecto está licenciado bajo la **Licencia MIT** - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- **TSPLIB** - Biblioteca estándar de problemas TSP
- **Comunidad JavaScript** - Herramientas y librerías
- **Contribuidores** - Todas las personas que han mejorado este proyecto

## 📞 Contacto

- **Autor**: Mario Raúl Carbonell Martínez
- **Email**: [tu-email@ejemplo.com]
- **GitHub**: [mcarbonell]
- **Issues**: [GitHub Issues](https://github.com/mcarbonell/k-alternatives/issues)

---

⭐ **Si este proyecto te es útil, ¡considera darle una estrella!** 🚀

**Última actualización**: Noviembre 2025
**Versión**: 2.0.0
