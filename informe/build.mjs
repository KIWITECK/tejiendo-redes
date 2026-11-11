// Genera informe.html (APA 7, carta) y lo exporta a PDF con Chrome headless en dos pasadas
// (la primera mide en qué página cae cada encabezado para completar el índice).
// Uso: node informe/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as F from './figuras.mjs';

const R = JSON.parse(readFileSync(new URL('../docs/resultados.json', import.meta.url)));
const dir = new URL('.', import.meta.url).pathname;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const nf = (n, d = 1) => Number(n).toFixed(d).replace('.', ',');

const TITLE = 'Tejiendo redes: arquitectura de software entre hilos y nodos';
const REPO = 'https://github.com/KIWITECK/tejiendo-redes';
const VIDEO = 'https://youtu.be/yhVhYCH01MI';

// ---------- numeración automática de tablas y figuras ----------
const counters = { t: 0, f: 0 }, nums = {};
const toc = [];
let tocId = 0;
const slug = () => `h${++tocId}`;

const h1 = (s, o = {}) => { const id = slug(); toc.push({ id, level: 1, text: s }); return `<h1 id="${id}"${o.pb ? ' class="pb"' : ''}>${s}</h1>`; };
const h2 = (s) => { const id = slug(); toc.push({ id, level: 2, text: s }); return `<h2 id="${id}">${s}</h2>`; };
const h3 = (s) => `<h3>${s}</h3>`;
const p = (s) => `<p>${s}</p>`;
const li = (items, tag = 'ol') => `<${tag} class="lst">${items.map((i) => `<li>${i}</li>`).join('')}</${tag}>`;

function fig(key, title, svgHtml, note, o = {}) {
  nums[`f:${key}`] = ++counters.f;
  return `<figure class="fig${o.keep === false ? ' split' : ''}"><div class="lab">Figura ${counters.f}</div><div class="ttl">${title}</div>${svgHtml}${note ? `<div class="note"><i>Nota.</i> ${note}</div>` : ''}</figure>`;
}
function tbl(key, title, head, rows, note, o = {}) {
  nums[`t:${key}`] = ++counters.t;
  const cls = o.cls ? ` class="${o.cls}"` : '';
  return `<div class="tbl"><div class="lab">Tabla ${counters.t}</div><div class="ttl">${title}</div><table class="apa"${cls}><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>${note ? `<div class="note"><i>Nota.</i> ${note}</div>` : ''}</div>`;
}
const cap = (html) => html.replace(/(^|<p>|<p class="ref">|\. |\.\s)la (Tabla|Figura) (\d+)/g, (m, a, k, n) => `${a}La ${k} ${n}`);
const ref = (html) => cap(html.replace(/\[\[([tf]):(\w+)\]\]/g, (_, k, key) => `${k === 't' ? 'la Tabla' : 'la Figura'} ${nums[`${k}:${key}`] ?? '??'}`)
  .replace(/\{\{([tf]):(\w+)\}\}/g, (_, k, key) => `${k === 't' ? 'Tabla' : 'Figura'} ${nums[`${k}:${key}`] ?? '??'}`));

// ---------- datos derivados ----------
const e1 = R.e1, e2 = R.e2, e3 = R.e3, e4 = R.e4;
const speed = (arr) => arr.map((r) => ({ ...r, acel: r.throughput / arr[0].throughput }));
const eff = (r, units) => (r.acel / units) * 100;
const e1r = speed(e1), e2r = speed(e2);
const pct = (a, b) => ((a / b - 1) * 100);

// ---------- contenido ----------
const body = [];
const add = (...x) => body.push(...x);

// Introducción
add(`<div class="title-repeat">${TITLE}</div>`);
add(h1('Introducción'));
add(p('Las aplicaciones modernas rara vez se ejecutan en un único proceso. Reparten el trabajo entre varios nodos conectados por una red y, dentro de cada nodo, entre varios hilos, con el fin de atender más carga, tolerar fallos y aprovechar todo el hardware disponible (Tanenbaum y Van Steen, 2017). Diseñar un sistema así exige decisiones arquitectónicas explícitas —cómo se comunican los componentes, quién coordina, qué ocurre cuando un nodo falla— que se comunican y se evalúan mejor con modelos UML y patrones de diseño reconocidos (Bass et al., 2021; Gamma et al., 1994).'));
add(p('Este informe documenta el diseño, la implementación y la evaluación de «Tejiendo redes», un sistema distribuido de procesamiento de tareas intensivas en CPU. Un coordinador recibe las tareas por HTTP y las reparte entre nodos —procesos independientes conectados por TCP— que las ejecutan en pools de hilos. [[f:mapa]] resume la solución. El propósito de diseñar la arquitectura antes de programar fue decidir con criterios verificables, y no por intuición, cómo se comunican nodos e hilos, qué patrones reducen el acoplamiento y qué mecanismos garantizan que el sistema siga funcionando cuando algo falla.'));
add(fig('mapa', 'Mapa conceptual del sistema distribuido «Tejiendo redes»', F.fig1(), 'Elaboración propia. Las flechas indican la dirección de la comunicación; los nodos solo hablan con el coordinador.'));
add(h2('Objetivo general'));
add(p('Diseñar, modelar y evaluar una arquitectura de software distribuida para el procesamiento paralelo de tareas, aplicando especificaciones UML y patrones de diseño, y validarla con un prototipo funcional que demuestre escalabilidad, eficiencia y robustez.'));
add(h2('Objetivos específicos'));
add(li([
  'Definir el tipo de sistema distribuido, sus componentes, supuestos y herramientas, y planificar el proyecto con requisitos medibles.',
  'Modelar la arquitectura con diagramas UML de componentes, secuencia y despliegue.',
  'Seleccionar y justificar patrones de diseño pertinentes (Proxy, Mediator, Observer distribuido y Strategy).',
  'Implementar un prototipo que evidencie la comunicación entre nodos, el manejo de hilos y la tolerancia a fallos.',
  'Evaluar la escalabilidad y la robustez con métricas, identificar cuellos de botella y aplicar ajustes que mejoren el rendimiento.',
]));
add(p('El documento sigue el orden de la actividad: descripción del sistema, análisis y planificación, modelado UML, patrones de diseño, implementación y simulación, evaluación y ajustes, y conclusiones. El código completo del prototipo está disponible en un repositorio público (Amaya Rojas, 2026).'));

