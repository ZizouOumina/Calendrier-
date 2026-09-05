/* Clôture du jour : un écran le soir, tout écrit dans le journal et les habitudes ; revue le dimanche. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { if(sessionStorage.getItem('__a51')) return; sessionStorage.setItem('__a51','1'); Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const visible = (fr, id) => fr.evaluate(i => { const e = document.getElementById(i); return !!e && !e.hidden; }, id);

console.log('\n== 160) Le matin : pas de clôture, relevé « ce soir dès 20:00 » ==');
{
  const { ctx, fr } = await ouvrir('2026-09-08T10:00:00+02:00');
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  ok(await visible(fr, 'cloture-overlay') === false, 'aucune clôture proposée le matin');
  const t = await fr.evaluate(() => document.querySelector('#bc-cloture .v').textContent);
  ok(t === 'ce soir dès 20:00', 'relevé CLÔTURE : ' + t);
  /* le relevé s'ouvre à la demande, même le matin */
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  ok(await visible(fr, 'cloture-overlay') === true, 'un clic sur le relevé ouvre l\'écran');
  await ctx.close();
}

console.log('\n== 161) Le soir : proposée après le rituel, remplie en 60 s, tout est écrit ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-08T21:00:00+02:00');
  ok(await visible(fr, 'opening-ritual-overlay') === true, 'le rituel d\'ouverture passe d\'abord');
  ok(await visible(fr, 'cloture-overlay') === false, 'la clôture attend qu\'il soit fermé');
  await fr.evaluate(() => document.getElementById('ritual-dismiss').click());
  await page.waitForTimeout(150);
  ok(await visible(fr, 'cloture-overlay') === true, 'la clôture se propose d\'elle-même à 21:00');
  const nbHab = await fr.evaluate(() => document.querySelectorAll('#cl-habitudes [data-cl-hab]').length);
  ok(nbHab >= 10, 'les habitudes non cochées sont proposées (' + nbHab + ')');
  await fr.evaluate(() => {
    document.getElementById('cl-sommeil').value = '7.5';
    document.getElementById('cl-poids').value = '64.3';
    document.getElementById('cl-eau-plus').click(); document.getElementById('cl-eau-plus').click(); document.getElementById('cl-eau-plus').click();
    document.querySelector('#cl-humeur [data-cl-humeur="4"]').click();
    const chips = document.querySelectorAll('#cl-habitudes [data-cl-hab]'); chips[0].click(); chips[1].click();
    document.getElementById('cl-note').value = 'Bonne journée, anatomie bien avancée';
  });
  const eau = await fr.evaluate(() => document.getElementById('cl-eau').textContent);
  ok(eau === '0,8 L' || eau === '0,7 L', 'compteur d\'eau : ' + eau);
  const ids = await fr.evaluate(() => [...document.querySelectorAll('#cl-habitudes [data-cl-hab].active')].map(b => b.dataset.clHab));
  await fr.evaluate(() => document.getElementById('cloture-valider').click());
  await page.waitForTimeout(250);
  ok(await visible(fr, 'cloture-overlay') === false, 'l\'écran se ferme');
  const j = await local(fr, 'batcave-journal-2026-09-08');
  ok(j && j.cloture === '21:00', 'journal : clôturée à ' + (j && j.cloture));
  ok(j && j.sommeil === '7.5' && j.poids === '64.3' && j.water === 750 && j.mood === 4, 'journal : sommeil ' + j.sommeil + ', poids ' + j.poids + ', eau ' + j.water + ' ml, humeur ' + j.mood);
  ok(j && /anatomie/.test(j.notes), 'journal : la note est écrite');
  const hl = await local(fr, 'batcave-habitlog');
  ok(ids.length === 2 && ids.every(id => (hl[id] || []).includes('2026-09-08')), 'les 2 habitudes touchées sont cochées dans le carnet');
  const t = await fr.evaluate(() => document.querySelector('#bc-cloture .v').textContent);
  ok(t === 'faite 21:00', 'relevé CLÔTURE : ' + t);
  const dash = await fr.evaluate(() => document.getElementById('dash-releves').innerText.replace(/\s+/g,' '));
  ok(/7,5/.test(dash) && /64,3/.test(dash), 'le tableau de bord reflète sommeil et poids : ' + dash.slice(0, 80));
  const poidsJournal = await fr.evaluate(() => document.getElementById('j-poids').value);
  ok(poidsJournal === '64.3', 'la page Journal montre le même poids');
  /* rechargement : la journée est clôturée, plus de proposition */
  await page.reload().catch(() => {});
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(300);
  ok(await visible(fr2, 'cloture-overlay') === false, 'après rechargement, plus de proposition');
  await ctx.close();
}

