/* Une page autonome du dépôt, ouverte à la largeur d'un téléphone : erreurs, débordement, texte.
   node zz-page.mjs <fichier à la racine> [horloge] */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.clock.install({ time: new Date(process.argv[3] || '2026-11-12T05:25:00+01:00') });
await page.goto(new URL('../' + process.argv[2], import.meta.url).href);
await page.waitForTimeout(600);
const r = await page.evaluate(() => ({ large: document.documentElement.scrollWidth, vue: window.innerWidth, ajd: (document.querySelector('.j.ajd .n') || {}).textContent || '', texte: document.body.innerText }));
console.log('erreurs', JSON.stringify(errs), '· largeur', r.large, '/', r.vue, '· aujourd\'hui :', r.ajd);
if (process.env.TEXTE) console.log(r.texte);
await b.close();
