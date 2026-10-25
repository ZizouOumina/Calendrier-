/* Repas → courses : la liste vient du plan × 7 jours, l'ajustement kcal se lit dans le féculent du dîner et dans les courses. */
/* 20 septembre : l'onglet Courses ne met plus dans #courses-grid que les categories DUES
   du jour ; les autres descendent dans le repli « pas aujourd'hui » (#courses-grid-plus).
   Ce fichier verifie le PLAN, pas l'affichage du jour : il lit donc les deux grilles. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { if(sessionStorage.getItem('__a53')) return; sessionStorage.setItem('__a53','1'); Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const MARDI = '2026-09-08T10:00:00+02:00';
/* La boucle poids -> calories ecarte les pesees d'avant le 10 octobre (glycogene et eau
   du changement d'alimentation). Le 3 novembre est un mardi comme le 8 septembre :
   meme rotation, memes macros. */
const MARDI_KCAL = '2026-11-24T10:00:00+01:00';   /* 16 octobre : jour 1 au samedi 17, stabilisation jusqu'au 7 novembre -- les quatorze jours de pesees tombent tous apres */
const page_ = (fr, p) => fr.evaluate(x => { document.querySelector('.nav-btn[data-page="' + x + '"]').click(); }, p);

console.log('\n== 180) Sans ajustement : plan de base, liste = plan × 7 ==');
{
  const { ctx, fr } = await ouvrir(MARDI);
  await page_(fr, 'courses');
  const c = await fr.evaluate(() => ({ items: [...document.querySelectorAll('#courses-grid label, #courses-grid-plus label')].map(l => l.textContent), note: document.getElementById('courses-plan-note').textContent, budget: document.getElementById('courses-budget').textContent, n: document.querySelectorAll('#courses-grid input, #courses-grid-plus input').length }));
  /* 20 septembre, sa derniere decision sur cette liste : « dans l'onglet courses tu vas
     juste laisser les aliments et la bouffe cest tout ». Les trois rayons non alimentaires
     sont sortis -- Sante et hygiene (16 lignes), Maison (6), Menage (5) -- et la brosse a
     dents avec eux. Restent CINQ rythmes, tous alimentaires : 8 articles frais chaque
     semaine, 2 toutes les 2 semaines (les surgeles et le fromage), 4 reserves toutes les 4,
     2 toutes les 5, et le pot de creatine tous les 3 mois -- la seule ligne qui ne sorte
     pas du plan de repas, parce qu'elle s'avale tous les soirs et que rien d'autre ne la
     rachete. Le fromage a rejoint les surgeles le 22 septembre : c'est le cycle qu'il
     portait deja, et « Chaque semaine » redevient vrai pour ses huit lignes.
     Le 23 septembre, le jambon sort (deux oeufs a la collation) : sept lignes chaque
     semaine, seize en tout. */
  /* 21 octobre : trois lignes de plus, ajoutees en fin de categorie -- les sardines (chaque
     semaine), les fruits rouges et les galettes de riz (toutes les 2 semaines) ; le couscous
     prend la place du riz. Vingt lignes. */
  /* 23 octobre au soir, le plan dense : le pain et les fruits sortent (plus rien a macher), le
     riz remplace semoule et pates (une ligne pour deux), les dattes entrent. Dix-huit lignes. */
  ok(c.n === 18, '18 articles au total, tous rythmes confondus — plus de pain, de fruits ni de pâtes depuis le 23 octobre, les dattes entrent (' + c.n + ')');
  /* Deux chiffres par ligne, et il faut les deux : ce qu'on ACHETE (un multiple du
     conditionnement) et ce que le PLAN demande (la somme des 7 jours de repas). Riz
     135 g/jour -> 945/semaine -> 3 780 sur 4 semaines, donc 4 paquets de 1 kg ;
     pates 105 -> 735 -> 2 940, donc 3 paquets de 1 kg -- le format dont il a donne le
     prix lui-meme (1,09 EUR/kg). Acheter en dessous du besoin
     serait une rupture en milieu de cycle : l'arrondi va toujours VERS LE HAUT. */
  /* 21 octobre : le couscous remplace le riz du midi -- 125 g par jour, 170 les trois jours de
     combat, 1 010 g par semaine, 4 040 g sur quatre semaines : 5 paquets de 1 kg. */
  /* 23 octobre, le plan de prise de masse : 140 g de semoule et 140 g de pates, tous les jours. */
  /* 23 octobre au soir : le riz au rice cooker, midi et soir -- 250 g par jour, 7 000 g sur quatre semaines. */
  ok(c.items.some(t => /^Riz — 7 kg\b/.test(t) && !/demande/.test(t)) && !c.items.some(t => /^(Couscous|Pâtes)/.test(t)), 'riz : 7 kg pour quatre semaines (125 g midi et soir), plus de semoule ni de pâtes (' + c.items.find(t => /^Riz/.test(t)) + ')');
  /* Depuis le 20 septembre la rotation est la meme tous les jours : poulet a midi
     (80 g x 7 = 560), viande hachee le soir (90 g x 7 = 630). Le poisson est sorti.
     La viande ne s'arrondit PAS : le boucher pese le montant exact, donc ces deux
     lignes portent le chiffre du plan tel quel, sans surplus. */
  /* 23 octobre : 120 g de viande par repas -- 840 g de chaque par semaine. */
  /* 25 octobre : 80 g de viande par repas (« reduis juste la viande ») -- 560 g de chaque par semaine. */
  /* 25 octobre, la suite : 50 g (« descends a 120 g de proteines sans toucher au skyr ») -- 350 g. */
  ok(c.items.some(t => /^Poulet — 350 g .*pesé au comptoir/.test(t) && !/demande/.test(t))
  && c.items.some(t => /^Viande hachée 5 % — 350 g .*pesée au comptoir/.test(t))
  && !c.items.some(t => /^Saumon/.test(t)),
     'viande au gramme près, pesée au comptoir, et plus de poisson : ' + c.items.filter(t => /^(Poulet|Viande|Saumon)/.test(t)).join(' · '));
  /* Les fruits se comptent, ils ne se pesent pas. */
  /* 21 octobre au soir : trois bananes de plus par semaine, celles du shake de recup. */
  /* 23 octobre au soir : le fruit a croquer sort (le volume) ; les bananes du shake restent. */
  ok(c.items.some(t => /^Bananes — 13 .*l'unité/.test(t)) && !c.items.some(t => /^Fruits \(/.test(t)),
     'bananes à l\'unité, plus de fruits à croquer : ' + c.items.filter(t => /^(Bananes|Fruits)/.test(t)).join(' · '));
  /* Le reste au paquet, avec le plus petit format courant : 5 pots de 450 g laissent
     115 g de surplus de skyr, la ou 5 pots de 500 en laissaient 365. Le 21 septembre, en
     rayon : le format qu'il achete est la BOITE DE 150 g a 0,75 €. Meme quantite achetee
     (2,25 kg) et meme surplus (115 g), mais quinze boites au lieu de cinq pots. */
  /* 29 septembre, le shake : 150 g de skyr le matin au lieu de 180 -> 1 925 g par semaine,
     13 boites. Le meme soir, les sauces au skyr sortent : il ne reste que le shake,
     150 g par jour, 1 050 g par semaine -- 7 boites, zero surplus. */
  ok(c.items.some(t => /^Skyr — 1,05 kg\b/.test(t) && !/demande/.test(t) && /7 boîtes de 150 g/.test(t))
  && !c.items.some(t => /^Cacahuètes/.test(t)),
     'skyr : 1,05 kg en 7 boîtes de 150 g pour 1 050 g demandés (le shake seul)');
  /* 21 octobre au soir : 750 ml de plus par semaine pour le shake de recup (5 700 ml sur deux
     semaines, le pack de 6 L suffit encore), et la version au calcium. */
  /* 23 octobre : 400 ml le matin, 7,1 L sur deux semaines -- en briks de 1 L, le pack de 6 ne suffit plus. */
  ok(c.items.some(t => /^Boisson d\'avoine — 8 L\b/.test(t) && /8 briks de 1 L/.test(t) && /demande 7\u202f100 ml/.test(t) && /0,74 €\/L/.test(t) && /au calcium/.test(t)),
     'boisson d\'avoine : 8 briks de 1 L (Lidl, 0,74 €/L) toutes les deux semaines pour les 7 100 ml des shakes, version au calcium');
  /* L'HUILE etait la vraie erreur : 288 ml par semaine, donc 1 152 sur 4 semaines alors
     que la liste disait 1 000 -- quatre jours de rupture par cycle, tous les mois. Elle est
     passee a 5 semaines. Depuis le retrait du poisson elle monte a 315 ml par semaine
     (30 ml a midi avec le poulet, 15 le soir avec la viande hachee, les sept jours) :
     1 575 ml par cycle. Le 21 septembre, en rayon : le format qu'il achete est le BIDON
     DE 2 L a 11,89 €. Un seul suffit donc pour le cycle, et il reste 425 ml -- qui ne sont
     pas perdus, rien n'est modelise en stock ici : il coche la ligne sans acheter tant
     qu'il lui en reste. */
  /* Les legumes surgeles sont passes a DEUX semaines le 20 septembre : 10 kg par passage
     ne rentraient pas dans son congelateur. La consommation n'a pas bouge (2 450 g par
     semaine), c'est le rythme de rachat qui a change -- 5 kg tous les quinze jours. */
  ok(c.items.some(t => /^Œufs — 12\b/.test(t) && /demande 10 œufs/.test(t))
  && c.items.some(t => /^Légumes verts surgelés — 3 kg\b/.test(t) && /demande 2\u202f240 g/.test(t))
  && c.items.some(t => /^Huile d'olive — 2 L\b/.test(t) && /1 bouteille de 2 L/.test(t) && /demande 1\u202f750 ml/.test(t)),
     'œufs 12 pour 10 (les sardines prennent le mardi et le jeudi depuis le 21 octobre), surgelés 3 kg pour 2 240 g sur deux semaines (80 g par repas depuis le 23 octobre), huile 2 L pour 1 750 ml sur cinq (30 ml à midi, 20 le soir depuis le 25 octobre, 21 octobre)');
  /* Aucun stock n'est suppose : rien ne dit « tu en as », rien n'est repousse a plus tard. */
  ok(!c.items.some(t => /tu en as|il t’en reste|à racheter le/.test(t)), 'aucune ligne ne suppose un stock : tout part de zéro, il coche ce qu\'il a');
  /* Le contraire de ce que ce fichier tenait jusqu'au 20 septembre : ces lignes ne
     doivent PLUS exister. Elles etaient revenues le 19, puis leurs rythmes avaient ete
     recalcules le 20 -- mais ces rythmes restaient des estimations posees sur des volumes
     d'usage supposes, et il n'en veut pas. Cette porte garde la liste alimentaire. */
  const intrus = c.items.filter(t => /^(Shampooing|Après-shampooing|Gel douche|Nettoyant visage|Dentifrice|Déodorant|Cotons-tiges|Rasoirs|Fil dentaire|Lessive|Détachant|Bain de bouche|Brossettes|Crème|Mouchoirs|Papier toilette|Sacs poubelle|Liquide vaisselle|Éponges|Essuie-tout|Nettoyant sol|Anticalcaire|Multi-usage|Nettoyant WC|Gants de ménage|Brosse à dents)/.test(t));
  ok(intrus.length === 0, 'plus rien de non alimentaire dans la liste' + (intrus.length ? ' — reste : ' + intrus.join(' · ') : ''));
  /* La creatine, elle, reste : elle s'avale, et aucune autre page ne la rachete. */
  ok(c.items.some(t => /^Créatine monohydrate — 1 pot de 500 g/.test(t)), 'la créatine reste — elle s\'avale, et rien d\'autre ne la rachète');
  ok(/Aucun ajustement/.test(c.note), 'note : ' + c.note.slice(0, 60));
  /* Le budget ESTIME a ete retire le 19 septembre : il annoncait un cout par semaine, par
     cycle et par mois a partir de prix Alicante 2026 inventes -- trois chiffres faux lus
     comme des vrais. Les 20 et 21, il est alle en magasin et a releve quinze prix sur
     seize, chacun avec sa boutique et sa date. Les montants sont donc revenus, mais ce
     sont les SIENS : ce bloc ne garde plus « aucun prix », il garde « aucun prix
     invente ». Le mot « estim » ne doit reapparaitre nulle part. */
  ok(!/estim/i.test(c.budget), 'aucune estimation dans le panneau : ' + c.budget.slice(0, 70));
  ok(/relevés en magasin/.test(c.budget) && /par mois/.test(c.budget),
     'il chiffre le mois sur ses propres relevés');
  ok(/Budget/.test(c.budget) && /Nourriture/.test(c.budget),
     'et il renvoie vers Budget → Nourriture, où le montant payé est vrai');
  /* Les lignes portent le prix au kilo, au litre ou a la piece, et les SEIZE l'ont.
     Le beurre de cacahuete a dit « prix a relever » pendant une journee, faute d'avoir
     lu la fiche Alcampo qu'il m'avait envoyee le 21 a 15:39 -- ses 5,30 EUR/kg y
     etaient. Seule la creatine n'affiche rien, et c'est juste : elle ne sort pas du plan
     de repas, donc elle n'a ni besoin hebdomadaire ni prix releve. */
  ok(c.items.some(t => /^Poulet/.test(t) && /7,50 €\/kg/.test(t)),
     'le poulet porte le prix de sa boucherie (' + c.items.find(t => /^Poulet/.test(t)) + ')');
  /* 24 septembre : le beurre de cacahuete sort du plan, les amandes le remplacent. Elles
     sont restees un jour sans prix (« prix a relever », hors total) ; le 25 au soir, son
     releve : 12 EUR le kilo. Plus aucune ligne ne dit « prix a relever ». */
  ok(!c.items.some(t => /^Beurre de cacahuète/.test(t)), 'le beurre de cacahuète est sorti de la liste');
  /* 29 septembre : la boisson d\'avoine du shake attend son prix (son ticket) -- c'est la seule ligne. */
  /* 21 octobre : couscous, fruits rouges, galettes de riz et sardines attendent son ticket. */
  ok(c.items.filter(t => /prix à relever/.test(t)).every(t => /^(Boisson d\'avoine|Couscous|Fruits rouges|Galettes de riz|Sardines|Dattes)/.test(t)) && c.items.some(t => /^Amandes ou noix nature/.test(t) && /12,00 €\/kg/.test(t)),
     'les amandes portent leur prix, 12 €/kg ; seuls les nouveaux articles du 21 octobre attendent le leur (' + c.items.find(t => /^Amandes/.test(t)) + ')');

  await page_(fr, 'repas');
  const r = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)) }) && [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText);
  /* 21 octobre : la sauce du mardi soir est comptee -- pesto verde 15 g et parmesan 10 g
     (≈ 110 kcal), a la place des 5 ml d'huile crue : ~908 kcal. */
  /* 23 octobre au soir : riz 125 g, viande hachee 100 g, 15 ml d'huile -- ~857 kcal. */
  /* 25 octobre : viande hachee 50 g, 20 ml d'huile -- ~833 kcal. */
  ok(/Riz 125g/.test(r) && /~833 kcal/.test(r) && /Viande hachée 5 % 50g/.test(r) && !/Sauce skyr/.test(r) && /≈ 110 kcal, comptée/.test(r), 'dîner de base du mardi : riz 125 g, viande hachée 50 g, la sauce comptée (≈ 110 kcal), ~833 kcal');
  await ctx.close();
}

console.log('\n== 181) Avec +150 kcal : le dîner et les courses l\'écrivent ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, {'batcave-kcal-ajustement': {valeur:150, depuis:'2026-09-01'}});
  await page_(fr, 'repas');
  const r = await fr.evaluate(() => [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText);
  ok(/Riz 165g/.test(r), 'féculent du dîner : riz 165 g (+40)');
  ok(/boucle kcal \+150 kcal/.test(r) && /~977 kcal/.test(r), 'le dîner annonce ~977 kcal et la boucle');
  const sub = await fr.evaluate(() => document.getElementById('meal-kcal-sub').textContent);
  /* 3 131 + 144 : la boucle demande +150 kcal, mais les pates s'ajustent par pas de 10 g,
     donc elle en ajoute 144. On annonce l'ecart REEL entre les deux journees, pas la
     consigne -- sinon la soustraction affichee ne tombe pas juste. */
  /* 23 octobre au soir : le plan dense -- plan 3 198. */
  /* 25 octobre : 50 g de viande, 7 dattes, 20 g de miel, la boisson d'avoine du Lidl -- plan 3 236. */
  ok(/\/ 3380 kcal \(plan 3236 \+ 144\)/.test(sub), 'cible du jour : ' + sub);
  /* cocher tout le dîner : l\'apport consommé porte les 150 kcal */
  /* un clic redessine la grille : on re-cherche la première case non cochée du dîner à chaque tour */
  await fr.evaluate(() => { for(let i = 0; i < 10; i++){ const card = [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)); const cb = card && card.querySelector('input:not(:checked)'); if(!cb) break; cb.click(); } });
  await page.waitForTimeout(200);
  const sub2 = await fr.evaluate(() => document.getElementById('meal-kcal-sub').textContent);
  ok(/^977 \/ 3380 kcal/.test(sub2), 'dîner coché : ' + sub2);
  await page_(fr, 'courses');
  const c = await fr.evaluate(() => ({ items: [...document.querySelectorAll('#courses-grid label, #courses-grid-plus label')].map(l => l.textContent), note: document.getElementById('courses-plan-note').textContent }));
  /* L'ajustement suit le sac : +280 g par semaine font +1 120 g sur quatre semaines.
     Pas de ligne hebdomadaire en plus -- on n'achete pas un sachet de 280 g. */
  /* 5 kg et non 4,5 : le conditionnement des pâtes est passé au paquet de 1 kg, celui
     dont il a donné le prix. L'arrondi va toujours AU-DESSUS du besoin, donc 4 060 g
     demandés font cinq paquets — 940 g de surplus, qui se cuisent et partent en
     tupperware comme le reste. */
  ok(c.items.some(t => /^Riz — 9 kg\b/.test(t) && /demande 8\u202f120 g/.test(t)), 'la boucle kcal remonte le besoin à (1 750 + 280) × 4 = 8 120 g, et l\'achat suit à 9 kg (' + c.items.find(t => /^Riz/.test(t)) + ')');
  ok(/\+150 kcal\/jour/.test(c.note) && /\+40 g de riz cru/.test(c.note) && /\+280 g sur la semaine/.test(c.note), 'note : ' + c.note.slice(0, 120));
  /* La boucle kcal ne touche QUE le feculent du diner : les proteines gardent la quantite
     de la rotation, 560 g de poulet par semaine. */
  ok(c.items.filter(t => /^Poulet/.test(t)).length === 1 && /350 g/.test(c.items.find(t => /^Poulet/.test(t))), 'les protéines ne bougent pas');
  await ctx.close();
}

console.log('\n== 182) Appliquer / revenir depuis la boucle met tout à jour d\'un coup ==');
{
  const local = {};
  const d0 = new Date('2026-11-11T00:00:00');
  for(let i = 0; i < 14; i++){ const d = new Date(d0); d.setDate(d0.getDate() + i); local['batcave-journal-' + d.toISOString().slice(0,10)] = {poids: (64 + (i < 7 ? 0 : 0.02)).toFixed(2), sommeil:'', water:0, complements:[], notes:'', mood:null, coran:'', duaa:''}; }
  const { ctx, fr, page } = await ouvrir(MARDI_KCAL, local);
  await page_(fr, 'repas');
  const b = await fr.evaluate(() => ({ note: document.getElementById('kcal-note').textContent, bouton: document.getElementById('kcal-appliquer').hidden }));
  ok(/\+150/.test(b.note) && b.bouton === false, 'la boucle recommande +150 kcal (' + b.note + ')');
  await fr.evaluate(() => document.getElementById('kcal-appliquer').click());
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText,
    courses: (document.querySelector('.nav-btn[data-page="courses"]').click(), [...document.querySelectorAll('#courses-grid label, #courses-grid-plus label')].map(l => l.textContent).find(t => /^Riz/.test(t))) }));
  ok(/Riz 165g/.test(apres.diner) && /Riz — 9 kg/.test(apres.courses), 'après « Appliquer » : dîner à 165 g de riz, courses à 9 kg');
  await page_(fr, 'repas');
  await fr.evaluate(() => document.getElementById('kcal-reset').click());
  await page.waitForTimeout(250);
  const retour = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText,
    courses: (document.querySelector('.nav-btn[data-page="courses"]').click(), [...document.querySelectorAll('#courses-grid label, #courses-grid-plus label')].map(l => l.textContent).find(t => /^Riz/.test(t))) }));
  ok(/Riz 125g/.test(retour.diner) && /7 kg/.test(retour.courses), 'après « Revenir au plan de base » : 125 g au dîner et 7 kg de riz');
  await ctx.close();
}

