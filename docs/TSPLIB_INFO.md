
-----
# TSPLIB/TSPLIB95 Information and Implementation Guidelines
by gemini-3-pro-grounding

-----

# Guía de Implementación para Benchmarks TSPLIB

Este documento describe cómo parsear ficheros TSPLIB y, lo más importante, cómo implementar las funciones de distancia **exactas** para que tus resultados sean comparables con los óptimos oficiales.

## 1. Reglas Generales de TSPLIB

1. **Índices Base-1:** En los ficheros `.tsp` y `.tour`, los nodos están numerados empezando por 1. Si tu solver usa arrays base-0, recuerda restar 1 al leer y sumar 1 al escribir el tour.
2. **Distancias Enteras:** El estándar TSPLIB trabaja **siempre** con distancias enteras. Aunque los cálculos intermedios usan `double`, el resultado final entre dos ciudades $i$ y $j$ se redondea antes de sumar al total.
   > **Nota:** No se suma todo en flotante y se redondea al final. Se redondea cada arista $d_{ij}$ individualmente.
3. **Precisión:** Usa siempre `double` (64-bit float) para los cálculos intermedios. `float` (32-bit) puede causar errores de precisión en instancias grandes o en coordenadas geográficas.

---

## 2. Lectura del Fichero .tsp

Un archivo TSPLIB tiene una cabecera con metadatos y secciones de datos.

### Cabeceras Importantes
Debes parsear estas líneas para saber cómo interpretar los datos:
* `DIMENSION`: Número total de nodos ($N$).
* `EDGE_WEIGHT_TYPE`: Define la métrica (la parte más crítica). Valores comunes: `EUC_2D`, `GEO`, `ATT`, `CEIL_2D`, `EXPLICIT`.
* `EDGE_WEIGHT_FORMAT`: Solo si el tipo es `EXPLICIT`. Define cómo leer la matriz (ej. `FULL_MATRIX`, `UPPER_ROW`).

### Sección de Coordenadas (`NODE_COORD_SECTION`)
Aparece si el tipo es geométrico (`EUC_2D`, `GEO`, `ATT`, `CEIL_2D`).
El formato de cada línea es:
```text
<id_nodo> <coordenada_x> <coordenada_y>
```
* **Nota:** Aunque parezcan enteros, léelos como `double`.

---

## 3. Implementación de Funciones de Distancia

Aquí están las implementaciones canónicas en pseudocódigo (estilo C/Python). **Es vital respetar el redondeo**.

### A. Función de Redondeo `nint`
La mayoría de métricas usan el redondeo al entero más cercano.
```python
def nint(x):
    return int(x + 0.5)
```
*Nota: `(int)(x + 0.5)` funciona para números positivos, que son los únicos que veremos en distancias.*

### B. Distancia `EUC_2D` (Euclídea)
Es la más común.
```python
def dist_euc_2d(n1, n2):
    xd = n1.x - n2.x
    yd = n1.y - n2.y
    return nint(math.sqrt(xd*xd + yd*yd))
```

### C. Distancia `CEIL_2D`
Se usa en algunas instancias donde la distancia siempre se redondea hacia arriba (techo).
```python
def dist_ceil_2d(n1, n2):
    xd = n1.x - n2.x
    yd = n1.y - n2.y
    return math.ceil(math.sqrt(xd*xd + yd*yd))
```

### D. Distancia `GEO` (Geográfica)
**Aquí es donde fallan la mayoría de las IAs.** Las coordenadas en el fichero no son latitud/longitud normales; son grados y minutos codificados como `DDD.MM`.
Hay que convertirlos primero a radianes.

**Paso 1: Conversión de coordenadas TSPLIB a Radianes**
```python
PI = 3.141592  # Valor fijo especificado por TSPLIB, no usar math.pi si difiere

def to_rad(coordinate):
    deg = int(coordinate)          # Parte entera son los grados
    min = coordinate - deg         # Parte decimal son los minutos
    # Fórmula extraña de TSPLIB: 
    # (PI * (deg + 5.0 * min / 3.0) / 180.0)
    return PI * (deg + 5.0 * min / 3.0) / 180.0
```

