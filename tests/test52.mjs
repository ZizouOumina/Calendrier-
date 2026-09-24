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
        const ev = {id:'ev' + (++n), summary: input.summary, start:{dateTime: input.startTime, timeZone:'Europe/Madrid'}, end:{dateTime: input.endTime, timeZone:'Europe/Madrid'}, status:'confirmed', overrideReminders: input.overrideReminders};
        window.__gcalEvents.push(ev);
        return Promise.resolve({content:[], payload: ev});
      }
      if(tool === 'update_event'){
        const ev = window.__gcalEvents.find(e => e.id === input.eventId);
        if(ev){ if(input.summary) ev.summary = input.summary; if(input.startTime) ev.start.dateTime = input.startTime; if(input.endTime) ev.end.dateTime = input.endTime; }
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
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const appels = (fr, tool) => fr.evaluate(t => window.__appels.filter(a => a.tool === t), tool);
/* mardi 15 sept 06:30 : Sport 05:30 déjà commencé (la Douche démarre à 06:30 pile) ; il reste 19 blocs sur 20 ; mercredi : 20 */
/* Un MARDI a l'interieur du programme, et son lendemain mercredi. C'etait le 22
   septembre, jour 1 a l'epoque ; le depart est passe au mercredi 23 le soir du 22, et le
   22 s'est retrouve AVANT le programme -- ou la Batcave n'ecrit rien du tout dans
   l'agenda (c'est la regle testee au bloc 310 de test74). Le mardi 29 porte la meme
   grille : meme jour de semaine, meme phase Español, meme semestre. */
const MARDI = '2026-09-29T06:30:00+02:00';

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
  ok(crees.length === 113, '113 événements créés : mardi et mercredi, plus les 9 oct., 12 oct. et 8 déc., et la clôture de chaque soir (' + crees.length + ')');
  const rev1 = crees.find(c => c.input.summary === '🦇 Anki 1' && c.input.startTime.startsWith('2026-09-29'));
  ok(!!rev1 && rev1.input.startTime === '2026-09-29T07:20:00+02:00' && rev1.input.endTime === '2026-09-29T08:20:00+02:00', 'Anki 1 : 07:20 → 08:20 heure de Madrid (' + (rev1 && rev1.input.startTime) + ')');
  ok(!!rev1 && rev1.input.overrideReminders[0].minutes === 5 && rev1.input.timeZone === 'Europe/Madrid' && rev1.input.calendarId === 'zizou.oumina@gmail.com', 'rappel 5 min avant, fuseau et agenda précisés');
  const coucher = crees.find(c => /Coucher/.test(c.input.summary) && c.input.startTime.startsWith('2026-09-29'));
  ok(!!coucher && coucher.input.summary === '🦇 Coucher' && coucher.input.startTime === '2026-09-29T22:00:00+02:00' && coucher.input.overrideReminders[0].minutes === 30 && coucher.input.availability === 'AVAILABILITY_FREE' && /Écran off/.test(coucher.input.description), 'Coucher 22:00 (même titre que ton agenda), rappel 30 min, écran off en description, n\'occupe pas l\'agenda');
  const ankiDemain = crees.find(c => /Anki matinal/.test(c.input.summary));
  ok(!!ankiDemain && ankiDemain.input.startTime === '2026-09-30T05:30:00+02:00' && ankiDemain.input.endTime === '2026-09-30T06:30:00+02:00', 'mercredi (jour off) : Anki matinal de demain 05:30 → 06:30');
  const r8 = await local(fr, 'batcave-gcal-2026-09-29'), r9 = await local(fr, 'batcave-gcal-2026-09-30');
  ok(r8 && Object.keys(r8).length === 22 && r9 && Object.keys(r9).length === 22 && Object.values(r8).every(x => x.id && x.empreinte && x.cree === true), 'relevés locaux : 22 + 22 blocs (la clôture comprise) avec id, empreinte et marque « créé par la Batcave »');
  const opt = await local(fr, 'batcave-gcal-ecriture');
  ok(opt && opt.actif === true && opt.bilan && opt.bilan.crees === 113 && opt.bilan.passes === 1, 'option active, bilan : 113 créés, 1 déjà commencé non envoyé');
  const lus = await appels(fr, 'list_events');
  ok(lus.length === 5, 'chaque journée poussée est relue dans Google avant l\'envoi (' + lus.length + ' lectures pour 5 jours)');
  /* second envoi : rien à créer */
  await fr.evaluate(() => document.getElementById('gcal-pousser').click());
  await page.waitForTimeout(400);
  const crees2 = await appels(fr, 'create_event');
  ok(crees2.length === 113, '« Pousser maintenant » ne recrée rien (' + crees2.length + ')');
  const det = await fr.evaluate(() => document.getElementById('gcal-detail').textContent);
  ok(/113 inchangés/.test(det), 'détail : ' + det.slice(0, 90));
  /* relevé local perdu (autre appareil) : les événements présents sont adoptés, pas doublés */
  await fr.evaluate(() => localStorage.removeItem('batcave-gcal-2026-09-30'));
  await fr.evaluate(() => document.getElementById('gcal-pousser').click());
  await page.waitForTimeout(400);
  const crees3 = await appels(fr, 'create_event');
  const r9b = await local(fr, 'batcave-gcal-2026-09-30');
  ok(crees3.length === 113 && r9b && Object.keys(r9b).length === 22 && Object.values(r9b).every(x => x.cree === false), 'sans relevé local, les 22 événements de demain sont reconnus et adoptés (marqués « pas créés par la Batcave »), aucun doublon');
  const opt2 = await local(fr, 'batcave-gcal-ecriture');
  ok(opt2.bilan.adoptes === 22, 'bilan : 22 adoptés (la clôture comprise)');
  /* désactiver retire les rappels envoyés */
  await fr.evaluate(() => document.getElementById('gcal-toggle').click());
  await page.waitForTimeout(500);
  const sup = await appels(fr, 'delete_event');
  /* Le retrait balaie TOUS les releves poses, pas seulement aujourd'hui et demain : depuis
     que les jours sans cours partent d'avance, un releve peut porter sur une date lointaine.
     21 (mardi 29) + 20 (9 oct.) + 19 (12 oct.) + 20 (8 dec.) = 80. Ceux du mercredi,
     adoptes au tour precedent donc marques « pas crees par la Batcave », restent. */
  ok(sup.length === 91, 'désactiver ne retire que ce que la Batcave a créé, sur TOUS les jours poussés (113 − les 22 adoptés du mercredi) — ' + sup.length);
  const r8c = await local(fr, 'batcave-gcal-2026-09-29');
  ok(r8c === null && (await local(fr, 'batcave-gcal-ecriture')).actif === false, 'relevés effacés, option éteinte');
  await ctx.close();
}

