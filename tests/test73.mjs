/* Lot 24 — les heures du jour et de la semaine sont tirées de la grille, donc elles suivent
   la phase Español ; et l'espagnol a sa propre cellule, son propre panneau et sa propre
   ligne de bilan au lieu de se cacher dans « Projets perso ». */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-focus').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
  await page.waitForTimeout(350);
  return { ctx, page, fr };
}
const cellules = fr => fr.evaluate(() => [...document.querySelectorAll('#dash-temps .temps-cell')].map(c => c.innerText.replace(/\s+/g, ' ').trim()));
const SESSIONS = [
  {id:'e1', date:'2026-09-15', type:'projet', label:'Español · preparar la clase', duree:50, debut:Date.parse('2026-09-15T14:00:00+02:00'), fin:Date.parse('2026-09-15T14:50:00+02:00')},
  {id:'p1', date:'2026-09-15', type:'projet', label:'Boutique Shopify',            duree:60, debut:Date.parse('2026-09-15T09:00:00+02:00'), fin:Date.parse('2026-09-15T10:00:00+02:00')},
  {id:'c1', date:'2026-09-15', type:'cours',  label:'Anatomía I',                  duree:120, debut:Date.parse('2026-09-15T07:20:00+02:00'), fin:Date.parse('2026-09-15T09:20:00+02:00')}
];

console.log('\n== 300) Trois compteurs, et les mêmes minutes ne remplissent qu\'une case ==');
{
  const { ctx, fr } = await ouvrir('2026-09-15T18:00:00+02:00', {'batcave-sessions': SESSIONS});
  const c = await cellules(fr);
  ok(c.length === 3, 'trois cellules : révision, projets perso, espagnol');
  ok(/Révision 2,0h/.test(c[0]), 'révision : 2,0 h (' + c[0] + ')');
  ok(/Projets perso 1,0h/.test(c[1]), 'projets perso : 1,0 h, l\'espagnol en est sorti (' + c[1] + ')');
  ok(/Español 0,8h/.test(c[2]), 'espagnol : 0,8 h (' + c[2] + ')');
  await ctx.close();
}

console.log('\n== 301) Les cibles du jour et de la semaine viennent de la grille et suivent la phase ==');
{
  /* phase 1 : les trois blocs « Projets perso » deviennent de l'espagnol */
  const p1 = await ouvrir('2026-09-15T18:00:00+02:00');
  const c1 = await cellules(p1.fr);
  const sem1 = await p1.fr.evaluate(() => document.getElementById('dash-semaine').innerText.replace(/\s+/g, ' '));
  ok(/\/ 2,7h/.test(c1[2]), 'phase 1 : la cellule Español porte une cible du jour (' + c1[2] + ')');
  ok(/d'espagnol sur 18/.test(sem1), 'phase 1 : 18 h d\'espagnol prévues dans la semaine (' + sem1.slice(0, 110) + ')');
  ok(!/de projets sur 0/.test(sem1), 'phase 1 : la ligne « projets » se tait au lieu d\'afficher « sur 0 »');
  await p1.ctx.close();
  /* phase 3 : un seul bloc Español par jour, les projets reviennent */
  const p3 = await ouvrir('2026-12-08T18:00:00+02:00');
  const sem3 = await p3.fr.evaluate(() => document.getElementById('dash-semaine').innerText.replace(/\s+/g, ' '));
  const c3 = await cellules(p3.fr);
  ok(/de projets sur 12,5/.test(sem3), 'phase 3 : les projets perso reviennent à 12,5 h (' + sem3.slice(0, 130) + ')');
  ok(/d'espagnol sur 6,4/.test(sem3), 'phase 3 : l\'espagnol descend à 6,4 h');
  ok(/\/ 0,9h/.test(c3[2]), 'phase 3 : la cible du jour tombe à 0,9 h (' + c3[2] + ')');
  await p3.ctx.close();
  /* hors phase : plus de bloc Español, la cellule reste mais sans cible */
  const t = await ouvrir('2027-03-16T18:00:00+02:00');
  const ct = await cellules(t.fr);
  const semt = await t.fr.evaluate(() => document.getElementById('dash-semaine').innerText.replace(/\s+/g, ' '));
  ok(ct.length === 3 && !/\/ /.test(ct[2]), 'grille type : la cellule Español reste, sans cible (' + ct[2] + ')');
  ok(!/espagnol/.test(semt), 'grille type : la ligne de la semaine ne parle plus d\'espagnol');
  ok(/de projets sur 18,9/.test(semt), 'grille type : 18,9 h de projets prévues (' + semt.slice(0, 100) + ')');
  await t.ctx.close();
}

