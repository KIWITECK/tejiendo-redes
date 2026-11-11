// Patrón Strategy: política de selección del nodo que recibirá la siguiente tarea.
// Cada nodo expone { id, inflight, capacity }.
const hasSlot = (n) => n.inflight < n.capacity;

export function roundRobin() {
  let cursor = 0;
  return {
    name: 'roundRobin',
    pick(nodes) {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[(cursor + i) % nodes.length];
        if (hasSlot(n)) { cursor = (cursor + i + 1) % nodes.length; return n; }
      }
      return null;
    },
  };
}

export function leastLoaded() {
  return {
    name: 'leastLoaded',
    pick(nodes) {
      let best = null;
      for (const n of nodes) {
        if (!hasSlot(n)) continue;
        if (!best || n.inflight / n.capacity < best.inflight / best.capacity) best = n;
      }
      return best;
    },
  };
}

export const strategies = { roundRobin, leastLoaded };
