/* Sonde : node dbg-combat.mjs <ISO datetime> "<expression JS évaluée dans la Batcave>" [seed JSON] [page] */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const seed = process.argv[4] ? JSON.parse(process.argv[4]) : null;
if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
await page.clock.install({ time: new Date(process.argv[2] || '2026-09-28T10:00:00+02:00') });
await page.goto(URL, {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
if(process.argv[5]){ await fr.evaluate(p => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelector('.nav-btn[data-page="' + p + '"]').click(); }, process.argv[5]); await page.waitForTimeout(500); }
const expr = process.argv[3];
const r = await fr.evaluate(new Function('return (' + expr + ')'));
console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
await browser.close();
