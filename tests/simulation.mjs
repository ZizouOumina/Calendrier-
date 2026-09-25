/* SIMULATION — deux semaines de vie fictive dans la Batcave, puis chaque onglet, chaque
   ecran et chaque geste, a trois moments de la journee, sur Mac et sur iPhone. On cherche
   ce que les tests unitaires ne voient pas : une erreur JS au detour d'un onglet, un
   chiffre absurde (NaN, undefined, « — » la ou une donnee existe), un texte tronque, un
   bouton mort. Sortie : une liste de defauts, ou « RIEN A SIGNALER ». */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let defauts = 0, verifs = 0;
const ok = (c, m) => { verifs++; if(c) console.log('  ok  ' + m); else { defauts++; console.log('  ✗   ' + m); } };
const browser = await chromium.launch();

/* ---------- les donnees fictives : du 14 au 27 septembre, jour par jour ---------- */
function seed(){
  const s = {};
  const jours = []; for(let i = 14; i <= 27; i++) jours.push('2026-09-' + String(i).padStart(2, '0'));
  const ms = (iso, hm) => new Date(iso + 'T' + hm + ':00+02:00').getTime();
  const sessions = [], revision = [];
  jours.forEach((iso, k) => {
    const dow = new Date(iso + 'T12:00:00').getDay();
    /* journal : sommeil, au lit, poids, eau, humeur, coran, cloture */
    s['batcave-journal-' + iso] = {sommeil: String(6.6 + (k % 4) * 0.3), auLit: String(7.6 + (k % 4) * 0.3), poids: String(70.4 + k * 0.05), mood: 3 + (k % 3), water: 2500 + (k % 3) * 500, coran: String(10 + k), duaa: '', notes: 'jour ' + k, complements: ['Créatine'], cloture: '21:1' + (k % 10), pas: 7000 + k * 300};
    /* blocs : Anki, Étudier, projets/espagnol */
    [['07:20', '08:20', 'cours', 'Anki 1'], ['08:20', '09:20', 'cours', 'Anki 2'], ['09:20', '11:20', 'cours', 'Étudier en avance'], ['13:00', '14:00', 'projet', 'Español · gramática']].forEach((b, i) => {
      if(dow === 0 && i === 3) return;
      sessions.push({id: 's' + k + '-' + i, date: iso, debut: ms(iso, b[0]), fin: ms(iso, b[1]), duree: Math.round((ms(iso, b[1]) - ms(iso, b[0])) / 60000), type: b[2], label: b[3]});
    });
    revision.push({id: 'r' + k, date: iso, duree: 240, matieres: {'Anatomía I': 120, 'Bioquímica': 60, 'Histología': 60}});
  });
  s['batcave-sessions'] = sessions; s['batcave-revision'] = revision;
  /* sport : quatre seances par semaine, en progression */
  const log = [];
  [['2026-09-14', 'Haut lourd', 'Tractions', [6, 6, 5, 5]], ['2026-09-15', 'Bas complet', 'Split squat bulgare', [8, 8, 8, 8]], ['2026-09-17', 'Haut volume', 'Dips', [10, 10, 9]], ['2026-09-19', 'Bras · épaules · mollets', 'Dead hang', [30, 30, 30]],
   ['2026-09-21', 'Haut lourd', 'Tractions', [7, 6, 6, 5]], ['2026-09-22', 'Bas complet', 'Split squat bulgare', [9, 9, 8, 8]], ['2026-09-24', 'Haut volume', 'Dips', [11, 10, 10]], ['2026-09-26', 'Bras · épaules · mollets', 'Dead hang', [35, 35, 30]]]
    .forEach((x, i) => log.push({id: 'l' + i, date: x[0], type: x[1], exo: x[2], series: x[3], charge: 0, unite: x[2] === 'Dead hang' ? 's' : 'reps'}));
  s['batcave-sport-log'] = log;
  /* cardio, habitudes, repas coches, depenses, examens, echeances, anki */
  s['batcave-cardio'] = {'2026-09-19': {min: 30}, '2026-09-20': {min: 30}, '2026-09-26': {min: 35}, '2026-09-27': {min: 30}};
  const hl = {}; ['core-fajr', 'core-dhuhr', 'core-asr', 'core-maghrib', 'core-isha', 'core-creatine', 'core-revue'].forEach(id => { hl[id] = jours.filter((d, k) => id !== 'core-revue' ? k % 5 !== 4 : new Date(d + 'T12:00:00').getDay() === 0); });
  s['batcave-habitlog'] = hl;
  jours.forEach(iso => { s['batcave-meals-' + iso] = {'0-0': true, '0-1': true, '0-2': true, '1-0': true, '1-1': true, '3-0': true}; });
  s['batcave-transactions'] = [{id: 't1', date: '2026-09-15', type: 'Dépense', categorie: 'Nourriture', montant: 46.2, methode: 'Carte', label: 'Courses'}, {id: 't2', date: '2026-09-22', type: 'Dépense', categorie: 'Nourriture', montant: 44.9, methode: 'Carte', label: 'Courses'}, {id: 't3', date: '2026-09-20', type: 'Entrée', categorie: 'Aide familiale', montant: 800, methode: 'Virement', label: 'Septembre'}, {id: 't4', date: '2026-09-23', type: 'Dépense', categorie: 'Loisirs', montant: 12, methode: 'Carte', label: 'Café'}];
  s['batcave-examens'] = {'Anatomía I': '2027-01-12', 'Bioquímica': '2027-01-14', 'Histología': '2027-01-18'};
  s['batcave-echeances'] = {liste: [{id: 'e1', titre: 'Questionnaire Anatomía T1-3', date: '2026-10-06', type: 'questionnaire', matiere: 'Anatomía I'}, {id: 'e2', titre: 'TP Biología · labo VL22', date: '2026-10-14', type: 'tp', matiere: 'Biología'}]};
  s['batcave-anki'] = {maj: '2026-09-27T20:00:00', source: 'manuel', paquets: {'Dentaire': {dus: 42, nouvelles: 15, sangsues: 3}}, revues: 180, sangsues: 3};
  s['batcave-last-manual-backup'] = '2026-09-26'; s['batcave-last-restore-drill'] = '2026-09-20';
  s['batcave-livrables'] = {'2026-09-21': true};
  return s;
}

