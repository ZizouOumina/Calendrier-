/* Lot 27 — le premier matin, et les trois écrans.
   A) le 14 au réveil : aucun objectif en faux retard, et le réacteur annonce le jour 1 ;
   D) la barre du bas ramène l'onglet actif dans le champ de vision sur iPhone ;
   E) une carte Insights muette dit à quelle date elle s'allumera ;
   G) les cibles tactiles font 44 px sur écran tactile. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local, vue){
  const ctx = await browser.newContext({ viewport: vue || {width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR',
                                         hasTouch: !!(vue && vue.width <= 1024) });
  await ctx.addInitScript(() => { window.claude = undefined; });
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

console.log('\n== 311) Le 14 au réveil : aucun objectif en retard des jours d\'avant ==');
{
  /* Un objectif « Projets perso » qui court du 1er au 30 septembre : les projets perso ne
     sont prévus QUE du 1er au 13, avant que le programme commence. Sans garde-fou, le 14
     au matin la période paraît écoulée à 100 % et l'objectif s'affiche en retard de sa
     cible entière — un échec pour des journées où la Batcave ne servait pas encore. */
  const objectifs = { liste: [
    {id:'o1', titre:'Projets perso', cle:'projets_h', debut:'2026-09-01', fin:'2026-09-30', auto:true},
    {id:'o2', titre:'Révision', cle:'revision_h', debut:'2026-09-14', fin:'2026-09-30', auto:true}
  ]};
  const { ctx, fr } = await ouvrir('2026-09-14T06:45:00+02:00', {'batcave-objectifs': objectifs});
  const cmp = await fr.evaluate(() => window.__bcObjectifs().map(o => {
    const c = window.__bcComparer(o);
    return {titre:o.titre, attendu: Math.round(c.attendu * 10) / 10, statut: c.statut};
  }));
  const proj = cmp.filter(o => o.titre === 'Projets perso')[0];
  ok(proj && proj.attendu === 0, 'au matin du 14, rien n\'est encore attendu sur septembre : ' + JSON.stringify(proj));
  ok(cmp.every(o => o.statut !== 'retard'), 'aucun objectif ne s\'ouvre en retard le premier jour : ' + JSON.stringify(cmp));
  await ctx.close();
}

console.log('\n== 312) Le réacteur annonce le jour 1, pas un « 0 % » ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-14T06:45:00+02:00');
  let v = await fr.evaluate(() => ({
    num: document.getElementById('dash-score-num').textContent,
    unite: document.getElementById('dash-score-unit').textContent,
    note: document.getElementById('dash-score-detail').textContent,
    hors: document.getElementById('dash-score-note').textContent
  }));
  ok(v.num === '1' && v.unite === '/182', 'le premier matin affiche « 1/182 », pas « 0 % » (' + v.num + v.unite + ')');
  ok(/Premier jour du programme/.test(v.note) && !/À reprendre/.test(v.note), 'la note dit ce que c\'est : ' + v.note);
  ok(v.hors === v.note, 'la même note existe hors de l\'anneau, pour le téléphone');

  /* une seule case cochée et le score reprend son rôle */
  await fr.evaluate(() => { document.querySelector('#dash-checklist input[type="checkbox"]').click(); });
  await page.waitForTimeout(350);
  v = await fr.evaluate(() => ({ num: document.getElementById('dash-score-num').textContent,
                                 unite: document.getElementById('dash-score-unit').textContent,
                                 note: document.getElementById('dash-score-detail').textContent }));
  ok(v.unite === '%' && Number(v.num) > 0, 'dès la première case cochée, c\'est un vrai score : ' + v.num + v.unite);
  ok(/habitudes, nutrition/.test(v.note), 'et la note redevient celle du score : ' + v.note);
  await ctx.close();
}

