/* Lot 46 (23 septembre, matin) : nuit blanche, « on decale tout a demain ».
   1. Le jour 1 passe au jeudi 24 ; la phase Español finit le vendredi 23 octobre.
   2. Le controle des series 🦇 de l'agenda Google, joue sur la VRAIE semaine du 25 septembre
      au 1er octobre (gcal-semaine-25sep.json : list_events releve le 23, reduit aux champs lus).
   3. Le sommeil reel : la cible est le temps au lit × 0,88, le temps au lit reste affiche. */
import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const SEMAINE = JSON.parse(fs.readFileSync(new globalThis.URL('./gcal-semaine-25sep.json', import.meta.url)));
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
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}

console.log('\n== 265) Le jour 1 au jeudi 24, la phase Español au 23 octobre ==');
{
  const { ctx, fr } = await ouvrir('2026-09-23T10:00:00+02:00');
  const r = await fr.evaluate(() => ({
    debut: window.__bcProgrammeDebut,
    es23: !!window.__bcPhaseEspanol('2026-10-23'), es24: !!window.__bcPhaseEspanol('2026-10-24'),
    nom23: (window.__bcPeriode('2026-10-23') || {}).id || null
  }));
  ok(r.debut === '2026-09-24', 'PROGRAMME_DEBUT = ' + r.debut);
  ok(r.es23 && !r.es24, 'phase Español le 23 octobre, plus le 24 (' + r.es23 + ' / ' + r.es24 + ')');
  await ctx.close();
}

console.log('\n== 266) Le controle des series, sur la vraie semaine ==');
{
  const { ctx, fr } = await ouvrir('2026-09-23T10:00:00+02:00');
  const r = await fr.evaluate(async (payload) => {
    let appel = null;
    const mcp = { callTool: (srv, tool, args) => { appel = {srv, tool, args}; return Promise.resolve({payload}); } };
    const c = await window.__bcControlerSeries(mcp);
    const gr = window.__bcGroupesDerive(c.ecarts);
    return { appel, jours: c.jours, n: c.ecarts.length, gr, resume: window.__bcResumeDerive(),
             statut: document.getElementById('gcal-controle-statut').textContent,
             lignes: [...document.querySelectorAll('#gcal-controle-liste li')].map(l => l.textContent),
             plan: document.getElementById('dash-plan').innerText,
             sauve: JSON.parse(localStorage.getItem('batcave-gcal-controle') || 'null') };
  }, SEMAINE);
  ok(r.appel && r.appel.tool === 'list_events' && /^2026-09-25T00:00:00\+02:00$/.test(r.appel.args.startTime) && /^2026-10-02T00:00:00\+02:00$/.test(r.appel.args.endTime),
     'un seul list_events, du 25 septembre au 2 octobre (' + (r.appel && r.appel.args.startTime) + ' → ' + (r.appel && r.appel.args.endTime) + ')');
  ok(r.jours.length === 7 && r.jours[0] === '2026-09-25', 'sept jours relus, J+2 à J+8 : ' + r.jours.join(' '));
  console.log('    — ce que dit ton agenda réel :');
  r.gr.forEach(g => console.log('      ' + g.type.padEnd(8) + ' ' + g.titre + ' · agenda ' + (g.agenda || '—') + ' · grille ' + (g.grille || '—') + ' · ' + g.jours.join(',')));
  ok(!r.gr.some(g => /Sport/.test(g.titre) && g.jours.includes('2026-09-26')), 'le samedi, la série Sport de 18:30 refaite hier suit la grille');
  ok(r.sauve && r.sauve.date === '2026-09-23', 'le contrôle est gardé pour la journée');
  ok(r.gr.length === r.lignes.length, 'le panneau liste chaque écart regroupé (' + r.lignes.length + ')');
  ok(r.gr.length ? /écart/.test(r.statut) : /tout suit la grille/.test(r.statut), 'statut : ' + r.statut);
  ok(r.gr.length ? /Agenda Google : \d+ séries? 🦇/.test(r.plan) : !/Agenda Google/.test(r.plan), 'le Plan du jour le dit : ' + (r.resume || '(rien)').slice(0, 110));
  await ctx.close();
}

