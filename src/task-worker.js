// Hilo de trabajo: ejecuta la tarea CPU-bound (derivación PBKDF2) fuera del hilo principal del nodo.
import { parentPort, workerData } from 'node:worker_threads';
import { pbkdf2Sync } from 'node:crypto';

function compute({ data = '', iterations = 50000 }) {
  return pbkdf2Sync(String(data), 'tejiendo-redes', iterations, 32, 'sha512').toString('hex');
}

if (workerData?.oneShot) {
  // Modo "un hilo por tarea" (línea base sin pool): nace, trabaja y muere.
  try { parentPort.postMessage({ value: compute(workerData.payload) }); }
  catch (err) { parentPort.postMessage({ error: String(err.message) }); }
} else {
  parentPort.on('message', ({ id, payload }) => {
    // Un error de la tarea se devuelve como dato: no debe matar el hilo del pool.
    try { parentPort.postMessage({ id, value: compute(payload) }); }
    catch (err) { parentPort.postMessage({ id, error: String(err.message) }); }
  });
}
