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
const MARDI_KCAL = '2026-11-03T10:00:00+01:00';
const page_ = (fr, p) => fr.evaluate(x => { document.querySelector('.nav-btn[data-page="' + x + '"]').click(); }, p);

console.log('\n== 180) Sans ajustement : plan de base, liste = plan × 7 ==');
{
  const { ctx, fr } = await ouvrir(MARDI);
  await page_(fr, 'courses');
  const c = await fr.evaluate(() => ({ items: [...document.querySelectorAll('#courses-grid label, #courses-grid-plus label')].map(l => l.textContent), note: document.getElementById('courses-plan-note').textContent, budget: document.getElementById('courses-budget').textContent, n: document.querySelectorAll('#courses-grid input, #courses-grid-plus input').length }));
  /* 20 septembre, sa derniere decision sur cette liste : « dans l'onglet courses tu vas
     juste laisser les aliments et la bouffe cest tout ». Les trois rayons non alimentaires
     sont sortis -- Sante et hygiene (16 lignes), Maison (6), Menage (5) -- et la brosse a
     dents avec eux. Restent CINQ rythmes, tous alimentaires : 9 articles frais chaque
     semaine, 1 surgele toutes les 2, 4 reserves toutes les 4, 2 toutes les 5, et le pot de
     creatine tous les 3 mois -- la seule ligne qui ne sorte pas du plan de repas, parce
     qu'elle s'avale tous les soirs et que rien d'autre ne la rachete. */
  ok(c.n === 17, '17 articles au total, tous rythmes confondus (' + c.n + ')');
  /* Deux chiffres par ligne, et il faut les deux : ce qu'on ACHETE (un multiple du
     conditionnement) et ce que le PLAN demande (la somme des 7 jours de repas). Riz
     135 g/jour -> 945/semaine -> 3 780 sur 4 semaines, donc 4 paquets de 1 kg ;
     pates 85 -> 595 -> 2 380, donc 5 paquets de 500 g. Acheter en dessous du besoin
     serait une rupture en milieu de cycle : l'arrondi va toujours VERS LE HAUT. */
  ok(c.items.some(t => /^Riz — 5 kg\b/.test(t) && /le plan en demande 4\u202f340 g/.test(t)), 'riz : 5 kg achetés pour 4 340 g demandés (' + c.items.find(t => /^Riz/.test(t)) + ')');
  ok(c.items.some(t => /^Pâtes — 3 kg\b/.test(t) && /le plan en demande 2\u202f940 g/.test(t)), 'pâtes : 3 kg achetés pour 2 940 g demandés (' + c.items.find(t => /^Pâtes/.test(t)) + ')');
  /* Depuis le 20 septembre la rotation est la meme tous les jours : poulet a midi
     (80 g x 7 = 560), viande hachee le soir (90 g x 7 = 630). Le poisson est sorti.
     La viande ne s'arrondit PAS : le boucher pese le montant exact, donc ces deux
     lignes portent le chiffre du plan tel quel, sans surplus. */
  ok(c.items.some(t => /^Poulet — 560 g .*pesé au comptoir/.test(t) && !/demande/.test(t))
  && c.items.some(t => /^Viande hachée 5 % — 630 g .*pesée au comptoir/.test(t))
  && !c.items.some(t => /^Saumon/.test(t)),
     'viande au gramme près, pesée au comptoir, et plus de poisson : ' + c.items.filter(t => /^(Poulet|Viande|Saumon)/.test(t)).join(' · '));
  /* Les fruits se comptent, ils ne se pesent pas. */
  ok(c.items.some(t => /^Bananes — 7 .*l'unité/.test(t)) && c.items.some(t => /^Fruits[^\n]*— 7 .*l'unité/.test(t)),
     'bananes et fruits à l\'unité : ' + c.items.filter(t => /^(Bananes|Fruits)/.test(t)).join(' · '));
  /* Le reste au paquet, avec le plus petit format courant : 5 pots de 450 g laissent
     115 g de surplus de skyr, la ou 5 pots de 500 en laissaient 365. */
  ok(c.items.some(t => /^Skyr — 2,25 kg\b/.test(t) && /demande 2\u202f135 g/.test(t) && /5 pots de 450 g/.test(t))
  && !c.items.some(t => /^(Dattes|Cacahuètes|Lait)/.test(t)),
     'skyr : 2,25 kg en 5 pots de 450 g pour 2 135 g demandés');
  /* L'HUILE etait la vraie erreur : 288 ml par semaine, donc 1 152 sur 4 semaines alors
     que la liste disait 1 000 -- quatre jours de rupture par cycle, tous les mois. Elle est
     passee a 5 semaines. Depuis le retrait du poisson elle monte a 315 ml par semaine
     (30 ml a midi avec le poulet, 15 le soir avec la viande hachee, les sept jours) :
     1 575 ml par cycle, donc trois bouteilles de 750 ml. */
  /* Les legumes surgeles sont passes a DEUX semaines le 20 septembre : 10 kg par passage
     ne rentraient pas dans son congelateur. La consommation n'a pas bouge (2 450 g par
     semaine), c'est le rythme de rachat qui a change -- 5 kg tous les quinze jours. */
  ok(c.items.some(t => /^Œufs — 18\b/.test(t) && /demande 14 œufs/.test(t))
  && c.items.some(t => /^Légumes verts surgelés — 5 kg\b/.test(t) && /demande 4\u202f900 g/.test(t))
  && c.items.some(t => /^Huile d'olive — 2,25 L\b/.test(t) && /demande 1\u202f575 ml/.test(t)),
     'œufs 18 pour 14, surgelés 5 kg pour 4 900 g sur deux semaines, huile 2,25 L pour 1 575 ml sur cinq');
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
  /* Le budget estime a ete RETIRE le 19 septembre. Il annoncait un cout par semaine, par
     cycle et par mois a partir de prix Alicante 2026 inventes -- trois chiffres faux lus
     comme des vrais. A la place, le panneau dit ou vivent les montants reels : ses tickets,
     saisis dans Budget. Ce bloc garde la porte fermee : aucun prix ne doit revenir. */
  ok(!/€/.test(c.budget), 'aucun montant dans le panneau : ' + c.budget.slice(0, 70));
  ok(/tickets/.test(c.budget) && /Budget/.test(c.budget), 'et il renvoie vers Budget, où le chiffre est vrai');
  ok(!c.items.some(t => /€/.test(t)), 'aucune ligne d\'article ne porte de prix');

  await page_(fr, 'repas');
  const r = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)) }) && [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText);
  ok(/Pâtes 105g/.test(r) && /~752 kcal/.test(r) && /Viande hachée 5 % 90g/.test(r) && /Huile d'olive \(15ml\)/.test(r), 'dîner de base du mardi : pâtes 105 g, viande hachée 90 g, huile 15 ml, ~752 kcal');
  await ctx.close();
}

