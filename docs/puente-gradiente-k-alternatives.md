# Puente entre k-Alternatives y el Descenso del Gradiente

**Fecha:** 19 de septiembre de 2026  
**Estado:** Análisis teórico y propuesta matemática  
**Autoría conceptual (k-Alternatives):** Mario Raúl Carbonell Martínez  
**Documento relacionado:**
[`propuesta-integracion-redes-neuronales.md`](propuesta-integracion-redes-neuronales.md)
(Vías A/B/C)

---

## 0. Resumen ejecutivo

La pregunta de partida era: _¿es posible crear algoritmos de optimización
combinatoria que funcionen con descenso del gradiente, tendiendo un puente entre
la optimización clásica y las redes neuronales?_

La conclusión de esta formalización es contraintuitiva:

> **El puente no consiste en añadir una arquitectura neuronal al algoritmo.
> Consiste en _dejar de redondear los logits_.**

Es decir: **k-Alternatives ya realiza una forma de descenso de gradiente
discreto**. Concretamente, `_moveToFront` es un paso de _Exponentiated Gradient
/ Mirror Descent con divergencia KL_ **exacto**, seguido de una
**re-cuantización** sobre la variedad discreta de permutaciones que destruye la
magnitud del aprendizaje. Los tres defectos conocidos del algoritmo (olvido
catastrófico, falta de modulación por recompensa, pérdida de relaciones de
segundo orden) tienen por tanto **una única causa raíz común**: la cuantización,
no el mecanismo de aprendizaje.

Consecuencias prácticas de esta lectura:

1. El "puente diferenciable" es **una familia paramétrica de un solo parámetro**
   con dos anclas verificables: `η → ∞` reproduce _exactamente_ el
   k-Alternatives actual; `η` finito da el régimen continuo (NES / Cross-Entropy
   Method).
2. **`k` no es un hiperparámetro arbitrario, es la temperatura $\tau$
   cuantizada** — y por tanto es **aprendible**.
3. Existe una **Vía D** (zero-order estructurado) que conecta con la
   optimización libre de gradiente explícito sobre variedades combinatorias.
4. Los dos "arreglos" mínimos son **ejecutables en JavaScript puro**, dentro de
   este repo y con el harness de benchmarks ya existente, **sin dependencias
   externas** y **sin cambiar la complejidad asintótica**.

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

Las limitaciones observadas en la versión discreta tienen **una causa raíz
común**:

| Defecto                                                                                                                            | Causa raíz                                                                                                                                                                   |
| :--------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Olvido catastrófico**: una arista mediocre promovida por azar borra inmediatamente el aprendizaje previo                         | Factor **(b)**, la re-cuantización: al reducir el estado a posiciones enteras se pierde toda la información de magnitud, así que no existe "inercia" que amortigüe el cambio |
| **Sin modulación por recompensa**: una mejora del 0.01% pesa igual que una del 15%                                                 | Factor **(a)**, objetivo one-hot idealizado: no se usa el incremento real de coste como señal                                                                                |
| **Pérdida de relaciones de segundo orden**: solo `list[0]` se beneficia; las posiciones intermedias sufren desplazamientos pasivos | Factor **(b)**: un _ranking_ reconstruye el orden, no las distancias relativas entre alternativas                                                                            |

Se trata de **la misma propiedad vista desde tres ángulos**, y la vía de
refinamiento analítico es: **no proyectar sobre la rejilla discreta y usar la
señal de recompensa real**.

---

## 2. La familia interpolante: un único espacio que contiene ambos mundos

En lugar de plantear "opción discreta vs opción neuronal", se define una
**familia paramétrica** cuyos dos extremos son los dos regímenes:

$$
W \leftarrow W - \eta \,\nabla_W \mathcal{L}, \qquad
\mathcal{L} = \underbrace{-\sum_{(u,v) \in S^*} \log \pi(v \mid u)}_{\text{atracción sobre la élite}} \;+\; \underbrace{\frac{\mu}{2}\|W\|^2}_{\text{repulsión / olvido controlado}}
$$

