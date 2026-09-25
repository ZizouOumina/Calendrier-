/* Chaque geste avec toutes ses issues : valide, invalide, refuse avec un message, confirme puis
   annule (⌘Z), relu apres rechargement. Objectifs (cible, ajout, suppression, horizon, saison),
   habitudes (passage d'annee), budget, cloture, echeances, sessions repliees, restauration. */
import { chromium } from 'playwright';
import { seed, decalage } from './donnees-fictives.mjs';
const URL = 'http://127.0.0.1:8199/host.html';
const browser = await chromium.launch();
let defauts = 0, total = 0;
const ok = (c, m) => { total++; console.log((c ? '  ok  ' : '  ✗   ') + m); if(!c) defauts++; };
async function ouvrir(date, heure, graine, vp){
  const ctx = await browser.newContext({ viewport: vp || {width: 1440, height: 900}, timezoneId: 'Europe/Madrid', locale: 'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(graine) await ctx.addInitScript(x => { if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme', '1'); Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); } }, graine);
  const page = await ctx.newPage();
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.clock.install({ time: new Date(date + 'T' + heure + ':00' + decalage(date)) });
  const charger = async () => {
    await page.goto(URL, {timeout: 30000}).catch(() => {});
    await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 30000 });
    const fr = page.frames().find(x => x.url().includes('batcave.html'));
    await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout: 20000}).catch(() => {});
    await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r && r.offsetParent !== null) r.click(); ['cloture-close'].forEach(id => { const b = document.getElementById(id); if(b && b.offsetParent) b.click(); }); });
    return fr;
  };
  const fr = await charger();
  return { ctx, page, fr, erreurs, charger };
}
const L = (fr, k) => fr.evaluate(k => JSON.parse(window.__bcLire(k) || 'null'), k);
const toast = fr => fr.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
/* le bouton « ↩ Annuler ⌘Z » de la barre laterale : un vrai geste (le raccourci clavier est ignore, a juste titre, quand le focus est dans un champ) */
const undo = async (s) => { await s.fr.evaluate(() => { if(document.activeElement) document.activeElement.blur(); const b = [...document.querySelectorAll('button')].find(x => /Annuler\s*⌘Z/.test(x.textContent)); if(b) b.click(); else document.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', metaKey: true, bubbles: true})); }); await s.page.waitForTimeout(900); s.fr = await s.charger(); };

console.log('\n== 1) Objectifs : changer une cible, toutes les issues ==');
{
  const s = await ouvrir('2026-12-15', '10:00', seed('2026-12-15'));
  const r0 = await s.fr.evaluate(() => { document.querySelector('.nav-btn[data-page="objectifs"]').click(); const i = document.querySelector('[data-obj-cible]'); return i ? {id: i.dataset.objCible, v: i.value} : null; });
  ok(!!r0, 'un objectif modifiable est affiché (' + (r0 && r0.id) + ', cible ' + (r0 && r0.v) + ')');
  const changer = v => s.fr.evaluate(({id, v}) => { const i = document.querySelector('[data-obj-cible="' + id + '"]'); i.value = v; i.dispatchEvent(new Event('change', {bubbles: true})); const o = JSON.parse(localStorage.getItem('batcave-objectifs')).liste.filter(x => x.id === id)[0]; return {cible: o.cible, auto: o.auto, nan: /NaN|undefined|Infinity/.test(document.querySelector('.page[data-page="objectifs"]').innerText)}; }, {id: r0.id, v});
  let r = await changer('12'); ok(r.cible === 12 && r.auto === false && !r.nan, 'cible 12 : enregistrée, la grille ne la recalcule plus, rien d’absurde à l’écran');
  r = await changer('-5'); ok(r.cible === 12, 'cible −5 : refusée, 12 reste');
  r = await changer(''); ok(r.cible === 12, 'champ vidé : refusé (il valait 0 avant), 12 reste');
  r = await changer('999999'); ok(r.cible === 12 && /impossible/.test(await toast(s.fr)), 'cible 999 999 : refusée avec un message');
  r = await changer('7.5'); ok(r.cible === 7.5, 'cible 7,5 (le clavier numérique de l’iPhone envoie 7.5) : 7,5');
  s.fr = await s.charger();
  const apres = (await L(s.fr, 'batcave-objectifs')).liste.filter(x => x.id === r0.id)[0];
  ok(apres && apres.cible === 7.5, 'après rechargement : 7,5');
  await undo(s);
  const annule = (await L(s.fr, 'batcave-objectifs')).liste.filter(x => x.id === r0.id)[0];
  ok(annule && annule.cible === 12, '⌘Z : la cible revient à la précédente, 12 (' + (annule && annule.cible) + ')');
  ok(!s.erreurs.length, 'aucune erreur JS' + (s.erreurs.length ? ' · ' + s.erreurs[0] : ''));
  await s.ctx.close();
}

console.log('\n== 2) Objectifs : ajouter, refuser, supprimer, annuler ==');
{
  const s = await ouvrir('2026-12-15', '10:00', seed('2026-12-15'));
  const n0 = (await L(s.fr, 'batcave-objectifs')).liste.length;
  const ajouter = (titre, idx, cible) => s.fr.evaluate(({titre, idx, cible}) => {
    document.querySelector('.nav-btn[data-page="objectifs"]').click();
    document.getElementById('obj-titre').value = titre; const m = document.getElementById('obj-metrique'); m.selectedIndex = idx % m.options.length; document.getElementById('obj-cible').value = cible;
    document.getElementById('obj-add').click();
    return {n: JSON.parse(localStorage.getItem('batcave-objectifs')).liste.length, nb: m.options.length, t: (document.getElementById('toast') || {}).textContent};
  }, {titre, idx, cible});
  let r = await ajouter('Sans cible', 0, ''); ok(r.n === n0 && /cible/.test(r.t), 'sans cible : refusé avec « Indique une cible »');
  r = await ajouter('Zéro', 0, '0'); ok(r.n === n0, 'cible 0 : refusée');
  let n = n0;
  for(let i = 0; i < r.nb; i++){ r = await ajouter(i % 2 ? '' : 'Objectif ' + i, i, String(3 + i)); n++; }
  ok(r.n === n, 'une cible par mesure (' + r.nb + ' mesures) : ' + (r.n - n0) + ' objectifs ajoutés');
  const vue = await s.fr.evaluate(() => { const t = document.querySelector('.page[data-page="objectifs"]').innerText; return {nan: /NaN|undefined|Infinity/.test(t), sansTitre: /\bnull\b/.test(t)}; });
  ok(!vue.nan && !vue.sansTitre, 'la page reste lisible, un objectif sans titre prend le nom de sa mesure');
  s.fr = await s.charger();
  const nRel = (await L(s.fr, 'batcave-objectifs')).liste.length;
  ok(nRel === n, 'après rechargement, les objectifs ajoutés sont tous là (' + nRel + ' / ' + n + ' ; avant le correctif, 27 disparaissaient)');
  await s.fr.evaluate(() => document.querySelector('.nav-btn[data-page="objectifs"]').click());
  const suppr = acc => s.fr.evaluate(acc => { const b = [...document.querySelectorAll('[data-obj-del]')].pop(); b.click(); document.getElementById(acc ? 'ask-ok' : 'ask-cancel').click(); return JSON.parse(localStorage.getItem('batcave-objectifs')).liste.length; }, acc);
  ok(await suppr(false) === n, 'supprimer puis « Annuler » dans la confirmation : rien ne part');
  ok(await suppr(true) === n - 1, 'supprimer et confirmer : l’objectif part');
  await undo(s);
  const nApres = (await L(s.fr, 'batcave-objectifs')).liste.length;
  ok(nApres === n, '⌘Z : l’objectif supprimé revient (' + nApres + ' / ' + n + ')');
  const vues = await s.fr.evaluate(() => { document.querySelector('.nav-btn[data-page="objectifs"]').click(); const out = []; document.querySelectorAll('[data-obj-vue]').forEach(b => { b.click(); out.push(b.dataset.objVue + ':' + (/NaN|undefined|Infinity/.test(document.querySelector('.page[data-page="objectifs"]').innerText) ? 'NaN' : 'ok')); }); return out; });
  ok(vues.length >= 2 && vues.every(v => /ok$/.test(v)), 'chaque vue (' + vues.join(', ') + ') se lit');
  ok(!s.erreurs.length, 'aucune erreur JS' + (s.erreurs.length ? ' · ' + s.erreurs[0] : ''));
  await s.ctx.close();
}

console.log('\n== 3) Horizon et saison : la fin du programme suit la saison ==');
{
  const s = await ouvrir('2027-03-12', '10:00', seed('2027-03-12'));
  const h = v => s.fr.evaluate(v => { const i = document.getElementById('goal-horizon-fin'); i.value = v; i.dispatchEvent(new Event('change', {bubbles: true})); return JSON.parse(localStorage.getItem('batcave-horizon') || 'null'); }, v);
  let r = await h('2026-01-01'); ok(r === null || r.fin === '2027-03-14', 'horizon avant son début : refusé');
  const sa = await s.fr.evaluate(() => { document.querySelector('.nav-btn[data-page="objectifs"]').click(); const b = document.getElementById('saison-cloturer'); return b ? !b.hidden : false; });
  ok(sa, 'deux jours avant la fin, « Clôturer la saison » est proposé');
  await s.fr.evaluate(() => { document.getElementById('saison-cloturer').click(); document.getElementById('ask-ok').click(); });
  const apres = await s.fr.evaluate(() => ({h: JSON.parse(localStorage.getItem('batcave-horizon')), saisons: JSON.parse(window.__bcLire('batcave-saisons') || '[]').length, cardio: window.__bcSortiesCardio('2027-03-22').length, obj: JSON.parse(localStorage.getItem('batcave-objectifs')).liste.filter(o => o.debut >= '2027-03-14').length}));
  ok(apres.h.fin === '2027-09-14' && apres.saisons === 1, 'saison close : horizon jusqu’au 14 septembre 2027, une saison archivée');
  ok(apres.obj > 0, 'les objectifs des nouvelles périodes sont semés (' + apres.obj + ')');
  const arc = await s.fr.evaluate(() => { const sa = JSON.parse(localStorage.getItem('batcave-saisons'))[0]; return {n: sa.objectifs.length, semaine: sa.objectifs.filter(o => o.periode === 'semaine').length, sept: sa.objectifs.some(o => o.pid && /2026-09/.test(o.pid)), statut: sa.objectifs.filter(o => o.statut).length, ko: Math.round(JSON.stringify(sa).length / 1024)}; });
  ok(arc.n > 0 && arc.semaine === 0 && arc.sept && arc.statut === arc.n && arc.ko < 15, 'l’archive de saison : ' + arc.n + ' objectifs du mois et de la saison (septembre compris), chacun avec son verdict, ' + arc.ko + ' Ko');
  ok(apres.cardio > 0, 'après le 14 mars, les sorties cardio de la semaine se comptent encore (' + apres.cardio + ')');
  await s.ctx.close();
  const t = await ouvrir('2027-03-20', '08:00', seed('2027-03-20'));
  const note = await t.fr.evaluate(() => ({num: document.getElementById('dash-score-num').textContent, note: document.getElementById('dash-score-note').textContent}));
  ok(!/À reprendre/.test(note.note) && note.num === '—', 'saison finie, non clôturée, rien de saisi à 8 h : pas de « 0 % · À reprendre » (« ' + note.note.slice(0, 70) + ' »)');
  await t.ctx.close();
}

console.log('\n== 4) Habitudes : le passage d’année ==');
{
  const g = seed('2026-12-31');
  const s = await ouvrir('2027-01-02', '10:00', g);
  await s.fr.evaluate(() => { const c = document.querySelector('#dash-checklist input[type="checkbox"]:not(:checked)'); if(c) c.click(); });
  const r = await s.fr.evaluate(() => ({base: JSON.parse(localStorage.getItem('batcave-habitlog')), an: JSON.parse(localStorage.getItem('batcave-habitlog-2026') || 'null'), fusion: JSON.parse(window.__bcLire('batcave-habitlog'))}));
  const fajrBase = (r.base['core-fajr'] || []), fajrFus = (r.fusion['core-fajr'] || []);
  ok(r.an && r.an.bits && typeof r.an.bits['core-fajr'] === 'string', '2026 est rangée en une ligne de bits par habitude');
  ok(!fajrBase.some(d => d < '2027'), 'la clé courante ne garde que 2027');
  ok(fajrFus.indexOf('2026-12-30') > -1 && fajrFus.length === g['batcave-habitlog']['core-fajr'].length + fajrBase.filter(d => d >= '2027').length, 'relue d’un seul tenant, aucune date perdue (' + fajrFus.length + ')');
  s.fr = await s.charger();
  const heat = await s.fr.evaluate(() => { document.querySelector('.nav-btn[data-page="habitudes"]').click(); return /NaN|undefined/.test(document.querySelector('.page[data-page="habitudes"]').innerText); });
  ok(!heat, 'après rechargement, l’onglet Habitudes se lit');
  ok(!s.erreurs.length, 'aucune erreur JS' + (s.erreurs.length ? ' · ' + s.erreurs[0] : ''));
  await s.ctx.close();
}

console.log('\n== 5) Sessions repliées au-delà de quatre mois : aucune minute perdue ==');
{
  const g = {};
  const ms = (d, h) => new Date(d + 'T' + h + ':00+01:00').getTime();
  g['batcave-sessions'] = [
    {id: 'v1', date: '2026-10-05', debut: ms('2026-10-05', '08:20'), fin: ms('2026-10-05', '09:15'), duree: 55, type: 'cours', label: 'Biología'},
    {id: 'v2', date: '2026-10-05', debut: ms('2026-10-05', '09:20'), fin: ms('2026-10-05', '10:15'), duree: 55, type: 'cours', label: 'Histología'},
    {id: 'v3', date: '2026-10-05', debut: ms('2026-10-05', '14:00'), fin: ms('2026-10-05', '14:55'), duree: 55, type: 'projet', label: 'Español · gramática'},
    {id: 'n1', date: '2027-02-20', debut: ms('2027-02-20', '08:20'), fin: ms('2027-02-20', '09:15'), duree: 55, type: 'cours', label: 'Biología'}];
  g['batcave-revision'] = [{id: 'r1', date: '2026-10-05', duree: 55, matieres: {'Biología': 55}}];   /* un total incomplet, exprès */
  const s = await ouvrir('2027-03-01', '10:00', g);
  const r = await s.fr.evaluate(() => ({sess: JSON.parse(window.__bcLire('batcave-sessions')).map(x => x.id), rev: JSON.parse(window.__bcLire('batcave-revision')).filter(x => x.date === '2026-10-05')[0], proj: JSON.parse(window.__bcLire('batcave-projets') || '[]').filter(x => x.date === '2026-10-05'), es: window.__bcMinutesEspanol('2026-10-05')}));
  ok(r.sess.join(',') === 'n1', 'le détail d’octobre est replié, celui de février reste');
  ok(r.rev && r.rev.duree === 110 && r.rev.matieres['Histología'] === 55, 'le total du 5 octobre couvre le détail : 110 min, Histología comprise');
  ok(r.proj.length === 1 && r.proj[0].duree === 55 && r.es === 55, 'l’espagnol replié se lit encore (55 min)');
  s.fr = await s.charger();
  const r2 = await s.fr.evaluate(() => JSON.parse(window.__bcLire('batcave-revision')).filter(x => x.date === '2026-10-05')[0].duree);
  ok(r2 === 110, 'un second passage ne compte rien deux fois (110)');
  await s.ctx.close();
}

console.log('\n== 6) Budget : montants valides et impossibles ==');
{
  const s = await ouvrir('2026-12-15', '10:00', seed('2026-12-15'));
  const ajout = v => s.fr.evaluate(v => { document.querySelector('.nav-btn[data-page="budget"]').click(); const n0 = JSON.parse(window.__bcLire('batcave-transactions')).length; document.getElementById('tx-montant').value = v; document.getElementById('tx-add').click(); return {d: JSON.parse(window.__bcLire('batcave-transactions')).length - n0, t: (document.getElementById('toast') || {}).textContent}; }, v);
  let r = await ajout(''); ok(r.d === 0 && /montant/i.test(r.t), 'montant vide : refusé, et c’est dit');
  r = await ajout('-3'); ok(r.d === 0, 'montant négatif : refusé');
  r = await ajout('1000000'); ok(r.d === 0 && /impossible/.test(r.t), '1 000 000 € : refusé comme faute de frappe');
  r = await ajout('12.5'); ok(r.d === 1, '12,50 € : ajouté');
  await undo(s);
  const n = await s.fr.evaluate(() => JSON.parse(window.__bcLire('batcave-transactions')).filter(t => t.montant === 12.5).length);
  ok(n === 0, '⌘Z : la dépense repart');
  await s.ctx.close();
}

console.log('\n== 7) Clôture : valeurs impossibles, puis valide, puis annulée ==');
{
  const s = await ouvrir('2026-12-15', '21:00', seed('2026-12-15'));
  const clore = (som, lit) => s.fr.evaluate(({som, lit}) => { const ov = document.getElementById('cloture-overlay'); if(ov.hidden) document.getElementById('bc-cloture').click(); document.getElementById('cl-sommeil').value = som; document.getElementById('cl-aulit').value = lit; document.getElementById('cloture-valider').click(); return {ouverte: !document.getElementById('cloture-overlay').hidden, focus: document.activeElement && document.activeElement.id, t: (document.getElementById('toast') || {}).textContent, j: JSON.parse(localStorage.getItem('batcave-journal-2026-12-15') || '{}')}; }, {som, lit});
  let r = await clore('25', '26'); ok(r.ouverte && r.focus === 'cl-sommeil' && /impossible/.test(r.t), '25 h de sommeil : refusé, le curseur revient sur le champ');
  r = await clore('8', '7'); ok(r.ouverte && r.focus === 'cl-aulit', 'au lit moins longtemps que le sommeil : refusé');
  r = await clore('7', '8'); ok(!r.ouverte && r.j.cloture && r.j.sommeil === '7', 'valide : journée clôturée');
  await s.fr.evaluate(() => { const d = document.getElementById('demain-ok'); if(d) d.click(); });
  await undo(s);
  const j = await L(s.fr, 'batcave-journal-2026-12-15');
  ok(!j || !j.cloture, '⌘Z : la clôture est défaite d’un coup');
  await s.ctx.close();
}

console.log('\n== 8) Échéances : ajoutée, dans Demain, faite, comptée juste ==');
{
  const s = await ouvrir('2026-12-15', '10:00', seed('2026-12-15'));
  const r = await s.fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="etudes"]').click();
    const plus = document.getElementById('ech-plus'); if(document.getElementById('ech-form').hidden) plus.click();
    const n0 = JSON.parse(localStorage.getItem('batcave-echeances') || '[]').length;
    document.getElementById('ech-date').value = ''; document.getElementById('ech-add').click();
    const vide = JSON.parse(localStorage.getItem('batcave-echeances') || '[]').length - n0;
    document.getElementById('ech-date').value = '2026-12-16'; document.getElementById('ech-matiere').value = 'Biología'; document.getElementById('ech-label').value = 'Q5'; document.getElementById('ech-add').click();
    const d = window.__bcDemain.donnees();
    const sys = window.__bcSysteme.donnees().satellites.filter(x => x.id === 'fac')[0].sous.filter(x => /Échéances/.test(x.nom))[0].val;
    return {vide, demain: d.echeances.length, sys};
  });
  ok(r.vide === 0, 'sans date : refusée');
  ok(r.demain >= 1, 'l’échéance de demain apparaît dans « Demain »');
  ok(Number(r.sys) >= 1, 'la carte du Système compte les échéances à venir (' + r.sys + ', c’était toujours 0)');
  await s.ctx.close();
}

