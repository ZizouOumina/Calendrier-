/* Lot 33, revu le 19 septembre 2026 — la note de suivi des cours, sans les portes.

   Les trois « portes » ont ete retirees : elles rendaient un bloc Español aux projets quand
   la moyenne tenait, mais il faut 12 jours de cours notes sur une fenetre de 21 et la phase
   Español ne dure que quatre semaines -- la premiere ne pouvait s'ouvrir qu'a quelques jours
   de la bascule automatique du 23 octobre, et la seconde exigeait un examen deja passe en
   espagnol. Elles ne gagnaient qu'une heure.

   Ce qui reste, et que ce fichier protege : la NOTE QUOTIDIENNE (0-3) et sa moyenne
   glissante sur 21 jours, lues pour elles-memes. Eprouve ici : la fenetre et son plancher
   de 12 jours, la moyenne, la tendance contre les 21 jours precedents, le mot juste selon
   le niveau -- et surtout, que la GRILLE NE BOUGE PAS quelle que soit la note. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

async function ouvrir(seed, quand){
  const ctx = await b.newContext({viewport:{width:1440, height:1100}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(s => {
    window.claude = undefined;
    for(const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
  }, seed || {});
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + e.message); });
  await page.clock.install({time: new Date(quand)});
  await page.goto(URL, {timeout:20000}).catch(()=>{});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  await page.waitForTimeout(400);
  return {ctx, page, fr};
}
const etudes = async (fr, page) => {
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(400);
};
const carte = fr => fr.evaluate(() => ({
  note: (document.getElementById('portes-note')||{}).textContent || '',
  etat: ((document.getElementById('portes-etat')||{}).textContent || '').replace(/\s+/g, ' ')
}));
/* Des notes de suivi sur les jours de COURS (lun, mar, mer, jeu, ven) précédant `fin`. */
function notes(fin, jours, valeur){
  const out = {}; const d = new Date(fin + 'T00:00:00'); let pris = 0;
  while(pris < jours){
    const dow = d.getDay();
    const iso = d.toISOString().slice(0, 10);
    if(dow >= 1 && dow <= 5 && iso >= '2026-09-14'){ out[iso] = (typeof valeur === 'function') ? valeur(pris) : valeur; pris++; }
    d.setDate(d.getDate() - 1);
    if(d < new Date('2026-09-01T00:00:00')) break;
  }
  return out;
}
const revue = (date, errores) => [{id:'rv1', date, marche:'', coince:'', ajust:'', espanol:{errores, oral:null, drill:null}}];


console.log('\n== 1) Sans un seul jour noté, le panneau le dit et ne calcule rien ==');
{
  const { ctx, page, fr } = await ouvrir({}, '2026-10-05T21:00:00+02:00');
  await etudes(fr, page);
  await fr.evaluate(() => { const t = document.getElementById('portes-toggle'); if(t) t.click(); });
  await page.waitForTimeout(300);
  const c = await carte(fr);
  ok(/Aucun jour de cours noté/.test(c.etat), 'le panneau annonce l\'absence de données');
  ok(!/NaN|undefined|null/.test(c.etat), 'et n\'affiche aucun chiffre bancal : ' + c.etat.slice(0, 90));
  await ctx.close();
}

console.log('\n== 2) Sous 12 jours notés, le chiffre est donné mais annoncé comme indicatif ==');
{
  const fin = '2026-10-05';
  const { ctx, page, fr } = await ouvrir({'batcave-cours-suivi': notes(fin, 8, 3)}, '2026-10-05T21:00:00+02:00');
  await etudes(fr, page);
  await fr.evaluate(() => { const t = document.getElementById('portes-toggle'); if(t) t.click(); });
  await page.waitForTimeout(300);
  const c = await carte(fr);
  ok(/3,00 \/ 3/.test(c.etat), 'la moyenne de huit 3 vaut 3,00 / 3 : ' + (c.etat.match(/\d,\d\d \/ 3/) || [''])[0]);
  ok(/8 jours de cours notés/.test(c.etat), 'le nombre de jours est dit');
  ok(/indicatif/.test(c.etat), 'et le chiffre est annoncé comme indicatif sous le plancher de 12');
  await ctx.close();
}

