/* 17 novembre, sa demande : « je veux pouvoir cocher dans ma journée […] l'onglet ma journée doit tout afficher
   correctement, il ne peut pas y avoir d'erreurs ». « Ma journée » vérifiée pour chaque jour de la saison, du lundi 16
   novembre au dimanche 6 juin, avec SES données (DONNEES=<sauvegarde.json>).
   A. Une seule ouverture, puis chaque jour à la suite (comme les flèches « Lendemain ») :
      - aucune erreur de page ;
      - chaque ligne a son heure (HH:MM, dans l'ordre de la journée) et un titre ; un bloc de travail a sa consigne ;
      - rien d'écrit « undefined », « NaN », « null » ;
      - les deux listes (« Tes habitudes », « La routine ») sont exactement les habitudes qui tombent ce jour-là, recalculées
        ici, à part, depuis leurs jours, leur cycle et leur ancre -- pas lues dans la Batcave.
   B. Chaque jour ouvert comme « aujourd'hui », l'horloge à 07:00 : une case par habitude du jour, toutes cochées une à
      une (« n / n »), puis la première décochée ; au rechargement, les cochées le restent et la décochée aussi.
   node zz-journee-saison.mjs [début] [fin] [A|B|AB] */
import { chromium } from 'playwright';
import fs from 'fs';
const [debut = '2026-11-16', fin = '2027-06-06', quoi = 'AB'] = process.argv.slice(2);
const URL = process.env.BC_HOST || 'http://127.0.0.1:8199/host.html';
const DONNEES = process.env.DONNEES ? JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8')) : null;
let echecs = 0;
const ko = m => { echecs++; console.log('  FAIL ' + m); };
const isoDe = d => d.toISOString().slice(0, 10);
const jours = []; for (let d = new Date(debut + 'T12:00:00Z'); d <= new Date(fin + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) jours.push(isoDe(d));
const decalage = iso => (iso >= '2027-03-28' && iso < '2027-10-31') ? '+02:00' : '+01:00';
const browser = await chromium.launch();

async function ouvrir(quand){
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Madrid', locale: 'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if (DONNEES) await ctx.addInitScript(x => { try { if (!sessionStorage.getItem('__seme')) { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); sessionStorage.setItem('__seme', '1'); } } catch (e) {} }, DONNEES);
  const page = await ctx.newPage();
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, { timeout: 30000 }).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 30000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if (r) r.click(); });
  return { ctx, page, fr, erreurs };
}
const versJournee = async (fr, page) => { await fr.evaluate(() => document.querySelector('.nav-btn[data-page="journee"]').click()); await page.waitForTimeout(150); };
async function cadre(page){ return page.frames().find(x => x.url().includes('batcave.html')); }