console.log('\n== 9) Restauration : une liste restaurée remplace la liste locale ==');
{
  const s = await ouvrir('2026-12-15', '10:00', seed('2026-12-15'));
  const sauvegarde = await s.fr.evaluate(() => { const o = {}; for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if(k.indexOf('batcave-') === 0) o[k] = JSON.parse(localStorage.getItem(k)); } return o; });
  await s.fr.evaluate(() => { document.querySelector('.nav-btn[data-page="budget"]').click(); document.getElementById('tx-date').value = '2027-02-10'; document.getElementById('tx-montant').value = '33'; document.getElementById('tx-add').click(); });
  ok(await s.fr.evaluate(() => JSON.parse(window.__bcLire('batcave-transactions')).some(t => t.montant === 33)), 'une dépense de février ajoutée après la sauvegarde');
  const fichier = '/tmp/chaos-sauvegarde.json'; (await import('fs')).writeFileSync(fichier, JSON.stringify(sauvegarde));
  await s.page.frameLocator('#f').locator('#backup-file').setInputFiles(fichier);
  await s.page.waitForTimeout(500);
  await s.fr.evaluate(() => { const b = document.getElementById('ask-ok'); if(b && !document.getElementById('ask-overlay').hidden) b.click(); });
  await s.page.waitForTimeout(1500);
  s.fr = await s.charger();
  const reste = await s.fr.evaluate(() => JSON.parse(window.__bcLire('batcave-transactions')).some(t => t.montant === 33));
  ok(!reste, 'après restauration, la dépense de février (absente de la sauvegarde) a disparu');
  ok(!s.erreurs.length, 'aucune erreur JS' + (s.erreurs.length ? ' · ' + s.erreurs[0] : ''));
  await s.ctx.close();
}

