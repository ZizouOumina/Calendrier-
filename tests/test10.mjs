import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { try{ localStorage.setItem('batcave-duree-bloc', '60'); }catch(e){} });   /* sessions d'1 h : la durée est accessoire ici */
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-02T08:00:00+02:00') });
await page.goto(URL);
await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
const ls = async (k) => await fr.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } }, k);
const dlg = async () => await fr.evaluate(() => ({
  ouvert: !document.getElementById('ask-overlay').hidden,
  msg: document.getElementById('ask-msg').textContent,
  val: document.getElementById('ask-input').value,
  inputVisible: !document.getElementById('ask-input').hidden,
  selVisible: !document.getElementById('ask-select').hidden,
  options: [...document.getElementById('ask-select').options].map(o => o.value),
  suggestions: [...document.getElementById('ask-list').options].map(o => o.value)
}));
const repondre = async (v) => { await fr.evaluate(x => {
  const sel = document.getElementById('ask-select');
  if(!sel.hidden) sel.value = x; else document.getElementById('ask-input').value = x;
  document.getElementById('ask-ok').click();
}, v); await page.waitForTimeout(200); };
await fr.evaluate(() => { document.querySelectorAll('.overlay:not([hidden])').forEach(o => { const b = o.querySelector('.btn'); if(b) b.click(); }); });
await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
await page.waitForTimeout(200);

console.log('\n== 33) Le choix de la matière au lancement ==');
await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
await page.waitForTimeout(200);
let d = await dlg();
ok(d.ouvert && d.selVisible && !d.inputVisible, 'menu déroulant proposé (pas un champ libre)');
ok(/Matière révisée/i.test(d.msg), 'question : ' + d.msg.trim());
ok(d.options.length === 13, '11 matières + « Sans préciser » + « Autre matière… » = ' + d.options.length + ' choix');
ok(d.options.indexOf('Anatomía I') === 0 && d.options.indexOf('Psicología') === 10, 'tes matières dans l\'ordre de la maquette');
ok(d.options[11] === 'Sans préciser' && d.options[12] === 'Autre matière…', 'échappatoires en fin de liste');
const libelles = await fr.evaluate(() => [...document.getElementById('ask-select').options].map(o => o.textContent));
ok(libelles[0] === 'ANATOMÍA Y FISIOLOGÍA DEL CUERPO HUMANO I', 'intitulé complet affiché : ' + libelles[0]);
ok(libelles[5].indexOf('DOCUMENTACIÓN') === 0, 'les intitulés longs passent aussi : ' + libelles[5].slice(0, 40) + '…');
await repondre('Anatomía I');
let st = await ls('batcave-timer');
ok(st && st.cible === 'cours' && st.matiere === 'Anatomía I', 'bloc lancé sur « ' + (st ? st.matiere : '?') + ' » (nom court stocké)');
ok((await fr.evaluate(() => document.getElementById('timer-sub').textContent)).includes('Cours — Anatomía I'), 'libellé du minuteur porte la matière');
ok((await fr.evaluate(() => document.getElementById('timer-dial-tag').textContent)) === 'Cours — Anatomía I', 'matière au centre du cadran');

console.log('\n== 34) Deux matières le même jour : une ligne, deux parts ==');
await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);
await page.clock.fastForward('00:05:01'); await page.waitForTimeout(400);
await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);
await fr.evaluate(() => document.getElementById('timer-discard').click());
await page.waitForTimeout(200);
await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
await page.waitForTimeout(200);
d = await dlg();
const presel = await fr.evaluate(() => document.getElementById('ask-select').value);
ok(presel === 'Anatomía I', 'la dernière matière est présélectionnée : ' + presel);
await repondre('Bioquímica');
await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);
let rev = await ls('batcave-revision');
ok(rev.length === 1, 'toujours UNE seule ligne pour la journée');
ok(rev[0].duree === 180, 'cumul du jour : 180 min');
ok(rev[0].matieres && rev[0].matieres['Anatomía I'] === 120 && rev[0].matieres['Bioquímica'] === 60,
   'répartition : ' + JSON.stringify(rev[0].matieres));

console.log('\n== 35) La répartition s\'affiche ==');
const rep = await fr.evaluate(() => ({ j7: document.getElementById('rev-matieres-7').innerText,
                                        j30: document.getElementById('rev-matieres-30').innerText,
                                        hist: (document.querySelector('.nav-btn[data-page="etudes"]').click(), document.getElementById('rv-jour').innerText) }));
ok(/Anatomía I/.test(rep.j7) && /2,0h · 67%/.test(rep.j7.replace(/\s+/g,' ')), '7 jours : ' + rep.j7.replace(/\n/g,' | '));
ok(/Bioquímica/.test(rep.j7) && /1,0h · 33%/.test(rep.j7.replace(/\s+/g,' ')), 'pourcentages corrects');
ok(/Anatomía I/.test(rep.j30) && /Bioquímica/.test(rep.j30), '30 jours : ' + rep.j30.replace(/\n/g,' | '));
const blocsHist = (rep.hist.match(/→/g) || []).length;
ok(blocsHist === 3 && /Anatomía I/.test(rep.hist) && /Bioquímica/.test(rep.hist),
   'historique : un bloc par session, matière comprise (' + blocsHist + ' blocs) — ' + rep.hist.replace(/\s+/g,' ').trim().slice(0,65));

console.log('\n== 36) « Sans préciser » et « Autre matière… » ==');
await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
await page.waitForTimeout(200);
await repondre('Sans préciser');
await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);
rev = await ls('batcave-revision');
ok(rev[0].duree === 240 && !rev[0].matieres['Sans préciser'] && !rev[0].matieres[''], '« Sans préciser » ne crée aucune fausse matière');
const j7 = await fr.evaluate(() => document.getElementById('rev-matieres-7').innerText);
ok(/Sans matière précisée/.test(j7) && /1,0h/.test(j7), 'part non renseignée isolée : ' + j7.replace(/\n/g,' | '));
await fr.evaluate(() => document.getElementById('timer-discard').click());
await page.waitForTimeout(150);
await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
await page.waitForTimeout(200);
await repondre('Autre matière…');
await page.waitForTimeout(250);
const libre = await dlg();
ok(libre.ouvert && libre.inputVisible && !libre.selVisible, '« Autre matière… » ouvre bien un champ libre');
await repondre('Stage hôpital');
await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);
rev = await ls('batcave-revision');
ok(rev[0].matieres['Stage hôpital'] === 60, 'matière libre enregistrée : Stage hôpital');
await fr.evaluate(() => document.getElementById('timer-discard').click());
await page.waitForTimeout(150);
await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
await page.waitForTimeout(200);
const apresLibre = await dlg();
ok(apresLibre.options.indexOf('Stage hôpital') > -1, 'la matière libre rejoint le menu : ' + apresLibre.options.length + ' choix');
await fr.evaluate(() => document.getElementById('ask-cancel').click());
await page.waitForTimeout(200);
ok(!(await ls('batcave-timer')), 'annuler le choix ne lance aucun bloc');

await browser.close();
process.exit(errs ? 1 : 0);
