import { chromium } from 'playwright';
import fs from 'fs';
const [quand, out] = [process.argv[2], process.argv[3]];
const pages = ['dashboard','calendrier','taches','etudes','agenda','bilan','insights','systeme','objectifs','budget','business','habitudes','coran','sport','addictions','vie','repas','prep','courses'];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.clock.install({ time: new Date(quand) });
await page.goto('http://127.0.0.1:8199/host.html');
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
let txt = '';
for(const p of pages){
  await fr.evaluate(p => { const b = document.querySelector('.nav-btn[data-page="' + p + '"]'); if(b) b.click(); }, p);
  await page.waitForTimeout(350);
  const t = await fr.evaluate(p => { const el = document.querySelector('.page[data-page="' + p + '"]'); if(!el) return '(absente)'; el.querySelectorAll('details').forEach(d => d.open = true); return el.innerText; }, p);
  txt += '\n\n######## ' + p + ' ########\n' + t;
}
fs.writeFileSync(out, txt);
console.log('ok', txt.length, 'erreurs', JSON.stringify(errs));
await b.close();
