/* Le compteur cardio.
   Le defaut d'origine : la course a pied existait dans la grille et dans l'agenda Google,
   et NULLE PART ailleurs. Il l'a vu lui-meme -- « et dans mon onglet sport non plus ». Une
   fonction posee a un endroit sans ses consequences ailleurs.
   Le compteur vit A COTE des seances, jamais dedans, pour deux raisons :
   1. l'onglet Sport tient UN type de seance par jour, et le samedi est deja pris par la
      muscu -- la sortie du samedi n'aurait litteralement pas de case ;
   2. les cibles trimestrielles de seances (41, 46, 48) ont ete calculees sur QUATRE seances
      par semaine. Compter les sorties dedans ferait passer a six, soit ~78 au trimestre :
      les cibles seraient atteintes sans effort et l'objectif ne mesurerait plus rien.
   Ce fichier garde cette separation, et verifie que les jours de sortie sont LUS dans la
   grille plutot qu'ecrits en dur -- sinon on recree la desynchronisation qu'on repare. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

async function ouvrir(quand, seed){
  const ctx = await b.newContext({viewport:{width:1440,height:1400}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(x => { window.claude = undefined;
    if(x) Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed || null);
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR : ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:25000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="sport"]').click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}

console.log('\n== 335) Les sorties sont LUES dans la grille ==');
{
  const { ctx, fr } = await ouvrir('2026-09-23T10:00:00+02:00');
  const s = await fr.evaluate(() => window.__bcSortiesCardio('2026-09-21'));
  ok(s.length === 2, 'deux sorties dans la semaine du 21 septembre (' + s.length + ')');
  ok(s[0].iso === '2026-09-26' && s[0].heure === '18:00', 'samedi 26 à 18:00 (' + s[0].iso + ' ' + s[0].heure + ')');
  ok(s[1].iso === '2026-09-27' && s[1].heure === '17:30', 'dimanche 27 à 17:30 (' + s[1].iso + ' ' + s[1].heure + ')');
  /* Le point qui compte : rien n'est ecrit en dur. Si la course bougeait dans la grille,
     le panneau devrait suivre. On le verifie au semestre 2, ou samedi et dimanche sont
     les memes jours mais une autre periode du programme. */
  const s2 = await fr.evaluate(() => window.__bcSortiesCardio('2027-02-01'));
  ok(s2.length === 2 && s2[0].iso === '2027-02-06' && s2[1].iso === '2027-02-07',
     'et au semestre 2, les deux sorties suivent la grille (' + s2.map(x => x.iso).join(', ') + ')');
  await ctx.close();
}

console.log('\n== 336) Le cardio ne touche PAS le compteur de séances ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  const avant = await fr.evaluate(() => {
    const j = ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27'];
    return { sport: window.__bcPrevu('2026-09-27').sport, min: window.__bcCardioMinutes(j) };
  });
  await fr.evaluate(() => { window.__bcNoterCardio('2026-09-26', 30); window.__bcNoterCardio('2026-09-27', 30); });
  await page.waitForTimeout(300);
  const apres = await fr.evaluate(() => {
    const j = ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27'];
    return { sport: window.__bcPrevu('2026-09-27').sport, min: window.__bcCardioMinutes(j) };
  });
  ok(avant.min === 0 && apres.min === 60, 'les deux sorties comptent 60 min (' + avant.min + ' → ' + apres.min + ')');
  ok(avant.sport === apres.sport && apres.sport === 0,
     'le dimanche reste un jour SANS séance prévue : la course ne se fait pas passer pour de la muscu (' + apres.sport + ')');
  await ctx.close();
}

console.log('\n== 337) Le panneau dit ce qu\'il faut ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  const vide = await fr.evaluate(() => document.getElementById('cardio-note').textContent);
  ok(/0\/2/.test(vide), 'semaine neuve : 0/2 (' + vide + ')');
  await fr.evaluate(() => window.__bcNoterCardio('2026-10-03', 35));
  await page.waitForTimeout(300);
  const t = await fr.evaluate(() => document.getElementById('cardio-note').textContent);
  ok(/1\/2/.test(t) && /35 min/.test(t), 'une sortie de 35 min : 1/2 · 35 min (' + t + ')');
  const p = await fr.evaluate(() => document.getElementById('cardio-panel').innerText);
  ok(/ne comptent pas dans/.test(p), 'le panneau dit explicitement qu\'il ne compte pas dans les séances');
  ok(/six derni/.test(p), 'et il montre les six dernières semaines');
  await ctx.close();
}

console.log('\n== 338) La série ne compte que les semaines écoulées ==');
{
  /* Sans ce garde-fou, la serie retomberait a zero tous les lundis matin, parce que la
     semaine en cours n'a evidemment pas encore ses deux sorties. */
  const seed = {'batcave-cardio': {
    '2026-09-26': {min:30}, '2026-09-27': {min:30},
    '2026-10-03': {min:30}, '2026-10-04': {min:30}
  }};
  const { ctx, fr } = await ouvrir('2026-10-05T08:00:00+02:00', seed);
  const n = await fr.evaluate(() => window.__bcSerieCardio());
  ok(n === 2, 'deux semaines complètes d\'affilée, lundi matin, série intacte (' + n + ')');
  const t = await fr.evaluate(() => document.getElementById('cardio-resume').innerText);
  ok(/2 semaines compl/.test(t), 'et le résumé le dit (' + t.slice(0,48) + '…)');
  await ctx.close();
}

console.log('\n== 339) La ligne du Bilan ==');
{
  const seed = {'batcave-cardio': {'2026-09-26': {min:30}, '2026-09-27': {min:25}}};
  const { ctx, page, fr } = await ouvrir('2026-09-27T20:00:00+02:00', seed);
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="bilan"]').click(); });
  await page.waitForTimeout(500);
  const t = await fr.evaluate(() => document.getElementById('bilan-grid').innerText);
  ok(/Cardio/.test(t), 'le Bilan porte une ligne « Cardio »');
  ok(/55/.test(t), 'avec les 55 minutes de la semaine');
  ok(/Séances tenues/.test(t), 'et « Séances tenues » est toujours là, à côté');
  await ctx.close();
}

console.log('\n== 340) La saisie survit et se range ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  await fr.evaluate(() => window.__bcNoterCardio('2026-10-03', 45));
  await page.waitForTimeout(200);
  const stocke = await fr.evaluate(() => localStorage.getItem('batcave-cardio'));
  ok(/"2026-10-03"/.test(stocke) && /45/.test(stocke), 'la sortie est enregistrée (' + stocke + ')');
  await fr.evaluate(() => window.__bcNoterCardio('2026-10-03', 0));
  await page.waitForTimeout(200);
  const apres = await fr.evaluate(() => localStorage.getItem('batcave-cardio'));
  ok(!/2026-10-03/.test(apres), 'décochée, elle disparaît au lieu de rester à zéro (' + apres + ')');
  /* La cle doit etre connue du code, sinon le verificateur de coherence l'affiche comme
     inconnue a chaque demarrage, et la remise a zero de lundi l'emporterait. */
  const banniere = await fr.evaluate(() => /Clé inconnue du code/i.test(document.body.innerText));
  ok(!banniere, 'aucune bannière « clé inconnue » au démarrage');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ECHEC(S)' : '\nTOUT EST VERT');
process.exit(err ? 1 : 0);
