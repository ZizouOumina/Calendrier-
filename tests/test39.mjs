import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(quand, seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#cal-timeline').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}
const LUNDI = '2026-09-07T10:00:00+02:00', VENDREDI = '2026-09-04T10:00:00+02:00';
const SAMEDI = '2026-09-05T10:00:00+02:00', DIMANCHE = '2026-09-06T10:00:00+02:00';
const nb = t => (t.replace(/\s+/g,'').match(/Objectifsemaine([\d,]+)/)||[])[1];

console.log('\n== 83) Les objectifs hebdomadaires se déduisent du planning ==');
{
  const { ctx, fr } = await ouvrir(LUNDI);
  const v = await fr.evaluate(() => ({
    rev: document.getElementById('rev-stats').innerText,
    proj: document.getElementById('proj-stats').innerText,
  }));
  /* écrits en dur, ils valaient encore 39 h et 23 h : l'ancien planning. */
  ok(nb(v.rev) === '29,9', 'objectif révision = 29,9 h de travail réel (34 h de blocs, pauses exclues, Anki matinal du mercredi) : ' + nb(v.rev));
  ok(nb(v.proj) === '18,9', 'objectif projets perso = 18,9 h (bloc du dimanche 13:30, matins du vendredi et du dimanche, Projets perso 3 de 50 min) : ' + nb(v.proj));
  await ctx.close();
}

console.log('\n== 84) L\'objectif du jour colle à la journée planifiée ==');
for(const [nom, quand, attendu] of [['lundi',LUNDI,'4 h 25'], ['vendredi',VENDREDI,'3 h 30'], ['samedi',SAMEDI,'4 h 25'], ['dimanche',DIMANCHE,'3 h 30']]){
  const { ctx, fr } = await ouvrir(quand);
  const t = await fr.evaluate(() => document.getElementById('cal-revision-sub').textContent);
  ok(t.indexOf('/ ' + attendu) > -1, nom + ' : objectif ' + attendu + ' — ' + t);
  await ctx.close();
}

console.log('\n== 85) L\'objectif de sommeil suit le coucher de la VEILLE ==');
for(const [nom, quand, attendu] of [['lundi (veille dim. 21:00, lever 05:30)',LUNDI,'8,5'], ['samedi (veille ven. 21:55)',SAMEDI,'7,6'], ['dimanche (veille sam. 21:00)',DIMANCHE,'8,5']]){
  const { ctx, fr } = await ouvrir(quand);
  const t = await fr.evaluate(() => document.getElementById('jr-sleep-sub').textContent);
  ok(t.indexOf('/ ' + attendu + ' h') > -1, nom + ' → ' + attendu + ' h : ' + t);
  await ctx.close();
}
{
  /* une nuit conforme au planning doit valoir 100%, pas 94% */
  const { ctx, fr } = await ouvrir(LUNDI, {'batcave-journal-2026-09-06': {sommeil:'8', water:0}});
  const pct = await fr.evaluate(() => {
    const j = JSON.parse(localStorage.getItem('batcave-journal-2026-09-06'));
    return { veille: j.sommeil };
  });
  ok(pct.veille === '8', 'la nuit de dimanche est bien lue : ' + pct.veille + ' h');
  await ctx.close();
}

console.log('\n== 86) Matinée : séance d\'1 h et petit-déjeuner rapproché ==');
{
  const { ctx, fr } = await ouvrir(LUNDI);
  const l = await fr.evaluate(() => [...document.querySelectorAll('#cal-timeline li')]
    .map(x => x.querySelector('.t-time').textContent + ' ' + x.querySelector('label').textContent.trim()));
  ok(l[0] === '05:30 Sport' && l[1] === '06:30 Douche + préparation', 'sport 05:30 → 06:30 : ' + l.slice(0,2).join(' | '));
  ok(l.some(x => x.startsWith('06:45 Petit-déjeuner')), 'petit-déjeuner + Coran à 06:45');
  ok(l.some(x => x.startsWith('07:20 Anki 1')), 'la révision (Anki 1) démarre toujours à 07:20');
  await ctx.close();
}

console.log('\n== 87) Micro-sieste : les 7 jours, jamais pendant Jumu\'ah ==');
for(const [nom, quand, heure, apres] of [
  ['lundi', LUNDI, '12:40', 'Déjeuner'],
  ['vendredi', VENDREDI, '14:30', "Jumu'ah"],
  ['samedi', SAMEDI, '13:10', 'Déjeuner'],
  ['dimanche', DIMANCHE, '13:10', 'Déjeuner']]){
  const { ctx, fr } = await ouvrir(quand);
  const l = await fr.evaluate(() => [...document.querySelectorAll('#cal-timeline li')]
    .map(x => x.querySelector('.t-time').textContent + ' ' + x.querySelector('label').textContent.trim()));
  const i = l.findIndex(x => /Micro-sieste/.test(x));
  ok(i > -1 && l[i].startsWith(heure), nom + ' : sieste à ' + heure + ' — ' + (l[i] || 'absente'));
  ok(i > 0 && new RegExp(apres).test(l[i-1]), nom + ' : elle suit ' + apres + ' — ' + (l[i-1] || '—'));
  await ctx.close();
}

console.log('\n== 88) Dimanche : repos puis 2 h de batch cooking ==');
{
  const { ctx, fr } = await ouvrir(DIMANCHE);
  const l = await fr.evaluate(() => [...document.querySelectorAll('#cal-timeline li')]
    .map(x => x.querySelector('.t-time').textContent + ' ' + x.querySelector('label').textContent.trim()));
  ok(l.some(x => x.startsWith('14:30 Repos')), 'repos à partir de 14:30 (après Projets perso 2)');
  const bc = l.findIndex(x => /Batch cooking/.test(x));
  ok(bc > -1 && l[bc].startsWith('16:00'), 'batch cooking à 16:00 : ' + (l[bc] || 'absent'));
  ok(bc > -1 && l[bc+1] && l[bc+1].startsWith('18:00'), 'il dure 2 h pleines — suivant : ' + (l[bc+1] || '—'));
  await ctx.close();
}

await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
