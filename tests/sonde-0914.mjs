/* Le matin du 14, avec les données réelles : ce que la Batcave affiche vraiment. */
import { chromium } from 'playwright';
import fs from 'fs';
const dir = '/tmp/cloud-verif/state';
const seed = {};
for(const f of fs.readdirSync(dir)) seed[f.replace(/\.json$/,'')] = JSON.parse(fs.readFileSync(dir+'/'+f,'utf8')).v;
const b = await chromium.launch();
for(const [w,h,quand] of [[1440,900,'2026-09-14T06:45:00+02:00'],[390,844,'2026-09-14T06:45:00+02:00']]){
  const ctx = await b.newContext({viewport:{width:w,height:h}, timezoneId:'Europe/Madrid', locale:'fr-FR', hasTouch:w<=1024});
  await ctx.addInitScript(()=>{window.claude=undefined;});
  await ctx.addInitScript(x=>{Object.keys(x).forEach(k=>localStorage.setItem(k,JSON.stringify(x[k])));}, seed);
  const p = await ctx.newPage();
  p.on('pageerror', e=>console.log('  PAGEERROR '+w+' : '+e.message));
  await p.clock.install({time:new Date(quand)});
  await p.goto('http://127.0.0.1:8199/host.html');
  await p.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached',timeout:20000});
  const fr = p.frames().find(x=>x.url().includes('batcave.html'));
  await fr.evaluate(()=>{document.querySelectorAll('.overlay').forEach(o=>o.hidden=true);});
  await p.waitForTimeout(600);
  const d = await fr.evaluate(()=>({
    score: document.getElementById('dash-score-num').textContent + document.getElementById('dash-score-unit').textContent,
    note: document.getElementById('dash-score-detail').textContent,
    focus: (document.getElementById('dash-focus')||{}).innerText.replace(/\s+/g,' ').slice(0,140),
    plan: [...document.querySelectorAll('#dash-plan li')].slice(0,5).map(l=>l.innerText.replace(/\s+/g,' ').slice(0,70)),
    temps: (document.getElementById('dash-temps')||{}).innerText.replace(/\s+/g,' ').slice(0,150),
    retards: (()=>{ const o=window.__bcObjectifs().map(x=>({t:x.titre, s:window.__bcComparer(x).statut})); return o.filter(x=>x.s==='retard').map(x=>x.t); })(),
    barre: (document.querySelector('.bc-r.bc-priorite')||{}).innerText || '—'
  }));
  console.log('\n===== ' + w + 'px, 14 sept 06:45 =====');
  console.log(JSON.stringify(d,null,1));
  await ctx.close();
}
await b.close();
