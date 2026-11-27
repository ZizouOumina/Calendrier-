/* 27 novembre, ses mots : « on m'a dit que je mangeais pas assez de viande », puis « ok passe la viande à 100 g dès
   maintenant ». 100 g de poulet à midi, 100 g de viande hachée le soir, dès la semaine du jour 1 (VIANDE_100_DEBUT, le
   dimanche 22 novembre : l'onglet Meal prep montre la semaine du dimanche au samedi) ; les jours d'avant gardent 70 g.
   1. Les repas : les grammes, les macros du repas et du jour, le libellé de l'item.
   2. La liste de courses et le coût : 600 g de poulet, 700 g de viande hachée, ≈ 228 € par mois en caisse.
   3. Le batch : dimanche 200 g et 300 g (deux fournées), mardi 400 g et 400 g ; au rangement, 400 g et 400 g au congélateur.
   4. Le jour 1 : les consignes des courses et du dîner disent 100 g (800 g de viande hachée au lieu de 700).
   5. Le jour 1, l'onglet Meal prep ne mêle pas 70 et 100 g. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();

async function ouvrir(quand, graine){
  const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(graine) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, graine);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const aller = async (fr, page, p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(250); };
const sous = async (fr, page, s) => { await fr.evaluate(x => { const b = document.querySelector('.sous-onglet[data-sousnav="' + x + '"]'); if(b) b.click(); }, s); await page.waitForTimeout(250); };
const texte = (fr, id) => fr.evaluate(x => { const e = document.getElementById(x); return e ? e.innerText.replace(/\s+/g, ' ') : null; }, id);
/* consigneBloc(label, dow, iso, heure) */
const C = (fr, label, iso, heure) => fr.evaluate(([l, i, h]) => window.__bcConsigne(l, new Date(i + 'T12:00:00').getDay(), i, h), [label, iso, heure]);

console.log('\n== 1) Les repas : 100 g dès la semaine du jour 1, 70 g avant ==');
{
  const { ctx, page, fr } = await ouvrir('2026-11-30T12:30:00+01:00');
  const r = await fr.evaluate(() => {
    const c = (n, iso) => window.__bcCompoRepas(n, iso, false).map(x => x.c + ' ' + x.q).join(', ');
    const m = (n, iso) => window.__bcMacrosRepas({name: n}, iso);
    return {
      dejAvant: c('Déjeuner', '2026-11-21'), dinAvant: c('Dîner', '2026-11-21'), jourAvant: window.__bcMacrosJour('2026-11-21'),
      dejSem: c('Déjeuner', '2026-11-23'), dinSem: c('Dîner', '2026-11-22'),
      dej: c('Déjeuner', '2026-11-30'), din: c('Dîner', '2026-11-30'), dejDim: c('Déjeuner', '2026-12-06'), dinDim: c('Dîner', '2026-12-06'),
      mDej: m('Déjeuner', '2026-11-30'), mDin: m('Dîner', '2026-11-30'),
      sam: window.__bcMacrosJour('2026-11-28'), mar: window.__bcMacrosJour('2026-12-01'), mer: window.__bcMacrosJour('2026-12-02'), dim: window.__bcMacrosJour('2026-12-06'),
      juin: c('Dîner', '2027-06-05'), brut: window.__bcCompoRepas('Dîner', '2026-12-14', true).map(x => x.c + ' ' + x.q).join(', ')
    };
  });
  ok(/poulet 70/.test(r.dejAvant) && /hachee 70/.test(r.dinAvant), 'le samedi 21 novembre garde ses 70 g (' + r.dejAvant + ' · ' + r.dinAvant + ')');
  ok(r.jourAvant.kcal === 3275 && r.jourAvant.p === 131, 'et sa journée : 3 275 kcal, 131 g de protéines (' + r.jourAvant.kcal + ' · ' + r.jourAvant.p + ')');
  ok(/poulet 100/.test(r.dejSem) && /hachee 100/.test(r.dinSem), 'dès le dimanche 22, le début de la semaine du jour 1 : 100 g (' + r.dejSem + ' · ' + r.dinSem + ')');
  ok(r.dej === 'pates 125, poulet 100, legumes 80, huile 30', 'le déjeuner du lundi 30 : pâtes 125, poulet 100, légumes 80, huile 30 (' + r.dej + ')');
  ok(r.din === 'riz 125, hachee 100, legumes 80, huile 25', 'le dîner : riz 125, viande hachée 100, légumes 80, huile 25 — l\'huile et le riz ne bougent pas (' + r.din + ')');
  ok(/oeufs 150/.test(r.dejDim) && !/poulet/.test(r.dejDim) && /hachee 100/.test(r.dinDim), 'le dimanche midi reste un repas frais (3 œufs), le soir 100 g (' + r.dejDim + ')');
  ok(r.mDej.kcal === 849 && r.mDej.p === 40, 'le déjeuner : 849 kcal, 40 g de protéines (' + r.mDej.kcal + ' · ' + r.mDej.p + ')');
  ok(r.mDin.kcal === 836 && r.mDin.p === 33, 'le dîner : 836 kcal, 33 g de protéines (' + r.mDin.kcal + ' · ' + r.mDin.p + ')');
  ok(r.sam.kcal === 3348 && r.sam.p === 144, 'un samedi : 3 348 kcal, 144 g (' + r.sam.kcal + ' · ' + r.sam.p + ')');
  ok(r.mar.kcal === 3311 && r.mar.p === 146, 'un mardi (sardines) : 3 311 kcal, 146 g (' + r.mar.kcal + ' · ' + r.mar.p + ')');
  ok(r.mer.kcal === 3905 && r.mer.p === 155, 'un jour de JJB : 3 905 kcal, 155 g (' + r.mer.kcal + ' · ' + r.mer.p + ')');
  ok(r.dim.kcal === 3368 && r.dim.p === 140, 'un dimanche : 3 368 kcal, 140 g (' + r.dim.kcal + ' · ' + r.dim.p + ')');
  ok(/hachee 100/.test(r.juin) && /hachee 100/.test(r.brut), 'jusqu\'à la fin de la saison, et dans le plan brut de la liste de courses');
  await aller(fr, page, 'repas');
  const grille = await texte(fr, 'meal-grid'), desc = await texte(fr, 'repas-desc');
  ok(/Protéine crue — Poulet 100g/.test(grille) && /Protéine crue — Viande hachée 5 % 100g/.test(grille), 'l\'onglet Repas écrit « Poulet 100g » et « Viande hachée 5 % 100g »');
  ok(!/70g/.test(grille.replace(/7 dattes \(70g\)/g, '')), 'plus aucun « 70g » hors des dattes');
  ok(/~849 kcal · P40/.test(grille) && /~836 kcal · P33/.test(grille), 'les macros des deux repas suivent');
  ok(/3348 kcal, P 144 g/.test(desc), 'le programme du jour (un lundi sans JJB : il reprend le mercredi 2 décembre) : ' + desc.slice(0, 70));
  await ctx.close();
}

