/* Objectifs par période : semis, comparaison réel / attendu / cible, édition, vues, tableau de bord, migration. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local, mock){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(mock) await ctx.addInitScript(mock.fn, mock.cfg); else await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { try{ if(sessionStorage.getItem('__amorce')) return; sessionStorage.setItem('__amorce','1'); }catch(e){} Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#obj-liste').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(600);
  return { ctx, page, fr };
}
const aller = async (fr, page, p) => { await fr.evaluate(pg => document.querySelector('.nav-btn[data-page="'+pg+'"]').click(), p); await page.waitForTimeout(250); };
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const ligne = (fr, titre) => fr.evaluate(t => { const r = [...document.querySelectorAll('#obj-liste .obj-row')].find(x => x.querySelector('.titre').innerText.startsWith(t)); return r ? { txt: r.innerText.replace(/\s+/g,' '), led: r.querySelector('.obj-led').className } : null; }, titre);

const MI_SEPT = '2026-09-15T10:00:00+02:00';   /* jour 15/30 → 50 % du mois */
const sessions = [];
for(let d = 1; d <= 10; d++) sessions.push({id:'s'+d, date:'2026-09-'+String(d).padStart(2,'0'), type:'cours', duree:240, label:'Anatomía I', debut: Date.UTC(2026,8,d,6)+1, fin: Date.UTC(2026,8,d,10)+1});  /* 40 h */
const journaux = {}; for(let d = 1; d <= 14; d++) journaux['batcave-journal-2026-09-'+String(d).padStart(2,'0')] = {sommeil: 7.5, water: 3000, poids: 64 + d*0.05};

console.log('\n== 112) Semis : trimestres et mois ==');
{
  const { ctx, fr } = await ouvrir(MI_SEPT);
  const o = await local(fr, 'batcave-objectifs');
  const nT = o.liste.filter(x => x.periode === 'trimestre').length, nM = o.liste.filter(x => x.periode === 'mois').length;
  ok(nT === 44 && nM === 96, '44 objectifs trimestriels + 96 mensuels (' + nT + ' / ' + nM + ')');
  ok(await local(fr, 'batcave-objectifs-seed-v1') === true, 'drapeau de semis posé');
  const t1 = o.liste.find(x => x.id === 'T1:revision_h'), m9 = o.liste.find(x => x.id === 'M2026-09:revision_h');
  ok(t1 && t1.cible === 344.6 && m9 && m9.cible === 115.2, 'T1 révision 335 h semée → recalée 344,6 h sur la semaine type → septembre 115,2 h');
  ok(!o.liste.some(x => x.periode === 'mois' && /exo:|snus/.test(x.metrique)), 'les niveaux (tractions) et la série snus restent au trimestre');
  await ctx.close();
}

console.log('\n== 113) Comparaison sur des données réelles ==');
{
  const { ctx, fr, page } = await ouvrir(MI_SEPT, Object.assign({ 'batcave-sessions': sessions }, journaux));
  await aller(fr, page, 'objectifs');
  const rev = await ligne(fr, 'Révision');
  ok(rev && /réel 40,0 h/.test(rev.txt) && /attendu 57,6 h/.test(rev.txt) && /retard/.test(rev.led), 'Révision : réel 40,0 h, attendu 57,6 h (50 % de 115,2) → en retard : ' + (rev && rev.txt.slice(0, 80)));
  ok(rev && /à ce rythme : 80,0 h/.test(rev.txt), 'projection à ce rythme : 80,0 h à la fin');
  const som = await ligne(fr, 'Sommeil');
  ok(som && /réel 7,50 h/.test(som.txt) && /\bok\b/.test(som.led), 'Sommeil moyen 7,50 h sur 7,75 visées (97 %) → dans les clous');
  const eau = await ligne(fr, 'Eau');
  ok(eau && /réel 3,0 L/.test(eau.txt) && /atteint/.test(eau.led), 'Eau 3,0 L ≥ 2,7 → atteint');
  const sport = await ligne(fr, 'Séances');
  ok(sport && /réel 0 séances/.test(sport.txt) && /retard/.test(sport.led), 'Séances de sport : 0 réelles → en retard');
  const resume = await fr.evaluate(() => document.getElementById('obj-resume').innerText);
  ok(/en retard/.test(resume) && /50 % de la période/.test(resume), 'résumé : ' + resume);
  await ctx.close();
}

