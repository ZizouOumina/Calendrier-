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

const MI_SEPT = '2026-09-22T10:00:00+02:00';   /* premier jour du programme (mardi 22, nuit du 20 au 21) */
/* Le 15 est le JOUR 1 : la regle « trop tot pour juger » met tout « dans les clous ».
   Pour lire de vrais verdicts il faut une periode entamee : mardi 22, une semaine
   plus tard, ou 46,3 % de la revision de septembre et 44,4 % des seances sont passes. */
const SEMAINE2 = '2026-09-25T10:00:00+02:00';
const sessions = [];
for(let d = 1; d <= 10; d++) sessions.push({id:'s'+d, date:'2026-09-'+String(d).padStart(2,'0'), type:'cours', duree:240, label:'Anatomía I', debut: Date.UTC(2026,8,d,6)+1, fin: Date.UTC(2026,8,d,10)+1});  /* 40 h */
const journaux = {}; for(let d = 1; d <= 14; d++) journaux['batcave-journal-2026-09-'+String(d).padStart(2,'0')] = {sommeil: 7.5, water: 3000, poids: 64 + d*0.05};

console.log('\n== 112) Semis : un seul palier, le mois ==');
{
  const { ctx, fr } = await ouvrir(MI_SEPT);
  const o = await local(fr, 'batcave-objectifs');
  /* 19 septembre, sa demande : « je veux trop de paliers, juste ce qui est suffisant ».
     Les objectifs de TRIMESTRE ont ete retires, et les metriques du mois ramenees aux six
     qui se pilotent vraiment (revision, projets, espagnol, sport, sommeil, habitudes) --
     l'eau et les depenses variables sortent, elles se regardent ailleurs. Il reste
     12 mois x 6 metriques = 72 objectifs, contre 140 avant. */
  const parPeriode = {};
  o.liste.forEach(x => parPeriode[x.periode] = (parPeriode[x.periode] || 0) + 1);
  ok(o.liste.length === 72 && parPeriode.mois === 72 && !parPeriode.trimestre,
     '72 objectifs, tous mensuels, plus aucun trimestre (' + JSON.stringify(parPeriode) + ')');
  const mets = [...new Set(o.liste.map(x => x.metrique))].sort().join(',');
  ok(mets === 'espagnol_h,habitudes_pct,projets_h,revision_h,sommeil_moy,sport_seances',
     'six metriques et pas une de plus (' + mets + ')');
  ok(await local(fr, 'batcave-objectifs-seed-v1') === true, 'drapeau de semis posé');
  const m9 = o.liste.find(x => x.id === 'M2026-09:revision_h');
  /* La grille ne prevoit rien avant le jour 1 : la cible de septembre part de la, pas du
     1er. Le jour 1 a bouge plusieurs fois (15, 17, 18, 19, 20, 21) et il l'a finalement
     pose au MARDI 22, dans la nuit du 20 au 21 -- son sommeil n'etait toujours pas cale.
     Septembre ne porte donc plus que neuf jours de programme, et sa cible de revision
     tombe a 40,7 h. Elle n'est jamais ecrite a la main : c'est ce que la grille contient
     sur le mois, a 89 %. */
  ok(m9 && m9.cible === 40.7, 'révision de septembre calculée depuis la grille, à partir du 22 : 40,7 h (' + (m9 && m9.cible) + ')');
  ok(m9 && m9.auto === true, 'la cible est marquée automatique : elle suivra la grille');
  ok(!o.liste.some(x => /exo:|snus|eau_moy|depenses_var/.test(x.metrique)),
     'ni niveaux, ni snus, ni eau, ni dépenses : ils ne sont plus semés du tout');
  await ctx.close();
}

console.log('\n== 113) Comparaison sur des données réelles ==');
{
  /* Jour 1 : aucun verdict, meme avec 40 h deja faites ou zero seance. C'est la regle
     « trop tot pour juger » (ecoules <= 1), et elle doit rester visible ici. */
  {
    const j1 = await ouvrir(MI_SEPT, Object.assign({ 'batcave-sessions': sessions }, journaux));
    await aller(j1.fr, j1.page, 'objectifs');
    const r1 = await ligne(j1.fr, 'Révision'), s1 = await ligne(j1.fr, 'Séances');
    ok(r1 && /attendu 2,0 h/.test(r1.txt), 'au matin du jour 1, la grille n\'attend que 2,0 h — les jours d\'avant ne comptent plus (' + (r1 && (r1.txt.match(/attendu [^ ]+ h/) || [''])[0]) + ')');
    ok(r1 && /clous/.test(r1.txt) && s1 && /clous/.test(s1.txt), 'jour 1 : ni avance ni retard, pas de faux verdict');
    await j1.ctx.close();
  }
  const { ctx, fr, page } = await ouvrir(SEMAINE2, Object.assign({ 'batcave-sessions': sessions }, journaux));
  await aller(fr, page, 'objectifs');
  const rev = await ligne(fr, 'Révision');
  /* 40 h ont bien été travaillées du 1er au 10 : le RÉEL les garde. L'ATTENTE, elle, ne
     compte que le programme : 40,7 h de cible × la part de septembre écoulée = 17,0 h
     (le programme court du 22 au 30, et le 25 à 10:00 en a consommé une bonne part).
     Une séance faite avant le départ compte, mais ne crée pas de retard. */
  ok(rev && /réel 40,0 h/.test(rev.txt) && /attendu 17,0 h/.test(rev.txt) && /avance/.test(rev.led), 'Révision : réel 40,0 h pour 17,0 h attendues au 25 à 10:00 → en avance : ' + (rev && rev.txt.slice(0, 80)));
  const som = await ligne(fr, 'Sommeil');
  ok(som && /réel 7,50 h/.test(som.txt) && /\bok\b/.test(som.led), 'Sommeil moyen 7,50 h sur 7,75 visées (97 %) → dans les clous');
  /* Plus de ligne « Eau » : eau_moy est sortie des metriques semees le 19 septembre,
     quand il a ramene les objectifs a un seul palier et aux six mesures qui se pilotent. */
  ok(!(await ligne(fr, 'Eau')), 'plus d\'objectif d\'eau : il ne reste que les six métriques du mois');
  const sport = await ligne(fr, 'Séances');
  ok(sport && /réel 0,0 séances/.test(sport.txt) && /retard/.test(sport.led), 'Séances de sport : 0 réelles → en retard');
  const resume = await fr.evaluate(() => document.getElementById('obj-resume').innerText);
  ok(/en retard/.test(resume) && /% de la période/.test(resume), 'résumé : ' + resume);
  await ctx.close();
}

