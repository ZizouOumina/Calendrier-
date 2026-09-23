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
  /* Les objectifs de septembre et du trimestre repartent du 8 : debut deplace, cibles
     recalculees sur la grille des jours restants. Cette grille ne prevoit rien avant le
     15 septembre, premier jour du programme : les cibles ne comptent donc que du 15 au
     30 (septembre) et du 15 au 30 novembre (trimestre).
     Le depart est passe du lundi 14 au mardi 15, et les deux chiffres ci-dessous perdent
     exactement la revision de ce lundi-la, au prorata du nouveau depart :
       septembre  65,8 → 61,9 avant prorata, x 23/30  → 50,4 → 47,5
       trimestre  265 min x 0,89 / 60 = 3,93 h, x 84/91 = 3,6 → 289,9 → 286,3
     Lot 38 : le depart passe au jeudi 17 (mardi 15 et mercredi 16 sortent du compte) :
       septembre 47,5 → 40,9 et trimestre 286,3 → 278,4, au meme prorata.
     Lot 40 : le depart passe au vendredi 18 (le jeudi 17 sort du compte) :
       septembre 40,9 → 37,8 et trimestre 278,4 → 274,7.
     Lot 41 : le depart passe au samedi 19 (le vendredi 18 sort du compte) :
       septembre 37,8 → 35,4 et trimestre 274,7 → 271,8. Lot 41 : la grille du 18 septembre donne 40,1 et 304,7.
       Lot 43 : le depart passe au dimanche 20, le samedi 19 sort du compte → 37,1 et 291,7.
       19 septembre : le depart passe au LUNDI 21, et les objectifs de TRIMESTRE sont
       retires -- il n'a voulu qu'un seul palier. Septembre tombe a 34,7 h, et il n'y a
       plus de cible de trimestre a verifier.
       Nuit du 20 au 21 : le depart passe au MARDI 22, le lundi 21 sort du compte
       -> 34,7 tombe a 31,2 h.
       Soir du 22 : le depart passe au MERCREDI 23 apres une nuit blanche et un cours
       manque, le mardi 22 sort du compte -> 31,2 tombe a 27,2 h.
       Matin du 23 : encore une nuit blanche, le depart passe au JEUDI 24, le mercredi 23
       sort du compte -> 27,2 tombe a 23,2 h. Le chiffre n'est jamais
       ecrit a la main : il est ce que la grille contient sur le mois, a 89 %. */
  const objs = c['batcave-objectifs'] && c['batcave-objectifs'].liste || [];
  const revSept = objs.find(o => o.id === 'M2026-09:revision_h'), revT1 = objs.find(o => o.id === 'T1:revision_h'), sommeilSept = objs.find(o => o.id === 'M2026-09:sommeil_moy');
  ok(!!revSept && revSept.debut === '2026-09-08' && revSept.cible === 23.2, 'Révision de septembre : repart du 8, cible ramenée aux jours réellement programmés → 23,2 h (' + (revSept && revSept.cible) + ')');
  /* Deux fois de suite ce chiffre a bouge, et jamais par accident.
     284 → 286,9 : « Projets perso 4, 5 et 6 » basculent en revision ciblee pendant les
     partiels. L'examen seme ici (16 octobre) ouvre une fenetre du 9 au 16 qui contient un
     lundi et un mardi : 101 min le lundi (le bloc de 15:00) et 2 x 55 le mardi (19:00 et
     20:30), soit 211 min nets. x 0,89 de marge = 3,13 h, x 84/91 de prorata du nouveau
     depart = 2,89 h.
     286,9 → 289,9 : les jours feries ont un agenda. Dans T1, DEUX jours changent, et deux
     seulement (verifie jour par jour sur les 91 dates du trimestre) : le vendredi 9 octobre
     (320 → 485 min de revision prevue) et le lundi 12 octobre (476 → 531). Les deux sont
     dans la fenetre de partiels, donc la plage de cours liberee devient de l'annale complete,
     sa correction et de la revision ciblee. +220 min nets x 0,89 = 3,26 h, x 84/91 = 3,01 h. */
  ok(revT1 === undefined, 'plus d\'objectif de trimestre a recaler : il n\'y en a plus qu\'un palier, le mois');
  /* La cible semee de sommeil (7,75 h de temps au lit) est realignee sur le sommeil REEL
     vise depuis le 23 septembre : elle repart du 8 avec cette cible-la, entre 6,5 et 7,75 h. */
  ok(!!sommeilSept && sommeilSept.debut === '2026-09-08' && sommeilSept.cible > 6.5 && sommeilSept.cible < 7.75, 'une moyenne (sommeil) repart du 8 avec la cible de sommeil réel (' + (sommeilSept && sommeilSept.cible) + ' h)');
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
  ok(Array.isArray(tk) && tk.length === 1 && tk[0].text === 'Nouvelle tâche du 8', 'une saisie faite après le nouveau départ survit à la réouverture : ' + JSON.stringify(tk));
  await ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
