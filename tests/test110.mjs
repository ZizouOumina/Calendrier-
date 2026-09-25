/* Lots 51 et 52 — l'interface d'une application (six entrees, sous-onglets, mode pilote,
   feuilles de saisie, theme pur noir) et la carte du systeme (planete, satellites, fils). */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();
async function ouvrir(quand, seed, vp){
  const ctx = await browser.newContext({ viewport: vp || {width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR', hasTouch: !!(vp && vp.width < 500) });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, typeof x[k] === 'string' && k.indexOf('bc-') === 0 ? x[k] : JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const pageActive = fr => fr.evaluate(() => [...document.querySelectorAll('.page.active')].map(p => p.dataset.page).join(','));
const teteActive = fr => fr.evaluate(() => (document.querySelector('.nav-btn.active') || {dataset:{}}).dataset.page);

console.log('\n== 410) Six entrées, le reste en sous-onglets ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  const r = await fr.evaluate(() => ({
    visibles: [...document.querySelectorAll('.nav-btn[data-page]')].filter(b => !b.hidden).map(b => b.textContent.trim()),
    labels: [...document.querySelectorAll('nav > .nav-label')].filter(l => getComputedStyle(l).display !== 'none').length,
    boutique: [...document.querySelectorAll('.sous-onglet[data-sousnav="business"]')].every(b => b.hidden)
  }));
  ok(r.visibles.join(' · ') === 'Aujourd’hui · Fac · Suivi · Argent · Corps · Table', 'la barre : ' + r.visibles.join(' · '));
  ok(r.labels === 0, 'plus d\'intitulé de section orphelin dans la barre latérale');
  ok(r.boutique, 'sans boutique Shopify, la pastille Boutique reste cachée');
  for(const [bouton, page2, tete, pastilles] of [
    ['sport', 'sport', 'habitudes', 'Habitudes|Sport|Corps & santé'],
    ['calendrier', 'calendrier', 'dashboard', 'Aujourd’hui|Calendrier'],
    ['coran', 'coran', 'bilan', 'La semaine|Objectifs|Coran & Duaas|Système'],
    ['courses', 'courses', 'repas', 'Repas|Meal prep|Courses']
  ]){
    await fr.evaluate(b => document.querySelector('.nav-btn[data-page="' + b + '"]').click(), bouton);
    await page.waitForTimeout(150);
    const p = await pageActive(fr), t = await teteActive(fr);
    const sn = await fr.evaluate(pg => [...document.querySelectorAll('.page[data-page="' + pg + '"] > .sous-nav .sous-onglet')].filter(b => !b.hidden).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join('|'), page2);
    ok(p.split(',').indexOf(page2) > -1 && t === tete && sn.replace('*', '') === pastilles && sn.indexOf(bouton === 'coran' ? 'Coran & Duaas*' : '') > -1,
       bouton + ' : page ' + p + ', entrée « ' + t + ' » allumée, pastilles ' + sn);
  }
  const dir = await fr.evaluate(() => getComputedStyle(document.querySelector('.page.active > .sous-nav')).flexDirection);
  ok(dir === 'row', 'sur grand écran, les pastilles sont en ligne (' + dir + ')');
  /* 2 au clavier : la deuxième entrée visible, Fac */
  await page.keyboard.press('2'); await page.waitForTimeout(150);
  ok((await pageActive(fr)).split(',')[0] === 'etudes', 'la touche 2 ouvre Fac (' + await pageActive(fr) + ')');
  await ctx.close();
}

console.log('\n== 411) Le mode pilote ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  await fr.evaluate(() => document.getElementById('dash-pilote').click());
  await page.waitForTimeout(200);
  const r = await fr.evaluate(() => ({ ouvert: !document.getElementById('pilote-overlay').hidden, heure: document.getElementById('pilote-heure').textContent,
    etat: document.getElementById('pilote-etat').textContent, bloc: document.getElementById('pilote-bloc').textContent, quand: document.getElementById('pilote-quand').textContent,
    suivant: document.getElementById('pilote-suivant').textContent, action: document.getElementById('pilote-action').textContent, barre: document.getElementById('pilote-barre').style.width }));
  ok(r.ouvert && r.heure === '10:00', 'le bouton « Maintenant » ouvre le plein écran, 10:00');
  ok(r.etat === 'En cours' && r.bloc === 'Étudier en avance' && /08:20 → 10:05 · reste 5 min/.test(r.quand), 'en cours : Étudier en avance, 08:20 → 10:05, reste 5 min');
  ok(r.barre === '95%', 'la barre avance avec le bloc (' + r.barre + ')');
  ok(/puis Collation combat à 10:05/.test(r.suivant), 'le suivant : ' + r.suivant);
  ok(r.action === '🍅 Pomodoro — Étudier en avance', 'un bouton, le Pomodoro du bloc : ' + r.action);
  await page.keyboard.press('m'); await page.waitForTimeout(150);
  ok(await fr.evaluate(() => document.getElementById('pilote-overlay').hidden), 'M le referme');
  await page.keyboard.press('m'); await page.waitForTimeout(150);
  ok(await fr.evaluate(() => !document.getElementById('pilote-overlay').hidden), 'M le rouvre');
  await ctx.close();
}
{
  /* 21:15 : temps libre (20:30 est « Clore le cours du jour », un bloc de travail : là le Pomodoro reste le bon bouton) */
  const { ctx, page, fr } = await ouvrir('2026-09-28T21:15:00+02:00');
  await fr.evaluate(() => { const c = document.getElementById('cloture-overlay'); if(c) c.hidden = true; window.__bcPilote.ouvrir(); });
  await page.waitForTimeout(200);
  const a = await fr.evaluate(() => document.getElementById('pilote-action').textContent);
  ok(a === '🌙 Clôturer la journée', 'à 21:15, sans clôture : le bouton propose la clôture (' + a + ')');
  await fr.evaluate(() => document.getElementById('pilote-action').click());
  await page.waitForTimeout(250);
  ok(await fr.evaluate(() => document.getElementById('pilote-overlay').hidden && !document.getElementById('cloture-overlay').hidden), 'et l\'ouvre');
  await ctx.close();
}

console.log('\n== 412) Feuilles de saisie et thème pur noir ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T20:40:00+02:00', {'bc-theme': 'noir'}, {width:390, height:844});
  const r = await fr.evaluate(() => {
    const ov = document.getElementById('cloture-overlay'); ov.hidden = false;
    const p = ov.querySelector('.overlay-panel');
    return { theme: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor,
             align: getComputedStyle(ov).alignItems, radius: getComputedStyle(p).borderTopLeftRadius, poignee: !!p.querySelector('.sheet-poignee'),
             poigneeVisible: getComputedStyle(p.querySelector('.sheet-poignee')).display !== 'none', bouton: document.getElementById('theme-toggle').textContent };
  });
  ok(r.theme === 'noir' && /rgb\(0, 0, 0\)/.test(r.bg), 'thème pur noir : fond ' + r.bg);
  ok(r.bouton === '⚫', 'le bouton de thème le dit : ' + r.bouton);
  ok(r.align === 'flex-end' && r.radius === '18px' && r.poignee && r.poigneeVisible, 'sur iPhone, la clôture monte du bas, coins arrondis en haut, avec sa poignée');
  /* balayage vers le bas : la feuille se ferme */
  const box = await page.frameLocator('#f').locator('#cloture-overlay .overlay-panel').boundingBox();
  const fermee = await fr.evaluate(() => new Promise(res => {
    const p = document.querySelector('#cloture-overlay .overlay-panel'); p.scrollTop = 0;
    const t = (y) => new Touch({identifier:1, target:p, clientX:200, clientY:y});
    p.dispatchEvent(new TouchEvent('touchstart', {bubbles:true, touches:[t(120)], changedTouches:[t(120)]}));
    p.dispatchEvent(new TouchEvent('touchend', {bubbles:true, touches:[], changedTouches:[t(260)]}));
    setTimeout(() => res(document.getElementById('cloture-overlay').hidden), 100);
  }));
  ok(box && fermee, 'un balayage vers le bas ferme la feuille');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  const cycle = await fr.evaluate(() => { const b = document.getElementById('theme-toggle'), out = []; for(let i = 0; i < 4; i++){ b.click(); out.push(localStorage.getItem('bc-theme') || 'auto'); } return out.join(' → '); });
  ok(cycle === 'jour → nuit → noir → auto', 'le bouton de thème fait le tour : ' + cycle);
  await ctx.close();
}

