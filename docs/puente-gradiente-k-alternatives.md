# Puente entre k-Alternatives y el Descenso del Gradiente

**Fecha:** 19 de septiembre de 2026 **Estado:** Registro de brainstorming /
Análisis teórico para exploración futura **Autoría conceptual
(k-Alternatives):** Mario Raúl Carbonell Martínez **Sesión:** Cline
(brainstorming teórico y arquitectónico) **Documento relacionado:**
[`propuesta-integracion-redes-neuronales.md`](propuesta-integracion-redes-neuronales.md)
(Vías A/B/C, 18-sep-2026)

---

## 0. Resumen ejecutivo

La pregunta de partida era: _¿es posible crear algoritmos de optimización
combinatoria que funcionen con descenso del gradiente, tendiendo un puente entre
la optimización clásica y las redes neuronales?_

La conclusión de esta sesión es contraintuitiva:

> **El puente no consiste en añadir una arquitectura neuronal al algoritmo.
> Consiste en _dejar de redondear los logits_.**

Es decir: **k-Alternatives ya hace descenso de gradiente**. Concretamente,
`_moveToFront` es un paso de _Exponentiated Gradient / Mirror Descent con
divergencia KL_ **exacto**, seguido de una **re-cuantización** sobre la variedad
discreta de permutaciones que destruye la magnitud del aprendizaje. Los tres
defectos conocidos del algoritmo (olvido catastrófico, falta de modulación por
recompensa, pérdida de relaciones de segundo orden) tienen por tanto **una única
causa raíz común**: la cuantización, no el mecanismo de aprendizaje.

Consecuencias prácticas de esta lectura:

1. El "puente diferenciable" es **una familia paramétrica de un solo parámetro**
   con dos anclas verificables: `η → ∞` reproduce _exactamente_ el
   k-Alternatives actual; `η` finito da el régimen continuo (NES / Cross-Entropy
   Method).
2. **`k` no es un hiperparámetro del problema, es la temperatura $\tau$
   cuantizada** — y por tanto es **aprendible**.
3. Existe una **Vía D** (zero-order estructurado) que conecta con la línea de
   investigación `dge-optimizer` / `cameo-zo` / `seismic-descent` y que **no
   aparece** en el documento de propuesta previo.
4. Los dos "arreglos" mínimos son **ejecutables en JavaScript puro**, dentro de
   este repo y con el harness de benchmarks ya existente, **sin PyTorch** y
   **sin cambiar la complejidad asintótica**.

Este documento registra el razonamiento completo, las referencias verificadas y
un plan por fases con criterio de falsación.

---

## 1. Diagnóstico: el update ya es un gradiente cuantizado

### 1.1 El código real

En [`src/tsp-solver.js`](../src/tsp-solver.js), cuando se descubre una ruta que
mejora el récord global, `updateHeuristics` promueve cada arista de la ruta
élite:

```javascript
_moveToFront(city, target) {
    const list = this.localHeuristics[city];
    if (list[0] === target) return;
    const idx = list.indexOf(target);
    if (idx > 0) {
        for (let k = idx; k > 0; k--) {
            list[k] = list[k - 1];
        }
        list[0] = target;
    }
}
```

Dos propiedades estructurales que suelen pasar desapercibidas:

1. **El orden relativo de los no promovidos se preserva**: todos bajan un
   puesto, pero no se reordenan entre sí. No es un _swap_; es un
   **desplazamiento de rangos**. Esto es relevante porque implica que la lista
   mantiene un orden total consistente, es decir, un _ranking_ bien definido —
   exactamente lo que una política ordenada requiere.
2. **La lista es una rejilla aritmética uniforme de logits**. Si se parametriza
   la preferencia como $\text{logit}(r) = -\lambda r$ (donde $r$ es el rango),
   entonces la lista **es** una discretización: la posición 0 corresponde a
   $\text{logit}=0$, la 1 a $-\lambda$, la 2 a $-2\lambda$, etc. La constante
   $\lambda$ es el "espaciado" implícito de la rejilla.

### 1.2 La formalización