console.log('\n== 181) Avec +150 kcal : le dîner et les courses l\'écrivent ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, {'batcave-kcal-ajustement': {valeur:150, depuis:'2026-09-01'}});
  await page_(fr, 'repas');
  const r = await fr.evaluate(() => [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText);
  ok(/Pâtes 145g/.test(r), 'féculent du dîner : pâtes 145 g (+40)');
  ok(/boucle kcal \+150 kcal/.test(r) && /~896 kcal/.test(r), 'le dîner annonce ~896 kcal et la boucle');
  const sub = await fr.evaluate(() => document.getElementById('meal-kcal-sub').textContent);
  /* 3 131 + 144 : la boucle demande +150 kcal, mais les pates s'ajustent par pas de 10 g,
     donc elle en ajoute 144. On annonce l'ecart REEL entre les deux journees, pas la
     consigne -- sinon la soustraction affichee ne tombe pas juste. */
  ok(/\/ 3275 kcal \(plan 3131 \+ 144\)/.test(sub), 'cible du jour : ' + sub);
  /* cocher tout le dîner : l\'apport consommé porte les 150 kcal */
  /* un clic redessine la grille : on re-cherche la première case non cochée du dîner à chaque tour */
  await fr.evaluate(() => { for(let i = 0; i < 10; i++){ const card = [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)); const cb = card && card.querySelector('input:not(:checked)'); if(!cb) break; cb.click(); } });
  await page.waitForTimeout(200);
  const sub2 = await fr.evaluate(() => document.getElementById('meal-kcal-sub').textContent);
  ok(/^896 \/ 3275 kcal/.test(sub2), 'dîner coché : ' + sub2);
  await page_(fr, 'courses');
  const c = await fr.evaluate(() => ({ items: [...document.querySelectorAll('#courses-grid label, #courses-grid-plus label')].map(l => l.textContent), note: document.getElementById('courses-plan-note').textContent }));
  /* L'ajustement suit le sac : +280 g par semaine font +1 120 g sur quatre semaines.
     Pas de ligne hebdomadaire en plus -- on n'achete pas un sachet de 280 g. */
  ok(c.items.some(t => /^Pâtes — 4,5 kg\b/.test(t) && /demande 4\u202f060 g/.test(t)), 'la boucle kcal remonte le besoin à (735 + 280) × 4 = 4 060 g, et l\'achat suit à 4,5 kg (' + c.items.find(t => /^Pâtes/.test(t)) + ')');
  ok(/\+150 kcal\/jour/.test(c.note) && /\+40 g de pâtes crues/.test(c.note) && /\+280 g sur la semaine/.test(c.note), 'note : ' + c.note.slice(0, 120));
  /* La boucle kcal ne touche QUE le feculent du diner : les proteines gardent la quantite
     de la rotation, 560 g de poulet par semaine. */
  ok(c.items.filter(t => /^Poulet/.test(t)).length === 1 && /560 g/.test(c.items.find(t => /^Poulet/.test(t))), 'les protéines ne bougent pas');
  await ctx.close();
}

