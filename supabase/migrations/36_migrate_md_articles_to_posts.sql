-- Migration 36: migrate the 5 own markdown articles into `posts` rows (Fase 5).
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING so a re-run (or partial retry) is a
-- no-op and never clobbers later admin edits. Slugs are preserved EXACTLY so the
-- public URLs (/articulo/{slug}) and the Disqus identifiers (articulo-${slug})
-- stay linked. status='published', published_at = the original frontmatter date.
-- `content` is the exact HTML Astro renders today (exported via AstroContainer),
-- including the <div class="data-card"> blocks and rehype-external-links output.
-- Local /images/articulos/... paths are unchanged (served from /public).

insert into public.posts
  (slug, title, excerpt, content, image_url, image_alt, category, tags, author, status, published_at)
values
  ('mi-primera-aventura-electrica', 'Mi primera aventura eléctrica', '1.476 km en un Nissan Leaf prestado, tres paradas de carga, 24€ en electricidad y una conclusión clara: se puede viajar en eléctrico. Crónica de mi primer viaje largo entre Zaragoza, Valladolid, Salamanca y Ávila.', '<p><em>Este artículo es una reedición de <a href="https://medium.com/ev-life/mi-primera-aventura-el%C3%A9ctrica-12faf35abce9" rel="noopener noreferrer" target="_blank">un texto que publiqué en Medium en marzo de 2019</a>, dentro de un proyecto llamado EV Life que no acabó de arrancar por falta de tiempo. Al retomar ahora evminds, me ha parecido buena idea empezar los artículos propios rescatando aquella “mi primera vez”.</em></p>
<p><em>Todos recordamos nuestro primer amor y la primera vez de muchas cosas en la vida. Para mí, en el ámbito de la movilidad eléctrica, ese momento fue mi primer viaje largo con un eléctrico, y me ha parecido bonito compartirlo con la comunidad. Este artículo será el arranque de una serie donde compartiré experiencias, aprendizajes y, quizás, alguna review de algún vehículo que me puedan prestar.</em></p>
<p><em>Sirve también como una mirada atrás que pone en perspectiva lo mucho que ha evolucionado la tecnología de los vehículos eléctricos y la red de carga en estos años. Leer hoy sobre autonomías de 250 km, paradas de carga a 6,6 kW y cargadores “rápidos” de 50KW sin activar nos recuerda el camino recorrido, y lo lejos que hemos llegado.</em></p>
<p><em>Vamos a ello, viajemos en el tiempo.</em></p>
<hr>
<p>Todo empezó con una pregunta inocente en el grupo de WhatsApp de la AUVE (Asociación de Usuarios de Vehículos Eléctricos). Le pregunté a Javier Muñoz, de <strong>Nissan ARVESA en Zaragoza</strong>, si tenían algún Leaf disponible para una prueba. Su respuesta me dejó sin palabras: <strong>“Si quieres, llévatelo tres o cuatro días y lo pruebas a fondo”</strong>. Abusando de su generosidad, le propuse llevármelo una semana entera para cubrir mi viaje habitual a Boecillo, Valladolid, donde tenía la sede de mi empresa. Javier accedió encantado, y así arrancó mi bautismo eléctrico con un <strong>Nissan Leaf N-Connecta</strong>.</p>
<h2 id="primer-día-un-sábado-de-compras">Primer día, un sábado de compras</h2>
<p><img src="/images/articulos/0001/aventura-electrica-leaf.jpeg" alt="El Nissan Leaf N-Connecta prestado por Nissan ARVESA"></p>
<p>Sábado por la mañana. Javier me lo tiene preparado y <strong>cargado al 100%</strong>. Tras una breve clase de funcionamiento, me subo y noto lo primero que nota todo el mundo: el silencio. Para ir probando sensaciones y el Propilot, me doy un rodeo por la carretera de Valencia hasta Muel antes de conectar con la A2 hacia La Muela. <strong>55 km, todo subida, y llego a casa con un 78% de batería.</strong> Primera lección aprendida: las cuestas se comen la autonomía, pero no tanto como temía.</p>
<p>Recojo a mi mujer y a mi hija y nos vamos al Centro Comercial Puerto Venecia, en Zaragoza, a pasar un típico sábado de compras. Mientras nosotros recorremos tiendas, el Leaf se alimenta tranquilamente en el Destination Charger de Tesla. Al volver, nos recibe con un flamante 100%. Unos 60 km de recarga a coste cero.</p>
<p><strong>El regreso a La Muela, 24 km de subida desde los 228 m hasta los 625 m, apenas consume un 15% a 110 km/h.</strong> Por la noche, lo enchufo al Schuko de casa para tenerlo listo al día siguiente.</p>
<h2 id="viaje-a-boecillo-valladolid">Viaje a Boecillo, Valladolid</h2>
<h3 id="la-muela---monreal-de-ariza-106km">La Muela - Monreal de Ariza (106km)</h3>
<p><img src="/images/articulos/0001/aventura-electrica-monreal.jpeg" alt="Parada en Monreal de Ariza para cargar y comer"></p>
<p>El plan era salir a mediodía, pero ya sabéis cómo son los domingos en familia. Al final <strong>arranco a las 14:10</strong> con un objetivo claro: llegar a Monreal de Ariza y comer en el Restaurante Ciudad Alcóbriga mientras el Leaf carga en su <strong>punto de carga tipo 2 de 22 kW</strong> (aunque el Leaf solo aprovecha 6,6 kW). Todo el camino entre <strong>90–100 km/h</strong> para conservar batería. El Propilot hace buena parte del trabajo, y los <strong>106 km</strong> se pasan volando.</p>
<p><img src="/images/articulos/0001/aventura-electrica-cetina.jpeg" alt="Cargador rápido inactivo en la gasolinera AVIA de Cetina"></p>
<p>De camino, una parada en la gasolinera AVIA de Cetina para comprobar un cargador rápido trío (CCS, CHAdeMO y Tipo 2) que lleva meses instalado pero sin activar. La responsable de la gasolinera me confirma lo que temía: Iberdrola no hace más que darles largas, mientras ellos ven cómo cada vez más conductores preguntan por el servicio. Frustrante.</p>
<p><strong>Llego a Monreal de Ariza a las 15:30h con un 56%</strong> y una media de consumo de <strong>15,8 kW/100km</strong>. Mientras cargo, me siento a comer: <strong>menú del día a 12 €</strong>, buena relación calidad/precio para un domingo. Tras el café, una pareja de la Guardia Civil se acerca con curiosidad a preguntarme por el coche. Es algo que se repetirá durante todo el viaje: el Leaf genera conversación allá donde para. <strong>Salgo a las 16:10 con un 77% de carga.</strong></p>
<h3 id="monreal-de-ariza---aranda-de-duero-160km">Monreal de Ariza - Aranda de Duero (160km)</h3>
<p><img src="/images/articulos/0001/aventura-electrica-aranda.jpeg" alt="Cargando en la electrolinera Easycharger en Aranda de Duero"></p>
<p>Este es el tramo que más respeto me da. A <strong>80 km/h en las subidas y 90 km/h en las bajadas</strong>, con travesías a 40–50 km/h, el consumo baja a <strong>15,2 kW/100km</strong>, pero los kilómetros pesan. A las <strong>18:50h llego al Área Tudanca</strong> de Fuentespina, junto a Aranda de Duero, <strong>con un exiguo 10%</strong>. Primer momento de tensión real del viaje.</p>
<p>Conecto en la electrolinera de <a href="http://easycharger.es" rel="noopener noreferrer" target="_blank"><strong>Easycharger</strong></a>, aunque no sin un pequeño lío de novato: activo un cargador en la app e intento enchufar en otro distinto. Una llamada rápida a soporte y solucionado.</p>
<p>Café, redes sociales, y una charla improvisada con otro propietario de Leaf que viene de Burgos camino de Madrid. Es lo que tiene cargar: conoces gente. Cuando vuelvo al coche, marca un <strong>92%</strong>. <strong>Salgo a las 20:05h. Coste de la recarga: 9,48 € IVA incluido.</strong></p>
<p><em>(Consejo: en vuestras previsiones, contad con un margen para charlar con otros usuarios y curiosos. Y sobre todo, no desconectéis el coche hasta que salgáis definitivamente.)</em></p>
<h3 id="aranda-de-duero---boecillo-valladolid-93km">Aranda de Duero - Boecillo (Valladolid) (93Km)</h3>
<p>Último tramo del día. A una media de <strong>85 km/h</strong>, <strong>llego a Boecillo a las 21:30h con un 50% de carga</strong> y un consumo de <strong>15,4 kW/100km</strong>. Nueve horas después de salir de casa, estoy en mi destino. Cansado del viaje, pero no del coche.</p>
<h2 id="mi-día-a-día-en-el-trabajo">Mi día a día en el trabajo</h2>
<p><img src="/images/articulos/0001/aventura-electrica-boecillo.jpeg" alt="El Leaf aparcado en el Parque Tecnológico de Boecillo"></p>
<p>Comienza la semana laboral. Desde el hotel en Boecillo hasta la sede de mi empresa, en el Parque Tecnológico, el Leaf se convierte en mi coche de diario. El lunes aprovecho una visita a Valladolid para <strong>cargar gratis en un cargador rápido de 50 kW en Centrolid</strong>, frente a Mercaolid. <strong>Hasta el 95% sin gastar un céntimo.</strong></p>
<p>Lo mejor de la semana no son los kilovatios, sino las caras de mis compañeros. Varios se animan a probarlo y <strong>todos, sin excepción, quedan sorprendidos por las prestaciones</strong>. Más de uno empieza a contemplar el eléctrico como opción real para su próximo coche. Me alegra haber contribuido, aunque sea un poquito, a la divulgación.</p>
<p>El jueves, cena con los compañeros en Valladolid. Mientras nosotros disfrutamos de unas cañas, <strong>el Leaf se alimenta en un punto de carga público en pleno centro. Al recogerlo: 98%.</strong> Listo para el viaje del día siguiente.</p>
<h2 id="viaje-a-salamanca">Viaje a Salamanca</h2>
<p>El viernes, al salir del trabajo, recojo a mi mujer, mi hija menor y mi suegra en la Estación de Autobuses de Valladolid. <strong>Destino: Salamanca</strong>, donde mi hija mayor nos espera con los brazos abiertos y ganas de fin de semana en familia.</p>
<p>Llegamos con carga de sobra. Tras unas compras en un Lidl (sin punto de carga, por supuesto) y dejar equipajes en el apartamento, <strong>llevo el Leaf a dormir al parking del Hotel Vincci de Salamanca: 9 € la noche</strong> con carga incluida.</p>
<p><img src="/images/articulos/0001/aventura-electrica-salamanca.jpeg" alt="Cargando en el Destination Charger del Hotel Vincci en Salamanca"></p>
<p>Pero la tranquilidad dura poco. El Destination Charger de Tesla tiene dos puntos, ambos con placa roja “Exclusivo Tesla”. Pruebo el de la izquierda: nada. Momento de pánico contenido. Gracias a los compañeros de la AUVE, que son una mina de conocimiento colectivo, pruebo el de la derecha y… funciona. Respiro.</p>
<h2 id="excursión-a-ávila">Excursión a Ávila</h2>
<p><img src="/images/articulos/0001/aventura-electrica-avila.jpeg" alt="Murallas de Ávila durante nuestra excursión"></p>
<p>Sábado, 100% de carga y plan familiar: excursión a <strong>Ávila</strong>. A <strong>110–120 km/h y con la fuerte subida, el consumo se dispara y llego con un 48%</strong>, algo menos de lo previsto. No me preocupa, porque planeo cargar allí. Pero al llegar al punto de carga público, la manguera de 7 kW está ocupada… por otro Leaf. En 2019, encontrarte con otro eléctrico en un cargador ya es toda una anécdota.</p>
<p>Lo dejo en el Schuko de carga lenta (el coche me anuncia alegremente que estará lleno a medianoche) y nos vamos a conocer Ávila. Murallas, callejuelas medievales y un buen cochinillo. Al volver, el punto de 7 kW está libre y en unas horas el Leaf sube hasta aproximadamente un <strong>78%</strong>, suficiente para regresar a Salamanca a 110–120 km/h sin agobios.</p>
<p>De vuelta, el Leaf pasa otra noche en el Hotel Vincci cargando para la etapa más exigente: el viaje de vuelta a casa.</p>
<h2 id="viaje-de-vuelta-a-casa">Viaje de vuelta a casa</h2>
<p>Domingo. Batería al 100% y tres paradas de recarga planificadas. Pensaba salir a mediodía, pero los imprevistos familiares son ley universal: <strong>arrancamos a las 13:15h</strong>.</p>
<p><strong>Primer tramo, Salamanca - Tordesillas (98 km).</strong> Podría llegar a Aranda del tirón, pero prefiero no jugármela. A 120 km/h, paro en el <strong>punto de carga de Easycharger</strong> en Tordesillas. Café y vuelta a la carretera con un 98%.</p>
<p><img src="/images/articulos/0001/aventura-electrica-tordesillas.jpeg" alt="Cargando en Easycharger Tordesillas durante el viaje de vuelta"></p>
<p><strong>Segundo tramo, Tordesillas - Aranda de Duero (114 km).</strong> Otra estación de Easycharger. Merece la pena destacar el gran trabajo que está haciendo Daniel Pérez y su empresa, extendiendo una red de carga con cuatro puntos rápidos de 50 kW en cada estación. Llego con un 48%, comemos en la cafetería del área de servicio, y salimos con un 98%. Lo vamos a necesitar.</p>
<p><strong>Tercer tramo, Aranda de Duero - Monreal de Ariza (155 km).</strong> El más largo y escarpado, aunque también el más lento. Llegamos al Restaurante Ciudad Alcóbriga con un <strong>38%</strong>. Necesito al menos un 60% para alcanzar La Muela con garantías. Pero la carga a 6,6 kW va más lenta de lo previsto y, tras hora y media de espera, decido arriesgar: <strong>salgo con un 58%</strong>.</p>
<p><strong>Y aquí empieza la aventura de verdad.</strong> Los desniveles camino de Zaragoza disparan el consumo. Aunque en las bajadas recuperas algo, al llegar a Calatayud la autonomía que marca el coche es inferior a los kilómetros que quedan. Mi mujer empieza a ponerse nerviosa. Cómo echo en falta el dichoso cargador rápido de Cetina, que sigue sin activar.</p>
<p>Tengo un as en la manga: si al pasar La Almunia de Doña Godina veo que no llegamos, puedo parar en el Hotel 280, que tiene cargador semi-rápido. Pero eso supondría 30–40 minutos más, y prefiero evitarlo.</p>
<p><img src="/images/articulos/0001/aventura-electrica-llegada.png" alt="Llegando a La Muela con el 7% de batería, misión cumplida"></p>
<p>Decido tirar para adelante. El peor momento llega en el repecho final hacia La Muela: bajo del 10% y aparece el temido mensaje de que debo parar a cargar. Mi mujer, comprensiblemente, está al borde del infarto. Pero a 90 km/h, pegado detrás de un camión, consigo alcanzar la salida de La Muela y llegar a casa <strong>con un 7% de batería</strong>.</p>
<p><strong>¡Misión cumplida!</strong> Tres paradas, algún que otro momento de tensión, y 10 horas de viaje donde normalmente habrían sido 6. Pero la conclusión es clara: <strong>incluso con un coche de 250 km de autonomía teórica, se puede viajar.</strong> Cómodo, descansado, y con la certeza de que una buena red de carga cada 50–100 km en las carreteras principales es todo lo que hace falta.</p>
<p>Y luego está la cuenta. En total, <strong>1.476 km recorridos por apenas 24 € en electricidad</strong> (42 € si sumamos las dos noches de parking). Con mi Grand Picasso diésel de diez años, habría quemado 120–130 € en gasóleo. Las matemáticas hablan solas.</p>
<p><strong>Mi agradecimiento a Javier Muñoz de Nissan ARVESA, Zaragoza, por el detallazo de prestarme el vehículo que hizo posible esta aventura.</strong></p>
<a href="https://red.nissan.es/arvesa" target="_blank" class="banner-link">
  <img src="/images/ads/nissan-leomotor.png" alt="Nissan Leomotor">
</a>', '/images/articulos/0001/aventura-electrica-avila-murallas.jpeg', null, 'Experiencia', array['Viajes','Nissan','Leaf','Autonomía','Carga','Costes','Zunder']::text[], 'Fernando Val', 'published', '2026-04-08T00:00:00.000Z'::timestamptz),
  ('escapada-pirenaica-nissan-micra-electrico', 'Escapada pirenaica con el Nissan Micra eléctrico', '442 km de escapada pirenaica, dos cargas y 5,92€ en total. El Nissan Micra demuestra que para un fin de semana en los Pirineos no necesitas más coche.', '<h2 id="un-micra-para-el-finde">Un Micra para el finde</h2>
<p>Llevaba tiempo con ganas de probar la plataforma del Renault 5 eléctrico. Y el Nissan Micra, que comparte exactamente esa base, era la excusa perfecta: básicamente el mismo coche con retoques de diseño y una puesta a punto ligeramente diferente, pero <strong>la misma mecánica, la misma batería, la misma arquitectura</strong>. Dos nombres, una plataforma. El tipo de apuesta conjunta que cada vez veremos más en la industria.</p>
<p>El problema es que estos coches no abundan en los concesionarios de la zona y no es fácil conseguir probar un modelo, más alla de la típica prueba de 20 minutos con el comercial de turno. Así que <strong>se me ocurrió llamar a Javier Muñoz, de Nissan Leomotor</strong>. Javier ya me ha prestado otros Nissan en otras ocasiones para traerlos aquí y contaros cómo son en el día a día real, no en el folleto. Esta vez no fue diferente: un par de mensajes y amablemente me lo prestó para el fin de semana.</p>
<p>Antes de seguir, <strong>un aviso para navegantes</strong>: lo que vas a leer no es una prueba técnica al uso. No vas a encontrar aquí análisis del paso por curva, geometría de suspensiones ni comparativas de tiempos en pista. Lo que encontrarás es <strong>la perspectiva de un usuario normal, padre de familia, que lleva años viajando en eléctrico</strong> y que evalúa los coches desde un punto de vista muy concreto: ¿me sirve para mover a mi familia con comodidad? ¿Puedo usarlo para un viaje de trabajo sin ansiedad por la autonomía? ¿Me da lo que necesito en el día a día real? Esas son las preguntas que me hago, y esas son las que intento responder.</p>
<p><img src="/images/articulos/0002/listo-para-salir.png" alt="Nissan Micra eléctrico Tekna listo para salir de La Muela hacia los Pirineos"></p>
<p>La primera impresión al subirme fue buena. El cockpit es bonito, moderno y tecnológico, y <strong>los materiales tienen una calidad que no esperas en este segmento</strong>, no se ve ni se siente un coche de bajo coste. Lo que no me convenció tanto fueron las palancas detrás del volante: hay demasiadas y cuesta un momento acostumbrarse a cuál es cuál. Lo que sí me encantó fueron las levas de regeneración, que permiten ajustar el nivel de frenada desde el modo regeneración cero hasta el one-pedal. Muy familiar para mí, porque el e-Niro lleva las mismas levas.</p>
<p>El jueves, en cuanto me prestaron el coche, <strong>hice una primera ruta hasta Calatayud y vuelta</strong> para conocer el coche, ver cómo se comportaba en consumo y comprobar que no había sorpresas en el cargador rápido. No me gusta llegar a un viaje con un coche desconocido. Para el viernes ya lo sentía como mío.</p>
<p>Pero tenía claro cómo quería probarlo en condiciones de un viaje real. El Micra no es un coche de autopista a todo meter ni un todocamino para los Alpes. Es <strong>un coche de ciudad que aguanta bien las escapadas de media distancia</strong>: esos viajes de fin de semana de 200 a 300 km en cada sentido que muchos hacemos varias veces al año. Así que lo cargué al 100%, y el viernes por la tarde metí las maletas en el maletero (dos personas, dos maletas, justo para lo que está pensado) y <strong>pusimos rumbo a Morillo de Tou, en pleno Pirineo oscense</strong>.</p>
<p><img src="/images/articulos/0002/maletero.png" alt="Maletero del Nissan Micra eléctrico con dos maletas para viaje de fin de semana"></p>
<h2 id="ida-la-muela--morillo-de-tou-199-km">Ida: La Muela → Morillo de Tou (199 km)</h2>
<p><img src="/images/articulos/0002/ruta.png" alt="Ruta La Muela a Morillo de Tou en Google Maps, 202 km en coche eléctrico"></p>
<p>Salimos con el <strong>100% de batería</strong>. La ruta hasta Barbastro es autovía, así que los <strong>120 km/h</strong> son la norma. A partir de ahí, carretera nacional y los últimos kilómetros de subida hacia los Pirineos, donde bajamos a 90. Todo el viaje con el <strong>“Autopilot” activado y el aire acondicionado a 23°</strong>, porque por debajo de eso, yo paso frío.</p>
<p>El recorrido es claramente ascendente: nos vamos acercando a la cordillera y se nota. Cuando llevamos <strong>169 km</strong> y llegamos a El Grado, el indicador marca un <strong>41%</strong>. Momento de parar a cargar y echar un café, ya que lo quiero dejar cargado para la vuelta el domingo.</p>
<h3 id="parada-en-el-grado">Parada en El Grado</h3>
<p><img src="/images/articulos/0002/primera-carga.png" alt="Cargador rápido Endesa X en El Grado cargando el Nissan Micra eléctrico a 58 kW"></p>
<p>El cargador Endesa X tiene dos mangueras CCS. Como era yo el único cargando, el equipo se volcó entero en el Micra: <strong>92 kW sostenidos</strong> durante toda la sesión. Cargué <strong>del 41% al 90% en 30 minutos</strong>. El coste de la carga fue de <strong>4,48€</strong> con la app PowerGo a 0,11€/kWh.</p>
<p>30 minutos dan para un café, el baño y estirar las piernas. Nada mal y batería lista para el regreso.</p>
<h3 id="los-últimos-33-km">Los últimos 33 km</h3>
<p>Desde El Grado hasta Morillo de Tou son 33 km, los mejores del viaje. La carretera se vuelve mucho más sinuosa, el río Cinca aparece y desaparece, la vegetación se hace más densa.</p>
<p><img src="/images/articulos/0002/ruta-del-cinca.png" alt="Carretera del río Cinca entre El Grado y Morillo de Tou, Pirineos"></p>
<h2 id="morillo-de-tou-y-aínsa">Morillo de Tou y Aínsa</h2>
<p><img src="/images/articulos/0002/morillo-de-tou.png" alt="Morillo de Tou, pueblo recuperado por CCOO en el Pirineo oscense"></p>
<p>Morillo de Tou es un sitio especial. Un pueblo del Pirineo que <strong>quedó abandonado en los años 50</strong> cuando se construyó el embalse de Mediano, y que <strong>CCOO recuperó a partir de 1985</strong> gracias al trabajo voluntario de sus afiliados. Hoy es un complejo de turismo rural con camping, bungalows, apartamentos y restaurante. Los afiliados a CCOO tienen descuentos especiales, y el entorno es exactamente lo que buscas cuando quieres desconectar.</p>
<p>El fin de semana nos recibió con <strong>lluvia pirenaica</strong>, de esa que invita a ir despacio. Paseos sin prisa entre la niebla, poco coche, y una <strong>visita a Aínsa que por sí sola justifica el viaje</strong>. Tenía pensado hacer fotos del Micra con los Pirineos de fondo, pero la iluminación y las condiciones no acompañaron, así que quedará para la próxima.</p>
<p><img src="/images/articulos/0002/ainsa.png" alt="Casco medieval de Aínsa con el castillo al fondo, Sobrarbe, Huesca"></p>
<p>Aínsa ya la conocíamos, pero sigue siendo espectacular. El casco antiguo medieval, el castillo, las vistas desde arriba. Si pasas por la zona y no subes a Aínsa, algo estás haciendo mal. Por cierto, en Aínsa hay cargadores tanto de 22KW como de carga rápida. Podría haber sido buena idea cargar ahí en lugar de El Grado, pero como últimamente no planifico demasiado los viajes, fui improvisando sobre la marcha.</p>
<p><strong>Un apunte para los que viajáis en eléctrico:</strong> en Morillo de Tou no hay cargadores, ni siquiera la posibilidad de enchufar a un Schuko. Para un complejo de turismo rural que presume de entorno natural y sostenibilidad, es una asignatura pendiente. Llegamos con batería suficiente para movernos por la zona sin problema, pero es algo que hay que tener en cuenta si sales más justo.</p>
<h2 id="el-micra-al-volante-modos-consumo-y-sorpresas">El Micra al volante: modos, consumo y sorpresas</h2>
<p><img src="/images/articulos/0002/interior-micra.png" alt="Interior del Nissan Micra eléctrico Tekna, cockpit y pantalla central"></p>
<p>Una cosa que aprendí rápido: el modo ECO del Micra no es para mí. Lo activas y el coche se queda algo muerto en el pedal, casi como si llevases un diésel de escasa potencia. Le pasa lo mismo al Leaf que tenemos en casa, y parece algo típico de Nissan. El ECO de mi Kia e-Niro es suave y usable; el del Micra, no.</p>
<p>En modo Confort, que es el intermedio, el coche es otro. Responde bien, la conducción es agradable y la recuperación de energía funciona de manera natural. Y en carretera, da gusto: la suspensión del Tekna es algo más firme que en acabados inferiores, pero filtra muy bien y a cambio te da un aplomo tremendo en curva. <strong>El coche no balancea, va completamente plano</strong>, y eso te da una confianza que no esperaba en un utilitario de este tamaño. Los frenos los usé poco, con la regeneración se frena casi siempre, pero cuando los necesité respondieron de forma progresiva y sin sorpresas.</p>
<p>Sus <strong>150 CV se sienten casi como los 204 de mi e-Niro</strong>, al menos a velocidades bajas y medias. Es muy vivo, muy ágil, y mueve el coche con una facilidad que sorprende. A partir de 100 km/h se nota algo menos de empuje, pero tiene potencia de sobra para adelantar sin problemas. Lo que llaman conducción autónoma de nivel 2, que yo simplifico como “Autopilot”, funciona de forma muy fina: traza las curvas con suavidad incluso a 120, no hace movimientos bruscos y raramente te hace intervenir.</p>
<p>Google Automotive está muy bien integrado. Las previsiones de autonomía con ruta programada son <strong>sorprendentemente precisas, un 1% arriba o abajo</strong>. Nada de las estimaciones optimistas que te dejan tirado.</p>
<p><strong>El consumo medio de toda la escapada fue de 14,4 kWh/100 km.</strong> Lo confieso: me sorprendió para bien. Perfil ascendente, velocidades máximas de la vía, Autopilot y A/C a 23° todo el rato. Para ese contexto, 14,4 es un dato muy bueno.</p>
<p>Hay que decir que mi estilo de conducción es habitualmente suave, anticipando frenadas, sin aceleraciones bruscas. El Leaf de 24 kWh fue una gran escuela de eficiencia. <strong>En breve os compartiré otra prueba con el Micra en modo Sport y con una conducción más ágil y divertida</strong>, a ver cómo responde el coche cuando no estás pensando en los kWh. Eso será materia de otro artículo.</p>
<h2 id="vuelta-morillo-de-tou--la-muela-202-km">Vuelta: Morillo de Tou → La Muela (202 km)</h2>
<p>El domingo salimos con el <strong>80% de batería</strong>. La vuelta es básicamente el mismo trayecto pero descendente, lo que ayuda. Llevaba calculado que <strong>podríamos llegar a La Muela con un 4% sin parar</strong>, pero no quise apurar. Cuando vi el McDonald’s de PLAZA a mano, paré sin dudarlo. <strong>Seis minutos, 1,44€</strong> con PowerGo y salí con el <strong>33%</strong>.</p>
<p><img src="/images/articulos/0002/recarga-mcdonalds.png" alt="Cargador rápido de 150 kW en McDonald&#x27;s PLAZA Zaragoza cargando el Nissan Micra eléctrico"></p>
<p>El <strong>cargador es de 150 kW</strong>. Con el Micra <strong>pasar del 12% al 33% en seis minutos</strong> da una idea de lo que da de sí una parada corta cuando el cargador es potente y la batería está baja. En este caso la potencia de carga subió muy rápido hasta los <strong>100 kW</strong>, lo que se corresponde con la potencia máxima que declarada en las especificaciones del vehículo, lo cual es muy buena noticia, ya que mi e-Niro declara también 100KW y nunca ha pasado de 78KW.</p>
<p><strong>Llegué a casa con el 25%</strong>. Lo que significa que esa carga era innecesaria, pero como no conocía como podía reaccionar esa batería en su tramo final, no quería arriesgarme a entrar en el modo tortuga subiendo el puerto de La Muela.</p>
<div class="data-card">
<h2 id="datos-clave-del-viaje">Datos clave del viaje</h2>
<dl>
  <dt>Recorrido total</dt>
  <dd>442 km (La Muela → Morillo de Tou → La Muela)</dd>
  <dt>Consumo medio</dt>
  <dd>14,4 kWh/100 km</dd>
  <dt>Cargas realizadas</dt>
  <dd>2 (El Grado y McDonald''s PLAZA)</dd>
  <dt>Coste total en cargas</dt>
  <dd>5,92€ (PowerGo)</dd>
  <dt>Tiempo de carga acumulado</dt>
  <dd>36 minutos</dd>
  <dt>Potencia máxima observada</dt>
  <dd>100 kW (carga en McDonald''s PLAZA)</dd>
  <dt>Batería de llegada a casa</dt>
  <dd>25%</dd>
  <dt>Clima</dt>
  <dd>Entre 22º y 26ºlluvia pirenaica, A/C a 23°</dd>
  <dt>Velocidad</dt>
  <dd>120 km/h en autovía (80%), 90 en nacional (20%), "Autopilot" activado</dd>
</dl>
</div>
<h2 id="conclusiones-del-viaje">Conclusiones del viaje</h2>
<p><img src="/images/articulos/0002/interior-micra-2.png" alt="Nissan Micra eléctrico de vuelta en La Muela tras 442 km por los Pirineos"></p>
<p><strong>442 km de escapada pirenaica. Dos cargas. 5,92€ en total.</strong> Llegué a casa descansado, ya que el viaje no se hizo largo ni pesado en ningún momento. ¿Hubiera podido hacer este viaje con mi Kia e-Niro sin cargar en ningún punto? Definitivamente sí. Pero el Micra tiene algo que el e-Niro no tiene para este tipo de ruta: es más divertido. Más ligero, más ágil, más vivo. Son coches para cosas distintas.</p>
<p><strong>Para una escapada de fin de semana con dos personas y el equipaje justo, el Micra es una opción muy sólida.</strong> Y si vais cuatro, el espacio interior da más de lo que el exterior promete.</p>
<p><img src="/images/articulos/0002/asientos-traseros.png" alt="Asientos traseros del Nissan Micra eléctrico, espacio interior para cuatro pasajeros"></p>
<p>Si tuviera 100 km más de autonomía real, sería ya un coche perfecto para todo uso. <strong>Con los 300-350 km de autonomía real que yo le estimo, sigue siendo una opción muy seria para quien no necesite hacer grandes rutas cada semana.</strong></p>
<p><strong>Quiero dar las gracias una vez más, a Javier Muñoz de Nissan Leomotor por prestarme el coche.</strong> Sin su apoyo, este artículo no hubiera sido posible. Y si estos artículos os gustan y les dais cariño, habrá más pruebas y más coches que traer a EVMinds. De momento queda pendiente una review más global y otro artículo con una conducción más deportiva.</p>
<a href="https://red.nissan.es/leomotor" target="_blank" class="banner-link">
  <img src="/images/ads/nissan-leomotor.png" alt="Nissan Leomotor">
</a>', '/images/articulos/0002/hero-nissan-micra.png', 'Nissan Micra eléctrico Tekna en una carretera del Pirineo oscense durante una escapada de fin de semana', 'Viaje', array['Nissan','Micra','Carga rápida','Endesa-X','Autonomía']::text[], 'Fernando Val', 'published', '2026-04-21T07:00:00.000Z'::timestamptz),
  ('nissan-micra-electrico-modo-sport-cinco-villas-monlora', 'Nissan Micra eléctrico en modo Sport: 218 km de curvas por las Cinco Villas', '218 km por Cinco Villas y Campo de Borja en modo Sport. Curvas enlazadas, las vistas del Monasterio de Monlora y un consumo que no se dispara cuando lo pisas. El Micra me ha ganado.', '<h2 id="un-micra-el-modo-sport-y-una-mañana-libre">Un Micra, el modo Sport y una mañana libre</h2>
<p>En el artículo anterior os conté la escapada a Morillo de Tou con el Nissan Micra eléctrico en modo Confort: conducción suave, eficiencia por bandera y <strong>14,4 kWh/100 km de media</strong>. Quedó pendiente la otra cara de la moneda: ver de qué es capaz cuando lo pisas, <strong>qué hace realmente el modo Sport</strong>, y si ese chasis que tanto me gustó en ruta aguanta bien en curvas con fundamento.</p>
<p>Así que aproveché una mañana libre, soleada y con el termómetro entre 18° y 27°, y me preparé una <strong>rutilla circular de 218 km</strong> por dos zonas que conozco bien y tienen carreteras divertidas: <strong>las Cinco Villas y el Campo de Borja</strong>. Un 80% de secundarias, un 20% de autovía, y todo el trayecto solo en el coche para centrarme sin distracciones.</p>
<p><img src="/images/articulos/0003/ruta.webp" alt="Ruta circular La Muela, Zuera, Monlora, Ejea, Tauste, Gallur, Borja, Épila en Google Maps, 218 km"></p>
<h2 id="la-ruta-circular-por-cinco-villas-y-campo-de-borja-218-km">La ruta: circular por Cinco Villas y Campo de Borja (218 km)</h2>
<p>Salí de La Muela subiendo hasta Zuera por la A-23. A partir de ahí, carreteras comarcales hacia el norte hasta el Monasterio de Monlora, con una subida estrecha y empinada que ya merece el viaje por sí sola. Después bajé a Ejea de los Caballeros, seguí hasta Tauste (la pena, el tramo Ejea-Tauste está en obras y toca ir con paciencia), Gallur, Borja y Fuendejalón. De ahí hacia Épila y vuelta a La Muela.</p>
<p>Todo el recorrido con el <strong>climatizador a 23°, en modo Sport</strong>, y el Autopilot solo activado en los tramos de autovía. En las secundarias, manos al volante y a disfrutar.</p>
<h2 id="parada-obligada-el-monasterio-de-monlora">Parada obligada: el Monasterio de Monlora</h2>
<p>Si no conoces Monlora, apúntalo. Es un santuario a unos <strong>800 metros de altitud</strong>, en lo alto de una loma, rodeado de campo abierto. La subida ya es parte de la experiencia: <strong>estrecha, empinada, con curvas cerradas</strong>. De esas carreteras que en un coche torpe se hacen pesadas y en uno ágil y eléctrico como el Micra, te sacan la sonrisa.</p>
<p><img src="/images/articulos/0003/monlora-1.webp" alt="Nissan Micra eléctrico Tekna en la explanada del Monasterio de Monlora"></p>
<p>Arriba te espera la explanada del monasterio, y las vistas. <strong>Aquí es donde el sitio te deja sin palabras.</strong> A un lado, <strong>los Pirineos</strong>. A otro, <strong>las Cinco Villas</strong> extendiéndose hasta Navarra. Enfrente, <strong>el valle del Ebro con el Moncayo al fondo</strong>. En un día despejado como el que yo tuve, es de las mejores panorámicas que puedes tener. Hay un restaurante en el que, al menos la última vez que estuve, se come muy bien, gastronomía casera de la zona y brasa. No es lujoso, pero es muy agradable. Eso sí, creo que solo abre fines de semana y festivos, aseguraos antes de acercaros.</p>
<p><img src="/images/articulos/0003/monlora-3.webp" alt="Vistas desde el Monasterio de Monlora hacia los Pirineos y las Cinco Villas"></p>
<p><img src="/images/articulos/0003/monlora-2.webp" alt="Nissan Micra eléctrico con el Moncayo al fondo desde Monlora">
<img src="/images/articulos/0003/monlora-4.webp" alt="Nissan Micra eléctrico con el Moncayo al fondo desde Monlora"></p>
<h2 id="modo-sport-qué-cambia-realmente">Modo Sport: qué cambia realmente</h2>
<p>Aquí hay que ser honesto. <strong>El modo Sport en el Micra no transforma el coche.</strong> No hay un “antes y después” brutal, ni la dirección se endurece de repente, ni la suspensión se vuelve otra cosa. Pero sí hay un cambio, y es donde más importa: <strong>la entrega de la potencia</strong>.</p>
<p>En modo Confort el coche ya va bien, muy bien. Responde al pedal de forma suave y progresiva, y los 150 CV se sienten suficientes para cualquier situación del día a día. En Sport, esa misma suavidad inicial se mantiene (no tiene una patada brusca al arrancar, que lo agradezco), pero a nada que pises un pelín más, <strong>la escalada de potencia es otra. Más rápida, más decidida</strong>. Sube y sube sin darte cuenta apenas.</p>
<p>Desconozco si técnicamente el modo Confort limita algo de potencia y el Sport te entrega todo, o si simplemente cambia la curva de respuesta del pedal. Lo que sí os digo es que <strong>en Sport el coche se siente más potente, más vivo</strong>.</p>
<p>El volante y la suspensión no los noté diferentes. Pero es que en Confort ya van muy bien, así que tampoco hacía falta.</p>
<h2 id="el-chasis-en-conducción-viva-aplomo-dirección-y-frenos">El chasis en conducción viva: aplomo, dirección y frenos</h2>
<p>Aquí el Tekna me ha ganado del todo. La suspensión algo más firme de este acabado filtra muy bien los baches de las carreteras aragonesas, que no siempre están en buen estado, y a cambio <strong>te da un aplomo que invita a pisar</strong>. <strong>El coche no balancea en curva, va completamente plano</strong>, y eso da una confianza brutal para atacar curvas enlazadas.</p>
<p>La dirección es precisa. No es de las que te dan sensación de pilotaje puro, pero te transmite lo que hace el tren delantero y te pone el coche donde lo quieres sin esfuerzo. Tampoco en esta ocasión usé mucho los frenos, ya que jugando con las levas y los diferentes modos de regeneración fue suficiente para entrar con seguridad en la mayoría de curvas. Aún así, los frenos en sí, cuando los usé, respondieron muy bien, con buen tacto y sin sorpresas.</p>
<p>Un punto que no destaqué lo suficiente en el primer artículo: <strong>los asientos</strong>. Me gustan más que los de mi e-Niro. Te envuelven bien, te sujetan en curva. Eso sí, sin llegar a ser deportivos.</p>
<p><img src="/images/articulos/0003/micra-3.webp" alt="Interior del Nissan Micra eléctrico Tekna con el modo Sport activado"></p>
<h2 id="los-150-cv-del-micra-cuando-le-pisas">Los 150 CV del Micra, cuando le pisas</h2>
<p>Con datos fríos, <strong>150 CV no son una barbaridad</strong>. En papel. En carretera, el Micra los aprovecha de una forma que me ha sorprendido para bien. Es un coche pequeño y ligero, y eso se traduce en que <strong>esos caballos se sienten más que en otro coche de más peso</strong>. Las aceleraciones saliendo de curva, con el coche ya apoyado, son inmediatas. Los adelantamientos en recto, sin la menor complicación. Como en la mayoría de los eléctricos, pisas y en dos segundos ya has adelantado.</p>
<p>No tiene el pegarte-al-asiento de los 400 CV de otros eléctricos, pero tiene algo que considero mucho más valioso en una rutilla así: <strong>equilibrio</strong>. Es un coche que no te dice “vamos a batir un récord”, <strong>te dice “vamos a pasarlo bien”</strong>. Y eso, en una mañana tranquila por curvas enlazadas, es exactamente lo que buscaba.</p>
<p><img src="/images/articulos/0003/micra-1.webp" alt="Interior del Nissan Micra eléctrico Tekna con el modo Sport activado"></p>
<h2 id="consumo-de-una-escapada-deportiva">Consumo de una escapada deportiva</h2>
<p>Aquí viene la sorpresa positiva. <strong>Salí con el 100% de batería y regresé a La Muela con un 32%</strong>. Es decir, <strong>218 km de ruta con un 68% de batería consumido</strong>.</p>
<p>Se me olvidó resetear el contador del coche antes de salir, así que no tengo el dato exacto de esta ruta aislada. Lo que sí me dejó es una buena referencia: <strong>la media acumulada del coche pasó de 14,4 a 15,5 kWh/100 km</strong>. Esta ruta deportiva <strong>solo subió la media 1,1 puntos</strong>.</p>
<p>Que un eléctrico aguante una conducción viva por carreteras secundarias con curvas, cuestas y acelerones con ese impacto mínimo en la media es un dato muy notable.</p>
<div class="data-card">
<h2 id="datos-clave-de-la-ruta">Datos clave de la ruta</h2>
<dl>
  <dt>Recorrido total</dt>
  <dd>218 km (ruta circular por Cinco Villas y Campo de Borja)</dd>
  <dt>Tipo de carreteras</dt>
  <dd>80% secundarias, 20% autovía</dd>
  <dt>Batería consumida</dt>
  <dd>68% (salida 100%, regreso 32%)</dd>
  <dt>Consumo</dt>
  <dd>Media acumulada del coche pasó de 14,4 a 15,5 kWh/100 km (+1,1 puntos)</dd>
  <dt>Cargas realizadas</dt>
  <dd>0 (ruta circular)</dd>
  <dt>Modo de conducción</dt>
  <dd>Sport en todo el recorrido</dd>
  <dt>Clima</dt>
  <dd>Entre 18º y 27º, día soleado, A/C a 23°</dd>
  <dt>Velocidad</dt>
  <dd>Máximas permitidas por la vía, "Autopilot" solo activado en autovía</dd>
</dl>
</div>
<h2 id="conclusiones-el-micra-me-ha-ganado">Conclusiones: el Micra me ha ganado</h2>
<p>Después de estos dos artículos, la escapada a Morillo en modo Confort y esta rutilla en modo Sport, tengo ya la opinión bastante formada sobre el Nissan Micra eléctrico Tekna. Y es que <strong>me ha gustado mucho</strong>.</p>
<p>Es un coche que <strong>te hace sentir cómodo en un viaje largo, que te hace sonreír en una mañana de curvas</strong>, y que consume poco en ambos escenarios. No es perfecto: <strong>la autonomía real de 300-350 km lo deja corto para rutas muy largas</strong>, y el modo ECO no convence. Pero es un coche muy completo, muy bien resuelto, y con <strong>un comportamiento dinámico que supera lo que su segmento y sus caballos te prometen sobre el papel</strong>.</p>
<p><strong>¿Lo recomendaría? Sí, con mucha convicción</strong>, para quien encaje en su tipo de uso: ciudad, trayectos diarios, escapadas de fin de semana y rutitas divertidas como la de hoy. Si lo que necesitas son 500 km de una tirada, no es tu coche. <strong>Si lo que quieres es un utilitario eléctrico que te saque la sonrisa cada vez que lo coges, sí lo es</strong>.</p>
<p><img src="/images/articulos/0003/micra-2.webp" alt="Nissan Micra eléctrico Tekna con las Cinco Villas al fondo"></p>
<p>Tengo pendiente un artículo final de impresiones generales con todas las piezas juntas: a quién se lo recomendaría, a quién no, qué me llevo, qué mejoraría. Pronto por aquí.</p>
<p><strong>Gracias de nuevo a Javier Muñoz de Nissan Leomotor</strong> por la confianza y el préstamo del coche. Cada vez que puedo contaros una experiencia así es gracias a algunas personas y empresas que creen en el proyecto y nos abren las puertas. Si estos artículos os gustan y les dais cariño, habrá más pruebas y más coches que traer a EVMinds.</p>
<a href="https://red.nissan.es/leomotor" target="_blank" class="banner-link">
  <img src="/images/ads/nissan-leomotor.png" alt="Nissan Leomotor">
</a>', '/images/articulos/0003/hero-nissan-micra.webp', null, 'Review', array['Nissan','Micra','Review','Autonomía']::text[], 'Fernando Val', 'published', '2026-04-24T07:00:00.000Z'::timestamptz),
  ('nissan-micra-electrico-tekna-review-final', 'Nissan Micra eléctrico Tekna: veredicto final tras 951 km de prueba real', 'Pirineos en modo Confort, Cinco Villas en modo Sport, 951 km en total. Este es el veredicto: a quién se lo recomendaría, a quién no, y por qué el Micra me ha ganado.', '<p>Si lleváis siguiendo esta serie desde el principio, sabéis de qué va. El <a href="/articulos/0002">primer artículo</a> fue una escapada de fin de semana a Morillo de Tou: <strong>442 km por los Pirineos en modo Confort, dos cargas, 5,92€ en total</strong>. El <a href="/articulos/0003">segundo</a> fue una mañana de curvas por las Cinco Villas con el modo Sport puesto y la cabeza despejada: <strong>218 km, 68% de batería consumido, cero cargas</strong>. Este es el cierre. El momento de juntar todas las piezas y dar un veredicto claro. Voy a intentar ser tan honesto como de costumbre. Pero ya os aviso, me gustan tanto los eléctricos, que al final pocos me van a parecer malos. Avisados estáis.</p>
<h2 id="lo-que-me-llevo">Lo que me llevo</h2>
<p>Empiezo por lo bueno, porque hay bastante.</p>
<p><strong>El chasis es lo primero.</strong> En el artículo de los Pirineos ya lo mencioné, y en las Cinco Villas lo confirmé: el Tekna va completamente plano en curva, sin balanceos, con una confianza que no esperas en un utilitario de este segmento. La suspensión algo más firme de este acabado filtra bien el asfalto irregular de las comarcales aragonesas y a cambio te da un aplomo que invita a pisar. Se siente un coche muy ligero y ágil, algo que se agradece y que lo hace extremadamente divertido en zonas reviradas.</p>
<p><strong>Los asientos me han gustado más que los de mi e-Niro.</strong> Y eso no es poca cosa, porque el e-Niro no va mal en ese apartado. Los del Micra te envuelven, te sujetan en curva, y en viaje largo no acusas fatiga. No son deportivos, pero están a la altura del precio del coche. Añadir que estos son calefactados y ventilados.</p>
<p><strong>Los 150 CV se aprovechan muy bien.</strong> Es un coche ligero, y eso se nota. La aceleración de salida de curva es inmediata, los adelantamientos en recto no requieren planificación, y en modo Sport la escalada de potencia es rápida y decidida sin ser brusca. No pega el tirón de un eléctrico de 400 CV, pero tiene algo más valioso para una rutilla: equilibrio. Y eso, en una mañana por las Cinco Villas, es exactamente lo que buscas.</p>
<p><strong>Google Automotive integrado de verdad.</strong> Era mi primera experiencia con este sistema y me ha dejado muy buen sabor de boca. Las previsiones de autonomía con ruta programada son sorprendentemente precisas, un 1% arriba o abajo. Nada de las estimaciones optimistas que te dejan tirado a 30 km del destino. La integración es fluida, nativa, sin la sensación de que el móvil está “proyectado” en la pantalla del coche. Se nota que forma parte del sistema.</p>
<p><strong>La carga rápida llega a los 100 kW declarados.</strong> Mi e-Niro declara también 100 kW y nunca ha pasado de 78 kW en la práctica. El Micra subió hasta los 100 kW en McDonald’s PLAZA sin despeinarse. Es un detalle técnico, pero para quien viaja en eléctrico, saber que el coche cumple lo que promete en carga vale mucho.</p>
<p>Y por último, <strong>el consumo</strong>. 14,4 kWh/100 km de media en los Pirineos, con perfil ascendente, Autopilot y aire acondicionado. La media acumulada solo subió a 15,5 kWh/100 km tras una mañana entera en modo Sport por secundarias. Son datos muy buenos para lo que el coche pedía.</p>
<p><img src="/images/articulos/0004/monlora-3.webp" alt="Monasterio de Monlora con el Nissan Micra eléctrico Tekna al fondo"></p>
<h2 id="lo-que-mejoraría">Lo que mejoraría</h2>
<p>También hay cosas que no me han convencido, y prefiero decirlas sin rodeos.</p>
<p><strong>Las palancas detrás del volante son demasiadas.</strong> Las levas de regeneración me encantan, las uso constantemente y son muy intuitivas. Pero hay más palancas alrededor, y en los primeros días cuesta distinguir cuál es cuál sin mirar. No es un problema grave, con el tiempo te acostumbras, pero en un coche tan bien resuelto en otros aspectos, ese detalle chirría.</p>
<p><strong>El sistema de velocidad adaptativa por señales hace cosas raras.</strong> Y esto sí me ha molestado más. Si pones el límite de velocidad en 110 km/h y el coche baja a 80 al ver una señal de 80, hasta ahí todo correcto. El problema viene cuando aparece una señal de 120: el Micra intenta subir a 120 en lugar de respetar el límite máximo que tú has fijado. Tienes que acordarte de corregirlo manualmente. En una conducción relajada con el Autopilot puesto, ese comportamiento te descoloca.</p>
<p><strong>El modo ECO no convence.</strong> Ya lo dije en el primer artículo y lo ratifico. Lo activas y el coche se queda muerto en el pedal, “modo tractor”, lo llamaría yo. Al Leaf de casa le pasa lo mismo, parece algo típico de Nissan. La buena noticia es que en modo Confort ya eres bastante eficiente, así que tampoco lo necesitas.</p>
<p><strong>El precio es algo elevado.</strong> Creo que tal y como es esta poniendo el mercado, donde cada vez hay más opciones, se hace difícil pagar por un coche más pequeño lo que pagas por uno más grande y con más batería. Por no hablar de otras opciones de utilitarios eléctricos que están saliendo más económicos. No obstante, con algún descuento por campaña, podría quedarse en un precio ya mucho más interesante.</p>
<p><img src="/images/articulos/0004/micra-3.webp" alt="Interior del Nissan Micra eléctrico Tekna con el modo Sport activado"></p>
<h2 id="para-quién-es-este-coche">Para quién es este coche</h2>
<p>El Micra es <strong>un rutero divertido y un urbano muy ágil</strong>. Y con eso ya os digo bastante.</p>
<p>Encaja a la perfección con <strong>solteros, parejas sin hijos o como segundo coche de familia</strong>. El maletero da para dos maletas de fin de semana, el interior sorprende para cuatro personas, y en ciudad es imbatible: pequeño, ligero, ágil, con el radio de giro de un coche de segmento B y la respuesta de un eléctrico.</p>
<p>Y para viajes de media distancia, más de lo que parece. Desde Zaragoza, <strong>se puede ir a Bilbao, a Barcelona, a Valencia o a Madrid casi sin parar</strong>, o parando a echar un café de 15 o 20 minutos, según lo que pese el pie. Con una red de carga rápida cada vez más densa en las rutas principales, los <strong>300-350 km de autonomía real</strong> que yo le estimo son suficientes para mucho más de lo que el número sugiere a primera vista.</p>
<h2 id="para-quién-no-es">Para quién no es</h2>
<p>Aquí también hay que ser claro.</p>
<p>Si tus viajes habituales son de <strong>más de 400 km</strong> y los haces con frecuencia, el Micra no es tu coche. No porque no llegue, que con una parada puede llegar, sino porque para ese uso hay opciones más cómodas y con menos paradas. El Micra está pensado para otra cosa, y forzarlo en rutas largas sería pedirle lo que no es.</p>
<p>Tampoco es el coche ideal si necesitas llevar a cuatro adultos con equipaje de semana. Da más de lo que parece, pero tiene un límite.</p>
<h2 id="gama-y-precios">Gama y precios</h2>
<div class="data-card">
<h2 id="nissan-micra-eléctrico-versiones-y-precios">Nissan Micra eléctrico: versiones y precios</h2>
<dl>
  <dt>Acenta — 40 kWh / 122 CV / 319 km WLTP</dt>
  <dd>Desde 27.700 €</dd>
  <dt>N-Connecta — 40 kWh / 122 CV / 319 km WLTP</dt>
  <dd>Desde 29.800 €</dd>
  <dt>N-Connecta — 52 kWh / 150 CV / 419 km WLTP ⭐ Recomendada</dt>
  <dd>Desde 32.750 €</dd>
  <dt>Tekna — 52 kWh / 150 CV / 419 km WLTP</dt>
  <dd>Desde 35.750 €</dd>
  <dt>Carga rápida máxima</dt>
  <dd>80 kW (40 kWh) / 100 kW (52 kWh)</dd>
  <dt>Garantía</dt>
  <dd>Hasta 10 años con programa Nissan+</dd>
</dl>
<p><strong>Mi recomendación es la N-Connecta de 52 kWh.</strong> El salto de 40 a 52 kWh no es solo de autonomía: también sube la potencia de 122 a 150 CV y la carga rápida de 80 a 100 kW. Por unos 3.000 € más respecto a la N-Connecta de 40 kWh, el coche que te llevas es sensiblemente mejor en los tres aspectos que más importan en ruta. El Tekna añade el equipo de sonido Harman Kardon, el cargador inalámbrico y algún detalle más, pero el salto de precio respecto a la N-Connecta de 52 kWh es de otros 3.000 €. Para la mayoría, la N-Connecta de 52 kWh es el punto dulce.</p>
</div>
<p>Precios en la <a href="https://micra.nissan.es/" rel="noopener noreferrer" target="_blank">web oficial</a></p>
<h2 id="el-veredicto">El veredicto</h2>
<p>Volví a La Muela con el Micra después de varios días, <strong>951 km en total</strong>, y lo hice con una conclusión bastante clara: este coche me ha ganado.</p>
<p>No es el coche más grande, ni el de mayor autonomía, ni el más rápido. Pero dentro de lo que es, dentro de su segmento y su propósito, está muy bien resuelto. <strong>Te hace sentir cómodo en un viaje largo y te hace disfrutar mucho en una mañana de curvas.</strong> Eso no lo consigue cualquier utilitario, eléctrico o no.</p>
<p>Si buscas un coche para la ciudad, las escapadas de fin de semana y alguna que otra rutilla con fundamento, el Micra es una opción muy seria. Con mucha convicción.</p>
<p><strong>Gracias una vez más a Javier Muñoz de Nissan Leomotor</strong> por la confianza depositada en EVMinds y por hacer posibles estos tres artículos.</p>
<a href="https://red.nissan.es/leomotor" target="_blank" class="banner-link">
  <img src="/images/ads/nissan-leomotor.png" alt="Nissan Leomotor">
</a>', '/images/articulos/0004/hero-nissan-micra.webp', 'Nissan Micra eléctrico Tekna en carretera, vista frontal en tres cuartos', 'Review', array['Nissan','Micra','Review','Autonomía']::text[], 'Fernando Val', 'published', '2026-04-28T06:00:00.000Z'::timestamptz),
  ('primera-vez-renault-zoe-madrid-murcia', 'Mi primera vez con un coche eléctrico: un Renault Zoe de Madrid a Murcia con la batería al límite', 'En 2018, la empresa de Javi le puso delante un Renault Zoe para ir a una obra en Murcia. Ni cargador rápido, ni app de planificación, ni red densa de puntos. Solo ganas, lectura previa y una parada de hora y media en el Corte Inglés de Albacete.', '<p><em>Esta es la primera entrega de una sección que quiero hacer habitual en EVMinds: las primeras veces de la comunidad. <strong>El compañero Javi (XVI en el grupo Telegram)</strong> me escribió para compartir su debut al volante de un eléctrico, y me pareció tan buena historia que tenía que estar aquí. Le doy las gracias de corazón por el tiempo que ha dedicado a escribirla y por su generosidad al compartirla con todos nosotros.</em></p>
<p><em>Y ahora me dirijo al resto: si tú también tienes una primera vez, una anécdota, un viaje memorable o cualquier experiencia con coches eléctricos que creas que puede interesar a la comunidad, escríbeme. Da igual si fue hace ocho años o la semana pasada. Estas historias son el alma de EVMinds.</em></p>
<p><em>Sin más preámbulo, os dejo con Javi.</em></p>
<hr>
<h2 id="los-inicios-el-gusanillo-eléctrico">Los inicios: el gusanillo eléctrico</h2>
<p>Siempre he sido un gran aficionado a los coches. De hecho, según cuentan mis padres, mi primera palabra no fue “mamá” ni “papá”, sino “coche”. Parece coña, pero no lo es, es verídico.</p>
<p>De pequeño jugaba con coches, dibujaba coches, me gustaban los videojuegos de coches (los de la Atari, no teníamos el GTA ni el Mario Kart), me encantaba ir en coche…</p>
<p>Luego fui ampliando el abanico y los coches perdieron su lugar predominante en mis aficiones. Sin embargo, cuando los Tesla empezaron a pegar fuerte y, además, también estaban los Zoe y Leaf, supongo que hacia <strong>2016-2017</strong>, me entró otra vez el gusanillo por los coches, pero solamente los eléctricos. Sentía que aquello era el futuro, estaba convencido.</p>
<p>Gracias a que ahora teníamos internet, pude buscar información y, además de algunos foros, encontré <strong><a href="https://forococheselectricos.com/" rel="noopener noreferrer" target="_blank">forococheselectricos.com</a></strong>, que no era un foro propiamente dicho, sino una página de noticias donde se podía comentar.</p>
<p>Empecé a leer y aprendí bastante de los pioneros, los que ya habían probado o incluso comprado coches eléctricos y los disfrutaban (y a veces sufrían). Yo estaba deseando conducirlos, sentir esas sensaciones que leía y que no acababa de imaginar del todo.</p>
<h2 id="el-zoe-que-cayó-del-cielo">El Zoe que cayó del cielo</h2>
<p>Entonces, en <strong>2018</strong>, mi empresa se presentó a una obra en Murcia para una administración y, como requisito, estaba que el jefe de obra llevase un <strong>coche 0 emisiones</strong>. Por fortuna, ganamos la obra y la empresa me tuvo que buscar un coche eléctrico.</p>
<p>En aquella época, además, mi empresa andaba en un proceso de electrificación, cambiando coches térmicos por eléctricos, pero despacio, principalmente porque no había mucha disponibilidad y los tiempos de espera eran largos. Como la obra empezaba ya, me tuve que quedar el de una compañera de Madrid.</p>
<p>Así que cogí mi Clio y me fui para allá a cambiarlo por un <strong>Renault Zoe</strong>.</p>
<h2 id="la-travesía-de-la-poveda-a-murcia">La travesía: de La Poveda a Murcia</h2>
<p>Gracias a un compañero, no tuve que entrar en la zona urbana de Madrid, sino que lo recogí en <strong>La Poveda</strong>, que está ya transcurrido un tramo de la A3, más cerca de Murcia.</p>
<p>Cuando lo vi, fue un flechazo a primera vista. Ya había visto algún Zoe, pero ninguno de <strong>color azul intenso</strong>, o eléctrico, o como lo llamen. Me enamoré de él.</p>
<p><img src="/images/articulos/0005/zoe-1.webp" alt="Renault Zoe en color azul eléctrico intenso, vista exterior frontal"></p>
<p>Mi compañero me explicó por encima cómo funcionaba y emprendí la aventura. El coche estaba cargado al <strong>98%</strong>, y serían las 11:30-12:00 de la mañana.</p>
<h3 id="tramo-1-la-poveda--albacete">Tramo 1: La Poveda – Albacete</h3>
<p>Salí de La Poveda con cautela, a menor velocidad que lo habría hecho con un térmico, pero sin pisar huevos tampoco. Todo lo que había leído me ayudó a calcular la distancia y a estar pendiente del consumo, para saber cuándo podía apretar un poco y cuándo debía bajar la velocidad.</p>
<p>De todas formas, al poco me di cuenta de que, en las subidas, el consumo era más alto de lo que pensaba. Ya sabéis que Madrid está en hondo, y cuando sales hacia Levante hay un buen tramo con un importante desnivel ascendente, así que me tocó ir reduciendo en las cuestas, porque iba viendo que la autonomía restante se acercaba peligrosamente a la distancia que me restaba para llegar a <strong>Albacete</strong>.</p>
<p>En aquella época no había tantos puntos de carga como ahora, y creo recordar que, si quería parar antes de Albacete, tenía que desviarme bastante de la ruta.</p>
<p>El caso es que, reduciendo en las subidas a <strong>90 km/h</strong> y manteniendo unos <strong>110-120 km/h</strong> en bajadas y <strong>100 km/h</strong> en llano, conseguí llegar a Albacete con unos <strong>50 km restantes</strong>.</p>
<p><img src="/images/articulos/0005/ruta.webp" alt="Ruta de La Poveda a Murcia por la A-3 y A-31, con parada en Albacete"></p>
<h3 id="la-carga-en-albacete">La carga en Albacete</h3>
<p>Tenía pensado ir a <strong>El Corte Inglés</strong> y comer mientras se cargaba el coche. Los cargadores (Mennekes) eran gratuitos, no sé si seguirán siéndolo en la actualidad. Las veces que he vuelto a cargar en Albacete lo he hecho en los cargadores de la estación de tren, que hay de Acciona y de Iberdrola de <strong>22 kW</strong>.</p>
<p>El primer cargador en el que enchufé el coche me dio error, y ya me terminaron de entrar los sudores fríos. Me quedaban <strong>50 km</strong> y no abundaban los puntos de carga, ni siquiera en una capital como Albacete. Lo desconecté, lo volví a conectar y nada, igual. Por fortuna, lo conecté en el de al lado y empezó la carga sin problemas.</p>
<p>Lo malo es que el cargador era de <strong>7 kW</strong>, no de 22, como yo pensaba, así que me dio tiempo a comer con postre, café, copa, puro y siesta, además de una larga visita a todos los departamentos de la tienda, creo que hasta el de lencería…</p>
<p>Por fin, cuando consideré que me había aburrido bastante y que la carga era suficiente para llegar sin agobios, teniendo en cuenta que hacía bastante viento y eso eleva mucho el consumo, desconecté el coche y seguí la marcha. Creo que estaba sobre el <strong>70%</strong>, que serían unos <strong>210 km WLTP</strong>.</p>
<h3 id="tramo-2-albacete--murcia">Tramo 2: Albacete – Murcia</h3>
<p>Como desde Albacete hasta Murcia hay bastante desnivel descendente, esta vez pude llegar bien. Llegué con unos <strong>70-80 km restantes</strong>, aunque no reduje tanto en las subidas.</p>
<h2 id="el-día-a-día-con-el-zoe">El día a día con el Zoe</h2>
<p>Desde el principio quedé maravillado con el <strong>silencio del interior</strong>, sobre todo a velocidades bajas, y con la suavidad de su manejo. Eso de tener una respuesta lineal proporcional a la posición del acelerador, sin tirones, sin cambios de marcha, sin temor a que el coche se cale…</p>
<p><img src="/images/articulos/0005/zoe-2.webp" alt="Interior del Renault Zoe, salpicadero y pantalla central"></p>
<p>Y, a pesar de ser un coche pequeño y no pensado para autovía, su comportamiento fue muy bueno.</p>
<p>Luego, en el día a día, es una gozada. A pesar de su escasa potencia (según la ficha técnica, el motor tiene una descomunal potencia de <strong>43 kW</strong>), se defiende en autovía, y en las salidas le gana a casi cualquier térmico.</p>
<p><img src="/images/articulos/0005/zoe-3.webp" alt="Renault Zoe cargando en punto de recarga público"></p>
<p>Eso sí, los <strong>cargadores de a bordo de los Renault Zoe son bastante delicados</strong>, eso lo aprendí después, al ver que había cargadores, como los de El Corte Inglés de Murcia, donde dan error. Supongo que será por tema de puesta a tierra un poco precaria, o por existencia de armónicos, o vete tú a saber. El caso es que, aunque funciona en la inmensa mayoría de cargadores, nunca estás del todo libre de ese intríngulis de saber si el cargador en el que has previsto cargar va a funcionar o no.</p>
<p>Obviamente, el tener solamente la opción de cargar en CA a <strong>22 kW</strong> te limita un tanto los viajes, ya que tiene menos de <strong>300 km</strong> de autonomía y necesitas casi una hora para cargar el <strong>50%</strong> de la batería.</p>
<h2 id="lo-que-me-llevo">Lo que me llevo</h2>
<p>Cada vez estoy más convencido, si cabe, de que <strong>el presente y el futuro de la automoción son eléctricos</strong>, y, cuando casque mi actual coche particular de gasoil, sin duda, mi próximo coche será eléctrico.</p>
<p>De momento aguanto para ver cómo avanzan. Cuando lo necesite, elegiré el que más me convenza entre los que haya en el mercado.</p>', '/images/articulos/0005/hero-renault-zoe.webp', null, 'Experiencia', array['Renault','Zoe','Autonomía','Carga','Viajes','Infraestructura']::text[], 'Javi (XVI)', 'published', '2026-05-05T06:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;
