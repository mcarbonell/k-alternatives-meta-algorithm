# Auditoría Integral y Plan de Remediación — k-Alternatives

**Documento:** Auditoría de código, documentación, metodología y novedad
científica **Fecha:** 10 de marzo de 2026 **Alcance:** Todo el repositorio
(`src/`, `scripts/`, `tests/`, `docs/`, `workers/`, `benchmarks/`, CI)
**Objetivo del autor:** Publicar un paper presentando el algoritmo como
meta-heurística novedosa. **Auditor:** Cline (revisión estática + ejecución de
`npm test`, `npm run lint`, inspección de artefactos y documentación)

---

## 0. Metodología de la auditoría

Se revisaron los siguientes artefactos y se ejecutaron comprobaciones
reproducibles:

| Aspecto         | Evidencia                                                                                       |
| :-------------- | :---------------------------------------------------------------------------------------------- |
| Código núcleo   | `src/k-optimizer.js`, `src/tsp-solver.js`, `src/knapsack-solver.js`, `src/k-alternatives-v2.js` |
| Experimentos    | `scripts/*.js`, snapshots en `benchmarks/`                                                      |
| Tests           | `tests/*.spec.js` ejecutados con Vitest                                                         |
| Calidad         | `npm run lint`, `eslint.config.js`, `package.json`                                              |
| Documentación   | `README.md`, `QUICKSTART.md`, `docs/*.md`, `docs/private/*`                                     |
| Infraestructura | `.github/workflows/ci.yml`, `.gitignore`, `benchmarks/README.md`                                |

**Resultados de las ejecuciones de comprobación:**

- `npm test` → **pasa** (42 tests, ~2,3 s). ✔️
- `npm run lint` → **FALLA** con **18 errores y 76 warnings** (`EXIT=1`). ✖️
- Comprobación de recursos referenciados: **6 recursos citados no existen**
  (`docs/analisis-algoritmico-alternativas.md`,
  `docs/puente-gradiente-k-alternatives.md`,
  `docs/propuesta-integracion-redes-neuronales.md`, `docs/README.md`,
  `index-legacy.html`, `LICENSE`).

---

## 1. Resumen ejecutivo

El repositorio contiene un **prototipo funcional, bien intencionado y
sorprendentemente limpio para su etapa**, con una arquitectura genérica
razonable (`KDeviationOptimizer` + solvers de TSP y Knapsack) y una suite de
tests básica que pasa. La idea central es clara y comunicable.

Sin embargo, **en su estado actual NO está listo para publicar un paper que
reclame novedad algorítmica**, por cuatro motivos agrupados:

1. **Novedad mal formulada (riesgo alto; corregido y desarrollado en §4.3).** El
   algoritmo reutiliza primitivas conocidas —**Limited Discrepancy Search (LDS,
   Harvey & Ginsberg 1995)**, **multi-start** y **"move-to-front"**
   (LRTA\*/listas de candidatos)—, pero eso **no invalida la novedad**: en
   metaheurísticas lo nuevo suele ser la _combinación_. La **receta concreta**
   (LDS sobre construcción greedy + heurística **auto-modificante** + schedule
   acoplado) **no está publicada tal cual** y debe presentarse como tal. El
   problema real es que el README la vende como "unique in the landscape" **sin
   citar el prior-art** (§4.3) y con claims de rendimiento sin respaldo
   (LKH/Concorde).

2. **Falta de comparación honesta contra baselines (riesgo crítico).** No existe
   un experimento controlado contra NN puro, 2-opt/Or-opt, Reinicio aleatorio,
   SA o LKH bajo presupuesto comparable. Las tablas comparativas del
   README/`run-all-benchmarks.js` son **valoraciones subjetivas con estrellas**,
   no mediciones.

3. **Metodología experimental insuficiente para un paper (riesgo alto).** No hay
   **semilla aleatoria** (experimentos irreproducibles), muestras de 50
   ejecuciones sin intervalos de confianza ni tests de significancia, modelos
   matemáticos ajustados sobre 5 instancias pequeñas, y una afirmación de
   **"convergencia polinómica garantizada"** que no es un teorema.

4. **Integridad de repositorio/documentación (riesgo alto, fácil de arreglar).**
   Los enlaces principales del README apuntan a documentos movidos a
   `docs/private/` (ignorado por git ⇒ **enlaces 404 en GitHub**), faltan el
   archivo `LICENSE` (pese a declarar MIT) y el visualizador `index-legacy.html`
   citado no existe. Además, `npm run benchmark` (el runner maestro) **falla en
   tiempo de ejecución** por una API inexistente.

**Veredicto:** El proyecto es una **base prometedora y publicable tras una fase
de trabajo seria** de rigor algorítmico, experimental y de ingeniería. El camino
más creíble no es "presentar un algoritmo radicalmente nuevo", sino
**posicionarlo con honestidad** como una meta-heurística de construcción basada
en LDS con un _schedule_ de discrepancia creciente, multi-start y aprendizaje
por reordenación, **con la familia paramétrica k↔τ/λ** descrita en
`docs/private/puente-gradiente-k-alternatives.md` como contribución teórica
distintiva. Ese documento privado contiene, con diferencia, **la idea más
original del repositorio** y hoy **no es pública**.

**Puntuaciones orientativas (0–10):**

