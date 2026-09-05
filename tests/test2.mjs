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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1180,height:820}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-02T09:00:00+02:00') });
await page.goto(URL);
await page.frameLocator('#f').locator('#biz-pomodoro-projet').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
const ls = async (k) => await fr.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return localStorage.getItem(k); } }, k);
await fr.evaluate(() => { document.querySelectorAll('.overlay:not([hidden])').forEach(o => { const b = o.querySelector('.btn'); if(b) b.click(); }); });
await page.waitForTimeout(200);
await fr.evaluate(() => { const n = document.querySelector('.nav-btn[data-page="etudes"]'); if(n) n.click(); });
await page.waitForTimeout(200);

console.log('\n== 3) Pomodoro Projet perso ==');
await fr.evaluate(() => document.getElementById('biz-pomodoro-projet').click());
await page.waitForTimeout(200);
let ask = await fr.evaluate(() => ({ hidden:document.getElementById('ask-overlay').hidden, msg:document.getElementById('ask-msg').textContent, rowHidden:document.getElementById('ask-input-row').hidden, val:document.getElementById('ask-input').value }));
ok(ask.hidden === false && ask.rowHidden === false, 'la boîte de dialogue demande le nom du projet');
ok(ask.msg.includes('projet perso'), 'message : ' + ask.msg.trim());
ok(!(await ls('batcave-timer')), 'rien ne démarre tant que le nom n\'est pas validé');
// annuler d'abord
await fr.evaluate(() => document.getElementById('ask-cancel').click());
await page.waitForTimeout(150);
ok(await fr.evaluate(() => document.getElementById('ask-overlay').hidden) === true, 'Annuler referme la boîte');
ok(!(await ls('batcave-timer')), 'Annuler ne lance aucune session');
// puis valider
await fr.evaluate(() => document.getElementById('biz-pomodoro-projet').click());
await page.waitForTimeout(150);
await fr.evaluate(() => { const i = document.getElementById('ask-input'); i.value = 'Boutique Shopify'; document.getElementById('ask-ok').click(); });
await page.waitForTimeout(250);
let st = await ls('batcave-timer');
ok(st && st.cible === 'projet' && st.projet === 'Boutique Shopify' && st.durationMin === 60 && st.pomodoro, 'session projet lancée (60 min, "' + (st?st.projet:'?') + '")');
let sub = await fr.evaluate(() => document.getElementById('timer-sub').textContent);
ok(sub.includes('Projet — Boutique Shopify'), 'libellé du minuteur : ' + sub.trim());
await fr.evaluate(() => document.getElementById('timer-focus').click());
await page.waitForTimeout(150);
ok(await fr.evaluate(() => document.getElementById('focus-cible').textContent) === 'Projet — Boutique Shopify', 'plein écran affiche le projet');
await fr.evaluate(() => document.getElementById('focus-exit').click());
await page.waitForTimeout(100);

// bloc 1 terminé -> le temps part dans les projets, pas dans les révisions
await page.clock.fastForward('01:00:01');
await page.waitForTimeout(400);
let proj = await ls('batcave-projets'), rev = await ls('batcave-revision');
ok(Array.isArray(proj) && proj.length === 1 && proj[0].duree === 60 && proj[0].projet === 'Boutique Shopify', '60 min enregistrées côté Projets (' + JSON.stringify(proj) + ')');
ok(!rev || rev.length === 0, 'aucune minute ajoutée aux révisions de cours');
st = await ls('batcave-timer');
ok(st && st.mode === 'pause' && st.cible === 'projet' && st.projet === 'Boutique Shopify', 'la cible projet est conservée pendant la pause');

// pause -> bloc 2, même projet, cumul dans la même ligne
await page.clock.fastForward('00:05:01');
await page.waitForTimeout(300);
st = await ls('batcave-timer');
ok(st && st.mode === 'travail' && st.cible === 'projet' && st.projet === 'Boutique Shopify', 'bloc 2 relancé sur le même projet');
await page.clock.fastForward('01:00:01');
await page.waitForTimeout(400);
proj = await ls('batcave-projets');
ok(proj.length === 1 && proj[0].duree === 120, 'cumul dans UNE seule ligne projet : 120 min (obtenu: ' + proj.length + ' / ' + proj[0].duree + ')');

// arrêt manuel pendant la pause puis nouveau projet
await fr.evaluate(() => document.getElementById('timer-cancel').click());
await page.waitForTimeout(200);
let confirmVisible = await fr.evaluate(() => document.getElementById('ask-overlay').hidden === false);
if(confirmVisible){ await fr.evaluate(() => document.getElementById('ask-ok').click()); await page.waitForTimeout(200); }
ok(!(await ls('batcave-timer')), 'Annuler (avec confirmation in-app) arrête bien la session');

// le nom du dernier projet est pré-rempli
await fr.evaluate(() => document.getElementById('biz-pomodoro-projet').click());
await page.waitForTimeout(200);
let pre = await fr.evaluate(() => document.getElementById('ask-input').value);
ok(pre === 'Boutique Shopify', 'le dernier projet est pré-rempli (' + pre + ')');
await fr.evaluate(() => { const i = document.getElementById('ask-input'); i.value = 'Appli Batcave'; document.getElementById('ask-ok').click(); });
await page.waitForTimeout(200);
await page.clock.fastForward('01:00:01');
await page.waitForTimeout(400);
proj = await ls('batcave-projets');
ok(proj.length === 2, 'un projet différent crée une deuxième ligne (' + proj.map(p=>p.projet+':'+p.duree).join(', ') + ')');

// affichage page Business/Projets
await fr.evaluate(() => { const n = document.querySelector('.nav-btn[data-page="business"]'); if(n) n.click(); });
await page.waitForTimeout(250);
let bt = await fr.evaluate(() => document.body.innerText);
ok(bt.includes('Boutique Shopify') && bt.includes('Appli Batcave'), 'les deux projets apparaissent sur la page Business');

// mélange cours + projet le même jour
await fr.evaluate(() => { const n = document.querySelector('.nav-btn[data-page="etudes"]'); if(n) n.click(); });
await lancerCours(fr, page, 'Anatomía I');
await page.waitForTimeout(200);
await page.clock.fastForward('01:00:01');
await page.waitForTimeout(400);
rev = await ls('batcave-revision'); proj = await ls('batcave-projets');
ok(rev.length === 1 && rev[0].duree === 60, 'cours : 1 ligne de 60 min (' + JSON.stringify(rev) + ')');
ok(proj.length === 2 && proj.reduce((s,p)=>s+p.duree,0) === 180, 'projets : toujours 2 lignes, 180 min au total');

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
