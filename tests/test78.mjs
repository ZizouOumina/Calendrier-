/* Lot 30 — les corrections de suivi, l'adaptation aux phases et à l'agenda Google,
   le format des durées, la recherche du journal, le rattrapage unique et la voix.
   Tout est éprouvé avec des valeurs fictives connues : on met une entrée, on lit ce qui
   sort, et on compare à ce qu'on avait calculé à la main. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c,m)=>{ if(c) console.log('  ok  '+m); else { err++; console.log('  FAIL '+m); } };
async function ouvrir(seed, quand){
  const ctx = await b.newContext({viewport:{width:1440,height:1300}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(s=>{ window.claude = undefined;
    for(const [k,v] of Object.entries(s||{})) localStorage.setItem(k, JSON.stringify(v)); }, seed || {});
  const page = await ctx.newPage();
  page.on('pageerror', e=>{err++; console.log('  PAGEERROR '+e.message);});
  await page.clock.install({time:new Date(quand)});
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached',timeout:20000});
  const fr = page.frames().find(x=>x.url().includes('batcave.html'));
  await fr.evaluate(()=>document.querySelectorAll('.overlay').forEach(o=>o.hidden=true));
  await page.waitForTimeout(450);
  return {ctx, page, fr};
}
const plan   = fr => fr.evaluate(()=>document.getElementById('dash-plan').innerText);
const temps  = fr => fr.evaluate(()=>document.getElementById('dash-temps').innerText.replace(/\n/g,' | '));
const legend = fr => fr.evaluate(()=>[...document.querySelectorAll('#leg-rev,#leg-proj')].map(e=>e.textContent).join(' ‖ '));
const es = (date, min, h='11:20') => ({id:'e'+min, date, debut:Date.parse(date+'T'+h+':00+02:00'),
  fin:Date.parse(date+'T'+h+':00+02:00')+min*60000, duree:min, type:'projet', label:'Español · gramática'});

console.log('\n== 1) Le réacteur et la cellule comptent la même chose ==');
for(const [d, desc] of [['2026-11-16','phase Español 2, projets perso au programme'],
                        ['2027-02-15','phase Español 3']]){
  const {ctx, fr} = await ouvrir({'batcave-sessions':[es(d,60)]}, d+'T21:00:00+02:00');
  const l = await legend(fr), t = await temps(fr);
  const arc = (l.match(/projets ([^/‖]+)\//)||[])[1];
  const cel = (t.match(/Projets perso \| ([^|/]+)/)||[])[1];
  ok(arc && cel && arc.trim() === cel.trim(),
     d + ' : réacteur « ' + (arc||'?').trim() + ' » = cellule « ' + (cel||'?').trim() + ' » — 1 h d\'espagnol ne remplit pas les projets');
  await ctx.close();
}

console.log('\n== 2) L\'espagnol manqué est une dette d\'espagnol, pas de projets ==');
{
  const {ctx, fr} = await ouvrir({}, '2026-09-14T21:00:00+02:00');
  const t = await plan(fr);
  const l = t.split('\n').filter(x=>/Bloc manqué/.test(x) && /Español/.test(x))[0] || '';
  ok(/d'espagnol/.test(l), 'libellé : ' + (l.trim() || '(aucun bloc Español manqué)'));
  ok(!/projets perso/.test(l), 'plus jamais « projets perso » sur des blocs Español');
  await ctx.close();
}
{
  /* 2 h reportées en espagnol reviennent bien dans la cible d'espagnol du lendemain.
     Le mardi 15 prévoit 2 h 40 d'espagnol : avec 2 h de report on attend 4 h 40. */
  const {ctx, fr} = await ouvrir({'batcave-report':{date:'2026-09-15', rev:0, proj:0, es:120}}, '2026-09-15T06:00:00+02:00');
  const t = await temps(fr);
  ok(/Español \| 0 \/ 4 h 40/.test(t), 'mardi 15 : 2 h 40 au programme + 2 h reportées = 4 h 40 de cible d\'espagnol' + (/Español \| 0 \/ 4 h 40/.test(t) ? '' : ' — obtenu : ' + t));
  await ctx.close();
}

