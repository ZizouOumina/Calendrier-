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
const bloc = (date, type, min, hhmm) => { const d = new Date(date+'T'+hhmm+':00+02:00').getTime(); return { id:'s'+date+type+hhmm, date, type, duree:min, label:'x', debut:d, fin:d+min*60000 }; };
const MERCREDI_MIDI = '2026-09-02T12:00:00+02:00';

console.log('\n== 108) Deux blocs de révision échus sans session : signalés, avec le déficit ==');
{
  const { ctx, page, fr } = await ouvrir(MERCREDI_MIDI);
  const t = await texte(fr, '#dash-plan');
  ok(/Bloc manqué — 3,4 h de révision non faites \(Anki 1 07:20, Anki 2 08:20, Cartes du dernier cours 09:35, Annales 10:35\)/.test(t), 'texte : « 3,4 h de révision non faites (Anki 1 07:20, Anki 2 08:20, Cartes du dernier cours 09:35, Annales 10:35) »');
  ok(!/créneau libre/.test(t), 'mercredi : aucun créneau libre ≥ 45 min ne reste → pas de suggestion');
  ok(await fr.evaluate(() => !document.querySelector('[data-plan-manque-lancer]')), 'pas de bouton « Maintenant » sans créneau');
  ok(await fr.evaluate(() => !!document.querySelector('[data-plan-manque-demain]')), 'bouton « Demain » présent');
  /* report à demain */
  await fr.evaluate(() => document.querySelector('[data-plan-manque-demain]').click());
  await page.waitForTimeout(300);
  const r = await lire(fr, 'batcave-report');
  ok(r && r.date === '2026-09-03' && r.rev === 120 && r.proj === 0, 'report enregistré pour demain, plafonné à 120 min (obtenu ' + JSON.stringify(r) + ')');
  ok(!/Bloc manqué/.test(await texte(fr, '#dash-plan')), 'l\'item disparaît après le report');
  ok(await lire(fr, 'batcave-manque-traite-2026-09-02-cours') === true, 'marqué traité pour aujourd\'hui');
  await ctx.close();
}

console.log('\n== 109) Le lendemain, la cible intègre le report ==');
{
  const { ctx, fr } = await ouvrir('2026-09-03T10:00:00+02:00', {'batcave-report': {date:'2026-09-03', rev:120, proj:0}});
  const cells = await fr.evaluate(() => [...document.querySelectorAll('#dash-temps .temps-cell .tv')].map(e => e.innerText.replace(/\s+/g,' ')));
  ok(/\/ 6,3h/.test(cells[0]) && /\+2h/.test(cells[0]), 'révision : « / 6,3h +2h ↪ » (obtenu ' + cells[0] + ')');
  ok(/\/ 2,8h/.test(cells[1]) && !/\+/.test(cells[1]), 'projets : inchangé (obtenu ' + cells[1] + ')');
  const plan = await texte(fr, '#dash-plan');
  ok(/Révision — 0,0h \/ 6 h 20 visées/.test(plan), 'Plan du jour : cible 6 h 20 (4 h 20 + 2 h de report)');
  await ctx.close();
}
{
  /* un report daté d'un autre jour ne s'applique pas */
  const { ctx, fr } = await ouvrir('2026-09-03T10:00:00+02:00', {'batcave-report': {date:'2026-09-02', rev:120, proj:0}});
  const cells = await fr.evaluate(() => [...document.querySelectorAll('#dash-temps .temps-cell .tv')].map(e => e.innerText.replace(/\s+/g,' ')));
  ok(/\/ 4,3h/.test(cells[0]) && !/\+/.test(cells[0]), 'report périmé ignoré : « / 4,3h »');
  await ctx.close();
}

console.log('\n== 110) Pas de fausse alerte ==');
{
  const s = [bloc('2026-09-02','cours',120,'07:20'), bloc('2026-09-02','cours',120,'09:35')];
  const { ctx, fr } = await ouvrir(MERCREDI_MIDI, {'batcave-sessions': s});
  ok(!/Bloc manqué/.test(await texte(fr, '#dash-plan')), 'blocs recouverts par des sessions : rien');
  await ctx.close();
}
{
  const s = [bloc('2026-09-02','cours',240,'03:00')];   /* 4 h faites, mais à 3 h du matin */
  const { ctx, fr } = await ouvrir(MERCREDI_MIDI, {'batcave-sessions': s});
  ok(!/Bloc manqué/.test(await texte(fr, '#dash-plan')), 'temps fait à un autre moment : rien (le total compte, pas l\'horaire)');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-02T08:00:00+02:00');   /* Anki 1 finit à 08:20 */
  ok(!/Bloc manqué/.test(await texte(fr, '#dash-plan')), '08:00 : le bloc n\'est pas encore échu → rien');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-02T08:30:00+02:00');   /* échu depuis 10 min < 15 de grâce */
  ok(!/Bloc manqué/.test(await texte(fr, '#dash-plan')), '08:30 : dans la période de grâce → rien');
  await ctx.close();
}
{
  const s = [bloc('2026-09-02','cours',90,'07:20')];   /* 1 h 30 sur Anki 1 + 2 (100 min de travail) : couverts ; déficit 205 − 90 = 115 min sur Cartes et Annales */
  const { ctx, fr } = await ouvrir(MERCREDI_MIDI, {'batcave-sessions': s});
  const t = await texte(fr, '#dash-plan');
  ok(/1,9 h de révision non faites \(Cartes du dernier cours 09:35, Annales 10:35\)/.test(t), 'Anki 1 et 2 couverts ; déficit réel 1,9 h sur Cartes et Annales');
  await ctx.close();
}

console.log('\n== 111) Dimanche : créneau libre proposé, bouton « Maintenant » ==');
{
  const { ctx, fr } = await ouvrir('2026-09-06T12:00:00+02:00');
  const t = await texte(fr, '#dash-plan');
  ok(/créneau libre : Repos — après-midi libre à 13:30 \(2 h 30 min\)/.test(t), 'suggestion : Repos à 13:30 (2 h 30 min)');
  ok(await fr.evaluate(() => !!document.querySelector('[data-plan-manque-lancer]')), 'bouton « Maintenant » présent');
  await ctx.close();
}

console.log('\n== 112) Ignorer : ne revient plus aujourd\'hui, mais le report reste possible pour les projets ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-02T15:30:00+02:00');   /* projets bloc 1 (11:35) échu aussi */
  let t = await texte(fr, '#dash-plan');
  ok(/de révision non faites/.test(t) && /de projets perso non faites/.test(t), 'deux items : révision et projets');
  await fr.evaluate(() => document.querySelector('[data-plan-manque-ignorer="cours"]').click());
  await page.waitForTimeout(300);
  t = await texte(fr, '#dash-plan');
  ok(!/de révision non faites/.test(t) && /de projets perso non faites/.test(t), 'révision ignorée, projets toujours là');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