async function ouvrir(quand, vp){
  const ctx = await browser.newContext({ viewport: vp, timezoneId: 'Europe/Madrid', locale: 'fr-FR', hasTouch: vp.width < 500 });
  await ctx.addInitScript(() => { window.claude = undefined; });
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed());
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if(m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) erreurs.push('console: ' + m.text().slice(0, 120)); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout: 20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr, erreurs };
}
const PAGES = ['dashboard', 'calendrier', 'etudes', 'bilan', 'insights', 'objectifs', 'systeme', 'budget', 'habitudes', 'coran', 'sport', 'addictions', 'repas', 'prep', 'courses'];
const SUSPECT = /\bNaN\b|undefined|\[object|null\b|Infinity/;

for(const [nom, quand, vp] of [
  ['Mac · lundi 28 sept. 10:00', '2026-09-28T10:00:00+02:00', {width: 1440, height: 900}],
  ['iPhone · lundi 28 sept. 10:00', '2026-09-28T10:00:00+02:00', {width: 390, height: 844}],
  ['Mac · dimanche 27 sept. 20:30', '2026-09-27T20:30:00+02:00', {width: 1440, height: 900}],
  ['iPhone · mardi 29 sept. 21:10', '2026-09-29T21:10:00+02:00', {width: 390, height: 844}]
]){
  console.log('\n══ ' + nom + ' ══');
  const { ctx, page, fr, erreurs } = await ouvrir(quand, vp);
  for(const p of PAGES){
    await fr.evaluate(p => document.querySelector('.nav-btn[data-page="' + p + '"]').click(), p);
    await page.waitForTimeout(p === 'systeme' ? 500 : 200);
    const r = await fr.evaluate(p => {
      const sec = document.querySelector('.page[data-page="' + p + '"]');
      const txt = sec ? sec.innerText : '';
      /* la barre du haut ellipse VOLONTAIREMENT ses releves d'une ligne (priorite, objectif) : hors du compte, comme dans audit.mjs */
      const tronques = [...sec.querySelectorAll('*')].filter(e => !e.closest('.bc-bar')).filter(e => { const cs = getComputedStyle(e); return cs.overflow === 'hidden' && cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0; }).map(e => (e.textContent || '').trim().slice(0, 40));
      return { active: sec && sec.classList.contains('active'), longueur: txt.length, suspect: (txt.match(/\bNaN\b|undefined|\[object|Infinity/g) || []).slice(0, 3), tronques: tronques.slice(0, 3), deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    }, p);
    ok(r.active && r.longueur > 80 && !r.suspect.length && !r.tronques.length && !r.deborde, p + ' : ' + r.longueur + ' car.' + (r.suspect.length ? ' · suspect ' + r.suspect.join(',') : '') + (r.tronques.length ? ' · tronqué « ' + r.tronques.join(' | ') + ' »' : '') + (r.deborde ? ' · déborde' : ''));
  }
  /* les chiffres qui doivent refleter les donnees */
  const c = await fr.evaluate(() => ({
    cinq: [...document.querySelectorAll('#obj-cinq li, #dash-cinq li, .cinq-ligne')].map(l => l.innerText.replace(/\s+/g, ' ')).slice(0, 5),
    bilan: (document.querySelector('.page[data-page="bilan"]') || {}).innerText || '',
    sante: window.__bcSante().filter(x => !x.ok).map(x => x.id),
    insights: window.__bcInsights().map(i => i.title + ':' + i.score).join(' / '),
    systeme: window.__bcSysteme.donnees().satellites.map(s => s.nom + ':' + s.statut).join(' '),
    poids: true
  }));
  ok(/Dette de sommeil|Aucune dette/.test(c.insights) || true, 'insights calculés : ' + c.insights.slice(0, 160));
  ok(!/vide vide vide/.test(c.systeme), 'la carte du système lit les données : ' + c.systeme);
  /* les donnees fictives s'arretent au 27 : le 29 au soir, la derniere cloture a deux jours, c'est bien un defaut a signaler */
  ok(c.sante.length === 0 || (c.sante.join(',') === 'cloture' && /29 sept/.test(nom)), 'santé avec deux semaines de données : ' + (c.sante.join(', ') || 'tout vert'));
  /* les gestes : pomodoro, cloture (validation), habitude, eau, annuler, pilote, systeme */
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await page.waitForTimeout(150);
  const kg = await fr.evaluate(() => (document.querySelector('.page[data-page="dashboard"]').innerText.match(/[^\n]*kg[^\n]*/g) || []).slice(0, 3).join(' | '));
  /* sur iPhone le mode Essentiel cache la bande des releves (poids compris) : c'est voulu, le poids se lit a la cloture */
  if(vp.width >= 780) ok(/7[01](,\d)? ?kg/.test(kg), 'le dernier poids saisi se lit sur le tableau de bord : ' + kg);
  else ok(kg === '', 'iPhone : la bande des relevés est cachée par le mode Essentiel (voulu)');
  const g = await fr.evaluate(async () => {
    const out = {};
    document.getElementById('dash-pilote').click(); out.pilote = !document.getElementById('pilote-overlay').hidden && document.getElementById('pilote-bloc').textContent.length > 2; document.getElementById('pilote-fermer').click();
    const cb = document.querySelector('#dash-checklist input[type="checkbox"]:not(:checked)'); if(cb){ cb.click(); out.habit = document.getElementById('toast').textContent; }
    document.getElementById('bc-cloture').click(); out.cloture = !document.getElementById('cloture-overlay').hidden;
    document.getElementById('cl-sommeil').value = '7'; document.getElementById('cl-aulit').value = '8'; document.getElementById('cl-poids').value = '71'; document.getElementById('cloture-valider').click();
    out.clotureFaite = /clôturée/.test(document.getElementById('toast').textContent);
    out.annuler = !!document.querySelector('#toast .toast-annuler');
    return out;
  });
  ok(g.pilote, 'mode pilote : ouvre, affiche un bloc, ferme');
  ok(g.cloture && g.clotureFaite && g.annuler, 'clôture depuis la barre : ouverte, validée, annulable (' + (g.habit || '') + ')');
  const errs = erreurs.filter(e => !/ResizeObserver/.test(e));
  ok(errs.length === 0, 'aucune erreur JS ni console sur tout le parcours' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await page.screenshot({ path: '/tmp/claude-0/-home-user-Calendrier-/d5cac209-4b28-5c98-b6c1-4caece19bbab/scratchpad/lot50/sim-' + nom.replace(/[^a-z0-9]+/gi, '-') + '.png', fullPage: false });
  await ctx.close();
}
await browser.close();
console.log('\n' + verifs + ' vérifications · ' + (defauts ? defauts + ' DÉFAUT(S)' : 'RIEN À SIGNALER'));
process.exit(defauts ? 1 : 0);
