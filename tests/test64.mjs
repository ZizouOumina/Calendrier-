/* Lot 16 : grille Español par périodes datées (phases 1-3 à partir du lundi 14 septembre), consignes, Pomodoro
   Español, cellule et relevé du tableau de bord, habitudes du plan, objectifs Espagnol
   relevés, chiffres du dimanche à la clôture, retour à la grille type après mars. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const MOCK = () => {
  const mcp = {
    callTool(){ return Promise.resolve({content:[], payload:{}}); },
    watchTool(server, tool, input, handler){ Promise.resolve().then(() => handler({type:'error', error:{code:'server_not_connected', message:'x'}})); return () => {}; },
    invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
};
const ms = (iso, hm) => new Date(iso + 'T' + hm + ':00+02:00').getTime();
/* objectifs semés à l'ancienne (35 h au T1, 12 h en septembre) : la migration doit les relever */
const seed = {
  'batcave-objectifs-seed-v1': true, 'batcave-objectifs-v2-55': true, 'batcave-objectifs-v3-trajet': true, 'batcave-objectifs-v4-dimanche': true,
  'batcave-objectifs': {liste: [
    {id:'T1:espagnol_h', periode:'trimestre', pid:'T1', debut:'2026-09-01', fin:'2026-11-30', metrique:'espagnol_h', cible:35, titre:'Espagnol'},
    {id:'M2026-09:espagnol_h', periode:'mois', pid:'M2026-09', debut:'2026-09-01', fin:'2026-09-30', metrique:'espagnol_h', cible:12, titre:'Espagnol'},
    {id:'M2026-09:projets_h', periode:'mois', pid:'M2026-09', debut:'2026-09-01', fin:'2026-09-30', metrique:'projets_h', cible:62, titre:'Projets perso', semaine:{rev:1745, proj:1005, sport:4}},
    {id:'T1:revision_h', periode:'trimestre', pid:'T1', debut:'2026-09-01', fin:'2026-11-30', metrique:'revision_h', cible:300, titre:'Révision', semaine:{rev:1745, proj:1005, sport:4}}
  ]},
  'batcave-last-open': '2026-09-16'
};
const browser = await chromium.launch();
async function ouvrir(quand, extra, vp){
  const ctx = await browser.newContext({ viewport: vp || {width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, Object.assign({}, seed, extra || {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r && !document.getElementById('opening-ritual-overlay').hidden) r.click(); });
  return { ctx, page, fr };
}

console.log('\n== 231) Phase 1 (mercredi 16 septembre) : blocs Projets perso renommés Español, type projet, cible du jour, relevé GRILLE, cellule, boutons ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-16T12:00:00+02:00');
  const g = await fr.evaluate(() => {
    const at = (cle, iso, h) => (window.__bcGrille(cle, iso).find(b => b[0] === h) || [])[1];
    return {
      w1120: at('weekday','2026-09-16','11:20'), w1300: at('weekday','2026-09-16','13:00'), w1400: at('weekday','2026-09-16','14:00'), w1220: at('weekday','2026-09-16','12:20'),
      w0720: at('weekday','2026-09-16','07:20'), w1530: at('weekday','2026-09-16','15:30'),
      f0530: at('friday','2026-09-18','05:30'), f1120: at('friday','2026-09-18','11:20'),
      s1700: at('saturday','2026-09-19','17:00'), s1800: at('saturday','2026-09-19','18:00'),
      d1120: at('weekend','2026-09-20','11:20'), d1330: at('weekend','2026-09-20','13:30'), d0530: at('weekend','2026-09-20','05:30'),
      tEsc: window.__bcTypeBloc('Español · escribir'), tConv: window.__bcTypeBloc('Español · conversación real'), tAnki: window.__bcTypeBloc('Español · Anki'),
      cible: window.__bcCibleEspanol('2026-09-16'), periode: (window.__bcPeriode('2026-09-16') || {}).id,
      grille: document.querySelector('#bc-grille .v').textContent, cellules: [...document.querySelectorAll('#dash-temps .temps-cell .tl')].map(e => e.textContent),
      btnDash: document.getElementById('dash-pomodoro-espanol').hidden, btnTimer: document.getElementById('timer-pomodoro-espanol').hidden,
      habits: [...document.querySelectorAll('#dash-checklist label')].map(l => l.textContent)
    };
  });
  ok(g.w1120 === 'Español · gramática' && g.w1300 === 'Español · escribir' && g.w1400 === 'Español · preparar la clase', 'lun-mer-jeu : 11:20 gramática, 13:00 escribir, 14:00 preparar la clase : ' + [g.w1120, g.w1300, g.w1400].join(' / '));
  ok(g.w1220 === 'Déjeuner', 'le déjeuner reste le déjeuner : aucun bloc hors Projets perso n\'est renommé (' + g.w1220 + ')');
  ok(g.w0720 === 'Anki 1' && g.w1530 === 'Cours', 'le dentaire ne bouge pas : ' + g.w0720 + ', ' + g.w1530);
  ok(g.f0530 === 'Español · escribir largo' && g.f1120 === 'Español · tutor', 'vendredi : 05:30 escribir largo, 11:20 tutor : ' + g.f0530 + ' / ' + g.f1120);
  ok(g.s1700 === 'Español · tutor' && g.s1800 === 'Español · DELE', 'samedi : 17:00 tutor, 18:00 DELE : ' + g.s1700 + ' / ' + g.s1800);
  ok(g.d0530 === 'Español · Anki y errores' && g.d1120 === 'Español · simulación' && g.d1330 === 'Español · balance de la semana', 'dimanche : Anki y errores, simulación, balance : ' + [g.d0530, g.d1120, g.d1330].join(' / '));
  ok(g.tEsc === 'projet' && g.tConv === null && g.tAnki === null, 'type : escribir = projet, conversación real et Anki = hors compteur (' + g.tEsc + ', ' + g.tConv + ', ' + g.tAnki + ')');
  ok(g.cible === 160, 'cible Español du jour = 55 + 55 + 50 = 160 min (obtenu ' + g.cible + ')');
  ok(g.periode === 'es-1' && /phase 1 · J-32$/.test(g.grille), 'relevé GRILLE : « Español · phase 1 · J-32 » (obtenu « ' + g.grille + ' »)');
  ok(g.cellules.length === 3 && /Español/.test(g.cellules[2]), 'troisième cellule « Español » sur le tableau de bord : ' + g.cellules.join(' | '));
  ok(!g.btnDash && !g.btnTimer, 'boutons Pomodoro Español visibles (tableau de bord et Études)');
  ok(g.habits.some(h => /formules du jour/.test(h)) && g.habits.some(h => /natif/.test(h)) && g.habits.some(h => /20 pages/.test(h)), 'les trois habitudes du plan sont dans la console du jour');

  /* calendrier : libellé de la grille, bloc MAINTENANT = gramática avec sa consigne */
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
  await page.waitForTimeout(250);
  const cal = await fr.evaluate(() => ({
    label: document.getElementById('cal-schedule-label').textContent,
    now: (document.querySelector('#cal-timeline li.now .t-label') || {}).textContent,
    consigne: (document.querySelector('#cal-timeline li.now .t-consigne') || {}).textContent || '',
    source: document.getElementById('week-cal-source').textContent,
    semaine: [...document.querySelectorAll('#week-cal .week-cal-day')].map(d => [...d.querySelectorAll('.wc-label')].map(x => x.textContent).filter(t => /Español/.test(t)).length)
  }));
  ok(/Español · phase 1/.test(cal.label), 'libellé du calendrier : ' + cal.label);
  ok(cal.now === 'Español · gramática' && /point de grammaire/.test(cal.consigne), 'bloc MAINTENANT = Español · gramática, consigne affichée');
  ok(/Español · phase 1/.test(cal.source) && cal.semaine.every(n => n >= 2), 'vue semaine : chaque jour porte au moins deux blocs Español (' + cal.semaine.join(',') + '), source « ' + cal.source + ' »');

  /* objectifs : migration 35 → 137 (T1), 12 → 39 (septembre) */
  const objs = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-objectifs')).liste.reduce((a, o) => { a[o.id] = o.cible; return a; }, {}));
  ok(objs['T1:espagnol_h'] === 137 && objs['M2026-09:espagnol_h'] === 39 && objs['M2026-09:projets_h'] > 0, 'objectifs Espagnol relevés (T1 137, septembre 39), Projets perso toujours là : ' + JSON.stringify(objs));

  /* Pomodoro Español : la tâche par défaut est celle du bloc en cours (gramática à 12:00), le bloc part en projet « Español · gramática » */
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await fr.evaluate(() => document.getElementById('dash-pomodoro-espanol').click());
  await page.waitForTimeout(150);
  const ask = await fr.evaluate(() => ({ visible: !document.getElementById('ask-overlay').hidden, titre: document.getElementById('ask-title').textContent, valeur: document.getElementById('ask-select').value }));
  ok(ask.visible && /Español/.test(ask.titre) && ask.valeur === 'gramática', 'dialogue Español, tâche par défaut = gramática (bloc en cours) : ' + JSON.stringify(ask));
  await fr.evaluate(() => document.getElementById('ask-ok').click());
  await page.waitForTimeout(250);
  const timer = await fr.evaluate(() => ({ sub: document.getElementById('timer-sub').textContent, tag: document.getElementById('timer-dial-tag').textContent, page: document.querySelector('.page.active').dataset.page, st: JSON.parse(localStorage.getItem('batcave-timer')) }));
  ok(/Español · gramática/.test(timer.sub) && timer.page === 'etudes' && timer.st.cible === 'projet' && timer.st.projet === 'Español · gramática', 'minuteur lancé en projet « Español · gramática », page Études : ' + timer.sub);
  await fr.evaluate(() => { const st = JSON.parse(localStorage.getItem('batcave-timer')); localStorage.setItem('batcave-timer', 'null'); });
  /* une session Español enregistrée compte dans la cellule, dans l'objectif Espagnol, pas dans Projets perso */
  await fr.evaluate(t => { window.__bcLogSession(40, {cible:'projet', projet:'Español · escribir', startedAt: t}); }, ms('2026-09-16','13:02'));
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="objectifs"]').click());
  await page.waitForTimeout(250);
  const mesure = await fr.evaluate(() => ({
    es: window.__bcMinutesEspanol('2026-09-16'),
    reelEs: (document.querySelector('.obj-row[data-obj-id="M2026-09:espagnol_h"] .val b') || {}).textContent,
    reelProj: (document.querySelector('.obj-row[data-obj-id="M2026-09:projets_h"] .val b') || {}).textContent
  }));
  ok(mesure.es === 40 && mesure.reelEs === '0,7' && mesure.reelProj === '0,0', 'objectifs : Espagnol réel 0,7 h, Projets perso réel 0,0 h (obtenu ' + mesure.reelEs + ' / ' + mesure.reelProj + ')');
  await ctx.close();
}

