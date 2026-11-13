import { chromium } from 'playwright';
import fs from 'fs';
const [debut, n, out, quand] = [process.argv[2], Number(process.argv[3]), process.argv[4], process.argv[5] || '2026-11-10T19:00:00+01:00'];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1200,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.clock.install({ time: new Date(quand) });
await page.goto(process.env.BC_HOST || 'http://127.0.0.1:8199/host.html');
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const res = await fr.evaluate(([debut, n]) => {
  const noms = ['weekend','monday','tuesday','wednesday','weekday','friday','saturday'];
  const r = []; const d = new Date(debut + 'T12:00:00');
  for(let i = 0; i < n; i++){
    const iso = d.toISOString().slice(0,10), dow = d.getDay();
    const g = window.__bcGrille(noms[dow], iso);
    const p = window.__bcPhaseEspanol ? window.__bcPhaseEspanol(iso) : null;
    r.push({iso, dow, phase: p ? p.id : null, cible: window.__bcCibleJour(window.__bcCle(dow), iso),
      blocs: g.map(x => ({h: x[0], l: x[1], c: window.__bcConsigne ? window.__bcConsigne(x[1], dow, iso, x[0]) : ''}))});
    d.setDate(d.getDate() + 1);
  }
  return r;
}, [debut, n]);
fs.writeFileSync(out, JSON.stringify(res));
console.log('jours', res.length, 'erreurs', JSON.stringify(errs));
await b.close();
