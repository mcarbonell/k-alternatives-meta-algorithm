# TSP “Engine-Style”: DFS + (I)LDS + aprendizaje de heurística + TT global + patch-cache por ventana deslizante

Documento de diseño para implementar un solver experimental del **TSP/ATSP**
inspirado en motores de ajedrez:

- búsqueda **DFS** constructiva (con backtracking),
- **(I)LDS** (Limited Discrepancy Search / Improved LDS) como “profundidad
  iterativa” por discrepancias,
- **aprendizaje de ordenación de movimientos** (tipo history/killer adaptado a
  TSP),
- **tabla de transposición global** (estado tipo Held–Karp:
  `(visitadas, last)`),
- **patch routing** (reparación/mejora local) con **ventana deslizante** y cache
  de subrutas con endpoints,
- mejoras opcionales: **candidate lists**, **cotas inferiores** (1-tree/MST en
  simétrico; assignment/cycle-cover en ATSP), y telemetría.

El objetivo no es “el mejor solver del mundo”, sino un marco claro para
experimentar con ideas y medir su impacto.

---

## 1) Problema y entradas/salidas

### 1.1 Problema

Dado un conjunto de `N` ciudades y una función de coste `w(i,j)` (matriz
completa o derivada de coordenadas), encontrar un tour Hamiltoniano mínimo:

```
t = [t1..tN]
cost(t) = Σ w(tk, t{k+1}) + w(tN, t1)
```

### 1.2 Entrada

- Instancia TSP/ATSP (idealmente TSPLIB):
    - simétrica o asimétrica,
    - métrica o general (sin asumir desigualdad triangular).

### 1.3 Salida

- Mejor tour encontrado (perm. de `N` nodos).
- Coste del tour.
- Estadísticas (nodos expandidos, hits de TT, parches aplicados, tiempo a mejor,
  etc.).

---

## 2) Ideas clave (intuición)

1. **DFS constructivo**: construyes un camino `start -> ... -> last` hasta
   visitar todo y cerrar el ciclo.
2. **Ordenación heurística**: en cada nodo de búsqueda, expandes candidatos en
   un orden (por distancia u otra heurística).
3. **Discrepancias (LDS/ILDS)**: permites desviarte del “mejor movimiento” un
   máximo `D` veces. Iteras `D=0..Dmax`.
4. **Aprendizaje**: cuando encuentras un tour bueno, refuerzas decisiones
   (aristas / transiciones) para que futuras búsquedas lo reproduzcan con menos
   discrepancias.
5. **TT global**: evitas recomputación/poda por dominancia si llegas a
   `(visitadas, last)` con peor coste que antes.
6. **Patch-cache**: cuando el prefijo tiene longitud ≥ `m`, intentas mejorar el
   último bloque de `m` nodos manteniendo endpoints fijos; cacheas “mejor orden
   interno” para reusar.

---

## 3) Representación del estado

Asumimos un `start` fijo (p. ej. 1). El estado durante DFS:

- `path[0..depth]` (lista de nodos; `path[0]=start`, `path[depth]=last`)
- `visited` (bitset de N bits o boolean array)
- `g` (coste acumulado del prefijo)
- `D_used` (discrepancias usadas hasta aquí)
- (opcional) `hash_state` incremental (Zobrist)

**Nota**: El estado “canónico” para TT global suele ser:

- `S = visited_set`
- `last = path[depth]`

En simétrico, `start` fijo evita ambigüedad; en general, puedes incluir `start`
en la key si lo cambias.

---

## 4) Heurística base + aprendizaje (move ordering “tipo motor”)

### 4.1 Heurística base

La base más simple:

- Candidatos ordenados por `w(last, next)` ascendente (vecino más cercano).

Para hacerlo escalable:

- usa **candidate lists**: para cada ciudad `i`, precalcula los `K` vecinos más
  baratos (en simétrico y ATSP sirve igual).

### 4.2 Señal aprendida (refuerzo)

Mantén un score aprendido, por ejemplo:

- `H[i][j]`: “preferencia” por elegir `j` después de `i`.

Este score **NO cambia el coste real** `w(i,j)`; solo afecta a la
prioridad/orden de expansión.

Un criterio típico de prioridad:

```
priority(i,j) = w(i,j) - λ * H[i][j]
expand in ascending priority
```

**Decaimiento (opcional, recomendado)**:

- cada iteración global (cada `D` o cada cierto tiempo):
    - `H *= (1 - ρ)` para no congelarte en un óptimo local temprano.