| Parámetro                     | k-Alternatives actual                              | Régimen continuo                 | Qué controla                                         |
| :---------------------------- | :------------------------------------------------- | :------------------------------- | :--------------------------------------------------- |
| $\eta$ (learning rate)        | $\to \infty$ (saltar directamente a la posición 0) | finito (SGD / Adam)              | Tamaño de paso; **amortigua el olvido catastrófico** |
| $\alpha$ (smoothing de élite) | $1.0$ (reemplazo total)                            | $0.9\text{–}0.99$                | Preservación del conocimiento previo                 |
| $\tau$ (temperatura)          | implícito (argmax duro)                            | finito                           | Temperatura de exploración                           |
| $k$                           | presupuesto discreto de desvíos                    | **top-$k$ del softmax truncado** | Exploración                                          |
| $\mu$ (weight decay)          | ausente                                            | presente                         | Evita el colapso a una política one-hot              |

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
one-hot, $\eta = \lambda$). No es una analogía: es un caso límite. Y esto dota
al puente de literatura consolidada y de garantías de convergencia conocidas
para EDA/CEM.

---

## 3. Conexión con _blackbox differentiation_: $k$ es el $\lambda$ que ya tienes

En **Vlastelica et al., "Differentiation of Blackbox Combinatorial Solvers"
(ICLR 2020)** se propone obtener un gradiente a través de un solver combinatorio
**duro** (Gurobi, Blossom V, Dijkstra) sin relajarlo, _perturbando su objetivo_:

$$y_\lambda(w) = \arg\min_{y} \Big[ \langle w, y \rangle - \lambda \Big\langle \tfrac{dL}{dy},\, y \Big\rangle \Big]$$

y usando la **diferencia finita entre la solución original y la perturbada**
como estimador del gradiente:

$$\frac{\partial}{\partial w} \;\approx\; \frac{1}{\lambda}\big(y_\lambda(w) - y(w)\big)$$

Su argumento central es: **cualquier algoritmo diferenciable resuelve una
relajación, y las relajaciones combinatorias inducen cotas inferiores de
aproximación**, luego una relajación _no puede_ ser óptima. Su solución es no
relajar el solver y diferenciar solo a través de la _interfaz_.

**El mapeo con k-Alternatives es directo:**

| Blackbox differentiation             | k-Alternatives                                                |
| :----------------------------------- | :------------------------------------------------------------ |
| $\lambda$ = escala de disrupción     | **$k$** = presupuesto de desvíos (grafo-estructurado, entero) |
| $y(w)$ = solución original           | $S_{k=0}$ = solución greedy                                   |
| $y_\lambda(w)$ = solución perturbada | $S_{k=1}$ = solución con un desvío                            |
| Gradiente $\propto y_\lambda - y$    | $\Delta$ entre las dos soluciones (aristas que cambian)       |

Es decir:

> **k-Alternatives genera, de forma semánticamente estructurada, el par
> $(y,\, y_\lambda)$ que la literatura obtiene con un solver externo perturbado.
> El presupuesto $k$ es un $\lambda$ con significado de grafo.**

La señal de gradiente está latente en la diferencia entre dos soluciones
hermanas del árbol LDS.

---

## 4. Vía D — _zero-order_ estructurado

El documento `propuesta-integracion-redes-neuronales.md` cubre las Vías A (GNN +
decoder), B (gradiente _in-instance_) y C (búsqueda diferenciable). Una cuarta
vía consiste en:

> En optimización **zero-order** (SPSA, MeZO) el gradiente se estima perturbando
> $\theta$ en **direcciones aleatorias isotrópicas** $z \sim \mathcal{N}(0, I)$
> y midiendo diferencias finitas. Las direcciones aleatorias no tienen
> significado estructural de grafo.

**Las k-desviaciones son direcciones de perturbación _semánticas y
estructuradas_.** Un desvío $k=1$ no es ruido: es "sustituye esta arista por la
segunda mejor opción según la heurística". Es una perturbación **alineada con el
problema**, no isotrópica.

### Esquema de la Vía D

1. Construye $S_{k=0}$ y $S_{k=1}$ (dos corridas del solver).
2. Calcula $\Delta = \{e \in S_{k=1} \setminus S_{k=0}\}$ (aristas
   intercambiadas).
