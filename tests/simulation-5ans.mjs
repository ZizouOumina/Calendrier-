/* Cinq ans d'usage REEL, jour par jour, du 26 septembre 2026 au 25 septembre 2031.
   Chaque jour : la Batcave est rouverte (comme le matin sur le telephone), puis remplie par
   ses propres fonctions -- habitudes, repas, blocs de travail termines (detail + total),
   seances de sport, combat, cloture du soir (complete le dimanche, avec la revue et
   l'experience) -- ; chaque semaine ou chaque mois : courses et entrees d'argent au Budget,
   echeances ajoutees puis faites, objectifs modifies, ajoutes, supprimes, saison cloturee.
   Un faux cloud applique les vraies limites : 256 Kio par document, 5 000 documents.
   Tous les 30 jours : chaque onglet sur Mac et iPhone (erreurs, NaN, troncature,
   debordement), la sante, la taille locale, les plus gros documents.
   node simulation-5ans.mjs [date de fin ISO]  (defaut 2031-09-25) */
import { chromium } from 'playwright';
import { decalage } from './donnees-fictives.mjs';
const URL = 'http://127.0.0.1:8199/host.html';
const FIN = process.argv[2] || '2031-09-25';
const DEBUT = process.env.DEBUT_SIM || '2026-09-26';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Madrid', locale: 'fr-FR' });
const page = await ctx.newPage();
let defauts = 0, total = 0;
const ok = (c, m) => { total++; if(!c){ defauts++; console.log('  ✗   ' + m); } else if(process.env.VERBEUX) console.log('  ok  ' + m); };
const plusJ = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dow = s => new Date(s + 'T12:00:00').getDay();
const at = (iso, hm) => new Date(iso + 'T' + hm + ':00' + decalage(iso));

/* ----- le faux cloud ----- */
const cloud = new Map(); const viol = []; let plusGros = {id: '', o: 0};
await page.exposeFunction('__nuage', (op, id, body) => {
  if(op === 'all') return [...cloud.entries()].map(([id, b]) => ({id, body: b}));
  if(op === 'del'){ cloud.delete(id); return true; }
  const o = Buffer.byteLength(JSON.stringify(body));
  if(o > plusGros.o) plusGros = {id, o};
  if(o > 262144){ viol.push('256 Kio : ' + id + ' (' + Math.round(o / 1024) + ' Kio)'); throw new Error('invalid_argument'); }
  if(!cloud.has(id) && cloud.size >= 5000){ viol.push('5000 documents : ' + id); throw new Error('quota_exceeded'); }
  cloud.set(id, JSON.parse(JSON.stringify(body)));
  return true;
});
await ctx.addInitScript(() => {
  const db = {
    collection: () => ({ onSnapshot: (cb) => { window.__nuage('all').then(docs => cb({ empty: !docs.length, docs: docs.map(d => ({ id: d.id, data: () => d.body })) })); return () => {}; } }),
    doc: (path) => { const id = String(path).replace(/^state\//, ''); return { set: (b) => window.__nuage('set', id, b), delete: () => window.__nuage('del', id) }; }
  };
  window.claude = { use: (n) => Promise.resolve(n === 'db' ? db : null) };
});
if(process.env.GRAINE){
  const g = JSON.parse((await import('fs')).readFileSync(process.env.GRAINE, 'utf8'));
  Object.keys(g).forEach(k => cloud.set(k, {v: g[k], d: 'autre', t: 1}));
  await ctx.addInitScript(x => { if(!localStorage.getItem('graine-posee')){ localStorage.setItem('graine-posee', '1'); Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); } }, g);
}
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.clock.install({ time: at(DEBUT, '07:00') });

let fr = null;
async function ouvrir(iso, hm){
  await page.clock.setSystemTime(at(iso, hm));
  for(let essai = 0; essai < 3; essai++){
    await page.goto(URL, {timeout: 40000}).catch(() => {});
    try{
      await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 40000 });
      fr = page.frames().find(x => x.url().includes('batcave.html'));
      await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout: 20000}).catch(() => {});
      await page.waitForTimeout(250);   /* l'instantane du cloud, la compaction, un eventuel rechargement */
      fr = page.frames().find(x => x.url().includes('batcave.html'));
      await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout: 20000});
      await fr.evaluate(() => { ['ritual-dismiss', 'ask-cancel', 'pcc-vu'].forEach(id => { const r = document.getElementById(id); if(r && r.offsetParent !== null) r.click(); }); });
      return;
    }catch(e){ await page.waitForTimeout(500); }
  }
  throw new Error('la Batcave ne se charge plus le ' + iso);
}
const evalSur = async (fn, arg) => { try{ return await fr.evaluate(fn, arg); }catch(e){ await page.waitForTimeout(800); fr = page.frames().find(x => x.url().includes('batcave.html')); return await fr.evaluate(fn, arg); } };

