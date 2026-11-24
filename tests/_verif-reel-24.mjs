/* Ouvre la Batcave avec SES DONNÉES RÉELLES (DONNEES=<fichier.json>) : le mardi 24 (jour 1, au réveil), le mardi 24 midi
   sur téléphone et le dimanche 29 (ménage, brosses, photos). Signale erreurs, débordements, et montre « Ma journée ». */
import { chromium } from 'playwright';
import fs from 'fs';
const seed = JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8'));
console.log('clés réelles chargées :', Object.keys(seed).length);
const b = await chromium.launch();
let errs = 0;
for(const [w, h, quand, voir] of [[1440, 900, '2026-11-24T05:25:00+01:00', 'jour1'], [390, 844, '2026-11-24T12:00:00+01:00', ''], [390, 844, '2026-11-29T15:00:00+01:00', 'dimanche']]){
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
  console.log('\n' + quand + ' · ' + w + 'px · ' + onglets.length + ' onglets');
  for(const pg of onglets){
    await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), pg);
    await p.waitForTimeout(120);
    const r = await fr.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
                                        vide: (document.querySelector('.page.active') || {}).innerText ? document.querySelector('.page.active').innerText.trim().length : 0}));
    if(r.sw > r.cw + 1){ errs++; console.log('  DÉBORDEMENT ' + pg + ' : +' + (r.sw - r.cw) + 'px'); }
    if(r.vide < 40){ errs++; console.log('  PAGE VIDE ' + pg + ' (' + r.vide + ')'); }
  }
  const coherence = await fr.evaluate(() => { const c = document.getElementById('coherence-banner'); return c && !c.hidden ? c.innerText.replace(/\s+/g,' ') : ''; });
  if(coherence) console.log('  ⚠️ bannière de cohérence : ' + coherence.slice(0, 300));
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText.split('\n').filter(Boolean).slice(0, 8).join(' / '));
  console.log('  plan : ' + plan.slice(0, 900));
  if(voir){
    await fr.evaluate(() => document.querySelector('.nav-btn[data-page="journee"]').click());
    await p.waitForTimeout(300);
    const txt = await fr.evaluate(() => document.querySelector('.page.active').innerText);
    const lignes = txt.split('\n').map(x => x.trim()).filter(Boolean);
    if(voir === 'jour1') console.log('  MA JOURNÉE (début) :\n    ' + lignes.slice(0, 45).join('\n    ').slice(0, 4500));
    else {
      const cles = lignes.filter(x => /brosses|Ménage|Photos|Pesée|Ongles|Brosse à dents|draps|Draps|laverie|Rasage/i.test(x));
      console.log('  DIMANCHE, lignes utiles :\n    ' + cles.join('\n    ').slice(0, 5000));
    }
  }
  await ctx.close();
}
await b.close();
console.log(errs ? '\n' + errs + ' PROBLÈME(S)' : '\nAUCUN PROBLÈME AVEC LES DONNÉES RÉELLES');
