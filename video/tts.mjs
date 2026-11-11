// Genera la narración con la voz clonada de David (VoiceStudio, API local). Reanuda: omite trozos ya generados.
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { escenas } from './escenas.mjs';

const API = 'http://127.0.0.1:3900/generate';
const manifestPath = new URL('./audio/manifest.json', import.meta.url).pathname;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath)) : {};
let done = 0, total = escenas.reduce((n, s) => n + s.chunks.length, 0);
for (const sc of escenas) {
  for (let i = 0; i < sc.chunks.length; i++) {
    const key = `${sc.id}-${i}`;
    const file = new URL(`./audio/${key}.wav`, import.meta.url).pathname;
    if (manifest[key] && existsSync(file) && manifest[key].tts === sc.chunks[i].tts) { done++; continue; }
    const form = new FormData();
    form.set('text', sc.chunks[i].tts);
    form.set('profile_id', 'acb7d3c3');
    form.set('language', 'es');
    form.set('num_step', '16');
    form.set('seed', '7');
    let res;
    for (let attempt = 1; attempt <= 3; attempt++) {
      res = await fetch(API, { method: 'POST', body: form });
      if (res.ok) break;
      console.error(key, 'falló', res.status, 'intento', attempt);
    }
    if (!res.ok) throw new Error(`No se pudo generar ${key}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    manifest[key] = { tts: sc.chunks[i].tts, dur: Number(res.headers.get('x-audio-duration')) };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
    done++;
    console.log(`${done}/${total} ${key} ${manifest[key].dur}s`);
  }
}
console.log('listo', Object.values(manifest).reduce((a, m) => a + m.dur, 0).toFixed(1), 's de audio');
