// Genera el proyecto HyperFrames (hf/) a partir del guion, las duraciones reales de la voz y las figuras del informe.
// Uso: node build-video.mjs   (requiere audio/manifest.json completo; las duraciones faltantes se estiman)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { escenas } from './escenas.mjs';
import * as F from '../informe/figuras.mjs';

const here = new URL('.', import.meta.url).pathname;
const manifest = existsSync(here + 'audio/manifest.json') ? JSON.parse(readFileSync(here + 'audio/manifest.json')) : {};
const GAP = 0.45, LEAD = 0.8, TAIL = 1.0, FADE = 0.45;
const demoTxt = readFileSync(here + 'assets/demo.txt', 'utf8').split('\n').filter((l) => !l.startsWith('>') && l.trim() && !l.includes('npm run'));
const testTxt = readFileSync(here + 'assets/tests.txt', 'utf8').split('\n').filter((l) => l.startsWith('✔')).map((l) => l.replace(/ \([\d.]+ms\)$/, '')).concat(['ℹ 8 pruebas · 8 pasan · 0 fallan']);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- calendario ----------
let cursor = 0;
const sched = escenas.map((sc) => {
  const durs = sc.chunks.map((c, i) => manifest[`${sc.id}-${i}`]?.dur ?? Math.max(3, c.tts.split(/\s+/).length / 3.1));
  let t = LEAD;
  const times = durs.map((d) => { const s = t; t += d + GAP; return s; });
  const dur = t - GAP + TAIL + (sc.id === 'cierre' ? 3 : 0);
  const out = { ...sc, start: cursor, dur, durs, times };
  cursor += dur;
  return out;
});
const TOTAL = cursor;
writeFileSync(here + 'audio/schedule.json', JSON.stringify(sched.map((s) => ({ id: s.id, start: s.start, times: s.times, durs: s.durs })), null, 1));

// ---------- piezas ----------
const CSS = `
  #root { position: absolute; inset: 0; background: #FFFFFF; font-family: Inter, sans-serif; color: #2F3137; overflow: hidden; }
  .wrap { position: absolute; inset: 0; }
  .ttl { position: absolute; left: 120px; top: 54px; font-size: 50px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
  .abs { position: absolute; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .soft { color: #60646D; }
  .hl-blue { background: linear-gradient(transparent 58%, #CFE3F5 58%); padding: 0 6px; }
  .hl-mint { background: linear-gradient(transparent 58%, #CBEBDC 58%); padding: 0 6px; }
  .hl-lilac { background: linear-gradient(transparent 58%, #DDD2F2 58%); padding: 0 6px; }
  .hl-peach { background: linear-gradient(transparent 58%, #FAD9C6 58%); padding: 0 6px; }
  .hl-rose { background: linear-gradient(transparent 58%, #F7CFD9 58%); padding: 0 6px; }
  .hl-butter { background: linear-gradient(transparent 58%, #F6EBB5 58%); padding: 0 6px; }
  .panel { background: #F7F7F8; border: 1.5px solid #D5D6DB; border-radius: 16px; }
`;
const fadeJS = (id, dur, first) => `
  ${first ? '' : `tl.fromTo('#${id}-wrap', { opacity: 0 }, { opacity: 1, duration: ${FADE}, ease: 'power2.out' }, 0);`}
  tl.fromTo('#${id}-ttl', { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, 0.15);
  tl.to('#${id}-wrap', { opacity: 0, duration: ${FADE}, ease: 'power2.in' }, ${(dur - FADE).toFixed(3)});`;

function revealJS(sc, present) {
  const cues = sc.chunks.map((c, i) => ({ t: sc.times[i], parts: c.show.filter((p) => present.has(p)) }));
  return `
  const root = '#${sc.id}-wrap';
  tl.set(root + ' [data-part]', { opacity: 0 }, 0);
  const cues = ${JSON.stringify(cues)};
  cues.forEach((c) => c.parts.forEach((p, i) => {
    tl.fromTo(root + ' [data-part="' + p + '"]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, c.t + i * 0.2);
  }));`;
}

