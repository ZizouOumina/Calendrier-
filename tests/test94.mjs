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
  ok(c.length === 4, '4 catégories (' + c.length + ')');
  const hebdo = c[0];
  ok(/Chaque semaine/.test(hebdo.titre) && hebdo.n === 11, 'la liste hebdomadaire tombe à 11 articles (' + hebdo.n + ')');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(!/Riz/.test(hebdo.titre + '') && /Riz — 4/.test(t), 'le riz est passé en réserve de 4 kg');
  ok(/Shampooing/.test(t) && /Lessive/.test(t) && /Brosse à dents/.test(t), 'hygiène, ménage et brosse à dents existent enfin');
  await ctx.close();
}

console.log('\n== 331) Le 19 septembre, tout est dû en même temps ==');
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.every(x => x.due), 'les 4 catégories sont dues le 19 (ancre)');
  await ctx.close();
}

console.log('\n== 332) Une semaine plus tard, seul le frais est dû ==');
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c[0].due && !c[1].due && !c[2].due && !c[3].due, 'le 26 : frais seulement');
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
  ok(/^11\/11/.test(somme), 'cocher le frais suffit : ' + somme + ' (' + avant + ' cases)');
  const coche = await fr.evaluate(() => {
    const l = [...document.querySelectorAll('#dash-checklist li label')].map(x => x.textContent);
    return l.some(x => /Courses/.test(x));
  });
  ok(coche, 'l\'habitude Courses est bien présente le samedi');
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
