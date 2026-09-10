/* Lot 31 · point 5 — « rien n'était prévu » ≠ « rien n'a été fait ».
   Dans la grille du mois, une case vide voulait dire deux choses opposées et s'affichait
   pareil. Les jours que la grille ne prévoyait pas (avant le 14 septembre, vacances, jour
   exclu) portent maintenant la classe « hors-plan » : contour pointillé, fond transparent,
   quantième atténué. Les cases pleines qui restent blanches sont les VRAIES journées ratées. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

const JOUR = '2026-09-14';
async function ouvrir(seed, quand){
  const ctx = await b.newContext({viewport:{width:1440, height:1200}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(s => {
    window.claude = undefined;
    for(const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
  }, seed || {});
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + e.message); });
  await page.clock.install({time: new Date(quand || (JOUR + 'T21:00:00+02:00'))});
  await page.goto(URL, {timeout:20000}).catch(()=>{});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  await page.waitForTimeout(400);
  return {ctx, page, fr};
}
/* la grille du mois vit dans l'onglet Agenda, ouvert depuis Études */
async function grille(fr, page, pre){
  await fr.evaluate(() => { const n = document.querySelector('.nav-btn[data-page="agenda"]'); n.hidden = false; n.click(); });
  await page.waitForTimeout(600);
  return fr.evaluate(p => [...document.querySelectorAll('#' + p + '-grid .cal-day[data-agjour]')].map(c => ({
    iso: c.dataset.agjour,
    horsPlan: c.classList.contains('hors-plan'),
    heure: (c.querySelector('.cal-h') || {}).textContent || '',
    titre: c.getAttribute('title') || ''
  })), pre);
}
const de = (cs, iso) => cs.filter(c => c.iso === iso)[0];
const sess = (type, label, duree, date) => ({id:'s'+Math.random().toString(36).slice(2), date,
  debut: new Date(date+'T08:00:00+02:00').getTime(),
  fin: new Date(date+'T08:00:00+02:00').getTime() + duree*60000, duree, type, label});

console.log('\n== 1) Avant le premier jour du programme, rien n’était prévu ==');
{
  const {ctx, page, fr} = await ouvrir();
  const cs = await grille(fr, page, 'ag');
  const avant = cs.filter(c => c.iso >= '2026-09-01' && c.iso <= '2026-09-13');
  ok(avant.length === 13 && avant.every(c => c.horsPlan), 'les 13 jours du 1er au 13 sept. sont hors plan (' + avant.filter(c=>c.horsPlan).length + '/13)');
  ok(/rien n’était prévu/.test(avant[0].titre), 'et le disent au survol : « ' + avant[0].titre + ' »');
  const j14 = de(cs, JOUR);
  ok(j14 && !j14.horsPlan, 'le 14, lui, était prévu — la case reste blanche : c’est une journée ratée, pas un jour vide');
  ok(/prévu, pas fait/.test(j14.titre), 'et le dit aussi : « ' + j14.titre + ' »');
  /* trois états, pas deux : un jour à venir n'est ni un trou ni une dette */
  const j21 = de(cs, '2026-09-21');
  ok(j21 && !j21.horsPlan && /à venir/.test(j21.titre), 'le 21, encore à venir, ne passe pas pour une journée ratée : « ' + j21.titre + ' »');
  const j15 = de(cs, '2026-09-15');
  ok(j15 && /à venir/.test(j15.titre), 'demain non plus : « ' + j15.titre + ' »');
  await ctx.close();
}