### 4.3 Refuerzo cuando mejoras incumbent

Cuando encuentras un tour mejor `best_path`:

- para cada arista consecutiva `(a -> b)` en el tour:
    - `H[a][b] += Δ` (Δ puede depender de cuánto mejoraste).
- (opcional) refuerzo también de “estructura”: pares frecuentes, subrutas de
  ventana, etc.

Esto es análogo a history heuristic / RL tabular: refuerzas decisiones que
aparecen en buenas líneas.

---

## 5) Discrepancias: LDS vs ILDS

### 5.1 Qué es una discrepancia

En un nodo de búsqueda:

- ordenas movimientos `moves = [m0, m1, m2, ...]` (m0 es “mejor”).
- elegir `m0` consume 0 discrepancias,
- elegir `mk` con `k>0` consume 1 discrepancia (versión estándar “por nivel”).

(Variantes: discrepancia = “no elegir el top-1”, o discrepancia proporcional a
k; para empezar, usa la simple.)

### 5.2 LDS “at most D”

Para cada `D = 0..Dmax`, exploras DFS permitiendo `D_used <= D`.

### 5.3 ILDS “exactly D” (menos redundancia)

En ILDS, para cada `D` exploras **exactamente** `D` discrepancias, lo que reduce
reexploración. Implementación:

- `dfs(state, D_remaining)` donde eliges:
    - m0 con `D_remaining` intacto
    - mk (k>0) solo si `D_remaining > 0`, pasando `D_remaining - 1`

---

## 6) Tabla de transposición global (TT “Held–Karp-like”)

### 6.1 Qué guarda

Key:

- `(visited_set S, last)`

Value (mínimo útil):

- `best_g_seen`: el menor coste de prefijo con el que has alcanzado `(S,last)`.

Regla de poda por dominancia:

- si vuelves a `(S,last)` con `g >= best_g_seen`, puedes **podar** esa rama.

Esto es correcto como “dominance pruning” para minimizar coste de prefijo,
porque el resto del problema desde `(S,last)` es el mismo subproblema.

### 6.2 Hash incremental (Zobrist)

Pre-genera 64-bit random:

- `R_visit[city]` y `R_last[city]` Hash:
- `H = XOR(R_visit[c] for c in visited) XOR R_last[last]`

Actualización:

- al marcar visitado `v`: `H ^= R_visit[v]`
- al cambiar last `a -> b`: `H ^= R_last[a] ^ R_last[b]`

### 6.3 Estructura y reemplazo

TT de tamaño fijo `M` (potencia de 2 recomendable):

- índice = `H & (M-1)`

Cada entrada:

- `key64` (H)
- `last` y `|S|` (para sanity y reducir falsos positivos)
- `best_g_seen`
- `generation` (para reemplazo por antigüedad)

Reemplazo simple:

- si bucket ocupado y key distinta: reemplaza si `generation` vieja o si quieres
  “always replace”.

---

## 7) Patch-cache con ventana deslizante (reparador local + memoria)

### 7.1 Objetivo

Cuando el prefijo `path` ya tiene longitud suficiente, intentas optimizar “sobre
la marcha” el último bloque de tamaño `m`:

- Mantienes fijo:
    - `entry`: el nodo justo antes del bloque,
    - `exit`: el último nodo actual (el final del prefijo),
- Permites permutar el conjunto interno `S_block` (los `m` nodos del bloque, o
  `m-?` si separas endpoints).

Esto produce un “parche” que reduce el coste del prefijo sin cambiar el conjunto
visitado.

### 7.2 Definición exacta del bloque

Sea `depth` el índice del último nodo (`exit = path[depth]`).

Elige `m` (p. ej. 8 o 10). Si `depth >= m`:

- `entry = path[depth - m]`
- bloque de nodos “reordenables”:
    - opción A (simple): reordenar `path[depth-m+1 .. depth]` manteniendo solo
      `entry` fijo
        - aquí el `exit` cambia si reordenas todo, así que no es ideal.
    - opción B (recomendada): reordenar el interior manteniendo `entry` y `exit`
      fijos:
        - `entry = path[depth - m]`
        - `exit  = path[depth]`
        - `S_internal = path[depth - m + 1 .. depth - 1]` (tamaño `m-1`)

**Usa opción B** para que el subproblema tenga endpoints claros.

### 7.3 Key del patch-cache

