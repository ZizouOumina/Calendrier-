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
function ok(c, m){ if(c){ console.log('  ok  ' + m); } else { errs++; console.log('  FAIL ' + m); } }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
page.on('console', m => { if(m.type()==='error') console.log('  console.error: ' + m.text()); });

// heure fixe : 10h du matin, jour ouvré
await page.clock.install({ time: new Date('2026-09-02T10:00:00+02:00') });
await page.goto(URL);
const f = page.frameLocator('#f');
await f.locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
ok(!!fr, 'iframe chargée');

const ls = async (k) => await fr.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return localStorage.getItem(k); } }, k);

// fermer le rituel d'ouverture s'il s'affiche
await fr.evaluate(() => { document.querySelectorAll('.overlay:not([hidden])').forEach(o => { const b = o.querySelector('[id$="-close"], .btn'); if(b) b.click(); }); });
await page.waitForTimeout(200);

// aller sur Études
await fr.evaluate(() => { const n = document.querySelector('.nav-btn[data-page="etudes"]'); if(n) n.click(); });
await page.waitForTimeout(200);

console.log('\n== 1) Consolidation journalière (3 blocs Pomodoro -> 1 seule session) ==');
await lancerCours(fr, page, 'Anatomía I');
await page.waitForTimeout(100);
let st = await ls('batcave-timer');
ok(st && st.pomodoro && st.mode==='travail' && st.durationMin===60 && st.cible==='cours', 'bloc 1 lancé (60 min, cible cours)');

for(let bloc=1; bloc<=3; bloc++){
  await page.clock.fastForward('01:00:01');          // fin du bloc de travail
  await page.waitForTimeout(300);
  st = await ls('batcave-timer');
  ok(st && st.mode==='pause', 'bloc ' + bloc + ' terminé -> pause automatique (' + (st?st.durationMin:'?') + ' min)');
  await page.clock.fastForward('00:05:01');          // fin de la pause courte
  await page.waitForTimeout(300);
  st = await ls('batcave-timer');
  if(bloc < 3) ok(st && st.mode==='travail' && st.cycle===bloc, 'pause ' + bloc + ' terminée -> bloc ' + (bloc+1) + ' relancé');
}
const rev = await ls('batcave-revision');
ok(Array.isArray(rev) && rev.length === 1, 'une SEULE entrée de révision après 3 blocs (obtenu: ' + (rev?rev.length:'null') + ')');
ok(rev && rev[0] && rev[0].duree === 180, 'temps cumulé = 180 min (obtenu: ' + (rev&&rev[0]?rev[0].duree:'?') + ')');
ok(rev && rev[0] && rev[0].date === '2026-09-02', 'date locale correcte (' + (rev&&rev[0]?rev[0].date:'?') + ')');
const histTxt = await fr.evaluate(() => {
  document.querySelector('.nav-btn[data-page="etudes"]').click();
  return document.getElementById('rv-jour').innerText;
});
const nBlocs = (histTxt.match(/→/g) || []).length;
ok(nBlocs === 3 && /Anatomía I/.test(histTxt), 'agenda des révisions : 3 blocs individuels avec leur créneau (obtenu: ' + histTxt.replace(/\s+/g,' ').trim().slice(0,70) + ')');

