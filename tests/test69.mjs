/* Lot 21 : Anki lu par AnkiConnect (et saisi le dimanche), répartition de la révision entre
   les matières d'une session de partiels, sport allégé et sommeil +30 min, test du mois. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, extra){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(extra) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, extra);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r && !document.getElementById('opening-ritual-overlay').hidden) r.click(); });
  await page.waitForTimeout(350);
  return { ctx, page, fr };
}
const local = (fr, k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
/* deux examens à trois jours d'écart : une session, deux matières à répartir */
const EX = {'batcave-examens': {'Anatomía I':'2027-01-20', 'Bioquímica':'2027-01-23'}};

console.log('\n== 275) Partiels : la révision se répartit entre les matières ==');
{
  const heures = { 'batcave-revision': [
    {id:'r1', date:'2027-01-10', duree:600, matieres:{'Anatomía I':600}},
    {id:'r2', date:'2027-01-11', duree:300, matieres:{'Anatomía I':300}}
  ]};
  const { ctx, fr } = await ouvrir('2027-01-15T09:00:00+01:00', Object.assign({}, EX, heures));
  const b = await fr.evaluate(() => window.__bcBesoins('2027-01-15').map(x => ({m:x.m, h:x.heures, j:x.jours})));
  ok(b.length === 2, 'les deux matières de la session sont vues : ' + b.map(x => x.m).join(', '));
  ok(b[0].m === 'Bioquímica', 'Bioquímica passe devant : 0 h faites contre 15 h en anatomie (' + JSON.stringify(b) + ')');
  const blocs = await fr.evaluate(() => window.__bcGrille('weekday', '2027-01-15').filter(x => /ciblée|Fiches/.test(x[1])).map(x => x[0] + ' ' + x[1]));
  ok(blocs.length >= 2, blocs.length + ' blocs ciblés dans la journée : ' + blocs.join(' · '));
  const mats = await fr.evaluate(() => window.__bcGrille('weekday', '2027-01-15').filter(x => /ciblée|Fiches/.test(x[1])).map(x => (window.__bcMatiereBloc('2027-01-15', x[0]) || {}).m));
  ok(new Set(mats).size >= 2, 'les blocs ciblés du jour couvrent plusieurs matières : ' + mats.join(' · '));
  const cs = await fr.evaluate(() => { const g = window.__bcGrille('weekday', '2027-01-15').filter(x => /ciblée|Fiches/.test(x[1])); return g.map(x => window.__bcConsigne(x[1], 4, '2027-01-15', x[0])); });
  ok(cs.some(c => /Bioquímica/.test(c)) && cs.some(c => /Anatomía I/.test(c)), 'chaque consigne nomme SA matière');
  ok(/h faites sur 30 jours/.test(cs[0]), 'la consigne dit ce qui a déjà été fait : ' + cs[0].slice(0, 90));
  await ctx.close();
}

