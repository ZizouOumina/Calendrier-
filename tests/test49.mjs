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
const MERCREDI = '2026-09-02T10:00:00+02:00';
/* La boucle poids -> calories ecarte les pesees anterieures au 17 octobre (trois semaines
   apres ANCRE_COURSES, passee au samedi 26 avec le depart du dimanche 20) : ces trois
   premieres semaines du plan, la balance monte d'un a trois kilos de glycogene, d'eau et
   de contenu digestif, et une pente tracee a travers ce saut dirait n'importe quoi. Ses
   scenarios se jouent donc en novembre. Le 4 novembre est un mercredi, comme le 2
   septembre (neuf semaines pile) : meme rotation, memes macros, 3 135 kcal. */
const MERCREDI_KCAL = '2026-11-04T10:00:00+02:00';

console.log('\n== 118) La priorité des tâches compte enfin ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI, { 'batcave-taches': [
    {id:'A', text:'Rendre TP', due:'2026-08-31', priority:'Moyenne', status:'À faire'},
    {id:'B', text:'Inscription examen', due:'2026-08-30', priority:'Haute', status:'À faire'},
    {id:'C', text:'Ranger le bureau', due:'2026-09-02', priority:'Basse', status:'À faire'},
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
  const { ctx, fr, page } = await ouvrir(MERCREDI, { 'batcave-sessions': [S('a','2026-08-31','cours',300,'07'), S('b','2026-08-31','projet',180,'13'), S('c','2026-09-01','cours',240,'07')] });
  await aller(fr, page, 'bilan');
  const fid = await fr.evaluate(() => [...document.querySelectorAll('#bilan-grid .bilan-card')].map(c => c.innerText.replace(/\s+/g,' ')).find(t => /Fidélité/.test(t)));
  ok(fid && /48%/.test(fid), 'carte « Fidélité au plan » : 48 % (12 h faites / 24 h 51 de travail réel prévues lun-mer) : ' + (fid || '').slice(0, 60));
  const p = await fr.evaluate(() => ({ txt: document.getElementById('bilan-plan').innerText.replace(/\s+/g,' '), note: document.getElementById('bilan-plan-note').innerText }));
  /* lundi et mardi ont leur propre grille depuis l'emploi du temps reel. Lot 41 : la grille
     du 18 septembre donne 8 h 36 le lundi, 8 h 30 le mardi, 7 h 45 le mercredi. */
  ok(/Lun 8 h \/ 8 h 36/.test(p.txt) && /Mar 4 h \/ 8 h 30/.test(p.txt) && /Mer 0 \/ 7 h 45/.test(p.txt), 'jour par jour : ' + (p.txt.match(/Lun[^M]*Mar[^M]*Mer[^J]*/)||[])[0]);
  ok(/Jeu prévu 6 h 50/.test(p.txt) && /Dim prévu 5 h/.test(p.txt), 'les jours à venir montrent le prévu (jeu 6 h 50, dim 5 h) : ' + (p.txt.match(/Jeu[^D]*Dim prévu [^ ]+ ?[^ ]*/)||[])[0]);
  ok(/Révision 9 h \/ 16 h/.test(p.txt) && /Projets 3 h \/ 8 h 51/.test(p.txt), 'totaux par type sur les jours passés : ' + (p.txt.match(/Révision[^·]*·[^·]*/)||[])[0]);
  ok(/fidélité 48 %/.test(p.note), 'note : ' + p.note);
  await ctx.close();
}

