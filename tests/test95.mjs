/* Parcours de garde : quinze dates qui couvrent tout le programme (jour 1, dimanche, lundi,
   jours sans cours d'octobre, phase 2, partiels, semestre 2, été). A chaque date, la Batcave
   s'ouvre sans erreur JS, chacun des dix-neuf onglets s'affiche sans « undefined », « NaN »
   ni « [object », le bloc en cours porte une consigne, et les rappels de l'agenda sont
   coherents avec la grille : le titre de base d'un rappel est un bloc de la grille type du
   jour (c'est ainsi que les series 🦇 sont reconnues) et tout bloc de travail commence sa
   description par « Lance le Pomodoro ». Ne le nom de rien : il garde fermees les portes
   que le lot 38 a ouvertes (blocs renommes, depart le 17, jours sans cours en simulation). */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };
const EX = {'batcave-examens': {'Anatomía I':'2026-11-16','Biología':'2026-11-19','Epidemiología':'2027-01-18'}};
const DATES = [
  ['2026-09-17T07:00:00+02:00', {}, 'veille du programme, avant Anki'], ['2026-09-17T09:25:00+02:00', {}, 'veille, Étudier en avance'],
  ['2026-09-17T11:25:00+02:00', {}, 'veille, Question ouverte ou autre'], ['2026-09-19T09:25:00+02:00', {}, 'jour 1, Approfondir (1re séance)'],
  ['2026-09-19T10:25:00+02:00', {}, 'samedi, Approfondir (2e séance)'], ['2026-09-20T09:25:00+02:00', {}, 'dimanche, Simulation dentaire'],
  ['2026-09-21T10:25:00+02:00', {}, 'lundi, Étudier en avance'], ['2026-09-23T11:25:00+02:00', {}, 'mercredi, Approfondir'],
  ['2026-10-09T15:05:00+02:00', {}, 'vendredi 9 octobre, sans cours'], ['2026-10-12T15:05:00+02:00', {}, 'lundi 12 octobre, sans cours'],
  ['2026-10-19T11:25:00+02:00', {}, 'phase 2'], ['2026-11-10T09:25:00+01:00', EX, 'partiels'],
  ['2027-01-26T10:25:00+01:00', {}, 'semestre 2'], ['2027-03-16T11:25:00+01:00', {}, 'grille type'], ['2027-06-10T15:05:00+02:00', {}, 'été']
];
const PAGES = ['dashboard','bilan','calendrier','habitudes','addictions','repas','prep','sport','coran','budget','etudes','objectifs','courses','insights','journal','taches','vie','agenda','business'];
for(const [quand, seed, nom] of DATES){
  console.log('\n== ' + nom + ' · ' + quand.slice(0, 16) + ' ==');
  const ctx = await b.newContext({viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(s => { window.claude = undefined; for(const [k,v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, seed);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if(m.type() === 'error' && !/ERR_TUNNEL|ERR_CERT|fonts\.g|Failed to load resource|favicon/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 160)); });
  await page.clock.install({time: new Date(quand)});
  await page.goto(URL, {timeout: 20000});
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout: 20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(400);
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  const iso = quand.slice(0, 10);
  const info = await fr.evaluate((iso) => {
    const cle = window.__bcCle(new Date(iso + 'T12:00:00').getDay());
    const base = window.__bcGrilleBase(cle, iso).map(x => x[1]), plan = window.__bcGrille(cle, iso).map(x => x[1]);
    const rappels = window.__bcRappels(iso).map(r => ({t: r.titre, base: r.titreBase, d: r.description, lab: r.titre.replace('🦇 ', '')}));
    return {cle, base, plan, rappels, focus: (document.getElementById('dash-focus').innerText || '').replace(/\s+/g, ' ')};
  }, iso);
  ok(!errs.length, 'aucune erreur JS à l\'ouverture' + (errs.length ? ' — ' + errs.join(' | ') : ''));
  ok(info.focus.length > 40, 'le bloc en cours est affiché avec sa consigne (' + info.focus.slice(0, 70) + '…)');
  const horsGrille = info.rappels.filter(r => { const bb = r.base.replace('🦇 ', ''); return !info.base.includes(bb) && !info.plan.includes(bb); });
  ok(!horsGrille.length, 'chaque rappel se rattache à un bloc de la grille (' + info.rappels.length + ' rappels)' + (horsGrille.length ? ' — ' + horsGrille.map(r => r.base).join(', ') : ''));
  const types = await fr.evaluate(labs => labs.map(l => window.__bcTypeBloc(l)), info.rappels.map(r => r.lab));
  const sansPomodoro = info.rappels.filter((r, i) => types[i] && !/^Lance le Pomodoro « /.test(r.d));
  ok(!sansPomodoro.length, 'chaque bloc de travail rappelé dit quel Pomodoro lancer' + (sansPomodoro.length ? ' — ' + sansPomodoro.map(r => r.t).join(', ') : ''));
  const casses = [];
  for(const p of PAGES){
    const present = await fr.evaluate(p => { const n = document.querySelector('.nav-btn[data-page="' + p + '"]'); if(!n) return false; n.hidden = false; n.click(); return true; }, p);
    if(!present) continue;
    await page.waitForTimeout(120);
    const txt = await fr.evaluate(p => { const s = document.querySelector('section.page[data-page="' + p + '"]'); return s ? s.innerText : ''; }, p);
    const m = txt.match(/\bundefined\b|\bNaN\b|\[object /);
    if(m) casses.push(p + ' « ' + txt.slice(Math.max(0, m.index - 50), m.index + 25).replace(/\s+/g, ' ') + ' »');
  }
  ok(!errs.length, 'aucune erreur JS en parcourant les dix-neuf onglets' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  ok(!casses.length, 'aucun « undefined », « NaN » ou « [object » à l\'écran' + (casses.length ? ' — ' + casses.join(' ; ') : ''));
  await ctx.close();
}
await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
