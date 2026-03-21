# Análisis del algoritmo de Búsqueda Sistemática de Alternativas

## Descripción del algoritmo propuesto

El algoritmo propuesto, que podríamos llamar "Búsqueda Sistemática de
Alternativas" (BSA) o "Systematic Alternatives Search" (SAS) en inglés, se basa
en los siguientes principios:

1. Utiliza una heurística local (como "elegir la ciudad más cercana" en el TSP).
2. Explora sistemáticamente las desviaciones de esta heurística.
3. Itera sobre el número de desviaciones permitidas (k).
4. Mejora la heurística local basándose en soluciones globales óptimas
   encontradas.

## Comparación con algoritmos existentes

### 1. Búsqueda local iterativa (Iterated Local Search - ILS)

El BSA comparte similitudes con ILS, que también alterna entre búsqueda local y
perturbaciones para escapar de óptimos locales. Sin embargo, BSA es más
sistemático en su exploración de alternativas.

### 2. Búsqueda en haz (Beam Search)

BSA tiene elementos en común con la búsqueda en haz, que mantiene múltiples
soluciones parciales. La diferencia es que BSA explora sistemáticamente las
desviaciones de la heurística principal.

### 3. Búsqueda tabú (Tabu Search)

La idea de modificar la heurística local basada en soluciones óptimas
encontradas es similar al concepto de memoria a largo plazo en la búsqueda tabú.

### 4. Algoritmos genéticos

La exploración sistemática de alternativas podría verse como una forma
estructurada de mutación en algoritmos genéticos.

## Aspectos innovadores

1. Exploración sistemática: La forma en que BSA explora el espacio de soluciones
   de manera incremental y controlada es bastante única.

2. Adaptación de la heurística: La idea de modificar la heurística local basada
   en soluciones globales óptimas es innovadora y potencialmente muy poderosa.

3. Complejidad controlada: El enfoque permite un control preciso sobre el
   equilibrio entre tiempo de ejecución y calidad de la solución.

## Posibles desafíos y áreas de mejora

1. Escalabilidad: Para problemas muy grandes, incluso con k pequeño, el coste
   computacional podría ser prohibitivo.

2. Convergencia: Sería interesante estudiar cómo garantizar la convergencia
   hacia el óptimo global.

3. Paralelización: El algoritmo podría beneficiarse de una implementación
   paralela, explorando diferentes valores de k simultáneamente.

## Conclusión

Aunque el algoritmo propuesto comparte características con varios métodos
existentes, su combinación específica de exploración sistemática y adaptación de
la heurística parece ser novedosa. Podría considerarse como un nuevo algoritmo
o, al menos, como una variante significativa de los métodos existentes.