| Dimensión                      | Nota  | Comentario                                                                                                                                      |
| :----------------------------- | :---: | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| Claridad de la idea            |   8   | Concepto simple, elegante y bien comunicable.                                                                                                   |
| Novedad frente a la literatura |   5   | Primitivas conocidas; la _combinación/formulación_ y la lectura k↔τ/λ son defendiblemente nuevas (§4.3), pero exigen ablación que lo demuestre. |
| Calidad del código             |   7   | Legible, modular, JSDoc; con bugs y decisiones discutibles.                                                                                     |
| Rigor experimental             |   3   | Sin baselines, sin semilla, muestras pequeñas, overclaims.                                                                                      |
| Documentación                  |   4   | Rica pero con enlaces rotos, claims contradictorios y no pública.                                                                               |
| Ingeniería / CI / licencia     |   5   | CI presente pero lint local roto, sin LICENSE, runner maestro roto.                                                                             |
| **Preparación para publicar**  | **3** | Necesita trabajo sustancial antes de enviar a revisión.                                                                                         |

---

## 2. La idea y el algoritmo, tal como está implementado

### 2.1 Descripción fiel al código

El núcleo (`src/k-optimizer.js`) es una búsqueda en profundidad de construcción
de soluciones guiada por una heurística, con las siguientes piezas:

1. **Heurística base** (problema-específica): NN para TSP (`localHeuristics[i]`
   = vecinos ordenados por distancia), ratio valor/peso para Knapsack
   (`globalSortedIndices`).
2. **Búsqueda con desviaciones** (`systematicSearch`): en cada nodo se toman las
   primeras `alternativesLeft + 1` opciones válidas de la lista heurística; la
   1.ª opción cuesta 0 unidades de discrepancia y las siguientes cuestan 1
   unidad cada una.
3. **Multi-start** (`solve`): recorre todos los puntos de partida (barajados si
   `shuffle:true`).
4. **Schedule de K creciente**: si hubo mejoras en el nivel K actual y
   `shuffle:true`, **repite el mismo K con nuevo barajado**; si no, incrementa K
   hasta `maxK`.
5. **Aprendizaje "move-to-front"** (`updateHeuristics` en TSP): al encontrar una
   mejora, cada arista de la ruta élite se **promueve al frente** de la lista de
   vecinos, de modo que en la próxima pasada el greedy (k=0) la elija
   directamente. En Knapsack este método es **no-op**.

### 2.2 Pseudo-flujo real

```
start(problem):
  initializeProblem(problem)          # NN, ratio, matrices
  bestValue = ±∞
  bestSolution = getInitialSolution(); checkSolution(...)   # evalúa y puede aprender
  solve()

solve():                              # recursivo vía setTimeout(...,0)
  improvementsBeforeK = improvements
  order = shuffle(allItems)  (o tal cual si shuffle=false)
  for startItem in order while isRunning:
      systematicSearch(unvisited, |items|-1, [startItem], currentK, initialCost)

  if improvements > improvementsBeforeK and isRunning and shuffle:
      solve()                         # ← repite los MISMOS K, no sube K
  else:
      currentK++
      if currentK <= maxK: solve()    # ← sube K
      else: finishSolving()

systematicSearch(...):
  if canPrune(...) return
  if complete: checkSolution(...)      # evalúa; si mejora → updateHeuristics()  ← MUTA LA HEURÍSTICA
  choices = getHeuristicChoices(currentItem, unvisited, ...)
  for i in choices while validChoicesFound <= alternativesLeft:
      recurse(..., alternativesLeft - (validChoicesFound - 1))
```

### 2.3 Mapeo con literatura existente

| Pieza del algoritmo                      | Técnica consolidada previa                                                                  |
| :--------------------------------------- | :------------------------------------------------------------------------------------------ |
| "k desviaciones" del greedy              | **Limited Discrepancy Search** — Harvey & Ginsberg, IJCAI 1995                              |
| Construcción multi-start                 | **Multi-start / iterated construction** heuristics                                          |
| Repetir K tras mejora y luego subir      | _Iterative broadening_ / _restart schedule_ (análogo a Luby)                                |
| Reordenar lista de candidatos al mejorar | **Move-to-front** (MTF) y **aprendizaje heurístico** (LRTA\*, candidate-list reinforcement) |
| Auto-grow de K guiado por mejoras        | **Adaptive discrepancy / Iterative broadening**                                             |

**Conclusión de §2.3:** ninguna de las piezas por separado es nueva. La novedad,
si existe, debe formularse como **la combinación concreta + el schedule
adaptativo + la interpretación continua k↔τ/λ**, no como "algoritmo nuevo de
aprendizaje".

---

## 3. Inventario del repositorio

### 3.1 Estructura de producción (`src/`)

| Archivo                      | Rol                                                                     | Estado                                  |
| :--------------------------- | :---------------------------------------------------------------------- | :-------------------------------------- |
| `k-optimizer.js`             | Clase base `KDeviationOptimizer` (bucle, multi-start, callbacks, prune) | Núcleo. Bien documentado.               |
| `tsp-solver.js`              | TSP: NN, matrices, pesos EUC/CEIL/GEO/ATT/EXPLICIT, MTF                 | Núcleo.                                 |
| `knapsack-solver.js`         | Knapsack 0/1: ratio, evaluación greedy de la permutación                | Funcional; aprendizaje desactivado.     |
| `k-alternatives-v2.js`       | Segunda implementación abstracta (B&B + lookahead)                      | **No usada en producción ni en tests.** |
| `parsers/knapsack-loader.js` | Parser Pisinger / OR-Library                                            | Usado por benchmarks.                   |
| `parsers/tsp-json-parser.js` | Cargador JSON TSP + utilidades de índice                                | Usado parcialmente.                     |
| `parsers/tsp-parser.js`      | Parser TSPLIB de navegador (`fetch`, `console.error`)                   | Probable código muerto / UI.            |

