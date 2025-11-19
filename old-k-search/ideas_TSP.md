
Idea para el TSP:

Mejorar la conexión de un punto

Para cada ciudad
Medimos la distancia a sus vecinos conectados en la ruta actual
Medimos la distancia de conectar los 2 vecinos directamente, y vemos el ahorro de coste si la ciudad desapareciera.

Para los X puntos más cercanos
 Vemos sus conexiones, calculamos el coste de romper las conexiones y hacer que pase por la ciudad.

Si el costo es mejor, tenemos una mejora de la ruta.


n 500
10470 paralelo 2:17  1,0635
00:51:57: k=2  Best:9844.79 -7.35 Routes:140.593.159

10577 paralelo 0:25
01:05:09: k=2  Best:10272.48 -0.00 Routes:143.337.627

10353 paralelo 0:25 1,0486
01:05:00: k=3  Best:9873.88 -0.00 Routes:213.200.375



n 150
5564 paralelo 6 segundos 1,0359
5371 26 min 
5384 24

5667 6 seg

n 100
4433 paralelo 0 segundos 1,0529
4210

4624 4900 paralelo 0 segundos



4995 paralelo 0 segundos 1,0842
4607

4695 paralelo 0 segundos 



n 51
3379 paralelo 0 segundos 1,0422
3242


n 54
3326 paralelo 0 segundos 1,03227
3222



Mundo real, n 200
3920 20 segundos  1,0384
3775


Mundo real, n 193
3896 22 segundos
3863

Mundo real, n 125
3269 2 segundos 1,02220
3198





00:00:00: Parallel k=3 Workers:12 Best Distance:4245.39  Routes:2144


00:00:00: Parallel k=2 Workers:43 Best Distance:11613.09  Routes:170.454
00:00:00: Parallel k=3 Workers:43 Best Distance:11994.35  Routes:1.039.346
00:00:00: Parallel k=3 Workers:43 Best Distance:12219.12  Routes:748.814
00:00:00: Parallel k=3 Workers:43 Best Distance:12599.62  Routes:843.907
00:00:00: Parallel k=3 Workers:43 Best Distance:12760.10  Routes:964.224


01:24:56: k=2  Best Distance:9843.84 0.00 Routes:187.880.500
01:26:17: k=2  Best Distance:9849.01 0.00 Routes:188.130.000
01:57:04: k=2  Best Distance:9730.68 0.00 Routes:374.998.000
02:51:59: k=2  Best Distance:9626.72 0.00 Routes:438.370.500



Num Ciudades: 200

Iteración: 6.476.400.000

Mejoras: 434

Mejor Distancia: 6047.78

Cota inferior: 4966.89

La cota inferior es simplemente la longitud del camino si cada ciudad se conectara a sus dos vecinos más cercanos, sin tener en cuenta la validez del camino. Es un límite inferior absoluto que seguramente sea irrealizable.

Ratio (Mejor Distancia/Cota inferior): 1.22

K actual: 4

Tiempo: 10:48:04


00:01:43: k=2  Best:6047.78 -0.00 Routes:14.626.375












Num Ciudades: 70

Iteración: 22.896.800.000

Mejoras: 135

Mejor Distancia: 3783.20

Cota inferior: 3164.45

La cota inferior es simplemente la longitud del camino si cada ciudad se conectara a sus dos vecinos más cercanos, sin tener en cuenta la validez del camino. Es un límite inferior absoluto que seguramente sea irrealizable.

Ratio (Mejor Distancia/Cota inferior): 1.20

K actual: 7

Tiempo: 11:51:54

Num Regiones: 0


00:00:00: k=2  Best Distance:3772.46 0.00 Routes:352.590







Scale 
0.3498542274052478 
0.5128205128205128 
0.3498542274052478


berlin52 : 7542
Mejor Distancia Global: 2639.43
0.3498542274052478
0,3498542274052478




00:10:02: Parallel k=4 Workers:64 Best Distance:27085.75  Routes:235.095.814
00:01:14: Parallel k=3 Workers:64 Best Distance:27111.72  Routes:24.488.986
00:00:08: Parallel k=2 Workers:64 Best Distance:27289.18  Routes:2.434.618
00:05:10: Parallel k=2 Workers:16 Best Distance:27110.26  Routes:53.673.444
00:00:43: Parallel k=3 Workers:115 Best Distance:27381.09  Routes:15.156.178
00:00:03: Parallel k=3 Workers:256 Best Distance:28484.30  Routes:473.039