**Paso 2: Cálculo de distancia (Gran Círculo)**
El radio de la tierra está fijado en **6378.388 km**.
```python
RRR = 6378.388

def dist_geo(n1, n2):
    lat1 = to_rad(n1.x)  # En TSPLIB, la primera coord suele ser latitud
    lon1 = to_rad(n1.y)
    lat2 = to_rad(n2.x)
    lon2 = to_rad(n2.y)
    
    q1 = math.cos(lon1 - lon2)
    q2 = math.cos(lat1 - lat2)
    q3 = math.cos(lat1 + lat2)
    
    val = (1.0 + q1) * q2 - (1.0 - q1) * q3
    return int(RRR * math.acos(0.5 * val) + 1.0)
```
*Nota: Fíjate que al final se hace cast a `int` y se suma 1.0. Esta es la especificación exacta.*

### E. Distancia `ATT` (Pseudo-Euclídea)
Usada en problemas como `att48`. Es una distancia "atenuada" para evitar números muy grandes, con una regla de redondeo especial.
```python
def dist_att(n1, n2):
    xd = n1.x - n2.x
    yd = n1.y - n2.y
    rij = math.sqrt((xd*xd + yd*yd) / 10.0)
    tij = nint(rij)
    
    # Regla especial de redondeo hacia arriba si está muy cerca
    if tij < rij:
        return tij + 1
    else:
        return tij
```

---

## 4. Instancias con Matrices Explícitas (`EXPLICIT`)

Si `EDGE_WEIGHT_TYPE` es `EXPLICIT`, no hay coordenadas. Debes leer la matriz de la sección `EDGE_WEIGHT_SECTION`.
El formato `EDGE_WEIGHT_FORMAT` te dice cómo leerla:

* `FULL_MATRIX`: Matriz completa $N \times N$. Lee todos los números seguidos.
* `UPPER_ROW`: Triángulo superior, por filas (sin diagonal).
  * Para $i=1$ a $N-1$:
    * Para $j=i+1$ a $N$: leer peso $d_{ij}$
* `LOWER_DIAG_ROW`: Triángulo inferior, por filas (con diagonal).
  * Para $i=1$ a $N$:
    * Para $j=1$ a $i$: leer peso $d_{ij}$

---

## 5. Validación de Tours

Para validar que tu *solver* funciona bien, debes poder leer los ficheros `.opt.tour` (tours óptimos) o generar tu propio fichero de salida.

**Formato `TOUR_SECTION`:**
Es una lista simple de los índices de los nodos en orden de visita.
* Termina con un `-1`.
* Los índices son base-1.

**Cálculo del Coste Total (Benchmark):**
```python
def calcular_coste_tour(tour, funcion_distancia):
    coste = 0
    N = len(tour)
    for i in range(N):
        nodo_actual = tour[i]
        nodo_siguiente = tour[(i + 1) % N] # El último conecta con el primero
        coste += funcion_distancia(nodo_actual, nodo_siguiente)
    return coste
```

## Checklist para Debugging

Si no obtienes el valor óptimo conocido en un benchmark (ej. `berlin52` óptimo es 7542, `att48` es 10628):

1. **¿Estás cerrando el ciclo?** Asegúrate de sumar la distancia del último nodo de vuelta al primero.
2. **¿Estás usando floats en la suma total?** Debes redondear `d(i,j)` antes de sumarlo a `total_distance`.
3. **¿Es `ATT`?** Revisa la condición `if tij < rij` en la fórmula pseudo-euclídea.
4. **¿Es `GEO`?** Verifica que usas `PI = 3.141592` y no `Math.PI` de tu lenguaje (si difieren significativamente), y que conviertes minutos a grados correctamente con la fórmula `/ 3.0` (que en realidad es `5/3 = 100/60` simplificado para pasar a decimal).



-----
# TSPLIB/TSPLIB95 Information and Implementation Guidelines
by gpt-5.2-search

-----

# Guía práctica (y “sin trampas”) para TSPLIB/TSPLIB95: parseo + distancias + tours + benchmarks