### 3.2 Datos y experimentos

- `tsplib-json/` → **110 instancias** pre-parseadas (incluye óptimos).
- `tsplib/` → ~110 `.tsp`/`.opt.tour` originales.
- `benchmarks/` → snapshots históricos (`algorithmic-experiment-*.json`,
  `local-minima-*.{json,md}`). Nuevas ejecuciones se ignoran vía `.gitignore`.
- `scripts/` → 15 scripts entre benchmarks, CLI, análisis y conversión.

### 3.3 Tests

- `tests/k-optimizer.spec.js` (23), `tests/tsp-solver.spec.js`,
  `tests/knapsack-solver.spec.js`, `tests/benchmark.integration.spec.js` (7).
  Total **42, en verde**.
- `tests/benchmark_v1_vs_v2.js` **no** sigue el patrón `*.spec.js` ⇒ **Vitest no
  lo ejecuta**; es en realidad un script (debería vivir en `scripts/`).

### 3.4 Legado

- `legacy/` (ignorado por git, presente en local): prototipos HTML, un solver
  "engine-style" y PDFs. Incluye **PDFs de terceros con copyright** (ver §8).

---

## 4. Auditoría de la idea y la novedad científica

Esta es la sección más importante para el objetivo declarado (publicar un
paper).

### 4.1 Hallazgos

| ID  | Severidad | Hallazgo                                                                                                                                                                                                                                                                           |
| :-- | :-------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  |   Alta    | El "core" coincide con LDS + multi-start + MTF. El README lo vende como _"novel adaptive learning mechanism… unique in the landscape"_. **No hay sección de _related work_**. Ojo: la _combinación_ sí puede ser novedosa — ver recalibración y mapa de prior-art en §4.3.         |
| A2  |  Crítica  | Los claims de rendimiento ("80% del desempeño de SOTA con 10% de complejidad", "comparable a LKH, Concorde") **no tienen respaldo experimental**. `docs/tsp-algorithm.md` afirma literalmente _"Comparable to: LKH, Concorde (state-of-the-art)"_.                                 |
| A3  |   Alta    | No hay **baselines medidos** (NN, 2-opt/Or-opt, Random restart NN, SA, GA, LKH). Las "tablas comparativas" son puntuaciones con ⭐.                                                                                                                                                |
| A4  |   Alta    | `docs/private/analisis-algoritmico-alternativas.md` concluye una _"garantía formal de convergencia en tiempo polinomial"_. La derivación usa aproximaciones (`ln(1−p) ≈ −p`) y 50 muestras; **no es un teorema**. Riesgo de overclaim grave.                                       |
| A5  |   Alta    | La versión pública del análisis (`docs/analisis-busqueda-sistematica-alternativas.md`) es de bajo contenido: compara "por sensación" con ILS, beam, tabu y GA sin citar ni medir.                                                                                                  |
| A6  |   Media   | El elemento más original —la equivalencia `_moveToFront` ≈ Exponentiated Gradient + re-cuantización, y el mapeo k↔λ/τ— está en **`docs/private/puente-gradiente-k-alternatives.md`**, que **no se publica**. Es exactamente la contribución teórica que un revisor podría valorar. |
| A7  |   Media   | Hay **dos semánticas divergentes de `k`** en el repo (v1: `alternativesLeft - (validChoicesFound - 1)`; v2: `nextK = i===0 ? k : k-1`). No está formalizado cuál es "el algoritmo".                                                                                                |

### 4.2 Recomendación de posicionamiento (framing)

Reencuadrar el trabajo, con honestidad, como una meta-heurística de
**construcción guiada con presupuesto de discrepancia**:

> **Contribución 1 (sistematización):** una familia paramétrica de
> meta-heurísticas de construcción que unifica LDS clásico, multi-start y
> reordenación heurística bajo un único parámetro `k`, con un _schedule_
> adaptativo (re-descenso a `k=0` tras cada mejora).
>
> **Contribución 2 (interpretación continua):** mostrar que el reordenamiento
> MTF equivale a un paso de _Exponentiated Gradient / Mirror Descent_ seguido de
> re-cuantización, y que `k` es una **temperatura `τ` cuantizada** (k↔λ de
> diferenciación black-box). Esto abre una vía diferenciable.
>
> **Contribución 3 (evidencia):** evaluación controlada, con baselines y
> presupuesto comparable, de la familia en TSP y Knapsack, con la interpretación
> de que `k` controla explícitamente el _exploration–exploitation_.

Este framing **no niega** LDS (lo cita), **acota** la novedad a lo defendible y
**eleva** la aportación teórica real (Contribución 2) al primer plano. Publicar
la afirmación de §4.1-A1/A2 sin cambios invitaría al rechazo o a la
retractación.

### 4.3 Mapa de prior-art y recalibración de la novedad

> **Nota de recalibración.** La primera versión de esta auditoría puntuó la
> novedad muy bajo (3/10) y tituló "no novedoso". Eso **mezcló dos preguntas
> distintas** y fue injusto. En metaheurísticas la novedad casi nunca reside en
> una _primitiva_ nueva, sino en la **formulación e interacción** de piezas
> conocidas (ILS, ACO, GRASP, LNS… _todas_ combinan ingredientes previos). La
> pregunta correcta no es "¿existe este ingrediente?", sino **"¿existe esta
> receta concreta, y aporta algo que las recetas vecinas no aportan?"**. Bajo
> ese criterio, la combinación de k-Alternatives **sí es defendiblemente
> novedosa**, y esta subsección documenta por qué y frente a quién.