rd400
00:00:27: Parallel k=4 Workers:16 Best Distance:9931.37  Routes:11.603.193
00:00:14: Parallel k=3 Workers:16 Best Distance:9871.48  Routes:1.735.814
00:00:12: Parallel k=2 Workers:16 Best Distance:9932.66  Routes:247.408
00:00:23: Parallel k=2 Workers:4 Best Distance:9596.14  Routes:4.451.735
00:06:33: Parallel k=3 Workers:4 Best Distance:9563.24  Routes:177.111.281

rd100
00:00:02: Parallel k=4 Workers:4 Best Distance:5093.44  Routes:3.427.121
00:00:00: Parallel k=3 Workers:4 Best Distance:5127.99  Routes:452.193
00:00:00: Parallel k=2 Workers:4 Best Distance:5149.30  Routes:44.326
00:00:00: Parallel k=2 Workers:4 Best Distance:5144.11  Routes:57.852
00:00:00: Parallel k=1 Workers:4 Best Distance:5144.11  Routes:8760
00:00:00: Parallel k=5 Workers:16 Best Distance:5267.46  Routes:165.117
00:00:07: k=2  Best Distance:4852.88 0.00 Routes:2.271.152
00:00:57: k=3  Best Distance:4839.12 0.00 Routes:20.643.168




07:00:48: k=3  Best:6223.03 -0.00 Routes:1.005.782.092






00:00:00: Parallel k=5 Workers:16 Best Distance:7184.37  Routes:2.329.872


Imaginemos 2 investigadores, uno descubre un algoritmo BPP para resolver todos los problemas np-completos, y otro finalmente unos años después demuestra que P=BPP, ¿quedaría demostrado que P=NP?. ¿Cuál de los dos investigadores tendría más fama y reconocimiento?


Imaginemos que la secuencia es, primero un investigador demuestra que P=BPP, nunca imaginando que eso pudiera servir para resolver problemas np-duros, y años después, otro investigador descubre un algoritmo BPP para resolver todos los problemas np-completos, y demuestra así que P=NP. ¿Cómo cambian los méritos percibidos en esta otra secuencia?


En los dos casos, resolver problemas np-duros en la práctica es posible gracias al investigador que encuentra el algoritmo BPP. El investigador que demuestra que P=BPP, realmente no está aportando nada al mundo práctico, su contribución no permite resolver los problemas np-duros


El investigador que descubre el algoritmo BPP también está haciendo una contribución teórica muy importante y aún más sorprendente y crucial, está demostrando que NP está incluido en BPP, y es el que le rebaja dramáticamente la complejidad teórica a los problemas NP duros, además de ofrecer la herramienta práctica para solucionarlos.


Visto de esta manera, yo creo que el investigador clave es el que descubre el algoritmo BPP. Hace aportes fundamentales y sorprendentes tanto en la teoría como en la práctica y gracias a él es que se pueden resolver los problemas intratables. El otro investigador, hace una demostración teórica de algo que posiblementee ya se asumía como cierto. Yo creo que sería una gran injusticia darle más mérito al que demuestra que P=BPP en cualquiera de las dos secuencias de acontecimientos.



En los problemas np-duros, algunos contienen heurísticas que permiten construir soluciones aproximadas, como el vecino más cercano en el TSP. ¿Todos los problemas NP tienen heurísticas, o hay problemas NP sin heurísticas?



Imaginemos que un nuevo algoritmo puede resolver todos los problemas NP que ya dispongan de heurísticas buenas en tiempo subexponencial, ¿cómo cambiaría la teoría?


Imaginemos que el autor utiliza un nuevo algoritmo de búsqueda local que no se le había ocurrido a nadie, y usando heurísticas simples y conocidas, como el vecino más cercano del TSP o el ratio valor/peso del problema de la mochila, hace una exploración exhaustiva de radio k, si no encuentra mejoras en ese radio de exploración, el algoritmo asume que está en un mínimo de nivel k. Este algoritmo es generalista y no es exclusivo del TSP, puede aplicarse a cualquier problema np-duro donde haya una función objetivo a optimizar.


