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

console.log('\n== 331) Le 13 septembre, jour de courses exceptionnel, tout est dû ==');
/* Il a fait ses courses un DIMANCHE, une fois, avant que le rythme du samedi demarre.
   Sans cette exception il aurait fallu ancrer les cycles sur un dimanche, et tous les
   rachats suivants seraient tombes un dimanche. */
{
  const { ctx, fr } = await jour('2026-09-14T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.every(x => x.due), 'les 5 catégories sont dues le 14 (exception)');
  const somme = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  /* 10 frais + 2 reserves (surgeles, miel) + 5 lignes de maison + 1 beurre = 18.
     Riz, pates, flocons, huile et huit produits d'hygiene sont deja au placard. */
  ok(/\/18 articles/.test(somme), '18 articles à prendre le 14, son stock enlève le reste (' + somme + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c[0].due && c.slice(1).every(x => !x.due), 'le samedi 19 : le frais seulement, tout le reste vient d\'être acheté');
  await ctx.close();
}

console.log('\n== 332) Une semaine plus tard, seul le frais est dû ==');
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c[0].due && c.slice(1).every(x => !x.due), 'le 26 : frais seulement');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(/prochaine fois le 10 oct\./.test(t), 'les réserves annoncent le 10 octobre');
  ok(/prochaine fois le 05 déc\./.test(t), 'la brosse à dents annonce le 5 décembre');
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
/* 500 g au placard + 1,5 kg achetes le 13 = 2 kg = cinq semaines a 400 g, epuises le
   19 octobre : le rachat tombe donc le samedi 17, et pas avec les reserves du 10. */
for (const [d, nom, du] of [['2026-09-14','14 sept',true], ['2026-09-19','19 sept',false],
                            ['2026-10-10','10 oct',false], ['2026-10-17','17 oct',true],
                            ['2026-11-21','21 nov',true]]) {
  const { ctx, fr } = await jour(d + 'T10:00:00+02:00');
  const c = (await cartes(fr)).filter(x => /5 semaines/.test(x.titre))[0];
  ok(!!c && c.due === du, nom + ' : beurre de cacahuète dû ' + (c ? c.due : '?') + ' (' + du + ' attendu)');
  await ctx.close();
}

