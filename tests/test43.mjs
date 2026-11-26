/* B1 (horizon des objectifs éditable, examens par matière) + balayage des constantes
   (objectif Shopify unique, seuil d'urgence dérivé du planning). */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(quand, seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(450);
  return { ctx, page, fr };
}
const aller = async (fr,page,p) => { await fr.evaluate(pg => document.querySelector('.nav-btn[data-page="'+pg+'"]').click(), p); await page.waitForTimeout(300); };
const texte = (fr, sel) => fr.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);
const lire = (fr,k) => fr.evaluate(x => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))(x) || 'null'), k);
const VENDREDI = '2026-09-04T10:00:00+02:00';

console.log('\n== 101) Horizon des objectifs : dérivé du stockage, éditable ==');
{
  const { ctx, page, fr } = await ouvrir(VENDREDI);
  await aller(fr, page, 'objectifs');
  /* 15 novembre : l'horizon par défaut va du jour 1 (16 novembre) au dimanche 6 juin -- « 72 kg en juin » */
  ok((await texte(fr, '#goal-deadline-days')) === '275', 'par défaut : 275 jours jusqu\'au 6 juin 2027 (obtenu ' + await texte(fr, '#goal-deadline-days') + ')');
  ok((await texte(fr, '#goal-titre')) === 'Objectifs sur 6\u00a0mois', 'titre dérivé : « Objectifs sur 6 mois » (24 novembre → 6 juin, 194 jours)');
  ok(/nov/.test(await texte(fr, '#goal-periode')) && /juin/.test(await texte(fr, '#goal-periode')), 'période affichée depuis l\'horizon');
  ok(await fr.evaluate(() => document.getElementById('goal-horizon-fin').value) === '2027-06-06', 'champ date pré-rempli');
  /* on avance la fin au 31 décembre */
  await fr.evaluate(() => { const i = document.getElementById('goal-horizon-fin'); i.value = '2026-12-31'; i.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(250);
  ok((await texte(fr, '#goal-deadline-days')) === '118', 'après modification : 118 jours (obtenu ' + await texte(fr, '#goal-deadline-days') + ')');
  ok((await texte(fr, '#goal-titre')) === 'Objectifs sur 1\u00a0mois', 'titre recalculé : 1 mois (16 novembre → 31 décembre)');
  ok((await lire(fr, 'batcave-horizon') || {}).fin === '2026-12-31', 'horizon enregistré');
  /* une fin avant le début est refusée */
  await fr.evaluate(() => { const i = document.getElementById('goal-horizon-fin'); i.value = '2026-01-01'; i.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(250);
  ok((await lire(fr, 'batcave-horizon') || {}).fin === '2026-12-31', 'fin antérieure au début refusée');
  await ctx.close();
}

console.log('\n== 102) Examens par matière : saisie, badge, remontée sur le Plan du jour ==');
{
  const { ctx, page, fr } = await ouvrir(VENDREDI);
  await aller(fr, page, 'etudes');
  const n = await fr.evaluate(() => document.querySelectorAll('#examens-liste [data-examen]').length);
  ok(n >= 11, 'une ligne par matière (' + n + ')');
  ok(/aucune date/.test(await texte(fr, '#examens-note')), 'note : aucune date saisie');
  await fr.evaluate(() => { const i = document.querySelector('[data-examen="Anatomía I"]'); i.value = '2026-09-14'; i.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(250);
  ok((await lire(fr, 'batcave-examens') || {})['Anatomía I'] === '2026-09-14', 'date enregistrée');
  ok(/Anatomía I dans 10 j/.test(await texte(fr, '#examens-note')), 'note : prochain dans 10 j');
  ok(/J-10/.test(await texte(fr, '#examens-liste')), 'badge J-10');
  await aller(fr, page, 'dashboard');
  ok(/Examen Anatomía I dans 10 jours/.test(await texte(fr, '#dash-plan')), 'Plan du jour : « Examen Anatomía I dans 10 jours »');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir(VENDREDI, {'batcave-examens': {'Bioquímica':'2026-09-04'}});
  ok(/Examen aujourd'hui — Bioquímica/.test(await texte(fr, '#dash-plan')), 'le jour J : « Examen aujourd\'hui »');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir(VENDREDI, {'batcave-examens': {'Bioquímica':'2026-10-30', 'Anatomía I':'2026-08-01'}});
  ok(!/Examen/.test(await texte(fr, '#dash-plan')), 'à 56 jours : pas encore sur le Plan ; un examen passé est ignoré');
  await ctx.close();
}

console.log('\n== 103) Objectif Shopify : une seule source ==');
{
  const { ctx, page, fr } = await ouvrir(VENDREDI);
  await aller(fr, page, 'business');
  ok(/5000 €\/mois/.test(await texte(fr, '#biz-objectif-desc')), 'description Business remplie depuis la constante');
  ok(/1500 → 3000 → 5000/.test(await texte(fr, '#biz-objectif-desc')), 'paliers dérivés');
  ok((await texte(fr, '#biz-progress-text')) === '0 / 5000 €', 'progression « 0 / 5000 € »');
  await aller(fr, page, 'objectifs');
  ok(/CIBLE 5000 €\/mois/.test(await texte(fr, '#goal-grid')), 'carte Shopify : cible depuis la constante');
  await ctx.close();
}

console.log('\n== 104) Urgence de la révision : seuil dérivé du planning ==');
/* une tâche due aujourd'hui (pri 1) sert de repère : la révision passe devant elle
   uniquement une fois le dernier bloc de révision du jour commencé. */
const TACHE = {'batcave-taches': [{id:'t1', text:'Repère', due:'', status:'À faire', priority:'Normale'}]};
async function ordre(quand, dueISO){
  const seed = {'batcave-taches': [{id:'t1', text:'Repère', due:dueISO, status:'À faire', priority:'Normale'}]};
  const { ctx, fr } = await ouvrir(quand, seed);
  const lignes = (await texte(fr, '#dash-plan')).split('\n').filter(Boolean);
  await ctx.close();
  const iRev = lignes.findIndex(l => /Révision —/.test(l)), iTache = lignes.findIndex(l => /Repère/.test(l));
  return { iRev, iTache };
}
{
  /* 15 novembre : avant le jour 1 (PROGRAMME_DEBUT), le plan ne reproche plus la revision -- la semaine de
     septembre de ce test n'avait plus de ligne « Révision ». Les memes cas, dans la semaine du 16. */
  /* 24 novembre : le jour 1 au mardi 24 -- le samedi 21 et le dimanche 22 sont avant lui ; les memes cas, le 28 et le 29.
     26 novembre : le rattrapage du 27 au 6 decembre donne aussi les blocs de projets aux revisions (le dernier bloc du
     samedi passe a 18:00, celui du dimanche a 17:30) -- les memes cas, un week-end ordinaire, le 12 et le 13 decembre. */
  let o = await ordre('2026-12-12T15:00:00+01:00', '2026-12-12');   /* samedi : dernier bloc (Cartes d'erreurs) à 16:00 */
  ok(o.iRev > o.iTache && o.iTache >= 0, 'samedi 15:00 : révision pas encore urgente (Cartes d\'erreurs à 16:00)');
  o = await ordre('2026-12-12T16:30:00+01:00', '2026-12-12');
  ok(o.iRev >= 0 && o.iRev < o.iTache, 'samedi 16:30 : révision urgente, passe devant la tâche du jour');
  o = await ordre('2026-12-13T11:00:00+01:00', '2026-12-13');       /* dimanche : dernier bloc (Réexpliquer) à 10:20 */
  ok(o.iRev >= 0 && o.iRev < o.iTache, 'dimanche 11:00 : urgente dès 10:20 (dernier bloc du jour)');
  o = await ordre('2026-11-25T19:00:00+01:00', '2026-11-25');       /* mercredi : dernier bloc (Clore le cours du jour) à 20:30 (18 novembre : le 18 est la veille du jour 1 -- le 25) */
  ok(o.iRev > o.iTache && o.iTache >= 0, 'mercredi 19:00 : pas encore urgente (Clore le cours du jour à 20:30) — l\'ancien seuil 18:00 l\'aurait déjà rougie');
  o = await ordre('2026-11-23T19:00:00+01:00', '2026-11-23');       /* la veille du jour 1 (mardi 24) : rien à reprocher */
  ok(o.iRev < 0 && o.iTache >= 0, 'lundi 23, la veille du jour 1 : pas de ligne « Révision »');
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
