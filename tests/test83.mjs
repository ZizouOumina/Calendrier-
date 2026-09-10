/* Lot 33 — les portes d'espagnol.
     Le Dossier Español mesure dix choses le dimanche ; aucune ne répond à la question qui
     décide de l'emploi du temps : « est-ce que je suis un cours en espagnol assez bien pour
     arrêter d'y consacrer trois blocs par jour ? » La note quotidienne de suivi du cours y
     répond, lue en MOYENNE GLISSANTE sur 21 jours, croisée avec un critère objectif.
     Éprouvé ici : la fenêtre et son plancher de 12 jours, le seuil d'ouverture, l'hystérésis
     (ouverte à 2,5, ne se referme qu'en dessous de 2,2), le critère « erreurs pour 100 mots »,
     et la deuxième porte qui exige un examen réellement passé. */
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
const etudes = async (fr, page) => {
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(400);
};
const carte = fr => fr.evaluate(() => ({
  note: (document.getElementById('portes-note')||{}).textContent || '',
  etat: ((document.getElementById('portes-etat')||{}).textContent || '').replace(/\s+/g, ' ')
}));
/* Des notes de suivi sur les jours de COURS (lun, mar, mer, jeu, ven) précédant `fin`. */
function notes(fin, jours, valeur){
  const out = {}; const d = new Date(fin + 'T00:00:00'); let pris = 0;
  while(pris < jours){
    const dow = d.getDay();
    const iso = d.toISOString().slice(0, 10);
    if(dow >= 1 && dow <= 5 && iso >= '2026-09-14'){ out[iso] = (typeof valeur === 'function') ? valeur(pris) : valeur; pris++; }
    d.setDate(d.getDate() - 1);
    if(d < new Date('2026-09-01T00:00:00')) break;
  }
  return out;
}
const revue = (date, errores) => [{id:'rv1', date, marche:'', coince:'', ajust:'', espanol:{errores, oral:null, drill:null}}];

console.log('\n== 1) Sans assez de jours notés, aucune porte ne s\'ouvre ==');
{
  const fin = '2026-10-05';
  const { ctx, page, fr } = await ouvrir({
    'batcave-cours-suivi': notes(fin, 8, 3),
    'batcave-revue': revue('2026-10-04', 1.0)
  }, '2026-10-05T21:00:00+02:00');
  await etudes(fr, page);
  const c = await carte(fr);
  ok(/8\/12 jours notés/.test(c.note), 'le relevé annonce 8/12 jours notés (obtenu : ' + c.note + ')');
  ok(/la fenêtre ne conclut rien/.test(c.etat), 'la fenêtre refuse de conclure sous 12 jours');
  ok(!/✅/.test(c.etat), 'aucune porte franchie malgré des 3 partout');
  await ctx.close();
}

console.log('\n== 2) 12 jours à 3, erreurs à 1,0 : la première porte s\'ouvre, pas la seconde ==');
{
  const fin = '2026-10-09';
  const { ctx, page, fr } = await ouvrir({
    'batcave-cours-suivi': notes(fin, 13, 3),
    'batcave-revue': revue('2026-10-04', 1.0)
  }, '2026-10-09T21:00:00+02:00');
  await etudes(fr, page);
  const c = await carte(fr);
  ok(/✅ Porte 1 franchie — Un bloc Español devient un bloc Projets perso/.test(c.etat), 'porte 1 franchie, avec son intitulé');
  ok(/🔒 Porte 2/.test(c.etat), 'porte 2 fermée');
  ok(/aucun examen encore passé en espagnol/.test(c.etat), 'et c\'est l\'examen qui lui manque');
  ok(/1 porte franchie/.test(c.note), 'le relevé dit « 1 porte franchie » (obtenu : ' + c.note + ')');
  await ctx.close();
}

console.log('\n== 3) La moyenne suffit mais les erreurs sont trop hautes : porte fermée ==');
{
  const fin = '2026-10-09';
  const { ctx, page, fr } = await ouvrir({
    'batcave-cours-suivi': notes(fin, 13, 3),
    'batcave-revue': revue('2026-10-04', 4.5)
  }, '2026-10-09T21:00:00+02:00');
  await etudes(fr, page);
  const c = await carte(fr);
  ok(!/✅/.test(c.etat), 'aucune porte : le critère objectif n\'est pas tenu');
  ok(/erreurs pour 100 mots : 4,5 — il en faut moins de 3/.test(c.etat), 'et la carte dit précisément lequel');
  await ctx.close();
}

console.log('\n== 4) On ne libère jamais une heure sur la note qu\'on s\'est donnée seul ==');
{
  const fin = '2026-10-09';
  const { ctx, page, fr } = await ouvrir({
    'batcave-cours-suivi': notes(fin, 13, 3)   /* aucun bilan du dimanche */
  }, '2026-10-09T21:00:00+02:00');
  await etudes(fr, page);
  const c = await carte(fr);
  ok(!/✅/.test(c.etat), 'sans relevé d\'erreurs, la porte reste fermée');
  ok(/aucun relevé d’erreurs pour 100 mots/.test(c.etat), 'et le motif est nommé');
  await ctx.close();
}