console.log('\n== 334b) Ce qu\'il a déjà en réserve ne se rachète pas ==');
/* Stock du 12 septembre : 7 kg de pates, 4 kg de riz, 2,4 kg de flocons, de l'huile pour
   quatre semaines, 500 g de beurre de cacahuete, 12 oeufs. Ces lignes restent AFFICHEES --
   les coches sont indexees par position, les retirer decalerait tout -- mais grisees,
   datees, et hors du compte. On se place le 13, son vrai jour de courses. */
{
  const { ctx, fr } = await jour('2026-09-14T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(/Riz[^\n]*à racheter le 10 oct\./.test(t), 'le riz attend le 10 octobre (4 kg, 1 kg par semaine)');
  ok(/Flocons d'avoine[^\n]*à racheter le 10 oct\./.test(t), 'les flocons aussi (2,4 kg, 600 g par semaine)');
  ok(/Huile d'olive[^\n]*à racheter le 10 oct\./.test(t), 'l\'huile aussi');
  ok(/Pâtes[^\n]*à racheter le 07 nov\./.test(t), 'les pâtes tiennent jusqu\'au 7 novembre (7 kg)');
  /* Les deux quantites d'un seul jour : 3 oeufs au lieu de 15, 1,5 kg de beurre au lieu de 2. */
  ok(/Œufs — 6 \(une boîte\).*il t\u2019en faut 15/.test(t), 'une boîte de 6 œufs : il en a 12, il en faut 15');
  ok(/Beurre de cacahuète — 1\u202f500 g .*tu en as déjà 500 g/.test(t), '1,5 kg de beurre, il en a 500 g');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-10-10T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(!/Riz[^\n]*à racheter/.test(t) && !/Huile d'olive[^\n]*à racheter/.test(t), 'le 10 octobre : riz et huile reviennent dans la liste');
  ok(/Pâtes[^\n]*à racheter le 07 nov\./.test(t), 'les pâtes attendent encore');
  const somme = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  /* 10 frais + 5 reserves (tout sauf les pates) + 7 lignes de maison = 22. */
  ok(/\/22 articles/.test(somme), 'le 10 octobre : 22 articles (' + somme + ')');
  await ctx.close();
}

console.log('\n== 334c) Le total du jour est calculé, jamais additionné à la main ==');
/* J'ai annonce « ~88 EUR » deux fois pour une liste a 118,60 : une addition de tete.
   La ligne « A prendre aujourd'hui » sort donc du code, et ce bloc la recompte
   INDEPENDAMMENT depuis les prix affiches. Si les deux divergent, c'est un echec. */
for (const [d, nArt] of [['2026-09-14', 18], ['2026-09-19', 10], ['2026-10-10', 22], ['2026-10-17', 11]]) {
  const { ctx, fr } = await jour(d + 'T10:00:00+02:00');
  const r = await fr.evaluate(() => {
    const ligne = document.getElementById('courses-aujourdhui').innerText;
    let n = 0, som = 0;
    document.querySelectorAll('#courses-grid .cat-card').forEach(c => {
      if(/pas cette semaine/.test(c.innerText)) return;
      c.querySelectorAll('li').forEach(l => {
        const t = l.innerText;
        if(/à racheter le/.test(t)) return;
        const m = t.match(/~([\d,]+) €/);
        n++; som += m ? Number(m[1].replace(',', '.')) : 0;
      });
    });
    const mn = ligne.match(/(\d+) article/), mp = ligne.match(/~([\d,]+) €/);
    return {n, som, annonceN: mn ? Number(mn[1]) : -1, annonceP: mp ? Number(mp[1].replace(',', '.')) : -1};
  });
  ok(r.annonceN === nArt && r.n === nArt, d + ' : ' + nArt + ' articles annoncés et comptés (' + r.annonceN + ' / ' + r.n + ')');
  /* Tolerance 0,2 EUR : la Batcave somme les prix exacts puis arrondit une fois,
     le recompte additionne des prix deja arrondis. */
  ok(Math.abs(r.annonceP - r.som) < 0.2, d + ' : ' + r.annonceP + ' € annoncés vs ' + Math.round(r.som * 10) / 10 + ' € recomptés');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-14T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  /* « 3 oeufs » ne s'achete pas : ils se vendent par 6, 12 ou 30. */
  ok(/Œufs — 6 \(une boîte\)/.test(t), 'les œufs se prennent par boîte, pas à l\'unité');
  await ctx.close();
}

console.log('\n== 334d) Les dates d\'hygiène se calculent, elles ne sont pas écrites en dur ==');
/* stock / conso par semaine donne la rupture ; le rachat est la derniere date du cycle
   strictement avant. Corriger une estimation = changer un seul nombre. */
{
  const { ctx, fr } = await jour('2026-09-14T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  for (const [prod, fini, achat] of [
        ['Shampooing', '21 oct.', '10 oct.'],
        ['Après-shampooing', '12 nov.', '07 nov.'],
        ['Gel douche', '03 nov.', '10 oct.'],
        ['Nettoyant visage', '20 nov.', '07 nov.'],
        ['Déodorant', '10 nov.', '07 nov.'],
        ['Rasoirs jetables', '05 janv.', '02 janv.'],
        ['Brosse à dents', '02 mars', '27 févr.']]) {
    const re = new RegExp(prod.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') +
      '[^\n]*fini vers le ' + fini.replace('.', '\\.') + '[^\n]*à racheter le ' + achat.replace('.', '\\.'));
    ok(re.test(t), prod + ' : fini vers le ' + fini + ', racheté le ' + achat);
  }
  /* Les trois produits qui n'existaient nulle part. */
  ok(/Nettoyant visage/.test(t) && /Déodorant/.test(t) && /Cotons-tiges/.test(t),
     'nettoyant visage, déodorant et cotons-tiges ont enfin une ligne');
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
