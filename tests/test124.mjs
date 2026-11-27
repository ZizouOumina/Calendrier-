/* 26 novembre, le jour 1 au samedi 28 (« on commence tout tout tout samedi ») et l'audit qu'il a demandé
   (« vérifier à 100 % la batcave pour toutes les contradictions ») :
   1. La semaine du départ, avant le jour 1, rien n'est compté : ni cible, ni Pomodoro réclamé, ni cases, ni clôture.
   2. La séance de référence a enfin ses champs : la carte des maximums de l'onglet Sport (référence, puis retests).
   3. Des vacances de Noël au dernier examen, les blocs d'étude disent quelle matière réviser.
   4. Un mardi sans cours, le batch n'est annoncé qu'une fois ; le départ de 15:00 porte la bonne consigne.
   5. Le record d'une série n'est jamais sous la série en cours ; le dimanche, la clôture porte la revue ; le jour 1 sans boîte
      se lit dans l'onglet Repas ; les jours sans cours ne promettent plus un coucher à 21:00. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();

async function ouvrir(quand, graine, largeur){
  const ctx = await browser.newContext({ viewport:{width: largeur || 1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(graine) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, graine);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const aller = async (fr, page, p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(250); };
const texte = (fr, id) => fr.evaluate(x => { const e = document.getElementById(x); return e ? e.innerText.replace(/\s+/g, ' ') : null; }, id);
const EXAMENS = {'batcave-examens': {'Anatomía I': '2027-01-07', 'Epidemiología': '2027-01-11', 'Biología celular': '2027-01-13', 'Documentación': '2027-01-18', 'Antropología': '2027-01-20'},
                 'batcave-examens-heures': {'Anatomía I': {debut:'13:30', fin:'15:30'}, 'Epidemiología': {debut:'08:30', fin:'10:30'}, 'Antropología': {debut:'08:30', fin:'10:30'}}};

console.log('\n== 1) La veille du jour 1, rien n\'est compté ==');
{
  const { ctx, page, fr } = await ouvrir('2026-11-27T20:30:00+01:00');
  const plan = await texte(fr, 'dash-plan');
  ok(/Demain, jour 1\./.test(plan) && /sac de salle/.test(plan) && /séance de référence à 07:00/.test(plan) && /coucher 21:35/.test(plan), 'le plan dit quoi préparer ce soir : le sac de salle, la séance de référence de 07:00, le coucher');
  ok(!/Clôturer la journée/.test(plan), 'pas de clôture réclamée la veille');
  ok(!/pas encore cochée/.test(plan), 'pas de cases comptées la veille');
  ok(!/Révision — /.test(plan) && !/Hors rythme/.test(plan) && !/Bloc manqué/.test(plan), 'ni révision du jour, ni rythme, ni bloc manqué');
  const dans = await texte(fr, 'pb-dans');
  ok(!/aucun Pomodoro/.test(dans || ''), 'aucun Pomodoro réclamé sur le bloc en cours (' + dans + ')');
  const num = await texte(fr, 'dash-score-num'), note = await texte(fr, 'dash-score-detail');
  ok(num === 'J-1' && /Le programme commence le samedi 28 novembre\. Rien n’est compté avant\./.test(note), 'l\'anneau : « J-1 », et « Le programme commence le samedi 28 novembre » (' + num + ' · ' + note + ')');
  const temps = await texte(fr, 'dash-temps');
  ok(!/\/ \d/.test(temps.split('💻')[0]), 'la cellule Révision n\'a pas de cible (' + temps.split('💻')[0].trim() + ')');
  ok(/2<\/b> jours|2 jours/.test(await fr.evaluate(() => document.getElementById('dash-semaine').innerHTML)), 'la semaine ne compte que ses deux jours de programme');
  const releve = await fr.evaluate(() => document.querySelector('#bc-cloture .v').textContent);
  ok(releve === 'dès le jour 1', 'le relevé CLÔTURE : « dès le jour 1 » (' + releve + ')');
  await aller(fr, page, 'journee');
  const mj = await fr.evaluate(() => (document.querySelector('.page.active .mj-alerte') || {}).textContent || '');
  ok(/Le programme commence le samedi 28 novembre : rien n’est compté avant/.test(mj), '« Ma journée » le dit aussi : ' + mj.slice(0, 80) + '…');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-11-28T20:10:00+01:00');
  const plan = await texte(fr, 'dash-plan'), num = await texte(fr, 'dash-score-num');
  ok(/Clôturer la journée — 60 secondes/.test(plan) && /Révision — /.test(plan), 'le soir du jour 1, tout compte de nouveau : la clôture, la révision');
  ok(num === '1', 'et l\'anneau dit « 1 » sur 191 (' + num + ')');
  await ctx.close();
  /* le vendredi matin, veille du jour 1 : le plan n'annonce aucun bloc de travail de la grille type, il garde les repères réels */
  const v = await ouvrir('2026-11-27T08:00:00+01:00');
  const pv = await texte(v.fr, 'dash-plan');
  ok(!/Étudier en avance|Question ouverte|Projets perso|Anki/.test(pv) && /Déjeuner/.test(pv) && /Trajet mosquée/.test(pv), 'la veille au matin, le plan n\'annonce aucun bloc de travail ; il garde le déjeuner et la mosquée');
  await v.ctx.close();
  const m = await ouvrir('2026-11-28T05:25:00+01:00');
  ok(/Ma journée : \d+ cases pas encore cochées/.test(await texte(m.fr, 'dash-plan')), 'le matin du jour 1, les cases de « Ma journée » sont comptées');
  await m.ctx.close();
}

