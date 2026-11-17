/* 16 novembre, tard le soir : le suivi allégé. Sa question : « est-ce que ça fait beaucoup, est-ce que j'ai vraiment
   besoin de suivre tout ça ou c'est contre-productif ». Sa décision : « enlève ça vu que ma journée les traque » --
   les repas aliment par aliment, les cases de routine (ménage, linge, serviettes, entretien…), et à la clôture l'eau,
   les pas, l'humeur, Anki et les compléments.
   Ce test vérifie : la routine (sansCase) garde ses dates et a sa liste dans « Ma journée » ; les repas n'ont plus de
   case ; la clôture n'a plus ces champs ; le score, la semaine et les analyses ne comptent plus ce qui ne se note plus.
   17 novembre (test122) : la routine se recoche dans « Ma journée », l'onglet Habitudes et sa « Remettre la case »
   sont retirés, plus rien ne compte les cases. */
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
    return { tout: window.__bcHabitsDuJour(dow, iso).map(h => h.id), console: !!document.getElementById('dash-checklist') };
  });
  ok(r.tout.includes('core-brosse-dents') && r.tout.includes('core-menage'), 'ses dates tiennent : la brosse à dents et le ménage tombent le dimanche 22');
  ok(!r.console, 'le tableau de bord n\'a plus de console de cases (17 novembre : tout se coche dans « Ma journée »)');
  await aller(fr, page, 'journee');
  const j = await fr.evaluate(() => ({ cases: [...document.querySelectorAll('#mj-cases input[data-mj-hab]')].map(x => x.dataset.mjHab),
                                       routine: [...document.querySelectorAll('#mj-routine input[data-mj-hab]')].map(x => x.dataset.mjHab) }));
  ok(!j.cases.includes('core-menage') && j.routine.includes('core-menage') && j.routine.includes('core-brosse-dents') && j.cases.includes('core-pesee-dim'),
     '« Ma journée » range la routine dans sa liste, à cocher aussi : ' + j.routine.length + ' cases');
  const menage = await fr.evaluate(() => window.__bcConsigne('🧽 Ménage — sols, salle de bain, poussière', 0, '2026-11-22', '16:30'));
  ok(/brosses démêlées/.test(menage), 'et la consigne du ménage dit toujours l\'entretien du robot, le jour dit');
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
             cases: !!document.getElementById('cl-habitudes'), rappel: (document.getElementById('cl-journee') || {}).textContent || '' };
  });
  ok(r.eau && r.pas && r.humeur && r.anki && r.ankiSem && r.comp, 'l\'eau, les pas, l\'humeur, Anki (du jour et de la semaine) et les compléments sont masqués');
  ok(r.sommeil && r.poids && r.coran, 'le sommeil, le poids et le Coran restent');
  ok(!r.cases && /Ma journée/.test(r.rappel), 'la clôture ne coche plus rien : elle rappelle ce qui reste dans « Ma journée » (17 novembre)');
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
  ok(b.length === 8 && !b.some(x => /Eau \/ jour|Nutrition|Pas \/ jour|Habitudes/.test(x)), 'la semaine : huit chiffres, sans l\'eau, la nutrition, les pas ni les habitudes (17 novembre)');
  const ins = await fr.evaluate(() => window.__bcInsights ? window.__bcInsights().map(x => x.title) : null);
  if(ins) ok(ins.length === 7 && !ins.includes('Balance énergétique') && !ins.includes('Habitude la plus délaissée'), 'sept analyses, sans la balance énergétique ni l\'habitude la plus délaissée');
  await aller(fr, page, 'etudes');
  ok(await fr.evaluate(() => document.getElementById('anki-panel').hidden), 'le panneau Anki des études reste masqué');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
