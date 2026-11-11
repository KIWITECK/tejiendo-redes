// Mini-kit para dibujar figuras SVG: trazo fino, paleta pastel, sin decoración.
export const C = {
  blue:   ['#EEF5FB', '#8DB7DD'],
  mint:   ['#EBF7F1', '#82C7A9'],
  peach:  ['#FEF2EA', '#EBA783'],
  lilac:  ['#F3EEFB', '#AE9BD9'],
  rose:   ['#FDEFF2', '#E39EB0'],
  butter: ['#FCF8E6', '#D9C26C'],
  gray:   ['#F7F7F8', '#B8B8BE'],
};
export const INK = '#2F3137';
export const SOFT = '#6B6F78';
export const LINE = '#8A8E98';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function text(x, y, s, o = {}) {
  const { size = 11, anchor = 'middle', weight, italic, fill = INK, halo } = o;
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}"${weight ? ` font-weight="${weight}"` : ''}${italic ? ' font-style="italic"' : ''} fill="${fill}"${halo ? ' stroke="#fff" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"' : ''}>${esc(s)}</text>`;
}

/** Rectángulo redondeado con líneas de texto centradas. lines[0] en negrita si o.title. */
export function box(x, y, w, h, color, lines = [], o = {}) {
  const [fill, stroke] = C[color];
  const { size = 11, title = true, rx = 7, dash, sw = 1.1 } = o;
  const lh = size + 3.5;
  const total = lines.length * lh;
  const y0 = y + (h - total) / 2 + size - 1;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  lines.forEach((l, i) => {
    const first = i === 0 && title;
    out += text(x + w / 2, y0 + i * lh, l, { size: first ? size : size - 0.5, weight: first ? 700 : undefined, fill: first ? INK : SOFT, italic: !first && /^«/.test(l) });
  });
  return out;
}

export function arrow(d, o = {}) {
  const { dash, id, color = LINE, start } = o;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.1"${dash ? ' stroke-dasharray="4 3"' : ''} marker-end="url(#${id}ar)"${start ? ` marker-start="url(#${id}ar)"` : ''}/>`;
}

export const defs = (id) => `<defs><marker id="${id}ar" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M1.5 1.5 L8.5 5 L1.5 8.5" fill="none" stroke="${LINE}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;

export const svg = (id, w, h, label, body) =>
  `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}" font-family="Arial, Helvetica, sans-serif">${defs(id)}${body}</svg>`;

export const hline = (x1, y1, x2, y2, color = '#E3E4E8', dash) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
export const rect = (x, y, w, h, color, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 4}" fill="${C[color][0]}" stroke="${C[color][1]}" stroke-width="${o.sw ?? 1}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
