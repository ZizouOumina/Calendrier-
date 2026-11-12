/* Les jours de la Batcave pour les pages « semaine » : grille, consigne de chaque bloc, cases du jour
   (cycles compris : photos, ongles, coupe, brosse a dents), repas en grammes, cible du jour, periode.
   node zz-semaine.mjs <sortie> [premier jour AAAA-MM-JJ, defaut 2026-11-16] [n jours, defaut 7] [horloge] */
import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2];
const debut = process.argv[3] || '2026-11-16';
const n = Number(process.argv[4] || 7);
const horloge = process.argv[5] || (debut === '2026-11-16' ? '2026-11-15T12:00:00+01:00' : null);
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1200, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
/* par defaut, l'horloge est la veille du premier jour, a midi : la Batcave telle qu'il l'ouvre avant la semaine */
const veille = new Date(debut + 'T12:00:00+01:00'); veille.setDate(veille.getDate() - 1);
await page.clock.install({time: horloge ? new Date(horloge) : veille});
await page.goto('http://127.0.0.1:8199/host.html', {timeout:20000}).catch(()=>{});
await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:20000});
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const res = await fr.evaluate(([debut, n]) => {
  const habits = JSON.parse(localStorage.getItem('batcave-habits') || '[]');
  const r = [];
  const [y, m, d0] = debut.split('-').map(Number);
  for (let i = 0; i < n; i++) {
    const d = new Date(y, m - 1, d0 + i), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const dow = d.getDay(), cle = window.__bcCle(dow), g = window.__bcGrille(cle, iso);
    const blocs = g.map(x => ({h: x[0], l: x[1], c: window.__bcConsigne(x[1], dow, iso, x[0]) || ''}));
    const hab = habits.filter(h => {
      const js = window.__bcHabitJours(h);
      if (js !== null && js !== undefined && js.indexOf(dow) === -1) return false;
      return true;
    }).map(h => ({id: h.id, label: h.label, icon: h.icon, cycle: h.cycleSemaines || (h.quinzaine ? 2 : 0), ancre: h.ancre || null, quinzaine: !!h.quinzaine}));
    /* les cases que le tableau de bord montre ce jour-la, cycles compris */
    const duJour = window.__bcHabitsDuJour ? window.__bcHabitsDuJour(dow, iso).map(h => ({id: h.id, label: h.label, icon: h.icon})) : null;
    const repas = {};
    ['Petit-déjeuner', 'Collation combat', 'Récup combat', 'Déjeuner', 'Collation entraînement', 'Dîner'].forEach(nm => { repas[nm] = window.__bcCompoRepas(nm, iso, false); });
    const per = window.__bcPeriode ? (window.__bcPeriode(iso) || null) : null;
    r.push({iso, dow, cle, blocs, habits: hab, duJour, repas, cible: window.__bcCibleJour(cle, iso),
            periode: per ? per.id : null, espagnol: !!(window.__bcPhaseEspanol && window.__bcPhaseEspanol(iso))});
  }
  return r;
}, [debut, n]);
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log('jours', res.length, 'erreurs', JSON.stringify(errs));
await b.close();