#### 4.3.1 Los vecinos más cercanos (lo que un revisor citará)

| Pieza de k-Alternatives                 | Trabajo más cercano                                                  | ¿Coincide?    | Diferencia clave                                                                                                             |
| :-------------------------------------- | :------------------------------------------------------------------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| Presupuesto de discrepancia `k`         | **LDS** (Harvey & Ginsberg, IJCAI 1995)                              | Sí (concepto) | LDS se aplica a _búsqueda en árbol / CSP_; aquí se aplica a una **construcción greedy** de optimización combinatoria.        |
| Límite de ramificación creciente        | **Iterative Broadening** (Ginsberg & Harvey, AAAI 1990)              | Parcial       | IB limita el nº de hijos por nodo; sin _aprendizaje_ ni reconstrucción greedy.                                               |
| LDS dentro de beam search               | **BULB / LDBS** (Furcy & Koenig, IJCAI 2005)                         | Parcial       | Combina LDS con haz (memoria acotada); heurística **fija**, no aprendida.                                                    |
| LDS + heurística **aprendida**          | **Focal Discrepancy Search** (Greco, Araneda & Baier, SOCS 2022)     | Parcial       | La heurística neuronal (DeepCubeA) es **preentrenada y congelada**; dominio: puzzles single-agent, no construcción de tours. |
| Schedule adaptativo de profundidad      | **Adaptive Probing** (Ruml et al.)                                   | Parcial       | Adapta la profundidad de sondeo, no la ordenación de candidatos.                                                             |
| Aprender el presupuesto de backtracking | **RLBS** (RL Backtracking Strategy)                                  | Parcial       | RL decide cuánto retroceder en B&B; no reordena la heurística de construcción.                                               |
| Reordenar candidatos al mejorar         | **Move-to-Front** (Sleator & Tarjan, 1985) / **LRTA\*** (Korf, 1990) | Sí (concepto) | MTF clásico; como _online learning_ ≈ Expert Advice / Mirror Descent (Blum & Burch 1997; Kalai & Vempala 2005).              |
| Multi-start + perturbación              | **ILS** (Lourenço et al.)                                            | Sí (concepto) | ILS perturba + búsqueda local; aquí no hay búsqueda local: **desviación controlada de la construcción**.                     |

**Ningún trabajo encontrado implementa la receta completa.** Los dos más
peligrosos son _Focal Discrepancy Search_ (LDS + heurística aprendida) y
_Adaptive Probing_ (LDS + schedule adaptativo); deben citarse y marcar la
diferencia explícitamente.

#### 4.3.2 El _fingerprint_ defendible (lo que sí es nuevo)

La contribución diferencial **no es una primitiva**, es un **lazo de
realimentación**:

1. **LDS sobre construcción greedy** (no árbol): `k` es un sesgo
   _exploration/exploitation_ sobre la construcción de una permutación.
2. **Heurística auto-modificante**: la solución que mejora **reescribe la propia
   política** (`localHeuristics` vía MTF), de modo que el `k=0` de la siguiente
   pasada _ya incorpora lo aprendido_. Esto **no** ocurre en LDS, IB, BULB ni
   Focal Discrepancy Search (heurística estática).
3. **Schedule acoplado**: tras una mejora, **se re-desciende a `k=0`** (replay
   greedy reforzado) y sólo se sube `k` al agotar. La novedad está en la
   **interacción 2↔3**: "aprender → reexplotar barato → volver a explorar".
4. **Familia continua k↔τ/λ**: reinterpretar `k` como **temperatura cuantizada**
   y `_moveToFront` como _Exponentiated Gradient + re-cuantización_. Es la pieza
   **más original y menos cubierta**: hay precedente de MTF≈mirror-descent _en
   aislamiento_, pero no de esta lectura sobre el presupuesto de discrepancia.

#### 4.3.3 Regla de honestidad

La novedad de la combinación es un **argumento**, no un hecho: para que un
revisor lo acepte hay que **demostrar que la interacción importa** mediante
**ablación** (§6, P1.3): (a) sin MTF, (b) single-start, (c) schedule fijo vs.
adaptativo. Si apagar el acoplamiento 2↔3 **no** degrada el rendimiento, la
"combinación novedosa" no existe como contribución. Si lo degrada, tienes la
evidencia que sostiene el paper.

> **Reencuadre:** el angle publicable no es "nuevo algoritmo" ni "nueva
> primitiva", sino **"nueva familia de metaheurísticas de construcción
> auto-modificante guiada por discrepancia, con una interpretación continua
> (k↔τ/λ)"**. Más modesto en la forma, más fuerte en el fondo.

---

## 5. Auditoría del código

### 5.1 Hallazgos

