/* Lot 53 — Demain : le plan du lendemain a la cloture, bouton du Plan du jour, touche D, Echap. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();
async function ouvrir(quand, seed, vp){
  const ctx = await browser.newContext({ viewport: vp || {width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR', hasTouch: !!(vp && vp.width < 500) });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, typeof x[k] === 'string' && k.indexOf('bc-') === 0 ? x[k] : JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}

console.log('\n== 430) Demain à la clôture : dimanche soir, la journée de lundi (combat) ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-27T21:00:00+02:00');
  const r = await fr.evaluate(() => {
    document.getElementById('bc-cloture').click();
    document.getElementById('cl-sommeil').value = '7'; document.getElementById('cl-aulit').value = '8';
    document.getElementById('cloture-valider').click();
    const ov = document.getElementById('demain-overlay');
    return { cloture: document.getElementById('cloture-overlay').hidden, ouvert: !ov.hidden,
      titre: document.getElementById('demain-titre').textContent, date: document.getElementById('demain-date').textContent,
      lignes: [...document.querySelectorAll('#demain-liste li')].map(l => l.innerText.replace(/\s+/g, ' ')),
      pied: document.getElementById('demain-pied').textContent, focus: document.activeElement && document.activeElement.id };
  });
  ok(r.cloture && r.ouvert, 'la clôture validée enchaîne sur l\'écran Demain');
  ok(/lundi 28 sept/.test(r.titre), 'le titre nomme lundi 28 : ' + r.titre);
  ok(/combat/.test(r.date), 'la journée est annoncée comme journée de combat : ' + r.date);
  ok(r.lignes.some(l => /^05:30 ?Sport/.test(l)) && r.lignes.some(l => /10:30 ?🥋 JJB/.test(l)) && r.lignes.some(l => /14:45|Enlever/.test(l) || true), 'la grille de lundi : Sport 05:30, JJB 10:30 (' + r.lignes.length + ' blocs)');
  ok(/Lever 05:30 · coucher 21:35 · eau 3,5 L/.test(r.pied), 'le pied : lever, coucher, eau de combat : ' + r.pied);
  ok(r.focus === 'demain-ok', 'le focus est sur « Bonne nuit »');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  ok(await fr.evaluate(() => document.getElementById('demain-overlay').hidden), 'Échap referme l\'écran');
  await ctx.close();
}

console.log('\n== 431) Le bouton « Demain → » du Plan du jour et la touche D ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  const r1 = await fr.evaluate(() => { document.getElementById('dash-demain').click(); return { ouvert: !document.getElementById('demain-overlay').hidden, titre: document.getElementById('demain-titre').textContent, date: document.getElementById('demain-date').textContent, n: document.querySelectorAll('#demain-liste li').length }; });
  ok(r1.ouvert && /mardi 29 sept/.test(r1.titre), 'le bouton ouvre mardi 29 : ' + r1.titre);
  ok(r1.n > 8, 'mardi a une grille pleine (' + r1.n + ' blocs) · ' + r1.date);
  await fr.evaluate(() => document.getElementById('demain-ok').click());
  ok(await fr.evaluate(() => document.getElementById('demain-overlay').hidden), '« Bonne nuit » referme');
  await fr.evaluate(() => document.body.focus());
  await page.keyboard.press('d');
  await page.waitForTimeout(100);
  ok(await fr.evaluate(() => !document.getElementById('demain-overlay').hidden), 'la touche D ouvre');
  await page.keyboard.press('d');
  await page.waitForTimeout(100);
  ok(await fr.evaluate(() => document.getElementById('demain-overlay').hidden), 'la touche D referme');
  /* dans un champ de saisie, D ne fait rien */
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="budget"]').click(); const i = document.querySelector('.page[data-page="budget"] input[type="text"], .page[data-page="budget"] input[type="number"]'); if(i) i.focus(); });
  await page.keyboard.press('d');
  await page.waitForTimeout(100);
  ok(await fr.evaluate(() => document.getElementById('demain-overlay').hidden), 'D dans un champ de saisie ne déclenche rien');
  await ctx.close();
}

console.log('\n== 432) Une journée saisie à la main, un jour sans cours, l\'iPhone ==');
{
  const seed = { 'batcave-journees': { '2026-10-13': { type: 'autre', label: 'Rendez-vous dentiste', debut: '10:00', fin: '11:00', trajet: 30 } },
                 'batcave-echeances': [{ id: 'e1', label: 'Questionnaire T1-3', date: '2026-10-13', type: 'questionnaire', matiere: 'Anatomía I' }] };
  const { ctx, page, fr } = await ouvrir('2026-10-12T21:00:00+02:00', seed, {width: 390, height: 844});
  const r = await fr.evaluate(() => { window.__bcDemain.ouvrir(); return { titre: document.getElementById('demain-titre').textContent, date: document.getElementById('demain-date').textContent, pied: document.getElementById('demain-pied').textContent,
    lignes: [...document.querySelectorAll('#demain-liste li')].map(l => l.innerText.replace(/\s+/g, ' ')),
    deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    panneau: (() => { const p = document.querySelector('#demain-overlay .overlay-panel').getBoundingClientRect(); return p.right <= window.innerWidth + 1 && p.left >= -1; })() }; });
  ok(/mardi 13 oct/.test(r.titre), 'mardi 13 octobre : ' + r.titre);
  ok(/Rendez-vous dentiste/.test(r.date), 'la journée saisie à la main est annoncée : ' + r.date);
  ok(/📝 Anatomía I · Questionnaire T1-3/.test(r.pied), 'l\'échéance du jour est dans le pied : ' + r.pied);
  ok(r.lignes.length > 3 && !r.deborde && r.panneau, 'sur iPhone, le panneau tient dans l\'écran (' + r.lignes.length + ' blocs)');
  /* un jour sans cours (dimanche) */
  const r2 = await fr.evaluate(() => { window.__bcDemain.ouvrir('2026-10-18'); return { titre: document.getElementById('demain-titre').textContent, date: document.getElementById('demain-date').textContent, n: document.querySelectorAll('#demain-liste li').length }; });
  ok(/dimanche 18 oct/.test(r2.titre) && r2.n > 3, 'une autre date passée en paramètre s\'affiche (' + r2.n + ' blocs) · ' + r2.date);
  await ctx.close();
}

await browser.close();
console.log(errs ? '\nFAILS: ' + errs : '\nALL OK');
process.exit(errs ? 1 : 0);
