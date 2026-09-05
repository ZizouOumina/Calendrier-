/* Repas → courses : la liste vient du plan × 7 jours, l'ajustement kcal se lit dans le féculent du dîner et dans les courses. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { if(sessionStorage.getItem('__a53')) return; sessionStorage.setItem('__a53','1'); Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const MARDI = '2026-09-08T10:00:00+02:00';
const page_ = (fr, p) => fr.evaluate(x => { document.querySelector('.nav-btn[data-page="' + x + '"]').click(); }, p);

console.log('\n== 180) Sans ajustement : plan de base, liste = plan × 7 ==');
{
  const { ctx, fr } = await ouvrir(MARDI);
  await page_(fr, 'courses');
  const c = await fr.evaluate(() => ({ items: [...document.querySelectorAll('#courses-grid label')].map(l => l.textContent), note: document.getElementById('courses-plan-note').textContent, budget: document.getElementById('courses-budget').textContent, n: document.querySelectorAll('#courses-grid input').length }));
  ok(c.n === 22, '22 articles, comme avant (les cases cochées gardent leur sens)');
  ok(c.items.some(t => /^Riz — 1,4 kg \(200 g\/j\) \(~1 €\)$/.test(t)), 'Riz : 200 g/j × 7 = 1,4 kg (' + c.items.find(t => /^Riz/.test(t)) + ')');
  ok(c.items.some(t => /^Poulet — 1,8 kg \(255 g\/j\)/.test(t)), 'Poulet : 255 g/j × 7 = 1,8 kg');
  ok(c.items.some(t => /^Œufs — 21/.test(t)) && c.items.some(t => /^Légumes verts — 2,8 kg/.test(t)), 'œufs et légumes suivent le plan');
  ok(/Aucun ajustement/.test(c.note), 'note : ' + c.note.slice(0, 60));
  const bud = c.budget.match(/~(\d+(?:,\d)?) € à ~(\d+(?:,\d)?) € \/ semaine/);
  ok(!!bud && Number(bud[1].replace(',', '.')) > 55 && Number(bud[2].replace(',', '.')) > Number(bud[1].replace(',', '.')), 'budget calculé du moins cher au plus cher : ' + c.budget.slice(0, 70));
  await page_(fr, 'repas');
  const r = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)) }) && [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText);
  ok(/Riz 110g/.test(r) && /~845 kcal/.test(r), 'dîner de base : riz 110 g, ~845 kcal');
  await ctx.close();
}

console.log('\n== 181) Avec +150 kcal : le dîner et les courses l\'écrivent ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, {'batcave-kcal-ajustement': {valeur:150, depuis:'2026-09-01'}});
  await page_(fr, 'repas');
  const r = await fr.evaluate(() => [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText);
  ok(/Riz 150g/.test(r) && /Pâtes 150g/.test(r) && /Pomme de terre 700g/.test(r) && /Patate douce 635g/.test(r), 'féculent du dîner : riz 150 g, pâtes 150 g, pomme de terre 700 g (+190), patate douce 635 g (+170)');
  ok(/boucle kcal \+150 kcal/.test(r) && /~995 kcal/.test(r), 'le dîner annonce ~995 kcal et la boucle');
  const sub = await fr.evaluate(() => document.getElementById('meal-kcal-sub').textContent);
  ok(/\/ 3237 kcal \(plan 3087 \+ 150\)/.test(sub), 'cible du jour : ' + sub);
  /* cocher tout le dîner : l\'apport consommé porte les 150 kcal */
  /* un clic redessine la grille : on re-cherche la première case non cochée du dîner à chaque tour */
  await fr.evaluate(() => { for(let i = 0; i < 10; i++){ const card = [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)); const cb = card && card.querySelector('input:not(:checked)'); if(!cb) break; cb.click(); } });
  await page.waitForTimeout(200);
  const sub2 = await fr.evaluate(() => document.getElementById('meal-kcal-sub').textContent);
  ok(/^995 \/ 3237 kcal/.test(sub2), 'dîner coché : ' + sub2);
  await page_(fr, 'courses');
  const c = await fr.evaluate(() => ({ items: [...document.querySelectorAll('#courses-grid label')].map(l => l.textContent), note: document.getElementById('courses-plan-note').textContent }));
  ok(c.items.some(t => /^Riz — 1,7 kg \(240 g\/j, dont \+40 g boucle kcal\)/.test(t)), 'Riz : 240 g/j (dont +40) × 7 = 1,7 kg (' + c.items.find(t => /^Riz/.test(t)) + ')');
  ok(c.items.some(t => /^Pomme de terre — 7,8 kg \(1120 g\/j, dont \+190 g boucle kcal\)/.test(t)), 'Pomme de terre : 1120 g/j dont +190 (densité plus faible) → 7,8 kg (' + c.items.find(t => /^Pomme/.test(t)) + ')');
  ok(/\+150 kcal\/jour/.test(c.note) && /\+40 g de riz cru/.test(c.note) && /\+280 g sur la semaine/.test(c.note), 'note : ' + c.note.slice(0, 120));
  ok(c.items.filter(t => /^Poulet/.test(t)).length === 1 && /1,8 kg/.test(c.items.find(t => /^Poulet/.test(t))), 'les protéines ne bougent pas');
  await ctx.close();
}

console.log('\n== 182) Appliquer / revenir depuis la boucle met tout à jour d\'un coup ==');
{
  const local = {};
  const d0 = new Date('2026-08-26T00:00:00');
  for(let i = 0; i < 14; i++){ const d = new Date(d0); d.setDate(d0.getDate() + i); local['batcave-journal-' + d.toISOString().slice(0,10)] = {poids: (64 + (i < 7 ? 0 : 0.02)).toFixed(2), sommeil:'', water:0, complements:[], notes:'', mood:null, coran:'', duaa:''}; }
  const { ctx, fr, page } = await ouvrir(MARDI, local);
  await page_(fr, 'repas');
  const b = await fr.evaluate(() => ({ note: document.getElementById('kcal-note').textContent, bouton: document.getElementById('kcal-appliquer').hidden }));
  ok(/\+150/.test(b.note) && b.bouton === false, 'la boucle recommande +150 kcal (' + b.note + ')');
  await fr.evaluate(() => document.getElementById('kcal-appliquer').click());
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText,
    courses: (document.querySelector('.nav-btn[data-page="courses"]').click(), [...document.querySelectorAll('#courses-grid label')].map(l => l.textContent).find(t => /^Riz/.test(t))) }));
  ok(/Riz 150g/.test(apres.diner) && /1,7 kg/.test(apres.courses), 'après « Appliquer » : dîner à 150 g de riz, courses à 1,7 kg');
  await page_(fr, 'repas');
  await fr.evaluate(() => document.getElementById('kcal-reset').click());
  await page.waitForTimeout(250);
  const retour = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText,
    courses: (document.querySelector('.nav-btn[data-page="courses"]').click(), [...document.querySelectorAll('#courses-grid label')].map(l => l.textContent).find(t => /^Riz/.test(t))) }));
  ok(/Riz 110g/.test(retour.diner) && /1,4 kg/.test(retour.courses), 'après « Revenir au plan de base » : 110 g et 1,4 kg');
  await ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
