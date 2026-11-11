/* La grille de quelques jours : node zz-g.mjs [horloge=...] AAAA-MM-JJ … (TOUT=1 : tous les blocs, sinon salle, combat, trajets, corvees) */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
await page.clock.install({ time: new Date(process.env.HORLOGE || '2026-11-11T20:00:00+01:00') });
await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
const CLE = ['weekend', 'monday', 'tuesday', 'wednesday', 'weekday', 'friday', 'saturday'];
for (const iso of process.argv.slice(2)) {
  const g = await fr.evaluate(([c, i]) => window.__bcGrille(c, i).map(b => b[0] + ' ' + b[1]), [CLE[new Date(iso + 'T12:00:00').getDay()], iso]);
  console.log(iso + ': ' + (process.env.TOUT ? g : g.filter(x => /salle|Sport|JJB|Trajet|Batch|Courses|Ménage/i.test(x))).join(' | '));
}
await b.close();