console.log('\n== 182) Appliquer / revenir depuis la boucle met tout à jour d\'un coup ==');
{
  const local = {};
  const d0 = new Date('2026-10-21T00:00:00');
  for(let i = 0; i < 14; i++){ const d = new Date(d0); d.setDate(d0.getDate() + i); local['batcave-journal-' + d.toISOString().slice(0,10)] = {poids: (64 + (i < 7 ? 0 : 0.02)).toFixed(2), sommeil:'', water:0, complements:[], notes:'', mood:null, coran:'', duaa:''}; }
  const { ctx, fr, page } = await ouvrir(MARDI_KCAL, local);
  await page_(fr, 'repas');
  const b = await fr.evaluate(() => ({ note: document.getElementById('kcal-note').textContent, bouton: document.getElementById('kcal-appliquer').hidden }));
  ok(/\+150/.test(b.note) && b.bouton === false, 'la boucle recommande +150 kcal (' + b.note + ')');
  await fr.evaluate(() => document.getElementById('kcal-appliquer').click());
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText,
    courses: (document.querySelector('.nav-btn[data-page="courses"]').click(), [...document.querySelectorAll('#courses-grid label, #courses-grid-plus label')].map(l => l.textContent).find(t => /^Pâtes/.test(t))) }));
  ok(/Pâtes 145g/.test(apres.diner) && /4,5 kg/.test(apres.courses), 'après « Appliquer » : dîner à 145 g de pâtes, courses à 4,5 kg');
  await page_(fr, 'repas');
  await fr.evaluate(() => document.getElementById('kcal-reset').click());
  await page.waitForTimeout(250);
  const retour = await fr.evaluate(() => ({ diner: [...document.querySelectorAll('.meal-card')].find(c => /Dîner/.test(c.querySelector('.mtitle').textContent)).innerText,
    courses: (document.querySelector('.nav-btn[data-page="courses"]').click(), [...document.querySelectorAll('#courses-grid label, #courses-grid-plus label')].map(l => l.textContent).find(t => /^Pâtes/.test(t))) }));
  ok(/Pâtes 105g/.test(retour.diner) && /3 kg/.test(retour.courses), 'après « Revenir au plan de base » : 105 g au dîner et 3 kg de pâtes');
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
    const A = window.__bcAliments, noms = ['Petit-déjeuner','Déjeuner','Collation entraînement','Dîner','Collation soir'];
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
  ok(faux.length === 0, jour + ' : les 5 repas affichent ce que la table de composition donne' +
     (faux.length ? ' — ' + faux.map(x => x.nom + ' lu « ' + x.lu +' » vs recompté « ' + x.attendu + ' »').join(' ; ') : ''));
  const cible = Number((r.sub.match(/\/ (\d+) kcal/) || [])[1]);
  ok(cible === r.jourRecompte.kcal, jour + ' : la cible du jour (' + cible + ') est la somme des cinq repas (' + r.jourRecompte.kcal + ')');
  /* La prise de masse : besoin estime 3 084 kcal (Mifflin-St Jeor 1 688 x PAL 1,65, plus
     300 de surplus). On exige que chaque journee de la rotation reste dans +/- 100. */
  ok(Math.abs(r.jourRecompte.kcal - 3084) <= 100, jour + ' : ' + r.jourRecompte.kcal + ' kcal, dans les clous de la prise de masse (3 084 ± 100)');
  /* Proteines entre 2,0 et 2,6 g/kg a 64 kg : au-dela de 2,2 le gain s'arrete, en dessous
     de 1,6 la prise de muscle souffre. On garde une fourchette qui laisse respirer. */
  ok(r.jourRecompte.p >= 128 && r.jourRecompte.p <= 166, jour + ' : P ' + r.jourRecompte.p + ' g (' + (r.jourRecompte.p / 64).toFixed(2) + ' g/kg)');
  ok(r.jourRecompte.l >= 64, jour + ' : L ' + r.jourRecompte.l + ' g, au-dessus du plancher hormonal (1 g/kg)');
  ok(Math.abs((r.jourRecompte.p * 4 + r.jourRecompte.g * 4 + r.jourRecompte.l * 9) - r.jourRecompte.kcal) <= 40,
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
    const noms = ['Petit-déjeuner','Déjeuner','Collation entraînement','Dîner','Collation soir'];
    const b = {};
    for(let j = 20; j <= 26; j++){
      noms.forEach(n => window.__bcCompoRepas(n, '2026-09-' + j, true).forEach(x => {
        const a = A[x.c], k = alias[x.c] || x.c;
        b[k] = (b[k] || 0) + (a && a.piece ? x.q / a.piece : x.q);
      }));
    }
    return {recompte: b, lu: window.__bcBesoinSemaine};
  });
  const cles = Object.keys(r.recompte).sort();
  const faux = cles.filter(k => Math.abs(r.recompte[k] - r.lu[k]) > 0.001);
  ok(faux.length === 0 && cles.length === 16,
     'les 16 besoins de la semaine sont exactement la somme des repas' + (faux.length ? ' — ' + faux.map(k => k + ' : ' + r.lu[k] + ' vs ' + r.recompte[k]).join(', ') : ' (' + cles.length + ')'));
  /* Et aucun aliment du plan ne manque a la liste de courses. */
  const manquants = await fr.evaluate(() => {
    const noms = ['Petit-déjeuner','Déjeuner','Collation entraînement','Dîner','Collation soir'];
    const dans = {};
    for(let j = 20; j <= 26; j++) noms.forEach(n => window.__bcCompoRepas(n, '2026-09-' + j, true).forEach(x => { dans[x.c] = true; }));
    const alias = {banane:'bananes', fruit:'fruits'};
    return Object.keys(dans).filter(c => !((alias[c] || c) in window.__bcBesoinSemaine));
  });
  ok(manquants.length === 0, 'aucun aliment du plan n\'est absent de la liste de courses' + (manquants.length ? ' — ' + manquants.join(', ') : ''));
  await ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
