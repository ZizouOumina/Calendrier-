/* Lot 45 (23 septembre, nuit) : ce que ce lot a change, et qui pourrait se defaire sans bruit.
   1. Le cran de charge depend de l'exercice. Jusqu'ici la surcharge progressive ajoutait
      2,5 kg a TOUT : +2,5 kg d'un coup sur le cou, alors que l'aide parle de traits de 250 g
      sur une bouteille graduee qui ne monte qu'a 2 kg.
   2. Les elevations laterales, lundi et samedi : le deltoide lateral -- celui de la largeur --
      n'avait que les pike push-ups du jeudi.
   3. Le samedi dort : lever 06:30, la muscu passe a 18:30 derriere la course -- jusqu'au
      regime combat du 28 septembre : depuis, le samedi se leve a 05:30 (projets), sans
      course ni seance ; ce point 263 verifie le samedi du regime combat.
   4. phaseEspanol : « sommes-nous en phase Español ? » se lisait `!!periodeGrille()`, vrai
      aussi a Noel, en partiels et tout l'ete -- le bouton Pomodoro Español y apparaissait. */
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
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const log = (exo, type, series, charge) => ({id: 'l-' + exo, date: '2026-10-12', type, exo, series, charge, unite: 'reps'});

console.log('\n== 261) Le cran de charge suit l\'exercice ==');
{
  /* 27 octobre, en salle : 2,5 kg à la barre, aux machines et en lest ; 2 kg par haltère ;
     1 kg aux élévations latérales (départ 2 kg) ; 1,25 kg au cou ; un haltère de 2 kg pour les relevés. */
  const LOG = {'batcave-sport-log': [
    log('Flexion du cou', 'Haut volume', [20,20,20], 0),
    log('Extension du cou', 'Haut volume', [20,20,20], 1.25),
    log('Tractions', 'Haut lourd', [12,12,12,12], 0),
    log('Élévations latérales', 'Haut volume', [20,20,20,20], 2),
    log('Relevés de jambes suspendus', 'Bas · charnière', [15,15,15], 0),
    log('Squat barre', 'Bas complet', [10,10,10,10], 60),
    log('Développé incliné haltères', 'Haut volume', [12,12,12], 16),
    log('Dips', 'Haut lourd', [11,10,9], 5)
  ]};
  const { ctx, fr } = await ouvrir('2026-11-16T09:00:00+01:00', LOG);   /* volume complet des le lundi 16 (31 octobre : jour 1 au dimanche 1er) */
  const c = await fr.evaluate(() => {
    const ex = {}; window.__bcSessionsSport().forEach(s => s.exercises.forEach(e => { if(!ex[e.name]) ex[e.name] = e; }));
    const r = {}; ['Flexion du cou','Extension du cou','Tractions','Élévations latérales','Relevés de jambes suspendus','Squat barre','Développé incliné haltères','Dips'].forEach(n => { const x = window.__bcCibleProchaine(ex[n]); r[n] = {charge: x.charge, monter: x.monter, series: x.series}; });
    return r;
  });
  ok(c['Flexion du cou'].monter && c['Flexion du cou'].charge === 1.25, 'cou, depuis le poids du corps : le plus petit disque, 1,25 kg (' + c['Flexion du cou'].charge + ')');
  ok(c['Extension du cou'].charge === 2.5, 'cou à 1,25 kg : +1,25 kg → 2,5 kg (' + c['Extension du cou'].charge + ')');
  ok(c['Tractions'].charge === 2.5, 'tractions : le lest garde son cran de 2,5 kg (' + c['Tractions'].charge + ')');
  ok(c['Élévations latérales'].charge === 3, 'élévations à 2 kg par main → 3 kg (' + c['Élévations latérales'].charge + ')');
  ok(c['Relevés de jambes suspendus'].charge === 2, 'relevés, depuis rien : un haltère de 2 kg (' + c['Relevés de jambes suspendus'].charge + ')');
  ok(c['Squat barre'].charge === 62.5, 'squat à 60 kg → 62,5 kg (' + c['Squat barre'].charge + ')');
  ok(c['Développé incliné haltères'].charge === 18, 'haltères à 16 kg → 18 kg (' + c['Développé incliné haltères'].charge + ')');
  ok(!c['Dips'].monter && c['Dips'].charge === 5 && JSON.stringify(c['Dips'].series) === JSON.stringify([12,11,10]),
     'dips pas tous au haut : même charge, +1 rep par série (' + c['Dips'].series.join('/') + ' à ' + c['Dips'].charge + ' kg)');
  const pas = await fr.evaluate(() => [window.__bcPasCharge({name:'x'}).pas, window.__bcPasCharge({name:'y', pas:0.25, depart:1}).depart]);
  ok(pas[0] === 2.5 && pas[1] === 1, 'sans cran déclaré, 2,5 kg ; avec, le sien');
  await ctx.close();
}

