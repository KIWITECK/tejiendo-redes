// Pool de hilos de tamaño fijo con cola interna. Alternativa "perTask" = línea base ineficiente.
import { Worker } from 'node:worker_threads';

const WORKER_FILE = new URL('./task-worker.js', import.meta.url);

export class ThreadPool {
  constructor({ size, mode = 'pool' }) {
    this.size = size;
    this.mode = mode;
    this.queue = [];
    this.idle = [];
    this.pending = new Map(); // worker -> {resolve,reject}
    this.nextId = 0;
    if (mode === 'pool') for (let i = 0; i < size; i++) this.#spawn();
  }

  #spawn() {
    const w = new Worker(WORKER_FILE);
    w.on('message', ({ value, error }) => {
      const job = this.pending.get(w);
      this.pending.delete(w);
      this.idle.push(w);
      if (error) job.reject(new Error(error)); else job.resolve(value);
      this.#drain();
    });
    w.on('error', (err) => { this.pending.get(w)?.reject(err); this.pending.delete(w); });
    this.idle.push(w);
  }

  run(payload) {
    if (this.mode === 'perTask') return this.#runOneShot(payload);
    return new Promise((resolve, reject) => {
      this.queue.push({ payload, resolve, reject });
      this.#drain();
    });
  }

  #drain() {
    while (this.queue.length && this.idle.length) {
      const w = this.idle.pop();
      const job = this.queue.shift();
      this.pending.set(w, job);
      w.postMessage({ id: this.nextId++, payload: job.payload });
    }
  }

  #runOneShot(payload) {
    return new Promise((resolve, reject) => {
      const w = new Worker(WORKER_FILE, { workerData: { oneShot: true, payload } });
      w.once('message', ({ value, error }) => (error ? reject(new Error(error)) : resolve(value)));
      w.once('error', reject);
    });
  }

  async close() { await Promise.all([...this.idle, ...this.pending.keys()].map((w) => w.terminate())); }
}