Key debe reflejar:

- subset `S_internal` (conjunto, no orden)
- `entry`
- `exit`

Ejemplo:

- `key = hash_subset(S_internal) XOR R_entry[entry] XOR R_exit[exit]`

Guarda además:

- `confirm_key` (otro hash distinto o la bitmask si m es pequeño) para detectar
  colisiones.
- `best_cost_internal`
- `best_perm_internal` (la permutación interna que logra ese coste)
- `generation`

### 7.4 Qué es “cost_internal”

Para simétrico o ATSP, el coste relevante del bloque con endpoints fijos es:

```
cost_block(entry, perm, exit) =
  w(entry, perm[0]) +
  Σ w(perm[k], perm[k+1]) +
  w(perm[last], exit)
```

### 7.5 Política de uso

Cuando alcanzas una ventana:

1. Construyes key `(S_internal, entry, exit)`.
2. Lookup en patch-table.
3. Si **hit**:
    - calculas coste actual del bloque,
    - comparas con `best_cost_internal` del cache,
    - si el cache es mejor:
        - reescribes `path[depth-m+1 .. depth-1]` con `best_perm_internal`,
        - actualizas `g` restando/añadiendo delta.
4. Si **miss**:
    - puedes insertar la configuración actual como baseline,
    - o ejecutar una mejora local limitada (ver 7.6) y guardar la mejor.

### 7.6 Cómo obtener el “best_perm_internal” (sin que sea carísimo)

Opciones:

- **Enumeración exacta** si `m` pequeño:
    - si `|S_internal| <= 8`, factorial aún puede ser alto pero quizás viable
      con poda.
- **DP tipo Held–Karp local** sobre el bloque:
    - DP para camino con endpoints fijados sobre `m-1` nodos.
    - Complejidad `O(m^2 * 2^m)`: muy razonable para `m≈10..14` si lo haces
      ocasionalmente.
- **Búsqueda local** (2-opt/3-opt) aplicada solo dentro del bloque, manteniendo
  endpoints:
    - rápida, buena para uso frecuente.

En un “toy engine”, una combinación práctica:

- para `m <= 12`: DP local ocasional o al insertar,
- para `m > 12`: solo heurística (2-opt en la ventana).

### 7.7 Reemplazo y gestión de memoria

Tabla fija `P` entradas. Índice por hash. Reemplazo:

- si colisión con `confirm_key` distinta: reemplaza por antigüedad o
  always-replace,
- si misma key: guarda si el nuevo `best_cost_internal` mejora.

Esto actúa como “memoria de patches” que se adapta a la distribución real de
estados visitados por tu búsqueda.

---

## 8) Flujo completo del algoritmo (alto nivel)

### 8.1 Preproceso

1. Construye acceso a `w(i,j)` (matriz o función).
2. Precalcula candidate list `Cand[i]` de tamaño `K` (por coste real `w(i,j)`).
3. Inicializa:
    - `best_tour` (por nearest-neighbor + 2-opt opcional, o vacío)
    - `best_cost = +∞`
    - `H[i][j]=0` (heurística aprendida)
    - TT global vacía
    - patch-table vacía

### 8.2 Loop por discrepancias (ILDS recomendado)

Para `D = 0..Dmax`:

- establece `generation = D` (para reemplazos)
- llama `dfs(start_state, D_remaining=D)`
- (opcional) decaimiento de H: `H *= (1-ρ)`

### 8.3 DFS con poda/patch/TT (pseudocódigo)

```pseudo
function dfs(path, visited, last, g, D_remaining):
    if all visited:
        total = g + w(last, start)
        if total < best_cost:
            best_cost = total
            best_tour = path + [start]
            reinforce(best_tour)   // actualiza H
        return

    // Poda por incumbent (si tienes bound)
    lb = lower_bound(visited, last)   // opcional, ver sección 9
    if g + lb >= best_cost:
        return

    // TT global (dominancia)
    key = hash(visited, last)
    if TT.has(key) and TT[key].best_g <= g:
        return
    TT.update_min(key, g)

    // Patch routing (ventana)
    if depth(path) >= m:
        apply_patch_if_better(path, g, patch_table)

    // Genera movimientos (candidatos)
    moves = []
    for next in Cand[last] plus (fallback all unvisited if needed):
        if not visited[next]:
            moves.append(next)

    // Ordena por prioridad aprendida
    sort moves by (w(last,next) - λ*H[last][next]) asc

    // Expande con discrepancias (ILDS exact)
    for idx, next in enumerate(moves):
        if idx > 0:
            if D_remaining == 0: continue
            D2 = D_remaining - 1
        else:
            D2 = D_remaining

        // hacer movimiento
        visited[next] = true
        path.push(next)
        g2 = g + w(last, next)

        dfs(path, visited, next, g2, D2)

        // deshacer
        path.pop()
        visited[next] = false
```

