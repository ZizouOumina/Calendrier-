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

console.log('\n== 330) Sept catégories, et le frais seul reste hebdomadaire ==');
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const c = await cartes(fr);
  /* 19 septembre : les produits menagers, sortis a sa demande, reviennent en deux
     categories -- « Maison » a quatre semaines et « Ménage » a huit. On passe donc de
     cinq rythmes a sept. */
  ok(c.length === 7, '7 catégories — maison et ménage sont revenus (' + c.length + ')');
  const hebdo = c[0];
  ok(/Chaque semaine/.test(hebdo.titre) && hebdo.n === 10, 'la liste hebdomadaire fait 10 articles frais (' + hebdo.n + ')');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(!/Riz/.test(hebdo.titre + '') && /Riz — 5 kg/.test(t) && /demande 4\u202f340 g/.test(t), 'le riz est en réserve : 5 kg achetés pour 4 340 g demandés');
  ok(/Shampooing/.test(t) && /Cotons-tiges/.test(t) && /Nettoyant visage/.test(t) && /Brosse à dents/.test(t), 'santé et hygiène : shampooing, cotons-tiges, nettoyant visage, brosse à dents');
  ok(/Éponges \+ grattoirs/.test(t) && /Sacs poubelle 30 L/.test(t) && /Nettoyant sol \(fregasuelos\)/.test(t) && /Papier toilette/.test(t),
     'les produits ménagers sont revenus : éponges, sacs, fregasuelos, papier toilette');
  ok(/Bain de bouche/.test(t) && /Brossettes interdentaires/.test(t) && /Crème solaire/.test(t),
     'et les ajouts d\'hygiène : bain de bouche, brossettes, crème solaire');
  await ctx.close();
}

console.log('\n== 331) Samedi 19 septembre : l\'ancre, tout est dû ==');
/* Samedi 19 = le battement du rythme. Tous les cycles partent de la, donc tombent
   toujours un samedi. Une categorie est due toute la SEMAINE qui s'ouvre a l'ancre,
   pas seulement ce jour-la : c'est ce qui permet a ses premieres courses du dimanche 20
   de porter la liste entiere. */
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.every(x => x.due), 'les 7 catégories sont dues le 19 (ancre commune)');
  const somme = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  /* Aucun stock n'est suppose : le 19, TOUTES les categories sont dues et toutes leurs
     lignes comptent. 10 frais + 5 reserves + 2 (cycle de 5 semaines) + 16 sante
     + 6 maison + 5 menage + 1 brosse a dents = 45. Ce qu'il a deja, il le coche. */
  ok(/\/45 articles/.test(somme), '45 articles le 19 : tout part de zéro (' + somme + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-20T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.every(x => x.due), 'et le dimanche 20, jour de ses vraies premières courses, tout est encore dû');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c[0].due && c.slice(1).every(x => !x.due), 'le samedi 26 septembre : le frais seulement, tout le reste vient d\'être acheté');
  await ctx.close();
}

console.log('\n== 332) Une semaine plus tard, seul le frais est dû ==');
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c[0].due && c.slice(1).every(x => !x.due), 'le 26 septembre : frais seulement');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(/prochaine fois le 17 oct\./.test(t), 'les réserves annoncent le 17 octobre');
  ok(/prochaine fois le 12 déc\./.test(t), 'la brosse à dents annonce le 12 décembre');
  ok(/prochaine fois le 14 nov\./.test(t), 'le ménage, à huit semaines, annonce le 14 novembre');
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
/* Depuis l'ancre du samedi 19 septembre, les semaines 0, 5, 10 et 15 sont dues :
   19 sept., 24 oct., 28 nov., 2 janv. Toutes les autres ne le sont pas. */