3. Interpreta $\Delta/k$ como **dirección de descenso estructurada** sobre $W$.
4. Aplica el paso con un optimizador clásico (Adam / SGD).

---

## 5. Hipótesis falsable fuerte: $k_{50}$ depende del _prior_, no del problema

El modelo sigmoide ajustado empíricamente en
`docs/analisis-algoritmico-alternativas.md` es:

$$
P(N, k) = \frac{100}{1 + e^{-\gamma (k - k_{50})}}, \qquad
k_{50} \approx 0.85 \ln N - 0.25 \quad (\text{instancias euclídeas})
$$

donde $k_{50}$ es el presupuesto de discrepancia con el que la probabilidad
empírica de hallar el óptimo alcanza el 50%.

**Hipótesis:**

$$k_{50} = k_{50}(W_0), \qquad \frac{\partial k_{50}}{\partial\,(\text{calidad de } W_0)} < 0$$

Es decir: **el umbral de discrepancia necesario para cerrar el ciclo óptimo
depende de la calidad del prior heurístico.** A mejor matriz de logits inicial,
menor presupuesto $k$ se requiere.

---

## 6. Los dos arreglos mínimos, ejecutables en JavaScript puro

Sin dependencias externas ni frameworks pesados:

### Fix 1 — Atracción + repulsión (regla de aprendizaje con _forgetting_)

```javascript
// Señal de recompensa real (no one-hot): usar el % de mejora
const gain = (prevBest - newBest) / prevBest;

// Atracción modulada por la mejora real
W[u][vStar] += eta * gain * (1 - pi(vStar, u));

// Repulsión / olvido controlado sobre el resto de candidatos de u
for (const w of candidateList[u]) {
    if (w !== vStar) W[u][w] *= 1 - alpha;
}
```

### Fix 2 — Eliminar la re-cuantización

```javascript
// El estado subyacente es W.
// La lista sigue existiendo para compatibilidad con getHeuristicChoices(),
// pero es un derivado de los pesos continuos:
const order = candidateList[u].slice().sort((a, b) => W[u][b] - W[u][a]);
```

---

## 7. Límites honestos: delimitación del alcance

1. **La búsqueda y la poda son discretas:** `canPrune` es una decisión binaria
   de cota inferior. Se debe puentear la _política_ (los pesos de selección), no
   la estructura combinatoria del árbol.
2. **Posicionamiento frente a SOTA:** k-Alternatives no pretende competir con
   resolvedores exactos globales masivos como Concorde en $N = 80,000$. Su nicho
   defendible es la **metaheurística ligera, client-side, zero-config para
   $N < 200$**, resolviendo instancias con alta velocidad y presupuesto acotado.

---

## 8. Referencias

1. **Harvey, W. D., & Ginsberg, M. L. (1995).** _Limited Discrepancy Search._
   IJCAI.
2. **Vlastelica, M., Paulus, A., Musil, V., Martius, G., & Rolínek, M. (2020).**
   _Differentiation of Blackbox Combinatorial Solvers._ ICLR.
   [arXiv:1912.02175](https://arxiv.org/abs/1912.02175)
3. **Liu, S., Zhang, Y., Tang, K., & Yao, X. (2023).** _How Good Is Neural
   Combinatorial Optimization? A Systematic Evaluation on the Traveling Salesman
   Problem._ IEEE Computational Intelligence Magazine.
   [arXiv:2209.10913](https://arxiv.org/abs/2209.10913)
4. **Beck, A., & Teboulle, M. (2003).** _Mirror Descent and Nonlinear Projected
   Gradient Methods for Convex Optimization._ Operations Research Letters.
5. **Wierstra, D., Schaul, T., Glasmachers, T., Sun, Y., Peters, J., &
   Schmidhuber, J. (2014).** _Natural Evolution Strategies._ JMLR.
6. **Rubinstein, R. Y., & Kroese, D. P. (2004).** _The Cross-Entropy Method._
   Springer.
7. **Sleator, D. D., & Tarjan, R. E. (1985).** _Amortized analysis of list
   update and paging rules._ Communications of the ACM.
8. **Korf, R. E. (1990).** _Real-time heuristic search._ Artificial
   Intelligence.
