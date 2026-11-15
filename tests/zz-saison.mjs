/* La saison simulée, jour par jour (15 novembre, tard le soir, sa demande : « vérifie bien qu'il n'y a aucune
   contradiction, et simule sur plusieurs semaines que tout fonctionne bien, que tu n'as rien oublié, exemple aller
   à la laverie »).
   Ouvre la Batcave avec SES données (DONNEES=<sauvegarde.json>), puis lit, pour chaque jour du 16 novembre au
   6 juin : la grille, les cases du jour, les consignes du ménage, de la laverie, du rangement et des courses, et
   les rappels qui partiraient dans l'agenda. Écrit tout dans <sortie.json> ; l'analyse est zz-saison.py.
   node zz-saison.mjs <sortie.json> [début] [fin] */
import { chromium } from 'playwright';
import fs from 'fs';
const [sortie, debut = '2026-11-16', fin = '2027-06-06'] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'Europe/Madrid', locale: 'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
if (process.env.DONNEES) {
  const s = JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8'));
  await ctx.addInitScript((x) => { try { if (!sessionStorage.getItem('__seme')) { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); sessionStorage.setItem('__seme', '1'); } } catch (e) {} }, s);
}
const page = await ctx.newPage();
const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
await page.clock.install({ time: new Date('2026-11-15T21:00:00+01:00') });
await page.goto(process.env.BC_HOST || 'http://127.0.0.1:8199/host.html', { timeout: 20000 }).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 20000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
const jours = await fr.evaluate(([debut, fin]) => {
  const out = [], hh = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const c = (l, dow, iso, h) => { try { return window.__bcConsigne(l, dow, iso, h) || ''; } catch (e) { return 'ERREUR ' + e.message; } };
  for (let d = new Date(debut + 'T12:00:00'); d <= new Date(fin + 'T12:00:00'); d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10), dow = d.getDay();
    let g = [], hab = [], rap = [];
    try { g = window.__bcGrille(window.__bcCle(dow), iso); } catch (e) { g = [['00:00', 'ERREUR ' + e.message]]; }
    try { hab = window.__bcHabitsDuJour(dow, iso).map(h => ({ id: h.id, label: h.label })); } catch (e) {}
    try { rap = window.__bcRappels(iso).map(r => ({ h: hh(r.debut), titre: r.titre })); } catch (e) { rap = [{ h: '00:00', titre: 'ERREUR ' + e.message }]; }
    const lab = g.map(x => x[1]), at = l => (g.find(x => x[1] === l) || [])[0];
    out.push({ iso, dow, grille: g.map(x => x[0] + ' ' + x[1]), hab, rap,
      menage: lab.some(l => /Ménage/.test(l)) ? c(lab.find(l => /Ménage/.test(l)), dow, iso, '16:30') : null,
      batch: lab.includes('🍲 Batch cooking de la semaine') ? c('🍲 Batch cooking de la semaine', dow, iso, at('🍲 Batch cooking de la semaine')) : null,
      rangement: lab.includes('Rangement des courses') ? c('Rangement des courses', dow, iso, at('Rangement des courses')) : null,
      courses: lab.includes('🛒 Courses de la semaine') ? c('🛒 Courses de la semaine', dow, iso, at('🛒 Courses de la semaine')) : null,
      libre: lab.includes('Temps libre') ? c('Temps libre', dow, iso, at('Temps libre')) : null });
  }
  return out;
}, [debut, fin]);
fs.writeFileSync(sortie, JSON.stringify({ erreurs, jours }));
console.log(jours.length + ' jours lus, ' + erreurs.length + ' erreurs de page');
await b.close();
