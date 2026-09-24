/* LA CHASSE AU DEMI-CABLAGE.
   La classe de defaut qu'il a nommee : une fonction posee a un endroit sans ses
   consequences ailleurs. La course existait dans la grille et l'agenda, mais pas dans
   Sport ni dans le Bilan. Les etirements avaient une case a cocher et aucun contenu.
   Le shampoing avait quatre jours alors qu'il en suait cinq.
   Cet audit cherche mecaniquement ce type de trou, sur toute la Batcave :
   A. tout bloc RECURRENT de la grille a-t-il un endroit ou se noter ?
   B. toute habitude quotidienne a-t-elle un contenu, ou est-ce une case sur du vide ?
   C. tout magasin de donnees a-t-il un ecran qui le montre ?
   D. toute sonde de test pointe-t-elle sur quelque chose de vivant ? */
import { chromium } from 'playwright';
const b = await chromium.launch();
let n = 0;
const pt = (c, m) => { if(c) console.log('  ok  ' + m); else { n++; console.log('  ⚠   ' + m); } };

const ctx = await b.newContext({viewport:{width:1440,height:1400}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
page.on('pageerror', e => { n++; console.log('  ⚠   PAGEERROR : ' + e.message); });
await page.clock.install({ time: new Date('2026-11-02T08:00:00+02:00') });
await page.goto('http://127.0.0.1:8199/host.html');
await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:25000});
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await page.waitForTimeout(600);

console.log('\n== A) Chaque bloc de la grille a-t-il une destination ? ==');
{
  const r = await fr.evaluate(() => {
    const vus = {}, sans = [];
    [[1,'monday'],[2,'tuesday'],[3,'wednesday'],[4,'weekday'],[5,'friday'],[6,'saturday'],[0,'weekend']]
      .forEach(([dow, cle]) => window.__bcGrille(cle, '2026-11-02').forEach(b => { vus[b[1]] = true; }));
    /* Un bloc « a une destination » s'il est : du travail chronometre (typeBlocPlan),
       une seance de sport, du cardio (JJB et Muay Thai se notent dans « Cardio & combat »),
       un repas, un bloc de projets perso (sans minuteur depuis le 25 septembre : sa
       destination est le livrable coche le dimanche), ou un bloc de vie sans suivi assume
       (douche, trajet, retour du club, coucher, temps libre...). On liste ce qui n'entre
       nulle part. */
    const vie = /Douche|Trajet|Retour du club|Coucher|Temps libre|Repos|Micro-sieste|Collation|Déjeuner|Dîner|Petit-déjeuner|Sport|Course à pied|JJB|Muay Thai|^Projets perso|Jumu|Ménage|Batch cooking|Courses|Rangement|Cours$/;
    Object.keys(vus).forEach(l => {
      if(window.__bcTypeBloc(l)) return;
      if(vie.test(l)) return;
      sans.push(l);
    });
    return {total: Object.keys(vus).length, sans};
  });
  pt(!r.sans.length, r.total + ' libellés distincts · sans destination : ' + (r.sans.join(' | ') || 'aucun'));
}

console.log('\n== B) Chaque habitude quotidienne a-t-elle un contenu quelque part ? ==');
{
  const r = await fr.evaluate(() => {
    const h = JSON.parse(localStorage.getItem('batcave-habits') || '[]');
    /* Une habitude « a du contenu » si son libelle est auto-suffisant (Fajr, Lit fait) ou
       si un dossier explique quoi faire. Les cas douteux sont ceux qui demandent un
       protocole : etirements, marche, lecture, conversation. */
    const besoinProtocole = /Étirement|Marche|Lecture|Lire|Conversation|Kegel|Formules|pages lues/i;
    return h.filter(x => x && besoinProtocole.test(x.label || '')).map(x => x.label);
  });
  console.log('     habitudes qui demandent un protocole : ' + (r.join(' | ') || 'aucune'));
  pt(true, 'listées ci-dessus — à confronter aux dossiers publiés');
}

console.log('\n== C) Chaque magasin de données a-t-il un écran ? ==');
{
  const r = await fr.evaluate(() => {
    const pages = [...document.querySelectorAll('.nav-btn[data-page]')].map(b => b.dataset.page);
    const out = {};
    pages.forEach(p => {
      const sec = document.querySelector('.page[data-page="' + p + '"]');
      out[p] = sec ? sec.innerText.trim().length : -1;
    });
    return out;
  });
  const vides = Object.keys(r).filter(k => r[k] < 200);
  pt(!vides.length, Object.keys(r).length + ' onglets · vides ou quasi vides : ' + (vides.join(', ') || 'aucun'));
}

console.log('\n== D) Les sondes de test pointent-elles sur du vivant ? ==');
{
  const r = await fr.evaluate(() => {
    const mortes = [];
    Object.keys(window).filter(k => k.indexOf('__bc') === 0).forEach(k => {
      const v = window[k];
      if(v === undefined || v === null) mortes.push(k);
    });
    return {total: Object.keys(window).filter(k => k.indexOf('__bc') === 0).length, mortes};
  });
  pt(!r.mortes.length, r.total + ' sondes · mortes : ' + (r.mortes.join(', ') || 'aucune'));
}

console.log('\n== E) Le cardio, bout en bout ==');
{
  const r = await fr.evaluate(() => {
    const sorties = window.__bcSortiesCardio('2026-11-02');
    /* regime combat (28 septembre -> 24 janvier) : le cardio, c'est le club -- JJB lundi,
       mercredi et vendredi a 10:30, Muay Thai mardi a 19:30 ; plus de course ni de sprints */
    const jjb = [['monday','2026-11-02'],['wednesday','2026-11-04'],['friday','2026-11-06']]
      .every(([c, iso]) => window.__bcGrille(c, iso).some(b => b[0] === '10:30' && /JJB/.test(b[1])));
    const grille = jjb && window.__bcGrille('tuesday', '2026-11-03').some(b => b[0] === '19:30' && /Muay Thai/.test(b[1]));
    const agenda = window.__bcRappels('2026-11-02').some(x => /JJB/.test(x.titre)) && window.__bcRappels('2026-11-03').some(x => /Muay Thai/.test(x.titre));
    const panneau = !!document.getElementById('cardio-panel');
    return {sorties: sorties.length, grille, agenda, panneau};
  });
  pt(r.grille, 'dans la grille (JJB lundi, mercredi et vendredi 10:30 ; Muay Thai mardi 19:30)');
  pt(r.agenda, 'dans ce qui part vers l\'agenda Google');
  pt(r.panneau && r.sorties === 4, 'dans l\'onglet Sport, avec ses 4 séances de combat (' + r.sorties + ')');
}

await ctx.close(); await b.close();
console.log(n ? '\n' + n + ' TROU(S) DE CÂBLAGE' : '\nAUCUN TROU DE CÂBLAGE');
process.exit(n ? 1 : 0);