Sea la política de transición con logits $W \in \mathbb{R}^{N \times N}$ y
temperatura $\tau$:

$$\pi(v \mid u) = \frac{\exp(W_{u,v}/\tau)}{\sum_{w} \exp(W_{u,w}/\tau)}$$

El gradiente de la pérdida de entropía cruzada sobre una arista élite $(u, v^*)$
es el clásico residual de la regresión logística:

$$\frac{\partial \mathcal{L}}{\partial W_{u,v}} = \pi(v \mid u) - \mathbb{I}\big[(u,v) \in S^*\big]$$

lo que da la actualización aditiva:

$$W_{u,v^*} \leftarrow W_{u,v^*} + \eta\,\big(1 - \pi(v^* \mid u)\big)$$

Ahora la observación clave. Si en lugar de parametrizar en logits se parametriza
**directamente en el símplex de probabilidades**, la actualización de
**Exponentiated Gradient** (o _Multiplicative Weights_) sobre el mismo objetivo
es:

$$p \leftarrow \frac{p \odot e^{\eta q}}{\langle p,\, e^{\eta q}\rangle}, \qquad q = \text{one-hot}(v^*)$$

donde $\odot$ es el producto elemento a elemento. Esto es **exactamente** el
efecto de `_moveToFront`: multiplica la masa de probabilidad de la arista
elegida y renormaliza.

| Operación                                 | En probabilidades                                 | En logits                                                                    |
| :---------------------------------------- | :------------------------------------------------ | :--------------------------------------------------------------------------- |
| Paso de gradiente (CE sobre arista élite) | $p \propto p \odot e^{\eta q}$                    | $W_{u,v^*} \leftarrow W_{u,v^*} + \eta(1-\pi(v^* \mid u))$                   |
| `_moveToFront(u, v*)`                     | $p \propto p \odot e^{\lambda q}$ con $q$ one-hot | desplazamiento de rangos **+ re-cuantización a la rejilla** $\{-\lambda r\}$ |

Por tanto:

> **`_moveToFront` = un paso de Exponentiated Gradient / Mirror Descent exacto,
> atenuado por dos factores: (a) un objetivo _one-hot idealizado_ (sin modular
> por la magnitud real de la mejora), y (b) una proyección final sobre la
> variedad discreta de permutaciones que elimina toda la magnitud.**

Esto es riguroso y no una analogía vaga: las actualizaciones multiplicativas en
el símplex corresponden a **descenso espejo con divergencia KL**, y
Exponentiated Gradient es su instancia canónica. El update de k-Alternatives
_vive_ en esa familia.

### 1.3 Los tres defectos conocidos y su causa raíz única

El documento de propuesta previo enumera tres limitaciones de la versión
discreta. La lectura anterior les asigna **una causa raíz común**:

| Defecto                                                                                                                            | Causa raíz                                                                                                                                                                   |
| :--------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Olvido catastrófico**: una arista mediocre promovida por azar borra inmediatamente el aprendizaje previo                         | Factor **(b)**, la re-cuantización: al reducir el estado a posiciones enteras se pierde toda la información de magnitud, así que no existe "inercia" que amortigüe el cambio |
| **Sin modulación por recompensa**: una mejora del 0.01% pesa igual que una del 15%                                                 | Factor **(a)**, objetivo one-hot idealizado: no se usa el incremento real de coste como señal                                                                                |
| **Pérdida de relaciones de segundo orden**: solo `list[0]` se beneficia; las posiciones intermedias sufren desplazamientos pasivos | Factor **(b)**: un _ranking_ reconstruye el orden, no las distancias relativas entre alternativas                                                                            |

Se trata, por tanto, de **la misma enfermedad vista desde tres ángulos**, y la
cura es también única: **no proyectar sobre la rejilla discreta y usar la señal
de recompensa real**.

---

## 2. La familia interpolante: un único espacio que contiene ambos mundos

En lugar de plantear "opción discreta vs opción neuronal", se define una
**familia paramétrica** cuyos dos extremos son los dos algoritmos:

