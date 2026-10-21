/* Lot 47 (23 septembre, matin) : trois decisions de sa part, apres la revue de ses programmes.
   1. Deux oeufs durs a la place du jambon a la collation d'entrainement.
   2. Le rythme de prise : objectif poids 72 kg au lieu de 70 (0,31 kg/semaine).
   3. Le cardio : sprints en cote le samedi des le 10 octobre, course du dimanche allongee
      de 5 min par semaine des le 11, jusqu'a 45 min. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, extra){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(extra) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, extra);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r && !document.getElementById('opening-ritual-overlay').hidden) r.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}

console.log('\n== 269) Deux oeufs a la place du jambon ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00', {'batcave-budget-limits': {Nourriture: 195}});
  const r = await fr.evaluate(() => ({
    jour: window.__bcMacrosJour('2026-09-28'),
    col: window.__bcMacrosRepas({name:'Collation entraînement'}, '2026-09-28'),
    oeufs: window.__bcBesoinSemaine.oeufs, jambon: window.__bcBesoinSemaine.jambon,
    cout: window.__bcCoutSemaine(), achats: window.__bcCoutAchats(),
    plafond: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-budget-limits') || '{}').Nourriture
  }));
  ok(r.col.kcal === 595 && r.col.p === 31, 'la collation : pain, 2 œufs, fromage, 40 g d\'amandes (25 jusqu\'au 29 septembre, +15 à la place des sauces au skyr) = 595 kcal, 31 g de protéines (' + r.col.kcal + ' / ' + r.col.p + ')');
  /* Le lundi 28 est un jour de combat : la collation combat ajoute 388 kcal. */
  /* 29 septembre : le petit-dejeuner devient un shake (boisson d'avoine, skyr, flocons, banane,
     miel, amandes) : -21 kcal et -11 g de proteines par jour (etiquette Alitey), les deux oeufs du matin sortent. */
  /* 21 octobre : le couscous (170 g les jours de combat), la collation combat legere, les fruits rouges du shake et les sauces comptees : 3 593 kcal, 159 g. */
  /* 21 octobre au soir : le shake de recup au retour du club, +302 kcal et +8 g. */
  ok(r.jour.kcal === 3895 && r.jour.p === 167, 'un jour de combat : 3 895 kcal, 167 g de protéines (3 593 et 159 avant le shake de récup du 21 octobre au soir), six prises (' + r.jour.kcal + ' / ' + r.jour.p + ')');
  ok(r.oeufs === 10 && r.jambon === undefined, 'les courses : 10 œufs par semaine (la collation seule depuis le shake, les sardines le mardi et le jeudi depuis le 21 octobre), plus de jambon (' + r.oeufs + ' / ' + r.jambon + ')');
  ok(!r.cout.lignes.some(l => /Jambon/.test(l.label)) && r.cout.manque.slice().sort().join('|') === ['Couscous', 'Fruits rouges surgelés', 'Galettes de riz', 'Sardines ou maquereau (boîte)'].join('|'), 'le coût ne compte plus de jambon ; seuls manquent les prix des articles du 21 octobre (son ticket) — la boisson d\'avoine a le sien depuis le 29 septembre ('  + r.cout.manque.join() + ')');
  /* 4 octobre : le plafond suit ce qu'il paie en caisse (conditionnements et cycles compris), pas ce qu'il mange. */
  ok(r.plafond === Math.round(r.achats.mois), 'le plafond Nourriture posé par la Batcave suit le coût en caisse : ' + r.plafond + ' €');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="repas"]') && document.querySelector('.nav-btn[data-page="repas"]').click());
  await page.waitForTimeout(300);
  const txt = await fr.evaluate(() => document.body.innerText);
  ok(/2 œufs durs \(100g\)/.test(txt) && !/Jambon \(40g\)/.test(txt), 'l\'onglet Repas affiche les œufs, plus le jambon');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-28T10:00:00+02:00', {'batcave-budget-limits': {Nourriture: 180}});
  const p = await fr.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-budget-limits') || '{}').Nourriture);
  ok(p === 180, 'un plafond réglé à la main ne bouge pas (' + p + ')');
  await ctx.close();
}

