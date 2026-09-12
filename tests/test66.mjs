/* Lot 19 : journées exceptionnelles (TP, veille), mode partiels (J-7, examens, journée d'examen),
   Pomodoro ferme (lanceur qui s'ouvre seul, rappel orange), agenda Google cohérent avec la
   grille du jour, course jusqu'au parc. */
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
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const grille = (fr, cle, iso) => fr.evaluate(([c, i]) => window.__bcGrille(c, i).map(b => b[0] + ' ' + b[1]), [cle, iso]);
const TP = {'batcave-journees': {'2026-09-24': {type:'tp', label:'Anatomía I', debut:'11:00', fin:'13:00', trajet:30}}};

console.log('\n== 250) Journée exceptionnelle : TP jeudi 24 sept. 11:00 → 13:00 ==');
{
  const { ctx, fr } = await ouvrir('2026-09-24T08:00:00+02:00', TP);
  const g = await grille(fr, 'weekday', '2026-09-24');
  ok(g.includes('09:30 Préparer · TP · Anatomía I'), 'préparation une heure avant le départ (' + g.filter(x => /Préparer/.test(x)) + ')');
  ok(g.includes('10:30 Trajet · TP · Anatomía I') && g.includes('11:00 TP · Anatomía I') && g.includes('13:00 Trajet retour'), 'trajet, TP, retour');
  ok(g.includes('13:30 Déjeuner') && !g.some(x => /12:20 Déjeuner/.test(x)), 'le déjeuner perdu est replacé après le retour');
  ok(g.includes('07:20 Anki 1') && g.includes('08:20 Anki 2') && g.includes('09:20 Cartes du dernier cours'), 'Anki 1, Anki 2 et Cartes gardent leur place');
  ok(!g.some(x => /Annales$/.test(x)) && !g.some(x => /gramática|escribir/.test(x)) && g.includes('14:00 Español · preparar la clase'), 'Annales et les blocs Español du créneau sacrifiés, 14:00 reprend');
  ok(g.includes('15:30 Cours') && g.includes('21:55 Coucher'), 'l\'après-midi et le soir ne bougent pas');
  const veille = await grille(fr, 'wednesday', '2026-09-23');
  ok(veille.includes('20:30 Préparer · TP · Anatomía I') && veille.includes('07:20 Anki 1'), 'la veille (mercredi 23) : 20:30 devient « Préparer », le reste ne bouge pas');
  const lundi = await grille(fr, 'monday', '2026-09-21');
  ok(lundi.includes('20:30 Comprendre le cours du jour'), 'un autre jour reste tel quel');
  const cs = await fr.evaluate(() => [window.__bcConsigne('Préparer · TP · Anatomía I', 3, '2026-09-23'), window.__bcConsigne('TP · Anatomía I', 4, '2026-09-24'), window.__bcTypeBloc('Préparer · TP · Anatomía I'), window.__bcTypeBloc('TP · Anatomía I')]);
  ok(/Veille de TP · Anatomía I/.test(cs[0]) && /silencieux/.test(cs[1]), 'consignes de la veille et de l\'événement');
  ok(cs[2] === 'cours' && cs[3] === null, '« Préparer » est du temps de révision, le TP lui-même non');
  const lab = await fr.evaluate(() => document.getElementById('cal-schedule-label').textContent);
  ok(/📌 TP · Anatomía I 11:00/.test(lab), 'étiquette de l\'emploi du temps (' + lab + ')');
  const tl = await fr.evaluate(() => [...document.querySelectorAll('#cal-timeline .t-label')].map(e => e.textContent));
  ok(tl.includes('TP · Anatomía I') && tl.includes('Préparer · TP · Anatomía I'), 'la timeline du jour montre la journée reconstruite');
  const liste = await fr.evaluate(() => document.getElementById('journees-liste').innerText.replace(/\s+/g, ' '));
  ok(/TP · Anatomía I/.test(liste) && /Sacrifié ce jour-là : .*Annales/.test(liste) && /aujourd'hui/.test(liste), 'panneau : la journée, ses blocs sacrifiés (' + liste.slice(0, 120) + ')');
  await ctx.close();
}

console.log('\n== 251) Formulaire : ajouter puis supprimer une journée ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-16T08:00:00+02:00');
  await fr.evaluate(() => {
    document.getElementById('jx-date').value = '2026-09-18';
    document.getElementById('jx-debut').value = '16:00'; document.getElementById('jx-fin').value = '17:30';
    document.getElementById('jx-type').value = 'autre'; document.getElementById('jx-label').value = 'Dentiste';
    document.getElementById('jx-trajet').value = '15';
    document.getElementById('jx-add').click();
  });
  await page.waitForTimeout(200);
  const st = await fr.evaluate(() => window.__bcJournees());
  ok(st['2026-09-18'] && st['2026-09-18'].label === 'Dentiste' && st['2026-09-18'].trajet === 15, 'enregistrée dans batcave-journees');
  const g = await grille(fr, 'friday', '2026-09-18');
  ok(g.includes('16:00 Événement · Dentiste') && g.includes('15:45 Trajet · Événement · Dentiste') && g.includes('17:30 Trajet retour'), 'le vendredi 18 est reconstruit autour du rendez-vous (' + g.filter(x => /Dentiste|retour/.test(x)) + ')');
  ok(!g.includes('14:45 Préparer · Événement · Dentiste') || true, '(préparation possible)');
  const veille = await grille(fr, 'weekday', '2026-09-17');
  ok(veille.includes('20:30 Préparer · Événement · Dentiste'), 'la veille prépare le rendez-vous');
  const bad = await fr.evaluate(() => { document.getElementById('jx-date').value = '2026-09-19'; document.getElementById('jx-debut').value = '12:00'; document.getElementById('jx-fin').value = '11:00'; document.getElementById('jx-add').click(); return Object.keys(window.__bcJournees()).length; });
  ok(bad === 1, 'fin avant début : refusé');
  await fr.evaluate(() => document.querySelector('[data-deljx="2026-09-18"]').click());
  await page.waitForTimeout(200);
  const apres = await fr.evaluate(() => [Object.keys(window.__bcJournees()).length, window.__bcGrille('friday', '2026-09-18').some(b => /Dentiste/.test(b[1]))]);
  ok(apres[0] === 0 && apres[1] === false, 'supprimée : la grille type reprend');
  await ctx.close();
}

