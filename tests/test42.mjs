/* Course entre une migration de démarrage et l'hydratation du cloud.
   Le semis d'habitudes tourne au chargement du script, quand dbHandle est encore nul :
   save() n'écrit donc qu'en local. Le premier instantané rattrape ensuite les clés que le
   cloud ignore -- dont le drapeau « semis fait », qui est neuf -- puis écrase les clés que
   le cloud possède déjà, dont batcave-habits. Résultat observé en production : le drapeau
   part dans le cloud, l'habitude est annulée, et le semis ne se rejoue plus jamais. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

/* Faux cloud mutable ET PERSISTANT. Un vrai cloud survit aux rechargements de la page ;
   un mock recree a chaque navigation ne peut jamais converger, et donne l'illusion que le
   code ne pousse rien alors qu'il pousse a chaque fois dans un objet neuf. On l'adosse
   donc a sessionStorage, qui survit au reload dans le meme onglet. */
const MOCK = (depart) => {
  const LIRE = (k, d) => { try{ const v = sessionStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } };
  const ECRIRE = (k, v) => { try{ sessionStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  window.__cloud = LIRE('__mockcloud', null) || Object.assign({}, depart);
  window.__w = LIRE('__mockw', []);
  const persister = () => { ECRIRE('__mockcloud', window.__cloud); ECRIRE('__mockw', window.__w); };
  persister();
  const db = {
    doc(path){ const k = path.replace(/^state\//,''); return {
      set(v){ window.__w.push(k); window.__cloud[k] = v && v.v; persister(); return Promise.resolve(); },
      delete(){ delete window.__cloud[k]; persister(); return Promise.resolve(); }
    }; },
    collection(){ return { onSnapshot(cb){
      const inst = Object.assign({}, window.__cloud);
      cb({ empty: Object.keys(inst).length === 0,
           docs: Object.keys(inst).map(k => ({id:k, data: () => ({v: inst[k]})})) });
      return () => {};
    } }; }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'db' ? db : null); } };
};

async function ouvrir(cloud, local, quand){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK, cloud);
  /* amorcage UNE SEULE FOIS : addInitScript se rejoue a chaque navigation, donc a chaque
     rechargement declenche par la synchro -- il remettait le localStorage a son etat de
     depart et effacait tout ce que la page venait de faire converger. */
  if(local) await ctx.addInitScript(x => {
    try{ if(sessionStorage.getItem('__amorce')) return; sessionStorage.setItem('__amorce','1'); }catch(e){}
    Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k])));
  }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(function(){});  /* un rechargement declenche par la synchro peut faire expirer goto : la vraie synchro, c'est le selecteur ci-dessous */
  await page.frameLocator('#f').locator('#dash-checklist').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(900);
  return { ctx, fr, page };
}

/* Le rendu peut arriver apres un rechargement declenche par la synchro : on interroge le
   DOM jusqu'a ce qu'il se stabilise, plutot que de parier sur un delai fixe. */
async function attendreTexte(page, sel, re, delai){
  const t0 = Date.now();
  while(Date.now() - t0 < (delai || 8000)){
    const f = page.frames().find(x => x.url().includes('batcave.html'));
    if(f){
      let vu = '';
      try{ vu = await f.evaluate(x => { const e = document.querySelector(x); return e ? e.innerText : ''; }, sel); }catch(e){}
      if(re.test(vu)) return true;
    }
    await page.waitForTimeout(250);
  }
  return false;
}
const dansCloud = fr => fr.evaluate(() => window.__cloud);
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);

const SAMEDI = '2026-09-05T10:00:00+02:00';
/* l'état exact du compte : le cloud fait autorité sur les habitudes, il ignore le lot V3 */
const HABITS_17 = [
  {id:'core-lit', label:'Lit fait', icon:'🛏️'},
  {id:'core-fajr', label:'Fajr', icon:'🕌'},
  {id:'hab1788303536189', label:'Passer le balais'}
];
const CLOUD = {'batcave-habits': HABITS_17, 'batcave-habits-seed-v2': true};

console.log('\n== 95) Le semis survit à l\'hydratation du cloud ==');
{
  const { ctx, fr, page } = await ouvrir(CLOUD, {'batcave-habits': HABITS_17, 'batcave-habits-seed-v2': true}, SAMEDI);
  const cl = await dansCloud(fr);
  const habs = cl['batcave-habits'] || [];
  ok(habs.some(h => h.id === 'core-courses'), 'le cloud reçoit bien l\'habitude, pas seulement le drapeau');
  ok(cl['batcave-habits-seed-v3'] === true, 'le drapeau V3 est dans le cloud');
  ok(habs.some(h => h.id === 'core-lit') && habs.some(h => h.id === 'hab1788303536189'),
     'les habitudes du cloud sont conservées');
  const loc = await local(fr, 'batcave-habits');
  ok(loc.some(h => h.id === 'core-courses'), 'le local aussi, après hydratation');
  ok(await attendreTexte(page, '#dash-checklist', /Courses faites/),
     'elle est affichée dans la liste du samedi');
  await ctx.close();
}