console.log('\n== 114) Éditer une cible, supprimer, ajouter ==');
{
  const { ctx, fr, page } = await ouvrir(SEMAINE2, { 'batcave-sessions': sessions });
  await aller(fr, page, 'objectifs');
  await fr.evaluate(() => { const i = document.querySelector('[data-obj-cible="M2026-09:revision_h"]'); i.value = '60'; i.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(250);
  const rev = await ligne(fr, 'Révision');
  ok((await local(fr, 'batcave-objectifs')).liste.find(x => x.id === 'M2026-09:revision_h').cible === 60, 'cible enregistrée : 60');
  ok(rev && /attendu 25,1 h/.test(rev.txt) && /avance/.test(rev.led), 'recalcul immédiat sur une cible de 60 h : attendu 25,1 h, 40 h réelles → en avance (' + (rev && rev.txt.slice(0, 70)) + ')');
  ok((await local(fr, 'batcave-objectifs')).liste.find(x => x.id === 'M2026-09:revision_h').auto === false, 'une cible saisie à la main sort du calcul automatique');
  const avant = (await local(fr, 'batcave-objectifs')).liste.length;
  await fr.evaluate(() => document.querySelector('[data-obj-del="M2026-09:sommeil_moy"]').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.getElementById('ask-ok').click());
  await page.waitForTimeout(250);
  ok((await local(fr, 'batcave-objectifs')).liste.length === avant - 1 && !(await ligne(fr, 'Sommeil')), 'suppression confirmée → objectif retiré');
  await fr.evaluate(() => { document.getElementById('obj-titre').value = 'Conversation espagnole'; document.getElementById('obj-metrique').value = 'espagnol_h'; document.getElementById('obj-cible').value = '10'; document.getElementById('obj-add').click(); });
  await page.waitForTimeout(250);
  const es = await ligne(fr, 'Conversation espagnole');
  ok(es && /cible/.test(es.txt) && /réel 0,0 h/.test(es.txt), 'nouvel objectif ajouté à la période : ' + (es && es.txt.slice(0, 60)));
  await ctx.close();
}

console.log('\n== 115) Deux vues seulement : le mois et les 6 mois ==');
{
  const { ctx, fr, page } = await ouvrir(MI_SEPT, { 'batcave-sport-log': [{id:'a', date:'2026-08-20', type:'Pull', exo:'Tractions', series:[6,5,5], charge:0, unite:'reps'}, {id:'b', date:'2026-09-10', type:'Pull', exo:'Tractions', series:[8,7,6], charge:0, unite:'reps'}], 'batcave-journal-2026-09-14': {poids: 65.2} });
  await aller(fr, page, 'objectifs');
  /* 19 septembre : il ne voulait plus « trop de paliers ». La pastille « Le trimestre » a
     disparu -- il ne reste que le mois, qui se pilote, et les 6 mois, qui ne se pilotent
     pas mais donnent le cap. */
  const vues = await fr.evaluate(() => [...document.querySelectorAll('[data-obj-vue]')].map(b => b.dataset.objVue));
  ok(vues.length === 2 && vues.join(',') === 'mois,horizon', 'deux vues et pas trois : le mois, les 6 mois (' + vues.join(',') + ')');
  ok((await fr.evaluate(() => document.getElementById('obj-periode').innerText)) === 'Septembre 2026', 'la vue s\'ouvre sur le mois en cours');
  await fr.evaluate(() => document.getElementById('obj-next').click());
  await page.waitForTimeout(150);
  ok((await fr.evaluate(() => document.getElementById('obj-periode').innerText)) === 'Octobre 2026', '▶ passe au mois suivant');
  const oct = await ligne(fr, 'Révision');
  ok(oct && /pas encore de données/.test(oct.txt), 'octobre n\'a pas commencé : pas encore de données');
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
  ok(d.n === 6 && d.leds === 6, '6 objectifs du mois avec leur LED — un seul palier depuis le 19 septembre');
  ok(/Révision 40,0 \/ 40,7 h/.test(d.txt), 'ligne compacte réel / cible : ' + d.txt.slice(0, 60));
  ok(/\/6 dans les clous · Septembre 2026/.test(d.note), 'note : ' + d.note);
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
  ok(n === 72 && cl['batcave-objectifs-seed-v1'] === true, 'le cloud reçoit les 72 objectifs ET le drapeau (' + n + ')');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