for (const [d, nom, du] of [['2026-09-19','19 sept',true], ['2026-09-26','26 sept',false],
                            ['2026-10-24','24 oct',true],  ['2026-10-31','31 oct',false],
                            ['2026-11-28','28 nov',true]]) {
  const { ctx, fr } = await jour(d + 'T10:00:00+02:00');
  const c = (await cartes(fr)).filter(x => /5 semaines/.test(x.titre))[0];
  ok(!!c && c.due === du, nom + ' : beurre de cacahuète dû ' + (c ? c.due : '?') + ' (' + du + ' attendu)');
  await ctx.close();
}

console.log('\n== 334b) Aucun stock n\'est supposé : il coche ce qu\'il a ==');
/* Modeliser un fond de placard etait une fausse bonne idee : il fallait le tenir a jour,
   et la liste mentait des qu'il mangeait autre chose. Tout part de zero le 19, et une
   case cochee dit « je l'ai deja ». Rien ne doit donc rester d'un calcul de stock. */
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(!/tu en as|il t’en reste|à racheter le/.test(t), 'aucune ligne ne parle de stock ni de date de rachat');
  ok(/Beurre de cacahuète — 2 kg/.test(t) && /demande 1\u202f925 g/.test(t), 'beurre de cacahuète : 2 kg pleins, pour 1 925 g demandés');
  ok(/Huile d'olive — 1,5 L/.test(t) && /demande 1\u202f440 ml/.test(t), 'huile : la bouteille d\'1,5 L entière, pour 1 440 ml demandés');
  await ctx.close();
}
{
  /* Le 17 octobre les reserves reviennent, aux memes quantites : aucun report. */
  const { ctx, fr } = await jour('2026-10-17T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(/Riz — 5 kg/.test(t) && /Pâtes — 3 kg/.test(t), 'le 17 octobre, riz et pâtes reviennent aux mêmes quantités');
  await ctx.close();
}

console.log('\n== 334c) Le nombre d\'articles du jour est calculé, jamais compté à la main ==');
/* Ce bloc verifiait aussi le TOTAL EN EUROS. Le 19 septembre il a demande que l'estimation
   de budget disparaisse : les prix etaient des estimations Alicante 2026, affichees par
   article et additionnees par semaine, par cycle et par mois -- une precision que la donnee
   n'avait pas. Reste le nombre d'articles, qui lui est vrai, et qu'on recompte ici
   INDEPENDAMMENT depuis les cartes affichees. */
for (const d of ['2026-09-19', '2026-09-26', '2026-10-17', '2026-11-21']) {
  const { ctx, fr } = await jour(d + 'T10:00:00+02:00');
  const r = await fr.evaluate(() => {
    const ligne = document.getElementById('courses-summary').innerText;
    let n = 0;
    document.querySelectorAll('#courses-grid .cat-card').forEach(c => {
      if(/pas cette semaine/.test(c.innerText)) return;
      n += c.querySelectorAll('li').length;
    });
    const mn = ligne.match(/(\d+) à prendre/);
    return {n, annonceN: mn ? Number(mn[1]) : -1, prix: /€/.test(ligne)};
  });
  ok(r.annonceN === r.n && r.n > 0, d + ' : ' + r.n + ' articles, annoncés et comptés pareil (' + r.annonceN + ')');
  ok(!r.prix, d + ' : et aucun montant dans le résumé');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  /* 14 par semaine : 2 par jour au petit-dejeuner, tire du plan de repas. Mais on
     n'achete pas 14 oeufs : une boite de 12 plus une de 6 font 18. */
  ok(/Œufs — 18/.test(t) && /demande 14 œufs/.test(t), 'les œufs : 18 achetés pour les 14 du plan');
  await ctx.close();
}

console.log('\n== 334d) L\'hygiène s\'achète au flacon entier ==');
/* Ces lignes-la n'ont pas besoin d'etre arrondies : un shampooing se vend au flacon. Ce
   qui compte, c'est que chacune affiche SON rythme, pour qu'une estimation fausse se
   corrige en un seul endroit visible. */
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  const esc = x => x.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  for (const [prod, qte, pourquoi] of [
        ['Shampooing', '1 flacon de 400 ml', '4 lavages par semaine'],
        ['Gel douche', '1 flacon de 750 ml', '8 douches par semaine'],
        ['Dentifrice', '2 tubes', '1 tube par mois'],
        ['Cotons-tiges', '1 boîte de 200', '2 par jour'],
        ['Rasoirs jetables', '1 paquet de 4', '1 par mois'],
        ['Brosse à dents', '1', 'une toutes les 12 semaines']]) {
    const re = new RegExp(esc(prod) + ' — ' + esc(qte) + '[^\n]*' + esc(pourquoi));
    ok(re.test(t), prod + ' : ' + qte + ' · ' + pourquoi);
  }
  ok(/Nettoyant visage/.test(t) && /Déodorant/.test(t) && /Cotons-tiges/.test(t),
     'nettoyant visage, déodorant et cotons-tiges ont chacun leur ligne');
  await ctx.close();
}

