import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { try{ localStorage.setItem('batcave-duree-bloc', '60'); }catch(e){} });   /* sessions d'1 h : la durée est accessoire ici */
  await ctx.addInitScript(x => { if(localStorage.getItem('__s')) return; localStorage.setItem('__s','1');
    Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: '+e.message); });
  await page.clock.install({ time: new Date('2026-09-03T21:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}

console.log('\n== 86) La fusion de l\'historique conserve le détail par matière ==');
{
  // deux entrées le même jour, chacune avec ses matières : la migration doit les additionner
  const { ctx, page, fr } = await ouvrir({'batcave-revision': [
    {id:'r1', date:'2026-09-02', duree:60,  matieres:{'Anatomía I':60}},
    {id:'r2', date:'2026-09-02', duree:120, matieres:{'Anatomía I':60, 'Bioquímica':60}},
    {id:'r3', date:'2026-09-01', duree:90,  matieres:{'Fisiología':90}},
  ]});
  const st = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-revision')||'[]'));
  const j2 = st.find(r => r.date === '2026-09-02');
  ok(st.length === 2, 'les 2 entrées du 02/09 sont fusionnées en une : ' + st.length + ' journées');
  ok(j2 && j2.duree === 180, 'durées additionnées : ' + (j2 && j2.duree) + ' min');
  ok(j2 && j2.matieres && j2.matieres['Anatomía I'] === 120 && j2.matieres['Bioquímica'] === 60,
     'le détail par matière est conservé ET additionné : ' + JSON.stringify(j2 && j2.matieres));

  const rep = await fr.evaluate(() => document.getElementById('rev-matieres-7').innerText.replace(/\s+/g,' '));
  ok(/Anatomía I 2,0h/.test(rep) && /Bioquímica 1,0h/.test(rep) && /Fisiología 1,5h/.test(rep),
     'la répartition « Par matière » est correcte : ' + rep);
  ok(!/Sans matière précisée/.test(rep), 'rien ne bascule en « Sans matière précisée »');
  await ctx.close();
}

console.log('\n== 87) Séparateur décimal français partout ==');
{
  const { ctx, page, fr } = await ouvrir({'batcave-revision': [
    {id:'r1', date:'2026-09-03', duree:150, matieres:{'Anatomía I':150}},
  ]});
  const rev = await fr.evaluate(() => document.getElementById('rev-stats').innerText.replace(/\s+/g,' '));
  ok(/2,5h/.test(rev) && !/2\.5/.test(rev), 'Révision — aujourd\'hui en virgule : ' + rev.slice(0,80));
  /* le panneau Espagnol a été retiré : on vérifie la virgule sur l'agenda à la place */
  const ag = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="agenda"]').click();
    return document.getElementById('ag-stats').innerText.replace(/\s+/g,' ');
  });
  ok(/2,5h/.test(ag) && !/2\.5/.test(ag), 'Agenda — total du mois en virgule : ' + ag.slice(0,80));
  const pageEtudes = await fr.evaluate(() => document.querySelector('.page[data-page="etudes"]').innerText);
  const points = (pageEtudes.match(/\d+\.\d+\s*h/g) || []);
  ok(points.length === 0, 'aucun nombre d\'heures avec un point sur la page : ' + (points.join(', ') || 'aucun'));
  await ctx.close();
}
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