$$
W \leftarrow W - \eta \,\nabla_W \mathcal{L}, \qquad
\mathcal{L} = \underbrace{-\sum_{(u,v) \in S^*} \log \pi(v \mid u)}_{\text{atracción sobre la élite}} \;+\; \underbrace{\frac{\mu}{2}\|W\|^2}_{\text{repulsión / olvido controlado}}
$$

| Parámetro                     | k-Alternatives actual                              | Régimen continuo                 | Qué controla                                       |
| :---------------------------- | :------------------------------------------------- | :------------------------------- | :------------------------------------------------- |
| $\eta$ (learning rate)        | $\to \infty$ (saltar directamente a la posición 0) | finito (SGD / Adam)              | Tamaño de paso; **arregla el olvido catastrófico** |
| $\alpha$ (smoothing de élite) | $1.0$ (reemplazo total)                            | $0.9\text{–}0.99$                | Preservación del conocimiento previo               |
| $\tau$ (temperatura)          | implícito (argmax duro)                            | finito                           | Temperatura de exploración                         |
| $k$                           | presupuesto discreto de desvíos                    | **top-$k$ del softmax truncado** | Exploración                                        |
| $\mu$ (weight decay)          | ausente                                            | presente                         | Evita el colapso a una política one-hot            |

### 2.1 Equivalencia $\tau \longleftrightarrow k$

Muestrear del top-$k$ de un softmax a temperatura $\tau$ es _sampling truncado_.
Por tanto:

> **$k$ es una temperatura cuantizada.**

Y el bucle `currentK++` de `solve()` (en
[`src/k-optimizer.js`](../src/k-optimizer.js)) es, bajo esta lectura, un
**recocido de temperatura (annealing) ad-hoc**: empieza con presupuesto 0, va
subiendo, y repite el mismo $K$ mientras haya mejoras. El gradiente ofrece la
versión principiada: $\tau_t$ **continuo** y $k$ **aprendido** (una salida extra
de la red, o un _schedule_ derivado de la entropía de la política).

### 2.2 Coartada teórica: EDA / Cross-Entropy Method / NES

Un update de élite con factor de suavizado $\alpha$ sobre el símplex,

$$p_{t+1} = (1-\alpha)\,p_t + \alpha\,q_t,$$

es la familia de las **Estimation of Distribution Algorithms** (y el
**Cross-Entropy Method**). Con $\alpha = 1$ y $q$ one-hot se degenera
exactamente en `_moveToFront`. Y esta familia, parametrizada en el espacio
natural de la distribución, es **Natural Evolution Strategies**: ascenso por
**gradiente natural** con la métrica de Fisher.

Conclusión: **k-Alternatives es un NES/EDA degenerado** ($\alpha \to 1$, élite
one-hot, $\eta = \lambda$). No es una analogía: es un caso límite. Y esto es
estratégicamente valioso porque dota al puente de literatura consolidada y de
garantías de convergencia conocidas para EDA/CEM.

---

## 3. Conexión con _blackbox differentiation_: $k$ es el $\lambda$ que ya tienes

En **Vlastelica et al., "Differentiation of Blackbox Combinatorial Solvers"
(ICLR 2020)** se propone obtener un gradiente a través de un solver combinatorio
**duro** (Gurobi, Blossom V, Dijkstra) sin relajarlo, _perturbando su objetivo_:

$$y_\lambda(w) = \arg\min_{y} \Big[ \langle w, y \rangle - \lambda \Big\langle \tfrac{dL}{dy},\, y \Big\rangle \Big]$$

y usando la **diferencia finita entre la solución original y la perturbada**
como estimador del gradiente:

$$\frac{\partial}{\partial w} \;\approx\; \frac{1}{\lambda}\big(y_\lambda(w) - y(w)\big)$$

Su argumento central es exactamente el que conviene tener presente: **cualquier
algoritmo diferenciable resuelve una relajación, y las relajaciones
combinatorias inducen cotas inferiores de aproximación**, luego una relajación
_no puede_ ser óptima. Su solución es no relajar el solver y diferenciar solo a
través de la _interfaz_.

