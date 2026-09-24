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
    cout: window.__bcCoutSemaine(),
    plafond: JSON.parse(localStorage.getItem('batcave-budget-limits') || '{}').Nourriture
  }));
  ok(r.col.kcal === 566 && r.col.p === 30, 'la collation : pain, 2 œufs, fromage, 35 g d\'amandes = 566 kcal, 30 g de protéines (' + r.col.kcal + ' / ' + r.col.p + ')');
  ok(r.jour.kcal === 3234 && r.jour.p === 165, 'la journée : 3 234 kcal, 165 g de protéines, quatre prises (24 septembre) (' + r.jour.kcal + ' / ' + r.jour.p + ')');
  ok(r.oeufs === 28 && r.jambon === undefined, 'les courses : 28 œufs par semaine, plus de jambon (' + r.oeufs + ' / ' + r.jambon + ')');
  ok(!r.cout.lignes.some(l => /Jambon/.test(l.label)) && r.cout.manque.join() === 'Amandes ou noix nature', 'le coût ne compte plus de jambon ; seul le prix des amandes manque (' + r.cout.manque.join() + ')');
  ok(r.plafond === Math.round(r.cout.mois), 'le plafond Nourriture posé par la Batcave suit le nouveau coût : ' + r.plafond + ' €');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="repas"]') && document.querySelector('.nav-btn[data-page="repas"]').click());
  await page.waitForTimeout(300);
  const txt = await fr.evaluate(() => document.body.innerText);
  ok(/2 œufs durs \(100g\)/.test(txt) && !/Jambon \(40g\)/.test(txt), 'l\'onglet Repas affiche les œufs, plus le jambon');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-28T10:00:00+02:00', {'batcave-budget-limits': {Nourriture: 180}});
  const p = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-budget-limits') || '{}').Nourriture);
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
  const { ctx, page, fr } = await ouvrir('2026-10-10T09:00:00+02:00');
  const r = await fr.evaluate(() => ({
    s3: (window.__bcGrille('saturday','2026-10-03').find(b => b[0] === '18:00') || [])[1],
    s10: (window.__bcGrille('saturday','2026-10-10').find(b => b[0] === '18:00') || [])[1],
    base10: (window.__bcGrilleBase('saturday','2026-10-10').find(b => b[0] === '18:00') || [])[1],
    cibles: ['2026-10-03','2026-10-04','2026-10-10','2026-10-11','2026-10-18','2026-10-25','2026-11-08'].map(d => window.__bcCibleCardio(d)),
    sorties: window.__bcSortiesCardio('2026-10-05'),
    rappel: window.__bcRappels('2026-10-10').find(b => /Sprints/.test(b.titre)),
    consigneSam: window.__bcConsigne('⚡ Sprints en côte', 6, '2026-10-10', '18:00'),
    consigneDim: window.__bcConsigne('🏃 Course à pied', 0, '2026-10-18', '17:30'),
    sport: window.__bcConsigne('Sport', 6, '2026-10-10', '18:30')
  }));
  ok(r.s3 === '🏃 Course à pied' && r.s10 === '⚡ Sprints en côte', 'samedi 3 : course ; samedi 10 : sprints en côte (' + r.s3 + ' / ' + r.s10 + ')');
  ok(r.base10 === '🏃 Course à pied', 'la grille de base garde la course : la série de l\'agenda reste reconnue');
  ok(JSON.stringify(r.cibles) === JSON.stringify([30,30,15,35,40,45,45]), 'minutes visées : 30, 30, puis sprints 15, dimanche 35 → 40 → 45 (' + r.cibles.join(', ') + ')');
  ok(r.sorties.length === 2 && r.sorties.some(x => x.sprints), 'la semaine du 5 octobre compte toujours deux sorties, dont les sprints du samedi');
  ok(r.rappel && r.rappel.titreBase === '🦇 🏃 Course à pied', 'le rappel du 10 s\'appelle « Sprints » mais se rattache à la série de base');
  ok(/6 à 8 sprints/.test(r.consigneSam) && /en montée/.test(r.consigneSam), 'la consigne des sprints : ' + r.consigneSam.slice(0, 70));
  ok(/^40 minutes/.test(r.consigneDim), 'le dimanche 18 : « 40 minutes cette semaine » (' + r.consigneDim.slice(0, 40) + ')');
  ok(/sprints en côte/.test(r.sport), 'la séance du samedi soir sait qu\'elle suit les sprints');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="sport"]').click());
  await page.waitForTimeout(300);
  const liste = await fr.evaluate(() => document.getElementById('cardio-liste').innerText);
  ok(/sprints en côte/.test(liste) && /35 min faciles/.test(liste), 'le panneau Cardio les nomme : ' + liste.replace(/\s+/g, ' ').slice(0, 120));
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT PASSE');
process.exit(errs ? 1 : 0);