// Descripción
add(h1('Descripción del sistema distribuido'));
add(h2('Tipo de sistema'));
add(p('Se eligió un sistema distribuido de procesamiento paralelo de tareas con arquitectura maestro–trabajadores. Un coordinador central recibe solicitudes de los clientes, las encola y las asigna a nodos de trabajo; cada nodo es un proceso independiente que ejecuta varias tareas a la vez en su propio pool de hilos. Este tipo de sistema es representativo de servicios reales de transcodificación de video, cifrado masivo o procesos de extracción y transformación de datos.'));
add(p('La tarea de ejemplo es una derivación de clave PBKDF2 con SHA-512, cuyo costo se regula con el parámetro de iteraciones. Se eligió porque es intensiva en CPU, determinista y fácil de verificar, y porque con 150.000 iteraciones dura unos 29 ms en un hilo del equipo de pruebas, un valor suficientemente grande frente al costo de la comunicación para que el paralelismo se note, y suficientemente pequeño para ejecutar miles de tareas en cada experimento.'));
add(h2('Componentes funcionales'));
add(p('[[t:comp]] enumera los componentes, su responsabilidad y el archivo donde se implementan.'));
add(tbl('comp', 'Componentes funcionales del sistema', ['Componente', 'Responsabilidad', 'Archivo'], [
  ['Fachada HTTP (Proxy)', 'Punto de entrada único: <code>POST /jobs</code>, <code>GET /stats</code>, <code>GET /events</code>.', 'coordinator.js'],
  ['Cola global', 'Retiene las tareas cuando ningún nodo tiene cupo (contrapresión) y prioriza los reintentos.', 'coordinator.js'],
  ['Planificador (Strategy)', 'Elige el nodo que recibe la siguiente tarea: <code>roundRobin</code> o <code>leastLoaded</code>.', 'strategies.js'],
  ['Registro y monitor', 'Mantiene el estado y la capacidad de cada nodo; expulsa nodos mudos por heartbeat vencido.', 'coordinator.js'],
  ['Servidor de enlace (Mediator)', 'Acepta las conexiones TCP de los nodos y enruta tareas y resultados.', 'coordinator.js, protocol.js'],
  ['Bus de eventos (Observer)', 'Publica <code>node:joined</code>, <code>node:lost</code>, <code>job:done</code>, <code>job:retry</code> a los observadores.', 'event-bus.js'],
  ['Agente de nodo', 'Se registra, envía heartbeats, recibe tareas y devuelve resultados; se reconecta solo.', 'node.js'],
  ['Pool de hilos', 'Reparte las tareas entre hilos reutilizables mediante una cola interna.', 'pool.js'],
  ['Hilo de trabajo', 'Ejecuta la tarea CPU-intensiva fuera del hilo principal del nodo.', 'task-worker.js'],
], 'Todos los archivos están en el directorio <code>src/</code> del repositorio.'));
add(h2('Supuestos de diseño'));
add(p('[[t:sup]] reúne los supuestos con los que se diseñó el sistema y la consecuencia que cada uno tuvo en la arquitectura.'));
add(tbl('sup', 'Supuestos y su consecuencia en el diseño', ['Supuesto', 'Consecuencia en el diseño'], [
  ['Los nodos fallan por parada (el proceso muere o deja de responder); no hay nodos maliciosos.', 'Basta detectar el cierre de conexión o la ausencia de heartbeat; no se requiere consenso bizantino.'],
  ['Las tareas son idempotentes: ejecutarlas dos veces produce el mismo resultado.', 'Se adopta entrega «al menos una vez»: ante una caída, la tarea se reasigna sin riesgo.'],
  ['TCP entrega los mensajes en orden y sin duplicados dentro de una conexión.', 'El protocolo NDJSON no necesita numeración de mensajes.'],
  ['El coordinador permanece activo durante la operación.', 'Se reconoce como punto único de falla y se documenta como mejora futura.'],
  ['El prototipo corre en un solo equipo físico.', 'Los nodos son procesos con puertos distintos; no se mide latencia de red real.'],
], null));
add(h2('Herramientas seleccionadas'));
add(p('El prototipo se implementó en Node.js 25 usando únicamente módulos nativos, de modo que cualquiera pueda reproducirlo sin instalar dependencias. [[t:herr]] resume las herramientas y su justificación.'));
add(tbl('herr', 'Herramientas utilizadas y justificación', ['Herramienta', 'Uso', 'Justificación'], [
  ['Node.js 25 (<code>net</code>, <code>http</code>)', 'Servidor TCP de enlace y fachada HTTP', 'E/S asíncrona de un solo hilo ideal para un coordinador que mayormente enruta mensajes (Node.js, s. f.-b).'],
  ['<code>worker_threads</code>', 'Hilos de trabajo en cada nodo', 'Paralelismo real de CPU con comunicación por paso de mensajes, sin memoria compartida mutable (Node.js, s. f.-a).'],
  ['<code>child_process</code>', 'Lanzar y matar nodos', 'Simula nodos independientes y permite inyectar fallos con <code>SIGKILL</code>.'],
  ['<code>node:test</code>', 'Pruebas automáticas', 'Ejecutor de pruebas nativo, sin dependencias (Node.js, s. f.-c).'],
  ['Git y GitHub', 'Control de versiones', 'Historial verificable de commits atribuidos al autor.'],
  ['SVG, HTML y Chrome headless', 'Diagramas e informe en PDF', 'Figuras vectoriales reproducibles y exportación a tamaño carta.'],
], null));