console.log('\n== 10) Totaux et séries de plus de 13 mois : repliés, rien de perdu ==');
{
  const g = {'batcave-revision': [], 'batcave-projets': [], 'batcave-sport-log': []};
  for(let d = 1; d <= 10; d++){
    const iso = '2026-10-' + String(d).padStart(2, '0');
    g['batcave-revision'].push({id: 'r' + d, date: iso, duree: 120, matieres: {'Biología': 90, 'Histología': 30}});
    g['batcave-projets'].push({id: 'pe' + d, date: iso, projet: 'Español · gramática', duree: 30});
    g['batcave-projets'].push({id: 'pd' + d, date: iso, projet: 'Projet Dentaire', duree: 20});
    if(d % 2) g['batcave-sport-log'].push({id: 'l' + d, date: iso, type: 'Haut lourd', exo: 'Tractions', series: [5 + d, 5 + d, 4 + d], charge: d > 5 ? 2.5 : 0, unite: 'reps'});
  }
  const s = await ouvrir('2027-12-01', '10:00', g);
  const r = await s.fr.evaluate(() => {
    const res = JSON.parse(localStorage.getItem('batcave-resume-2026') || 'null');
    const log = JSON.parse(window.__bcLire('batcave-sport-log') || '[]').filter(l => l.exo === 'Tractions');
    return {j: res && res.j['2026-10-05'], m: res && res.m['2026-10'], p: res && res.p['2026-10'], rev: JSON.parse(window.__bcLire('batcave-revision') || '[]').filter(x => x.date < '2026-11').length,
      es: window.__bcMinutesEspanol('2026-10-05'), log, stats: (document.getElementById('rev-stats') || {innerText: ''}).innerText};
  });
  ok(r.j && r.j.join(',') === '120,50,30', 'le 5 octobre 2026 tient en une ligne : 120 min de révision, 50 de projets, 30 d’espagnol');
  ok(r.m && r.m['Biología'] === 900 && r.m['Histología'] === 300 && r.p['Español · gramática'] === 300, 'le mois garde ses totaux par matière et par projet');
  ok(r.rev === 0, 'les lignes du jour ont quitté la liste');
  ok(r.es === 30, 'l’espagnol de ce jour se lit encore (30 min)');
  ok(r.log.length === 1 && r.log[0].pli && r.log[0].n === 5 && r.log[0].series.join(' ') === '14 14 13' && r.log[0].charge === 2.5, 'Tractions d’octobre : une ligne, la meilleure série (14 14 13), charge max 2,5 kg, 5 séances');
  ok(/record 10/.test(r.stats.replace(/\s+/g, ' ')), 'le record de série compte encore ces dix jours (« ' + r.stats.replace(/\s+/g, ' ').slice(0, 40) + ' »)');
  s.fr = await s.charger();
  const j2 = await s.fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-resume-2026')).j['2026-10-05'].join(','));
  ok(j2 === '120,50,30', 'un second passage ne recompte rien');
  ok(!s.erreurs.length, 'aucune erreur JS' + (s.erreurs.length ? ' · ' + s.erreurs[0] : ''));
  await s.ctx.close();
}

await browser.close();
console.log('\n' + total + ' vérifications · ' + (defauts ? defauts + ' DÉFAUT(S)' : 'RIEN À SIGNALER'));
process.exit(defauts ? 1 : 0);
