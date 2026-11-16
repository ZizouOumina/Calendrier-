/* 16 novembre, tard le soir : le suivi allégé. Sa question : « est-ce que ça fait beaucoup, est-ce que j'ai vraiment
   besoin de suivre tout ça ou c'est contre-productif ». Sa décision : « enlève ça vu que ma journée les traque » --
   les repas aliment par aliment, les cases de routine (ménage, linge, serviettes, entretien…), et à la clôture l'eau,
   les pas, l'humeur, Anki et les compléments.
   Ce test vérifie : la routine sort des cases (sansCase) mais garde ses dates et se lit dans « Ma journée » ; une case
   se remet d'un geste et le reste au rechargement ; les repas n'ont plus de case ; la clôture n'a plus ces champs ; le
   score, la semaine et les analyses ne comptent plus ce qui ne se note plus. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();

async function ouvrir(quand){
  const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const aller = async (fr, page, p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(250); };
const lire = (fr, k) => fr.evaluate(x => JSON.parse((window.__bcLire || ((c) => localStorage.getItem(c)))(x) || 'null'), k);
const DIMANCHE = '2026-11-22T20:00:00+01:00';

console.log('\n== 1) La routine sort des cases, et garde ses dates ==');
{
  const { ctx, page, fr } = await ouvrir(DIMANCHE);
  const habs = await lire(fr, 'batcave-habits');
  const routine = habs.filter(h => h.sansCase).map(h => h.id);
  ok(await lire(fr, 'batcave-sans-case-v1') === true, 'le drapeau sans-case-v1 est posé');
  ok(['core-lit','core-menage','core-draps','core-entretien-semaine','core-brosse-dents','core-creatine','core-frigo','core-robot-filtre'].every(i => routine.includes(i)),
     'la routine est sans case (' + routine.length + ' habitudes)');
  ok(!habs.some(h => ['core-fajr','core-etirements','core-pesee-dim','core-es-formulas'].includes(h.id) && h.sansCase), 'les prières, les étirements, la pesée et l\'espagnol restent des cases');
  const r = await fr.evaluate(() => {
    const dow = 0, iso = '2026-11-22';
    return { tout: window.__bcHabitsDuJour(dow, iso).map(h => h.id),
             dash: [...document.querySelectorAll('#dash-checklist [data-togglehab]')].map(x => x.dataset.togglehab) };
  });
  ok(r.tout.includes('core-brosse-dents') && r.tout.includes('core-menage'), 'ses dates tiennent : la brosse à dents et le ménage tombent le dimanche 22');
  ok(!r.dash.includes('core-brosse-dents') && !r.dash.includes('core-menage') && r.dash.includes('core-pesee-dim'), 'le tableau de bord ne les propose plus à cocher, la pesée oui');
  await aller(fr, page, 'journee');
  const j = await fr.evaluate(() => ({ cases: [...document.querySelectorAll('#mj-cases input[data-mj-hab]')].map(x => x.dataset.mjHab),
                                       routine: [...document.querySelectorAll('#mj-routine li')].map(x => x.textContent) }));
  ok(!j.cases.includes('core-menage') && j.routine.some(x => /Ménage du dimanche/.test(x)) && j.routine.some(x => /Brosse à dents/.test(x)),
     '« Ma journée » les dit dans « La routine du jour » : ' + j.routine.length + ' lignes');
  const menage = await fr.evaluate(() => window.__bcConsigne('🧽 Ménage — sols, salle de bain, poussière', 0, '2026-11-22', '16:30'));
  ok(/brosses démêlées/.test(menage), 'et la consigne du ménage dit toujours l\'entretien du robot, le jour dit');
  await ctx.close();
}

console.log('\n== 2) Une case se remet d\'un geste, et le reste ==');
{
  const { ctx, page, fr } = await ouvrir(DIMANCHE);
  await aller(fr, page, 'habitudes');
  const n = await fr.evaluate(() => ({ visible: !document.getElementById('habits-sans-case').hidden, n: document.querySelectorAll('#habits-sans-case [data-remettrecase]').length }));
  ok(n.visible && n.n >= 20, 'l\'onglet Habitudes liste la routine, « Dans Ma journée, sans case » (' + n.n + ')');
  await fr.evaluate(() => document.querySelector('#habits-sans-case [data-remettrecase="core-menage"]').click());
  await page.waitForTimeout(250);
  const h = (await lire(fr, 'batcave-habits')).find(x => x.id === 'core-menage');
  ok(h && h.sansCase === false, 'le ménage redevient une case');
  await page.reload({ timeout:20000 }).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(300);
  const dash = await fr2.evaluate(() => [...document.querySelectorAll('#dash-checklist [data-togglehab]')].map(x => x.dataset.togglehab));
  ok(dash.includes('core-menage') && !dash.includes('core-draps'), 'au rechargement, la case remise le reste (la migration ne repasse pas)');
  await ctx.close();
}

console.log('\n== 3) Les repas : la carte du jour, sans case ==');
{
  const { ctx, page, fr } = await ouvrir('2026-11-23T12:00:00+01:00');
  await aller(fr, page, 'repas');
  const r = await fr.evaluate(() => ({ cases: document.querySelectorAll('#meal-grid input').length, items: document.querySelectorAll('#meal-grid li').length,
    apport: !!document.getElementById('meal-kcal-fill').closest('.panel[hidden]'), barre: !!document.getElementById('meal-fill').closest('[hidden]'),
    boucle: !document.getElementById('kcal-panel').hidden || document.getElementById('kcal-panel').offsetParent !== null,
    desc: document.getElementById('repas-desc').textContent,
    dash: !!document.getElementById('dash-meals').closest('.panel[hidden]') }));
  ok(r.cases === 0 && r.items > 15, 'les repas s\'affichent sans case (' + r.items + ' aliments)');
  ok(r.apport && r.barre && r.dash, 'l\'apport du jour, la barre et le panneau du tableau de bord sont masqués');
  ok(!/réinitialisent/.test(r.desc) && /kcal/.test(r.desc), 'l\'en-tête dit le plan du jour, plus « les cases se réinitialisent »');
  ok(r.boucle, 'la boucle poids → calories reste');
  await ctx.close();
}

console.log('\n== 4) La clôture : plus d\'eau, de pas, d\'humeur, d\'Anki ni de compléments ==');
{
  const { ctx, page, fr } = await ouvrir(DIMANCHE);
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(250);
  const r = await fr.evaluate(() => {
    const cache = id => { const e = document.getElementById(id); return !!(e && e.closest('[hidden]')); };
    return { eau: cache('cl-eau'), pas: cache('cl-pas'), humeur: cache('cl-humeur'), anki: cache('cl-ak-dus'), ankiSem: cache('cl-anki-revues'), comp: cache('cl-complements'),
             sommeil: !cache('cl-sommeil'), poids: !cache('cl-poids'), coran: !cache('cl-coran'),
             restantes: [...document.querySelectorAll('#cl-habitudes [data-cl-hab]')].map(x => x.dataset.clHab) };
  });
  ok(r.eau && r.pas && r.humeur && r.anki && r.ankiSem && r.comp, 'l\'eau, les pas, l\'humeur, Anki (du jour et de la semaine) et les compléments sont masqués');
  ok(r.sommeil && r.poids && r.coran, 'le sommeil, le poids et le Coran restent');
  ok(!r.restantes.includes('core-menage') && r.restantes.includes('core-pesee-dim'), 'les cases à cocher ne proposent plus la routine');
  await ctx.close();
}

console.log('\n== 5) Le score, la semaine et les analyses ne comptent plus ce qui ne se note plus ==');
{
  const { ctx, page, fr } = await ouvrir(DIMANCHE);
  const j = await fr.evaluate(() => document.getElementById('dash-journal').innerText);
  ok(!/Eau/.test(j) && !/Humeur/.test(j) && /Sommeil/.test(j), 'le journal du tableau de bord : le Coran et le sommeil, plus l\'eau ni l\'humeur');
  ok(await fr.evaluate(() => document.getElementById('cal-water-actions').hidden), 'le Calendrier n\'a plus de compteur d\'eau');
  await aller(fr, page, 'bilan');
  const b = await fr.evaluate(() => [...document.querySelectorAll('#bilan-grid .bilan-card')].map(x => x.innerText.replace(/\s+/g, ' ')));
  ok(b.length === 9 && !b.some(x => /Eau \/ jour|Nutrition|Pas \/ jour/.test(x)), 'la semaine : neuf chiffres, sans l\'eau, la nutrition ni les pas');
  const ins = await fr.evaluate(() => window.__bcInsights ? window.__bcInsights().map(x => x.title) : null);
  if(ins) ok(ins.length === 8 && !ins.includes('Balance énergétique'), 'huit analyses, sans la balance énergétique');
  await aller(fr, page, 'etudes');
  ok(await fr.evaluate(() => document.getElementById('anki-panel').hidden), 'le panneau Anki des études reste masqué');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
