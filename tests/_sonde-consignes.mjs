/* Sonde : la consigne de quelques blocs à des dates données, avec ses données. node _sonde-consignes.mjs */
import { chromium } from 'playwright';
import fs from 'fs';
const seed = JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8'));
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  PAGEERROR ' + e.message));
await p.clock.install({time:new Date('2026-11-28T06:00:00+01:00')});
await p.goto('http://127.0.0.1:' + (process.env.PORT || 8199) + '/host.html', {timeout:20000}).catch(()=>{});
await p.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:15000});
const fr = p.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const cas = JSON.parse(process.argv[2]);
const r = await fr.evaluate(cas => cas.map(([iso, label, heure]) => {
  const d = new Date(iso + 'T12:00:00').getDay();
  const g = window.__bcGrille(window.__bcCle(d), iso).map(x => x[0] + ' ' + x[1]);
  return iso + ' ' + (heure || '') + ' ' + label + ' → ' + (g.some(x => x.endsWith(' ' + label)) ? '' : '[absent de la grille] ') + window.__bcConsigne(label, d, iso, heure);
}), cas);
r.forEach(x => console.log(x.slice(0, 420)));
await b.close();
