# Documentación de k-Alternatives

Bienvenido al índice de documentación del proyecto **k-Alternatives**. Aquí se
agrupan los análisis matemáticos, guías de usuario, especificaciones técnicas
del algoritmo y planes de remediación académica.

---

## 📚 Índice de Documentos

### 1. Fundamentos Teóricos y Matemáticos

- **[Análisis Algorítmico y Modelado](analisis-algoritmico-alternativas.md)**:
  Estudio empírico y derivación de curvas sigmoides $P(N, k)$, decaimiento del
  error y análisis de escalamiento estocástico sobre problemas TSPLIB.
- **[Puente entre k-Alternatives y Descenso del Gradiente](puente-gradiente-k-alternatives.md)**:
  Demostración de la equivalencia entre el reordenamiento heurístico
  `_moveToFront` y un paso de _Exponentiated Gradient / Mirror Descent_ con
  divergencia KL, junto con la interpretación de $k$ como temperatura cuantizada
  ($\tau$) y conexión con _blackbox differentiation_.
- **[Propuesta de Integración con Redes Neuronales](propuesta-integracion-redes-neuronales.md)**:
  Diseño conceptual de vías de integración continua (GNN prior, in-instance
  gradient y zero-order estructurado).

### 2. Implementación y Uso

- **[Algoritmo TSP (k-Deviation Search)](tsp-algorithm.md)**: Explicación de la
  arquitectura interna de `TSPSolver`, estructuras de datos y lazo de búsqueda
  adaptativa.
- **[Guía de la CLI](README-CLI.md)**: Manual detallado para resolver instancias
  y ejecutar benchmarks masivos desde la consola.
- **[Información sobre TSPLIB](TSPLIB_INFO.md)**: Detalle del conjunto de
  instancias estándar de TSPLIB incluidas en el repositorio y formatos
  soportados.

### 3. Rigor Científico y Plan de Publicación

- **[Auditoría Integral y Plan de Remediación](auditoria-y-plan-remediacion.md)**:
  Auditoría exhaustiva de novedad frente a la literatura (LDS, MTF, LRTA\*),
  resolución de discrepancias, rigor experimental y checklist para publicación
  académica.
- **[Plan de Análisis Estadístico](statistical-analysis-plan.md)**: Plan
  metodológico para muestreos, intervalos de confianza y ablaciones controladas.
