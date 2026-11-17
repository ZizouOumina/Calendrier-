/* Lot 18 : tout commence le mardi 15 septembre — sport (semaine 1, retest), Pomodoro selon le
   bloc (Anki = sans préciser), habitudes à plusieurs jours (linge lun·mer·ven), rotation Drive
   (doublon du même jour), dépendance à départ futur. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, extra){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  /* 16 novembre : la routine (lit, linge, balai, courses…) est sans case chez lui. Ce test garde la mécanique des cartes
     d'habitude, qui vaut pour toute case remise (« Remettre la case ») : la routine reste en cases ici (drapeau posé). */
  await ctx.addInitScript(() => { window.claude = undefined; try{ localStorage.setItem('batcave-sans-case-v1', 'true'); }catch(e){} });
  if(extra) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, extra);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r && !document.getElementById('opening-ritual-overlay').hidden) r.click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const HABITS = [
  {id:'core-lit', label:'Lit fait', icon:'🛏️'},
  {id:'hab-linge', label:'Linge', icon:'🧺', jours:[1,3,5]},
  {id:'hab-balai', label:'Passer le balai', icon:'🧹', jour:6},
  {id:'core-courses', label:'Courses faites', icon:'🛒', jour:6}
];
const seedHab = {'batcave-habits': HABITS, 'batcave-habits-seed-v2': true, 'batcave-habits-seed-v3': true, 'batcave-habits-seed-v4': true, 'batcave-habits-seed-v5': true, 'batcave-habits-seed-v6': true, 'batcave-habits-seed-v7': true, 'batcave-habits-ecran-v2': true, 'batcave-habitlog-hebdo-v1': true};

