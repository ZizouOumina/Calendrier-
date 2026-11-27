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
    es23: !!window.__bcPhaseEspanol('2026-12-27'), es24: !!window.__bcPhaseEspanol('2026-12-28'),
    es7: !!window.__bcPhaseEspanol('2026-11-07'), es8: !!window.__bcPhaseEspanol('2026-11-08'), es11: !!window.__bcPhaseEspanol('2026-11-27'), es9: !!window.__bcPhaseEspanol('2026-11-28'),
    nom23: (window.__bcPeriode('2026-10-23') || {}).id || null
  }));
  /* 28 septembre au soir, « tout commence demain » : jour 1 au mardi 29, et la phase
     Español dure un mois pile depuis lui -- jusqu'au mercredi 28 octobre.
     30 septembre au soir, « on decale tout, demain c'est le vrai jour » : jour 1 au jeudi
     1er octobre, phase Español jusqu'au samedi 31 octobre.
     4 octobre, « on decale tout a demain lundi » : jour 1 au lundi 5, phase Español jusqu'au
     mercredi 4 novembre.
     12 octobre, « tout a 100 % des mardi » : jour 1 au mardi 13, phase Español jusqu'au
     jeudi 12 novembre.
     14 octobre, « on va commencer tout demain matin » : jour 1 au jeudi 15, phase Español
     jusqu'au samedi 14 novembre.
     15 octobre, « on commence vendredi pour de bon » : jour 1 au vendredi 16, phase Español
     jusqu'au dimanche 15 novembre.
     16 octobre, « samedi matin sans faute » : jour 1 au samedi 17, la phase garde sa fin, le
     dimanche 15 novembre (le dossier e-commerce demarre le 16).
     19 octobre, « on decale tout a demain » : jour 1 au mardi 20, meme fin de phase.
     21 octobre, « on commence demain la Batcave » : jour 1 au mercredi 21, meme fin de phase.
     21 octobre au matin, « on commence jeudi matin » : jour 1 au jeudi 22, meme fin de phase.
     31 octobre, « on commence tout dimanche matin » : jour 1 au dimanche 1er novembre, meme fin de phase.
     7 novembre, « on decale aussi le debut de la periode d'espagnol », puis « pas le 8 mais le 9 » :
     es-1 s'arrete le samedi 7, le dimanche 8 est hors phase, et le mois repart en entier du lundi 9
     au mardi 8 decembre (es-1-reprise).
     10 et 11 novembre : jour 1 au jeudi 12, et le mois repris avec lui -- du jeudi 12 au
     vendredi 11 decembre. Du dimanche 8 au mercredi 11, hors phase.
     12 novembre, la viande jetee : jour 1 au vendredi 13, et le mois repris avec lui -- du
     vendredi 13 au samedi 12 decembre. Du dimanche 8 au jeudi 12, hors phase.
     13 novembre, « on commence tout samedi » : jour 1 au samedi 14, et le mois repris avec lui --
     du samedi 14 au samedi 12 decembre. Du dimanche 8 au vendredi 13, hors phase.
     15 novembre, « recale tout sur lundi » : jour 1 au lundi 16, et le mois repris avec lui -- du lundi 16 au samedi 12
     decembre. Du dimanche 8 au dimanche 15, hors phase.
     18 novembre, « on va decaler le premier jour a demain, jeudi 19/11 ... 1 mois pile » : jour 1 au
     jeudi 19, et le mois repris avec lui -- du jeudi 19 novembre au vendredi 18 decembre ; l'e-commerce
     reprend le samedi 19. Du dimanche 8 au mercredi 18, hors phase.
     19 novembre, « on commence tout demain vendredi, ce mois ci j'aurais pas assez pour le JJB » : jour 1 au vendredi 20, et
     le mois repris avec lui -- du vendredi 20 novembre au samedi 19 decembre ; l'e-commerce reprend le dimanche 20. Du
     dimanche 8 au jeudi 19, hors phase.
     23 novembre au soir, « on decale tout a demain, debut de la phase d'espagnol » : jour 1 au mardi 24, VERROUILLE,
     et le mois repris avec lui -- du mardi 24 novembre au mercredi 23 decembre ; l'e-commerce reprend le jeudi 24.
     Du dimanche 8 au lundi 23, hors phase.
     26 novembre, « on commence tout tout tout samedi [...] on va le faire une derniere fois » : jour 1 au samedi 28, de
     nouveau VERROUILLE, et le mois repris avec lui -- du samedi 28 novembre au dimanche 27 decembre ; l'e-commerce reprend
     le lundi 28 decembre. Du dimanche 8 au vendredi 27 novembre, hors phase. */
  ok(r.debut === '2026-11-28', 'PROGRAMME_DEBUT = ' + r.debut);
  ok(r.es7 && !r.es8 && !r.es11 && r.es9, 'es-1 jusqu\'au samedi 7, rien du dimanche 8 au vendredi 27, la reprise dès le samedi 28 (' + [r.es7, r.es8, r.es11, r.es9].join(' / ') + ')');
  ok(r.es23 && !r.es24, 'le mois repris court jusqu\'au dimanche 27 décembre, plus le lundi 28 (' + r.es23 + ' / ' + r.es24 + ')');
  await ctx.close();
}

