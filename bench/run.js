// Evaluación: escalabilidad (nodos e hilos), robustez (caída y reincorporación de un nodo) y optimización.
// Uso: node bench/run.js  → imprime tablas y escribe docs/resultados.json
import { writeFileSync } from 'node:fs';
import { startCluster, loadTest } from './harness.js';

const ITER = 150000;
const REPS = 3;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const fmt = (n, d = 1) => Number(n.toFixed(d));

async function measure(label, clusterOpts, loadOpts) {
  const runs = [];
  for (let i = 0; i < REPS; i++) {
    const cl = await startCluster(clusterOpts);
    await loadTest({ httpPort: cl.ports.httpPort, total: 40, concurrency: loadOpts.concurrency, iterations: ITER }); // calentamiento
    runs.push(await loadTest({ httpPort: cl.ports.httpPort, iterations: ITER, ...loadOpts }));
    await cl.stop();
  }
  const row = {
    configuracion: label,
    tareas: loadOpts.total,
    fallidas: Math.max(...runs.map((r) => r.failed)),
    throughput: fmt(median(runs.map((r) => r.throughput))),
    p50: fmt(median(runs.map((r) => r.p50))),
    p95: fmt(median(runs.map((r) => r.p95))),
    p99: fmt(median(runs.map((r) => r.p99))),
  };
  console.log(row);
  return row;
}

const results = { fecha: new Date().toISOString(), iteraciones: ITER, repeticiones: REPS, cpus: 10 };

console.log('\n== E1: escalabilidad horizontal (2 hilos por nodo) ==');
results.e1 = [];
for (const n of [1, 2, 3, 4]) results.e1.push({ nodos: n, hilos: 2, ...(await measure(`${n} nodo(s) × 2 hilos`, { nodes: n, threads: 2 }, { total: 600, concurrency: 64 })) });

console.log('\n== E2: escalabilidad por hilos (1 nodo) ==');
results.e2 = [];
for (const t of [1, 2, 4, 8]) results.e2.push({ nodos: 1, hilos: t, ...(await measure(`1 nodo × ${t} hilo(s)`, { nodes: 1, threads: t }, { total: 400, concurrency: 64 })) });

console.log('\n== E3: robustez — se mata un nodo con SIGKILL a mitad de la carga ==');
{
  const cl = await startCluster({ nodes: 3, threads: 2 });
  const events = [];
  cl.coordinator.bus.subscribe('*', (e) => { if (['node:lost', 'node:joined', 'job:retry'].includes(e.type)) events.push(e); });
  const total = 900;
  let killedAt = 0, revivedAt = 0, killEventAt = 0;
  const r = await loadTest({
    httpPort: cl.ports.httpPort, total, concurrency: 48, iterations: ITER,
    onProgress: (done) => {
      if (!killedAt && done >= total * 0.3) { killedAt = Date.now(); cl.kill('nodo-2'); }
      if (killedAt && !revivedAt && done >= total * 0.6) { revivedAt = Date.now(); cl.spawnNode('nodo-2'); }
    },
  });
  const lost = events.find((e) => e.type === 'node:lost');
  killEventAt = lost?.at ?? 0;
  const snap = cl.coordinator.snapshot();
  results.e3 = {
    tareas: total, completadas: r.ok, fallidas: r.failed, tareasReintentadas: r.retriedJobs,
    reintentosTotales: events.filter((e) => e.type === 'job:retry').length,
    huerfanasAlCaer: lost?.orphanJobs ?? 0,
    deteccionMs: killEventAt ? killEventAt - killedAt : null,
    nodoReincorporado: events.some((e) => e.type === 'node:joined' && e.at > killedAt),
    throughput: fmt(r.throughput), p50: fmt(r.p50), p95: fmt(r.p95), p99: fmt(r.p99),
    repartoFinal: snap.nodes.map((n) => ({ id: n.id, hechas: n.done })),
  };
  console.log(results.e3);
  await cl.stop();
}

console.log('\n== E4: optimización — línea base vs. ajustes sucesivos (3 nodos × 2 hilos, 128 clientes) ==');
results.e4 = [];
const load4 = { total: 900, concurrency: 128 };
const v = [
  ['V0 línea base: round-robin, sin límite, un hilo por tarea', { nodes: 3, threads: 2, strategy: 'roundRobin', slotsPerThread: Infinity, poolMode: 'perTask' }],
  ['V1 + pool de hilos reutilizables', { nodes: 3, threads: 2, strategy: 'roundRobin', slotsPerThread: Infinity, poolMode: 'pool' }],
  ['V2 + menor carga y contrapresión (2 tareas/hilo)', { nodes: 3, threads: 2, strategy: 'leastLoaded', slotsPerThread: 2, poolMode: 'pool' }],
];
for (const [label, opts] of v) results.e4.push(await measure(label, opts, load4));

writeFileSync(new URL('../docs/resultados.json', import.meta.url), JSON.stringify(results, null, 2));
console.log('\nResultados guardados en docs/resultados.json');
process.exit(0);
