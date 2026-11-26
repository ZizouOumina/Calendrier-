import { chromium } from 'playwright';
import fs from 'fs';
const seed = JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8'));
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  PAGEERROR ' + e.message));
await p.clock.install({time:new Date('2026-11-27T20:00:00+01:00')});
await p.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(()=>{});
await p.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:15000});
const fr = p.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(() => {
  const out = {jours: {}, sem: {}};
  const mn = h => +h.slice(0, 2) * 60 + +h.slice(3);
  for(let d = new Date('2026-11-28T12:00:00'); d <= new Date('2027-01-31T12:00:00'); d.setDate(d.getDate() + 1)){
    const iso = d.toISOString().slice(0, 10), cle = window.__bcCle(d.getDay());
    const g = window.__bcGrille(cle, iso);
    let es = 0, pj = 0;
    g.forEach((x, i) => { const fin = i < g.length - 1 ? mn(g[i + 1][0]) : mn(x[0]); const dur = fin - mn(x[0]);
      if(/^Español/.test(x[1])) es += dur; if(/^Projets perso/.test(x[1])) pj += dur; });
    let c = null; try{ c = window.__bcCibleJour(cle, iso); }catch(e){}
    out.jours[iso] = {es, pj, c, sp: window.__bcSemaineProgramme ? window.__bcSemaineProgramme(iso) : null, dow: d.getDay()};
  }
  return out;
});
const J = r.jours, isos = Object.keys(J);
const h = m => Math.floor(m / 60) + ' h ' + String(Math.round(m % 60)).padStart(2, '0');
const som = (a, z, f) => isos.filter(i => i >= a && i <= z).reduce((t, i) => t + f(J[i]), 0);
console.log('cible exemple', JSON.stringify(J['2026-11-30'].c), JSON.stringify(J['2026-12-28'].c));
console.log('ESPAGNOL blocs 28 nov → 27 déc :', h(som('2026-11-28', '2026-12-27', x => x.es)), '· au minuteur :', h(som('2026-11-28', '2026-12-27', x => (x.c && (x.c.es || 0)) || 0)));
console.log('ESPAGNOL par semaine :', ['2026-11-28','2026-11-30','2026-12-07','2026-12-14','2026-12-21'].map(a => { const z = new Date(a + 'T12:00:00'); z.setDate(z.getDate() + (a === '2026-11-28' ? 1 : 6)); return a + ' ' + h(som(a, z.toISOString().slice(0, 10), x => x.es)); }).join(' | '));
console.log('PROJETS 28 déc :', h(J['2026-12-28'].pj), '· semaine du 28 :', h(som('2026-12-28', '2027-01-03', x => x.pj)), '· 4 janv :', h(som('2027-01-04', '2027-01-10', x => x.pj)), '· 11 janv :', h(som('2027-01-11', '2027-01-17', x => x.pj)), '· 18 janv :', h(som('2027-01-18', '2027-01-24', x => x.pj)), '· 25 janv :', h(som('2027-01-25', '2027-01-31', x => x.pj)));
console.log('PROJETS cible proj : 28 déc', J['2026-12-28'].c && J['2026-12-28'].c.proj, '· semaine', som('2026-12-28', '2027-01-03', x => (x.c && x.c.proj) || 0));
console.log('SEMAINES PROGRAMME (lundis) :', isos.filter(i => J[i].dow === 1).map(i => i.slice(5) + '=' + J[i].sp).join(' '));
console.log('sp 28 nov', J['2026-11-28'].sp, '29', J['2026-11-29'].sp);
await b.close();
