/* L'agenda Google et les JOURS SANS COURS.
   La Batcave ne poussait qu'aujourd'hui et demain. Au-dela, les series recurrentes 🦇
   disent la bonne chose -- la grille type ne bouge pas -- SAUF les jours sans cours, ou la
   plage de cours se libere et la soiree remonte d'une heure. Verifie le 19 septembre sur
   le vendredi 9 octobre (Comunitat Valenciana) : l'agenda y portait « Trajet cours »,
   « Trajet retour », « Clore le cours du jour » et un coucher a 21:55, pour une journee ou
   il ne va nulle part. Ils ne se corrigeaient que la veille.
   22 septembre : le coucher de semaine est passe de 21:55 a 21:35, donc l'ecart entre un
   jour sans cours (21:00) et un jour de cours n'est plus d'une heure mais de 35 minutes.
   Ce qui est teste ne change pas -- la soiree d'un jour sans cours remonte bien -- seul
   le chiffre de reference bouge. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}

console.log('\n== 316) Aujourd\'hui, demain, et les jours sans cours a venir ==');
{
  /* 12 octobre : jour 1 au mardi 13 -- le 9 et le 12 sont avant le programme, ou aucun jour
     n'est sans cours. Lu le 13 : la fenetre de 75 jours porte le 8 decembre et les 23, 24 et
     25 decembre (vacances de Noel). */
  const { ctx, fr } = await ouvrir('2026-10-13T08:00:00+02:00');
  const j = await fr.evaluate(() => window.__bcJoursGcal());
  ok(j[0] === '2026-10-13' && j[1] === '2026-10-14', 'aujourd\'hui et demain viennent toujours en premier (' + j.slice(0,2).join(', ') + ')');
  ok(j.indexOf('2026-12-08') > -1 && j.indexOf('2026-12-23') > -1 && j.indexOf('2026-12-25') > -1,
     'les jours sans cours de la fenetre y sont : 8, 23, 24 et 25 decembre (' + j.join(', ') + ')');
  ok(j.length === 6, 'et RIEN d\'autre : un jour ordinaire lointain n\'a pas besoin d\'etre pousse (' + j.length + ')');
  const doublons = j.filter((x,i) => j.indexOf(x) !== i);
  ok(!doublons.length, 'aucun doublon dans la liste');
  await ctx.close();
}

console.log('\n== 317) Un jour sans cours qui tombe demain n\'est pas compte deux fois ==');
{
  /* Le 7 decembre, le 8 est deja « demain ». Il doit apparaitre UNE fois. */
  const { ctx, fr } = await ouvrir('2026-12-07T08:00:00+01:00');
  const j = await fr.evaluate(() => window.__bcJoursGcal());
  ok(j.filter(x => x === '2026-12-08').length === 1, 'le 8 décembre n\'apparait qu\'une fois (' + j.join(', ') + ')');
  ok(j.indexOf('2026-12-23') > -1, 'et le 23 est toujours la');
  await ctx.close();
}

console.log('\n== 318) Ce qui part vraiment un jour sans cours ==');
{
  const { ctx, fr } = await ouvrir('2026-09-21T08:00:00+02:00');
  /* 12 octobre : le vendredi 9 est avant le programme. Le vendredi sans cours d'apres le
     jour 1 : le 25 decembre (vacances de Noel). */
  const t = await fr.evaluate(() => window.__bcRappels('2026-12-25').map(x => x.titre));
  /* Le vendredi 25 decembre libere la plage de cours : plus de trajet, plus de cloture. */
  ok(!t.some(x => /Trajet cours|Trajet retour|Clore le cours/.test(x)),
     'ni trajet ni « Clore le cours du jour » : il ne va nulle part (' + t.filter(x => /Trajet|Clore/.test(x)).join(', ') + ')');
  ok(t.some(x => /Trajet mosqu/.test(x)), 'mais le trajet mosquee du vendredi reste — Jumu\'ah a lieu');
  ok(t.some(x => /Lire/.test(x)) && t.some(x => /Réexpliquer/.test(x)),
     'la plage liberee porte Lire et Réexpliquer');
  const coucher = await fr.evaluate(() => { const r = window.__bcRappels('2026-12-25').filter(x => /Coucher/.test(x.titre))[0]; return r ? r.debut : -1; });
  ok(coucher === 21*60 + 35, 'le coucher reste a 21:35 : la meme heure tous les jours au regime combat (' + coucher + ' min)');
  await ctx.close();
}

console.log('\n== 319) Un jour de cours ordinaire n\'a pas change ==');
{
  const { ctx, fr } = await ouvrir('2026-09-21T08:00:00+02:00');
  const t = await fr.evaluate(() => window.__bcRappels('2026-10-16').map(x => x.titre));
  ok(t.some(x => /Trajet cours/.test(x)) && t.some(x => /Clore le cours/.test(x)),
     'le vendredi 16 octobre garde son trajet et sa cloture');
  const coucher = await fr.evaluate(() => { const r = window.__bcRappels('2026-10-16').filter(x => /Coucher/.test(x.titre))[0]; return r ? r.debut : -1; });
  ok(coucher === 21*60 + 35, 'et son coucher a 21:35 (' + coucher + ' min)');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
