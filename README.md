# Tejiendo redes: arquitectura de software entre hilos y nodos

Prototipo del mini proyecto de la Unidad 2 — *Arquitectura de Software* (Tecnológica del Oriente, 20262 N6 Gr A).
Autor: David Ricardo Amaya Rojas.

Sistema distribuido de **procesamiento de tareas CPU-intensivas**: un coordinador recibe tareas por HTTP y las reparte
entre nodos (procesos independientes conectados por TCP); cada nodo las ejecuta en un pool de hilos (`worker_threads`).
Sin dependencias externas (solo Node.js ≥ 20).

```
Cliente ──HTTP──▶ Coordinador (Proxy + Mediator) ──TCP/NDJSON──▶ Nodo 1..N ──▶ Pool de hilos
                      │ EventBus (Observer) ──▶ /events (SSE), métricas, trazas
```

## Patrones de diseño
| Patrón | Dónde |
|---|---|
| Proxy | `src/coordinator.js` — fachada HTTP única; los clientes no conocen los nodos |
| Mediator | `src/coordinator.js` — los nodos solo hablan con el coordinador |
| Observer distribuido | `src/event-bus.js` + `GET /events` (Server-Sent Events) |
| Strategy | `src/strategies.js` — `roundRobin` / `leastLoaded` intercambiables |

## Uso
```bash
npm run demo        # 3 nodos × 2 hilos, 60 tareas
npm test            # 8 pruebas (incluye caída de nodo y heartbeat vencido)
npm run bench       # E1–E4, ~3.5 min; escribe docs/resultados.json

# Despliegue manual en varias terminales
STRATEGY=leastLoaded npm run start:coordinator
NODE_ID=nodo-1 THREADS=4 COORD_PORT=7000 npm run start:node
curl -X POST localhost:8080/jobs -d '{"data":"hola","iterations":100000}'
curl localhost:8080/stats
```

## Resultados (MacBook Apple M4, 10 núcleos; mediana de 3 ejecuciones)
- 1 → 4 nodos (2 hilos c/u): 68,7 → 187,1 tareas/s (×2,7).
- Caída de un nodo con SIGKILL a mitad de carga: 900/900 tareas completadas, 4 reasignadas, 0 fallidas.
- Optimización V0 → V2: +21 % de rendimiento y −37 % en la latencia p95.

Informe completo (APA 7): `informe/informe.pdf` (fuente HTML: `informe/informe.html`, generado con `node informe/build.mjs`)`.