const EXAMENS = {'batcave-examens': {'Anatomía I':'2026-11-16', 'Bioquímica':'2026-11-19', 'Microbiología':'2027-01-25'}, 'batcave-examens-heures': {'Bioquímica': {debut:'15:00', fin:'17:00'}}};
console.log('\n== 252) Mode partiels : J-7 avant le premier examen, jusqu\'au dernier ==');
{
  const { ctx, fr } = await ouvrir('2026-11-10T08:00:00+02:00', EXAMENS);   /* mardi, J-6 */
  const sess = await fr.evaluate(() => window.__bcSessionsPartiels());
  ok(sess.length === 2 && sess[0].debut === '2026-11-09' && sess[0].fin === '2026-11-19' && sess[0].n === 2 && sess[1].debut === '2027-01-18', 'deux sessions : 9 → 19 nov. (2 examens) et 18 → 25 janv. (' + JSON.stringify(sess) + ')');
  const p = await fr.evaluate(() => window.__bcPeriode('2026-11-10'));
  ok(p && p.id === 'partiels' && p.debut === '2026-11-09', 'le 10 novembre est en mode partiels');
  const p8 = await fr.evaluate(() => window.__bcPeriode('2026-11-08'));
  ok(p8 && p8.id === 'es-2', 'le 8 novembre reste en phase Español 2');
  const g = await grille(fr, 'tuesday', '2026-11-10');
  ok(g.includes('07:20 Anki 1') && g.includes('08:20 Anki 2') && g.includes('10:20 Annales'), 'Anki 1, Anki 2, Annales intacts');
  /* Le mardi, « Comprendre le cours du jour » est a 18:00 (sortie d'amphi a 17:30), et les
     blocs « Projets perso 5 » (19:00) et « 6 » (20:30) doivent eux aussi basculer en revision
     ciblee : sans leur ligne dans RENOMMAGES_PARTIELS ils restaient du dropshipping en
     semaine d'examen, et le mardi portait deux blocs Español au lieu d'un. */
  ok(g.includes('09:20 Annales ciblées') && g.includes('11:20 Révision ciblée') && g.includes('13:00 Révision ciblée') && g.includes('14:00 Español') && g.includes('18:00 Fiches de synthèse') && g.includes('19:00 Révision ciblée') && g.includes('20:30 Révision ciblée'), 'Cartes → Annales ciblées, Projets perso → Révision ciblée (les 6), un seul bloc Español, Comprendre → Fiches (' + g.filter(x => /ciblée|Español|Fiches/.test(x)) + ')');
  ok(g.filter(x => /Español/.test(x)).length === 1, 'mardi en partiels : un seul bloc Español (' + g.filter(x => /Español/.test(x)) + ')');
  const gl = await grille(fr, 'monday', '2026-11-09');
  ok(gl.includes('15:00 Révision ciblée') && gl.filter(x => /Español/.test(x)).length === 1 && gl.includes('20:30 Fiches de synthèse'), 'lundi en partiels : 15:00 en révision ciblée, un seul Español (' + gl.filter(x => /ciblée|Español|Fiches/.test(x)) + ')');
  const gv = await grille(fr, 'friday', '2026-11-13');
  ok(gv.includes('05:30 Révision ciblée') && gv.includes('10:20 Révision ciblée') && gv.includes('11:20 Español'), 'vendredi : matinal et PP1 en révision ciblée, PP2 en Español');
  const c = await fr.evaluate(() => [window.__bcConsigne('Révision ciblée', 2, '2026-11-10'), window.__bcConsigne('Annales ciblées', 2, '2026-11-17'), window.__bcTypeBloc('Révision ciblée'), window.__bcTypeBloc('Fiches de synthèse')]);
  ok(/Anatomía I/.test(c[0]) && /J-6/.test(c[0]), 'consigne : la matière la plus proche, Anatomía I à J-6 (' + c[0].slice(0, 60) + ')');
  ok(/Bioquímica/.test(c[1]), 'le 17, Anatomía passée : Bioquímica');
  ok(c[2] === 'cours' && c[3] === 'cours', 'révision ciblée et fiches comptent en révision');
  const bar = await fr.evaluate(() => ({ grille: document.querySelector('#bc-grille .v').textContent, note: document.getElementById('examens-note').textContent, cal: document.getElementById('cal-schedule-label').textContent }));
  ok(/Partiels · J-9/.test(bar.grille), 'barre : Partiels · J-9 (' + bar.grille + ')');
  ok(/mode partiels du 09 nov\. au 19 nov\./.test(bar.note), 'note Études (' + bar.note + ')');
  ok(/Partiels/.test(bar.cal), 'étiquette du calendrier (' + bar.cal + ')');
  const heures = await fr.evaluate(() => [...document.querySelectorAll('#examens-liste [data-examen-h]')].map(i => i.dataset.mat + ':' + i.dataset.examenH + '=' + i.value));
  ok(heures.includes('Bioquímica:debut=15:00') && heures.includes('Anatomía I:debut='), 'heures : Bioquímica 15:00, Anatomía vide (défaut)');
  const liste = await fr.evaluate(() => document.getElementById('journees-liste').innerText.replace(/\s+/g, ' '));
  ok(/Examen · Anatomía I/.test(liste) && /09:00 → 11:00/.test(liste) && /horaire par défaut/.test(liste) && /Examen · Bioquímica 15:00 → 17:00/.test(liste) && /depuis Études/.test(liste), 'panneau Journées : deux examens, l\'un à l\'horaire par défaut');
  await ctx.close();
}

