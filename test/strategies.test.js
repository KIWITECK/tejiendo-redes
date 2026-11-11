import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundRobin, leastLoaded } from '../src/strategies.js';
import { EventBus } from '../src/event-bus.js';

const nodes = () => [
  { id: 'a', inflight: 3, capacity: 4 },
  { id: 'b', inflight: 1, capacity: 4 },
  { id: 'c', inflight: 4, capacity: 4 },
];

test('leastLoaded elige el nodo con menor ocupación relativa', () => {
  assert.equal(leastLoaded().pick(nodes()).id, 'b');
});

test('ninguna estrategia elige un nodo sin cupo', () => {
  const full = [{ id: 'x', inflight: 2, capacity: 2 }];
  assert.equal(leastLoaded().pick(full), null);
  assert.equal(roundRobin().pick(full), null);
});

test('roundRobin rota y salta nodos llenos', () => {
  const s = roundRobin();
  const ns = nodes();
  assert.deepEqual([s.pick(ns).id, s.pick(ns).id, s.pick(ns).id], ['a', 'b', 'a']);
});

test('EventBus notifica a observadores específicos y comodín, y aísla errores', () => {
  const bus = new EventBus();
  const seen = [];
  bus.subscribe('x', () => { throw new Error('observador roto'); });
  bus.subscribe('x', (e) => seen.push(['x', e.v]));
  const off = bus.subscribe('*', (e) => seen.push(['*', e.type]));
  bus.publish('x', { v: 1 });
  off();
  bus.publish('x', { v: 2 });
  assert.deepEqual(seen, [['x', 1], ['*', 'x'], ['x', 2]]);
});