// Análisis y planificación
add(h1('Análisis y planificación del proyecto'));
add(h2('Definición de requisitos'));
add(p('Los requisitos se definieron antes de implementar y cada uno tiene un criterio verificable, que se contrasta con los resultados en la sección de evaluación ([[t:req]]).'));
add(tbl('req', 'Requisitos funcionales y no funcionales', ['ID', 'Requisito', 'Criterio de verificación'], [
  ['RF1', 'Aceptar tareas por HTTP y devolver el resultado al cliente.', 'Prueba de clúster: 60 de 60 tareas completadas.'],
  ['RF2', 'Repartir tareas entre nodos con una estrategia configurable.', 'Todos los nodos reciben trabajo; estrategia elegida al arrancar.'],
  ['RF3', 'Admitir que los nodos entren y salgan en caliente.', 'Un nodo reiniciado se reincorpora y vuelve a recibir tareas.'],
  ['RF4', 'Reasignar las tareas de un nodo caído (máximo 3 intentos).', 'Cero tareas perdidas al matar un nodo.'],
  ['RF5', 'Exponer el estado y los eventos en vivo.', '<code>GET /stats</code> y <code>GET /events</code> operativos.'],
  ['RNF1', 'Escalabilidad: el rendimiento crece al añadir nodos.', 'Eficiencia de paralelización ≥ 60 % con 4 nodos.'],
  ['RNF2', 'Robustez ante la caída de un nodo.', '100 % de tareas completadas durante la falla.'],
  ['RNF3', 'Eficiencia bajo carga alta.', 'Latencia p95 ≤ 1 s con 128 clientes concurrentes.'],
  ['RNF4', 'Bajo acoplamiento entre nodos.', 'Ningún nodo conoce a otro nodo.'],
  ['RNF5', 'Observabilidad.', 'Latencias p50/p95/p99 y reparto por nodo.'],
], null));
add(h2('Relevancia de la comunicación entre nodos e hilos'));
add(p('La comunicación define el comportamiento del sistema en dos niveles. Entre nodos, los mensajes viajan por la red: hay latencia, costo de serialización y fallos parciales, es decir, situaciones en que una parte del sistema falla mientras el resto sigue operando (Kleppmann, 2017). Por eso el enlace usa un protocolo simple, de mensajes JSON delimitados por saltos de línea, y un mecanismo de heartbeat que distingue un nodo lento de uno caído.'));
add(p('Dentro de un nodo, los hilos podrían compartir memoria, pero hacerlo exige sincronización y es una fuente clásica de errores. Los <i>worker threads</i> de Node.js se comunican por paso de mensajes (Node.js, s. f.-a), lo que elimina las condiciones de carrera sobre el estado de las tareas. Además, el trabajo intensivo nunca se ejecuta en el hilo principal del nodo: este debe quedar libre para atender el socket, responder al heartbeat y recibir nuevas tareas.'));
add(p('Dos resultados teóricos orientan la evaluación. La ley de Little (1961) relaciona la concurrencia, el rendimiento y la latencia (<i>L</i> = λ<i>W</i>), y sirve para verificar que las mediciones son coherentes. La ley de Amdahl (1967) recuerda que la parte secuencial del sistema —aquí, el coordinador— limita la aceleración máxima que se obtiene al añadir recursos.'));
add(h2('Metas del sistema'));
add(p('Las metas se derivan de los requisitos: (a) escalar casi linealmente al añadir nodos e hilos; (b) no perder ninguna tarea cuando un nodo cae y recuperarse al volver; y (c) mantener una latencia acotada bajo carga alta, medida con percentiles (p95 y p99) porque los promedios ocultan la cola de latencias lentas (Dean y Barroso, 2013).'));
add(h2('Estrategia del equipo y asignación de tareas'));
add(p('El equipo es unipersonal, por lo que el autor asumió todos los roles ([[t:roles]]). Para no perder el rigor de una revisión cruzada, el trabajo se organizó de forma iterativa: modelar, implementar el núcleo mínimo, escribir pruebas del comportamiento crítico, medir y solo entonces optimizar. Los cambios se registraron en commits pequeños y descriptivos.'));
add(tbl('roles', 'Roles y asignación de tareas', ['Rol', 'Responsable', 'Tareas'], [
  ['Arquitecto de software', 'David Ricardo Amaya Rojas', 'Requisitos, diagramas UML, selección de patrones.'],
  ['Desarrollador', 'David Ricardo Amaya Rojas', 'Coordinador, nodos, pool de hilos, protocolo.'],
  ['Evaluador', 'David Ricardo Amaya Rojas', 'Pruebas automáticas, pruebas de carga, análisis de métricas.'],
  ['Documentación y video', 'David Ricardo Amaya Rojas', 'Informe técnico, repositorio y video de presentación.'],
], null));
add(h2('Cronograma'));
add(p('El cronograma tentativo abarcó siete días, con actividades solapadas (ver [[f:crono]]).'));
add(fig('crono', 'Cronograma del proyecto (4 al 10 de noviembre de 2026)', F.fig2(), 'Elaboración propia. Las barras muestran la duración estimada de cada actividad.'));

