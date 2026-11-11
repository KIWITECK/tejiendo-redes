// Utilidades compartidas: levantar clúster local (coordinador en proceso, nodos como procesos hijos) y generar carga.
import { fork } from 'node:child_process';
import http from 'node:http';
import { Coordinator } from '../src/coordinator.js';

const NODE_FILE = new URL('../src/node.js', import.meta.url).pathname;

export async function startCluster({ nodes, threads, strategy = 'leastLoaded', slotsPerThread = 2, poolMode = 'pool', heartbeatTimeoutMs = 2000 }) {
  const coordinator = new Coordinator({ strategy, slotsPerThread, heartbeatTimeoutMs });
  const ports = await coordinator.listen();
  const children = new Map();
  const spawnNode = (id) => {
    const child = fork(NODE_FILE, [], { env: { ...process.env, NODE_ID: id, COORD_PORT: String(ports.tcpPort), THREADS: String(threads), POOL_MODE: poolMode }, stdio: 'ignore' });
    children.set(id, child);
    return child;
  };
  for (let i = 1; i <= nodes; i++) spawnNode(`nodo-${i}`);
  while (coordinator.nodes.size < nodes) await new Promise((r) => setTimeout(r, 25));
  return {
    coordinator, ports, children, spawnNode,
    kill: (id) => children.get(id).kill('SIGKILL'),
    async stop() {
      for (const c of children.values()) c.kill('SIGKILL');
      await coordinator.close();
    },
  };
}

export const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

/** Carga cerrada: `concurrency` clientes HTTP envían `total` tareas contra la API del coordinador. */
export async function loadTest({ httpPort, total, concurrency, iterations = 50000, onProgress }) {
  const agent = new http.Agent({ keepAlive: true, maxSockets: concurrency });
  const latencies = [];
  let sent = 0, ok = 0, failed = 0, retriedJobs = 0;
  const t0 = performance.now();
  const post = (i) => new Promise((resolve) => {
    const body = JSON.stringify({ data: `tarea-${i}`, iterations });
    const req = http.request({ host: '127.0.0.1', port: httpPort, path: '/jobs', method: 'POST', agent,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, (res) => {
      let b = ''; res.on('data', (d) => (b += d));
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          if (res.statusCode === 200) { ok++; latencies.push(j.latencyMs); if (j.attempts > 1) retriedJobs++; } else failed++;
        } catch { failed++; }
        resolve();
      });
    });
    req.on('error', () => { failed++; resolve(); });
    req.end(body);
  });
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (sent < total) { const i = sent++; await post(i); onProgress?.(ok + failed); }
  }));
  const seconds = (performance.now() - t0) / 1000;
  latencies.sort((a, b) => a - b);
  agent.destroy();
  return {
    total, ok, failed, retriedJobs, seconds,
    throughput: ok / seconds,
    p50: percentile(latencies, 50), p95: percentile(latencies, 95), p99: percentile(latencies, 99),
    mean: latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1),
  };
}
