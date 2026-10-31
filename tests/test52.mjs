/* Rappels Google Calendar : un événement par bloc et par jour, sans doublon, avec un connecteur simulé
   qui répond avec les formes observées en session (create/update/delete renvoient l'événement). */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

const MOCK = () => {
  window.__appels = [];
  window.__gcalEvents = window.__gcalEvents || [];
  let n = 0;
  const mcp = {
    callTool(server, tool, input){
      window.__appels.push({server, tool, input});
      if(server !== 'Google Calendar') return Promise.resolve({content:[], payload:{}});
      if(tool === 'list_events'){
        const a = new Date(input.startTime).getTime(), z = new Date(input.endTime).getTime();
        return Promise.resolve({content:[], payload:{events: window.__gcalEvents.filter(e => { const t = new Date(e.start.dateTime).getTime(); return t >= a && t <= z && e.status !== 'cancelled'; })}});
      }
      if(tool === 'create_event'){
        const ev = {id:'ev' + (++n), summary: input.summary, description: input.description, start:{dateTime: input.startTime, timeZone:'Europe/Madrid'}, end:{dateTime: input.endTime, timeZone:'Europe/Madrid'}, status:'confirmed', overrideReminders: input.overrideReminders};
        window.__gcalEvents.push(ev);
        return Promise.resolve({content:[], payload: ev});
      }
      if(tool === 'update_event'){
        const ev = window.__gcalEvents.find(e => e.id === input.eventId);
        if(ev){ if(input.summary) ev.summary = input.summary; if('description' in input) ev.description = input.description; if(input.startTime) ev.start.dateTime = input.startTime; if(input.endTime) ev.end.dateTime = input.endTime; }
        return Promise.resolve({content:[], payload: ev || {id: input.eventId}});
      }
      if(tool === 'delete_event'){
        const ev = window.__gcalEvents.find(e => e.id === input.eventId);
        if(ev) ev.status = 'cancelled';
        return Promise.resolve({content:[], payload: ev || {id: input.eventId, status:'cancelled'}});
      }
      return Promise.resolve({content:[], payload:{}});
    },
    watchTool(server, tool, input, handler){ Promise.resolve().then(() => handler({type:'error', error:{code:'server_not_connected', message:'x'}})); return () => {}; },
    invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
};

async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK);
  if(local) await ctx.addInitScript(x => { if(sessionStorage.getItem('__a52')) return; sessionStorage.setItem('__a52','1'); Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelector('.nav-btn[data-page="agenda"]').click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const local = (fr,k) => fr.evaluate(x => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))(x) || 'null'), k);
const appels = (fr, tool) => fr.evaluate(t => window.__appels.filter(a => a.tool === t), tool);
/* mardi 15 sept 06:30 : Sport 05:30 déjà commencé (la Douche démarre à 06:30 pile) ; il reste 19 blocs sur 20 ; mercredi : 20 */
/* Un MARDI a l'interieur du programme, et son lendemain mercredi. C'etait le 22
   septembre, jour 1 a l'epoque ; le depart est passe au mercredi 23 le soir du 22, et le
   22 s'est retrouve AVANT le programme -- ou la Batcave n'ecrit rien du tout dans
   l'agenda (c'est la regle testee au bloc 310 de test74). Le mardi 29 porte la meme
   grille : meme jour de semaine, meme phase Español, meme semestre. */
/* 30 septembre au soir, le jour 1 passe au jeudi 1er octobre : le mardi 29 se retrouve
   AVANT le programme. Le mardi de reference devient le 6 octobre -- meme grille (regime
   combat, Muay Thai le soir), meme phase Español, et la fenetre de 75 jours garde les
   memes jours sans cours : les comptes ne bougent pas (113). */
/* 12 octobre, le jour 1 passe au mardi 13 : le mardi 6 se retrouve AVANT le programme. Le
   mardi de reference devient le 13, jour 1 lui-meme -- meme grille (regime combat, sans JJB
   jusqu'au 26), meme phase Español. */
/* 14 octobre, le jour 1 passe au jeudi 15 : le mardi 13 se retrouve avant le programme. Le mardi
   de reference devient le 20 -- meme grille (regime combat, sans JJB jusqu'au 26), meme phase. */
const MARDI = '2026-11-03T06:30:00+01:00';   /* 31 octobre : jour 1 au dimanche 1er novembre -- le premier mardi du programme */

