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
/* 20 septembre : les categories non dues ont quitte #courses-grid pour le repli
   #courses-grid-plus. On lit donc les deux, et « due » se lit desormais a la GRILLE qui
   porte la carte -- plus robuste qu'une phrase, et c'est exactement le nouveau contrat. */
const cartes = fr => fr.evaluate(() => [
  ...[...document.querySelectorAll('#courses-grid .cat-card')].map(c => ({c: c, due: true})),
  ...[...document.querySelectorAll('#courses-grid-plus .cat-card')].map(c => ({c: c, due: false}))
].map(x => ({
  titre: x.c.querySelector('h4').textContent,
  due: x.due,
  n: x.c.querySelectorAll('li').length
})));

console.log('\n== 330) Cinq catégories, toutes alimentaires, et le frais seul est hebdomadaire ==');
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const c = await cartes(fr);
  /* 20 septembre au soir, sa decision : la liste ne porte plus que de la nourriture.
     Les produits menagers, revenus le 19, ressortent avec l'hygiene et la brosse a dents.
     Cinq categories restent : frais, surgeles, reserves, cinq semaines, trimestriel. */
  ok(c.length === 5, '5 catégories, toutes alimentaires (' + c.length + ')');
  const hebdo = c[0];
  /* HUIT depuis le 22 septembre : le fromage est parti dans « Toutes les 2 semaines ».
     Il n'en consomme que 140 g par semaine et l'édam se vend par paquets de 400 — un
     paquet couvre presque trois semaines. Il portait déjà ce cycle-là tout en restant
     rangé dans le frais, et la catégorie annonçait donc un rythme qu'un de ses articles
     ne suivait pas. */
  ok(/Chaque semaine/.test(hebdo.titre) && hebdo.n === 8, 'la liste hebdomadaire fait 8 articles — les amandes entrent le 24 septembre, à la place du beurre de cacahuète (' + hebdo.n + ')');
  const t = await fr.evaluate(() => document.querySelector('.page[data-page="courses"]').textContent);
  ok(!/Riz/.test(hebdo.titre + '') && /Riz — 5 kg/.test(t) && /demande 4\u202f340 g/.test(t), 'le riz est en réserve : 5 kg achetés pour 4 340 g demandés');
  ok(!/Shampooing|Cotons-tiges|Nettoyant visage|Brosse à dents|Bain de bouche|Brossettes|Crème solaire|Lessive|Dentifrice/.test(t),
     'plus une seule ligne de santé et hygiène');
  ok(!/Éponges|Sacs poubelle|Nettoyant sol|Papier toilette|Essuie-tout|Liquide vaisselle|Anticalcaire|Nettoyant WC|Gants de ménage/.test(t),
     'plus une seule ligne de maison ni de ménage');
  ok(/Créatine monohydrate/.test(t), 'la créatine reste — elle s\'avale');
  await ctx.close();
}

console.log('\n== 331) Samedi 26 septembre : l\'ancre, tout est dû ==');
/* 26 septembre : l'ancre passe du samedi 19 au samedi 26, ses vraies premieres courses du
   programme (« on va dire que ajd c'est le premier jour de courses »). Tout le fichier
   a glisse d'une semaine avec elle. */
/* Samedi 19 = le battement du rythme. Tous les cycles partent de la, donc tombent
   toujours un samedi. Une categorie est due toute la SEMAINE qui s'ouvre a l'ancre,
   pas seulement ce jour-la : c'est ce qui permet a ses premieres courses du dimanche 20
   de porter la liste entiere. */
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.every(x => x.due), 'les 5 catégories sont dues le 26 (ancre commune)');
  const somme = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  /* Aucun stock n'est suppose : le 19, TOUTES les categories sont dues et toutes leurs
     lignes comptent. 9 frais + 1 surgele + 4 reserves + 2 (cycle de 5 semaines) + 1 pot de
     creatine = 17. Ce qu'il a deja, il le coche quand meme. */
  ok(/\/16 articles/.test(somme), '16 articles le 26 : tout part de zéro (' + somme + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-27T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c.every(x => x.due), 'et le dimanche 27, le lendemain de ses premières courses, tout est encore dû');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-10-03T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c[0].due && c.slice(1).every(x => !x.due), 'le samedi 3 octobre : le frais seulement, tout le reste vient d\'être acheté');
  await ctx.close();
}

