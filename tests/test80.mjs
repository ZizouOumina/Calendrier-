/* Lot 31 — trois améliorations, éprouvées sur des données fictives.
     · Une séance de sport à moitié faite vaut une demi-séance dans l'objectif.
     · La boucle poids → calories ne se laisse plus retourner par une seule pesée.
     · Le mode partiels s'annonce une semaine avant de s'enclencher.
   (Le quatrième point de ce lot, les questions posées à Alfred, est parti avec Alfred.) */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

const JOUR = '2026-09-14';                       /* lundi, jour 1 du programme */
async function ouvrir(seed, quand){
  const ctx = await b.newContext({viewport:{width:1440, height:1200}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(s => {
    window.claude = undefined;
    for(const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
  }, seed || {});
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + e.message); });
  await page.clock.install({time: new Date(quand || (JOUR + 'T18:00:00+02:00'))});
  await page.goto(URL, {timeout:20000}).catch(()=>{});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  await page.waitForTimeout(400);
  return {ctx, page, fr};
}
const aller = async (fr, page, p) => { await fr.evaluate(pg => document.querySelector('.nav-btn[data-page="'+pg+'"]').click(), p); await page.waitForTimeout(600); };
const plan = fr => fr.evaluate(() => document.getElementById('dash-plan').innerText);
const journalPoids = (iso, kg) => ({['batcave-journal-' + iso]: {poids: kg, water: 0}});
const pesees = liste => Object.assign({}, ...liste.map(([iso, kg]) => journalPoids(iso, kg)));
const jours = (debut, n) => { const out = []; const d = new Date(debut + 'T00:00:00'); for(let i = 0; i < n; i++){ out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate() + 1); } return out; };


console.log('\n== 1) Une séance à moitié faite vaut une demi-séance ==');
{
  for(const [n, attendu, desc] of [[0,'0,0','aucune case'], [3,'0,3','3 sur 10'], [5,'0,5','5 sur 10, la moitié'], [10,'1,0','les 10']]){
    const st = {}; for(let i = 0; i < n; i++) st['Haut lourd-' + i] = true;
    const {ctx, page, fr} = await ouvrir({['batcave-sport-' + JOUR]: st});
    await aller(fr, page, 'objectifs');
    const o = await fr.evaluate(() => document.querySelector('section.page[data-page="objectifs"]').innerText);
    const m = o.match(/Séances de sport tenues[\s\S]{0,60}?réel\s*\n?([\d,]+) séances/);
    ok(m && m[1] === attendu, desc + ' → ' + (m ? m[1] : '?') + ' séance comptée (' + attendu + ' attendu)');
    await ctx.close();
  }
}

