// limpiar_marcadores.mjs: corrige los títulos de marcadores que Chromium arma mal en el PDF.
//  (1) Duplicación «A A B B» en títulos que quedaron dentro de cajas indivisibles (relayout).
//  (2) Palabras unidas donde el título tenía un salto de línea (<br>).
// Regla conservadora: solo se reemplaza un título si, sin espacios, coincide con un título real del DOM.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const sinEsp = s => s.replace(/\s+/g, '');

function deduplicar(t) {
  const m = t.match(/^(\d{2})\s+(.*)$/);
  const num = m ? m[1] + ' ' : '';
  const R = m ? m[2] : t;
  for (let k = 1; 2 * k <= R.length; k++) {
    const A = R.slice(0, k);
    if (R.slice(k, 2 * k) !== A) continue;
    const resto = R.slice(2 * k);
    if (resto.length % 2) continue;
    const B = resto.slice(0, resto.length / 2);
    if (resto.slice(resto.length / 2) !== B) continue;
    return num + A + B;
  }
  return null;
}

export function limpiarMarcadores(pdf, titulosDom) {
  const J = JSON.parse(execFileSync('qpdf', ['--json=2', '--json-key=qpdf', '--json-stream-data=none', pdf], { maxBuffer: 1 << 30 }).toString());
  const objs = J.qpdf[1];
  const porSinEsp = new Map(titulosDom.map(t => [sinEsp(t), t]));
  const cambios = {};
  const informe = [];
  for (const [k, v] of Object.entries(objs)) {
    const d = v && v.value;
    if (!d || typeof d !== 'object' || !('/Title' in d) || !('/Parent' in d)) continue;
    const crudo = String(d['/Title']);
    if (!crudo.startsWith('u:')) { informe.push([crudo, null]); continue; }
    const t = crudo.slice(2);
    let limpio = porSinEsp.get(sinEsp(t));
    if (!limpio) { const dd = deduplicar(t); if (dd) limpio = porSinEsp.get(sinEsp(dd)); }
    if (limpio && limpio !== t) { cambios[k] = { value: { ...d, '/Title': 'u:' + limpio } }; informe.push([t, limpio]); }
    else if (!limpio) informe.push([t, null]);
  }
  if (Object.keys(cambios).length) {
    fs.writeFileSync('marcadores-parche.json', JSON.stringify({ qpdf: [J.qpdf[0], cambios] }));
    execFileSync('qpdf', [pdf, '--update-from-json=marcadores-parche.json', pdf + '.tmp']);
    fs.renameSync(pdf + '.tmp', pdf);
    fs.rmSync('marcadores-parche.json', { force: true });
  }
  return { corregidos: informe.filter(x => x[1]).length, sinCoincidencia: informe.filter(x => !x[1]).map(x => x[0]) };
}