| ID  | Severidad | Archivo / zona                                 | Hallazgo                                                                                                                                                                                                                                                               |
| :-- | :-------: | :--------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  |  Crítica  | `scripts/run-all-benchmarks.js`                | Llama a `LocalMinimaAnalyzer.runFullAnalysis()` y lee `minimaAnalyzer.analysis`, **que no existen** en `scripts/local-minima-analysis.js`. ⇒ `npm run benchmark` **crashea en la Fase 3**.                                                                             |
| B2  |  Crítica  | `src/tsp-solver.js:229` + `k-optimizer.js:188` | `checkSolution` llama a `updateHeuristics`, que **muta `localHeuristics` mientras `systematicSearch` está en curso**. La búsqueda deja de ser un LDS limpio: los resultados dependen del orden de descubrimiento. Dificulta el análisis teórico y la reproducibilidad. |
| B3  |   Alta    | `src/k-optimizer.js:391`, `tsp-solver.js:152`  | **No hay semilla RNG**. `Math.random()` en `shuffle` y en el _fallback_ de `getInitialSolution`. Los experimentos **no son reproducibles**.                                                                                                                            |
| B4  |   Alta    | `src/k-alternatives-v2.js`                     | Segunda implementación con semántica de `k` **distinta** y sin tests/uso. Genera ambigüedad sobre qué es "el algoritmo" (ver A7).                                                                                                                                      |
| B5  |   Media   | `src/knapsack-solver.js:108`                   | `updateHeuristics` es **no-op** ⇒ el Knapsack **no usa el aprendizaje adaptativo**; además `shuffle:false` desactiva la repetición-por-mejora. La afirmación "framework genérico con aprendizaje" **no aplica a Knapsack**.                                            |
| B6  |   Media   | `src/k-optimizer.js:315-326`                   | El _auto-grow_: si hubo mejora y `shuffle`, **repite el mismo K indefinidamente**; el presupuesto real de cómputo no está acotado explícitamente (solo por `maxTime`/`maxIterations`). Difícil de reproducir/medir.                                                    |
| B7  |   Media   | `systematicSearch`                             | El conteo de desviaciones (`alternativesLeft - (validChoicesFound - 1)`) es sutil y **no está especificado formalmente** (¿k = nº de desviaciones totales del camino, o por nodo?). El factor de ramificación real es ~`c^k` con `c`=candidatos.                       |
| B8  |   Baja    | `k-optimizer.js:234`                           | Guard `MAX_DEPTH = 10000`: para N>10000 la búsqueda **retorna silenciosamente** sin explorar (p. ej. `pla85900`). No hay aviso.                                                                                                                                        |
| B9  |   Baja    | `k-optimizer.js:316,323`                       | `setTimeout(...,0)` para recursión: ofusca el flujo, complica el _stepping_/tests y no aporta valor.                                                                                                                                                                   |
| B10 |   Baja    | `tsp-solver.js:58`                             | `console.error` dentro de lógica de librería (contradice el propio `PLAN.md`).                                                                                                                                                                                         |
| B11 |   Baja    | `src/parsers/tsp-parser.js`                    | Parser de navegador (`fetch`) no usado por benchmarks; `console.error` en librería. Probable _dead code_.                                                                                                                                                              |
| B12 |   Info    | docs                                           | Se citan problemas "soportados" (Graph Coloring, Bin Packing, Job Scheduling) que **no están implementados** (solo TSP y Knapsack).                                                                                                                                    |

### 5.2 Cosas que están bien

- `Float64Array` plano para la matriz de distancias (buena localidad de caché).
- Candidate lists con _fallback_ a todos los restantes (evita tours
  incompletos).
- `canPrune` por cota superior parcial (correcto como cota inferior del tour
  total).
- Callbacks (`onSolution`, `onImprovement`, `onMaxTimeReached`,
  `onOptimalFound`) bien definidos.
- Separación base/específico vía clase abstracta; JSDoc consistente.
- 42 tests unitarios/de integración en verde; cubren casos límite (2 ciudades,
  coordenadas idénticas, EXPLICIT, formatos GEO/ATT/EUC/CEIL).

### 5.3 Verificación de B1 (reproducible)

```bash
grep -n 'runFullAnalysis' scripts/local-minima-analysis.js   # (sin salida: no existe)
grep -n 'class BenchmarkRunner' scripts/unified-benchmark.js # (existe)
npm run benchmark   # Fase 1 y 2 OK; Fase 3 → TypeError: minimaAnalyzer.runFullAnalysis is not a function
```

---

## 6. Auditoría de la metodología experimental

| ID  | Severidad | Hallazgo                                                                                                                                                                                                              |
| :-- | :-------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  |  Crítica  | **Sin semilla** (repite B3) ⇒ ningún resultado es replicable; un revisor no puede reproducir las tablas.                                                                                                              |
| E2  |   Alta    | Muestras de 50 ejecuciones (algunos scripts 5–25) **sin intervalos de confianza** ni tests de significancia ni corrección por multiplicidad (se comparan hasta 6 valores de k × N problemas).                         |
| E3  |   Alta    | Los modelos `P(N,k)` y `AvgGap(N,k)` se ajustan sobre **5 instancias pequeñas** (N=14…52) sin validación cruzada ni hold-out ⇒ riesgo alto de sobreajuste.                                                            |
| E4  |   Alta    | **No hay ablación**: no se aísla la contribución de (a) MTF/aprendizaje, (b) multi-start, (c) schedule de K. Sin ablación no se puede atribuir mejora a ningún componente.                                            |
| E5  |   Media   | Las métricas de tiempo se redondean a **segundos enteros** (`Math.floor(.../1000)`), produciendo "Avg. Tiempo 0.000s" para instancias pequeñas ⇒ métrica inútil para comparación. Especificar hardware y medir en ms. |
| E6  |   Media   | Claims de complejidad (`O(n^{k+1})`, "en práctica O(n)") **no medidos** (conteo de nodos expandidos vs. teoría).                                                                                                      |
| E7  |   Media   | Comparación contra SOTA inexistente; para ser creíble hay que fijar **presupuesto común** (tiempo y/o evaluaciones) y comparar en un rango amplio de N.                                                               |
| E8  |   Baja    | Snapshots en `benchmarks/` tienen fechas de archivo 2026-05/2026-07; verificar coherencia temporal de los artefactos citados como evidencia.                                                                          |

---

## 7. Auditoría de la documentación

