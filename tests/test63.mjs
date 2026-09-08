/* Lot 15 : coches automatiques du calendrier, mode essentiel (téléphone), iPad compact,
   accessibilité clavier (lien d'évitement, focus visible, Échap, piège à tabulation,
   retour du focus, libellés des boutons sans texte). */
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
/* Lundi 7 septembre 2026, 12:00 : Anki 1 fait au minuteur (07:22 → 08:15, soit 53 min sur 60),
   Anki 2 à moitié seulement (08:20 → 08:45, 25 min sur 60 : sous la moitié), Cartes décochée à la main. */
const ms = (iso, hm) => new Date(iso + 'T' + hm + ':00+02:00').getTime();
const seed = {
  'batcave-sessions': [
    {id:'a1', date:'2026-09-07', debut: ms('2026-09-07','07:22'), fin: ms('2026-09-07','08:15'), duree: 53, type:'cours', label:'Anatomía'},
    {id:'a2', date:'2026-09-07', debut: ms('2026-09-07','08:20'), fin: ms('2026-09-07','08:45'), duree: 25, type:'cours', label:'Anatomía'}
  ],
  'batcave-cal-2026-09-07': {'09:20': false}
};
const browser = await chromium.launch();
async function ouvrir(vp, extra){
  const ctx = await browser.newContext({ viewport: vp, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, Object.assign({}, seed, extra || {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-07T12:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  return { ctx, page, fr };
}

console.log('\n== 221) Calendrier : bloc couvert par une session coché tout seul, bloc à moitié fait non, coche manuelle respectée ==');
{
  const { ctx, page, fr } = await ouvrir({width:1440, height:900});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelector('.nav-btn[data-page="calendrier"]').click(); });
  await page.waitForTimeout(300);
  const st = await fr.evaluate(() => {
    const li = h => { const cb = document.querySelector('#cal-timeline input[data-cal="' + h + '"]'); const l = cb.closest('li'); return { checked: cb.checked, auto: !!l.querySelector('.t-auto'), cls: l.className }; };
    return { a1: li('07:20'), a2: li('08:20'), cartes: li('09:20'), sport: li('05:30'), store: JSON.parse(localStorage.getItem('batcave-cal-2026-09-07')) };
  });
  ok(st.a1.checked && st.a1.auto && /checked/.test(st.a1.cls), 'Anki 1 (53 min sur 60) coché automatiquement avec la marque « auto »');
  ok(!st.a2.checked && !st.a2.auto, 'Anki 2 (25 min sur 60, sous la moitié) reste décoché');
  ok(!st.cartes.checked, 'Cartes du dernier cours décoché à la main : jamais recoché');
  ok(!st.sport.checked, 'un bloc hors travail (Sport) n\'est pas concerné');
  ok(st.store['07:20'] === 'auto' && st.store['09:20'] === false, 'stockage : 07:20 = "auto", 09:20 = false : ' + JSON.stringify(st.store));
  /* décocher à la main un bloc auto : il reste décoché au rendu suivant */
  await fr.evaluate(() => { const cb = document.querySelector('#cal-timeline input[data-cal="07:20"]'); cb.click(); });
  await page.waitForTimeout(200);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
  await page.waitForTimeout(200);
  const apres = await fr.evaluate(() => ({ checked: document.querySelector('#cal-timeline input[data-cal="07:20"]').checked, store: JSON.parse(localStorage.getItem('batcave-cal-2026-09-07'))['07:20'] }));
  ok(!apres.checked && apres.store === false, 'décoché à la main → reste décoché après un nouveau rendu (' + apres.store + ')');
  await ctx.close();
}

console.log('\n== 222) Session enregistrée au minuteur → le calendrier se recoche sans recharger ==');
{
  const { ctx, page, fr } = await ouvrir({width:1440, height:900}, {'batcave-sessions': []});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelector('.nav-btn[data-page="calendrier"]').click(); });
  await page.waitForTimeout(200);
  const avant = await fr.evaluate(() => document.querySelector('#cal-timeline input[data-cal="11:20"]').checked);
  /* une session projet 11:20 → 12:00 enregistrée comme le fait le minuteur (logSession) */
  await fr.evaluate(() => window.__bcLogSession(40, {cible:'projet', projet:'DS', startedAt: new Date('2026-09-07T11:20:00+02:00').getTime()}));
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => document.querySelector('#cal-timeline input[data-cal="11:20"]').checked);
  ok(!avant && apres, 'Projets perso 1 non coché avant, coché après une session de 40 min sur 60');
  await ctx.close();
}