---

## 9) Mejoras opcionales (muy recomendables si quieres podar “antes de terminar tours”)

### 9.1 Candidate lists (casi siempre valen la pena)

En vez de expandir todos los no visitados:

- expande primero `K` candidatos por nodo (`K` típico 10–40).
- si se “atasca” (ninguno disponible), fallback a todos.

Esto reduce branching brutalmente y hace LDS/ILDS mucho más útil.

### 9.2 Cotas inferiores (para poda real)

Sin bound, tu búsqueda solo “aprende a ordenar” pero poda poco. Con bounds, el
cambio es enorme.

- **TSP simétrico**:
    - bound barato: MST sobre nodos no visitados + conexiones desde `last` y
      hacia `start` (variantes).
    - bound fuerte: 1-tree (Held–Karp bound), más complejo.

- **ATSP**:
    - bound típico: assignment / cycle cover mínimo (relajación), `O(n^3)` si lo
      haces desde cero; hay trucos incrementales, pero ya entra en ingeniería.

Un enfoque intermedio:

- usa un bound **barato** primero (MST-like en simétrico; algo simple en ATSP),
- y mide si te compensa.

### 9.3 “Aspiration” / búsqueda por umbrales (estilo motor)

En vez de solo minimizar, puedes convertirlo en decisión:

- “¿existe un tour con coste < B?” y vas bajando `B` conforme encuentras
  incumbents. Esto permite podas más agresivas y estructuras tipo TT con
  “fail-low/fail-high” (más complejo, opcional).

---

## 10) Parámetros experimentales (sugerencias iniciales)

- `Dmax`: 10–50 (depende N y del pruning/candidates).
- `K` candidate list: 20 (N pequeño), 40 (N mayor).
- `m` ventana patch: 8, 10, 12 (probar barrido).
- `λ` (peso aprendizaje): empezar con algo pequeño (p.ej. 0.1–5.0 según escala
  de w).
- `ρ` decaimiento: 0.01–0.05 por iteración D (si refuerzas fuerte).
- TT global size: potencia de 2; por ejemplo `2^20` entradas si cabe memoria.
- patch-table size: similar o menor; depende de si guardas permutaciones.

---

## 11) Telemetría (imprescindible para saber si funciona)

Recomendado loggear por iteración `D`:

- `nodes_expanded`, `backtracks`
- `best_cost` y `time_to_best`
- TT:
    - `tt_lookups`, `tt_hits`, `tt_prunes`, `tt_replacements`
- patch-cache:
    - `patch_lookups`, `patch_hits`, `patch_applied`, `patch_improvements_total`
    - distribución de Δcoste por parche (media/percentiles)
- profiling básico:
    - tiempo en ordenación de movimientos
    - tiempo en bounds
    - tiempo en patching

Esto te permite hacer “ablation studies”:

- con/sin TT,
- con/sin patch,
- variar `m`,
- variar memoria.

---

## 12) Notas de corrección y “no romper el benchmark”

- El coste real del tour siempre se calcula con `w(i,j)` **sin contaminar por
  H**.
- `H` solo cambia el orden de expansión (y/o decisiones de patch), no redefine
  distancias.
- Si aplicas patching, asegúrate de:
    - mantener fijos `entry` y `exit`,
    - no repetir nodos,
    - actualizar `g` consistentemente.
- TT global por dominancia es segura si la key representa el mismo subproblema:
    - `(visited_set, last)` con `start` fijo.
- En ATSP, evita supuestos simétricos (invertir segmentos no es “gratis”).

---

## 13) Extensiones naturales (si el prototipo promete)

- Guardar en TT también un **bound** del “resto” para podas más ricas.
- Aprendizaje más “edge-centric”:
    - refuerzo por aristas buenas,
    - penalización por aristas que aparecen en malas ramas (cuidado con sesgos).
- “Quiescence” para TSP:
    - antes de evaluar o antes de ramificar, ejecutar mejora local rápida (2-opt
      limitado o patch DP) para estabilizar.
