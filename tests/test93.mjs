/* Les ponderations relevees dans les onze guias docentes 2026-27.
   Ce fichier existe pour une seule raison : une ponderation fausse ici enverrait
   travailler au mauvais endroit pendant six mois, et rien dans l'application ne
   le signalerait. Il verrouille donc les chiffres, pas seulement l'affichage. */
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
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="etudes"]').click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}

console.log('\n== 320) Chaque matière totalise exactement 100 % ==');
{
  const { ctx, fr } = await jour('2026-09-14T09:00:00+02:00');
  const d = await fr.evaluate(() => window.__bcEvalMatieres.map(m => ({
    court: m.court, sem: m.sem, ects: m.ects, total: m.eval.reduce((a, e) => a + e[1], 0)
  })));
  ok(d.length === 11, '11 matières relevées (' + d.length + ')');
  const faux = d.filter(x => x.total !== 100);
  ok(faux.length === 0, 'aucune pondération fausse' + (faux.length ? ' — ' + faux.map(x => x.court + ':' + x.total).join(', ') : ''));
  const s1 = d.filter(x => x.sem === 1), s2 = d.filter(x => x.sem === 2);
  ok(s1.length === 6 && s1.reduce((a, x) => a + x.ects, 0) === 30, 'S1 : 6 matières, 30 ECTS');
  ok(s2.length === 5 && s2.reduce((a, x) => a + x.ects, 0) === 30, 'S2 : 5 matières, 30 ECTS');
  /* Les noms doivent exister dans la liste des matieres de l'application, sinon le
     panneau parle d'une matiere que les examens et le minuteur ne connaissent pas. */
  const inconnues = await fr.evaluate(() => {
    const noms = window.__bcEvalMatieres.map(m => m.court);
    const connues = [...document.querySelectorAll('#examens-liste .ecell b')].map(x => x.textContent);
    return noms.filter(n => connues.indexOf(n) < 0);
  });
  ok(inconnues.length === 0, 'chaque matière du panneau existe dans les échéances d\'examens' + (inconnues.length ? ' — manque ' + inconnues.join(', ') : ''));
  await ctx.close();
}

console.log('\n== 321) Le semestre en cours est déplié, l\'autre est plié ==');
{
  const { ctx, fr } = await jour('2026-09-14T09:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('matieres-eval-corps').innerText);
  ok(/Semestre 1 — en cours/.test(t), 'le 14 septembre : « Semestre 1 — en cours »');
  const plie = await fr.evaluate(() => { const c = document.getElementById('eval-autre-corps'); return c ? c.hidden : null; });
  ok(plie === true, 'le semestre 2 est replié');
  ok(/Anatomía I/.test(t) && /Idioma moderno/.test(t), 'les matières du S1 sont visibles');
  const ouvre = await fr.evaluate(() => { const b = document.getElementById('eval-s-autre'); if(!b) return null; b.click(); return document.getElementById('eval-autre-corps').hidden; });
  ok(ouvre === false, 'le bouton déplie le semestre 2');
  await ctx.close();
}

console.log('\n== 322) Au semestre 2, c\'est l\'inverse ==');
{
  const { ctx, fr } = await jour('2027-02-15T09:00:00+02:00');
  const t = await fr.evaluate(() => document.getElementById('matieres-eval-corps').innerText);
  ok(/Semestre 2 — en cours/.test(t), 'le 15 février : « Semestre 2 — en cours »');
  ok(/Bioquímica/.test(t) && /Psicología/.test(t), 'les matières du S2 sont visibles');
  await ctx.close();
}

console.log('\n== 323) Les trois avertissements qui décident d\'une année ==');
{
  const { ctx, fr } = await jour('2026-09-14T09:00:00+02:00');
  const t = await fr.evaluate(() => { const b = document.getElementById('eval-s-autre'); if(b) b.click();
                                      return document.getElementById('matieres-eval-corps').innerText; });
  ok(/70 % de présence minimum/.test(t) && /ils ne sont pas corrigés/.test(t), 'Idioma : 70 % de présence, sinon NP');
  ok(/5\/10 à l.\u2019?écrit ET 5\/10 à l.?\u2019?oral/.test(t.replace(/\u2019/g, "'")) || /5\/10 à l'écrit ET 5\/10 à l'oral/.test(t.replace(/\u2019/g, "'")), 'Idioma : les deux seuils séparés');
  ok(/45 % se jouent sur le cuaderno/.test(t), 'Clínica : 45 % sur les TP, pas sur l\'examen');
  ok(/CHAQUE système d'évaluation, séparément/.test(t.replace(/\u2019/g, "'")), 'Psicología : pas de compensation entre systèmes');
  ok(/ISBN 9780521755900/.test(t), 'le livre obligatoire d\'Idioma est nommé');
  ok(/7 janvier/.test(t) && /2ᵉ semaine de décembre/.test(t), 'les dates connues d\'Idioma sont là');
  const g = await fr.evaluate(() => document.getElementById('matieres-eval-panel').innerText);
  ok(/90 %/.test(g) && /Campus Virtual/.test(g), 'le règlement de l\'université et le renvoi au Campus Virtual sont écrits');
  await ctx.close();
}

console.log('\n== 324) La part hors examen est calculée, pas devinée ==');
{
  const { ctx, fr } = await jour('2026-09-14T09:00:00+02:00');
  const note = await fr.evaluate(() => document.getElementById('matieres-eval-note').textContent);
  /* S1 : Anatomía I 30x6 + Biología 50x6 + Epidemiología 50x6 + Idioma 50x6
     + Antropología 50x3 + Documentación 50x3 = 1380, / 30 ECTS = 46 %.
     L'examen ORAL d'Idioma compte comme un examen : c'est un « Knowledge Test »
     dans la guia, pas du controle continu. Ce test a attrape la confusion. */
  ok(/46 % de ta note/.test(note), 'S1 : 46 % hors examen (' + note + ')');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
