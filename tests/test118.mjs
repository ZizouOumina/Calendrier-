/* 12 novembre, « je veux tout supprimer en même temps, pas une par une » : les 124 rappels en trop de janvier
   partent d'un coup, à l'ouverture de la Batcave, une seule fois, avant l'envoi du jour -- et un événement du
   relevé que l'agenda ne porte plus ne fait plus retirer la copie restante. */
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
  if(local) await ctx.addInitScript(x => { if(sessionStorage.getItem('__a118')) return; sessionStorage.setItem('__a118','1'); Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
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
const RELEVE_JANVIER = {'batcave-gcal-2027-01-12': {p20: {id:'amvacjo55pjdp3c9c662dfhk4g', empreinte:'x', cree:true}}};
const ACTIF = {'batcave-gcal-ecriture': {actif:true, depuis:'2026-09-09'}};

console.log('\n== 1) Ce soir (avant le 13) : les 124 partent d\'un coup, puis tout l\'agenda est reposé jusqu\'au 24 janvier ==');
{
  const { ctx, fr, page } = await ouvrir('2026-11-12T22:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER));
  await page.clock.runFor(7000);
  await fr.waitForFunction(() => !!localStorage.getItem('batcave-gcal-reconstruction'), null, {timeout:60000}).catch(() => {});
  await page.waitForTimeout(500);
  const sup = await appels(fr, 'delete_event');
  const ids = await fr.evaluate(() => window.__bcNettoyageJanvier());
  ok(sup.length === 124, '124 suppressions (' + sup.length + ')');
  ok(sup.every((a, i) => a.input.eventId === ids[i] && a.input.calendarId === 'zizou.oumina@gmail.com' && a.input.notificationLevel === 'NONE'), 'exactement la liste relevée, dans l\'ordre, sans notification');
  ok(ids.length === 124 && ids[0] === 'ejbpepcf6nkjslupv8sitgsog8_20270107T120000Z' && ids[123] === 'ubopd57ud8p8h6skefse6eojg8_20270122T192500Z' && ids.filter(i => /_20270(10[7-9]|11\d|12[0-2])T/.test(i)).length === 123 && ids.includes('amvacjo55pjdp3c9c662dfhk4g'), 'du 7 au 22 janvier : 123 occurrences de séries et 1 doublon');
  const drapeau = await local(fr, 'batcave-gcal-nettoyage-janvier');
  ok(drapeau && drapeau.retires === 124 && drapeau.date === '2026-11-12', 'fait une fois pour toutes : ' + JSON.stringify(drapeau));
  /* la lecture du controle des series (une semaine d'un coup, triee) suit l'envoi : elle ne compte pas parmi les jours */
  const tout = await appels(fr, 'list_events'), lus = tout.filter(a => a.input.orderBy !== 'startTime');
  ok(lus.length === 73 && lus[0].input.startTime.startsWith('2026-11-13T00:00:00') && lus[72].input.startTime.startsWith('2027-01-24T00:00:00'), 'reconstruction : chaque jour du vendredi 13 novembre au dimanche 24 janvier est relu (' + lus.length + ' jours)');
  const ctrl = tout.findIndex(a => a.input.orderBy === 'startTime');
  ok(ctrl === tout.length - 1, 'le controle des series vient apres, une seule lecture (' + (tout.length - lus.length) + ')');
  const crees = await appels(fr, 'create_event');
  ok(crees.length > 1500 && crees.every(a => a.input.startTime >= '2026-11-13'), 'rien avant le 13, tout le reste posé (' + crees.length + ' événements)');
  const jours = new Set(crees.map(a => a.input.startTime.slice(0, 10)));
  ok(jours.size === 73, 'les 73 jours ont leurs blocs (' + jours.size + ')');
  const rec = await local(fr, 'batcave-gcal-reconstruction');
  ok(rec && rec.jours === 73 && rec.du === '2026-11-13' && rec.au === '2027-01-24' && rec.date === '2026-11-12', 'reconstruction faite une fois pour toutes : ' + JSON.stringify(rec && {jours: rec.jours, du: rec.du, au: rec.au}));
  const toast = await fr.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
  ok(/Agenda remis au propre jusqu’au 24 janvier/.test(toast), 'message : ' + toast.slice(0, 110));
  await ctx.close();
}

console.log('\n== 2) Déjà fait : rien ne repart ==');
{
  const { ctx, fr, page } = await ouvrir('2026-11-13T06:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER, {'batcave-gcal-nettoyage-janvier': {date:'2026-11-12', retires:124}, 'batcave-gcal-reconstruction': {date:'2026-11-12', jours:73}}));
  await page.clock.runFor(7000);
  await page.waitForTimeout(800);
  const sup = await appels(fr, 'delete_event');
  ok(!sup.some(a => /^ejbpepcf6nkjslupv8sitgsog8_/.test(a.input.eventId)), 'aucune suppression de la liste (' + sup.length + ' suppressions en tout)');
  const lus = (await appels(fr, 'list_events')).filter(a => a.input.orderBy !== 'startTime');
  ok(lus.length < 73, 'pas de seconde reconstruction : l\'envoi habituel seulement (' + lus.length + ' jours relus)');
  await ctx.close();
}

console.log('\n== 3) Un agenda qui n\'a jamais reçu janvier (installation neuve) : rien ==');
{
  const { ctx, fr, page } = await ouvrir('2026-11-12T22:00:00+01:00', ACTIF);
  await page.clock.runFor(7000);
  await page.waitForTimeout(500);
  ok((await appels(fr, 'delete_event')).length === 0, 'aucune suppression');
  ok((await local(fr, 'batcave-gcal-nettoyage-janvier')) === null && (await local(fr, 'batcave-gcal-reconstruction')) === null, 'pas de drapeau : rien de lancé');
  ok((await appels(fr, 'list_events')).filter(a => a.input.orderBy !== 'startTime').length === 0, 'et rien de relu avant le 13 (le controle des series seul)');
  await ctx.close();
}

console.log('\n== 4) Demain matin, pas encore fait : le nettoyage d\'abord, l\'envoi ensuite ==');
{
  const { ctx, fr, page } = await ouvrir('2026-11-13T06:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER));
  await page.clock.runFor(7000);
  await fr.waitForFunction(() => !!localStorage.getItem('batcave-gcal-reconstruction'), null, {timeout:60000}).catch(() => {});
  await page.waitForTimeout(1500);
  const tous = await fr.evaluate(() => window.__appels.filter(a => a.server === 'Google Calendar').map(a => a.tool + ':' + (a.input.eventId || '')));
  const dernierNettoyage = tous.map((t, i) => /^delete_event:.*_2027/.test(t) || t === 'delete_event:amvacjo55pjdp3c9c662dfhk4g' ? i : -1).reduce((a, b) => Math.max(a, b), -1);
  const premiereLecture = tous.indexOf(tous.find(t => t.startsWith('list_events')));
  ok(dernierNettoyage > -1 && premiereLecture > dernierNettoyage, 'les 124 suppressions passent avant la première lecture de l\'agenda (' + dernierNettoyage + ' < ' + premiereLecture + ')');
  ok((await appels(fr, 'create_event')).length > 400, 'puis l\'envoi du jour se fait');
  await ctx.close();
}

console.log('\n== 5) Un événement du relevé supprimé : la copie restante est adoptée, pas retirée ==');
{
  const { ctx, fr, page } = await ouvrir('2026-11-13T06:00:00+01:00', Object.assign({}, ACTIF, {'batcave-gcal-nettoyage-janvier': {date:'2026-11-12', retires:124}}));
  /* le 8 décembre (férié) : le relevé dit « Douche du soir » = un événement supprimé ; l'agenda porte l'autre copie */
  const douche = await fr.evaluate(() => { const b = window.__bcRappels ? window.__bcRappels('2026-12-08') : null; return b && b.find(x => /Douche du soir/.test(x.titre)); });
  ok(!!douche, 'le 8 décembre a bien un bloc « Douche du soir » (' + (douche && douche.cle) + ')');
  if(douche){
    const hh = String(Math.floor(douche.debut / 60)).padStart(2, '0') + ':' + String(douche.debut % 60).padStart(2, '0');
    const fh = String(Math.floor(douche.fin / 60)).padStart(2, '0') + ':' + String(douche.fin % 60).padStart(2, '0');
    await fr.evaluate(([cle, hh, fh]) => {
      const r = {}; r[cle] = {id:'mort', empreinte:'ancienne', cree:true};
      localStorage.setItem('batcave-gcal-2026-12-08', JSON.stringify(r));
      window.__gcalEvents.push({id:'serie_20261208', summary:'🦇 🚿 Douche du soir', description:'', start:{dateTime:'2026-12-08T' + hh + ':00+01:00', timeZone:'Europe/Madrid'}, end:{dateTime:'2026-12-08T' + fh + ':00+01:00', timeZone:'Europe/Madrid'}, status:'confirmed'});
    }, [douche.cle, hh, fh]);
    await page.clock.runFor(7000);
    await page.waitForTimeout(1500);
    const sup = (await appels(fr, 'delete_event')).map(a => a.input.eventId);
    const maj = (await appels(fr, 'update_event')).map(a => a.input.eventId);
    const r = await local(fr, 'batcave-gcal-2026-12-08');
    ok(!sup.includes('serie_20261208'), 'la copie restante n\'est pas retirée');
    ok(!maj.includes('mort'), 'aucune mise à jour envoyée à l\'événement supprimé');
    ok(r && r[douche.cle] && r[douche.cle].id === 'serie_20261208' && r[douche.cle].cree === false, 'elle est adoptée : ' + JSON.stringify(r && r[douche.cle]));
    const crees = (await appels(fr, 'create_event')).filter(a => a.input.summary === '🦇 🚿 Douche du soir' && a.input.startTime.startsWith('2026-12-08'));
    ok(crees.length === 0, 'pas de doublon recréé le 8 décembre (' + crees.length + ')');
  }
  await ctx.close();
}

console.log('\n== 6) Reconstruction : l\'occurrence au bon titre prend la consigne du jour, l\'ancienne série et le trajet du férié partent ==');
{
  const { ctx, fr, page } = await ouvrir('2026-11-12T22:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER, {'batcave-gcal-nettoyage-janvier': {date:'2026-11-12', retires:124}}));
  const plan = await fr.evaluate(() => window.__bcRappels('2026-11-20'));
  const diner = plan.find(x => x.titre === '🦇 Dîner'), p0 = plan[0];
  ok(!!diner && /Español/.test(p0.titre), 'le vendredi 20 : ' + p0.titre + ' à l\'aube, un dîner');
  const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  await fr.evaluate(([diner, p0, dd, df, pd, pf]) => {
    window.__gcalEvents.push({id:'diner_20261120', recurringEventId:'diner', summary:'🦇 Dîner', description:'pâtes, skyr à l\'ail (septembre)', start:{dateTime:'2026-11-20T' + dd + ':00+01:00'}, end:{dateTime:'2026-11-20T' + df + ':00+01:00'}, status:'confirmed', overrideReminders:[{method:'popup', minutes: diner.rappel}]});
    window.__gcalEvents.push({id:'pp1_20261120', recurringEventId:'pp1', summary:'🦇 Projets perso 1', description:'', start:{dateTime:'2026-11-20T' + pd + ':00+01:00'}, end:{dateTime:'2026-11-20T' + pf + ':00+01:00'}, status:'confirmed'});
    window.__gcalEvents.push({id:'trajet_20261208', recurringEventId:'trajet', summary:'🦇 Trajet cours', description:'', start:{dateTime:'2026-12-08T07:55:00+01:00'}, end:{dateTime:'2026-12-08T08:30:00+01:00'}, status:'confirmed'});
  }, [diner, p0, hm(diner.debut), hm(diner.fin), hm(p0.debut), hm(p0.fin)]);
  await page.clock.runFor(7000);
  await fr.waitForFunction(() => !!localStorage.getItem('batcave-gcal-reconstruction'), null, {timeout:60000}).catch(() => {});
  await page.waitForTimeout(500);
  const maj = (await appels(fr, 'update_event')).filter(a => a.input.eventId === 'diner_20261120');
  ok(maj.length === 1 && maj[0].input.description === diner.description, 'le dîner du 20 garde son événement et prend la consigne du jour (' + (maj[0] && String(maj[0].input.description).slice(0, 60)) + ')');
  const crees = await appels(fr, 'create_event');
  ok(!crees.some(a => a.input.startTime.startsWith('2026-11-20') && a.input.summary === '🦇 Dîner'), 'pas de second dîner');
  ok(crees.some(a => a.input.startTime.startsWith('2026-11-20') && a.input.summary === p0.titre), p0.titre + ' est posé à son heure');
  const sup = (await appels(fr, 'delete_event')).map(a => a.input.eventId);
  ok(sup.includes('pp1_20261120'), 'l\'ancienne « Projets perso 1 » du 20 est retirée');
  ok(sup.includes('trajet_20261208'), 'le « Trajet cours » du 8 décembre (férié) est retiré');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' échec(s)' : '\nTout est bon.');
process.exit(errs ? 1 : 0);
