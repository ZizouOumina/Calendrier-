import { chromium } from 'playwright';
// le bouton Cours demande maintenant la matière : on répond au dialogue
async function lancerCours(fr, page, matiere){
  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(120);
  await fr.evaluate(m => {
    if(document.getElementById('ask-overlay').hidden) return;
    const sel = document.getElementById('ask-select');
    if(!sel.hidden){
      const dispo = [...sel.options].map(o => o.value);
      sel.value = dispo.indexOf(m) > -1 ? m : dispo[0];
    } else {
      document.getElementById('ask-input').value = m || '';
    }
    document.getElementById('ask-ok').click();
  }, matiere || '');
  await page.waitForTimeout(150);
}

const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

console.log('\n== 4) Migration de l\'historique existant ==');
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => {
    if(localStorage.getItem('__seeded')) return;   // le rechargement ne doit pas re-semer l'historique
    localStorage.setItem('__seeded', '1');
    localStorage.setItem('batcave-revision', JSON.stringify([
      {id:'r1', date:'2026-08-30', duree:60},
      {id:'r2', date:'2026-08-30', duree:45},
      {id:'r3', date:'2026-08-30', duree:25},
      {id:'r4', date:'2026-08-31', duree:90},
      {id:'r5', date:'2026-09-01', duree:30},
      {id:'r6', date:'2026-09-01', duree:30}
    ]));
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T11:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  const ls = async (k) => await fr.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } }, k);
  const rev = await ls('batcave-revision');
  ok(rev.length === 3, '6 entrées -> 3 journées (obtenu: ' + rev.length + ')');
  const byDate = {}; rev.forEach(r => byDate[r.date] = r.duree);
  ok(byDate['2026-08-30'] === 130, '30/08 : 60+45+25 = 130 min (obtenu: ' + byDate['2026-08-30'] + ')');
  ok(byDate['2026-08-31'] === 90, '31/08 : 90 min inchangé');
  ok(byDate['2026-09-01'] === 60, '01/09 : 30+30 = 60 min (obtenu: ' + byDate['2026-09-01'] + ')');
  ok(await ls('batcave-revision-fusionnee') === true, 'drapeau de migration posé');
  const total = rev.reduce((s,r)=>s+r.duree,0);
  ok(total === 280, 'aucune minute perdue (280 min)');
  // rechargement : la migration ne rejoue pas et n'abîme rien
  await page.reload();
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  const rev2 = await fr2.evaluate(() => JSON.parse(localStorage.getItem('batcave-revision')));
  ok(rev2.length === 3 && rev2.reduce((s,r)=>s+r.duree,0) === 280, 'rechargement : toujours 3 lignes / 280 min');
  await ctx.close();
}

console.log('\n== 5) Mac + iPad : pas de débordement, cibles tactiles, plein écran ==');
const configs = [
  ['Mac 13"',        1280, 800,  false],
  ['Mac 14"',        1440, 900,  false],
  ['Mac 16"',        1680, 1050, false],
  ['Écran externe',  1920, 1080, false],
  ['iPad paysage',   1180, 820,  true],
  ['iPad portrait',  820,  1180, true],
  ['iPad 9 paysage', 1080, 810,  true],
  ['iPad 9 portrait',810,  1080, true],
  ['iPad mini port.',744,  1133, true]
];
const pages = ['dashboard','etudes','budget','business','habitudes','bilan','insights','calendrier','agenda',
               'addictions','coran','courses','journal','objectifs','repas','sport','taches','vie'];
for(const [nom,w,h,touch] of configs){
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, hasTouch:touch, isMobile:false, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const page = await ctx.newPage();
  let pe = 0; page.on('pageerror', e => { pe++; console.log('  PAGEERROR ['+nom+']: ' + e.message); });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay:not([hidden])').forEach(o => { const b = o.querySelector('.btn'); if(b) b.click(); }); });
  let bad = [];
  for(const pg of pages){
    const found = await fr.evaluate(p => { const n = document.querySelector('.nav-btn[data-page="'+p+'"]'); if(!n) return false; n.click(); return true; }, pg);
    if(!found){ bad.push(pg+':nav-absent'); continue; }
    await page.waitForTimeout(90);
    const ov = await fr.evaluate(p => { const a = document.querySelectorAll('.page.active');
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth,
               actives:a.length, nom: a.length ? a[0].dataset.page : null, vide: a.length ? a[0].innerText.trim().length : 0 }; }, pg);
    if(ov.sw > ov.cw + 1) bad.push(pg+':+'+(ov.sw-ov.cw)+'px');
    if(ov.actives !== 1) bad.push(pg+':pages-actives='+ov.actives);
    if(ov.nom !== pg) bad.push(pg+':affiche='+ov.nom);
    if(ov.vide < 40) bad.push(pg+':page-vide('+ov.vide+')');
  }
  ok(bad.length === 0 && pe === 0, nom + ' ' + w + '×' + h + (touch?' (tactile)':'') + ' — ' + (bad.length ? bad.join(' ') : 'aucun débordement, ' + pages.length + ' pages OK'));
  // plein écran sur cette taille
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await lancerCours(fr, page, 'Anatomía I');
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.getElementById('timer-focus').click());
  await page.waitForTimeout(150);
  const fo = await fr.evaluate(() => { const o = document.getElementById('focus-overlay'); const r = o.getBoundingClientRect(); const t = document.getElementById('focus-time').getBoundingClientRect();
    return { hidden:o.hidden, w:r.width, h:r.height, tw:t.width, sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth,
             btns:[...o.querySelectorAll('.btn')].map(b=>Math.round(b.getBoundingClientRect().height)) }; });
  const btnMin = Math.min(...fo.btns);
  ok(!fo.hidden && fo.tw <= fo.w && fo.sw <= fo.cw + 1 && (!touch || btnMin >= 38),
     '   plein écran ' + Math.round(fo.w) + '×' + Math.round(fo.h) + ', chrono ' + Math.round(fo.tw) + 'px, boutons ' + btnMin + 'px');
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