console.log('\n== 3) Un compteur pas encore au programme le dit, avec la vraie date ==');
{
  const {ctx, fr} = await ouvrir({}, '2026-09-14T09:00:00+02:00');
  const t = await temps(fr), l = await legend(fr);
  ok(/pas au programme avant le 19 oct/.test(t), 'cellule : ' + (t.match(/pas au programme[^|]*/)||['(absent)'])[0]);
  ok(/pas au programme avant le 19 oct/.test(l), 'réacteur : ' + (l.match(/projets[^‖]*/)||['(absent)'])[0].trim());
  await ctx.close();
}
{
  const {ctx, fr} = await ouvrir({}, '2026-10-19T09:00:00+02:00');
  const t = await temps(fr);
  ok(!/pas au programme/.test(t) && /Projets perso \| 0 \/ /.test(t),
     'le 19 octobre, la mention disparaît et la cible apparaît : ' + (t.match(/Projets perso[^|]*\|[^|]*/)||[''])[0].trim());
  await ctx.close();
}

console.log('\n== 4) Un rendez-vous dans l\'agenda Google n\'est pas un bloc manqué ==');
{
  /* On simule la réponse du connecteur : gcalWeekEvents est alimenté par le watch MCP,
     on l'écrit directement pour éprouver la règle sans connecteur. */
  const {ctx, page, fr} = await ouvrir({}, '2026-09-14T21:00:00+02:00');
  const avant = (await plan(fr)).split('\n').filter(l=>/Bloc manqué/.test(l)).length;
  await fr.evaluate(()=>{
    /* lundi = 1 ; deux vrais rendez-vous couvrent Anki 1 et Anki 2 */
    window.__bcSetGcal && window.__bcSetGcal({1:[['07:15','Dentiste — dents de sagesse','09:30']]});
  });
  await page.waitForTimeout(300);
  const apres = await fr.evaluate(()=>{ window.__bcRenderPlan(); return document.getElementById('dash-plan').innerText; });
  ok(/pris par ton agenda|Agenda —/.test(apres), 'la Batcave dit pourquoi ces blocs ne comptent pas : ' +
     ((apres.match(/[^\n]*(?:pris par ton agenda|📅 Agenda —)[^\n]*/)||['(absent)'])[0]).trim());
  const manqueRev = (apres.match(/Bloc manqué — ([^ ]+ ?[^ ]*) de révision/)||[])[1];
  ok(manqueRev !== undefined ? !/Anki 1/.test(apres.split('\n').filter(l=>/Bloc manqué/.test(l) && /révision/.test(l))[0]||'') : true,
     'Anki 1 et Anki 2 ne sont plus comptés comme manqués (dette révision : ' + (manqueRev||'aucune') + ')');
  ok(avant >= 1, 'sans agenda, la dette existait bien (' + avant + ' item(s))');
  await ctx.close();
}

console.log('\n== 5) Les durées s\'écrivent en heures et minutes, jamais en dixièmes ==');
{
  const {ctx, fr} = await ouvrir({'batcave-sessions':[{id:'s1',date:'2026-09-14',
    debut:Date.parse('2026-09-14T07:20:00+02:00'), fin:Date.parse('2026-09-14T08:15:00+02:00'),
    duree:55, type:'cours', label:'Anatomie'}]}, '2026-09-14T21:00:00+02:00');
  const t = await plan(fr), c = await temps(fr), l = await legend(fr);
  const ligne = t.split('\n').filter(x=>/Révision —/.test(x))[0] || '';
  ok(/Révision — 55 min sur 4 h 25 — il reste 3 h 30/.test(ligne), 'plan : ' + ligne.trim());
  ok(!/\d,\dh|\d,\d h/.test(t + c + l), 'plus une seule durée en dixièmes d\'heure sur le tableau de bord');
  ok(/55 min/.test(c), 'cellule : ' + (c.match(/Révision[^|]*\|[^|]*/)||[''])[0].trim());
  await ctx.close();
}

