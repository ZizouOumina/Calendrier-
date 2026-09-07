/* QA visuelle : chaque page photographiée avec un jeu de données réaliste, plus les
   fenêtres clés (rituel d'ouverture, clôture du jour, plein écran Pomodoro, revue du
   dimanche) et deux pages en iPad portrait. Les images vont dans /tmp/qa/. */
import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'http://127.0.0.1:8199/host.html';
fs.mkdirSync('/tmp/qa', { recursive: true });
const MOCK = () => {
  const mcp = {
    callTool(){ return Promise.resolve({content:[], payload:{}}); },
    watchTool(server, tool, input, handler){ Promise.resolve().then(() => handler({type:'error', error:{code:'server_not_connected', message:'x'}})); return () => {}; },
    invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
};
const seed = (() => {
  const ms = (iso, hm) => new Date(iso + 'T' + hm + ':00+02:00').getTime();
  const sessions = [];
  const jours = ['2026-08-24','2026-08-25','2026-08-26','2026-08-27','2026-08-28','2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04'];
  const blocs = [['07:35','08:20','cours','Anatomía'],['08:20','09:20','cours','Anatomía'],['09:20','10:20','cours','Histología'],['10:20','11:20','cours','Histología'],['11:20','12:20','projet','DS'],['13:00','14:00','projet','DS'],['20:30','21:30','cours','Histología']];
  jours.forEach((iso, i) => blocs.forEach((b, k) => {
    const dow = new Date(iso + 'T12:00:00').getDay();
    if(dow === 5 && (b[0] === '13:00')) return;
    sessions.push({id:'s' + i + '-' + k, date: iso, debut: ms(iso, b[0]), fin: ms(iso, b[1]), duree: Math.round((ms(iso, b[1]) - ms(iso, b[0])) / 60000), type: b[2], label: b[3]});
  }));
  /* aujourd'hui : Anki 1 et Anki 2 faits */
  [['07:20','08:20','cours','Anatomía'],['08:20','09:20','cours','Anatomía']].forEach((b, k) => sessions.push({id:'t' + k, date:'2026-09-07', debut: ms('2026-09-07', b[0]), fin: ms('2026-09-07', b[1]), duree: 60, type: b[2], label: b[3]}));
  const s = { 'batcave-sessions': sessions, 'batcave-examens': {'Anatomía': '2026-09-25', 'Histología': '2026-10-02'}, 'batcave-sport-log': [] };
  ['2026-08-28','2026-08-29','2026-08-30','2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05','2026-09-06'].forEach((iso, i) => { s['batcave-journal-' + iso] = {sommeil: String(6 + (i % 3) * 0.5), mood: 3 + (i % 3), notes: 'Journée ' + (i + 1), poids: String(72 + i * 0.1), water: 6, coran: '1', duaa: ''}; });
  s['batcave-journal-2026-09-07'] = {sommeil: '6.5', mood: 4, notes: '', poids: '73.1', water: 3, coran: '', duaa: ''};
  s['batcave-revision'] = jours.map((iso, i) => ({id:'rev' + i, date: iso, duree: 300, matieres: {'Histología': 200, 'Anatomía': 100}}));
  ['2026-08-24','2026-08-27','2026-08-31','2026-09-03'].forEach((iso, i) => { s['batcave-sport-log'].push({id:'sl' + i, date: iso, type:'haut', exo:'Tractions', series:[8,8,8], charge: 0, unite:'reps'}); s['batcave-sport-log'].push({id:'sq' + i, date: iso, type:'haut', exo:'Pompes', series:[15 + i, 14 + i, 12 + i], charge: 0, unite:'reps'}); });
  return s;
})();
const browser = await chromium.launch();
async function contexte(vp){
  const ctx = await browser.newContext({ viewport: vp, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  PAGEERROR: ' + e.message));
  await page.clock.install({ time: new Date('2026-09-07T12:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  return { ctx, page, fr };
}
const pages = ['dashboard','bilan','insights','calendrier','agenda','journal','habitudes','addictions','repas','sport','coran','taches','budget','etudes','business','objectifs','vie','courses'];
{
  const { ctx, page, fr } = await contexte({width:1440, height:900});
  await page.waitForTimeout(600);
  await page.screenshot({ path:'/tmp/qa/00-rituel-ouverture.png' });
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  for(const p of pages){
    await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p);
    await page.waitForTimeout(350);
    const h = await fr.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path:'/tmp/qa/' + String(pages.indexOf(p) + 1).padStart(2, '0') + '-' + p + '.png', fullPage: true });
    console.log(p, 'hauteur', h);
  }
  /* clôture du jour */
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(400);
  await page.screenshot({ path:'/tmp/qa/19-cloture.png' });
  await fr.evaluate(() => { const b = document.getElementById('cloture-close') || document.getElementById('cloture-plus-tard'); if(b) b.click(); });
  /* plein écran Pomodoro */
  await fr.evaluate(() => { const b = document.getElementById('timer-pomodoro'); if(b) b.click(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path:'/tmp/qa/20-pomodoro-lance.png' });
  const focusBtn = await fr.evaluate(() => { const b = document.querySelector('#timer-focus, [data-focus], #focus-btn, button[title*="plein"]'); if(b){ b.click(); return b.id || b.textContent; } return null; });
  await page.waitForTimeout(400);
  await page.screenshot({ path:'/tmp/qa/21-focus.png' });
  console.log('focus bouton :', focusBtn);
  await ctx.close();
}
/* revue du dimanche */
{
  const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  PAGEERROR: ' + e.message));
  await page.clock.install({ time: new Date('2026-09-06T18:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  const ouvert = await fr.evaluate(() => { const b = document.querySelector('#bc-revue, #revue-btn, [data-revue], #dash-revue-btn, button[id*="revue"]'); if(b){ b.click(); return b.id; } const p = document.getElementById('revue-panel'); return p ? 'panel:' + (p.hidden ? 'hidden' : 'visible') : null; });
  await page.waitForTimeout(400);
  await page.screenshot({ path:'/tmp/qa/22-revue-dimanche.png', fullPage: true });
  console.log('revue :', ouvert);
  await ctx.close();
}
/* iPad portrait */
{
  const { ctx, page, fr } = await contexte({width:820, height:1180});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  for(const p of ['dashboard','insights','calendrier','repas']){
    await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p);
    await page.waitForTimeout(350);
    await page.screenshot({ path:'/tmp/qa/ipad-' + p + '.png', fullPage: false });
  }
  await ctx.close();
}
await browser.close();
console.log('FIN');