console.log('\n== 266) Le controle des series : rien avant le jour 1, puis la première semaine ==');
{
  /* 15 novembre : le jour 1 passe au lundi 16 et le controle saute les jours d'avant -- aucun rappel n'y est envoye.
     Le 23 septembre, J+2 a J+8 sont tous avant lui : rien a relire, et l'agenda n'est pas appele. (La semaine
     reelle du 25 septembre qu'il relisait n'est plus une semaine du programme.) */
  const { ctx, fr } = await ouvrir('2026-09-23T10:00:00+02:00');
  const r = await fr.evaluate(async (payload) => {
    let appel = null;
    const mcp = { callTool: (srv, tool, args) => { appel = {srv, tool, args}; return Promise.resolve({payload}); } };
    const c = await window.__bcControlerSeries(mcp);
    return { appel, c, jours: window.__bcJoursAControler() };
  }, SEMAINE);
  ok(!r.appel && r.c === null && r.jours.length === 0, 'le 23 septembre, avant le jour 1 : aucun jour à contrôler, aucun appel à l\'agenda');
  await ctx.close();
}
{
  /* le lundi 16, jour 1 : J+2 a J+8, du mercredi 18 au mardi 24. Un agenda qui porte chaque rappel a son heure
     (series et evenements uniques, comme depuis la remise au propre) suit la grille de bout en bout.
     18 novembre : le jeudi 19, jour 1 -- J+2 a J+8, du samedi 21 au vendredi 27.
     19 novembre : le vendredi 20, jour 1 -- J+2 a J+8, du dimanche 22 au samedi 28.
     23 novembre : le mardi 24, jour 1 -- J+2 a J+8, du jeudi 26 au mercredi 2 decembre.
     26 novembre : le samedi 28, jour 1 -- J+2 a J+8, du lundi 30 novembre au dimanche 6 decembre. */
  const { ctx, fr } = await ouvrir('2026-11-28T10:00:00+01:00');
  const r = await fr.evaluate(async () => {
    const jours = window.__bcJoursAControler();
    const mm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    const events = [];
    jours.forEach(iso => window.__bcRappels(iso).forEach((b, i) => events.push(i % 2
      ? {id: iso + '-' + i, summary: b.titre, status: 'confirmed', start: {dateTime: iso + 'T' + mm(b.debut) + ':00+01:00'}}
      : {id: iso + '-' + i, summary: b.titreBase + ' · consigne', recurringEventId: 'serie-' + i, status: 'confirmed', start: {dateTime: iso + 'T' + mm(b.debut) + ':00+01:00'}})));
    let appel = null;
    const mcp = { callTool: (srv, tool, args) => { appel = {srv, tool, args}; return Promise.resolve({payload: {events}}); } };
    const c = await window.__bcControlerSeries(mcp);
    return { appel, jours, blocs: events.length, n: c ? c.ecarts.length : -1, statut: document.getElementById('gcal-controle-statut').textContent,
             plan: document.getElementById('dash-plan').innerText,
             sauve: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-gcal-controle') || 'null') };
  });
  ok(r.appel && r.appel.tool === 'list_events' && /^2026-11-30T00:00:00\+01:00$/.test(r.appel.args.startTime) && /^2026-12-07T00:00:00\+01:00$/.test(r.appel.args.endTime),
     'un seul list_events, du 30 novembre au 7 décembre (' + (r.appel && r.appel.args.startTime) + ' → ' + (r.appel && r.appel.args.endTime) + ')');
  ok(r.jours.length === 7 && r.jours[0] === '2026-11-30' && r.jours[6] === '2026-12-06', 'sept jours relus, J+2 à J+8 : ' + r.jours.join(' '));
  ok(r.n === 0 && /tout suit la grille/.test(r.statut), 'chaque rappel à son heure (' + r.blocs + ') : aucun écart — ' + r.statut);
  ok(!/Agenda Google : \d+ séries? 🦇/.test(r.plan), 'le Plan du jour n\'en dit rien');
  ok(r.sauve && r.sauve.date === '2026-11-28', 'le contrôle est gardé pour la journée');
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
    /* 13 novembre : depuis la remise au propre jour par jour, un bloc pose en evenement unique est annonce lui aussi */
    const uniques = blocs.map((b, i) => ({id: 'u' + i, summary: b.titre, status: 'confirmed', start: {dateTime: iso + 'T' + mm(b.debut) + ':00+02:00'}}));
    /* 15 novembre : le brossage du matin (05:25) est une serie posee a part, protegee comme les tapis */
    const propreUniques = window.__bcComparerSeries(iso, uniques.concat([{id:'tapis', summary:'🦇 Enlever les tapis', recurringEventId:'tapis', status:'confirmed', start:{dateTime: iso + 'T14:52:00+02:00'}},
      {id:'dents', summary:'🦇 Brossage de dents du matin', recurringEventId:'dents', status:'confirmed', start:{dateTime: iso + 'T05:25:00+02:00'}}]));
    const faux = juste.slice(1);                        /* le premier bloc n'a plus de rappel */
    faux[0] = ev(faux[0].summary, '04:00', 'x');       /* le deuxieme sonne a 04:00 */
    faux.push(ev('🦇 Vieux bloc · supprime', '23:00', 'z'));
    faux.push({id:'t', summary:'🦇 Enlever les tapis', recurringEventId:'tapis', status:'confirmed', start:{dateTime: iso + 'T14:52:00+02:00'}});
    const e = window.__bcComparerSeries(iso, faux);
    return {n: blocs.length, propre: propre.length, propreUniques: propreUniques.length, types: e.map(x => x.type).sort(), premier: blocs[0].titreBase, decale: e.filter(x => x.type === 'decale')[0], texte: window.__bcGroupesDerive(e).map(g => g.type + ':' + g.titre)};
  });
  ok(r.propre === 0, 'une semaine juste : aucun écart (' + r.n + ' blocs)');
  ok(r.propreUniques === 0, 'des blocs posés en événements uniques, les rappels des tapis et du brossage du matin : aucun écart non plus (' + r.propreUniques + ')');
  ok(JSON.stringify(r.types) === JSON.stringify(['decale','en-trop','manquant']), 'décalée, en trop, manquante — et le rappel protégé des tapis jamais « en trop » : ' + r.texte.join(', '));
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
