import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const page = await ctx.newPage();
const consoleErrs = [];
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
page.on('console', m => { if(m.type()==='error' && !/ERR_|net::|Failed to load resource/.test(m.text())) consoleErrs.push(m.text()); });
await page.clock.install({ time: new Date('2026-09-03T08:00:00+02:00') });
await page.goto(URL);
await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(200);

console.log('\n== A) Journée type : révision Pomodoro complète ==');
await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
await page.waitForTimeout(150);
await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
await page.waitForTimeout(150);
await fr.evaluate(() => { const s=document.getElementById('ask-select'); s.value=[...s.options][0].value; document.getElementById('ask-ok').click(); });
await page.waitForTimeout(200);
await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);
const apresBloc = await fr.evaluate(() => {
  const t = JSON.parse(localStorage.getItem('batcave-timer')||'null');
  const rev = JSON.parse(localStorage.getItem('batcave-revision')||'[]');
  return { mode: t && t.mode, revMin: rev.reduce((a,r)=>a+Number(r.duree||0),0) };
});
ok(apresBloc.mode === 'pause', 'la pause de 5 min démarre toute seule après le bloc : ' + apresBloc.mode);
ok(apresBloc.revMin === 60, '60 min enregistrées en révision : ' + apresBloc.revMin);

console.log('\n== B) Les 3 compteurs du tableau de bord suivent ==');
const dash = await fr.evaluate(() => {
  document.querySelector('.nav-btn[data-page="dashboard"]').click();
  return [...document.querySelectorAll('#dash-temps .temps-cell')].map(c => c.innerText.replace(/\s+/g,''));
});
ok(/1,0h/.test(dash[0]), 'Cours : ' + dash[0]);
ok(dash.length === 2 && /0,0h/.test(dash[1]), 'Projets perso à zéro (séparation respectée) : ' + dash[1]);

console.log('\n== C) Agenda des révisions + journal des blocs ==');
const cal = await fr.evaluate(() => {
  document.querySelector('.nav-btn[data-page="etudes"]').click();
  const c = document.querySelector('#rv-grid [data-agjour="2026-09-03"]');
  return c ? c.innerText.replace(/\s+/g,'') : '(absent)';
});
ok(/1,0h/.test(cal), 'la journée du 3 sept. affiche 1,0h : ' + cal);
const blocs = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-sessions')||'[]').length);
ok(blocs === 1, 'exactement 1 bloc journalisé (pas de doublon) : ' + blocs);

console.log('\n== D) Budget : transaction + camemberts ==');
await fr.evaluate(() => document.querySelector('.nav-btn[data-page="budget"]').click());
await page.waitForTimeout(150);
await fr.evaluate(() => {
  document.getElementById('tx-type').value = 'Entrée';
  document.getElementById('tx-type').dispatchEvent(new Event('change'));
  document.getElementById('tx-cat').value = 'Shopify';
  document.getElementById('tx-montant').value = '1200';
  document.getElementById('tx-add').click();
});
await page.waitForTimeout(250);
const pie = await fr.evaluate(() => ({
  parts: document.querySelectorAll('#budget-pie-entrees svg path, #budget-pie-entrees svg circle').length,
  txt: document.getElementById('budget-pie-entrees').innerText.replace(/\s+/g,' '),
  solde: document.querySelectorAll('#budget-stats .stat-tile')[2].innerText.replace(/\s+/g,''),
}));
ok(pie.parts === 1 && /Shopify 1200/.test(pie.txt), 'camembert Entrées à 100% Shopify : ' + pie.txt);
ok(/13/.test(pie.solde), 'le solde se recalcule : ' + pie.solde);

console.log('\n== E) Habitude cochée → score + bilan ==');
await fr.evaluate(() => document.querySelector('.nav-btn[data-page="habitudes"]').click());
await page.waitForTimeout(150);
await fr.evaluate(() => document.querySelector('[data-togglehab]').click());
await page.waitForTimeout(200);
const score = await fr.evaluate(() => {
  document.querySelector('.nav-btn[data-page="dashboard"]').click();
  return document.getElementById('dash-score-num').textContent;
});
ok(Number(score) > 0, 'le score du jour bouge après une habitude cochée : ' + score);

console.log('\n== F) Zéro erreur console sur toutes les pages ==');
const pages = ['dashboard','bilan','insights','calendrier','agenda','journal','habitudes','addictions','repas','sport',
               'coran','taches','budget','etudes','business','objectifs','vie','courses'];
for(const p of pages){
  await fr.evaluate(pg => document.querySelector('.nav-btn[data-page="'+pg+'"]').click(), p);
  await page.waitForTimeout(90);
}
ok(consoleErrs.length === 0, 'aucune erreur console : ' + (consoleErrs.slice(0,3).join(' | ') || 'RAS'));

console.log('\n== G) Persistance après rechargement ==');
await page.reload();
await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
await page.waitForTimeout(400);
const apresReload = await fr2.evaluate(() => {
  document.querySelector('.nav-btn[data-page="dashboard"]').click();
  return {
    temps: document.querySelectorAll('#dash-temps .temps-cell')[0].innerText.replace(/\s+/g,''),
    rev: JSON.parse(localStorage.getItem('batcave-revision')||'[]').reduce((a,r)=>a+Number(r.duree||0),0),
    tx: JSON.parse(localStorage.getItem('batcave-transactions')||'[]').length,
  };
});
ok(/1,0h/.test(apresReload.temps) && apresReload.rev === 60, 'révision conservée après rechargement : ' + apresReload.temps);
ok(apresReload.tx > 0, 'transactions conservées : ' + apresReload.tx);

await ctx.close();
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
