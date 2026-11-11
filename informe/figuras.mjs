import { C, INK, SOFT, LINE, text, box, arrow, svg, hline, rect, esc, P } from './svg-kit.mjs';
import { readFileSync } from 'node:fs';

const R = JSON.parse(readFileSync(new URL('../docs/resultados.json', import.meta.url)));

// ---------- Figura 1: mapa conceptual del sistema ----------
export function fig1() {
  const id = 'f1';
  let b = '';
  b += P('cliente') + box(20, 30, 90, 46, 'blue', ['Cliente', 'HTTP / JSON']);
  b += P('coord') + arrow('M110 53 H173', { id }) + text(142, 46, 'POST /jobs', { size: 10, fill: SOFT, halo: 1 }) + box(175, 30, 130, 46, 'lilac', ['Coordinador', 'Proxy + Mediator']);
  b += P('nodos') + arrow('M305 53 H383', { id }) + text(344, 46, 'TCP · NDJSON', { size: 10, fill: SOFT, halo: 1 }) + box(385, 30, 90, 46, 'mint', ['Nodos 1…N', 'procesos Node.js']);
  b += P('pool') + arrow('M475 53 H518', { id }) + text(497, 46, 'ejecutan', { size: 10, fill: SOFT, halo: 1 }) + box(520, 30, 84, 46, 'peach', ['Pool', 'de hilos']);
  b += P('nunca') + text(560, 168, 'Los nodos nunca', { size: 10, fill: SOFT, italic: true }) + text(560, 181, 'se hablan entre sí', { size: 10, fill: SOFT, italic: true });
  b += P('bus') + arrow('M240 76 V138', { id }) + text(247, 112, 'publica eventos', { size: 10, fill: SOFT, anchor: 'start', halo: 1 }) + box(175, 140, 130, 46, 'butter', ['Bus de eventos', 'Observer']);
  b += P('obs');
  [['Métricas', 78], ['Trazas', 190], ['SSE /events', 302]].forEach(([l, x]) => { b += box(x, 226, 100, 34, 'gray', [l], { title: false }); });
  [128, 240, 352].forEach((x) => { b += arrow(`M240 186 L${x} 224`, { id }); });
  b += P('estrategia') + arrow('M290 76 V96 H450 V138', { id }) + text(372, 90, 'elige el nodo', { size: 10, fill: SOFT, halo: 1 }) + box(385, 140, 130, 46, 'rose', ['Estrategia', 'leastLoaded · roundRobin']);
  return svg(id, 624, 280, 'Mapa conceptual del sistema distribuido', b);
}

// ---------- Figura 2: cronograma ----------
export function fig2() {
  const id = 'f2';
  const x0 = 214, dayW = 58, top = 34;
  const days = ['4 nov', '5 nov', '6 nov', '7 nov', '8 nov', '9 nov', '10 nov'];
  const rows = [
    ['Análisis de requisitos y plan', 0, 1, 'blue'],
    ['Modelado UML y patrones', 0.5, 2.5, 'lilac'],
    ['Implementación del prototipo', 2, 4.5, 'mint'],
    ['Pruebas de escalabilidad y robustez', 4, 5.5, 'peach'],
    ['Ajustes y optimización', 5, 6, 'butter'],
    ['Informe técnico (PDF)', 5, 7, 'rose'],
    ['Video de presentación', 6, 7, 'blue'],
  ];
  let b = '';
  days.forEach((d, i) => { b += text(x0 + i * dayW + dayW / 2, 22, d, { size: 10.5, fill: SOFT }); b += hline(x0 + i * dayW, 30, x0 + i * dayW, top + rows.length * 30 + 4); });
  b += hline(x0 + 7 * dayW, 30, x0 + 7 * dayW, top + rows.length * 30 + 4);
  b += hline(10, 30, 614, 30, '#D5D6DB');
  rows.forEach(([l, s, e, c], i) => {
    const y = top + i * 30;
    b += P('r' + i);
    b += text(10, y + 19, l, { anchor: 'start', size: 11 });
    b += `<rect x="${x0 + s * dayW + 2}" y="${y + 6}" width="${(e - s) * dayW - 4}" height="18" rx="9" fill="${C[c][0]}" stroke="${C[c][1]}" stroke-width="1.2"/>`;
  });
  b += P('') + hline(10, top + rows.length * 30 + 4, 614, top + rows.length * 30 + 4, '#D5D6DB');
  return svg(id, 624, top + rows.length * 30 + 12, 'Cronograma del proyecto del 4 al 10 de noviembre de 2026', b);
}