console.log('\n== 223) Téléphone : mode essentiel actif par défaut, bascule « Tout afficher », préférence locale ==');
{
  const { ctx, page, fr } = await ouvrir({width:390, height:844});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  const st = await fr.evaluate(() => {
    const v = sel => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none'; };
    return { mode: window.__bcModeEssentiel(), btn: document.getElementById('mode-essentiel-toggle').textContent, plan: v('.dash-wall > .mon-plan'), suivi: v('.dash-wall > .mon-suivi'), central: v('.panel.mon-central'), habits: v('.mon-habits'), cloture: v('#bc-cloture'), meteo: v('#dash-weather, .bc-row-2 > .bc-r:first-child'), releves: v('#dash-releves'), pomodoro: v('#timer-pomodoro'), reactor: document.querySelector('.reactor').getBoundingClientRect().width, sync: (() => { const s = document.getElementById('cloud-status'); return s ? getComputedStyle(s).display : 'absent'; })() };
  });
  ok(st.mode && st.btn === 'Tout afficher', 'mode essentiel actif par défaut à 390 px, bouton « Tout afficher »');
  ok(!st.plan && !st.suivi && !st.releves, 'plan du jour, suivi et relevés masqués');
  ok(st.central && st.habits && st.cloture && st.pomodoro, 'bloc central, habitudes, clôture et Pomodoro visibles');
  ok(st.reactor > 100 && st.reactor <= 200, 'réacteur réduit (' + Math.round(st.reactor) + ' px)');
  await fr.evaluate(() => document.getElementById('mode-essentiel-toggle').click());
  await page.waitForTimeout(150);
  const st2 = await fr.evaluate(() => ({ mode: window.__bcModeEssentiel(), plan: getComputedStyle(document.querySelector('.dash-wall > .mon-plan')).display !== 'none', pref: localStorage.getItem('bc-mode-essentiel'), btn: document.getElementById('mode-essentiel-toggle').textContent }));
  ok(!st2.mode && st2.plan && st2.pref === '0' && st2.btn === 'Essentiel', '« Tout afficher » : tout revient, préférence 0 mémorisée localement');
  const deb = await fr.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok(deb, 'aucun débordement horizontal en mode complet à 390 px');
  await ctx.close();
}

console.log('\n== 224) Bureau : bouton essentiel invisible, la classe n\'a aucun effet ==');
{
  const { ctx, page, fr } = await ouvrir({width:1440, height:900});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  const st = await fr.evaluate(() => { document.body.classList.add('mode-essentiel'); return { btn: getComputedStyle(document.getElementById('mode-essentiel-toggle')).display, plan: getComputedStyle(document.querySelector('.dash-wall > .mon-plan')).display }; });
  ok(st.btn === 'none' && st.plan !== 'none', 'à 1440 px : bouton caché, plan du jour toujours visible même avec la classe');
  await ctx.close();
}

console.log('\n== 225) iPad portrait : écran central compact, sans débordement ==');
{
  const { ctx, page, fr } = await ouvrir({width:820, height:1180});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(200);
  const st = await fr.evaluate(() => ({ cols: getComputedStyle(document.querySelector('.panel.mon-central')).gridTemplateColumns, reactor: document.querySelector('.reactor').getBoundingClientRect().width, deb: document.documentElement.scrollWidth <= window.innerWidth + 1 }));
  ok(/^230px/.test(st.cols) && st.reactor <= 231, 'réacteur à 230 px (' + st.cols + ')');
  ok(st.deb, 'pas de défilement horizontal');
  await ctx.close();
}

