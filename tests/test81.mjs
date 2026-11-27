/* Lot 31 · point 5 — « rien n'était prévu » ≠ « rien n'a été fait ».
   Dans la grille du mois, une case vide voulait dire deux choses opposées et s'affichait
   pareil. Les jours que la grille ne prévoyait pas (avant le 15 septembre, vacances, jour
   exclu) portent maintenant la classe « hors-plan » : contour pointillé, fond transparent,
   quantième atténué. Les cases pleines qui restent blanches sont les VRAIES journées ratées. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

/* Le premier jour du programme, et « aujourd'hui » de ce test. Il a bouge plusieurs
   fois ; depuis le 28 septembre au soir c'est le MARDI 29. Toute la chronologie de ce
   fichier se lit par rapport a lui : avant = hors plan, le jour meme = prevu mais pas
   fait, apres = a venir. */
/* 4 octobre : le jour 1 passe au lundi 5 octobre. Le fichier se lit le mardi 6 au soir :
   le 5 etait prevu (et rien n'y a ete fait), le 7 est a venir, et tout septembre est avant
   le programme. 12 octobre : jour 1 au mardi 13 -- tout glisse de huit jours (lu le
   mercredi 14 au soir, le 13 prevu, le 15 a venir, vacances du 15 au 19). 14 octobre : jour 1 au
   jeudi 15 -- encore deux jours (lu le vendredi 16 au soir, vacances du 17 au 21). 15 octobre : jour 1
   au vendredi 16 -- un jour de plus (lu le samedi 17 au soir, vacances du 18 au 22). 16 octobre :
   jour 1 au samedi 17 -- encore un (lu le dimanche 18 au soir, vacances du 19 au 23). 19 octobre :
   jour 1 au mardi 20 (lu le mercredi 21 au soir, vacances du 22 au 26). 21 octobre : jour 1 au
   mercredi 21 -- encore un (lu le jeudi 22 au soir, vacances du 23 au 27). Le meme jour, au
   matin : jour 1 au jeudi 22 -- encore un (lu le vendredi 23 au soir, vacances du 24 au 28). */
/* 18 novembre : jour 1 au jeudi 19 -- tout glisse de trois jours (le 16 devient le 19, le 17 le 20, le 18 le 21...) */
const JOUR = '2026-11-29';   /* 26 novembre : jour 1 au samedi 28 (« une derniere fois », verrouille) -- tout glisse encore de quatre jours (le 24 devient le 28, le 25 le 29...) : lu le dimanche 29 au soir, le 28 prevu et pas fait, le lundi 30 a venir. Le bloc 2 (un jour exclu, cinq jours de vacances) ne tient plus dans novembre : il se lit en decembre, sur la grille de decembre. */   /* 24 novembre : jour 1 au mardi 24 (verrouille) -- tout glisse de quatre jours (le 20 devient le 24, le 21 le 25...) */   /* 19 novembre : jour 1 au vendredi 20 -- tout glisse d'un jour (le 19 devient le 20, le 20 le 21...) */   /* 15 novembre : jour 1 au lundi 16 -- tout glisse de deux jours. 13 novembre : jour 1 au samedi 14 -- tout glisse encore d'un jour. 12 novembre : jour 1 au vendredi 13 -- tout glisse d'un jour de plus. 11 novembre : jour 1 au jeudi 12 -- tout glisse de onze jours (31 octobre : au dimanche 1er novembre) */
async function ouvrir(seed, quand){
  const ctx = await b.newContext({viewport:{width:1440, height:1200}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(s => {
    window.claude = undefined;
    for(const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
  }, seed || {});
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + e.message); });
  await page.clock.install({time: new Date(quand || (JOUR + 'T21:00:00+01:00'))});
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
  const sep = await ouvrir(null, '2026-09-30T21:00:00+02:00');
  const cSep = await grille(sep.fr, sep.page, 'ag');
  const avant = cSep.filter(c => c.iso >= '2026-09-01' && c.iso <= '2026-09-30');
  ok(avant.length === 30 && avant.every(c => c.horsPlan), 'les 30 jours de septembre sont hors plan (' + avant.filter(c=>c.horsPlan).length + '/30)');
  ok(/rien n’était prévu/.test(avant[0].titre), 'et le disent au survol : « ' + avant[0].titre + ' »');
  await sep.ctx.close();
  const {ctx, page, fr} = await ouvrir();
  const cs = await grille(fr, page, 'ag');
  const j15 = de(cs, '2026-11-28');
  ok(j15 && !j15.horsPlan, 'le samedi 28 novembre, jour 1, lui, était prévu — la case reste blanche : c’est une journée ratée, pas un jour vide');
  ok(/prévu, pas fait/.test(j15.titre), 'et le dit aussi : « ' + j15.titre + ' »');
  /* trois états, pas deux : un jour à venir n'est ni un trou ni une dette */
  const j24 = de(cs, '2026-11-30');
  ok(j24 && !j24.horsPlan && /à venir/.test(j24.titre), 'le lundi 30, encore à venir, ne passe pas pour une journée ratée : « ' + j24.titre + ' »');
  await ctx.close();
}

