import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(()=>{window.claude=undefined;});
const page = await ctx.newPage();
await page.clock.install({time:new Date('2026-09-14T09:00:00+02:00')});
await page.goto('http://127.0.0.1:8199/host.html');
await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached',timeout:20000});
const fr = page.frames().find(x=>x.url().includes('batcave.html'));
await page.waitForTimeout(400);
for(const iso of ['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18']){
  const r = await fr.evaluate(i=>{
    const g = window.__bcGrille(window.__bcCle(new Date(i+'T12:00:00').getDay()), i);
    const fin = g[g.length-1];
    return g.map((b,k)=> b[0]+' → '+(k<g.length-1?g[k+1][0]:'—')+'  '+b[1]);
  }, iso);
  const j = ['dim','lun','mar','mer','jeu','ven','sam'][new Date(iso+'T12:00:00').getDay()];
  console.log('\n=== '+j+' '+iso+' ===');
  r.forEach(x=>console.log('  '+x));
}
await ctx.close(); await b.close();
