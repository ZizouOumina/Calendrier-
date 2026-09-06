/* Surcharge progressive : journal series × reps, double progression, cible, PR, courbe. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#sport-grid').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelector('.nav-btn[data-page="sport"]').click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
/* Programme v2 : lundi = Haut lourd (Tractions 4×6-12 en premier). Lundi 12 oct. 2026 = semaine 6,
   tours complets ; lundi 7 sept. = semaine 1, moitié des tours. */
const LUNDI = '2026-10-12T06:30:00+02:00';
const SAMEDI = '2026-10-17T06:30:00+02:00';
const PREMIER_LUNDI = '2026-09-07T06:30:00+02:00';

console.log('\n== 107) Première séance : cible = tours × bas de fourchette ==');
{
  const { ctx, fr } = await ouvrir(LUNDI);
  const t = await fr.evaluate(() => document.querySelector('.sport-card.today').innerText);
  ok(/Haut lourd/.test(t) && /Tractions/.test(t) && /première séance/.test(t), 'la séance du jour est Haut lourd et n\'a pas d\'historique');
  ok(/cible 6\/6\/6\/6/.test(t), 'Tractions 4×6-12 → cible 6/6/6/6 : ' + (t.match(/cible [^\n]*/) || [''])[0]);
  const ph = await fr.evaluate(() => document.querySelector('.sport-card.today [data-series]').placeholder);
  ok(ph === '6/6/6/6', 'le champ propose la cible en placeholder (' + ph + ')');
  ok(/1 · Tractions \+ Dips/.test(t) && /repos 45 s \/ 90 s/.test(t), 'les paires et les repos du lundi sont affichés');
  await ctx.close();
}

console.log('\n== 107b) Montée en charge : semaine 1 = moitié des tours ==');
{
  const { ctx, fr } = await ouvrir(PREMIER_LUNDI);
  const t = await fr.evaluate(() => document.querySelector('.sport-card.today').innerText);
  ok(/cible 6\/6(?!\/)/.test(t), 'semaine 1 : Tractions 4 tours → 2 tours, cible 6/6 : ' + (t.match(/cible [^\n]*/) || [''])[0]);
  const note = await fr.evaluate(() => document.getElementById('programme-note').textContent);
  ok(/semaine 1/.test(note) && /½/.test(note), 'note du programme : ' + note);
  const off = await fr.evaluate(() => [...document.querySelectorAll('.sport-card')].map(c => c.innerText).filter(t => /Off/.test(t))[0] || '');
  ok(/Jour off/.test(off), 'la carte Off dit « Jour off » et n\'a rien à cocher');
  await ctx.close();
}

