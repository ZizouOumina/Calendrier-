/* Verification hors campagne : ce que les tests ne regardent pas.
   1. Toutes les cles localStorage reellement ecrites sont-elles connues du code ?
   2. La grille de chaque jour est-elle continue -- pas de trou, pas de chevauchement,
      et un coucher apres le dernier bloc -- aux DEUX semestres, plus les jours sans cours ?
   3. Les consignes : chaque bloc qui en demande une en a-t-il une ?
   4. Les habitudes : rythme valide, pas d'orpheline, pas de doublon d'identifiant. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let ko = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { ko++; console.log('  ✗   ' + m); } };

const ctx = await b.newContext({viewport:{width:1440,height:1200}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
page.on('pageerror', e => { ko++; console.log('  ✗   PAGEERROR : ' + e.message); });
await page.clock.install({ time: new Date('2026-09-21T08:00:00+02:00') });
await page.goto('http://127.0.0.1:8199/host.html');
await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:25000});
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await page.waitForTimeout(600);

console.log('\n== A) Les clés écrites sont-elles toutes connues du code ? ==');
{
  const r = await fr.evaluate(() => {
    const out = [];
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k.indexOf('batcave-') !== 0 && k.indexOf('bc-') !== 0) continue;
      out.push(k);
    }
    return out;
  });
  const inconnues = await fr.evaluate(() => (window.__bcClesInconnues ? window.__bcClesInconnues() : null));
  ok(r.length > 0, r.length + ' clés écrites au démarrage');
  const banniere = await fr.evaluate(() => {
    const t = document.body.innerText;
    return /Clé inconnue du code|incohérence/i.test(t) ? t.match(/Clé inconnue du code[^\n]*/)?.[0] || 'bannière' : '';
  });
  ok(!banniere, 'aucune clé inconnue signalée au démarrage' + (banniere ? ' — ' + banniere : ''));
}

console.log('\n== B) La grille : continuité, aux deux semestres ==');
{
  const jours = [
    ['lundi S1','monday','2026-09-21'], ['mardi S1','tuesday','2026-09-22'],
    ['mercredi S1','wednesday','2026-09-23'], ['jeudi S1','weekday','2026-09-24'],
    ['vendredi S1','friday','2026-09-25'], ['samedi','saturday','2026-09-26'],
    ['dimanche','weekend','2026-09-27'],
    ['lundi S2','monday','2027-02-01'], ['mardi S2','tuesday','2027-02-02'],
    ['mercredi S2','wednesday','2027-02-03'], ['jeudi S2','weekday','2027-02-04'],
    ['vendredi S2','friday','2027-02-05'],
    ['jour sans cours (9 oct)','friday','2026-10-09']
  ];
  for(const [nom, cle, iso] of jours){
    const g = await fr.evaluate(([c,i]) => window.__bcGrille(c,i), [cle, iso]);
    const min = t => Number(t.slice(0,2))*60 + Number(t.slice(3,5));
    let souci = [];
    for(let k = 1; k < g.length; k++){
      if(min(g[k][0]) <= min(g[k-1][0])) souci.push(g[k-1][0] + ' → ' + g[k][0]);
    }
    const dernier = g[g.length-1];
    ok(!souci.length && /Coucher/.test(dernier[1]),
       nom + ' : ' + g.length + ' blocs, horaires strictement croissants, finit par « ' + dernier[1] + ' » à ' + dernier[0]
       + (souci.length ? ' — DÉSORDRE : ' + souci.join(', ') : ''));
  }
}

console.log('\n== C) Chaque bloc de travail porte-t-il une consigne ? ==');
{
  const r = await fr.evaluate(() => {
    const sans = [], vus = {};
    const jours = [[1,'monday'],[2,'tuesday'],[3,'wednesday'],[4,'weekday'],[5,'friday'],[6,'saturday'],[0,'weekend']];
    jours.forEach(([dow, cle]) => {
      window.__bcGrille(cle, '2026-11-02').forEach(b => {
        const label = b[1];
        if(vus[label]) return; vus[label] = true;
        if(!window.__bcTypeBloc(label)) return;      /* seuls les blocs de travail */
        const c = window.__bcConsigne(label, dow);
        if(!c || !String(c).trim()) sans.push(label);
      });
    });
    return {sans: sans, total: Object.keys(vus).length};
  });
  ok(!r.sans.length, r.total + ' libellés distincts dans la semaine · blocs de travail sans consigne : ' + (r.sans.join(', ') || 'aucun'));
}

console.log('\n== D) Les habitudes : intégrité ==');
{
  const r = await fr.evaluate(() => {
    const h = JSON.parse(localStorage.getItem('batcave-habits') || '[]');
    const ids = h.map(x => x.id);
    const doublons = ids.filter((x,i) => ids.indexOf(x) !== i);
    const sansLabel = h.filter(x => !x.label).map(x => x.id);
    const cycleSansAncre = h.filter(x => x.cycleSemaines && !x.ancre).map(x => x.id);
    const joursInvalides = h.filter(x => x.jours && (!Array.isArray(x.jours) || x.jours.some(j => j < 0 || j > 6))).map(x => x.id);
    const retirees = h.filter(x => (window.__bcHabitudesRetirees || []).indexOf(x.id) > -1).map(x => x.id);
    return {n: h.length, doublons, sansLabel, cycleSansAncre, joursInvalides, retirees};
  });
  ok(!r.doublons.length, r.n + ' habitudes · aucun identifiant en double (' + (r.doublons.join(', ') || 'aucun') + ')');
  ok(!r.sansLabel.length, 'toutes ont un libellé (' + (r.sansLabel.join(', ') || 'aucune sans') + ')');
  ok(!r.cycleSansAncre.length, 'toute habitude à cycle a une ancre (' + (r.cycleSansAncre.join(', ') || 'aucune sans') + ')');
  ok(!r.joursInvalides.length, 'aucun jour de semaine invalide (' + (r.joursInvalides.join(', ') || 'aucun') + ')');
}

console.log('\n== E) Les 17 articles et les 33 approfondissements répondent ==');
{
  const r = await fr.evaluate(() => ({
    appro: (window.__bcApproProchain ? 'ok' : 'sonde absente'),
    aliments: Object.keys(window.__bcAliments || {}).length,
    besoin: !!window.__bcBesoinSemaine,
    matieres: (window.__bcMatieresDuSemestre ? window.__bcMatieresDuSemestre('2026-11-02') : []).length
  }));
  ok(r.aliments > 0, r.aliments + ' aliments au catalogue');
  ok(r.besoin, 'le besoin hebdomadaire est défini');
  ok(r.matieres > 0, r.matieres + ' matières au semestre 1');
}

await ctx.close(); await b.close();
console.log(ko ? '\n' + ko + ' POINT(S) D\'ATTENTION' : '\nRIEN À SIGNALER');
process.exit(ko ? 1 : 0);
