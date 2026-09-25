import { chromium } from 'playwright';
import { seed, decalage } from './donnees-fictives.mjs';
const browser = await chromium.launch();
const ctrl = '2026-12-15';
const ctx = await browser.newContext({ viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Madrid', locale: 'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
await ctx.addInitScript(x => { if(!localStorage.getItem('batcave-schema')) Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed(ctrl));
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
page.on('dialog', d => d.accept('Anatomía I'));
await page.clock.install({ time: new Date(ctrl + 'T07:00:00' + decalage(ctrl)) });
await page.goto('http://127.0.0.1:8199/host.html').catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 30000 });
let fr = page.frames().find(x => x.url().includes('batcave.html'));
const avant = await fr.evaluate(() => { const o = {}; for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); o[k] = localStorage.getItem(k).length; } return o; });
/* une journee pleine : habitudes, repas, sport, calendrier, cloture complete, 4 Pomodoro */
await fr.evaluate(() => { ['ritual-dismiss'].forEach(id => { const r = document.getElementById(id); if(r) r.click(); }); });
await fr.evaluate(() => { document.querySelectorAll('#dash-checklist input[type="checkbox"]:not(:checked)').forEach(c => c.click()); });
await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="repas"]').click(); document.querySelectorAll('.page[data-page="repas"] input[type="checkbox"]:not(:checked)').forEach(c => c.click()); });
await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="calendrier"]').click(); document.querySelectorAll('.page[data-page="calendrier"] .timeline input[type="checkbox"]:not(:checked)').forEach((c, i) => { if(i < 20) c.click(); }); });
await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="sport"]').click(); document.querySelectorAll('.page[data-page="sport"] input[type="checkbox"]:not(:checked)').forEach(c => c.click()); });
for(let i = 0; i < 4; i++){
  await fr.evaluate(() => { const b = document.getElementById('dash-pomodoro') || document.querySelector('[data-plan-pomodoro]'); if(b) b.click(); const l = document.getElementById('ask-ok'); if(l && !document.getElementById('ask-overlay').hidden) l.click(); });
  await page.clock.runFor(56 * 60 * 1000);
  await fr.evaluate(() => { ['focus-done','focus-stop','focus-finish','timer-stop'].forEach(id => { const b = document.getElementById(id); if(b && b.offsetParent !== null) b.click(); }); const l = document.getElementById('ask-ok'); if(l && !document.getElementById('ask-overlay').hidden) l.click(); });
}
await page.clock.setSystemTime(new Date(ctrl + 'T21:00:00' + decalage(ctrl)));
await fr.evaluate(() => { document.getElementById('bc-cloture').click(); document.querySelector('[data-cl-mode="complet"]').click();
  const v = (id, x) => { const e = document.getElementById(id); if(e) e.value = x; };
  v('cl-sommeil', '7'); v('cl-aulit', '8'); v('cl-poids', '67.8'); v('cl-pas', '9500'); v('cl-coran', '84'); v('cl-duaa', 'Rabbi zidni ilma'); v('cl-note', 'Bonne journée, JJB dur, anatomie du membre supérieur revue deux fois.');
  document.querySelectorAll('#cl-habitudes [data-cl-hab]').forEach(b => b.click()); document.getElementById('cloture-valider').click(); const d = document.getElementById('demain-ok'); if(d) d.click(); });
const apres = await fr.evaluate(() => { const o = {}; for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); o[k] = localStorage.getItem(k).length; } return o; });
let total = 0; const lignes = [];
for(const k of Object.keys(apres)){ const d = apres[k] - (avant[k] || 0); if(d !== 0){ total += d; lignes.push([d, k]); } }
lignes.sort((a, b) => b[0] - a[0]).forEach(l => console.log(String(l[0]).padStart(7) + '  ' + l[1]));
console.log('TOTAL du jour : ' + total + ' caractères');
const sz = Object.entries(apres).reduce((t, [k, v]) => t + k.length + v, 0);
console.log('taille totale après 83 jours (seed allégé + 1 jour plein) : ' + sz);
await browser.close();