console.log('\n== 6) La recherche du journal ==');
{
  const {ctx, page, fr} = await ouvrir({
    'batcave-journal-2026-09-08':{notes:'Journée dure, mal au ventre toute la matinée.', mood:2, sommeil:6},
    'batcave-journal-2026-09-07':{notes:'Bonne session Anki, 120 cartes.', mood:4, sommeil:7.5},
    'batcave-journal-2026-09-05':{notes:'Ventre gonflé après le lait du matin.', mood:3}
  }, '2026-09-14T21:00:00+02:00');
  await fr.evaluate(()=>document.querySelector('.nav-btn[data-page="bilan"]').click());
  await page.waitForTimeout(400);
  const cpt = () => fr.evaluate(()=>document.getElementById('journal-hist-count').textContent);
  ok((await cpt()) === '3 journées', 'sans filtre : ' + await cpt());
  const chercher = async q => { await fr.evaluate(v=>{const c=document.getElementById('journal-recherche'); c.value=v; c.dispatchEvent(new Event('input'));}, q); await page.waitForTimeout(300); };
  await chercher('ventre');
  ok((await cpt()) === '2 sur 3 journées', '« ventre » (une majuscule, un accent) : ' + await cpt());
  ok((await fr.evaluate(()=>document.querySelectorAll('#journal-hist mark').length)) === 2, 'les deux occurrences sont surlignées');
  await chercher('septembre');
  ok((await cpt()) === '3 sur 3 journées', '« septembre » cherche aussi dans la date écrite : ' + await cpt());
  await chercher('licorne');
  ok(/Aucune journée/.test(await fr.evaluate(()=>document.getElementById('journal-hist').innerText)), 'un mot absent le dit clairement');
  await ctx.close();
}

