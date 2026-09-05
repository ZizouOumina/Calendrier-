/* Priorité réelle des tâches, prévu vs réalisé hebdo, boucle poids → calories. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}
const aller = async (fr, page, p) => { await fr.evaluate(pg => document.querySelector('.nav-btn[data-page="'+pg+'"]').click(), p); await page.waitForTimeout(250); };
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const MERCREDI = '2026-09-09T10:00:00+02:00';

console.log('\n== 118) La priorité des tâches compte enfin ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI, { 'batcave-taches': [
    {id:'A', text:'Rendre TP', due:'2026-09-07', priority:'Moyenne', status:'À faire'},
    {id:'B', text:'Inscription examen', due:'2026-09-06', priority:'Haute', status:'À faire'},
    {id:'C', text:'Ranger le bureau', due:'2026-09-09', priority:'Basse', status:'À faire'},
    {id:'D', text:'Préparer le DELE blanc', due:'', priority:'Haute', status:'À faire'},
    {id:'E', text:'Acheter des stylos', due:'', priority:'Moyenne', status:'À faire'}
  ]});
  const plan = await fr.evaluate(() => [...document.querySelectorAll('#dash-plan li')].map(l => l.innerText.replace(/\s+/g,' ')));
  const iB = plan.findIndex(t => /Inscription examen/.test(t)), iA = plan.findIndex(t => /Rendre TP/.test(t)), iD = plan.findIndex(t => /Préparer le DELE/.test(t));
  ok(iB >= 0 && iA >= 0 && iB < iA, 'deux tâches en retard : la Haute avant la Moyenne (' + iB + ' < ' + iA + ')');
  ok(/\(haute\)/.test(plan[iB]), 'la mention (haute) est visible : ' + plan[iB].slice(0, 50));
  ok(iD >= 0 && /Priorité haute — Préparer le DELE blanc/.test(plan[iD]), 'une Haute sans échéance apparaît dans le plan');
  ok(!plan.some(t => /Acheter des stylos/.test(t)), 'une Moyenne sans échéance n\'y apparaît pas');
  await aller(fr, page, 'taches');
  const ordre = await fr.evaluate(() => [...document.querySelectorAll('#taches-list .entry-row b')].map(b => b.innerText));
  ok(ordre[0] === 'Inscription examen' && ordre[1] === 'Préparer le DELE blanc' && ordre[ordre.length - 1] === 'Ranger le bureau', 'liste des tâches : Haute d\'abord, Basse en dernier : ' + ordre.join(' › '));
  await ctx.close();
}

console.log('\n== 119) Prévu vs réalisé — Bilan ==');
{
  /* lundi 7 : 5 h révision + 3 h projets (= 8 h prévues) ; mardi 8 : 4 h révision (8 prévues) ; mercredi 9 : rien encore (8 prévues) */
  const S = (id, date, type, min, h) => ({id, date, type, duree:min, label: type === 'cours' ? 'Anatomía I' : 'Shopify', debut: new Date(date + 'T' + h + ':00:00+02:00').getTime(), fin: new Date(date + 'T' + h + ':00:00+02:00').getTime() + min*60000});
  const { ctx, fr, page } = await ouvrir(MERCREDI, { 'batcave-sessions': [S('a','2026-09-07','cours',300,'07'), S('b','2026-09-07','projet',180,'13'), S('c','2026-09-08','cours',240,'07')] });
  await aller(fr, page, 'bilan');
  const fid = await fr.evaluate(() => [...document.querySelectorAll('#bilan-grid .bilan-card')].map(c => c.innerText.replace(/\s+/g,' ')).find(t => /Fidélité/.test(t)));
  ok(fid && /50%/.test(fid), 'carte « Fidélité au plan » : 50 % (12 h faites / 24 h prévues lun-mer) : ' + (fid || '').slice(0, 60));
  const p = await fr.evaluate(() => ({ txt: document.getElementById('bilan-plan').innerText.replace(/\s+/g,' '), note: document.getElementById('bilan-plan-note').innerText }));
  ok(/Lun 8,0 \/ 8,0 h/.test(p.txt) && /Mar 4,0 \/ 8,0 h/.test(p.txt) && /Mer 0,0 \/ 8,0 h/.test(p.txt), 'jour par jour : Lun 8/8, Mar 4/8, Mer 0/8');
  ok(/Jeu prévu 8,0 h/.test(p.txt) && /Dim prévu 5,0 h/.test(p.txt), 'les jours à venir montrent le prévu (jeu 8 h, dim 5 h)');
  ok(/Révision 9,0 \/ 15,0 h/.test(p.txt) && /Projets 3,0 \/ 9,0 h/.test(p.txt), 'totaux par type sur les jours passés (rév. 9/15, proj. 3/9)');
  ok(/fidélité 50 %/.test(p.note), 'note : ' + p.note);
  await ctx.close();
}

