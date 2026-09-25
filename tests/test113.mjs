import { chromium } from 'playwright';
/* Lot 56 · Les ecritures qui n'atteignent pas le cloud.
   Deux appareils (Mac, iPhone) partagent un faux cloud. Chaque appareil peut etre coupe du
   reseau : ses ecritures echouent alors avec « unavailable », comme le vrai cloud. */
const URL = process.env.BC_URL || 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();

const cloud = new Map();
const hors = {mac: false, iphone: false};
const echecUnique = {mac: 0, iphone: 0};
const partielDabord = {mac: false, iphone: false};
const ecritures = {mac: [], iphone: []};

async function appareil(nom, quand){
  const ctx = await browser.newContext({ viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Madrid', locale: 'fr-FR' });
  await ctx.exposeFunction('__nuage', (op, id, body) => {
    if(op === 'mode') return {partiel: partielDabord[nom]};
    if(hors[nom]) throw new Error('unavailable');
    if(op === 'all') return [...cloud.entries()].map(([id, b]) => ({id, body: b}));
    if(op === 'del'){ cloud.delete(id); return true; }
    if(echecUnique[nom] > 0){ echecUnique[nom]--; throw new Error('unavailable'); }
    ecritures[nom].push(id);
    cloud.set(id, JSON.parse(JSON.stringify(body)));
    return true;
  });
  await ctx.addInitScript(() => {
    const instantane = (docs, cache) => ({ empty: !docs.length, metadata: {fromCache: !!cache, hasPendingWrites: false}, docs: docs.map(d => ({ id: d.id, data: () => d.body })) });
    const db = {
      collection: () => ({ onSnapshot: (cb) => {
        window.__livrer = () => window.__nuage('all').then(docs => cb(instantane(docs, false))).catch(() => {});
        window.__nuage('mode').then(m => {
          if(m.partiel){
            /* une premiere page en cache, sans les sessions, puis la version definitive */
            window.__nuage('all').then(docs => {
              cb(instantane(docs.filter(d => !/sessions|revision/.test(d.id)).slice(0, 20), true));
              setTimeout(() => window.__livrer(), 1500);
            }).catch(() => {});
          } else window.__livrer();
        });
        return () => {};
      } }),
      doc: (path) => { const id = String(path).replace(/^state\//, ''); return { set: (b) => window.__nuage('set', id, b), delete: () => window.__nuage('del', id) }; }
    };
    window.claude = { use: (n) => Promise.resolve(n === 'db' ? db : null) };
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR (' + nom + '): ' + e.message); });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.clock.install({ time: new Date(quand) });
  const dev = { nom, ctx, page, fr: null };
  dev.ouvrir = async () => {
    await page.goto(URL);
    await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForTimeout(2500);   /* instantane, fusion, rechargement eventuel */
    dev.fr = page.frames().find(x => x.url().includes('batcave.html'));
    await dev.fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout: 20000});
    await page.waitForTimeout(600);
    dev.fr = page.frames().find(x => x.url().includes('batcave.html'));
    await dev.fr.evaluate(() => { ['ritual-dismiss', 'ask-cancel', 'pcc-vu'].forEach(id => { const r = document.getElementById(id); if(r && r.offsetParent !== null) r.click(); }); });
  };
  dev.ev = async (fn, arg) => { dev.fr = page.frames().find(x => x.url().includes('batcave.html')); return dev.fr.evaluate(fn, arg); };
  return dev;
}
const lire = (dev, k) => dev.ev(k => { const r = window.__bcLire(k); return r === null ? null : (typeof r === 'string' ? JSON.parse(r) : r); }, k);
const moisSess = 'batcave-sessions-2026-10', moisRev = 'batcave-revision-2026-10';
const revDuJour = (liste) => (liste || []).filter(r => r && r.date === '2026-10-06');
const totalRev = (liste) => revDuJour(liste).reduce((a, r) => a + (Number(r.duree) || 0), 0);

console.log('\n== 1) Hors ligne sur le Mac : deux Pomodoro survivent a la reouverture ==');
const mac = await appareil('mac', '2026-10-06T10:00:00+02:00');
await mac.ouvrir();
ok(cloud.size > 20, 'premiere ouverture : le cloud a recu les cles locales (' + cloud.size + ')');
await mac.ev(() => window.__bcReporterTemps(10, {matiere: 'Anatomía'}));
await mac.page.waitForTimeout(600);
ok(totalRev((cloud.get(moisRev) || {}).v) === 10, 'un premier bloc de 10 min est au cloud');
hors.mac = true;
await mac.ev(() => { window.__bcReporterTemps(25, {matiere: 'Anatomía'}); window.__bcReporterTemps(25, {matiere: 'Anatomía'}); });
await mac.page.waitForTimeout(3500);   /* le nouvel essai passe, et echoue aussi */
const att = await mac.ev(() => window.__bcAttente());
ok(moisSess in att && moisRev in att, 'les deux ecritures restent en attente : ' + Object.keys(att).join(', '));
ok(!(cloud.get(moisSess) || {v: []}).v.some(s => s.duree === 25), 'le cloud ne les a pas');
hors.mac = false;
await mac.ouvrir();
const sessMac = await lire(mac, 'batcave-sessions');
ok(sessMac.filter(s => s.date === '2026-10-06').length === 3, 'apres reouverture : les 3 blocs sont toujours la (' + sessMac.length + ')');
ok(totalRev(await lire(mac, 'batcave-revision')) === 60, 'et les 60 min du jour');
await mac.page.waitForTimeout(1200);
ok(((cloud.get(moisSess) || {}).v || []).filter(s => s.date === '2026-10-06').length === 3 && totalRev((cloud.get(moisRev) || {}).v) === 60, 'le cloud les a recus');
{ const r = await mac.ev(() => window.__bcAttente()); ok(Object.keys(r).length === 0, 'plus rien en attente ' + JSON.stringify(r)); }

console.log('\n== 2) iPhone hors ligne pendant que le Mac ecrit : fusion ==');
const iphone = await appareil('iphone', '2026-10-06T12:00:00+02:00');
await iphone.ouvrir();
ok(totalRev(await lire(iphone, 'batcave-revision')) === 60, 'l\'iPhone voit les 60 min du Mac');
hors.iphone = true;
await iphone.ev(() => window.__bcReporterTemps(30, {matiere: 'Histología'}));
await iphone.page.waitForTimeout(3500);
await mac.page.clock.setSystemTime(new Date('2026-10-06T12:40:00+02:00'));
await mac.ev(() => window.__bcReporterTemps(20, {matiere: 'Anatomía'}));
await mac.page.waitForTimeout(800);
ok(totalRev((cloud.get(moisRev) || {}).v) === 80, 'le cloud porte la version du Mac : 80 min');
hors.iphone = false;
await iphone.page.clock.setSystemTime(new Date('2026-10-06T13:00:00+02:00'));
await iphone.ouvrir();
const sessI = (await lire(iphone, 'batcave-sessions')).filter(s => s.date === '2026-10-06');
ok(sessI.length === 5, 'iPhone : les 5 blocs du jour (4 du Mac, 1 de l\'iPhone) : ' + sessI.length);
const revI = revDuJour(await lire(iphone, 'batcave-revision'));
ok(totalRev(revI) === 110, 'iPhone : 110 min, les minutes additionnees sans doublon : ' + totalRev(revI));
const mats = revI.reduce((a, r) => { Object.keys(r.matieres || {}).forEach(k => a[k] = (a[k] || 0) + r.matieres[k]); return a; }, {});
ok(mats['Anatomía'] === 80 && mats['Histología'] === 30, 'par matiere : ' + JSON.stringify(mats));
await iphone.page.waitForTimeout(1500);
ok(totalRev((cloud.get(moisRev) || {}).v) === 110, 'le cloud a recu la fusion : ' + totalRev((cloud.get(moisRev) || {}).v));
await mac.ouvrir();
ok(totalRev(await lire(mac, 'batcave-revision')) === 110 && (await lire(mac, 'batcave-sessions')).filter(s => s.date === '2026-10-06').length === 5, 'le Mac rouvert voit la meme chose');

console.log('\n== 3) Une premiere page en cache ne fait pas repartir une vieille copie ==');
await mac.page.goto('about:blank');
await iphone.ev(() => window.__bcReporterTemps(15, {matiere: 'Bioquímica'}));
await iphone.page.waitForTimeout(800);
ok(totalRev((cloud.get(moisRev) || {}).v) === 125, 'l\'iPhone a pousse 15 min de plus : 125');
partielDabord.mac = true;
ecritures.mac = [];
await mac.ouvrir();
await mac.page.waitForTimeout(1500);
ok(!ecritures.mac.includes(moisSess) || ((cloud.get(moisSess) || {}).v || []).filter(s => s.date === '2026-10-06').length === 6, 'le Mac n\'a pas ecrase les sessions du cloud avec sa vieille copie');
ok(totalRev((cloud.get(moisRev) || {}).v) === 125, 'le cloud garde 125 min');
ok(totalRev(await lire(mac, 'batcave-revision')) === 125, 'et le Mac les voit apres la version definitive');
partielDabord.mac = false;

console.log('\n== 4) Une erreur passagere est retentee une fois ==');
echecUnique.iphone = 1;
await iphone.ev(() => window.__bcReporterTemps(10, {matiere: 'Bioquímica'}));
await iphone.page.waitForTimeout(3500);
ok(totalRev((cloud.get(moisRev) || {}).v) === 135, 'le second essai est passe : 135 min au cloud');
ok(!(moisRev in await iphone.ev(() => window.__bcAttente())), 'plus en attente');

console.log('\n== 5) La fusion elle-meme ==');
const f = await iphone.ev(() => {
  const F = (b, l, c, add) => { const ctx = {conflit: false}; const v = window.__bcFusion3(b, l, c, !!add, ctx); return {v, c: ctx.conflit}; };
  const out = {};
  const A = {id: 'a', date: '2026-10-01', m: 1}, B = {id: 'b', date: '2026-10-02', m: 2}, C = {id: 'c', date: '2026-10-03', m: 3}, D = {id: 'd', date: '2026-10-04', m: 4};
  out.suppr = F([A, B], [A], [A, B, C]);                 /* B supprimee ici, C ajoutee ailleurs */
  out.supprAilleurs = F([A, B], [A, B, D], [A]);         /* B supprimee ailleurs, D ajoutee ici */
  out.modifs = F([A], [{...A, m: 9}], [A, C]);           /* A modifiee ici */
  out.deuxModifs = F([A], [{...A, m: 9}], [{...A, m: 7}]);
  out.repas = F({dej: false, din: false}, {dej: true, din: false}, {dej: false, din: true});
  out.dates = F({h1: ['2026-10-01']}, {h1: ['2026-10-01', '2026-10-02']}, {h1: ['2026-10-01', '2026-10-03'], h2: ['2026-10-03']});
  out.minutes = F([{id: 'r', date: '2026-10-06', duree: 50, matieres: {X: 50}}], [{id: 'r', date: '2026-10-06', duree: 80, matieres: {X: 50, Y: 30}}], [{id: 'r', date: '2026-10-06', duree: 70, matieres: {X: 70}}], true);
  out.sansBase = F(undefined, [A, D], [A, C]);
  return out;
});
ok(JSON.stringify(f.suppr.v.map(x => x.id)) === '["a","c"]' && !f.suppr.c, 'suppression d\'ici respectee, ajout d\'ailleurs garde');
ok(JSON.stringify(f.supprAilleurs.v.map(x => x.id)) === '["a","d"]', 'suppression d\'ailleurs respectee, ajout d\'ici garde');
ok(f.modifs.v.length === 2 && f.modifs.v[0].m === 9, 'modification d\'ici gardee a cote d\'un ajout d\'ailleurs');
ok(f.deuxModifs.v[0].m === 7 && f.deuxModifs.c, 'meme ligne changee des deux cotes : l\'autre appareil l\'emporte, et c\'est signale');
ok(f.repas.v.dej === true && f.repas.v.din === true && !f.repas.c, 'coches du jour : dejeuner d\'ici + diner d\'ailleurs');
ok(JSON.stringify(f.dates.v) === JSON.stringify({h1: ['2026-10-01', '2026-10-03', '2026-10-02'], h2: ['2026-10-03']}) || (f.dates.v.h1.length === 3 && f.dates.v.h2.length === 1), 'habitudes : les jours coches des deux cotes : ' + JSON.stringify(f.dates.v));
ok(f.minutes.v[0].duree === 100 && f.minutes.v[0].matieres.X === 70 && f.minutes.v[0].matieres.Y === 30, 'minutes : 70 + 80 - 50 = 100 : ' + JSON.stringify(f.minutes.v[0]));
ok(JSON.stringify(f.sansBase.v.map(x => x.id).sort()) === '["a","c","d"]', 'base inconnue : union');

console.log('\n== 6) Un nouveau depart venu du Mac n\'est pas defait par l\'attente de l\'iPhone ==');
hors.iphone = true;
await iphone.ev(() => window.__bcReporterTemps(5, {matiere: 'Bioquímica'}));
await iphone.page.waitForTimeout(3500);
ok(Object.keys(await iphone.ev(() => window.__bcAttente())).length > 0, 'une ecriture de l\'iPhone en attente');
[...cloud.keys()].filter(k => /sessions|revision/.test(k)).forEach(k => cloud.delete(k));
cloud.set('batcave-reinit', {v: {id: 'r-test', date: '2026-10-06'}, d: 'autre', t: Date.now()});
hors.iphone = false;
await iphone.ouvrir();
await iphone.page.waitForTimeout(1500);
ok(Object.keys(await iphone.ev(() => window.__bcAttente())).length === 0, 'l\'attente est videe par le nouveau depart');
ok(![...cloud.keys()].some(k => /revision-2026-10/.test(k) && totalRev(cloud.get(k).v) > 0), 'les vieilles minutes ne sont pas reparties au cloud');
ok(totalRev(await lire(iphone, 'batcave-revision')) === 0, 'l\'iPhone repart de zero');

await browser.close();
console.log(errs ? '\nECHECS : ' + errs : '\nTOUT EST VERT');
process.exit(errs ? 1 : 0);