function figureBody(sc) {
  let s = F[sc.fig]();
  const m = /viewBox="0 0 (\d+) (\d+)"/.exec(s);
  const [w, h] = [Number(m[1]), Number(m[2])];
  const [y0, y1] = sc.crop ?? [0, h];
  const ch = y1 - y0;
  s = s.replace(/viewBox="[^"]+"/, `viewBox="0 ${y0} ${w} ${ch}"`).replace(/ width="100%"/, '');
  s = s.replace(/(f\d)ar/g, `${sc.id}-ar`);
  const width = Math.min(1680, Math.floor((870 * w) / ch));
  const left = Math.round((1920 - width) / 2);
  return `<div class="abs" style="left:${left}px; top:${sc.crop ? 150 : 170}px; width:${width}px">${s.replace('<svg ', `<svg width="${width}" `)}</div>`;
}

function kindBody(sc) {
  switch (sc.kind) {
    case 'intro': {
      const lines = [];
      const cols = ['#9CC5E8', '#B7A6E0', '#8FD1B4', '#F2B493', '#E9A5B7', '#E0CB78'];
      const x0 = 1180, y0 = 170, step = 100, n = 7;
      for (let i = 0; i < n; i++) {
        lines.push(`<path class="wh" d="M${x0} ${y0 + i * step} H${x0 + (n - 1) * step}" stroke="${cols[i % 6]}" stroke-width="3" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/>`);
        lines.push(`<path class="wv" d="M${x0 + i * step} ${y0} V${y0 + (n - 1) * step}" stroke="${cols[(i + 3) % 6]}" stroke-width="3" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/>`);
      }
      const nodes = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nodes.push(`<circle class="wn" cx="${x0 + i * step}" cy="${y0 + j * step}" r="9" fill="#fff" stroke="#8A8E98" stroke-width="2" opacity="0"/>`);
      return `
    <svg class="abs" style="left:0;top:0" width="1920" height="1080" viewBox="0 0 1920 1080">${lines.join('')}${nodes.join('')}</svg>
    <div class="abs" data-part="title" style="left:120px; top:300px; width:1000px">
      <div style="font-size:132px; font-weight:800; letter-spacing:-0.045em; line-height:1">Tejiendo redes</div>
      <div style="font-size:50px; font-weight:500; margin-top:28px; color:#60646D; line-height:1.2">Arquitectura de software<br/>entre hilos y nodos</div>
    </div>
    <div class="abs" data-part="meta" style="left:120px; top:690px; font-size:32px; line-height:1.55; width:1000px">
      <div style="font-weight:700">David Ricardo Amaya Rojas</div>
      <div class="soft">Tecnológica del Oriente</div>
      <div class="soft">Arquitectura de Software 20262 - N6 Gr A · Unidad 2</div>
      <div class="soft">Docente: Leydi Johana Polo Amador</div>
      <div class="soft">10 de noviembre de 2026</div>
    </div>`;
    }
    case 'lines':
      return `
    <div class="abs" data-part="l1" style="left:120px; top:170px; font-size:118px; font-weight:800; letter-spacing:-0.04em; line-height:1"><span class="hl-blue">Muchos nodos</span></div>
    <div class="abs" data-part="l2" style="left:120px; top:310px; font-size:118px; font-weight:800; letter-spacing:-0.04em; line-height:1"><span class="hl-mint">Muchos hilos</span></div>
    <div class="abs" data-part="q1" style="left:120px; top:520px; font-size:42px; font-weight:500">¿Cómo se comunican las piezas?</div>
    <div class="abs" data-part="q2" style="left:120px; top:600px; font-size:42px; font-weight:500">¿Quién coordina?</div>
    <div class="abs" data-part="q3" style="left:120px; top:680px; font-size:42px; font-weight:500">¿Qué pasa cuando un nodo falla?</div>
    <div class="abs" data-part="o1" style="left:1130px; top:170px; font-size:92px; font-weight:800; letter-spacing:-0.03em"><span class="hl-lilac">Diseñar</span><div class="soft" style="font-size:34px; font-weight:500; margin-top:6px">la arquitectura distribuida</div></div>
    <div class="abs" data-part="o2" style="left:1130px; top:370px; font-size:92px; font-weight:800; letter-spacing:-0.03em"><span class="hl-peach">Modelar</span><div class="soft" style="font-size:34px; font-weight:500; margin-top:6px">con diagramas UML y patrones</div></div>
    <div class="abs" data-part="o3" style="left:1130px; top:570px; font-size:92px; font-weight:800; letter-spacing:-0.03em"><span class="hl-rose">Evaluar</span><div class="soft" style="font-size:34px; font-weight:500; margin-top:6px">con un prototipo medible</div></div>
    <div class="abs" data-part="idea" style="left:120px; top:880px; font-size:54px; font-weight:700; letter-spacing:-0.02em"><span class="hl-butter">Decidir con criterios verificables, no por intuición.</span></div>`;
    case 'fig':
      return figureBody(sc);
    case 'req': {
      const rf = ['Aceptar tareas por HTTP y devolver el resultado.', 'Repartir tareas con una estrategia configurable.', 'Admitir nodos que entran y salen en caliente.', 'Reasignar las tareas de un nodo caído (máx. 3 intentos).', 'Exponer el estado y los eventos en vivo.'];
      const rnf = ['Escalabilidad: eficiencia ≥ 60 % con 4 nodos.', 'Robustez: 0 tareas perdidas ante una caída.', 'Eficiencia: p95 ≤ 1 s con 128 clientes.', 'Bajo acoplamiento: ningún nodo conoce a otro.', 'Observabilidad: p50, p95, p99 y reparto por nodo.'];
      const row = (id, txt, i, x, w, top) => `<div class="abs" style="left:${x}px; top:${top + i * 84}px; width:${w}px; font-size:31px; line-height:1.25; display:flex; gap:18px"><b style="width:84px; flex:none; color:#8A6FD0">${id}${i + 1}</b><span>${esc(txt)}</span></div>`;
      return `
    <div class="abs" data-part="rf" style="left:0;top:0;width:1920px;height:1080px"><div class="abs" style="left:120px; top:176px; font-size:30px; font-weight:700" ><span class="hl-blue">Requisitos funcionales</span></div>${rf.map((t, i) => row('RF', t, i, 120, 780, 236)).join('')}</div>
    <div class="abs" data-part="rnf" style="left:0;top:0;width:1920px;height:1080px"><div class="abs" style="left:1000px; top:176px; font-size:30px; font-weight:700"><span class="hl-mint">Requisitos no funcionales</span></div>${rnf.map((t, i) => row('RNF', t, i, 1000, 800, 236)).join('')}</div>
    <div class="abs" data-part="com1" style="left:120px; top:720px; width:780px; font-size:34px; line-height:1.3"><b class="hl-lilac">Entre nodos:</b> latencia y fallos parciales → protocolo simple y latido.</div>
    <div class="abs" data-part="com2" style="left:1000px; top:720px; width:800px; font-size:34px; line-height:1.3"><b class="hl-peach">Entre hilos:</b> paso de mensajes, sin condiciones de carrera; el hilo principal queda libre.</div>`;
    }
    case 'assump': {
      const rows = [
        ['Los nodos fallan por parada', 'Basta detectar el cierre de la conexión o la falta de latidos.'],
        ['Las tareas son idempotentes', 'Entrega «al menos una vez»: reasignar sin riesgo.'],
        ['TCP en orden · un solo equipo · coordinador activo', 'Protocolo sin numeración; el coordinador es punto único de falla.'],
      ];
      return `
    <div class="abs" data-part="head" style="left:120px; top:170px; width:1680px; display:flex; gap:60px; font-size:26px; font-weight:700; color:#60646D"><div style="width:700px">SUPUESTO</div><div style="width:880px">CONSECUENCIA EN EL DISEÑO</div></div>
    ${rows.map((r, i) => `<div class="abs" data-part="s${i + 1}" style="left:120px; top:${240 + i * 150}px; width:1680px; display:flex; gap:60px; font-size:36px; line-height:1.25"><div style="width:700px; font-weight:700">${esc(r[0])}</div><div style="width:880px" class="soft">${esc(r[1])}</div></div>`).join('')}
    <div class="abs" data-part="tools" style="left:120px; top:730px; width:1680px; font-size:38px; line-height:1.35"><b class="hl-mint">Herramientas</b>&nbsp; Node.js nativo: <span class="mono" style="font-size:32px">net · http · worker_threads · child_process · node:test</span></div>
    <div class="abs" data-part="tools2" style="left:120px; top:860px; width:1680px; font-size:38px; line-height:1.35"><b class="hl-lilac">Documentación</b>&nbsp; Diagramas en SVG → PDF · código en Git y GitHub</div>`;
    }
    case 'code': {
      const code = [
        '#pump() {',
        '  while (this.queue.length) {',
        '    const target = this.strategy.pick(nodes);',
        '    if (!target) return;   // sin cupo: contrapresión',
        '    const job = this.queue.shift();',
        '    job.attempts++;',
        '    target.inflight++;',
        "    send(target.socket, { t: 'run', jobId: job.id,",
        '                          payload: job.payload });',
        '  }',
        '}',
      ];
      const lh = 50, top = 190, left = 120, pad = 30;
      return `
    <div class="abs panel" data-part="code" style="left:${left}px; top:${top}px; width:1200px; height:${code.length * lh + pad * 2}px"></div>
    <div class="abs" data-part="l-pick" style="left:${left + 10}px; top:${top + pad + 2 * lh}px; width:1180px; height:${lh}px; background:#F6EBB5; border-radius:8px"></div>
    <div class="abs" data-part="l-return" style="left:${left + 10}px; top:${top + pad + 3 * lh}px; width:1180px; height:${lh}px; background:#CBEBDC; border-radius:8px"></div>
    <div class="abs mono" data-part="code" style="left:${left + pad}px; top:${top + pad}px; font-size:29px; line-height:${lh}px; white-space:pre; color:#2F3137">${code.map(esc).join('\n')}</div>
    <div class="abs" data-part="msgs" style="left:1380px; top:190px; width:420px">
      <div style="font-size:28px; font-weight:700; color:#60646D; margin-bottom:12px">MENSAJES (NDJSON / TCP)</div>
      ${[['register', 'el nodo se anuncia'], ['hb', 'latido cada 500 ms'], ['run', 'el coordinador asigna'], ['result', 'el nodo responde']].map(([a, b]) => `<div style="margin-bottom:22px"><div class="mono" style="font-size:34px; font-weight:700; color:#6A52B3">${a}</div><div style="font-size:30px" class="soft">${b}</div></div>`).join('')}
    </div>
    <div class="abs" data-part="pool" style="left:120px; top:840px; width:1680px; font-size:46px; font-weight:700; letter-spacing:-0.02em"><span class="hl-mint">Pool de hilos de tamaño fijo</span> · los errores de una tarea viajan como datos</div>`;
    }
    case 'term': {
      const demoLines = demoTxt.map((l) => esc(l));
      const lh = 36;
      return `
    <div class="abs panel mono" data-part="demo-cmd" style="left:120px; top:150px; width:1680px; height:${(demoLines.length + 2) * lh + 40}px"></div>
    <div class="abs mono" data-part="demo-cmd" style="left:156px; top:172px; font-size:28px; line-height:${lh}px; color:#6A52B3">$ npm run demo</div>
    <div class="abs mono" data-part="demo-out" style="left:156px; top:${172 + lh}px; font-size:28px; line-height:${lh}px; white-space:pre">${demoLines.join('\n')}</div>
    <div class="abs panel" data-part="test-cmd" style="left:120px; top:${150 + (demoLines.length + 2) * lh + 50}px; width:1680px; height:${(testTxt.length + 2) * lh + 20}px"></div>
    <div class="abs mono" data-part="test-cmd" style="left:156px; top:${150 + (demoLines.length + 2) * lh + 72}px; font-size:28px; line-height:${lh}px; color:#6A52B3">$ npm test</div>
    <div class="abs mono" data-part="test-out" style="left:156px; top:${150 + (demoLines.length + 2) * lh + 72 + lh}px; font-size:28px; line-height:${lh}px; white-space:pre">${testTxt.map((l) => esc(l).replace(/^✔/, '<span style="color:#3E9A78">✔</span>')).join('\n')}</div>
    <div class="abs" data-part="bug" style="left:120px; top:150px; width:1680px; height:${(demoLines.length + 2) * lh + 40}px; background:#FFFFFF; display:flex; align-items:center"><div style="font-size:54px; font-weight:700; letter-spacing:-0.02em; line-height:1.25"><span class="hl-rose">Defecto real hallado por una prueba:</span><br/>una tarea inválida destruía el hilo<br/>y dejaba el pool sin capacidad.</div></div>`;
    }
    case 'summary': {
      const rows = [
        ['rnf1', 'Escalabilidad', 'Eficiencia ≥ 60 % con 4 nodos', '68 %'],
        ['rnf2', 'Robustez', '0 tareas perdidas ante una caída', '900 de 900 completadas'],
        ['rnf3', 'Eficiencia', 'p95 ≤ 1 s con 128 clientes', '833 ms (base: 1.321 ms)'],
        ['rnf4', 'Acoplamiento y observabilidad', 'Nodos aislados; p50, p95, p99 y reparto', 'Reportados en cada corrida'],
        ['rf', 'Requisitos funcionales', 'RF1 a RF5', '8 de 8 pruebas en verde'],
      ];
      return `
    <div class="abs" data-part="head" style="left:120px; top:170px; width:1680px; font-size:26px; font-weight:700; color:#60646D; display:flex"><div style="width:560px">REQUISITO</div><div style="width:560px">META</div><div style="width:480px">MEDIDO</div></div>
    ${rows.map((r, i) => `<div class="abs" data-part="${r[0]}" style="left:120px; top:${232 + i * 150}px; width:1680px; display:flex; align-items:center; font-size:35px; line-height:1.25"><div style="width:560px; font-weight:700; padding-right:30px">${esc(r[1])}</div><div style="width:560px; padding-right:30px" class="soft">${esc(r[2])}</div><div style="width:480px; font-weight:700; padding-right:20px"><span class="hl-mint">${esc(r[3])}</span></div><div style="width:80px; font-size:60px; color:#3E9A78; font-weight:700">✓</div></div>`).join('')}`;
    }
    case 'closing':
      return `
    <div class="abs" data-part="k1" style="left:120px; top:190px; width:1680px; font-size:56px; font-weight:700; letter-spacing:-0.02em; line-height:1.25"><span class="hl-lilac">Los diagramas describen lo que el prototipo hace;</span><br/><span class="hl-lilac">los patrones resolvieron problemas medibles.</span></div>
    <div class="abs" data-part="k2" style="left:120px; top:420px; width:1680px; font-size:56px; font-weight:700; letter-spacing:-0.02em; line-height:1.25"><span class="hl-mint">Escala ×2,72 con 4 nodos, tolera la caída de un nodo,</span><br/><span class="hl-mint">y mejoró 37 % su latencia midiendo, no adivinando.</span></div>
    <div class="abs" data-part="k3" style="left:120px; top:650px; width:1680px; font-size:44px; font-weight:500; line-height:1.3; color:#4A4E57">Futuro: cola persistente · coordinador de respaldo con elección de líder · autenticación entre componentes · pruebas en varias máquinas.</div>
    <div class="abs mono" data-part="repo" style="left:120px; top:900px; font-size:46px; font-weight:700"><span class="hl-blue">github.com/KIWITECK/tejiendo-redes</span></div>`;
  }
  return '';
}

