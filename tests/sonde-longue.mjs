/* Sonde : node sonde-longue.mjs <date ISO du controle> <heure HH:MM> "<expression>" [largeur] */
import { chromium } from 'playwright';
import { seed, decalage } from './donnees-fictives.mjs';
const [ctrl, heure, expr, largeur] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: {width: Number(largeur) || 1440, height: 900}, timezoneId: 'Europe/Madrid', locale: 'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed(ctrl));
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
await page.clock.install({ time: new Date(ctrl + 'T' + (heure || '10:00') + ':00' + decalage(ctrl)) });
await page.goto('http://127.0.0.1:8199/host.html', {timeout: 30000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 30000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { ['ritual-dismiss', 'ask-cancel'].forEach(id => { const r = document.getElementById(id); if(r && r.offsetParent !== null) r.click(); }); });
await page.waitForTimeout(400);
const r = await fr.evaluate(new Function('return (async () => (' + expr + '))()'));
console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
await browser.close();