// ---------- Figura 3: diagrama de componentes UML ----------
function compIcon(x, y) {
  // Icono UML de componente (esquina superior derecha de la caja)
  return `<g fill="#fff" stroke="${LINE}" stroke-width="0.9"><rect x="${x}" y="${y}" width="10" height="7"/><rect x="${x - 3}" y="${y + 1}" width="5" height="2" /><rect x="${x - 3}" y="${y + 4}" width="5" height="2"/></g>`;
}
function comp(x, y, w, h, color, l1, l2) {
  return box(x, y, w, h, color, [l1, l2]);
}
export function fig3() {
  const id = 'f3';
  let b = '';
  b += P('cliente') + comp(10, 50, 100, 46, 'blue', 'Cliente', 'HTTP / JSON');
  b += `<line x1="110" y1="73" x2="123" y2="73" stroke="${LINE}"/><path d="M132 64 A9 9 0 0 0 132 82" fill="none" stroke="${LINE}" stroke-width="1.1"/><circle cx="132" cy="73" r="4.5" fill="#fff" stroke="${LINE}" stroke-width="1.1"/><line x1="136.5" y1="73" x2="175" y2="73" stroke="${LINE}"/>`;
  b += text(132, 52, 'IJobs', { size: 10, fill: SOFT, halo: 1 });
  b += P('cont-coord') + `<rect x="150" y="14" width="310" height="306" rx="10" fill="none" stroke="${C.lilac[1]}" stroke-width="1.1" stroke-dasharray="5 4"/>` + text(305, 33, '«component» Coordinador', { size: 11, weight: 700 });
  b += P('fachada') + comp(175, 50, 120, 46, 'lilac', 'Fachada HTTP', '«Proxy»');
  b += P('cola') + arrow('M295 73 H313', { id }) + comp(315, 50, 120, 46, 'rose', 'Cola global', 'contrapresión');
  b += P('plan') + arrow('M375 96 V128', { id }) + comp(315, 130, 120, 46, 'rose', 'Planificador', '«Strategy»');
  b += P('registro') + arrow('M315 153 H297', { id }) + comp(175, 130, 120, 46, 'gray', 'Registro de nodos', 'estado y cupo');
  b += P('servidor') + arrow('M375 176 V208', { id }) + comp(315, 210, 120, 46, 'lilac', 'Servidor de enlace', '«Mediator»');
  b += P('monitor') + comp(175, 210, 120, 46, 'gray', 'Monitor heartbeat', 'detecta fallos') + arrow('M235 210 V178', { id, dash: true });
  b += P('bus') + comp(235, 268, 130, 40, 'butter', 'Bus de eventos', '«Observer»') + arrow('M245 256 L265 266', { id, dash: true }) + arrow('M395 256 L350 266', { id, dash: true });
  b += P('cont-nodo') + `<rect x="480" y="14" width="140" height="306" rx="10" fill="none" stroke="${C.mint[1]}" stroke-width="1.1" stroke-dasharray="5 4"/>` + text(550, 33, '«component» Nodo (×N)', { size: 11, weight: 700 });
  b += P('agente') + comp(502, 210, 106, 46, 'mint', 'Agente de nodo', 'TCP y reintentos');
  b += `<line x1="435" y1="233" x2="461.5" y2="233" stroke="${LINE}"/><circle cx="466" cy="233" r="4.5" fill="#fff" stroke="${LINE}" stroke-width="1.1"/><path d="M466 224 A9 9 0 0 1 466 242" fill="none" stroke="${LINE}" stroke-width="1.1"/><line x1="475" y1="233" x2="502" y2="233" stroke="${LINE}"/>`;
  b += text(466, 268, 'IEnlace', { size: 10, fill: SOFT, halo: 1 });
  b += P('pool') + arrow('M555 210 V178', { id }) + comp(502, 130, 106, 46, 'peach', 'Pool de hilos', 'cola interna');
  b += P('hilo') + arrow('M555 130 V98', { id }) + comp(502, 50, 106, 46, 'peach', 'Hilo de trabajo', '×k · CPU-bound');
  return svg(id, 624, 330, 'Diagrama de componentes UML', b);
}

