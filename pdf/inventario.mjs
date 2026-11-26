
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const TARGET = 'https://alvaretto.github.io/icfes-dashboard/?pdf=' + Date.now() + '#todo';
let browser;
try { browser = await chromium.launch(); }
catch (e) { browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable' }); }
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(TARGET, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
const inv = await page.evaluate(() => {
  const vis = el => !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  const txt = el => (el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 110) : null);
  const main = document.querySelector('#main-content') || document.body;
  const top = [...main.children].filter(vis).map(el => ({
    tag: el.tagName.toLowerCase(), id: el.id || null, cls: el.className || null, mod: el.dataset.mod || null,
    h: txt(el.querySelector('h1,h2')), alto: Math.round(el.getBoundingClientRect().height)
  }));
  const secciones = [...document.querySelectorAll('.section[data-mod]')].map(s => ({
    mod: s.dataset.mod, visible: vis(s), tag: txt(s.querySelector('.section-tag')), h2: txt(s.querySelector('h2')),
    canvas: s.querySelectorAll('canvas').length,
    canvasVis: [...s.querySelectorAll('canvas')].filter(c => vis(c) && c.width > 0).length,
    conChart: [...s.querySelectorAll('canvas')].filter(c => window.Chart && Chart.getChart(c)).length,
    alto: Math.round(s.getBoundingClientRect().height)
  }));
  const bloquesS26 = [...document.querySelectorAll('.s26-block')].map(b => ({ id: b.id, vis: vis(b), h3: txt(b.querySelector('.s26-h3,h3')) }));
  const ctrls = [...main.querySelectorAll('button,select,input,details,[role=tab],[role=switch]')].filter(vis).map(el => ({
    tag: el.tagName.toLowerCase(), cls: el.className || null, txt: txt(el),
    sel: el.getAttribute('aria-selected') || el.getAttribute('aria-pressed') || (el.tagName==='DETAILS' ? String(el.open) : null),
    padre: (el.parentElement.className || el.parentElement.tagName),
    donde: (el.closest('.section[data-mod]')?.dataset.mod) || (el.closest('.s26-block')?.id) || null
  }));
  const canv = [...document.querySelectorAll('canvas')];
  return {
    bodyClass: document.body.className, title: document.title,
    altoPagina: document.documentElement.scrollHeight,
    top, secciones, bloquesS26, ctrls,
    canvasTotal: canv.length, canvasVisibles: canv.filter(c => vis(c) && c.width > 0).length,
    chartInstancias: window.Chart ? Object.keys(Chart.instances).length : -1,
    tablas: [...document.querySelectorAll('table')].filter(vis).length,
    imgs: [...document.querySelectorAll('main img, .container img')].filter(vis).length,
  };
});
inv.errores = errs;
fs.writeFileSync('./inventario.json', JSON.stringify(inv, null, 2));
await page.screenshot({ path: './inv-top.png', fullPage: false });
await browser.close();
console.log('ok');