console.log('\n== 182) Les macros ne sont plus ecrites : elles se recalculent, et on les recompte ==');
/* Le vrai risque du plan alimentaire n'est pas un mauvais chiffre, c'est un chiffre JUSTE
   QUI DEVIENT FAUX : « ~931 kcal · P44 G110 L33 » etait ecrit a cote des aliments, et
   changer un grammage ne le changeait pas. Ce bloc recompte tout DE SON COTE, depuis la
   table de composition et les grammages du jour, et compare a ce que l'ecran affiche.
   Si les deux divergent d'une seule calorie, c'est un echec. */
for (const jour of ['2026-09-20','2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26']) {
  const { ctx, fr, page } = await ouvrir(jour + 'T10:00:00+02:00');
  await page_(fr, 'repas');
  const r = await fr.evaluate(iso => {
    const A = window.__bcAliments, noms = ['Petit-déjeuner','Déjeuner','Collation entraînement','Dîner'];
    const recompte = n => {
      const t = {kcal:0, p:0, g:0, l:0};
      window.__bcCompoRepas(n, iso, false).forEach(x => {
        const a = A[x.c];
        t.kcal += a.kcal * x.q / 100; t.p += a.p * x.q / 100; t.g += a.g * x.q / 100; t.l += a.l * x.q / 100;
      });
      return {kcal: Math.round(t.kcal), p: Math.round(t.p), g: Math.round(t.g), l: Math.round(t.l)};
    };
    const affiche = {};
    document.querySelectorAll('.meal-card').forEach(c => {
      affiche[c.querySelector('.mtitle').textContent] = c.querySelector('.mkcal').textContent;
    });
    const jourRecompte = {kcal:0, p:0, g:0, l:0};
    const lignes = noms.map(n => {
      const x = recompte(n);
      for(const k in jourRecompte) jourRecompte[k] += x[k];
      return {nom:n, attendu: '~' + x.kcal + ' kcal · P' + x.p + ' G' + x.g + ' L' + x.l, lu: affiche[n]};
    });
    return {lignes, jourRecompte, sub: document.getElementById('meal-kcal-sub').textContent};
  }, jour);
  const faux = r.lignes.filter(x => x.attendu !== x.lu);
  ok(faux.length === 0, jour + ' : les 4 repas affichent ce que la table de composition donne' +
     (faux.length ? ' — ' + faux.map(x => x.nom + ' lu « ' + x.lu +' » vs recompté « ' + x.attendu + ' »').join(' ; ') : ''));
  const cible = Number((r.sub.match(/\/ (\d+) kcal/) || [])[1]);
  ok(cible === r.jourRecompte.kcal, jour + ' : la cible du jour (' + cible + ') est la somme des cinq repas (' + r.jourRecompte.kcal + ')');
  /* La prise de masse : besoin estime 3 184 kcal (Mifflin-St Jeor 1 688 x PAL 1,65, plus
     400 de surplus depuis le 23 septembre -- l'objectif passe a 72 kg, 0,31 kg par semaine
     au lieu de 0,23). On exige que chaque journee de la rotation reste dans +/- 100. */
  ok(Math.abs(r.jourRecompte.kcal - 3184) <= 100, jour + ' : ' + r.jourRecompte.kcal + ' kcal, dans les clous de la prise de masse (3 184 ± 100)');
  /* Proteines entre 2,0 et 2,6 g/kg a 64 kg : au-dela de 2,2 le gain s'arrete, en dessous
     de 1,6 la prise de muscle souffre. On garde une fourchette qui laisse respirer. */
  /* 23 octobre : 120 g de viande par repas -- jusqu'a 2,8 g/kg, plus qu'il n'en faut, sans risque. */
  /* 25 octobre : « descends a 120 g sans toucher au skyr » -- entre 110 et 135 g (1,7 a 2,1 g/kg). */
  ok(r.jourRecompte.p >= 110 && r.jourRecompte.p <= 135, jour + ' : P ' + r.jourRecompte.p + ' g (' + (r.jourRecompte.p / 64).toFixed(2) + ' g/kg)');
  ok(r.jourRecompte.l >= 64, jour + ' : L ' + r.jourRecompte.l + ' g, au-dessus du plancher hormonal (1 g/kg)');
  /* La tolerance passe de 40 a 80 le 23 octobre : 100 g de pain et 140 g de semoule par jour, leurs fibres
     comptent dans les kcal de l'etiquette mais pas dans G. */
  ok(Math.abs((r.jourRecompte.p * 4 + r.jourRecompte.g * 4 + r.jourRecompte.l * 9) - r.jourRecompte.kcal) <= 80,
     jour + ' : les macros redonnent les calories (P×4 + G×4 + L×9 = ' + (r.jourRecompte.p*4 + r.jourRecompte.g*4 + r.jourRecompte.l*9) + ')');
  await ctx.close();
}

