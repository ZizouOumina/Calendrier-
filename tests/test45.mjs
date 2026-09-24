/* B4 — blocs manqués : détection tolérante, créneau libre, report à demain, plafond. */
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
const texte = (fr, sel) => fr.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);
const lire = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const bloc = (date, type, min, hhmm) => { const d = new Date(date+'T'+hhmm+':00+01:00').getTime(); return { id:'s'+date+type+hhmm, date, type, duree:min, label:'x', debut:d, fin:d+min*60000 }; };
/* Le programme ouvre le mardi 15 : avant lui, aucun bloc n'est du, donc aucun ne peut
   etre manque. Et la phase 1 remplace les blocs « Projets perso » par de l'espagnol, donc un jour de
   septembre ne convient pas non plus. Ce fichier se joue apres le 15 mars 2027 : la
   grille de base revient, identique a celle du 2 septembre. Mercredi 31 mars pour
   mercredi 2 septembre, dimanche 4 avril pour dimanche 6 -- apres le changement d'heure
   du 28 mars, pour retrouver le meme decalage horaire qu'en septembre. */
const MERCREDI_MIDI = '2026-12-02T12:00:00+01:00';

console.log('\n== 108) Deux blocs de révision échus sans session : signalés, avec le déficit ==');
{
  const { ctx, page, fr } = await ouvrir(MERCREDI_MIDI);
  const t = await texte(fr, '#dash-plan');
  /* Regime combat (28 septembre) : le mercredi n'a plus qu'Anki 1 puis Étudier en avance 08:20 → 10:05 avant le JJB. */
  ok(/Bloc manqué — 2 h 26 de révision non faites \(Anki 1 07:20, Étudier en avance 08:20\)/.test(t), 'texte : « 2 h 26 de révision non faites » — ' + ((t.match(/Bloc manqué[^\n]*/) || [''])[0]));
  ok(!/créneau libre/.test(t), 'mercredi : aucun créneau libre ≥ 45 min ne reste → pas de suggestion');
  ok(await fr.evaluate(() => !document.querySelector('[data-plan-manque-lancer]')), 'pas de bouton « Maintenant » sans créneau');
  ok(await fr.evaluate(() => !!document.querySelector('[data-plan-manque-demain]')), 'bouton « Demain » présent');
  /* report à demain */
  await fr.evaluate(() => document.querySelector('[data-plan-manque-demain]').click());
  await page.waitForTimeout(300);
  const r = await lire(fr, 'batcave-report');
  ok(r && r.date === '2026-12-03' && r.rev === 120 && r.proj === 0, 'report enregistré pour demain, plafonné à 120 min (obtenu ' + JSON.stringify(r) + ')');
  ok(!/Bloc manqué — [^\n]*de révision/.test(await texte(fr, '#dash-plan')), 'l\'item de révision disparaît après le report');
  ok(await lire(fr, 'batcave-manque-traite-2026-12-02-cours') === true, 'marqué traité pour aujourd\'hui');
  await ctx.close();
}

console.log('\n== 109) Le lendemain, la cible intègre le report ==');
{
  const { ctx, fr } = await ouvrir('2026-12-03T10:00:00+01:00', {'batcave-report': {date:'2026-12-03', rev:120, proj:0}});
  const cells = await fr.evaluate(() => [...document.querySelectorAll('#dash-temps .temps-cell')].map(e => e.innerText.replace(/\s+/g,' ')));
  ok(/\/ 6 h 10/.test(cells[0]) && /\+2 h/.test(cells[0]), 'révision : « / 6 h 10 +2 h ↪ » (jeudi du régime combat : 4 h 10 + 2 h) (obtenu ' + cells[0] + ')');
  /* 1 h 45 et non 2 h 40 : en phase 3 un bloc « Projets perso » reste de l'espagnol.
     Ce qui compte ici, c'est l'absence de « + » : le report ne touche que la revision. */
  ok(/sans minuteur/.test(cells[1]) && !/\+/.test(cells[1]), 'projets : sans cible ni report (obtenu ' + cells[1] + ')');
  const plan = await texte(fr, '#dash-plan');
  ok(/Révision — 0 sur 6 h 10/.test(plan), 'Plan du jour : cible 6 h 10 (4 h 10 + 2 h de report)');
  await ctx.close();
}
{
  /* un report daté d'un autre jour ne s'applique pas */
  const { ctx, fr } = await ouvrir('2026-12-03T10:00:00+01:00', {'batcave-report': {date:'2026-12-02', rev:120, proj:0}});
  const cells = await fr.evaluate(() => [...document.querySelectorAll('#dash-temps .temps-cell .tv')].map(e => e.innerText.replace(/\s+/g,' ')));
  ok(/\/ 4 h 10/.test(cells[0]) && !/\+/.test(cells[0]), 'report périmé ignoré : « / 4 h 10 »');
  await ctx.close();
}

