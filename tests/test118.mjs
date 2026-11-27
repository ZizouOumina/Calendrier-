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
        const ev = {id:'ev' + (++n), summary: input.summary, description: input.description, start:{dateTime: input.startTime, timeZone:'Europe/Madrid'}, end:{dateTime: input.endTime, timeZone:'Europe/Madrid'}, status:'confirmed', overrideReminders: input.overrideReminders, useDefaultReminders: input.overrideReminders ? false : input.useDefaultReminders !== false};
        window.__gcalEvents.push(ev);
        return Promise.resolve({content:[], payload: ev});
      }
      if(tool === 'update_event'){
        const ev = window.__gcalEvents.find(e => e.id === input.eventId);
        /* le rappel comme Google le garde : overrideReminders remplace tout, useDefaultReminders:false seul n'en laisse aucun ;
           posé sur une série, il passe à toutes ses occurrences, même modifiées (vérifié le 17 novembre sur son agenda) */
        const rappel = e => { if(input.overrideReminders){ e.overrideReminders = input.overrideReminders; e.useDefaultReminders = false; }
                              else if('useDefaultReminders' in input){ delete e.overrideReminders; e.useDefaultReminders = input.useDefaultReminders; } };
        if(ev){ if(input.summary) ev.summary = input.summary; if('description' in input) ev.description = input.description; if(input.startTime) ev.start.dateTime = input.startTime; if(input.endTime) ev.end.dateTime = input.endTime; rappel(ev); }
        window.__gcalEvents.filter(e => e.recurringEventId && e.recurringEventId === input.eventId).forEach(rappel);
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

console.log('\n== 1) Avant le jour 1 : les 124 partent d\'un coup, puis tout l\'agenda est reposé jusqu\'au 24 janvier ==');
{
  /* 23 novembre : le jour 1 au mardi 24 -- le soir du 12, le controle (J+2 a J+8, du 14 au 20) n'atteint plus le jour 1.
     Le scenario se lit le mardi 17 au soir : le controle relit les 24 et 25, demain (le 18) reste avant le jour 1.
     26 novembre : le jour 1 au samedi 28 (« une derniere fois ») -- le soir du 17, le controle (du 19 au 25) n'atteint plus
     le jour 1. Le scenario se lit le samedi 21 au soir : le controle (J+2 a J+8, du 23 au 29) relit les 28 et 29, demain
     (le 22) reste avant le jour 1. */
  const { ctx, fr, page } = await ouvrir('2026-11-21T22:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER));
  await page.clock.runFor(7000);
  await fr.waitForFunction(() => !!localStorage.getItem('batcave-gcal-reconstruction'), null, {timeout:60000}).catch(() => {});
  await page.waitForTimeout(500);
  const sup = await appels(fr, 'delete_event');
  const ids = await fr.evaluate(() => window.__bcNettoyageJanvier());
  ok(sup.length === 124, '124 suppressions (' + sup.length + ')');
  ok(sup.every((a, i) => a.input.eventId === ids[i] && a.input.calendarId === 'zizou.oumina@gmail.com' && a.input.notificationLevel === 'NONE'), 'exactement la liste relevée, dans l\'ordre, sans notification');
  ok(ids.length === 124 && ids[0] === 'ejbpepcf6nkjslupv8sitgsog8_20270107T120000Z' && ids[123] === 'ubopd57ud8p8h6skefse6eojg8_20270122T192500Z' && ids.filter(i => /_20270(10[7-9]|11\d|12[0-2])T/.test(i)).length === 123 && ids.includes('amvacjo55pjdp3c9c662dfhk4g'), 'du 7 au 22 janvier : 123 occurrences de séries et 1 doublon');
  const drapeau = await local(fr, 'batcave-gcal-nettoyage-janvier');
  ok(drapeau && drapeau.retires === 124 && drapeau.date === '2026-11-21', 'fait une fois pour toutes : ' + JSON.stringify(drapeau));
  /* la lecture du controle des series (une semaine d'un coup, triee) suit l'envoi : elle ne compte pas parmi les jours */
  const tout = await appels(fr, 'list_events'), lus = tout.filter(a => a.input.orderBy !== 'startTime');
  /* 13 novembre : jour 1 au samedi 14 -- 72 jours, du samedi 14 novembre au dimanche 24 janvier.
     15 novembre : jour 1 au lundi 16 -- 70 jours, du lundi 16 novembre au dimanche 24 janvier.
     18 novembre : jour 1 au jeudi 19 -- 67 jours, du jeudi 19 novembre au dimanche 24 janvier.
     19 novembre : jour 1 au vendredi 20 -- 66 jours, du vendredi 20 novembre au dimanche 24 janvier.
     23 novembre : jour 1 au mardi 24 -- 62 jours, du mardi 24 novembre au dimanche 24 janvier
     26 novembre : jour 1 au samedi 28 -- 58 jours, du samedi 28 novembre au dimanche 24 janvier */
  ok(lus.length === 58 && lus[0].input.startTime.startsWith('2026-11-28T00:00:00') && lus[57].input.startTime.startsWith('2027-01-24T00:00:00'), 'reconstruction : chaque jour du samedi 28 novembre au dimanche 24 janvier est relu (' + lus.length + ' jours)');
  const ctrl = tout.findIndex(a => a.input.orderBy === 'startTime');
  ok(ctrl === tout.length - 1, 'le controle des series vient apres, une seule lecture (' + (tout.length - lus.length) + ')');
  const crees = await appels(fr, 'create_event');
  /* 26 novembre : 58 jours au lieu de 62 -- le plancher suit (1400 pour 62 jours, 1300 pour 58 : plus de 22 blocs par jour) */
  ok(crees.length > 1300 && crees.every(a => a.input.startTime >= '2026-11-28'), 'rien avant le 28, tout le reste posé (' + crees.length + ' événements)');
  const jours = new Set(crees.map(a => a.input.startTime.slice(0, 10)));
  ok(jours.size === 58, 'les 58 jours ont leurs blocs (' + jours.size + ')');
  const rec = await local(fr, 'batcave-gcal-reconstruction');
  ok(rec && rec.jours === 58 && rec.du === '2026-11-28' && rec.au === '2027-01-24' && rec.date === '2026-11-21' && rec.programme === '2026-11-28', 'reconstruction faite une fois pour toutes, pour ce jour 1 : ' + JSON.stringify(rec && {jours: rec.jours, du: rec.du, au: rec.au, programme: rec.programme}));
  const toast = await fr.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
  ok(/Agenda remis au propre jusqu’au 24 janvier/.test(toast), 'message : ' + toast.slice(0, 110));
  /* 13 novembre : le controle qui suit relit l'agenda reconstruit -- chaque bloc y est, unique ou serie : aucun ecart */
  await fr.waitForFunction(() => { try{ return !!JSON.parse(localStorage.getItem('batcave-gcal-controle')); }catch(e){ return false; } }, null, {timeout:20000}).catch(() => {});
  const controle = await local(fr, 'batcave-gcal-controle');
  ok(controle && controle.ecarts && controle.ecarts.length === 0, 'après la reconstruction, le contrôle ne voit aucun écart (' + (controle && controle.ecarts ? controle.ecarts.length + ' : ' + controle.ecarts.slice(0, 3).map(x => x.type + ' ' + x.titre).join(', ') : 'pas de contrôle') + ')');
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(!/Agenda Google : \d+ séries?/.test(plan), 'et le Plan du jour ne parle d\'aucune série en écart');
  await ctx.close();
}

console.log('\n== 2) Déjà fait : rien ne repart ==');
{
  /* 26 novembre : le jour 1 au samedi 28 -- la reconstruction faite la veille pour ce jour 1 (58 jours), lue le matin du jour 1 */
  const { ctx, fr, page } = await ouvrir('2026-11-28T06:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER, {'batcave-gcal-nettoyage-janvier': {date:'2026-11-12', retires:124}, 'batcave-gcal-reconstruction': {date:'2026-11-27', programme:'2026-11-28', taches:2, jours:58, du:'2026-11-28', au:'2027-01-24'}}));
  await page.clock.runFor(7000);
  await page.waitForTimeout(800);
  const sup = await appels(fr, 'delete_event');
  ok(!sup.some(a => /^ejbpepcf6nkjslupv8sitgsog8_/.test(a.input.eventId)), 'aucune suppression de la liste (' + sup.length + ' suppressions en tout)');
  const lus = (await appels(fr, 'list_events')).filter(a => a.input.orderBy !== 'startTime');
  ok(lus.length < 58, 'pas de seconde reconstruction : l\'envoi habituel seulement (' + lus.length + ' jours relus)');
  await ctx.close();
}
{
  /* Un relevé d'avant le champ « programme », mais déjà fait depuis le jour 1 (26 novembre : le samedi 28 ; 23 novembre : le mardi 24) : il compte aussi. */
  const { ctx, fr, page } = await ouvrir('2026-11-28T06:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER, {'batcave-gcal-nettoyage-janvier': {date:'2026-11-12', retires:124}, 'batcave-gcal-reconstruction': {date:'2026-11-27', taches:2, jours:58, du:'2026-11-28', au:'2027-01-24'}}));
  await page.clock.runFor(7000);
  await page.waitForTimeout(800);
  const lus = (await appels(fr, 'list_events')).filter(a => a.input.orderBy !== 'startTime');
  ok(lus.length < 58, 'une reconstruction depuis le 28, sans le champ « programme », ne repart pas (' + lus.length + ' jours relus)');
  await ctx.close();
}

console.log('\n== 2 ter) 16 novembre, plus de notifications de tâches : sa reconstruction du 15 ne repart pas, et ce que ses relevés gardent part ==');
{
  /* SON état du 16 : la reconstruction du 15 au soir (taches: 1) avait posé les notifications des tâches. Sa décision du
     16 : « pas besoin de plein de notifs, tant que ce que je dois faire s'affiche précisément dans ma journée dans la
     batcave ». Les 33 ont été retirées de son agenda ; ici, trois sont encore là, et ses relevés les gardent.
     23 novembre : le jour 1 au mardi 24 -- avant lui, l'envoi habituel ne part pas ; le scénario se joue le samedi 28 et le dimanche 29.
     26 novembre : le jour 1 au samedi 28 -- le scénario garde ses deux jours (le jour 1 et le lendemain) ; sa reconstruction
     est celle de ce jour 1 (58 jours depuis le 28). */
  const releves = {
    'batcave-gcal-2026-11-28': {'h1300': {id:'cl1', empreinte:'2026-11-28T13:00:00+01:00|2026-11-28T13:05:00+01:00|🦇 🔔 Coiffeur', cree:true}},
    'batcave-gcal-2026-11-29': {'h0521': {id:'cl2', empreinte:'x', cree:true}, 'h0524': {id:'cl3', empreinte:'x', cree:true}}
  };
  const { ctx, fr, page } = await ouvrir('2026-11-28T06:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER, {'batcave-gcal-nettoyage-janvier': {date:'2026-11-12', retires:124}, 'batcave-gcal-reconstruction': {date:'2026-11-27', programme:'2026-11-28', taches:2, jours:58, du:'2026-11-28', au:'2027-01-24'}}, releves));
  await fr.evaluate(() => { window.__gcalEvents.push(
    {id:'cl1', summary:'🦇 🔔 Coiffeur', start:{dateTime:'2026-11-28T13:00:00+01:00'}, end:{dateTime:'2026-11-28T13:05:00+01:00'}, status:'confirmed'},
    {id:'cl2', summary:'🦇 🔔 Pesée à jeun + Photos', start:{dateTime:'2026-11-29T05:21:00+01:00'}, end:{dateTime:'2026-11-29T05:26:00+01:00'}, status:'confirmed'},
    {id:'cl3', summary:'🦇 🔔 Brosse à dents neuve', start:{dateTime:'2026-11-29T05:24:00+01:00'}, end:{dateTime:'2026-11-29T05:29:00+01:00'}, status:'confirmed'}); });
  await page.clock.runFor(7000);
  await page.waitForTimeout(800);
  const crees = (await appels(fr, 'create_event')).filter(a => /🔔/.test(a.input.summary));
  const sup = (await appels(fr, 'delete_event')).map(a => a.input.eventId);
  const lus = (await appels(fr, 'list_events')).filter(a => a.input.orderBy !== 'startTime');
  ok(crees.length === 0, 'aucune notification de tâche n\'est posée (' + crees.length + ')');
  ok(['cl1', 'cl2', 'cl3'].every(id => sup.includes(id)), 'les trois que ses relevés gardaient partent au premier envoi de leur jour (' + sup.filter(x => /^cl/.test(x)).join(', ') + ')');
  ok(lus.length < 58, 'la reconstruction faite pour ce jour 1 ne repart pas pour rien (' + lus.length + ' jours relus)');
  const r29 = await local(fr, 'batcave-gcal-2026-11-29');
  ok(r29 && !r29.h0521 && !r29.h0524, 'et son relevé du 29 les oublie');
  await ctx.close();
}

console.log('\n== 2 quater) 17 novembre, « fais la 2 » : sa reconstruction (taches: 1) repart une fois pour les rappels ; ce qui est déjà juste ne coûte rien ==');
{
  /* SON état du 17 : la reconstruction du 15 au soir (taches: 1), chaque bloc avec un rappel 5 min avant. Seuls les départs,
     la clôture et le coucher sonnent désormais : la remise au propre repart une fois, et chaque événement n'est touché que
     là où il diffère.
     26 novembre : le jour 1 au samedi 28 -- le scénario se joue l'après-midi du jour 1, avec une reconstruction faite pour
     ce jour 1 mais avant les rappels (taches: 1). Les blocs lus : le mercredi 2 décembre (Anki matinal, trajet des cours,
     coucher), le mercredi 9 (la seconde occurrence d'Anki matinal) et le jeudi 3 (le déjeuner, un événement unique). */
  const { ctx, fr, page } = await ouvrir('2026-11-28T15:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER, {'batcave-gcal-nettoyage-janvier': {date:'2026-11-12', retires:124}, 'batcave-gcal-reconstruction': {date:'2026-11-27', programme:'2026-11-28', taches:1, jours:58, du:'2026-11-28', au:'2027-01-24'}}));
  const p25x = await fr.evaluate(() => window.__bcRappels('2026-12-02')), p02 = await fr.evaluate(() => window.__bcRappels('2026-12-09')), p26 = await fr.evaluate(() => window.__bcRappels('2026-12-03'));
  const pris = (p, re) => p.find(b => re.test(b.titre));
  const a25x = pris(p25x, /Anki matinal/), a02 = pris(p02, /Anki matinal/), t25 = pris(p25x, /^🦇 Trajet cours$/), d26 = pris(p26, /^🦇 Déjeuner/), c25 = pris(p25x, /^🦇 Coucher/);
  ok(!!(a25x && a02 && t25 && d26 && c25) && a25x.rappel === null && t25.rappel === 5 && c25.rappel === 30 && d26.rappel === null, 'la grille : Anki matinal et le déjeuner sans rappel, le trajet des cours 5 min, le coucher 30 min');
  const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const ev = (id, rec, iso, b, rappels) => Object.assign({id, summary: b.titre, description: b.description, start:{dateTime: iso + 'T' + hm(b.debut) + ':00+01:00'}, end:{dateTime: iso + 'T' + hm(b.fin) + ':00+01:00'}, status:'confirmed'}, rec ? {recurringEventId: rec} : {}, rappels);
  const cinq = {overrideReminders:[{method:'popup', minutes:5}], useDefaultReminders:false};
  await fr.evaluate(liste => { window.__gcalEvents.push(...liste); localStorage.setItem('batcave-gcal-2026-12-03', JSON.stringify({})); }, [
    ev('anki_20261202', 'anki', '2026-12-02', a25x, cinq), ev('anki_20261209', 'anki', '2026-12-09', a02, cinq),
    ev('trajet_20261202', 'trajet', '2026-12-02', t25, cinq), ev('coucher_20261202', 'coucher', '2026-12-02', c25, cinq),
    ev('dej03', null, '2026-12-03', d26, cinq)]);
  await fr.evaluate(([cle]) => { const r = {}; r[cle] = {id:'dej03', empreinte:'ancienne', cree:true}; localStorage.setItem('batcave-gcal-2026-12-03', JSON.stringify(r)); }, [d26.cle]);
  await page.clock.runFor(7000);
  await fr.waitForFunction(() => { try{ return (JSON.parse(localStorage.getItem('batcave-gcal-reconstruction')) || {}).taches === 2; }catch(e){ return false; } }, null, {timeout:90000}).catch(() => {});
  await page.waitForTimeout(500);
  const lus = (await appels(fr, 'list_events')).filter(a => a.input.orderBy !== 'startTime');
  ok(lus.length >= 58, 'elle repart une fois : chaque jour d\'aujourd\'hui au 24 janvier est relu (' + lus.length + ')');
  const maj = await appels(fr, 'update_event');
  const vers = id => maj.filter(m => m.input.eventId === id).map(m => m.input);
  ok(vers('anki').some(i => i.useDefaultReminders === false && !i.overrideReminders), 'la série « Anki matinal » perd son rappel, une fois pour tous ses jours');
  ok(vers('anki_20261202').length === 0 && vers('anki_20261209').length === 0, 'ses occurrences, déjà à l\'heure et à la consigne du jour, ne reçoivent aucun appel');
  const etat = await fr.evaluate(() => window.__gcalEvents.filter(e => /^anki_/.test(e.id)).map(e => ({id: e.id, o: e.overrideReminders || null, d: e.useDefaultReminders})));
  ok(etat.length === 2 && etat.every(e => e.o === null && e.d === false), 'et toutes deux ne sonnent plus (' + JSON.stringify(etat) + ')');
  ok(vers('trajet').length === 0 && vers('trajet_20261202').length === 0, 'le trajet des cours sonnait déjà 5 min avant : rien n\'est envoyé');
  ok(vers('coucher').some(i => i.overrideReminders && i.overrideReminders[0].minutes === 30) && vers('coucher_20261202').length === 0, 'le coucher : sa série passe à 30 min, l\'occurrence n\'est pas touchée');
  const d = vers('dej03');
  ok(d.length === 1 && d[0].useDefaultReminders === false && !d[0].overrideReminders && !d[0].startTime && !('description' in d[0]) && !d[0].summary, 'le déjeuner du jeudi 3, un événement unique déjà juste : seul son rappel part, rien d\'autre (' + JSON.stringify(d) + ')');
  ok(!(await appels(fr, 'create_event')).some(a => /Anki matinal|Trajet cours|Coucher/.test(a.input.summary) && a.input.startTime.startsWith('2026-12-02')), 'aucun doublon le mercredi 2');
  const rec = await local(fr, 'batcave-gcal-reconstruction');
  ok(rec && rec.taches === 2 && rec.programme === '2026-11-28' && rec.au === '2027-01-24', 'faite une fois pour toutes, avec les rappels : ' + JSON.stringify(rec && {taches: rec.taches, du: rec.du, au: rec.au}));
  await ctx.close();
}

console.log('\n== 2 bis) Faite pour un ancien jour 1 (le samedi 14) : elle repart une fois, depuis le samedi 28 ==');
{
  /* SON relevé, le 14 au soir : la remise au propre faite pour le samedi 14 */
  const { ctx, fr, page } = await ouvrir('2026-11-15T09:00:00+01:00', Object.assign({}, ACTIF, RELEVE_JANVIER, {'batcave-gcal-nettoyage-janvier': {date:'2026-11-12', retires:124}, 'batcave-gcal-reconstruction': {date:'2026-11-13', programme:'2026-11-14', jours:72, du:'2026-11-14', au:'2027-01-24'}}));
  await page.clock.runFor(7000);
  await fr.waitForFunction(() => { try{ return (JSON.parse(localStorage.getItem('batcave-gcal-reconstruction')) || {}).programme === '2026-11-28'; }catch(e){ return false; } }, null, {timeout:60000}).catch(() => {});
  await page.waitForTimeout(500);
  const lus = (await appels(fr, 'list_events')).filter(a => a.input.orderBy !== 'startTime');
  ok(lus.length === 58 && lus[0].input.startTime.startsWith('2026-11-28T00:00:00'), 'les 58 jours du samedi 28 au 24 janvier sont repris (' + lus.length + ', dès ' + (lus[0] && lus[0].input.startTime.slice(0, 10)) + ')');
  const crees = await appels(fr, 'create_event');
  ok(!crees.some(a => a.input.startTime < '2026-11-28'), 'rien n\'est posé avant le samedi 28, le jour 1');
  const rec = await local(fr, 'batcave-gcal-reconstruction');
  ok(rec && rec.programme === '2026-11-28' && rec.du === '2026-11-28' && rec.jours === 58, 'le relevé porte le nouveau jour 1 : ' + JSON.stringify(rec && {programme: rec.programme, du: rec.du, jours: rec.jours}));
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
  /* 13 novembre : jour 1 au samedi 14 -- avant lui, l'envoi habituel ne part pas ; le scénario se joue le jour 1 (15 novembre : le lundi 16) */
  const { ctx, fr, page } = await ouvrir('2026-11-28T06:00:00+01:00', Object.assign({}, ACTIF, {'batcave-gcal-nettoyage-janvier': {date:'2026-11-12', retires:124}}));   /* 26 novembre : le jour 1 au samedi 28 ; 23 novembre : au mardi 24 ; 19 novembre : au vendredi 20 */
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
  /* 23 novembre : le jour 1 au mardi 24 -- la reconstruction ne touche plus le vendredi 20 ; le scenario passe au vendredi 27,
     dans le mois d'espagnol repris
     26 novembre : le jour 1 au samedi 28 -- le vendredi 27 est avant lui ; le scenario passe au vendredi 4 decembre, dans le
     mois d'espagnol repris */
  const plan = await fr.evaluate(() => window.__bcRappels('2026-12-04'));
  const diner = plan.find(x => x.titre === '🦇 Dîner'), p0 = plan[0];
  ok(!!diner && /Español/.test(p0.titre), 'le vendredi 4 décembre : ' + p0.titre + ' à l\'aube, un dîner');
  const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  await fr.evaluate(([diner, p0, dd, df, pd, pf]) => {
    window.__gcalEvents.push({id:'diner_20261204', recurringEventId:'diner', summary:'🦇 Dîner', description:'pâtes, skyr à l\'ail (septembre)', start:{dateTime:'2026-12-04T' + dd + ':00+01:00'}, end:{dateTime:'2026-12-04T' + df + ':00+01:00'}, status:'confirmed', overrideReminders:[{method:'popup', minutes: diner.rappel}]});
    window.__gcalEvents.push({id:'pp1_20261204', recurringEventId:'pp1', summary:'🦇 Projets perso 1', description:'', start:{dateTime:'2026-12-04T' + pd + ':00+01:00'}, end:{dateTime:'2026-12-04T' + pf + ':00+01:00'}, status:'confirmed'});
    window.__gcalEvents.push({id:'trajet_20261208', recurringEventId:'trajet', summary:'🦇 Trajet cours', description:'', start:{dateTime:'2026-12-08T07:55:00+01:00'}, end:{dateTime:'2026-12-08T08:30:00+01:00'}, status:'confirmed'});
  }, [diner, p0, hm(diner.debut), hm(diner.fin), hm(p0.debut), hm(p0.fin)]);
  await page.clock.runFor(7000);
  await fr.waitForFunction(() => !!localStorage.getItem('batcave-gcal-reconstruction'), null, {timeout:60000}).catch(() => {});
  await page.waitForTimeout(500);
  const maj = (await appels(fr, 'update_event')).filter(a => a.input.eventId === 'diner_20261204');
  ok(maj.length === 1 && maj[0].input.description === diner.description, 'le dîner du 4 décembre garde son événement et prend la consigne du jour (' + (maj[0] && String(maj[0].input.description).slice(0, 60)) + ')');
  const crees = await appels(fr, 'create_event');
  ok(!crees.some(a => a.input.startTime.startsWith('2026-12-04') && a.input.summary === '🦇 Dîner'), 'pas de second dîner');
  ok(crees.some(a => a.input.startTime.startsWith('2026-12-04') && a.input.summary === p0.titre), p0.titre + ' est posé à son heure');
  const sup = (await appels(fr, 'delete_event')).map(a => a.input.eventId);
  ok(sup.includes('pp1_20261204'), 'l\'ancienne « Projets perso 1 » du 4 décembre est retirée');
  ok(sup.includes('trajet_20261208'), 'le « Trajet cours » du 8 décembre (férié) est retiré');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' échec(s)' : '\nTout est bon.');
process.exit(errs ? 1 : 0);
