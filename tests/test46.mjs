/* Six chantiers + deux correctifs de connecteurs (Spotify, Google Calendar). */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

/* faux cloud + faux mcp, pilotables depuis le test */
const MOCK = (cfg) => {
  window.__cloud = Object.assign({}, cfg.cloud || {});
  window.__sets = []; window.__mcpInputs = []; window.__snapCb = null;
  const db = {
    doc(path){ const k = path.replace(/^state\//,''); return {
      set(v){ window.__sets.push({k, v}); window.__cloud[k] = v && v.v; return Promise.resolve(); },
      delete(){ delete window.__cloud[k]; return Promise.resolve(); }
    }; },
    collection(){ return { onSnapshot(cb){
      window.__snapCb = cb;
      const inst = Object.assign({}, window.__cloud);
      cb({ empty: Object.keys(inst).length === 0, docs: Object.keys(inst).map(k => ({id:k, data: () => ({v: inst[k], d: 'appareil-distant', t: 1})})) });
      return () => {};
    } }; }
  };
  const mcp = {
    watchTool(server, tool, input, handler){
      window.__mcpInputs.push({server, tool, input});
      if(tool === 'get_currently_playing' && cfg.spotify){
        setTimeout(() => handler({type:'data', result:{payload: cfg.spotify}}), 60);
      }
      return () => {};
    },
    callTool(){ return Promise.resolve({payload:{files:[]}}); },
    invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'db' ? db : (n === 'mcp' ? mcp : null)); } };
  try{ sessionStorage.setItem('batcave-cloud-reload-at', String(Date.now())); }catch(e){}
};

async function ouvrir(quand, opts){
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: opts.viewport || {width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(opts.mock) await ctx.addInitScript(MOCK, opts.mock); else await ctx.addInitScript(() => { window.claude = undefined; });
  if(opts.local) await ctx.addInitScript(x => {
    try{ if(sessionStorage.getItem('__amorce')) return; sessionStorage.setItem('__amorce','1'); }catch(e){}
    Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k])));
  }, opts.local);
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
const txt = (fr, sel) => fr.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.trim() : null; }, sel);
const visible = (fr, sel) => fr.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.offsetParent !== null; }, sel);

const VENDREDI = '2026-09-04T10:42:00+02:00';

console.log('\n== 101) Spotify : la vraie forme de réponse s\'affiche ==');
{
  const { ctx, fr, page } = await ouvrir(VENDREDI, { mock: { spotify: { currently_playing_entity: { name:'goosebumps', creator:'Travis Scott', creators:[{name:'Travis Scott'}], playback:{status:'PLAYABLE'} } } } });
  await page.waitForTimeout(400);
  ok(await visible(fr, '#dash-spotify'), 'le widget ♫ est visible');
  const t = await txt(fr, '#dash-spotify');
  ok(/goosebumps — Travis Scott/.test(t || ''), 'titre — artiste : ' + t);
  const gcal = await fr.evaluate(() => window.__mcpInputs.filter(x => x.tool === 'list_events')[0]);
  ok(gcal && gcal.input && gcal.input.pageSize === 250, 'Google Calendar demande 250 événements (une semaine entière)');
  await ctx.close();
}

console.log('\n== 102) Bloc en cours / prochain bloc sous le réacteur ==');
{
  const { ctx, fr } = await ouvrir(VENDREDI);
  ok(await visible(fr, '#dash-prochain'), 'le bloc est affiché à 10:42');
  ok((await txt(fr, '#pb-titre')) === 'En cours', 'titre « En cours » : ' + await txt(fr, '#pb-titre'));
  ok(((await txt(fr, '#pb-quoi')) || '').length > 2, 'le bloc a un libellé : ' + await txt(fr, '#pb-quoi'));
  ok(/^\d\d:\d\d → \d\d:\d\d$/.test((await txt(fr, '#pb-quand')) || ''), 'plage horaire : ' + await txt(fr, '#pb-quand'));
  const w = await fr.evaluate(() => parseFloat(document.getElementById('pb-barre').style.width));
  ok(w > 0 && w < 100, 'barre de progression entre 0 et 100 % : ' + w);
  ok(/dans \d+ min|dernier bloc/.test((await txt(fr, '#pb-dans')) || ''), 'annonce du suivant : ' + await txt(fr, '#pb-dans'));
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-04T05:00:00+02:00');
  ok((await txt(fr, '#pb-titre')) === 'Prochain bloc', 'avant le lever : « Prochain bloc »');
  ok((await txt(fr, '#pb-quoi')) === 'Projets perso matinal', 'vendredi : c\'est le bloc Projets perso matinal de 05:30 : ' + await txt(fr, '#pb-quoi'));
  ok((await txt(fr, '#pb-dans')) === 'dans 30 min', 'dans 30 min : ' + await txt(fr, '#pb-dans'));
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-04T23:00:00+02:00');
  ok(!(await visible(fr, '#dash-prochain')), 'après le coucher : rien à annoncer');
  await ctx.close();
}

