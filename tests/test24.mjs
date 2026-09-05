import { chromium } from 'playwright';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

console.log('\n== H) Fichier .html autonome (double-clic, hors artefact) ==');
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const page = await ctx.newPage();
  const pe = [];
  page.on('pageerror', e => pe.push(e.message));
  await page.goto('file://' + process.cwd() + '/batcave.html');
  await page.locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const rd = page.locator('#ritual-dismiss'); if(await rd.count()) await rd.click();
  await page.waitForTimeout(400);
  ok(pe.length === 0, 'aucune erreur JS en mode fichier : ' + (pe[0] || 'RAS'));

  const masques = await page.evaluate(() => [...document.querySelectorAll('[hidden]')]
      .filter(el => getComputedStyle(el).display !== 'none').length);
  ok(masques === 0, 'tous les éléments "hidden" sont réellement masqués : ' + masques + ' visible(s) à tort');

  // navigation complète sans erreur
  const pages = ['dashboard','bilan','insights','calendrier','agenda','journal','habitudes','addictions','repas','sport',
                 'coran','taches','budget','etudes','business','objectifs','vie','courses'];
  let bad = [];
  for(const p of pages){
    const found = await page.evaluate(pg => { const n=document.querySelector('.nav-btn[data-page="'+pg+'"]'); if(!n) return false; n.click(); return true; }, p);
    if(!found){ bad.push(p+':nav-absent'); continue; }
    await page.waitForTimeout(70);
    const st = await page.evaluate(() => { const a=document.querySelectorAll('.page.active'); return {n:a.length, vide:a.length?a[0].innerText.trim().length:0}; });
    if(st.n !== 1) bad.push(p+':pages-actives='+st.n);
    if(st.vide < 40) bad.push(p+':vide');
  }
  ok(bad.length === 0 && pe.length === 0, pages.length + ' pages navigables en mode fichier : ' + (bad.join(' ') || 'toutes OK'));

  // le Pomodoro marche aussi hors artefact
  await page.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(120);
  await page.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  const dialogue = await page.evaluate(() => !document.getElementById('ask-overlay').hidden);
  ok(dialogue, 'le sélecteur de matière s\'ouvre (pas de prompt() bloqué)');
  await page.evaluate(() => { const s=document.getElementById('ask-select'); s.value=[...s.options][0].value; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  const lance = await page.evaluate(() => !document.getElementById('timer-running').hidden);
  ok(lance, 'le minuteur démarre en mode fichier');
  await ctx.close();
}

await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