console.log('\n== 7) Rattrapage unique après une absence ==');
{
  const {ctx, page, fr} = await ouvrir({'batcave-last-open':'2026-09-16'}, '2026-09-20T10:00:00+02:00');
  const t = await plan(fr);
  const l = t.split('\n').filter(x=>/Absence —/.test(x))[0] || '';
  ok(/3 journées sans clôture/.test(l), 'un seul item pour toute l\'absence : ' + l.trim().slice(0, 90));
  ok((t.match(/Absence —/g)||[]).length === 1, 'un seul, pas un par jour manqué');
  ok(/Rien n'a été rempli à ta place/.test(l), 'aucune donnée inventée à la place des jours manqués');
  await fr.evaluate(()=>document.querySelector('[data-plan-rattrapage]').click());
  await page.waitForTimeout(400);
  ok(!/Absence —/.test(await plan(fr)), 'une fois vu, il ne revient pas');
  await ctx.close();
}
{
  const {ctx, fr} = await ouvrir({'batcave-last-open':'2026-09-19'}, '2026-09-20T10:00:00+02:00');
  ok(!/Absence —/.test(await plan(fr)), 'ouvert hier : aucun rattrapage');
  await ctx.close();
}

console.log('\n== 8) La commande vocale ==');
{
  const {ctx, page, fr} = await ouvrir({}, '2026-09-14T12:30:00+02:00');
  const dispo = await fr.evaluate(()=>!!(window.__bcVoix && window.__bcVoix.dispo));
  if(!dispo){ ok(await fr.evaluate(()=>document.getElementById('voix-btn').hidden), 'navigateur sans reconnaissance vocale : le bouton reste masqué'); }
  else {
    const dire = async p => fr.evaluate(x=>window.__bcVoix.executer(x), p);
    ok(/Déjeuner coché/.test(await dire('coche le déjeuner') || ''), '« coche le déjeuner » → ' + await dire('coche le déjeuner'));
    const m = await fr.evaluate(()=>{document.querySelector('.nav-btn[data-page="repas"]').click(); return document.getElementById('meal-kcal-sub').textContent;});
    ok(/^(?!0 )/.test(m), 'les calories du déjeuner sont comptées : ' + m);
    ok(/Pomodoro révision/.test(await dire('lance un pomodoro') || ''), '« lance un pomodoro » → ' + await dire('lance un pomodoro'));
    ok((await dire('fais-moi un café')) === null, 'une phrase hors périmètre ne fait rien');
  }
  await ctx.close();
}
console.log('\n== 9) Une sauvegarde du vieux format : l\'espagnol ne gonfle plus la révision ==');
{
  /* Trois lignes fictives d'une sauvegarde d'avant le changement de format : type
     « espagnol », le type que plus aucun bouton ne produit. Elles doivent atterrir dans
     Español, pas dans la révision — et être réécrites au format actuel. */
  const D = '2026-11-16';   /* phase 2 : la grille prévoit à la fois des projets et de l'espagnol */
  const vieille = (h, min, quoi) => ({id:'v'+h, date:D, debut:Date.parse(D+'T'+h+':00:00+01:00'),
    fin:Date.parse(D+'T'+h+':00:00+01:00')+min*60000, duree:min, type:'espagnol', label:quoi});
  const {ctx, page, fr} = await ouvrir({'batcave-sessions':[
    vieille('11', 60, 'Conversation'), vieille('13', 30, 'Español · annales'), vieille('16', 30, '')
  ]}, D+'T21:00:00+01:00');
  const t = await temps(fr);
  const cel = (nom) => (t.match(new RegExp(nom + ' \\| ([^|]+)'))||[])[1] || '';
  ok(/^\s*0/.test(cel('Révision')), 'la révision reste à zéro : ' + cel('Révision').trim());
  ok(/2 h/.test(cel('Español')), 'les 2 h atterrissent dans Español : ' + cel('Español').trim());
  ok(/^\s*0/.test(cel('Projets perso')), 'et pas dans les projets perso : ' + cel('Projets perso').trim());

  /* la normalisation a réécrit les lignes au format actuel, une fois pour toutes */
  const apres = await fr.evaluate(()=>JSON.parse(localStorage.getItem('batcave-sessions')||'[]'));
  ok(apres.length === 3 && apres.every(x => x.type === 'projet'), 'les trois lignes sont passées en « projet » : ' + apres.map(x=>x.type).join(', '));
  ok(apres.every(x => /^Español/.test(x.label)), 'et leur libellé commence par « Español » : ' + apres.map(x=>x.label).join(' · '));
  ok(apres.filter(x => x.label === 'Español · annales').length === 1, 'un libellé déjà correct n\'est pas préfixé deux fois');
  ok(apres.filter(x => x.label === 'Español · Conversación').length === 1, 'un libellé vide reçoit un nom lisible');

  /* et la répartition par tâche du panneau Español les voit */
  const parTache = await fr.evaluate(()=>{ document.querySelector('.nav-btn[data-page="etudes"]').click();
                                           return document.getElementById('es-taches-7').innerText.replace(/\s+/g,' '); });
  ok(/Conversation/.test(parTache) && /annales/.test(parTache), 'le panneau Español les répartit par tâche : ' + parTache.slice(0, 80));

  /* le vérificateur de cohérence ne doit rien signaler une fois normalisé */
  const reste = await fr.evaluate(()=>JSON.parse(localStorage.getItem('batcave-sessions')||'[]').filter(x=>x.type==='espagnol').length);
  ok(reste === 0, 'plus aucune ligne au vieux format (' + reste + ')');
  await ctx.close();
}

await b.close();
console.log(err? '\n'+err+' ECHEC(S)' : '\nTOUT VERT');
process.exit(err?1:0);
