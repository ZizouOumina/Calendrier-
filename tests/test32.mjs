import { chromium } from 'playwright';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
console.log('\n== 81) Dates françaises : « 1ᵉʳ » et majuscule au seul premier mot ==');
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(x => { if(localStorage.getItem('__s')) return; localStorage.setItem('__s','1');
    Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); },
    {'batcave-revision': [{id:'a', date:'2026-09-01', duree:120, matieres:{'Anatomía I':120}}]});
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: '+e.message); });
  await page.clock.install({ time: new Date('2026-09-01T10:00:00+02:00') });   // le 1er du mois
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);

  const salut = await fr.evaluate(() => document.getElementById('dash-greeting').textContent);
  ok(/mardi 1ᵉʳ septembre/.test(salut), 'tableau de bord : « 1ᵉʳ » et non « 1 » : ' + salut);

  /* l'ancien encart #cal-rev-detail a disparu : l'en-tête du jour des trois vues
     agenda porte désormais la date, avec la même règle de capitalisation. */
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(300);
  const detail = await fr.evaluate(() => document.getElementById('rv-jlabel').innerText);
  ok(/^Mardi 1ᵉʳ septembre/.test(detail.trim()), 'en-tête du jour : majuscule au 1er mot seulement : « ' + detail.trim() + ' »');

  /* la vue 12 mois a été déplacée d'Études vers l'Agenda Batcave */
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="agenda"]').click());
  await page.waitForTimeout(300);
  await fr.evaluate(() => document.getElementById('rev-annee-toggle').click());
  await page.waitForTimeout(350);
  const bulle = await fr.evaluate(() => [...document.querySelectorAll('#rev-annee-grid .an-cell')].map(c=>c.title).find(t => /2,0 h/.test(t)));
  ok(/1ᵉʳ septembre 2026 — 2,0 h/.test(bulle||''), 'infobulle 12 mois : ' + bulle);

  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="repas"]').click());
  await page.waitForTimeout(200);
  const repas = await fr.evaluate(() => document.getElementById('meal-day-label').textContent);
  ok(/mardi 1ᵉʳ septembre/.test(repas), 'page Repas : ' + repas);
  await ctx.close();
}
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
