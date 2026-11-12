/* Les rappels d'agenda que la Batcave écrirait pour un jour : node zz-rappels.mjs <horloge> <AAAA-MM-JJ> [motif du titre]
   Sort titre, heures et description -- pour comparer avec l'agenda réel. */
import { chromium } from 'playwright';
const [quand, iso, motif] = [process.argv[2], process.argv[3], process.argv[4] || ''];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
await page.clock.install({ time: new Date(quand) });
await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(([iso, motif]) => window.__bcRappels(iso).filter(x => !motif || x.titre.indexOf(motif) > -1).map(x => ({titre: x.titre, debut: x.debut, fin: x.fin, rappel: x.rappel, libre: !!x.libre, description: x.description})), [iso, motif]);
const hh = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
if (process.env.JSON_SEUL) console.log(JSON.stringify(r));
else r.forEach(x => console.log(hh(x.debut) + '-' + hh(x.fin) + ' ' + x.titre + ' [rappel ' + x.rappel + ' min' + (x.libre ? ', libre' : '') + ']\n    ' + x.description + '\n'));
await b.close();