Esta guía está pensada para implementar **un solver “toy” del TSP** que lea instancias **TSPLIB/TSPLIB95** y calcule **exactamente** las métricas (EUC_2D, GEO, ATT, matrices explícitas, etc.) tal y como se usan en benchmarks clásicos. La mayor fuente de errores suele ser: **redondeos** y **GEO** (formato de coordenadas “DDD.MM”).

---

## 0) Idea central: en TSPLIB hay 2 mundos de distancias

En TSPLIB/TSPLIB95, el coste de la arista `(i,j)` se define de dos formas principales:

1. **Explícita (EXPLICIT):** viene una matriz (completa o triangular) en `EDGE_WEIGHT_SECTION`, con un `EDGE_WEIGHT_FORMAT` que define cómo se “aplana” esa matriz.   
2. **Por función (EUC_2D, GEO, ATT, …):** vienen coordenadas en `NODE_COORD_SECTION` y el coste se calcula con una fórmula + una regla de redondeo específica.   

Tu benchmark será correcto **solo** si replicás esas reglas *al milímetro*.

---

## 1) Cómo leer una instancia TSPLIB (estructura del archivo)

### 1.1 Cabecera: líneas `KEY: VALUE`
La parte superior suele ser un conjunto de líneas tipo:

- `NAME: ...`
- `TYPE: TSP` (o `ATSP`, `TOUR`, etc.)
- `DIMENSION: N`
- `EDGE_WEIGHT_TYPE: EUC_2D` (o `EXPLICIT`, `GEO`, etc.)
- (opcional) `EDGE_WEIGHT_FORMAT: UPPER_ROW`, etc.

Un parser típico:
- Lee línea por línea.
- Si encuentra `:` interpreta `KEY: VALUE`.
- Si encuentra una “keyword” sola (sin `:`) interpreta que empieza una **SECTION** (p.ej. `NODE_COORD_SECTION`).
- Termina al leer `EOF`.   

> Nota: muchos parsers tratan los espacios y saltos de línea como irrelevantes, y leen secuencias de enteros con `split()` + acumulación hasta que algo ya no parsea.   

### 1.2 Secciones típicas (para TSP “clásico”)
Para tu caso, las más relevantes son:

- `NODE_COORD_SECTION` (si la distancia se calcula por fórmula)
- `EDGE_WEIGHT_SECTION` (si la distancia viene explícita)
- `TOUR_SECTION` (en archivos de solución `*.tour`)
- `DISPLAY_DATA_SECTION` (solo para dibujar; normalmente se ignora en solvers)
- `EOF`

La librería `tsplib95` enumera estos campos/keywords estándar (útil como checklist).   

---

## 2) Lectura de nodos y coordenadas (`NODE_COORD_SECTION`)

### 2.1 Formato
En `NODE_COORD_SECTION`, cada línea suele ser:

```
<index> <x> <y>
```

o en 3D:

```
<index> <x> <y> <z>
```

El `index` es entero; las coordenadas suelen ser float.   

### 2.2 Indexado (pitfall clásico)
TSPLIB usa **índices que suelen empezar en 1**, pero no es obligatorio universalmente. Para no romper instancias raras:

- Guardá los nodos tal cual (ej. 1..N).
- Si construís una matriz interna 0..N-1, creá un **mapa**.
- Si usás matrices explícitas, fijate en el **mínimo índice** que aparece (hay implementaciones que lo usan para ajustar el acceso).   

---

## 3) Distancias por función (`EDGE_WEIGHT_TYPE` ≠ EXPLICIT)

Aquí está el 80% de los bugs. La clave es replicar:
- la **fórmula**
- la **regla de redondeo** (y *qué* función de redondeo se usa)

### 3.1 La función de redondeo “TSPLIB” (NINT) no es `round()` de muchos lenguajes
En `tsplib95` se define:

- `nint(x) = int(x + 0.5)`  (redondeo “half-up”, no bankers rounding).   

Esto significa:
- en Python, **NO** uses `round()` (que hace bankers rounding).
- en JS, cuidado: `Math.round()` es “half-up” para positivos, pero revisá floats frontera.
- en C/C++/Rust/Go, implementalo explícito.