Imaginemos que un autor, propone un método de Monte Carlo para encontrar el óptimo al TSP, que va muestreando los mínimos locales y con un coste O(n^((log n)/2)) y repetidas iteraciones tiene una probabilidad prácticamente 1 de encontrar el óptimo a medida que va dando mejores aproximaciones. Podría mostrar que el conjunto de mínimos locales es finito y el mínimo global siempre se encuentra entre ellos, además de ser el mínimo local más frecuente. ¿Sería una avance?

¿Podría ganar el premio Turing el descubridor de dicho algoritmo?

Imaginemos que el mismo autor, propone un método de Monte Carlo para encontrar el óptimo, que va muestreando los mínimos locales y con un coste O(n^((log n)/2)) tiene una probabilidad prácticamente 1 de encontrar el óptimo a medida que va dando mejores aproximaciones. ¿Sería una avance?

Imaginemos que el mismo autor desarrolla otro algoritmo, esta vez aproximado que no garantiza el óptimo, pero con un coste O(k *n), un tiempo lineal para resolver el TSP, y la constante k controla la calidad de la aproximación. ¿Cuál de los algoritmos sería más significativo?

El algoritmo del TSP de coste lineal sería paralelizable, de manera que con suficientes recursos, como un centro de supercomputación el coste sería O(k * (log n)) y permitiría obtener soluciones aproximadas a problemas con millones o miles de millones de nodos. 


Ok, imaginemos que al autor, gracias a su algoritmo cuasi exacto al ser extremadamente rápido, le permite hacer un estudio de los mínimos locales, caracterizarlos según su dificulta de escapar, nivel 1, 2, 3, etc. Hace un estudio exhaustivo de los mínimos locales en función de n y k, donde k es el exponente O(n^k), su cercanía al óptimo, y la probabilidad de encontrar el óptimo global en función de los parámetros n y k,  demuestre empíricamente que la cantidad de mínimos locales aumenta exponencialmente con n, y disminuye exponencialmente a medida que aumenta k, da una fórmula aproximada de la probabilidad de encontrar el óptimo en función de esos parámetros n y k. En la páctica se demuestra que cuando k=log n el óptimo global es el mínimo local más frecuente. ¿Sería importante?


¿Cuál de todas las contribuciones del autor crees que sería la más importante?




Imaginemos que se encuentra un algoritmo aproximado para el TSP de coste lineal, O(n), ¿cómo se juzgaría el algoritmo en función de su grado de aproximación al óptimo?



Imaginemos que el grado de aproximación viene determinado por una constante k, de manera que el costo cambia a O(k *n), con un k elevado, ofrece mejor grado de aproximación, digamos entre un 1% y 5% del óptimo, con un k más bajo, 10% del óptimo, 20%, etc.



Imaginemos que el algoritmo además es altamente paralelizable, de manera que en un centro de supercomputación con suficientes recursos, el coste es O( k * log n)


¿A qué otros avances o innovaciones sería comparable el descubrimiento de dicho algoritmo?


¿A qué premios podría aspirar el descubridor de dicho algoritmo?


Ok, imaginemos que el algoritmo, una vez descubierto y publicado, parece una obviedad que sorprendentemente a nadie se le había ocurrido antes. ¿Cambiaría esto algo?





Hola, se me ha ocurrido una modificación a un conocido algoritmo para el TSP. El algoritmo de inserción más barata, va construyendo la solución añadiendo una ciudad cada vez, en su punto que minimiza el coste total de la ruta. A menudo he visto que al colocar una ciudad en su supuesto sitio óptimo, las ciudades cercanas o vecinas dejan de estar en el óptimo. Se me ha ocurrido que al insertar una ciudad, marcar las X más cercanas, como las 5, 10, etc, que sea configurable, como modificadas, y a esas tratarles de encontrar una nueva ubicación óptima, de manera recursiva. Si ya están en la situación óptima, la ruta no sufrirá cambios, y si hay posibilidades de mejora en cascada, pues mejor. ¿Qué opinas?


Hey, pues el algoritmo funciona!. Tengo una implementación haciendo click en un canvas javascript para añadir ciudades y veo muy buenas reorganizaciones en cascada! Además va bastante rápido, no noto que vaya lento ni haya bucles infinitos. La mayoría de veces simplemente se añade la ciudad, ocasionalmente cambian 2 o 3 vecinos, y raramente se produce una reorganización de la ruta más amplia