console.log('\n== 267) Le controle sait voir une serie decalee, en trop, manquante ==');
{
  const { ctx, fr } = await ouvrir('2026-09-23T10:00:00+02:00');
  const r = await fr.evaluate(() => {
    const iso = '2026-09-28';                            /* un lundi ordinaire */
    const blocs = window.__bcRappels(iso);
    const ev = (t, h, id) => ({id, summary: t, recurringEventId: 'serie-' + id, status: 'confirmed', start: {dateTime: iso + 'T' + h + ':00+02:00'}});
    const mm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    const juste = blocs.map((b, i) => ev(b.titreBase + ' · consigne', mm(b.debut), i));
    const propre = window.__bcComparerSeries(iso, juste);
    const faux = juste.slice(1);                        /* le premier bloc n'a plus de serie */
    faux[0] = ev(faux[0].summary, '04:00', 'x');       /* le deuxieme sonne a 04:00 */
    faux.push(ev('🦇 Vieux bloc · supprime', '23:00', 'z'));
    faux.push({id:'u', summary:'🦇 Evenement unique', status:'confirmed', start:{dateTime: iso + 'T10:00:00+02:00'}});
    const e = window.__bcComparerSeries(iso, faux);
    return {n: blocs.length, propre: propre.length, types: e.map(x => x.type).sort(), premier: blocs[0].titreBase, decale: e.filter(x => x.type === 'decale')[0]};
  });
  ok(r.propre === 0, 'une semaine juste : aucun écart (' + r.n + ' blocs)');
  ok(JSON.stringify(r.types) === JSON.stringify(['decale','en-trop','manquant']), 'décalée, en trop, manquante — et l\'événement unique ignoré : ' + r.types.join(', '));
  ok(r.decale && r.decale.agenda === '04:00', 'la série décalée dit son heure : ' + (r.decale && r.decale.agenda) + ' au lieu de ' + (r.decale && r.decale.grille));
  await ctx.close();
}

console.log('\n== 268) Le sommeil reel, pas le temps au lit ==');
{
  const J = '2026-09-29';                                /* mardi : nuit de lundi a mardi */
  const { ctx, fr } = await ouvrir(J + 'T10:00:00+02:00', {['batcave-journal-' + J]: {sommeil: '6.7', auLit: '7.6', water: 0}});
  const r = await fr.evaluate((J) => ({
    lit: window.__bcSommeilCible(J), reel: window.__bcSommeilReel(J), moy: window.__bcSommeilMoyenVise(),
    tuile: [...document.querySelectorAll('#dash-releves .stat-tile')].map(t => t.innerText).filter(t => /Sommeil/.test(t))[0] || ''
  }), J);
  ok(Math.abs(r.reel - Math.round(r.lit * 0.88 * 12) / 12) < 1e-9, 'cible réelle = temps au lit × 0,88 : ' + r.lit.toFixed(2) + ' h au lit → ' + r.reel.toFixed(2) + ' h');
  ok(/au lit prévues/.test(r.tuile) && /efficacité 88 %/.test(r.tuile), 'la tuile montre les deux, et l\'efficacité de la nuit : ' + r.tuile.replace(/\s+/g, ' '));
  ok(r.moy > 6 && r.moy < 7.75, 'la moyenne visée d\'une semaine tombe sous les 7,75 h de temps au lit : ' + r.moy);
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-29T10:00:00+02:00', {'batcave-objectifs': {liste: [
    {id:'o2', titre:'Sommeil à moi', metrique:'sommeil_moy', periode:'mois', pid:'m', debut:'2026-09-14', fin:'2026-10-13', cible: 7}
  ]}});
  const r = await fr.evaluate(() => { const l = window.__bcObjectifs(); return {a: (l.filter(o => o.id === 'o1')[0] || {}).cible, b: (l.filter(o => o.id === 'o2')[0] || {}).cible, semes: l.filter(o => o.metrique === 'sommeil_moy' && o.id !== 'o2').map(o => o.cible), moy: window.__bcSommeilMoyenVise()}; });
  ok(r.b === 7, 'une cible retouchée à la main ne bouge pas : ' + r.b);
  ok(r.semes.length > 1 && r.semes.every(c => c === r.moy), 'les objectifs semés à 7,75 h passent à la moyenne réelle visée : ' + r.semes.join(', '));
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT PASSE');
process.exit(errs ? 1 : 0);