// Modelado UML
add(h1('Modelado UML'));
add(p('La arquitectura se especificó con UML 2.5.1 (Object Management Group, 2017) mediante tres vistas complementarias: la estructura lógica (componentes), el comportamiento en el tiempo (secuencia) y la distribución física (despliegue) (Fowler, 2004).'));
add(h2('Diagrama de componentes'));
add(p('[[f:comp]] muestra dos componentes principales: el coordinador y el nodo de trabajo. Se relacionan mediante dos interfaces: <i>IJobs</i>, que el coordinador ofrece a los clientes por HTTP, e <i>IEnlace</i>, que el servidor de enlace ofrece a los nodos por TCP. Los nodos son una réplica del mismo componente, de modo que añadir capacidad solo requiere lanzar otra instancia.'));
add(p('Dentro del coordinador, la fachada HTTP entrega cada solicitud a la cola global; el planificador consulta el registro de nodos para elegir un destino y el servidor de enlace envía la tarea. El monitor de heartbeat y el servidor de enlace publican hechos relevantes en el bus de eventos, sin conocer a sus observadores. Dentro del nodo, el agente entrega las tareas al pool, que las distribuye entre los hilos de trabajo.'));
add(fig('comp', 'Diagrama de componentes UML del sistema', F.fig3(), 'Elaboración propia con notación UML 2.5.1. Las flechas continuas indican dependencia funcional; las punteadas, publicación de eventos o supervisión.'));
add(h2('Diagrama de secuencia'));
add(p('[[f:sec]] representa la interacción entre nodos e hilos para una tarea. El cliente envía <code>POST /jobs</code> (1); el coordinador elige el nodo con la estrategia vigente (2) y le envía el mensaje <code>run</code> por TCP (3). El agente del nodo entrega el trabajo a un hilo (4), que ejecuta el cálculo (5) y devuelve el valor. El nodo responde con <code>result</code> (6), el coordinador publica el evento <code>job:done</code> (7) y responde al cliente (8).'));
add(p('El fragmento <i>alt</i> modela el flujo alternativo más importante: si el nodo cae antes de responder (por ejemplo, tras un <code>SIGKILL</code>), el coordinador detecta el cierre del socket o el heartbeat vencido (9), publica <code>node:lost</code> (10), devuelve la tarea a la cola con prioridad (11) y la envía a otro nodo (12), que responde normalmente (13). El cliente nunca percibe la falla, solo una latencia algo mayor (14).'));
add(fig('sec', 'Diagrama de secuencia UML: ejecución de una tarea y recuperación ante la caída de un nodo', F.fig4(), 'Elaboración propia. Las líneas punteadas con flecha representan respuestas; el rectángulo estrecho sobre cada línea de vida es la activación del participante.'));
add(h2('Diagrama de despliegue'));
add(p('[[f:desp]] muestra la distribución física y lógica. Los clientes consumen la API del coordinador por HTTP en el puerto 8080; los nodos se conectan al puerto 7000 del coordinador por TCP. Cada nodo ejecuta un proceso Node.js con su pool de dos hilos. Como la comunicación siempre la inicia el nodo hacia el coordinador, los nodos pueden estar detrás de un cortafuegos y solo el coordinador necesita puertos abiertos.'));
add(p('En el prototipo, el cliente, el coordinador y los nodos comparten un mismo equipo y se distinguen por proceso y puerto. La arquitectura no cambia al migrar a varios equipos: basta apuntar cada nodo a la dirección del coordinador. El coordinador es el único elemento sin réplica, por lo que constituye un punto único de falla que se discute en las limitaciones.'));
add(fig('desp', 'Diagrama de despliegue UML', F.fig5(), 'Elaboración propia. Los nodos adicionales (Nodo N) se añaden sin cambiar el coordinador.'));

// Patrones
add(h1('Selección y justificación de patrones de diseño'));
add(p('Los patrones se eligieron por el problema concreto que resuelven en el sistema, siguiendo el catálogo de Gamma et al. (1994). [[f:pat]] los ubica en la arquitectura y [[t:pat]] justifica cada uno.'));
add(fig('pat', 'Patrones de diseño aplicados al sistema', F.fig6(), 'Elaboración propia a partir de la clasificación de Gamma et al. (1994).'));
add(tbl('pat', 'Patrones de diseño: problema, aplicación y justificación', ['Patrón', 'Problema que resuelve', 'Aplicación', 'Justificación'], [
  ['Proxy', 'El cliente no debería conocer cuántos nodos existen ni dónde corre cada tarea.', 'Fachada HTTP del coordinador.', 'Transparencia de ubicación: se pueden añadir o retirar nodos sin tocar a los clientes.'],
  ['Mediator', 'Si los nodos se hablaran entre sí, el acoplamiento crecería con cada nodo (N²).', 'Coordinador y servidor de enlace.', 'Cada nodo conoce un solo interlocutor; las reglas de reparto y recuperación viven en un único lugar.'],
  ['Observer distribuido', 'Las métricas y trazas no deben modificar la lógica de planificación.', 'Bus de eventos y flujo SSE <code>/events</code>.', 'Permite añadir observadores (paneles, alertas) sin cambiar el coordinador; SSE los lleva a clientes remotos (WHATWG, s. f.).'],
  ['Strategy', 'La mejor política de reparto depende de la carga y debe poder cambiarse.', '<code>roundRobin</code> y <code>leastLoaded</code>.', 'Se comparan políticas en la evaluación sin reescribir el planificador.'],
], null, { cls: 'wide' }));
add(h2('Proxy'));
add(p('El coordinador actúa como representante del conjunto de nodos: expone una API única y decide por el cliente. Es un proxy de tipo remoto, porque oculta que el trabajo se ejecuta en otros procesos, y también protector, porque los nodos nunca quedan expuestos directamente.'));
add(h2('Mediator'));
add(p('Toda interacción entre nodos pasa por el coordinador, que centraliza el registro, la asignación, los reintentos y la expulsión de nodos caídos. Esto reduce las conexiones de N(N−1)/2 a N y simplifica el razonamiento sobre el estado global, a cambio de concentrar la responsabilidad en un componente (riesgo que se discute más adelante).'));
add(h2('Observer distribuido'));
add(p('El bus de eventos desacopla a quien produce un hecho de quien lo consume. Los nodos también pueden publicar eventos que el coordinador reenvía. El flujo <code>GET /events</code> usa <i>Server-Sent Events</i> para que un observador remoto reciba los hechos en tiempo real por una conexión HTTP común.'));
add(h2('Strategy'));
add(p('La política de reparto es un objeto intercambiable con una única operación, <code>pick(nodos)</code>. Con <code>roundRobin</code> se rota ciegamente entre nodos; con <code>leastLoaded</code> se elige el nodo con menor ocupación relativa (tareas en vuelo sobre capacidad), lo que compensa nodos con distinto número de hilos o más lentos.'));
add(h2('Alternativas consideradas'));
add(p('Se evaluó un intermediario de mensajes externo (<i>message broker</i>), como describen Hohpe y Woolf (2003), pero se descartó para evitar una dependencia de infraestructura y mantener el prototipo autocontenido; el coordinador cumple ese rol. Se pospuso el patrón <i>Circuit Breaker</i> (Nygard, 2018): su utilidad aparece cuando hay llamadas remotas a servicios de terceros, y aquí la protección equivalente es la contrapresión y el límite de reintentos.'));