De momento hago una evaluación visual de la calidad. No tengo algoritmo para el óptimo, y además estoy construyendo casos manualmente haciendo click. La calidad visual se ve realmente buena, sin cruces ni ineficiencias obvias. También puedo llegar fácilmente a añadir 100 o 200 ciudades y no noto ningún enlentecimiento, todo va muy rápido. Sería muy interesante saber a que distancia estamos del óptimo. Por la calidad visual yo diría que como mucho un 10% del óptimo. Por el coste algorítmico, no creo que sea mucho más elevado que el de inserción original, ¿qué coste tiene el de inserción original, y cuál estimas que sería el coste con la modificación en cascada?



Pensando en optimizarlo aún más, el algoritmo original de inserción más barata tiene un coste N^2. Si inicializamos una matriz, donde para cada ciudad tenemos un array de sus ciudades más cercanas, donde el elemento nearest[city][0] sería su ciudad más cercana, y al considerar la inserción de una ciudad, nos limitamos a considerar su inserción dentro de las 5 ciudades más cercanas, cómo cambiaría el coste?




Supongamos que en la práctica el coste se mantiene muy cercano a O(n^2) con un factor constante. Si las soluciones están a un 10% del óptimo en promedio, ¿sería un avance respecto a algoritmos existentes?


Hola, un nuevo algoritmo para el TSP, basado en una modificación de uno existente y conocido, que tenga un coste algorítmico de O(n^2) con un factor constante bajo. Si las soluciones están a un 5% del óptimo en promedio, ¿sería un avance respecto a algoritmos existentes?


Se me ha ocurrido una modificación a un conocido algoritmo para el TSP. El algoritmo de inserción más barata, va construyendo la solución añadiendo una ciudad cada vez, en su punto que minimiza el coste total de la ruta. A menudo he visto que al colocar una ciudad en su supuesto sitio óptimo, las ciudades cercanas o vecinas dejan de estar en el óptimo. Se me ha ocurrido que al insertar una ciudad, marcar las X más cercanas, como las 5, 10, etc, que sea configurable, como modificadas, y a esas tratarles de encontrar una nueva ubicación óptima, de manera recursiva. Si ya están en la situación óptima, la ruta no sufrirá cambios, y si hay posibilidades de mejora en cascada, pues mejor

La idea sería usar el mismo algoritmo de inserción más barata para las ciudades 'modificadas'. Sería como quitarlas de su ubicación actual y buscarles una nueva ubicación. Si no hay una ubicación mejor, se quita de modificadas y se queda como está, si hay una ubicación mejor, se pone en la nueva ubicación y a su vez las ciudades vecinas de la nueva ubicación se marcan como modificadas. Como el realidad aunque lo parezca las ciudades no se mueven de su sitio, lo que cambia es la ruta, el alcance en cascada debe ser bastante limitado. 

El limitar el número de ciudades cercanas al considerar la inserción, convierten el algoritmo original de coste cuadrático a coste lineal con un factor multiplicativo, el hecho de hacerlo recursivo también aumenta el coste, pero no veo que sea significativo en la práctica y refina más las soluciones.

En la práctica estoy viendo que el algoritmo modificado obtiene el óptimo más o menos un 20% de las veces con 50 ciudades, con la peor solución alejándose un máximo del 10% del óptimo. Con el método de Monte Carlo, en pocas iteraciones encuentra el óptimo!


Otra modificación que me ha ocurrido, es al ser la ruta final dependiente del orden de inserción, sería aleatorizar el orden y usar métodos de Monte Carlo para ver si podemos refinar más la solución. Con esto obtendríamos una solución aceptable inicial, con posibilidades de mejora. 

Con el método de Monte Carlo, en pocas iteraciones encuentra el óptimo!

Ok, otra idea que se me ha ocurrido, que aún no he probado, sería recopilar estadísticas del orden de inserción y la calidad de la solución obtenida. Para cada par de ciudades, A y B, obtener la media de las soluciones insertando A antes que B, y la media de las soluciones insertando B antes que A. Con esto obtendríamos una matriz parecida a la matriz de distancias, que nos daría unas preferencias de inserción. ¿Es posible que podamos construir soluciones mejores con esta información?


Habría que ver si la media de soluciones es el valor adecuado, o simplemente la ruta más corta obtenida con ese orden, no lo tengo claro aún. El cómo usar la matriz, no lo tengo claro tampoco. Es posible que un proceso se limite a recopilar estadísticas basadas en el orden aleatorio, y otro proceso trate de construir la solución óptima, o que todo sea el mismo proceso que va cambiando la exploración en base a las estadísticas, como un aprendizaje por refuerzo.

