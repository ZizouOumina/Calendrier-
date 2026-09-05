import { chromium } from 'playwright';
// le bouton Cours demande maintenant la matière : on répond au dialogue
async function lancerCours(fr, page, matiere){
  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(120);
  await fr.evaluate(m => {
    if(document.getElementById('ask-overlay').hidden) return;
    const sel = document.getElementById('ask-select');
    if(!sel.hidden){
      const dispo = [...sel.options].map(o => o.value);
      sel.value = dispo.indexOf(m) > -1 ? m : dispo[0];
    } else {
      document.getElementById('ask-input').value = m || '';
    }
    document.getElementById('ask-ok').click();
  }, matiere || '');
  await page.waitForTimeout(150);
}

const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const C = 2 * Math.PI * 86;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-02T10:00:00+02:00') });
await page.goto(URL);
await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
const dial = async (p) => await fr.evaluate(p => {
  const r = document.getElementById(p+'-ring'), d = document.getElementById(p+'-dial');
  const box = d.getBoundingClientRect();
  return { off: Number(r.getAttribute('stroke-dashoffset')), cls: d.className,
           w: Math.round(box.width), h: Math.round(box.height),
           tag: document.getElementById(p+'-dial-tag').textContent,
           time: document.getElementById(p === 'timer' ? 'timer-display' : 'focus-time').textContent,
           police: Math.round(parseFloat(getComputedStyle(document.getElementById(p === 'timer' ? 'timer-display' : 'focus-time')).fontSize)),
           couleur: getComputedStyle(r).stroke };
}, p);
await fr.evaluate(() => { document.querySelectorAll('.overlay:not([hidden])').forEach(o => { const b = o.querySelector('.btn'); if(b) b.click(); }); });
await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
await page.waitForTimeout(300);

console.log('\n== 19) Le cadran dans la page ==');
const serie0 = await fr.evaluate(() => document.getElementById('timer-serie').hidden);
ok(serie0 === true, 'aucune série affichée tant qu\'aucun bloc n\'a été fait');
await lancerCours(fr, page, 'Anatomía I');
await page.waitForTimeout(250);
let d = await dial('timer');
ok(d.w > 150 && Math.abs(d.w - d.h) <= 2, 'cadran rond affiché (' + d.w + '×' + d.h + ')');
ok(d.off < 1, 'anneau plein au démarrage (décalage ' + d.off + ')');
ok(d.tag === 'Cours — Anatomía I', 'cible au centre du cadran : ' + d.tag);
ok(/^\d\d:\d\d$/.test(d.time) && d.police >= 34, 'chrono au centre : ' + d.time + ' (' + d.police + 'px)');
ok(await fr.evaluate(() => document.getElementById('timer-serie').hidden) === true, 'toujours rien : le bloc n\'est pas encore terminé');

console.log('\n== 20) L\'anneau se vide au rythme du bloc ==');
await page.clock.fastForward('00:15:00'); await page.waitForTimeout(300);
let d25 = await dial('timer');
ok(Math.abs(d25.off - C*0.25) < 12, 'à 15/60 min : anneau au quart vidé (' + d25.off.toFixed(0) + ' ≈ ' + (C*0.25).toFixed(0) + ')');
await page.clock.fastForward('00:15:00'); await page.waitForTimeout(300);
let d50 = await dial('timer');
ok(Math.abs(d50.off - C*0.5) < 12, 'à 30/60 min : anneau à moitié vidé (' + d50.off.toFixed(0) + ' ≈ ' + (C*0.5).toFixed(0) + ')');
ok(d50.off > d25.off, 'l\'anneau décroît bien dans le temps');

console.log('\n== 21) Pause figée, pause de repos en vert ==');
await fr.evaluate(() => document.getElementById('timer-pause').click());
await page.waitForTimeout(200);
let dp = await dial('timer');
ok(/dial-fige/.test(dp.cls), 'session en pause : anneau figé (' + dp.cls.trim() + ')');
await fr.evaluate(() => document.getElementById('timer-pause').click());
await page.waitForTimeout(200);
ok(!/dial-fige/.test((await dial('timer')).cls), 'reprise : anneau réactivé');
await page.clock.fastForward('00:30:01'); await page.waitForTimeout(400);
let db = await dial('timer');
ok(/dial-pause/.test(db.cls) && db.tag === 'Pause', 'pause de 5 min : cadran vert, étiquette "' + db.tag + '"');
ok(db.off < 40, 'anneau réinitialisé plein pour la pause (' + db.off.toFixed(0) + ')');
const serie1 = await fr.evaluate(() => ({ h: document.getElementById('timer-serie').hidden, t: document.getElementById('timer-serie').textContent }));
ok(serie1.h === false && /Série : 1 jour d'affilée · record 1 j/.test(serie1.t), 'série calculée après le premier bloc : ' + serie1.t.trim());

console.log('\n== 22) Le même cadran en plein écran ==');
await page.clock.fastForward('00:05:01'); await page.waitForTimeout(400);
await fr.evaluate(() => document.getElementById('timer-focus').click());
await page.waitForTimeout(250);
let f = await dial('focus');
ok(f.w > 300 && Math.abs(f.w - f.h) <= 2, 'grand cadran en plein écran (' + f.w + '×' + f.h + ')');
ok(f.police >= 60, 'chrono géant au centre (' + f.police + 'px)');
ok(f.tag === 'Cours — Anatomía I', 'cible affichée : ' + f.tag);
await page.clock.fastForward('00:20:00'); await page.waitForTimeout(300);
let f2 = await dial('focus');
ok(f2.off > f.off + 50, 'le grand anneau se vide aussi (' + f.off.toFixed(0) + ' → ' + f2.off.toFixed(0) + ')');
ok(/Série : 1 jour/.test(await fr.evaluate(() => document.getElementById('focus-serie').textContent)), 'série affichée en plein écran');

console.log('\n== 23) Le cadran marche dans une page neuve ==');
const ctx2 = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const p2 = await ctx2.newPage();
p2.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await p2.clock.install({ time: new Date('2026-09-02T10:00:00+02:00') });
await p2.goto(URL);
await p2.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr2 = p2.frames().find(x => x.url().includes('batcave.html'));
await fr2.evaluate(() => { document.querySelectorAll('.overlay:not([hidden])').forEach(o => { const b = o.querySelector('.btn'); if(b) b.click(); }); });
await fr2.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
await lancerCours(fr2, p2, 'Anatomía I');
await p2.clock.fastForward('00:30:00'); await p2.waitForTimeout(300);
const off2 = await fr2.evaluate(() => Number(document.getElementById('timer-ring').getAttribute('stroke-dashoffset')));
ok(Math.abs(off2 - C*0.5) < 12, 'anneau à moitié vidé sans PomoDial (' + off2.toFixed(0) + ')');
ok(await fr2.evaluate(() => document.getElementById('timer-serie').hidden) === true, 'aucune série tant qu\'aucun bloc n\'est terminé');
await ctx2.close();

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
