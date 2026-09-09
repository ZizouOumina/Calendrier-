/* Ouvre la Batcave avec les DONNÉES RÉELLES du cloud (49 clés), parcourt les douze onglets
   et signale toute erreur de page ou tout débordement. */
import { chromium } from 'playwright';
import fs from 'fs';
const dir = '/tmp/cloud-verif/state';
const seed = {};
for(const f of fs.readdirSync(dir)){
  const cle = f.replace(/\.json$/, '');
  const doc = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  seed[cle] = doc.v;
}
console.log('clés réelles chargées :', Object.keys(seed).length);
const b = await chromium.launch();
let errs = 0;
for(const [w, h, quand] of [[1440, 900, '2026-09-14T10:20:00+02:00'], [390, 844, '2026-09-14T21:40:00+02:00']]){
  const ctx = await b.newContext({viewport:{width:w,height:h}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(() => { window.claude = undefined; });
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const p = await ctx.newPage();
  p.on('pageerror', e => { errs++; console.log('  PAGEERROR ' + w + 'px : ' + e.message); });
  await p.clock.install({time:new Date(quand)});
  await p.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(()=>{});
  await p.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:15000});
  const fr = p.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
  await p.waitForTimeout(500);
  const onglets = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(x => !x.hidden).map(x => x.dataset.page));
  console.log(w + 'px · ' + onglets.length + ' onglets : ' + onglets.join(' '));
  for(const pg of onglets){
    await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), pg);
    await p.waitForTimeout(120);
    const r = await fr.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
                                        vide: (document.querySelector('.page.active') || {}).innerText ? document.querySelector('.page.active').innerText.trim().length : 0}));
    if(r.sw > r.cw + 1){ errs++; console.log('  DÉBORDEMENT ' + pg + ' : +' + (r.sw - r.cw) + 'px'); }
    if(r.vide < 40){ errs++; console.log('  PAGE VIDE ' + pg + ' (' + r.vide + ')'); }
  }
  const coherence = await fr.evaluate(() => { const c = document.getElementById('coherence-banner'); return c && !c.hidden ? c.innerText.replace(/\s+/g,' ') : ''; });
  if(coherence) console.log('  ⚠️ bannière de cohérence : ' + coherence.slice(0, 200));
  const barre = await fr.evaluate(() => document.querySelector('.bc-bar').innerText.replace(/\n/g, ' | '));
  console.log('  barre : ' + barre.slice(0, 260));
  await ctx.close();
}
await b.close();
console.log(errs ? '\n' + errs + ' PROBLÈME(S)' : '\nAUCUN PROBLÈME AVEC LES DONNÉES RÉELLES');
