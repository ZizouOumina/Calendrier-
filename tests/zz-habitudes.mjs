/* Les cases du jour telles que « Ma journée » les affiche, date par date :
   node zz-habitudes.mjs AAAA-MM-JJ [AAAA-MM-JJ …]  (une ouverture de la Batcave par date, a 06:00) */
import { chromium } from 'playwright';
const b = await chromium.launch();
const out = {};
for (const iso of process.argv.slice(2)) {
  const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(iso + 'T06:00:00+01:00') });
  await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
  /* 17 novembre : la console du tableau de bord est retirée -- les cases du jour se lisent dans « Ma journée » */
  out[iso] = await fr.evaluate(() => { window.__bcJournee.rendre(); return [...document.querySelectorAll('#mj-cases li label, #mj-routine li label')].map(x => x.textContent.trim()); });
  await ctx.close();
}
console.log(JSON.stringify(out));
await b.close();
