/* Lot 25 — quatre chantiers du dossier de réflexion :
   R8 réduit  : un chronomètre de séance, pour savoir si les 46-50 min annoncées tiennent ;
   R30        : une journée exceptionnelle qui se répète chaque semaine ;
   R22        : la copie vierge du 14, et le retour exact à cet état ;
   R10        : les rappels d'agenda n'écrivent rien avant le premier jour du programme. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local, avecMcp){
  const ctx = await browser.newContext({ viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(avecMcp){
    await ctx.addInitScript(() => {
      window.__appels = [];
      window.claude = { use: async (n) => n === 'mcp' ? {
        callTool: async (server, tool, input) => { window.__appels.push({tool, input}); return {payload: tool === 'create_event' ? {id:'ev'+window.__appels.length} : {items:[]}}; },
        watchTool: () => {}
      } : null };
    });
  } else {
    await ctx.addInitScript(() => { window.claude = undefined; });
  }
  if(local) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-focus').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
  await page.waitForTimeout(350);
  return { ctx, page, fr };
}
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const allerSport = async (fr, page) => { await fr.evaluate(() => document.querySelector('.nav-btn[data-page="sport"]').click()); await page.waitForTimeout(400); };

console.log('\n== 305) Chronomètre de séance : la durée réelle, pas celle du programme ==');
{
  /* lundi 14 sept, jour de « Haut lourd » : le programme annonce 50 min */
  const { ctx, fr, page } = await ouvrir('2026-09-14T06:00:00+02:00');
  await allerSport(fr, page);
  let v = await fr.evaluate(() => ({ barre: !document.getElementById('chrono-barre').hidden,
                                     start: !document.getElementById('chrono-start').hidden,
                                     stop: !document.getElementById('chrono-stop').hidden,
                                     aide: document.getElementById('chrono-aide').textContent }));
  ok(v.barre && v.start && !v.stop, 'la barre est là un jour de séance, prête à démarrer');
  ok(/50 min/.test(v.aide), 'elle rappelle la durée annoncée par le programme (' + v.aide.slice(0, 60) + ')');

  await fr.evaluate(() => document.getElementById('chrono-start').click());
  await page.waitForTimeout(200);
  v = await fr.evaluate(() => ({ start: !document.getElementById('chrono-start').hidden,
                                 stop: !document.getElementById('chrono-stop').hidden,
                                 compte: !document.getElementById('chrono-compte').hidden }));
  ok(!v.start && v.stop && v.compte, 'lancé : le décompte s\'affiche, « Terminer » remplace « Démarrer »');
  const etat = await local(fr, 'batcave-chrono-seance');
  ok(etat && etat.debut > 0 && etat.date === '2026-09-14', 'l\'état gardé est un HORODATAGE, pas un compteur — il survit à l\'écran éteint');

  /* 44 minutes passent, écran verrouillé : le chrono lit l'horloge, il ne compte pas des ticks */
  await page.clock.setFixedTime(new Date('2026-09-14T06:44:00+02:00'));
  await fr.evaluate(() => document.getElementById('chrono-stop').click());
  await page.waitForTimeout(250);
  const durees = await local(fr, 'batcave-seance-duree');
  ok(durees && durees.length === 1 && durees[0].minutes === 44 && durees[0].date === '2026-09-14', 'séance de 44 min enregistrée (' + (durees && durees[0] && durees[0].minutes) + ')');
  ok((await local(fr, 'batcave-chrono-seance')) === null, 'le chrono en cours est effacé une fois la séance close');
  const aide2 = await fr.evaluate(() => document.getElementById('chrono-aide').textContent);
  ok(/44 min/.test(aide2) && /50 min/.test(aide2), 'la barre compare le réel aux 50 min annoncées (' + aide2.slice(0, 70) + ')');
  const boutons = await fr.evaluate(() => ({start: !document.getElementById('chrono-start').hidden, stop: !document.getElementById('chrono-stop').hidden}));
  ok(!boutons.start && !boutons.stop, 'une fois la séance faite, plus rien à lancer aujourd\'hui');
  await ctx.close();
}