console.log('\n== 170) Désactivé par défaut, panneau visible avec le connecteur ==');
{
  const { ctx, fr } = await ouvrir(MARDI);
  const p = await fr.evaluate(() => ({ visible: !document.getElementById('gcal-panel').hidden, txt: document.getElementById('gcal-toggle').textContent, statut: document.getElementById('gcal-statut').textContent }));
  ok(p.visible && /Activer/.test(p.txt) && p.statut === 'désactivé', 'panneau : ' + p.txt + ' · ' + p.statut);
  const n = (await appels(fr, 'create_event')).length;
  ok(n === 0, 'rien n\'est écrit tant que l\'option est éteinte (' + n + ' création)');
  await ctx.close();
}

console.log('\n== 171) Activer : un événement par bloc, aujourd\'hui (restants) et demain ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI);
  await fr.evaluate(() => document.getElementById('gcal-toggle').click());
  await page.waitForTimeout(600);
  const crees = await appels(fr, 'create_event');
  /* 43 → 41 depuis que le bloc « Cours » n'est plus pousse dans l'agenda : les vrais cours
     y sont deja, avec la matiere et la salle, importes du portail de la fac. Un par jour.
     41 → 82 depuis que les JOURS SANS COURS partent d'avance : au mardi 22 septembre, la
     fenetre de 75 jours en contient deux, le 9 et le 12 octobre. Sans eux, ces journees
     n'auraient porte la bonne grille que la veille de chacune.
     Le bloc « Temps libre » de 21:10 a ete supprime des grilles de semaine (le coucher
     descend a 21:35). Sur un jour TRAVAILLE, « Temps libre » part bien dans l'agenda -- il
     y marque la frontiere de fin de travail -- donc le mercredi perd un evenement. Le
     mardi garde ses 22 blocs : sa soiree n'a pas de temps libre mais un bloc « Projets
     perso 6 », et son coucher reste a 22:00.
     Le jour de reference est passe du 22 au 29 septembre (le 22 est desormais AVANT le
     depart du programme, ou rien n'est ecrit). La fenetre de 75 jours glisse donc d'une
     semaine et contient un JOUR SANS COURS de plus, le 8 decembre. Cinq jours au lieu de
     quatre. La composition, a recalculer si une grille bouge :
       22 (mardi 29, dont 1 deja commence) + 19 (mercredi 30) + 20 (9 oct.) + 19 (12 oct.)
       + 20 (8 dec.) = 100 blocs, moins le bloc deja commence = 99 crees. Les jours sans cours
       ont perdu un bloc le 24 septembre : la Collation soir est sortie du plan (le mardi et
       le mercredi, elle est devenue du Temps libre -- meme nombre de blocs). */
  /* Regime combat (28 septembre) : 22 (mardi 29, dont 1 deja commence) + 21 (mercredi 30) + 22 (9 oct.)
     + 21 (12 oct.) + 23 (8 dec., Muay Thai le soir) = 109 blocs, moins le bloc commence = 108,
     plus le rappel de cloture du soir sur chacun des 5 jours (lot 50) = 113. */
  /* 12 octobre, mardi de reference au 13 : la fenetre de 75 jours va jusqu'au 27 decembre et
     contient quatre jours sans cours -- le 8 decembre et les 23, 24 et 25 (vacances de Noel).
     19 (mardi 13, la cloture comprise, moins le Sport deja commence) + 20 (mercredi 14) + 21
     (8 dec.) + 23 (23 dec.) + 21 (24 dec.) + 23 (25 dec.) = 127. Six journees poussees. */
  /* 14 octobre, mardi de reference au 20 : la fenetre de 75 jours va jusqu'au 3 janvier et
     contient neuf jours sans cours -- le 8 decembre, puis les jours de semaine des vacances de
     Noel (23, 24, 25, 28, 29, 30, 31 decembre, 1er janvier). 19 (mardi 20, la cloture comprise,
     moins le Sport deja commence) + 20 (mercredi 21) + 21 + 23 + 21 + 23 + 22 + 21 + 23 + 21 + 23
     = 237. Onze journees poussees.
     19 octobre, la soiree du sommeil : la douche passe a 20:45, l'ecran off a 21:00 et les
     dents a 21:30 -- deux blocs de plus le mardi 20 (21), un le mercredi 21 (21, le temps
     libre de 21:10 sort), et ainsi de suite : 258.
     21 octobre : jour 1 au mercredi 21 -- le mardi 20 est avant le depart, et le 21 suit le plan
     sommeil. Le mardi de reference passe au 27 (heure d'hiver : +01:00) : la fenetre de 75 jours
     va jusqu'au 10 janvier et contient douze jours sans cours (le 8 decembre, les jours de semaine
     des vacances de Noel, puis les 4, 5 et 6 janvier). 22 (mardi 27, la piscine comprise, moins le
     Sport deja commence) + 23 (mercredi 28, premier JJB) + 23 + 25 + 23 + 25 + 24 + 23 + 25 + 23
     + 25 + 24 + 23 + 25 = 333. Quatorze journees poussees.
     30 octobre : la salle ouvre a 07:00 (SALLE_HORAIRES_DEBUT) -- les jours de muscu de la fenetre
     (8 decembre, 24, 28, 29 et 31 decembre, 4 et 5 janvier) gagnent le trajet et le retour de la
     salle : 7 x 2 = 14 de plus, 347.
     31 octobre : jour 1 au dimanche 1er novembre -- le mardi de reference passe au 3 novembre ; la
     fenetre de 75 jours va jusqu'au 17 janvier et contient les memes douze jours sans cours. 23 (mardi 3,
     la cloture comprise, moins Anki 1 deja commence a 05:30) + 23 (mercredi 4) + 25 (8 dec.) + 25 + 25
     + 25 (23-25 dec.) + 26 (28 dec., muscu) + 25 + 25 + 25 + 25 (29 dec.-1er janv.) + 26 (4 janv.) + 25
     + 25 = 348. Quatorze journees poussees. */
  ok(crees.length === 348, '348 événements créés : mardi 3 et mercredi 4, plus le 8 décembre et les jours de semaine des vacances de Noël (jours sans cours de la fenêtre), et la clôture de chaque soir (' + crees.length + ')');
  /* Anki 1 (05:30) a commence a 06:30 : il n'est pas envoye. Anki 2, a 09:00, l'est. */
  const rev1 = crees.find(c => c.input.summary === '🦇 Anki 2' && c.input.startTime.startsWith('2026-11-03'));
  ok(!!rev1 && rev1.input.startTime === '2026-11-03T09:00:00+01:00' && rev1.input.endTime === '2026-11-03T10:00:00+01:00', 'Anki 2 : 09:00 → 10:00 heure de Madrid (' + (rev1 && rev1.input.startTime) + ')');
  ok(!!rev1 && rev1.input.overrideReminders[0].minutes === 5 && rev1.input.timeZone === 'Europe/Madrid' && rev1.input.calendarId === 'zizou.oumina@gmail.com', 'rappel 5 min avant, fuseau et agenda précisés');
  const coucher = crees.find(c => /Coucher/.test(c.input.summary) && c.input.startTime.startsWith('2026-11-03'));
  ok(!!coucher && coucher.input.summary === '🦇 Coucher' && coucher.input.startTime === '2026-11-03T21:35:00+01:00' && coucher.input.overrideReminders[0].minutes === 30 && coucher.input.availability === 'AVAILABILITY_FREE' && /Écran off/.test(coucher.input.description), 'Coucher 21:35 (même titre que ton agenda), rappel 30 min, écran off en description, n\'occupe pas l\'agenda');
  const ankiDemain = crees.find(c => /Anki matinal/.test(c.input.summary));
  ok(!!ankiDemain && ankiDemain.input.startTime === '2026-11-04T05:30:00+01:00' && ankiDemain.input.endTime === '2026-11-04T06:30:00+01:00', 'mercredi (jour off) : Anki matinal de demain 05:30 → 06:30');
  const r8 = await local(fr, 'batcave-gcal-2026-11-03'), r9 = await local(fr, 'batcave-gcal-2026-11-04');
  ok(r8 && Object.keys(r8).length === 23 && r9 && Object.keys(r9).length === 23 && Object.values(r8).every(x => x.id && x.empreinte && x.cree === true), 'relevés locaux : 23 + 23 blocs (la clôture comprise) avec id, empreinte et marque « créé par la Batcave »');
  const opt = await local(fr, 'batcave-gcal-ecriture');
  ok(opt && opt.actif === true && opt.bilan && opt.bilan.crees === 348 && opt.bilan.passes === 1, 'option active, bilan : 348 créés, 1 déjà commencé non envoyé');
  const lus = await appels(fr, 'list_events');
  ok(lus.length === 14, 'chaque journée poussée est relue dans Google avant l\'envoi (' + lus.length + ' lectures pour 14 jours)');
  /* second envoi : rien à créer */
  await fr.evaluate(() => document.getElementById('gcal-pousser').click());
  await page.waitForTimeout(400);
  const crees2 = await appels(fr, 'create_event');
  ok(crees2.length === 348, '« Pousser maintenant » ne recrée rien (' + crees2.length + ')');
  const det = await fr.evaluate(() => document.getElementById('gcal-detail').textContent);
  ok(/348 inchangés/.test(det), 'détail : ' + det.slice(0, 90));
  /* relevé local perdu (autre appareil) : les événements présents sont adoptés, pas doublés */
  await fr.evaluate(() => localStorage.removeItem('batcave-gcal-2026-11-04'));
  await fr.evaluate(() => document.getElementById('gcal-pousser').click());
  await page.waitForTimeout(400);
  const crees3 = await appels(fr, 'create_event');
  const r9b = await local(fr, 'batcave-gcal-2026-11-04');
  ok(crees3.length === 348 && r9b && Object.keys(r9b).length === 23 && Object.values(r9b).every(x => x.cree === false), 'sans relevé local, les 23 événements de demain sont reconnus et adoptés (marqués « pas créés par la Batcave »), aucun doublon');
  const opt2 = await local(fr, 'batcave-gcal-ecriture');
  ok(opt2.bilan.adoptes === 23, 'bilan : 23 adoptés (la clôture comprise)');
  /* désactiver retire les rappels envoyés */
  await fr.evaluate(() => document.getElementById('gcal-toggle').click());
  await page.waitForTimeout(500);
  const sup = await appels(fr, 'delete_event');
  /* Le retrait balaie TOUS les releves poses, pas seulement aujourd'hui et demain : depuis
     que les jours sans cours partent d'avance, un releve peut porter sur une date lointaine.
     21 (mardi 29) + 20 (9 oct.) + 19 (12 oct.) + 20 (8 dec.) = 80. Ceux du mercredi,
     adoptes au tour precedent donc marques « pas crees par la Batcave », restent. */
  ok(sup.length === 325, 'désactiver ne retire que ce que la Batcave a créé, sur TOUS les jours poussés (348 − les 23 adoptés du mercredi) — ' + sup.length);
  const r8c = await local(fr, 'batcave-gcal-2026-11-03');
  ok(r8c === null && (await local(fr, 'batcave-gcal-ecriture')).actif === false, 'relevés effacés, option éteinte');
  await ctx.close();
}