async function journee(iso, k){
  await ouvrir(iso, '20:40');
  const j = dow(iso);
  /* la journee : habitudes, repas, travail, sport, combat */
  await evalSur(({iso, k, j}) => {
    document.querySelectorAll('#dash-checklist input[type="checkbox"]:not(:checked)').forEach((c, i) => { if((k + i) % 8 !== 3) c.click(); });
    document.querySelectorAll('[data-meal]:not(:checked)').forEach((c, i) => { if((k + i) % 9 !== 4) c.click(); });
    const mats = ['Anatomía y Fisiología del Cuerpo Humano I', 'Biología', 'Bioquímica', 'Histología', 'Documentación'];
    const blocs = j === 0 ? 3 : 6;
    for(let b = 0; b < blocs; b++){
      if(b === 4) window.__bcReporterTemps(55, {cible: 'projet', projet: 'Español · ' + (k % 2 ? 'gramática' : 'hablar'), startedAt: Date.now() - 55 * 60000});
      else if(b === 5) window.__bcReporterTemps(50, {cible: 'projet', projet: 'Projet Dentaire', startedAt: Date.now() - 50 * 60000});
      else window.__bcReporterTemps(b === 0 ? 25 : 55, {cible: 'cours', matiere: mats[(k + b) % mats.length], startedAt: Date.now() - 55 * 60000});
    }
    const type = window.__bcTypeSport(iso);
    if(type && type !== 'Off'){
      const s = window.__bcSessionsSport().filter(x => x.type === type)[0];
      if(s) s.exercises.forEach((ex, ei) => { if((k + ei) % 11 !== 5) window.__bcEnregistrerSeries(type, ei, ex, (8 + (k % 5)) + ' ' + (8 + (k % 4)) + ' 7', k > 60 ? String(1.25 * Math.floor(k / 60)) : '0', true); });
    }
    try{ window.__bcSortiesCardio(window.__bcSemaineLundi ? window.__bcSemaineLundi : iso).forEach(() => {}); }catch(e){}
    if([1, 2, 3, 5, 6].indexOf(j) > -1 && k % 10 !== 7) window.__bcNoterCardio(iso, j === 6 ? 30 : 90);
  }, {iso, k, j});
  /* argent, echeances, objectifs */
  if(j === 6 || iso.slice(8) === '01' || k % 20 === 5 || k % 45 === 12) await evalSur(({iso, k, j}) => {
    const v = (id, x) => { const e = document.getElementById(id); if(e){ e.value = x; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); } };
    const ajouterTx = (type, cat, montant, label) => { v('tx-date', iso); v('tx-type', type); const sel = document.getElementById('tx-cat'); if(sel){ const o = [...sel.options].find(o => o.value === cat || o.text === cat); if(o) sel.value = o.value; } v('tx-montant', String(montant)); v('tx-label', label); const b = document.getElementById('tx-add'); if(b) b.click(); };
    if(j === 6) ajouterTx('Dépense', 'Nourriture', 42 + (k % 15), 'Courses');
    if(iso.slice(8) === '01') ajouterTx('Entrée', 'Aide familiale', 800, 'Mois');
    if(k % 20 === 5){
      const fait = document.querySelector('[data-echfait]'); if(fait) fait.click();
      const plus = document.getElementById('ech-plus'); if(plus && document.getElementById('ech-form').hidden) plus.click();
      const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + 12);
      v('ech-date', d.toISOString().slice(0, 10)); v('ech-matiere', 'Histología'); v('ech-label', 'Q' + k);
      const b = document.getElementById('ech-add'); if(b) b.click();
    }
    if(k % 45 === 12){
      document.querySelector('.nav-btn[data-page="objectifs"]').click();
      const c = document.querySelector('input.obj-cible, [data-obj-cible]'); if(c){ c.value = String(Number(c.value || 10) + 1); c.dispatchEvent(new Event('change', {bubbles: true})); }
      v('obj-titre', 'Objectif ' + k); const m = document.getElementById('obj-metrique'); if(m && m.options.length) m.value = m.options[k % m.options.length].value; v('obj-cible', String(5 + k % 20));
      const a = document.getElementById('obj-add'); if(a) a.click();
      const del = [...document.querySelectorAll('[data-obj-del]')].pop(); if(del && k % 90 === 57){ del.click(); const okb = document.getElementById('ask-ok'); if(okb && !document.getElementById('ask-overlay').hidden) okb.click(); }
    }
  }, {iso, k, j});
  /* la saison, quand la Batcave la propose */
  await evalSur(() => { const b = document.querySelector('[data-plan-saison]'); if(!b) return false; const s = document.getElementById('saison-cloturer'); if(!s || s.hidden) return false; s.click(); const okb = document.getElementById('ask-ok'); if(okb && !document.getElementById('ask-overlay').hidden) okb.click(); return true; });
  /* la cloture du soir */
  await page.clock.setSystemTime(at(iso, '21:05'));
  const c = await evalSur(({k, j}) => {
    const ov = document.getElementById('cloture-overlay');
    if(ov.hidden) document.getElementById('bc-cloture').click();
    const m = document.querySelector('[data-cl-mode="' + (j === 0 || k % 3 === 0 ? 'complet' : 'court') + '"]'); if(m) m.click();
    const v = (id, x) => { const e = document.getElementById(id); if(e) e.value = x; };
    v('cl-sommeil', String(6.5 + (k % 5) * 0.3)); v('cl-aulit', String(7.6 + (k % 5) * 0.3)); v('cl-poids', (Math.min(74, 64.5 + k * 0.012) + ((k % 3) - 1) * 0.2).toFixed(1));
    v('cl-pas', String(6500 + (k % 9) * 500)); v('cl-coran', String(1 + (k % 604))); v('cl-note', k % 4 === 0 ? 'Journée ' + k + ' — anatomie revue, JJB dur.' : '');
    v('cl-ak-dus', String(30 + k % 40)); v('cl-ak-revues', String(120 + k % 90));
    if(j === 0){ v('cl-rv-marche', 'le matin tient'); v('cl-rv-coince', 'le jeudi soir'); v('cl-rv-ajust', 'coucher 21:30'); v('cl-es-errores', '4'); v('cl-es-oral', '3');
      if(k % 14 < 7){ v('cl-exp-quoi', 'Téléphone dans l’entrée ' + k); const sel = document.getElementById('cl-exp-mesure'); if(sel && sel.options.length) sel.value = sel.options[k % sel.options.length].value; } }
    document.getElementById('cloture-valider').click();
    const fermee = document.getElementById('cloture-overlay').hidden, demain = !document.getElementById('demain-overlay').hidden;
    const d = document.getElementById('demain-ok'); if(d) d.click();
    const t = document.getElementById('toast'); const toast = t ? t.textContent : '';
    return {fermee, demain, toast};
  }, {k, j});
  ok(c.fermee && c.demain, iso + ' : clôture validée puis Demain (' + c.toast.slice(0, 80) + ')');
  ok(!/Stockage plein|NON enregistr/.test(c.toast), iso + ' : le stockage accepte encore l’écriture');
  /* sauvegarde et exercice : ce que ferait l'utilisateur */
  if(k % 3 === 0) await evalSur(iso => { localStorage.setItem('batcave-last-manual-backup', JSON.stringify(iso)); }, iso);
  if(k % 30 === 0) await evalSur(iso => { localStorage.setItem('batcave-last-restore-drill', JSON.stringify(iso)); }, iso);
}

