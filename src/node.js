// Nodo de trabajo: proceso independiente que se registra en el coordinador y ejecuta tareas en su pool de hilos.
import net from 'node:net';
import { send, readMessages } from './protocol.js';
import { ThreadPool } from './pool.js';

export function startNode({
  id = `nodo-${process.pid}`,
  host = '127.0.0.1',
  port,
  threads = 2,
  poolMode = 'pool',
  heartbeatMs = 500,
} = {}) {
  const pool = new ThreadPool({ size: threads, mode: poolMode });
  let socket = null;
  let inflight = 0;
  let stopped = false;
  let hbTimer = null;

  function connect() {
    if (stopped) return;
    socket = net.connect({ host, port });
    socket.setNoDelay(true);
    socket.on('connect', () => {
      send(socket, { t: 'register', id, threads });
      hbTimer = setInterval(() => send(socket, { t: 'hb', id, inflight }), heartbeatMs);
    });
    readMessages(socket, async (msg) => {
      if (msg.t !== 'run') return;
      inflight++;
      const t0 = performance.now();
      try {
        const value = await pool.run(msg.payload);
        send(socket, { t: 'result', jobId: msg.jobId, ok: true, value, ms: performance.now() - t0 });
      } catch (err) {
        send(socket, { t: 'result', jobId: msg.jobId, ok: false, error: String(err), ms: performance.now() - t0 });
      } finally { inflight--; }
    });
    socket.on('error', () => {});
    socket.on('close', () => {
      clearInterval(hbTimer);
      if (!stopped) setTimeout(connect, 300); // reconexión automática
    });
  }
  connect();

  return {
    id,
    async stop() { stopped = true; clearInterval(hbTimer); socket?.destroy(); await pool.close(); },
  };
}

// Ejecución como proceso: variables de entorno COORD_PORT, NODE_ID, THREADS, POOL_MODE
if (import.meta.url === `file://${process.argv[1]}`) {
  startNode({
    id: process.env.NODE_ID,
    port: Number(process.env.COORD_PORT ?? 7000),
    host: process.env.COORD_HOST ?? '127.0.0.1',
    threads: Number(process.env.THREADS ?? 2),
    poolMode: process.env.POOL_MODE ?? 'pool',
  });
}
