# k-Alternatives Pathfinding
**Autor:** Mario Raúl Carbonell Martínez

## Introducción

El algoritmo **k-Alternatives Pathfinding** es una adaptación novedosa del framework de optimización combinatoria "k-alternativas" (basado en *Limited Discrepancy Search* o LDS) al problema de búsqueda de caminos (Pathfinding) en grafos y rejillas.

Combina la velocidad y eficiencia de memoria de una búsqueda en profundidad (DFS) greedy con la capacidad de garantizar optimalidad y escapar de mínimos locales mediante un presupuesto controlado de desviaciones ($k$) y un mecanismo de aprendizaje heurístico inspirado en *Learning Real-Time A\** (LRTA*).

## Conceptos Clave

### 1. Búsqueda Base (DFS Greedy)
A diferencia de A*, que mantiene una frontera abierta de nodos a explorar, este algoritmo se "compromete" con una ruta en profundidad. En cada paso, selecciona el siguiente nodo basándose en una función de coste $f(n) = g(n) + h(n)$.
*   **$g(n)$:** Coste real desde el inicio hasta el nodo actual.
*   **$h(n)$:** Coste estimado (heurística) desde el nodo actual al objetivo. Inicialmente puede ser la distancia Manhattan u otra métrica admisible.

### 2. Presupuesto de Desviaciones ($k$)
El algoritmo introduce un parámetro $k$ que representa el número máximo de veces que se permite elegir una opción "no óptima" (según la heurística local) en una sola ruta completa.
*   **k=0:** Búsqueda puramente Greedy. Siempre elige el mejor vecino.
*   **k>0:** Permite tomar desviaciones. Elegir el 2º mejor vecino cuesta 1 alternativa ($k-1$). Elegir el 3º cuesta 2, etc.

Esto permite explorar sistemáticamente el vecindario de la solución greedy sin la explosión combinatoria de una búsqueda exhaustiva.

### 3. Aprendizaje Heurístico ($h(n)$ Dinámico)
Esta es la característica más potente. Cuando el algoritmo encuentra un camino válido al objetivo:
1.  Calcula el coste real exacto desde cada nodo del camino hasta el objetivo.
2.  Actualiza (aprende) el valor $h(n)$ de esos nodos con este coste real.
3.  **Persistencia:** En futuras iteraciones (o búsquedas subsiguientes), estos nodos tienen un coste $h(n)$ perfecto, lo que guía al algoritmo greedy ($k=0$) directamente por la mejor ruta conocida sin gastar presupuesto de búsqueda.

### 4. Poda por Coste
Para mantener la eficiencia, el algoritmo mantiene el coste de la mejor solución completa encontrada hasta el momento (`bestCost`).
*   Si en cualquier punto de una exploración, el coste actual $g(n)$ supera o iguala a `bestCost`, esa rama se poda inmediatamente. Esto garantiza que solo se exploren caminos que tengan el potencial de ser mejores que el actual.

## Algoritmo Paso a Paso

1.  **Inicialización:**
    *   Establecer $h(n)$ inicial (ej. Manhattan) para todos los nodos.
    *   `bestCost` = $\infty$.
    *   $k = 0$.

2.  **Bucle Iterativo ($k$):**
    *   Mientras $k \le maxK$:
        1.  Iniciar búsqueda DFS desde el nodo Origen con presupuesto $k$.
        2.  En cada nodo $u$:
            *   Ordenar vecinos por $f(v) = g(v) + h(v)$.
            *   Iterar vecinos:
                *   Vecino 1 (Mejor): Coste 0k.
                *   Vecino 2: Coste 1k.
                *   ...
            *   Si presupuesto $k \ge coste\_vecino$, descender recursivamente.
        3.  **Si se encuentra el Objetivo:**
            *   Calcular coste total.
            *   Si es mejor que `bestCost`:
                *   Actualizar `bestCost`.
                *   **Aprender:** Recorrer el camino hacia atrás y actualizar $h(n)$ de los nodos visitados con su coste real remanente.
                *   **Reiniciar:** Volver a ejecutar la búsqueda con el **mismo $k$** (ahora guiada por la nueva heurística aprendida).
        4.  Si la búsqueda termina sin mejorar `bestCost`, incrementar $k$.

## Análisis de Complejidad

### Complejidad Espacial
*   **Muy Eficiente:** $O(N)$ donde $N$ es el número de nodos del mapa.
    *   Requiere almacenar la matriz/tabla de $h(n)$.
    *   No utiliza colas de prioridad (Open Set) que pueden crecer exponencialmente en A*.
    *   La pila de recursión es proporcional a la longitud del camino ($O(D)$), insignificante comparado con el mapa.
*   **Optimización:** Para mapas muy grandes y dispersos, $h(n)$ puede almacenarse en un Hash Map, reduciendo el uso de memoria solo a los nodos visitados.