console.log('\n== 114) Éditer une cible, supprimer, ajouter ==');
{
  const { ctx, fr, page } = await ouvrir(MI_SEPT, { 'batcave-sessions': sessions });
  await aller(fr, page, 'objectifs');
  await fr.evaluate(() => { const i = document.querySelector('[data-obj-cible="M2026-09:revision_h"]'); i.value = '60'; i.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(250);
  const rev = await ligne(fr, 'Révision');
  ok((await local(fr, 'batcave-objectifs')).liste.find(x => x.id === 'M2026-09:revision_h').cible === 60, 'cible enregistrée : 60');
  ok(rev && /attendu 30,0 h/.test(rev.txt) && /avance/.test(rev.led), 'recalcul immédiat : attendu 30,0 h, 40 h réelles → en avance');
  const avant = (await local(fr, 'batcave-objectifs')).liste.length;
  await fr.evaluate(() => document.querySelector('[data-obj-del="M2026-09:eau_moy"]').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.getElementById('ask-ok').click());
  await page.waitForTimeout(250);
  ok((await local(fr, 'batcave-objectifs')).liste.length === avant - 1 && !(await ligne(fr, 'Eau')), 'suppression confirmée → objectif retiré');
  await fr.evaluate(() => { document.getElementById('obj-titre').value = 'Conversation espagnole'; document.getElementById('obj-metrique').value = 'espagnol_h'; document.getElementById('obj-cible').value = '10'; document.getElementById('obj-add').click(); });
  await page.waitForTimeout(250);
  const es = await ligne(fr, 'Conversation espagnole');
  ok(es && /cible/.test(es.txt) && /réel 0,0 h/.test(es.txt), 'nouvel objectif ajouté à la période : ' + (es && es.txt.slice(0, 60)));
  await ctx.close();
}

console.log('\n== 115) Vues trimestre et 6 mois ==');
{
  const { ctx, fr, page } = await ouvrir(MI_SEPT, { 'batcave-sport-log': [{id:'a', date:'2026-08-20', type:'Pull', exo:'Tractions', series:[6,5,5], charge:0, unite:'reps'}, {id:'b', date:'2026-09-10', type:'Pull', exo:'Tractions', series:[8,7,6], charge:0, unite:'reps'}], 'batcave-journal-2026-09-14': {poids: 65.2} });
  await aller(fr, page, 'objectifs');
  await fr.evaluate(() => document.querySelector('[data-obj-vue="trimestre"]').click());
  await page.waitForTimeout(200);
  ok((await fr.evaluate(() => document.getElementById('obj-periode').innerText)) === 'T1 · sept. → nov. 2026', 'trimestre en cours : T1');
  const tr = await ligne(fr, 'Meilleure série — Tractions');
  ok(tr && /départ 6 reps/.test(tr.txt) && /réel 8 reps/.test(tr.txt) && /cible/.test(tr.txt), 'Tractions : départ 6 (avant T1), réel 8, cible 10 : ' + (tr && tr.txt.slice(0, 90)));
  await fr.evaluate(() => document.getElementById('obj-next').click());
  await page.waitForTimeout(150);
  ok((await fr.evaluate(() => document.getElementById('obj-periode').innerText)) === 'T2 · déc. 2026 → fév. 2027', '▶ passe à T2');
  const t2 = await ligne(fr, 'Révision');
  ok(t2 && /pas encore de données/.test(t2.txt), 'T2 n\'a pas commencé : pas encore de données');
  await fr.evaluate(() => document.querySelector('[data-obj-vue="horizon"]').click());
  await page.waitForTimeout(200);
  const h = await fr.evaluate(() => ({ n: document.querySelectorAll('#obj-liste .obj-row').length, inputs: document.querySelectorAll('#obj-liste input').length, dels: document.querySelectorAll('#obj-liste [data-obj-del]').length, form: document.getElementById('obj-form').hidden }));
  ok(h.n === 4 && h.inputs === 0 && h.dels === 0 && h.form === true, '6 mois : 4 objectifs fixes (poids, Coran, duaas, Shopify), non éditables ici');
  const poids = await ligne(fr, 'Poids');
  ok(poids && /réel 65,2 kg/.test(poids.txt) && /départ 64,0 kg/.test(poids.txt), 'Poids lu dans le journal : 65,2 kg, départ 64');
  await ctx.close();
}

console.log('\n== 116) Tableau de bord : objectifs du mois ==');
{
  const { ctx, fr, page } = await ouvrir(MI_SEPT, Object.assign({ 'batcave-sessions': sessions }, journaux));
  await fr.evaluate(() => { if(document.getElementById('dash-more').hidden) document.getElementById('dash-more-toggle').click(); });
  const d = await fr.evaluate(() => ({ n: document.querySelectorAll('#dash-goals li').length, leds: document.querySelectorAll('#dash-goals .obj-led').length, txt: document.getElementById('dash-goals').innerText.replace(/\s+/g,' '), note: document.getElementById('dash-goals-note').innerText }));
  ok(d.n === 8 && d.leds === 8, '8 objectifs du mois avec leur LED');
  ok(/Révision 40,0 \/ 115,2 h/.test(d.txt), 'ligne compacte réel / cible : ' + d.txt.slice(0, 60));
  ok(/\/8 dans les clous · Septembre 2026/.test(d.note), 'note : ' + d.note);
  await ctx.close();
}

console.log('\n== 117) Le semis survit à l\'hydratation du cloud (jamais le drapeau seul) ==');
{
  const MOCK = (cfg) => {
    window.__cloud = Object.assign({}, cfg);
    const db = { doc(p){ const k = p.replace(/^state\//,''); return { set(v){ window.__cloud[k] = v && v.v; return Promise.resolve(); }, delete(){ delete window.__cloud[k]; return Promise.resolve(); } }; },
      collection(){ return { onSnapshot(cb){ const i = Object.assign({}, window.__cloud); cb({ empty:false, docs:Object.keys(i).map(k => ({id:k, data: () => ({v:i[k]})})) }); return () => {}; } }; } };
    window.claude = { use(n){ return Promise.resolve(n === 'db' ? db : null); } };
    try{ sessionStorage.setItem('batcave-cloud-reload-at', String(Date.now())); }catch(e){}
  };
  const { ctx, fr, page } = await ouvrir(MI_SEPT, null, { fn: MOCK, cfg: { 'batcave-goals': {poids:'64'} } });
  await page.waitForTimeout(500);
  const cl = await fr.evaluate(() => window.__cloud);
  const n = cl['batcave-objectifs'] && cl['batcave-objectifs'].liste ? cl['batcave-objectifs'].liste.length : 0;
  ok(n === 140 && cl['batcave-objectifs-seed-v1'] === true, 'le cloud reçoit les 140 objectifs ET le drapeau (' + n + ')');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