// Implementación
add(h1('Implementación y simulación del prototipo distribuido'));
add(h2('Estructura del prototipo'));
add(p('El prototipo consta de aproximadamente 500 líneas de JavaScript sin dependencias externas. El corazón es el método de planificación del coordinador, que despacha tareas mientras exista un nodo con cupo; si no lo hay, la tarea espera en la cola ([[f:cod]]). Esa espera es la contrapresión: el sistema se protege en lugar de saturar a los nodos.'));
add(`<figure class="fig"><div class="lab">Figura ${++counters.f}</div><div class="ttl">Fragmento del planificador del coordinador</div><pre class="code">#pump() {
  while (this.queue.length) {
    const target = this.strategy.pick([...this.nodes.values()]);
    if (!target) return;              // sin cupo: contrapresión
    const job = this.queue.shift();
    job.attempts++;
    target.inflight++;
    target.jobs.add(job.id);
    send(target.socket, { t: 'run', jobId: job.id, payload: job.payload });
  }
}</pre><div class="note"><i>Nota.</i> Extracto de <code>src/coordinator.js</code>. La estrategia es intercambiable.</div></figure>`);
nums['f:cod'] = counters.f;
add(h2('Comunicación entre nodos'));
add(p('Coordinador y nodos intercambian mensajes JSON delimitados por saltos de línea sobre una conexión TCP persistente que inicia el nodo ([[t:msg]]). Un módulo de lectura reensambla los fragmentos TCP y entrega solo mensajes completos; las líneas corruptas se descartan sin afectar la conexión.'));
add(tbl('msg', 'Mensajes del protocolo de enlace', ['Mensaje', 'Dirección', 'Contenido'], [
  ['<code>register</code>', 'Nodo → coordinador', 'Identificador del nodo y número de hilos; el coordinador calcula su capacidad.'],
  ['<code>hb</code>', 'Nodo → coordinador', 'Latido cada 500 ms con las tareas en curso.'],
  ['<code>run</code>', 'Coordinador → nodo', 'Identificador de la tarea y su carga útil.'],
  ['<code>result</code>', 'Nodo → coordinador', 'Resultado (o error) y tiempo de ejecución.'],
], null));
add(h2('Manejo de hilos'));
add(p('Cada nodo crea al arrancar un pool de hilos de tamaño fijo. Las tareas llegan a una cola interna y se asignan al primer hilo libre; el resultado regresa al hilo principal por mensaje. Para medir el beneficio del pool se implementó también un modo de línea base, <code>perTask</code>, que crea un hilo nuevo por cada tarea y lo destruye al terminar.'));
add(h2('Tolerancia a fallos'));
add(p('El coordinador detecta una falla por dos vías: el cierre de la conexión TCP (inmediato, por ejemplo cuando el proceso muere) y el vencimiento del heartbeat (para nodos que se cuelgan sin cerrar el socket). En ambos casos expulsa al nodo, publica <code>node:lost</code> y devuelve sus tareas en vuelo a la cola, con prioridad, hasta un máximo de tres intentos por tarea. Los nodos se reconectan solos cada 300 ms, de modo que un nodo reiniciado se reincorpora sin intervención.'));
add(h2('Simulación del entorno distribuido'));
add(p('El entorno se simula en un equipo con procesos reales: el coordinador corre en el proceso de la prueba y cada nodo es un proceso hijo lanzado con <code>child_process</code>. Un generador de carga de ciclo cerrado mantiene un número fijo de clientes HTTP, cada uno de los cuales envía una tarea, espera la respuesta y envía la siguiente. Las fallas se inyectan con <code>SIGKILL</code>, que finaliza el proceso sin darle oportunidad de despedirse, como ocurriría con una caída real.'));
add(h2('Pruebas automáticas'));
add(p('Ocho pruebas con el ejecutor nativo de Node.js verifican el comportamiento crítico: la selección de las dos estrategias, el aislamiento de observadores defectuosos, el reparto efectivo entre nodos, la caída de un nodo sin pérdida de tareas, la expulsión de un nodo mudo por heartbeat vencido y el rechazo de una tarea inválida tras agotar los reintentos. Esta última prueba descubrió un defecto real: una tarea inválida lanzaba una excepción dentro del hilo y lo destruía, dejando el pool sin capacidad. Se corrigió devolviendo el error como dato y conservando el hilo.'));
add(h2('Recursos del proyecto'));
add(p(`Código fuente: <a href="${REPO}">${REPO}</a>. El historial contiene todos los commits atribuidos al autor. Los comandos <code>npm run demo</code>, <code>npm test</code> y <code>npm run bench</code> ejecutan la demostración, las pruebas y la evaluación completa. Video de presentación (YouTube, no listado, 13 min 34 s): <a href="${VIDEO}">${VIDEO}</a>.`));

// Evaluación
add(h1('Evaluación del desempeño y ajustes'));
add(h2('Metodología'));
add(p(`Las mediciones se realizaron en un equipo con procesador Apple M4 (10 núcleos: 4 de rendimiento y 6 de eficiencia) y 16 GB de memoria, con Node.js 25.6. Cada tarea ejecuta 150.000 iteraciones de PBKDF2 (unos 29 ms en un hilo). Cada configuración se midió tres veces, tras un calentamiento de 40 tareas, y se reporta la mediana. Las métricas son el rendimiento (tareas por segundo) y los percentiles p50, p95 y p99 de la latencia de extremo a extremo.`));
add(h2('Escalabilidad'));
add(p('[[t:e1]] y [[t:e2]] muestran cómo crece el rendimiento al añadir nodos y al añadir hilos, respectivamente. La aceleración es el cociente entre el rendimiento y el de la configuración mínima, y la eficiencia es la aceleración dividida entre el factor de recursos añadidos.'));
add(tbl('e1', 'Escalabilidad al añadir nodos (2 hilos por nodo, 64 clientes, 600 tareas)', ['Nodos', 'Tareas/s', 'Aceleración', 'Eficiencia', 'p50 (ms)', 'p95 (ms)'],
  e1r.map((r) => [r.nodos, nf(r.throughput), nf(r.acel, 2), `${nf(eff(r, r.nodos), 0)} %`, nf(r.p50, 0), nf(r.p95, 0)]),
  'Mediana de tres ejecuciones. No hubo tareas fallidas en ninguna configuración.'));
