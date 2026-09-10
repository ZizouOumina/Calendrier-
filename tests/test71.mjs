/* Lot 22 — l'en-tête « maintenant », le thème jour/nuit, les cartes d'habitudes, les
   raccourcis P/C/H, la clôture express et l'installation sur l'écran d'accueil. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, opts){
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: opts.viewport || {width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(opts.local) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, opts.local);
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
const MERCREDI_MATIN = '2026-09-16T10:20:00+02:00';
const MERCREDI_SOIR  = '2026-09-16T21:30:00+02:00';
const DIMANCHE_SOIR  = '2026-09-20T21:30:00+02:00';

console.log('\n== 280) Le bloc en cours et son Pomodoro passent en tête de page ==');
{
  const { ctx, fr } = await ouvrir(MERCREDI_MATIN);
  const g = await fr.evaluate(() => {
    const f = document.getElementById('dash-focus');
    const central = document.querySelector('.panel.mon-central');
    return { avantCentral: !!(f.compareDocumentPosition(central) & Node.DOCUMENT_POSITION_FOLLOWING),
             contient: !!f.querySelector('#dash-prochain') && !!f.querySelector('#dash-pomodoro'),
             visible: f.getBoundingClientRect().top < 400,
             txt: f.innerText };
  });
  ok(g.avantCentral, 'l\'en-tête est placé avant l\'écran central');
  ok(g.contient, 'il porte le bloc en cours et les boutons Pomodoro');
  ok(g.visible, 'il est visible sans faire défiler');
  ok(/En cours/.test(g.txt), 'il annonce le bloc en cours');
  await ctx.close();
}

console.log('\n== 281) Le Pomodoro du bloc est mis en avant, les autres en retrait ==');
{
  const { ctx, fr } = await ouvrir(MERCREDI_MATIN);
  const b = await fr.evaluate(() => ({
    quoi: document.getElementById('pb-quoi').textContent,
    suggere: [...document.querySelectorAll('#dash-focus .btn.pomo-suggere')].map(x => x.id),
    second: [...document.querySelectorAll('#dash-focus .btn.pomo-second')].map(x => x.id)
  }));
  ok(b.suggere.length === 1, 'un seul bouton est mis en avant (' + b.suggere.join(',') + ' pour « ' + b.quoi + ' »)');
  ok(b.second.length === 2, 'les deux autres passent en second plan');
  await ctx.close();
}

console.log('\n== 282) Thème : clair le jour, sombre le soir, et bascule manuelle ==');
{
  const jour = await ouvrir(MERCREDI_MATIN);
  ok(await jour.fr.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'jour', 'à 10 h : thème clair');
  const fond = await jour.fr.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(/232, 238, 242/.test(fond), 'le fond de page est clair (' + fond + ')');
  const encre = await jour.fr.evaluate(() => getComputedStyle(document.querySelector('.bc-name')).color);
  ok(/11, 26, 34/.test(encre), 'le texte est sombre sur fond clair (' + encre + ')');
  ok(await jour.fr.evaluate(() => document.querySelector('meta[name="theme-color"]').content) === '#e8eef2', 'la couleur de barre système suit le thème');
  /* trois clics = un tour complet */
  const suite = [];
  for(let i = 0; i < 3; i++){
    await jour.fr.evaluate(() => document.getElementById('theme-toggle').click());
    await jour.page.waitForTimeout(120);
    suite.push(await jour.fr.evaluate(() => document.documentElement.getAttribute('data-theme') + ':' + localStorage.getItem('bc-theme')));
  }
  ok(suite.join(' → ') === 'jour:jour → nuit:nuit → jour:auto', 'le bouton fait auto → clair → sombre → auto (' + suite.join(' → ') + ')');
  await jour.ctx.close();
  const soir = await ouvrir(MERCREDI_SOIR);
  ok(await soir.fr.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'nuit', 'à 21 h 30 : thème sombre');
  await soir.ctx.close();
  /* un choix manuel tient, même à contre-heure */
  const force = await ouvrir(MERCREDI_SOIR, { local: {} });
  await force.fr.evaluate(() => { localStorage.setItem('bc-theme', '"jour"'.slice(1,-1)); });
  await force.fr.evaluate(() => { localStorage.setItem('bc-theme', 'jour'); location.reload(); });
  await force.page.waitForTimeout(1200);
  const fr2 = force.page.frames().find(x => x.url().includes('batcave.html'));
  ok(await fr2.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'jour', 'le thème clair forcé survit au rechargement, le soir');
  await force.ctx.close();
}

