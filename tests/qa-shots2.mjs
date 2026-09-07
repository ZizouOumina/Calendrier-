import { chromium } from 'playwright';
import fs from 'fs';
const src = fs.readFileSync(new URL('./qa-shots.mjs', import.meta.url), 'utf8');
/* réutilise le seed et le mock de qa-shots.mjs */
const MOCK = eval('(' + src.slice(src.indexOf('const MOCK = ') + 13, src.indexOf('const seed = ')).trim().replace(/;$/, '') + ')');
const seed = eval('(' + src.slice(src.indexOf('const seed = ') + 13, src.indexOf('const browser = ')).trim().replace(/;$/, '') + ')');
const HOST = 'http://127.0.0.1:8199/host.html';
const browser = await chromium.launch();
async function ouvrir(date){
  const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  PAGEERROR: ' + e.message));
  await page.clock.install({ time: new Date(date) });
  await page.goto(HOST);
  await page.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  return { ctx, page, fr };
}
async function tranches(page, fr, p, prefix, depuis){
  await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p);
  await page.waitForTimeout(350);
  const h = await fr.evaluate(() => document.documentElement.scrollHeight);
  let k = 0;
  for(let y = depuis; y < h - 60; y += 850){
    await fr.evaluate(v => window.scrollTo(0, v), y);
    await page.waitForTimeout(150);
    k++;
    await page.screenshot({ path: '/tmp/qa/' + prefix + '-' + p + '-' + k + '.png' });
  }
  return k;
}
const longues = ['dashboard','bilan','insights','calendrier','agenda','journal','habitudes','repas','sport','budget','etudes','business','objectifs','courses'];
{
  const { ctx, page, fr } = await ouvrir('2026-09-07T12:00:00+02:00');
  for(const p of longues) console.log(p, await tranches(page, fr, p, 'b', 850));
  await ctx.close();
}
{
  const { ctx, page, fr } = await ouvrir('2026-09-06T18:00:00+02:00');
  console.log('dimanche dashboard', await tranches(page, fr, 'dashboard', 'dim', 0));
  console.log('dimanche bilan', await tranches(page, fr, 'bilan', 'dim', 0));
  await ctx.close();
}
await browser.close();
console.log('FIN');
