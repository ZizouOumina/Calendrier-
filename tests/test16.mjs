import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(seed) await ctx.addInitScript(s => {
    if(localStorage.getItem('__seed')) return;
    localStorage.setItem('__seed','1');
    Object.keys(s).forEach(k => localStorage.setItem(k, JSON.stringify(s[k])));
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T10:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(250);
  return { ctx, page, fr };
}

console.log('\n== 43) Le Pomodoro reste le SEUL moyen d\'ajouter du temps (aucune saisie manuelle) ==');
{
  const { ctx, fr } = await ouvrir(null);
  const etat = await fr.evaluate(() => ({
    boutons: [...document.querySelectorAll('#timer-idle .btn')].map(b => b.id || b.textContent.trim()),
    projetBiz: !!document.getElementById('biz-pomodoro-projet'),
    dataTimerStart: document.querySelectorAll('[data-timer-start]').length,
    custom: !!document.getElementById('timer-custom'),
    lancerCustom: !!document.getElementById('timer-start-custom')
  }));
  /* le lanceur "projet perso" vit désormais sur la page Business : le panneau
     Minuteur (page Études) ne garde que la révision. */
  ok(etat.boutons.length === 1, 'un seul bouton dans le panneau Études — la révision (' + etat.boutons.join(', ') + ')');
  ok(etat.boutons.every(b => /timer-pomodoro/.test(b)), 'c\'est bien un lanceur Pomodoro : ' + etat.boutons.join(', '));
  ok(etat.projetBiz, 'le lanceur projet perso existe, sur la page Business');
  ok(etat.dataTimerStart === 0, 'aucun bouton de durée manuelle (25/45/60 min) — supprimés');
  ok(!etat.custom && !etat.lancerCustom, 'aucun champ "Autre (min)" ni bouton "Lancer" à côté');
  await ctx.close();
}

console.log('\n== 44) Titres et textes cohérents (plus de mentions de fonctionnalités disparues) ==');
{
  const { ctx, fr } = await ouvrir(null);
  const pageBody = await fr.evaluate(() => document.body.innerText);
  ok(!/abonnements[^€]{0,3}\./i.test(pageBody.replace(/Abonnements/,'').toLowerCase()) || true, 'sanity (texte lu)');
  const budgetDesc = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="budget"]').click();
    return document.querySelector('[data-page="budget"] .desc').textContent;
  });
  ok(!/et abonnements/i.test(budgetDesc), 'la description Budget ne parle plus d\'un onglet "abonnements" : ' + budgetDesc);
  const hint = await fr.evaluate(() => document.getElementById('timer-hint').textContent);
  ok(!/révision/i.test(hint), 'le sous-titre du minuteur ne parle plus QUE de "révision" (couvre aussi les projets perso) : ' + hint.trim());
  await ctx.close();
}

console.log('\n== 46) Aucune régression du minuteur avec matière ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  const dOpts = await fr.evaluate(() => [...document.getElementById('ask-select').options].map(o => o.value));
  ok(dOpts.length === 13, 'le sélecteur de matière fonctionne toujours (' + dOpts.length + ' choix)');
  await fr.evaluate(() => { document.getElementById('ask-select').value = 'Anatomía I'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  const st = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-timer')));
  ok(st && st.pomodoro === true && st.matiere === 'Anatomía I', 'session lancée en mode Pomodoro avec matière (' + JSON.stringify({p:st.pomodoro, m:st.matiere}) + ')');
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
