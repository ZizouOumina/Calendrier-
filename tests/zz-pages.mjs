import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [f, quand] of [['semaine-du-9-novembre.html','2026-11-12T07:00:00+01:00'], ['semaine-du-16-novembre.html','2026-11-16T07:00:00+01:00']]) {
  const ctx = await b.newContext({ viewport:{width:420,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR', deviceScaleFactor:1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(new URL('../' + f, import.meta.url).href);
  await page.waitForTimeout(800);
  const t = await page.evaluate(() => document.body.innerText.slice(0, 600));
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] + '/' + f.replace('.html','') + '.png' });   /* un dossier en argument : une capture par page */
  console.log('====', f, 'erreurs', JSON.stringify(errs)); console.log(t);
  await ctx.close();
}
await b.close();