console.log('\n== 232) Avant le lundi 14 septembre : aucune période, la grille type ; le 14, phase 1 ==');
{
  const { ctx, fr } = await ouvrir('2026-09-11T08:00:00+02:00');
  const g = await fr.evaluate(() => {
    const at = (grille, h) => (grille.find(b => b[0] === h) || [])[1];
    const gv = window.__bcGrille('friday', '2026-09-11');
    const gl = window.__bcGrille('weekday', '2026-09-14');
    return { p11: (window.__bcPeriode('2026-09-11') || {}).id || null, p13: (window.__bcPeriode('2026-09-13') || {}).id || null,
             p14: (window.__bcPeriode('2026-09-14') || {}).id || null,
             v0530: at(gv, '05:30'), v0720: at(gv, '07:20'), v1020: at(gv, '10:20'), v1120: at(gv, '11:20'),
             l0720: at(gl, '07:20'), l0820: at(gl, '08:20'), l0920: at(gl, '09:20'), l1120: at(gl, '11:20'),
             l1220: at(gl, '12:20'), l1300: at(gl, '13:00'), l1400: at(gl, '14:00'), l1530: at(gl, '15:30'),
             releve: document.querySelector('#bc-grille .v').textContent, cache: document.getElementById('bc-grille').hidden,
             sport: document.getElementById('programme-note').textContent };
  });
  ok(g.p11 === null && g.p13 === null, 'les 11, 12 et 13 septembre ne sont dans aucune période (obtenu ' + g.p11 + ' / ' + g.p13 + ')');
  ok(g.v0530 === 'Projets perso matinal' && g.v1020 === 'Projets perso 1' && g.v1120 === 'Projets perso 2' && g.v0720 === 'Anki 1',
     'le vendredi 11 garde la grille type : ' + [g.v0530, g.v0720, g.v1020, g.v1120].join(' / '));
  ok(g.cache === true && g.releve === 'grille type', 'relevé GRILLE masqué avant le 14 (« ' + g.releve + ' »)');
  ok(g.p14 === 'es-1', 'le lundi 14 est en phase 1 (obtenu ' + g.p14 + ')');
  ok(g.l0720 === 'Anki 1' && g.l0820 === 'Anki 2' && g.l0920 === 'Cartes du dernier cours' && g.l1220 === 'Déjeuner' && g.l1530 === 'Cours',
     'le 14 : révision dentaire, déjeuner et cours intacts : ' + [g.l0720, g.l0820, g.l0920, g.l1220, g.l1530].join(' / '));
  ok(g.l1120 === 'Español · gramática' && g.l1300 === 'Español · escribir' && g.l1400 === 'Español · preparar la clase',
     'le 14 : seuls les Projets perso deviennent Español : ' + [g.l1120, g.l1300, g.l1400].join(' / '));
  ok(/démarre le/.test(g.sport) && /14/.test(g.sport), 'sport : avant le 14, « démarre le 14 sept. » (' + g.sport + ')');
  await ctx.close();
}