function sceneFile(sc) {
  const body = kindBody(sc);
  const present = new Set([...body.matchAll(/data-part="([^"]+)"/g)].map((m) => m[1]));
  const showTitle = sc.title && sc.kind !== 'intro';
  const extra = sc.kind === 'intro'
    ? `tl.to('#${sc.id}-wrap .wh', { strokeDashoffset: -0.1, duration: 2.4, stagger: 0.25, ease: 'power2.inOut' }, 0.4);
       tl.to('#${sc.id}-wrap .wv', { strokeDashoffset: -0.1, duration: 2.4, stagger: 0.25, ease: 'power2.inOut' }, 1.0);
       tl.to('#${sc.id}-wrap .wn', { opacity: 1, duration: 0.5, stagger: { each: 0.06, from: 'center' }, ease: 'power2.out' }, 3.0);`
    : sc.kind === 'term'
      ? `tl.to('#${sc.id}-wrap [data-part="demo-cmd"], #${sc.id}-wrap [data-part="demo-out"]', { opacity: 0, duration: 0.5 }, ${sc.times[3].toFixed(2)} - 0.2);
         tl.to('#${sc.id}-wrap [data-part="test-cmd"], #${sc.id}-wrap [data-part="test-out"]', { opacity: 0, duration: 0.5 }, ${sc.times[3].toFixed(2)} - 0.2);`
      : '';
  return `<template>
  <style>${CSS}</style>
  <div id="root" data-composition-id="${sc.id}" data-width="1920" data-height="1080">
    <div class="wrap" id="${sc.id}-wrap">
     <div class="wrap" id="${sc.id}-zoom">
      ${showTitle ? `<div class="ttl" id="${sc.id}-ttl">${esc(sc.title)}</div>` : `<div class="ttl" id="${sc.id}-ttl" style="opacity:0"></div>`}
      ${body}
     </div>
    </div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${fadeJS(sc.id, sc.dur, sc.kind === 'intro')}
    ${revealJS(sc, present)}
    tl.fromTo('#${sc.id}-zoom', { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.035, duration: ${sc.dur.toFixed(2)}, ease: 'none' }, 0);
    ${sc.kind === 'intro' ? `tl.set('#${sc.id}-wrap [data-part="title"]', { opacity: 1, y: 0 }, 0.001);` : ''}
    ${extra}
    window.__timelines["${sc.id}"] = tl;
  </script>
</template>
`;
}

// ---------- escritura ----------
mkdirSync(here + 'hf/compositions', { recursive: true });
mkdirSync(here + 'hf/assets', { recursive: true });
for (const sc of sched) writeFileSync(`${here}hf/compositions/${sc.id}.html`, sceneFile(sc));
const hosts = sched.map((sc, i) => `      <div id="${sc.id}" class="clip" data-composition-id="${sc.id}" data-composition-src="compositions/${sc.id}.html" data-start="${sc.start.toFixed(3)}" data-duration="${sc.dur.toFixed(3)}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`).join('\n');
writeFileSync(here + 'hf/index.html', `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Tejiendo redes</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #ffffff; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL.toFixed(3)}" data-width="1920" data-height="1080">
${hosts}
      <audio id="narration" class="clip" src="assets/narration.wav" data-start="0" data-duration="${TOTAL.toFixed(3)}" data-track-index="0" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
console.log(`escenas: ${sched.length}, duración total ${(TOTAL / 60).toFixed(2)} min (${TOTAL.toFixed(1)} s)`);
