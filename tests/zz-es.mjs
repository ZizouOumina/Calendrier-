/* Les blocs « Español · … » de la grille entre deux dates, en minutes : node zz-es.mjs <de> <a> */
import { chromium } from 'playwright';
const [de, a] = [process.argv[2], process.argv[3]];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
await page.clock.install({ time: new Date('2026-11-12T16:00:00+01:00') });
await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(([de, a]) => {
  const CLE = ['weekend', 'monday', 'tuesday', 'wednesday', 'weekday', 'friday', 'saturday'];
  const mn = h => { const [x, y] = h.split(':'); return x * 60 + +y; };
  let tot = 0, n = 0, cib = 0; const d = new Date(de + 'T12:00:00');
  while (true) {
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (iso > a) break;
    const g = window.__bcGrille(CLE[d.getDay()], iso);
    g.forEach((bl, k) => { if (/^Español · /.test(bl[1]) && g[k + 1]) { tot += mn(g[k + 1][0]) - mn(bl[0]); n++; } });
    cib += (window.__bcCibleJour(window.__bcCle(d.getDay()), iso) || {}).es || 0;
    d.setDate(d.getDate() + 1);
  }
  return {tot, n, cib};
}, [de, a]);
console.log(de + ' → ' + a + ' : ' + r.n + ' blocs, ' + Math.floor(r.tot / 60) + ' h ' + String(r.tot % 60).padStart(2, '0') + ' de blocs · ' + Math.floor(r.cib / 60) + ' h ' + String(Math.round(r.cib % 60)).padStart(2, '0') + ' au minuteur');
await b.close();
