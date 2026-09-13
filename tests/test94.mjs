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
  ok(/Chaque semaine/.test(hebdo.titre) && hebdo.n === 10, 'la liste hebdomadaire fait 10 articles frais (' + hebdo.n + ')');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(!/Riz/.test(hebdo.titre + '') && /Riz — 3\u202f780 g/.test(t), 'le riz est en réserve, 3 780 g sur 4 semaines');
  ok(/Shampooing/.test(t) && /Cotons-tiges/.test(t) && /Nettoyant visage/.test(t) && /Brosse à dents/.test(t), 'santé et hygiène : shampooing, cotons-tiges, nettoyant visage, brosse à dents');
  ok(!/Éponges|Sacs poubelle|Nettoyant sols/.test(t), 'les produits ménagers sont sortis de la Batcave');
  await ctx.close();
}

console.log('\n== 331) Samedi 19 septembre : l\'ancre, tout est dû ==');
/* Samedi 19 = son jour 1 pour les repas et les courses. Tous les cycles partent de la,
   donc tombent toujours un samedi. La semaine du 14 au 18 se mange hors plan. */
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.every(x => x.due), 'les 5 catégories sont dues le 19 (ancre commune)');
  const somme = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  /* 10 frais + 2 reserves (surgeles, miel) + 5 lignes de maison + 1 beurre = 18.
     Riz, pates, flocons, huile et huit produits d'hygiene sont deja au placard. */
  ok(/\/16 articles/.test(somme), '16 articles le 19 : son stock enlève riz, pâtes, flocons et huit produits de santé (' + somme + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.every(x => x.due), 'le 19 est l\'ancre : tout est dû');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c[0].due && c.slice(1).every(x => !x.due), 'le samedi 26 : le frais seulement, tout le reste vient d\'être acheté');
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
/* 500 g au placard + 1,5 kg achetes le 13 = 2 kg = cinq semaines a 400 g, epuises le
   19 octobre : le rachat tombe donc le samedi 17, et pas avec les reserves du 10. */
for (const [d, nom, du] of [['2026-09-19','19 sept',true], ['2026-09-26','26 sept',false],
                            ['2026-10-17','17 oct',false], ['2026-10-24','24 oct',true],
                            ['2026-11-28','28 nov',true]]) {
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
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(/Riz[^\n]*à racheter le 17 oct\./.test(t), 'le riz attend le 17 octobre (4 kg, 945 g/semaine)');
  ok(/Flocons d'avoine[^\n]*à racheter le 17 oct\./.test(t), 'les flocons aussi (2,4 kg, 560 g/semaine)');
  ok(/Pâtes[^\n]*à racheter le 14 nov\./.test(t), 'les pâtes tiennent jusqu\'au 14 novembre (7 kg)');
  /* On ne rachete que le MANQUE : il a 500 g de beurre et un litre d'huile, donc il
     complete au lieu de reprendre un cycle entier. */
  ok(/Beurre de cacahuète — 1\u202f425 g/.test(t), 'beurre : 1 425 g pour compléter ses 500 g à 1 925');
  ok(/Huile d'olive — 440 ml/.test(t), 'huile : 440 ml pour compléter son litre à 1 440');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-10-17T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(!/Riz[^\n]*à racheter/.test(t), 'le 17 octobre : le riz revient dans la liste');
  ok(/Pâtes[^\n]*à racheter le 14 nov\./.test(t), 'les pâtes attendent encore');
  await ctx.close();
}

console.log('\n== 334c) Le total du jour est calculé, jamais additionné à la main ==');
/* J'ai annonce « ~88 EUR » deux fois pour une liste a 118,60 : une addition de tete.
   La ligne « A prendre aujourd'hui » sort donc du code, et ce bloc la recompte
   INDEPENDAMMENT depuis les prix affiches. Si les deux divergent, c'est un echec. */
for (const d of ['2026-09-19', '2026-09-26', '2026-10-17', '2026-11-14']) {
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
  ok(r.annonceN === r.n && r.n > 0, d + ' : ' + r.n + ' articles, annoncés et comptés pareil (' + r.annonceN + ')');
  /* Tolerance 0,2 EUR : la Batcave somme les prix exacts puis arrondit une fois,
     le recompte additionne des prix deja arrondis. */
  ok(Math.abs(r.annonceP - r.som) < 0.2, d + ' : ' + r.annonceP + ' € annoncés vs ' + Math.round(r.som * 10) / 10 + ' € recomptés');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  /* 14 par semaine : 2 par jour au petit-dejeuner, tire du plan de repas. */
  ok(/Œufs — 14/.test(t), 'les œufs suivent le plan : 14 par semaine');
  await ctx.close();
}

console.log('\n== 334d) Les dates d\'hygiène se calculent, elles ne sont pas écrites en dur ==');
/* stock / conso par semaine donne la rupture ; le rachat est la derniere date du cycle
   strictement avant. Corriger une estimation = changer un seul nombre. */
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  for (const [prod, fini, achat] of [
        ['Shampooing', '20 oct.', '17 oct.'],
        ['Après-shampooing', '11 nov.', '17 oct.'],
        ['Gel douche', '02 nov.', '17 oct.'],
        ['Nettoyant visage', '19 nov.', '14 nov.'],
        ['Dentifrice', '01 févr.', '09 janv.'],
        ['Déodorant', '09 nov.', '17 oct.'],
        ['Cotons-tiges', '11 févr.', '06 févr.'],
        ['Rasoirs jetables', '04 janv.', '12 déc.'],
        ['Brosse à dents', '01 mars', '12 déc.']]) {
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

console.log('\n== 334e) Les deux seuls chiffres que la Batcave ne peut pas deviner sont demandés ==');
/* Les prix sont estimés, et le stock inscrit est une photo du 13 septembre. Ces deux-là
   se corrigent avec un chiffre réel de Zizou : le jour des premières courses, le plan du
   jour les lui demande. Ni avant, ni après — et sans jamais écrire dans ses tâches. */
{
  const lire = async iso => {
    const { ctx, fr } = await jour(iso + 'T08:00:00+02:00');
    const r = await fr.evaluate(() => ({
      txt: document.getElementById('dash-plan').innerText,
      btn: document.querySelectorAll('#dash-plan [data-ouvrir="courses"]').length,
      taches: JSON.parse(localStorage.getItem('batcave-taches') || 'null')
    }));
    await ctx.close();
    return r;
  };
  const veille = await lire('2026-09-18'), jourJ = await lire('2026-09-19'), apres = await lire('2026-09-20');
  ok(/Avant de partir/.test(jourJ.txt) && /stock daté du 13/.test(jourJ.txt), 'le 19, le plan réclame le relevé du stock avant de partir');
  ok(/ticket de caisse/.test(jourJ.txt) && /estimés/.test(jourJ.txt), 'et le relevé du ticket au retour, en disant pourquoi');
  ok(jourJ.btn === 2, 'chacun porte un bouton qui ouvre la liste de courses (' + jourJ.btn + ')');
  ok(!/Avant de partir/.test(veille.txt) && !/ticket de caisse/.test(veille.txt), 'la veille, rien : ce n\'est pas encore actionnable');
  ok(!/Avant de partir/.test(apres.txt) && !/ticket de caisse/.test(apres.txt), 'le lendemain non plus : la demande ne traîne pas');
  ok(jourJ.taches === null, 'et rien n\'est écrit dans ses tâches — la Batcave demande, elle ne remplit pas sa liste');
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
