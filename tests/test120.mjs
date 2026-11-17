/* 14 novembre au soir, sa demande : « tu peux pas mettre tout ce que je dois faire precisement dans la batcave, comme ca
   j'evite de devoir toucher a d'autres artefacts et tout est centralise. au jour le jour ». L'onglet « Ma journee » :
   le pas a pas du guide « Ta semaine », embarque jour par jour (#journees-guide), la ligne en cours, le passe replie,
   les cases du jour cochables ici meme, et la grille vivante quand celle du jour a change depuis l'ecriture. */
import { chromium } from 'playwright';
const URL = process.env.BC_HOST || 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local, vue){
  const ctx = await browser.newContext({ viewport: vue || {width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { try{ if(sessionStorage.getItem('__amorce')) return; sessionStorage.setItem('__amorce','1'); }catch(e){} Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelectorAll('.overlay').forEach(o => { o.hidden = true; }); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const ouvrirOnglet = fr => fr.evaluate(() => document.querySelector('.nav-btn[data-page="journee"]').click());
const lignes = (fr, sel) => fr.evaluate(sel => [...document.querySelectorAll('#mj-fil > li' + (sel || ''))].map(li => li.dataset.t + ' ' + li.querySelector('.mj-quoi > b').textContent), sel);
/* SES quatre echeances de la semaine du 16 (sa sauvegarde) : la veille de chacune, le bloc du soir devient sa preparation */
const ECHEANCES = [
  {id:'e1790127615851', date:'2026-11-17', heure:'15:30', type:'presentation', matiere:'Biología Celular y Genética Humana', label:'Exposiciones Orales', fait:false},
  {id:'e1790127635201', date:'2026-11-18', heure:'15:30', type:'tp', matiere:'Biología Celular y Genética Humana', label:'Práctica 5', fait:false},
  {id:'e1790125975768', date:'2026-11-19', heure:'17:30', type:'tp', matiere:'Anatomia 1', label:'Práctica 2. Sistema nervioso', fait:false},
  {id:'e1790127353435', date:'2026-11-20', heure:'17:30', type:'activite', matiere:'ANTROPOLOGÍA DENTAL E HISTORIA DE LA ODONTOLOGÍA', label:'Actividad 4', fait:false}
];

console.log('\n== 1) Un onglet de plus, juste après le tableau de bord ; 2 l\'ouvre, 0 ouvre le dixième ==');
{
  const { ctx, fr } = await ouvrir('2026-11-16T10:00:00+01:00', {'batcave-echeances': ECHEANCES});
  const v = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(b => !b.hidden).map(b => b.dataset.page));
  ok(v.length === 10 && v[0] === 'dashboard' && v[1] === 'journee', 'dix onglets, « Ma journée » en deuxième : ' + v.join(' '));
  ok(await fr.evaluate(() => /Ma journée/.test(document.querySelector('.nav-btn[data-page="journee"]').textContent)), 'le bouton s\'appelle « Ma journée »');
  const clav = await fr.evaluate(() => {
    const t = k => { document.dispatchEvent(new KeyboardEvent('keydown', {key:k, bubbles:true}));
                     return [...document.querySelectorAll('.page.active')].map(s => s.dataset.page)[0]; };
    return [t('2'), t('0'), t('1')];
  });
  ok(clav.join(' → ') === 'journee → repas → dashboard', 'les touches 2, 0 et 1 : ' + clav.join(' → '));
  await ctx.close();
}

console.log('\n== 2) Lundi 16 à 10:00, jour 1 : la ligne en cours, la carte « Maintenant », le passé replié ==');
{
  const { ctx, fr } = await ouvrir('2026-11-16T10:00:00+01:00', {'batcave-echeances': ECHEANCES});
  await ouvrirOnglet(fr);
  await fr.waitForTimeout(200);
  const r = await fr.evaluate(() => ({
    titre: document.getElementById('mj-titre').textContent, sous: document.getElementById('mj-sous').textContent,
    carte: document.getElementById('mj-maintenant').innerText, pomo: !!document.querySelector('#mj-maintenant [data-mj-pomodoro]'),
    notes: [...document.querySelectorAll('#mj-notes li')].map(li => li.textContent),
    prieres: [...document.querySelectorAll('.mj-prieres li')].map(li => li.textContent),
    alerte: !!document.querySelector('.mj-alerte'),
    reveil: document.querySelector('#mj-fil > li[data-t="05:20"]').className,
    espagnol: document.querySelector('#mj-fil > li[data-t="14:00"].mj-k-esp').className,
    pasVisibles: [...document.querySelectorAll('#mj-fil > li[data-t="05:20"] .mj-pas')].some(o => o.offsetParent !== null)
  }));
  ok(r.titre === 'Ma journée' && /^Lundi 16 novembre · Révisions : 3 h 35 dans la journée/.test(r.sous), 'le titre et la date : ' + r.sous);
  const now = await lignes(fr, '.now');
  /* 15 novembre : un bloc d'étude = une ligne, avec sa consigne (avant : « Révisions · 1 h 05 », sans rien dedans) */
  ok(now.join(' | ') === '09:00 Étudier en avance', 'la ligne en cours : ' + now.join(' | '));
  ok(/Maintenant · 09:00 → 10:05/.test(r.carte) && /ensuite 10:05 · Collation avant le JJB/.test(r.carte), 'la carte « Maintenant » dit le bloc et le suivant');
  ok(r.pomo, 'un bloc de révision : le bouton du Pomodoro est dans la carte');
  ok(/^Jour 1 : tout commence ce matin, réveil 05:20\. D’abord la copie vierge/.test(r.notes[0]) && r.notes.some(n => /^La salle à 07:00/.test(n)), 'les rappels du jour (' + r.notes.length + ')');
  ok(r.prieres.length === 5 && /^Fajr 06:13/.test(r.prieres[0]), 'les cinq prières : ' + r.prieres.join(', '));
  ok(!r.alerte, 'la grille du jour est celle du pas à pas : aucune alerte');
  ok(/\bpast\b/.test(r.reveil) && /\breplie\b/.test(r.reveil) && !r.pasVisibles, 'le réveil est passé, ses étapes repliées');
  ok(!/\bpast\b|\breplie\b/.test(r.espagnol), 'l\'espagnol de 14:00 garde son détail');
  await fr.evaluate(() => document.querySelector('#mj-fil > li[data-t="05:20"] .mj-quoi > b').click());
  const ouvert = await fr.evaluate(() => { const li = document.querySelector('#mj-fil > li[data-t="05:20"]'); return { c: li.className, n: li.querySelectorAll('.mj-pas li').length, vis: li.querySelector('.mj-pas').offsetParent !== null }; });
  ok(/\bouvert\b/.test(ouvert.c) && ouvert.vis && ouvert.n === 4, 'un toucher rouvre ses ' + ouvert.n + ' étapes');
  await fr.evaluate(() => document.querySelector('#mj-fil > li[data-t="05:20"] .mj-quoi > b').click());
  ok(await fr.evaluate(() => /\breplie\b/.test(document.querySelector('#mj-fil > li[data-t="05:20"]').className)), 'un second toucher les replie');
  /* la vue resserree : tout se replie, sauf la ligne en cours */
  await fr.evaluate(() => document.getElementById('mj-compact').click());
  const cp = await fr.evaluate(() => ({ esp: document.querySelector('#mj-fil > li[data-t="14:00"].mj-k-esp').className, now: document.querySelector('#mj-fil > li.now').className, b: document.getElementById('mj-compact').textContent }));
  ok(/\breplie\b/.test(cp.esp) && !/\breplie\b/.test(cp.now) && cp.b === 'Afficher les détails', '« Masquer les détails » replie tout sauf la ligne en cours');
  await fr.evaluate(() => document.getElementById('mj-compact').click());
  /* l'horloge avance : la ligne en cours suit */
  await fr.evaluate(() => window.__bcJournee.rendre());
  await ctx.close();
}
{
  const { ctx, page, fr } = await ouvrir('2026-11-16T11:25:00+01:00', {'batcave-echeances': ECHEANCES});
  await ouvrirOnglet(fr);
  await fr.waitForTimeout(200);
  ok((await lignes(fr, '.now')).join(' | ') === '10:30 JJB, jusqu’à 12:00', 'à 11:25, c\'est le JJB (' + (await lignes(fr, '.now')).join(' | ') + ')');
  ok(await fr.evaluate(() => /Maintenant · 10:30 → 12:00/.test(document.getElementById('mj-maintenant').innerText) && !document.querySelector('#mj-maintenant [data-mj-pomodoro]')), 'sans fin écrite, la carte la prend à la ligne suivante : 10:30 → 12:00, et pas de Pomodoro au JJB');
  await page.clock.runFor(60 * 60 * 1000);
  await fr.waitForTimeout(100);
  ok((await lignes(fr, '.now')).join(' | ') === '12:20 Déjeuner', 'une heure plus tard, sans recharger : le déjeuner (' + (await lignes(fr, '.now')).join(' | ') + ')');
  ok(await fr.evaluate(() => /Maintenant · 12:20/.test(document.getElementById('mj-maintenant').innerText) && !document.querySelector('#mj-maintenant [data-mj-pomodoro]')), 'la carte suit, sans Pomodoro pour un repas');
  await ctx.close();
}

console.log('\n== 3) Les cases du jour se cochent ici, et seulement ici (17 novembre) ==');
{
  const { ctx, fr } = await ouvrir('2026-11-16T10:00:00+01:00', {'batcave-echeances': ECHEANCES});
  const avant = await fr.evaluate(() => document.getElementById('leg-hab').textContent);
  await ouvrirOnglet(fr);
  await fr.waitForTimeout(200);
  /* 17 novembre, sa décision : tout se coche ici -- ses habitudes, puis la routine dans sa propre liste */
  const n = await fr.evaluate(() => ({ cases: document.querySelectorAll('#mj-cases input[data-mj-hab]').length, dues: window.__bcHabitsDuJour(1, '2026-11-16').filter(h => !h.sansCase).length,
                                        routine: document.querySelectorAll('#mj-routine input[data-mj-hab]').length, duesR: window.__bcHabitsDuJour(1, '2026-11-16').filter(h => h.sansCase).length }));
  ok(n.cases === n.dues && n.cases > 10 && n.routine === n.duesR && n.routine > 0, 'une case par habitude due aujourd\'hui, et la routine aussi, dans sa liste (' + n.cases + ' + ' + n.routine + ')');
  await fr.evaluate(() => document.querySelector('#mj-cases input[data-mj-hab="core-etirements"]').click());
  await fr.waitForTimeout(150);
  const r = await fr.evaluate(() => ({ compte: document.getElementById('mj-cases-compte').textContent, fait: document.querySelector('#mj-cases input[data-mj-hab="core-etirements"]').closest('li').className,
                                        dash: document.getElementById('leg-hab').textContent,
                                        log: (JSON.parse(localStorage.getItem('batcave-habitlog') || '{}')['core-etirements'] || []).indexOf('2026-11-16') > -1 }));
  ok(/^1 \//.test(r.compte) && /fait/.test(r.fait), 'cochée ici : ' + r.compte);
  ok(r.log && r.dash !== avant, 'l\'anneau « ma journée » du tableau de bord suit (' + avant + ' → ' + r.dash + ')');
  await fr.evaluate(() => document.querySelector('#mj-cases input[data-mj-hab="core-etirements"]').click());
  await fr.waitForTimeout(150);
  ok(await fr.evaluate(() => (JSON.parse(localStorage.getItem('batcave-habitlog') || '{}')['core-etirements'] || []).indexOf('2026-11-16') < 0 && /^0 \//.test(document.getElementById('mj-cases-compte').textContent)), 'décochée ici, décochée partout');
  await ctx.close();
}

console.log('\n== 4) Hier, demain : la journée d\'un autre jour, sans « maintenant » ; hors du guide, la grille de la Batcave ==');
{
  const { ctx, fr } = await ouvrir('2026-11-16T10:00:00+01:00', {'batcave-echeances': ECHEANCES});
  await ouvrirOnglet(fr);
  await fr.evaluate(() => document.getElementById('mj-suiv').click());
  await fr.waitForTimeout(150);
  const d = await fr.evaluate(() => ({ titre: document.getElementById('mj-titre').textContent, sous: document.getElementById('mj-sous').textContent,
    carte: !!document.getElementById('mj-maintenant'), now: document.querySelectorAll('#mj-fil > li.now, #mj-fil > li.past').length,
    cases: document.querySelectorAll('#mj-cases input').length, puces: document.querySelectorAll('#mj-cases .mj-puces li').length,
    prec: document.getElementById('mj-prec').textContent, suiv: document.getElementById('mj-suiv').textContent,
    auj: document.getElementById('mj-auj').classList.contains('btn-primary'),
    batch: [...document.querySelectorAll('#mj-fil > li')].some(li => /seconde session de batch/.test(li.textContent)) }));
  ok(d.titre === 'Mardi 17 novembre' && /^Demain · /.test(d.sous), 'demain : ' + d.titre + ' — ' + d.sous);
  ok(!d.carte && d.now === 0, 'pas de « maintenant », rien de passé');
  ok(d.cases === 0 && d.puces > 5, 'les cases de ce jour-là, à cocher le jour même (' + d.puces + ')');
  ok(d.prec === '‹ Veille' && d.suiv === 'Lendemain ›' && d.auj, 'les boutons se disent par rapport au jour affiché, et « Aujourd\'hui » ramène');
  ok(d.batch, 'mardi : la seconde session de batch est dans la journée');
  await fr.evaluate(() => document.getElementById('mj-auj').click());
  ok(await fr.evaluate(() => document.getElementById('mj-titre').textContent === 'Ma journée' && !!document.getElementById('mj-maintenant')), '« Aujourd\'hui » revient au lundi 16');
  await fr.evaluate(() => document.getElementById('mj-prec').click());
  const h = await fr.evaluate(() => ({ titre: document.getElementById('mj-titre').textContent, alerte: (document.querySelector('.mj-alerte.calme') || {}).textContent || '',
    n: document.querySelectorAll('#mj-fil > li').length, grille: window.__bcGrille(window.__bcCle(0), '2026-11-15').length,
    consignes: document.querySelectorAll('#mj-fil > li .mj-quoi p').length,
    matin: [...document.querySelectorAll('#mj-fil > li')].slice(0, 3).map(li => li.dataset.t + ' ' + li.querySelector('.mj-quoi > b').textContent),
    dents: [...document.querySelectorAll('#mj-fil > li')].filter(li => /brossage de dents/i.test(li.querySelector('.mj-quoi > b').textContent)).map(li => li.dataset.t) }));
  ok(h.titre === 'Dimanche 15 novembre' && /Le pas à pas écrit va du lundi 16 novembre au dimanche 24 janvier/.test(h.alerte), 'hier, la veille du jour 1, hors du guide : ' + h.alerte.slice(0, 70) + '…');
  ok(h.n === h.grille + 3 && h.consignes > 5, 'la grille de la Batcave, bloc par bloc avec sa consigne, plus le réveil, le brossage du matin et celui d\'après le déjeuner (' + h.n + ' lignes, ' + h.consignes + ' consignes)');
  ok(/^05:20 Réveil/.test(h.matin[0]) && h.matin[1] === '05:25 Brossage de dents' && /^05:30 /.test(h.matin[2]), 'le matin hors du guide : ' + h.matin.join(' | '));
  ok(h.dents.length === 3, 'trois brossages dans la journée, comme dans le guide (' + h.dents.join(', ') + ')');
  /* apres le guide : un lundi de fevrier, la grille vivante a aussi ses deux brossages */
  const f = await fr.evaluate(() => { window.__bcJournee.aller('2027-02-01'); return { alerte: (document.querySelector('.mj-alerte.calme') || {}).textContent || '',
    matin: [...document.querySelectorAll('#mj-fil > li')].slice(0, 2).map(li => li.dataset.t + ' ' + li.querySelector('.mj-quoi > b').textContent),
    dents: [...document.querySelectorAll('#mj-fil > li')].filter(li => /brossage de dents/i.test(li.querySelector('.mj-quoi > b').textContent)).map(li => li.dataset.t),
    etapes: [...document.querySelectorAll('#mj-fil > li')][1].querySelectorAll('.mj-pas li').length,
    premier: window.__bcGrille(window.__bcCle(1), '2027-02-01')[0][0] }; });
  ok(/Le pas à pas écrit va du/.test(f.alerte) && f.premier === '05:30' && f.matin.join(' | ') === '05:20 Réveil | 05:25 Brossage de dents' && f.etapes === 2, 'lundi 1er février : ' + f.matin.join(' | ') + ', avant le ' + f.premier + ' (' + f.etapes + ' étapes)');
  ok(f.dents.length === 3, 'et trois brossages (' + f.dents.join(', ') + ')');
  await ctx.close();
}

console.log('\n== 5) La grille a changé depuis l\'écriture : l\'onglet le dit et montre la grille vivante ==');
{
  /* sans ses echeances, le lundi 16 de la Batcave garde « Clore le cours du jour » ; le pas a pas, ecrit avec, prepare l'expose */
  const { ctx, fr } = await ouvrir('2026-11-15T21:00:00+01:00');
  await ouvrirOnglet(fr);
  await fr.evaluate(() => window.__bcJournee.aller('2026-11-16'));
  await fr.waitForTimeout(150);
  const a = await fr.evaluate(() => ({ alerte: (document.querySelector('.mj-alerte:not(.calme)') || {}).textContent || '' }));
  ok(/La grille de ce jour a changé dans la Batcave/.test(a.alerte), 'l\'alerte : « La grille de ce jour a changé… »');
  let l = await lignes(fr);
  ok(l.includes('20:25 Clore le cours du jour') && !l.some(x => /Préparer/.test(x)), 'la grille vivante : 20:25 Clore le cours du jour');
  await fr.evaluate(() => document.querySelector('[data-mj-origine]').click());
  l = await lignes(fr);
  ok(l.includes('20:25 Préparer · Biología Celular y Genética Humana · Exposiciones Orales') && await fr.evaluate(() => /Tu regardes le pas à pas tel qu’il a été écrit/.test(document.querySelector('.mj-alerte').textContent)),
     'le pas à pas écrit reste consultable, et le dit');
  await ctx.close();
}
{
  /* avec ses echeances : la Batcave et le pas a pas disent la meme chose, et le soir passe par la preparation */
  const { ctx, fr } = await ouvrir('2026-11-15T21:00:00+01:00', {'batcave-echeances': ECHEANCES});
  await ouvrirOnglet(fr);
  const r = await fr.evaluate(() => ['2026-11-16','2026-11-17','2026-11-18','2026-11-19'].map(iso => { window.__bcJournee.aller(iso); return { iso, alerte: !!document.querySelector('.mj-alerte'),
    prep: [...document.querySelectorAll('#mj-fil > li')].map(li => li.dataset.t + ' ' + li.querySelector('.mj-quoi > b').textContent).filter(x => /Préparer|Prépare demain|prépare demain/.test(x)),
    note: [...document.querySelectorAll('#mj-notes li')].map(li => li.textContent).filter(n => /^Ce soir à/.test(n))[0] || '' }; }));
  ok(r.every(x => !x.alerte), 'avec ses échéances, aucune alerte du 16 au 19');
  ok(r[0].prep.join(' | ') === '20:25 Préparer · Biología Celular y Genética Humana · Exposiciones Orales | 20:45 Prépare demain', 'lundi 16 : ' + r[0].prep.join(' | '));
  ok(r[0].note === 'Ce soir à 20:25 : prépare « Exposiciones Orales » (Biología Celular y Genética Humana) pour demain, à la place de la clôture du cours.', 'et le rappel du jour le dit');
  ok(r[1].prep[0] === '18:30 Préparer · Biología Celular y Genética Humana · Práctica 5' && /^20:25 Préparer · Anatomia 1/.test(r[2].prep[0]) && /^20:25 Préparer · ANTROPOLOGÍA/.test(r[3].prep[0]),
     'mardi, mercredi, jeudi : la Práctica 5, la Práctica 2, l\'Actividad 4');
  await ctx.close();
}

console.log('\n== 6) Le guide embarqué : du lundi 16 novembre au dimanche 24 janvier, chaque jour avec sa grille d\'origine ==');
{
  const { ctx, fr } = await ouvrir('2026-11-16T10:00:00+01:00', {'batcave-echeances': ECHEANCES});
  const g = await fr.evaluate(() => { const G = window.__bcJournee.guide(); return { n: G.isos.length, premier: G.isos[0], dernier: G.isos[G.isos.length - 1],
    sansSig: G.isos.filter(i => !G.parIso[i].jour.sig).length, minLignes: Math.min(...G.isos.map(i => G.parIso[i].jour.rows.length)),
    identiques: ['2026-11-20','2026-11-21','2026-11-22','2026-11-26','2026-11-27'].filter(i => G.parIso[i].jour.sig === window.__bcJournee.signature(i)).length,
    mois: G.mois.length, rare: G.plusRare.length }; });
  ok(g.n === 70 && g.premier === '2026-11-16' && g.dernier === '2027-01-24', '70 jours, du lundi ' + g.premier + ' au ' + g.dernier);
  ok(g.sansSig === 0 && g.minLignes >= 20, 'chacun avec sa grille d\'origine et au moins ' + g.minLignes + ' lignes');
  ok(g.identiques === 5, 'les jours sans échéance ont la même grille qu\'une Batcave neuve (' + g.identiques + '/5)');
  ok(g.mois >= 4 && g.rare >= 3, 'une fois par mois (' + g.mois + '), plus rarement (' + g.rare + ')');
  ok(await fr.evaluate(() => /un dimanche sur quatre/.test(window.__bcJournee.guide().mois.join(' '))), 'le rideau de douche est dans « une fois par mois »');
  /* 15 novembre : trois brossages chaque jour, celui de midi juste après le déjeuner ; chaque bloc d'étude a sa ligne et sa consigne */
  const b3 = await fr.evaluate(() => { const G = window.__bcJournee.guide(); const out = {jours: 0, trois: 0, apresDej: 0, etudeVide: 0, etudes: 0, fusion: 0};
    G.isos.forEach(i => { const rows = G.parIso[i].jour.rows; out.jours++;
      const d = rows.filter(r => /brossage de dents/i.test(r.titre)); if(d.length === 3) out.trois++;
      /* a l'heure ou le dejeuner finit dans la grille (le bloc qui le suit) : 12:40, 13:10, 13:15 le vendredi, 17:00 un jour d'examen */
      const sig = G.parIso[i].jour.sig.split('|'), kd = sig.findIndex(x => / Déjeuner$/.test(x));
      if(kd > -1 && sig[kd + 1] && d.some(r => r.titre === 'Brossage de dents' && r.t === sig[kd + 1].slice(0, 5))) out.apresDej++;
      rows.filter(r => r.k === 'etude').forEach(r => { out.etudes++; if(!(r.d || (r.pas && r.pas.length))) out.etudeVide++; if(/^Révisions · /.test(r.titre)) out.fusion++; }); });
    return out; });
  ok(b3.trois === b3.jours && b3.apresDej === b3.jours, 'trois brossages par jour, celui de midi à la fin du déjeuner (' + b3.trois + ' et ' + b3.apresDej + ' sur ' + b3.jours + ')');
  ok(b3.etudes > 300 && b3.etudeVide === 0 && b3.fusion === 0, 'chaque bloc d\'étude a sa ligne et sa consigne (' + b3.etudes + ' lignes, ' + b3.etudeVide + ' vides, ' + b3.fusion + ' fondues)');
  await ctx.close();
}

console.log('\n== 7) Téléphone : l\'heure en marge, rien ne déborde ; le Pomodoro de la carte ouvre le lanceur ==');
{
  const { ctx, fr } = await ouvrir('2026-11-16T10:00:00+01:00', {'batcave-echeances': ECHEANCES}, {width:390, height:844});
  await ouvrirOnglet(fr);
  await fr.waitForTimeout(200);
  const r = await fr.evaluate(() => {
    const li = document.querySelector('#mj-fil > li'), h = li.querySelector('.mj-h').getBoundingClientRect(), q = li.querySelector('.mj-quoi').getBoundingClientRect(), b = li.getBoundingClientRect();
    return { large: document.documentElement.scrollWidth, h: h.left - b.left, q: Math.round(q.width), cols: getComputedStyle(document.querySelector('.mj-hab')).gridTemplateColumns.split(' ').length };
  });
  ok(r.large <= 390, 'aucun débordement horizontal (' + r.large + ' px)');
  ok(r.h >= 0 && r.q > 200, 'l\'heure dans sa marge, le texte sur toute la largeur (' + r.q + ' px)');
  ok(r.cols === 2, 'les cases du jour sur deux colonnes');
  await fr.evaluate(() => document.querySelector('[data-mj-pomodoro]').click());
  await fr.waitForTimeout(250);
  ok(await fr.evaluate(() => [...document.querySelectorAll('.overlay')].some(o => !o.hidden)), 'le bouton 🍅 ouvre le lanceur du Pomodoro');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