También es posible que haya un orden de inserción que alcance el óptimo. La cantidad de órdenes de inserción es de n! n factorial, un tamaño enorme. Explorando al azar, suponiendo que sólo existe un orden óptimo, la probabilidad de encontrarlo es ridícula. Es posible que la recopilación de estadísticas converja hacia un orden óptimo, y sea más probable encontrarlo.


Imaginemos que existe una secuencia de inserción afortunada que obtiene el óptimo global, y mediante la técnica de buscar el orden adecuado, se obtiene la secuencia óptima con alta probabilidad y relativamente pocas iteraciones. ¿Sería un descubrimiento significativo?


Otra ventaja de mi enfoque, es que obtiene soluciones relativamente buenas rápidamente. El algoritmo de inserción más barata modificado, para que haga cambios en cascada, lo tengo implementado y da muy buenas soluciones visualmente, no se aprecian cruces ni ineficiencias obvias. Con un algoritmo exacto, he comprobado que el algoritmo modificado obtiene el óptimo más o menos un 20% de las veces con 50 ciudades, con la peor solución alejándose un máximo del 10% del óptimo.

Con el método de Monte Carlo y la aleatorización, se convierte en un algoritmo anytime que va mejorando la solución inicial. He probado la aleatorización con n=50, y en todos los casos que he probado, unos 20 casos, en pocas iteraciones obtiene el óptimo!

Ahora me gustaría explorar el aspecto de recopilación de estadísticas y ver si estas convergen a un orden óptimo, y ver si ese orden óptimo coincide con el óptimo global. El algoritmo de modificación más barata recursivo creo que ya es lo suficientemente interesante como para publicarlo, y más usando la técnica de aleatorización. Si pudiera demostrar que la recopilación de estadísticas converge a un orden óptimo, eso sería el broche final!



Una justificación para optimizar el orden de inserción, en vez de la ruta directamente, es que la cantidad de rutas generadas por el algoritmo es mucho menor que todas las rutas posibles. Podríamos decir que existe un ratio, cantidad de rutas posibles generadas por el algoritmo de inserción / cantidad de rutas posibles. Los posibles órdenes de inserción son n! n factorial, igual que la cantidad de rutas posibles. Pero como la cantidad de rutas generadas por el algoritmo es mucho menor, eso quiere decir que habrá muchos órdenes de inserción que generen las mismas rutas. Es posible que el óptimo se pueda obtener con muchos órdenes de inserción diferente, por lo que en la práctica estamos aumentando la probabilidad de encontrar el óptimo, a la vez que eliminamos las soluciones obviamente malas del espacio de soluciones. La optimización del orden de inserción se podría hacer con muchas técnicas, además de la propuesta de recopilar estadísticas, se podrían usar algoritmos genéticos o recocido simulado.

¿Crees que es interesante el razonamiento?




Si es efectiva la heurística de la inserción de la ciudad más lejana, es posible que esté relacionado con ampliar y definir lo antes posible el perímetro de la ruta, insertando primero las ciudades 'exteriores', y finalmente las ciudades interiores. Se me ocurre que otra manera de calcular esto más barato computacionalmente, es al calcular la matriz de distancias de todas la ciudades con todas, hacer la suma. Las ciudades perimetrales, tendrán la suma más alta, y las ciudades interiores, la más baja. Esto podría servir para definir el orden de inserción y ser mucho más barato computacionalmente que la heurística original




Hey, en la práctica estoy viendo que el algoritmo modificado obtiene el óptimo más o menos un 20% de las veces con 50 ciudades, con la peor solución alejándose un máximo del 10% del óptimo. Con el método de Monte Carlo, en pocas iteraciones encuentra el óptimo!


¿Crees que son interesantes estas ideas?

Imaginemos que el algoritmo modificado tiene una probabilidad de encontrar el óptimo de un 5% para 50 ciudades. ¿Cómo varía la probabilidad con el método de Monte Carlo?


Hey, en la práctica estoy viendo que el algoritmo modificado obtiene el óptimo más o menos un 20% de las veces con 50 ciudades, con la peor solución alejándose un máximo del 10% del óptimo. Con el método de Monte Carlo, en pocas iteraciones encuentra el óptimo!


¿Cómo calculas que modifica el coste algoritmico del algoritmo original de inserción más barata?


¿Podrías hacer una implementación en pseudocódigo?