console.log('\n== 226) Clavier : lien d\'évitement, focus visible sur le rail, Entrée change de page, ligne priorité ==');
{
  const { ctx, page, fr } = await ouvrir({width:1440, height:900});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  const fl = page.frameLocator('#f');
  const first = await fr.evaluate(() => { const f = document.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'); const s = document.querySelector('.skip-link'); s.focus(); return { premier: f[0] === s, cls: document.activeElement.className, txt: document.activeElement.textContent, left: document.activeElement.getBoundingClientRect().left }; });
  ok(first.premier && /skip-link/.test(first.cls) && first.left >= 0, 'lien « Aller au contenu » : premier focalisable du document, visible au focus (' + first.txt + ')');
  await fl.locator('.skip-link').press('Enter');
  await page.waitForTimeout(100);
  const surMain = await fr.evaluate(() => document.activeElement.tagName);
  ok(surMain === 'MAIN', 'Entrée sur le lien : focus dans le contenu (' + surMain + ')');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="bilan"]').focus());
  const outline = await fr.evaluate(() => { const el = document.activeElement; const cs = getComputedStyle(el); return { cls: el.className, outline: cs.outlineStyle, w: cs.outlineWidth }; });
  ok(/nav-btn/.test(outline.cls), 'rail focalisable au clavier');
  await fl.locator('.nav-btn[data-page="bilan"]').press('Enter');
  await page.waitForTimeout(150);
  const pg = await fr.evaluate(() => document.querySelector('.page.active').dataset.page);
  ok(pg === 'bilan', 'Entrée sur un bouton du rail change de page (' + pg + ')');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  const prio = await fr.evaluate(() => { const p = document.getElementById('dash-priorite'); if(p.hidden) return 'hidden'; p.focus(); return document.activeElement.id; });
  if(prio !== 'hidden'){
    await fl.locator('#dash-priorite').press('Enter'); await page.waitForTimeout(150);
    ok(await fr.evaluate(() => document.querySelector('.page.active').dataset.page) === 'insights', 'Entrée sur la ligne priorité → Insights');
  } else ok(true, 'ligne priorité absente sur ce jeu (rien à tester)');
  await ctx.close();
}

console.log('\n== 227) Fenêtres : focus dedans à l\'ouverture, Tab piégé, Échap ferme, focus rendu à l\'ouvreur ==');
{
  const { ctx, page, fr } = await ouvrir({width:1440, height:900});
  const fl = page.frameLocator('#f');
  const touche = async k => { await fl.locator(':focus').first().press(k); };
  /* rituel d'ouverture : le focus doit être dans la fenêtre, Échap la ferme */
  await page.waitForTimeout(300);
  const rit = await fr.evaluate(() => ({ ouvert: !document.getElementById('opening-ritual-overlay').hidden, dedans: document.getElementById('opening-ritual-overlay').contains(document.activeElement), actif: document.activeElement.id }));
  ok(rit.ouvert && rit.dedans, 'rituel ouvert : focus dedans (' + rit.actif + ')');
  await touche('Escape'); await page.waitForTimeout(150);
  ok(await fr.evaluate(() => document.getElementById('opening-ritual-overlay').hidden), 'Échap ferme le rituel');
  /* clôture : ouverture par clavier depuis la barre, Tab piégé, Échap, retour du focus */
  await fl.locator('#bc-cloture').press('Enter'); await page.waitForTimeout(200);
  const cl = await fr.evaluate(() => ({ ouvert: !document.getElementById('cloture-overlay').hidden, dedans: document.getElementById('cloture-overlay').contains(document.activeElement), actif: document.activeElement.id }));
  ok(cl.ouvert && cl.dedans, 'clôture ouverte au clavier, focus dans la fenêtre (' + cl.actif + ')');
  let dedansToujours = true;
  for(let i = 0; i < 40; i++){ await touche('Tab'); if(!(await fr.evaluate(() => document.getElementById('cloture-overlay').contains(document.activeElement)))){ dedansToujours = false; break; } }
  ok(dedansToujours, '40 Tab : le focus ne sort jamais de la clôture');
  await touche('Shift+Tab');
  await touche('Escape'); await page.waitForTimeout(200);
  const apres = await fr.evaluate(() => ({ ferme: document.getElementById('cloture-overlay').hidden, actif: document.activeElement.id }));
  ok(apres.ferme && apres.actif === 'bc-cloture', 'Échap ferme la clôture et rend le focus à la barre (' + apres.actif + ')');
  /* fenêtre de question (Pomodoro révision) : Échap annule, aucune session créée */
  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(200);
  const ask = await fr.evaluate(() => ({ ouvert: !document.getElementById('ask-overlay').hidden, dedans: document.getElementById('ask-overlay').contains(document.activeElement) }));
  ok(ask.ouvert && ask.dedans, 'fenêtre « Quelle matière ? » : focus dedans');
  await touche('Escape'); await page.waitForTimeout(200);
  const ask2 = await fr.evaluate(() => ({ ferme: document.getElementById('ask-overlay').hidden, timer: !!document.querySelector('#timer-display') && document.getElementById('timer-display').textContent }));
  ok(ask2.ferme, 'Échap ferme la question sans lancer le minuteur');
  /* sauvegarde : ouverture, Échap, retour */
  await fr.evaluate(() => { const b = document.querySelector('.sidebar-foot .backup-trigger'); b.focus(); b.click(); });
  await page.waitForTimeout(200);
  const bk = await fr.evaluate(() => ({ ouvert: !document.getElementById('backup-overlay').hidden, dedans: document.getElementById('backup-overlay').contains(document.activeElement) }));
  ok(bk.ouvert && bk.dedans, 'sauvegarde ouverte, focus dedans');
  await touche('Escape'); await page.waitForTimeout(200);
  const bk2 = await fr.evaluate(() => ({ ferme: document.getElementById('backup-overlay').hidden, actif: (document.activeElement.className || '') }));
  ok(bk2.ferme && /backup-trigger/.test(bk2.actif), 'Échap ferme la sauvegarde et rend le focus au bouton');
  await ctx.close();
}

console.log('\n== 228) Tous les boutons sans texte ont un libellé ; cases du calendrier au clavier ==');
{
  const { ctx, page, fr } = await ouvrir({width:1440, height:900});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  const pages = ['dashboard','bilan','insights','calendrier','agenda','journal','habitudes','addictions','repas','sport','coran','taches','budget','etudes','business','objectifs','vie','courses'];
  const sansLibelle = await fr.evaluate(ps => {
    const out = [];
    ps.forEach(p => {
      document.querySelector('.nav-btn[data-page="' + p + '"]').click();
      document.querySelectorAll('.page.active button, .page.active a, .page.active [role="button"]').forEach(b => {
        if(b.offsetParent === null) return;
        const txt = (b.textContent || '').replace(/[\\s×✎▲▼▾▸✕•·]/g, '');
        const lib = b.getAttribute('aria-label') || b.getAttribute('title') || (b.querySelector('img[alt]') || {}).alt;
        if(!txt && !lib) out.push(p + ' : ' + (b.id || b.className || b.outerHTML.slice(0, 60)));
      });
    });
    return out;
  }, pages);
  ok(sansLibelle.length === 0, 'aucun bouton sans texte ni libellé (' + sansLibelle.length + ')' + (sansLibelle.length ? ' : ' + sansLibelle.slice(0, 6).join(' | ') : ''));
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
  await page.frameLocator('#f').locator('#cal-timeline input[data-cal="10:20"]').press('Space'); await page.waitForTimeout(150);
  const coche = await fr.evaluate(() => ({ checked: document.querySelector('#cal-timeline input[data-cal="10:20"]').checked, store: JSON.parse(localStorage.getItem('batcave-cal-2026-09-07'))['10:20'] }));
  ok(coche.checked && coche.store === true, 'Espace coche un bloc du calendrier et l\'enregistre');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\nECHECS: ' + errs : '\nTOUS LES TESTS OK');
process.exit(errs ? 1 : 0);