console.log('\n== 2) Un jour exclu sort du plan ; des vacances, non ==');
{
  /* Depuis que le programme part du 29 septembre, septembre ne garde plus que deux jours :
     ce bloc se lit en octobre, sur la grille du mois d'octobre. */
  /* 26 novembre : le programme part du samedi 28 -- novembre ne garde plus que trois jours : ce bloc se lit en decembre,
     le mardi 1er au soir (le mercredi 2 exclu, des vacances du jeudi 3 au lundi 7). */
  const {ctx, page, fr} = await ouvrir({
    'batcave-jours-exclus': ['2026-12-02'],
    'batcave-vacances': [{id:'v1', debut:'2026-12-03', fin:'2026-12-07', label:'Retour au bled'}]
  }, '2026-12-01T21:00:00+01:00');
  const cs = await grille(fr, page, 'ag');
  ok(de(cs, '2026-12-02').horsPlan, 'le mercredi 2 décembre, marqué « ne compte pas », est hors plan');
  ok(!de(cs, '2026-12-01').horsPlan && !de(cs, '2026-12-03').horsPlan, 'la veille et le lendemain, eux, étaient prévus');
  /* Depuis le 19 septembre, des vacances sont une journée SANS COURS et non une journée
     vide : la plage de cours se libère, le reste de la journée de travail tient. Ces cinq
     jours restent donc dans le plan — et c'est la conséquence à connaître : ne rien faire
     pendant des vacances déclarées crée bien une dette. La vraie coupure, c'est
     « Aujourd'hui ne compte pas », jour par jour, comme le 2 ci-dessus. */
  const vac = ['2026-12-03','2026-12-04','2026-12-05','2026-12-06','2026-12-07'].map(i => de(cs, i));
  ok(vac.every(c => c && !c.horsPlan), 'les cinq jours de vacances restent dans le plan (' + vac.filter(c=>c&&!c.horsPlan).length + '/5)');
  ok(!de(cs, '2026-12-07').horsPlan, 'et le lundi 7 aussi, évidemment');
  await ctx.close();
}

console.log('\n== 3) Une journée travaillée n’est jamais hors plan ==');
{
  const {ctx, page, fr} = await ouvrir({'batcave-sessions': [
    sess('cours', 'Anatomie', 110, '2026-11-28'),
    /* même un jour exclu : si tu as travaillé, la case porte ses heures */
    sess('cours', 'Histologie', 55, '2026-11-29')
  ], 'batcave-jours-exclus': ['2026-11-29']}, '2026-11-29T21:00:00+01:00');
  const cs = await grille(fr, page, 'ag');
  ok(de(cs, '2026-11-28').heure === '1 h 50' && !de(cs, '2026-11-28').horsPlan, 'le samedi 28 : 1 h 50 affichées, jamais hors plan');
  const j24 = de(cs, '2026-11-29');
  ok(j24.heure === '55 min' && !j24.horsPlan, 'le dimanche 29, exclu mais travaillé : 55 min affichées, pas de pointillé (' + j24.titre + ')');
  await ctx.close();
}

console.log('\n== 4) Chaque vue juge sur CE QU’ELLE montre ==');
{
  /* la phase Español 1 remplace les blocs Projets perso jusqu’au 23 octobre : la vue
     « Projets perso » ne prévoit donc rien ces jours-là, alors que « Révision » si. */
  const {ctx, page, fr} = await ouvrir();
  const rv = await grille(fr, page, 'rv');
  const pj = await fr.evaluate(() => [...document.querySelectorAll('#pj-grid .cal-day[data-agjour]')].map(c => ({
    iso: c.dataset.agjour, horsPlan: c.classList.contains('hors-plan')})));
  const premier = '2026-11-28';
  ok(!de(rv, premier).horsPlan, 'vue Révision : le samedi 28, jour 1, prévoit de la révision');
  ok(pj.filter(c => c.iso === premier)[0] && !pj.filter(c => c.iso === premier)[0].horsPlan,
     'vue Projets : le samedi 28 prévoit de l’Español, qui s’y affiche — donc pas hors plan');
  await ctx.close();
  const sep = await ouvrir(null, '2026-09-30T21:00:00+02:00');
  const rvSep = await grille(sep.fr, sep.page, 'rv');
  ok(de(rvSep, '2026-09-30').horsPlan, 'vue Révision : le 30 septembre (avant le programme) reste hors plan');
  await sep.ctx.close();
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