console.log('\n== 420) La carte du système ==');
{
  const seed = {'batcave-journal-2026-09-27': {sommeil:'7', auLit:'7.9', cloture:'21:20', poids:'71.5'}};
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00', seed);
  await fr.evaluate(() => document.querySelector('.sous-onglet[data-sousnav="systeme"]') ? document.querySelector('.nav-btn[data-page="systeme"]').click() : null);
  await page.waitForTimeout(700);
  const r = await fr.evaluate(() => {
    const d = window.__bcSysteme.donnees(), cv = document.getElementById('systeme-canvas');
    const px = cv.getContext('2d').getImageData(Math.round(cv.width / 2), Math.round(cv.height / 2), 1, 1).data;
    return { actif: document.querySelector('.page[data-page="systeme"]').classList.contains('active'), tete: document.querySelector('.nav-btn.active').dataset.page,
      sats: d.satellites.map(s => s.id), sous: d.satellites.map(s => s.sous.length), fils: d.fils.length, centre: d.centre.sous,
      w: cv.width, h: cv.height, noeuds: window.__bcSysteme.noeuds().length, px: [px[0], px[1], px[2]], note: document.getElementById('systeme-note').textContent,
      sommeil: d.satellites[0].sous.map(x => x.val).join(' / ') };
  });
  ok(r.actif && r.tete === 'bilan', 'l\'onglet Système s\'ouvre sous Suivi');
  ok(r.sats.join(',') === 'sommeil,fac,corps,deen,argent,table', 'six satellites : ' + r.sats.join(', '));
  ok(r.sous.join(',') === '3,4,4,2,2,3' && r.fils === 5, 'sous-satellites ' + r.sous.join('/') + ', ' + r.fils + ' fils');
  ok(r.centre === 'en cours : Étudier en avance', 'la planète dit le bloc en cours : ' + r.centre);
  ok(r.w > 300 && r.h > 200 && r.noeuds === 6, 'le canvas est dessiné (' + r.w + '×' + r.h + ', ' + r.noeuds + ' nœuds)');
  ok(r.px[2] > 40, 'la planète est peinte au centre (rgb ' + r.px.join(',') + ')');
  ok(r.sommeil === '7 h / 7 h 54 / 88 % (est.)', 'Sommeil : la nuit dernière, le temps au lit, l\'efficacité (' + r.sommeil + ')');
  ok(/^\d\/6 domaines dans les clous · 5 fils$/.test(r.note), 'la note : ' + r.note);
  /* toucher Fac */
  const pos = await fr.evaluate(() => { const n = window.__bcSysteme.noeuds().filter(x => x.id === 'fac')[0]; const r = document.getElementById('systeme-canvas').getBoundingClientRect(); return {x: r.left + n.x, y: r.top + n.y}; });
  await fr.evaluate(p => { const cv = document.getElementById('systeme-canvas'); cv.dispatchEvent(new MouseEvent('click', {bubbles:true, clientX:p.x, clientY:p.y})); }, pos);
  await page.waitForTimeout(200);
  const det = await fr.evaluate(() => ({ vis: !document.getElementById('systeme-detail').hidden, nom: document.getElementById('sd-nom').textContent, lignes: [...document.querySelectorAll('#sd-sous li')].map(l => l.innerText.replace(/\s+/g, ' ')) }));
  ok(det.vis && det.nom === '📚 Fac' && det.lignes.length === 4 && /Révision · semaine/.test(det.lignes[0]), 'toucher Fac : ' + det.nom + ' — ' + det.lignes.join(' | '));
  await fr.evaluate(() => document.getElementById('sd-ouvrir').click());
  await page.waitForTimeout(200);
  ok((await pageActive(fr)).split(',')[0] === 'etudes', '« Ouvrir » mène à l\'onglet Fac');
  await ctx.close();
}
{
  /* mouvement réduit : la carte est fixe, pas de boucle d'animation */
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, timezoneId:'Europe/Madrid', locale:'fr-FR', reducedMotion:'reduce' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-28T10:00:00+02:00') });
  await page.goto('http://127.0.0.1:8199/batcave.html');
  await page.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelector('.nav-btn[data-page="systeme"]').click(); });
  await page.waitForTimeout(500);
  const a = await page.evaluate(() => window.__bcSysteme.noeuds().map(n => Math.round(n.x) + ',' + Math.round(n.y)).join(' '));
  await page.waitForTimeout(1200);
  const b = await page.evaluate(() => { window.__bcSysteme.dessiner(); return window.__bcSysteme.noeuds().map(n => Math.round(n.x) + ',' + Math.round(n.y)).join(' '); });
  ok(a && a === b, 'mouvement réduit : les satellites ne bougent pas');
  const hauteur = await page.evaluate(() => document.querySelector('.systeme-scene').getBoundingClientRect().height);
  ok(hauteur >= 360, 'sur iPhone, la scène garde sa hauteur (' + Math.round(hauteur) + ' px)');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\nFAILS: ' + errs : '\nALL OK');
process.exit(errs ? 1 : 0);
