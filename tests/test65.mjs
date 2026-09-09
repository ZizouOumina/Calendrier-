/* Lot 18 : tout commence le lundi 14 septembre — sport (semaine 1, retest), Pomodoro selon le
   bloc (Anki = sans préciser), habitudes à plusieurs jours (linge lun·mer·ven), rotation Drive
   (doublon du même jour), dépendance à départ futur. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, extra){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
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
const seedHab = {'batcave-habits': HABITS, 'batcave-habits-seed-v2': true, 'batcave-habits-seed-v3': true, 'batcave-habits-seed-v4': true, 'batcave-habits-ecran-v2': true, 'batcave-habitlog-hebdo-v1': true};
const cartes = fr => fr.evaluate(() => [...document.querySelectorAll('#habits-grid .card')].map(c => c.innerText.replace(/\s+/g,' ')));

console.log('\n== 240) Sport : lundi 14 septembre = semaine 1 (moitié des tours), 12 octobre = retest ==');
{
  const { ctx, fr } = await ouvrir('2026-09-14T06:30:00+02:00');
  const r = await fr.evaluate(() => ({ debut: window.__bcProgrammeDebut, note: document.getElementById('programme-note').textContent }));
  ok(r.debut === '2026-09-14', 'PROGRAMME_DEBUT = 2026-09-14 (' + r.debut + ')');
  ok(/semaine 1/.test(r.note) && /½/.test(r.note), 'note : semaine 1, tours × ½ (' + r.note + ')');
  await ctx.close();
  const s = await ouvrir('2026-09-10T06:30:00+02:00');
  const n2 = await s.fr.evaluate(() => document.getElementById('programme-note').textContent);
  ok(/démarre le/.test(n2) && /14/.test(n2), 'avant le 14 : « démarre le 14 sept. » (' + n2 + ')');
  await s.ctx.close();
  const r5 = await ouvrir('2026-10-12T06:30:00+02:00');
  const n5 = await r5.fr.evaluate(() => document.getElementById('programme-note').textContent);
  ok(/semaine 5/.test(n5) && /retest/.test(n5), 'lundi 12 octobre : semaine 5, retest tractions et dips (' + n5 + ')');
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
  ok(b.valeur !== 'Sans préciser' && /Cartes du dernier cours/.test(b.msg) && /LA matière/.test(b.msg), 'bloc Cartes : une matière proposée (' + b.valeur + '), message « choisis LA matière »');
  await c.fr.evaluate(() => document.getElementById('ask-cancel').click());
  await c.ctx.close();
}

console.log('\n== 242) Habitudes à plusieurs jours : le linge lundi, mercredi, vendredi ==');
{
  const log = {'hab-linge': ['2026-09-11','2026-09-14'], 'hab-balai': ['2026-09-12']};
  const { ctx, fr, page } = await ouvrir('2026-09-16T20:00:00+02:00', Object.assign({'batcave-habitlog': log}, seedHab));   /* mercredi */
  const r = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="habitudes"]').click();
    return { dash: [...document.querySelectorAll('#dash-checklist li')].map(l => l.innerText.replace(/\s+/g,' ')), jours: window.__bcHabitJours({jours:[5,1,3,1]}), count: document.getElementById('dash-check-count').textContent };
  });
  const cards = await cartes(fr);
  ok(JSON.stringify(r.jours) === '[1,3,5]', 'habitJours trie et dédoublonne : ' + JSON.stringify(r.jours));
  ok(r.dash.length === 2 && r.dash.some(t => /Linge/.test(t)) && !r.dash.some(t => /balai|Courses/.test(t)) && r.count === '0/2', 'console du mercredi : Lit fait + Linge, ni balai ni courses (' + r.count + ')');
  const linge = cards.find(t => /Linge/.test(t)) || '';
  ok(/lun · mer · ven/.test(linge) && !/seulement/.test(linge), 'carte Linge un mercredi : « lun · mer · ven », sans « seulement » (' + linge.slice(0, 40) + ')');
  ok(/2 jours? d'affilée/i.test(linge), 'série : ven 11 + lun 14 = 2 d\'affilée, le mercredi pas encore coché ne casse rien (' + (linge.match(/\d+ jours? d'affilée/i) || [''])[0] + ')');
  const balai = cards.find(t => /balai/.test(t)) || '';
  ok(/samedi seulement/.test(balai) && /✓ Fait samedi/.test(balai) && /1 jour d'affilée/i.test(balai), 'carte Balai un mercredi : « samedi seulement », coché le 12 → « ✓ Fait samedi », série 1');
  const courses = cards.find(t => /Courses/.test(t)) || '';
  ok(/samedi seulement/.test(courses) && /Marquer fait \(samedi\)/.test(courses), 'carte Courses un mercredi : bouton « Marquer fait (samedi) »');
  await fr.evaluate(() => { [...document.querySelectorAll('#habits-grid [data-togglehab]')].find(x => x.dataset.togglehab === 'hab-linge').click(); });
  await page.waitForTimeout(200);
  const linge2 = (await cartes(fr)).find(t => /Linge/.test(t)) || '';
  const log2 = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-habitlog'))['hab-linge']);
  ok(log2.indexOf('2026-09-16') > -1 && /3 jours? d'affilée/i.test(linge2) && /7j 100%/.test(linge2) && /Record : 3 j/.test(linge2), 'coché : rattaché au 16, série 3, record 3, 7 jours 100 % (' + (linge2.match(/Record[^%]*%/) || [''])[0] + ')');
  await ctx.close();
  const j = await ouvrir('2026-09-17T20:00:00+02:00', Object.assign({'batcave-habitlog': {'hab-linge': ['2026-09-14','2026-09-16']}}, seedHab));   /* jeudi */
  await j.fr.evaluate(() => document.querySelector('.nav-btn[data-page="habitudes"]').click());
  const dash3 = await j.fr.evaluate(() => [...document.querySelectorAll('#dash-checklist li')].map(l => l.innerText));
  const linge3 = (await cartes(j.fr)).find(t => /Linge/.test(t)) || '';
  ok(!dash3.some(t => /Linge/.test(t)) && /lun · mer · ven seulement/.test(linge3) && /Fait mercredi/.test(linge3) && /2 jours? d'affilée/i.test(linge3), 'jeudi : linge absent de la console, « lun · mer · ven seulement », « ✓ Fait mercredi », série 2');
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