console.log('\n== 302) La fidélité au plan compte l\'espagnol comme du travail prévu ==');
{
  const { ctx, fr } = await ouvrir('2026-09-15T18:00:00+02:00', {'batcave-sessions': SESSIONS});
  const f = await fr.evaluate(() => {
    const s = window.__bcSemaine(0);
    const j = s.parJour.find(x => x.iso === '2026-09-15');
    return { prevu: j.prevu, rev: j.rev, proj: j.proj, fidelite: s.stats.fidelite, esH: s.stats.esH, projHorsEs: s.stats.projHorsEs, projH: s.stats.projH };
  });
  ok(f.prevu > 400, 'le prévu du mardi inclut les blocs Español (' + f.prevu + ' min)');
  ok(Math.abs(f.esH - 50/60) < 0.01, 'esH vaut les 50 minutes d\'espagnol (' + f.esH.toFixed(2) + ' h)');
  ok(Math.abs(f.projHorsEs - 1) < 0.01, 'projHorsEs vaut la seule heure de Shopify (' + f.projHorsEs.toFixed(2) + ' h)');
  ok(Math.abs(f.projH - (f.projHorsEs + f.esH)) < 0.01, 'projH reste le total, espagnol compris');
  ok(f.fidelite > 0 && f.fidelite <= 100, 'la fidélité reste bornée (' + f.fidelite + ' %)');
  await ctx.close();
}

console.log('\n== 303) L\'espagnol a son panneau dans Études ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-15T18:00:00+02:00', {'batcave-sessions': SESSIONS.concat([
    {id:'e2', date:'2026-09-14', type:'projet', label:'Español · gramática', duree:60, debut:Date.parse('2026-09-14T11:20:00+02:00'), fin:Date.parse('2026-09-14T12:20:00+02:00')}
  ])});
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(250);
  const p = await fr.evaluate(() => ({
    stats: document.getElementById('es-stats').innerText.replace(/\s+/g, ' '),
    note: document.getElementById('es-note').textContent,
    taches: document.getElementById('es-taches-7').innerText.replace(/\s+/g, ' '),
    projets: document.getElementById('proj-stats').innerText.replace(/\s+/g, ' ')
  }));
  ok(/Aujourd'hui 0,8h/.test(p.stats), 'aujourd\'hui : 0,8 h (' + p.stats.slice(0, 60) + ')');
  ok(/7 derniers jours 1,8h/.test(p.stats), 'sept jours : 1,8 h');
  ok(/Blocs prévus 18,0h/.test(p.stats), 'la cible de la semaine vient de la grille : 18 h');
  ok(/phase en cours/.test(p.note), 'le panneau dit qu\'une phase est en cours');
  ok(/gramática/.test(p.taches) && /preparar la clase/.test(p.taches), 'la répartition par tâche est là (' + p.taches.slice(0, 70) + ')');
  ok(/Aujourd'hui\s*1,0h/.test(p.projets), 'le panneau Projets perso ne compte plus l\'espagnol (' + p.projets.slice(0, 50) + ')');
  await ctx.close();
}

console.log('\n== 304) L\'espagnol a sa ligne dans le bilan de la semaine ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-15T18:00:00+02:00', {'batcave-sessions': SESSIONS});
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="bilan"]').click());
  await page.waitForTimeout(250);
  const cartes = await fr.evaluate(() => [...document.querySelectorAll('#bilan-grid .bilan-card')].map(c => c.innerText.replace(/\s+/g, ' ')));
  const es = cartes.find(c => /Espagnol/.test(c)) || '';
  const proj = cartes.find(c => /Projets perso/.test(c)) || '';
  ok(cartes.length === 10, 'dix mesures dans le bilan (' + cartes.length + ')');
  ok(/0,8h/.test(es), 'la ligne Espagnol montre 0,8 h (' + es.slice(0, 40) + ')');
  ok(/1,0h/.test(proj), 'la ligne Projets perso montre 1,0 h, sans l\'espagnol (' + proj.slice(0, 40) + ')');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
