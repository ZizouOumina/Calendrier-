import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1200,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.clock.install({ time: new Date(process.argv[2] || '2026-11-11T09:00:00+01:00') });
await page.goto('http://127.0.0.1:8199/host.html');
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const res = await fr.evaluate(() => {
  const out = [];
  for(const iso of ['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15','2026-11-16']){
    const dow = new Date(iso+'T12:00:00').getDay();
    const cle = window.__bcCle(dow);
    const blocs = window.__bcBlocs(cle, iso).filter(b => window.__bcTypeBloc(b.label)).map(b => [b.debut || b.h || '', b.label, window.__bcTypeBloc(b.label), b.minutes, b.travail]);
    out.push({iso, cible: window.__bcCibleJour(cle, iso), sport: window.__bcTypeSport(iso), blocs});
  }
  return {out};
});
console.log(JSON.stringify(res, null, 0).replace(/\{"iso"/g, '\n{"iso"'));
console.log('erreurs', JSON.stringify(errs));
await b.close();