// ---------- Figura 4: diagrama de secuencia UML ----------
export function fig4() {
  const id = 'f4';
  const L = { cli: 45, coo: 150, bus: 275, na: 385, hilo: 485, nb: 574 };
  const names = { cli: ['Cliente'], coo: ['Coordinador'], bus: ['Bus de', 'eventos'], na: ['Nodo A'], hilo: ['Hilo de A'], nb: ['Nodo B'] };
  const colors = { cli: 'blue', coo: 'lilac', bus: 'butter', na: 'mint', hilo: 'peach', nb: 'mint' };
  const H = 630;
  let b = '';
  b += P('life');
  for (const k of Object.keys(L)) {
    b += `<line x1="${L[k]}" y1="46" x2="${L[k]}" y2="${H - 8}" stroke="#C9CBD2" stroke-width="1" stroke-dasharray="4 4"/>`;
    b += box(L[k] - 45, 6, 90, 38, colors[k], names[k], { size: 11, title: true }).replace(/font-size="10.5"/g, 'font-size="11"');
  }
  const msg = (y, from, to, label, o = {}) => {
    const x1 = L[from], x2 = L[to], dir = x2 > x1 ? 1 : -1;
    return arrow(`M${x1 + dir * (o.fromBar ? 5 : 0)} ${y} H${x2 - dir * 4}`, { id, dash: o.ret }) +
      text((x1 + x2) / 2, y - 6, label, { size: 10.5, halo: 1, fill: o.ret ? SOFT : INK });
  };
  const bar = (k, y1, y2) => `<rect x="${L[k] - 5}" y="${y1}" width="10" height="${y2 - y1}" fill="#fff" stroke="${LINE}" stroke-width="1"/>`;
  // activaciones
  b += bar('coo', 74, 358) + bar('na', 150, 296) + bar('hilo', 186, 246) + bar('coo', 466, 620) + bar('nb', 560, 598);
  b += P('m1') + msg(80, 'cli', 'coo', '1: POST /jobs');
  b += P('m2') + `<path d="M155 108 h30 v16 h-30" fill="none" stroke="${LINE}" stroke-width="1.1" marker-end="url(#${id}ar)"/>` + text(192, 120, '2: pick(nodos) · Strategy', { anchor: 'start', size: 10.5, halo: 1 });
  b += P('m3') + msg(156, 'coo', 'na', '3: run {jobId, payload} por TCP');
  b += P('m4') + msg(192, 'na', 'hilo', '4: postMessage');
  b += text(500, 220, 'pbkdf2Sync', { size: 10, fill: SOFT, anchor: 'start', italic: true });
  b += P('m5') + msg(244, 'hilo', 'na', '5: value', { ret: true });
  b += P('m6') + msg(290, 'na', 'coo', '6: result {ok, value}');
  b += P('m7') + msg(322, 'coo', 'bus', '7: publish(job:done)');
  b += P('m8') + msg(352, 'coo', 'cli', '8: 200 {value}', { ret: true });
  // fragmento alt
  b += P('alt') + `<rect x="12" y="384" width="600" height="236" rx="4" fill="none" stroke="${C.rose[1]}" stroke-width="1.1"/>`;
  b += `<path d="M12 384 h54 v16 l-8 8 h-46 z" fill="${C.rose[0]}" stroke="${C.rose[1]}" stroke-width="1.1"/>` + text(39, 399, 'alt', { size: 10.5, weight: 700 });
  b += text(76, 399, '[ el nodo cae antes de responder ]', { anchor: 'start', size: 10.5, italic: true, fill: SOFT });
  b += P('kill') + `<path d="M${L.na - 6} 432 l12 12 m0 -12 l-12 12" stroke="#D9778F" stroke-width="1.6" fill="none"/>` + text(L.na + 14, 442, 'SIGKILL', { anchor: 'start', size: 10, fill: '#B65A74' });
  b += P('m9') + msg(474, 'na', 'coo', '9: cierre de socket / heartbeat vencido', { ret: true });
  b += P('m10') + msg(506, 'coo', 'bus', '10: publish(node:lost)');
  b += P('m11') + `<path d="M155 524 h30 v16 h-30" fill="none" stroke="${LINE}" stroke-width="1.1" marker-end="url(#${id}ar)"/>` + text(192, 536, '11: reencolar tarea (intento ≤ 3)', { anchor: 'start', size: 10.5, halo: 1 });
  b += P('m12') + msg(566, 'coo', 'nb', '12: run {jobId, payload}');
  b += P('m13') + msg(594, 'nb', 'coo', '13: result {ok, value}', { ret: true });
  b += P('m14') + msg(614, 'coo', 'cli', '14: 200 {value}', { ret: true });
  return svg(id, 624, H, 'Diagrama de secuencia UML', b);
}

