/* Ou acheter quoi. L'etiquette vit sur la ligne de l'article, pas dans un panneau a part.
   Les adresses ont ete RELEVEES, pas supposees : les 20 et 21 septembre il a fait le
   tour, prix en main. Ce qui a change ce jour-la, et que ce test garde desormais :
     - la boucherie s'appelle « Boucherie », pas « Boucher » ;
     - le skyr n'est plus a Alcampo mais chez LIDL, ou la boite de 150 g est a 0,75 € ;
     - l'huile non plus : le bidon de 2 L de Lidl a 11,89 € remplace celui de 5 L ;
     - les bananes passent chez Lidl (1,48 €/kg) et les fruits a la FRUTERIA, pas au
       mercadillo ;
     - Mercadona ne figure plus nulle part : ce qu'il y prenait -- hygiene et menage --
       est sorti de la liste le 20 septembre, et son skyr n'y existait pas.
   Deux choses comptent plus que les autres, et rien d'autre ne les garde :
   1. la viande et le jambon disent BOUCHERIE. Ils doivent etre halal, et le supermarche
      n'en vend pas. Une etiquette « Lidl » sur le poulet serait une faute, pas une
      approximation ;
   2. le fromage porte « cuajo vegetal ». Sa presure doit l'etre, et ca ne se voit qu'en
      lisant l'etiquette en rayon.
   Le reste verifie qu'aucun article ne part sans adresse, qu'aucune adresse inventee ne
   se glisse dans la liste, et que la pastille n'a pas casse la case a cocher. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

async function courses(quand){
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
/* Une ligne = le nom de l'article (sans la pastille ni la note) et son adresse. */
const lignes = fr => fr.evaluate(() => [...document.querySelectorAll('#courses-grid .cat-card li')].map(li => {
  const tag = li.querySelector('.ou-tag');
  const lab = li.querySelector('label').cloneNode(true);
  lab.querySelectorAll('.ou-tag, .sub-note').forEach(n => n.remove());
  return { nom: lab.textContent.trim(), ou: tag ? tag.textContent.trim() : null };
}));

console.log('\n== 320) Les 17 articles portent tous une adresse ==');
{
  /* Le 19 septembre, l'ancre : toutes les categories sont dues, donc la liste entiere
     est affichee d'un coup. C'est le seul jour ou ce test voit les 46 lignes. */
  const { ctx, fr } = await courses('2026-09-19T10:00:00+02:00');
  const l = await lignes(fr);
  ok(l.length === 17, '17 articles affichés le 19 (' + l.length + ')');
  const muets = l.filter(x => !x.ou);
  ok(!muets.length, 'aucun article sans adresse (' + (muets.map(x => x.nom).join(', ') || 'aucun') + ')');
  /* Cinq destinations, pas une de plus : une faute de frappe dans OU_ARTICLE passerait
     silencieusement en pastille, et l'enverrait dans un magasin qui n'existe pas.
     « Mercadona » et « Mercadillo » sont sortis de cette liste le 21 septembre -- les
     garder tolerees aurait laisse revenir en silence deux adresses ou il ne va plus. */
  const connues = ['Boucherie', 'Lidl', 'Alcampo', 'Frutería', 'En ligne'];
  const inconnues = [...new Set(l.map(x => x.ou.split(' · ')[0]))].filter(x => connues.indexOf(x) === -1);
  ok(!inconnues.length, 'aucune adresse inventée (' + (inconnues.join(', ') || 'aucune') + ')');
  await ctx.close();
}

console.log('\n== 321) Le halal : viande et jambon vont a la boucherie ==');
{
  const { ctx, fr } = await courses('2026-09-19T10:00:00+02:00');
  const l = await lignes(fr);
  const chez = n => (l.find(x => x.nom.indexOf(n) === 0) || {}).ou;
  ok(chez('Poulet') === 'Boucherie', 'Poulet → Boucherie (' + chez('Poulet') + ')');
  ok(chez('Viande hachée 5 %') === 'Boucherie', 'Viande hachée → Boucherie (' + chez('Viande hachée 5 %') + ')');
  ok(chez('Jambon') === 'Boucherie', 'Jambon → Boucherie : le halal ne se vend qu\'à la boucherie (' + chez('Jambon') + ')');
  /* Le fromage n'est pas de la viande, mais sa presure l'est : la pastille doit porter
     la mention qui lui evite de prendre le premier paquet venu. */
  ok(/cuajo vegetal/.test(chez('Fromage en tranches') || ''), 'Fromage en tranches → la pastille rappelle « cuajo vegetal » (' + chez('Fromage en tranches') + ')');
  await ctx.close();
}