console.log('\n== 240) Sport : mercredi 21 octobre = jour 1, première muscu le lundi 26 (tours × ½), lundi 16 novembre = retest ==');
{
  /* 30 septembre au soir : jour 1 au jeudi 1er octobre, muscu des le jour 1 (street workout
     seul jusqu'au dimanche 4, le combat commence le lundi 5). */
  /* 4 octobre : « on decale tout a demain lundi » -- jour 1 au lundi 5, tout le plan d'un coup. */
  /* 12 octobre : « tout a 100 % des mardi » -- jour 1 et premiere muscu le mardi 13.
     14 octobre : « on va commencer tout demain matin » -- jour 1 et premiere muscu le jeudi 15.
     15 octobre : « on commence vendredi pour de bon » -- jour 1 le vendredi 16 (off au sport),
     premiere muscu le samedi 17.
     16 octobre : « samedi matin sans faute » -- jour 1 et premiere muscu le samedi 17.
     19 octobre : « on decale tout a demain » -- jour 1 et premiere muscu le mardi 20.
     21 octobre : « on commence demain la Batcave » -- jour 1 le mercredi 21 ; la muscu attend le
     plan sommeil, premiere seance le lundi 26 (semaine 2).
     21 octobre au matin : « on commence jeudi matin » -- jour 1 le jeudi 22, rien d'autre ne bouge.
     31 octobre : « on commence tout dimanche matin » -- jour 1 le dimanche 1er novembre, premiere
     seance le lundi 2 (semaine 2 : la semaine 1 est celle du lundi 26, dont le jour 1 est le dimanche). */
  const { ctx, fr } = await ouvrir('2026-11-16T07:30:00+01:00');   /* 15 novembre : le jour 1 passe au lundi 16, premier jour de muscu ; 13 novembre : au samedi 14 ; 12 novembre : au vendredi 13 ; 11 novembre : au jeudi 12 */
  const r = await fr.evaluate(() => ({ debut: window.__bcProgrammeDebut, note: document.getElementById('programme-note').textContent }));
  ok(r.debut === '2026-11-16', 'PROGRAMME_DEBUT = 2026-11-16 (' + r.debut + ')');
  ok(/semaine 1 de muscu/.test(r.note) && /½/.test(r.note), 'note du jour 1 : la semaine 1 de muscu commence avec lui (' + r.note + ')');
  await ctx.close();
  const v = await ouvrir('2026-11-15T20:00:00+01:00');
  const nv = await v.fr.evaluate(() => document.getElementById('programme-note').textContent);
  ok(/muscu à partir du/.test(nv) && /16 nov/.test(nv), 'la veille : « muscu à partir du 16 nov. » (' + nv + ')');
  await v.ctx.close();
  /* 7 novembre : les semaines de muscu se comptent depuis la premiere seance faite -- le lundi 2,
     c'est la semaine 1, a la moitie des tours. */
  const l5 = await ouvrir('2026-11-16T06:30:00+01:00');
  const n5b = await l5.fr.evaluate(() => document.getElementById('programme-note').textContent);
  ok(/semaine 1 de muscu/.test(n5b) && /½/.test(n5b), 'lundi 16 novembre : semaine 1 de muscu, tours × ½ (' + n5b + ')');
  await l5.ctx.close();
  const s = await ouvrir('2026-09-10T06:30:00+02:00');
  const n2 = await s.fr.evaluate(() => document.getElementById('programme-note').textContent);
  ok(/muscu à partir du/.test(n2) && /16 nov/.test(n2), 'avant le jour 1 : « muscu à partir du 16 nov. » (' + n2 + ')');
  await s.ctx.close();
  /* 26 septembre : le jour 1 passe au LUNDI 28. La semaine de programme court du lundi au
     dimanche ; le lundi est un jour de sport (haut volume), premierJourSport() rend le 28
     lui-meme, et la semaine 5 court du 26 octobre au 1er novembre -- retest le lundi 26. */
  /* 30 septembre : la premiere seance est le jeudi 1er, les retests tombent donc le jeudi
     des semaines 5, 10 et 15 -- le 29 octobre pour la semaine 5. */
  /* 4 octobre : la premiere seance est le lundi 5 -- retests le lundi des semaines 5, 10, 15. */
  /* 7 novembre : « j'ai rien fait encore ». Sans aucune seance, le lundi 23 n'est pas la semaine 5 :
     la prochaine seance sera la premiere, a la moitie des tours. */
  /* 11 novembre : la muscu commence le 16 -- le lundi 7 decembre, sans seance faite */
  const a5 = await ouvrir('2026-12-07T06:30:00+01:00');
  const na = await a5.fr.evaluate(() => ({note: document.getElementById('programme-note').textContent, retests: document.getElementById('retest-dates').textContent}));
  ok(/semaine 1 de muscu/.test(na.note) && /½/.test(na.note) && !/retest/.test(na.note), 'lundi 7 décembre sans séance faite : semaine 1 de muscu, tours × ½ (' + na.note + ')');
  ok(/07 déc/.test(na.retests) === false && /04 janv/.test(na.retests) && /08 févr/.test(na.retests) && /15 mars/.test(na.retests), 'les retests partent du lundi 7 : 04 janv., 08 févr., 15 mars (' + na.retests + ')');
  await a5.ctx.close();
  /* une premiere seance le lundi 2 : la semaine 5 est celle du lundi 30 -- quatre semaines de pratique */
  const premiere = {'batcave-sport-log': [{id: 'l-premiere', date: '2026-11-16', type: 'Haut volume', exo: 'Tractions', series: [8, 7, 6], charge: 0, unite: 'reps'}]};
  const r5 = await ouvrir('2026-12-14T06:30:00+01:00', premiere);
  const n5 = await r5.fr.evaluate(() => ({note: document.getElementById('programme-note').textContent, retests: document.getElementById('retest-dates').textContent}));
  ok(/semaine 5 de muscu/.test(n5.note) && /tours complets/.test(n5.note) && /lundi : retest/.test(n5.note), 'première séance le 16 novembre → lundi 14 décembre : semaine 5, tours complets, retest (' + n5.note + ')');
  ok(/14 déc/.test(n5.retests) && /18 janv/.test(n5.retests) && /22 févr/.test(n5.retests), 'retests les lundis 14 décembre, 18 janvier, 22 février (' + n5.retests + ')');
  await r5.ctx.close();
}