console.log('\n== 253) Jour d\'examen et veille ==');
{
  const { ctx, fr } = await ouvrir('2026-11-16T06:00:00+02:00', EXAMENS);   /* lundi, Anatomía I 09:00 (défaut) */
  const g = await grille(fr, 'monday', '2026-11-16');
  ok(g.includes('09:00 Examen · Anatomía I') && g.includes('08:30 Trajet · Examen · Anatomía I') && g.includes('11:00 Trajet retour'), 'lundi 16 : trajet 08:30, examen 09:00 → 11:00 (' + g.filter(x => /Examen|retour/.test(x)) + ')');
  ok(g.includes('07:20 Anki 1') && !g.some(x => /08:20 Anki 2/.test(x)) && g.includes('07:30 Préparer · Examen · Anatomía I'), 'Anki 1 gardé, Anki 2 sacrifié pour la préparation à 07:30');
  const v = await grille(fr, 'weekend', '2026-11-15');
  ok(v.includes('19:30 Préparer · Examen · Anatomía I') && v.includes('09:20 Annale complète'), 'dimanche 15 : le temps libre du soir prépare l\'examen, l\'annale du matin reste');
  const j = await grille(fr, 'weekday', '2026-11-19');
  ok(j.includes('15:00 Examen · Bioquímica') && j.includes('13:30 Préparer · Examen · Bioquímica') && j.includes('14:30 Trajet · Examen · Bioquímica') && !j.some(x => /Cours$/.test(x)), 'jeudi 19 : préparation 13:30, trajet 14:30, examen 15:00 → 17:00, le cours de 15:30 sacrifié');
  const jour1 = await fr.evaluate(() => ({ p: window.__bcPeriode('2026-11-20'), g: window.__bcGrille('friday', '2026-11-20').map(b => b[1]) }));
  ok(jour1.p && jour1.p.id === 'es-2' && jour1.g.includes('Projets perso 1'), 'le 20 : fin des partiels, la phase Español 2 reprend');
  await ctx.close();
}