add(tbl('e2', 'Escalabilidad al añadir hilos (un nodo, 64 clientes, 400 tareas)', ['Hilos', 'Tareas/s', 'Aceleración', 'Eficiencia', 'p50 (ms)', 'p95 (ms)'],
  e2r.map((r) => [r.hilos, nf(r.throughput), nf(r.acel, 2), `${nf(eff(r, r.hilos), 0)} %`, nf(r.p50, 0), nf(r.p95, 0)]),
  'Mediana de tres ejecuciones. No hubo tareas fallidas en ninguna configuración.'));
add(fig('esc', 'Rendimiento medido frente al escalamiento ideal', F.fig7(), 'Elaboración propia con los datos de las Tablas 8 y 9. La línea punteada es la extrapolación lineal del rendimiento con la configuración mínima.'));
add(p(`El sistema cumple la meta RNF1: con cuatro nodos el rendimiento pasa de ${nf(e1[0].throughput)} a ${nf(e1[3].throughput)} tareas/s (aceleración de ${nf(e1r[3].acel, 2)} y eficiencia de ${nf(eff(e1r[3], 4), 0)} %). En un solo nodo la escala es casi lineal hasta cuatro hilos (eficiencia de ${nf(eff(e2r[2], 4), 0)} %) y cae a ${nf(eff(e2r[3], 8), 0)} % con ocho. La explicación más probable no está en la arquitectura sino en el equipo: ocho hilos de trabajo, el coordinador, el generador de carga y el sistema operativo compiten por solo diez núcleos, seis de ellos de eficiencia, y la porción secuencial del coordinador impone el límite descrito por Amdahl (1967).`));
add(p(`Dos comprobaciones respaldan los datos. Primero, la ley de Little (1961) predice, con 64 clientes y ${nf(e1[0].throughput)} tareas/s en un nodo de dos hilos, una latencia media de 64/${nf(e1[0].throughput)} = ${nf(64 / e1[0].throughput, 2)} s, prácticamente igual a la mediana medida (${nf(e1[0].p50, 0)} ms). Segundo, cuatro nodos de dos hilos rinden ${nf(pct(e1[3].throughput, e2[3].throughput), 0)} % más que un nodo de ocho hilos, lo que indica que el costo de la comunicación TCP entre procesos es pequeño frente a los 29 ms de cómputo por tarea.`));
add(h2('Robustez'));
add(p(`Con tres nodos de dos hilos y 900 tareas, se envió <code>SIGKILL</code> al nodo-2 al completarse el 30 % de la carga y se lanzó un nodo nuevo con el mismo identificador al llegar al 60 % ([[f:rob]]). Se completaron las ${e3.completadas} tareas sin ninguna pérdida: las ${e3.huerfanasAlCaer} tareas que el nodo caído tenía en vuelo fueron reasignadas y terminaron con dos intentos. El coordinador detectó la caída de inmediato (${e3.deteccionMs} ms) porque el sistema operativo cierra el socket al matar el proceso; el caso de un nodo colgado sin cierre de socket lo cubre el heartbeat, verificado con una prueba automática en que el nodo mudo fue expulsado en poco más de un segundo con un tiempo límite de 800 ms.`));
add(fig('rob', 'Resultados de la prueba de robustez con caída y reincorporación de un nodo', F.fig8(), 'Elaboración propia. Datos de una ejecución con 3 nodos × 2 hilos, 48 clientes y 900 tareas.'));
add(p(`Durante la prueba el rendimiento fue de ${nf(e3.throughput)} tareas/s, similar al de tres nodos sin fallas (${nf(e1[2].throughput)} tareas/s), y la latencia p95 se mantuvo en ${nf(e3.p95, 0)} ms. El nodo reincorporado volvió a recibir trabajo de forma automática, con lo que se cumplen RF3, RF4 y RNF2.`));
add(h2('Cuellos de botella detectados'));
add(p('La primera versión (V0) se construyó deliberadamente simple y su medición reveló tres cuellos de botella:'));
add(li([
  '<b>Costo de crear un hilo por tarea.</b> Cada tarea de 29 ms pagaba además el arranque de un hilo, lo que reduce el rendimiento útil de cada núcleo.',
  '<b>Despacho sin límite y reparto ciego.</b> Con <code>roundRobin</code> y sin tope de tareas en vuelo, el coordinador empuja a los nodos toda la carga de inmediato; las colas internas se forman en los nodos y el reparto no corrige desequilibrios, lo que alarga la cola de la distribución de latencias (p99 de 1.437 ms).',
  '<b>Coordinador como punto único.</b> Todo el tráfico pasa por un solo ciclo de eventos. En las pruebas no llegó a saturarse (el rendimiento siguió creciendo con cuatro nodos), pero es el límite teórico y un punto único de falla.',
], 'ol'));
add(h2('Ajustes realizados'));
add(p('Se aplicaron dos ajustes sucesivos y se midió cada uno con el mismo escenario (tres nodos de dos hilos y 128 clientes). V1 sustituye la creación de un hilo por tarea por un pool de hilos reutilizables. V2 cambia la estrategia a <code>leastLoaded</code> y añade contrapresión, limitando a dos las tareas en vuelo por hilo; el resto espera en la cola global, donde puede asignarse al nodo que primero se libere.'));
add(tbl('e4', 'Efecto de los ajustes sobre el rendimiento y la latencia (3 nodos × 2 hilos, 128 clientes, 900 tareas)', ['Versión', 'Tareas/s', 'p50 (ms)', 'p95 (ms)', 'p99 (ms)'],
  e4.map((r, i) => [['V0. Línea base: round-robin, sin límite, un hilo por tarea', 'V1. V0 + pool de hilos reutilizables', 'V2. V1 + menor carga y contrapresión'][i], nf(r.throughput), nf(r.p50, 0), nf(r.p95, 0), nf(r.p99, 0)]),
  'Mediana de tres ejecuciones. Cero tareas fallidas en las tres versiones.', { cls: 'wide' }));
