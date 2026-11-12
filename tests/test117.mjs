import { chromium } from 'playwright';
/* Le soin, la sante et le menage dans la liste (9 novembre au soir). Ses mots : « aussi les produits
   de soin et de sante. je veux meme traquer les produits de nettoyage pour la maison. comme ca tout ce
   que je depense est comptabilise ». Puis sa liste : lessive par 10 kg, adoucissant, poudre de
   lave-vaisselle, degraissant, produit pour les surfaces ; deo, shampoing, gel douche, dentifrice,
   nettoyant visage, papier toilette -- « quoi d'autre ? ».
   Puis, la nuit : « je peux acheter du vinaigre blanc pour le mettre dans le lave vaisselle [...] je peux faire une
   poudre maison moins chere » -- non ; les pastilles « Todo en 1 » de Mercadona, le rincage dedans.
   Ce test verifie : les deux rayons, dus le samedi 14 ; les prix releves en ligne (Mercadona, Alcampo),
   le Skinoren « prix a relever » ; le bouton « fini » (samedi du rachat, annuler, duree mesuree) ; le
   plafond Nourriture inchange ; les postes du budget (Sante -> Soin et sante, Maison et menage) ; le plan
   d'argent qui compte leur moyenne des le 14 ; les vieilles coches des rangs 5 et 6 ; l'iPhone.
   12 novembre au soir, sa decision : « mets pas les prix des produits de nettoyage et de sante, on va juste dire que
   j'ai 300EUR par mois pour les courses etc ». Les prix sortent, les plafonds des trois postes aussi : l'enveloppe
   (ENVELOPPE_COURSES) les remplace. Les produits, leurs rythmes et le bouton « fini » restent. */
const URL = process.env.BC_URL || 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const pres = (a, b, e) => Math.abs(a - b) < (e || 0.02);
const browser = await chromium.launch();

