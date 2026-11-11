import { Coordinator } from './coordinator.js';

const c = new Coordinator({ strategy: process.env.STRATEGY ?? 'leastLoaded' });
const ports = await c.listen({ tcpPort: Number(process.env.TCP_PORT ?? 7000), httpPort: Number(process.env.HTTP_PORT ?? 8080) });
c.bus.subscribe('*', (e) => console.log(new Date(e.at).toISOString(), e.type, JSON.stringify({ ...e, type: undefined, at: undefined })));
console.log(`Coordinador listo. Nodos (TCP): ${ports.tcpPort} · API (HTTP): http://127.0.0.1:${ports.httpPort}`);
