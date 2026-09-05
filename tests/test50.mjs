/* Relecture finale : décocher retire les séries, copie SYNC sans id en double, objectifs
   recalculés à l'ouverture de l'onglet, relevé SAUVEGARDE, touches d'habitudes en ligne. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local, garderClaude){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(!garderClaude) await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { if(sessionStorage.getItem('__amorce50')) return; sessionStorage.setItem('__amorce50','1'); Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#sport-grid').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const MARDI = '2026-09-08T06:30:00+02:00';

console.log('\n== 150) Décocher un exercice retire ses séries du jour ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="sport"]').click());
  await fr.evaluate(() => {
    const inp = document.querySelector('.sport-card.today [data-series]');
    inp.value = '6/6/5'; inp.dispatchEvent(new Event('change', {bubbles:true}));
  });
  await page.waitForTimeout(200);
  let log = await local(fr, 'batcave-sport-log');
  ok(Array.isArray(log) && log.length === 1 && log[0].exo === 'Tractions', 'les séries sont dans le journal (' + (log && log.length) + ' entrée)');
  let coche = await fr.evaluate(() => document.querySelector('.sport-card.today input[type="checkbox"]').checked);
  ok(coche === true, 'l\'exercice est coché');
  await fr.evaluate(() => { const cb = document.querySelector('.sport-card.today input[type="checkbox"]'); cb.checked = false; cb.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(200);
  log = await local(fr, 'batcave-sport-log');
  const st = await local(fr, 'batcave-sport-2026-09-08');
  ok(Array.isArray(log) && log.length === 0, 'décoché → le journal du jour est vidé pour cet exercice (' + log.length + ' entrée)');
  ok(st && st['Pull-0'] === false, 'et la case reste décochée dans l\'état de la séance');
  const champ = await fr.evaluate(() => document.querySelector('.sport-card.today [data-series]').value);
  ok(champ === '', 'le champ de séries est vide après re-rendu');
  await ctx.close();
}

console.log('\n== 151) Relevé SYNC : copie sans identifiant en double, clic renvoyé ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI);
  const r = await fr.evaluate(() => {
    const src = document.getElementById('cloud-status');
    src.hidden = false;
    src.innerHTML = '☁️ <button type="button" id="cloud-refresh-btn">Nouvelles données — rafraîchir</button>';
    window.__clics = 0; src.querySelector('button').addEventListener('click', () => { window.__clics++; });
    return true;
  });
  await page.waitForTimeout(100);
  const c = await fr.evaluate(() => {
    const dst = document.getElementById('bc-sync');
    const nb = document.querySelectorAll('#cloud-refresh-btn').length;
    const copie = dst.querySelector('button');
    if(copie) copie.click();
    return { nb, txt: dst.textContent.replace(/\s+/g,' ').trim(), clics: window.__clics };
  });
  ok(c.nb === 1, 'un seul #cloud-refresh-btn dans la page (' + c.nb + ')');
  ok(/rafraîchir/.test(c.txt), 'la barre affiche le même état que le rail : ' + c.txt);
  ok(c.clics === 1, 'un clic sur la copie déclenche l\'original (' + c.clics + ')');
  await ctx.close();
}

console.log('\n== 152) Objectifs recalculés à l\'ouverture de l\'onglet ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI);
  const avant = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="objectifs"]').click(); return document.getElementById('obj-liste').innerText; });
  /* une saisie faite ailleurs (journal de sport) doit se voir au retour sur Objectifs */
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="sport"]').click(); });
  await fr.evaluate(() => { const inp = document.querySelector('.sport-card.today [data-series]'); inp.value = '9/9/8'; inp.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(200);
  await fr.evaluate(() => { document.querySelector('[data-obj-vue="trimestre"]').click(); document.querySelector('.nav-btn[data-page="objectifs"]').click(); });
  await page.waitForTimeout(150);
  const apres = await fr.evaluate(() => [...document.querySelectorAll('#obj-liste .obj-row')].map(r => r.innerText.replace(/\s+/g,' ')).filter(t => /Tractions/.test(t))[0] || '');
  ok(/réel\s*9\b/.test(apres), 'Tractions : le réel du trimestre reflète la meilleure série saisie (9) — ' + apres.slice(0, 90));
  await ctx.close();
}

console.log('\n== 153) Relevé SAUVEGARDE : auto / manuelle, la plus récente ==');
{
  let { ctx, fr } = await ouvrir(MARDI, {'batcave-last-auto-backup':'2026-09-06', 'batcave-last-manual-backup':'2026-09-07'});
  let t = await fr.evaluate(() => document.getElementById('bc-backup').textContent);
  ok(t === 'manuelle · hier', 'manuelle du 7 > auto du 6 → « manuelle · hier » (' + t + ')');
  const banniere = await fr.evaluate(() => document.getElementById('coherence-banner').hidden);
  ok(banniere === true, 'la nouvelle clé last-manual-backup est connue : pas de bannière');
  await ctx.close();
  ({ ctx, fr } = await ouvrir(MARDI, {'batcave-last-auto-backup':'2026-09-08', 'batcave-last-manual-backup':'2026-09-07'}));
  t = await fr.evaluate(() => document.getElementById('bc-backup').textContent);
  ok(t === 'auto · aujourd\'hui', 'auto du jour → « auto · aujourd\'hui » (' + t + ')');
  await ctx.close();
  ({ ctx, fr } = await ouvrir(MARDI));
  t = await fr.evaluate(() => document.getElementById('bc-backup').textContent);
  ok(t === 'aucune', 'sans sauvegarde → « aucune » (' + t + ')');
  await ctx.close();
}

console.log('\n== 154) Console d\'habitudes : des touches en ligne, pas des rangées ==');
{
  const { ctx, fr } = await ouvrir(MARDI);
  const h = await fr.evaluate(() => {
    const lis = [...document.querySelectorAll('#dash-checklist li')];
    const tops = new Set(lis.map(l => Math.round(l.getBoundingClientRect().top)));
    return { n: lis.length, lignes: tops.size, largeurMax: Math.max(...lis.map(l => l.getBoundingClientRect().width)), conteneur: document.getElementById('dash-checklist').getBoundingClientRect().width };
  });
  ok(h.n > 6 && h.lignes < h.n, h.n + ' touches sur ' + h.lignes + ' lignes');
  ok(h.largeurMax < h.conteneur * 0.6, 'aucune touche ne prend toute la largeur (max ' + Math.round(h.largeurMax) + ' / ' + Math.round(h.conteneur) + 'px)');
  await ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
