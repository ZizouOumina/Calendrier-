/* Les types d'echeance : la saisie les enregistre tels quels et la liste les rend.
   Ecrit avec l'ajout du type « Activite en classe » le 23 septembre. Aucun test ne
   couvrait les types jusque-la : le menu pouvait proposer une valeur que le registre
   TYPES_ECHEANCE ne connaissait pas, et la saisie la retombait silencieusement sur
   « Autre » (ligne 8640, `if(!TYPES_ECHEANCE[type]) type = 'autre'`). Le panneau aurait
   accepte le clic sans rien dire et enregistre le mauvais type. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-23T10:00:00+02:00') });
await page.goto(URL, {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(300);

console.log('\n== 254) Chaque type du menu existe dans le registre ==');
{
  const r = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="calendrier"]').click();
    const opts = [...document.querySelectorAll('#ech-type option')].map(o => ({v: o.value, t: o.textContent}));
    return {opts: opts, connus: Object.keys(window.__bcTypesEcheance || {})};
  });
  ok(r.opts.length === 6, 'six types proposes : ' + r.opts.map(o => o.t).join(', '));
  ok(r.opts.some(o => o.v === 'activite' && /Activité en classe/.test(o.t)), 'le menu propose « Activité en classe »');
  /* Le point du test : aucune option ne doit tomber dans le filet « autre ». */
  const orphelines = r.opts.filter(o => r.connus.indexOf(o.v) === -1).map(o => o.v);
  ok(orphelines.length === 0, 'aucune option inconnue du registre' + (orphelines.length ? ' (orphelines : ' + orphelines.join(', ') + ')' : ''));
}

console.log('\n== 255) Saisir une activite en classe : elle est enregistree sous son vrai type ==');
{
  await fr.evaluate(() => { document.getElementById('ech-plus').click(); });
  await page.waitForTimeout(150);
  await fr.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change', {bubbles:true})); };
    set('ech-date', '2026-10-06'); set('ech-type', 'activite');
    set('ech-matiere', 'Antropología'); set('ech-label', 'Exposición en grupo');
    document.getElementById('ech-add').click();
  });
  await page.waitForTimeout(300);
  const e = await fr.evaluate(() => (JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-echeances') || '[]') || []).slice(-1)[0]);
  ok(e && e.type === 'activite', 'enregistree avec type « activite », pas « autre » (obtenu : ' + (e && e.type) + ')');
  ok(e && e.date === '2026-10-06' && e.matiere === 'Antropología', 'date et matiere conservees');
  const txt = await fr.evaluate(() => document.getElementById('ech-liste').textContent.replace(/\s+/g,' '));
  ok(/Exposición en grupo/.test(txt), 'la ligne apparait dans la liste');
  ok(/👥/.test(txt), 'avec son icone 👥, distincte des cinq autres');
}

console.log('\n== 256) Les six icones sont distinctes ==');
{
  const ics = await fr.evaluate(() => Object.keys(window.__bcTypesEcheance).map(k => window.__bcTypesEcheance[k].ic));
  ok(new Set(ics).size === ics.length, 'aucune icone en double : ' + ics.join(' '));
}

await ctx.close();
console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
