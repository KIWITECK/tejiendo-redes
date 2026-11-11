// Coordinador: combina Proxy (fachada HTTP única hacia los clientes) y Mediator (los nodos
// nunca se hablan entre sí; toda coordinación pasa por aquí). Mantiene cola global, registro
// de nodos, reintentos ante fallos y publica eventos (Observer).
import net from 'node:net';
import http from 'node:http';
import { send, readMessages } from './protocol.js';
import { EventBus } from './event-bus.js';
import { strategies } from './strategies.js';

export class Coordinator {
  constructor({
    strategy = 'leastLoaded',
    slotsPerThread = 2,          // contrapresión: tareas en vuelo permitidas por hilo (Infinity = sin límite)
    heartbeatTimeoutMs = 2000,
    maxRetries = 3,
  } = {}) {
    this.strategy = strategies[strategy]();
    this.slotsPerThread = slotsPerThread;
    this.heartbeatTimeoutMs = heartbeatTimeoutMs;
    this.maxRetries = maxRetries;
    this.bus = new EventBus();
    this.nodes = new Map();   // id -> {id, socket, threads, capacity, inflight, jobs:Set, lastSeen, done}
    this.queue = [];
    this.jobs = new Map();    // jobId -> job
    this.nextJobId = 1;
    this.stats = { submitted: 0, completed: 0, failed: 0, retried: 0, nodesLost: 0 };
  }

  async listen({ tcpPort = 0, httpPort = 0, host = '127.0.0.1' } = {}) {
    this.tcp = net.createServer((s) => this.#onNodeSocket(s));
    this.http = http.createServer((req, res) => this.#onHttp(req, res));
    await Promise.all([
      new Promise((r) => this.tcp.listen(tcpPort, host, r)),
      new Promise((r) => this.http.listen(httpPort, host, r)),
    ]);
    this.monitor = setInterval(() => this.#checkHeartbeats(), 500);
    return { tcpPort: this.tcp.address().port, httpPort: this.http.address().port };
  }

  async close() {
    clearInterval(this.monitor);
    for (const n of this.nodes.values()) n.socket.destroy();
    this.http.closeAllConnections?.();
    await Promise.all([new Promise((r) => this.tcp.close(r)), new Promise((r) => this.http.close(r))]);
  }

  // ---- API de cliente (usada por la fachada HTTP y por pruebas) ----
  submit(payload) {
    return new Promise((resolve, reject) => {
      const job = { id: this.nextJobId++, payload, attempts: 0, t0: performance.now(), resolve, reject, nodeId: null };
      this.jobs.set(job.id, job);
      this.stats.submitted++;
      this.queue.push(job);
      this.#pump();
    });
  }

  // ---- Nodos ----
  #onNodeSocket(socket) {
    socket.setNoDelay(true);
    let node = null;
    readMessages(socket, (msg) => {
      if (msg.t === 'register') {
        node = { id: msg.id, socket, threads: msg.threads, inflight: 0, jobs: new Set(), lastSeen: Date.now(), done: 0,
                 capacity: msg.threads * this.slotsPerThread };
        this.nodes.set(node.id, node);
        this.bus.publish('node:joined', { nodeId: node.id, threads: node.threads });
        this.#pump();
      } else if (!node) { return; }
      else if (msg.t === 'hb') { node.lastSeen = Date.now(); }
      else if (msg.t === 'result') { node.lastSeen = Date.now(); this.#onResult(node, msg); }
    });
    socket.on('error', () => {});
    socket.on('close', () => { if (node && this.nodes.get(node.id) === node) this.#dropNode(node, 'conexión cerrada'); });
  }

  #checkHeartbeats() {
    const now = Date.now();
    for (const n of [...this.nodes.values()]) {
      if (now - n.lastSeen > this.heartbeatTimeoutMs) { n.socket.destroy(); this.#dropNode(n, 'heartbeat vencido'); }
    }
  }

  #dropNode(node, reason) {
    this.nodes.delete(node.id);
    this.stats.nodesLost++;
    const orphans = [...node.jobs];
    this.bus.publish('node:lost', { nodeId: node.id, reason, orphanJobs: orphans.length });
    for (const jobId of orphans) this.#retryOrFail(this.jobs.get(jobId), `nodo ${node.id} perdido`);
    this.#pump();
  }

  // ---- Planificación ----
  #pump() {
    while (this.queue.length) {
      const target = this.strategy.pick([...this.nodes.values()]);
      if (!target) return; // sin cupo: la cola espera (contrapresión)
      const job = this.queue.shift();
      job.attempts++;
      job.nodeId = target.id;
      target.inflight++;
      target.jobs.add(job.id);
      send(target.socket, { t: 'run', jobId: job.id, payload: job.payload });
    }
  }

  #onResult(node, msg) {
    const job = this.jobs.get(msg.jobId);
    if (!job || !node.jobs.has(job.id)) return; // resultado tardío de una tarea ya reasignada
    node.jobs.delete(job.id);
    node.inflight--;
    if (msg.ok) {
      node.done++;
      this.stats.completed++;
      this.jobs.delete(job.id);
      const latencyMs = performance.now() - job.t0;
      this.bus.publish('job:done', { jobId: job.id, nodeId: node.id, latencyMs, attempts: job.attempts });
      job.resolve({ jobId: job.id, nodeId: node.id, value: msg.value, execMs: msg.ms, latencyMs, attempts: job.attempts });
    } else {
      this.#retryOrFail(job, msg.error);
    }
    this.#pump();
  }

  #retryOrFail(job, reason) {
    if (!job) return;
    if (job.attempts >= this.maxRetries) {
      this.stats.failed++;
      this.jobs.delete(job.id);
      this.bus.publish('job:failed', { jobId: job.id, reason });
      job.reject(new Error(`Tarea ${job.id} falló tras ${job.attempts} intentos: ${reason}`));
      return;
    }
    this.stats.retried++;
    this.bus.publish('job:retry', { jobId: job.id, attempt: job.attempts, reason });
    this.queue.unshift(job); // las tareas reintentadas tienen prioridad
  }

  snapshot() {
    return {
      strategy: this.strategy.name,
      queued: this.queue.length,
      stats: { ...this.stats },
      nodes: [...this.nodes.values()].map((n) => ({ id: n.id, threads: n.threads, inflight: n.inflight, capacity: n.capacity, done: n.done })),
    };
  }

  // ---- Fachada HTTP (Proxy) ----
  async #onHttp(req, res) {
    const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.method === 'GET' && req.url === '/stats') return json(200, this.snapshot());
    if (req.method === 'GET' && req.url === '/health') return json(200, { ok: true, nodes: this.nodes.size });
    if (req.method === 'GET' && req.url === '/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      const off = this.bus.subscribe('*', (e) => res.write(`data: ${JSON.stringify(e)}\n\n`));
      req.on('close', off);
      return;
    }
    if (req.method === 'POST' && req.url === '/jobs') {
      let body = '';
      for await (const chunk of req) body += chunk;
      try {
        const payload = JSON.parse(body || '{}');
        const out = await this.submit(payload);
        return json(200, out);
      } catch (err) { return json(503, { error: err.message }); }
    }
    json(404, { error: 'no encontrado' });
  }
}
