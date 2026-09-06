/* Parcours complet : chaque onglet, sept jours, aucune erreur de page ; l'emploi du temps
   et la vue semaine lisent bien la nouvelle grille (mercredi Anki matinal, vendredi et
   dimanche Projets perso matinal, sport quatre jours). */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const JOURS = [['lundi','2026-09-07','Sport','jour de cours (lun, mar, jeu)'],['mardi','2026-09-08','Sport','jour de cours (lun, mar, jeu)'],['mercredi','2026-09-09','Anki matinal','mercredi (Anki matinal)'],['jeudi','2026-09-10','Sport','jour de cours (lun, mar, jeu)'],['vendredi','2026-09-11','Projets perso matinal',"vendredi (Jumu'ah)"],['samedi','2026-09-12','Sport','samedi (courses)'],['dimanche','2026-09-13','Projets perso matinal','dimanche']];
for(const [nom, iso, premier, libelle] of JOURS){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  const perr = [];
  page.on('pageerror', e => perr.push(e.message));
  await page.clock.install({ time: new Date(iso + 'T10:00:00+02:00') });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#cal-timeline').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  const pages = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].map(b => b.dataset.page));
  for(const p of pages){ await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(60); }
  const r = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="calendrier"]').click();
    const lignes = [...document.querySelectorAll('#cal-timeline li')].map(l => l.querySelector('.t-time').textContent + ' ' + l.querySelector('.t-label').textContent.trim());
    const semaine = [...document.querySelectorAll('.week-cal-day')].map(d => d.querySelector('.wc-row .wc-label').textContent.trim());
    return { libelle: document.getElementById('cal-schedule-label').textContent, premier: lignes[0], nb: lignes.length, semaine, sport: (document.querySelector('.sport-card.today') || {}).innerText || '' };
  });
  ok(perr.length === 0, nom + ' : aucune erreur de page sur les ' + pages.length + ' onglets' + (perr.length ? ' — ' + perr[0] : ''));
  ok(r.libelle === libelle, nom + ' : emploi du temps « ' + r.libelle + ' »');
  ok(r.premier === '05:30 ' + premier, nom + ' : premier bloc « ' + r.premier + ' »');
  ok(JSON.stringify(r.semaine) === JSON.stringify(['Sport','Sport','Anki matinal','Sport','Projets perso matinal','Sport','Projets perso matinal']), nom + ' : vue de la semaine, 05:30 de lundi à dimanche = ' + r.semaine.join(' · '));
  await ctx.close();
}
await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
