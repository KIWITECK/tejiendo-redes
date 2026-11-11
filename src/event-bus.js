// Patrón Observer: los componentes publican eventos y los observadores se suscriben sin conocerse.
export class EventBus {
  #subs = new Map();
  subscribe(type, fn) {
    const set = this.#subs.get(type) ?? new Set();
    set.add(fn);
    this.#subs.set(type, set);
    return () => set.delete(fn); // función para cancelar la suscripción
  }
  publish(type, data = {}) {
    const event = { type, at: Date.now(), ...data };
    for (const key of [type, '*']) {
      for (const fn of this.#subs.get(key) ?? []) {
        try { fn(event); } catch { /* un observador defectuoso no afecta a los demás */ }
      }
    }
  }
}