console.log('\n== 233) Phase 2 (mardi 20 octobre) puis phase 3 (mardi 8 décembre) : les projets reviennent par paliers ==');
{
  const { ctx, fr } = await ouvrir('2026-10-20T12:00:00+02:00');
  const g = await fr.evaluate(() => {
    const at = (cle, iso, h) => (window.__bcGrille(cle, iso).find(b => b[0] === h) || [])[1];
    return { p: (window.__bcPeriode('2026-10-20') || {}).id, a1120: at('weekday','2026-10-20','11:20'), a1300: at('weekday','2026-10-20','13:00'), a1400: at('weekday','2026-10-20','14:00'),
             f0530: at('friday','2026-10-23','05:30'), releve: document.querySelector('#bc-grille .v').textContent,
             p3: (window.__bcPeriode('2026-12-08') || {}).id, d1120: at('weekday','2026-12-08','11:20'), d1300: at('weekday','2026-12-08','13:00'), d1400: at('weekday','2026-12-08','14:00'), ds1800: at('saturday','2026-12-12','18:00') };
  });
  ok(g.p === 'es-2' && g.a1120 === 'Projets perso 1' && g.a1300 === 'Español · annales' && g.a1400 === 'Español · preparar la clase' && g.f0530 === 'Projets perso matinal', 'phase 2 : Projets perso 1 et le vendredi matin reviennent, annales à 13:00, classe à 14:00');
  ok(/phase 2/.test(g.releve), 'relevé GRILLE : ' + g.releve);
  ok(g.p3 === 'es-3' && g.d1120 === 'Projets perso 1' && g.d1300 === 'Español' && g.d1400 === 'Projets perso 3' && g.ds1800 === 'Projets perso 3', 'phase 3 : un seul bloc Español (13:00), le reste revient aux projets');
  await ctx.close();
}