console.log('\n== 276) Partiels : sport allégé et sommeil +30 min ==');
{
  const { ctx, fr } = await ouvrir('2027-01-15T09:00:00+01:00', EX);
  const sport = await fr.evaluate(() => ({
    lun: window.__bcTypeSport('2027-01-18'), mar: window.__bcTypeSport('2027-01-19'),
    jeu: window.__bcTypeSport('2027-01-21'), sam: window.__bcTypeSport('2027-01-16'),
    horsPartiels: window.__bcTypeSport('2026-12-08')
  }));
  ok(sport.lun !== 'Off' && sport.jeu !== 'Off', 'lundi et jeudi gardent leur séance (' + sport.lun + ' · ' + sport.jeu + ')');
  ok(sport.mar === 'Off' && sport.sam === 'Off', 'mardi et samedi passent en jour off pendant les partiels');
  ok(sport.horsPartiels === 'Bas complet', 'hors partiels, le mardi reste Bas complet');
  /* La reference hors partiels doit etre un VENDREDI comme le 15 janvier, et un vendredi
     avec cours : le 8 decembre (Inmaculada) est desormais un jour sans cours, ou l'on se
     couche a 21:00 -- comparer 21:00 a 21:55 ne mesurait plus le bonus de sommeil des
     partiels mais l'ecart entre deux soirees differentes. Le vendredi 11 decembre est hors
     de la fenetre de partiels (qui court du 13 au 23 janvier) et a cours normalement. */
  const som = await fr.evaluate(() => ({ pendant: window.__bcSommeilCible('2027-01-15'), hors: window.__bcSommeilCible('2026-12-11') }));
  ok(Math.abs(som.pendant - som.hors - 0.5) < 0.01, 'la cible de sommeil monte de 30 min pendant les partiels (' + som.hors.toFixed(2) + ' → ' + som.pendant.toFixed(2) + ' h)');
  const prevu = await fr.evaluate(() => window.__bcPrevu('2027-01-19'));
  ok(prevu.sport === 0, 'un mardi de partiels ne compte plus de séance prévue : la cible du mois baisse d\'elle-même');
  await ctx.close();
}

console.log('\n== 277) Anki : panneau, cache, plan du jour ==');
{
  const cache = {'batcave-anki': {maj: new Date('2026-09-15T07:00:00+02:00').toISOString(), source:'ankiconnect',
    paquets: {'Dentaire': {dus: 240, nouvelles: 50, sangsues: 6}, 'Español': {dus: 30, nouvelles: 20, sangsues: 1}, 'Business': {dus: 0, nouvelles: 0, sangsues: 0}},
    revues: 12, sangsues: 7}};
  const { ctx, page, fr } = await ouvrir('2026-09-15T09:00:00+02:00', cache);
  const p = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="etudes"]').click(); const el = document.getElementById('anki-panel'); return {visible: !el.hidden, txt: el.innerText.replace(/\s+/g, ' ')}; });
  /* « à revoir » depuis le lot 23 : c'est le mot d'Anki lui-même, colonne de l'écran d'accueil */
  ok(p.visible && /Dentaire 240 à revoir/.test(p.txt), 'le panneau Anki montre les échéances par paquet');
  ok(/Plus de 220 cartes dues/.test(p.txt), 'au-delà de 220 dues, il propose de baisser les nouvelles à 35');
  const plan = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="dashboard"]').click(); return document.getElementById('dash-plan').innerText; });
  ok(/270 cartes dues dans Anki/.test(plan), 'le plan du jour remonte les cartes dues : ' + (plan.match(/\d+ cartes? dues[^\n]*/) || [''])[0].slice(0, 70));
  await ctx.close();
}

console.log('\n== 278) Anki : les deux chiffres du dimanche ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-20T20:40:00+02:00');
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(250);
  const champs = await fr.evaluate(() => ({ r: !!document.getElementById('cl-anki-revues'), c: !!document.getElementById('cl-anki-creees'), revue: !document.getElementById('cl-revue').hidden }));
  ok(champs.revue && champs.r && champs.c, 'le dimanche, la clôture demande les cartes révisées et créées');
  await fr.evaluate(() => { document.getElementById('cl-anki-revues').value = '1200'; document.getElementById('cl-anki-creees').value = '85'; document.getElementById('cloture-valider').click(); });
  await page.waitForTimeout(350);
  const rv = await local(fr, 'batcave-revue'), an = await local(fr, 'batcave-anki');
  ok(rv && rv.length === 1 && rv[0].anki && rv[0].anki.revues === 1200 && rv[0].anki.creees === 85, 'les deux chiffres sont enregistrés dans la revue');
  ok(an && an.source === 'saisie' && an.revues === 1200, 'sans AnkiConnect, la saisie fait office de lecture');
  await ctx.close();
}

