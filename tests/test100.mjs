/* Le cardio. Son programme de sport tient en quatre seances de resistance -- tractions,
   dips, fentes, hip thrust -- et pas une minute d'aerobie. C'est le manque le plus net du
   programme : l'erection est un evenement vasculaire, le sommeil et la tension aussi, et
   rien dans sa semaine n'entrainait l'endothelium.
   Sa demande : 2 x 30 minutes, DANS les creneaux de temps libre -- donc sans deplacer un
   seul bloc de travail, et sans toucher aux quatre seances existantes.
   Deux places seulement conviennent dans toute la semaine : samedi 18:00 (une heure de
   temps libre) et dimanche 17:30 (90 minutes de repos). Les autres creneaux libres font
   20 minutes, ou tombent apres le diner.
   Ce fichier garde les trois choses qui pourraient casser en silence :
   1. la course ne doit RIEN retirer au travail prevu -- si elle etait typee « projet » ou
      « cours », elle gonflerait les cibles d'etudes sans qu'il fasse une minute de plus ;
   2. elle doit partir dans l'agenda Google -- un bloc « Temps libre » n'y va pas, et si
      elle heritait de ce traitement, son telephone ne sonnerait jamais ;
   3. elle ne doit PAS compter comme creneau libre : sinon la Batcave proposerait d'y
      rattraper un bloc manque, et le cardio sauterait a la premiere semaine chargee. */
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
  await page.waitForTimeout(300);
  return { ctx, fr };
}
const grille = (fr, iso, cle) => fr.evaluate(([i, c]) => window.__bcGrille(c, i), [iso, cle]);