console.log('\n== 283) Les cartes d\'habitudes ont la même hauteur, et tiennent en trois lignes sur téléphone ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI_MATIN);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="habitudes"]').click());
  await page.waitForTimeout(300);
  const r = await fr.evaluate(() => {
    const cs = [...document.querySelectorAll('#habits-grid > .card')];
    const rangees = {};
    cs.forEach(c => { const b = c.getBoundingClientRect(); (rangees[Math.round(b.top)] = rangees[Math.round(b.top)] || []).push(Math.round(b.height)); });
    return Object.values(rangees).map(hs => new Set(hs).size);
  });
  ok(r.length > 1 && r.every(n => n === 1), 'chaque rangée n\'a qu\'une hauteur de carte (' + r.join(',') + ')');
  ok(await fr.evaluate(() => !!document.querySelector('#habits-grid .hab-repli [data-hab-rythme]')), 'le rythme est passé dans le repli');
  ok(await fr.evaluate(() => /Rythme et historique/.test(document.querySelector('#habits-grid .heat-toggle').textContent)), 'le repli annonce rythme et historique');
  await ctx.close();
  const tel = await ouvrir(MERCREDI_MATIN, { viewport:{width:390,height:844} });
  await tel.fr.evaluate(() => document.querySelector('.nav-btn[data-page="habitudes"]').click());
  await tel.page.waitForTimeout(300);
  const h = await tel.fr.evaluate(() => {
    const cs = [...document.querySelectorAll('#habits-grid > .card')];
    return { hauteurs: [...new Set(cs.map(c => Math.round(c.getBoundingClientRect().height)))], n: cs.length,
             boutonADroite: (() => { const c = cs[0]; const b = c.querySelector('.card-actions').getBoundingClientRect(), s = c.querySelector('.streak-display').getBoundingClientRect(); return b.left > s.right; })() };
  });
  ok(h.hauteurs.length === 1 && h.hauteurs[0] < 170, 'sur téléphone, toutes les cartes font la même hauteur compacte (' + h.hauteurs.join(',') + ' px)');
  ok(h.boutonADroite, 'le bouton « fait » occupe la colonne de droite, à côté de la série');
  await tel.ctx.close();
}

console.log('\n== 284) Raccourcis P, C, H ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI_SOIR);
  const presse = async k => { await page.frameLocator('#f').locator('body').press(k); await page.waitForTimeout(220); };
  const avant = await fr.evaluate(() => document.getElementById('dash-check-count').textContent);
  await presse('h');
  const apres = await fr.evaluate(() => document.getElementById('dash-check-count').textContent);
  ok(avant !== apres, 'H coche l\'habitude suivante (' + avant + ' → ' + apres + ')');
  await presse('c');
  ok(await fr.evaluate(() => !document.getElementById('cloture-overlay').hidden), 'C ouvre la clôture');
  await fr.evaluate(() => document.getElementById('cloture-plus-tard').click());
  await page.waitForTimeout(150);
  await presse('p');
  ok(await fr.evaluate(() => [...document.querySelectorAll('.overlay')].some(o => !o.hidden)), 'P lance le Pomodoro (le lanceur s\'ouvre)');
  await ctx.close();
  /* une lettre tapée dans un champ ne déclenche rien */
  const t2 = await ouvrir(MERCREDI_SOIR);
  await t2.fr.evaluate(() => { document.querySelector('.nav-btn[data-page="taches"]').click(); const i = document.getElementById('tk-text'); i.focus(); });
  await t2.page.frameLocator('#f').locator('#tk-text').type('projet');
  await t2.page.waitForTimeout(200);
  ok(await t2.fr.evaluate(() => document.getElementById('tk-text').value) === 'projet', 'les lettres tapées dans un champ restent dans le champ');
  ok(await t2.fr.evaluate(() => document.getElementById('cloture-overlay').hidden), 'et n\'ouvrent pas la clôture');
  await t2.ctx.close();
}

