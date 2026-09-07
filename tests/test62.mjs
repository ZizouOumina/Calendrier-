import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const MOCK = () => {
  const mcp = {
    callTool(){ return Promise.resolve({content:[], payload:{}}); },
    watchTool(server, tool, input, handler){ Promise.resolve().then(() => handler({type:'error', error:{code:'server_not_connected', message:'x'}})); return () => {}; },
    invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
};
/* Lundi 7 septembre 2026, 12:00. Dix jours de semaine suivis (24 août → 4 septembre) :
   Anki démarré avec 15 min de retard, tous les blocs tenus sauf Projets perso 3 (14:00),
   jamais lancé. Sommeil à 6 h sur 7 nuits, Tractions à 8/8/8 sur 4 séances, un partiel
   d'Anatomía dans 18 jours alors que toute la révision étiquetée est en Histología. */
const seed = (() => {
  const ms = (iso, hm) => new Date(iso + 'T' + hm + ':00+02:00').getTime();
  const sessions = [];
  const jours = ['2026-08-24','2026-08-25','2026-08-26','2026-08-27','2026-08-28','2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04'];
  const blocs = [['07:35','08:20','cours','Anatomía'],['08:20','09:20','cours','Anatomía'],['09:20','10:20','cours','Histología'],['10:20','11:20','cours','Histología'],['11:20','12:20','projet','DS'],['13:00','14:00','projet','DS'],['20:30','21:30','cours','Histología']];
  jours.forEach((iso, i) => blocs.forEach((b, k) => {
    const dow = new Date(iso + 'T12:00:00').getDay();
    if(dow === 5 && (b[0] === '13:00')) return; /* vendredi : pas de PP2 à 13:00 */
    sessions.push({id:'s' + i + '-' + k, date: iso, debut: ms(iso, b[0]), fin: ms(iso, b[1]), duree: Math.round((ms(iso, b[1]) - ms(iso, b[0])) / 60000), type: b[2], label: b[3]});
  }));
  ['2026-08-17','2026-08-18','2026-08-19','2026-08-20','2026-08-21'].forEach((iso, i) => blocs.forEach((b, k) => {
    const deb = k === 0 ? '07:50' : b[0];
    sessions.push({id:'a' + i + '-' + k, date: iso, debut: ms(iso, deb), fin: ms(iso, b[1]), duree: Math.round((ms(iso, b[1]) - ms(iso, deb)) / 60000), type: b[2], label: b[3]});
  }));
  const s = { 'batcave-sessions': sessions, 'batcave-examens': {'Anatomía': '2026-09-25'}, 'batcave-sport-log': [] };
  ['2026-08-28','2026-08-29','2026-08-30','2026-08-31'].forEach(iso => { s['batcave-journal-' + iso] = {sommeil: '5.5', mood: 3, notes: '', poids: '', water: 0, coran: '', duaa: ''}; });
  ['2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05','2026-09-06','2026-09-07'].forEach(iso => { s['batcave-journal-' + iso] = {sommeil: '6', mood: 3, notes: '', poids: '', water: 0, coran: '', duaa: ''}; });
  s['batcave-revision'] = jours.map((iso, i) => ({id:'rev' + i, date: iso, duree: 300, matieres: {'Histología': 300}}));
  ['2026-08-24','2026-08-27','2026-08-31','2026-09-03'].forEach((iso, i) => s['batcave-sport-log'].push({id:'sl' + i, date: iso, type:'haut', exo:'Tractions', series:[8,8,8], charge: 0, unite:'reps'}));
  return s;
})();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(MOCK);
await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-07T12:00:00+02:00') });
await page.goto(URL);
await page.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(600);

console.log('\n== 218) Insights v2 : bloc fragile, dérive, dette de sommeil, stagnation, matière, fidélité ==');
{
  const ins = await fr.evaluate(() => window.__bcInsights().map(i => ({ title: i.title, text: i.text, action: i.action || '', score: i.score, n: i.n, page: i.page || '', tend: i.tendance ? i.tendance.txt : '', bon: i.tendance ? i.tendance.bon : null, serie: i.serie && i.serie.v ? i.serie.v.length : 0 })));
  const par = t => ins.find(i => i.title === t);
  const bf = par('Bloc le plus fragile');
  ok(bf && /Projets perso 3 \(14:00\)/.test(bf.text) && /0 fois sur/.test(bf.text) && bf.score === 100, 'bloc fragile = Projets perso 3 à 14:00, jamais tenu, score 100 : ' + (bf && bf.text.slice(0, 80)));
  ok(bf && /^stable vs 14 j avant$/.test(bf.tend) && bf.page === 'calendrier', 'bloc fragile : tendance « stable » (0/5 avant, 0/8 maintenant), lien Calendrier : ' + (bf && bf.tend));
  const dv = par('Dérive du premier bloc');
  ok(dv && /en moyenne 15 min/.test(dv.text) && dv.score === 30, 'dérive = 15 min après 07:20, score 30 : ' + (dv && dv.text.slice(0, 70)));
  ok(dv && dv.tend === '−15 min vs 14 j avant' && dv.bon === true && dv.serie === 10, 'dérive : tendance −15 min (30 min de retard 14 j avant), bonne, série de 10 jours : ' + (dv && dv.tend + ' / ' + dv.serie));
  const ds = par('Sommeil');
  ok(ds && /^Dette de sommeil : \d+ h/.test(ds.text) && /7 nuits/.test(ds.text) && /21:55/.test(ds.action), 'sommeil : dette sur 7 nuits avec action coucher : ' + (ds && ds.text.slice(0, 70)));
  ok(ds && /^−.*\/nuit de dette vs 7 nuits avant$/.test(ds.tend) && ds.bon === true && ds.serie === 11 && ds.page === 'journal', 'sommeil : dette en baisse vs les 7 nuits d\'avant (5,5 h), série de 11 nuits, lien Journal : ' + (ds && ds.tend + ' / ' + ds.serie));
  ok(ds && /ne dépend pas de ta nuit sur 10 nuits/.test(ds.text), 'sommeil : la corrélation nuit → révision est intégrée à la même carte');
  const st = par('Sport');
  ok(st && /Tractions stagne depuis 4 séances/.test(st.text) && st.score === 60 && st.page === 'sport', 'sport : Tractions stagnent depuis 4 séances, lien Sport : ' + (st && st.text.slice(0, 70)));
  const me = par('Matière et partiel');
  ok(me && /Anatomía : partiel dans 18 jours, 0 min/.test(me.text) && /Bascule/.test(me.action), 'Anatomía : 0 min pour un partiel dans 18 jours → bascule : ' + (me && me.text.slice(0, 70)));
  ok(me && me.n === 9 && me.page === 'etudes', 'matière : n = 9 entrées de révision sur 14 jours (et non « 1 examen »), lien Études : ' + (me && me.n));
  const ha = par('Habitude la plus délaissée');
  ok(ha && ha.score === 0 && /0 jour avec une habitude cochée sur 7 minimum/.test(ha.text), 'habitudes : sans historique coché, pas de priorité fantôme : ' + (ha && ha.text.slice(0, 60)));
  const cr = par('Ton créneau le plus productif');
  ok(cr && /que tu abats le plus de travail/.test(cr.text) && /Ton meilleur jour est/.test(cr.text) && cr.action, 'créneau + meilleur jour fusionnés, avec action');
  const fi = par('Fidélité au plan');
  ok(fi && /^Semaine dernière : \d+ % du plan/.test(fi.text) && fi.serie === 3 && fi.page === 'bilan', 'fidélité de la semaine dernière mesurée, série de 3 semaines : ' + (fi && fi.text.slice(0, 80)));
  ok(ins.length === 9 && ins[0].title === 'Bloc le plus fragile' && ins.every((it, i) => i === 0 || it.score <= ins[i-1].score), '9 cartes triées par score, bloc fragile en tête (' + ins.length + ')');
  ok(ins.every(i => i.page), 'chaque carte a un onglet où agir');
  const sans = ins.filter(i => /Balance énergétique/.test(i.title))[0];
  ok(sans && sans.score === 0 && /7 jours de repas complets/.test(sans.text) && /partiels ignorés/.test(sans.text), 'balance énergétique : pas assez de données, jours partiels annoncés');
}

console.log('\n== 219) Page Insights : bandeau des priorités et action par carte ; tableau de bord : ligne priorité ==');
{
  const dash = await fr.evaluate(() => { const p = document.getElementById('dash-priorite'); return { hidden: p.hidden, txt: p.textContent }; });
  ok(!dash.hidden && /Bloc le plus fragile/.test(dash.txt) && /Pomodoro/.test(dash.txt), 'tableau de bord : priorité n° 1 affichée avec son action');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="insights"]').click());
  await page.waitForTimeout(300);
  const r = await fr.evaluate(() => ({
    bandeau: document.getElementById('insights-priorites').hidden, items: document.querySelectorAll('#insights-priorites li').length,
    cartes: document.querySelectorAll('#insights-grid .panel').length, actions: document.querySelectorAll('#insights-grid .insight-action').length,
    premier: document.querySelector('#insights-grid .panel h3').textContent, n: document.querySelectorAll('#insights-grid .insight-n').length,
    tend: document.querySelectorAll('#insights-grid .insight-tend').length, spark: document.querySelectorAll('#insights-grid .insight-spark').length,
    liens: document.querySelectorAll('#insights-grid [data-aller]').length, vus: document.querySelectorAll('#insights-priorites [data-vu]').length,
    liensBandeau: document.querySelectorAll('#insights-priorites [data-aller]').length
  }));
  ok(!r.bandeau && r.items === 3 && r.vus === 3 && r.liensBandeau === 3, 'bandeau « Priorités de la semaine » : 3 actions, chacune avec « Vu » et son lien (' + r.items + ')');
  ok(r.cartes === 9 && r.actions >= 7 && r.premier === 'Bloc le plus fragile', r.cartes + ' cartes, ' + r.actions + ' actions, première = ' + r.premier);
  ok(r.n === 9 && r.liens === 9, 'points de données et lien vers l\'onglet sur les 9 cartes (' + r.n + ', ' + r.liens + ')');
  ok(r.tend >= 3 && r.spark === 3, 'tendances (' + r.tend + ') et mini-courbes (' + r.spark + ' : dérive, sommeil, fidélité)');
  await fr.evaluate(() => document.querySelector('#insights-grid .panel[data-titre="Matière et partiel"] [data-aller]').click());
  await page.waitForTimeout(250);
  const pg = await fr.evaluate(() => document.querySelector('.page.active').dataset.page);
  ok(pg === 'etudes', 'lien de la carte matière → onglet Études (' + pg + ')');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="insights"]').click());
  await page.waitForTimeout(250);
}