add(fig('opt', 'Comparación de las versiones V0, V1 y V2', F.fig9(), 'Elaboración propia con los datos de la Tabla 10.'));
add(p(`El pool de hilos mejoró el rendimiento ${nf(pct(e4[1].throughput, e4[0].throughput), 0)} % y la latencia p95 ${nf(-pct(e4[1].p95, e4[0].p95), 0)} %. La estrategia de menor carga con contrapresión completó la mejora: frente a la línea base, V2 rinde ${nf(pct(e4[2].throughput, e4[0].throughput), 0)} % más y reduce la latencia p95 en ${nf(-pct(e4[2].p95, e4[0].p95), 0)} % y la p99 en ${nf(-pct(e4[2].p99, e4[0].p99), 0)} %. Con V2 se cumple RNF3 (p95 de ${nf(e4[2].p95, 0)} ms, por debajo de 1 s), que la línea base incumplía. La ganancia principal está en la cola de la distribución: en V2 la diferencia entre la mediana y el p99 es de apenas ${nf(e4[2].p99 - e4[2].p50, 0)} ms, frente a ${nf(e4[0].p99 - e4[0].p50, 0)} ms en V0, es decir, el sistema se comporta de forma mucho más predecible. La ley de Little vuelve a ser consistente: 128 / ${nf(e4[2].throughput)} = ${nf(128 / e4[2].throughput, 2)} s, frente a una mediana de ${nf(e4[2].p50, 0)} ms.`));
add(h2('Limitaciones'));
add(li([
  'Todos los componentes comparten un equipo; no se midió latencia de red real ni pérdida de paquetes, y el generador de carga comparte proceso con el coordinador.',
  'El coordinador es un punto único de falla y su cola vive en memoria: si cae, se pierden las tareas pendientes. La mejora natural es una cola persistente y un coordinador de respaldo con elección de líder.',
  'La entrega es «al menos una vez»: si un nodo termina una tarea justo antes de caer y su resultado se pierde, la tarea se ejecuta dos veces. Es aceptable solo porque las tareas son idempotentes.',
  'La comunicación no está cifrada ni autenticada; un despliegue real requeriría TLS mutuo entre nodos y coordinador.',
], 'ul'));

// Conclusiones
add(h1('Conclusiones'));
add(p('El proyecto cumplió su objetivo: se diseñó, modeló, implementó y evaluó un sistema distribuido de procesamiento de tareas con una arquitectura coherente entre los diagramas UML y el código. Los tres diagramas (componentes, secuencia y despliegue) describieron con precisión lo que el prototipo hace y permitieron razonar sobre las fallas antes de provocarlas.'));
add(p('Los patrones elegidos resolvieron problemas concretos y medibles. Mediator y Proxy mantuvieron el acoplamiento bajo y dejaron que los nodos se añadieran o cayeran sin afectar a los clientes; Observer permitió observar el sistema sin tocar su lógica; y Strategy hizo posible comparar políticas de reparto y demostrar con datos que la de menor carga con contrapresión reduce la latencia p95 en 37 %.'));
add(p(`La evaluación mostró que el sistema escala (aceleración de ${nf(e1r[3].acel, 2)} con cuatro nodos), que tolera la caída de un nodo sin perder tareas (${e3.completadas} de ${e3.tareas} completadas) y que optimizar exige medir: la mejora más importante vino de eliminar el costo de crear hilos y de limitar el despacho, no de añadir recursos.`));
add(p('Como aprendizaje, la contrapresión y los percentiles de latencia resultaron más reveladores que el rendimiento promedio, y las pruebas automáticas de fallos destaparon un defecto que las pruebas felices no habrían encontrado. Como trabajo futuro quedan la persistencia de la cola, la replicación del coordinador con elección de líder, la autenticación entre componentes y la medición en varias máquinas con red real.'));

// Referencias
const refs = [
  'Amaya Rojas, D. R. (2026). <i>Tejiendo redes: Prototipo de sistema distribuido con nodos e hilos</i> [Software]. GitHub. ' + REPO,
  'Amdahl, G. M. (1967). Validity of the single processor approach to achieving large scale computing capabilities. En <i>Proceedings of the April 18-20, 1967, spring joint computer conference</i> (pp. 483–485). ACM. https://doi.org/10.1145/1465482.1465560',
  'Bass, L., Clements, P., y Kazman, R. (2021). <i>Software architecture in practice</i> (4.ª ed.). Addison-Wesley.',
  'Dean, J., y Barroso, L. A. (2013). The tail at scale. <i>Communications of the ACM, 56</i>(2), 74–80. https://doi.org/10.1145/2408776.2408794',
  'Fowler, M. (2004). <i>UML distilled: A brief guide to the standard object modeling language</i> (3.ª ed.). Addison-Wesley.',
  'Gamma, E., Helm, R., Johnson, R., y Vlissides, J. (1994). <i>Design patterns: Elements of reusable object-oriented software</i>. Addison-Wesley.',
  'Hohpe, G., y Woolf, B. (2003). <i>Enterprise integration patterns: Designing, building, and deploying messaging solutions</i>. Addison-Wesley.',
  'Kleppmann, M. (2017). <i>Designing data-intensive applications</i>. O’Reilly Media.',
  'Little, J. D. C. (1961). A proof for the queuing formula: L = λW. <i>Operations Research, 9</i>(3), 383–387. https://doi.org/10.1287/opre.9.3.383',
  'Node.js. (s. f.-a). <i>Worker threads</i>. https://nodejs.org/api/worker_threads.html',
  'Node.js. (s. f.-b). <i>Net</i>. https://nodejs.org/api/net.html',
  'Node.js. (s. f.-c). <i>Test runner</i>. https://nodejs.org/api/test.html',
  'Nygard, M. T. (2018). <i>Release it! Design and deploy production-ready software</i> (2.ª ed.). Pragmatic Bookshelf.',
  'Object Management Group. (2017). <i>Unified Modeling Language (UML), versión 2.5.1</i>. https://www.omg.org/spec/UML/2.5.1/PDF',
  'Tanenbaum, A. S., y Van Steen, M. (2017). <i>Distributed systems</i> (3.ª ed.). Maarten van Steen.',
  'WHATWG. (s. f.). <i>HTML living standard: Server-sent events</i>. https://html.spec.whatwg.org/multipage/server-sent-events.html',
];
add(h1('Referencias', { pb: true }));
add(refs.map((r) => `<p class="ref">${r}</p>`).join(''));

