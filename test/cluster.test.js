import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { startCluster, loadTest } from '../bench/harness.js';
import { send } from '../src/protocol.js';

test('el clúster completa todas las tareas y reparte entre nodos', async () => {
  const cl = await startCluster({ nodes: 3, threads: 2 });
  try {
    const r = await loadTest({ httpPort: cl.ports.httpPort, total: 60, concurrency: 12, iterations: 20000 });
    assert.equal(r.ok, 60);
    assert.equal(r.failed, 0);
    const done = cl.coordinator.snapshot().nodes.map((n) => n.done);
    assert.ok(done.every((d) => d > 0), `todos los nodos trabajan: ${done}`);
  } finally { await cl.stop(); }
});

test('la caída de un nodo no pierde tareas (reasignación)', async () => {
  const cl = await startCluster({ nodes: 3, threads: 2 });
  try {
    let killed = false;
    const r = await loadTest({
      httpPort: cl.ports.httpPort, total: 120, concurrency: 24, iterations: 60000,
      onProgress: (d) => { if (!killed && d >= 30) { killed = true; cl.kill('nodo-1'); } },
    });
    assert.equal(r.ok, 120);
    assert.equal(r.failed, 0);
    assert.equal(cl.coordinator.stats.nodesLost, 1);
  } finally { await cl.stop(); }
});

test('un nodo mudo es expulsado por heartbeat vencido y su tarea se reasigna', async () => {
  const cl = await startCluster({ nodes: 1, threads: 1, heartbeatTimeoutMs: 800 });
  try {
    // Nodo falso: se registra, recibe una tarea y nunca responde ni envía heartbeat.
    const ghost = net.connect(cl.ports.tcpPort);
    await new Promise((r) => ghost.on('connect', r));
    send(ghost, { t: 'register', id: 'fantasma', threads: 8 });
    await new Promise((r) => setTimeout(r, 100));
    const lost = new Promise((r) => cl.coordinator.bus.subscribe('node:lost', (e) => e.nodeId === 'fantasma' && r(e)));
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => cl.coordinator.submit({ data: `t${i}`, iterations: 5000 })));
    const e = await lost;
    assert.equal(e.reason, 'heartbeat vencido');
    assert.equal(results.length, 6);
    assert.ok(results.every((x) => x.nodeId === 'nodo-1'));
    ghost.destroy();
  } finally { await cl.stop(); }
});

test('una tarea inválida falla tras agotar reintentos sin tumbar el clúster', async () => {
  const cl = await startCluster({ nodes: 1, threads: 1 });
  try {
    await assert.rejects(cl.coordinator.submit({ data: 'x', iterations: -1 }), /falló tras 3 intentos/);
    const ok = await cl.coordinator.submit({ data: 'x', iterations: 1000 });
    assert.equal(typeof ok.value, 'string');
  } finally { await cl.stop(); }
});
