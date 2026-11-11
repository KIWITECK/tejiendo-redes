// Demostración corta: 3 nodos × 2 hilos, 60 tareas, trazas de eventos (Observer) y reparto por nodo.
import { startCluster, loadTest } from './harness.js';

const cluster = await startCluster({ nodes: 3, threads: 2 });
cluster.coordinator.bus.subscribe('node:joined', (e) => console.log(`[evento] ${e.nodeId} se unió (${e.threads} hilos)`));
cluster.coordinator.bus.subscribe('node:lost', (e) => console.log(`[evento] ${e.nodeId} perdido: ${e.reason}`));
const r = await loadTest({ httpPort: cluster.ports.httpPort, total: 60, concurrency: 12 });
console.log(`Tareas OK: ${r.ok}/${r.total} · ${r.throughput.toFixed(1)} tareas/s · p50 ${r.p50.toFixed(0)} ms · p95 ${r.p95.toFixed(0)} ms`);
console.table(cluster.coordinator.snapshot().nodes);
await cluster.stop();
process.exit(0);