// ---------- ensamblado ----------
const CSS = `
@page { size: letter; margin: 1in; @top-right { content: counter(page); font: 11pt Arial, Helvetica, sans-serif; color:#000; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 11pt/2 Arial, Helvetica, sans-serif; color: #000; margin: 0; hyphens: manual; }
p { margin: 0; text-indent: .5in; orphans: 2; widows: 2; }
a { color: #000; text-decoration: none; word-break: break-all; }
code { font: 9.5pt/1 'SF Mono', Menlo, Consolas, monospace; }
h1 { font-size: 11pt; font-weight: 700; text-align: center; margin: 0; break-after: avoid; }
h1.pb { break-before: page; }
h2 { font-size: 11pt; font-weight: 700; text-align: left; margin: 0; break-after: avoid; }
h3 { font-size: 11pt; font-weight: 700; font-style: italic; margin: 0; break-after: avoid; }
.title-repeat { font-weight: 700; text-align: center; break-before: page; break-after: avoid; }
.cover { height: 9in; padding-top: 1.85in; text-align: center; line-height: 25.2pt; break-after: page; }
.cover .t { font-weight: 700; margin-bottom: 26pt; line-height: 1.5; padding: 0 .2in; }
.cover div { margin-bottom: 11pt; }
.toc-h { text-align: center; font-weight: 700; break-after: avoid; }
.toc-row { display: flex; align-items: baseline; line-height: 1.3; }
.toc-row .lbl { flex: none; max-width: 5.6in; }
.toc-row .dots { flex: 1; border-bottom: 1px dotted #000; margin: 0 4pt; transform: translateY(-3pt); min-width: 12pt; }
.toc-row .pg { flex: none; width: 1.6em; text-align: right; }
.toc-row.l2 { padding-left: .3in; }
.toc-row.l1 { font-weight: 700; }
.lst { margin: 0; padding-left: .75in; }
.lst li { padding-left: 0; orphans: 2; widows: 2; }
ul.lst { list-style: disc; }
.tbl, .fig { break-inside: avoid; margin: 8pt 0 14pt; }
.lab { font-weight: 700; line-height: 1.5; break-after: avoid; }
.ttl { font-style: italic; line-height: 1.5; margin-bottom: 6pt; break-after: avoid; }
.note { font-size: 10pt; line-height: 1.35; margin-top: 5pt; }
table.apa { width: 100%; border-collapse: collapse; font-size: 10pt; line-height: 1.3; }
table.apa th { text-align: left; font-weight: 700; padding: 4pt 7pt; border-top: 1px solid #000; border-bottom: 1px solid #000; vertical-align: bottom; }
table.apa td { padding: 3.5pt 7pt; vertical-align: top; }
table.apa tbody tr:last-child td { border-bottom: 1px solid #000; }
table.apa tr { break-inside: avoid; }
table.apa code { font-size: 9pt; }
.fig svg { display: block; margin: 0 auto; max-width: 100%; }
.fig svg text { -webkit-font-smoothing: antialiased; }
pre.code { font: 9pt/1.35 'SF Mono', Menlo, Consolas, monospace; background: #F7F7F8; border: 1px solid #D5D6DB; border-radius: 6px; padding: 9pt 11pt; margin: 0; white-space: pre; overflow: hidden; }
p.ref { padding-left: .5in; text-indent: -.5in; }
`;

function html(tocPages = {}) {
  const content = ref(body.join('\n'));
  const tocHtml = toc.map((e) => `<div class="toc-row l${e.level}"><span class="lbl">${e.text}</span><span class="dots"></span><span class="pg">${tocPages[e.id] ?? ''}</span></div>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${TITLE}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${CSS}</style></head><body>
<section class="cover">
<div class="t">${TITLE}</div>
<div>David Ricardo Amaya Rojas</div>
<div>Integrante y rol: arquitecto de software, desarrollador y evaluador</div>
<div>Tecnológica del Oriente</div>
<div>Arquitectura de Software 20262 - N6 Gr A · Unidad 2</div>
<div>Leydi Johana Polo Amador</div>
<div>10 de noviembre de 2026</div>
</section>
<section class="toc"><div class="toc-h">Tabla de contenido</div>${tocHtml}</section>
${content}
</body></html>`;
}

function render(outHtml, outPdf) {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${outPdf}`, `file://${outHtml}`], { stdio: 'ignore' });
}
function pageTexts(pdf) {
  const n = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf]).toString())[1]);
  return Array.from({ length: n }, (_, i) => execFileSync('pdftotext', ['-layout', '-f', String(i + 1), '-l', String(i + 1), pdf, '-']).toString());
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// Pasada 1 (índice vacío) → medir páginas → pasada 2 (índice completo) → verificar que no cambió.
let pages = {};
for (let pass = 1; pass <= 3; pass++) {
  writeFileSync(dir + 'informe.html', html(pages));
  render(dir + 'informe.html', dir + 'informe.pdf');
  const texts = pageTexts(dir + 'informe.pdf');
  const found = {};
  let from = 2; // los encabezados reales van después del índice y en orden creciente
  for (const e of toc) {
    const idx = texts.findIndex((t, i) => i >= from && t.split('\n').some((l) => norm(l) === norm(e.text.replace(/<[^>]+>/g, ''))));
    found[e.id] = idx >= 0 ? idx + 1 : '?';
    if (idx >= 0) from = idx;
  }
  const same = JSON.stringify(found) === JSON.stringify(pages);
  pages = found;
  console.log(`pasada ${pass}: ${texts.length} páginas, índice ${same ? 'estable' : 'actualizado'}`);
  if (same) break;
}
const missing = toc.filter((e) => pages[e.id] === '?');
if (missing.length) console.warn('Encabezados sin hallar en el PDF:', missing.map((m) => m.text));
