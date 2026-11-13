/* 13 novembre, « je veux que tout soit parfait pour demain » : les consignes ponctuelles d'octobre, perimees, quittent
   sa liste une fois (taches-octobre-v1) ; ses demarches restent ; le plan du jour 1 ne s'ouvre plus sur l'ancien jour 1. */
import { chromium } from 'playwright';
const URL = process.env.BC_HOST || 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { try{ if(sessionStorage.getItem('__amorce')) return; sessionStorage.setItem('__amorce','1'); }catch(e){} Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const lire = (fr, k) => fr.evaluate(k => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))(k) || 'null'), k);
const T = (id, due, status, text, priority) => ({id, due, priority: priority || 'Haute', status, text});
/* SA liste, telle que la sauvegarde du 11 novembre la porte (les textes raccourcis) */
const SIENNE = [
  T('t1792416491554', '2026-10-19', 'Fait', '🤖 Projet Dentaire dans claude.ai'),
  T('t1792416491555', '2026-10-19', 'Fait', '🃏 Anki : importer les paquets'),
  T('t1792416491556', '2026-10-19', 'Fait', '📥 Canvas : télécharger les diapos de la semaine'),
  T('t1792416491564', '2026-10-22', 'À faire', '🌱 Jeudi 22 au matin, jour 1, avant toute saisie : la copie vierge'),
  T('t1792416491557', '2026-10-22', 'À faire', '🍱 Les repas de jeudi (jour 1) : couscous'),
  T('t1792541669672', '2026-10-21', 'À faire', '🛒 À acheter pour le nouveau plan : couscous'),
  T('t1792416491558', '2026-10-22', 'À faire', '🥚 10 œufs durs (10 min) pour les collations de la semaine'),
  T('t1792416491560', '2026-10-21', 'À faire', '📖 Lire « Ta journée, pas à pas »', 'Moyenne'),
  T('t1792416491562', '2026-10-21', 'À faire', '🧹 15 min : bureau dégagé', 'Moyenne'),
  T('t1792416491563', '2026-10-21', 'À faire', '🌙 Ce soir (plan sommeil) : douche 21:55, écran off 22:10, au lit 22:45 — pas avant'),
  T('t1792416491565', '2026-10-21', 'À faire', '✉️ Ambassade du Luxembourg à Madrid'),
  T('t1792416491566', '2026-10-21', 'À faire', '✉️ Fac : revoir le mode de paiement de l\'année'),
  T('t1792416491567', '2026-10-21', 'À faire', '✉️ Contacter IKEA', 'Moyenne'),
  T('t1792416491561', '2026-10-25', 'À faire', '💶 Budget : le suivi commence au virement du mois prochain', 'Moyenne'),
  T('t1792416491559', '2026-10-25', 'À faire', '👟 Dimanche soir : préparer le 05:30 du lundi 26'),
  T('t1792537948512', '2026-10-26', 'À faire', '🏊 Réserver le nado libre du mardi 27', 'Moyenne'),
  T('t1792537948513', '2026-10-27', 'En cours', '🥋 Premier JJB demain 10:30', 'Moyenne')
];

console.log('\n== 1) Sa liste : les onze consignes d\'octobre partent, ses démarches et ce qui est fait restent ==');
{
  const { ctx, fr } = await ouvrir('2026-11-14T05:25:00+01:00', {'batcave-taches': SIENNE});
  const t = await lire(fr, 'batcave-taches');
  const ids = t.map(x => x.id);
  ok(t.length === 6, 'six tâches restent (' + t.length + ')');
  ok(['t1792416491565', 't1792416491566', 't1792416491567'].every(i => ids.includes(i)), 'l\'ambassade, la fac et IKEA restent');
  ok(['t1792416491554', 't1792416491555', 't1792416491556'].every(i => ids.includes(i)), 'les trois faites restent, avec leur statut');
  ok(!ids.includes('t1792416491563') && !ids.includes('t1792416491564') && !ids.includes('t1792537948513'), 'le coucher à 22:45, l\'ancien jour 1 et le premier JJB d\'octobre (en cours) sont partis');
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(!/Jeudi 22 au matin|22:45|couscous|nado/.test(plan), 'le plan du jour 1 ne parle plus de l\'ancien jour 1, ni du coucher à 22:45, ni du couscous');
  ok(/Ambassade du Luxembourg/.test(plan), 'ses démarches en retard y restent : ' + ((plan.match(/[^\n]*Ambassade[^\n]*/) || [''])[0]).slice(0, 80));
  const n = await fr.evaluate(() => document.querySelectorAll('#taches-list .entry-row').length);
  ok(n === 6, 'l\'onglet Tâches en montre six (' + n + ')');
  ok(await lire(fr, 'batcave-taches-octobre-v1') === true, 'le drapeau est posé');
  await ctx.close();
}

console.log('\n== 2) Une seule fois : une tâche qu\'il recrée avec le même texte n\'est pas touchée ==');
{
  const reprise = [T('t1799999999999', '2026-11-20', 'À faire', '🌙 Ce soir (plan sommeil) : douche 21:55, écran off 22:10, au lit 22:45 — pas avant')];
  const { ctx, fr } = await ouvrir('2026-11-14T09:00:00+01:00', {'batcave-taches': SIENNE.concat(reprise), 'batcave-taches-octobre-v1': true});
  const t = await lire(fr, 'batcave-taches');
  ok(t.length === SIENNE.length + 1, 'drapeau posé : rien ne bouge (' + t.length + ')');
  await ctx.close();
  const b = await ouvrir('2026-11-14T09:00:00+01:00', {'batcave-taches': reprise});
  const t2 = await lire(b.fr, 'batcave-taches');
  ok(t2.length === 1 && t2[0].id === 't1799999999999', 'une tâche à lui, au même texte mais à un autre identifiant, reste');
  await b.ctx.close();
}