console.log('\n== 108) Saisir des séries enregistre le journal et coche l\'exercice ==');
{
  const { ctx, fr, page } = await ouvrir(LUNDI);
  await fr.evaluate(() => {
    const inp = document.querySelector('.sport-card.today [data-series]');   /* Tractions */
    inp.value = '8/7/6/6'; inp.dispatchEvent(new Event('change', {bubbles:true}));
  });
  await page.waitForTimeout(250);
  const log = await local(fr, 'batcave-sport-log');
  ok(Array.isArray(log) && log.length === 1 && log[0].exo === 'Tractions' && JSON.stringify(log[0].series) === '[8,7,6,6]', 'journal : Tractions 8/7/6/6 (' + JSON.stringify(log && log[0] && log[0].series) + ')');
  const st = await local(fr, 'batcave-sport-2026-10-12');
  ok(st && st['Haut lourd-0'] === true, 'l\'exercice est coché automatiquement');
  ok(await fr.evaluate(() => document.querySelector('.sport-card.today li').classList.contains('checked')), 'la ligne apparaît cochée');
  await fr.evaluate(() => { const inp = document.querySelector('.sport-card.today [data-series]'); inp.value = ''; inp.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(200);
  ok((await local(fr, 'batcave-sport-log')).length === 0 && (await local(fr, 'batcave-sport-2026-10-12'))['Haut lourd-0'] === false, 'vider → journal vide et case décochée');
  await ctx.close();
}

console.log('\n== 109) Double progression ==');
{
  /* dernière 8/7/6/6 → cible 9/8/7/7 ; toutes au haut (15/15/15) → monter : 10/10/10 @2,5 kg */
  const { ctx, fr } = await ouvrir(LUNDI, { 'batcave-sport-log': [
    {id:'a', date:'2026-10-05', type:'Haut lourd', exo:'Tractions', series:[8,7,6,6], charge:0, unite:'reps'},
    {id:'b', date:'2026-10-05', type:'Haut lourd', exo:'Rows australiens pieds surélevés', series:[15,15,15], charge:0, unite:'reps'}
  ]});
  const t = await fr.evaluate(() => document.querySelector('.sport-card.today').innerText);
  ok(/dernière 8\/7\/6\/6/.test(t) && /cible 9\/8\/7\/7/.test(t), 'Tractions : dernière 8/7/6/6 → cible 9/8/7/7');
  ok(/cible 10\/10\/10 @2,5 kg · monter/.test(t), 'Rows 15/15/15 (haut de 10-15) → monter : 10/10/10 @2,5 kg : ' + (t.match(/cible 10[^\n]*/) || [''])[0]);
  await ctx.close();
  const s2 = await ouvrir(SAMEDI, { 'batcave-sport-log': [{id:'c', date:'2026-10-10', type:'Bras · épaules · mollets', exo:'Dead hang', series:[30,30,30], charge:0, unite:'s'}] });
  const t2 = await s2.fr.evaluate(() => document.querySelector('.sport-card.today').innerText);
  ok(/cible 35\/35\/35 s/.test(t2), 'Dead hang 30 s → +5 s : 35/35/35 s');
  ok(/dernière 30\/30\/30 s/.test(t2), 'les secondes sont affichées avec leur unité');
  await s2.ctx.close();
}

console.log('\n== 110) Record, panneau de progression et courbe ==');
{
  const { ctx, fr, page } = await ouvrir(LUNDI, { 'batcave-sport-log': [
    {id:'a', date:'2026-10-05', type:'Haut lourd', exo:'Tractions', series:[6,5,5,5], charge:0, unite:'reps'},
    {id:'b', date:'2026-10-08', type:'Haut volume', exo:'Tractions', series:[7,6,5,5], charge:0, unite:'reps'}
  ]});
  await fr.evaluate(() => { const inp = document.querySelector('.sport-card.today [data-series]'); inp.value = '8/7/6/6'; inp.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(250);
  const t = await fr.evaluate(() => document.querySelector('.sport-card.today').innerText);
  ok(/PR/.test(t), 'nouveau volume record → badge PR');
  const p = await fr.evaluate(() => ({ liste: document.getElementById('progression-liste').innerText, svg: !!document.querySelector('#progression-chart svg'), sel: document.getElementById('progression-exo').value }));
  ok(p.sel === 'Tractions' && p.svg, 'courbe de Tractions tracée (3 séances)');
  ok(/Tractions[\s\S]*dernière 8\/7\/6\/6[\s\S]*record 27/.test(p.liste), 'la liste montre dernière séance, tendance et record : ' + p.liste.split('\n')[0]);
  ok(/↑ \+4/.test(p.liste), 'tendance +4 par rapport à la séance précédente (23 → 27)');
  await ctx.close();
}

console.log('\n== 111) Le tableau de bord annonce les cibles du jour, et le jour off ==');
{
  const { ctx, fr } = await ouvrir(LUNDI, { 'batcave-sport-log': [{id:'a', date:'2026-10-05', type:'Haut lourd', exo:'Tractions', series:[8,7,6,6], charge:0, unite:'reps'}] });
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="dashboard"]').click(); const b = document.getElementById('dash-more-toggle'); if(document.getElementById('dash-more').hidden) b.click(); });
  const t = await fr.evaluate(() => document.getElementById('dash-sport').innerText);
  ok(/Cibles : Tractions 9\/8\/7\/7/.test(t), 'Sport aujourd\'hui : « Cibles : Tractions 9/8/7/7 … » (' + t.replace(/\s+/g,' ').slice(0, 90) + ')');
  await ctx.close();
  const off = await ouvrir('2026-10-14T06:30:00+02:00');   /* mercredi : off */
  await off.fr.evaluate(() => { document.querySelector('.nav-btn[data-page="dashboard"]').click(); const b = document.getElementById('dash-more-toggle'); if(document.getElementById('dash-more').hidden) b.click(); });
  const t2 = await off.fr.evaluate(() => document.getElementById('dash-sport').innerText);
  ok(/Jour off/.test(t2) && /Haut volume/.test(t2), 'mercredi : « Jour off … prochaine séance : Haut volume » (' + t2.replace(/\s+/g,' ').slice(0, 80) + ')');
  await off.ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