### 3.2 EUC_2D / EUC_3D (distancia euclídea redondeada)
Para dos nodos `p=(x1,y1)` y `q=(x2,y2)`:

- `d = sqrt( (x1-x2)^2 + (y1-y2)^2 )`
- `w = nint(d)`  (o sea `int(d + 0.5)`)

En 3D, sumás `(z1-z2)^2`.   

**Pitfall:** si implementas `int(sqrt(...) + 0.5)` estás bien; si usas `round()` puede fallar.

### 3.3 CEIL_2D (euclídea con techo)
- `w = ceil( sqrt(dx^2 + dy^2) )`   

### 3.4 MAN_2D / MAN_3D (Manhattan)
- `w = nint( |dx| + |dy| (+|dz|) )`   

### 3.5 MAX_2D / MAX_3D (Chebyshev / máximo)
- `w = nint( max(|dx|,|dy|,(|dz|)) )`   

### 3.6 GEO (el más traicionero)
#### (A) El formato de coordenadas NO es “grados decimales”
En instancias GEO, las coordenadas vienen como `DDD.MM` donde:
- `DDD` = grados
- `MM` = **minutos en base 60**, pero escritos como “parte decimal”

Ejemplo: `16.47` significa **16° 47'**, no 16.47°.  
La conversión usada (en `tsplib95`) es:

- `degrees = int(coord)`
- `minutes = coord - degrees`
- `real_degrees = degrees + minutes * 5/3`  (porque `0.47 * 5/3 = 0.78333 = 47/60`)   

Luego:
- `lat = radians(real_degrees(lat_raw))`
- `lon = radians(real_degrees(lon_raw))`   

#### (B) Fórmula de distancia GEO y redondeo
Se usa una distancia sobre esfera con radio:

- `R = 6378.388`   

y:

- `q1 = cos(lon_i - lon_j)`
- `q2 = cos(lat_i - lat_j)`
- `q3 = cos(lat_i + lat_j)`
- `d = R * acos( 0.5 * ((1+q1)*q2 - (1-q1)*q3) ) + 1`
- `w = int(d)`  (truncado hacia abajo, *después* del `+1`)   

**Pitfalls típicos en GEO:**
- Interpretar `DDD.MM` como grados decimales → distancias mal.
- Quitar el `+1` → distancias mal.
- Usar `round()` en vez de `int()` truncando → distancias mal.   

### 3.7 ATT (pseudo-euclídea; muy usada en `att48`)
Se define:

- `rij = sqrt( (dx^2 + dy^2) / 10 )`
- `tij = nint(rij)`
- si `tij < rij` entonces `tij = tij + 1`
- `w = tij`   

En la práctica (para distancias positivas), esto actúa como un “ceil” de `rij`, pero **implementa la regla tal cual**.

---

## 4) Distancias explícitas: `EDGE_WEIGHT_TYPE: EXPLICIT`

En este caso, el archivo trae `EDGE_WEIGHT_SECTION` con números (normalmente enteros) y además define `EDGE_WEIGHT_FORMAT`, que te dice cómo reconstruir la matriz.   

### 4.1 `EDGE_WEIGHT_SECTION` es una secuencia “aplanada”
Los números pueden venir repartidos en múltiples líneas. Un parser robusto:
- hace split por whitespace,
- concatena todo,
- y luego interpreta según el formato.   

### 4.2 Formatos más comunes (`EDGE_WEIGHT_FORMAT`)
Lista estándar (nombres típicos): `FULL_MATRIX`, `UPPER_ROW`, `LOWER_ROW`, `UPPER_DIAG_ROW`, `LOWER_DIAG_ROW`, `UPPER_COL`, `LOWER_COL`, `UPPER_DIAG_COL`, `LOWER_DIAG_COL`.   

#### Tabla mental de “qué significa cada uno”
- `FULL_MATRIX`: viene todo `N×N`.   
- `UPPER_*`: viene la parte superior (i < j), opcionalmente con diagonal.   
- `LOWER_*`: viene la parte inferior (i > j), opcionalmente con diagonal.   
- `*_ROW`: ordenado “por filas”.
- `*_COL`: ordenado “por columnas”.   

