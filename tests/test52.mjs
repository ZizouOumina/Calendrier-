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
/* mardi 8 sept 06:30 : Sport 05:00 déjà passé ; il reste Révision ×3, Projets ×2, Coucher = 6 ; mercredi : 7 */
const MARDI = '2026-09-08T06:30:00+02:00';

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
  ok(crees.length === 13, '13 événements créés : 6 pour mardi (le sport de 05:00 est passé) + 7 pour mercredi (' + crees.length + ')');
  const rev1 = crees.find(c => c.input.summary === '🦇 Révision Bloc 1' && c.input.startTime.startsWith('2026-09-08'));
  ok(!!rev1 && rev1.input.startTime === '2026-09-08T07:20:00+02:00' && rev1.input.endTime === '2026-09-08T09:20:00+02:00', 'Révision Bloc 1 : 07:20 → 09:20 heure de Madrid (' + (rev1 && rev1.input.startTime) + ')');
  ok(!!rev1 && rev1.input.overrideReminders[0].minutes === 5 && rev1.input.timeZone === 'Europe/Madrid' && rev1.input.calendarId === 'zizou.oumina@gmail.com', 'rappel 5 min avant, fuseau et agenda précisés');
  const coucher = crees.find(c => /Coucher/.test(c.input.summary) && c.input.startTime.startsWith('2026-09-08'));
  ok(!!coucher && coucher.input.startTime === '2026-09-08T21:30:00+02:00' && coucher.input.overrideReminders[0].minutes === 30 && coucher.input.availability === 'AVAILABILITY_FREE', 'Coucher 21:30, rappel 30 min (écran off), n\'occupe pas l\'agenda');
  const sportDemain = crees.find(c => /Sport/.test(c.input.summary));
  ok(!!sportDemain && sportDemain.input.startTime === '2026-09-09T05:00:00+02:00' && sportDemain.input.endTime === '2026-09-09T06:00:00+02:00', 'Sport de demain 05:00 → 06:00');
  const r8 = await local(fr, 'batcave-gcal-2026-09-08'), r9 = await local(fr, 'batcave-gcal-2026-09-09');
  ok(r8 && Object.keys(r8).length === 6 && r9 && Object.keys(r9).length === 7 && Object.values(r8).every(x => x.id && x.empreinte), 'relevés locaux : 6 + 7 blocs avec id et empreinte');
  const opt = await local(fr, 'batcave-gcal-ecriture');
  ok(opt && opt.actif === true && opt.bilan && opt.bilan.crees === 13 && opt.bilan.passes === 1, 'option active, bilan : 13 créés, 1 déjà commencé non envoyé');
  const lus = await appels(fr, 'list_events');
  ok(lus.length === 2, 'la journée est relue dans Google avant chaque envoi (' + lus.length + ' lectures)');
  /* second envoi : rien à créer */
  await fr.evaluate(() => document.getElementById('gcal-pousser').click());
  await page.waitForTimeout(400);
  const crees2 = await appels(fr, 'create_event');
  ok(crees2.length === 13, '« Pousser maintenant » ne recrée rien (' + crees2.length + ')');
  const det = await fr.evaluate(() => document.getElementById('gcal-detail').textContent);
  ok(/13 inchangés/.test(det), 'détail : ' + det.slice(0, 90));
  /* relevé local perdu (autre appareil) : les événements présents sont adoptés, pas doublés */
  await fr.evaluate(() => localStorage.removeItem('batcave-gcal-2026-09-09'));
  await fr.evaluate(() => document.getElementById('gcal-pousser').click());
  await page.waitForTimeout(400);
  const crees3 = await appels(fr, 'create_event');
  const r9b = await local(fr, 'batcave-gcal-2026-09-09');
  ok(crees3.length === 13 && r9b && Object.keys(r9b).length === 7, 'sans relevé local, les 7 événements de demain sont reconnus et adoptés, aucun doublon');
  const opt2 = await local(fr, 'batcave-gcal-ecriture');
  ok(opt2.bilan.adoptes === 7, 'bilan : 7 adoptés');
  /* désactiver retire les rappels envoyés */
  await fr.evaluate(() => document.getElementById('gcal-toggle').click());
  await page.waitForTimeout(500);
  const sup = await appels(fr, 'delete_event');
  ok(sup.length === 13, 'désactiver retire les 13 événements (' + sup.length + ')');
  const r8c = await local(fr, 'batcave-gcal-2026-09-08');
  ok(r8c === null && (await local(fr, 'batcave-gcal-ecriture')).actif === false, 'relevés effacés, option éteinte');
  await ctx.close();
}

console.log('\n== 172) Option active au démarrage : envoi automatique ; bloc déplacé → mise à jour ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, {'batcave-gcal-ecriture': {actif:true, depuis:'2026-09-01'},
    'batcave-gcal-2026-09-08': {'p4': {id:'ancien1', empreinte:'2026-09-08T07:00:00+02:00|2026-09-08T09:00:00+02:00|🦇 Révision Bloc 1'}}});
  await page.clock.runFor(7000);
  await page.waitForTimeout(600);
  const maj = await appels(fr, 'update_event');
  ok(maj.length === 1 && maj[0].input.eventId === 'ancien1' && maj[0].input.startTime === '2026-09-08T07:20:00+02:00', 'le bloc dont l\'heure a changé est mis à jour, pas recréé');
  const crees = await appels(fr, 'create_event');
  ok(crees.length === 12, 'les 12 autres sont créés au démarrage (' + crees.length + ')');
  const st = await fr.evaluate(() => document.getElementById('gcal-statut').textContent);
  ok(/actif · dernier envoi/.test(st), 'statut : ' + st);
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