### Complejidad Temporal
*   **Primera Solución:** Muy rápida (similar a Greedy Best-First Search). Encuentra *un* camino casi instantáneamente.
*   **Convergencia a Óptimo:**
    *   Depende de la complejidad del mapa y el factor de ramificación.
    *   Gracias a la **Poda por Coste** y al **Aprendizaje**, el espacio de búsqueda efectivo se reduce drásticamente tras encontrar la primera solución decente.
    *   En el peor caso teórico (sin aprendizaje efectivo), sería $O(N^{k+1})$, pero en la práctica se comporta mucho mejor debido a las podas.

## Comparativa con A*

| Característica | A* (Standard) | k-Alternatives Pathfinding |
| :--- | :--- | :--- |
| **Enfoque** | Best-First (Frontera Global) | Depth-First (Iterativo con k) |
| **Memoria** | Alta (Open Set crece mucho) | Baja / Constante ($O(N)$ para mapa) |
| **Primera Solución** | Lenta (si heurística no es perfecta) | Muy Rápida (Greedy) |
| **Optimalidad** | Garantizada (si h es admisible) | Garantizada (al agotar maxK o convergencia) |
| **Reutilización** | Difícil (Open Set es efímero) | Excelente (Matriz $h(n)$ mejora con el tiempo) |
| **Caso de Uso Ideal** | Mapas estáticos, memoria abundante | Mapas grandes, memoria limitada, respuesta rápida |

## Heurística Pesimista vs. Optimista

El algoritmo soporta dos filosofías de inicialización para $h(n)$:

1.  **Optimista (Manhattan/Euclídea):** 
    *   Fomenta la exploración. El algoritmo "cree" que puede haber atajos a través de lo desconocido.

2.  **Pesimista (Manhattan + Penalización):** 
    *   Fomenta la explotación ("Quédate en el camino conocido").
    *   Solo explora nuevas rutas si se le fuerza mediante el presupuesto $k$.
    *   Útil para estabilizar rutas en entornos dinámicos o adherirse a un "camino seguro".


Este algoritmo es especialmente interesante para aplicaciones donde se requiere un balance óptimo entre **rendimiento**, **uso de memoria** y **calidad de soluciones**:

## Casos de Uso Específicos

### 1. **Videojuegos y Simulaciones en Tiempo Real**
- **Requisitos:** 60+ FPS, latencia < 16ms, memoria < 512MB
- **Ventajas del k-Alternatives:**
  - Búsqueda determinística con presupuesto controlado `k`
  - Aprendizaje persistente entre frames reduce exploración redundante
  - Adaptación automática a obstáculos dinámicos (NPCs, jugadores)
- **Ejemplos específicos:**
  - RTS: Unidades moviéndose por mapas con obstáculos cambiantes
  - MMORPG: NPCs con pathfinding adaptativo
  - Simuladores: Vehículos con rutas optimizadas en tiempo real

### 2. **Sistemas Embebidos y Dispositivos Móviles**
- **Limitaciones:** CPU < 1GHz, RAM < 256MB, batería limitada
- **Optimizaciones k-Alternatives:**
  - `k=0` para navegación básica (greedy sin desviaciones)
  - Memoria heurística learn-and-reuse reduce cómputo futuro
  - Complejidad O(bᵏ·d) vs O(bᵈ) de BFS/Dijkstra
- **Aplicaciones típicas:**
  - GPS para vehículos con POIs dinámicos
  - Robots domésticos con mapeo incremental
  - Wearables con navegación paso a paso

### 3. **Mapas y Entornos Dinámicos**
- **Desafíos:** Obstáculos en movimiento, cambios topológicos frecuentes
- **Capacidades del algoritmo:**
  - **Aprendizaje incremental:** `h(n)` se actualiza con costes reales encontrados
  - **Adaptabilidad:** Reutilización inteligente de conocimiento previo
  - **Estabilidad:** El presupuesto `k` previene exploraciones explosivas
- **Ejemplos prácticos:**
  - **Smart Cities:** Rutas de delivery con tráfico variable
  - **Logística:** Almacenes con estanterías móviles
  - **Simulación:** Entornos virtuales con física realista

### 4. **Búsquedas Repetidas y Optimización Iterativa**
- **Patrón:** Múltiples queries en el mismo espacio de búsqueda
- **Ventajas competitivas:**
  - **Learning Curve:** Cada búsqueda mejora la siguiente (h(n) optimizada)
  - **Convergencia:** El tiempo promedio mejora exponencialmente
  - **Consistencia:** Soluciones más estables que métodos estocásticos
- **Escenarios reales:**
  - **Planificación de rutas:** Empresas de transporte con rutas fijas
  - **Navegación web:** Algoritmos de recomendación espacial
  - **Análisis de datos:** Clustering geográfico iterativo

## Métricas de Rendimiento Esperadas

| Escenario | Memoria | Tiempo CPU | Calidad vs. A* |
|-----------|---------|------------|----------------|
| Gaming 2D | ~50KB | <1ms | 95-98% |
| GPS urbano | ~200KB | 2-5ms | 90-95% |
| Embebido | ~10KB | <0.5ms | 85-90% |

*Valores típicos con k≤3 para mapas de 1000-10000 nodos*


## Ejemplo Interactivo
Hay un ejemplo interactivo con código y visualización en pathfinding-k-alternatives.html