console.log('\n== 2) Mode plein écran ==');
// on est en pause (bloc 3 terminé) -> repartir sur un bloc de travail
st = await ls('batcave-timer');
if(st && st.mode === 'pause'){ await page.clock.fastForward('00:05:01'); await page.waitForTimeout(300); }
st = await ls('batcave-timer');
ok(st && st.mode==='travail', 'nouveau bloc de travail en cours');
let ov = await fr.evaluate(() => document.getElementById('focus-overlay').hidden);
ok(ov === true, 'overlay masqué au départ');
await fr.evaluate(() => document.getElementById('timer-focus').click());
await page.waitForTimeout(150);
let vis = await fr.evaluate(() => { const o = document.getElementById('focus-overlay'); return { hidden:o.hidden, box:o.getBoundingClientRect().height, time:document.getElementById('focus-time').textContent, cible:document.getElementById('focus-cible').textContent, sub:document.getElementById('focus-sub').textContent, fs:Math.round(parseFloat(getComputedStyle(document.getElementById('focus-time')).fontSize)) }; });
ok(vis.hidden === false && vis.box > 400, 'overlay plein écran affiché (h=' + Math.round(vis.box) + 'px)');
ok(/^\d\d:\d\d$/.test(vis.time), 'décompte affiché: ' + vis.time);
ok(vis.cible === 'Cours — Anatomía I', 'cible affichée avec la matière : ' + vis.cible);
ok(vis.fs >= 88, 'chrono géant (' + vis.fs + 'px)');
await page.clock.fastForward('00:01:00');
await page.waitForTimeout(300);
let t2 = await fr.evaluate(() => document.getElementById('focus-time').textContent);
ok(t2 !== vis.time, 'le décompte se met à jour en plein écran (' + vis.time + ' -> ' + t2 + ')');
// pause depuis le plein écran
await fr.evaluate(() => document.getElementById('focus-pause').click());
await page.waitForTimeout(200);
let p = await fr.evaluate(() => ({ lbl:document.getElementById('focus-pause').textContent, paused: !!(JSON.parse(localStorage.getItem('batcave-timer')||'null')||{}).pausedAt }));
ok(p.paused === true && p.lbl.includes('Reprendre'), 'pause depuis le plein écran (' + p.lbl.trim() + ')');
await fr.evaluate(() => document.getElementById('focus-pause').click());
await page.waitForTimeout(200);
ok(!(await ls('batcave-timer')).pausedAt, 'reprise depuis le plein écran');
// Escape
await fr.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})));
await page.waitForTimeout(150);
ok(await fr.evaluate(() => document.getElementById('focus-overlay').hidden) === true, 'Échap quitte le plein écran');
ok(!!(await ls('batcave-timer')), 'la session continue après sortie du plein écran');
// sortie auto en fin de bloc
await fr.evaluate(() => document.getElementById('timer-focus').click());
await page.waitForTimeout(150);
ok(await fr.evaluate(() => document.getElementById('focus-overlay').hidden) === false, 'retour en plein écran');
await page.clock.fastForward('01:00:01');
await page.waitForTimeout(400);
let apres = await fr.evaluate(() => ({ hidden:document.getElementById('focus-overlay').hidden, cible:document.getElementById('focus-cible').textContent, stop:document.getElementById('focus-stop').textContent }));
ok(apres.hidden === false && apres.cible === 'Pause', 'on reste en plein écran et l\'écran passe en Pause');
ok(apres.stop.includes('Passer la pause'), 'le bouton devient "Passer la pause" (' + apres.stop.trim() + ')');
st = await ls('batcave-timer');
ok(st && st.mode === 'pause', 'la pause a démarré');
const rev2 = await ls('batcave-revision');
ok(rev2.length === 1 && rev2[0].duree === 240, 'toujours une seule ligne, 240 min (obtenu: ' + rev2.length + ' / ' + rev2[0].duree + ')');
// "Passer la pause" depuis le plein écran -> enchaîne sur un bloc de travail, sans quitter
await fr.evaluate(() => document.getElementById('focus-stop').click());
await page.waitForTimeout(300);
let ap2 = await fr.evaluate(() => ({ hidden:document.getElementById('focus-overlay').hidden, cible:document.getElementById('focus-cible').textContent, stop:document.getElementById('focus-stop').textContent }));
st = await ls('batcave-timer');
ok(st && st.mode === 'travail', '"Passer la pause" relance un bloc de travail');
ok(ap2.hidden === false && ap2.cible === 'Cours — Anatomía I' && ap2.stop.includes('Terminer'), 'toujours en plein écran, retour sur « ' + ap2.cible + ' » / "Terminer"');
// "Terminer et enregistrer" pendant le travail -> enregistre et sort du plein écran
await page.clock.fastForward('00:30:00'); await page.waitForTimeout(300);
await fr.evaluate(() => document.getElementById('focus-stop').click());
await page.waitForTimeout(300);
ok(await fr.evaluate(() => document.getElementById('focus-overlay').hidden) === true, '"Terminer" ferme le plein écran');
ok(!(await ls('batcave-timer')), 'session arrêtée');
const rev3 = await ls('batcave-revision');
ok(rev3.length === 1 && rev3[0].duree === 270, 'toujours UNE entrée, 240+30 = 270 min (obtenu: ' + rev3.length + ' / ' + rev3[0].duree + ')');

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
