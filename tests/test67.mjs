/* Lot 20 — Atelier (R16) : six mois de données rejoués avant chaque publication.
   On vérifie que la Batcave chargée avec 180 jours d'historique reste rapide, sans
   erreur, que chaque carte Insights a des données, et que rien ne déborde sur iPhone. */
import { chromium } from 'playwright';
import { jeu180, FIN } from './jeu-180.mjs';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const SEED = jeu180();

async function ouvrir(vue){
  const ctx = await browser.newContext(Object.assign({timezoneId:'Europe/Madrid', locale:'fr-FR'}, vue));
  await ctx.addInitScript(() => { window.claude = undefined; });
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, SEED);
  const page = await ctx.newPage();
  const pe = [];
  page.on('pageerror', e => pe.push(e.message));
  await page.clock.install({ time: new Date(FIN + 'T18:30:00+01:00') });
  const t0 = Date.now();
  await page.goto(URL, {timeout:30000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:25000 });
  const ms = Date.now() - t0;
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r && !document.getElementById('opening-ritual-overlay').hidden) r.click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr, ms, pe };
}

console.log('\n== 260) Six mois de données : ça charge, ça calcule, ça n\'explose pas ==');
{
  const { ctx, page, fr, ms, pe } = await ouvrir({viewport:{width:1440,height:900}});
  ok(pe.length === 0, 'aucune erreur JS avec 180 jours d\'historique : ' + (pe[0] || 'RAS'));
  ok(ms < 8000, 'chargement complet en ' + ms + ' ms (seuil 8 s)');
  const d = await fr.evaluate(() => ({
    score: Number((document.getElementById('dash-score-num') || {}).textContent || 0),
    plan: document.getElementById('dash-plan').innerText.trim().length,
    habitudes: document.querySelectorAll('#dash-checklist li').length,
    temps: document.getElementById('dash-temps').innerText.replace(/\s+/g, ' ').slice(0, 40)
  }));
  ok(d.score > 0 && d.plan > 20, 'le tableau de bord calcule un score (' + d.score + ' %) et un plan');
  ok(d.habitudes >= 1, 'la check-list du jour est là (' + d.habitudes + ' lignes, les acquises en sont sorties)');
  await ctx.close();
}

console.log('\n== 261) Chaque carte Insights a des données ==');
{
  const { ctx, fr } = await ouvrir({viewport:{width:1440,height:900}});
  const ins = await fr.evaluate(() => window.__bcInsights().map(i => ({t:i.title, n:i.n || 0, a:!!i.action, s:i.score})));
  ok(ins.length === 9, '9 cartes calculées (' + ins.length + ')');
  const sansDonnees = ins.filter(i => !i.n).map(i => i.t);
  ok(sansDonnees.length === 0, 'toutes les cartes ont des points de données' + (sansDonnees.length ? ' — sauf : ' + sansDonnees.join(', ') : ''));
  ok(ins.filter(i => i.a).length >= 5, ins.filter(i => i.a).length + ' cartes proposent une action');
  const t0 = Date.now();
  await fr.evaluate(() => window.__bcInsights());
  ok(Date.now() - t0 < 3000, 'un recalcul complet des insights en ' + (Date.now() - t0) + ' ms');
  await ctx.close();
}

console.log('\n== 262) Bilan, objectifs et courbes sur six mois ==');
{
  const { ctx, page, fr } = await ouvrir({viewport:{width:1440,height:900}});
  const b = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="bilan"]').click();
    return { cartes: document.querySelectorAll('#bilan-grid .bilan-card').length,
             points: document.querySelectorAll('#score-chart circle, #score-chart path').length,
             revue: document.querySelectorAll('#rv-list li').length,
             journal: document.querySelectorAll('#journal-hist .jr-b').length };
  });
  ok(b.cartes === 9, '9 cartes de bilan (' + b.cartes + ')');
  ok(b.points > 0, 'la courbe du score est tracée');
  ok(b.revue >= 1 && b.journal >= 10, 'la revue et l\'historique du journal sont bien sur la page Semaine (' + b.revue + ' revue(s), ' + b.journal + ' journées)');
  const o = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="objectifs"]').click();
    const l = [...document.querySelectorAll('#obj-liste .obj-row')].map(r => r.innerText.replace(/\s+/g, ' '));
    return { n: l.length, retard: l.filter(x => /en retard/.test(x)).length, saison: !document.getElementById('saison-cloturer').hidden };
  });
  ok(o.n >= 6, o.n + ' objectifs du mois affichés');
  ok(o.saison, 'à quatre jours de la fin de l\'horizon, le bouton « Clôturer la saison » est là');
  await ctx.close();
}

console.log('\n== 263) iPhone : rien ne déborde, tout est lisible ==');
{
  const { ctx, page, fr, pe } = await ouvrir({viewport:{width:390,height:844}, hasTouch:true, isMobile:true, deviceScaleFactor:3});
  const pages = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(b => !b.hidden).map(b => b.dataset.page));
  /* douze onglets, plus Business : ce jeu de données contient des mois de boutique */
  ok(pages.length === 13 && pages.indexOf('business') > -1, 'douze onglets + Business (la boutique a des chiffres) : ' + pages.join(' '));
  let deborde = [];
  for(const p of pages){
    await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p);
    await page.waitForTimeout(120);
    const ov = await fr.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth}));
    if(ov.sw > ov.cw + 1) deborde.push(p + ':+' + (ov.sw - ov.cw) + 'px');
  }
  ok(deborde.length === 0, 'aucun débordement horizontal sur les douze onglets : ' + (deborde.join(' ') || 'RAS'));
  ok(pe.length === 0, 'aucune erreur JS sur iPhone : ' + (pe[0] || 'RAS'));
  await ctx.close();
}

await browser.close();
console.log(errs ? '\nFAILS: ' + errs : '\nTOUT OK (test67)');
process.exit(errs ? 1 : 0);