console.log('\n== 262) En salle : haut / bas sur quatre jours, chaque muscle deux fois ==');
{
  /* des sauts deja faits au haut de la fourchette : un exercice charge proposerait de monter */
  const { ctx, fr } = await ouvrir('2026-10-29T09:00:00+01:00', {'batcave-sport-log': [log('Sauts sur box', 'Bas complet', [5,5,5], 0)]});
  const s = await fr.evaluate(() => {
    const o = {}; window.__bcSessionsSport().forEach(x => { o[x.type] = {duree: x.duree, noms: x.exercises.map(e => e.name)}; });
    return Object.assign(o, {sam: window.__bcTypeSport('2026-10-31'), samS2: window.__bcTypeSport('2027-02-06')});
  });
  const hv = s['Haut volume'].noms, hl = s['Haut lourd'].noms, bc = s['Bas complet'].noms, bch = s['Bas · charnière'].noms;
  ok(hv.length === 9 && hl.length === 9 && bc.length === 6 && hl[8] === 'Tractions serviette (grip kimono)', 'neuf le lundi (face pulls ajoutés le 31 octobre), neuf le jeudi (tractions serviette en dernier), six le mardi (' + [hv.length, hl.length, bc.length].join(' / ') + ')');
  ok(s.sam === 'Bas · charnière' && s.samS2 === 'Bas · charnière' && bch.length === 7, 'le samedi est le second bas, au régime combat comme après (' + s.sam + ' / ' + s.samS2 + ')');
  ok(hv.includes('Élévations latérales') && hl.includes('Élévations latérales') && bch.includes('Élévations latérales') && !bc.includes('Élévations latérales'), 'élévations latérales lundi, jeudi et samedi');
  ok(hv.indexOf('Élévations latérales') < hv.indexOf('Flexion du cou'), 'lundi : le cou reste le finisseur');
  ok(bc.includes('Squat barre') && bc.includes('Leg curl assis') && bch.includes('Split squat bulgare') && bch.includes('Nordic ischios'), 'les jambes deux fois : squat et leg curl assis le mardi, split squat et Nordic le samedi');
  /* 31 octobre : athletique, pas massif -- la puissance en tete de seance, sans charge. */
  ok(bc[0] === 'Sauts sur box' && hl[0] === 'Pompes claquées' && bch[0] === 'Sauts en longueur', 'la puissance ouvre le mardi, le jeudi et le samedi (' + [bc[0], hl[0], bch[0]].join(' / ') + ')');
  ok(!bc.includes('Leg extension') && !hl.includes('Curl barre EZ'), 'leg extension et curl EZ sont sortis');
  ok(hv[8] === 'Face pulls' && hl.includes('Face pulls'), 'face pulls lundi (en dernier) et jeudi : 6 séries pour l\'arrière d\'épaule');
  const p = await fr.evaluate(() => {
    const ex = {}; window.__bcSessionsSport().forEach(s => s.exercises.forEach(e => { if(!ex[e.name]) ex[e.name] = e; }));
    const c = window.__bcCibleProchaine(ex['Sauts sur box']);
    return {charge: c.charge, monter: c.monter, series: c.series};
  });
  ok(p.charge === 0 && !p.monter && p.series.every(x => x === 5), 'les sauts ne se chargent pas : 5 reps par série, 0 kg (' + JSON.stringify(p) + ')');
  ok(!hl.some(n => /squat|Soulevé|Leg curl/i.test(n)), 'le jeudi ne porte plus de jambes : le haut lourd seul');
  ok(hl.includes('Extension triceps à la poulie au-dessus de la tête') && hl.includes('Développé couché barre') && hl.includes('Rowing barre'), 'jeudi : développé couché, rowing barre, extension au-dessus de la tête (Maeo 2023)');
  ok(s['Haut lourd'].duree === '55 min' && s['Haut volume'].duree === '55 min' && s['Bas complet'].duree === '50 min' && s['Bas · charnière'].duree === '50 min', 'durées annoncées : 55 min le lundi et le jeudi, 50 les autres');
  await ctx.close();
}

