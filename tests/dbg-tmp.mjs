import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:820,height:1180}, timezoneId:'Europe/Madrid', locale:'fr-FR', hasTouch:true});
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
await page.clock.install({ time: new Date('2026-09-19T10:00:00+02:00') });
await page.goto('http://127.0.0.1:8199/host.html');
await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:20000});
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
  document.querySelector('.nav-btn[data-page="courses"]').click(); });
await page.waitForTimeout(500);
console.log(await fr.evaluate(() => {
  const g = document.getElementById('courses-grid');
  const doc = document.documentElement;
  const out = {scrollW: doc.scrollWidth, clientW: doc.clientWidth,
               gridW: g.getBoundingClientRect().width, gridScroll: g.scrollWidth,
               cols: getComputedStyle(g).gridTemplateColumns};
  out.cards = [...g.querySelectorAll('.cat-card')].map(c => ({t:c.querySelector('h4').textContent.slice(0,22), w:Math.round(c.getBoundingClientRect().width), sw:c.scrollWidth}));
  return out;
}));
await b.close();
