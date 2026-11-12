/* Les blocs « Projets perso » de la grille, semaine par semaine : node zz-projets.mjs <lundi> [n semaines] */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
await page.clock.install({ time: new Date('2026-11-12T06:00:00+01:00') });
await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(([lundi, n]) => {
  const CLE = ['weekend', 'monday', 'tuesday', 'wednesday', 'weekday', 'friday', 'saturday'];
  const mn = h => { const [a, b] = h.split(':'); return a * 60 + +b; };
  const out = []; const d = new Date(lundi + 'T12:00:00');
  for (let s = 0; s < n; s++) {
    const sem = {lundi: null, total: 0, jours: []};
    for (let i = 0; i < 7; i++) {
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (i === 0) sem.lundi = iso;
      const g = window.__bcGrille(CLE[d.getDay()], iso); let j = 0; const l = [];
      g.forEach((bl, k) => { if (/^Projets perso/.test(bl[1]) && g[k + 1]) { const m = mn(g[k + 1][0]) - mn(bl[0]); j += m; l.push(bl[0]); } });
      sem.total += j; sem.jours.push(j + (l.length ? '[' + l.join(',') + ']' : ''));
      d.setDate(d.getDate() + 1);
    }
    out.push(sem);
  }
  return out;
}, [process.argv[2], Number(process.argv[3] || 1)]);
r.forEach(s => console.log(s.lundi + ' : ' + Math.floor(s.total / 60) + ' h ' + String(s.total % 60).padStart(2, '0') + '  ' + s.jours.join(' | ')));
await b.close();