### 4.3 Orden exacto de lectura (implementación recomendada)
Aunque hay implementaciones “indexadas” con fórmulas, lo más robusto para un toy solver es **reconstruir con bucles deterministas**.

Asume nodos `1..N` (ajusta si el mínimo índice es distinto).

#### `FULL_MATRIX`
Lee `N*N` pesos en este orden:
```text
for i in 1..N:
  for j in 1..N:
    read w[i][j]
```
(Acceso lineal `i*N + j` en 0-index).   

#### `UPPER_ROW` (triangular superior, sin diagonal)
```text
for i in 1..N:
  for j in i+1..N:
    read w[i][j]
    w[j][i] = w[i][j]   # si es TSP simétrico
w[i][i] = 0
```
La diagonal se considera 0 si no está incluida.   

#### `UPPER_DIAG_ROW` (triangular superior, con diagonal)
```text
for i in 1..N:
  for j in i..N:
    read w[i][j]
    w[j][i] = w[i][j]   # si simétrico
```
  

#### `LOWER_ROW` (triangular inferior, sin diagonal)
```text
for i in 1..N:
  for j in 1..i-1:
    read w[i][j]
    w[j][i] = w[i][j]
w[i][i] = 0
```
  

#### `LOWER_DIAG_ROW` (triangular inferior, con diagonal)
```text
for i in 1..N:
  for j in 1..i:
    read w[i][j]
    w[j][i] = w[i][j]
```
  

#### `UPPER_COL`, `UPPER_DIAG_COL`, `LOWER_COL`, `LOWER_DIAG_COL`
Mismo concepto, pero el orden externo es la **columna**:

Ejemplo `UPPER_COL` (sin diagonal, i < j, orden por columnas):
```text
for j in 1..N:
  for i in 1..j-1:
    read w[i][j]
    w[j][i] = w[i][j]
w[i][i] = 0
```

Estos formatos existen y se reconocen como “column-wise upper/lower triangular …”.   

---

## 5) Archivos de tour / solución (`TYPE: TOUR`)

Un archivo `*.tour` típico contiene:
- `TYPE: TOUR`
- `DIMENSION: N` (a veces)
- `TOUR_SECTION`
- una secuencia de índices de nodos
- terminación con `-1` (y luego `EOF`)

Una regla importante: **los tours deben terminar en `-1`**; incluso puede haber múltiples tours en un mismo archivo (`TOUR_SECTION` con varias listas).   

### 5.1 Evaluación del coste de un tour
Para un tour `t = [t1, t2, ..., tN]` el coste estándar TSP es:

- `w(t1,t2) + w(t2,t3) + ... + w(tN-1,tN) + w(tN,t1)`

(Se incluye el retorno al inicio).   

### 5.2 Validación mínima de tour (para benchmarks limpios)
Antes de cronometrar algoritmos:
- Debe contener **N nodos**.
- Sin repetidos.
- Todos pertenecen al conjunto de nodos de la instancia.
- (Opcional) permitir tours que empiecen en cualquier ciudad: son equivalentes por rotación.

---

## 6) Checklist de “benchmarks correctos” (lo que más se suele romper)

### 6.1 Determinismo numérico
- Distancias deben ser **enteras** (en TSPLIB casi siempre lo son tras redondeo).
- Implementa `nint(x)=int(x+0.5)` tal cual, no uses `round()` de tu lenguaje sin verificar.   
- GEO: respetar `DDD.MM → grados` con `minutes*5/3`, el `+1`, y `int()` final.   

### 6.2 Verificación rápida con un “golden instance”
Una forma práctica de detectar errores de distancias:
- Elige una instancia famosa (p.ej. `berlin52` EUC_2D) y compara:
  - coste de un tour conocido
  - o el óptimo conocido con un solver externo (Concorde/LKH)

Por ejemplo, en el wrapper de Concorde se muestra `berlin52` con valor óptimo `7542.0` al resolver. Si tus distancias están mal, rara vez vas a coincidir ahí.   

