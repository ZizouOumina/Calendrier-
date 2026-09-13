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
  /* Quatre rythmes : 10 articles frais chaque semaine, 5 reserves et 10 lignes de sante
     toutes les 4 semaines, 2 articles toutes les 5, 1 brosse a dents tous les 3 mois.
     Les produits MENAGERS (nettoyant sols, eponges, sacs poubelle) sont sortis de la
     Batcave a sa demande : il en a en reserve et les rachete au besoin. */
  ok(c.n === 28, '28 articles au total, tous rythmes confondus (' + c.n + ')');
  /* Deux chiffres par ligne, et il faut les deux : ce qu'on ACHETE (un multiple du
     conditionnement) et ce que le PLAN demande (la somme des 7 jours de repas). Riz
     135 g/jour -> 945/semaine -> 3 780 sur 4 semaines, donc 4 paquets de 1 kg ;
     pates 85 -> 595 -> 2 380, donc 5 paquets de 500 g. Acheter en dessous du besoin
     serait une rupture en milieu de cycle : l'arrondi va toujours VERS LE HAUT. */
  ok(c.items.some(t => /^Riz — 4 kg\b/.test(t) && /le plan en demande 3\u202f780 g/.test(t)), 'riz : 4 kg achetés pour 3 780 g demandés (' + c.items.find(t => /^Riz/.test(t)) + ')');
  ok(c.items.some(t => /^Pâtes — 2,5 kg\b/.test(t) && /le plan en demande 2\u202f380 g/.test(t)), 'pâtes : 2,5 kg achetés pour 2 380 g demandés (' + c.items.find(t => /^Pâtes/.test(t)) + ')');
  /* La rotation donne 5 dejeuners de poulet, 6 diners de viande hachee, 2 dejeuners et
     1 diner de saumon : 650, 870 et 405 g par semaine. */
  ok(c.items.some(t => /^Poulet — 1 kg\b/.test(t) && /demande 650 g/.test(t))
  && c.items.some(t => /^Viande hachée 5 % — 1 kg\b/.test(t) && /demande 870 g/.test(t))
  && c.items.some(t => /^Saumon — 500 g\b/.test(t) && /demande 405 g/.test(t))
  && c.items.some(t => /^Skyr — 2,5 kg\b/.test(t) && /demande 2\u202f135 g/.test(t))
  && !c.items.some(t => /^(Dattes|Cacahuètes|Lait)/.test(t)),
     'protéines de la rotation, achat / besoin : 1 kg/650 g, 1 kg/870 g, 500 g/405 g, skyr 2,5 kg/2 135 g — ' + c.items.filter(t => /^(Poulet|Viande|Saumon)/.test(t)).join(' · '));
  /* L'HUILE etait la vraie erreur : 288 ml par semaine, donc 1 152 sur 4 semaines alors
     que la liste disait 1 000 -- quatre jours de rupture par cycle, tous les mois. Elle
     passe a 5 semaines : 1 440 ml, soit 1,5 L, reste 60 ml. */
  ok(c.items.some(t => /^Œufs — 18\b/.test(t) && /demande 14 œufs/.test(t))
  && c.items.some(t => /^Légumes verts surgelés — 10 kg\b/.test(t) && /demande 9\u202f800 g/.test(t))
  && c.items.some(t => /^Huile d'olive — 1,5 L\b/.test(t) && /demande 1\u202f440 ml/.test(t)),
     'œufs 18 pour 14, surgelés 10 kg pour 9 800 g, huile 1,5 L pour 1 440 ml sur 5 semaines');
  /* Aucun stock n'est suppose : rien ne dit « tu en as », rien n'est repousse a plus tard. */
  ok(!c.items.some(t => /tu en as|il t’en reste|à racheter le/.test(t)), 'aucune ligne ne suppose un stock : tout part de zéro, il coche ce qu\'il a');
  ok(c.items.some(t => /^Shampooing/.test(t)) && c.items.some(t => /^Cotons-tiges/.test(t)) && c.items.some(t => /^Brosse à dents/.test(t)), 'santé et hygiène ont leurs lignes');
  /* Les produits menagers sont sortis a sa demande. */
  ok(!c.items.some(t => /^(Éponges|Sacs poubelle|Nettoyant sols)/.test(t)), 'plus de produits ménagers dans la Batcave');
  ok(/Aucun ajustement/.test(c.note), 'note : ' + c.note.slice(0, 60));
  /* Le frais baisse (le sec en est sorti) et le bloc de 4 semaines monte : il porte
     desormais les reserves ET l'hygiene, qui n'etait comptee nulle part avant. */
  const bud = c.budget.match(/~(\d+(?:,\d)?) € \/ semaine.*?plus ~(\d+(?:,\d)?) € toutes les 4 semaines.*?plus ~(\d+(?:,\d)?) € toutes les 12 semaines.*?~(\d+(?:,\d)?) € \/ mois/);
  ok(!!bud, 'le budget annonce les trois rythmes et un total mensuel : ' + c.budget.slice(0, 110));
  if(bud){
    const sem = Number(bud[1].replace(',', '.')), quatre = Number(bud[2].replace(',', '.')), mois = Number(bud[4].replace(',', '.'));
    ok(sem > 42 && sem < 52, 'frais : ' + sem + ' € / semaine');
    /* Le bloc de 4 semaines a maigri : les produits menagers en sont sortis, et l'huile
       comme le beurre de cacahuete sont passes sur le cycle de 5 semaines. */
    ok(quatre > 75 && quatre < 95, 'réserves + santé : ' + quatre + ' € toutes les 4 semaines');
    /* On relit TOUS les cycles annonces plutot que d'en coder trois en dur : le beurre de
       cacahuete en a ajoute un quatrieme, et une somme ecrite a la main aurait menti. */
    const cycles = [...c.budget.matchAll(/~([\d,]+) € toutes les (\d+) semaines/g)]
      .map(m => Number(m[1].replace(',', '.')) * 52 / 12 / Number(m[2]));
    const attendu = sem * 52 / 12 + cycles.reduce((a, x) => a + x, 0);
    ok(Math.abs(mois - attendu) < 1, 'le total mensuel est la somme de tous les cycles annoncés (' + mois + ' € vs ' + Math.round(attendu * 10) / 10 + ')');
  }
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
  ok(/\/ 3201 kcal \(plan 3051 \+ 150\)/.test(sub), 'cible du jour : ' + sub);
  /* cocher tout le dîner : l\'apport consommé porte les 150 kcal */
  /* un clic redessine la grille : on re-cherche la première case non cochée du dîner à chaque tour */
  await fr.evaluate(() => { for(let i = 0; i < 10; i++){ const card = [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)); const cb = card && card.querySelector('input:not(:checked)'); if(!cb) break; cb.click(); } });
  await page.waitForTimeout(200);
  const sub2 = await fr.evaluate(() => document.getElementById('meal-kcal-sub').textContent);
  ok(/^876 \/ 3201 kcal/.test(sub2), 'dîner coché : ' + sub2);
  await page_(fr, 'courses');
  const c = await fr.evaluate(() => ({ items: [...document.querySelectorAll('#courses-grid label')].map(l => l.textContent), note: document.getElementById('courses-plan-note').textContent }));
  /* L'ajustement suit le sac : +280 g par semaine font +1 120 g sur quatre semaines.
     Pas de ligne hebdomadaire en plus -- on n'achete pas un sachet de 280 g. */
  ok(c.items.some(t => /^Pâtes — 3,5 kg\b/.test(t) && /demande 3\u202f500 g/.test(t)), 'la boucle kcal remonte le besoin à (595 + 280) × 4 = 3 500 g, et l\'achat suit à 3,5 kg (' + c.items.find(t => /^Pâtes/.test(t)) + ')');
  ok(/\+150 kcal\/jour/.test(c.note) && /\+40 g de pâtes crues/.test(c.note) && /\+280 g sur la semaine/.test(c.note), 'note : ' + c.note.slice(0, 120));
  /* La boucle kcal ne touche QUE le feculent du diner : les proteines gardent la quantite
     de la rotation, 650 g de poulet par semaine. */
  ok(c.items.filter(t => /^Poulet/.test(t)).length === 1 && /650 g/.test(c.items.find(t => /^Poulet/.test(t))), 'les protéines ne bougent pas');
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
  ok(/Pâtes 125g/.test(apres.diner) && /3,5 kg/.test(apres.courses), 'après « Appliquer » : dîner à 125 g de pâtes, courses à 3,5 kg');
  await page_(fr, 'repas');
  await fr.evaluate(() => document.getElementById('kcal-reset').click());
  await page.waitForTimeout(250);
  const retour = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText,
    courses: (document.querySelector('.nav-btn[data-page="courses"]').click(), [...document.querySelectorAll('#courses-grid label')].map(l => l.textContent).find(t => /^Pâtes/.test(t))) }));
  ok(/Pâtes 85g/.test(retour.diner) && /2,5 kg/.test(retour.courses), 'après « Revenir au plan de base » : 85 g au dîner et 2,5 kg de pâtes');
  await ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
