import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: '+e.message); });
  await page.clock.install({ time: new Date('2026-09-03T08:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(200);
  return { ctx, page, fr };
}

console.log('\n== 61) Durée de bloc au choix (25 / 45 / 60) ==');
{
  const { ctx, page, fr } = await ouvrir();
  const chips = await fr.evaluate(() => [...document.querySelectorAll('#timer-durees [data-duree]')].map(b => ({d:b.dataset.duree, actif:b.classList.contains('active')})));
  ok(chips.length === 3 && chips.map(c=>c.d).join(',') === '25,45,60', '3 durées proposées : ' + chips.map(c=>c.d).join('/'));
  ok(chips.find(c=>c.d==='60').actif, '60 min sélectionné par défaut (comportement inchangé)');

  // on choisit 25 min et on lance un bloc Cours
  await fr.evaluate(() => document.querySelector('#timer-durees [data-duree="25"]').click());
  await page.waitForTimeout(150);
  const memorise = await fr.evaluate(() => ({
    pref: JSON.parse(localStorage.getItem('batcave-duree-bloc')),
    actif: document.querySelector('#timer-durees [data-duree="25"]').classList.contains('active'),
  }));
  ok(memorise.pref === 25 && memorise.actif, 'le choix 25 min est mémorisé : ' + memorise.pref);

  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { const s=document.getElementById('ask-select'); s.value=[...s.options][0].value; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(250);
  const lance = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-timer')||'null'));
  ok(lance && lance.durationMin === 25, 'le bloc démarre bien à 25 min : ' + (lance && lance.durationMin));
  ok(lance && lance.dureeTravail === 25, 'la durée est mémorisée dans l\'état du minuteur');

  // fin du bloc → pause de 5 min, puis bloc suivant à 25 min lui aussi
  await page.clock.fastForward('00:25:01'); await page.waitForTimeout(400);
  const pause = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-timer')||'null'));
  ok(pause && pause.mode === 'pause' && pause.durationMin === 5, 'pause de 5 min enchaînée : ' + (pause && pause.durationMin));
  const rev1 = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-revision')||'[]').reduce((a,r)=>a+Number(r.duree||0),0));
  ok(rev1 === 25, '25 min comptabilisées (pas 60) : ' + rev1);

  await page.clock.fastForward('00:05:01'); await page.waitForTimeout(400);
  const suivant = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-timer')||'null'));
  ok(suivant && suivant.mode === 'travail' && suivant.durationMin === 25, 'le bloc suivant reprend à 25 min : ' + (suivant && suivant.durationMin));
  await ctx.close();
}

console.log('\n== 62) Changer la préférence ne casse pas une série en cours ==');
{
  const { ctx, page, fr } = await ouvrir();
  await fr.evaluate(() => document.querySelector('#timer-durees [data-duree="45"]').click());
  await page.waitForTimeout(120);
  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { const s=document.getElementById('ask-select'); s.value=[...s.options][0].value; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(250);
  // en pleine série, on change la préférence pour 60
  await fr.evaluate(() => document.querySelector('#timer-durees [data-duree="60"]').click());
  await page.waitForTimeout(150);
  await page.clock.fastForward('00:45:01'); await page.waitForTimeout(400);
  await page.clock.fastForward('00:05:01'); await page.waitForTimeout(400);
  const suivant = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-timer')||'null'));
  ok(suivant && suivant.durationMin === 45, 'la série en cours reste à 45 min malgré le changement : ' + (suivant && suivant.durationMin));
  const rev = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-revision')||'[]').reduce((a,r)=>a+Number(r.duree||0),0));
  ok(rev === 45, '45 min enregistrées : ' + rev);
  await ctx.close();
}
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