console.log('\n== 279) Le test du mois ==');
{
  const { ctx, page, fr } = await ouvrir('2026-10-04T10:00:00+02:00');   /* premier dimanche d'octobre */
  ok(await fr.evaluate(() => window.__bcTestAnki()), 'le premier dimanche du mois, le test est dû');
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(/Test du mois Anki/.test(plan), 'il remonte dans le plan du jour');
  await fr.evaluate(() => { const b = document.querySelector('[data-plan-testanki]'); if(b) b.click(); });
  await page.waitForTimeout(250);
  ok(await local(fr, 'batcave-test-anki-2026-10') === '2026-10-04', 'noté fait pour le mois');
  ok(!(await fr.evaluate(() => window.__bcTestAnki())), 'il ne revient pas ce mois-ci');
  await ctx.close();
  const b = await ouvrir('2026-10-07T10:00:00+02:00');   /* un mercredi */
  ok(!(await b.fr.evaluate(() => window.__bcTestAnki())), 'il n\'est proposé que le dimanche');
  await b.ctx.close();
}

console.log('\n== 280) Douze onglets : Business ne compte pas sans boutique ==');
{
  const { ctx, fr } = await ouvrir('2026-09-15T09:00:00+02:00', {'batcave-business': [{id:'b1', moisISO:'2026-09', mois:'Sept. 2026', ca:100, couts:50, benef:50}]});
  const nav = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(b => !b.hidden).map(b => b.dataset.page));
  ok(nav.length === 12, 'douze onglets même avec des chiffres de business : ' + nav.join(' '));
  await ctx.close();
  const b = await ouvrir('2026-09-15T09:00:00+02:00', {'batcave-shopify-boutique': {domain:'ma-boutique.myshopify.com', name:'Ma boutique', currency:'EUR', plan:'basic'}});
  const nav2 = await b.fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(x => !x.hidden).map(x => x.dataset.page));
  ok(nav2.length === 13 && nav2.indexOf('business') > -1, 'Business apparaît quand une boutique payante est branchée');
  await b.ctx.close();
  /* une boutique d'essai, ou une fiche sans plan connu, sans une seule vente : pas d'onglet */
  const inc = await ouvrir('2026-09-15T09:00:00+02:00', {'batcave-shopify-boutique': {domain:'ancienne.myshopify.com', name:'Fiche ancienne', currency:'EUR'}});
  const navInc = await inc.fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(x => !x.hidden).map(x => x.dataset.page));
  ok(navInc.length === 12, 'fiche écrite avant le lot 22 (plan inconnu) : douze onglets tant qu\'il n\'y a pas de vente');
  await inc.ctx.close();
  const e = await ouvrir('2026-09-15T09:00:00+02:00', {'batcave-shopify-boutique': {domain:'essai.myshopify.com', name:'Ma boutique 3', currency:'EUR', plan:'trial'}});
  const nav3 = await e.fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(x => !x.hidden).map(x => x.dataset.page));
  ok(nav3.length === 12 && nav3.indexOf('business') < 0, 'boutique en essai sans vente : toujours douze onglets (' + nav3.length + ')');
  await e.ctx.close();
  /* la même boutique d'essai, mais avec un mois de ventes : l'onglet sort */
  const v = await ouvrir('2026-09-15T09:00:00+02:00', {'batcave-shopify-boutique': {domain:'essai.myshopify.com', name:'Ma boutique 3', currency:'EUR', plan:'trial'},
                                                       'batcave-business': [{id:'b2', moisISO:'2026-09', mois:'Sept. 2026', ca:240, couts:120, benef:120}]});
  const nav4 = await v.fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(x => !x.hidden).map(x => x.dataset.page));
  ok(nav4.length === 13 && nav4.indexOf('business') > -1, 'essai + premières ventes : l\'onglet Business apparaît');
  await v.ctx.close();
}

await browser.close();
console.log(errs ? '\nFAILS: ' + errs : '\nTOUT OK (test69)');
process.exit(errs ? 1 : 0);
