/* ===== 312-315) La cloture d'une periode d'objectifs =====

   Une periode finie ne disait rien. La barre s'arretait d'avancer, le verdict se figeait
   tout seul, et personne ne lui annoncait que le mois etait joue. La cloture repare ca :
   au premier demarrage APRES le dernier jour d'une periode, elle releve chaque objectif,
   fige le chiffre atteint et son verdict, et pose une carte a voir une fois.

   Ce que ce test protege :
     - avant la fin, RIEN n'est clos (une periode en cours n'a pas de verdict) ;
     - apres la fin, la periode est close exactement une fois, avec ses lignes ;
     - une periode entierement anterieure au programme n'est jamais close ;
     - la carte se montre une fois, « J'ai vu » l'eteint, et l'archive reste. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(quand, seed){
  const ctx = await browser.newContext({viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:25000});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}


console.log('\n== 312) Une période en cours n\'est jamais close ==');
{
  const { ctx, fr } = await ouvrir('2026-09-19T10:00:00+02:00');
  const v = await fr.evaluate(() => ({
    n: window.__bcPeriodesCloses().length,
    carte: !document.getElementById('periode-close-carte').hidden
  }));
  ok(v.n === 0, 'le 19 septembre, aucune période close (' + v.n + ')');
  ok(v.carte === false, 'et aucune carte de clôture sur le tableau de bord');
  await ctx.close();
}

console.log('\n== 313) Le 1er octobre, septembre est clos une fois, avec ses lignes ==');
{
  const { ctx, fr } = await ouvrir('2026-10-01T09:00:00+02:00');
  const v = await fr.evaluate(() => {
    const p = window.__bcPeriodesCloses();
    return {
      ids: p.map(x => x.id),
      sept: p.filter(x => x.id === 'M2026-09')[0] || null,
      carte: !document.getElementById('periode-close-carte').hidden,
      titre: (document.getElementById('pcc-titre') || {}).textContent || ''
    };
  });
  ok(v.sept !== null, 'septembre est clos (' + v.ids.join(', ') + ')');
  ok(v.ids.filter(x => x === 'M2026-09').length === 1, 'et une seule fois');
  ok(v.sept && v.sept.lignes.length > 0, 'la clôture porte les lignes des objectifs : ' + (v.sept ? v.sept.lignes.length : 0));
  ok(v.sept && v.sept.lignes.every(l => typeof l.cible === 'number' && typeof l.statut === 'string'),
     'chaque ligne a sa cible et son verdict');
  ok(v.sept && v.sept.total === v.sept.lignes.length && v.sept.tenus <= v.sept.total,
     'le score tient : ' + (v.sept ? v.sept.tenus + ' / ' + v.sept.total : '—'));
  ok(v.carte === true && /Septembre/.test(v.titre), 'la carte l\'annonce : « ' + v.titre + ' »');
  /* aucune periode anterieure au programme ne doit etre close */
  ok(v.ids.indexOf('M2026-08') === -1 && v.ids.indexOf('M2026-07') === -1,
     'aucun mois antérieur au programme n\'est clos');
  await ctx.close();
}

console.log('\n== 314) Rejouer le même jour ne crée pas de doublon ==');
{
  const { ctx, fr } = await ouvrir('2026-10-01T09:00:00+02:00');
  const v = await fr.evaluate(() => {
    const avant = window.__bcPeriodesCloses().length;
    window.__bcCloturerPeriodes(); window.__bcCloturerPeriodes(); window.__bcCloturerPeriodes();
    return { avant: avant, apres: window.__bcPeriodesCloses().length };
  });
  ok(v.avant === v.apres, 'trois appels de plus ne changent rien (' + v.avant + ' → ' + v.apres + ')');
  await ctx.close();
}

console.log('\n== 315) « J\'ai vu » éteint la carte, l\'archive reste ==');
{
  const { ctx, page, fr } = await ouvrir('2026-10-01T09:00:00+02:00');
  await fr.evaluate(() => document.getElementById('pcc-vu').click());
  await page.waitForTimeout(250);
  const v = await fr.evaluate(() => ({
    carte: !document.getElementById('periode-close-carte').hidden,
    vu: (window.__bcPeriodesCloses()[0] || {}).vu,
    n: window.__bcPeriodesCloses().length
  }));
  ok(v.carte === false, 'la carte disparaît');
  ok(v.vu === true, 'la période est marquée vue');
  ok(v.n > 0, 'et elle reste dans l\'archive (' + v.n + ')');
  await ctx.close();
}

console.log('\n== 315 bis) Seul le mois se clôt : le trimestre n\'existe plus ==');
{
  /* Ce test verifiait la cloture du trimestre T1. Le 19 septembre, il a ramene les
     objectifs a UN SEUL palier -- le mois -- et periodesObjectifs() ne propose donc plus
     que des mois a clore. Un « T1 » clos serait desormais un bug, pas un succes. */
  const a = await ouvrir('2026-11-30T20:00:00+01:00');
  const av = await a.fr.evaluate(() => window.__bcPeriodesCloses().map(p => p.id));
  ok(av.indexOf('M2026-11') === -1, 'le 30 novembre, novembre n\'est pas encore clos');
  ok(av.indexOf('M2026-10') > -1, 'mais octobre, lui, l\'est (' + av.join(', ') + ')');
  await a.ctx.close();
  const b2 = await ouvrir('2026-12-01T09:00:00+01:00');
  const ap = await b2.fr.evaluate(() => window.__bcPeriodesCloses());
  const ids = ap.map(p => p.id);
  ok(ids.indexOf('M2026-11') > -1, 'le 1er décembre, novembre est clos (' + ids.join(', ') + ')');
  ok(!ids.some(i => /^T\d/.test(i)), 'et aucun trimestre n\'a été clos : il n\'y en a plus');
  ok(ap.every(p => p.type === 'mois'), 'toute période close est un mois');
  await b2.ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
