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
  ok(c.n === 20, '20 articles (18 chaque semaine, riz et pâtes séparés, plus l\'huile)');
  ok(c.items.some(t => /^Riz — 500 g \(~0,6 €\)$/.test(t)) && c.items.some(t => /^Pâtes — 600 g \(~0,6 €\)$/.test(t)), 'Riz 500 g le midi, pâtes 600 g le soir (' + c.items.find(t => /^Pâtes/.test(t)) + ')');
  ok(c.items.some(t => /^Poulet — 700 g/.test(t)) && c.items.some(t => /^Viande hachée 5 % — 900 g/.test(t)) && c.items.some(t => /^Saumon — 400 g/.test(t)), 'protéines : poulet 700 g, viande hachée 900 g, saumon 400 g — ' + c.items.filter(t => /^(Poulet|Viande|Saumon)/.test(t)).join(' · '));
  ok(c.items.some(t => /^Œufs — 15/.test(t)) && c.items.some(t => /^Légumes verts surgelés — 2\u202f250 g/.test(t)) && c.items.some(t => /^Huile d'olive — 1\u202f000 ml/.test(t)), 'œufs, légumes surgelés, et l\'huile dans le bloc des 4 semaines');
  ok(/Aucun ajustement/.test(c.note), 'note : ' + c.note.slice(0, 60));
  const bud = c.budget.match(/~(\d+(?:,\d)?) € \/ semaine.*?plus ~(\d+(?:,\d)?) € toutes les 4 semaines/);
  ok(!!bud && Number(bud[1].replace(',', '.')) > 45 && Number(bud[1].replace(',', '.')) < 60 && Number(bud[2].replace(',', '.')) === 7, 'budget : ~52 € / semaine + ~7 € toutes les 4 semaines : ' + c.budget.slice(0, 90));
  await page_(fr, 'repas');
  const r = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)) }) && [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText);
  ok(/Pâtes 85g/.test(r) && /~726 kcal/.test(r) && /Viande hachée 5 % 145g/.test(r) && /Huile d'olive \(15ml\)/.test(r), 'dîner de base du mardi : pâtes 85 g, viande hachée 145 g, huile 15 ml, ~726 kcal');
  await ctx.close();
}

console.log('\n== 181) Avec +150 kcal : le dîner et les courses l\'écrivent ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, {'batcave-kcal-ajustement': {valeur:150, depuis:'2026-09-01'}});
  await page_(fr, 'repas');
  const r = await fr.evaluate(() => [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText);
  ok(/Pâtes 125g/.test(r), 'féculent du dîner : pâtes 125 g (+40)');
  ok(/boucle kcal \+150 kcal/.test(r) && /~876 kcal/.test(r), 'le dîner annonce ~876 kcal et la boucle');
  const sub = await fr.evaluate(() => document.getElementById('meal-kcal-sub').textContent);
  ok(/\/ 3216 kcal \(plan 3066 \+ 150\)/.test(sub), 'cible du jour : ' + sub);
  /* cocher tout le dîner : l\'apport consommé porte les 150 kcal */
  /* un clic redessine la grille : on re-cherche la première case non cochée du dîner à chaque tour */
  await fr.evaluate(() => { for(let i = 0; i < 10; i++){ const card = [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)); const cb = card && card.querySelector('input:not(:checked)'); if(!cb) break; cb.click(); } });
  await page.waitForTimeout(200);
  const sub2 = await fr.evaluate(() => document.getElementById('meal-kcal-sub').textContent);
  ok(/^876 \/ 3216 kcal/.test(sub2), 'dîner coché : ' + sub2);
  await page_(fr, 'courses');
  const c = await fr.evaluate(() => ({ items: [...document.querySelectorAll('#courses-grid label')].map(l => l.textContent), note: document.getElementById('courses-plan-note').textContent }));
  ok(c.items.some(t => /^Pâtes — 880 g \(dont \+280 g boucle kcal\)/.test(t)), 'Pâtes : 600 + 280 g de boucle kcal (' + c.items.find(t => /^Pâtes/.test(t)) + ')');
  ok(/\+150 kcal\/jour/.test(c.note) && /\+40 g de pâtes crues/.test(c.note) && /\+280 g sur la semaine/.test(c.note), 'note : ' + c.note.slice(0, 120));
  ok(c.items.filter(t => /^Poulet/.test(t)).length === 1 && /700 g/.test(c.items.find(t => /^Poulet/.test(t))), 'les protéines ne bougent pas');
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
    courses: (document.querySelector('.nav-btn[data-page="courses"]').click(), [...document.querySelectorAll('#courses-grid label')].map(l => l.textContent).find(t => /^Pâtes/.test(t))) }));
  ok(/Pâtes 125g/.test(apres.diner) && /880 g/.test(apres.courses), 'après « Appliquer » : dîner à 125 g de pâtes, courses à 880 g');
  await page_(fr, 'repas');
  await fr.evaluate(() => document.getElementById('kcal-reset').click());
  await page.waitForTimeout(250);
  const retour = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText,
    courses: (document.querySelector('.nav-btn[data-page="courses"]').click(), [...document.querySelectorAll('#courses-grid label')].map(l => l.textContent).find(t => /^Pâtes/.test(t))) }));
  ok(/Pâtes 85g/.test(retour.diner) && /600 g/.test(retour.courses), 'après « Revenir au plan de base » : 85 g et 600 g');
  await ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
