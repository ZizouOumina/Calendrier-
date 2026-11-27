/* Sonde des repas : les macros du jour et de chaque repas, les grammes de viande, la liste de courses et le
   budget nourriture, lus dans la Batcave à une date donnée.
   DONNEES=<json> [PORT=8199] node _sonde-repas.mjs [iso datetime] */
import { chromium } from 'playwright';
import fs from 'fs';
const seed = JSON.parse(fs.readFileSync(process.env.DONNEES, 'utf8'));
const quand = process.argv[2] || '2026-11-27T20:00:00+01:00', port = process.env.PORT || '8199';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  PAGEERROR ' + e.message));
await p.clock.install({time:new Date(quand)});
await p.goto('http://127.0.0.1:' + port + '/host.html', {timeout:20000}).catch(()=>{});
await p.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:15000});
const fr = p.frames().find(x => x.url().includes('batcave.html'));
await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
const r = await fr.evaluate(() => {
  const out = {jours: {}};
  const noms = ['Petit-déjeuner', 'Collation combat', 'Récup combat', 'Déjeuner', 'Collation entraînement', 'Dîner'];
  ['2026-11-20','2026-11-27','2026-11-28','2026-11-29','2026-11-30','2026-12-01','2026-12-02','2026-12-06','2026-12-14','2026-12-16','2027-03-01'].forEach(iso => {
    const j = {macros: window.__bcMacrosJour(iso), repas: {}};
    noms.forEach(n => {
      const c = window.__bcCompoRepas(n, iso, false);
      if(!c.length) return;
      let actif = true;
      try{ const m = window.__bcMacrosRepas({name:n}, iso); j.repas[n] = {m, c: c.map(x => x.c + ' ' + x.q).join(', ')}; }catch(e){ j.repas[n] = {err: String(e)}; }
    });
    out.jours[iso] = j;
  });
  out.besoin = window.__bcBesoinSemaine;
  const cs = window.__bcCoutSemaine(), am = window.__bcCoutAchats();
  out.cout = {semaine: cs.total, mois: cs.mois, achatsSemaine: am.total, achatsMois: am.mois, ordinaire: am.ordinaire, manque: cs.manque};
  out.viande = [];
  window.__bcPlanCourses().forEach(c => c.items.forEach(it => { if(/Poulet|Viande|ufs/.test(it.label)) out.viande.push(c.cat + ' · ' + it.label + ' — ' + it.qte + ' · ' + it.note); }));
  try{ out.prep = window.__bcPrepTotaux ? JSON.parse(JSON.stringify(window.__bcPrepTotaux())) : null; }catch(e){ out.prep = String(e); }
  return out;
});
for(const iso of Object.keys(r.jours)){
  const j = r.jours[iso];
  console.log('\n' + iso + '  JOUR ' + JSON.stringify(j.macros));
  for(const n of Object.keys(j.repas)) console.log('   ' + n.padEnd(24) + JSON.stringify(j.repas[n].m || j.repas[n].err) + '   ' + (j.repas[n].c || ''));
}
console.log('\nBESOIN ' + JSON.stringify(r.besoin));
console.log('COUT ' + JSON.stringify(r.cout));
console.log('LISTE\n  ' + r.viande.join('\n  '));
console.log('PREP ' + JSON.stringify(r.prep));
await b.close();
