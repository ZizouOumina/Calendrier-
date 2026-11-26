/* Les grilles réelles de la Batcave, jour par jour, pour le plan de rattrapage.
   DONNEES=<sauvegarde.json> node outils/rattrapage/grilles.mjs <début> <fin> <sortie.json>   (le serveur de tests sur 8199) */
import { chromium } from 'playwright';
import fs from 'fs';
const [debut, fin, sortie] = process.argv.slice(2);
const seed = process.env.DONNEES ? JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8')) : {};
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  PAGEERROR ' + e.message));
await p.clock.install({time: new Date(debut + 'T04:00:00+01:00')});
await p.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(()=>{});
await p.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:15000});
const fr = p.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(([debut, fin]) => {
  const out = {};
  for(let d = new Date(debut + 'T12:00:00'); d <= new Date(fin + 'T12:00:00'); d.setDate(d.getDate() + 1)){
    const iso = d.toISOString().slice(0, 10);
    const g = window.__bcGrille(window.__bcCle(d.getDay()), iso);
    out[iso] = g.map((x, i) => [x[0], i < g.length - 1 ? g[i + 1][0] : '', x[1]]);
  }
  return out;
}, [debut, fin]);
fs.writeFileSync(sortie, JSON.stringify(r, null, 1));
console.log('ok', Object.keys(r).length, 'jours');
await b.close();
