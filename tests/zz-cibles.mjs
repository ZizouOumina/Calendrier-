/* La cible de chaque jour (révision, projets, espagnol, en minutes) et le total de la semaine :
   node zz-cibles.mjs <lundi AAAA-MM-JJ> [n semaines] */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
await page.clock.install({ time: new Date(process.env.HORLOGE || '2026-11-12T06:00:00+01:00') });
await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(([lundi, n]) => {
  const out = []; const d = new Date(lundi + 'T12:00:00');
  for (let s = 0; s < n; s++) {
    const sem = {lundi: null, rev: 0, proj: 0, es: 0, jours: []};
    for (let i = 0; i < 7; i++) {
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (i === 0) sem.lundi = iso;
      const c = window.__bcCibleJour(window.__bcCle(d.getDay()), iso) || {};
      sem.rev += c.rev || 0; sem.proj += c.proj || 0; sem.es += c.es || 0; sem.jours.push(Math.round(c.proj || 0));
      d.setDate(d.getDate() + 1);
    }
    out.push(sem);
  }
  return out;
}, [process.argv[2], Number(process.argv[3] || 1)]);
const h = m => Math.floor(m / 60) + ' h ' + String(Math.round(m % 60)).padStart(2, '0');
r.forEach(s => console.log(s.lundi + ' : révision ' + h(s.rev) + ' · projets ' + h(s.proj) + ' · espagnol ' + h(s.es) + '  (projets par jour, lun→dim : ' + s.jours.join(' ') + ')'));
await b.close();