console.log('\n== 234) Dimanche 20 septembre, clôture : les chiffres du dimanche entrent dans la revue ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-20T20:00:00+02:00', {'batcave-last-open':'2026-09-20'});
  await fr.evaluate(() => { const o = document.getElementById('cloture-overlay'); if(o.hidden) document.getElementById('bc-cloture').click(); });
  await page.waitForTimeout(200);
  const av = await fr.evaluate(() => ({ ouvert: !document.getElementById('cloture-overlay').hidden, revue: !document.getElementById('cl-revue').hidden, es: !document.getElementById('cl-espanol').hidden, constats: document.getElementById('cl-constats').textContent }));
  ok(av.ouvert && av.revue && av.es, 'clôture du dimanche : bloc revue et bloc chiffres Español visibles');
  ok(/Espagnol/.test(av.constats) && /blocs Español/.test(av.constats), 'constat Espagnol de la semaine dans la revue guidée : ' + av.constats.slice(0, 120));
  await fr.evaluate(() => {
    document.getElementById('cl-es-errores').value = '4.5'; document.getElementById('cl-es-oral').value = '2'; document.getElementById('cl-es-drill').value = '110';
    document.getElementById('cl-rv-marche').value = 'les formules';
    document.getElementById('cloture-valider').click();
  });
  await page.waitForTimeout(250);
  const rv = await fr.evaluate(() => { const l = JSON.parse(localStorage.getItem('batcave-revue') || '[]'); return l[l.length - 1]; });
  ok(rv && rv.espanol && rv.espanol.errores === 4.5 && rv.espanol.oral === 2 && rv.espanol.drill === 110, 'revue enregistrée avec les chiffres Español : ' + JSON.stringify(rv && rv.espanol));
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="objectifs"]').click());
  await page.waitForTimeout(200);
  const liste = await fr.evaluate(() => document.getElementById('rv-list').textContent);
  ok(/🇪🇸 4,5 err\. \/ 100 mots · 2,0 min d'oral sans pause · drill 110 s/.test(liste), 'la revue affiche la ligne Español : ' + liste.slice(0, 160));
  await ctx.close();
}

console.log('\n== 235) Après le 14 mars 2027 : grille type, boutons cachés, plus de cellule Español ==');
{
  const { ctx, fr } = await ouvrir('2027-03-20T12:00:00+01:00', {'batcave-last-open':'2027-03-20'});
  const g = await fr.evaluate(() => ({
    p: window.__bcPeriode('2027-03-20'), a1120: (window.__bcGrille('saturday','2027-03-20').find(b => b[0] === '11:20') || [])[1],
    releve: document.querySelector('#bc-grille .v').textContent, btn: document.getElementById('dash-pomodoro-espanol').hidden,
    cellules: document.querySelectorAll('#dash-temps .temps-cell').length, mardi: (window.__bcGrille('weekday','2027-03-16').find(b => b[0] === '13:00') || [])[1]
  }));
  ok(g.p === null && g.a1120 === 'Projets perso 1' && g.mardi === 'Projets perso 2', 'grille type revenue d\'elle-même');
  ok(g.releve === 'grille type' && g.btn && g.cellules === 2, 'relevé « grille type », bouton caché, deux cellules');
  await ctx.close();
}

await browser.close();
console.log(errs ? ('\nFAILS: ' + errs) : '\nTOUT OK (test64)');
process.exit(errs ? 1 : 0);
