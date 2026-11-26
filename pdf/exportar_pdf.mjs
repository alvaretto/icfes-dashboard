// exportar_pdf.mjs: genera el PDF de la vista #todo del dashboard ICFES.
// Uso: npm run pdf (dentro de pdf/). Commit y fecha salen de origin/main; se pueden forzar con COMMIT y COMMIT_FECHA.
// Documentación: LEEME.md (en esta carpeta) y la sección «Versión PDF» del README del repo.
// No toca el repositorio: todo el ajuste de impresión se inyecta en tiempo de ejecución.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { limpiarMarcadores } from './limpiar_marcadores.mjs';

const SCALE = 0.85;                       // 9,6 pt el cuerpo y 8,3 pt las notas en papel
const CONTENT_W = 800;                    // (215,9 mm − 2×18 mm) = 680 px reales → 800 px CSS a 0,85
const VIEW_W = 960;                       // ancho de página en px CSS a 0,85 (el que ven las media queries)
const PAGE_H = Math.floor(1056 / SCALE) - 2;  // alto de la portada a sangre (px CSS)
const PAGE_BODY_H = Math.floor((1056 - 2 * 68) / SCALE); // alto útil de las páginas interiores (px CSS)
const git = args => { try { return execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const COMMIT = process.env.COMMIT || git(['rev-parse', '--short', 'origin/main']) || 'sin-dato';
const COMMIT_FECHA = process.env.COMMIT_FECHA || git(['log', '-1', '--format=%cs', 'origin/main']);
const HOY = new Date();
const ISO = HOY.toLocaleDateString('sv-SE'); // fecha local AAAA-MM-DD
const OUT = process.env.OUT || 'Informe-ICFES-2026-' + ISO + '.pdf';
const SITIO = 'https://alvaretto.github.io/icfes-dashboard/';
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fechaLarga = iso => { const [a, m, d] = iso.split('-').map(Number); return d + ' de ' + MESES[m - 1] + ' de ' + a; };

// Grupos de pestañas: cada estado se apila en un mosaico. tabs: exterior primero.
const GRUPOS = [
  { tabs: ['#s26-niv-tabs'], cols: 1 },
  { tabs: ['#s26-anios-tabs'], cols: 2 },
  { tabs: ['#s26-grp-tabs'], cols: 2 },
  { tabs: ['#grpfase-tabs'], cols: 2 },
  { tabs: ['#grp-tabs', '#nivfase-tabs'], cols: 2 },
  { tabs: ['#momentum-tabs'], cols: 2 },
];

const log = (...a) => console.log('[pdf]', ...a);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VIEW_W, height: 1200 }, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'es-CO' });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', e => errores.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });

await page.goto(SITIO + '?pdf=' + Date.now() + '#todo', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const anim = await page.evaluate(() => (window.Chart ? String(Chart.defaults.animation) : 'sin Chart'));
log('Chart.defaults.animation =', anim);

// 1) Hoja de estilo de captura (pantalla e impresión): ancho exacto del papel y sin UI web.
await page.addStyleTag({ content: [
  'body{margin:0!important}',
  '.modnav,.modnav-toggle,.skip-link,.cmp-header,.s26-subnav,.s26-tools,.s26-chips{display:none!important}',
  '.container{width:' + CONTENT_W + 'px!important;max-width:' + CONTENT_W + 'px!important;margin:0!important;padding:0!important}',
].join('\n') });
await page.waitForTimeout(800);

// Utilidades dentro de la página.
await page.evaluate(() => {
  const h = s => { let x = 5381; for (let i = 0; i < s.length; i += 7) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36) + ':' + s.length; };
  const nodo = (P, ruta) => ruta.split('.').reduce((e, i) => e && e.children[+i], P);
  window.__pdf = {
    h, nodo,
    firma(el, cache) {
      let s = el.tagName + '|' + (el.innerText || '').replace(/\s+/g, ' ');
      const cs = el.tagName === 'CANVAS' ? [el] : [...el.querySelectorAll('canvas')];
      for (const c of cs) { if (!cache.has(c)) cache.set(c, h(c.toDataURL())); s += '|' + cache.get(c); }
      return h(s);
    },
    img(c) {
      const img = document.createElement('img');
      img.src = c.toDataURL('image/png');
      img.alt = c.getAttribute('aria-label') || '';
      const w = Math.round(c.getBoundingClientRect().width);
      img.style.cssText = 'display:block;width:' + w + 'px;max-width:100%;height:auto';
      img.className = 'pdf-chart';
      return img;
    },
    clonar(el) {
      if (el.tagName === 'CANVAS') return this.img(el).outerHTML;
      const cl = el.cloneNode(true);
      const o = [...el.querySelectorAll('canvas')], k = [...cl.querySelectorAll('canvas')];
      o.forEach((c, i) => k[i].replaceWith(this.img(c)));
      cl.removeAttribute('id'); cl.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      return cl.outerHTML;
    },
  };
});

