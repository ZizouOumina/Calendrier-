import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const browser = await chromium.launch();
const ctx = await browser.newContext({ timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
page.on('pageerror', e => console.error('PAGEERROR', e.message));
await page.clock.install({ time: new Date('2026-09-14T08:00:00+02:00') });
await page.goto(URL, {timeout:20000}).catch(()=>{});
await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:15000});
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await page.waitForTimeout(800);
const out = await fr.evaluate(() => {
  const res = {};
  const d = new Date('2026-09-14T00:00:00');
  for(let i=0;i<260;i++){
    const iso = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const cle = window.__bcCle(d.getDay());
    const blocs = window.__bcBlocs(cle, iso);
    let rev=0, proj=0, es=0;
    blocs.forEach(b => { if(b.type==='cours') rev+=b.minutes; else if(b.type==='projet'){ if(/^Español/.test(b.label)) es+=b.minutes; else proj+=b.minutes; } });
    res[iso] = {rev, proj, es, p:(window.__bcPeriode(iso)||{}).id||null};
    d.setDate(d.getDate()+1);
  }
  return res;
});
console.log(JSON.stringify(out));
await browser.close();