**El mapeo con k-Alternatives es directo:**

| Blackbox differentiation             | k-Alternatives                                                |
| :----------------------------------- | :------------------------------------------------------------ |
| $\lambda$ = escala de disrupción     | **$k$** = presupuesto de desvíos (grafo-estructurado, entero) |
| $y(w)$ = solución original           | $S_{k=0}$ = solución greedy                                   |
| $y_\lambda(w)$ = solución perturbada | $S_{k=1}$ = solución con un desvío                            |
| Gradiente $\propto y_\lambda - y$    | $\Delta$ entre las dos soluciones (aristas que cambian)       |

Es decir:

> **k-Alternatives genera gratis, y de forma semánticamente estructurada, el par
> $(y,\, y_\lambda)$ que la literatura obtiene con un solver externo perturbado.
> El presupuesto $k$ es un $\lambda$ con significado de grafo.**

Esto es lo más original de esta sesión porque **no requiere entrenar nada**: la
señal de gradiente está latente en la diferencia entre dos soluciones hermanas
del árbol LDS.

> **Advertencia metodológica (de su propio _appendix_):** $\lambda$ debe ser lo
> bastante grande como para que $y_\lambda \neq y$, o el gradiente es
> idénticamente cero. En clave k-Alternatives: **si $k$ es demasiado pequeño,
> $S_{k=1} = S_{k=0}$ y no hay señal.** Los autores dan la regla de magnitud
> $\lambda \approx \langle w \rangle / \langle dL/dy \rangle$, que sugiere que
> **el $k$ útil para estimar gradiente no es el $k$ útil para buscar**, y ambos
> deben escalarse.

---

## 4. Vía D — _zero-order_ estructurado (no contemplada en la propuesta previa)

El documento `propuesta-integracion-redes-neuronales.md` cubre las Vías A (GNN +
decoder), B (gradiente _in-instance_) y C (búsqueda diferenciable). Falta una
cuarta, que engancha directamente con otra línea del portfolio (`dge-optimizer`,
`cameo-zo`, `seismic-descent`):

> En optimización **zero-order** (DGE, SPSA, MeZO, CAMEO-ZO) el gradiente se
> estima perturbando $\theta$ en **direcciones aleatorias isotrópicas**
> $z \sim \mathcal{N}(0, I)$ y midiendo diferencias finitas. El problema
> conocido es que esas direcciones **no tienen significado estructural**: son
> ruido.

**Las k-desviaciones son direcciones de perturbación _semánticas y
estructuradas_.** Un desvío $k=1$ no es ruido: es "sustituye esta arista por la
segunda mejor opción según la heurística". Es una perturbación **alineada con el
problema**, no isotrópica.

### Vía D: el esquema

1. Construye $S_{k=0}$ y $S_{k=1}$ (dos corridas del solver, ya existentes).
2. Calcula $\Delta = \{e \in S_{k=1} \setminus S_{k=0}\}$ (aristas
   intercambiadas).
3. Interpreta $\Delta/k$ como **dirección de descenso estructurada** sobre $W$
   (o, vía cadena de reparametrización, sobre los parámetros $\theta$ de una red
   pequeña).
4. Aplica el paso con un optimizador clásico (Adam).

**Ventajas frente a zero-order clásico:**

- Direcciones con estructura de grafo ⇒ menor varianza del estimador, mejor
  condicionamiento.
- No requiere diferenciabilidad del problema (ni relajación de la permutación,
  ni Gumbel-Sinkhorn).
- **Reutiliza la maquinaria validada en `dge-optimizer`** (entrenar sin
  gradiente analítico), pero cambiando ruido isotrópico por perturbaciones
  estructuradas. Es un puente _real_ con esa línea de investigación, y **un
  paper distinto al de NCO**.

**Riesgo honesto:** el número de direcciones distintas está acotado por el
tamaño del árbol LDS ($O(N^k)$), no es infinito como en el ruido gaussiano.
Habrá que medir si la diversidad de direcciones basta para entrenar, o si
requiere mezclar con ruido para preservar la propiedad de cobertura.