/* la règle, recalculée ici : les jours de la semaine, puis le cycle (une semaine sur N depuis l'ancre) */
function tombe(h, iso){
  if (!h || h.archived) return false;
  const dow = new Date(iso + 'T12:00:00Z').getUTCDay();
  let js = null;
  if (Array.isArray(h.jours)){ const u = [...new Set(h.jours.filter(j => Number.isInteger(j) && j >= 0 && j <= 6))].sort(); if (u.length && u.length < 7) js = u; }
  if (js === null && Number.isInteger(h.jour) && h.jour >= 0 && h.jour <= 6) js = [h.jour];
  if (js && !js.includes(dow)) return false;
  const n = h.cycleSemaines > 1 ? h.cycleSemaines : (h.quinzaine ? 2 : 0);
  if (n < 2) return true;
  const a = h.ancre || (h.quinzaine ? '2026-10-04' : '2026-11-16');
  if (iso < a) return false;
  const jrs = Math.round((Date.parse(iso + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  return Math.floor(jrs / 7) % n === 0;
}
const libelle = (h, dow) => (h.icon ? h.icon + ' ' : '') + h.label + (h.id === 'core-dhuhr' && dow === 5 ? ' · Jumu’ah' : '');

if (quoi.includes('A')){
  console.log('\n== A) chaque jour à la suite, du ' + debut + ' au ' + fin + ' ==');
  const { ctx, page, fr, erreurs } = await ouvrir(jours[0] + 'T06:00:00' + decalage(jours[0]));
  await versJournee(fr, page);
  const habs = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-habits') || '[]'));
  const retirees = habs.filter(h => ['core-revue', 'core-marche', 'core-courses', 'core-cou-jeudi'].includes(h.id));
  if (retirees.length) ko('habitudes retirées encore là : ' + retirees.map(h => h.id).join(', '));
  let nGuide = 0, nVivant = 0, nChange = 0, nLignes = 0, nCases = 0;
  for (const iso of jours){
    const dow = new Date(iso + 'T12:00:00Z').getUTCDay();
    const r = await fr.evaluate(x => {
      window.__bcJournee.aller(x);
      const c = document.getElementById('mj-corps');
      const lignes = [...document.querySelectorAll('#mj-fil > li')].map(li => ({ t: li.dataset.t, en: !!li.dataset.en, k: (li.className.match(/mj-k-(\w+)/) || [])[1],
        titre: (li.querySelector('.mj-quoi b') || {}).textContent || '', d: !!li.querySelector('.mj-quoi p'), pas: li.querySelectorAll('.mj-pas li').length }));
      const liste = id => [...document.querySelectorAll('#' + id + ' li')].map(li => li.textContent.replace(/^✓ /, ''));
      return { lignes, texte: c ? c.innerText : '', cases: liste('mj-cases'), routine: liste('mj-routine'),
               change: !!document.querySelector('.mj-alerte:not(.calme)'), calme: !!document.querySelector('.mj-alerte.calme') };
    }, iso);
    if (r.change) nChange++; else if (r.calme) nVivant++; else nGuide++;
    nLignes += r.lignes.length;
    if (r.lignes.length < 8) ko(iso + ' : seulement ' + r.lignes.length + ' lignes');
    let avant = -1;
    r.lignes.forEach((l, i) => {
      if (!/^\d\d:\d\d$/.test(l.t || '')) ko(iso + ' ligne ' + i + ' sans heure (' + l.t + ') : ' + l.titre);
      if (!l.titre.trim()) ko(iso + ' ligne ' + i + ' sans titre (' + l.t + ')');
      const m = Number((l.t || '0:0').split(':')[0]) * 60 + Number((l.t || '0:0').split(':')[1]);
      if (!l.en && m < avant) ko(iso + ' ligne ' + i + ' hors de l\'ordre : ' + l.t + ' ' + l.titre);
      if (!l.en) avant = Math.max(avant, m);
      if (/^(etude|esp|projet)$/.test(l.k) && !l.d && !l.pas) ko(iso + ' ' + l.t + ' ' + l.titre + ' : un bloc de travail sans consigne');
    });
    if (/undefined|NaN|\bnull\b|\[object /.test(r.texte)) ko(iso + ' : texte suspect « ' + (r.texte.match(/.{0,40}(undefined|NaN|\bnull\b|\[object ).{0,40}/) || [''])[0] + ' »');
    const dus = habs.filter(h => tombe(h, iso) && !['core-revue', 'core-marche', 'core-courses', 'core-cou-jeudi'].includes(h.id));
    const attendu = { cases: dus.filter(h => !h.sansCase).map(h => libelle(h, dow)), routine: dus.filter(h => h.sansCase).map(h => libelle(h, dow)) };
    for (const cle of ['cases', 'routine']){
      const a = [...attendu[cle]].sort().join(' | '), b = [...r[cle]].sort().join(' | ');
      if (a !== b) ko(iso + ' ' + cle + ' : attendu [' + a + '] / affiché [' + b + ']');
    }
    nCases += r.cases.length + r.routine.length;
  }
  if (erreurs.length) ko('erreurs de page : ' + erreurs.slice(0, 5).join(' · '));
  console.log('  ' + jours.length + ' jours · ' + nLignes + ' lignes · ' + nCases + ' cases · pas à pas écrit ' + nGuide + ' j, grille de la Batcave ' + nVivant + ' j, grille changée depuis l\'écriture ' + nChange + ' j');
  await ctx.close();
}

if (quoi.includes('B')){
  console.log('\n== B) chaque jour comme « aujourd\'hui » : tout cocher, en décocher une, recharger ==');
  let n = 0;
  for (const iso of jours){
    const dow = new Date(iso + 'T12:00:00Z').getUTCDay();
    let ouvert;
    try { ouvert = await ouvrir(iso + 'T07:00:00' + decalage(iso)); } catch (e) { ko(iso + ' : ouverture impossible (' + e.message.split('\n')[0] + ')'); continue; }
    const { ctx, page, erreurs } = ouvert;
    let fr = ouvert.fr;
    try {
      await versJournee(fr, page);
      const habs = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-habits') || '[]'));
      const dus = habs.filter(h => tombe(h, iso)).map(h => h.id);
      const ids = await fr.evaluate(() => [...document.querySelectorAll('#mj-cases input[data-mj-hab], #mj-routine input[data-mj-hab]')].map(x => x.dataset.mjHab));
      if ([...ids].sort().join() !== [...dus].sort().join()) ko(iso + ' : cases [' + ids.join(', ') + '] / attendues [' + dus.join(', ') + ']');
      for (const id of ids){
        await fr.evaluate(i => { const cb = document.querySelector('input[data-mj-hab="' + i + '"]'); if (cb && !cb.checked) cb.click(); }, id);
      }
      const apres = await fr.evaluate(() => ({ coches: [...document.querySelectorAll('input[data-mj-hab]')].filter(x => x.checked).length,
        total: document.querySelectorAll('input[data-mj-hab]').length,
        comptes: ['mj-cases-compte', 'mj-routine-compte'].map(i => (document.getElementById(i) || {}).textContent || '') }));
      if (apres.coches !== ids.length) ko(iso + ' : ' + apres.coches + ' cochées sur ' + ids.length + ' après les clics');
      apres.comptes.filter(Boolean).forEach(t => { const m = t.match(/^(\d+) \/ (\d+)$/); if (!m || m[1] !== m[2]) ko(iso + ' : compte « ' + t + ' » après tout coché'); });
      const premiere = ids[0];
      if (premiere) await fr.evaluate(i => { const cb = document.querySelector('input[data-mj-hab="' + i + '"]'); if (cb && cb.checked) cb.click(); }, premiere);
      await page.reload({ timeout: 30000 }).catch(() => {});
      await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 30000 });
      fr = await cadre(page);
      await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if (r) r.click(); });
      await versJournee(fr, page);
      const relu = await fr.evaluate(() => Object.fromEntries([...document.querySelectorAll('input[data-mj-hab]')].map(x => [x.dataset.mjHab, x.checked])));
      ids.forEach((id, i) => {
        if (!(id in relu)) ko(iso + ' : ' + id + ' a disparu au rechargement');
        else if (relu[id] !== (i !== 0)) ko(iso + ' : ' + id + (i === 0 ? ' décochée, revenue cochée' : ' cochée, revenue décochée') + ' au rechargement');
      });
      if (erreurs.length) ko(iso + ' : erreurs de page : ' + erreurs.slice(0, 3).join(' · '));
      n++;
      if (n % 20 === 0) console.log('  … ' + iso + ' (' + n + ' jours)');
    } catch (e) { ko(iso + ' : ' + e.message.split('\n')[0]); }
    await ctx.close();
  }
  console.log('  ' + n + ' jours ouverts comme aujourd\'hui');
}
await browser.close();
console.log(echecs ? '\n' + echecs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(echecs ? 1 : 0);