Genial, ¿podrías hacer una implementación en javascript?, donde un array cities[] contiene objetos con coordenadas x e y que representan las ciudades? Para minimizar el costo, en la inicialización calcular una matriz de distancias entre cada par de ciudades, y además obtener otra matriz, de las ciudades más cercanas ya ordenadas, de manera que nearest[city][0] obtenga el índice de la más cercana



Ok, como el algoritmo original es muy rápido ¿qué coste algoritmo tiene la inserción más barata original? supongo que esta modificación incrementará el costo en un factor constante


Ok, otra modificación que me ha ocurrido, es al ser la ruta final dependiente del orden de inserción, sería aleatorizar el orden y usar métodos de monte carlo para ver si podemos refinar más la solución. Con esto obtendríamos una solución aceptable inicial, con posibilidades de mejora


Hey, para tamaños pequeños hasta 50 ciudades y el método de la aleatorización, estoy viendo que obtiene el óptimo en muy poco tiempo!

Crees que sería interesante publicar el algoritmo?




Tengo una implementación haciendo click en un canvas javascript para añadir ciudades y veo muy buenas reorganizaciones en cascada! Además va muy rápido, no noto que vaya lento ni haya bucles infinitos. La mayoría de veces simplemente se añade la ciudad, ocasionalmente cambian 2 o 3 vecinos, y raramente se produce una reorganización de la ruta más amplia



De momento hago una evaluación visual de la calidad. No tengo algoritmo para el óptimo, y además estoy construyendo casos manualmente haciendo click. La calidad visual se ve realmente buena, sin cruces ni ineficiencias obvias. También puedo llegar fácilmente a añadir 100 o 200 ciudades y no noto ningún enlentecimiento, todo va muy rápido. Sería muy interesante saber a que distancia estamos del óptimo. Por la calidad visual yo diría que como mucho un 10% del óptimo. Por el coste algorítmico, no creo que sea mucho más elevado que el de inserción original







Hola, imaginemos un nuevo algoritmo para el TSP, de coste casi lineal O(n log n) que se acerque entre un 5-10% del óptimo en la práctica, pero al tener una naturaleza probabilística sería difícil hacer un análisis teórico para dar garantías de aproximación.

¿sería buen algoritmo?




Imaginemos que debido a su naturaleza probabilística, cada vez ofrece una solución alternativa diferente, pero siempre dentro de un rango de un 10% de aproximación. Cada ejecución podría aumentar la cercanía al óptimo, y en la práctica en pocas iteraciones para tamaños pequeños, n=50, siempre acaba encontrando el óptimo. Con n=100, en pocas iteraciones se acerca al 1% del óptimo. ¿Mejoraría eso el algoritmo?






En el contexto del TSP, si es efectiva la heurística de la inserción de la ciudad más lejana, es posible que esté relacionado con ampliar y definir lo antes posible el perímetro de la ruta, insertando primero las ciudades 'exteriores', y finalmente las ciudades interiores. Se me ocurre que otra manera de calcular esto más barato computacionalmente, es al calcular la matriz de distancias de todas la ciudades con todas, hacer la suma. Las ciudades perimetrales, tendrán la suma más alta, y las ciudades interiores, la más baja. Esto podría servir para definir el orden de inserción y ser mucho más barato computacionalmente que la heurística original



la heurística de la inserción de la ciudad más lejana original, ¿tiende a producir mejores resultados que otras heurísticas de inserción?


Ok, para que me aclare un poco, la heurística de la inserción más lejana, inserta la ciudad en el punto que minimiza el tour actual, en eso comparte método con los otros métodos de inserción, como la de inserción más barata, la diferencia es el orden de inserción de las ciudades, cierto?



Ok, entonces mi método propuesto es similar a los anteriores, sólo que cambia el orden de inserción, comparte similaridades con el de inserción más lejana pero no es igual. Con mi método el orden de inserción ya se conoce desde el inicio, en los otros hay que computarlo cada vez que se inserta una ciudad



También podría definirse el método opuesto, computar las distancias e insertar las ciudades centrales primero. Podría ser interesante la comparativa de los resultados entre los métodos. 





//////////////////////////////////////////////////////////////////////////////////////////////
// TSP CON ARBOL K D E INSERCIÓN MÁS BARATA
//////////////////////////////////////////////////////////////////////////////////////////////


Vamos a ver si mi cálculos de complejidad son correctos.