console.log('\n== 172) Option active au démarrage : envoi automatique ; bloc déplacé → mise à jour ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, {'batcave-gcal-ecriture': {actif:true, depuis:'2026-09-14'},
    'batcave-gcal-2026-09-29': {'p3': {id:'ancien1', empreinte:'2026-09-29T07:00:00+02:00|2026-09-29T08:00:00+02:00|🦇 Anki 1'}}});
  await page.clock.runFor(7000);
  await page.waitForTimeout(600);
  const maj = await appels(fr, 'update_event');
  ok(maj.length === 1 && maj[0].input.eventId === 'ancien1' && maj[0].input.startTime === '2026-09-29T07:20:00+02:00', 'le bloc dont l\'heure a changé est mis à jour, pas recréé');
  const crees = await appels(fr, 'create_event');
  ok(crees.length === 112, 'les 112 autres sont créés au démarrage (' + crees.length + ')');
  const st = await fr.evaluate(() => document.getElementById('gcal-statut').textContent);
  ok(/actif · dernier envoi/.test(st), 'statut : ' + st);
  await ctx.close();
}

console.log('\n== 172b) Ton agenda porte déjà le planning en événements récurrents : adoptés, jamais doublés ==');
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => {
    window.__gcalEvents = [
      {id:'rec1_20260908', recurringEventId:'rec1', summary:'🦇 Anki 1', start:{dateTime:'2026-09-29T07:20:00+02:00'}, end:{dateTime:'2026-09-29T08:20:00+02:00'}, status:'confirmed'},
      {id:'rec2_20260908', recurringEventId:'rec2', summary:'🦇 Coucher', start:{dateTime:'2026-09-29T21:00:00+02:00'}, end:{dateTime:'2026-09-29T21:15:00+02:00'}, status:'confirmed'},
      {id:'rec3_20260908', recurringEventId:'rec3', summary:'🦇 Déjeuner', start:{dateTime:'2026-09-29T12:35:00+02:00'}, end:{dateTime:'2026-09-29T12:55:00+02:00'}, status:'confirmed'}
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
  ok(!crees.some(c => c.input.summary === '🦇 Anki 1' && c.input.startTime.startsWith('2026-09-29')), 'Anki 1 de mardi, déjà là à la bonne heure : adopté, pas recréé');
  ok(!crees.some(c => c.input.summary === '🦇 Coucher' && c.input.startTime.startsWith('2026-09-29')) && maj.some(m => m.input.eventId === 'rec2_20260908' && m.input.startTime === '2026-09-29T22:00:00+02:00'), 'Coucher déjà là à 21:00 : l\'instance est alignée sur le planning (22:00), pas doublée');
  ok(maj.some(m => m.input.eventId === 'rec1' && m.input.overrideReminders && m.input.overrideReminders[0].minutes === 5) && maj.some(m => m.input.eventId === 'rec2' && m.input.overrideReminders[0].minutes === 30), 'les rappels manquants sont posés sur la SÉRIE récurrente : 5 min (révision), 30 min (coucher)');
  ok(crees.length === 110, '110 créations seulement (113 − 3 adoptés)');
  const r8 = await local(fr, 'batcave-gcal-2026-09-29');
  ok(r8 && r8['p3'] && r8['p3'].id === 'rec1_20260908' && r8['p3'].cree === false, 'le relevé pointe sur l\'instance récurrente adoptée, marquée « pas créée par la Batcave »');
  /* désactiver : les 3 événements adoptés (les tiens) restent, seuls les 38 créés partent */
  await fr.evaluate(() => document.getElementById('gcal-toggle').click());
  await page.waitForTimeout(700);
  const sup = await appels(fr, 'delete_event');
  ok(sup.length === 110 && !sup.some(d => /^rec/.test(d.input.eventId)), 'désactiver retire les 110 créés et jamais tes événements adoptés (' + sup.length + ')');
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
