import { chromium } from 'playwright';
import fs from 'fs';
const seed = JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8'));
const PORT = process.env.PORT || 8199;
const b = await chromium.launch();
async function ouvrir(quand, extra){
  const ctx = await b.newContext({viewport:{width:390,height:844}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(() => { window.claude = undefined; });
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, Object.assign({}, seed, extra || {}));
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('  PAGEERROR ' + e.message));
  await p.clock.install({time:new Date(quand)});
  await p.goto('http://127.0.0.1:' + PORT + '/host.html', {timeout:20000}).catch(()=>{});
  await p.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:15000});
  const fr = p.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
  return {ctx, p, fr};
}
{
  const {ctx, p, fr} = await ouvrir('2026-11-28T07:05:00+01:00');
  console.log('PLAN', await fr.evaluate(() => document.getElementById('dash-plan').innerText.split('\n').filter(x => /référence/i.test(x)).join(' | ')));
  console.log('CARTE SPORT', await fr.evaluate(() => document.getElementById('dash-sport').innerText.replace(/\n/g, ' / ').slice(0, 300)));
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="sport"]').click());
  await p.waitForTimeout(300);
  console.log('MAX', await fr.evaluate(() => { const x = document.getElementById('sport-maximums'); return x.hidden ? 'CACHÉ' : x.innerText.replace(/\n/g, ' / '); }));
  console.log('débordement', await fr.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await fr.evaluate(() => { document.getElementById('max-tractions').value = '6'; document.getElementById('max-dips').value = '8'; document.getElementById('max-pompes').value = '22'; document.getElementById('max-suspension').value = '45'; document.getElementById('max-ok').click(); });
  await p.waitForTimeout(300);
  console.log('APRÈS', await fr.evaluate(() => document.getElementById('sport-maximums').innerText.replace(/\n/g, ' / ').slice(0, 160)), '|', await fr.evaluate(() => localStorage.getItem('batcave-maximums')));
  console.log('VALEURS RELUES', await fr.evaluate(() => [...document.querySelectorAll('#sport-maximums input')].map(i => i.value).join(',')));
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  console.log('PLAN APRÈS', JSON.stringify(await fr.evaluate(() => document.getElementById('dash-plan').innerText.split('\n').filter(x => /référence/i.test(x)).join(' | '))), '· CARTE', await fr.evaluate(() => document.getElementById('dash-sport').innerText.split('\n').filter(x => /référence/.test(x)).join(' ')));
  await ctx.close();
}
const max = {'batcave-maximums': {'2026-11-28': {tractions:6, dips:8, pompes:22, suspension:45}}, 'batcave-sport-log': [{id: 'l-premiere', date: '2026-11-28', type: 'Bas · charnière', exo: 'Relevés de jambes suspendus', series: [10, 10, 10], charge: 0, unite: 'reps'}]};
for(const quand of ['2026-12-21T07:05:00+01:00', '2026-12-03T07:05:00+01:00']){
  const {ctx, p, fr} = await ouvrir(quand, max);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="sport"]').click());
  await p.waitForTimeout(300);
  console.log(quand.slice(0, 10), await fr.evaluate(() => { const x = document.getElementById('sport-maximums'); return x.hidden ? 'CACHÉ' : x.innerText.replace(/\n/g, ' / '); }), '· champs', await fr.evaluate(() => document.querySelectorAll('#sport-maximums input').length));
  await ctx.close();
}
{
  const {ctx, p, fr} = await ouvrir('2026-12-03T07:05:00+01:00', {'batcave-sport-log': [{id: 'l-premiere', date: '2026-11-28', type: 'Bas · charnière', exo: 'Relevés de jambes suspendus', series: [10, 10, 10], charge: 0, unite: 'reps'}]});
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="sport"]').click());
  console.log('séance du 28 cochée, rien noté, un jour ordinaire :', await fr.evaluate(() => document.getElementById('sport-maximums').hidden ? 'CACHÉ' : 'visible'));
  await ctx.close();
}
await b.close();
