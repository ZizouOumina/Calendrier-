/* Comme zz-rappels-plage.mjs, mais avec SES donnees : une sauvegarde Drive (batcave-sauvegarde-*.json) chargee
   dans le stockage avant l'ouverture -- dates d'examen, journees, vacances, habitudes.
   node zz-rappels-donnees.mjs <sauvegarde.json> <horloge> <premier AAAA-MM-JJ> <n jours> <sortie.json> */
import { chromium } from 'playwright';
import fs from 'fs';
const [fichier, quand, debut, n, out] = [process.argv[2], process.argv[3], process.argv[4], Number(process.argv[5]), process.argv[6]];
const sauvegarde = JSON.parse(fs.readFileSync(fichier, 'utf8'));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript((s) => {
  window.claude = undefined;
  try { if (!sessionStorage.getItem('__seme')) { Object.keys(s).forEach(k => localStorage.setItem(k, JSON.stringify(s[k]))); sessionStorage.setItem('__seme', '1'); } } catch (e) {}
}, sauvegarde);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.clock.install({ time: new Date(quand) });
await page.goto('http://127.0.0.1:8199/host.html', {timeout:30000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:30000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:30000});
const r = await fr.evaluate(([debut, n]) => {
  const out = {}, [y, m, d] = debut.split('-').map(Number);
  for (let i = 0; i < n; i++) {
    const x = new Date(y, m - 1, d + i), iso = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    out[iso] = window.__bcRappels(iso).map(b => ({titre: b.titre, titreBase: b.titreBase || null, cle: b.cle, debut: b.debut, fin: b.fin, rappel: b.rappel, libre: !!b.libre, description: b.description}));
  }
  return {rappels: out, examens: JSON.parse(localStorage.getItem('batcave-examens') || 'null'), schema: localStorage.getItem('batcave-schema')};
}, [debut, n]);
fs.writeFileSync(out, JSON.stringify(r.rappels));
console.log('jours', Object.keys(r.rappels).length, 'rappels', Object.values(r.rappels).reduce((t, x) => t + x.length, 0), '· examens', JSON.stringify(r.examens).slice(0, 120), '· schéma', r.schema, '· erreurs', JSON.stringify(errs).slice(0, 200));
await b.close();