console.log('\n== 5) L\'hystérésis : ouverte à 2,5, elle tient jusqu\'à 2,2 ==');
{
  const fin = '2026-10-09';
  /* moyenne ≈ 2,31 : sous 2,5 (n'ouvrirait pas) mais au-dessus de 2,2 (ne se referme pas) */
  const suivi = notes(fin, 13, i => (i % 13 < 4) ? 2 : (i % 13 < 8 ? 2 : 3));
  const vals = Object.values(suivi), moy = vals.reduce((a, x) => a + x, 0) / vals.length;
  ok(moy > 2.2 && moy < 2.5, 'le jeu de données vise bien la zone morte (moyenne ' + moy.toFixed(2) + ')');

  const seedFerme = {'batcave-cours-suivi': suivi, 'batcave-revue': revue('2026-10-04', 1.0)};
  let r = await ouvrir(seedFerme, '2026-10-09T21:00:00+02:00');
  await etudes(r.fr, r.page);
  let c = await carte(r.fr);
  ok(!/✅/.test(c.etat), 'porte fermée : dans la zone morte, on n\'ouvre pas');
  ok(/il faut 2,5 pour l’ouvrir/.test(c.etat), 'et le seuil annoncé est celui d\'ouverture');
  await r.ctx.close();

  const seedOuvert = Object.assign({}, seedFerme, {'batcave-portes': {p1:true, p2:false, maj:'2026-10-08'}});
  r = await ouvrir(seedOuvert, '2026-10-09T21:00:00+02:00');
  await etudes(r.fr, r.page);
  c = await carte(r.fr);
  ok(/✅ Porte 1/.test(c.etat), 'déjà ouverte, la même moyenne la garde ouverte');
  ok(/ne se refermera qu’en dessous de 2,2/.test(c.etat), 'et la carte annonce le seuil de fermeture');
  await r.ctx.close();
}

console.log('\n== 6) Sous 2,2, une porte ouverte se referme ==');
{
  const fin = '2026-10-09';
  const { ctx, page, fr } = await ouvrir({
    'batcave-cours-suivi': notes(fin, 13, 2),
    'batcave-revue': revue('2026-10-04', 1.0),
    'batcave-portes': {p1:true, p2:false, maj:'2026-10-08'}
  }, '2026-10-09T21:00:00+02:00');
  await etudes(fr, page);
  const c = await carte(fr);
  ok(!/✅/.test(c.etat), 'la porte se referme à 2,00');
  ok(/il faut 2,2 pour la garder/.test(c.etat), 'et la carte dit ce qu\'il aurait fallu tenir');
  await ctx.close();
}

console.log('\n== 7) Deuxième porte : moyenne, erreurs ET un examen déjà passé ==');
{
  const fin = '2026-12-04';
  const { ctx, page, fr } = await ouvrir({
    'batcave-cours-suivi': notes(fin, 13, 3),
    'batcave-revue': revue('2026-11-29', 1.2),
    'batcave-examens': {'Bioquímica': '2026-11-20'}
  }, '2026-12-04T21:00:00+02:00');
  await etudes(fr, page);
  const c = await carte(fr);
  ok(/✅ Porte 1/.test(c.etat), 'porte 1 franchie');
  ok(/✅ Porte 2/.test(c.etat), 'porte 2 franchie : l\'examen du 20 novembre est passé');
  ok(/2 portes franchies/.test(c.note), 'le relevé dit « 2 portes franchies » (obtenu : ' + c.note + ')');
  await ctx.close();
}

console.log('\n== 8) La note du jour n\'apparaît que les jours de cours ==');
{
  let r = await ouvrir({}, '2026-09-14T21:00:00+02:00');   /* lundi : cours */
  await etudes(r.fr, r.page);
  let v = await r.fr.evaluate(() => ({vis: !document.getElementById('portes-aujourdhui').hidden,
                                      n: document.querySelectorAll('#portes-note-jour [data-note-cours]').length}));
  ok(v.vis && v.n === 4, 'lundi 14 : la note du jour est proposée, quatre choix');
  await r.ctx.close();

  r = await ouvrir({}, '2026-09-20T21:00:00+02:00');       /* dimanche : pas de cours */
  await etudes(r.fr, r.page);
  v = await r.fr.evaluate(() => !document.getElementById('portes-aujourdhui').hidden);
  ok(v === false, 'dimanche 20 : aucune note demandée');
  await r.ctx.close();
}

console.log('\n== 9) Un clic écrit la note, et elle survit au rechargement ==');
{
  const { ctx, page, fr } = await ouvrir({}, '2026-09-14T21:00:00+02:00');
  await etudes(fr, page);
  await fr.evaluate(() => document.querySelector('#portes-note-jour [data-note-cours="2"]').click());
  await page.waitForTimeout(200);
  const ecrit = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-cours-suivi') || '{}'));
  ok(ecrit['2026-09-14'] === 2, 'la note 2 est écrite pour le 14 septembre');
  const actif = await fr.evaluate(() => !!document.querySelector('#portes-note-jour [data-note-cours="2"].active'));
  ok(actif, 'et le choix reste marqué');
  await fr.evaluate(() => document.querySelector('#portes-note-jour [data-note-cours="2"]').click());
  await page.waitForTimeout(200);
  const efface = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-cours-suivi') || '{}'));
  ok(efface['2026-09-14'] === undefined, 'recliquer la même note l\'efface');
  await ctx.close();
}

console.log('\n== 10) Les jours hors fenêtre ne comptent plus ==');
{
  /* 13 jours à 3, mais tous vieux de plus de 21 jours : la fenêtre est vide */
  const { ctx, page, fr } = await ouvrir({
    'batcave-cours-suivi': notes('2026-09-30', 13, 3),
    'batcave-revue': revue('2026-11-01', 1.0)
  }, '2026-11-02T21:00:00+02:00');
  await etudes(fr, page);
  const c = await carte(fr);
  ok(/Aucun jour de cours noté sur les 21 derniers jours/.test(c.etat), 'la fenêtre glissante a laissé sortir les vieux jours');
  ok(!/✅/.test(c.etat), 'et aucune porte ne s\'ouvre sur un passé lointain');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT EST VERT');
process.exit(err ? 1 : 0);