console.log('\n== 120) Boucle poids → calories ==');
{
  const stagne = {};
  for(let i = 13; i >= 0; i--){ const d = new Date('2026-11-04T00:00:00+01:00'); d.setDate(d.getDate() - i); const iso = d.toISOString().slice(0,10); stagne['batcave-journal-' + iso] = {poids: 64.0, water: 0}; }
  const { ctx, fr, page } = await ouvrir(MERCREDI_KCAL, stagne);
  await aller(fr, page, 'repas');
  let k = await fr.evaluate(() => ({ note: document.getElementById('kcal-note').innerText, txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' '), sub: document.getElementById('meal-kcal-sub').innerText, btn: document.getElementById('kcal-appliquer').hidden }));
  ok(/recommandation : \+150 kcal/.test(k.note), 'poids stable deux semaines → +150 kcal recommandé : ' + k.note);
  ok(/Rythme visé : \+0,23 kg \/ semaine/.test(k.txt), 'rythme visé dérivé de l\'objectif poids (64 → 70 sur l\'horizon) : ' + (k.txt.match(/Rythme visé[^.]*/) || [''])[0]);
  ok(/Tendance : \+0,00 kg/.test(k.txt) && !k.btn, 'tendance +0,00 kg, bouton « Appliquer » visible');
  ok(/\/ 3135 kcal$/.test(k.sub), 'cible de base 3135 kcal : ' + k.sub);
  await fr.evaluate(() => document.getElementById('kcal-appliquer').click());
  await page.waitForTimeout(300);
  const aj = await local(fr, 'batcave-kcal-ajustement');
  ok(aj && aj.valeur === 150 && aj.depuis === '2026-11-04', 'ajustement enregistré : +150 depuis aujourd\'hui');
  k = await fr.evaluate(() => ({ sub: document.getElementById('meal-kcal-sub').innerText, txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' ') }));
  /* La boucle demande +150 kcal, les pates s'ajustent par pas de 10 g : elle en ajoute 144.
     C'est cet ecart REEL entre les deux journees qui s'affiche, sinon la soustraction ment. */
  ok(/\/ 3279 kcal \(plan 3135 \+ 144\)/.test(k.sub), 'la barre Repas vise 3279 kcal : ' + k.sub);
  ok(/Cible calorique actuelle : 3279 kcal/.test(k.txt), 'l\'analyse affiche la cible ajustée (' + ((k.txt.match(/Cible calorique actuelle : [^\n]*/) || [])[0] || '?') + ')');
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
  /* prise trop rapide : 64,0 → 65,0 en une semaine (> 1,5 × 0,23) → −100.
     Le plafond est passe de 2 × a 1,5 × la cible : a 2 ×, il tolerait 0,46 kg par semaine,
     soit deux kilos par mois — au-dela des 0,25 a 0,5 % du poids de corps par semaine
     où la prise reste majoritairement musculaire. */
  const rapide = {};
  for(let i = 13; i >= 0; i--){ const d = new Date('2026-11-04T00:00:00+01:00'); d.setDate(d.getDate() - i); const iso = d.toISOString().slice(0,10); rapide['batcave-journal-' + iso] = {poids: i >= 7 ? 64.0 : 65.0, water: 0}; }
  const { ctx, fr, page } = await ouvrir(MERCREDI_KCAL, rapide);
  await aller(fr, page, 'repas');
  const note = await fr.evaluate(() => document.getElementById('kcal-note').innerText);
  ok(/recommandation : -100 kcal/.test(note), 'prise trop rapide → −100 kcal : ' + note);
  await ctx.close();
}
{
  const { ctx, fr, page } = await ouvrir(MERCREDI_KCAL, { 'batcave-journal-2026-11-03': {poids: 64} });
  await aller(fr, page, 'repas');
  const k = await fr.evaluate(() => ({ note: document.getElementById('kcal-note').innerText, txt: document.getElementById('kcal-analyse').innerText, btn: document.getElementById('kcal-appliquer').hidden }));
  ok(/en attente de pesées/.test(k.note) && /au moins 4 pesées/.test(k.txt) && k.btn, 'pas assez de pesées → pas de recommandation, bouton masqué');
  await ctx.close();
}

console.log('\n== 120b) Le saut de depart ne doit JAMAIS faire retirer des calories ==');
/* Avant le 20 septembre Zizou mangeait autour d'un tiers du plan. En passant a 3 130 kcal
   et 377 g de glucides, la balance monte d'un a trois kilos en deux semaines qui ne sont
   ni du muscle ni du gras : le glycogene se remplit (chaque gramme retient ~3 g d'eau) et
   le tube digestif porte 2,5 kg de nourriture au lieu de 400 g. Une droite tracee a
   travers ce saut lit +0,5 kg par semaine et conclut « trop rapide, retire 100 kcal » :
   le contresens exact que cette boucle existe pour eviter. */
{
  const saut = {};
  /* Decale d'une semaine avec la stabilisation (10 → 17 octobre) : il faut toujours
     quatre pesees APRES la coupure pour que la pente se lise. */
  [['2026-09-20',64.0],['2026-10-04',66.4],['2026-10-18',66.8],['2026-11-01',67.0],
   ['2026-11-15',67.2],['2026-11-29',67.4]].forEach(([d,v]) => { saut['batcave-journal-' + d] = {poids: v}; });
  const { ctx, fr, page } = await ouvrir('2026-11-29T10:00:00+02:00', saut);
  await aller(fr, page, 'repas');
  const k = await fr.evaluate(() => ({ note: document.getElementById('kcal-note').innerText,
                                       txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' ') }));
  ok(!/-100 kcal/.test(k.note), 'le saut de depart ne fait pas retirer de calories : ' + k.note);
  /* La pente lue ne porte que sur les pesees d'apres stabilisation : 66,8 -> 67,4. */
  ok(/4 pes\u00e9es/.test(k.txt) && /66,8 \u2192 67,4 kg/.test(k.txt),
     'seules les 4 pes\u00e9es d\'apr\u00e8s le 17 octobre comptent : ' + ((k.txt.match(/Tendance[^.]*/) || [''])[0]));
  await ctx.close();
}
{
  /* Et tant qu'on est dans les trois premieres semaines, la Batcave DIT pourquoi elle se tait. */
  const { ctx, fr, page } = await ouvrir('2026-10-04T10:00:00+02:00', {'batcave-journal-2026-09-20': {poids: 64.0}, 'batcave-journal-2026-10-04': {poids: 66.4}});
  await aller(fr, page, 'repas');
  const txt = await fr.evaluate(() => document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' '));
  ok(/rien avant le 17 oct\./.test(txt) && /glyc\u00e8ne|glycog\u00e8ne/.test(txt),
     'elle explique l\'attente au lieu de rester muette : ' + txt.slice(-190));
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