console.log('\n== 2) Les maximums : la séance de référence, puis les retests ==');
{
  const { ctx, page, fr } = await ouvrir('2026-11-28T07:05:00+01:00', null, 390);
  ok(/Séance de référence — tes maximums d’abord \(tractions, dips, pompes, suspension\), notés dans Sport ; puis la séance du jour, à la moitié des tours/.test(await texte(fr, 'dash-plan')),
     'le plan du jour 1 : les maximums d\'abord, puis la séance du jour');
  ok(/séance de référence : tes maximums d’abord/.test(await texte(fr, 'dash-sport')) && /Bas · charnière/.test(await texte(fr, 'dash-sport')), 'la carte Sport du tableau de bord le dit, avec la séance du jour');
  const cons = await fr.evaluate(() => window.__bcConsigne('Sport', 6, '2026-11-28', '07:00'));
  ok(/^Séance de référence : après l'échauffement, tes maximums/.test(cons) && /La salle à 07:00/.test(cons), 'la consigne du bloc Sport aussi, avant la consigne ordinaire');
  await aller(fr, page, 'sport');
  const carte = await fr.evaluate(() => { const x = document.getElementById('sport-maximums'); return { cache: x.hidden, texte: x.innerText.replace(/\s+/g, ' '), champs: [...x.querySelectorAll('input[data-max]')].map(i => i.dataset.max) }; });
  ok(!carte.cache && /Séance de référence : tes maximums/.test(carte.texte) && carte.champs.join() === 'tractions,dips,pompes,suspension', 'l\'onglet Sport porte la carte, quatre champs : ' + carte.champs.join(', '));
  ok(await fr.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'sans débordement à 390 px');
  await fr.evaluate(() => { document.getElementById('max-ok').click(); });
  ok(await fr.evaluate(() => localStorage.getItem('batcave-maximums')) === null, 'rien de saisi : rien n\'est enregistré');
  await fr.evaluate(() => { [['tractions', 6], ['dips', 8], ['pompes', 22], ['suspension', 45]].forEach(([k, v]) => { document.getElementById('max-' + k).value = v; }); document.getElementById('max-ok').click(); });
  await page.waitForTimeout(250);
  const garde = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-maximums')));
  ok(JSON.stringify(garde) === JSON.stringify({'2026-11-28': {tractions:6, dips:8, pompes:22, suspension:45}}), 'les quatre chiffres sont gardés au jour dit : ' + JSON.stringify(garde));
  ok(/notés ✓/.test(await texte(fr, 'sport-maximums')) && (await fr.evaluate(() => [...document.querySelectorAll('#sport-maximums input')].map(i => i.value).join())) === '6,8,22,45', 'la carte les relit');
  await aller(fr, page, 'dashboard');
  ok(!/Séance de référence/.test(await texte(fr, 'dash-plan')) && /notés ✓/.test(await texte(fr, 'dash-sport')), 'la ligne quitte le plan du jour, la carte Sport dit « notés ✓ »');
  await ctx.close();
}
{
  const fait = {'batcave-sport-log': [{id: 'l-premiere', date: '2026-11-28', type: 'Bas · charnière', exo: 'Relevés de jambes suspendus', series: [10, 10, 10], charge: 0, unite: 'reps'}],
                'batcave-maximums': {'2026-11-28': {tractions:6, dips:8, pompes:22, suspension:45}}};
  const { ctx, page, fr } = await ouvrir('2026-12-21T07:05:00+01:00', fait);
  await aller(fr, page, 'sport');
  const r = await fr.evaluate(() => { const x = document.getElementById('sport-maximums'); return { texte: x.innerText.replace(/\s+/g, ' '), champs: [...x.querySelectorAll('input[data-max]')].map(i => i.dataset.max) }; });
  ok(/Retest : tractions et dips au maximum/.test(r.texte) && r.champs.join() === 'tractions,dips', 'le lundi 21 décembre, le retest : deux champs (' + r.champs.join(', ') + ')');
  ok(/28 nov\. · référence — tractions 6 · dips 8 · pompes 22 · suspension 45 s/.test(r.texte), 'avec la référence du 28 novembre sous les yeux');
  await aller(fr, page, 'dashboard');
  ok(/Retest — tractions et dips au maximum avant la séance, notés dans Sport/.test(await texte(fr, 'dash-plan')), 'le plan du jour annonce le retest');
  ok(/^Retest d'abord : après l'échauffement, tractions au maximum/.test(await fr.evaluate(() => window.__bcConsigne('Sport', 1, '2026-12-21', '07:00'))), 'la consigne du bloc Sport aussi');
  await aller(fr, page, 'sport');
  await fr.evaluate(() => { document.getElementById('max-tractions').value = 9; document.getElementById('max-dips').value = 12; document.getElementById('max-ok').click(); });
  await page.waitForTimeout(250);
  const g = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-maximums')));
  ok(g['2026-12-21'] && g['2026-12-21'].tractions === 9 && g['2026-12-21'].dips === 12 && g['2026-11-28'].pompes === 22, 'le retest s\'ajoute, la référence reste');
  await ctx.close();
  const b = await ouvrir('2026-12-03T07:05:00+01:00', fait);
  await aller(b.fr, b.page, 'sport');
  const o = await b.fr.evaluate(() => { const x = document.getElementById('sport-maximums'); return { cache: x.hidden, n: x.querySelectorAll('input').length, texte: x.innerText.replace(/\s+/g, ' ') }; });
  ok(!o.cache && o.n === 0 && /Tes maximums/.test(o.texte) && /28 nov\. · référence/.test(o.texte), 'un jour ordinaire : la liste seule, sans champ');
  ok(!/Séance de référence/.test(await texte(b.fr, 'dash-plan') || ''), 'et aucune séance de référence redemandée');
  await b.ctx.close();
  const c = await ouvrir('2026-12-03T07:05:00+01:00', {'batcave-sport-log': fait['batcave-sport-log']});
  await aller(c.fr, c.page, 'sport');
  ok(await c.fr.evaluate(() => document.getElementById('sport-maximums').hidden), 'rien de noté, séance faite : la carte ne s\'affiche pas');
  await c.ctx.close();
  /* des maximums notés mais aucun exercice coché : la « première séance » glisse, la référence ne se redemande pas */
  const d = await ouvrir('2026-11-30T07:05:00+01:00', {'batcave-maximums': fait['batcave-maximums']});
  ok(!/Séance de référence/.test(await texte(d.fr, 'dash-plan')), 'maximums déjà notés le 28 : le lundi 30, pas de seconde séance de référence');
  await d.ctx.close();
}

console.log('\n== 3) Des vacances de Noël au dernier examen, les blocs d\'étude disent quoi réviser ==');
{
  const { ctx, fr } = await ouvrir('2026-11-28T10:00:00+01:00', EXAMENS);
  const C = (iso, label, heure) => fr.evaluate(([i, l, h]) => window.__bcConsigne(l, new Date(i + 'T12:00:00').getDay(), i, h), [iso, label, heure]);
  ok(/^📚 /.test(await C('2026-12-21', 'Étudier en avance', '09:00')), 'lundi 21 décembre : encore le rattrapage');
  ok(/^Révision d’examen — Anatomía I, le jeudi 7 janvier \(J-16\) d’abord\./.test(await C('2026-12-22', 'Étudier en avance', '10:00')), 'mardi 22, dernier jour de cours : « Révision d\'examen — Anatomía I, le jeudi 7 janvier (J-16) »');
  ok(/^Annales — Anatomía I, le jeudi 7 janvier \(J-15\)\./.test(await C('2026-12-23', 'Approfondir', '13:00')), 'mercredi 23 : « Approfondir » devient des annales d\'Anatomía I');
  ok(/^Examen blanc — Anatomía I, le jeudi 7 janvier \(J-11\)/.test(await C('2026-12-27', 'Simulation dentaire', '09:20')), 'dimanche 27 : la simulation est un examen blanc d\'Anatomía I');
  ok(/^Anatomía I, le jeudi 7 janvier \(J-8\) : relis/.test(await C('2026-12-30', 'Lire', '17:00')), 'mercredi 30 : « Lire » relit le tema le moins sûr');
  ok(/Anatomía I, demain d’abord/.test(await C('2027-01-06', 'Étudier en avance', '08:20')), 'la veille : « demain »');
  ok(/Anatomía I, aujourd’hui d’abord/.test(await C('2027-01-07', 'Étudier en avance', '10:00')), 'le matin de l\'épreuve : « aujourd\'hui »');
  ok(/^Epidemiología, le lundi 11 janvier \(J-4\) : relis/.test(await C('2027-01-07', 'Lire', '17:00')), 'après l\'épreuve de 13:30, le bloc de 17:00 passe à Epidemiología (J-4)');
  ok(/^Le chapitre que la réponse « estudia »/.test(await C('2027-01-20', 'Lire', '17:00')), 'après le dernier examen (mercredi 20, 08:30), la consigne ordinaire revient');
  ok(/^Un tema que le prof n'a pas encore donné/.test(await C('2027-01-21', 'Étudier en avance', '10:00')), 'jeudi 21 janvier : « Étudier en avance » prépare le second semestre');
  ok(/^Un tema que le prof n'a pas encore donné/.test(await C('2027-03-30', 'Étudier en avance', '10:00')), 'un jour sans cours de mars, loin des examens : rien ne change');
  ok(/^Veille de l’examen d’Anatomía I : un dernier passage sur tes cartes/.test(await C('2027-01-06', 'Préparer · Examen · Anatomía I', '19:30')), 'la veille au soir : « Veille de l\'examen d\'Anatomía I : un dernier passage… »');
  ok(/^Avant l’examen d’Anatomía I : tes cartes les plus floues/.test(await C('2027-01-07', 'Préparer · Examen · Anatomía I', '12:00')), 'le matin même : « Avant l\'examen d\'Anatomía I », plus « Veille de… »');
  ok(/^Veille de « Problemas » : documents et matériel prêts, protocole ou programme relu/.test(await C('2026-12-14', 'Préparer · Problemas', '20:25')), 'la veille d\'un TP ou d\'un devoir garde son texte');
  /* la veille et le matin d'un examen, un bloc de projet passe à la révision ; après l'épreuve, la boutique reprend */
  ok(/^Examen d’Anatomía I demain : ce bloc passe à la révision — les études d’abord/.test(await C('2027-01-06', 'Projets perso 1', '14:00')), 'mercredi 6 janvier, veille d\'Anatomía I : le bloc de projet passe à la révision');
  ok(/^Examen d’Anatomía I aujourd’hui : ce bloc passe à la révision/.test(await C('2027-01-07', 'Projets perso 3', '11:20')), 'jeudi 7, 11:20, avant l\'épreuve de 13:30 : la révision aussi');
  ok(!/passe à la révision/.test(await C('2027-01-07', 'Projets perso 4', '16:00')) && !/passe à la révision/.test(await C('2027-01-05', 'Projets perso 1', '14:00')), 'après l\'épreuve, et l\'avant-veille : la consigne ordinaire du bloc de projet');
  ok(/^Examen d’Epidemiología demain/.test(await C('2027-01-10', 'Projets perso 3', '17:30')), 'dimanche 10 : « Examen d\'Epidemiología demain »');
  await ctx.close();
  const s = await ouvrir('2026-11-28T10:00:00+01:00');
  ok(/^Un tema que le prof n'a pas encore donné/.test(await s.fr.evaluate(() => window.__bcConsigne('Étudier en avance', 3, '2026-12-23', '08:20'))), 'sans date d\'examen saisie : aucune révision d\'examen inventée');
  await s.ctx.close();
}

console.log('\n== 4) Le batch du mardi une seule fois ; le départ de 15:00 ==');
{
  const { ctx, fr } = await ouvrir('2026-12-01T15:05:00+01:00');
  const C = (iso, label, heure) => fr.evaluate(([i, l, h]) => window.__bcConsigne(l, new Date(i + 'T12:00:00').getDay(), i, h), [iso, label, heure]);
  const g = await fr.evaluate(() => window.__bcGrille(window.__bcCle(2), '2026-12-08').filter(x => x[1] === 'Temps libre').map(x => x[0]));
  ok(g.length === 2, 'le mardi 8 décembre, férié, a deux « Temps libre » : ' + g.join(' et '));
  ok(/^La deuxième session de batch cooking/.test(await C('2026-12-08', 'Temps libre', g[0])), 'le premier porte le batch');
  ok(/^Libre : le batch est fait/.test(await C('2026-12-08', 'Temps libre', g[1])), 'le second est libre');
  ok(/^La deuxième session de batch cooking/.test(await C('2026-12-01', 'Temps libre', '19:10')), 'un mardi de cours : le batch à 19:10, comme avant');
  ok(/revue de la semaine : elle est dans la clôture de ce soir/.test(await C('2026-11-29', 'Temps libre', '19:40')), 'le dimanche : la revue de la semaine est dans la clôture');
  const pb = await fr.evaluate(() => ({ quoi: document.getElementById('pb-quoi').textContent, consigne: document.getElementById('pb-consigne').textContent }));
  ok(pb.quoi === 'Trajet cours' && /Arrivé avant 15:30/.test(pb.consigne) && /Tapis enlevés/.test(pb.consigne), 'mardi 15:05, le bloc en cours « Trajet cours » : le texte du départ de 15:00 (' + pb.consigne.slice(0, 60) + '…)');
  await ctx.close();
}

console.log('\n== 5) Record, clôture du dimanche, jour 1 sans boîte, coucher des jours sans cours ==');
{
  const ad = {'batcave-addictions': {snus: {start:'2026-11-08', record:9, log:[]}, masturbation: {start:'2026-10-31', record:32, log:[]}, malbouffe: {start:null, record:0, log:[]}, sucreries: {start:null, record:0, log:[]}}};
  const { ctx, page, fr } = await ouvrir('2026-11-28T12:30:00+01:00', ad);
  const tuiles = await texte(fr, 'dash-stats');
  ok(/Snus 20j · rec\. 20/.test(tuiles) && /Masturbation 28j · rec\. 32/.test(tuiles), 'le record n\'est jamais sous la série en cours : ' + tuiles.slice(0, 60));
  await aller(fr, page, 'addictions');
  ok(/RECORD 20j/.test(await texte(fr, 'addiction-grid')), 'dans l\'onglet aussi : RECORD 20j');
  await aller(fr, page, 'repas');
  const desc = await texte(fr, 'repas-desc');
  ok(/Aujourd’hui, exception : Déjeuner — Jour 1 : pas de boîte/.test(desc) && /Dîner — Jour 1 : pas de boîte ce soir/.test(desc), 'le jour 1, l\'onglet Repas dit l\'exception du déjeuner et du dîner');
  const corps = await fr.evaluate(() => document.body.innerHTML);
  ok(!/coucher à 21:00/.test(corps) && /le coucher ne bouge pas/.test(corps), 'plus aucun « coucher à 21:00 » les jours sans cours');
  await ctx.close();
  const d = await ouvrir('2026-11-29T20:10:00+01:00');
  ok(/Clôturer la journée — avec la revue de la semaine, dix minutes/.test(await texte(d.fr, 'dash-plan')), 'le dimanche soir : « Clôturer la journée — avec la revue de la semaine »');
  await aller(d.fr, d.page, 'repas');
  ok(!/exception/.test(await texte(d.fr, 'repas-desc')), 'et le dimanche 29, l\'onglet Repas n\'annonce aucune exception');
  await aller(d.fr, d.page, 'etudes');
  ok(/Jusqu’au lundi 21 décembre, les créneaux « Approfondir » portent le rattrapage/.test(await d.fr.evaluate(() => document.querySelector('.page.active').innerText)), 'Études : pendant le rattrapage, les créneaux « Approfondir » sont pris, et la Batcave le dit');
  await d.ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT EST VERT');
process.exit(errs ? 1 : 0);
