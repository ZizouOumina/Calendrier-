/* Ce que la Batcave poserait dans l'agenda pour un jour donné (blocsARappeler) : heure, titre, description.
   DONNEES=<json> [PORT=8200] node _agenda-jour.mjs <iso> [<iso> …]  → JSON sur la sortie standard */
import { chromium } from 'playwright';
import fs from 'fs';
const seed = JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8'));
const jours = process.argv.slice(2), port = process.env.PORT || '8200';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
const p = await ctx.newPage();
p.on('pageerror', e => console.error('PAGEERROR ' + e.message));
await p.clock.install({time:new Date(process.env.QUAND || '2026-11-27T20:00:00+01:00')});
await p.goto('http://127.0.0.1:' + port + '/host.html', {timeout:20000}).catch(()=>{});
await p.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:15000});
const fr = p.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(js => { const o = {}; const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  js.forEach(iso => { o[iso] = window.__bcRappels(iso).map(x => ({h: hm(x.debut), fin: hm(x.fin), titre: x.titre, description: x.description})); }); return o; }, jours);
console.log(JSON.stringify(r, null, 1));
await b.close();
