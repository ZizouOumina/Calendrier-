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
  const LOG = {'batcave-sport-log': [
    log('Flexion du cou', 'Haut lourd', [20,20,20], 0),
    log('Extension du cou', 'Haut lourd', [20,20,20], 1.25),
    log('Tractions', 'Haut lourd', [12,12,12,12], 0),
    log('Élévations latérales', 'Haut lourd', [20,20,20], 1),
    log('Crunch lesté', 'Bas complet', [20,20,20], 0),
    log('Dips', 'Haut lourd', [15,14,13,12], 5)
  ]};
  const { ctx, fr } = await ouvrir('2026-10-19T09:00:00+02:00', LOG);   /* semaine 4 : volume complet */
  const c = await fr.evaluate(() => {
    const ex = {}; window.__bcSessionsSport().forEach(s => s.exercises.forEach(e => { if(!ex[e.name]) ex[e.name] = e; }));
    const r = {}; ['Flexion du cou','Extension du cou','Tractions','Élévations latérales','Crunch lesté','Dips'].forEach(n => { const x = window.__bcCibleProchaine(ex[n]); r[n] = {charge: x.charge, monter: x.monter, series: x.series}; });
    return r;
  });
  ok(c['Flexion du cou'].monter && c['Flexion du cou'].charge === 1.25, 'cou, depuis le poids du corps : premier palier à 1,25 kg, pas 2,5 (' + c['Flexion du cou'].charge + ')');
  ok(c['Extension du cou'].charge === 1.5, 'cou à 1,25 kg : un trait de 250 g → 1,5 kg (' + c['Extension du cou'].charge + ')');
  ok(c['Tractions'].charge === 2.5, 'tractions : le sac lesté garde son cran de 2,5 kg (' + c['Tractions'].charge + ')');
  ok(c['Élévations latérales'].charge === 1.25, 'élévations à 1 kg par main → 1,25 kg (' + c['Élévations latérales'].charge + ')');
  ok(c['Crunch lesté'].charge === 3, 'crunch, depuis rien : la bouteille de sable, 3 kg (' + c['Crunch lesté'].charge + ')');
  ok(!c['Dips'].monter && c['Dips'].charge === 5 && JSON.stringify(c['Dips'].series) === JSON.stringify([15,15,14,13]),
     'dips pas tous au haut : même charge, +1 rep par série (' + c['Dips'].series.join('/') + ' à ' + c['Dips'].charge + ' kg)');
  const pas = await fr.evaluate(() => [window.__bcPasCharge({name:'x'}).pas, window.__bcPasCharge({name:'y', pas:0.25, depart:1}).depart]);
  ok(pas[0] === 2.5 && pas[1] === 1, 'sans cran déclaré, 2,5 kg ; avec, le sien');
  await ctx.close();
}

console.log('\n== 262) Les élévations latérales, lundi et samedi ==');
{
  const { ctx, fr } = await ouvrir('2026-10-19T09:00:00+02:00');
  const s = await fr.evaluate(() => {
    const o = {}; window.__bcSessionsSport().forEach(x => { o[x.type] = {duree: x.duree, noms: x.exercises.map(e => e.name)}; });
    return o;
  });
  ok(s['Haut lourd'].noms.includes('Élévations latérales') && s['Haut volume'].noms.includes('Élévations latérales'), 'présentes le lundi (volume) et le jeudi (lourd) depuis le régime combat');
  ok(!s['Bas complet'].noms.includes('Élévations latérales'), 'et pas le mardi');
  const hl = s['Haut lourd'].noms, sa = s['Bras · épaules · mollets'].noms;
  ok(hl.indexOf('Élévations latérales') < hl.indexOf('Flexion du cou'), 'lundi : avant le cou, qui reste le finisseur');
  ok(sa.indexOf('Élévations latérales') === sa.indexOf('Shrugs suspendus') + 1, 'samedi : dans le bloc épaules, juste après les shrugs');
  ok(s['Haut lourd'].duree === '50 min' && s['Haut volume'].duree === '55 min', 'durées annoncées : 50 min (lourd) et 55 min (volume)');
  await ctx.close();
}

console.log('\n== 263) Le samedi du régime combat : lever 05:30, pas de séance, projets le soir ==');
{
  const { ctx, fr } = await ouvrir('2026-09-25T09:00:00+02:00');
  const r = await fr.evaluate(() => ({
    g: window.__bcGrille('saturday', '2026-10-03').map(b => b[0] + ' ' + b[1]),
    lever: window.__bcLever('saturday', '2026-10-03'),
    sport: window.__bcTypeSport('2026-10-03'),
    som: window.__bcSommeilCible('2026-10-03'),
    prevu: window.__bcPrevu('2026-10-03')
  }));
  ok(r.lever === '05:30' && r.g[0] === '05:30 Projets perso matinal', 'lever 05:30, un bloc de projets d\'abord (' + r.g[0] + ')');
  ok(r.g.includes('18:00 Projets perso 3') && r.g.includes('19:30 Dîner') && !r.g.some(x => /Course à pied/.test(x)), 'projets 18:00 → 19:30, dîner 19:30, plus de course');
  ok(r.g.filter(x => / Sport$/.test(x)).length === 0, 'aucune séance de muscu le samedi : le combat de la semaine est le cardio');
  ok(r.sport === 'Off' && r.prevu.sport === 0, 'le samedi n\'est plus compté comme séance (' + r.sport + ')');
  ok(Math.abs(r.som - (24 - 21 - 35/60 + 5.5)) < 0.01, 'nuit du vendredi : 21:35 → 05:30 = 7 h 55 (' + r.som.toFixed(2) + ' h)');
  ok(r.g.includes('09:20 Approfondir') && r.g.some(x => /^16:00 Cartes d'erreurs/.test(x)), 'aucun bloc de travail n\'a bougé');
  const c = await fr.evaluate(() => [window.__bcConsigne('Projets perso 3', 6, '2026-10-03'), window.__bcConsigne('Sport', 1, '2026-10-05')]);
  ok(/18:00/.test(c[0]) && /sans minuteur/.test(c[0]), 'la consigne du samedi soir parle du bloc de 18:00, sans minuteur');
  ok(/kilomètre/.test(c[1]), 'celle du lundi garde le kilomètre jusqu\'au parc');
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