console.log('\n== 3) Au-dessus de 12 jours, la moyenne est ferme et le mot suit le niveau ==');
{
  const fin = '2026-10-16';
  const { ctx, page, fr } = await ouvrir({'batcave-cours-suivi': notes(fin, 14, 3)}, '2026-10-16T21:00:00+02:00');
  await etudes(fr, page);
  await fr.evaluate(() => { const t = document.getElementById('portes-toggle'); if(t) t.click(); });
  await page.waitForTimeout(300);
  const c = await carte(fr);
  ok(/3,00 \/ 3/.test(c.etat), 'quatorze 3 donnent 3,00 / 3');
  ok(!/indicatif/.test(c.etat), 'au-dessus de 12 jours, plus de réserve');
  ok(/tu suis le fil/.test(c.etat), 'et le mot juste pour 3,00 : « tu suis le fil »');
  await ctx.close();
}

console.log('\n== 4) Une note basse est dite sans détour, et renvoie à la langue ==');
{
  const fin = '2026-10-16';
  const { ctx, page, fr } = await ouvrir({'batcave-cours-suivi': notes(fin, 14, 1)}, '2026-10-16T21:00:00+02:00');
  await etudes(fr, page);
  await fr.evaluate(() => { const t = document.getElementById('portes-toggle'); if(t) t.click(); });
  await page.waitForTimeout(300);
  const c = await carte(fr);
  ok(/1,00 \/ 3/.test(c.etat), 'quatorze 1 donnent 1,00 / 3');
  ok(/perds le fil souvent/.test(c.etat), 'le mot ne ménage pas : « tu perds le fil souvent »');
  ok(/c’est la langue, pas la matière|c'est la langue, pas la matière/.test(c.etat),
     'et il nomme la cause probable plutôt que de laisser croire à un problème de matière');
  await ctx.close();
}

console.log('\n== 5) La tendance compare aux 21 jours précédents ==');
{
  /* 1 pendant la première quinzaine, 3 ensuite : la fenêtre récente doit être en hausse. */
  const vieux = notes('2026-10-26', 30, i => (i < 12 ? 3 : 1));
  const { ctx, page, fr } = await ouvrir({'batcave-cours-suivi': vieux}, '2026-10-26T21:00:00+02:00');
  await etudes(fr, page);
  await fr.evaluate(() => { const t = document.getElementById('portes-toggle'); if(t) t.click(); });
  await page.waitForTimeout(300);
  const c = await carte(fr);
  ok(/▲/.test(c.etat), 'la flèche dit la hausse : ' + (c.etat.match(/.{0,14}[▲▼].{0,12}/) || [''])[0]);
  await ctx.close();
}

console.log('\n== 6) Quelle que soit la note, la grille ne bouge pas ==');
{
  /* C'est le point de la suppression des portes : la mesure informe, elle ne décide plus. */
  const fin = '2026-10-16';
  const bloc = async (notesArg) => {
    const { ctx, fr } = await ouvrir({'batcave-cours-suivi': notesArg}, '2026-10-16T21:00:00+02:00');
    const g = await fr.evaluate(() => window.__bcGrille('tuesday', '2026-10-13').map(x => x.join(' ')));
    const portes = await fr.evaluate(() => (window.__bcPortes('2026-10-13') || {}).portes || []);
    await ctx.close();
    return { g, portes };
  };
  const bas = await bloc(notes(fin, 14, 0));
  const haut = await bloc(notes(fin, 14, 3));
  ok(bas.portes.length === 0 && haut.portes.length === 0, 'il n\'y a plus aucune porte (' + haut.portes.length + ')');
  ok(bas.g.join('|') === haut.g.join('|'), 'le mardi 13 octobre est identique avec 0/3 et avec 3/3');
  ok(haut.g.some(x => /20:30 Español · serie en VO/.test(x)),
     'et le bloc que la porte 1 rendait reste de l\'espagnol : ' + (haut.g.filter(x => /20:30/.test(x))[0] || '—'));
  await b.close();
  console.log(err ? '\n' + err + ' ECHEC(S)' : '\nTOUT VERT');
  process.exit(err ? 1 : 0);
}