console.log('\n== 219a) « Vu » : la priorité se met en pause 7 jours, le bandeau et le tableau de bord suivent, « Réactiver » la remet ==');
{
  await fr.evaluate(() => document.querySelector('#insights-priorites [data-vu="Bloc le plus fragile"]').click());
  await page.waitForTimeout(300);
  const r = await fr.evaluate(() => ({
    premier: document.querySelector('#insights-priorites li b').textContent, items: document.querySelectorAll('#insights-priorites li').length,
    vu: JSON.parse(localStorage.getItem('batcave-insights-vu') || '{}'),
    pause: !!document.querySelector('#insights-grid .panel[data-titre="Bloc le plus fragile"].en-pause'),
    reactiver: !!document.querySelector('#insights-grid [data-reactiver="Bloc le plus fragile"]'),
    dash: document.getElementById('dash-priorite').textContent, toast: (document.querySelector('.toast') || {}).textContent || ''
  }));
  ok(r.premier === 'Sommeil' && r.items === 3, 'bandeau : Sommeil passe en tête, toujours 3 priorités (' + r.premier + ')');
  ok(r.vu['Bloc le plus fragile'] === '2026-09-14', 'pause enregistrée jusqu\'au 14/09 dans batcave-insights-vu : ' + JSON.stringify(r.vu));
  ok(r.pause && r.reactiver, 'la carte reste, marquée en pause, avec « Réactiver »');
  ok(/Sommeil/.test(r.dash) && !/Bloc le plus fragile/.test(r.dash), 'tableau de bord : la ligne priorité bascule sur Sommeil');
  ok(/en pause 7 jours/.test(r.toast), 'toast de confirmation : ' + r.toast);
  await fr.evaluate(() => document.querySelector('#insights-grid [data-reactiver="Bloc le plus fragile"]').click());
  await page.waitForTimeout(300);
  const r2 = await fr.evaluate(() => ({ premier: document.querySelector('#insights-priorites li b').textContent, vu: JSON.parse(localStorage.getItem('batcave-insights-vu') || '{}'), dash: document.getElementById('dash-priorite').textContent }));
  ok(r2.premier === 'Bloc le plus fragile' && !r2.vu['Bloc le plus fragile'] && /Bloc le plus fragile/.test(r2.dash), '« Réactiver » : le bloc fragile revient en tête, clé effacée, tableau de bord à jour');
}

