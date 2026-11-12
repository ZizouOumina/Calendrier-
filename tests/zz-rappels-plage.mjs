/* Les rappels d'agenda que la Batcave ecrirait, jour par jour sur une plage :
   node zz-rappels-plage.mjs <horloge> <premier AAAA-MM-JJ> <n jours> <sortie.json> */
import { chromium } from 'playwright';
import fs from 'fs';
const [quand, debut, n, out] = [process.argv[2], process.argv[3], Number(process.argv[4]), process.argv[5]];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
await page.clock.install({ time: new Date(quand) });
await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(([debut, n]) => {
  const out = {}, [y, m, d] = debut.split('-').map(Number);
  for (let i = 0; i < n; i++) {
    const x = new Date(y, m - 1, d + i), iso = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    out[iso] = window.__bcRappels(iso).map(b => ({titre: b.titre, debut: b.debut, fin: b.fin, rappel: b.rappel, libre: !!b.libre, description: b.description}));
  }
  return out;
}, [debut, n]);
fs.writeFileSync(out, JSON.stringify(r));
console.log('jours', Object.keys(r).length, 'rappels', Object.values(r).reduce((t, x) => t + x.length, 0));
await b.close();
