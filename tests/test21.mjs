import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

console.log('\n== 59) Cases à cocher « Courses » agrandies au doigt sur iPad (cible tactile) ==');
{
  const ctx = await browser.newContext({ viewport:{width:1180,height:820}, hasTouch:true, isMobile:false, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="courses"]').click());
  await page.waitForTimeout(150);

  const size = await fr.evaluate(() => {
    const cb = document.querySelector('#courses-grid input[type="checkbox"]');
    if(!cb) return null;
    const r = cb.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  ok(size && size.w >= 26 && size.h >= 26, 'case à cocher Courses ≥ 26px sur iPad (tactile) : ' + JSON.stringify(size));

  // même vérif sur Mac (non tactile) : doit rester à la taille compacte d'origine (pas de régression visuelle)
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, hasTouch:false, isMobile:false, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="courses"]').click());
  await page.waitForTimeout(150);
  const size = await fr.evaluate(() => {
    const cb = document.querySelector('#courses-grid input[type="checkbox"]');
    if(!cb) return null;
    const r = cb.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  ok(size && size.w < 26 && size.h < 26, 'sur Mac (souris) la case reste compacte, pas de régression : ' + JSON.stringify(size));
  await ctx.close();
}

console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
