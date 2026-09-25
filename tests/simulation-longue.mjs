/* Simulation longue — six mois de saisies fictives (24 sept. 2026 -> la veille du point de
   controle), puis, au-dela, un journal allege chaque jour jusqu'au point de controle. La
   Batcave est ouverte a dix dates, de decembre 2026 a septembre 2031 : partiels, semestre 2,
   fin du programme (jour 172), six mois (jour 182), ete, deuxieme annee, 29 fevrier, jour de
   l'an, cinq ans. On cherche : erreurs JS, NaN/undefined, troncature, debordement, lenteur,
   donnees trop lourdes, compteurs absurdes, cloture et Demain qui marchent, courbe de poids. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const browser = await chromium.launch();
let defauts = 0, total = 0;
const ok = (c, m) => { total++; console.log((c ? '  ok  ' : '  ✗   ') + m); if(!c) defauts++; };
import { seed, plusJ, decalage, dow } from './donnees-fictives.mjs';
async function ouvrir(quand, vp, graine){
  const ctx = await browser.newContext({ viewport: vp, timezoneId: 'Europe/Madrid', locale: 'fr-FR', hasTouch: vp.width < 500 });
  await ctx.addInitScript(() => { window.claude = undefined; });
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, graine);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if(m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) erreurs.push('console: ' + m.text().slice(0, 140)); });
  await page.clock.install({ time: new Date(quand) });
  const t0 = Date.now();
  await page.goto(URL, {timeout: 30000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 30000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout: 30000}).catch(() => {});
  const chargement = Date.now() - t0;
  await fr.evaluate(() => { ['ritual-dismiss', 'ask-cancel', 'cloture-close', 'pcc-vu'].forEach(id => { const r = document.getElementById(id); if(r && r.offsetParent !== null) r.click(); }); });
  await page.waitForTimeout(300);
  return { ctx, page, fr, erreurs, chargement };
}
const PAGES = ['dashboard', 'calendrier', 'etudes', 'bilan', 'insights', 'objectifs', 'systeme', 'budget', 'habitudes', 'coran', 'sport', 'addictions', 'repas', 'prep', 'courses'];
const SUSPECT = /\bNaN\b|undefined|\[object|Infinity/;

async function tour(page, fr, nom){
  const lents = [];
  for(const p of PAGES){
    const t0 = Date.now();
    await fr.evaluate(p => document.querySelector('.nav-btn[data-page="' + p + '"]').click(), p);
    await page.waitForTimeout(p === 'systeme' ? 400 : 120);
    const dt = Date.now() - t0;
    const r = await fr.evaluate(p => {
      const sec = document.querySelector('.page[data-page="' + p + '"]');
      const txt = sec ? sec.innerText : '';
      const tronques = [];
      sec && sec.querySelectorAll('button, .btn, .chip, .nav-btn, h1, h2, h3, .tlabel, .tnum, .sub-note, .mini-list li span').forEach(el => {
        const cs = getComputedStyle(el);
        if(cs.overflow !== 'hidden' || cs.textOverflow !== 'ellipsis') return;
        if(el.scrollWidth > el.clientWidth + 2 && el.textContent.trim().length > 4 && !el.closest('.bc-bar')) tronques.push(el.textContent.trim().slice(0, 30));
      });
      return { active: sec && sec.classList.contains('active'), longueur: txt.length, suspect: (txt.match(SUSPECT_RE) || []).slice(0, 3), tronques: tronques.slice(0, 3), deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    }, p).catch(e => ({erreur: e.message}));
    if(dt > 2500) lents.push(p + ' ' + dt + ' ms');
    ok(!r.erreur && r.active && r.longueur > 80 && !r.suspect.length && !r.tronques.length && !r.deborde, nom + ' · ' + p + ' : ' + (r.erreur || (r.longueur + ' car. · ' + dt + ' ms' + (r.suspect.length ? ' · suspect ' + r.suspect.join(',') : '') + (r.tronques.length ? ' · tronqué « ' + r.tronques.join(' | ') + ' »' : '') + (r.deborde ? ' · déborde' : ''))));
  }
  return lents;
}
/* la regex est injectee dans la page une fois */
const injecter = fr => fr.evaluate(() => { window.SUSPECT_RE = /\bNaN\b|undefined|\[object|Infinity/g; });

const CONTROLES = [
  ['2026-12-15', 'mi-S1, régime combat'], ['2027-01-12', 'partiels'], ['2027-01-25', 'premier jour du S2, combat fini'], ['2027-03-14', 'dernier jour du programme (jour 172)'],
  ['2027-03-24', 'six mois de saisies (jour 182)'], ['2027-06-10', 'après le dernier cours du S2'], ['2027-09-20', 'deuxième année, sans grille connue'],
  ['2028-02-29', 'année bissextile'], ['2029-01-01', 'jour de l’an'], ['2031-09-25', 'cinq ans']
];
for(const [ctrl, quoi] of CONTROLES){
  const graine = seed(ctrl);
  const octets = Object.keys(graine).reduce((t, k) => t + k.length + JSON.stringify(graine[k]).length, 0);
  console.log('\n══ ' + ctrl + ' — ' + quoi + ' · ' + Object.keys(graine).length + ' clés · ' + Math.round(octets / 1024) + ' Ko ══');
  /* Mac, 10:00 */
  const { ctx, page, fr, erreurs, chargement } = await ouvrir(ctrl + 'T10:00:00' + decalage(ctrl), {width: 1440, height: 900}, graine);
  await injecter(fr);
  ok(chargement < 8000, 'chargement en ' + chargement + ' ms');
  const lents = await tour(page, fr, 'Mac');
  ok(!lents.length, 'aucun onglet lent' + (lents.length ? ' : ' + lents.join(', ') : ''));
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await page.waitForTimeout(150);
  const c = await fr.evaluate(() => {
    const t = id => (document.getElementById(id) || {}).textContent || '';
    const dash = document.querySelector('.page[data-page="dashboard"]').innerText;
    const sante = window.__bcSante();
    return { score: t('dash-score-note'), sante: sante.filter(x => !x.ok).map(x => x.id + ' (' + x.texte + ')'), donnees: (sante.find(x => x.id === 'donnees') || {}).texte,
      insights: window.__bcInsights().map(i => i.title + ':' + i.score).join(' / '), systeme: window.__bcSysteme.donnees().satellites.map(s => s.nom + ':' + s.statut).join(' '),
      poids: (dash.match(/\d\d,\d ?kg/) || [''])[0], coran: (dash.match(/\d+ \/ 180 p\./) || [''])[0], demain: window.__bcDemain.donnees().grille.length,
      courbe: (() => { document.querySelector('.nav-btn[data-page="bilan"]').click(); const svg = document.querySelector('#weight-chart svg'); return svg ? svg.querySelectorAll('path').length : -1; })() };
  });
  console.log('      score « ' + c.score + ' » · poids ' + c.poids + ' · coran ' + c.coran + ' · ' + c.donnees + ' · demain ' + c.demain + ' blocs · courbe ' + c.courbe + ' tracés');
  console.log('      insights ' + c.insights.slice(0, 150));
  console.log('      système ' + c.systeme);
  ok(c.sante.length === 0, 'santé : ' + (c.sante.join(' · ') || 'tout vert'));
  ok(!/Jour (\d+) sur (\d+)/.test(c.score) || Number(RegExp.$1) <= Number(RegExp.$2), 'le rang du jour ne dépasse pas le programme : ' + c.score);
  ok(!SUSPECT.test(c.insights) && !SUSPECT.test(c.systeme), 'insights et système sans NaN');
  ok(c.demain >= 3, 'Demain a une grille (' + c.demain + ' blocs)');
  ok(c.courbe >= 1, 'la courbe de poids se trace (' + c.courbe + ' tracés)');
  ok(!erreurs.length, 'aucune erreur JS' + (erreurs.length ? ' : ' + erreurs.slice(0, 2).join(' | ') : ''));
  await ctx.close();
  /* iPhone, 20:30 : la cloture puis Demain */
  const s2 = await ouvrir(ctrl + 'T20:30:00' + decalage(ctrl), {width: 390, height: 844}, graine);
  await injecter(s2.fr);
  await tour(s2.page, s2.fr, 'iPhone');
  await s2.fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  const g = await s2.fr.evaluate(() => {
    const out = {};
    document.getElementById('bc-cloture').click(); out.ouverte = !document.getElementById('cloture-overlay').hidden;
    document.getElementById('cl-sommeil').value = '7'; document.getElementById('cl-aulit').value = '8'; const p = document.getElementById('cl-poids'); if(p) p.value = '72';
    document.getElementById('cloture-valider').click();
    out.fermee = document.getElementById('cloture-overlay').hidden; out.demain = !document.getElementById('demain-overlay').hidden;
    out.titre = document.getElementById('demain-titre').textContent; out.toast = document.getElementById('toast').textContent;
    document.getElementById('demain-ok').click(); out.demainFerme = document.getElementById('demain-overlay').hidden;
    out.cloture = (document.querySelector('#bc-cloture .v') || {}).textContent;
    out.deborde = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return out;
  });
  ok(g.ouverte && g.fermee && g.demain && g.demainFerme && /faite/.test(g.cloture) && !g.deborde, 'iPhone : clôture validée → Demain « ' + g.titre + ' » → fermé · ' + g.cloture);
  ok(!s2.erreurs.length, 'iPhone : aucune erreur JS' + (s2.erreurs.length ? ' : ' + s2.erreurs.slice(0, 2).join(' | ') : ''));
  await s2.ctx.close();
}
await browser.close();
console.log('\n' + total + ' vérifications · ' + (defauts ? defauts + ' DÉFAUT(S)' : 'RIEN À SIGNALER'));
process.exit(defauts ? 1 : 0);