- Multistart:
    - repetir con distintos `start` o re-seed de aprendizaje.

---

## 14) Resumen ejecutivo (para una IA codificadora)

Implementa:

1. `distance(i,j)` correcto.
2. DFS constructivo.
3. ILDS: loop `D=0..Dmax`, DFS con `D_remaining`.
4. `H[i][j]` para ordenar movimientos; refuerzo al mejorar incumbent;
   decaimiento opcional.
5. TT global: key `(visited,last)` con Zobrist; poda por dominancia `g`.
6. Patch-cache:
    - ventana `m`, endpoints fijos,
    - key `(subset_internal, entry, exit)`,
    - guarda mejor permutación interna y su coste,
    - aplica parche si mejora.
7. Instrumentación y barrido de parámetros.

Con esto tienes un “motor” experimental del TSP donde puedes iterar rápido en un
IDE agéntico.

---

Gemini 3

---

Aquí tienes el documento de especificación técnica completo. Está redactado con
un lenguaje formal y estructurado, diseñado para ser consumido por una IA de
programación (o un desarrollador humano) como un **prompt de sistema** o un
**documento de diseño**.

---

# Especificación Técnica: TSP Solver Híbrido (LDS + Patch Caching)

## 1. Visión General del Algoritmo

Este solver propone una arquitectura híbrida inspirada en **Motores de Ajedrez**
y **Búsqueda Local**. El objetivo es resolver el Problema del Viajante de
Comercio (TSP) combinando:

1.  **LDS (Limited Discrepancy Search):** Búsqueda en profundidad (DFS)
    iterativa basada en un presupuesto de desviación sobre una heurística base.
2.  **Aprendizaje de Heurísticas (RL simplificado):** Refuerzo de las aristas
    pertenecientes a las mejores soluciones encontradas para guiar futuras
    iteraciones de LDS.
3.  **Patch Caching (Ventana Deslizante con Hash):** Un sistema de memoria
    basado en Tablas de Transposición que detecta sub-rutas (segmentos)
    repetidas y optimiza/repara la ruta actual en tiempo real si ya se conoce
    una permutación mejor para ese conjunto de ciudades.

El solver debe ser agnóstico al tipo de problema (Métrico, Asimétrico, General),
basándose puramente en costes de grafo.

---

## 2. Estándares y Entrada de Datos (TSPLIB)

El sistema debe cumplir estrictamente las reglas de TSPLIB para garantizar la
validez de los benchmarks:

- **Índices:** Base-1 para entrada/salida, conversión interna a Base-0
  permitida.
- **Precisión:** Uso de `double` para cálculos intermedios.
- **Distancias:** Implementación de funciones `nint` (Nearest Integer), `GEO`
  (conversión a radianes) y `ATT` según la especificación oficial. **El redondeo
  ocurre en cada arista**, no al final.

---

## 3. Estructuras de Datos

### 3.1. Zobrist Hashing (Identificación de Conjuntos)

Para identificar conjuntos de ciudades visitadas en $O(1)$.

- `ZOBRIST_SET[N]`: Array de `uint64_t` aleatorios. Uno por ciudad.
- `ZOBRIST_IN[N]` y `ZOBRIST_OUT[N]`: (Opcional para ATSP) Aleatorios para
  identificar nodos de entrada/salida.

### 3.2. Tabla de Transposición (Patch Cache)

Una Hash Map de tamaño fijo (ej. $2^{20}$ a $2^{24}$ entradas) para almacenar
segmentos óptimos.

**Estructura de la Entrada (`TTEntry`):**

```cpp
struct TTEntry {
    uint64_t key;          // Para verificación de colisiones
    int cost;              // Coste del segmento guardado
    uint8_t length;        // Longitud del segmento (L)
    int path_sequence[MAX_WINDOW]; // La permutación óptima local (ej. array de bytes)
};
```

**Construcción de la Clave (Key):** Para un segmento que entra por el nodo $A$,
visita el conjunto $\{S\}$ y termina en $B$:
$$Key = Hash(A) \oplus Hash(B) \oplus \left(\bigoplus_{c \in S} ZobristSet[c]\right)$$
_Nota: Para TSP Simétrico, normalizar tal que $ID(A) < ID(B)$ para aprovechar
caminos inversos._

---

## 4. Lógica del Núcleo (Engine)

### 4.1. Heurística Dinámica y Ordenación

Mantener una matriz o lista de adyacencia `HeuristicWeights`.

