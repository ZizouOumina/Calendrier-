/* 31 octobre — le tour de taille. La balance ne distingue pas un kilo de muscle d'un kilo de
   gras ; le tour de taille, si. Ce qui doit tenir :
     1. une taille qui prend plus d'un centimetre par mois fait proposer -100 kcal, meme quand
        la balance est dans la cible ;
     2. une taille stable laisse la balance decider, et le rapport epaules / taille s'affiche ;
     3. la cloture du soir offre le tour de taille le dimanche (et le tour d'epaules le dimanche
        des photos), pas en semaine, et l'enregistre dans le journal. */
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
const dimanches = (premier, n) => { const out = []; const d = new Date(premier + 'T12:00:00'); for(let i = 0; i < n; i++){ out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 7); } return out; };
/* sept dimanches apres les trois semaines de stabilisation ; le poids suit le rythme vise */
/* 15 novembre : le jour 1 au lundi 16, la stabilisation finit le dimanche 6 decembre (PROGRAMME_DEBUT + 21) ; les
   memes sept dimanches, une semaine plus tard, lus le 3 janvier.
   23 novembre : le jour 1 au mardi 24, la stabilisation finit le mardi 15 decembre -- les sept dimanches partent du 29 novembre
   (le premier dimanche du jour 1), lus le 10 janvier : quatre pesees apres la stabilisation (20 et 27 decembre, 3 et 10 janvier). */
const D = dimanches('2026-11-29', 7);
const journal = f => Object.fromEntries(D.map((iso, i) => ['batcave-journal-' + iso, Object.assign({poids: Number((64.5 + 0.3 * i).toFixed(2)), water: 0}, f(i))]));
const boucle = fr => fr.evaluate(() => ({note: document.getElementById('kcal-note').innerText,
                                         txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g, ' '),
                                         t: window.__bcBilanTaille()}));

console.log('\n== 1) La taille prend 2,6 cm par mois : -100 kcal, quoi que dise la balance ==');
{
  const {ctx, fr} = await ouvrir(journal(i => ({taille: Number((74 + 0.6 * i).toFixed(1))})), '2027-01-10T09:40:00+01:00');
  const k = await boucle(fr);
  ok(k.t.alerte && k.t.parMois > 2 && k.t.parMois < 3, 'pente de la taille ≈ +2,6 cm / mois (' + (k.t.parMois || 0).toFixed(2) + ')');
  ok(/-100 kcal/.test(k.note), 'la boucle propose −100 kcal (' + k.note + ')');
  ok(/Le tour de taille prend 2,6 cm par mois/.test(k.txt) && /quoi que dise la balance/.test(k.txt), 'et dit pourquoi : la taille, pas la balance');
  await ctx.close();
}

console.log('\n== 2) La taille tient : la balance décide, le rapport épaules / taille s\'affiche ==');
{
  const seed = journal(i => ({taille: Number((74 + 0.05 * i).toFixed(2))}));
  seed['batcave-journal-' + D[6]].epaules = 112;
  const {ctx, fr} = await ouvrir(seed, '2027-01-10T09:40:00+01:00');
  const k = await boucle(fr);
  ok(!k.t.alerte && k.t.parMois !== null && k.t.parMois < 1, 'taille stable : pas d\'alerte (' + (k.t.parMois || 0).toFixed(2) + ' cm / mois)');
  ok(!/-100 kcal/.test(k.note), 'pas de −100 kcal (' + k.note + ')');
  ok(/Tour de taille : 74,3 cm/.test(k.txt) && /épaules \/ taille : 1,51/.test(k.txt) && /visé ≈ 1,6/.test(k.txt), 'la ligne donne la taille, le rapport (112 / 74,3 = 1,51) et la cible');
  await ctx.close();
}
{
  const {ctx, fr} = await ouvrir({}, '2027-01-10T09:40:00+01:00');
  const k = await boucle(fr);
  ok(/Tour de taille : pas encore de mesure/.test(k.txt), 'sans mesure, la ligne dit comment mesurer');
  await ctx.close();
}

console.log('\n== 3) La clôture : le tour de taille le dimanche, les épaules le dimanche des photos ==');
{
  /* le 29 novembre etait un dimanche de photos (toutes les quatre semaines depuis le 4 octobre).
     11 novembre, la nuit : l'ancre passe au dimanche 15 novembre ; 15 novembre, au dimanche 22 (ancre-dimanche-v5) --
     les photos tombent les 22 novembre, 20 decembre, 17 janvier, 14 fevrier.
     23 novembre : le jour 1 au mardi 24, l'ancre au dimanche 29 (ancre-dimanche-v6) -- les photos tombent les 29 novembre,
     27 decembre, 24 janvier, 21 fevrier. On lit le 27 decembre. */
  const {ctx, page, fr} = await ouvrir({}, '2026-12-27T21:00:00+01:00');
  await fr.evaluate(() => { document.getElementById('bc-cloture').click(); const m = document.querySelector('[data-cl-mode="complet"]'); if(m) m.click(); });
  await page.waitForTimeout(300);
  const v = await fr.evaluate(() => ({t: document.getElementById('cl-taille-row').hidden, e: document.getElementById('cl-epaules-row').hidden}));
  ok(!v.t && !v.e, 'dimanche de photos : tour de taille et tour d\'épaules proposés (' + JSON.stringify(v) + ')');
  await fr.evaluate(() => {
    document.getElementById('cl-taille').value = '75.5'; document.getElementById('cl-epaules').value = '110';
    document.getElementById('cloture-valider').click(); const d = document.getElementById('demain-ok'); if(d) d.click();
  });
  await page.waitForTimeout(300);
  const j = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-journal-2026-12-27') || 'null'));
  ok(j && Number(j.taille) === 75.5 && Number(j.epaules) === 110, 'les deux mesures sont dans le journal du jour (' + JSON.stringify(j && {taille: j.taille, epaules: j.epaules}) + ')');
  await ctx.close();
}
{
  const {ctx, page, fr} = await ouvrir({}, '2026-12-06T21:00:00+01:00');
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(300);
  const v = await fr.evaluate(() => ({t: document.getElementById('cl-taille-row').hidden, e: document.getElementById('cl-epaules-row').hidden}));
  ok(!v.t && v.e, 'dimanche sans photos : la taille seule (' + JSON.stringify(v) + ')');
  await ctx.close();
}
{
  const {ctx, page, fr} = await ouvrir({}, '2026-12-08T21:00:00+01:00');
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(300);
  const v = await fr.evaluate(() => ({t: document.getElementById('cl-taille-row').hidden, e: document.getElementById('cl-epaules-row').hidden}));
  ok(v.t && v.e, 'un mardi : ni l\'un ni l\'autre (' + JSON.stringify(v) + ')');
  await ctx.close();
}

console.log(err ? '\nERREURS: ' + err : '\nTOUT VERT');
await b.close();
process.exit(err ? 1 : 0);