---

## 5. Hipótesis falsable fuerte: $k_{50}$ depende del _prior_, no del problema

Aquí el propio análisis empírico del repo
(`docs/analisis-algoritmico-alternativas.md`) se convierte en combustible. El
modelo sigmoide ajustado fue:

$$
P(N, k) = \frac{100}{1 + e^{-\gamma (k - k_{50})}}, \qquad
k_{50} \approx 0.85 \ln N - 0.25 \quad (\text{instancias euclídeas})
$$

donde $k_{50}$ es el presupuesto de discrepancia con el que la probabilidad de
hallar el óptimo es exactamente del 50%.

**Hipótesis:**

$$k_{50} = k_{50}(W_0), \qquad \frac{\partial k_{50}}{\partial\,(\text{calidad de } W_0)} < 0$$

Es decir: **el umbral de discrepancia no es una propiedad intrínseca del
problema, sino de la calidad del prior heurístico.** A mejor matriz de logits
inicial, menos desvíos hacen falta para cerrar el ciclo óptimo.

### 5.1 Por qué es importante

1. Es **falsable**, **barato** y con señal medible en horas.
2. Si se confirma, entonces **$k$ es aprendible** y deja de ser un
   hiperparámetro: el `currentK++` heurístico se reemplaza por un _schedule_
   principiado derivado de $\tau$ o de la entropía de la política.
3. Explica y refuerza el hallazgo ya documentado para Knapsack: _"Multi-Start
   alone (K=0) solves hard Knapsack instances"_. Bajo esta hipótesis, eso es un
   caso de **prior excelente** (el ratio valor/peso ordena casi perfectamente
   esas instancias), luego $k_{50} \approx 0$. No es una anomalía del Knapsack:
   es la hipótesis en acción.

### 5.2 Protocolo experimental propuesto

| Paso                      | Descripción                                                                                                      |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------- |
| **Instancia**             | `berlin52` (euclídea pura) y `dantzig42` (EXPLICIT, irregular) — ya presentes en `tsplib-json/`                  |
| **Brazo (a)**             | Prior euclídeo actual (baseline `localHeuristics` = vecinos más cercanos)                                        |
| **Brazo (b)**             | Prior euclídeo + $T$ pasos de gradiente suave (ver §6)                                                           |
| **Brazo (c)**             | Prior aleatorio (control negativo)                                                                               |
| **Barrido**               | $k \in [0..5]$, $M = 50$ ejecuciones independientes por celda (mismo protocolo que el análisis existente)        |
| **Medición**              | Ajustar $P(N,k)$ por celda y extraer $k_{50}$                                                                    |
| **Criterio de éxito**     | $k_{50}^{(a)} > k_{50}^{(b)}$ de forma monótona respecto al número de pasos $T$; y $k_{50}^{(c)} > k_{50}^{(a)}$ |
| **Criterio de falsación** | $k_{50}$ invariante a la calidad del prior ⇒ la hipótesis cae y $k$ es genuinamente del problema                 |

**Instrumentación ya disponible:** `scripts/tsp-stats.js` y
`scripts/algorithmic-experiment.js` ya hacen barridos $k \times N$ con
repeticiones y ajuste de modelos, por lo que el experimento es mayormente una
**extensión de harness existente**, no código nuevo.

---

## 6. Los dos arreglos mínimos, ejecutables hoy en JavaScript puro

Son el "puente" en su versión más pragmática: **sin PyTorch, sin red neuronal,
dentro de este repo, y sin cambiar la complejidad asintótica**.

### Fix 1 — Atracción + repulsión (regla de aprendizaje con _forgetting_)

El update actual solo **atrae** ($W_{u,v^*} \uparrow$), nunca **repele**. Añadir
el término de decaimiento controlado:

```
// Señal de recompensa real (no one-hot): usar el % de mejora
const gain = (prevBest - newBest) / prevBest;

// Atracción modulada por la mejora real
W[u][v*] += eta * gain * (1 - pi(v* | u));

// Repulsión / olvido controlado sobre el resto de candidatos de u
for (const w of candidateList[u]) if (w !== v*) W[u][w] *= (1 - alpha);
```