console.log('\n== 332) Une semaine plus tard, seul le frais est dû ==');
{
  const { ctx, fr } = await jour('2026-10-03T10:00:00+02:00');
  const c = await cartes(fr);
  ok(c[0].due && c.slice(1).every(x => !x.due), 'le 3 octobre : frais seulement');
  const t = await fr.evaluate(() => document.querySelector('.page[data-page="courses"]').textContent);
  ok(/prochaine fois le 10 oct\./.test(t), 'les surgelés, à deux semaines, annoncent le 10 octobre');
  ok(/prochaine fois le 24 oct\./.test(t), 'les réserves annoncent le 24 octobre');
  ok(/prochaine fois le 31 oct\./.test(t), 'l\'huile, à cinq semaines, annonce le 31 octobre');
  ok(/prochaine fois le 19 déc\./.test(t), 'la créatine, au trimestre, annonce le 19 décembre');
  await ctx.close();
}

console.log('\n== 333) L\'habitude « Courses faites » reste validable ==');
/* Le piege : si le compte incluait les categories non dues, cocher toute la liste
   d'un samedi ordinaire ne suffirait plus jamais, et l'habitude serait morte. */
{
  const { ctx, fr } = await jour('2026-10-03T10:00:00+02:00');
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
  ok(/^8\/8/.test(somme), 'cocher le frais suffit : ' + somme + ' (' + avant + ' cases)');
  const coche = await fr.evaluate(() => {
    const l = [...document.querySelectorAll('#dash-checklist li label')].map(x => x.textContent);
    return l.some(x => /Courses/.test(x));
  });
  ok(coche, 'l\'habitude Courses est bien présente le samedi');
  await ctx.close();
}

console.log('\n== 333b) L\'huile tourne sur cinq semaines ==');
/* Le cycle de cinq semaines venait du beurre de cacahuete (2 kg tombaient pile) ; il est
   sorti du plan le 24 septembre et l'huile y reste seule -- le bidon de 2 L couvre les
   1 575 ml du cycle. */
/* Depuis l'ancre du samedi 19 septembre, les semaines 0, 5, 10 et 15 sont dues :
   19 sept., 24 oct., 28 nov., 2 janv. Toutes les autres ne le sont pas. */
for (const [d, nom, du] of [['2026-09-26','26 sept',true], ['2026-10-03','3 oct',false],
                            ['2026-10-31','31 oct',true],  ['2026-11-07','7 nov',false],
                            ['2026-12-05','5 déc',true]]) {
  const { ctx, fr } = await jour(d + 'T10:00:00+02:00');
  const c = (await cartes(fr)).filter(x => /5 semaines/.test(x.titre))[0];
  ok(!!c && c.due === du, nom + ' : l\'huile due ' + (c ? c.due : '?') + ' (' + du + ' attendu)');
  await ctx.close();
}