console.log('\n== 313) Une carte Insights muette dit quand elle s\'allume ==');
{
  const { ctx, fr } = await ouvrir('2026-09-14T06:45:00+02:00');
  const ins = await fr.evaluate(() => window.__bcInsights().map(i => ({t:i.title, s:i.score, txt:i.text})));
  const muettes = ins.filter(i => i.s === 0);
  ok(muettes.length >= 4, muettes.length + ' cartes sont encore muettes le premier jour — c\'est normal');
  /* Toute carte muette doit dire quand elle parlera. Quand c'est le TEMPS qui manque, elle
     donne une date ; quand c'est une donnée qu'on n'a pas encore saisie (les échéances de
     partiels), aucune date n'existe : elle nomme alors ce qu'il manque. */
  const muettes2 = muettes.filter(i => !/s’allume/.test(i.txt)).map(i => i.t);
  ok(muettes2.length === 0, 'chacune dit quand elle s\'allume' + (muettes2.length ? ' — sauf : ' + muettes2.join(', ') : ''));
  const dates = muettes.map(i => (i.txt.match(/s’allume au plus tôt le ([^,]+),/) || [])[1]).filter(Boolean);
  ok(dates.length >= muettes.length - 1 && dates.every(d => /\d/.test(d)), dates.length + ' cartes sur ' + muettes.length + ' donnent une vraie date : ' + [...new Set(dates)].join(' · '));
  const sansDate = muettes.filter(i => !/au plus tôt le /.test(i.txt));
  ok(sansDate.every(i => /onglet [ÉE]tudes/.test(i.txt)), 'celle qui ne peut pas dater dit ce qu\'il lui manque : ' + (sansDate.map(i => i.t).join(', ') || 'aucune'));
  await ctx.close();
}

console.log('\n== 314) iPhone : le Plan du jour passe devant le réacteur ==');
{
  const { ctx, fr } = await ouvrir('2026-09-14T06:45:00+02:00', null, {width:390,height:844});
  const pos = await fr.evaluate(() => {
    const plan = document.querySelector('.dash-wall > .mon-plan').getBoundingClientRect();
    const cent = document.querySelector('.dash-wall > .mon-central').getBoundingClientRect();
    const anneau = document.querySelector('.mon-central > .reactor').getBoundingClientRect();
    return {plan: Math.round(plan.top), central: Math.round(cent.top), anneau: Math.round(anneau.width),
            note: getComputedStyle(document.getElementById('dash-score-note')).display};
  });
  ok(pos.plan < pos.central, 'le Plan du jour est au-dessus de l\'écran central (' + pos.plan + ' < ' + pos.central + ')');
  ok(pos.anneau <= 130, 'l\'anneau tient en ' + pos.anneau + ' px et ne mange plus l\'écran');
  ok(pos.note === 'block', 'la note du score est visible hors de l\'anneau');
  await ctx.close();
}

console.log('\n== 315) iPhone : la barre du bas ramène l\'onglet actif sous les yeux ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-14T06:45:00+02:00', null, {width:390,height:844});
  const rail = await fr.evaluate(() => { const s = document.querySelector('.sidebar'); return {sw:s.scrollWidth, cw:s.clientWidth, x:s.scrollLeft}; });
  ok(rail.sw > rail.cw + 40, 'la barre défile vraiment (' + rail.sw + ' px de contenu pour ' + rail.cw + ' visibles)');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="courses"]').click());
  await page.waitForTimeout(700);
  const apres = await fr.evaluate(() => {
    const s = document.querySelector('.sidebar'), b = document.querySelector('.nav-btn[data-page="courses"]');
    const rs = s.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return {defile: Math.round(s.scrollLeft), dedans: rb.left >= rs.left - 1 && rb.right <= rs.right + 1};
  });
  ok(apres.defile > 0 && apres.dedans, 'après un saut vers Courses, l\'onglet actif est dans le champ de vision (défilement ' + apres.defile + ' px)');
  await ctx.close();
}

console.log('\n== 316) Écran tactile : 44 px sous le doigt ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-14T06:45:00+02:00', null, {width:390,height:844});
  const puce = await fr.evaluate(() => {
    const li = document.querySelector('#dash-checklist li'), lab = li.querySelector('label');
    const r = li.getBoundingClientRect(), c = getComputedStyle(lab, '::after');
    return {h: Math.round(r.height), couvre: c.content !== 'none'};
  });
  ok(puce.h >= 44, 'une puce d\'habitude fait ' + puce.h + ' px de haut (44 minimum)');
  ok(puce.couvre, 'toute la puce répond au doigt, pas seulement le texte');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="sport"]').click());
  await page.waitForTimeout(500);
  const pas = await fr.evaluate(() => {
    const b = document.querySelector('.pas button');
    if(!b) return null;
    const r = b.getBoundingClientRect();
    return {w: Math.round(r.width), h: Math.round(r.height)};
  });
  ok(pas && pas.w >= 44 && pas.h >= 44, 'les touches +/− des séries font ' + (pas ? pas.w + '×' + pas.h : 'introuvables') + ' px');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