console.log('\n== 241) Pomodoro révision : sur Anki, « Sans préciser » proposé ; sur Cartes, la matière ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-15T07:30:00+02:00');   /* mardi, bloc Anki 1 */
  await fr.evaluate(() => document.getElementById('dash-pomodoro').click());
  await page.waitForTimeout(150);
  const a = await fr.evaluate(() => ({ visible: !document.getElementById('ask-overlay').hidden, valeur: document.getElementById('ask-select').value, msg: document.getElementById('ask-msg').textContent }));
  ok(a.visible && a.valeur === 'Sans préciser' && /Anki 1/.test(a.msg) && /Sans préciser/.test(a.msg), 'bloc Anki 1 : « Sans préciser » proposé, message explicite (' + a.msg.slice(0, 70) + ')');
  await fr.evaluate(() => document.getElementById('ask-cancel').click());
  await ctx.close();
  const c = await ouvrir('2026-09-15T09:30:00+02:00');   /* bloc Cartes du dernier cours */
  await c.fr.evaluate(() => document.getElementById('dash-pomodoro').click());
  await c.page.waitForTimeout(150);
  const b = await c.fr.evaluate(() => ({ valeur: document.getElementById('ask-select').value, msg: document.getElementById('ask-msg').textContent }));
  ok(b.valeur !== 'Sans préciser' && /Étudier en avance/.test(b.msg) && /LA matière/.test(b.msg), 'bloc Cartes : une matière proposée (' + b.valeur + '), message « choisis LA matière »');
  await c.fr.evaluate(() => document.getElementById('ask-cancel').click());
  await c.ctx.close();
}

console.log('\n== 242) Cases à plusieurs jours : le linge lundi, mercredi, vendredi (17 novembre : dans « Ma journée », sans série) ==');
{
  const log = {'hab-linge': ['2026-09-11','2026-09-14'], 'hab-balai': ['2026-09-12']};
  const { ctx, fr, page } = await ouvrir('2026-09-16T20:00:00+02:00', Object.assign({'batcave-habitlog': log}, seedHab));   /* mercredi */
  const r = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="journee"]').click();
    return { ids: [...document.querySelectorAll('#mj-corps input[data-mj-hab]')].map(x => x.dataset.mjHab), jours: window.__bcHabitJours({jours:[5,1,3,1]}) };
  });
  ok(JSON.stringify(r.jours) === '[1,3,5]', 'habitJours trie et dédoublonne : ' + JSON.stringify(r.jours));
  ok(r.ids.includes('hab-linge') && !r.ids.includes('hab-balai') && !r.ids.includes('core-courses'), 'mercredi : le linge est à cocher, ni le balai (samedi) ni « Courses faites » (retirée le 17 novembre)');
  await fr.evaluate(() => document.querySelector('input[data-mj-hab="hab-linge"]').click());
  await page.waitForTimeout(200);
  const log2 = await fr.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habitlog'))['hab-linge']);
  ok(log2.indexOf('2026-09-16') > -1, 'coché : rattaché au mercredi 16 (' + JSON.stringify(log2) + ')');
  await ctx.close();
  const j = await ouvrir('2026-09-17T20:00:00+02:00', Object.assign({'batcave-habitlog': {'hab-linge': ['2026-09-14','2026-09-16']}}, seedHab));   /* jeudi */
  const r3 = await j.fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="journee"]').click();
    const ids = [...document.querySelectorAll('#mj-corps input[data-mj-hab]')].map(x => x.dataset.mjHab);
    window.__bcJournee.aller('2026-09-16');
    return { ids, veille: [...document.querySelectorAll('#mj-cases li, #mj-routine li')].map(x => x.textContent).filter(t => /Linge/.test(t))[0] || '' };
  });
  ok(!r3.ids.includes('hab-linge') && /^✓ /.test(r3.veille), 'jeudi : pas de linge à cocher ; la veille, il est marqué fait (« ' + r3.veille + ' »)');
  await j.ctx.close();
}