const producto = listas => listas.reduce((acc, l) => acc.flatMap(a => l.map(x => [...a, x])), [[]]);

async function procesarGrupo(g, gi) {
  const info = await page.evaluate(({ g, gi }) => {
    const T = g.tabs.map(s => document.querySelector(s));
    if (T.some(t => !t)) return { error: 'no encontrado: ' + g.tabs.join(',') };
    const ultimo = T.reduce((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? b : a);
    const P = ultimo.parentElement;
    P.setAttribute('data-pdf-grupo', gi);
    const desde = [...P.children].indexOf(ultimo) + 1;
    const botones = T.map(t => [...t.querySelectorAll('button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
    const activos = T.map(t => Math.max(0, [...t.querySelectorAll('button')].findIndex(b => b.getAttribute('aria-selected') === 'true' || b.classList.contains('active'))));
    const raiz = [...P.children].slice(desde).map((_, i) => String(desde + i));
    return { botones, activos, raiz };
  }, { g, gi });
  if (info.error) throw new Error(info.error);
  const combos = producto(info.botones.map(bs => bs.map((_, i) => i)));
  const clic = async combo => {
    await page.evaluate(({ g, combo }) => g.tabs.forEach((s, k) => document.querySelectorAll(s + ' button')[combo[k]].click()), { g, combo });
    await page.waitForTimeout(300);
  };
  // Pasada A: firmas por ruta (hasta 4 niveles) en cada estado.
  const firmas = [];
  for (const c of combos) {
    await clic(c);
    firmas.push(await page.evaluate(({ gi, raiz }) => {
      const P = document.querySelector('[data-pdf-grupo="' + gi + '"]');
      const out = {}, cache = new Map();
      const rec = (ruta, el, d) => {
        out[ruta] = __pdf.firma(el, cache); out[ruta + '#n'] = el.children.length; out[ruta + '#v'] = el.classList.contains('viz'); out[ruta + '#t'] = (el.innerText || '').trim().length; out[ruta + '#g'] = el.tagName;
        if (d < 4) [...el.children].forEach((k, i) => rec(ruta + '.' + i, k, d + 1));
      };
      raiz.forEach(r => rec(r, __pdf.nodo(P, r), 0));
      return out;
    }, { gi, raiz: info.raiz }));
  }
  const cambia = p => new Set(firmas.map(f => f[p])).size > 1;
  const existe = p => firmas.every(f => p in f);
  const hijos = p => { const n = firmas.map(f => f[p + '#n']); return new Set(n).size === 1 ? [...Array(n[0]).keys()].map(i => p + '.' + i) : null; };
  // Unidad = lo que cambia entre estados. Cada tarjeta .viz es su propia unidad; los hermanos
  // consecutivos que no son tarjetas (p. ej. filas de barras) van juntos. Si una unidad contiene
  // algo fijo con texto (nota, recuadro), se baja un nivel para no repetirlo en cada celda.
  const esViz = p => !!firmas[0][p + '#v'];
  const atomico = p => ['TABLE', 'UL', 'OL', 'SVG', 'FIGURE', 'DETAILS'].includes(firmas[0][p + '#g']);
  const fijoSustancial = p => Object.keys(firmas[0]).some(k => k.startsWith(p + '.') && !k.includes('#') && existe(k) && !cambia(k) && Math.min(...firmas.map(f => f[k + '#t'])) >= 40);
  const unidades = [];
  const proc = rutas => {
    let corrida = [];
    const cerrar = () => {
      if (!corrida.length) return;
      const c = corrida; corrida = [];
      if (c.length === 1) {
        const hs = hijos(c[0]);
        if (!atomico(c[0]) && hs && hs.length > 1 && hs.every(existe) && fijoSustancial(c[0])) return proc(hs);
      }
      unidades.push(c);
    };
    for (const p of rutas) {
      if (existe(p) && !cambia(p)) { cerrar(); continue; }
      if (esViz(p)) { cerrar(); corrida.push(p); cerrar(); continue; }
      corrida.push(p);
    }
    cerrar();
  };
  proc(info.raiz);
  // Pasada B: captura de cada unidad en cada estado, al ancho de celda.
  const celdaW = g.cols === 1 ? CONTENT_W : Math.floor((CONTENT_W - 16 * (g.cols - 1)) / g.cols);
  await page.evaluate(({ gi, w }) => { const P = document.querySelector('[data-pdf-grupo="' + gi + '"]'); P.dataset.pdfW = P.style.width; P.style.width = w + 'px'; }, { gi, w: celdaW });
  await page.waitForTimeout(700);
  const capturas = unidades.map(() => []);
  for (const c of combos) {
    await clic(c);
    const htmls = await page.evaluate(({ gi, unidades }) => {
      const P = document.querySelector('[data-pdf-grupo="' + gi + '"]');
      return unidades.map(u => u.map(r => __pdf.clonar(__pdf.nodo(P, r))).join(''));
    }, { gi, unidades });
    htmls.forEach((x, i) => capturas[i].push(x));
  }
  // Estado por defecto, ancho normal y sustitución por mosaicos (de atrás hacia adelante).
  await clic(info.activos);
  await page.evaluate(({ gi }) => { const P = document.querySelector('[data-pdf-grupo="' + gi + '"]'); P.style.width = P.dataset.pdfW || ''; }, { gi });
  await page.waitForTimeout(700);
  const etiquetas = combos.map(c => c.map((i, k) => info.botones[k][i]).join(' · '));
  await page.evaluate(({ g, gi, unidades, capturas, etiquetas }) => {
    const P = document.querySelector('[data-pdf-grupo="' + gi + '"]');
    for (let u = unidades.length - 1; u >= 0; u--) {
      const els = unidades[u].map(r => __pdf.nodo(P, r));
      const m = document.createElement('div');
      m.className = 'pdf-mosaic'; m.style.setProperty('--cols', g.cols);
      m.innerHTML = capturas[u].map((html, i) => '<figure class="pdf-cell"><figcaption>' + etiquetas[i] + '</figcaption>' + html + '</figure>').join('');
      els[0].before(m); els.forEach(e => e.remove());
    }
    g.tabs.forEach(s => document.querySelector(s).classList.add('pdf-oculto'));
  }, { g, gi, unidades, capturas, etiquetas });
  return { tabs: g.tabs.join('×'), estados: combos.length, unidades: unidades.map(u => u.join('+')), imgs: await page.evaluate(gi => document.querySelectorAll('[data-pdf-grupo="' + gi + '"] .pdf-mosaic img').length, gi) };
}

const informeGrupos = [];
for (let i = 0; i < GRUPOS.length; i++) informeGrupos.push(await procesarGrupo(GRUPOS[i], i));
log('grupos', JSON.stringify(informeGrupos));

// 2) Resto del DOM: details abiertos, anclas, canvas → img, portada e índice.
const resumen = await page.evaluate(({ COMMIT, COMMIT_FECHA, HOY_TXT, PUB_TXT, PAGE_H, VIEW_W, CONTENT_W, PAGE_BODY_H }) => {
  document.querySelectorAll('details').forEach(d => { d.open = true; });
  document.querySelectorAll('.section[data-mod]').forEach(s => { if (!s.id) s.id = /^\d+$/.test(s.dataset.mod) ? 'mod-' + s.dataset.mod : s.dataset.mod; });
  document.querySelectorAll('a[data-go]').forEach(a => { const go = a.dataset.go; a.setAttribute('href', go === 'all' ? '#pdf-indice' : (/^\d+$/.test(go) ? '#mod-' + go : '#' + go)); });
  const mast = document.querySelector('.masthead'); if (mast) mast.id = mast.id || 'pdf-presentacion';
  const nota = document.querySelector('.footnote'); if (nota) nota.id = nota.id || 'pdf-nota';
  // canvas → img (los que no quedaron en mosaicos)
  const canv = [...document.querySelectorAll('canvas')];
  canv.forEach(c => c.replaceWith(__pdf.img(c)));
  // Cajas que no deben partirse, salvo las más altas que una página.
  const keep = '.viz,.s26-callout,.finding,.kpi,.card,figure,.s26-brow,.numbers>*,blockquote,.s26-sencillo,.pull,.quote';
  document.querySelectorAll(keep).forEach(e => { if (e.getBoundingClientRect().height > PAGE_BODY_H * 0.92) e.classList.add('pdf-partible'); });
  // Una tarjeta más alta que una página empieza en página nueva (evita cabeceras huérfanas con la caja vacía).
  const primerS26 = document.querySelector('.s26-block');
  document.querySelectorAll('table').forEach(tb => { if (tb.getBoundingClientRect().height > PAGE_BODY_H * 0.92) tb.classList.add('pdf-tabla-larga'); });
  document.querySelectorAll('.viz.pdf-partible, table.pdf-tabla-larga').forEach(v => {
    const blk = v.closest('.s26-block');
    if (blk) { if (blk !== primerS26) blk.classList.add('pdf-break'); return; }
    const sec = v.closest('.section');
    if (sec && v.getBoundingClientRect().top - sec.getBoundingClientRect().top > 700) v.classList.add('pdf-break');
  });

  // Títulos sin huérfanos: cada h3/h4 de los apartados 2026 se envuelve con su introducción y el
  // primer bloque que le sigue; si no caben juntos en una página, el apartado (h3) abre página.
  const alto = e => e.getBoundingClientRect().height;
  const esLead = e => /^(H3|H4|P)$/.test(e.tagName) || e.matches('.s26-tabs,.s26-tools,.s26-chips,.tabs,.s26-meta');
  const envolver = (els, clase) => { const w = document.createElement('div'); w.className = clase; els[0].before(w); els.forEach(e => w.appendChild(e)); };
  let envueltos = 0;
  document.querySelectorAll('.s26-block').forEach(blk => {
    const kids = [...blk.children];
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      if (!/^(H3|H4)$/.test(k.tagName)) continue;
      const lead = [k]; let j = i + 1;
      while (j < kids.length && esLead(kids[j]) && kids[j].tagName !== 'H3') lead.push(kids[j++]);
      const sig = kids[j];
      const hl = lead.reduce((a, e) => a + alto(e), 0) + 30;
      if (sig && hl + alto(sig) < PAGE_BODY_H * 0.9) { envolver([...lead, sig], 'pdf-keep'); i = j; }
      else { envolver(lead, 'pdf-keep pdf-lead'); if (k.tagName === 'H3' && blk !== primerS26 && sig) blk.classList.add('pdf-break'); i = j - 1; }
      envueltos++;
    }
  });
  // Marcadores limpios: fuera los textos solo-para-lector duplicados dentro de títulos y espacio en cada salto de línea.
  document.getElementById('vista-h1')?.remove();
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(hd => {
    hd.querySelectorAll('.s26-sr,.sr-only').forEach(s => s.remove());
    hd.querySelectorAll('br').forEach(br => br.before(document.createTextNode(' ')));
    hd.querySelectorAll('.s26-num').forEach(n => n.after(document.createTextNode(' ')));
  });
  const t = el => (el ? (el.innerText || el.textContent).replace(/\s+/g, ' ').trim() : '');
  const ent = [];
  if (mast) ent.push({ n: 0, k: 'Presentación', t: t(mast.querySelector('h1.title') || mast.querySelector('h1')), a: mast.id });
  for (const s of document.querySelectorAll('.section[data-mod]')) {
    const tag = t(s.querySelector('.section-tag')), h2 = t(s.querySelector('h2'));
    if (s.dataset.mod === '1') {
      ent.push({ n: 0, k: 'Examen oficial', t: h2, a: s.id });
      s.querySelectorAll('.s26-block').forEach(b => { const h3 = b.querySelector('.s26-h3'); const num = t(h3?.querySelector('.s26-num')); ent.push({ n: 1, num, t: t(h3).replace(num, '').trim(), a: b.id }); });
      const sep = document.getElementById('todo-simulacros');
      if (sep) ent.push({ n: 0, k: 'Preparación', t: t(sep.querySelector('h2')), a: sep.id });
    } else if (/^cmp/.test(s.dataset.mod)) {
      if (s.dataset.mod === 'cmp-12') ent.push({ n: 0, k: 'Comparativas', t: 'Comparativas escalonadas por fase', a: s.id, sinPag: true });
      ent.push({ n: 1, num: '', t: h2, k2: tag.replace(/^Comparativa escalonada\s*·\s*/i, ''), a: s.id });
    } else {
      const [rom, ...resto] = tag.split('·').map(x => x.trim());
      ent.push({ n: 1, num: rom, t: h2, k2: resto.join(' · '), a: s.id });
    }
  }
  if (nota) ent.push({ n: 0, k: 'Anexo', t: t(nota.querySelector('h3')) || 'Nota metodológica', a: nota.id });

  // Portada
  const cover = document.createElement('section');
  cover.className = 'pdf-cover';
  cover.innerHTML =
    '<div class="pdf-cover-top"><span>Informe de resultados</span><span>I.E. Pedacito de Cielo</span></div>' +
    '<div class="pdf-cover-main">' +
      '<p class="pdf-cover-kicker">Saber 11° · 2026</p>' +
      '<h1 class="pdf-cover-title">Saber 11°<br>2026</h1>' +
      '<p class="pdf-cover-sub"><em>resultados oficiales<br>y simulacros</em></p>' +
      '<p class="pdf-cover-lede">Resultados del examen Saber 11° 2026 de la institución y de los cuatro simulacros departamentales de preparación (febrero a mayo de 2026): por prueba, por grupo, por estudiante y frente a años anteriores.</p>' +
    '</div>' +
    '<dl class="pdf-cover-meta">' +
      '<div><dt>Fuente</dt><dd>Dashboard ICFES<br>alvaretto.github.io/icfes-dashboard</dd></div>' +
      '<div><dt>Versión publicada</dt><dd>commit ' + COMMIT + (PUB_TXT ? '<br>' + PUB_TXT : '') + '</dd></div>' +
      '<div><dt>Generado</dt><dd>' + HOY_TXT + '</dd></div>' +
    '</dl>';
  // Índice
  const toc = document.createElement('section');
  toc.className = 'pdf-toc'; toc.id = 'pdf-indice';
  toc.innerHTML = '<div class="pdf-toc-kicker">Contenido</div><h2 class="pdf-toc-title">Índice</h2><ol class="pdf-toc-list">' +
    ent.map((e, i) => '<li class="pdf-toc-l' + e.n + '"><a href="#' + e.a + '">' +
      (e.n === 0 ? '<span class="k">' + (e.k || '') + '</span>' : '<span class="num">' + (e.num || '') + '</span>') +
      '<span class="t">' + e.t + (e.k2 ? ' <small>' + e.k2 + '</small>' : '') + '</span><span class="dots"></span>' +
      '<span class="p" data-i="' + i + '">00</span></a></li>').join('') + '</ol>';
  document.body.prepend(toc);
  document.body.prepend(cover);
  document.title = 'Saber 11° 2026 · resultados oficiales y simulacros · I.E. Pedacito de Cielo';
  return { titulos: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => (h.innerText || h.textContent).replace(/\s+/g, ' ').trim()), envueltos, canvasConvertidos: canv.length, entradas: ent, lang: document.documentElement.lang, partibles: document.querySelectorAll('.pdf-partible').length };
}, { COMMIT, COMMIT_FECHA, HOY_TXT: fechaLarga(ISO), PUB_TXT: COMMIT_FECHA ? 'del ' + fechaLarga(COMMIT_FECHA) : '', PAGE_H, VIEW_W, CONTENT_W, PAGE_BODY_H });
log('títulos envueltos', resumen.envueltos, '· canvas convertidos', resumen.canvasConvertidos, '· entradas índice', resumen.entradas.length, '· lang', resumen.lang, '· cajas partibles', resumen.partibles);

// 3) CSS de impresión.
const mono = "'JetBrains Mono',monospace";
await page.addStyleTag({ content: String.raw`
@page{size:letter;margin:18mm;
  @top-left{content:"Saber 11° 2026 · resultados oficiales y simulacros";font:500 9pt ${mono};color:#655c4f;vertical-align:bottom;padding-bottom:4mm}
  @top-right{content:"I.E. Pedacito de Cielo";font:500 9pt ${mono};color:#655c4f;vertical-align:bottom;padding-bottom:4mm}
  @bottom-left{content:"alvaretto.github.io/icfes-dashboard · versión ${COMMIT}";font:9pt ${mono};color:#655c4f;vertical-align:top;padding-top:4mm}
  @bottom-right{content:"Página " counter(page) " de " counter(pages);font:700 9pt ${mono};color:#161512;vertical-align:top;padding-top:4mm}}
@page:first{margin:0;@top-left{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-right{content:none}}
html,body{background:#fff!important}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pdf-oculto,.cmp-rail{display:none!important}
.cmp-layout{display:block!important}
.section{margin-top:0!important}
.section[data-mod],.todo-sep,.footnote,.pdf-break{break-before:page}
.todo-sep{margin-top:0!important;padding-top:0!important;border-top:none!important}
.todo-sep+.section[data-mod="2"]{break-before:auto;margin-top:48px!important}
.viz,.s26-callout,.finding,.kpi,.card,figure,.s26-brow,.numbers>*,blockquote,.s26-sencillo,.pull,.quote,tr,.pdf-cell{break-inside:avoid}
.pdf-partible{break-inside:auto!important}
.pdf-keep{break-inside:avoid}
.pdf-lead{break-after:avoid}
h1,h2,h3,h4,.section-tag,.viz-head,.s26-h3,.s26-h4,.pdf-cell>figcaption,.s26-intro,.s26-h3+p,.s26-h3+p+p,.s26-h4+p{break-after:avoid}
p,li{orphans:3;widows:3}
thead{display:table-header-group}
.viz-canvas-wrap,div:has(>img.pdf-chart){height:auto!important;min-height:0!important}
img.pdf-chart{margin:0 auto}
/* Mosaico de estados */
.pdf-mosaic{grid-column:1/-1;display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:18px 16px;margin:8px 0 18px}
.pdf-cell{margin:0;min-width:0;border-top:1.5px solid var(--ink);padding-top:6px}
.pdf-cell>figcaption{font:700 11px ${mono};letter-spacing:.08em;text-transform:uppercase;color:var(--brick);margin:0 0 8px}
.pdf-cell table{font-size:11.5px}
/* Portada */
.pdf-cover{box-sizing:border-box;width:${VIEW_W}px;height:${PAGE_H}px;overflow:hidden;background:var(--paper);color:var(--ink);
  padding:84px 92px 80px;display:flex;flex-direction:column;break-after:page;border-left:14px solid var(--brick)}
.pdf-cover-top{display:flex;justify-content:space-between;font:500 13px ${mono};letter-spacing:.16em;text-transform:uppercase;color:var(--ink-soft);
  padding-bottom:16px;border-bottom:3px double var(--ink)}
.pdf-cover-main{margin-top:auto;margin-bottom:auto}
.pdf-cover-kicker{font:700 13px ${mono};letter-spacing:.18em;text-transform:uppercase;color:var(--brick);margin:0 0 18px}
.pdf-cover-title{font-family:'Instrument Serif',serif;font-weight:400;font-size:168px;line-height:.86;letter-spacing:-.025em;margin:0;color:var(--ink)}
.pdf-cover-sub{font-family:'Instrument Serif',serif;font-size:64px;line-height:.98;margin:18px 0 0;color:var(--brick)}
.pdf-cover-lede{font-family:'Source Serif 4',Georgia,serif;font-style:italic;font-size:21px;line-height:1.5;color:var(--ink-soft);max-width:620px;margin:40px 0 0}
.pdf-cover-meta{display:grid;grid-template-columns:1.35fr 1fr .8fr;gap:28px;margin:0;padding-top:18px;border-top:1.5px solid var(--ink)}
.pdf-cover-meta dt{font:700 11px ${mono};letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
.pdf-cover-meta dd{margin:0;font:400 15px/1.45 'Geist',sans-serif;color:var(--ink)}
/* Índice */
.pdf-toc{width:${CONTENT_W}px;break-after:page;color:var(--ink)}
.pdf-toc-kicker{font:700 12px ${mono};letter-spacing:.16em;text-transform:uppercase;color:var(--brick)}
.pdf-toc-title{font-family:'Instrument Serif',serif;font-weight:400;font-size:64px;line-height:1;margin:6px 0 22px;padding-bottom:14px;border-bottom:3px double var(--ink)}
.pdf-toc-list{list-style:none;margin:0;padding:0}
.pdf-toc-list a{display:flex;align-items:baseline;gap:10px;color:inherit;text-decoration:none}
.pdf-toc-l0{margin-top:16px}
.pdf-toc-l0 a{font:600 16px 'Geist',sans-serif;padding:4px 0}
.pdf-toc-l0 .k{font:700 10.5px ${mono};letter-spacing:.12em;text-transform:uppercase;color:var(--brick);min-width:120px}
.pdf-toc-l1 a{font:400 14.5px 'Geist',sans-serif;padding:2.5px 0;padding-left:130px}
.pdf-toc-l1 .num{font:500 11px ${mono};color:var(--brick);min-width:34px;margin-left:-44px;text-align:right}
.pdf-toc-list small{font:400 10.5px ${mono};color:var(--muted);letter-spacing:.04em;text-transform:uppercase;margin-left:6px}
.pdf-toc-list .dots{flex:1;border-bottom:1px dotted var(--grid);transform:translateY(-4px)}
.pdf-toc-list .p{font:500 12px ${mono};min-width:26px;text-align:right}
` });
await page.evaluate(async () => {
  await Promise.all(["400 168px 'Instrument Serif'", "italic 400 21px 'Source Serif 4'", "700 13px 'JetBrains Mono'", "600 16px 'Geist'"].map(f => document.fonts.load(f, 'Saber 11° 2026 Índice')));
  await document.fonts.ready;
});

const opts = { scale: SCALE, preferCSSPageSize: true, printBackground: true, outline: true, tagged: true };
const norm = s => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');
function ubicar(pdf) {
  const paginas = execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { maxBuffer: 1 << 28 }).toString().split('\f').map(norm);
  let desde = 2; // 0 portada, 1 índice
  return resumen.entradas.map(e => {
    const aguja = norm(e.t).slice(0, 26);
    for (let p = desde; p < paginas.length; p++) if (paginas[p].includes(aguja)) { desde = p; return p + 1; }
    return null;
  });
}
// 4) Dos pasadas: la primera ubica cada sección; la segunda escribe los números en el índice.
await page.pdf({ ...opts, path: 'pasada1.pdf' });
const pags1 = ubicar('pasada1.pdf');
const conPag = ps => ps.map((p, i) => p ?? (resumen.entradas[i].sinPag ? ps[i + 1] : null));
await page.evaluate(pags => document.querySelectorAll('.pdf-toc-list .p').forEach(el => { if (el.textContent) el.textContent = pags[+el.dataset.i] ?? '?'; }), conPag(pags1));
await page.pdf({ ...opts, path: OUT });
const pags2 = conPag(ubicar(OUT));
const pags1c = conPag(pags1);
const indice = resumen.entradas.map((e, i) => ({ nivel: e.n, num: e.num || e.k || '', titulo: e.t, pagina: pags2[i], coincide: pags1c[i] === pags2[i] }));
fs.writeFileSync('indice.json', JSON.stringify(indice, null, 2));
fs.writeFileSync('reporte-generacion.json', JSON.stringify({ salida: OUT, grupos: informeGrupos, canvasConvertidos: resumen.canvasConvertidos, errores, indice }, null, 2));
log('índice estable entre pasadas:', indice.every(x => x.coincide), '· sin ubicar:', indice.filter(x => !x.pagina).map(x => x.titulo));
log('errores de página:', errores.length ? errores : 'ninguno');
await browser.close();
const lm = limpiarMarcadores(OUT, resumen.titulos);
log('marcadores corregidos:', lm.corregidos, '· sin coincidencia:', JSON.stringify(lm.sinCoincidencia));
try {
  execFileSync('exiftool', ['-overwrite_original', '-Author=I.E. Pedacito de Cielo',
    '-Subject=Resultados del examen Saber 11° 2026 y de los simulacros departamentales de preparación (feb.–may. 2026)',
    '-Keywords=Saber 11, ICFES, simulacros, resultados 2026', '-Creator=Dashboard ICFES (' + SITIO + ') · commit ' + COMMIT, OUT]);
  log('metadatos escritos con exiftool');
} catch (e) { log('exiftool no disponible: metadatos Author/Subject sin escribir'); }
fs.rmSync('pasada1.pdf', { force: true });
log('listo →', OUT);