Además, se suele usar TSPLIB como banco de pruebas con óptimos conocidos para muchas instancias; hay trabajos experimentales que lo tratan así.   

### 6.3 Indexado: 1-based vs 0-based
- TSPLIB suele enumerar nodos desde 1.
- Si internamente usás 0..N-1, mantené una capa de traducción consistente (entrada/salida/tours).   

### 6.4 EXPLICIT: reconstrucción correcta del `EDGE_WEIGHT_FORMAT`
- Si confundes `UPPER_ROW` con `LOWER_ROW` o `*_ROW` con `*_COL`, el solver “funciona” pero benchmarkea basura.
- Empieza implementando **solo** `FULL_MATRIX`, `UPPER_ROW`, `LOWER_DIAG_ROW` (son muy comunes) y rechazá el resto con error claro; luego amplias. Los formatos estándar están bien catalogados.   

---

## 7) Pseudocódigo recomendado (implementación “toy” sólida)

### 7.1 Parseo mínimo (suficiente para la mayoría de TSP)
1. Leer todas las líneas, `strip()`, ignorar vacías.
2. Mientras no veas `EOF`:
   - si línea contiene `:` → `key,value`
   - si línea es `NODE_COORD_SECTION` → leer `<idx> <x> <y>` hasta que no parezca coord
   - si línea es `EDGE_WEIGHT_SECTION` → leer enteros hasta que no parezca entero o `EOF`
   - si línea es `TOUR_SECTION` → leer enteros, partir tours por `-1`
3. Validar: `DIMENSION`, `EDGE_WEIGHT_TYPE`.

Esto encaja con parsers reales: lectura de enteros en secuencia y tours terminados en `-1`.   

### 7.2 Construcción de `w(i,j)`
- Si `EDGE_WEIGHT_TYPE == EXPLICIT`:
  - reconstruye la matriz según `EDGE_WEIGHT_FORMAT`.
- Si no:
  - guarda `coords[i]`
  - define `w(i,j)` llamando a la fórmula + redondeo correspondiente.   

---

## 8) Tabla resumen de fórmulas (para copiar/pegar en tu repo)

| EDGE_WEIGHT_TYPE | Definición resumida | Redondeo |
|---|---|---|
| EUC_2D / EUC_3D | `sqrt(sum(dx^2))` | `nint(x)=int(x+0.5)`  |
| CEIL_2D | `sqrt(dx^2+dy^2)` | `ceil`  |
| MAN_2D / MAN_3D | `sum(|dx|)` | `nint`  |
| MAX_2D / MAX_3D | `max(|dx|,...)` | `nint`  |
| GEO | coords `DDD.MM`→grados con `+ minutes*5/3`, luego fórmula esférica con `R=6378.388`, `+1`, y `int()` | truncado vía `int()`  |
| ATT | `rij=sqrt((dx^2+dy^2)/10)`, `tij=nint(rij)`, si `tij<rij` entonces `tij++` | regla especial  |

---

## 9) “Reglas de oro” para que una IA no te rompa el benchmark
Si vas a pedirle a una IA que implemente o revise esto, pon explícitamente en el prompt:

- “No uses `round()` estándar; usa `nint(x)=int(x+0.5)`.”
- “En GEO, `DDD.MM` no es decimal degrees; convierte minutos con `*5/3` y usa `int(R*acos(...)+1)`.”
- “En ATT, usa la regla `tij=nint(rij); if tij<rij: tij++`.”
- “Para EXPLICIT, implementa bien `EDGE_WEIGHT_FORMAT` y su orden (ROW vs COL, con/sin diagonal).”   

---

## Referencias web usadas (implícitas en las citas)
- Implementación y docs de `tsplib95` (distancias, parseo, matrices).   
- Enumeración de formatos `EDGE_WEIGHT_FORMAT` (JORLib).   
- Ejemplo práctico con Concorde (`berlin52` y valor óptimo mostrado).   
- Uso de TSPLIB como benchmark con óptimos conocidos en literatura.   
