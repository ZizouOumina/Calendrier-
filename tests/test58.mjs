/* Business alimenté par Shopify (ventes mensuelles, boutique suivie, changement de boutique) et vestige « cours ». */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

const MOCK = (cfg) => {
  window.__appels = [];
  window.__shop = cfg.shop || {name:'Ma boutique 3', domain:'bedwbj-0e.myshopify.com', planName:'trial', currencyCode:'EUR'};
  /* forme REELLE observée le 5 sept. 2026 pour TIMESERIES month */
  window.__ventes = cfg.ventes || {query:'', columns:[{name:'month'},{name:'orders'},{name:'gross_sales'},{name:'net_sales'},{name:'total_sales'}], rows:[], rowCount:0, shopDomain:'bedwbj-0e.myshopify.com'};
  const mcp = {
    watchTool(server, tool, input, handler){
      window.__appels.push({server, tool, input});
      Promise.resolve().then(() => {
        if(tool === 'get-shop-info') handler({type:'data', result:{payload: window.__shop}});
        else if(tool === 'run-analytics-query' && /TIMESERIES month/.test(input.query)) handler({type:'data', result:{payload: window.__ventes}});
        else if(tool === 'run-analytics-query') handler({type:'data', result:{payload:{rows:[["0","0","0"]]}}});
        else if(tool === 'list-orders') handler({type:'data', result:{payload:{totalCount:0, rows:[]}}});
        else handler({type:'error', error:{code:'server_not_connected', message:'x'}});
      });
      return () => {};
    },
    callTool(server, tool, input, opts){
      window.__appels.push({server, tool, input, opts});
      if(tool === 'switch-shop'){ window.__shop = {name:'Boutique Deux', domain:'deux.myshopify.com', planName:'basic', currencyCode:'EUR'}; return Promise.resolve({content:[], payload:{}}); }
      if(tool === 'get-shop-info') return Promise.resolve({content:[], payload: window.__shop});
      return Promise.resolve({content:[], payload:{}});
    },
    invalidate(){ window.__appels.push({tool:'invalidate'}); return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
};
async function ouvrir(quand, opts){
  opts = opts || {};
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(opts.mock) await ctx.addInitScript(MOCK, opts.mock); else await ctx.addInitScript(() => { window.claude = undefined; });
  if(opts.local) await ctx.addInitScript(x => { try{ if(sessionStorage.getItem('__a58')) return; sessionStorage.setItem('__a58','1'); }catch(e){} Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, opts.local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelector('.nav-btn[data-page="business"]').click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const texte = (fr, sel) => fr.evaluate(s => (document.querySelector(s) || {innerText:''}).innerText.replace(/\s+/g,' ').trim(), sel);
const MARDI = '2026-09-08T10:00:00+02:00';
const VENTES = {query:'', columns:[{name:'month'},{name:'orders'},{name:'gross_sales'},{name:'net_sales'},{name:'total_sales'}],
  rows:[["2025-09-01","0","0","0","0"],["2026-07-01","3","120.5","110.25","131.9"],["2026-08-01","5","240","220.4","262"],["2026-09-01","1","40","40","48"]], rowCount:4, shopDomain:'bedwbj-0e.myshopify.com'};

console.log('\n== 220) Les mois avec des ventes arrivent tout seuls, les mois à zéro non ==');
{
  const { ctx, fr } = await ouvrir(MARDI, { mock: { ventes: VENTES } });
  const biz = await local(fr, 'batcave-business');
  ok(Array.isArray(biz) && biz.length === 3, '3 mois créés (juillet, août, septembre), pas le mois à zéro (' + (biz && biz.length) + ')');
  const aout = biz && biz.find(b => b.moisISO === '2026-08');
  ok(!!aout && aout.ca === 220.4 && aout.brut === 240 && aout.commandes === 5 && aout.source === 'shopify' && aout.domaine === 'bedwbj-0e.myshopify.com' && aout.mois === 'Août 2026', 'août : CA net 220,40 €, 5 commandes, étiqueté Shopify (' + JSON.stringify(aout) + ')');
  const l = await texte(fr, '#biz-list');
  ok(/Août 2026/.test(l) && /Shopify/.test(l) && /CA 220,4 €/.test(l) && /5 cmd/.test(l), 'la liste les montre : ' + l.slice(0, 90));
  const bq = await local(fr, 'batcave-shopify-boutique');
  ok(bq && bq.domain === 'bedwbj-0e.myshopify.com' && bq.name === 'Ma boutique 3', 'la boutique suivie est retenue');
  ok(/Boutique suivie : Ma boutique 3/.test(await texte(fr, '#biz-source-note')), 'et affichée sur la page Business');
  const banniere = await fr.evaluate(() => document.getElementById('coherence-banner').hidden);
  ok(banniere === true, 'aucune clé inconnue');
  await ctx.close();
}

console.log('\n== 221) Le bénéfice reste à toi : saisir le mois complète la ligne Shopify sans la doubler ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, { mock: { ventes: VENTES } });
  await fr.evaluate(() => { document.getElementById('bz-mois').value = '2026-08'; document.getElementById('bz-benef').value = '95'; document.getElementById('bz-pub').value = '30'; document.getElementById('bz-ca').value = '999'; document.getElementById('bz-add').click(); });
  await page.waitForTimeout(200);
  const biz = await local(fr, 'batcave-business');
  const aout = biz.filter(b => b.moisISO === '2026-08');
  ok(aout.length === 1 && Number(aout[0].benef) === 95 && Number(aout[0].pub) === 30 && aout[0].ca === 220.4, 'août : une seule ligne, bénéfice 95 €, pub 30 €, le CA reste celui de Shopify (pas 999)');
  ok(/net 95 €/.test(await texte(fr, '#biz-list')) && /95 \/ 5000 €/.test(await texte(fr, '#biz-progress-text')), 'la progression vers 5 000 € lit ce bénéfice');
  /* un mois sans vente saisi à la main reste manuel */
  await fr.evaluate(() => { document.getElementById('bz-mois').value = '2026-06'; document.getElementById('bz-ca').value = '10'; document.getElementById('bz-benef').value = '4'; document.getElementById('bz-add').click(); });
  await page.waitForTimeout(200);
  const biz2 = await local(fr, 'batcave-business');
  const juin = biz2.find(b => b.moisISO === '2026-06');
  ok(!!juin && juin.source === 'manuel' && Number(juin.ca) === 10 && biz2[0].moisISO === '2026-06', 'juin saisi à la main, trié en premier');
  await ctx.close();
}

console.log('\n== 222) Une relecture identique ne réécrit rien, une ligne existante garde son bénéfice ==');
{
  const { ctx, fr } = await ouvrir(MARDI, { mock: { ventes: VENTES }, local: {'batcave-business': [{id:'x1', mois:'Août 2026', moisISO:'2026-08', domaine:'bedwbj-0e.myshopify.com', ca:220.4, brut:240, commandes:5, benef:95, pub:30, source:'shopify'}]} });
  const biz = await local(fr, 'batcave-business');
  const aout = biz.filter(b => b.moisISO === '2026-08');
  ok(aout.length === 1 && aout[0].id === 'x1' && Number(aout[0].benef) === 95, 'la ligne d\'août existante est gardée (même id) avec son bénéfice, pas doublée');
  ok(biz.length === 3, 'juillet et septembre ajoutés à côté (' + biz.length + ' lignes)');
  await ctx.close();
}

console.log('\n== 223) Changer de boutique : switch-shop puis get-shop-info, la nouvelle boutique est suivie ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, { mock: { ventes: VENTES } });
  await fr.evaluate(() => document.getElementById('shopify-switch-btn').click());
  await page.waitForTimeout(100);
  await fr.evaluate(() => document.getElementById('ask-ok').click());
  await page.waitForTimeout(400);
  const appels = await fr.evaluate(() => window.__appels.map(a => a.tool));
  const iSwitch = appels.indexOf('switch-shop'), iInfo = appels.lastIndexOf('get-shop-info');
  ok(iSwitch > -1 && iInfo > iSwitch, 'switch-shop puis get-shop-info (ordre : ' + appels.filter(t => /switch|invalidate|get-shop/.test(t)).join(' → ') + ')');
  const bq = await local(fr, 'batcave-shopify-boutique');
  ok(bq && bq.domain === 'deux.myshopify.com' && bq.name === 'Boutique Deux', 'la nouvelle boutique est retenue');
  ok(/boutique suivie : Boutique Deux/.test(await texte(fr, '#shopify-switch-status')), 'statut : ' + await texte(fr, '#shopify-switch-status'));
  const l = await texte(fr, '#biz-list');
  ok(/bedwbj-0e\.myshopify\.com/.test(l) === false || /Août 2026/.test(l), 'les mois déjà lus restent listés');
  await ctx.close();
}

console.log('\n== 224) Vestige « cours » : effacé s\'il est vide, signalé s\'il a du contenu ==');
{
  const { ctx, fr } = await ouvrir(MARDI, { local: {'batcave-cours': [{annales:[], erreurs:[], id:'co1', matiereIdx:0, nom:'vbvb', ressenti:null}]} });
  ok(await local(fr, 'batcave-cours') === null, 'la fiche de test « vbvb » sans contenu est retirée');
  ok(await fr.evaluate(() => document.getElementById('coherence-banner').hidden) === true, 'aucune bannière');
  await ctx.close();
  const o = await ouvrir(MARDI, { local: {'batcave-cours': [{annales:['QCM 2025 : question 3'], erreurs:[], id:'co2', nom:'Anatomía'}]} });
  const b = await o.fr.evaluate(() => ({ cache: document.getElementById('coherence-banner').hidden, txt: document.getElementById('coherence-liste').innerText }));
  ok((await local(o.fr, 'batcave-cours')) !== null && b.cache === false && /batcave-cours/.test(b.txt), 'une fiche avec du contenu est gardée et signalée comme clé orpheline (à toi de supprimer)');
  await o.ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
