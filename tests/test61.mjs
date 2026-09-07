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
const browser = await chromium.launch();
async function ouvrir(quand){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}

console.log('\n== 214) Consigne du bloc en cours sur le tableau de bord (lundi 11:30, Projets perso 1) ==');
{
  const { ctx, fr } = await ouvrir('2026-09-07T11:30:00+02:00');
  const r = await fr.evaluate(() => { const c = document.getElementById('pb-consigne'); return { hidden: c.hidden, txt: c.textContent, quoi: document.getElementById('pb-quoi').textContent }; });
  ok(r.quoi === 'Projets perso 1', 'bloc en cours : Projets perso 1 (' + r.quoi + ')');
  ok(!r.hidden && /ligne non cochée/.test(r.txt) && /rituel du lundi/.test(r.txt), 'consigne du lundi affichée : ' + r.txt.slice(0, 70) + '…');
  await ctx.close();
}

console.log('\n== 215) Mercredi 14:10 : Projets perso 3 = révision Business ; samedi 17:30 : Fiscalité F1 ; dimanche 13:40 : F3 ==');
{
  const cas = [['2026-09-09T14:10:00+02:00', 'Projets perso 3', /auto-test/], ['2026-09-12T17:30:00+02:00', 'Projets perso 2', /Fiscalité F1/], ['2026-09-13T13:40:00+02:00', 'Projets perso 2', /Fiscalité F3/]];
  for(const [quand, bloc, re] of cas){
    const { ctx, fr } = await ouvrir(quand);
    const r = await fr.evaluate(() => ({ quoi: document.getElementById('pb-quoi').textContent, txt: document.getElementById('pb-consigne').textContent }));
    ok(r.quoi === bloc && re.test(r.txt), quand.slice(0,10) + ' → ' + r.quoi + ' : ' + r.txt.slice(0, 60) + '…');
    await ctx.close();
  }
}

console.log('\n== 216) Timeline du calendrier : consigne sous MAINTENANT, infobulle sur les autres blocs ; prochain bloc quand rien n\'est en cours ==');
{
  const { ctx, fr } = await ouvrir('2026-09-07T20:40:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
  const r = await fr.evaluate(() => {
    const now = document.querySelector('#cal-timeline li.now');
    const c = now && now.querySelector('.t-consigne');
    const anki = Array.from(document.querySelectorAll('#cal-timeline .t-label')).find(l => /^Anki 1/.test(l.textContent));
    return { label: now && now.querySelector('.t-label').textContent, consigne: c && c.textContent, titre: anki && anki.getAttribute('title'), nb: document.querySelectorAll('#cal-timeline .t-consigne').length };
  });
  ok(r.label === 'Comprendre le cours du jour' && /Dentaire/.test(r.consigne || ''), 'MAINTENANT = Comprendre le cours du jour avec sa consigne');
  ok(r.nb === 1, 'une seule consigne dépliée dans la timeline (' + r.nb + ')');
  ok(/échéances/.test(r.titre || ''), 'infobulle sur Anki 1 : ' + (r.titre || '').slice(0, 50) + '…');
  await ctx.close();
  const o2 = await ouvrir('2026-09-07T12:25:00+02:00');
  const r2 = await o2.fr.evaluate(() => ({ quoi: document.getElementById('pb-quoi').textContent, hidden: document.getElementById('pb-consigne').hidden, titre: document.getElementById('pb-titre').textContent }));
  ok(r2.quoi === 'Déjeuner' && r2.hidden === true, 'bloc sans consigne (Déjeuner) : la ligne est masquée');
  await o2.ctx.close();
}

console.log('\n== 217) Google Calendar : un titre « 🦇 Bloc · consigne » se reconnaît à sa base ; consigne par jour ==');
{
  const { ctx, fr } = await ouvrir('2026-09-07T09:00:00+02:00');
  const r = await fr.evaluate(() => ({
    a: window.__bcTitreBase('🦇 Anki 1 · cartes dues dentaire (25/5)'),
    b: window.__bcTitreBase('🦇 Projets perso 3 · tâche courte · mer : révision Business'),
    c: window.__bcTitreBase('🦇 Repos — après-midi libre'),
    lun: window.__bcConsigne('Projets perso 2', 1), ven: window.__bcConsigne('Projets perso 2', 5), sam: window.__bcConsigne('Cartes du dernier cours', 6), rien: window.__bcConsigne('Déjeuner', 1)
  }));
  ok(r.a === '🦇 Anki 1' && r.b === '🦇 Projets perso 3' && r.c === '🦇 Repos — après-midi libre', 'titre de base : ' + r.a + ' / ' + r.b);
  ok(/construire/.test(r.lun) && /Bilan de la semaine/.test(r.ven) && /semaine restés sans cartes/.test(r.sam) && r.rien === '', 'consignes par jour (lundi construire, vendredi bilan, samedi cartes de la semaine, déjeuner vide)');
  await ctx.close();
}
await browser.close();
console.log(errs ? ('\nECHECS: ' + errs) : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