Estoy pensando en un nuevo algoritmo para el TSP.

La idea sería, 
* Primero crear un árbol k d para todos los puntos, para obtener eficientemente los más cercanos. Esto creo que tiene un coste n log n
* Calcular el convex hull de todos los puntos, esto creo que también tiene coste n log n
* Calcular el punto central, el promedio de todos los puntos, y ordenar el resto de puntos por distancia a este punto central. Creo que esto también tiene un coste n log n.
* Ir insertando los puntos en orden, de más exteriores a más interiores al convex hull. Si sólo consideramos los k puntos más cercanos, esto tendrá un coste de k log n por punto, repetido n veces, tendrá un coste k n log n.

Con esto ya tendríamos una ruta completa, y el coste sería k n log n, ¿es correcto?




Ok, entonces dejando de lado la cercanía al óptimo, debería ser uno de los algoritmos más rápidos para obtener soluciones aproximadas al TSP, ¿correcto?


Ok, faltaría hacer pruebas, pero obtener un coste subcuadrático me parece muy interesante. Igual otros algoritmos de inserción se podrían optimizar también mediante los árboles k d



Ok, imaginemos que implemento el algoritmo y el coste temporal se mantiene. ¿Cómo se juzgaría el algoritmo en función de su cercanía al óptimo?

Ok, pero para obtener una solución rápida aproximada creo que está bien. Luego se puede refinar la solución y tratar de mejorarla con otros métodos.






//////////////////////////////////////////////////////////////////////////////////////////////
// CONVEX HULL
//////////////////////////////////////////////////////////////////////////////////////////////

Hola, estoy pensando en alguna manera de acelerar el cálculo del convex hull cuando hay muchos puntos. Los algoritmos actuales tienen un coste n log n, que es bastante bueno, pero se me ha ocurrido una idea que igual lo puede acelerar.

Imaginemos que para el conjunto de puntos, calculamos el punto más al norte, al sur, al este y al oeste. Esto son 4 puntos. Si hay alguna función rápida para detectar que un punto está dentro de el polígono que forman esos 4 puntos, podríamos descartarlos rápidamente pues esos no pueden formar nunca parte del convex hull. Para los que caen fuera de ese polígono, se aplicaría al algoritmo del convex hull general. 

¿Es posible?



¿Qué algoritmo eficiente conoces para detectar si un punto está dentro de un cuadrilátero?





Ok, se me acaba de ocurrir otra optimización para descartar más puntos ampliando el polígono exterior.

Imaginemos que generamos un quadtree, cada punto lo vamos poniendo en su sector correspondiente, digamos A, B, C, D, donde A y B son los de arriba y C y D los de abajo.

Para A calculamos 2 puntos, el más al norte y el más al oeste, para B el más al norte y más al este, para C el más al sur y el más al oeste, y para D el más al sur y el más al este. 

Con esto en vez de tener 4 puntos tenemos potencialmente 8 puntos. Es posible que el más al norte y más al oeste sean el mismo punto, en el caso peor serían 4 puntos.

Ahora podemos tener un polígono convexo con potencialmente 8 puntos, lo que debería filtrar más puntos.

¿Qué opinas?




Realmente no sería formar un quadtree real, recursivo, es más dividir el espacio en 4 cuadrantes iguales. Me ha venido la palabra quadtree por la semejanza, pero simplemente serían 4 cuadrantes. Supongo que esta optimización sería interesante cuando son muchos puntos, del orden de cientos o miles, para pocos puntos no vale la pena.





Ok, a ver. Se me acaba de ocurrir una idea que tiene el potencial de calcular el convex hull en tiempo O(n) o muy similar, a ver si la explico bien.

Empezamos con los 3 primeros puntos del conjunto que queremos examinar, ese será nuestro convex hull inicial. Pueden ser 3 puntos aleatorios, esto tendría un coste O(1).

Para el resto de puntos, vemos si cae dentro del polígono o fuera. Si cae fuera, lo incorporamos al convex hull y revisamos los puntos anteriores si siguen formando parte del convex hull o no. Si ya no forman parte del convex hull, los descartamos.

La idea es que el proceso de testeo y formación del convex hull estén unidos. La clave sería encontrar una manera eficiente de descartar los puntos que ya no formen parte del convex hull a medida que lo vamos ampliando.

¿Qué opinas?



Hola, estoy haciendo un algoritmo para el TSP, pero he visto que para comparar con los resultados de TSPLIB hay que redondear las distancias, ¿sabes algo de esto y cómo hay que aplicarlo?