const PAGES = ['dashboard', 'calendrier', 'etudes', 'bilan', 'insights', 'objectifs', 'systeme', 'budget', 'habitudes', 'coran', 'sport', 'addictions', 'repas', 'prep', 'courses'];
async function controle(iso, k){
  await ouvrir(iso, '10:00');
  const avant = Date.now();
  for(const [nom, vp] of [['Mac', {width: 1440, height: 900}], ['iPhone', {width: 390, height: 844}]]){
    await page.setViewportSize(vp);
    for(const p of PAGES){
      const r = await evalSur(p => {
        document.querySelector('.nav-btn[data-page="' + p + '"]').click();
        const sec = document.querySelector('.page[data-page="' + p + '"]'), txt = sec ? sec.innerText : '';
        const tr = []; sec && sec.querySelectorAll('button, .btn, .chip, h1, h2, h3, .tlabel, .tnum, .sub-note').forEach(el => { const cs = getComputedStyle(el); if(cs.overflow === 'hidden' && cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && el.textContent.trim().length > 4 && !el.closest('.bc-bar')) tr.push(el.textContent.trim().slice(0, 30)); });
        return {n: txt.length, s: (txt.match(/\bNaN\b|undefined|\[object|Infinity/g) || []).slice(0, 2), tr: tr.slice(0, 2), deb: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1};
      }, p);
      ok(r.n > 80 && !r.s.length && !r.tr.length && !r.deb, iso + ' · ' + nom + ' · ' + p + (r.s.length ? ' · ' + r.s.join(',') : '') + (r.tr.length ? ' · tronqué ' + r.tr.join('|') : '') + (r.deb ? ' · déborde' : ''));
    }
  }
  await page.setViewportSize({width: 1440, height: 900});
  const e = await evalSur(() => {
    const sante = window.__bcSante();
    const tailles = []; let n = 0;
    for(let i = 0; i < localStorage.length; i++){ const key = localStorage.key(i); const l = (localStorage.getItem(key) || '').length + key.length; n += l; tailles.push([l, key]); }
    tailles.sort((a, b) => b[0] - a[0]);
    const cinq = window.__bcInsights().map(x => x.title + ':' + x.score).slice(0, 4).join(' / ');
    return {defauts: sante.filter(x => !x.ok).map(x => x.id + ' (' + x.texte + ')'), car: n, cles: localStorage.length, gros: tailles.slice(0, 5).map(t => t[1].replace('batcave-', '') + ' ' + Math.round(t[0] / 1024) + 'K').join(', '),
      score: (document.getElementById('dash-score-note') || {}).textContent, serie: (document.getElementById('rev-stats') || {innerText: ''}).innerText.split('\n').slice(0, 3).join(' '), cinq};
  });
  const km = Math.round(e.car / 1024);
  console.log('── ' + iso + ' (jour ' + k + ') · local ' + km + ' Kcar · ' + e.cles + ' clés · cloud ' + cloud.size + ' docs (plus gros ' + plusGros.id.replace('batcave-', '') + ' ' + Math.round(plusGros.o / 1024) + ' Kio) · contrôle ' + Math.round((Date.now() - avant) / 1000) + ' s');
  console.log('     plus grosses clés : ' + e.gros);
  console.log('     score « ' + e.score + ' » · ' + e.serie);
  /* la serie ne perd jamais de jours : la simulation travaille chaque jour */
  const serie = Number(((e.serie || '').match(/Série\s*(\d+)/) || [])[1]);
  if(!isNaN(serie) && controle.prec){ const attendu = controle.prec.serie + (k - controle.prec.k) - 1; ok(serie >= attendu, iso + ' : la série ne perd aucun jour (' + controle.prec.serie + ' → ' + serie + ', au moins ' + attendu + ')'); }
  if(!isNaN(serie)) controle.prec = {serie, k};
  ok(e.car < 2.1 * 1024 * 1024, iso + ' : stockage local sous le seuil d’alerte iPhone (' + km + ' Kcar)');
  ok(!e.defauts.length || e.defauts.every(d => /^exercice|^sauvegarde/.test(d)), iso + ' : santé ' + (e.defauts.join(' · ') || 'verte'));
  ok(!viol.length, iso + ' : aucune limite du cloud franchie' + (viol.length ? ' · ' + viol.slice(-3).join(' | ') : ''));
  ok(!erreurs.length, iso + ' : aucune erreur JS' + (erreurs.length ? ' · ' + erreurs.slice(-2).join(' | ') : ''));
  erreurs.length = 0; viol.length = 0;
}

const t0 = Date.now();
let k = 0;
for(let iso = DEBUT; iso <= FIN; iso = plusJ(iso, 1), k++){
  try{ await journee(iso, k); }
  catch(e){ ok(false, iso + ' : journée interrompue — ' + e.message.slice(0, 200)); }
  if(process.env.CHAQUE_JOUR || k % 30 === 0 || ['2027-01-12', '2027-01-25', '2027-03-15', '2027-06-10', '2028-02-29', '2029-01-01'].indexOf(iso) > -1){
    try{ await controle(iso, k); }catch(e){ ok(false, iso + ' : contrôle interrompu — ' + e.message.slice(0, 200)); }
  }
  if(k % 100 === 0) console.log('   … ' + iso + ' · ' + Math.round((Date.now() - t0) / 60000) + ' min écoulées');
}
await controle(FIN, k);
await browser.close();
console.log('\n' + total + ' vérifications · ' + (defauts ? defauts + ' DÉFAUT(S)' : 'RIEN À SIGNALER'));
process.exit(defauts ? 1 : 0);