console.log('\n== 219b) Tableau de bord : la ligne priorité se tronque, porte l\'explication complète et mène aux Insights ==');
{
  await fr.evaluate(() => { const b = document.querySelector('.nav-btn[data-page="dashboard"]'); if(b) b.click(); });
  await page.waitForTimeout(300);
  const st = await fr.evaluate(() => {
    const e = document.getElementById('dash-priorite'); const cs = getComputedStyle(e); const bar = e.closest('.bc-bar');
    return { hidden: e.hidden, role: e.getAttribute('role'), title: e.title, overflow: cs.overflowX, ellipsis: cs.textOverflow,
             deborde: e.getBoundingClientRect().right > bar.getBoundingClientRect().right + 1, scrollW: e.scrollWidth, clientW: e.clientWidth };
  });
  ok(!st.hidden && st.role === 'button' && /ACTION/.test(st.title) && /Clic : Insights/.test(st.title), 'ligne priorité visible, rôle bouton, explication complète en info-bulle');
  ok(st.overflow === 'hidden' && st.ellipsis === 'ellipsis' && !st.deborde, 'la ligne ne déborde pas de la barre (tronquée : ' + st.scrollW + ' > ' + st.clientW + ' px)');
  await fr.evaluate(() => document.getElementById('dash-priorite').click());
  await page.waitForTimeout(300);
  const pg = await fr.evaluate(() => { const p = document.querySelector('.page.active'); return p ? p.dataset.page : ''; });
  ok(pg === 'insights', 'clic sur la priorité → page Insights (' + pg + ')');
}

await ctx.close();

console.log('\n== 220) Sans données : aucune priorité, cartes explicites, tableau de bord sans ligne ==');
{
  const c2 = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await c2.addInitScript(MOCK);
  const p2 = await c2.newPage();
  p2.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await p2.clock.install({ time: new Date('2026-09-07T12:00:00+02:00') });
  await p2.goto(URL);
  await p2.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout:15000 });
  const f2 = p2.frames().find(x => x.url().includes('batcave.html'));
  await f2.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await p2.waitForTimeout(400);
  const r = await f2.evaluate(() => { document.querySelector('.nav-btn[data-page="insights"]').click(); return { dash: document.getElementById('dash-priorite').hidden, bandeau: document.getElementById('insights-priorites').hidden, cartes: document.querySelectorAll('#insights-grid .panel').length, prio: window.__bcInsights().filter(i => i.action && i.score >= 20).length }; });
  ok(r.dash === true && r.bandeau === true && r.prio === 0 && r.cartes === 9, 'vierge : pas de priorité, pas de bandeau, 9 cartes qui disent ce qui manque');
  await c2.close();
}
await browser.close();
console.log(errs ? ('\nECHECS: ' + errs) : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
