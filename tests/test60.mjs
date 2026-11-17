/* Une case hebdomadaire : une coche posée le lendemain se rattache à son jour (la migration habitlog-hebdo-v1), elle
   se coche dans « Ma journée » le jour où elle tombe, et la veille la montre cochée.
   17 novembre : « Courses faites », sur qui ce test reposait, est retirée (le tri) ; « Passer le balai », sa case à lui
   du samedi (un seul jour, « jour:6 »), prend sa place. La série, les taux et le lien avec la liste de courses
   n'existent plus (plus de suivi des cases). */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
/* journal hérité : une coche du dimanche 30 août (avant le correctif) pour le balai du samedi 29 */
await ctx.addInitScript(() => { window.claude = undefined; try{ if(!sessionStorage.getItem('__seme')){
  localStorage.setItem('batcave-habits', JSON.stringify([{id:'hab1788303536189', label:'Passer le balai', jour:6}]));
  localStorage.setItem('batcave-habitlog', JSON.stringify({'hab1788303536189':['2026-08-30']})); sessionStorage.setItem('__seme', '1'); } }catch(e){} });
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-12T11:00:00+02:00') });   /* samedi */
await page.goto(URL, {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
let fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(300);
const aller = async (p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(120); };
const journal = () => fr.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habitlog'))['hab1788303536189'] || []);
const caseBalai = () => fr.evaluate(() => { const cb = document.querySelector('input[data-mj-hab="hab1788303536189"]'); return cb ? cb.checked : null; });

console.log('\n== 198) Migration : la coche du dimanche 30 août est rattachée au samedi 29 ==');
{
  ok(JSON.stringify(await journal()) === '["2026-08-29"]', 'journal : ' + JSON.stringify(await journal()));
  ok(await fr.evaluate(() => (window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habitlog-hebdo-v1') === 'true'), 'drapeau batcave-habitlog-hebdo-v1 posé');
}

console.log('\n== 199) Samedi 12 : le balai se coche dans « Ma journée », et le reste ==');
{
  await aller('journee');
  ok(await caseBalai() === false, 'la case est là, pas encore cochée');
  await fr.evaluate(() => document.querySelector('input[data-mj-hab="hab1788303536189"]').click());
  await page.waitForTimeout(150);
  const j = await journal();
  ok(j.indexOf('2026-09-12') > -1, 'journal : samedi 12 — ' + JSON.stringify(j));
  await page.reload({timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  await aller('journee');
  ok(await caseBalai() === true, 'au rechargement, elle est toujours cochée');
}

console.log('\n== 200) Dimanche 13 : elle n\'est pas dans la journée ; la veille la montre cochée ==');
{
  await page.clock.setSystemTime(new Date('2026-09-13T12:00:00+02:00'));
  await page.reload({timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  await aller('journee');
  ok(await caseBalai() === null, 'dimanche : pas de case « balai »');
  const veille = await fr.evaluate(() => { window.__bcJournee.aller('2026-09-12'); return [...document.querySelectorAll('#mj-routine li, #mj-cases li')].map(x => x.textContent).filter(t => /balai/.test(t))[0] || ''; });
  ok(/^✓ /.test(veille), 'la veille, le balai est marqué fait : « ' + veille + ' »');
}
await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
