/* Audit : ouvre la Batcave avec ses données réelles à une date/heure donnée et écrit le texte de chaque onglet.
   node vider.mjs <iso datetime> <largeur> <sortie.txt> */
import { chromium } from 'playwright';
import fs from 'fs';
const [quand, w, sortie] = [process.argv[2], +process.argv[3] || 1440, process.argv[4]];
const seed = JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8'));
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:w,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
const p = await ctx.newPage();
let out = '';
p.on('pageerror', e => { out += 'PAGEERROR ' + e.message + '\n'; });
await p.clock.install({time:new Date(quand)});
await p.goto('http://127.0.0.1:' + (process.env.PORT || 8200) + '/host.html', {timeout:30000}).catch(()=>{});
await p.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:20000});
const fr = p.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:30000}).catch(()=>{});
const surcouches = await fr.evaluate(() => [...document.querySelectorAll('.overlay')].filter(o => !o.hidden).map(o => o.innerText.replace(/\n{2,}/g, '\n').slice(0, 3000)));
out += '######## ' + quand + ' · ' + w + 'px\n';
surcouches.forEach(s => { out += '==== SURCOUCHE OUVERTE ====\n' + s + '\n'; });
await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
await p.waitForTimeout(400);
const onglets = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(x => !x.hidden).map(x => [x.dataset.page, x.innerText.trim()]));
for(const [pg, nom] of onglets){
  await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), pg);
  await p.waitForTimeout(350);
  const t = await fr.evaluate(() => { const a = document.querySelector('.page.active'); return a ? a.innerText : ''; });
  out += '\n==== ONGLET ' + pg + ' (' + nom.replace(/\s+/g, ' ') + ') ====\n' + t.replace(/\n{2,}/g, '\n') + '\n';
  /* les sous-onglets du groupe (Repas : Meal prep, Courses ; Semaine : Objectifs, Système) */
  const sous = await fr.evaluate(() => [...document.querySelectorAll('.sous-onglet[data-sousnav]')].filter(x => x.offsetParent !== null && !x.classList.contains('on')).map(x => x.dataset.sousnav));
  for(const sp of [...new Set(sous)]){
    await fr.evaluate(x => { const b = [...document.querySelectorAll('.sous-onglet[data-sousnav="' + x + '"]')].find(y => y.offsetParent !== null); if(b) b.click(); }, sp);
    await p.waitForTimeout(350);
    const t2 = await fr.evaluate(() => { const a = document.querySelector('.page.active'); return a ? a.innerText : ''; });
    out += '\n==== SOUS-ONGLET ' + sp + ' ====\n' + t2.replace(/\n{2,}/g, '\n') + '\n';
  }
}
const ban = await fr.evaluate(() => { const c = document.getElementById('coherence-banner'); return c && !c.hidden ? c.innerText : ''; });
if(ban) out += '\n==== BANNIÈRE DE COHÉRENCE ====\n' + ban + '\n';
fs.writeFileSync(sortie, out);
console.log(sortie, out.length, 'caractères', onglets.map(x => x[0]).join(' '));
await b.close();
