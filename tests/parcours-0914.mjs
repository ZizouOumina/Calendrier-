/* Parcours sur les VRAIES données du cloud après la remise à zéro du 9 septembre : avant le 14,
   le 14 (jour 1), un mercredi, un samedi, un dimanche. Aucune erreur JS, aucune incohérence,
   et ce que chaque écran dit. */
import { chromium } from 'playwright';
const browser = await chromium.launch();
/* La graine etait un fichier de sauvegarde du 9 septembre, jamais versionne et disparu
   depuis : le script echouait au premier import. Elle est desormais FABRIQUEE par
   l'application elle-meme -- on ouvre une Batcave vierge et on lui demande sa copie
   vierge (__bcCopieVierge), exactement ce que produit la remise a zero. Le parcours
   teste donc la meme chose qu'avant, sans dependre d'un fichier hors du depot. */
const seed = await (async () => {
  const ctx = await browser.newContext({ timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-09-13T12:00:00+02:00') });
  await p.goto('http://127.0.0.1:8199/host.html', {timeout:20000});
  await p.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const f = p.frames().find(x => x.url().includes('batcave.html'));
  await p.waitForTimeout(700);
  const g = await f.evaluate(() => {
    const out = {};
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.indexOf('batcave-') === 0){ try{ out[k] = JSON.parse(localStorage.getItem(k)); }catch(e){} }
    }
    return out;
  });
  await ctx.close();
  return g;
})();
let errs = 0;
async function ouvrir(quand){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR ' + quand + ' : ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(900);
  return { ctx, page, fr };
}
const txt = (fr, sel) => fr.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g,' ').trim() : null; }, sel);
for(const quand of ['2026-09-10T12:00:00+02:00', '2026-09-14T07:25:00+02:00', '2026-09-16T20:30:00+02:00', '2026-09-19T11:30:00+02:00', '2026-09-20T18:30:00+02:00']){
  const { ctx, page, fr } = await ouvrir(quand);
  const r = await fr.evaluate(() => {
    const t = s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g,' ').trim() : null; };
    const rituel = document.getElementById('opening-ritual-overlay'); const rit = rituel && !rituel.hidden; const rd = document.getElementById('ritual-dismiss'); if(rd && rit) rd.click();
    return {
      rituel: rit, coherence: document.getElementById('coherence-banner').hidden ? 'ok' : t('#coherence-liste'),
      grille: document.getElementById('bc-grille').hidden ? 'masqué' : t('#bc-grille .v'),
      sport: t('#programme-note'), temps: t('#dash-temps'), habits: t('#dash-check-count'),
      plan: (t('#dash-plan') || '').slice(0, 160), now: (document.querySelector('#cal-timeline li.now .t-label') || {}).textContent || null,
      addictions: [...document.querySelectorAll('section[data-page="addictions"] .card')].map(c => c.innerText.replace(/\s+/g,' ').slice(0, 40))
    };
  });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="objectifs"]').click());
  await page.waitForTimeout(300);
  const obj = await fr.evaluate(() => ({ periode: (document.getElementById('obj-periode') || {}).innerText, resume: (document.getElementById('obj-resume') || {}).innerText,
    lignes: [...document.querySelectorAll('#obj-liste .obj-row')].map(x => x.innerText.replace(/\s+/g,' ').slice(0, 110)) }));
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="habitudes"]').click());
  const hab = await fr.evaluate(() => [...document.querySelectorAll('#habits-grid .card')].map(c => c.innerText.replace(/\s+/g,' ').slice(0, 60)));
  console.log('\n=== ' + quand + ' ===');
  console.log(JSON.stringify(r, null, 1));
  console.log('OBJECTIFS', obj.periode, '|', (obj.resume || '').slice(0, 120)); obj.lignes.forEach(l => console.log('   ', l));
  console.log('HABITUDES (' + hab.length + ')'); hab.forEach(h => console.log('   ', h));
  await ctx.close();
}
await browser.close();
console.log(errs ? '\n' + errs + ' ERREUR(S) JS' : '\nAUCUNE ERREUR JS');
