import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(seed) await ctx.addInitScript(s => {
    if(localStorage.getItem('__seed')) return;
    localStorage.setItem('__seed','1');
    Object.keys(s).forEach(k => localStorage.setItem(k, JSON.stringify(s[k])));
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T10:00:00+02:00') });   // mercredi : objectif 5 h
  await page.goto(URL);
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => {
    const r = document.getElementById('ritual-dismiss'); if(r) r.click();
    document.querySelectorAll('.overlay:not([hidden])').forEach(o => { const b = o.querySelector('.edel'); if(b) b.click(); });
  });
  await page.waitForTimeout(200);
  return { ctx, page, fr };
}

console.log('\n== 32) Temps du jour sur le tableau de bord ==');
{
  const { ctx, fr } = await ouvrir({
    'batcave-revision': [{id:'r1', date:'2026-09-02', duree:150, matieres:{'Anatomía I':150}}],
    'batcave-projets':  [{id:'p1', date:'2026-09-02', projet:'Boutique', duree:90}],
    'batcave-espagnol': [{id:'e1', date:'2026-09-02', activite:'Conversation', duree:45, niveau:'A2', dele:''}],
    'batcave-revision-fusionnee': true
  });
  const d = await fr.evaluate(() => ({
    cells: [...document.querySelectorAll('#dash-temps .temps-cell')].map(c => c.innerText.replace(/\s+/g,'')),
    total: document.getElementById('dash-temps-total').textContent,
    barres: document.querySelectorAll('#dash-temps .progress-fill').length,
    largeur: document.querySelector('#dash-temps .progress-fill').style.width,
    page: document.querySelector('.page.active').dataset.page
  }));
  ok(d.page === 'dashboard', 'visible sans changer de page');
  ok(d.cells.length === 2, 'deux compteurs — révision et projets perso : ' + d.cells.join(' | '));
ok(/Révision2,5h\/5h/.test(d.cells[0]), 'révision avec objectif du jour : ' + d.cells[0]);
ok(/Projetsperso1,5h/.test(d.cells[1]), 'projets perso du jour : ' + d.cells[1]);
  ok(/4,0 h au total/.test(d.total), 'total = révision + projets, sans espagnol : ' + d.total);
  /* depuis B3, les projets perso ont aussi une cible du jour derivee du planning (3 h en
     semaine) : deux jauges, la premiere toujours a 50 % de 5 h. */
  ok(d.barres === 2 && d.largeur === '50%', 'deux jauges (révision et projets), révision à 50 % de 5 h (' + d.largeur + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir(null);
  const d = await fr.evaluate(() => ({
    total: document.getElementById('dash-temps-total').textContent,
    vides: document.querySelectorAll('#dash-temps .temps-cell.vide').length,
    cours: document.querySelector('#dash-temps .temps-cell').innerText.replace(/\s+/g,'')
  }));
  ok(/rien encore aujourd'hui/.test(d.total), 'journée vierge : ' + d.total);
  ok(d.vides === 2, 'les deux compteurs sont grisés');
  ok(/0,0h\/5h/.test(d.cours), 'objectif tout de même rappelé : ' + d.cours);
  await ctx.close();
}
{
  // le compteur suit un bloc terminé, sans changer de page
  const { ctx, page, fr } = await ouvrir(null);
  await fr.evaluate(() => document.getElementById('dash-pomodoro').click());
  await page.waitForTimeout(200);
  await fr.evaluate(() => { document.getElementById('ask-select').value = 'Bioquímica'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(500);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await page.waitForTimeout(250);
  const d = await fr.evaluate(() => ({
    cours: document.querySelector('#dash-temps .temps-cell').innerText.replace(/\s+/g,''),
    total: document.getElementById('dash-temps-total').textContent,
    serie: document.getElementById('dash-serie').textContent
  }));
  ok(/1,0h\/5h/.test(d.cours), 'après un bloc de cours : ' + d.cours);
  ok(/1,0 h au total/.test(d.total), 'total mis à jour : ' + d.total);
  ok(/Série : 1 jour/.test(d.serie), 'série affichée à côté du bouton : ' + d.serie.trim());
  await ctx.close();
}
{
  // un bloc projet n'alimente QUE la colonne projets
  const { ctx, page, fr } = await ouvrir(null);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.getElementById('biz-pomodoro-projet').click());
  await page.waitForTimeout(200);
  await fr.evaluate(() => { document.getElementById('ask-input').value = 'Boutique'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(500);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await page.waitForTimeout(250);
  const cells = await fr.evaluate(() => [...document.querySelectorAll('#dash-temps .temps-cell')].map(c => c.innerText.replace(/\s+/g,'')));
  ok(/Révision0,0h/.test(cells[0]), 'la révision reste à zéro : ' + cells[0]);
  ok(/Projetsperso1,0h/.test(cells[1]), 'le temps va bien aux projets : ' + cells[1]);
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