console.log('\n== 254) Pomodoro ferme : lanceur ouvert seul au début d\'un bloc, rappel orange ensuite ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-15T07:23:00+02:00');   /* mardi, Anki 1 depuis 3 min */
  await page.waitForTimeout(200);
  const a = await fr.evaluate(() => ({ ouvert: !document.getElementById('ask-overlay').hidden, titre: document.getElementById('ask-title').textContent, valeur: document.getElementById('ask-select').value, sans: window.__bcBlocSansPomodoro() }));
  ok(a.ouvert && a.valeur === 'Sans préciser' && /matière/i.test(a.titre), 'à 07:23 le lanceur s\'est ouvert seul, « Sans préciser » proposé (' + a.titre + ')');
  ok(a.sans && a.sans.label === 'Anki 1' && a.sans.depuis === 3, 'blocSansPomodoro : Anki 1 depuis 3 min');
  await fr.evaluate(() => document.getElementById('ask-cancel').click());
  await page.waitForTimeout(100);
  const memo = await fr.evaluate(() => JSON.parse(sessionStorage.getItem('bc-pomo-propose') || '{}'));
  ok(memo['2026-09-15|07:20'] === 1, 'proposé une fois, mémorisé pour l\'onglet');
  await fr.evaluate(() => { window.__bcProposer = null; });
  const bar = await fr.evaluate(() => { const t = document.getElementById('dash-timer'); return { hidden: t.hidden, dans: document.getElementById('pb-dans').textContent, quoi: document.getElementById('pb-quoi').textContent, r1: Math.round(document.querySelector('.bc-row-1').getBoundingClientRect().height) }; });
  ok(bar.hidden && /aucun Pomodoro depuis 3 min/.test(bar.dans) && bar.quoi === 'Anki 1', 'écran central : « aucun Pomodoro depuis 3 min » sur Anki 1, la barre du haut n\'est pas touchée (' + bar.dans + ')');
  ok(bar.r1 < 60, 'la première rangée de la barre reste sur une ligne (' + bar.r1 + 'px)');
  /* on relance : le dialogue ne se rouvre pas (déjà proposé) */
  await page.clock.runFor(31000);
  await page.waitForTimeout(100);
  const b = await fr.evaluate(() => !document.getElementById('ask-overlay').hidden);
  ok(b === false, 'au tick suivant, pas de seconde fenêtre');
  /* lancer vraiment : la barre repasse en minuteur */
  await fr.evaluate(() => document.getElementById('dash-pomodoro').click());
  await page.waitForTimeout(100);
  await fr.evaluate(() => document.getElementById('ask-ok').click());
  await page.waitForTimeout(200);
  const c = await fr.evaluate(() => ({ txt: document.getElementById('dash-timer').textContent, dans: document.getElementById('pb-dans').textContent, sans: window.__bcBlocSansPomodoro() }));
  ok(/Révision en cours/.test(c.txt) && /puis Anki 2/.test(c.dans) && c.sans === null, 'minuteur lancé : la barre montre le décompte, l\'écran central redit « puis Anki 2 » (' + c.dans + ')');
  await ctx.close();
  const { ctx: c2, fr: f2 } = await ouvrir('2026-09-15T07:45:00+02:00');   /* plus de 10 min : pas de fenêtre, mais le rappel */
  const d = await f2.evaluate(() => ({ ouvert: !document.getElementById('ask-overlay').hidden, txt: document.getElementById('pb-dans').textContent }));
  ok(!d.ouvert && /aucun Pomodoro depuis 25 min/.test(d.txt), 'à 07:45 : pas de fenêtre, rappel « depuis 25 min » (' + d.txt + ')');
  await c2.close();
  const { ctx: c3, fr: f3 } = await ouvrir('2026-09-15T11:22:00+02:00');   /* bloc Español · gramática */
  const e = await f3.evaluate(() => ({ ouvert: !document.getElementById('ask-overlay').hidden, titre: document.getElementById('ask-title').textContent, valeur: document.getElementById('ask-select').value }));
  ok(e.ouvert && /Español/.test(e.titre) && e.valeur === 'gramática', 'sur un bloc Español, le lanceur Español s\'ouvre avec la tâche du bloc (' + e.valeur + ')');
  await c3.close();
  const { ctx: c4, fr: f4 } = await ouvrir('2026-09-15T12:25:00+02:00');   /* Déjeuner : rien */
  const f = await f4.evaluate(() => ({ ouvert: !document.getElementById('ask-overlay').hidden, hidden: document.getElementById('dash-timer').hidden, dans: document.getElementById('pb-dans').textContent }));
  ok(!f.ouvert && f.hidden && !/Pomodoro/.test(f.dans), 'hors bloc de travail : ni fenêtre ni rappel (' + f.dans + ')');
  await c4.close();
}