console.log('\n== 2) Un jour exclu et une semaine de vacances reculent d’un cran ==');
{
  const {ctx, page, fr} = await ouvrir({
    'batcave-jours-exclus': ['2026-09-16'],
    'batcave-vacances': [{id:'v1', debut:'2026-09-21', fin:'2026-09-25', label:'Retour au bled'}]
  });
  const cs = await grille(fr, page, 'ag');
  ok(de(cs, '2026-09-16').horsPlan, 'le 16, marqué « ne compte pas », est hors plan');
  ok(!de(cs, '2026-09-15').horsPlan && !de(cs, '2026-09-17').horsPlan, 'la veille et le lendemain, eux, étaient prévus');
  const vac = ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'].map(i => de(cs, i));
  ok(vac.every(c => c && c.horsPlan), 'les cinq jours de vacances sont hors plan (' + vac.filter(c=>c&&c.horsPlan).length + '/5)');
  ok(!de(cs, '2026-09-26').horsPlan, 'et la grille reprend le 26');
  await ctx.close();
}

console.log('\n== 3) Une journée travaillée n’est jamais hors plan ==');
{
  const {ctx, page, fr} = await ouvrir({'batcave-sessions': [
    sess('cours', 'Anatomie', 110, '2026-09-16'),
    /* même un jour exclu : si tu as travaillé, la case porte ses heures */
    sess('cours', 'Histologie', 55, '2026-09-19')
  ], 'batcave-jours-exclus': ['2026-09-19']});
  const cs = await grille(fr, page, 'ag');
  ok(de(cs, '2026-09-16').heure === '1 h 50' && !de(cs, '2026-09-16').horsPlan, 'le 16 : 1 h 50 affichées, jamais hors plan');
  const j19 = de(cs, '2026-09-19');
  ok(j19.heure === '55 min' && !j19.horsPlan, 'le 19, exclu mais travaillé : 55 min affichées, pas de pointillé (' + j19.titre + ')');
  await ctx.close();
}

console.log('\n== 4) Chaque vue juge sur CE QU’ELLE montre ==');
{
  /* la phase Español 1 remplace les blocs Projets perso jusqu’au 18 octobre : la vue
     « Projets perso » ne prévoit donc rien ces jours-là, alors que « Révision » si. */
  const {ctx, page, fr} = await ouvrir();
  const rv = await grille(fr, page, 'rv');
  const pj = await fr.evaluate(() => [...document.querySelectorAll('#pj-grid .cal-day[data-agjour]')].map(c => ({
    iso: c.dataset.agjour, horsPlan: c.classList.contains('hors-plan')})));
  const lundi = '2026-09-14';
  ok(!de(rv, lundi).horsPlan, 'vue Révision : le lundi 14 prévoit de la révision');
  ok(de(rv, '2026-09-13').horsPlan, 'vue Révision : le 13 (avant le programme) reste hors plan');
  ok(pj.filter(c => c.iso === lundi)[0] && !pj.filter(c => c.iso === lundi)[0].horsPlan,
     'vue Projets : le 14 prévoit de l’Español, qui s’y affiche — donc pas hors plan');
  await ctx.close();
}

console.log('\n== 5) La légende le dit, et l’infobulle de l’année aussi ==');
{
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(() => { const n = document.querySelector('.nav-btn[data-page="agenda"]'); n.hidden = false; n.click(); });
  await page.waitForTimeout(600);
  const leg = await fr.evaluate(() => [...document.querySelectorAll('section.page[data-page="agenda"] .sub-note')].map(p => p.innerText).filter(t => /rien n’était prévu ce jour-là/.test(t)));
  ok(leg.length >= 1, 'la légende explique le carré pointillé : « ' + (leg[0] || '—').trim() + ' »');
  /* la vue 12 mois est repliée par défaut : rien n'est calculé tant qu'on ne l'ouvre pas */
  await fr.evaluate(() => document.getElementById('rev-annee-toggle').click());
  await page.waitForTimeout(500);
  const an = await fr.evaluate(() => [...document.querySelectorAll('#rev-annee-grid .an-cell')].map(c => c.getAttribute('title') || ''));
  ok(an.length > 360, 'la vue 12 mois se déplie et compte ' + an.length + ' cases');
  ok(an.some(t => /rien n’était prévu/.test(t)), 'la heatmap annuelle distingue les deux au survol');
  ok(an.some(t => /prévu, pas fait/.test(t)), 'et nomme les journées ratées');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