| ID  | Severidad | Hallazgo                                                                                                                                                                                                                                                                                                                            |
| :-- | :-------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  |  Crítica  | **Enlaces rotos en el README público**: `docs/analisis-algoritmico-alternativas.md`, `docs/puente-gradiente-k-alternatives.md`, `docs/propuesta-integracion-redes-neuronales.md`, `docs/README.md`, `index-legacy.html` — todos inexistentes (los tres primeros están en `docs/private/`, ignorado por git). En GitHub dan **404**. |
| C2  |   Alta    | **Comandos documentados incorrectos**: `QUICKSTART` importa `./tsp-solver.js` (real: `./src/tsp-solver.js`); `README-CLI` usa rutas raíz (`k-alternatives-cli.js`, `benchmark.js`) que hoy viven en `scripts/`; `npm run benchmark:small/medium/fast/help` **no existen** en `package.json`.                                        |
| C3  |   Media   | `README-CLI` muestra una ejecución con _"Iter: 1.234.567 en 3 s"_ en berlin52, cifra no verificable/plausible.                                                                                                                                                                                                                      |
| C4  |   Media   | **Cifras contradictorias**: README dice "within 2–3% of optimal"; el test de integración exige `< 5%`; `analisis-algoritmico` da gap medio 4.00% (berlin52, k=5). Unificar.                                                                                                                                                         |
| C5  |   Media   | El snapshot real de mínimos locales muestra **0% de éxito en st70 a k=3** y 40% global a k=3, contradiciendo "consistently".                                                                                                                                                                                                        |
| C6  |   Media   | Los análisis matemáticos (la evidencia principal que cita el README) están en `private/`. Para "dar a conocer el algoritmo" hay que **publicar una versión depurada**.                                                                                                                                                              |
| C7  |   Baja    | `QUICKSTART` "Next Steps" apunta a `PLAN.md` en la raíz (está en `private/`).                                                                                                                                                                                                                                                       |
| C8  |   Baja    | `statistical-analysis-plan.md` menciona `stats-benchmark.js`, que **no existe** (hay `tsp-stats.js`/`local-minima-analysis.js`).                                                                                                                                                                                                    |

---

## 8. Auditoría de ingeniería, repositorio, CI y aspectos legales

| ID  | Severidad | Hallazgo                                                                                                                                                                                                                                                                                                                                                                              |
| :-- | :-------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  |   Alta    | **No existe archivo `LICENSE`** pese a declarar `"license": "MIT"` en `package.json` y en el README. Ambiguo legalmente para un repo público/librería.                                                                                                                                                                                                                                |
| D2  |   Alta    | **`npm run lint` falla**: 18 errores + 76 warnings (`EXIT=1`), contradiciendo `PLAN.md` ("0 errors, 0 warnings"). Los errores están mayormente en `legacy/` (`no-undef`, `no-useless-assignment`). `eslint.config.js` ignora `old-k-search/**` pero **no** `legacy/**`. En CI (donde `legacy/` no se sube por `.gitignore`) el job pasaría, pero **localmente el developer ve rojo**. |
| D3  |   Media   | El job CI "Quick Benchmark" regenera los 110 JSON en cada push (`node scripts/convert-tsplib-to-json.js tsplib`) y luego corre `benchmark:tiny`. Aceptable, pero pesado; considerar cacheo.                                                                                                                                                                                           |
| D4  |   Media   | Riesgo legal: **PDFs de terceros con copyright** (Elsevier, etc.) quedaron en la **historia pública de git** (documentado en `docs/private/README.md`). Si el repo se promociona con el paper, conviene purgar la historia (`git filter-repo`).                                                                                                                                       |
| D5  |   Baja    | `tests/benchmark_v1_vs_v2.js` no es un test (no `.spec.js`) y no lo ejecuta Vitest. Reubicar en `scripts/`.                                                                                                                                                                                                                                                                           |
| D6  |   Baja    | `package.json` `"main": "scripts/run-all-benchmarks.js"` (no es una librería); faltan `exports`/`files`. Para citar código en el paper conviene una entrada librería limpia (`src/index.js`).                                                                                                                                                                                         |
| D7  |   Baja    | JSDoc: `@abstract` no es estándar en JS; `getStats`/`getFinalResult` devuelven `distance` para problemas de maximización (semántica confusa).                                                                                                                                                                                                                                         |

### 8.1 Estado real del CI vs. local

```
.github/workflows/ci.yml:  lint (eslint + prettier:check) → test (vitest) → benchmark:tiny
Local:  npm test  OK (42 tests)     npm run lint  FALLA (18 errores)
```

El job de lint **pasará en CI** porque `legacy/` está en `.gitignore`, pero **la
afirmación de calidad del `PLAN.md` es falsa en local**. Alinear o excluir
`legacy/**` en `eslint.config.js`.

---

## 9. Riesgos específicos de publicar el paper en el estado actual

| Riesgo                                                                                | Probabilidad | Impacto | Comentario                                                                 |
| :------------------------------------------------------------------------------------ | :----------: | :-----: | :------------------------------------------------------------------------- |
| Rechazo por "no novedoso" (LDS+MTF ya existentes)                                     |     Alta     |  Alto   | Se agrava porque el README **no cita** LDS ni MTF.                         |
| Rechazo por falta de baselines / resultados no reproducibles                          |     Alta     |  Alto   | Sin semilla ni comparación, cualquier revisor lo detecta.                  |
| Señalamiento de overclaim ("convergencia polinómica garantizada", "comparable a LKH") |    Media     |  Alto   | Daño reputacional incluso si otras contribuciones valen.                   |
| Enlaces rotos / datos citados inexistentes en el repo público                         |     Alta     |  Medio  | Resta credibilidad; fácil de arreglar.                                     |
| Problema de licencia ausente / PDFs con copyright                                     |    Media     |  Medio  | Riesgo legal al promocionar el repo.                                       |
| Revisor pide ablación y no existe                                                     |     Alta     |  Alto   | Es el experimento mínimo que se espera.                                    |
| Reproductor no puede reconstruir las tablas                                           |     Alta     |  Alto   | Sin seeds ni scripts reproducibles, el trabajo no es _artifact-evaluable_. |