console.log('\n== 2) Une pesée salée ne fait plus retirer 100 kcal ==');
{
  /* Deux semaines de pesées : 7 jours à 64,0 puis 7 jours à 64,4 — SAUF un matin à 66,0.
     Ce seul matin salé tire la pente à +0,47 kg / semaine, soit plus de deux fois le rythme
     visé (0,23) : l'ancien calcul retirait 100 kcal pour un dîner de la veille. Sans lui, la
     pente retombe dans la cible — donc la recommandation tient à cette pesée-là, et la
     Batcave refuse de conclure au lieu de couper les calories. */
  const av = jours('2026-09-01', 7).map(iso => [iso, 64.0]);
  const rec = jours('2026-09-08', 7).map((iso, i) => [iso, i === 3 ? 66.0 : 64.4]);
  const {ctx, page, fr} = await ouvrir(pesees(av.concat(rec)));
  await aller(fr, page, 'repas');
  const k = await fr.evaluate(() => ({note: document.getElementById('kcal-note').innerText,
                                      txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' ')}));
  ok(!/-100/.test(k.note), 'la pesée à 66,0 kg ne déclenche plus de coupe : ' + k.note);
  ok(/une seule pesée décide/.test(k.note), 'verdict : on ne conclut pas sur un matin salé (' + k.note + ')');
  ok(/sans celle du 11 sept/.test(k.txt) && /66,0 kg/.test(k.txt), 'et la pesée en cause est nommée : ' + (k.txt.match(/Une seule pesée[^.]*\./) || [''])[0]);
  await ctx.close();
}
{
  /* Quand la tendance tient VRAIMENT à une seule pesée (4 pesées par semaine, donc pas
     d'élagage), la Batcave ne recommande rien et dit laquelle. */
  const av = ['2026-09-01','2026-09-03','2026-09-05','2026-09-07'].map(iso => [iso, 64.0]);
  const rec = [['2026-09-08',64.4],['2026-09-10',64.4],['2026-09-12',64.4],['2026-09-14',66.0]];
  const {ctx, page, fr} = await ouvrir(pesees(av.concat(rec)));
  await aller(fr, page, 'repas');
  const k = await fr.evaluate(() => ({note: document.getElementById('kcal-note').innerText,
                                      txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' '),
                                      btn: document.getElementById('kcal-appliquer').hidden}));
  ok(/une seule pesée décide/.test(k.note), 'la note le dit : ' + k.note);
  ok(/sans celle du 14 sept/.test(k.txt) && /66,0 kg/.test(k.txt), 'et elle nomme la pesée en cause : ' + (k.txt.match(/Une seule pesée[^.]*\./) || [''])[0]);
  ok(k.btn === true, 'le bouton « Appliquer » reste masqué tant qu’une pesée de plus n’a pas tranché');
  await ctx.close();
}
{
  /* et une vraie prise franche passe toujours : 64,0 → 65,0, sept pesées de chaque côté */
  const av = jours('2026-09-01', 7).map(iso => [iso, 64.0]);
  const rec = jours('2026-09-08', 7).map(iso => [iso, 65.0]);
  const {ctx, page, fr} = await ouvrir(pesees(av.concat(rec)));
  await aller(fr, page, 'repas');
  const note = await fr.evaluate(() => document.getElementById('kcal-note').innerText);
  ok(/-100 kcal/.test(note), 'une prise franche de 1 kg en une semaine fait toujours retirer 100 kcal : ' + note);
  await ctx.close();
}

console.log('\n== 3) Le mode partiels s’annonce une semaine avant ==');
{
  /* premier examen le 24 : le mode s'enclenche le 17 (J-7), donc 3 jours après le 14 */
  const {ctx, fr} = await ouvrir({'batcave-examens': {Anatomie:'2026-09-24', Biochimie:'2026-09-26'}});
  const t = await plan(fr);
  const ligne = t.split('\n').filter(l => /Mode partiels/.test(l))[0] || '';
  ok(/Mode partiels dans 3 jours/.test(ligne), 'annoncé à 3 jours : ' + ligne.slice(0, 90));
  ok(/s'enclenche le 17 sept/.test(ligne), 'avec la date d’enclenchement : ' + (ligne.match(/enclenche[^(]*/) || [''])[0]);
  ok(/2 examens/.test(ligne) && /dernier le 26 sept/.test(ligne), 'et la session qu’il couvre : ' + (ligne.match(/\(2 examens[^)]*\)/) || [''])[0]);
  ok(/Annales ciblées/.test(ligne) && /un seul bloc Español/.test(ligne) && /sport allégé/.test(ligne), 'et ce qui change, en toutes lettres');
  await ctx.close();
}
{
  /* trop loin : le 1er octobre, le mode commence le 24 septembre, soit 10 jours — muet */
  const {ctx, fr} = await ouvrir({'batcave-examens': {Anatomie:'2026-10-01'}});
  ok(!/Mode partiels/.test(await plan(fr)), 'à 10 jours, rien n’est annoncé : on ne prévient pas pour prévenir');
  await ctx.close();
}
{
  /* déjà dedans : premier examen le 18, le mode a commencé le 11 — plus rien à annoncer */
  const {ctx, fr} = await ouvrir({'batcave-examens': {Anatomie:'2026-09-18'}});
  const t = await plan(fr);
  ok(!/Mode partiels dans/.test(t), 'une fois le mode enclenché, l’annonce disparaît');
  await ctx.close();
}
{
  /* aucun examen daté : rien */
  const {ctx, fr} = await ouvrir();
  ok(!/Mode partiels/.test(await plan(fr)), 'sans examen daté, aucune annonce');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
