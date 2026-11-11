/* Balayage des consignes : chaque bloc de chaque jour, du <debut> sur <n> jours. Signale tout ce qui n'est pas un
   texte propre ([object, undefined, NaN, accolades restantes) et liste les blocs sans consigne. */
import { chromium } from 'playwright';
const [quand, debut, n] = [process.argv[2], process.argv[3], Number(process.argv[4] || 14)];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.clock.install({ time: new Date(quand) });
await page.goto('http://127.0.0.1:8199/host.html');
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(([debut, n]) => {
  const CLE = ['weekend', 'monday', 'tuesday', 'wednesday', 'weekday', 'friday', 'saturday'];
  const out = {mauvais: [], vides: {}, total: 0, jours: 0};
  const d = new Date(debut + 'T12:00:00');
  for(let i = 0; i < n; i++){
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const dow = d.getDay();
    const g = window.__bcGrille(CLE[dow], iso);
    out.jours++;
    g.forEach(bl => {
      out.total++;
      let c;
      try{ c = window.__bcConsigne(bl[1], dow, iso, bl[0]); }catch(e){ c = 'EXCEPTION ' + e.message; }
      if(typeof c !== 'string') out.mauvais.push(iso + ' ' + bl[0] + ' ' + bl[1] + ' → type ' + (typeof c) + ' ' + String(c).slice(0, 60));
      else if(/\[object|undefined|NaN|\{[A-Z_]+\}|EXCEPTION|null/.test(c)) out.mauvais.push(iso + ' ' + bl[0] + ' ' + bl[1] + ' → ' + c.slice(0, 200));
      else if(!c){ out.vides[bl[1]] = (out.vides[bl[1]] || 0) + 1; (out.videsJours = out.videsJours || []).push(iso + ' ' + bl[0] + ' ' + bl[1]); }
    });
    d.setDate(d.getDate() + 1);
  }
  return out;
}, [debut, n]);
console.log('jours', r.jours, 'blocs', r.total, 'anomalies', r.mauvais.length, 'erreurs page', JSON.stringify(errs));
r.mauvais.forEach(x => console.log('  ANOMALIE ' + x));
console.log('sans consigne :', JSON.stringify(r.vides)); if(process.env.DETAIL) (r.videsJours || []).forEach(x => console.log('   ' + x));
await b.close();