console.log('\n== 334) Plus d\'estimation de budget : ses tickets, et rien d\'autre ==');
/* Le panneau annoncait « Budget estimé : ~X € / semaine … ~Y € / mois environ (prix
   estimés Alicante 2026) ». Trois chiffres inventes, lus comme des vrais. Le 19 septembre
   il a tranche : plus de prix du tout, il envoie ses tickets et les montants reels vont
   dans Budget. Le panneau doit donc DIRE ou vivent les vrais chiffres, pas se taire. */
{
  const { ctx, fr } = await jour('2026-09-19T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-budget').innerText);
  ok(!/€/.test(t) && !/Budget estimé/.test(t), 'aucun montant, aucune estimation (' + t.slice(0, 60) + ')');
  ok(/tickets/.test(t) && /Budget/.test(t), 'et il dit où vivent les vrais chiffres : ' + t.slice(0, 90));
  const grille = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(!/€/.test(grille), 'aucune ligne d\'article ne porte de prix non plus');
  await ctx.close();
}

console.log('\n== 334e) Les deux choses que la Batcave ne peut pas deviner sont demandées ==');
/* Le stock inscrit est une photo du 13 septembre, et la liste ne chiffre plus rien : le
   seul montant vrai viendra de son ticket. Le jour de ses PREMIÈRES courses, le plan du
   jour lui demande les deux. Ni avant, ni après — et sans jamais écrire dans ses tâches.

   Ce jour-là n'est PAS l'ancre du rythme. ANCRE_COURSES est au samedi 19 et doit rester
   un samedi, sinon tous les rachats suivants tombent le mauvais jour ; mais le 19 au soir
   il a repoussé sa sortie à dimanche matin. Confondus, ces deux rappels tombaient le 19,
   un jour où il n'y allait pas, et ne revenaient jamais. D'où PREMIER_JOUR_COURSES. */
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
  const veille = await lire('2026-09-19'), jourJ = await lire('2026-09-20'), apres = await lire('2026-09-21');
  ok(/Avant de partir/.test(jourJ.txt) && /stock daté du 13/.test(jourJ.txt), 'le 20, le plan réclame le relevé du stock avant de partir');
  ok(/ticket de caisse/.test(jourJ.txt) && /aucun prix/.test(jourJ.txt), 'et le ticket au retour, en disant pourquoi');
  ok(jourJ.btn === 2, 'chacun porte un bouton qui ouvre la liste de courses (' + jourJ.btn + ')');
  ok(!/Avant de partir/.test(veille.txt) && !/ticket de caisse/.test(veille.txt), 'le 19, jour de l\'ancre mais pas de sa sortie, rien n\'est demandé');
  ok(!/Avant de partir/.test(apres.txt) && !/ticket de caisse/.test(apres.txt), 'le lendemain non plus : la demande ne traîne pas');
  ok(jourJ.taches === null, 'et rien n\'est écrit dans ses tâches — la Batcave demande, elle ne remplit pas sa liste');
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
