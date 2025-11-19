# Cartografía de Mínimos Locales: Análisis Estadístico de k-Alternatives

## 1. Objetivo
El objetivo es caracterizar el comportamiento estocástico del algoritmo **k-Alternatives** para entender la topología del espacio de búsqueda que explora. Dado que el algoritmo utiliza un ordenamiento aleatorio de ciudades en cada paso iterativo, diferentes ejecuciones pueden converger en diferentes mínimos locales. 

Este estudio pretende cuantificar:
1. La **probabilidad de éxito** (encontrar el óptimo global) en función de $N$ (tamaño del problema) y $k$ (profundidad de desviación).
2. La **distribución de mínimos locales** para identificar cuán "rugoso" es el paisaje de búsqueda para un $k$ dado.
3. La **estabilidad** de la solución (desviación estándar del error).

## 2. Metodología Experimental

### 2.1. Conjunto de Datos (Dataset)
Se utilizarán instancias estándar de TSPLIB con óptimos conocidos para calcular el "Gap" (brecha) exacto.
*   **Pequeños ($N < 30$):** `burma14`, `ulysses16`, `fri26`, `bays29`.
*   **Medianos ($30 \le N < 100$):** `berlin52`, `eil51`, `st70`, `eil76`, `pr76`.
*   **Grandes ($N \ge 100$):** `kroA100`, `ch130`.

### 2.2. Variables
*   **Variables Independientes:**
    *   **Problema ($P$):** Instancia específica.
    *   **Nivel de Desviación ($k$):** Se probarán valores fijos $k \in \{1, 2, 3, 4, 5\}$.
*   **Constantes:**
    *   **Repeticiones ($R$):** 100 ejecuciones independientes por configuración $(P, k)$.
    *   **Tiempo Límite:** Suficiente para asegurar convergencia (ej. 5s para pequeños, 30s para grandes).
*   **Variables Dependientes (Métricas):**
    *   **Tasa de Éxito (SR):** % de ejecuciones que alcanzan el óptimo global.
    *   **Error Relativo Medio (MRE):** Promedio del porcentaje de desviación sobre el óptimo.
    *   **Entropía de Soluciones:** Número de mínimos locales únicos encontrados.

### 2.3. Procedimiento de Análisis
Para cada par $(Problema, k)$:
1.  Ejecutar el algoritmo $R$ veces partiendo de semillas aleatorias distintas.
2.  Almacenar el valor de la mejor ruta encontrada en cada ejecución.
3.  Construir un **Histograma de Frecuencias** de los costos encontrados.

### 3. Hipótesis a Validar
1.  **Hipótesis de Convergencia:** Para cada problema existe un $k_{crit}$ tal que para todo $k \ge k_{crit}$, la Tasa de Éxito se acerca al 100%.
2.  **Hipótesis de Rugosidad:** Para $k$ bajos ($k=1, 2$), la distribución de mínimos locales es amplia (muchos picos). Al aumentar $k$, la distribución colapsa hacia el óptimo.
3.  **Ley de Rendimientos Decrecientes:** El tiempo necesario para converger crece exponencialmente con $k$, pero la ganancia en reducción de error es marginal una vez superado el $k_{crit}$.

## 4. Herramienta de Análisis
Se desarrollará un script `stats-benchmark.js` que automatice la ejecución masiva y genere un reporte JSON/CSV con la siguiente estructura:

```json
{
  "problem": "berlin52",
  "k": 3,
  "runs": 100,
  "optimal": 7542,
  "results": {
    "successRate": 45.0, // %
    "meanGap": 0.85, // %
    "stdDev": 120.5,
    "uniqueSolutions": 12,
    "distribution": {
      "7542": 45,
      "7580": 10,
      "7715": 30,
      ...
    }
  }
}
```