async function ouvrir(quand, opts = {}){
  const ctx = await browser.newContext({ viewport: opts.viewport || {width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(opts.stock) await ctx.addInitScript(st => { for(const k in st) localStorage.setItem(k, JSON.stringify(st[k])); }, opts.stock);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  return {ctx, page, fr};
}
const lignes = fr => fr.evaluate(() => [...document.querySelectorAll('#courses-grid li, #courses-grid-plus li')].map(li => li.textContent));
const versCourses = async (fr, page) => { await fr.evaluate(() => document.querySelector('.nav-btn[data-page="courses"]').click()); await page.waitForTimeout(400); };

console.log('— samedi 14 novembre, 10:00 : tout est du, le tour de la salle de bain et de la cuisine');
{
  const {ctx, page, fr} = await ouvrir('2026-11-14T10:00:00+01:00');
  await versCourses(fr, page);
  const c = await fr.evaluate(() => {
    const cartes = {};
    document.querySelectorAll('#courses-grid .cat-card').forEach(k => { cartes[k.querySelector('h4').textContent] = k.querySelectorAll('li').length; });
    return {cartes, boutons: document.querySelectorAll('#courses-grid .fini-btn').length,
      boutonsNourriture: [...document.querySelectorAll('#courses-grid .cat-card')].filter(k => !/Soin|Maison/.test(k.querySelector('h4').textContent)).reduce((t, k) => t + k.querySelectorAll('.fini-btn').length, 0),
      resume: document.getElementById('courses-summary').textContent,
      budget: document.getElementById('courses-budget').textContent,
      desc: document.querySelector('#page-courses .desc, [data-page-id="courses"] .desc') ? document.querySelector('#page-courses .desc, [data-page-id="courses"] .desc').textContent : document.body.textContent};
  });
  ok(c.cartes['Soin et santé'] === 12 && c.cartes['Maison et ménage'] === 15, 'deux rayons dus le 14 : 12 produits de soin et sante, 15 de maison et menage (' + JSON.stringify(c.cartes) + ')');
  ok(c.boutons === 27 && c.boutonsNourriture === 0, 'un bouton « fini » sur chacun des 27, aucun sur la nourriture');
  ok(/\/39 articles/.test(c.resume), 'la liste du jour : 39 articles (12 de nourriture + 27) (' + c.resume + ')');
  const L = await lignes(fr);
  const de = n => L.find(t => t.startsWith(n + ' —')) || '';
  ok(/Mercadona/.test(de('Gel douche')) && !/€/.test(de('Gel douche')) && /toutes les 7 semaines/.test(de('Gel douche')), 'gel douche : Mercadona, toutes les 7 semaines, sans prix depuis le 12 novembre (' + de('Gel douche') + ')');
  ok(/^Lessive en poudre — 10 kg/.test(de('Lessive en poudre')) && /Alcampo/.test(de('Lessive en poudre')) && !/€/.test(de('Lessive en poudre')), 'la lessive par 10 kg, chez Alcampo, sans prix (' + de('Lessive en poudre') + ')');
  ok(/Pharmacie/.test(de('Skinoren')) && !/prix à relever|€/.test(de('Skinoren')), 'le Skinoren : pharmacie, sans prix ni « prix a relever » (' + de('Skinoren') + ')');
  ok(['Adoucissant', 'Pastilles lave-vaisselle', 'Dégraissant', 'Multi-surfaces', 'Déodorant', 'Shampoing', 'Dentifrice', 'Nettoyant visage', 'Papier toilette'].every(n => de(n)), 'tout ce qu\'il a cite est la');
  ok(['Sel lave-vaisselle', 'Liquide vaisselle', 'Éponges', 'Sacs poubelle 30 L', 'Sacs congélation', 'Savon pour les mains', 'Gel WC', 'Anticalcaire salle de bain', 'Fil dentaire', 'Brosse à dents', 'Rasoirs jetables'].every(n => de(n)), 'et ce qui lui manquait : le sel du lave-vaisselle, liquide vaisselle, eponges, sacs, savon, WC, anticalcaire, fil, brosse, rasoirs');
  ok(/jamais sur les serviettes, les draps, le kimono ni le sport/.test(de('Adoucissant')), 'l\'adoucissant dit ou il ne va pas');
  ok(/^Pastilles lave-vaisselle — 1 paquet de 30/.test(de('Pastilles lave-vaisselle')) && /Mercadona/.test(de('Pastilles lave-vaisselle')) && /0,10 € le lavage/.test(de('Pastilles lave-vaisselle')) && !de('Poudre lave-vaisselle') && !de('Liquide de rinçage'),
     'les pastilles « Todo en 1 » de Mercadona : plus de poudre ni de liquide de rincage, pas de vinaigre (' + de('Pastilles lave-vaisselle') + ')');
  ok(/même avec les pastilles/.test(de('Sel lave-vaisselle')), 'le sel reste, meme avec les pastilles tout-en-un');
  /* 10 novembre : « lave vaisselle 1 fois par jour » -- le paquet de 30 tient 4 semaines, le sel 8. */
  ok(/toutes les 4 semaines/.test(de('Pastilles lave-vaisselle')) && /un lavage par jour/.test(de('Pastilles lave-vaisselle')) && /toutes les 8 semaines/.test(de('Sel lave-vaisselle')),
     'un lavage par jour : les pastilles toutes les 4 semaines, le sel toutes les 8');
  ok(!/estim/i.test(c.budget), 'le panneau du budget de la liste ne dit toujours « estim » nulle part');
  ok(/L’enveloppe : 300,00 € par mois/.test(c.budget) && /laverie \(8,00 € chaque dimanche\)/.test(c.budget) && !/de soin et de ménage<\/b>|En plus, /.test(c.budget), 'le panneau dit l\'enveloppe de 300 € (courses, soin, menage, laverie), plus de total du soin et du menage (' + c.budget.slice(0, 120) + ')');
  ok(!/Skinoren/.test(c.budget) && /les trois comptent dans l’enveloppe/.test(c.budget), 'plus de Skinoren compte a part ; les tickets vont dans les trois postes de l\'enveloppe');
  ok(/Mercadona pour le soin et le ménage/.test(c.desc) && /« fini »/.test(c.desc), 'l\'en-tete de l\'onglet dit Mercadona et le bouton « fini »');
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').textContent);
  ok(/le tour de la salle de bain et de la cuisine/.test(plan) && /Soin et santé ou Maison et ménage/.test(plan), 'le plan du jour du 14 : le tour des produits avant de partir, les tickets au retour');
  const h = await fr.evaluate(() => window.__bcCoutHors());
  /* 11 novembre : les draps, les serviettes et les lavettes partent a la laverie -- quatre machines par semaine a la
     maison au lieu de six, la lessive dure plus longtemps : 9,93 -> 9,73 EUR par semaine. */
  ok(h.hebdo === 0 && h.mois === 0, 'soin et menage : plus aucun euro calcule, l\'enveloppe les porte (' + h.hebdo + ', ' + h.mois + ')');
  ok(h.estimes.length === 0 && h.manque.length === 27, 'aucun prix estime, les 27 produits sans prix (' + h.estimes.length + ' / ' + h.manque.length + ')');
  const am = await fr.evaluate(() => window.__bcCoutAchats());
  ok(pres(am.mois, 211.05, 0.01), 'la nourriture seule dans coutAchatsMoyen : 211,05 € par mois (les dattes a 5 EUR le kilo depuis le 12 novembre) (' + am.mois.toFixed(2) + ')');
  const autre = await fr.evaluate(() => document.querySelector('#dash-plan') && [...document.querySelectorAll('#dash-plan li')].filter(li => /salle de bain/.test(li.textContent)).length);
  ok(autre === 1, 'une seule ligne pour le tour des produits');
  await ctx.close();
}

console.log('— samedi 21 sans rien de fini : plus rien du soin et du menage avant leur rythme');
{
  const {ctx, page, fr} = await ouvrir('2026-11-21T10:00:00+01:00');
  await versCourses(fr, page);
  const c = await fr.evaluate(() => [...document.querySelectorAll('#courses-grid .cat-card h4')].map(h => h.textContent));
  ok(!c.includes('Soin et santé') && !c.includes('Maison et ménage'), 'le samedi 21, rien n\'est du : le plus court rythme est de 4 semaines (' + c.join(', ') + ')');
  const cal = await fr.evaluate(() => document.getElementById('courses-calendrier').textContent);
  ok(/12 déc\.[^·]*soin et santé/.test(cal), 'les prochains passages annoncent le soin le 12 decembre (deodorant et Skinoren, 4 semaines) (' + cal + ')');
  await ctx.close();
}

console.log('— mercredi 18 : le gel douche est fini');
{
  const {ctx, page, fr} = await ouvrir('2026-11-18T08:00:00+01:00');
  await versCourses(fr, page);
  await fr.evaluate(() => { const d = document.querySelector('#courses-plus-tard details'); if(d) d.open = true; });
  await fr.evaluate(() => { document.querySelector('[data-fini="Gel douche"]').click(); });
  await page.waitForTimeout(300);
  const r = await fr.evaluate(() => ({ f: JSON.parse((window.__bcLire || (k => localStorage.getItem(k)))('batcave-produits-fini')), L: [...document.querySelectorAll('li')].map(li => li.textContent).find(t => /^Gel douche/.test(t)), annuler: !!document.querySelector('[data-fini-annuler="Gel douche"]') }));
  ok(JSON.stringify(r.f) === JSON.stringify({'Gel douche': [{d:'2026-11-18', a:'2026-11-21'}]}), 'il est rachete le samedi qui suit, le 21 (' + JSON.stringify(r.f) + ')');
  ok(/fini le 18 nov\./.test(r.L) && r.annuler, 'la ligne dit « fini le 18 nov. » et propose d\'annuler');
  await fr.evaluate(() => { document.querySelector('[data-fini-annuler="Gel douche"]').click(); });
  await page.waitForTimeout(300);
  const r2 = await fr.evaluate(() => ({ f: JSON.parse((window.__bcLire || (k => localStorage.getItem(k)))('batcave-produits-fini') || '{}'), fini: !!document.querySelector('[data-fini="Gel douche"]') }));
  ok(!r2.f['Gel douche'] && r2.fini, 'annuler retire le « fini » du jour');
  await fr.evaluate(() => { document.querySelector('[data-fini="Gel douche"]').click(); });
  await ctx.close();
}

console.log('— samedi 21 : le gel douche est sur la liste du jour, et il en repart du 21');
{
  const stock = {'batcave-produits-fini': {'Gel douche': [{d:'2026-11-18', a:'2026-11-21'}]}, 'batcave-courses': {'5-0': true}};
  const {ctx, page, fr} = await ouvrir('2026-11-21T10:00:00+01:00', {stock});
  await versCourses(fr, page);
  const c = await fr.evaluate(() => { const k = [...document.querySelectorAll('#courses-grid .cat-card')].find(k => /Soin/.test(k.querySelector('h4').textContent)); return k ? [...k.querySelectorAll('li')].map(li => li.textContent) : []; });
  ok(c.length === 1 && /^Gel douche/.test(c[0]), 'le 21, « Soin et sante » porte le seul gel douche (' + c.length + ')');
  const coche = await fr.evaluate(() => JSON.parse((window.__bcLire || (k => localStorage.getItem(k)))('batcave-courses') || '{}'));
  ok(!coche['5-0'], 'une vieille coche au rang 5 (copie d\'avant) est partie : il n\'est pas coche d\'office (' + JSON.stringify(coche) + ')');
  const suite = await fr.evaluate(() => window.__bcPlanCourses().find(c => c.cat === 'Soin et santé').items.find(i => i.label === 'Gel douche'));
  ok(suite.ancre === '2026-11-21' && suite.semaines === 7 && !suite.mesure, 'il repart du 21, a son rythme de 7 semaines tant qu\'il n\'est pas mesure');
  /* un samedi apres 16:00 : les courses sont faites, le rachat va au samedi suivant */
  await page.clock.setFixedTime(new Date('2026-11-21T17:30:00+01:00'));
  await fr.evaluate(() => { const d = document.querySelector('#courses-plus-tard details'); if(d) d.open = true; document.querySelector('[data-fini="Shampoing"]').click(); });
  await page.waitForTimeout(300);
  const f = await fr.evaluate(() => JSON.parse((window.__bcLire || (k => localStorage.getItem(k)))('batcave-produits-fini')));
  ok(f['Shampoing'] && f['Shampoing'][0].a === '2026-11-28', 'un « fini » le samedi a 17:30 part au samedi d\'apres, le 28 (' + JSON.stringify(f['Shampoing']) + ')');
  await ctx.close();
}

console.log('— samedi 2 janvier : le second « fini » mesure la vraie duree');
{
  const stock = {'batcave-produits-fini': {'Gel douche': [{d:'2026-11-18', a:'2026-11-21'}, {d:'2027-01-02', a:'2027-01-02'}]}};
  const {ctx, page, fr} = await ouvrir('2027-01-02T10:00:00+01:00', {stock});
  const it = await fr.evaluate(() => window.__bcPlanCourses().find(c => c.cat === 'Soin et santé').items.find(i => i.label === 'Gel douche'));
  ok(it.semaines === 6 && it.mesure && it.ancre === '2027-01-02', 'du 21 novembre au 2 janvier : 6 semaines, mesurees (' + it.semaines + ')');
  await versCourses(fr, page);
  const L = await lignes(fr);
  ok(/toutes les 6 semaines \(durée mesurée\)/.test(L.find(t => /^Gel douche/.test(t)) || ''), 'la ligne dit « toutes les 6 semaines (duree mesuree) »');
  const h = await fr.evaluate(() => window.__bcCoutHors().hebdo);
  ok(h === 0, 'sans prix, la duree mesuree ne sert qu\'au rythme : rien a chiffrer (' + h + ')');
  await ctx.close();
}

console.log('— le budget : « Sante » devient « Soin et sante », « Maison et menage » arrive');
{
  const stock = {'batcave-transactions': [{id:'s1', date:'2026-11-05', type:'Dépense', categorie:'Santé', montant:12.5, methode:'Carte', label:'Pharmacie'}],
                 'batcave-budget-limits': {'Nourriture': 200, 'Santé': 20}};
  const {ctx, page, fr} = await ouvrir('2026-11-09T21:00:00+01:00', {stock});
  const r = await fr.evaluate(() => ({ bl: JSON.parse((window.__bcLire || (k => localStorage.getItem(k)))('batcave-budget-limits')) }));
  /* 12 novembre au soir : l'enveloppe passe apres les anciennes migrations et efface les trois plafonds */
  ok(r.bl['Soin et santé'] === undefined && r.bl['Santé'] === undefined && r.bl['Maison et ménage'] === undefined && r.bl['Nourriture'] === undefined, 'plafonds : Sante devient Soin et sante, puis l\'enveloppe de 300 € remplace les trois plafonds (' + JSON.stringify(r.bl) + ')');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="budget"]').click());
  await page.waitForTimeout(400);
  const b = await fr.evaluate(() => ({ cats: [...document.querySelectorAll('#budget-cats-list .bc-nom')].map(x => x.textContent), liste: document.getElementById('tx-list').textContent, sel: [...document.querySelectorAll('#tx-cat option')].map(o => o.textContent) }));
  ok(b.cats.includes('Soin et santé') && b.cats.includes('Maison et ménage') && !b.cats.includes('Santé'), 'les postes du budget : Soin et sante, Maison et menage, plus de Sante (' + b.cats.join(', ') + ')');
  ok(/Soin et santé/.test(b.liste) && !/\bSanté\b/.test(b.liste.replace(/Soin et santé/g, '')), 'la depense de pharmacie deja saisie suit dans Soin et sante (' + b.liste.slice(0, 80) + ')');
  ok(b.sel.includes('Soin et santé') && b.sel.includes('Maison et ménage'), 'et on peut y saisir un ticket');
  await ctx.close();
}
{
  const {ctx, fr} = await ouvrir('2026-11-09T21:00:00+01:00');
  const bl = await fr.evaluate(() => JSON.parse((window.__bcLire || (k => localStorage.getItem(k)))('batcave-budget-limits')));
  /* 12 novembre au soir : une installation neuve n'a plus de plafond pour les trois postes -- l'enveloppe les tient */
  ok(bl['Soin et santé'] === undefined && bl['Maison et ménage'] === undefined && bl['Nourriture'] === undefined, 'installation neuve : ni Nourriture, ni Soin et sante, ni Maison et menage, l\'enveloppe de 300 € les remplace (' + JSON.stringify(bl) + ')');
  await ctx.close();
}
{
  /* 10 novembre : la veille, le plafond Maison et menage avait ete pose a 14 ; un lave-vaisselle par jour le fait
     suivre a 15 (postes-soin-maison-v2) -- seulement s'il vaut encore 14.
     11 novembre : la lessive baisse (le linge de maison a la laverie), la v2 le laisse donc a 14 ; la v3 le prend
     a 14 comme a 15 et le porte a 50, la laverie comprise. */
  const veille = {'batcave-budget-limits': {'Nourriture': 200, 'Soin et santé': 28, 'Maison et ménage': 14}, 'batcave-postes-soin-maison-v1': true};
  const {ctx, fr} = await ouvrir('2026-11-10T09:00:00+01:00', {stock: veille});
  const bl = await fr.evaluate(() => JSON.parse((window.__bcLire || (k => localStorage.getItem(k)))('batcave-budget-limits')));
  ok(bl['Maison et ménage'] === undefined && bl['Soin et santé'] === undefined, 'le plafond pose le 9 (14), Batcave pas rouverte depuis : l\'enveloppe le remplace (' + JSON.stringify(bl) + ')');
  await ctx.close();
}
{
  const sien = {'batcave-budget-limits': {'Nourriture': 200, 'Soin et santé': 28, 'Maison et ménage': 25}, 'batcave-postes-soin-maison-v1': true};
  const {ctx, fr} = await ouvrir('2026-11-10T09:00:00+01:00', {stock: sien});
  const bl = await fr.evaluate(() => JSON.parse((window.__bcLire || (k => localStorage.getItem(k)))('batcave-budget-limits')));
  ok(bl['Maison et ménage'] === undefined, 'meme un plafond qu\'il avait pose lui-meme (25) laisse place a l\'enveloppe -- sa decision du 12 novembre (' + bl['Maison et ménage'] + ')');
  await ctx.close();
}
{
  /* 11 novembre : le plafond de la v2 (15) suit la laverie -- 14,34 + 8 x 52 / 12, arrondi au-dessus */
  const v2 = {'batcave-budget-limits': {'Nourriture': 200, 'Soin et santé': 28, 'Maison et ménage': 15}, 'batcave-postes-soin-maison-v1': true, 'batcave-postes-soin-maison-v2': true};
  const {ctx, fr} = await ouvrir('2026-11-11T21:00:00+01:00', {stock: v2});
  const bl = await fr.evaluate(() => JSON.parse((window.__bcLire || (k => localStorage.getItem(k)))('batcave-budget-limits')));
  ok(bl['Maison et ménage'] === undefined && bl['Soin et santé'] === undefined, 'le plafond de la v2 (15) : l\'enveloppe le remplace (' + JSON.stringify(bl) + ')');
  await ctx.close();
}

console.log('— le plan d\'argent : leur moyenne, des le samedi 14');
{
  const {ctx, fr} = await ouvrir('2026-11-09T21:00:00+01:00');
  const a = await fr.evaluate(() => { const a = window.__bcMoisArgent('2026-11-09'); return {cagnotte: a.cagnotte, soins: a.periode.soins, bal: a.periode.balayage, ligne: a.lignes.find(l => l.soins) || null, somme: a.lignes.slice(1).reduce((t, l) => t + l.montant, 0), fin: a.lignes[a.lignes.length - 1].solde, ordre: a.lignes.map(l => l.soins ? 'S' : l.laverie ? 'L' : l.courses ? 'C' : l.cagnotte ? 'K' : '.').join(''), soinsMois: a.soinsMois, lav: a.lignes.find(l => l.laverie) || null}; });
  /* 11 novembre : la laverie, 8 EUR chaque dimanche des le 15 -- la periode la plus chere en porte 5 : 130 -> 90.
     12 novembre au soir : l'enveloppe des le 25 novembre -- 431,51 la periode de la licence de novembre 2027,
     moins 300, moins 27,49 de marge Basic-Fit : 100. */
  ok(a.cagnotte === 100, 'la cagnotte du 25 : 100 €, l\'enveloppe des le 25 novembre, et la licence de novembre 2027 (30 € d\'un coup) dans les douze periodes qui viennent (90 avant l\'enveloppe ; 180 avant le soin et le menage, 130 avant la laverie) (' + a.cagnotte + ')');
  ok(a.soins === 0, 'du 25 oct. au 24 nov. : le soin et le menage n\'ont plus de prix, rien a compter (' + a.soins + ')');
  ok(!a.ligne, 'plus de ligne « Soin et maison » dans le fil');
  ok(a.lav && a.lav.action === 'La laverie × 2' && a.lav.montant === 16 && /60 °C/.test(a.lav.detail) && /Maison et ménage/.test(a.lav.detail), 'puis la laverie : deux dimanches, le 15 et le 22, 16 € (' + (a.lav && a.lav.action) + ')');
  ok(/CLK$/.test(a.ordre), 'le fil finit par les courses, la laverie, puis le balayage (' + a.ordre + ')');
  ok(pres(a.somme, 700) && Math.abs(a.fin) < 0.001, 'le fil fait toujours 700 €, et le compte finit a zero');
  const sept = await fr.evaluate(() => { const a = window.__bcMoisArgent('2026-09-25'); return {soins: a.periode.soins, ligne: !!a.lignes.find(l => l.soins)}; });
  ok(sept.soins === 0 && !sept.ligne, 'avant le 14 novembre, rien n\'est compte (la liste n\'existait pas)');
  await ctx.close();
}

console.log('— iPhone : pas de debordement');
{
  const {ctx, page, fr} = await ouvrir('2026-11-14T10:00:00+01:00', {viewport:{width:390, height:844}});
  await versCourses(fr, page);
  const m = await fr.evaluate(() => { const de = document.documentElement; return {w: de.scrollWidth, c: de.clientWidth, deb: [...document.querySelectorAll('.fini-btn')].filter(b => b.getBoundingClientRect().right > de.clientWidth + 1).length}; });
  ok(m.w <= m.c && m.deb === 0, 'la page tient en 390 px, les boutons « fini » aussi (' + JSON.stringify(m) + ')');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