console.log('\n== 306) Le chrono ne fabrique pas de fausses séances ==');
{
  /* chrono laissé en marche la VEILLE : fermé au chargement, sans rien écrire */
  const { ctx, fr, page } = await ouvrir('2026-09-15T06:00:00+02:00',
    {'batcave-chrono-seance': {debut: Date.parse('2026-09-14T06:00:00+02:00'), date:'2026-09-14', type:'Haut lourd'}});
  await allerSport(fr, page);
  ok((await local(fr, 'batcave-chrono-seance')) === null, 'un chrono oublié la veille est fermé au chargement');
  ok((await local(fr, 'batcave-seance-duree')) === null, 'et n\'écrit aucune séance de vingt-quatre heures');

  /* moins d'une minute : rien enregistré */
  await fr.evaluate(() => document.getElementById('chrono-start').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.getElementById('chrono-stop').click());
  await page.waitForTimeout(200);
  const d = await local(fr, 'batcave-seance-duree');
  ok(!d || !d.length, 'une séance de moins d\'une minute n\'est pas une séance');

  /* « annuler » n'écrit rien non plus */
  await fr.evaluate(() => document.getElementById('chrono-start').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.getElementById('chrono-annuler').click());
  await page.waitForTimeout(200);
  ok((await local(fr, 'batcave-chrono-seance')) === null && !((await local(fr, 'batcave-seance-duree')) || []).length, 'annuler ferme le chrono sans rien écrire');

  /* jour de repos : la barre disparaît (mercredi 16 sept) */
  await ctx.close();
  const off = await ouvrir('2026-09-16T06:00:00+02:00');
  await allerSport(off.fr, off.page);
  ok(await off.fr.evaluate(() => document.getElementById('chrono-barre').hidden), 'jour de repos : pas de barre de chrono');
  await off.ctx.close();
}

console.log('\n== 307) Une journée exceptionnelle qui revient chaque semaine ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-14T09:00:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
  await page.waitForTimeout(400);
  await fr.evaluate(() => {
    document.getElementById('jx-date').value = '2026-09-17';
    document.getElementById('jx-debut').value = '11:00';
    document.getElementById('jx-fin').value = '13:00';
    document.getElementById('jx-type').value = 'tp';
    document.getElementById('jx-label').value = 'Anatomía I';
    document.getElementById('jx-jusqua').value = '2026-11-05';
    document.getElementById('jx-add').click();
  });
  await page.waitForTimeout(500);
  const j = await local(fr, 'batcave-journees');
  const dates = Object.keys(j || {}).sort();
  ok(dates.length === 8, 'huit jeudis posés en une saisie, du 17 sept au 5 nov (' + dates.length + ')');
  ok(dates[0] === '2026-09-17' && dates[dates.length-1] === '2026-11-05', 'du ' + dates[0] + ' au ' + dates[dates.length-1]);
  ok(dates.every(d => new Date(d + 'T00:00:00').getDay() === 4), 'toutes tombent un jeudi');
  const serie = j[dates[0]].serie;
  ok(!!serie && dates.every(d => j[d].serie === serie && j[d].label === 'Anatomía I'), 'elles portent le même identifiant de série');

  const lignes = await fr.evaluate(() => [...document.querySelectorAll('#journees-liste .entry-row')].map(l => l.innerText.replace(/\s+/g, ' ')));
  ok(lignes.length === 1, 'le panneau n\'affiche qu\'UNE ligne, pas huit (' + lignes.length + ')');
  ok(/chaque jeudi/.test(lignes[0]) && /8 sur 8 à venir/.test(lignes[0]), 'la ligne dit la récurrence et ce qui reste (' + lignes[0].slice(0, 110) + ')');

  /* la grille du 17 est bien reconstruite : le TP y est */
  const prevu = await fr.evaluate(() => window.__bcPrevu('2026-09-17'));
  const normal = await fr.evaluate(() => window.__bcPrevu('2026-09-10'));
  ok(prevu.rev + prevu.proj + prevu.es < normal.rev + normal.proj + normal.es, 'le jeudi de TP prévoit moins de travail qu\'un jeudi normal');

  /* supprimer la série retire les huit d'un coup */
  await fr.evaluate(() => document.querySelector('#journees-liste [data-delserie]').click());
  await page.waitForTimeout(400);
  const j2 = await local(fr, 'batcave-journees');
  ok(!j2 || !Object.keys(j2).length, 'un seul geste retire toute la série (' + Object.keys(j2 || {}).length + ' restantes)');
  await ctx.close();
}