console.log('\n== 334b) Aucun stock n\'est supposé : il coche ce qu\'il a ==');
/* Modeliser un fond de placard etait une fausse bonne idee : il fallait le tenir a jour,
   et la liste mentait des qu'il mangeait autre chose. Tout part de zero le 19, et une
   case cochee dit « je l'ai deja ». Rien ne doit donc rester d'un calcul de stock. */
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const t = await fr.evaluate(() => document.querySelector('.page[data-page="courses"]').textContent);
  ok(!/tu en as|il t’en reste|à racheter le/.test(t), 'aucune ligne ne parle de stock ni de date de rachat');
  ok(!/Beurre de cacahuète/.test(t), 'le beurre de cacahuète est sorti de la liste (24 septembre)');
  ok(/Amandes ou noix nature — 600 g/.test(t) && /demande 445 g/.test(t), 'amandes : 3 sachets de 200 g, pour 445 g demandés (collation combat comprise)');
  ok(/Huile d'olive — 2 L/.test(t) && /demande 1\u202f575 ml/.test(t), 'huile : un bidon de 2 L, pour 1 575 ml demandés');
  await ctx.close();
}
{
  /* Le 17 octobre les reserves reviennent, aux memes quantites : aucun report. */
  const { ctx, fr } = await jour('2026-10-24T10:00:00+02:00');
  const t = await fr.evaluate(() => document.querySelector('.page[data-page="courses"]').textContent);
  ok(/Riz — 5 kg/.test(t) && /Pâtes — 3 kg/.test(t), 'le 24 octobre, riz et pâtes reviennent aux mêmes quantités');
  await ctx.close();
}

console.log('\n== 334c) Le nombre d\'articles du jour est calculé, jamais compté à la main ==');
/* Ce bloc verifiait aussi le TOTAL EN EUROS. Le 19 septembre il a demande que l'estimation
   de budget disparaisse : les prix etaient des estimations Alicante 2026, affichees par
   article et additionnees par semaine, par cycle et par mois -- une precision que la donnee
   n'avait pas. Reste le nombre d'articles, qui lui est vrai, et qu'on recompte ici
   INDEPENDAMMENT depuis les cartes affichees. */
for (const d of ['2026-09-26', '2026-10-03', '2026-10-24', '2026-11-28']) {
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
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const t = await fr.evaluate(() => document.querySelector('.page[data-page="courses"]').textContent);
  /* 14 par semaine : 2 par jour au petit-dejeuner, tire du plan de repas. Mais on
     n'achete pas 14 oeufs : une boite de 12 plus une de 6 font 18. */
  ok(/Œufs — 30/.test(t) && /demande 28 œufs/.test(t), 'les œufs : 30 achetés pour les 28 du plan (deux au petit-déjeuner, deux à la collation)');
  await ctx.close();
}