console.log('\n== 243) Rotation Drive : deux sauvegardes auto du même jour → une seule gardée ==');
{
  const { ctx, fr } = await ouvrir('2026-09-08T12:00:00+02:00');
  const r = await fr.evaluate(() => {
    const f = (t, id) => ({title: t, id: id});
    const plan = window.__bcPlanRotation([f('batcave-sauvegarde-auto-2026-09-07.json','a'), f('batcave-sauvegarde-auto-2026-09-07.json','b'), f('batcave-sauvegarde-auto-2026-09-08.json','c'), f('batcave-sauvegarde-2026-09-08-manuelle.json','d'), f('batcave-sauvegarde-auto-2026-08-01.json','e'), f('batcave-sauvegarde-auto-2026-08-01.json','e2')], '2026-09-08');
    return { garder: plan.garder.map(x => x.id), jeter: plan.jeter.map(x => x.id) };
  });
  ok(r.jeter.length === 2 && r.jeter.indexOf('b') > -1 && r.jeter.indexOf('e2') > -1, 'les doublons (b, e2) partent à la corbeille : ' + JSON.stringify(r.jeter));
  ok(r.garder.indexOf('a') > -1 && r.garder.indexOf('c') > -1 && r.garder.indexOf('e') > -1 && r.garder.indexOf('d') === -1, 'une copie par jour gardée, la sauvegarde manuelle jamais touchée : ' + JSON.stringify(r.garder));

  /* Le scenario du 14 septembre : ouvrir l'application le matin envoie une sauvegarde des
     ANCIENNES donnees ; la remise a zero efface « derniere sauvegarde » ; l'ouverture
     suivante en envoie une seconde, sous le MEME nom de fichier. C'est la plus RECENTE qui
     doit survivre -- garder la premiere, c'etait garder les donnees d'avant la remise a
     zero, et une restauration « du 14 septembre » ramenait septembre. L'ordre dans lequel
     Drive rend les fichiers ne doit rien changer : on le teste dans les deux sens. */
  const dbl = await fr.evaluate(() => {
    const f = (t, id, cree) => ({title: t, id: id, createdTime: cree});
    const avant  = f('batcave-sauvegarde-auto-2026-09-14.json', 'vieille', '2026-09-14T06:10:00.000Z');
    const apres  = f('batcave-sauvegarde-auto-2026-09-14.json', 'fraiche', '2026-09-14T18:45:00.000Z');
    const p1 = window.__bcPlanRotation([avant, apres], '2026-09-14');
    const p2 = window.__bcPlanRotation([apres, avant], '2026-09-14');
    return { g1: p1.garder.map(x => x.id), j1: p1.jeter.map(x => x.id),
             g2: p2.garder.map(x => x.id), j2: p2.jeter.map(x => x.id) };
  });
  ok(dbl.g1.length === 1 && dbl.g1[0] === 'fraiche' && dbl.j1[0] === 'vieille',
     'deux copies du même jour : la plus récente est gardée (' + JSON.stringify(dbl.g1) + ' gardée, ' + JSON.stringify(dbl.j1) + ' jetée)');
  ok(JSON.stringify(dbl.g1) === JSON.stringify(dbl.g2) && JSON.stringify(dbl.j1) === JSON.stringify(dbl.j2),
     'et le résultat ne dépend pas de l\'ordre dans lequel Drive rend les fichiers');
  await ctx.close();
}

console.log('\n== 244) Dépendances : un départ posé au 14 septembre compte 0 jour avant le 14 ==');
{
  const { ctx, fr } = await ouvrir('2026-09-10T12:00:00+02:00', {'batcave-addictions': {snus:{start:'2026-09-14', record:0, log:[]}}});
  const t = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="addictions"]').click(); return document.querySelector('section[data-page="addictions"]').innerText.replace(/\s+/g,' '); });
  ok(!/(^|\s)-\d/.test(t), 'aucun compteur négatif sur la page Dépendances');
  await ctx.close();
}
await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