console.log('\n== 172) Option active au démarrage : envoi automatique ; bloc déplacé → mise à jour ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, {'batcave-gcal-ecriture': {actif:true, depuis:'2026-09-14'},
    'batcave-gcal-2026-11-03': {'p6': {id:'ancien1', empreinte:'2026-11-03T08:40:00+01:00|2026-11-03T09:40:00+01:00|🦇 Anki 2'}}});
  await page.clock.runFor(7000);
  await page.waitForTimeout(600);
  const maj = await appels(fr, 'update_event');
  ok(maj.length === 1 && maj[0].input.eventId === 'ancien1' && maj[0].input.startTime === '2026-11-03T09:00:00+01:00', 'le bloc dont l\'heure a changé est mis à jour, pas recréé');
  const crees = await appels(fr, 'create_event');
  ok(crees.length === 347, 'les 347 autres sont créés au démarrage (' + crees.length + ')');
  const st = await fr.evaluate(() => document.getElementById('gcal-statut').textContent);
  ok(/actif · dernier envoi/.test(st), 'statut : ' + st);
  await ctx.close();
}

console.log('\n== 172b) Ton agenda porte déjà le planning en événements récurrents : adoptés, jamais doublés ==');
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => {
    window.__gcalEvents = [
      {id:'rec1_20260908', recurringEventId:'rec1', summary:'🦇 Anki 2', start:{dateTime:'2026-11-03T09:00:00+01:00'}, end:{dateTime:'2026-11-03T10:00:00+01:00'}, status:'confirmed'},
      {id:'rec2_20260908', recurringEventId:'rec2', summary:'🦇 Coucher', start:{dateTime:'2026-11-03T21:00:00+01:00'}, end:{dateTime:'2026-11-03T21:15:00+01:00'}, status:'confirmed'},
      {id:'rec3_20260908', recurringEventId:'rec3', summary:'🦇 Déjeuner', start:{dateTime:'2026-11-03T12:35:00+01:00'}, end:{dateTime:'2026-11-03T12:55:00+01:00'}, status:'confirmed', description:'Réchauffage — repas préparés le dimanche.'}
    ];
  });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(MARDI) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelector('.nav-btn[data-page="agenda"]').click(); });
  await page.waitForTimeout(400);
  await fr.evaluate(() => document.getElementById('gcal-toggle').click());
  await page.waitForTimeout(600);
  const crees = await appels(fr, 'create_event'), maj = await appels(fr, 'update_event');
  ok(!crees.some(c => c.input.summary === '🦇 Anki 2' && c.input.startTime.startsWith('2026-11-03')), 'Anki 2 de mardi, déjà là à la bonne heure : adopté, pas recréé');
  ok(!crees.some(c => c.input.summary === '🦇 Coucher' && c.input.startTime.startsWith('2026-11-03')) && maj.some(m => m.input.eventId === 'rec2_20260908' && m.input.startTime === '2026-11-03T21:35:00+01:00'), 'Coucher déjà là à 21:00 : l\'instance est alignée sur le planning (21:35), pas doublée');
  ok(maj.some(m => m.input.eventId === 'rec1' && m.input.overrideReminders && m.input.overrideReminders[0].minutes === 5) && maj.some(m => m.input.eventId === 'rec2' && m.input.overrideReminders[0].minutes === 30), 'les rappels manquants sont posés sur la SÉRIE récurrente : 5 min (révision), 30 min (coucher)');
  ok(crees.length === 345, '345 créations seulement (348 − 3 adoptés)');
  /* 31 octobre : la description d'une serie de septembre (« Réchauffage — repas préparés le dimanche. »)
     ne reste pas sur l'instance du jour : elle reprend la consigne du jour. */
  ok(maj.some(m => m.input.eventId === 'rec3_20260908' && /Le riz du midi/.test(m.input.description || '')), 'le déjeuner adopté reprend la consigne du jour, pas la description de septembre');
  const r8 = await local(fr, 'batcave-gcal-2026-11-03');
  ok(r8 && r8['p6'] && r8['p6'].id === 'rec1_20260908' && r8['p6'].cree === false, 'le relevé pointe sur l\'instance récurrente adoptée, marquée « pas créée par la Batcave »');
  /* désactiver : les 3 événements adoptés (les tiens) restent, seuls les 38 créés partent */
  await fr.evaluate(() => document.getElementById('gcal-toggle').click());
  await page.waitForTimeout(700);
  const sup = await appels(fr, 'delete_event');
  ok(sup.length === 345 && !sup.some(d => /^rec/.test(d.input.eventId)), 'désactiver retire les 345 créés et jamais tes événements adoptés (' + sup.length + ')');
  await ctx.close();
}

console.log('\n== 173) Nettoyage des vestiges et bannière de cohérence ==');
{
  const { ctx, fr } = await ouvrir(MARDI, {'batcave-matieres': [{annales:[], ressenti:null}, {annales:[], ressenti:null}], 'batcave-gcal-ecriture': true});
  const m = await local(fr, 'batcave-matieres'), g = await local(fr, 'batcave-gcal-ecriture');
  ok(m === null && g === null, 'matières vides et ancien drapeau booléen retirés au démarrage');
  const banniere = await fr.evaluate(() => document.getElementById('coherence-banner').hidden);
  ok(banniere === true, 'plus de bannière d\'incohérence');
  await ctx.close();
  const o = await ouvrir(MARDI, {'batcave-matieres': [{annales:['2025 : QCM 1'], ressenti:'dur'}]});
  const m2 = await local(o.fr, 'batcave-matieres');
  const b2 = await o.fr.evaluate(() => ({ cache: document.getElementById('coherence-banner').hidden, txt: document.getElementById('coherence-liste').innerText }));
  ok(Array.isArray(m2) && m2.length === 1 && b2.cache === false && /batcave-matieres/.test(b2.txt), 'des matières avec des données sont gardées et signalées, jamais effacées');
  await o.ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
