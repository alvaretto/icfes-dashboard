// verificar_pdf.mjs: comprueba el PDF generado contra el sitio publicado.
// Uso: npm run verificar [-- archivo.pdf]   (por defecto, el Informe-ICFES-2026-*.pdf más reciente)
// Criterios: Carta y etiquetado; las 4 familias tipográficas incrustadas; tantas gráficas como el
// exportador convirtió (reporte-generacion.json); índice estable entre pasadas; y que cada cifra
// decimal visible en el sitio aparezca en el texto del PDF (ninguna se reescribe).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const pdf = process.argv[2] || fs.readdirSync('.').filter(f => /^Informe-ICFES-2026-.*\.pdf$/.test(f)).sort().pop();
if (!pdf) { console.error('No hay PDF que verificar: corre antes npm run pdf'); process.exit(2); }
const sh = (cmd, args) => execFileSync(cmd, args, { maxBuffer: 1 << 28 }).toString();
const fallos = [];

const info = sh('pdfinfo', [pdf]);
const paginas = +(info.match(/Pages:\s+(\d+)/) || [])[1];
if (!/612 x 792/.test(info)) fallos.push('el tamaño de página no es Carta');
if (!/Tagged:\s+yes/.test(info)) fallos.push('el PDF no está etiquetado');

const fuentes = sh('pdffonts', [pdf]);
for (const fam of ['InstrumentSerif', 'Geist', 'JetBrainsMono', 'SourceSerif4']) if (!fuentes.includes(fam)) fallos.push('falta la fuente ' + fam);
const sinIncrustar = fuentes.split('\n').slice(2).filter(l => l.trim()).filter(l => { const m = l.match(/\b(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$/); return !m || m[1] !== 'yes'; });
if (sinIncrustar.length) fallos.push('fuentes sin incrustar: ' + sinIncrustar.length);

const imagenes = sh('pdfimages', ['-list', pdf]).split('\n').slice(2).filter(l => l.trim().split(/\s+/)[2] === 'image').length; // columna «type»: image (no smask)
let esperadas = null, indiceOK = null;
if (fs.existsSync('reporte-generacion.json')) {
  const rep = JSON.parse(fs.readFileSync('reporte-generacion.json', 'utf8'));
  if (rep.salida !== pdf) fallos.push('reporte-generacion.json corresponde a ' + rep.salida + ', no a ' + pdf);
  esperadas = rep.canvasConvertidos + rep.grupos.reduce((a, g) => a + g.imgs, 0);
  if (imagenes !== esperadas) fallos.push('imágenes ' + imagenes + ' ≠ esperadas ' + esperadas);
  indiceOK = rep.indice.every(e => e.pagina && e.coincide);
  if (!indiceOK) fallos.push('el índice no quedó estable entre pasadas');
} else fallos.push('falta reporte-generacion.json');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
await page.goto('https://alvaretto.github.io/icfes-dashboard/?pdf=' + Date.now() + '#todo', { waitUntil: 'networkidle' });
const sitio = await page.evaluate(() => {
  document.querySelectorAll('.modnav,.s26-subnav,.s26-tools,.cmp-header,.cmp-rail,.skip-link').forEach(e => e.remove());
  return (document.querySelector('#main-content') || document.body).innerText;
});
await browser.close();
const tok = s => [...new Set((s.match(/[−-]?\d{1,3}(?:\.\d{3})*,\d+/g) || []).map(x => x.replace('−', '-')))];
const enPdf = new Set(tok(sh('pdftotext', ['-enc', 'UTF-8', pdf, '-'])));
const cifras = tok(sitio);
const faltan = cifras.filter(x => !enPdf.has(x));
if (faltan.length) fallos.push(faltan.length + ' cifras del sitio no aparecen en el PDF: ' + faltan.slice(0, 10).join(' '));

console.log(JSON.stringify({ pdf, paginas, imagenes, esperadas, indiceOK, cifrasDelSitio: cifras.length, cifrasFaltantes: faltan.length }, null, 2));
if (fallos.length) { console.error('FALLOS:\n- ' + fallos.join('\n- ')); process.exit(1); }
console.log('OK: el PDF pasa todas las verificaciones.');