console.log('\n== 96) Jamais le drapeau seul (l\'état corrompu observé en production) ==');
{
  const { ctx, fr } = await ouvrir(CLOUD, {'batcave-habits': HABITS_17, 'batcave-habits-seed-v2': true}, SAMEDI);
  const cl = await dansCloud(fr);
  const drapeau = cl['batcave-habits-seed-v3'] === true;
  const donnee = (cl['batcave-habits'] || []).some(h => h.id === 'core-courses');
  ok(!(drapeau && !donnee), 'drapeau et habitude arrivent ensemble, ou pas du tout');
  await ctx.close();
}

console.log('\n== 97) Un cloud déjà à jour ne déclenche aucune réécriture ==');
{
  const aJour = {'batcave-habits': HABITS_17.concat([{id:'core-courses', label:'Courses faites', icon:'🛒', jour:6}]),
                 'batcave-habits-seed-v2': true, 'batcave-habits-seed-v3': true};
  const { ctx, fr } = await ouvrir(aJour, aJour, SAMEDI);
  const ecrits = await fr.evaluate(() => window.__w.filter(k => k === 'batcave-habits'));
  ok(ecrits.length === 0, 'aucune réécriture inutile de batcave-habits');
  const cl = await dansCloud(fr);
  ok((cl['batcave-habits'] || []).filter(h => h.id === 'core-courses').length === 1, 'pas de doublon');
  await ctx.close();
}

console.log('\n== 98) Sans cloud, le semis local fonctionne toujours ==');
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); },
                          {'batcave-habits': HABITS_17, 'batcave-habits-seed-v2': true});
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(SAMEDI) });
  await page.goto(URL, {timeout:20000}).catch(function(){});  /* un rechargement declenche par la synchro peut faire expirer goto : la vraie synchro, c'est le selecteur ci-dessous */
  await page.frameLocator('#f').locator('#dash-checklist').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(1200);
  const loc = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-habits')));
  ok(loc.some(h => h.id === 'core-courses'), 'fichier .html hors ligne : l\'habitude est semée');
  await ctx.close();
}

console.log('\n== 99) La fusion de l\'historique de révision survit à l\'hydratation ==');
{
  /* trois lignes, deux le même jour : la fusion doit en laisser deux, et le résultat doit
     atteindre le cloud -- pas seulement le drapeau. */
  const DOUBLONS = [
    {id:'r1', date:'2026-08-31', duree:60, matieres:{'0':60}},
    {id:'r2', date:'2026-08-31', duree:30, matieres:{'0':30}},
    {id:'r3', date:'2026-08-30', duree:45}
  ];
  const cl0 = {'batcave-revision': DOUBLONS, 'batcave-habits': HABITS_17,
               'batcave-habits-seed-v2': true, 'batcave-habits-seed-v3': true};
  const { ctx, fr } = await ouvrir(cl0, cl0, SAMEDI);
  const cl = await dansCloud(fr);
  const rev = cl['batcave-revision'] || [];
  ok(rev.length === 2, 'le cloud reçoit l\'historique fusionné (2 lignes, pas 3) — reçu ' + rev.length);
  ok(cl['batcave-revision-fusionnee'] === true, 'le drapeau de fusion est posé');
  const jour = rev.filter(r => r.date === '2026-08-31')[0];
  ok(jour && jour.duree === 90, 'les durées du même jour sont additionnées (90 min)');
  ok(jour && jour.matieres && jour.matieres['0'] === 90, 'le détail par matière survit à la fusion');
  await ctx.close();
}

console.log('\n== 100) Jamais un drapeau de migration seul, quelle que soit la migration ==');
{
  /* l'ajustement de prix iCloud : 1 € dans le cloud, drapeau absent. L'état interdit est
     « drapeau posé ET prix resté à 1 » — la migration serait perdue pour toujours. */
  const CHARGES = [{cat:'Abonnements', id:'fc8', label:'iCloud', montant:1}];
  const cl0 = {'batcave-fixed-charges': CHARGES, 'batcave-habits': HABITS_17,
               'batcave-habits-seed-v2': true, 'batcave-habits-seed-v3': true};
  const { ctx, fr } = await ouvrir(cl0, cl0, SAMEDI);
  const cl = await dansCloud(fr);
  const drapeau = cl['batcave-fc-prix-icloud-3'] === true;
  const fc8 = (cl['batcave-fixed-charges'] || []).filter(c => c.id === 'fc8')[0];
  ok(!(drapeau && fc8 && Number(fc8.montant) === 1),
     'drapeau prix et ajustement ne divergent pas (drapeau=' + drapeau + ', montant=' + (fc8 && fc8.montant) + ')');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
