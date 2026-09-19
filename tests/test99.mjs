/* Ou acheter quoi. Il a quatre adresses a cote de chez lui -- son boucher, Lidl,
   Mercadona, Alcampo -- et le mercadillo pour les fruits, et il a tranche : plusieurs
   trajets valent mieux que payer plus cher. L'etiquette vit donc sur la ligne de
   l'article, pas dans un panneau a part.
   Deux choses comptent vraiment ici, et rien d'autre ne les garde :
   1. la viande et le jambon disent BOUCHER. Ils doivent etre halal, et le supermarche
      n'en vend pas. Une etiquette « Mercadona » sur le poulet serait une faute, pas une
      approximation ;
   2. le skyr dit ALCAMPO. Son Mercadona n'en a pas : l'envoyer la, c'est un trajet pour
      rien.
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

console.log('\n== 320) Les 46 articles portent tous une adresse ==');
{
  /* Le 19 septembre, l'ancre : toutes les categories sont dues, donc la liste entiere
     est affichee d'un coup. C'est le seul jour ou ce test voit les 46 lignes. */
  const { ctx, fr } = await courses('2026-09-19T10:00:00+02:00');
  const l = await lignes(fr);
  ok(l.length === 46, '46 articles affichés le 19 (' + l.length + ')');
  const muets = l.filter(x => !x.ou);
  ok(!muets.length, 'aucun article sans adresse (' + (muets.map(x => x.nom).join(', ') || 'aucun') + ')');
  /* Cinq destinations, pas une de plus : une faute de frappe dans OU_ARTICLE passerait
     silencieusement en pastille, et l'enverrait dans un magasin qui n'existe pas. */
  const connues = ['Boucher', 'Lidl', 'Mercadona', 'Alcampo', 'Mercadillo', 'En ligne'];
  const inconnues = [...new Set(l.map(x => x.ou.split(' · ')[0]))].filter(x => connues.indexOf(x) === -1);
  ok(!inconnues.length, 'aucune adresse inventée (' + (inconnues.join(', ') || 'aucune') + ')');
  await ctx.close();
}

console.log('\n== 321) Le halal : viande et jambon vont chez le boucher ==');
{
  const { ctx, fr } = await courses('2026-09-19T10:00:00+02:00');
  const l = await lignes(fr);
  const chez = n => (l.find(x => x.nom.indexOf(n) === 0) || {}).ou;
  ok(chez('Poulet') === 'Boucher', 'Poulet → Boucher (' + chez('Poulet') + ')');
  ok(chez('Viande hachée 5 %') === 'Boucher', 'Viande hachée → Boucher (' + chez('Viande hachée 5 %') + ')');
  ok(chez('Jambon') === 'Boucher', 'Jambon → Boucher : le halal ne se vend qu\'à la boucherie (' + chez('Jambon') + ')');
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
  ok(chez('Skyr') === 'Alcampo', 'Skyr → Alcampo : son Mercadona n\'en vend pas (' + chez('Skyr') + ')');
  ok(/^Alcampo/.test(chez('Huile d\'olive') || '') && /5 L/.test(chez('Huile d\'olive') || ''),
     'Huile d\'olive → Alcampo, et la pastille dit le bidon de 5 L (' + chez('Huile d\'olive') + ')');
  ok(/^Mercadillo/.test(chez('Bananes') || '') && /^Mercadillo/.test(chez('Fruits') || ''),
     'les fruits vont au mercadillo, jamais en supermarché (' + chez('Bananes') + ' / ' + chez('Fruits') + ')');
  ok(chez('Riz') === 'Lidl' && chez('Pâtes') === 'Lidl' && chez('Flocons d\'avoine') === 'Lidl',
     'le sec va chez Lidl : riz, pâtes, flocons');
  ok(/^Lidl/.test(chez('Saumon') || '') && chez('Légumes verts surgelés') === 'Lidl',
     'le surgelé aussi : saumon et légumes verts (' + chez('Saumon') + ')');
  /* L'hygiene et le menage n'ont pas d'etiquette article par article : ils heritent de
     leur categorie. Si OU_DEFAUT sautait, ils seraient muets -- deja couvert en 320 --
     mais il faut aussi qu'ils heritent de la BONNE adresse. */
  ok(chez('Shampooing') === 'Mercadona' && chez('Nettoyant WC') === 'Mercadona',
     'hygiène et ménage héritent de Mercadona (' + chez('Shampooing') + ' / ' + chez('Nettoyant WC') + ')');
  ok(chez('Papier toilette') === 'Lidl' && chez('Sacs poubelle 30 L') === 'Lidl',
     'le consommable de maison hérite de Lidl, moins cher au volume (' + chez('Papier toilette') + ')');
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
  ok(avant !== apres.txt && /1\/46/.test(apres.txt), 'le compteur suit : ' + apres.txt.trim());
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
  ok(/boucher/i.test(d) && /Lidl/.test(d) && /Alcampo/.test(d) && /Mercadona/.test(d) && /mercadillo/i.test(d),
     'et elle nomme les cinq adresses');
  ok(!/€/.test(d) && !/prix.{0,20}estim/i.test(d), 'toujours aucun prix affiché sur la page Courses');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ECHEC(S)' : '\nTOUT EST VERT');
process.exit(err ? 1 : 0);