console.log('\n== 103) Clés inconnues du code signalées, clés connues laissées tranquilles ==');
{
  const { ctx, fr, page } = await ouvrir(VENDREDI, { local: { 'batcave-ancienne-cle': [{annales:[]},{annales:[]}], 'batcave-fixed-logged-2026-09': true, 'batcave-examens': {'Anatomía I':'2026-10-16'} } });
  const t = await txt(fr, '#coherence-liste');
  ok(await visible(fr, '#coherence-banner'), 'la bannière est visible');
  ok(/Clé inconnue du code : batcave-ancienne-cle/.test(t || ''), 'batcave-ancienne-cle est signalée');
  ok(!/fixed-logged|examens/.test(t || ''), 'les clés connues (préfixe daté, examens) ne le sont pas');
  await fr.evaluate(() => document.querySelector('[data-cle-ignorer]').click());
  await page.waitForTimeout(200);
  ok(await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-coherence-ignore-cle-batcave-ancienne-cle'))) === true, 'Ignorer pose le drapeau');
  ok(!/batcave-ancienne-cle/.test((await txt(fr, '#coherence-liste')) || ''), 'et la ligne disparaît');
  await ctx.close();
}

console.log('\n== 104) Croisement d\'écritures entre appareils ==');
{
  const { ctx, fr, page } = await ouvrir(VENDREDI, { mock: { cloud: { 'batcave-goals': {poids:'64'} } } });
  const premier = await fr.evaluate(() => window.__sets.length);
  /* une écriture locale : cocher une habitude */
  await fr.evaluate(() => { const cb = document.querySelector('#dash-checklist [data-togglehab]'); if(cb) cb.click(); });
  await page.waitForTimeout(200);
  const ecrit = await fr.evaluate(() => window.__sets.filter(s => s.k === 'batcave-habitlog').slice(-1)[0]);
  ok(!!ecrit && typeof ecrit.v.d === 'string' && ecrit.v.d.length > 3 && typeof ecrit.v.t === 'number', 'chaque écriture cloud porte l\'appareil et l\'heure');
  /* un autre appareil écrase la même clé juste après */
  await fr.evaluate(() => {
    window.__snapCb({ empty:false, docs:[{id:'batcave-habitlog', data: () => ({v:{'core-lit':['2020-01-01']}, d:'autre-appareil', t:Date.now()})}] });
  });
  await page.waitForTimeout(300);
  const toast = await fr.evaluate(() => { const t = document.querySelector('.toast'); return t && !t.hidden ? t.innerText : (sessionStorage.getItem('bc-conflit') || ''); });
  ok(/Un autre appareil a écrit « habitlog »/.test(toast), 'le croisement est annoncé : ' + toast.slice(0, 80));
  await ctx.close();
}

console.log('\n== 105) Rail compact sur iPad portrait ==');
{
  const { ctx, fr } = await ouvrir(VENDREDI, { viewport:{width:834, height:1112} });
  const m = await fr.evaluate(() => ({ aside: document.querySelector('aside').getBoundingClientRect().width, scroll: document.documentElement.scrollWidth, txt: getComputedStyle(document.querySelector('.sidebar-foot .btn-txt')).display }));
  ok(m.aside <= 80, 'rail de ' + m.aside + ' px (≤ 80)');
  ok(m.scroll <= 834, 'aucun défilement horizontal (' + m.scroll + ')');
  ok(m.txt === 'none', 'les libellés des boutons du pied sont masqués');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir(VENDREDI);
  const m = await fr.evaluate(() => ({ aside: document.querySelector('aside').getBoundingClientRect().width, txt: getComputedStyle(document.querySelector('.sidebar-foot .btn-txt')).display }));
  ok(m.aside >= 200 && m.txt !== 'none', 'sur Mac le rail complet est intact (' + m.aside + ' px)');
  await ctx.close();
}

console.log('\n== 106) Cadrans du minuteur décorés comme le réacteur ==');
{
  const { ctx, fr } = await ouvrir(VENDREDI);
  const m = await fr.evaluate(() => ({
    t: document.querySelectorAll('#timer-dial .ticks line').length, f: document.querySelectorAll('#focus-dial .ticks line').length,
    ring: !!document.querySelector('#focus-dial .dial-dash'), run: !!document.getElementById('timer-ring') && !!document.getElementById('focus-ring')
  }));
  ok(m.t === 60 && m.f === 60, '60 graduations sur chaque cadran (' + m.t + ' / ' + m.f + ')');
  ok(m.ring && m.run, 'anneau pointillé présent, anneaux de progression intacts');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