console.log('\n== 326) Deux sorties par semaine, dans le temps libre ==');
{
  const { ctx, fr } = await jour('2026-09-21T08:00:00+02:00');
  const sam = await grille(fr, '2026-09-26', 'saturday');
  const dim = await grille(fr, '2026-09-27', 'weekend');
  const i = (g, h) => g.findIndex(b => b[0] === h);
  ok(sam[i(sam,'18:00')] && /Course à pied/.test(sam[i(sam,'18:00')][1]),
     'samedi 18:00 : course à pied (' + (sam[i(sam,'18:00')] || ['—','—'])[1] + ')');
  ok(sam[i(sam,'18:30')] && sam[i(sam,'18:30')][1] === 'Temps libre',
     'et le temps libre reprend à 18:30 — la course en prend 30 min, pas l\'heure entière');
  ok(dim[i(dim,'17:30')] && /Course à pied/.test(dim[i(dim,'17:30')][1]),
     'dimanche 17:30 : course à pied (' + (dim[i(dim,'17:30')] || ['—','—'])[1] + ')');
  ok(dim[i(dim,'18:00')] && /Repos/.test(dim[i(dim,'18:00')][1]),
     'et le repos reprend à 18:00 (' + (dim[i(dim,'18:00')] || ['—','—'])[1] + ')');
  /* Les quatre seances de muscu sont a 05:30 : la course ne doit en deplacer aucune. */
  ok(sam[0][0] === '05:30' && sam[0][1] === 'Sport', 'la séance de muscu du samedi n\'a pas bougé (05:30)');
  /* Et aucun bloc de travail n'a ete mange. */
  ok(sam.some(x => x[1] === 'Approfondir') && sam.some(x => /Cartes d'erreurs/.test(x[1])),
     'les blocs de travail du samedi sont intacts');
  /* Et apres le 18 octobre, quand la phase Español rend « Projets perso 2 » a lui-meme :
     la course ne doit pas l'avoir mange en chemin. */
  const samApres = await grille(fr, '2026-10-24', 'saturday');
  ok(samApres.some(x => x[1] === 'Projets perso 2') && /Course à pied/.test(samApres[i(samApres,'18:00')][1]),
     'après la phase Español, Projets perso 2 revient et la course reste à 18:00');
  ok(dim.some(x => x[1] === 'Réexpliquer') && dim.some(x => /Batch cooking/.test(x[1])),
     'ceux du dimanche aussi');
  await ctx.close();
}

console.log('\n== 327) La course ne gonfle aucune cible d\'études ==');
{
  const { ctx, fr } = await jour('2026-09-21T08:00:00+02:00');
  const t = await fr.evaluate(() => window.__bcTypeBloc('🏃 Course à pied'));
  ok(t === null, 'elle n\'est ni révision ni projet ni espagnol pour le minuteur (' + t + ')');
  const s = await fr.evaluate(() => window.__bcTypeSuivi('🏃 Course à pied'));
  ok(s === null, 'ni pour le suivi (' + s + ')');
  /* Le vendredi n'a pas de course : ses chiffres servent de temoin. Samedi et dimanche
     doivent garder EXACTEMENT ce qu'ils prevoyaient avant, puisque la course a ete prise
     sur du temps libre, qui ne comptait pour rien. */
  const p = await fr.evaluate(() => ({
    sam: window.__bcPrevu('2026-09-26'), dim: window.__bcPrevu('2026-09-27')
  }));
  ok(p.sam.rev === 265 && p.sam.proj === 0 && p.sam.es === 110,
     'samedi prévoit toujours 265 min de révision et 110 d\'espagnol (' + JSON.stringify(p.sam) + ')');
  ok(p.dim.rev === 210 && p.dim.es === 110,
     'dimanche aussi, inchangé (' + JSON.stringify(p.dim) + ')');
  ok(p.sam.sport === 1 && p.dim.sport === 0,
     'et la course ne se fait pas passer pour une séance de muscu : dimanche reste un jour off');
  await ctx.close();
}

console.log('\n== 328) Elle part dans l\'agenda Google ==');
{
  const { ctx, fr } = await jour('2026-09-21T08:00:00+02:00');
  const r = await fr.evaluate(() => {
    const sam = window.__bcRappels('2026-09-26'), dim = window.__bcRappels('2026-09-27');
    const c = sam.filter(x => /Course à pied/.test(x.titre))[0];
    return {sam: sam.filter(x => /Course à pied/.test(x.titre)).length,
            dim: dim.filter(x => /Course à pied/.test(x.titre)).length,
            debut: c ? c.debut : -1, fin: c ? c.fin : -1,
            suivant: sam.filter(x => x.debut === 18*60 + 30)[0] || null};
  });
  ok(r.sam === 1 && r.dim === 1, 'un rappel le samedi, un le dimanche (' + r.sam + ' / ' + r.dim + ')');
  ok(r.debut === 18*60 && r.fin === 18*60 + 30, 'samedi de 18:00 à 18:30 (' + r.debut + ' → ' + r.fin + ')');
  /* Elle est un evenement A ELLE : le temps libre reprend juste apres, en evenement
     distinct. Si la course avait garde le libelle « Temps libre », les deux auraient
     fusionne et son telephone n'aurait sonne pour rien. */
  ok(r.suivant && r.suivant.titre === '🦇 Temps libre',
     'et le temps libre reprend derrière, en événement séparé (' + (r.suivant ? r.suivant.titre : '—') + ')');
  await ctx.close();
}

console.log('\n== 329) Elle n\'est pas un créneau de rattrapage ==');
{
  const { ctx, fr } = await jour('2026-09-26T17:00:00+02:00');
  /* creneauxLibresRestants ne retient que « Temps libre », « Repos » et « Pause ». Si la
     course y entrait, la Batcave proposerait d'y caser un bloc manque -- et le cardio
     sauterait la premiere semaine ou il prend du retard. */
  const noms = await fr.evaluate(() => {
    const b = window.__bcBlocs('saturday', '2026-09-26');
    return b.map(x => x.label);
  });
  ok(noms.indexOf('🏃 Course à pied') === -1,
     'elle n\'apparaît pas dans les blocs de travail du jour');
  const c = await fr.evaluate(() => window.__bcConsigne('🏃 Course à pied', 6));
  ok(/30 minutes|Trente minutes/i.test(c) && /parler/.test(c),
     'la consigne dit la durée et l\'allure (' + (c || '—').slice(0, 60) + '…)');
  ok(!/fractionn/.test(c) || /Pas de sprint, pas de fractionné/.test(c),
     'et elle interdit le fractionné plutôt que de le suggérer');
  await ctx.close();
}

console.log('\n== 330) Le semestre 2 la garde ==');
{
  /* SCHEDULES_S2 ne redefinit ni samedi ni dimanche : grilleBase retombe sur SCHEDULES.
     Si quelqu'un ajoutait un jour ces deux cles a S2 sans y porter la course, elle
     disparaitrait a partir du 25 janvier sans que rien ne le signale. */
  const { ctx, fr } = await jour('2027-02-01T08:00:00+02:00');
  const r = await fr.evaluate(() => ({
    sem: (window.__bcSemestre('2027-02-06') || {}).id,
    sam: window.__bcRappels('2027-02-06').filter(x => /Course à pied/.test(x.titre)).length,
    dim: window.__bcRappels('2027-02-07').filter(x => /Course à pied/.test(x.titre)).length
  }));
  ok(r.sem === 's2', 'on est bien au semestre 2 (' + r.sem + ')');
  ok(r.sam === 1 && r.dim === 1, 'les deux sorties y sont toujours (' + r.sam + ' / ' + r.dim + ')');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ECHEC(S)' : '\nTOUT EST VERT');
process.exit(err ? 1 : 0);
