import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(seed) await ctx.addInitScript(x => { if(localStorage.getItem('__s')) return; localStorage.setItem('__s','1');
    Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: '+e.message); });
  await page.clock.install({ time: new Date('2026-09-03T20:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="agenda"]').click());
  await page.waitForTimeout(250);
  return { ctx, page, fr };
}

console.log('\n== 69) Vue 12 mois : repliée par défaut, se déploie au clic ==');
{
  const { ctx, page, fr } = await ouvrir({'batcave-revision': [
    {id:'a', date:'2026-09-02', duree:300, matieres:{'Anatomía I':300}},
    {id:'b', date:'2026-06-15', duree:60,  matieres:{'Fisiología':60}},
    {id:'c', date:'2025-06-01', duree:120, matieres:{'Bioquímica':120}},  // hors fenêtre 12 mois
  ]});
  let etat = await fr.evaluate(() => ({
    replie: document.getElementById('rev-annee').hidden,
    libelle: document.getElementById('rev-annee-toggle').textContent.trim(),
    cases: document.querySelectorAll('#rev-annee-grid .an-cell').length,
  }));
  ok(etat.replie && /▾$/.test(etat.libelle), 'repliée au départ : « ' + etat.libelle + ' »');
  ok(etat.cases === 0, 'rien n\'est calculé tant que c\'est replié (économie de rendu) : ' + etat.cases);

  await fr.evaluate(() => document.getElementById('rev-annee-toggle').click());
  await page.waitForTimeout(300);
  etat = await fr.evaluate(() => ({
    replie: document.getElementById('rev-annee').hidden,
    libelle: document.getElementById('rev-annee-toggle').textContent.trim(),
    cases: document.querySelectorAll('#rev-annee-grid .an-cell').length,
    mois: document.querySelectorAll('#rev-annee-mois span').length,
    resume: document.getElementById('rev-annee-resume').textContent,
  }));
  ok(!etat.replie && /▴$/.test(etat.libelle), 'déployée au clic : « ' + etat.libelle + ' »');
  ok(etat.cases >= 365 && etat.cases <= 372, 'environ un an de cases : ' + etat.cases);
  ok(etat.mois >= 12 && etat.mois <= 13, 'une étiquette par mois couvert : ' + etat.mois);
  ok(/6 h sur 2 jours travaillés/.test(etat.resume), 'résumé correct (300+60 min = 6h sur 2 jours, le jour hors fenêtre exclu) : ' + etat.resume);
  ok(/record 5,0 h/.test(etat.resume), 'record du jour identifié : ' + etat.resume);
  await ctx.close();
}

console.log('\n== 70) Intensités et infobulles ==');
{
  const { ctx, page, fr } = await ouvrir({'batcave-revision': [
    {id:'a', date:'2026-09-02', duree:30},   // n1  (<60)
    {id:'b', date:'2026-09-01', duree:120},  // n2  (60-149)
    {id:'c', date:'2026-08-31', duree:200},  // n3  (150-239)
    {id:'d', date:'2026-08-30', duree:300},  // n4  (>=240)
  ]});
  await fr.evaluate(() => document.getElementById('rev-annee-toggle').click());
  await page.waitForTimeout(300);
  const n = await fr.evaluate(() => ({
    n1: document.querySelectorAll('#rev-annee-grid .an-cell.n1').length,
    n2: document.querySelectorAll('#rev-annee-grid .an-cell.n2').length,
    n3: document.querySelectorAll('#rev-annee-grid .an-cell.n3').length,
    n4: document.querySelectorAll('#rev-annee-grid .an-cell.n4').length,
    titre: [...document.querySelectorAll('#rev-annee-grid .an-cell')].map(c=>c.title).find(t => /^2 septembre 2026/.test(t)),
  }));
  ok(n.n1===1 && n.n2===1 && n.n3===1 && n.n4===1, 'les 4 niveaux d\'intensité sont représentés : ' + JSON.stringify(n).slice(0,60));
  ok(/2 septembre 2026 — 0,5 h/.test(n.titre||''), 'infobulle avec date et durée : ' + n.titre);
  await ctx.close();
}

console.log('\n== 71) La vue se met à jour après une session, sans rechargement ==');
{
  const { ctx, page, fr } = await ouvrir({'batcave-revision': []});
  await fr.evaluate(() => document.getElementById('rev-annee-toggle').click());
  await page.waitForTimeout(250);
  const avant = await fr.evaluate(() => document.getElementById('rev-annee-resume').textContent);
  ok(/aucune session/.test(avant), 'départ à vide : ' + avant);
  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { const s=document.getElementById('ask-select'); s.value=[...s.options][0].value; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(500);
  const apres = await fr.evaluate(() => document.getElementById('rev-annee-resume').textContent);
  ok(/1 h sur 1 jours travaillés/.test(apres), 'la vue 12 mois suit la session terminée : ' + apres);
  await ctx.close();
}
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