console.log('\n== 308) La copie vierge : revenir exactement au 14 ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-14T07:00:00+02:00');
  const item = await fr.evaluate(() => [...document.querySelectorAll('#dash-plan li')].map(l => l.innerText).join(' | '));
  ok(/Copie vierge à prendre/.test(item), 'le 14, le plan du jour la réclame avant la première saisie');

  await fr.evaluate(() => document.querySelector('[data-plan-vierge]').click());
  await page.waitForTimeout(400);
  const v = await local(fr, 'batcave-copie-vierge');
  ok(v && v.date === '2026-09-14' && v.n > 0, 'copie prise : ' + (v && v.n) + ' entrées, état du ' + (v && v.date));
  ok(v && !v.data['batcave-copie-vierge'], 'la copie ne se contient jamais elle-même');
  const item2 = await fr.evaluate(() => [...document.querySelectorAll('#dash-plan li')].map(l => l.innerText).join(' | '));
  ok(!/Copie vierge à prendre/.test(item2), 'une fois prise, le rappel disparaît du plan');
  await ctx.close();
}

console.log('\n== 309) La copie vierge survit à un nouveau départ ==');
{
  const { ctx, fr } = await ouvrir('2026-11-02T09:00:00+02:00',
    {'batcave-copie-vierge': {date:'2026-09-14', pris:'2026-09-14T07:00:00.000Z', n: 3, data:{'batcave-poids':[{date:'2026-09-14', valeur:64}]}}});
  const garde = await fr.evaluate(() => window.__bcReinitGarder ? window.__bcReinitGarder('batcave-copie-vierge') : null);
  ok(garde === true, '« Remettre à zéro » ne l\'efface pas — sinon elle ne protège de rien');
  const etat = await fr.evaluate(() => { document.querySelector('.backup-trigger').click(); return document.getElementById('vierge-etat').textContent; });
  ok(/14 sept/.test(etat) && /état du premier jour/.test(etat), 'le panneau reconnaît une copie prise le premier jour (' + etat.slice(0, 80) + ')');
  const boutons = await fr.evaluate(() => ({ restaurer: !document.getElementById('vierge-restaurer').hidden,
                                             prendre: document.getElementById('vierge-prendre').textContent }));
  ok(boutons.restaurer && /Remplacer/.test(boutons.prendre), 'le retour est proposé, et reprendre une copie dit clairement qu\'on remplace');
  await ctx.close();
}

console.log('\n== 310) Les rappels d\'agenda n\'écrivent rien avant le 14 ==');
{
  /* activés le 9 : l'agenda ne doit pas se remplir de blocs d'une semaine qu'on ne suit pas */
  const av = await ouvrir('2026-09-09T09:00:00+02:00', {'batcave-gcal-ecriture': {actif:true, depuis:'2026-09-09'}}, true);
  await av.page.clock.runFor(7000);
  await av.page.waitForTimeout(700);
  const creesAvant = await av.fr.evaluate(() => window.__appels.filter(a => a.tool === 'create_event').length);
  ok(creesAvant === 0, 'aucun événement créé avant le premier jour du programme (' + creesAvant + ')');
  const statut = await av.fr.evaluate(() => { document.querySelector('.nav-btn[data-page="etudes"]').click(); return document.getElementById('gcal-statut').textContent; });
  ok(/premiers rappels le/.test(statut), 'le panneau le DIT, au lieu de laisser croire à une panne (' + statut + ')');
  await av.ctx.close();

  /* le 14, ils partent */
  const ap = await ouvrir('2026-09-14T04:30:00+02:00', {'batcave-gcal-ecriture': {actif:true, depuis:'2026-09-09'}}, true);
  await ap.page.clock.runFor(7000);
  await ap.page.waitForTimeout(700);
  const creesApres = await ap.fr.evaluate(() => window.__appels.filter(a => a.tool === 'create_event').length);
  ok(creesApres > 20, 'le 14 au matin, les rappels partent (' + creesApres + ' événements)');
  await ap.ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
