/* Ce que mangent quelques jours, repas par repas, et le total par ingredient :
   node zz-besoins.mjs <premier AAAA-MM-JJ> <dernier AAAA-MM-JJ> [BRUT=1 : le plan sans la viande de la premiere semaine] */
import { chromium } from 'playwright';
const [de, a] = [process.argv[2], process.argv[3]];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
await page.clock.install({ time: new Date(process.env.HORLOGE || '2026-11-12T09:30:00+01:00') });
await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(([de, a, brut]) => {
  const repas = ['Petit-déjeuner', 'Collation combat', 'Récup combat', 'Déjeuner', 'Collation entraînement', 'Dîner'];
  const jours = [], total = {};
  const d = new Date(de + 'T12:00:00');
  while (true) {
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (iso > a) break;
    const j = {iso, repas: {}};
    repas.forEach(n => { const l = window.__bcCompoRepas(n, iso, brut); if (l && l.length) { j.repas[n] = l.map(x => x.c + ' ' + x.q).join(', '); l.forEach(x => { total[x.c] = (total[x.c] || 0) + x.q; }); } });
    jours.push(j); d.setDate(d.getDate() + 1);
  }
  return {jours, total};
}, [de, a, !!process.env.BRUT]);
r.jours.forEach(j => { console.log(j.iso); Object.keys(j.repas).forEach(n => console.log('   ' + n.padEnd(24) + j.repas[n])); });
console.log('TOTAL ' + JSON.stringify(r.total));
await b.close();