console.log('\n== 263) Le samedi du régime combat : lever 05:30, bras et épaules, projets le soir ==');
{
  /* Le samedi 3 octobre est l'exception de la semaine sans combat (un bas complet a 05:30,
     SEANCES_REPRISE) : le samedi type se lit le 10. */
  const { ctx, fr } = await ouvrir('2026-09-25T09:00:00+02:00');
  const r = await fr.evaluate(() => ({
    g: window.__bcGrille('saturday', '2026-10-10').map(b => b[0] + ' ' + b[1]),
    lever: window.__bcLever('saturday', '2026-10-10'),
    sport: window.__bcTypeSport('2026-10-10'),
    som: window.__bcSommeilCible('2026-10-10'),
    prevu: window.__bcPrevu('2026-10-10'),
    g3: window.__bcGrille('saturday', '2026-10-03').map(b => b[0] + ' ' + b[1]),
    sport3: window.__bcTypeSport('2026-10-03')
  }));
  ok(r.sport3 !== 'Bas complet', 'le samedi 3 n\'a plus de bas complet : la semaine de reprise a disparu avec le départ au lundi 5 (' + r.sport3 + ')');
  /* 4 octobre : la Muay Thai sortie, la seance bras et epaules revient le samedi a 05:30. */
  ok(r.lever === '05:30' && r.g[0] === '05:30 Sport', 'lever 05:30, la séance bras et épaules d\'abord (' + r.g[0] + ')');
  ok(r.g.includes('18:00 Projets perso 3') && r.g.includes('19:30 Dîner') && !r.g.some(x => /Course à pied/.test(x)), 'projets 18:00 → 19:30, dîner 19:30, plus de course');
  ok(r.g.filter(x => / Sport$/.test(x)).length === 1, 'une séance de muscu le samedi, à 05:30, et une seule');
  ok(r.sport === 'Bas · charnière' && r.prevu.sport > 0, 'le samedi compte comme séance : le second bas depuis la salle (' + r.sport + ')');
  ok(Math.abs(r.som - (24 - 21 - 35/60 + 5.5)) < 0.01, 'nuit du vendredi : 21:35 → 05:30 = 7 h 55 (' + r.som.toFixed(2) + ' h)');
  ok(r.g.includes('09:20 Approfondir') && r.g.some(x => /^16:00 Cartes d'erreurs/.test(x)), 'aucun bloc de travail n\'a bougé');
  const c = await fr.evaluate(() => [window.__bcConsigne('Projets perso 3', 6, '2026-10-10'), window.__bcConsigne('Sport', 1, '2026-10-05')]);
  ok(/18:00/.test(c[0]) && /sans minuteur/.test(c[0]), 'la consigne du samedi soir parle du bloc de 18:00, sans minuteur');
  ok(/vélo ou de rameur/.test(c[1]) && !/parc/.test(c[1]), 'celle du lundi parle de la salle, plus du parc');
  await ctx.close();
}

console.log('\n== 264) « Phase Español » ne veut dire que la phase Español ==');
{
  const NOEL = {'batcave-vacances': [{debut:'2026-12-21', fin:'2027-01-06', label:'Noël'}]};
  const EX = Object.assign({'batcave-examens': {'Anatomía I':'2026-10-16', 'Bioquímica':'2026-11-19'}}, NOEL);
  const { ctx, fr } = await ouvrir('2026-10-02T09:00:00+02:00', EX);
  const r = await fr.evaluate(() => ({
    oct2: (window.__bcPhaseEspanol('2026-10-02') || {}).id || null,
    oct13: window.__bcPhaseEspanol('2026-10-13'), oct13p: (window.__bcPeriode('2026-10-13') || {}).id,
    nov16: window.__bcPhaseEspanol('2026-11-16'), nov16p: (window.__bcPeriode('2026-11-16') || {}).id,
    dec28: window.__bcPhaseEspanol('2026-12-28'), dec28p: (window.__bcPeriode('2026-12-28') || {}).id,
    juil: window.__bcPhaseEspanol('2027-07-10'), juilp: (window.__bcPeriode('2027-07-10') || {}).id
  }));
  ok(r.oct2 === 'es-1', 'le 2 octobre : phase Español');
  ok(r.oct13p === 'partiels' && r.oct13 && r.oct13.sous === 'es-1', 'le 13 octobre, partiels dans la phase : la phase est toujours vue dessous');
  ok(r.nov16p === 'partiels' && r.nov16 === null, 'le 16 novembre, partiels hors phase : pas de phase Español');
  ok(r.dec28p === 'vacances' && r.dec28 === null, 'le 28 décembre, vacances : pas de phase Español (' + r.dec28p + ')');
  ok(r.juilp === 'ete' && r.juil === null, 'en juillet, l\'été : pas de phase Español');
  await ctx.close();
  const b = await ouvrir('2026-12-28T09:00:00+01:00', NOEL);
  const bouton = await b.fr.evaluate(() => { const e = document.getElementById('dash-pomodoro-espanol'); return {cache: e ? e.hidden : null, p: (window.__bcPeriode('2026-12-28') || {}).id}; });
  ok(bouton.p === 'vacances' && bouton.cache === true, 'à Noël (période « vacances »), le bouton Pomodoro Español est caché (' + JSON.stringify(bouton) + ')');
  await b.ctx.close();
  const c = await ouvrir('2026-10-02T09:00:00+02:00');
  const bouton2 = await c.fr.evaluate(() => { const e = document.getElementById('dash-pomodoro-espanol'); return e ? e.hidden : null; });
  ok(bouton2 === false, 'en phase, il est là (' + bouton2 + ')');
  await c.ctx.close();
}

console.log(errs ? '\nERREURS: ' + errs : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