console.log('\n== 120) Boucle poids → calories ==');
{
  const stagne = {};
  for(let i = 13; i >= 0; i--){ const d = new Date('2026-09-09T00:00:00+02:00'); d.setDate(d.getDate() - i); const iso = d.toISOString().slice(0,10); stagne['batcave-journal-' + iso] = {poids: 64.0, water: 0}; }
  const { ctx, fr, page } = await ouvrir(MERCREDI, stagne);
  await aller(fr, page, 'repas');
  let k = await fr.evaluate(() => ({ note: document.getElementById('kcal-note').innerText, txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' '), sub: document.getElementById('meal-kcal-sub').innerText, btn: document.getElementById('kcal-appliquer').hidden }));
  ok(/recommandation : \+150 kcal/.test(k.note), 'poids stable deux semaines → +150 kcal recommandé : ' + k.note);
  ok(/Rythme visé : \+0,23 kg \/ semaine/.test(k.txt), 'rythme visé dérivé de l\'objectif poids (64 → 70 sur l\'horizon) : ' + (k.txt.match(/Rythme visé[^.]*/) || [''])[0]);
  ok(/Tendance : \+0,00 kg/.test(k.txt) && !k.btn, 'tendance +0,00 kg, bouton « Appliquer » visible');
  ok(/\/ 3087 kcal$/.test(k.sub), 'cible de base 3087 kcal : ' + k.sub);
  await fr.evaluate(() => document.getElementById('kcal-appliquer').click());
  await page.waitForTimeout(300);
  const aj = await local(fr, 'batcave-kcal-ajustement');
  ok(aj && aj.valeur === 150 && aj.depuis === '2026-09-09', 'ajustement enregistré : +150 depuis aujourd\'hui');
  k = await fr.evaluate(() => ({ sub: document.getElementById('meal-kcal-sub').innerText, txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' ') }));
  ok(/\/ 3237 kcal \(plan 3087 \+ 150\)/.test(k.sub), 'la barre Repas vise 3237 kcal : ' + k.sub);
  ok(/Cible calorique actuelle : 3237 kcal/.test(k.txt), 'l\'analyse affiche la cible ajustée');
  /* tout coché aujourd'hui → 3237/3237 = 100 % : l'ajustement vit dans le dîner, l'apport le suit */
  /* un clic redessine la grille : on re-cherche la premiere case non cochee a chaque tour */
  await fr.evaluate(() => { for(let i = 0; i < 60; i++){ const cb = document.querySelector('#meal-grid input[type="checkbox"]:not(:checked)'); if(!cb) break; cb.click(); } });
  await page.waitForTimeout(300);
  const pct = await fr.evaluate(() => ({ repas: document.getElementById('meal-kcal-pct').innerText, dash: document.getElementById('dash-meals-kcal-pct').innerText }));
  ok(pct.repas === '100%' && /^100% kcal$/.test(pct.dash), 'Repas et tableau de bord d\'accord : 100 % (' + pct.repas + ' / ' + pct.dash + ')');
  await fr.evaluate(() => document.getElementById('kcal-reset').click());
  await page.waitForTimeout(300);
  ok(await local(fr, 'batcave-kcal-ajustement') === null && (await fr.evaluate(() => document.getElementById('meal-kcal-pct').innerText)) === '100%', 'retour au plan de base → 100 %');
  await ctx.close();
}
{
  /* prise trop rapide : 64,0 → 65,0 en une semaine (> 2 × 0,23) → −100 */
  const rapide = {};
  for(let i = 13; i >= 0; i--){ const d = new Date('2026-09-09T00:00:00+02:00'); d.setDate(d.getDate() - i); const iso = d.toISOString().slice(0,10); rapide['batcave-journal-' + iso] = {poids: i >= 7 ? 64.0 : 65.0, water: 0}; }
  const { ctx, fr, page } = await ouvrir(MERCREDI, rapide);
  await aller(fr, page, 'repas');
  const note = await fr.evaluate(() => document.getElementById('kcal-note').innerText);
  ok(/recommandation : -100 kcal/.test(note), 'prise trop rapide → −100 kcal : ' + note);
  await ctx.close();
}
{
  const { ctx, fr, page } = await ouvrir(MERCREDI, { 'batcave-journal-2026-09-08': {poids: 64} });
  await aller(fr, page, 'repas');
  const k = await fr.evaluate(() => ({ note: document.getElementById('kcal-note').innerText, txt: document.getElementById('kcal-analyse').innerText, btn: document.getElementById('kcal-appliquer').hidden }));
  ok(/en attente de pesées/.test(k.note) && /au moins 3 pesées/.test(k.txt) && k.btn, 'pas assez de pesées → pas de recommandation, bouton masqué');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