console.log('\n== 3) Une Batcave neuve : rien à retirer, le drapeau posé quand même ==');
{
  const { ctx, fr } = await ouvrir('2026-11-14T09:00:00+01:00');
  ok(await lire(fr, 'batcave-taches-octobre-v1') === true, 'le drapeau est posé au premier chargement');
  const n = await fr.evaluate(() => (window.__bcTachesPerimees ? window.__bcTachesPerimees().length : 0));
  ok(n === 11, 'onze identifiants dans la liste (' + n + ')');
  await ctx.close();
}

console.log('\n== 4) La météo prend le nom que claude.ai affiche chez lui (« AccuWeather », sans le ®) ==');
{
  for(const [nom, attendu] of [['AccuWeather', 'AccuWeather'], [null, 'AccuWeather®']]){
    const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
    await ctx.addInitScript((nom) => {
      window.__watches = [];
      const mcp = {
        callTool(){ return Promise.resolve({content:[], payload:{}}); },
        watchTool(server, tool, input, handler){
          window.__watches.push(server + '/' + tool);
          Promise.resolve().then(() => {
            if(tool === 'widgets-current-claude') handler({type:'data', result:{payload:{location:{localizedName:'Alicante'}, currentConditions:{temperatureValue:20.3, phrase:'Plutôt dégagé', extended:{uv:{value:0}}}}}});
            else handler({type:'error', error:{code:'server_not_connected', message:'x'}});
          });
          return () => {};
        },
        invalidate(){ return Promise.resolve(); },
        listTools(){ return Promise.resolve({servers: nom ? [{server: nom, authStatus:'connected', tools:[{name:'widgets-current-claude', description:''}]}, {server:'AccuWeather®', authStatus:'connected', tools:[]}] : []}); }
      };
      window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
    }, nom);
    const page = await ctx.newPage();
    page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
    await page.clock.install({ time: new Date('2026-11-14T07:00:00+01:00') });
    await page.goto(URL, {timeout:20000}).catch(() => {});
    await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
    const fr = page.frames().find(x => x.url().includes('batcave.html'));
    await page.waitForTimeout(800);
    const w = await fr.evaluate(() => window.__watches.filter(x => /AccuWeather/.test(x)));
    const meteo = await fr.evaluate(() => (document.getElementById('dash-weather') || {}).textContent || '');
    ok(w.length === 3 && w.every(x => x.startsWith(attendu + '/')), (nom ? 'branché sous « ' + nom + ' »' : 'listTools muet') + ' : les trois lectures météo partent sous « ' + attendu + ' » (' + w.join(', ') + ')');
    ok(/20°C/.test(meteo) && /Alicante/.test(meteo), 'et la météo s\'affiche : ' + meteo);
    await ctx.close();
  }
}

console.log('\n== 5) Pas de viande jeudi, pas de batch vendredi : le week-end du départ tient quand même ==');
{
  const { ctx, fr, page } = await ouvrir('2026-11-14T13:00:00+01:00');
  const r = await fr.evaluate(() => {
    const t = (iso, re) => (window.__bcRappels(iso).filter(b => re.test(b.titre))[0] || {}).description || '';
    return { dej14: t('2026-11-14', /Déjeuner/), din14: t('2026-11-14', /Dîner/), range14: t('2026-11-14', /Rangement/), courses14: t('2026-11-14', /Courses/),
             dej15: t('2026-11-15', /Déjeuner/), din15: t('2026-11-15', /Dîner/), batch13: window.__bcRappels('2026-11-13').some(b => /Batch/.test(b.titre)) };
  });
  ok(/repas frais/.test(r.dej14) && /3 œufs/.test(r.dej14) && /placard/.test(r.dej14) && !/boîte du jour/.test(r.dej14), 'samedi midi : un repas frais, 3 œufs, sinon le placard');
  ok(/repas frais/.test(r.dej15) && /courses d'hier/.test(r.dej15) && !/dernière boîte/.test(r.dej15), 'dimanche midi : un repas frais aussi, plus de « dernière boîte du batch »');
  ok(/cuite sur le moment/.test(r.din14) && /70 g émiettés/.test(r.din14), 'samedi soir : la viande hachée des courses, cuite sur le moment');
  ok(/la boîte du jour/.test(r.din15), 'dimanche soir : la boîte de la session du dimanche, comme prévu');
  ok(/70 g de viande hachée de ce soir/.test(r.range14) && /3 œufs/.test(r.range14), 'au rangement : la viande du soir au frigo, 3 œufs durs pour la collation');
  ok(/Pas de batch hier/.test(r.courses14), 'les courses le disent');
  ok(!r.batch13, 'plus de batch le vendredi 13');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="courses"]').click());
  await page.waitForTimeout(400);
  const c = await fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(/Viande hachée 5 % — 560 g/.test(c) && /dont 70 g pour samedi soir/.test(c), 'la liste du samedi 14 : 560 g de viande hachée, dont 70 pour le soir');
  ok(/Œufs — 24/.test(c) && /21 œufs/.test(c), 'et 24 œufs pour les 21 du plan');
  await ctx.close();
  const b = await ouvrir('2026-11-21T09:00:00+01:00');
  await b.fr.evaluate(() => document.querySelector('.nav-btn[data-page="courses"]').click());
  await b.page.waitForTimeout(400);
  const c2 = await b.fr.evaluate(() => document.getElementById('courses-grid').innerText);
  ok(/Viande hachée 5 % — 490 g/.test(c2) && /Œufs — 18/.test(c2) && !/samedi soir/.test(c2), 'le samedi 21, la semaine type revient : 490 g, 18 œufs');
  await b.ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
