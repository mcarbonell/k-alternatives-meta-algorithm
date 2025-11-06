# k-Alternatives TSP CLI

Interfaz de línea de comandos para el algoritmo k-Alternatives de optimización del TSP (Traveling Salesman Problem).

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd k-alternatives

# O instalar globalmente (si se publica en npm)
npm install -g k-alternatives-tsp
```

## 📖 Uso Básico

### Resolver un problema individual

```bash
# Usar Node.js directamente
node k-alternatives-cli.js tsplib/berlin52.tsp

# Si está instalado globalmente
k-alternatives tsplib/berlin52.tsp
```

### Ejecutar benchmarks masivos

```bash
# Benchmark de problemas pequeños
npm run benchmark:small

# Benchmark de problemas medianos  
npm run benchmark:medium

# Benchmark rápido (K=3)
npm run benchmark:fast

# Benchmark exhaustivo (K=7)
npm run benchmark:thorough

# Benchmark personalizado
node benchmark.js [conjunto] [configuración]
```

## ⚙️ Opciones de Línea de Comandos

### Opciones del solver

```bash
node k-alternatives-cli.js <archivo.tsp> [opciones]

Opciones:
  --maxK N         Máximo valor de K (default: log(n))
  --debug          Modo verbose con información detallada
  --output file    Guardar resultados en archivo JSON
```

### Conjuntos de problemas para benchmarks

- `small` - Problemas pequeños (50-80 ciudades)
- `medium` - Problemas medianos (100-150 ciudades)  
- `large` - Problemas grandes (150-200 ciudades)
- `xlarge` - Problemas extra grandes (200+ ciudades)
- `all` - Todos los problemas pequeños y medianos

### Configuraciones de benchmark

- `fast` - Rápido (K=3)
- `balanced` - Equilibrado (K=5) - default
- `thorough` - Exhaustivo (K=7)

## 📊 Ejemplos de Uso

### 1. Resolver berlin52 con configuración personalizada

```bash
node k-alternatives-cli.js tsplib/berlin52.tsp --maxK 5 --debug
```

Salida esperada:
```
🚀 Resolviendo tsplib/berlin52.tsp con k-alternatives (maxK=5)
[00:01] Iter: 1,234,567, Improvements: 12, K: 2, Best: 7,542, Optimal: 7542, Dev: 0.00%, OptimalTime: 45s

🎯 SOLUCIÓN FINAL:
Problema: berlin52
Distancia: 7,542
Óptimo: 7542
Desviación: 0.00%
Tiempo total: 47s
Tiempo óptimo: 45s
Iteraciones: 2,576,808
Mejoras: 44
K final: 3
```

### 2. Benchmark masivo con salida JSON

```bash
node k-alternatives-cli.js --batch tsplib/ --maxK 5 --output results.json
```

### 3. Benchmark automatizado con reporte

```bash
node benchmark.js small balanced
```

Genera:
- `benchmark-results-small-balanced-2024-11-06T12-00-000-.json` - Datos detallados
- `benchmark-results-small-balanced-2224-11-06T12-00o o.md` - Reporte Markdown

## 📋 Formatos de Salida

### Salida en consola
- Tiempo real de ejecución
- Métricas de progreso cada 100,000 iteraciones
- Resumen final con todas las estadísticas

### Archivo JSON
```json
{
  "problem": "berlin52",
  "distance": 7542,
  "optimal": 7542,
  "deviation": 0.0,
  "totalTime": 47,
  "optimalTime": 45,
  "iterations": 2576808,
  "improvements": 44,
  "route": [0, 23, 45, 12, 7, ...]
}
```

### Reporte Markdown
- Tablas con resultados detallados
- Estadísticas agregadas
- Métricas de rendimiento
- Análisis de problemas fallidos

## 🎯 Scripts Disponibles

```bash
# Scripts npm
npm start                    # Muestra ayuda
npm test                     # Prueba rápida con berlin52
npm run benchmark            # Benchmark completo
npm run benchmark:small      # Problemas pequeños
npm run benchmark:medium     # Problemas medianos  
npm run benchmark:fast       # Configuración rápida
npm run benchmark:thorough   # Configuración exhaustiva
npm run help                 # Muestra ayuda
```

## 📁 Estructura de Archivos

```
k-alternatives/
├── k-alternatives-cli.js    # CLI principal
├── benchmark.js             # Suite de benchmarks
├── package.json             # Configuración npm
├── README-CLI.md            # Esta documentación
├── tsplib/                  # Problemas TSPLIB
│   ├── berlin52.tsp
│   ├── eil51.tsp
│   └── ...
└── results/                 # Resultados generados
    ├── benchmark-*.json
    └── benchmark-*.md
```

## 🔧 Requisitos Técnicos

- **Node.js** >= 12.0.0
- **Memoria RAM**: 512MB+ (depende del tamaño del problema)
- **Procesador**: Multi-core recomendado para benchmarks

## 📈 Métricas Disponibles

- **Distance**: Distancia total de la ruta encontrada
- **Optimal**: Distancia óptima conocida (si está disponible)
- **Deviation**: Desviación porcentual del óptimo
- **Total Time**: Tiempo total de ejecución
- **Optimal Time**: Tiempo en que se encontró el óptimo
- **Iterations**: Número total de iteraciones
- **Improvements**: Número de mejoras encontradas
- **Route**: Ruta óptima encontrada

## 🏆 Ejemplos de Rendimiento

| Problema | Ciudades | Distancia | Óptimo | Desviación | Tiempo |
|----------|----------|-----------|--------|------------|--------|
| berlin52 | 52       | 7,542     | 7,542  | 0.00%      | 3s     |
| eil51    | 51       | 426       | 426    | 0.00%      | 2s     |
| pr76     | 76       | 108,159   | 108,159| 0.00%      | 7s     |
| kroA100  | 100      | 21,282    | 21,282 | 0.00%      | 15s    |

## 🐛 Solución de Problemas

### Problemas comunes

1. **"Archivo no encontrado"**
   - Verifica que el archivo .tsp exista en la ruta especificada
   - Usa rutas relativas desde el directorio del proyecto

2. **"Memoria insuficiente"**
   - Reduce el valor de `--maxK`
   - Usa problemas más pequeños

3. **"Tiempo de ejecución excesivo"**
   - Usa la configuración `fast` (K=3)
   - Limita el número de problemas en benchmarks

### Modo debug

```bash
node k-alternatives-cli.js tsplib/berlin52.tsp --debug
```

Proporciona información detallada sobre:
- Progreso cada 100,000 iteraciones
- Estado de las heurísticas locales
- Detalles de convergencia

## 📚 Referencias

- **TSPLIB**: http://comopt.ifi.uni-heidelberg.de/software/TSPLIB95/
- **k-Alternatives Algorithm**: Documentación en `k-alternatives-memory-bank/`

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

---

**Autor**: Mario Raúl Carbonell Martínez  
**Versión**: 1.0.0  
**Fecha**: Noviembre 2024
