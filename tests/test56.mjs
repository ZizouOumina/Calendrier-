/* Nouveau départ : effacement des saisies partout (local + cloud + autres appareils), configuration gardée. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

/* faux cloud PERSISTANT (sessionStorage) : il survit aux rechargements, comme le vrai */
const MOCK = (cfg) => {
  let stocke = null; try{ stocke = JSON.parse(sessionStorage.getItem('__cloud56') || 'null'); }catch(e){}
  window.__cloud = stocke || Object.assign({}, cfg.cloud || {});
  const persist = () => { try{ sessionStorage.setItem('__cloud56', JSON.stringify(window.__cloud)); }catch(e){} };
  persist();
  window.__sets = []; window.__deletes = [];
  const db = {
    doc(path){ const k = path.replace(/^state\//,''); return {
      set(v){ window.__sets.push({k, v}); window.__cloud[k] = v && v.v; persist(); return Promise.resolve(); },
      delete(){ window.__deletes.push(k); delete window.__cloud[k]; persist(); return Promise.resolve(); }
    }; },
    collection(){ return { onSnapshot(cb){
      const inst = Object.assign({}, window.__cloud);
      cb({ empty: Object.keys(inst).length === 0, docs: Object.keys(inst).map(k => ({id:k, data: () => ({v: inst[k], d: 'appareil-distant', t: 1})})) });
      return () => {};
    } }; }
  };
  const mcp = { watchTool(){ return () => {}; }, callTool(){ return Promise.resolve({payload:{files:[]}}); }, invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); } };
  window.claude = { use(n){ return Promise.resolve(n === 'db' ? db : (n === 'mcp' ? mcp : null)); } };
  try{ sessionStorage.setItem('batcave-cloud-reload-at', String(Date.now())); }catch(e){}
};
async function ouvrir(quand, opts){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK, opts.mock || {});
  if(opts.local) await ctx.addInitScript(x => { try{ if(sessionStorage.getItem('__a56')) return; sessionStorage.setItem('__a56','1'); }catch(e){} Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, opts.local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(700);
  return { ctx, page, fr };
}
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const cloud = (fr) => fr.evaluate(() => Object.assign({}, window.__cloud));
const MARDI = '2026-09-08T07:00:00+02:00';
const DONNEES = {
  'batcave-journal-2026-09-01': {sommeil:'7', poids:'64', water:500, complements:[], notes:'test', mood:3, coran:'', duaa:''},
  'batcave-sessions': [{id:'s1', date:'2026-09-01', type:'cours', label:'Anatomía', duree:60, debut:1, fin:2}],
  'batcave-taches': [{id:'t1', text:'vieille tâche', due:'', priority:'Basse', status:'À faire'}],
  'batcave-transactions': [{id:'tx1', date:'2026-09-01', type:'Dépense', categorie:'Autres', montant:9, methode:'Carte'}],
  'batcave-addictions': {snus:{start:'2026-09-01', record:3, log:[]}},
  'batcave-habits': [{id:'core-lit', label:'Lit fait', icon:'🛏️'}, {id:'habX', label:'Ma propre habitude'}],
  'batcave-fixed-charges': [{id:'fc1', label:'Loyer', montant:700, cat:'Logement'}],
  'batcave-examens': {'Anatomía I':'2026-10-16'},
  'batcave-pomodial-importees': {'abc': true}, 'batcave-pomodial-purge': true,
  'batcave-gcal-2026-09-08': {p4:{id:'x', empreinte:'y'}}
};

console.log('\n== 200) Depuis l\'appli : tout est effacé ici et dans le cloud, la configuration reste ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI, { local: DONNEES, mock: { cloud: Object.assign({}, DONNEES) } });
  ok((await local(fr, 'batcave-taches')).length === 1, 'les données de test sont là avant');
  await fr.evaluate(() => { document.querySelector('.backup-trigger').click(); });
  await page.waitForTimeout(100);
  const visible = await fr.evaluate(() => !document.getElementById('backup-overlay').hidden && !!document.getElementById('reinit-btn'));
  ok(visible, 'le bouton « Remettre à zéro » est dans l\'écran de sauvegarde');
  await fr.evaluate(() => document.getElementById('reinit-btn').click());
  await page.waitForTimeout(100);
  const q = await fr.evaluate(() => (document.getElementById('ask-msg') || {textContent:''}).textContent);
  ok(/entrée\(s\)/.test(q) && /configuration/.test(q), 'confirmation explicite : ' + q.slice(0, 60));
  await fr.evaluate(() => document.getElementById('ask-ok').click());
  await page.waitForTimeout(400);
  const c = await cloud(fr);
  ok(!c['batcave-journal-2026-09-01'] && !c['batcave-sessions'] && !c['batcave-taches'] && !c['batcave-transactions'] && !c['batcave-addictions'] && !c['batcave-gcal-2026-09-08'], 'les saisies sont supprimées du cloud');
  const gardes = ['batcave-habits','batcave-fixed-charges','batcave-examens','batcave-pomodial-importees'];
  ok(gardes.every(k => c[k]), 'habitudes, charges fixes, examens et suivi PomoDial gardés dans le cloud' + (gardes.filter(k => !c[k]).length ? ' — manque ' + gardes.filter(k => !c[k]).join(', ') + ' · clés cloud : ' + Object.keys(c).join(' ') : ''));
  ok(c['batcave-reinit'] && c['batcave-reinit'].id && c['batcave-reinit'].date === '2026-09-08', 'le marqueur de nouveau départ est écrit dans le cloud');
  /* les objectifs de septembre et du trimestre repartent du 8 : debut deplace, cibles cumulees au prorata (23/30 jours) */
  const objs = c['batcave-objectifs'] && c['batcave-objectifs'].liste || [];
  const revSept = objs.find(o => o.id === 'M2026-09:revision_h'), revT1 = objs.find(o => o.id === 'T1:revision_h'), sommeilSept = objs.find(o => o.id === 'M2026-09:sommeil_moy');
  ok(!!revSept && revSept.debut === '2026-09-08' && revSept.cible === 84.3, 'Révision de septembre : repart du 8, cible 110 h → 84,3 h (' + (revSept && revSept.cible) + ')');
  ok(!!revT1 && revT1.debut === '2026-09-08' && revT1.cible === 303.7, 'Révision du trimestre : repart du 8, cible 329 h → 303,7 h (' + (revT1 && revT1.cible) + ')');
  ok(!!sommeilSept && sommeilSept.debut === '2026-09-08' && sommeilSept.cible === 7.75, 'une moyenne (sommeil, 7,75 h) repart du 8 sans changer de cible');
  await page.waitForTimeout(2200);   /* rechargement automatique */
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(700);
  ok(await local(fr2, 'batcave-taches') === null && await local(fr2, 'batcave-journal-2026-09-01') === null, 'après rechargement : plus de tâches ni de journal');
  const habits = await local(fr2, 'batcave-habits');
  ok(Array.isArray(habits) && habits.some(h => h.id === 'habX'), 'ma propre habitude est toujours là');
  const applied = await fr2.evaluate(() => localStorage.getItem('bc-reinit-appliquee'));
  const c2 = await cloud(fr2);
  ok(applied === c2['batcave-reinit'].id, 'cet appareil a noté le nouveau départ comme appliqué');
  ok(!c2['batcave-taches'] && !c2['batcave-sessions'], 'le rattrapage n\'a rien renvoyé dans le cloud');
  const banniere = await fr2.evaluate(() => ({ cache: document.getElementById('coherence-banner').hidden, txt: document.getElementById('coherence-liste').innerText.slice(0, 160) }));
  ok(banniere.cache === true, 'aucune incohérence signalée' + (banniere.cache ? '' : ' — ' + banniere.txt));
  await ctx.close();
}

console.log('\n== 201) Décidé ailleurs (cloud) : l\'autre appareil s\'efface à l\'ouverture, sans rien renvoyer ==');
{
  const cloudInit = {'batcave-reinit': {id:'r-distant-1', date:'2026-09-08'}, 'batcave-habits': DONNEES['batcave-habits'], 'batcave-fixed-charges': DONNEES['batcave-fixed-charges'], 'batcave-examens': DONNEES['batcave-examens']};
  const { ctx, fr, page } = await ouvrir(MARDI, { local: DONNEES, mock: { cloud: cloudInit } });
  const sets = await fr.evaluate(() => window.__sets.map(s => s.k));
  ok(!sets.includes('batcave-taches') && !sets.includes('batcave-sessions') && !sets.includes('batcave-journal-2026-09-01'), 'aucune vieille copie locale renvoyée vers le cloud');
  ok(await local(fr, 'batcave-taches') === null && await local(fr, 'batcave-addictions') === null, 'tâches et dépendances effacées localement');
  ok(await local(fr, 'batcave-examens') !== null && (await local(fr, 'batcave-habits')).some(h => h.id === 'habX'), 'configuration gardée');
  ok(await fr.evaluate(() => localStorage.getItem('bc-reinit-appliquee')) === 'r-distant-1', 'marqué appliqué sur cet appareil');
  /* on saisit une nouvelle donnée, puis on rouvre : le même marqueur ne doit PAS ré-effacer */
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="taches"]').click(); document.getElementById('tk-text').value = 'Nouvelle tâche du 8'; document.getElementById('tk-add').click(); });
  await page.waitForTimeout(150);
  await page.reload().catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(700);
  const tk = await local(fr2, 'batcave-taches');
  ok(Array.isArray(tk) && tk.length === 1 && tk[0].text === 'Nouvelle tâche du 8', 'une saisie faite après le nouveau départ survit à la réouverture');
  await ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