console.log('\n== 162) « Plus tard » repousse au prochain lancement ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-08T21:00:00+02:00', {'batcave-last-open':'2026-09-08'});
  await page.waitForTimeout(100);
  ok(await visible(fr, 'cloture-overlay') === true, 'sans rituel (déjà ouvert aujourd\'hui), la clôture vient directement');
  await fr.evaluate(() => document.getElementById('cloture-plus-tard').click());
  const j = await local(fr, 'batcave-journal-2026-09-08');
  ok(j && j.clotureRepoussee === true && !j.cloture, 'le report est noté dans le journal du jour');
  const t = await fr.evaluate(() => document.querySelector('#bc-cloture .v').textContent);
  ok(t === 'à faire — 60 s', 'relevé CLÔTURE : ' + t);
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(/Clôturer la journée/.test(plan), 'le plan du jour porte l\'action « Clôturer »');
  await page.reload().catch(() => {});
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(300);
  ok(await visible(fr2, 'cloture-overlay') === false, 'repoussée : pas de nouvelle proposition automatique');
  await fr2.evaluate(() => document.querySelector('[data-plan-cloture]').click());
  ok(await visible(fr2, 'cloture-overlay') === true, 'mais le bouton du plan l\'ouvre');
  await ctx.close();
}

console.log('\n== 163) Dimanche soir : la revue de la semaine dans la clôture ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-13T20:30:00+02:00', {'batcave-last-open':'2026-09-13'});
  await page.waitForTimeout(100);
  ok(await visible(fr, 'cloture-overlay') === true, 'clôture proposée dimanche 20:30 (coucher 21:00 − 90 min)');
  ok(await visible(fr, 'cl-revue') === true, 'la revue de la semaine est dedans');
  const constats = await fr.evaluate(() => [...document.querySelectorAll('#cl-constats li')].map(l => l.innerText));
  ok(constats.length === 3 && /objectif/i.test(constats[0]) && /Fidélité|bloc/.test(constats[1]) && /Sommeil/.test(constats[2]), '3 constats calculés : ' + constats.map(c => c.slice(0, 40)).join(' | '));
  await fr.evaluate(() => {
    document.getElementById('cl-rv-marche').value = 'Les blocs du matin';
    document.getElementById('cl-rv-coince').value = 'Le soir après les cours';
    document.getElementById('cl-rv-ajust').value = 'Bloc 3 à 19:30';
    document.getElementById('cloture-valider').click();
  });
  await page.waitForTimeout(200);
  const rv = await local(fr, 'batcave-revue');
  ok(Array.isArray(rv) && rv.length === 1 && rv[0].date === '2026-09-07' && rv[0].marche === 'Les blocs du matin' && Array.isArray(rv[0].constats) && rv[0].constats.length === 3, 'revue enregistrée pour la semaine du 7 sept. avec ses 3 constats');
  const bilan = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="bilan"]').click(); return document.getElementById('rv-list').innerText; });
  ok(/Les blocs du matin/.test(bilan) && /Fidélité|bloc/.test(bilan), 'la page Bilan la montre avec ses constats');
  const prompt = await local(fr, 'batcave-last-bilan-prompt');
  ok(prompt === '2026-09-07', 'le rappel de bilan de la semaine est marqué fait');
  await ctx.close();
}

console.log('\n== 164) En semaine, pas de revue dans la clôture ; Bilan garde ses constats ==');
{
  const { ctx, fr } = await ouvrir('2026-09-09T20:30:00+02:00', {'batcave-last-open':'2026-09-09'});
  ok(await visible(fr, 'cl-revue') === false, 'mercredi : pas de bloc revue');
  const n = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="bilan"]').click(); return document.querySelectorAll('#rv-constats li').length; });
  ok(n === 3, 'la page Bilan affiche les 3 constats du moment');
  const d = await fr.evaluate(() => document.getElementById('rv-date').value);
  ok(d === '2026-09-07', 'la date de revue est prérèglée au lundi de la semaine (' + d + ')');
  await ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
