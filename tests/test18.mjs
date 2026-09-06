import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(dateISO){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(dateISO) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(200);
  return { ctx, page, fr };
}

console.log('\n== 52) Calendrier : passage d\'année (décembre → janvier) ==');
{
  const { ctx, page, fr } = await ouvrir('2026-12-15T10:00:00+01:00');
  let label = await fr.evaluate(() => document.getElementById('rv-mois').textContent);
  ok(/décembre 2026/i.test(label), 'départ : ' + label);
  await fr.evaluate(() => document.getElementById('rv-next').click());
  await page.waitForTimeout(150);
  label = await fr.evaluate(() => document.getElementById('rv-mois').textContent);
  ok(/janvier 2027/i.test(label), 'décembre → janvier (année incrémentée) : ' + label);
  const jours = await fr.evaluate(() => document.querySelectorAll('#rv-grid .cal-day:not(.vide)').length);
  ok(jours === 31, 'janvier a bien 31 jours (obtenu ' + jours + ')');
  await fr.evaluate(() => document.getElementById('rv-prev').click());
  await page.waitForTimeout(150);
  label = await fr.evaluate(() => document.getElementById('rv-mois').textContent);
  ok(/décembre 2026/i.test(label), 'retour en arrière : ' + label);
  await ctx.close();
}

console.log('\n== 53) Calendrier : février bissextile vs normal ==');
{
  const { ctx, page, fr } = await ouvrir('2028-01-15T10:00:00+01:00');   // 2028 = bissextile
  await fr.evaluate(() => document.getElementById('rv-next').click());
  await page.waitForTimeout(150);
  const label28 = await fr.evaluate(() => document.getElementById('rv-mois').textContent);
  const jours28 = await fr.evaluate(() => document.querySelectorAll('#rv-grid .cal-day:not(.vide)').length);
  ok(/février 2028/i.test(label28) && jours28 === 29, 'février 2028 (bissextile) : 29 jours (obtenu ' + jours28 + ')');
  const a29 = await fr.evaluate(() => !!document.querySelector('[data-agjour="2028-02-29"]'));
  ok(a29, 'le 29 février existe bien dans la grille');
  await ctx.close();
}
{
  const { ctx, page, fr } = await ouvrir('2027-01-15T10:00:00+01:00');   // 2027 = non bissextile
  await fr.evaluate(() => document.getElementById('rv-next').click());
  await page.waitForTimeout(150);
  const jours27 = await fr.evaluate(() => document.querySelectorAll('#rv-grid .cal-day:not(.vide)').length);
  const a29 = await fr.evaluate(() => !!document.querySelector('[data-agjour="2027-02-29"]'));
  ok(jours27 === 28, 'février 2027 (non bissextile) : 28 jours (obtenu ' + jours27 + ')');
  ok(!a29, 'pas de 29 février en 2027');
  await ctx.close();
}

console.log('\n== 54) Objectif de révision du jour selon le jour de la semaine ==');
{
  /* Les objectifs suivent désormais la journée réellement planifiée : le dimanche
     après-midi est un temps de repos (4 h) et le samedi porte les courses (5 h).
     Viser 7 h ces jours-là afficherait un retard permanent et fictif. */
  const { ctx, fr } = await ouvrir('2026-09-06T10:00:00+02:00');  // dimanche
  const cell = await fr.evaluate(() => document.querySelector('#dash-temps .temps-cell').innerText.replace(/\s+/g,''));
  await ctx.close();
  ok(/\/3,4h/.test(cell), 'dimanche (après-midi de repos) : objectif = 3,4h (obtenu : ' + cell + ')');
}
{
  const { ctx, fr } = await ouvrir('2026-09-05T10:00:00+02:00');  // samedi
  const cell = await fr.evaluate(() => document.querySelector('#dash-temps .temps-cell').innerText.replace(/\s+/g,''));
  await ctx.close();
  ok(/\/4,3h/.test(cell), 'samedi (2 h de courses) : objectif = 4,3h (obtenu : ' + cell + ')');
}

console.log('\n== 55) Charges fixes : total et suppression restent cohérents ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-02T10:00:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="budget"]').click());
  await page.waitForTimeout(200);
  const total0 = await fr.evaluate(() => document.getElementById('fixed-charges-total').textContent);
  ok(/1\s*187\s*€/.test(total0.replace(/ /g,' ')), 'total de départ 1187 €/mois : ' + total0);
  // supprime la première charge (loyer, 700€) et vérifie que le total baisse exactement du bon montant
  await fr.evaluate(() => document.querySelector('#fixed-charges-list [data-delfc]').click());
  await page.waitForTimeout(200);
  const total1 = await fr.evaluate(() => document.getElementById('fixed-charges-total').textContent);
  ok(/487\s*€/.test(total1.replace(/ /g,' ')), 'après suppression du loyer (700€) : 487 €/mois (obtenu : ' + total1 + ')');
  const statTile = await fr.evaluate(() => document.getElementById('budget-stats').innerText.replace(/\s+/g,' '));
  ok(/487/.test(statTile), 'la tuile "Charges fixes" du budget suit aussi : ' + statTile.slice(0,120));
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
