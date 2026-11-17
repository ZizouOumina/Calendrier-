/* Rattrapage des graines d'habitudes pour un compte DÉJÀ EXISTANT.
   test38 ne voyait pas le bug : il partait d'un localStorage vierge, donc du chemin
   « premier lancement » qui sème tous les lots d'un coup. Le vrai compte, lui, avait
   déjà « batcave-habits-seed-v2 » à true depuis avant l'existence de la V3 : le lot V3
   restait derrière ce drapeau partagé et n'arrivait jamais. On teste ici le chemin de
   migration, pas celui de l'installation neuve. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(quand, seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
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
const lire = (fr,k) => fr.evaluate(x => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))(x) || 'null'), k);

const SAMEDI = '2026-09-05T10:00:00+02:00';
/* l'état réel d'un compte d'avant la V4 : les habitudes historiques, les drapeaux V2 et V3 posés, aucune trace de la V4.
   17 novembre : la V3 (« Courses faites ») est vide depuis le tri -- le chemin de migration se vérifie sur la V4
   (les trois habitudes du Dossier Español). */
const COMPTE_EXISTANT = {
  'batcave-habits': [
    {id:'core-lit', label:'Lit fait', icon:'🛏️'},
    {id:'core-fajr', label:'Fajr', icon:'🕌'},
    {id:'hab1788303536189', label:'Passer le balais'}
  ],
  'batcave-habits-seed-v2': true,
  'batcave-habits-seed-v3': true
};
const V4 = ['core-es-conversacion', 'core-es-formulas', 'core-es-lectura'];

console.log('\n== 90) Compte existant : le lot V4 est rattrapé ==');
{
  const { ctx, page, fr } = await ouvrir(SAMEDI, COMPTE_EXISTANT);
  const habs = await lire(fr, 'batcave-habits');
  ok(V4.every(i => habs.some(h => h.id === i)), 'les trois habitudes de l\'espagnol ajoutées à un compte existant');
  ok(habs.some(h => h.id === 'core-lit'), 'les habitudes historiques sont conservées');
  ok(habs.some(h => h.id === 'hab1788303536189'), 'les habitudes personnelles sont conservées');
  ok(await lire(fr, 'batcave-habits-seed-v4') === true, 'le drapeau V4 est posé');
  ok(!habs.some(h => h.id === 'core-courses'), 'la V3 vidée n\'apporte plus « Courses faites » (retirée le 17 novembre)');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="journee"]').click());
  await page.waitForTimeout(250);
  const cases = await fr.evaluate(() => [...document.querySelectorAll('#mj-cases input[data-mj-hab]')].map(x => x.dataset.mjHab));
  ok(V4.every(i => cases.includes(i)), 'elles se cochent dans « Ma journée »');
  await ctx.close();
}

console.log('\n== 91) Une habitude supprimée à la main ne ressuscite pas ==');
{
  const seed = Object.assign({}, COMPTE_EXISTANT, {'batcave-habits-seed-v4': true});
  const { ctx, fr } = await ouvrir(SAMEDI, seed);
  const habs = await lire(fr, 'batcave-habits');
  ok(!habs.some(h => V4.includes(h.id)), 'drapeau V4 déjà posé → pas de réinjection');
  await ctx.close();
}

console.log('\n== 92) Installation neuve : les lots sont là, les retirées non ==');
{
  const { ctx, fr } = await ouvrir(SAMEDI);
  const habs = await lire(fr, 'batcave-habits');
  ok(V4.every(i => habs.some(h => h.id === i)), 'V4 semée');
  ok(habs.some(h => h.id === 'core-sadaqah'), 'V2 semée');
  ok(!['core-revue', 'core-marche', 'core-courses', 'core-cou-jeudi'].some(i => habs.some(h => h.id === i)), 'ni la revue, ni la marche, ni les courses, ni le cou du jeudi (le tri du 17 novembre)');
  ok(await lire(fr, 'batcave-habits-seed-v2') === true, 'drapeau V2 posé');
  ok(await lire(fr, 'batcave-habits-seed-v3') === true, 'drapeau V3 posé (lot vide)');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