**Conclusión:** publicar ahora con los claims actuales expone al autor a rechazo
y, peor, a críticas de integridad. Con el reencuadre de §4.2 y las fases P0–P1
resueltas, el trabajo es defendible y honesto.

---

## 10. Plan de remediación

Prioridades: **P0** = bloqueantes para cualquier publicación; **P1** = rigor
científico; **P2** = ingeniería/CI; **P3** = difusión. Cada ítem con criterio de
aceptación verificable.

### Fase P0 — Bloqueantes de rigor y credibilidad (estimación: 1–2 semanas)

| #    | Acción                                                                                                                                                                                                     | Criterio de aceptación                                                                                       |
| :--- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| P0.1 | Añadir archivo `LICENSE` (MIT) coherente con `package.json`/README.                                                                                                                                        | `LICENSE` existe y `npm publish --dry-run` no advierte licencia.                                             |
| P0.2 | **Sembrado RNG**: introducir un PRNG con semilla (p. ej. `mulberry32`) inyectable en `KDeviationOptimizer` (`options.seed`); reemplazar `Math.random()` en `shuffle` y en el _fallback_ de TSP.            | Dos ejecuciones con la misma semilla dan **resultado idéntico** (test de regresión).                         |
| P0.3 | Arreglar `scripts/run-all-benchmarks.js` (B1): implementar `runFullAnalysis()`/`analysis` en `LocalMinimaAnalyzer` **o** reescribir el runner para usar la API real (`analyzeProblem` + `generateReport`). | `npm run benchmark` termina sin excepción.                                                                   |
| P0.4 | **Corregir enlaces rotos** (C1): publicar versiones depuradas de los análisis en `docs/` (sacarlas de `private/`) o eliminar los enlaces. Corregir import/rutas en `QUICKSTART` y `README-CLI`.            | Ningún enlace relativo del README/QUICKSTART/docs da 404; `node scripts/k-alternatives-cli.js ...` funciona. |
| P0.5 | **Eliminar overclaims** (A2/A4): retirar "comparable a LKH/Concorde", "80% con 10% complejidad" y "convergencia polinómica garantizada"; sustituir por formulaciones falsables.                            | `grep` de "LKH\|Concorde\|guarantee\|garantía polinómica" en docs públicos no arroja claims sin respaldo.    |
| P0.6 | Añadir sección **Related Work** que cite explícitamente LDS (Harvey & Ginsberg 1995), MTF, LRTA\*/candidate-list learning, ILS, y explique la contribución diferencial.                                    | README + borrador de paper contienen la sección.                                                             |

### Fase P1 — Metodología experimental (estimación: 2–4 semanas)

| #    | Acción                                                                                                                         | Criterio de aceptación                                                |
| :--- | :----------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| P1.1 | Implementar **baselines** en el mismo framework: NN puro, _Random-restart NN_, 2-opt y Or-opt sobre NN, opcionalmente SA.      | Script `scripts/baselines.js` que corre todos bajo presupuesto común. |
| P1.2 | **Presupuesto común** (tiempo y nº de evaluaciones) y reporte de gap medio, mediana, IQR, mejor/peor.                          | Tabla comparativa reproducible con semilla fija.                      |
| P1.3 | **Ablación**: (a) sin MTF, (b) single-start vs multi-start, (c) schedule fijo vs adaptativo.                                   | Tabla de ablación con deltas y significancia.                         |
| P1.4 | **Réplicas ≥ 1000** por (instancia, k) con **IC 95%** y tests de significancia corregidos (Bonferroni/Holm).                   | Reporte con IC y p-valores.                                           |
| P1.5 | **Instancias más amplias** (N de ~50 a ~1000) y **hold-out**: ajustar cualquier modelo solo en train.                          | Instancias de test no usadas en el ajuste.                            |
| P1.6 | Métricas de **tiempo en ms**, hardware y versión de Node documentados; contar nodos expandidos para validar complejidad.       | Tabla de tiempos con desviación; figura nodos vs. teoría.             |
| P1.7 | **Paquete de reproducibilidad**: un comando (`npm run reproduce`) con semilla que regenera todas las tablas/figuras del paper. | Ejecución limpia reproduce las cifras publicadas.                     |

### Fase P2 — Ingeniería, CI y calidad (estimación: 1–2 semanas)