| Aspecto              | Valor                                                                                                                         |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **Coste por mejora** | $O(N \cdot C)$ con $C = $ `candidateListSize` ($=20$ por defecto). **Idéntico** al coste actual de `list.indexOf` + `rotate`. |
| **Memoria**          | $O(N \cdot C)$, **no** $O(N^2)$. El puente es prácticamente gratis en ingeniería.                                             |
| **Numérics**         | Softmax sobre 20 candidatos: trivial y numéricamente estable.                                                                 |
| **Lo que arregla**   | Modulación por recompensa (factor a) y olvido catastrófico (factor b, parcialmente)                                           |

### Fix 2 — Eliminar la re-cuantización

No ordenar `localHeuristics[u]` por _posición_; ordenarla **por logit** y
guardar el logit:

```
// El estado es W, no la lista.
// La lista sigue existiendo (compatibilidad con getHeuristicChoices()),
// pero pasa a ser un DERIVADO de W, recalculado al vuelo.
const order = candidateList[u].slice().sort((a, b) => W[u][b] - W[u][a]);
```

Esto preserva la interfaz de `getHeuristicChoices()` (el contrato con
`k-optimizer.js` no cambia), pero **el aprendizaje deja de perder magnitud**. Es
el cambio de mayor impacto conceptual con el menor impacto de refactor.

### 6.1 Pregunta que responde el A/B

> **¿La convergencia suave del gradiente logra escapar de óptimos locales donde
> el `Move-to-Front` discreto se queda estancado?**

Es exactamente la pregunta abierta que dejó la propuesta previa (§5, "Plan de
Validación para la Fase 1"), y este A/B la responde **enteramente en JS**, con
el mismo harness de benchmarks, sin montar infraestructura de entrenamiento. Es
el 80% del valor con el 10% del coste.

---

## 7. Límites honestos: dónde el puente NO funciona

No conviene sobrevender. Hay tres fronteras reales, y conviene escribirlas
explícitamente porque delimitan el _claim_ defendible.

### 7.1 El árbol de búsqueda y la poda son genuinamente discretos

`canPrune` en [`src/tsp-solver.js`](../src/tsp-solver.js) es una decisión
binaria:

```javascript
canPrune(partialSolution, currentCost) {
    return currentCost >= this.bestValue;   // comparación no diferenciable
}
```

Se puede relajar (perturbed optimizers, diferenciación de Branch & Bound), pero
**se pierden las garantías** — que es precisamente el argumento de Vlastelica:
_todo algoritmo diferenciable resuelve una relajación, y las relajaciones
combinatorias tienen cotas inferiores de aproximación_.

> **Regla de diseño resultante: puentear la _política_ (los logits), no la
> _búsqueda_. La búsqueda debe seguir siendo dura y exacta.**

Esto es una restricción de diseño, pero también una ventaja: conservas la
estructura algorítmica de k-Alternatives (poda B&B, LDS, multi-start) intacta, y
solo cambias **cómo se aprende el orden de las alternativas**. El árbol sigue
dando garantías; la política mejora.

### 7.2 La literatura NCO no supera a los solvers clásicos

**Liu, Zhang, Tang & Yao, "How Good Is Neural Combinatorial Optimization? A
Systematic Evaluation on the TSP" (IEEE Computational Intelligence
Magazine, 2023)** evaluaron NCO frente a solvers tradicionales en cinco ejes —
_effectiveness, efficiency, stability, scalability, generalization ability_ — y
su conclusión literal es:

> _"the solvers learned by NCO approaches, in general, still fall short of
> traditional solvers in nearly all these aspects."_

El único beneficio claro identificado es **eficiencia de tiempo y energía en
instancias pequeñas, si se dispone de suficientes instancias de entrenamiento**.