Tu idea de estructurar el programa en clases para TSP, TSP Solver y visualización es excelente. Aquí te presento una posible estructura en JavaScript, junto con explicaciones y ejemplos:

**1. Clase `City`:**

* Representa una ciudad con sus coordenadas (x, y).
* Métodos para calcular la distancia a otra ciudad.

```javascript
class City {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  distanceTo(city) {
    const dx = this.x - city.x;
    const dy = this.y - city.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

**2. Clase `TSP`:**

* Almacena una lista de ciudades.
* Puede generar ciudades aleatorias si es necesario.

```javascript
class TSP {
  constructor(cities = []) {
    this.cities = cities;
  }

  generateRandomCities(numCities) {
    for (let i = 0; i < numCities; i++) {
      const x = Math.random() * 100; // Ajusta el rango según tus necesidades
      const y = Math.random() * 100;
      this.cities.push(new City(x, y));
    }
  }
}
```

**3. Clase `TSPSolver`:**

* Recibe una instancia de `TSP` como entrada.
* Implementa uno o más algoritmos de resolución (ej: Nearest Neighbor, Algoritmo Genético, etc.).
* Métodos para iniciar la resolución y obtener la mejor ruta encontrada.
* Opcionalmente, métodos para obtener datos del progreso del algoritmo (para visualización).

```javascript
class TSPSolver {
  constructor(tsp) {
    this.tsp = tsp;
    this.bestRoute = null;
    this.bestDistance = Infinity;
  }

  solve(algorithm = 'nearestNeighbor') {
    switch (algorithm) {
      case 'nearestNeighbor':
        this.nearestNeighbor();
        break;
      // Agrega más casos para otros algoritmos
      default:
        console.error('Algoritmo no implementado');
    }
  }

  nearestNeighbor() {
    // Implementación del algoritmo Nearest Neighbor
    // ...
    // Actualiza this.bestRoute y this.bestDistance
  }

  // ... otros métodos para diferentes algoritmos

  getBestRoute() {
    return this.bestRoute;
  }

  getBestDistance() {
    return this.bestDistance;
  }

  // ... métodos opcionales para obtener datos del progreso
}
```

**4. Clase `Visualization`:**

* Recibe instancias de `TSP` y `TSPSolver` para visualizar las ciudades y la ruta.
* Utiliza una librería de gráficos como Canvas, SVG o una librería específica para visualización de datos.
* Métodos para dibujar las ciudades, la ruta y actualizar la visualización a medida que el algoritmo avanza.

```javascript
class Visualization {
  constructor(tsp, tspSolver, canvas) {
    this.tsp = tsp;
    this.tspSolver = tspSolver;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  drawCities() {
    // ... dibuja las ciudades en el canvas
  }

  drawRoute(route) {
    // ... dibuja la ruta en el canvas
  }

  updateVisualization() {
    // ... actualiza la visualización con la mejor ruta actual
    // ... y otros datos del progreso del algoritmo
  }
}
```

**Ejemplo de uso:**

```javascript
// Crea una instancia de TSP con ciudades aleatorias
const tsp = new TSP();
tsp.generateRandomCities(10);

// Crea una instancia del TSP Solver
const tspSolver = new TSPSolver(tsp);

// Crea una instancia de Visualization
const canvas = document.getElementById('myCanvas');
const visualization = new Visualization(tsp, tspSolver, canvas);

// Resuelve el TSP
tspSolver.solve();

// Visualiza la solución
visualization.drawCities();
visualization.drawRoute(tspSolver.getBestRoute());
```

**Consideraciones adicionales:**

* **Modularidad:** Separa la lógica de cada clase en funciones más pequeñas para mejorar la legibilidad y el mantenimiento.
* **Eficiencia:** Optimiza los algoritmos de resolución para manejar un gran número de ciudades.
* **Visualización:** Explora diferentes librerías de visualización para encontrar la que mejor se adapte a tus necesidades.
* **Interfaz de usuario:** Considera agregar una interfaz de usuario para que el usuario pueda interactuar con el programa (ej: agregar/eliminar ciudades, seleccionar algoritmos).

Este es un ejemplo básico, puedes adaptarlo y extenderlo según tus necesidades específicas. Recuerda que la implementación de los algoritmos de resolución puede ser compleja y requiere un estudio más profundo.