console.log('\n== 322) Les trajets qui font gagner de l\'argent ==');
{
  const { ctx, fr } = await courses('2026-09-19T10:00:00+02:00');
  const l = await lignes(fr);
  const chez = n => (l.find(x => x.nom.indexOf(n) === 0) || {}).ou;
  /* 21 septembre, en rayon : Lidl a le skyr (0,75 € la boite de 150 g) ET l'huile
     (11,89 € le bidon de 2 L). Les deux trajets vers Alcampo tombent donc, et il ne
     reste a Alcampo que le beurre de cacahuete -- le pot qu'il a choisi. */
  ok(chez('Skyr') === 'Lidl', 'Skyr → Lidl : la boîte de 150 g à 0,75 € (' + chez('Skyr') + ')');
  ok(chez('Huile d\'olive') === 'Lidl', 'Huile d\'olive → Lidl : le bidon de 2 L à 11,89 € (' + chez('Huile d\'olive') + ')');
  ok(chez('Beurre de cacahuète') === 'Alcampo',
     'le beurre de cacahuète reste le seul article d\'Alcampo (' + chez('Beurre de cacahuète') + ')');
  ok(chez('Bananes') === 'Lidl' && /^Frutería/.test(chez('Fruits') || ''),
     'bananes chez Lidl à 1,48 €/kg, fruits à la frutería (' + chez('Bananes') + ' / ' + chez('Fruits') + ')');
  ok(chez('Riz') === 'Lidl' && chez('Pâtes') === 'Lidl' && chez('Flocons d\'avoine') === 'Lidl',
     'le sec va chez Lidl : riz, pâtes, flocons');
  ok(chez('Légumes verts surgelés') === 'Lidl',
     'le surgelé aussi : les légumes verts (' + chez('Légumes verts surgelés') + ')');
  /* La viande est halal, donc elle ne vient QUE de la boucherie -- aucune des trois
     lignes ne doit jamais glisser vers un supermarche. */
  ok(chez('Poulet') === 'Boucherie' && chez('Viande hachée') === 'Boucherie' && chez('Jambon') === 'Boucherie',
     'la viande halal vient de la boucherie, les trois lignes (' + chez('Poulet') + ')');
  /* Mercadona n'a plus aucune ligne. Ce n'est pas un oubli : ce qu'il y prenait etait
     l'hygiene et le menage, sortis de la liste le 20 septembre, et son skyr n'y existait
     pas. Une pastille « Mercadona » qui reapparaitrait serait donc un trajet pour rien. */
  ok(!l.some(x => /Mercadona|Mercadillo/.test(x.ou || '')),
     'plus aucune ligne n\'envoie à Mercadona ni au mercadillo');
  ok(chez('Créatine monohydrate') === 'En ligne', 'la créatine se commande en ligne (' + chez('Créatine monohydrate') + ')');
  await ctx.close();
}

console.log('\n== 323) La pastille n\'a rien cassé ==');
{
  const { ctx, page, fr } = await courses('2026-09-19T10:00:00+02:00');
  /* Elle vit DANS le <label> : cliquer dessus doit cocher l'article, pas rater la cible. */
  const avant = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  await fr.evaluate(() => document.querySelector('#courses-grid .cat-card li .ou-tag').click());
  await page.waitForTimeout(200);
  const apres = await fr.evaluate(() => ({
    txt: document.getElementById('courses-summary').textContent,
    coche: document.querySelector('#courses-grid .cat-card li').classList.contains('checked')
  }));
  ok(apres.coche, 'cliquer la pastille coche bien l\'article — elle est dans le label');
  ok(avant !== apres.txt && /1\/17/.test(apres.txt), 'le compteur suit : ' + apres.txt.trim());
  /* Coche = « j'ai deja ce qu'il faut » aussi bien que « achete ». L'adresse doit rester
     lisible-mais-en-retrait, jamais disparaitre : il peut decocher. */
  const opac = await fr.evaluate(() => getComputedStyle(document.querySelector('#courses-grid .cat-card li .ou-tag')).opacity);
  ok(parseFloat(opac) > 0.2 && parseFloat(opac) < 0.6, 'une fois coché, la pastille s\'efface sans disparaître (opacité ' + opac + ')');
  /* Et elle ne doit pas deborder de sa carte sur un ecran etroit. */
  await ctx.close();
}

