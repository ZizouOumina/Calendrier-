/* AUDIT DES PROCÉDÉS DE SUIVI
   Chaque compteur de la Batcave reçoit une entrée connue, et on vérifie ce qui ressort.
   L'idée n'est pas de tester du code mais de tester de l'ARITHMÉTIQUE : une minute
   travaillée doit se retrouver une fois, dans le bon compteur, et une seule fois. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0, avert = 0;
const ok = (c,m)=>{ if(c) console.log('  ok    '+m); else { err++; console.log('  ERREUR '+m); } };
const note = m => { avert++; console.log('  ⚠     '+m); };

const JOUR = '2026-09-14';   /* lundi, jour 1 du programme */
async function ouvrir(seed, quand){
  const ctx = await b.newContext({viewport:{width:1440,height:1200}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(s=>{
    window.claude = undefined;
    for(const [k,v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
  }, seed || {});
  const page = await ctx.newPage();
  page.on('pageerror', e=>{err++; console.log('  PAGEERROR '+e.message);});
  await page.clock.install({time:new Date(quand || (JOUR+'T21:00:00+02:00'))});
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached',timeout:20000});
  const fr = page.frames().find(x=>x.url().includes('batcave.html'));
  await fr.evaluate(()=>document.querySelectorAll('.overlay').forEach(o=>o.hidden=true));
  await page.waitForTimeout(400);
  return {ctx, page, fr};
}
const plan = fr => fr.evaluate(()=>document.getElementById('dash-plan').innerText);
/* Les durées s'écrivent « 4 h 25 », « 55 min », « 0 » : on lit la ligne, pas un nombre. */
const ligneRev = t => {
  const m = t.match(/Révision — (\S[^\n]*?) sur (\S[^\n]*?) — il reste (\S[^\n🍅]*)/);
  return m ? {fait: m[1].trim(), cible: m[2].trim(), reste: m[3].trim()} : null;
};
const faitDe = (t, quoi) => { const m = t.match(new RegExp(quoi + ' — (\\S[^\\n]*?) sur ')); return m ? m[1].trim() : undefined; };
async function objectifs(fr, page){
  await fr.evaluate(()=>document.querySelector('.nav-btn[data-page="objectifs"]').click());
  await page.waitForTimeout(700);
  /* les boutons de navigation portent aussi data-page : viser la SECTION */
  return fr.evaluate(()=>document.querySelector('section.page[data-page="objectifs"]').innerText);
}
const sess = (type,label,duree,date=JOUR)=>({id:'s'+Math.random().toString(36).slice(2),
  date, debut: new Date(date+'T08:00:00+02:00').getTime(),
  fin: new Date(date+'T08:00:00+02:00').getTime()+duree*60000, duree, type, label});

console.log('\n═══ 1. La minute de révision : entrée = sortie ═══');
{
  const {ctx, page, fr} = await ouvrir({'batcave-sessions':[sess('cours','Anatomie',55)]});
  const t = await plan(fr);
  const m = ligneRev(t);
  ok(m && m.fait === '55 min', '55 min de révision → « ' + (m?m.fait:'?') + ' » affichées (55 min attendu)');
  ok(m && m.cible === '4 h 25', 'cible du lundi : ' + (m?m.cible:'?') + ' (4 h 25 attendu)');
  /* 265 − 55 = 210 min : la même phrase ne mélange plus heures décimales et heures-minutes */
  ok(m && m.reste === '3 h 30', 'reste = cible − fait : ' + (m?m.reste:'?') + ' (3 h 30 attendu)');
  await ctx.close();
}

console.log('\n═══ 2. Espagnol : ni dans révision, ni dans projets ═══');
{
  const {ctx, page, fr} = await ouvrir({'batcave-sessions':[sess('projet','Español · Conversation',60)]});
  const t = await plan(fr);
  const rev = faitDe(t, 'Révision');
  const pro = faitDe(t, 'Projets perso');
  ok(rev === '0', '1 h d\'espagnol n\'entre PAS dans révision (révision = ' + rev + ')');
  ok(pro === undefined || pro === '0', '1 h d\'espagnol n\'entre PAS dans projets perso (projets = ' + (pro===undefined?'ligne absente':pro) + ')');
  const o = await objectifs(fr, page);
  ok(/Espagnol/.test(o), 'l\'objectif Espagnol existe');
  await ctx.close();
}

console.log('\n═══ 3. Le type « espagnol » hérité d\'anciennes sessions ═══');
{
  const {ctx, page, fr} = await ouvrir({'batcave-sessions':[sess('espagnol','Conversation',60)]});
  const t = await plan(fr);
  const rev = faitDe(t, 'Révision');
  ok(rev === '0', 'une session au vieux type « espagnol » n\'entre PAS dans la révision (révision = ' + rev + ')');
  const lignes = await fr.evaluate(()=>JSON.parse(localStorage.getItem('batcave-sessions')||'[]'));
  ok(lignes.length === 1 && lignes[0].type === 'projet' && /^Español/.test(lignes[0].label || ''),
     'et elle a été réécrite au format actuel : ' + lignes.map(x=>x.type + ' / ' + x.label).join(', '));
  await ctx.close();
}

console.log('\n═══ 4. Journal + agrégat le même jour : pas de double compte ═══');
{
  const {ctx, page, fr} = await ouvrir({
    'batcave-sessions':[sess('cours','Anatomie',60)],
    'batcave-revision':[{id:'r1', date:JOUR, duree:60, matieres:{Anatomie:60}}]
  });
  const rev = faitDe(await plan(fr), 'Révision');
  ok(rev === '1 h', '60 min dans le journal + 60 min dans l\'agrégat → ' + rev + ' (1 h attendu, pas 2 h)');
  await ctx.close();
}
{
  const {ctx, page, fr} = await ouvrir({'batcave-revision':[{id:'r1', date:JOUR, duree:90, matieres:{}}]});
  const rev = faitDe(await plan(fr), 'Révision');
  ok(rev === '1 h 30', 'agrégat seul (journée sans journal) → ' + rev + ' (1 h 30 attendu)');
  await ctx.close();
}

console.log('\n═══ 5. Le bloc « Cours » de la fac n\'est pas de la révision ═══');
{
  const {ctx, page, fr} = await ouvrir({});
  const t = await plan(fr);
  const cible = (ligneRev(t) || {}).cible || '';
  /* 4 h de cours magistral en plus feraient 8 h 25 : la cible doit rester à 4 h 25 */
  ok(cible === '4 h 25', 'cible = 4 h 25, les 15:30–19:30 de fac ne sont pas comptés (' + cible + ')');
  await ctx.close();
}

console.log('\n═══ 6. Sport : une séance vaut la part de ses cases cochées ═══');
{
  /* lundi = « Haut lourd », 10 exercices ; les clés sont « <type>-<index> » */
  const TYPE = 'Haut lourd', N = 10;
  for(const n of [0, 3, 4, 5, 7, 10]){
    const st = {}; for(let i=0;i<n;i++) st[TYPE+'-'+i] = true;
    const {ctx, page, fr} = await ouvrir({['batcave-sport-'+JOUR]: st});
    const o = await objectifs(fr, page);
    const m = o.match(/Séances de sport tenues[\s\S]{0,60}?réel\s*\n?([\d,]+) séances/);
    const v = m ? m[1] : null;
    const attendu = (n / N).toFixed(1).replace('.', ',');
    ok(v === attendu, n + ' case(s) sur ' + N + ' → ' + v + ' séance comptée (' + attendu + ' attendu)');
    await ctx.close();
  }
}

console.log('\n═══ 6 bis. Blocs Español manqués : reportés dans QUEL compteur ? ═══');
{
  /* Le lundi, les blocs de 11:20, 13:00 et 14:00 sont des blocs Español. Manqués, ils sont
     annoncés comme « projets perso » et le report atterrit dans report.proj — alors que la
     cible du jour les range dans « es », jamais dans « proj ». */
  const {ctx, page, fr} = await ouvrir({}, JOUR+'T21:00:00+02:00');
  const t = await plan(fr);
  const ligne = (t.split('\n').filter(l=>/Bloc manqué/.test(l) && /Español/.test(l))[0]) || '';
  if(ligne){
    ok(!/projets perso/.test(ligne), 'des blocs Español manqués ne sont pas annoncés comme « projets perso » — ligne : ' + ligne.trim());
  } else ok(true, 'aucun bloc Español manqué à cette heure');
  await ctx.close();
}
{
  /* et l'effet du report sur la cible du lendemain */
  const {ctx, page, fr} = await ouvrir({'batcave-report':{date:'2026-09-15', rev:0, proj:120}}, '2026-09-15T06:00:00+02:00');
  const t = await plan(fr);
  const l = t.split('\n').filter(x=>/Projets perso —/.test(x))[0] || '(pas de ligne Projets perso)';
  console.log('       mardi 15, avec 2 h reportées dans « proj » : ' + l.trim());
  await ctx.close();
}

console.log('\n═══ 7. Repas : les calories sont proratisées aux cases cochées ═══');
{
  const {ctx, page, fr} = await ouvrir({['batcave-meals-'+JOUR]: {'0-0':true}});
  const s = await fr.evaluate(()=>{
    document.querySelector('.nav-btn[data-page="repas"]').click();
    return document.getElementById('meal-kcal-sub').textContent;
  });
  const m = s.match(/(\d+) \/ (\d+) kcal/);
  ok(m && Number(m[2]) > 3000 && Number(m[2]) < 3110, 'cible du jour ' + (m?m[2]:'?') + ' kcal (~3 051)');
  ok(m && Math.abs(Number(m[1]) - 824/5) < 2, '1 item sur 5 du petit-déjeuner (824 kcal) → ' + (m?m[1]:'?') + ' kcal (165 attendu)');
  await ctx.close();
}

console.log('\n═══ 8. Sommeil et eau : lus dans le journal du jour ═══');
{
  const {ctx, page, fr} = await ouvrir({['batcave-journal-'+JOUR]: {sommeil: 7, water: 2500}});
  const o = await objectifs(fr, page);
  const s = o.match(/Sommeil[\s\S]{0,140}?([\d,]+)\s*h/);
  const e = o.match(/Eau[\s\S]{0,140}?([\d,]+)\s*L/);
  console.log('       journal : 7 h de sommeil, 2 500 ml d\'eau');
  ok(s && s[1].replace(',','.') === '7' || s && Math.abs(Number(s[1].replace(',','.'))-7) < 0.1, 'sommeil relu : ' + (s?s[1]:'?') + ' h');
  ok(e && Math.abs(Number(e[1].replace(',','.')) - 2.5) < 0.06, 'eau relue : ' + (e?e[1]:'?') + ' L (2,5 attendu)');
  await ctx.close();
}

console.log('\n═══ 9. Budget : seules les dépenses variables entrent dans l\'objectif ═══');
{
  const tx = [
    {id:'t1', date:JOUR, type:'Dépense', montant:100, fixed:false, categorie:'Courses'},
    {id:'t2', date:JOUR, type:'Dépense', montant:500, fixed:true,  categorie:'Loyer'},
    {id:'t3', date:JOUR, type:'Revenu',  montant:900, fixed:false, categorie:'Bourse'}
  ];
  const {ctx, page, fr} = await ouvrir({'batcave-transactions': tx});
  const o = await objectifs(fr, page);
  const m = o.match(/Dépenses variables[\s\S]{0,160}?([\d\s ]+)\s*€/);
  const v = m ? Number(m[1].replace(/[\s ]/g,'')) : null;
  ok(v === 100, 'dépense variable 100 € + charge fixe 500 € + revenu 900 € → ' + v + ' € (100 attendu)');
  await ctx.close();
}

console.log('\n═══ 10. Jour 1 : aucun objectif en déficit ═══');
{
  const {ctx, page, fr} = await ouvrir({}, JOUR+'T06:00:00+02:00');
  const o = await objectifs(fr, page);
  /* la ligne de synthèse fait foi : « X/Y dans les clous ou mieux · N en retard · … » */
  const m = o.match(/(\d+)\/(\d+) dans les clous ou mieux · (\d+) en retard · (\d+) sans données · (\d+) % de la période écoulée/);
  ok(m && m[3] === '0', 'le matin du 14 : ' + (m?m[3]:'?') + ' objectif(s) en retard (0 attendu) — ' + (m?m[0]:'ligne introuvable'));
  ok(m && Number(m[5]) <= 6, 'part de période écoulée le jour 1 : ' + (m?m[5]:'?') + ' % (pas 100 %)');
  await ctx.close();
}

console.log('\n═══ 11. Le réacteur et les cellules comptent-ils la même chose ? ═══');
{
  /* Un jour où la grille prévoit À LA FOIS des blocs « Projets perso » et des blocs Español :
     à partir du 16 novembre. On fait 1 h d'espagnol et rien d'autre. */
  for(const d of ['2026-11-16','2027-02-15']){
    const {ctx, page, fr} = await ouvrir({'batcave-sessions':[
      {id:'sa', date:d, debut:Date.parse(d+'T11:20:00+02:00'), fin:Date.parse(d+'T12:20:00+02:00'),
       duree:60, type:'projet', label:'Español · gramática'}]}, d+'T21:00:00+02:00');
    const r = await fr.evaluate(()=>({
      reacteur: (document.getElementById('leg-proj')||{}).textContent || '',
      cellules: document.getElementById('dash-temps').innerText.replace(/\n/g,' ')
    }));
    const arc = (r.reacteur.match(/projets (\S[^/]*?) *\//)||[])[1];
    const cel = (r.cellules.match(/Projets perso (\S[^/]*?) *\//)||[])[1];
    ok(arc !== undefined && arc === cel, d + ' : réacteur « ' + r.reacteur.trim() + ' » vs cellule « Projets perso ' + cel + ' » — les deux doivent dire la même chose');
    await ctx.close();
  }
}

await b.close();
console.log('\n' + (err ? err + ' ERREUR(S)' : 'AUCUNE ERREUR DE CALCUL') + ' · ' + avert + ' point(s) d\'attention');
process.exit(err?1:0);