console.log('\n== 334d) La liste ne porte QUE de la nourriture ==');
/* Ce bloc testait l'inverse : que chaque flacon d'hygiene affiche son rythme et le calcul
   qui le justifie. Le 20 septembre il a tranche autrement -- « tu traques trop mal, dans
   l'onglet courses tu vas juste laisser les aliments et la bouffe cest tout ».
   Il a raison sur le fond : ces rythmes etaient calcules sur des volumes d'usage SUPPOSES
   (8 ml de shampooing par lavage, 10 ml de gel douche par douche). Rien dans la Batcave ne
   mesure ca, et un chiffre qu'on ne sait pas mesurer n'a rien a faire dans une liste qui
   se veut exacte. Ce qui reste sort du plan de repas, au gramme pres, et se verifie.
   La porte tient donc maintenant dans l'autre sens : aucune ligne non alimentaire, et
   chaque ligne restante adossee au plan -- sauf la creatine, qui s'avale. */
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const lignes = await fr.evaluate(() =>
    [...document.querySelectorAll('#courses-grid label, #courses-grid-plus label')]
      .map(l => l.textContent.split(' \u2014 ')[0].trim()));
  /* Le fromage n'est plus la 6e ligne du frais : depuis le 22 septembre il est range
     dans « Toutes les 2 semaines », derriere les surgeles, parce que c'est le cycle
     qu'il portait deja. L'ordre attendu suit donc le DOM, categorie par categorie. */
  const ATTENDU = ['Poulet', 'Viande hachée 5 %', 'Skyr', 'Œufs',
                   'Pain complet', 'Bananes', 'Fruits (pommes, poires, oranges…)',
                   'Amandes ou noix nature',
                   'Légumes verts surgelés', 'Fromage en tranches',
                   'Riz', 'Pâtes', 'Flocons d\'avoine',
                   /* 26 septembre : le miel passe au cycle de cinq semaines, en pot de 750 g */
                   'Huile d\'olive', 'Miel', 'Créatine monohydrate'];
  ok(lignes.length === 16, '16 lignes, pas une de plus (' + lignes.length + ')');
  ok(JSON.stringify(lignes) === JSON.stringify(ATTENDU),
     'et ce sont exactement les seize attendues' +
     (JSON.stringify(lignes) === JSON.stringify(ATTENDU) ? '' : ' — reçu : ' + lignes.join(' · ')));
  /* Nommement, les rayons qui sont sortis : hygiene, maison, menage, brosse a dents. */
  const SORTIS = ['Shampooing', 'Après-shampooing', 'Gel douche', 'Nettoyant visage', 'Dentifrice',
                  'Déodorant', 'Cotons-tiges', 'Rasoirs jetables', 'Fil dentaire', 'Lessive',
                  'Détachant', 'Bain de bouche', 'Brossettes interdentaires', 'Crème hydratante',
                  'Crème solaire', 'Mouchoirs', 'Papier toilette', 'Sacs poubelle 30 L',
                  'Sacs poubelle salle de bain', 'Liquide vaisselle', 'Éponges + grattoirs',
                  'Essuie-tout', 'Nettoyant sol (fregasuelos)', 'Anticalcaire salle de bain',
                  'Multi-usage dégraissant', 'Nettoyant WC', 'Gants de ménage', 'Brosse à dents'];
  const restes = SORTIS.filter(x => lignes.indexOf(x) > -1);
  ok(restes.length === 0, 'les 28 lignes non alimentaires ont toutes disparu' +
     (restes.length ? ' — reste : ' + restes.join(' · ') : ''));
  /* La brosse a dents n'est pas perdue pour autant : son habitude du dimanche la suit,
     une semaine sur douze. On le verifie sur la carte elle-meme, dans l'onglet Habitudes --
     une sonde absente rendrait l'assertion toujours vraie, donc inutile. */
  const brosse = await fr.evaluate(() => {
    document.querySelectorAll('.page').forEach(p => { p.hidden = p.dataset.page !== 'habitudes'; });
    return document.querySelector('.page[data-page="habitudes"]').textContent;
  });
  ok(/Brosse à dents changée/.test(brosse),
     'la brosse à dents reste suivie par son habitude du dimanche, hors des courses');
  await ctx.close();
}