console.log('\n== 2) La liste de courses et le coût ==');
{
  const { ctx, page, fr } = await ouvrir('2026-12-05T13:35:00+01:00');
  const r = await fr.evaluate(() => {
    const b = window.__bcBesoinSemaine, cs = window.__bcCoutSemaine(), am = window.__bcCoutAchats();
    const l = []; window.__bcPlanCourses().forEach(c => c.items.forEach(it => { if(/Poulet|Viande/.test(it.label)) l.push(it.label + ' ' + it.qte + ' ' + it.achat); }));
    return {poulet: b.poulet, hachee: b.hachee, oeufs: b.oeufs, riz: b.riz, pates: b.pates, huile: b.huile, sem: cs.total, mois: am.mois, achats: am.total, lignes: l};
  });
  ok(r.poulet === 600 && r.hachee === 700, 'le besoin de la semaine : 600 g de poulet (six midis), 700 g de viande hachée (sept soirs) — ' + r.poulet + ' · ' + r.hachee);
  ok(r.oeufs === 18 && r.riz === 875 && r.pates === 875 && r.huile === 375, 'le reste ne bouge pas : 18 œufs, 875 g de riz, 875 g de pâtes, 375 ml d\'huile');
  ok(r.lignes.join(' | ') === 'Poulet 600 g 600 | Viande hachée 5 % 700 g 700', 'la liste : ' + r.lignes.join(' | '));
  ok(Math.abs(r.sem - 49.63) < 0.01, 'ce qu\'il mange : 49,63 € par semaine (' + r.sem.toFixed(2) + ')');
  ok(Math.abs(r.achats - 52.57) < 0.01 && Math.round(r.mois) === 228, 'en caisse : 52,57 € par semaine, ≈ 228 € par mois (' + r.achats.toFixed(2) + ' · ' + r.mois.toFixed(2) + ')');
  await aller(fr, page, 'repas'); await sous(fr, page, 'courses');
  const grille = await texte(fr, 'courses-grid'), budget = await texte(fr, 'courses-budget');
  ok(/Poulet — 600 g/.test(grille) && /Viande hachée 5 % — 700 g/.test(grille), 'l\'onglet Courses : « Poulet — 600 g », « Viande hachée 5 % — 700 g »');
  ok(/227,82 € par mois en caisse/.test(budget) && /49,63 € par semaine/.test(budget), 'et son coût : 227,82 € par mois en caisse');
  await ctx.close();
}