console.log('\n== 183) La liste de courses sort du MEME plan que les repas ==');
/* Les besoins hebdomadaires etaient recopies a la main sous le plan de repas : deux
   listes de grammages a tenir en phase. On verifie ici qu'ils sont bien la somme, jour
   par jour, de ce que compoRepas fait manger. */
{
  const { ctx, fr } = await ouvrir('2026-09-22T10:00:00+02:00');
  const r = await fr.evaluate(() => {
    const A = window.__bcAliments, alias = {banane:'bananes', fruit:'fruits'};
    /* Semaine de reference du 2 au 8 novembre (21 octobre : la premiere aux trois matins de
       JJB) : la collation combat et le shake de recup n'existent que les jours de combat (lundi,
       mercredi, vendredi).
       Les condiments des sauces sont dans les repas, pas dans la liste : ils ont leur carte. */
    const noms = ['Petit-déjeuner','Déjeuner','Collation entraînement','Dîner'];
    const b = {};
    for(let j = 0; j < 7; j++){
      const d = new Date(2026, 10, 2 + j), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const duJour = [1, 3, 5].indexOf(d.getDay()) > -1 ? noms.concat(['Collation combat', 'Récup combat']) : noms;
      duJour.forEach(n => window.__bcCompoRepas(n, iso, true).forEach(x => {
        const a = A[x.c], k = alias[x.c] || x.c;
        if(a && a.condiment) return;
        b[k] = (b[k] || 0) + (a && a.piece ? x.q / a.piece : x.q);
      }));
    }
    return {recompte: b, lu: window.__bcBesoinSemaine};
  });
  const cles = Object.keys(r.recompte).sort();
  const faux = cles.filter(k => Math.abs(r.recompte[k] - r.lu[k]) > 0.001);
  ok(faux.length === 0 && cles.length === 17,
     'les 17 besoins de la semaine (le riz midi et soir, les dattes, plus de pain ni de fruits depuis le 23 octobre au soir) sont exactement la somme des repas' + (faux.length ? ' — ' + faux.map(k => k + ' : ' + r.lu[k] + ' vs ' + r.recompte[k]).join(', ') : ' (' + cles.length + ')'));
  /* Et aucun aliment du plan ne manque a la liste de courses. */
  const manquants = await fr.evaluate(() => {
    const noms = ['Petit-déjeuner','Déjeuner','Collation entraînement','Dîner','Collation combat','Récup combat'];
    const dans = {};
    for(let j = 2; j <= 8; j++) noms.forEach(n => window.__bcCompoRepas(n, '2026-11-0' + j, true).forEach(x => { if(!window.__bcAliments[x.c].condiment) dans[x.c] = true; }));
    const alias = {banane:'bananes', fruit:'fruits'};
    return Object.keys(dans).filter(c => !((alias[c] || c) in window.__bcBesoinSemaine));
  });
  ok(manquants.length === 0, 'aucun aliment du plan n\'est absent de la liste de courses' + (manquants.length ? ' — ' + manquants.join(', ') : ''));
  await ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