// ---------- Figura 5: diagrama de despliegue UML ----------
function node3d(x, y, w, h, color, label) {
  const [fill, stroke] = C[color];
  const d = 9;
  return `<g stroke="${stroke}" stroke-width="1.1" stroke-linejoin="round">
    <path d="M${x} ${y} l${d} -${d} h${w} l-${d} ${d} z" fill="${fill}"/>
    <path d="M${x + w} ${y} l${d} -${d} v${h} l-${d} ${d} z" fill="${fill}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/></g>` + text(x + w / 2, y + 17, label, { size: 11, weight: 700 });
}
export function fig5() {
  const id = 'f5';
  let b = '';
  // equipos
  b += P('cliente') + node3d(14, 96, 124, 122, 'blue', '«device» Cliente');
  b += box(26, 128, 100, 52, 'gray', ['«artifact»', 'harness.js', 'carga HTTP'], { size: 10.5, title: false });
  b += P('servidor') + node3d(232, 70, 156, 174, 'lilac', '«device» Servidor');
  b += box(246, 94, 128, 138, 'gray', [], {});
  b += text(310, 112, '«execution env»', { size: 10, fill: SOFT, italic: true });
  b += text(310, 126, 'Node.js', { size: 11, weight: 700 });
  b += box(256, 138, 108, 38, 'lilac', ['coordinator.js', '«artifact»'], { size: 10.5, title: true });
  b += text(310, 198, 'HTTP :8080', { size: 10.5, fill: INK });
  b += text(310, 214, 'TCP :7000', { size: 10.5, fill: INK });
  // nodos
  const ny = [26, 116, 206];
  const nl = ['Nodo 1', 'Nodo 2', 'Nodo N'];
  ny.forEach((y, i) => {
    b += P('n' + i);
    b += node3d(458, y, 146, 74, 'mint', `«device» ${nl[i]}`);
    b += box(468, y + 25, 126, 40, 'gray', ['node.js · Node.js', '2 hilos worker_threads'], { size: 10.5, title: false });
    b += arrow(`M${388} ${157} L${456} ${y + 38}`, { id, start: true });
  });
  b += P('link') + arrow('M138 157 H230', { id, start: true });
  b += text(184, 148, 'HTTP · JSON', { size: 10.5, halo: 1 });
  b += text(414, 262, 'TCP · NDJSON', { size: 10.5, halo: 1 });
  return svg(id, 624, 292, 'Diagrama de despliegue UML', b);
}

// ---------- Figura 6: patrones de diseño aplicados ----------
export function fig6() {
  const id = 'f6';
  let b = '';
  const card = (x, y, color, title, l) => box(x, y, 254, 94, color, [title, ...l], { size: 11.5 });
  b += P('proxy') + card(14, 10, 'lilac', 'Proxy', ['Fachada HTTP única del coordinador.', 'Oculta al cliente cuántos nodos hay', 'y dónde se ejecuta cada tarea.']);
  b += P('mediator') + card(356, 10, 'rose', 'Mediator', ['Toda coordinación pasa por el coordinador.', 'Los nodos no se conocen entre sí:', 'bajo acoplamiento y alta cohesión.']);
  b += P('observer') + card(14, 186, 'butter', 'Observer distribuido', ['Bus de eventos + flujo SSE (/events).', 'Métricas y trazas se suscriben sin', 'modificar el planificador.']);
  b += P('strategy') + card(356, 186, 'mint', 'Strategy', ['Política de reparto intercambiable:', 'roundRobin o leastLoaded, elegida', 'al arrancar el coordinador.']);
  b += P('centro') + `<circle cx="312" cy="148" r="52" fill="${C.blue[0]}" stroke="${C.blue[1]}" stroke-width="1.2"/>`;
  b += text(312, 143, 'Sistema', { size: 12, weight: 700 }) + text(312, 158, 'distribuido', { size: 12, weight: 700 }) + text(312, 173, 'de tareas', { size: 11, fill: SOFT });
  return svg(id, 624, 292, 'Patrones de diseño aplicados al sistema', b);
}