console.log('\n== 110) Pas de fausse alerte ==');
{
  const s = [bloc('2026-12-02','cours',120,'07:20'), bloc('2026-12-02','cours',120,'09:20')];
  const { ctx, fr } = await ouvrir(MERCREDI_MIDI, {'batcave-sessions': s});
  ok(!/Bloc manqué — [^\n]*de révision/.test(await texte(fr, '#dash-plan')), 'blocs recouverts par des sessions : rien');
  await ctx.close();
}
{
  const s = [bloc('2026-12-02','cours',240,'03:00')];   /* 4 h faites, mais à 3 h du matin */
  const { ctx, fr } = await ouvrir(MERCREDI_MIDI, {'batcave-sessions': s});
  ok(!/Bloc manqué — [^\n]*de révision/.test(await texte(fr, '#dash-plan')), 'temps fait à un autre moment : rien (le total compte, pas l\'horaire)');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-12-02T08:00:00+01:00', {'batcave-sessions': [bloc('2026-12-02','cours',50,'05:30')]});   /* Anki 1 finit à 08:20 */
  ok(!/Bloc manqué — [^\n]*de révision/.test(await texte(fr, '#dash-plan')), '08:00 : le bloc n\'est pas encore échu → rien');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-12-02T08:30:00+01:00', {'batcave-sessions': [bloc('2026-12-02','cours',50,'05:30')]});   /* échu depuis 10 min < 15 de grâce */
  ok(!/Bloc manqué — [^\n]*de révision/.test(await texte(fr, '#dash-plan')), '08:30 : dans la période de grâce → rien');
  await ctx.close();
}
{
  const s = [bloc('2026-12-02','cours',90,'07:20')];   /* 1 h 30 sur Anki 1 + 2 : couverts ; le deficit restant tombe sur Étudier en avance */
  const { ctx, fr } = await ouvrir(MERCREDI_MIDI, {'batcave-sessions': s});
  const t = await texte(fr, '#dash-plan');
  ok(/de révision non faites \(Étudier en avance 08:20\)/.test(t) && !/Anki 1/.test(t), 'Anki 1 couvert ; seul Étudier en avance est nommé — ' + ((t.match(/Bloc manqué[^\n]*/) || [''])[0]));
  await ctx.close();
}

console.log('\n== 111) Dimanche : créneau libre proposé, bouton « Maintenant » ==');
{
  const { ctx, fr } = await ouvrir('2026-12-06T12:00:00+01:00');
  const t = await texte(fr, '#dash-plan');
  /* Regime combat : plus de course le dimanche, et 17:30-19:00 est un bloc de projets
     (pas un creneau de rattrapage). Le creneau propose est donc le temps libre du soir,
     19:30 -> 21:25 : 1 h 55. */
  ok(/créneau libre : Temps libre à 19:30 \(1 h 55\)/.test(t), 'suggestion : Temps libre à 19:30 (1 h 55) — ni la course ni les projets ne sont proposés en rattrapage — ' + ((t.match(/créneau libre[^\n]*/)||[''])[0]));
  ok(!/\d h \)/.test(t), 'la durée d\'un créneau rond s\'écrit « 1 h », sans espace avant la parenthèse');
  ok(!/Course à pied/.test(t), 'et la course à pied n\'apparaît nulle part comme créneau libre');
  ok(await fr.evaluate(() => !!document.querySelector('[data-plan-manque-lancer]')), 'bouton « Maintenant » présent');
  await ctx.close();
}

console.log('\n== 112) Ignorer : ne revient plus aujourd\'hui, mais le report reste possible pour les projets ==');
{
  const { ctx, page, fr } = await ouvrir('2026-12-02T15:30:00+01:00');   /* projets bloc 1 (11:35) échu aussi */
  let t = await texte(fr, '#dash-plan');
  ok(/de révision non faites/.test(t) && !/de projets perso non faites/.test(t), 'un seul item : la révision — les projets n\'ont plus de minuteur depuis le 25 septembre');
  await fr.evaluate(() => document.querySelector('[data-plan-manque-ignorer="cours"]').click());
  await page.waitForTimeout(300);
  t = await texte(fr, '#dash-plan');
  ok(!/de révision non faites/.test(t) && !/de projets perso non faites/.test(t), 'révision ignorée, et rien d\'autre');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