console.log('\n== 324) Sur écran étroit, la pastille ne pousse pas la page ==');
/* Le vrai piege, et il s'est referme : « 1fr » vaut « minmax(auto,1fr) », donc une colonne
   de grille ne descend jamais sous la largeur min-content de son contenu. Une pastille en
   white-space:nowrap (« Mercadillo · de saison ») imposait cette largeur a la colonne
   entiere : en iPad portrait, les trois colonnes reclamaient 631 px pour 540 disponibles,
   et c'est la PAGE qui partait en defilement horizontal -- pas seulement la carte.
   On verifie donc les deux echelles, et le defilement de la page, pas juste la pastille. */
for(const ecran of [{n:'iPhone', w:390, h:844}, {n:'iPad portrait', w:820, h:1180}]){
  const ctx = await b.newContext({viewport:{width:ecran.w,height:ecran.h}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + ecran.n + ' : ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-19T10:00:00+02:00') });
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="courses"]').click(); });
  await page.waitForTimeout(400);
  const m = await fr.evaluate(() => {
    const out = {debords: [], doc: document.documentElement.scrollWidth, vue: document.documentElement.clientWidth};
    const g = document.getElementById('courses-grid');
    out.grille = g.scrollWidth; out.grilleVue = Math.round(g.getBoundingClientRect().width);
    document.querySelectorAll('#courses-grid .cat-card').forEach(c => {
      const bc = c.getBoundingClientRect();
      c.querySelectorAll('.ou-tag').forEach(t => {
        const bt = t.getBoundingClientRect();
        if(bt.right > bc.right + 1 || bt.left < bc.left - 1) out.debords.push(t.textContent.trim());
      });
    });
    return out;
  });
  ok(!m.debords.length, ecran.n + ' : aucune pastille ne sort de sa carte (' + (m.debords.join(', ') || 'aucune') + ')');
  ok(m.grille <= m.grilleVue + 1, ecran.n + ' : la grille des courses tient dans sa largeur (' + m.grille + ' ≤ ' + m.grilleVue + ')');
  ok(m.doc <= m.vue + 1, ecran.n + ' : et la page ne défile pas horizontalement (' + m.doc + ' ≤ ' + m.vue + ')');
  await ctx.close();
}

console.log('\n== 325) La page Courses annonce les adresses ==');
{
  const { ctx, fr } = await courses('2026-09-19T10:00:00+02:00');
  const d = await fr.evaluate(() => document.querySelector('.page[data-page="courses"] .page-head .desc').textContent);
  ok(/pastille/.test(d) && /moins cher/.test(d), 'la description explique à quoi sert la pastille');
  ok(/boucherie/i.test(d) && /Lidl/.test(d) && /fruter/i.test(d) && /Alcampo/.test(d) && /en ligne/i.test(d),
     'et elle nomme les cinq adresses réellement utilisées');
  /* La description annonçait « les prix, eux, ne sont plus affichés ». C'était vrai du
     19 au 20 septembre, et faux depuis le 21 : il a relevé quinze prix sur seize. Une
     description qui contredit la page est un mensonge de plus, pas un détail. */
  ok(!/ne sont plus affich/.test(d) && /relev/.test(d) && /20 et 21 septembre/.test(d),
     'et elle dit que les prix affichés sont les SIENS, relevés en magasin');
  ok(!/estim/i.test(d) && !/Mercadona/.test(d) && !/mercadillo/i.test(d),
     'aucune estimation annoncée, et plus aucune adresse périmée');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ECHEC(S)' : '\nTOUT EST VERT');
process.exit(err ? 1 : 0);
