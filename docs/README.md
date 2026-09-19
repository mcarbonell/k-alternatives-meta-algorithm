# Documentation Index

Technical documentation for the **k-Alternatives** meta-heuristic.

> **Note on language:** most documents were originally written in Spanish and
> some are kept in their original language. Titles are quoted as-is.

---

## 🎯 Core Algorithm

| Document                                                                                         | Description                                                                                                             |
| :----------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| [`tsp-algorithm.md`](tsp-algorithm.md)                                                           | _k-Deviation Search Algorithm_ — core concept, deviations from local heuristics, adaptive learning.                     |
| [`tsp-insights.md`](tsp-insights.md)                                                             | _Key Insights_ — design rationale and lessons learned while developing the algorithm.                                   |
| [`analisis-busqueda-sistematica-alternativas.md`](analisis-busqueda-sistematica-alternativas.md) | _Análisis del algoritmo de Búsqueda Sistemática de Alternativas_ — how the systematic alternative search is structured. |

## Mathematical Analysis & Benchmarks

| Document                                                                       | Description                                                                                                                                                     |
| :----------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`analisis-algoritmico-alternativas.md`](analisis-algoritmico-alternativas.md) | **Algorithmic analysis & modeling.** Derives the success probability model $P(N,k)$, the gap decay model and the local-minima dynamics from TSPLIB experiments. |
| [`statistical-analysis-plan.md`](statistical-analysis-plan.md)                 | _Cartografía de Mínimos Locales_ — statistical plan for mapping local minima landscapes.                                                                        |
| [`BENCHMARK-README.md`](BENCHMARK-README.md)                                   | Benchmark suite: how to run TSP/Knapsack benchmarks and interpret results.                                                                                      |

## Integration with Neural Networks & Gradient Descent

| Document                                                                                 | Description                                                                                                                                                                                                                                                                                                             |
| :--------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`puente-gradiente-k-alternatives.md`](puente-gradiente-k-alternatives.md)               | **Theoretical bridge to gradient descent.** Shows that the adaptive learning (`Move-to-Front`) is an _Exponentiated Gradient_ step followed by a lossy re-quantization; maps the discrepancy budget `k` onto the `λ` of black-box differentiation; proposes a one-parameter interpolating family with verified anchors. |
| [`propuesta-integracion-redes-neuronales.md`](propuesta-integracion-redes-neuronales.md) | Design proposal for neural integration paths (Vías A/B/C/D) and a phased roadmap.                                                                                                                                                                                                                                       |

## Extensions & Variants

| Document                                                                   | Description                                                                                                        |
| :------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| [`K_ALTERNATIVES_PATHFINDING.md`](K_ALTERNATIVES_PATHFINDING.md)           | Applying k-Alternatives to pathfinding problems.                                                                   |
| [`HASH_TABLES_WITH_K_ALTERNATIVES.md`](HASH_TABLES_WITH_K_ALTERNATIVES.md) | _TSP "engine-style":_ DFS + (I)LDS + heuristic learning + global transposition table + sliding-window patch cache. |
| [`quadtrees.md`](quadtrees.md)                                             | _Implementación del Quadtree en JavaScript_ — spatial index used for neighbourhood queries.                        |
| [`Pathfinding_k-Alternativas.png`](Pathfinding_k-Alternativas.png)         | Pathfinding behaviour diagram.                                                                                     |

## ️ Tooling & Reference

| Document                                         | Description                                                       |
| :----------------------------------------------- | :---------------------------------------------------------------- |
| [`README-CLI.md`](README-CLI.md)                 | TSP command-line interface usage.                                 |
| [`TSPLIB_INFO.md`](TSPLIB_INFO.md)               | TSPLIB/TSPLIB95 format reference and implementation guidelines.   |
| [`CODE_QUALITY_SETUP.md`](CODE_QUALITY_SETUP.md) | Linting, formatting and testing setup (ESLint, Prettier, Vitest). |

---

## Non-published material

`docs/private/` holds drafts, raw brainstorming transcripts, third-party
copyrighted papers and AI-generated evaluations. It is **excluded from version
control** (see `.gitignore`). See [`private/README.md`](private/README.md).