**Consecuencia estratégica:** no competir con LKH ni Concorde. Competir donde
k-Alternatives **ya** gana: _zero-config_, _in-instance_ sin entrenamiento
previo, $N < 200$, y ejecución _client-side_ en JS/navegador. Ahí el gradiente
no aporta "más calidad que LKH": aporta **necesitar menos $k$ (menos cómputo)
para la misma calidad**, junto con mejor comportamiento frente a óptimos
locales. **Ese es el claim defendible, y es más estrecho — y por tanto más
fuerte — que "superar a Concorde".**

### 7.3 Generalización de escala

Una red entrenada a $N=50$ degrada notablemente a $N=200$ (ya señalado en la
propuesta previa, Vía A). Es una limitación estructural de los modelos
amortizados (_amortized_): los parámetros se comparten entre instancias y el
sesgo inductivo no escala con el tamaño.

**Ventaja diferencial de k-Alternatives:** el estado $W$ es **por-instancia**,
no por-red. No hay transferencia que se rompa al cambiar $N$. Es una fortaleza
que merece estar en el _abstract_ del paper, no solo en las limitaciones.

---

## 8. Plan por fases con criterio de falsación

Ordenado por **relación valor/coste**: las fases 0-2 dan el 80% del valor sin
salir de JavaScript.

| Fase  | Qué                                                                                                                         | Framework                | Criterio de éxito                                  | Coste estimado |
| :---- | :-------------------------------------------------------------------------------------------------------------------------- | :----------------------- | :------------------------------------------------- | :------------- |
| **0** | Verificar la formalización EG: reproducir `_moveToFront` como un paso de Exponentiated Gradient con $\lambda$ en ~50 líneas | JS / NumPy               | Identidad exacta de la distribución resultante     | ~1 h           |
| **1** | A/B _in-instance_: `_moveToFront` vs. gradiente suave (Fix 1 + Fix 2) sobre `berlin52`, `dantzig42` y Knapsack              | **JS puro** (mismo repo) | Menos óptimos locales, gap $\le$, y $k_{50}$ menor | 1–2 días       |
| **2** | Barrido $k_{50}(W)$ — **el experimento estrella** (§5)                                                                      | JS (`scripts/`)          | Curva monótona decreciente                         | 1 día          |
| **3** | $k$ aprendido: sustituir `currentK++` por _schedule_ derivado de $\tau$ / entropía                                          | JS                       | Misma calidad con menos iteraciones                | 2–3 días       |
| **4** | Vía D (_zero-order_ estructurado): par $(S_0, S_1) \to$ gradiente en $\theta$ de una red pequeña                            | PyTorch                  | Supera a SPSA/MeZO con el mismo presupuesto        | ~1 semana      |
| **5** | Solo si 1–4 dan señal: Vía A (GNN/PointerNet + decoder LDS), o formalización teórica completa                               | PyTorch                  | —                                                  | largo plazo    |

**Nota sobre el entorno:** el workspace ya dispone de `torch 2.10.0` y
`python 3.14.2`, y `node v24.13.0`, así que las fases 0-3 no requieren instalar
nada y la fase 4 no requiere infraestructura nueva.

---

## 9. El artefacto más elegante: un solo parámetro con dos anclas

El resultado con mayor potencial de publicación sería **un único parámetro de
control $\eta \in (0, \infty]$** con dos anclas verificadas empíricamente:

- $\eta \to \infty$ ⟹ reproduce **exactamente** el k-Alternatives actual (no una
  aproximación: el mismo algoritmo).
- $\eta$ finito ⟹ **NES / Cross-Entropy Method** sobre la política de
  permutación.

**Título tentativo:**

> _"Limited Discrepancy Search as the infinite-step-size limit of
> natural-gradient descent on a permutation policy"_

Esto transforma un "brainstorming de arquitectura" en una **contribución teórica
con validación empírica**, mucho más defendible ante revisores que una propuesta
del tipo "combinemos tu algoritmo con una GNN". La estructura del paper sería:

1. Formalizar el espacio de políticas y demostrar la equivalencia EG (Fase 0).
2. Demostrar $\eta \to \infty \Rightarrow$ `_moveToFront` (teorema, no
   analogía).
3. Validar empíricamente que $\eta$ finito reduce $k_{50}$ (Fases 1-2).
4. Extensión: $k$ aprendido vía $\tau$ (Fase 3).