console.log('\n== 270) Le rythme de prise : 72 kg au bout de la saison ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  const t = await fr.evaluate(() => { const el = document.getElementById('kcal-analyse'); return el ? el.innerText : ''; });
  ok(/\+0,31 kg \/ semaine/.test(t), 'rythme visé : +0,31 kg par semaine (' + (t.match(/Rythme visé[^\n]*/) || [''])[0] + ')');
  const tuile = await fr.evaluate(() => [...document.querySelectorAll('#dash-releves .stat-tile')].map(x => x.innerText).filter(x => /Poids/.test(x))[0] || '');
  ok(/cible 72 kg/.test(tuile), 'la tuile Poids vise 72 kg : ' + tuile.replace(/\s+/g, ' '));
  await ctx.close();
}

console.log('\n== 271) Le cardio : sprints le samedi, course longue le dimanche ==');
{
  const { ctx, page, fr } = await ouvrir('2026-10-31T09:00:00+02:00');   /* 6 octobre : pas de JJB avant le 26, on lit la semaine du 26 */
  const r = await fr.evaluate(() => ({
    s3: (window.__bcGrille('saturday','2026-10-03').find(b => b[0] === '18:00') || [])[1],
    s10: (window.__bcGrille('saturday','2026-10-10').find(b => b[0] === '18:00') || [])[1],
    base10: (window.__bcGrilleBase('saturday','2026-10-10').find(b => b[0] === '18:00') || [])[1],
    cibles: ['2026-10-03','2026-10-04','2026-10-10','2026-10-11','2026-10-18','2026-10-25','2026-11-08'].map(d => window.__bcCibleCardio(d)),
    sorties: window.__bcSortiesCardio('2026-11-02'),
    rappel: window.__bcRappels('2026-10-30').find(b => /JJB/.test(b.titre)),
    consigneSam: window.__bcConsigne('⚡ Sprints en côte', 6, '2026-10-10', '18:00'),
    consigneDim: window.__bcConsigne('🏃 Course à pied', 0, '2026-10-18', '17:30'),
    sport: window.__bcConsigne('Sport', 6, '2026-10-10', '18:30')
  }));
  /* 25 septembre : le combat remplace la course et les sprints des le 28. Le samedi 18:00 est un bloc de projets. */
  ok(r.s3 === 'Projets perso 3' && r.s10 === 'Projets perso 3', 'samedi 3 et samedi 10 : un bloc de projets à 18:00, plus de course ni de sprints (' + r.s3 + ' / ' + r.s10 + ')');
  ok(r.base10 === 'Projets perso 3', 'la grille de base du samedi porte le bloc de projets');
  ok(JSON.stringify(r.cibles) === JSON.stringify([30,30,15,35,40,45,45]), 'minutes visées : 30, 30, puis sprints 15, dimanche 35 → 40 → 45 (' + r.cibles.join(', ') + ')');
  ok(r.sorties.length === 4 && r.sorties.filter(x => x.combat).length === 3 && r.sorties.filter(x => x.piscine).length === 1, 'la semaine du 2 novembre compte trois séances de combat (lundi, mercredi, vendredi ; pas de JJB avant le 28 octobre) et la piscine du mardi');
  ok(r.rappel && r.rappel.titreBase === '🦇 🥋 JJB' && r.rappel.debut === 630, 'le rappel du vendredi 30 : JJB à 10:30');
  ok(/6 à 8 sprints/.test(r.consigneSam) && /en montée/.test(r.consigneSam), 'la consigne des sprints : ' + r.consigneSam.slice(0, 70));
  ok(/^40 minutes/.test(r.consigneDim), 'le dimanche 18 : « 40 minutes cette semaine » (' + r.consigneDim.slice(0, 40) + ')');
  /* 4 octobre : au regime combat, plus de sprints ; la seance du samedi est a 05:30, bras et epaules. */
  ok(!/sprints/.test(r.sport) && /kilomètre/.test(r.sport), 'la consigne du samedi ne parle plus de sprints : 05:30, le kilomètre jusqu\'au parc (' + r.sport.slice(0, 60) + ')');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="sport"]').click());
  await page.waitForTimeout(300);
  const liste = await fr.evaluate(() => document.getElementById('cardio-liste').innerText);
  ok(/JJB · 90 min/.test(liste) && !/Muay Thai/.test(liste), 'le panneau Cardio & combat les nomme : ' + liste.replace(/\s+/g, ' ').slice(0, 120));
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT PASSE');
process.exit(errs ? 1 : 0);
