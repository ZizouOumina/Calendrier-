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
  await page.frameLocator('#f').locator('#dash-checklist').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(450);
  return { ctx, page, fr };
}
const lire = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);

const SAMEDI = '2026-09-05T10:00:00+02:00';
/* l'état réel du compte avant le correctif : les habitudes historiques, le drapeau V2 posé,
   aucune trace de la V3. */
const COMPTE_EXISTANT = {
  'batcave-habits': [
    {id:'core-lit', label:'Lit fait', icon:'🛏️'},
    {id:'core-fajr', label:'Fajr', icon:'🕌'},
    {id:'hab1788303536189', label:'Passer le balais'}
  ],
  'batcave-habits-seed-v2': true
};

console.log('\n== 90) Compte existant : le lot V3 est rattrapé ==');
{
  const { ctx, fr } = await ouvrir(SAMEDI, COMPTE_EXISTANT);
  const habs = await lire(fr, 'batcave-habits');
  ok(habs.some(h => h.id === 'core-courses'), '« Courses faites » ajoutée à un compte existant');
  ok(habs.some(h => h.id === 'core-lit'), 'les habitudes historiques sont conservées');
  ok(habs.some(h => h.id === 'hab1788303536189'), 'les habitudes personnelles sont conservées');
  ok(await lire(fr, 'batcave-habits-seed-v3') === true, 'le drapeau V3 est posé');
  const t = await fr.evaluate(() => document.getElementById('dash-checklist').innerText);
  ok(/Courses faites/.test(t), 'elle s\'affiche le samedi dans la liste du jour');
  await ctx.close();
}

console.log('\n== 91) Une habitude supprimée à la main ne ressuscite pas ==');
{
  const seed = Object.assign({}, COMPTE_EXISTANT, {'batcave-habits-seed-v3': true});
  const { ctx, fr } = await ouvrir(SAMEDI, seed);
  const habs = await lire(fr, 'batcave-habits');
  ok(!habs.some(h => h.id === 'core-courses'), 'drapeau V3 déjà posé → pas de réinjection');
  await ctx.close();
}

console.log('\n== 92) Installation neuve : les deux lots sont là ==');
{
  const { ctx, fr } = await ouvrir(SAMEDI);
  const habs = await lire(fr, 'batcave-habits');
  ok(habs.some(h => h.id === 'core-courses'), 'V3 semée');
  ok(habs.some(h => h.id === 'core-gratitude'), 'V2 semée');
  ok(await lire(fr, 'batcave-habits-seed-v2') === true, 'drapeau V2 posé');
  ok(await lire(fr, 'batcave-habits-seed-v3') === true, 'drapeau V3 posé');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