console.log('\n== 334) Ses prix a lui, releves en magasin -- et rien d\'invente ==');
/* Le panneau annoncait d'abord « Budget estimé : ~X € / semaine … (prix estimés Alicante
   2026) » : trois chiffres inventes, lus comme des vrais. Le 19 septembre il a fait sauter
   tout ca -- « enleve l'estimation de budget, des que j'acheterai je t'enverrai les
   factures ». Le 20 et le 21 il est alle au magasin et a releve QUINZE prix sur seize, avec
   la boutique et la date. Ils sont donc revenus, et la regle testee ici a change de sens :
   ce n'est plus « aucun prix », c'est « aucun prix INVENTE ». Ce qui doit tenir :
     - le panneau chiffre le mois et la semaine, et dit que le calcul vient de SES releves ;
     - le mot « estim » n'apparait nulle part ;
     - AUCUNE ligne n'est sans prix. Le beurre de cacahuete l'a ete une journee, faute
       d'avoir lu la fiche Alcampo qu'il avait envoyee le 21 a 15:39 ; ses 5,30 EUR/kg y
       etaient. Le panneau ne doit donc plus annoncer de ligne hors total ;
     - le panneau continue de renvoyer vers Budget, ou vivent les montants vraiment payes ;
     - chaque ligne alimentaire porte son prix, ou dit qu'il manque -- jamais un chiffre
       pose a la place. */
{
  const { ctx, fr } = await jour('2026-09-26T10:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('courses-budget').innerText);
  ok(!/estim/i.test(t), 'le mot « estimation » a disparu du panneau (' + t.slice(0, 60) + ')');
  ok(/€ par mois/.test(t) && /€ par semaine/.test(t) && /relevés en magasin/.test(t),
     'un montant par mois et par semaine, calculé sur ses relevés : ' + t.slice(0, 80));
  /* Le pendant exact de l'assertion d'avant : plus aucune ligne hors total, parce que
     les seize sont chiffrees. Si un prix disparaissait de PRIX, le panneau se remettrait
     a l'annoncer -- et ce test le dirait. */
  /* 24 septembre : une ligne n'a plus de prix -- les amandes, qu'il n'a pas encore
     relevees. Le panneau le DIT, la nomme, et la sort du total : c'est le trou qu'on
     montre, jamais un chiffre invente pour le boucher. */
  /* 25 septembre au soir : leur prix est releve (12 EUR/kg) -- plus de ligne hors total. */
  ok(!/prix pas encore relevé/.test(t) && !/hors total/.test(t),
     'plus aucune ligne hors total : les amandes ont leur prix (' + t.slice(0, 70) + ')');
  ok(/Budget/.test(t) && /Nourriture/.test(t),
     'et il dit toujours où vivent les montants payés : Budget → Nourriture');
  /* Les prix sur les lignes elles-memes. La creatine est hors plan de repas -- elle
     n'a ni besoin hebdomadaire ni prix releve -- donc elle n'affiche rien, et c'est
     juste : un chiffre pose la serait invente. */
  /* textContent, PAS innerText : les pastilles sont mises en capitales par le CSS, et
     innerText rend le texte TRANSFORMÉ — « ALCAMPO PRIX À RELEVER », « 7,50 €/KG ».
     Les assertions ci-dessous cherchent ce que le code ÉCRIT, pas ce que le CSS affiche. */
  const lignes = await fr.evaluate(() =>
    [...document.querySelectorAll('#courses-grid .cat-card li')].map(l => l.textContent));
  const muettes = lignes.filter(l => !/€|Créatine/.test(l));
  ok(lignes.length > 0 && muettes.length === 0,
     'les ' + lignes.length + ' lignes du jour portent toutes leur prix' +
     (muettes.length ? ' — muettes : ' + muettes.join(' · ') : ''));
  ok(!lignes.some(l => /prix à relever/.test(l)) && lignes.some(l => /^Amandes/.test(l) && /12,00 €\/kg/.test(l)),
     'plus aucune ligne ne dit « prix à relever » : les amandes à 12 €/kg');
  ok(!lignes.some(l => /Beurre de cacahuète/.test(l)), 'plus de beurre de cacahuète');
  ok(lignes.some(l => /Poulet/.test(l) && /7,50 €\/kg/.test(l)),
     'le poulet porte le prix de sa boucherie : 7,50 €/kg');
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
      taches: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-taches') || 'null')
    }));
    await ctx.close();
    return r;
  };
  /* 26 septembre : ses premieres vraies courses du programme sont le samedi 26 -- un jour de
     l'ancre, cette fois. La veille et le lendemain restent muets. */
  const veille = await lire('2026-09-25'), jourJ = await lire('2026-09-26'), apres = await lire('2026-09-27');
  ok(/Avant de partir/.test(jourJ.txt) && /aucun stock/.test(jourJ.txt), 'le 26, le plan réclame le relevé du stock avant de partir');
  ok(/ticket de caisse/.test(jourJ.txt) && /Budget → Nourriture/.test(jourJ.txt), 'et le ticket au retour, en disant où il va');
  ok(jourJ.btn === 2, 'chacun porte un bouton qui ouvre la liste de courses (' + jourJ.btn + ')');
  ok(!/Avant de partir/.test(veille.txt) && !/ticket de caisse/.test(veille.txt), 'le 25, la veille, rien n\'est demandé');
  ok(!/Avant de partir/.test(apres.txt) && !/ticket de caisse/.test(apres.txt), 'le lendemain non plus : la demande ne traîne pas');
  ok(jourJ.taches === null, 'et rien n\'est écrit dans ses tâches — la Batcave demande, elle ne remplit pas sa liste');
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