---

## 10. Resumen de decisiones y recomendación

| #   | Idea                                                      | Naturaleza                | Coste    | Valor                        |
| :-- | :-------------------------------------------------------- | :------------------------ | :------- | :--------------------------- |
| 1   | `_moveToFront` = Exponentiated Gradient + re-cuantización | **Teórico (verificable)** | ~1 h     | Alto                         |
| 2   | k-Alternatives = NES/EDA degenerado                       | Teórico                   | —        | Alto (da coartada literaria) |
| 3   | $k \cong \lambda$ de _blackbox differentiation_           | **Conceptual (original)** | —        | Muy alto                     |
| 4   | Vía D: _zero-order_ estructurado                          | Arquitectónico (nuevo)    | ~1 sem   | Alto                         |
| 5   | Hipótesis $k_{50}(W)$                                     | **Empírico (falsable)**   | 1 día    | Muy alto                     |
| 6   | Fix 1 + Fix 2 en JS puro                                  | Implementación            | 1–2 días | Alto                         |
| 7   | $k$ aprendido vía $\tau$                                  | Diseño                    | 2–3 días | Medio-alto                   |

**Recomendación:** empezar por las **Fases 0-2, en JavaScript y sin tocar
PyTorch**. Validan las dos hipótesis centrales (la equivalencia EG y la
dependencia $k_{50}(W)$) con el harness ya existente, antes de invertir en
infraestructura de entrenamiento. Si esas fases dan señal, la Fase 4 (Vía D) es
el salto natural, y conecta con una línea de investigación ya activa en el
portfolio.

---

## Referencias

1. **Harvey, W. D., & Ginsberg, M. L. (1995).** _Limited Discrepancy Search._
   IJCAI. (Base teórica del parámetro $k$.)
2. **Vlastelica, M., Paulus, A., Musil, V., Martius, G., & Rolínek, M. (2020).**
   _Differentiation of Blackbox Combinatorial Solvers._ ICLR. — Fórmula de
   $y_\lambda(w)$ y del gradiente $\frac{1}{\lambda}(y_\lambda - y)$ verificada
   en el texto original. [arXiv:1912.02175](https://arxiv.org/abs/1912.02175)
3. **Liu, S., Zhang, Y., Tang, K., & Yao, X. (2023).** _How Good Is Neural
   Combinatorial Optimization? A Systematic Evaluation on the Traveling Salesman
   Problem._ IEEE Computational Intelligence Magazine. — Veredicto sobre NCO vs.
   solvers clásicos. [arXiv:2209.10913](https://arxiv.org/abs/2209.10913)
4. **Kool, W., van Hoof, H., & Welling, M. (2019).** _Attention, Learn to Solve
   Routing Problems!_ ICLR.
5. **Bello, I., Pham, H., Le, Q. V., Norouzi, M., & Bengio, S. (2016).** _Neural
   Combinatorial Optimization with Reinforcement Learning._
   [arXiv:1611.09940](https://arxiv.org/abs/1611.09940)
6. **Beck, A., & Teboulle, M. (2003).** _Mirror Descent and Nonlinear Projected
   Gradient Methods for Convex Optimization._ Operations Research Letters. (Base
   del Exponentiated Gradient.)
7. **Wierstra, D., Schaul, T., Glasmachers, T., Sun, Y., Peters, J., &
   Schmidhuber, J. (2014).** _Natural Evolution Strategies._ JMLR.
   (k-Alternatives como NES degenerado.)
8. **Rubinstein, R. Y., & Kroese, D. P. (2004).** _The Cross-Entropy Method._
   Springer. (Familia EDA/CEM.)
9. **Malladi, S., et al. (2023).** _MeZO: Fine-Tuning Language Models with Just
   Forward Passes._ NeurIPS. (Contexto de la Vía D.)

---

_Documento de brainstorming teórico. Complementa —no sustituye— a
[`propuesta-integracion-redes-neuronales.md`](propuesta-integracion-redes-neuronales.md)._
