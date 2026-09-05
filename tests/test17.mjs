import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T08:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  let fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(200);
  return { ctx, page, get fr(){ return page.frames().find(x => x.url().includes('batcave.html')); } };
}
// avance l'horloge SANS laisser le setInterval de la page tourner (simulateur d'onglet
// en arrière-plan / fermé) en passant par un rechargement complet.
async function ecouleSansTic(page, minutes){
  const t = await page.evaluate(() => Date.now());
  await page.clock.setSystemTime(new Date(t + minutes*60000 + 5000));
  await page.reload();
  await page.frameLocator('#f').locator('#timer-idle,#timer-done,#timer-running').first().waitFor({ state:'attached', timeout:15000 });
  await page.waitForTimeout(200);
}
const ls = async (fr, k) => await fr.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } }, k);

console.log('\n== 47) Un bloc de travail expiré hors ligne : la pause repart quand même ==');
{
  const { ctx, page } = await ouvrir();
  let fr = () => page.frames().find(x => x.url().includes('batcave.html'));
  await fr().evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr().evaluate(() => { document.getElementById('ask-select').value = 'Bioquímica'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await ecouleSansTic(page, 60);
  const confirm = await fr().evaluate(() => ({ msg: document.getElementById('timer-done-msg').textContent, bouton: document.getElementById('timer-save').textContent }));
  ok(/60 min terminée/.test(confirm.msg), 'écran de confirmation après retour : ' + confirm.msg.trim());
  await fr().evaluate(() => document.getElementById('timer-save').click());
  await page.waitForTimeout(300);
  let st = await ls(fr(), 'batcave-timer');
  ok(st && st.mode === 'pause' && st.durationMin === 5 && st.matiere === 'Bioquímica',
     'la pause de 5 min démarre automatiquement, matière conservée : ' + JSON.stringify({mode:st&&st.mode, min:st&&st.durationMin, matiere:st&&st.matiere}));
  const rev = await ls(fr(), 'batcave-revision');
  ok(rev.length === 1 && rev[0].duree === 60 && rev[0].matieres['Bioquímica'] === 60, 'les 60 min sont bien enregistrées une seule fois');
  await ctx.close();
}

console.log('\n== 48) Une pause expirée hors ligne : le bloc suivant repart SANS redemander la matière ==');
{
  const { ctx, page } = await ouvrir();
  let fr = () => page.frames().find(x => x.url().includes('batcave.html'));
  await fr().evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr().evaluate(() => { document.getElementById('ask-select').value = 'Microbiología'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await ecouleSansTic(page, 60);
  await fr().evaluate(() => document.getElementById('timer-save').click());   // confirme le travail -> pause démarre
  await page.waitForTimeout(200);
  await ecouleSansTic(page, 5);   // la pause elle-même expire hors ligne
  const confirmPause = await fr().evaluate(() => ({ msg: document.getElementById('timer-done-msg').textContent, bouton: document.getElementById('timer-save').textContent }));
  ok(/Pause terminée/.test(confirmPause.msg) && /Nouveau bloc/.test(confirmPause.bouton), 'écran "pause terminée" : ' + confirmPause.msg.trim() + ' / ' + confirmPause.bouton.trim());
  const dialogAvant = await fr().evaluate(() => document.getElementById('ask-overlay').hidden);
  ok(dialogAvant === true, 'aucune boîte de dialogue ouverte avant le clic');
  await fr().evaluate(() => document.getElementById('timer-save').click());
  await page.waitForTimeout(250);
  const dialogApres = await fr().evaluate(() => document.getElementById('ask-overlay').hidden);
  ok(dialogApres === true, '"Nouveau bloc" NE redemande PAS la matière (aucune boîte ouverte)');
  const st = await ls(fr(), 'batcave-timer');
  ok(st && st.mode === 'travail' && st.matiere === 'Microbiología' && st.cycle === 1,
     'bloc 2 relancé automatiquement, même matière : ' + JSON.stringify({mode:st&&st.mode, matiere:st&&st.matiere, cycle:st&&st.cycle}));
  await ctx.close();
}

console.log('\n== 49) Trois cycles complets, chacun confirmé après coupure : aucun doublon ==');
{
  const { ctx, page } = await ouvrir();
  let fr = () => page.frames().find(x => x.url().includes('batcave.html'));
  await fr().evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr().evaluate(() => { document.getElementById('ask-select').value = 'Epidemiología'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  for(let i=0;i<3;i++){
    await ecouleSansTic(page, 60);
    await fr().evaluate(() => document.getElementById('timer-save').click());   // travail -> pause
    await page.waitForTimeout(150);
    await ecouleSansTic(page, 5);
    await fr().evaluate(() => document.getElementById('timer-save').click());   // pause -> bloc suivant
    await page.waitForTimeout(150);
  }
  const rev = await ls(fr(), 'batcave-revision');
  ok(rev.length === 1 && rev[0].duree === 180, 'trois blocs de 60 min = 180 min, en UNE ligne (obtenu : ' + (rev[0]&&rev[0].duree) + ')');
  const sessions = await ls(fr(), 'batcave-sessions');
  ok(sessions.filter(s => s.date === '2026-09-02').length === 3, 'trois sessions individuelles journalisées (obtenu : ' + sessions.length + ')');
  const st = await ls(fr(), 'batcave-timer');
  ok(st && st.mode === 'travail' && st.cycle === 3, 'quatrième bloc en cours, cycle 3 : ' + JSON.stringify({mode:st&&st.mode, cycle:st&&st.cycle}));
  await ctx.close();
}

console.log('\n== 50) "Ignorer" un bloc de travail expiré : aucune pause ne démarre (choix délibéré) ==');
{
  const { ctx, page } = await ouvrir();
  let fr = () => page.frames().find(x => x.url().includes('batcave.html'));
  await fr().evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr().evaluate(() => { document.getElementById('ask-select').value = 'Anatomía II'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await ecouleSansTic(page, 60);
  await fr().evaluate(() => document.getElementById('timer-discard').click());
  await page.waitForTimeout(200);
  const st = await ls(fr(), 'batcave-timer');
  ok(!st, '"Ignorer" ramène bien à l\'état inactif, sans relancer de pause');
  const rev = await ls(fr(), 'batcave-revision');
  ok(!rev || !rev.length, 'et rien n\'est enregistré (choix voulu par "Ignorer")');
  await ctx.close();
}

console.log('\n== 51) Même correctif pour un cycle "Projet perso" ==');
{
  const { ctx, page } = await ouvrir();
  let fr = () => page.frames().find(x => x.url().includes('batcave.html'));
  await fr().evaluate(() => document.getElementById('biz-pomodoro-projet').click());
  await page.waitForTimeout(150);
  await fr().evaluate(() => { document.getElementById('ask-input').value = 'Boutique Shopify'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await ecouleSansTic(page, 60);
  await fr().evaluate(() => document.getElementById('timer-save').click());
  await page.waitForTimeout(300);
  const st = await ls(fr(), 'batcave-timer');
  ok(st && st.mode === 'pause' && st.cible === 'projet' && st.projet === 'Boutique Shopify', 'pause démarrée, projet conservé : ' + JSON.stringify({mode:st&&st.mode, projet:st&&st.projet}));
  const proj = await ls(fr(), 'batcave-projets');
  ok(proj.length === 1 && proj[0].duree === 60, '60 min enregistrées côté Projets perso');
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