| #    | Acción                                                                                                                                                                                  | Criterio de aceptación                                     |
| :--- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| P2.1 | `eslint.config.js`: ignorar `legacy/**` (o limpiar) para que `npm run lint` pase en local; corregir los warnings triviales en `src/`/`scripts/`.                                        | `npm run lint` → 0 errores.                                |
| P2.2 | Resolver la ambigüedad de `k` (B4/B7): **formalizar la semántica** en el paper y en JSDoc; eliminar `k-alternatives-v2.js` o marcarlo como experimental con una nota de compatibilidad. | Un único algoritmo canónico, documentado.                  |
| P2.3 | Decidir MTF durante la búsqueda (B2): o bien **congelar la heurística** durante un _pass_ (más limpio y analizable) o documentar explícitamente la actualización _online_.              | Comportamiento especificado + test.                        |
| P2.4 | Knapsack (B5): implementar aprendizaje real (reordenar ratio con refuerzo) **o** documentar que Knapsack usa solo multi-start + LDS.                                                    | README/paper no afirman aprendizaje genérico si no aplica. |
| P2.5 | Sustituir `setTimeout` por recursión/iteración directa o `queueMicrotask` documentado; añadir aviso cuando `MAX_DEPTH` corta la búsqueda (B8/B9).                                       | Tests de determinismo; warning en N grande.                |
| P2.6 | Mover `tests/benchmark_v1_vs_v2.js` a `scripts/`; añadir `src/index.js` y `exports`/`files` en `package.json` (D5/D6).                                                                  | Estructura coherente.                                      |
| P2.7 | Añadir cobertura (`vitest --coverage`) y umbral mínimo en CI.                                                                                                                           | Cobertura reportada ≥ objetivo.                            |
| P2.8 | Actualizar `PLAN.md`/docs internos para reflejar el estado real (no "0 warnings" si hay warnings).                                                                                      | Docs no contradicen la realidad.                           |

### Fase P3 — Difusión / paper (estimación: 2–4 semanas, paralelizable)

| #    | Acción                                                                                                                                                              | Criterio de aceptación                     |
| :--- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------- |
| P3.1 | Borrador de paper con: abstract, related work (LDS/MTF/ILS/LRTA\*), formalización de la familia, Contribución 2 (k↔τ/λ), experimentos P1, límites y trabajo futuro. | Manuscrito completo.                       |
| P3.2 | **Publicar** (depurada) la interpretación continua de `docs/private/puente-gradiente-k-alternatives.md`.                                                            | Doc público con referencias verificadas.   |
| P3.3 | Figuras: gap vs. k, nodos expandidos vs. teoría, curva de ablación.                                                                                                 | Figuras generadas por `npm run reproduce`. |
| P3.4 | _Artifact_ reproducible (Zenodo/GitHub con DOI, tag de versión).                                                                                                    | Release etiquetada + DOI.                  |
| P3.5 | Elegir venue realista: workshop/conferencia de metaheurísticas (GECCO, MIC, LION) o revista de heurísticas; alinear claims al nivel de evidencia.                   | —                                          |

---

## 11. Checklist de "readiness" para publicar

- [x] `LICENSE` presente (P0.1)
- [x] Semilla RNG + resultados reproducibles (P0.2/P1.7)
- [x] `npm run benchmark` y demás scripts no crashean (P0.3)
- [x] Cero enlaces rotos en docs públicos (P0.4)
- [x] Cero overclaims; claims falsables (P0.5)
- [x] Sección de Related Work con LDS/MTF (P0.6)
- [x] Baselines medidos con presupuesto común (P1.1/P1.2)
- [x] Ablación de componentes (P1.3)
- [x] IC 95% y significancia (P1.4)
- [x] Hold-out de instancias (P1.5)
- [x] `npm test` en verde y `npm run lint` en verde (P2.1)
- [x] Semántica de `k` formalizada y una única versión canónica (P2.2)
- [x] Paquete de reproducibilidad con un comando (P1.7)
- [ ] Manuscrito con límites explícitos (P3.1)

---

## 12. Apéndice A — Evidencia recogida (comandos y resultados)

| Comprobación   | Comando                                                 | Resultado observado                                                                                                                                                                                |
| :------------- | :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | `npm test`                                              | 42 tests OK (`k-optimizer` 23, `knapsack` 9, `tsp`, `benchmark.integration` 7). ✔️                                                                                                                 |
| Lint           | `npm run lint`                                          | `18 errors, 76 warnings` → `EXIT=1`. ✖️                                                                                                                                                            |
| Enlaces rotos  | chequeo de existencia                                   | Faltan `docs/analisis-algoritmico-alternativas.md`, `docs/puente-gradiente-k-alternatives.md`, `docs/propuesta-integracion-redes-neuronales.md`, `docs/README.md`, `index-legacy.html`, `LICENSE`. |
| API del runner | `grep runFullAnalysis scripts/local-minima-analysis.js` | Sin coincidencias ⇒ `run-all-benchmarks.js` referencia método inexistente.                                                                                                                         |
| Aleatoriedad   | `grep -rn 'Math.random' src/`                           | 2 usos, sin semilla.                                                                                                                                                                               |
| Scripts npm    | `node -e "..."`                                         | Faltan `benchmark:small/medium/fast/help` citados en `README-CLI.md`.                                                                                                                              |

## 13. Apéndice B — Resumen de hallazgos por severidad

| Severidad   | IDs                                                    |
| :---------- | :----------------------------------------------------- |
| **Crítica** | A2, B1, B2, C1, E1                                     |
| **Alta**    | A1, A3, A4, A5, B3, B4, C2, D1, D2, E2, E3, E4         |
| **Media**   | A6, A7, B5, B6, B7, C3, C4, C5, C6, D3, D4, E5, E6, E7 |
| **Baja**    | B8, B9, B10, B11, C7, C8, D5, D6, D7, E8               |
| **Info**    | B12                                                    |

---

_Fin del informe. Este documento es una evaluación técnica; las estimaciones de
esfuerzo son orientativas y deben ajustarse al ritmo real del autor. Se
recomienda abordar P0 completo antes de invertir tiempo en P3 (manuscrito), pues
el reencuadre de claims y los enlaces rotos cambian la narrativa del paper._