console.log('\n== 3) Le batch : les quantités à cuire ==');
{
  const { ctx, page, fr } = await ouvrir('2026-11-29T14:35:00+01:00');
  const dim = await C(fr, '🍲 Batch cooking de la semaine', '2026-11-29', '14:30');
  ok(/le poulet \(200 g\)/.test(dim) && /La viande hachée \(300 g\), en deux fournées, 10 min chacune/.test(dim), 'le dimanche 29 : 200 g de poulet, 300 g de viande hachée en deux fournées');
  const rangement = await C(fr, 'Rangement des courses', '2026-12-05', '15:30');
  ok(/400 g de poulet et 400 g de viande hachée \(mercredi à samedi\)/.test(rangement), 'au rangement du samedi : 400 g et 400 g au congélateur, pour la session du mardi');
  const midi = await C(fr, 'Déjeuner', '2026-11-30', '12:20'), soir = await C(fr, 'Dîner', '2026-11-30', '20:00');
  ok(/poulet 100 g/.test(midi) && /viande hachée 100 g/.test(soir), 'les consignes des repas : « poulet 100 g », « viande hachée 100 g »');
  await aller(fr, page, 'repas'); await sous(fr, page, 'prep');
  const cuire = await texte(fr, 'prep-cuire'), ordre = await texte(fr, 'prep-ordre');
  ok(/Poulet 200 g crus/.test(cuire) && /Viande hachée 5 % 300 g crus/.test(cuire) && /Poulet 400 g crus/.test(cuire) && /Viande hachée 5 % 400 g crus/.test(cuire), 'l\'onglet Meal prep : 200 et 300 g le dimanche, 400 et 400 g le mardi');
  ok(/Le poulet — 200 g/.test(ordre) && /La viande hachée — 300 g, en deux fournées, 10 min chacune/.test(ordre) && /La viande hachée — 400 g, en deux fournées/.test(ordre), 'et l\'ordre minuté : deux fournées de viande hachée aux deux sessions');
  ok(/14:48 La viande hachée/.test(ordre) && /15:15 Tout refroidir/.test(ordre), 'les deux fournées (14:48 → 15:08) tiennent avant le refroidissement de 15:15');
  await ctx.close();
}

console.log('\n== 4) Le jour 1 : les courses et le dîner du samedi 28 ==');
{
  const { ctx, page, fr } = await ouvrir('2026-11-28T13:35:00+01:00');
  const courses = await C(fr, '🛒 Courses de la semaine', '2026-11-28', '13:30');
  ok(/100 g de viande hachée pour le dîner \(800 g au lieu de 700\)/.test(courses), 'les courses : 100 g de viande hachée en plus pour ce soir, 800 g au lieu de 700');
  const diner = await C(fr, 'Dîner', '2026-11-28', '19:30');
  ok(/100 g de la viande hachée achetée cet après-midi/.test(diner) && !/70 g/.test(diner), 'le dîner : 100 g de la viande hachée achetée cet après-midi');
  const rangement = await C(fr, 'Rangement des courses', '2026-11-28', '15:30');
  ok(/400 g de poulet et 400 g de viande hachée/.test(rangement), 'le rangement : 400 g et 400 g au congélateur');
  await aller(fr, page, 'journee');
  const mj = await fr.evaluate(() => document.querySelector('.page.active').innerText);
  ok(/100 g de viande hachée pour le dîner \(800 g au lieu de 700\)/.test(mj) && !/560 g au lieu de 490/.test(mj), '« Ma journée » le dit aussi, sans reste des anciens grammes');
  await aller(fr, page, 'repas');
  const desc = await texte(fr, 'repas-desc');
  ok(/3348 kcal, P 144 g/.test(desc) && /100 g de la viande hachée/.test(desc), 'l\'onglet Repas : 3 348 kcal, 144 g, et l\'exception du jour 1 à 100 g');

  console.log('\n== 5) Le jour 1, l\'onglet Meal prep ne mêle pas 70 et 100 g ==');
  await sous(fr, page, 'prep');
  const cuire = await texte(fr, 'prep-cuire'), ordre = await texte(fr, 'prep-ordre');
  ok(!/310 g/.test(cuire + ordre) && !/140 g/.test(cuire + ordre) && !/210 g/.test(cuire + ordre), 'ni « 310 g » ni les anciens 140 et 210 g');
  ok(/Poulet 200 g crus/.test(cuire) && /Viande hachée 5 % 300 g crus/.test(cuire) && /Poulet 400 g crus/.test(cuire) && /Viande hachée 5 % 400 g crus/.test(cuire), 'les mêmes quantités que la liste de courses : 200 + 400 g de poulet, 300 + 400 g de viande hachée');
  await sous(fr, page, 'courses');
  const grille = await texte(fr, 'courses-grid');
  ok(/Poulet — 600 g/.test(grille) && /Viande hachée 5 % — 700 g/.test(grille), 'en face, la liste : 600 g et 700 g');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT EST VERT');
process.exit(errs ? 1 : 0);