// ---------- Gráficos de resultados ----------
function lineChart({ x, y, w, h, title, xlab, ylab, cats, real, ideal, ymax }) {
  const pl = 44, pb = 36, pt = 26, pr = 14;
  const iw = w - pl - pr, ih = h - pt - pb;
  const X = (i) => x + pl + (iw * i) / (cats.length - 1);
  const Y = (v) => y + pt + ih - (v / ymax) * ih;
  let b = text(x + w / 2, y + 12, title, { size: 11, weight: 700 });
  for (let v = 0; v <= ymax; v += 100) {
    b += hline(x + pl, Y(v), x + w - pr, Y(v));
    b += text(x + pl - 6, Y(v) + 3.5, String(v), { size: 10, anchor: 'end', fill: SOFT });
  }
  cats.forEach((c, i) => { b += text(X(i), y + h - 18, String(c), { size: 10.5, fill: SOFT }); });
  b += text(x + pl + iw / 2, y + h - 3, xlab, { size: 10.5, fill: SOFT });
  b += `<text transform="translate(${x + 10} ${y + pt + ih / 2}) rotate(-90)" font-size="10.5" text-anchor="middle" fill="${SOFT}">${esc(ylab)}</text>`;
  b += `<polyline points="${ideal.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${C.gray[1]}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
  b += `<polyline points="${real.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${C.lilac[1]}" stroke-width="1.8"/>`;
  real.forEach((v, i) => {
    b += `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="#fff" stroke="${C.lilac[1]}" stroke-width="1.6"/>`;
    b += text(X(i), Y(v) - 9, String(v).replace('.', ','), { size: 10.5, weight: 700, halo: 1 });
  });
  return b;
}
export function fig7() {
  const id = 'f7';
  const e1 = R.e1.map((r) => r.throughput), e2 = R.e2.map((r) => r.throughput);
  let b = '';
  b += P('p1') + lineChart({ x: 0, y: 0, w: 308, h: 270, title: 'Más nodos (2 hilos por nodo)', xlab: 'Nodos', ylab: 'Tareas por segundo', cats: [1, 2, 3, 4], real: e1, ideal: e1.map((_, i) => +(e1[0] * (i + 1)).toFixed(1)), ymax: 300 });
  b += P('p2') + lineChart({ x: 316, y: 0, w: 308, h: 270, title: 'Más hilos (un solo nodo)', xlab: 'Hilos', ylab: 'Tareas por segundo', cats: [1, 2, 4, 8], real: e2, ideal: [35, 70, 140, 280], ymax: 300 });
  // leyenda
  b += P('leg') + `<line x1="226" y1="290" x2="250" y2="290" stroke="${C.lilac[1]}" stroke-width="1.8"/><circle cx="238" cy="290" r="3.4" fill="#fff" stroke="${C.lilac[1]}" stroke-width="1.5"/>` + text(256, 294, 'Medido', { size: 10.5, anchor: 'start' });
  b += `<line x1="316" y1="290" x2="340" y2="290" stroke="${C.gray[1]}" stroke-width="1.2" stroke-dasharray="4 3"/>` + text(346, 294, 'Escalamiento ideal (lineal)', { size: 10.5, anchor: 'start' });
  return svg(id, 624, 302, 'Escalabilidad por nodos y por hilos', b);
}

export function fig8() {
  const id = 'f8';
  const e = R.e3;
  let b = '';
  // línea de tiempo de la carga
  const x0 = 30, w = 564, y = 62;
  b += P('barra') + text(x0, 24, 'Progreso de la carga (900 tareas)', { anchor: 'start', size: 11, weight: 700 });
  const seg = [[0, 0.3, 'mint', '3 nodos activos'], [0.3, 0.6, 'rose', '2 nodos (nodo-2 caído)'], [0.6, 1, 'mint', '3 nodos (nodo-2 reincorporado)']];
  seg.forEach(([a, c, col, l]) => {
    b += `<rect x="${x0 + a * w}" y="${y}" width="${(c - a) * w}" height="22" rx="11" fill="${C[col][0]}" stroke="${C[col][1]}" stroke-width="1.2"/>`;
    b += text(x0 + ((a + c) / 2) * w, y + 15, l, { size: 10.5 });
  });
  [[0.3, '30 % · SIGKILL', '270 tareas'], [0.6, '60 % · nodo vuelve', '540 tareas']].forEach(([p, l1, l2]) => {
    b += `<line x1="${x0 + p * w}" y1="${y - 10}" x2="${x0 + p * w}" y2="${y + 32}" stroke="${LINE}" stroke-width="1" stroke-dasharray="3 3"/>`;
    b += text(x0 + p * w, y - 14, l1, { size: 10.5, halo: 1 }) + text(x0 + p * w, y + 46, l2, { size: 10, fill: SOFT });
  });
  // tarjetas de resultado
  const cards = [[`${e.completadas}/${e.tareas}`, 'tareas completadas', 'mint'], [String(e.tareasReintentadas), 'reasignadas a otro nodo', 'peach'], [String(e.fallidas), 'tareas perdidas', 'blue'], [`${e.p95} ms`.replace('.', ','), 'latencia p95', 'lilac']];
  cards.forEach(([v, l, c], i) => {
    b += P('c' + i);
    const x = 14 + i * 152;
    b += box(x, 120, 140, 64, c, [v, l], { size: 15 }).replace(/font-size="14.5"/, 'font-size="11"');
  });
  // reparto por nodo
  b += P('reparto') + text(x0, 212, 'Tareas atendidas por nodo', { anchor: 'start', size: 11, weight: 700 });
  const max = Math.max(...e.repartoFinal.map((n) => n.hechas));
  e.repartoFinal.slice().sort((a, b2) => a.id.localeCompare(b2.id)).forEach((n, i) => {
    const yy = 226 + i * 24;
    b += text(x0, yy + 13, n.id, { anchor: 'start', size: 10.5, fill: SOFT });
    const bw = (n.hechas / max) * 400;
    b += `<rect x="${x0 + 62}" y="${yy + 2}" width="${bw}" height="14" rx="7" fill="${C[n.id === 'nodo-2' ? 'rose' : 'mint'][0]}" stroke="${C[n.id === 'nodo-2' ? 'rose' : 'mint'][1]}" stroke-width="1.2"/>`;
    b += text(x0 + 62 + bw + 8, yy + 13, String(n.hechas), { anchor: 'start', size: 10.5, weight: 700 });
  });
  return svg(id, 624, 306, 'Resultados de la prueba de robustez', b);
}

export function fig9() {
  const id = 'f9';
  const v = R.e4;
  const names = ['V0 · línea base', 'V1 · + pool de hilos', 'V2 · + menor carga y contrapresión'];
  const cols = ['rose', 'butter', 'mint'];
  let b = '';
  const panel = (x, title, vals, fmtv, unit, better) => {
    let o = P('titles') + text(x, 16, title, { anchor: 'start', size: 11, weight: 700 }) + text(x, 30, better, { anchor: 'start', size: 10, fill: SOFT, italic: true });
    const max = Math.max(...vals) * 1.0;
    vals.forEach((val, i) => {
      o += P('v' + i);
      const yy = 44 + i * 44;
      const bw = (val / max) * 210;
      o += `<rect x="${x}" y="${yy}" width="${bw}" height="18" rx="9" fill="${C[cols[i]][0]}" stroke="${C[cols[i]][1]}" stroke-width="1.2"/>`;
      o += text(x + bw + 8, yy + 13, fmtv(val) + ' ' + unit, { anchor: 'start', size: 10.5, weight: 700 });
      if (i === 0) o += text(x, yy + 33, 'referencia', { anchor: 'start', size: 10, fill: SOFT });
      if (i > 0) { const d = (val / vals[0] - 1) * 100; o += text(x, yy + 33, `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(0)} % frente a V0`, { anchor: 'start', size: 10, fill: SOFT }); }
    });
    return o;
  };
  b += panel(10, 'Rendimiento', v.map((r) => r.throughput), (n) => String(n).replace('.', ','), 'tareas/s', 'mayor es mejor');
  b += panel(330, 'Latencia p95', v.map((r) => r.p95), (n) => String(Math.round(n)), 'ms', 'menor es mejor');
  // leyenda
  b += P('leg');
  names.forEach((n, i) => {
    const x = 10 + i * 208;
    b += `<rect x="${x}" y="190" width="14" height="10" rx="5" fill="${C[cols[i]][0]}" stroke="${C[cols[i]][1]}" stroke-width="1.2"/>` + text(x + 20, 199, n, { anchor: 'start', size: 10 });
  });
  return svg(id, 624, 210, 'Comparación de las versiones V0, V1 y V2', b);
}
