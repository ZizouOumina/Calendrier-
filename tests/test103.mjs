/* L'onglet Courses, apres sa remarque du 20 septembre :
   « je dois tout recocher quand je mets reinitialiser pour le samedi prochain, alors qu'il
   y a des trucs que je dois pas acheter avant plusieurs semaines » et « j'ai aucune idee
   des dates ou je dois acheter les trucs ».
   Trois defauts reels, et ce fichier les tient fermes :
   1. la grille du jour montrait les SEPT categories, les non dues seulement grisees a
      55 % -- un samedi ordinaire affichait 46 lignes pour 10 a prendre. Et depuis le
      20 septembre au soir, la liste ne porte plus que de la nourriture : 17 lignes ;
   2. aucune date n'apparaissait le jour ou toutes les categories tombaient ensemble,
      puisque seule une categorie NON due en portait une ;
   3. « Reinitialiser » vidait TOUT, y compris une reserve rachetee en avance, qu'il
      fallait donc recocher des semaines avant son passage. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

async function ouvrir(quand, seed){
  const ctx = await b.newContext({viewport:{width:1440,height:1600}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(x => { window.claude = undefined;
    if(x) Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed || null);
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR : ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:25000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
    const s = document.querySelector('.page[data-page="courses"]'); if(s) s.hidden = false; });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const vue = fr => fr.evaluate(() => ({
  resume: (document.getElementById('courses-summary') || {}).textContent || '',
  jour:   [...document.querySelectorAll('#courses-grid .cat-card h4')].map(x => x.textContent),
  dates:  [...document.querySelectorAll('#courses-grid .cat-card p')].map(x => x.innerText),
  cal:    (document.getElementById('courses-calendrier') || {}).innerText || '',
  repli:  (document.querySelector('#courses-plus-tard summary') || {}).innerText || '',
  tard:   [...document.querySelectorAll('#courses-grid-plus .cat-card h4')].map(x => x.textContent)
}));

console.log('\n== 342) Le jour du premier ravitaillement : tout est dû, et tout annonce sa suite ==');
{
  const { ctx, fr } = await ouvrir('2026-09-20T16:00:00+02:00');
  const v = await vue(fr);
  ok(v.jour.length === 5, 'les cinq catégories sont dans la grille du jour (' + v.jour.length + ')');
  ok(/16 à prendre/.test(v.resume), 'et le résumé annonce 16 articles (' + v.resume + ')');
  ok(v.dates.every(t => /aujourd/i.test(t)), 'chacune dit « aujourd’hui »');
  ok(v.dates.every(t => /puis le/.test(t)), 'ET chacune dit sa fois suivante — c’est ce qui manquait');
  ok(/26 sept/.test(v.dates[0]) && /03 oct/.test(v.dates[1]) && /17 oct/.test(v.dates[2]),
     'hebdo → 26 sept., surgelés → 3 oct., réserves → 17 oct. (' + v.dates.slice(0,3).map(t => t.split('puis le ')[1]).join(' · ') + ')');
  ok(!v.repli, 'aucun repli : rien n’est reporté ce jour-là');
  await ctx.close();
}

console.log('\n== 343) Un samedi ordinaire : la grille ne montre que le frais ==');
{
  const { ctx, fr } = await ouvrir('2026-09-26T13:30:00+02:00');
  const v = await vue(fr);
  ok(v.jour.length === 1 && /Chaque semaine/.test(v.jour[0]), 'une seule catégorie dans la grille du jour (' + v.jour.join(', ') + ')');
  /* HUIT, pas neuf : le fromage a quitté « Chaque semaine » le 22 septembre pour la
     catégorie de deux semaines, dont il portait déjà le cycle. Tant qu'il y restait,
     « Chaque semaine » apparaissait dans la grille du jour ET dans le repli — une même
     catégorie coupée en deux, et un repli qui annonçait cinq catégories pour quatre. */
  ok(/0\/8 .*8 à prendre/.test(v.resume), 'le résumé dit 8, pas 16 (' + v.resume + ')');
  ok(/4 catégories/.test(v.repli), 'les quatre autres catégories sont dans le repli (' + v.repli + ')');
  ok(v.tard.length === 4, 'et le repli les contient toutes, rachetables en avance (' + v.tard.length + ')');
  await ctx.close();
}

console.log('\n== 344) Les dates annoncées sont des SAMEDIS ==');
{
  /* Une categorie est « due » tous les jours de la semaine ou son cycle tombe. Sans filtre,
     la page annoncait « puis le 21 septembre » un dimanche -- le lendemain, un jour ou il
     ne fait jamais de courses. Son jour de courses est le samedi 13:30. */
  const { ctx, fr } = await ouvrir('2026-09-20T16:00:00+02:00');
  const v = await vue(fr);
  const dates = v.dates.map(t => (t.split('puis le ')[1] || '').trim()).filter(Boolean);
  ok(dates.length === 5, 'cinq dates annoncées (' + dates.length + ')');
  ok(!/21 sept|22 sept|23 sept/.test(v.dates.join(' ')), 'aucune date en pleine semaine');
  const jours = await fr.evaluate(() => window.__bcPassagesCourses ? window.__bcPassagesCourses('2026-09-20', 6).map(x => x.date) : []);
  ok(jours.length === 6 && jours.every(d => new Date(d + 'T00:00:00').getDay() === 6),
     'les six prochains passages tombent tous un samedi (' + jours.join(', ') + ')');
  ok(/26 sept/.test(v.cal) && /03 oct/.test(v.cal) && /17 oct/.test(v.cal),
     'le calendrier sous la liste les nomme (' + v.cal.slice(0, 120) + '…)');
  await ctx.close();
}

console.log('\n== 345) Réinitialiser ne vide que ce qui était dû ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-26T13:30:00+02:00');
  /* Il coche une ligne de la semaine (due) et une reserve rachetee en avance (non due). */
  await fr.evaluate(() => {
    const a = document.querySelector('#courses-grid input[type="checkbox"]');
    const b = document.querySelector('#courses-grid-plus input[type="checkbox"]');
    if(a){ a.checked = true; a.dispatchEvent(new Event('change', {bubbles:true})); }
    if(b){ b.checked = true; b.dispatchEvent(new Event('change', {bubbles:true})); }
  });
  await page.waitForTimeout(250);
  const avant = await fr.evaluate(() => Object.keys(JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-courses') || '{}')).length);
  ok(avant === 2, 'deux coches posées, une due et une en avance (' + avant + ')');
  await fr.evaluate(() => document.getElementById('courses-reset').click());
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-courses') || '{}'));
  const cles = Object.keys(apres);
  ok(cles.length === 1, 'la remise à zéro n’en efface qu’une (' + cles.length + ' restante)');
  ok(cles.length === 1 && !cles[0].startsWith('0-'), 'celle qui reste est la réserve non due, pas l’hebdomadaire (' + cles.join(', ') + ')');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ECHEC(S)' : '\nTOUT EST VERT');
process.exit(err ? 1 : 0);