- Inicialmente: `HeuristicWeight(i, j) = Distancia(i, j)`
- **Ordenación de Movimientos:** En cada paso del DFS, ordenar los vecinos
  candidatos basándose en `HeuristicWeight` ascendente.

### 4.2. Búsqueda LDS (Limited Discrepancy Search)

El bucle principal itera sobre `k` (presupuesto de discrepancia).

- **Discrepancia:** Elegir el 1º vecino ordenado cuesta 0 discrepancias. Elegir
  el 2º cuesta 1, etc.
- Se explora el árbol DFS hasta que el presupuesto `k` se agota o se cierra un
  ciclo.

### 4.3. Aprendizaje (Feedback Loop)

Cuando el DFS completa un tour y `CosteTotal < BestCosteGlobal`:

1.  Guardar tour como `BestSolution`.
2.  **Refuerzo:** Iterar sobre las aristas $(u, v)$ de este nuevo mejor tour y
    reducir su `HeuristicWeight` (o bonificar su prioridad). Esto hace que en la
    siguiente iteración de `k` (o reinicio), el LDS prefiera naturalmente estas
    aristas sin gastar presupuesto de discrepancia.

---

## 5. Mecanismo de Patch Caching (La Innovación)

Este proceso se ejecuta **durante** la construcción del DFS, cada vez que la
profundidad aumenta.

**Parámetros:**

- `W`: Tamaño de ventana deslizante (ej. 5 a 10 nodos).

**Algoritmo paso a paso:**

1.  **Pre-condición:** La profundidad actual del DFS es $\ge W$.
2.  **Definir Segmento:** Considerar los últimos $W$ nodos de la ruta actual:
    - `StartNode`: Nodo en índice `current_depth - W`.
    - `EndNode`: Nodo actual (`current_depth`).
    - `InnerSet`: Nodos entre Start y End.
3.  **Cálculo de Hash:** Calcular `Key` del segmento usando actualización
    incremental (XOR).
4.  **Consulta (Lookup):** Buscar `Key` en la Tabla de Transposición.
5.  **Decisión:**
    - **MISS (No existe):** Insertar el segmento actual (secuencia y coste) en
      la tabla.
    - **HIT (Existe):**
        - Caso A (`TableEntry.cost < CurrentSegment.cost`): **PATCHING**.
            - Reemplazar los nodos en la ruta actual (en memoria) con la
              secuencia guardada en `TableEntry`.
            - Actualizar el coste acumulado actual.
            - _Efecto:_ El DFS "salta" a una configuración óptima localmente.
        - Caso B (`CurrentSegment.cost < TableEntry.cost`): **UPDATE**.
            - Sobrescribir la entrada de la tabla con la ruta actual (hemos
              encontrado una mejor forma de cruzar este conjunto).
        - Caso C (Iguales): No hacer nada.

---

## 6. Métricas y Telemetría

Para evaluar el rendimiento, el sistema debe reportar:

1.  **TT Hit Rate:** Frecuencia con la que se encuentra una clave en la tabla.
2.  **Patch Success Rate:** % de veces que un HIT resultó en una mejora
    (reparación) de la ruta.
3.  **Optimization Learning Rate:** % de veces que el DFS actualizó la tabla con
    una ruta mejor.
4.  **Time to Optimal:** Tiempo desde el inicio hasta encontrar la solución
    conocida (si aplica).

---

## 7. Pseudo-código de Referencia (Patch Logic)

```python
def check_patch_caching(path, current_cost, current_hash):
    # Ventana definida por indices [i_start, i_end]
    start_node = path[i_start]
    end_node = path[i_end]

    # Construir Key única para (Start -> {Set} -> End)
    key = make_key(start_node, end_node, current_hash_xor_window)

    entry = TranspositionTable.get(key)

    segment_cost = current_cost - cost_at_index[i_start]

    if entry is None:
        # Guardar nuevo conocimiento
        TranspositionTable.store(key, segment_cost, path[i_start:i_end+1])

    elif entry.cost < segment_cost:
        # ! PATCH DETECTADO ! - Reparar ruta actual
        apply_patch(path, entry.sequence)
        current_cost = cost_at_index[i_start] + entry.cost
        # El estado del DFS ha sido "teletransportado" a uno mejor

    elif segment_cost < entry.cost:
        # Mejoramos lo que había en la tabla
        TranspositionTable.store(key, segment_cost, path[i_start:i_end+1])
```