console.log('\n== 285) Clôture express : quatre champs, et jamais le dimanche ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI_SOIR);
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(200);
  ok(await fr.evaluate(() => !!document.getElementById('cl-modes')), 'la clôture propose deux longueurs');
  ok(await fr.evaluate(() => document.querySelector('#cloture-overlay [data-cl-plus]').offsetParent !== null), 'par défaut, la clôture complète');
  await fr.evaluate(() => document.querySelector('[data-cl-mode="court"]').click());
  await page.waitForTimeout(150);
  const champs = await fr.evaluate(() => [...document.querySelectorAll('#cloture-overlay .field-row')].filter(e => e.offsetParent !== null).map(e => (e.querySelector('label') || {}).textContent || ''));
  ok(champs.length === 4, 'en express, quatre champs seulement (' + champs.length + ')');
  ok(/Sommeil/.test(champs[0]) && /Eau/.test(champs[1]) && /Humeur/.test(champs[2]) && /Habitudes/.test(champs[3]), 'sommeil, eau, humeur, habitudes : ' + champs.join(' | ').slice(0, 90));
  ok(await fr.evaluate(() => localStorage.getItem('bc-cloture-mode')) === 'court', 'le choix est mémorisé sur l\'appareil');
  /* et il n'est pas dans la sauvegarde : c'est un réglage d'appareil */
  const dansSauvegarde = await fr.evaluate(() => { try{ return JSON.stringify(window.__bcSauvegarde ? window.__bcSauvegarde() : {}).indexOf('bc-cloture-mode') > -1; }catch(e){ return false; } });
  ok(dansSauvegarde === false, 'le mode de clôture ne part pas dans la sauvegarde');
  await ctx.close();
  const dim = await ouvrir(DIMANCHE_SOIR, { local: {} });
  await dim.fr.evaluate(() => { localStorage.setItem('bc-cloture-mode', 'court'); document.getElementById('bc-cloture').click(); });
  await dim.page.waitForTimeout(200);
  ok(await dim.fr.evaluate(() => document.querySelector('#cloture-overlay [data-cl-plus]').offsetParent !== null), 'le dimanche, la clôture reste complète malgré le réglage');
  ok(await dim.fr.evaluate(() => !document.getElementById('cl-revue').hidden), 'la revue de la semaine est là');
  await dim.ctx.close();
}

console.log('\n== 286) Installation sur l\'écran d\'accueil ==');
{
  const { ctx, fr } = await ouvrir(MERCREDI_MATIN);
  const m = await fr.evaluate(() => ({
    manifeste: (document.querySelector('link[rel="manifest"]') || {}).href || '',
    apple: ((document.querySelector('link[rel="apple-touch-icon"]') || {}).href || '').slice(0, 30),
    standalone: (document.querySelector('meta[name="apple-mobile-web-app-capable"]') || {}).content,
    barre: (document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') || {}).content,
    titre: (document.querySelector('meta[name="apple-mobile-web-app-title"]') || {}).content,
    viewport: (document.querySelector('meta[name="viewport"]') || {}).content
  }));
  const json = JSON.parse(decodeURIComponent(m.manifeste.replace('data:application/manifest+json,', '')));
  ok(json.display === 'standalone' && json.short_name === 'Batcave', 'le manifeste ouvre en application, nom court « Batcave »');
  /* lot 29 : le manifeste porte deux tailles au lieu d'une. 180 px pour l'écran d'accueil,
     48 px pour les endroits où le système veut une petite icône et ne redimensionne pas bien. */
  const tailles = (json.icons || []).map(i => i.sizes).sort().join(' ');
  ok(Array.isArray(json.icons) && json.icons.length === 2 && tailles === '180x180 48x48', 'le manifeste porte les icônes 180×180 et 48×48 (' + tailles + ')');
  ok(m.apple.startsWith('data:image/png;base64,'), 'une icône PNG est embarquée pour iOS');
  ok(m.standalone === 'yes' && m.barre === 'black', 'mode application, barre d\'état opaque');
  ok(/viewport-fit=cover/.test(m.viewport), 'viewport-fit=cover : les marges de sécurité de l\'iPhone deviennent effectives');
  ok(m.titre === 'Batcave', 'le nom sous l\'icône est « Batcave »');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
