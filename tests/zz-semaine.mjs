import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1200, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.clock.install({time: new Date('2026-11-15T12:00:00+01:00')});
await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(()=>{});
await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:20000});
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const res = await fr.evaluate(() => {
  const habits = JSON.parse(localStorage.getItem('batcave-habits') || '[]');
  const r = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 10, 16 + i), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const dow = d.getDay(), cle = window.__bcCle(dow), g = window.__bcGrille(cle, iso);
    const blocs = g.map(x => ({h: x[0], l: x[1], c: window.__bcConsigne(x[1], dow, iso, x[0]) || ''}));
    const hab = habits.filter(h => {
      const js = window.__bcHabitJours(h);
      if (js !== null && js !== undefined && js.indexOf(dow) === -1) return false;
      return true;
    }).map(h => ({id: h.id, label: h.label, icon: h.icon, cycle: h.cycleSemaines || (h.quinzaine ? 2 : 0), ancre: h.ancre || null, quinzaine: !!h.quinzaine}));
    const repas = {};
    ['Petit-déjeuner', 'Collation combat', 'Récup combat', 'Déjeuner', 'Collation entraînement', 'Dîner'].forEach(n => { repas[n] = window.__bcCompoRepas(n, iso, false); });
    r.push({iso, dow, cle, blocs, habits: hab, repas, cible: window.__bcCibleJour(cle, iso)});
  }
  return r;
});
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log('jours', res.length, 'erreurs', JSON.stringify(errs));
await b.close();