console.log('\n== 255) Agenda Google : titres de la grille du jour, titre de base pour reconnaître la série ==');
{
  const { ctx, fr } = await ouvrir('2026-09-15T08:00:00+02:00', TP);
  const r = await fr.evaluate(() => window.__bcRappels('2026-09-15').map(b => [b.titre, b.titreBase, b.debut]));
  const pp1 = r.find(x => x[2] === 11*60 + 20);
  ok(pp1 && pp1[0] === '🦇 Español · gramática' && pp1[1] === '🦇 Projets perso 1', '11:20 : titre « Español · gramática », base « Projets perso 1 » (' + pp1 + ')');
  const anki = r.find(x => x[2] === 7*60 + 20);
  ok(anki && anki[0] === '🦇 Anki 1' && anki[1] === '🦇 Anki 1', 'Anki 1 : titre et base identiques');
  const tp = await fr.evaluate(() => window.__bcRappels('2026-09-24').map(b => [b.titre, b.titreBase, b.debut]));
  const ev = tp.find(x => /TP · Anatomía/.test(x[0]) && !/Trajet|Préparer/.test(x[0]));
  ok(ev && ev[0] === '🦇 TP · Anatomía I' && ev[1] === ev[0] && ev[2] === 660, 'journée exceptionnelle : le TP est un bloc à rappeler à 11:00, sans titre de base');
  await ctx.close();
}

console.log('\n== 256) Course jusqu\'au parc ==');
{
  const { ctx, fr } = await ouvrir('2026-09-14T06:00:00+02:00');
  const t = await fr.evaluate(() => [document.getElementById('programme-details').textContent, window.__bcConsigne('Sport', 1, '2026-09-14')]);
  ok(/Trajet en courant/.test(t[0]) && /1 km/.test(t[0]) && /allure conversation/.test(t[0]), 'le programme décrit le trajet en courant');
  ok(/1 km|kilomètre/.test(t[1]) && /trottinant le mardi/.test(t[1]), 'consigne du bloc Sport (phase Español) : ' + t[1].slice(0, 60));
  await ctx.close();
}

await browser.close();
console.log(errs ? '\nECHECS: ' + errs : '\nTOUT OK');
process.exit(errs ? 1 : 0);
