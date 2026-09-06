/* Habitude hebdomadaire « Courses faites » : une liste finie un dimanche se rattache au
   samedi, la série et les taux la voient, le tableau de bord et Habitudes sont d'accord. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
/* journal hérité : une coche du dimanche 30 août (avant le correctif) pour le samedi 29 */
await ctx.addInitScript(() => { window.claude = undefined; try{ localStorage.setItem('batcave-habitlog', JSON.stringify({'core-courses':['2026-08-30']})); }catch(e){} });
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-06T11:00:00+02:00') });   /* dimanche */
await page.goto(URL, {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
let fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(300);
const aller = async (p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(80); };
const txt = (sel) => fr.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel);
const carte = () => fr.evaluate(() => ([...document.querySelectorAll('#habits-grid .card')].find(c => c.querySelector('[data-togglehab="core-courses"]')) || {}).innerText || '');

console.log('\n== 198) Migration : la date du dimanche 30 août est rattachée au samedi 29 ==');
{
  const log = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-habitlog')));
  ok(JSON.stringify(log['core-courses']) === '["2026-08-29"]', 'journal : ' + JSON.stringify(log['core-courses']));
  ok(await fr.evaluate(() => localStorage.getItem('batcave-habitlog-hebdo-v1') === 'true'), 'drapeau batcave-habitlog-hebdo-v1 posé');
  await aller('habitudes');
  const c = await carte();
  ok(/1\s*jour/i.test(c) && /Marquer fait \(samedi\)/.test(c), 'Habitudes : série 1 jour, bouton « Marquer fait (samedi) » — ' + JSON.stringify(c).slice(0, 120));
}

console.log('\n== 199) Liste de courses finie le dimanche → coche du samedi 5, série 2 ==');
{
  await aller('courses');
  for(let i = 0; i < 40; i++){
    const encore = await fr.evaluate(() => { const cb = document.querySelector('#courses-grid input:not(:checked)'); if(!cb) return false; cb.click(); return true; });
    if(!encore) break;
    await page.waitForTimeout(30);
  }
  ok(/^18\/18 articles/.test(await txt('#courses-summary')), 'Courses : 18/18 articles (' + await txt('#courses-summary') + ')');
  const log = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-habitlog'))['core-courses']);
  ok(log.indexOf('2026-09-05') > -1 && log.indexOf('2026-09-06') < 0, 'journal : samedi 5 septembre, pas dimanche 6 — ' + JSON.stringify(log));
  await aller('habitudes');
  const c = await carte();
  ok(/2\s*jours/i.test(c) && /Fait samedi/.test(c), 'Habitudes : série 2, « Fait samedi » — ' + JSON.stringify(c).slice(0, 120));
  ok(/7j 100%/.test(c), 'taux 7 jours : 100 % (un seul samedi applicable, tenu)');
  /* décocher un article → l'habitude se décoche, la série retombe à 1 */
  await aller('courses');
  await fr.evaluate(() => document.querySelector('#courses-grid input:checked').click());
  await page.waitForTimeout(100);
  await aller('habitudes');
  ok(/1\s*jour\b/i.test(await carte()) && !/2\s*jours/i.test(await carte()), 'un article décoché → série 1');
}

console.log('\n== 200) Samedi : « Fait aujourd\'hui », le tableau de bord la liste ==');
{
  await page.clock.setSystemTime(new Date('2026-09-12T12:00:00+02:00'));
  await page.reload({timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  ok(await fr.evaluate(() => !!document.querySelector('#dash-checklist [data-togglehab="core-courses"]')), 'tableau de bord : l\'habitude Courses est listée le samedi');
  await fr.evaluate(() => document.querySelector('#dash-checklist [data-togglehab="core-courses"]').click());
  await page.waitForTimeout(150);
  const log = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-habitlog'))['core-courses']);
  ok(log.indexOf('2026-09-12') > -1, 'journal : samedi 12 — ' + JSON.stringify(log));
  await aller('courses');
  ok(/^18\/18 articles/.test(await txt('#courses-summary')), 'Courses : cocher l\'habitude remplit la liste');
  await aller('habitudes');
  ok(/Fait aujourd'hui/.test(await carte()), 'Habitudes : « Fait aujourd\'hui » le samedi');
}
await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
