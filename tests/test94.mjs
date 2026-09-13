/* Les courses a cycle. Le vrai risque n'est pas l'affichage : c'est que l'habitude
   « Courses faites » ne se coche QUE lorsque tout est coche. Ajouter des reserves
   mensuelles sans les sortir du compte l'aurait rendue invalidable a vie, en silence.
   Ce fichier garde cette porte fermee, et verifie les dates du cycle. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

async function jour(quand){
  const ctx = await b.newContext({viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + quand + ' : ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="courses"]').click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const cartes = fr => fr.evaluate(() => [...document.querySelectorAll('#courses-grid .cat-card')].map(c => ({
  titre: c.querySelector('h4').textContent,
  due: !/pas cette semaine/.test(c.innerText),
  n: c.querySelectorAll('li').length
})));

console.log('\n== 330) Quatre catégories, et le frais seul reste hebdomadaire ==');
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.length === 5, '5 catégories — le beurre de cacahuète a son propre rythme (' + c.length + ')');
  const hebdo = c[0];
  ok(/Chaque semaine/.test(hebdo.titre) && hebdo.n === 10, 'la liste hebdomadaire tombe à 10 articles (' + hebdo.n + ')');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(!/Riz/.test(hebdo.titre + '') && /Riz — 4/.test(t), 'le riz est passé en réserve de 4 kg');
  ok(/Shampooing/.test(t) && /Lessive/.test(t) && /Brosse à dents/.test(t), 'hygiène, ménage et brosse à dents existent enfin');
  await ctx.close();
}

console.log('\n== 331) Le 19 septembre, tout est dû en même temps ==');
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.every(x => x.due), 'les 5 catégories sont dues le 19 (ancre commune)');
  await ctx.close();
}

console.log('\n== 332) Une semaine plus tard, seul le frais est dû ==');
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c[0].due && c.slice(1).every(x => !x.due), 'le 26 : frais seulement');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(/prochaine fois le 17 oct\./.test(t), 'les réserves annoncent le 17 octobre');
  ok(/prochaine fois le 12 déc\./.test(t), 'la brosse à dents annonce le 12 décembre');
  await ctx.close();
}

console.log('\n== 333) L\'habitude « Courses faites » reste validable ==');
/* Le piege : si le compte incluait les categories non dues, cocher toute la liste
   d'un samedi ordinaire ne suffirait plus jamais, et l'habitude serait morte. */
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  /* Chaque clic relance renderCourses, qui REMPLACE les noeuds : une liste de cases
     collectee d'avance devient obsolete des le premier clic. On reinterroge le DOM a
     chaque tour, sinon le test ne coche qu'une seule case et ment. */
  let avant = 0;
  for(let i = 0; i < 20; i++){
    const reste = await fr.evaluate(() => {
      const c = document.querySelectorAll('#courses-grid .cat-card')[0];
      const x = [...c.querySelectorAll('input[type=checkbox]')].filter(y => !y.checked)[0];
      if(!x) return false; x.click(); return true;
    });
    if(!reste) break;
    avant++;
    await new Promise(r => setTimeout(r, 120));
  }
  const somme = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  ok(/^10\/10/.test(somme), 'cocher le frais suffit : ' + somme + ' (' + avant + ' cases)');
  const coche = await fr.evaluate(() => {
    const l = [...document.querySelectorAll('#dash-checklist li label')].map(x => x.textContent);
    return l.some(x => /Courses/.test(x));
  });
  ok(coche, 'l\'habitude Courses est bien présente le samedi');
  await ctx.close();
}

console.log('\n== 333b) Le beurre de cacahuète tourne sur cinq semaines ==');
/* 400 g par semaine : 2 kg tombent pile sur cinq semaines, sans fond de pot qui traine.
   C'est le seul article a ne pas suivre le rythme de sa voisine de rayon. */
for (const [d, nom, du] of [['2026-09-19','19 sept',true], ['2026-10-17','17 oct',false],
                            ['2026-10-24','24 oct',true], ['2026-11-28','28 nov',true]]) {
  const { ctx, fr } = await jour(d + 'T10:00:00+02:00');
  const c = (await cartes(fr)).filter(x => /5 semaines/.test(x.titre))[0];
  ok(!!c && c.due === du, nom + ' : beurre de cacahuète dû ' + (c ? c.due : '?') + ' (' + du + ' attendu)');
  await ctx.close();
}

console.log('\n== 334b) Ce qu\'il a déjà en réserve ne se rachète pas ==');
/* Courses du 12 septembre : 7 kg de pates, 4 kg de riz, 2,4 kg de flocons. Ces trois
   lignes restent AFFICHEES -- les coches sont indexees par position, les retirer
   decalerait tout -- mais grisees, datees, et hors du compte. */
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(/Riz[^\n]*déjà en réserve, à racheter le 17 oct\./.test(t), 'le riz attend le 17 octobre');
  ok(/Flocons d'avoine[^\n]*à racheter le 17 oct\./.test(t), 'les flocons aussi');
  ok(/Pâtes[^\n]*à racheter le 14 nov\./.test(t), 'les pâtes tiennent jusqu\'au 14 novembre (7 kg)');
  const somme = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  /* 10 frais + 3 reserves restantes + 10 maison + 1 beurre + 1 brosse = 25, et non 28 */
  ok(/\/25 articles/.test(somme), 'le 19 septembre : 25 articles à prendre, pas 28 (' + somme + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-10-17T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(!/Riz[^\n]*à racheter/.test(t), 'le 17 octobre : le riz revient dans la liste');
  ok(/Pâtes[^\n]*à racheter le 14 nov\./.test(t), 'les pâtes attendent encore');
  await ctx.close();
}

console.log('\n== 334) Le budget compte chaque cycle à son rythme ==');
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-budget').innerText);
  ok(/toutes les 4 semaines/.test(t) && /toutes les 12 semaines/.test(t), 'les deux cycles sont annoncés');
  const mois = (t.match(/~([\d,]+) € \/ mois/) || [])[1];
  ok(!!mois, 'un coût mensuel est affiché (' + t + ')');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
