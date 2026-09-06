import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { try{ localStorage.setItem('batcave-duree-bloc', '60'); }catch(e){} });   /* sessions d'1 h : la durée est accessoire ici */
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
  await page.waitForTimeout(200);
  return { ctx, page, fr };
}
const ls = async (fr, k) => await fr.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } }, k);
// contenu d'une case de mois, agenda par agenda ('ag' = Batcave, 'rv' = révision, 'pj' = projets)
const caseMois = async (fr, pre, iso) => await fr.evaluate(function(a){
  const c = document.querySelector('#' + a.pre + '-grid [data-agjour="' + a.iso + '"]');
  return c ? c.innerText.replace(/\s+/g,'') : null;
}, {pre, iso});

console.log('\n== 57) Supprimer une ligne agrégée « Projet perso » nettoie tout, partout ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  await fr.evaluate(() => document.getElementById('biz-pomodoro-projet').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { document.getElementById('ask-input').value = 'Boutique Shopify'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);

  // le bloc projet doit apparaître sur l'agenda Batcave ET sur l'agenda Business, mais PAS sur celui des révisions
  ok(/1,0h/.test(await caseMois(fr, 'ag', '2026-09-02')), 'agenda Batcave : le projet est visible');
  ok(/1,0h/.test(await caseMois(fr, 'pj', '2026-09-02')), 'agenda Projets perso : le projet est visible');
  ok(!/1,0h/.test(await caseMois(fr, 'rv', '2026-09-02')), 'agenda Révision : le projet n\'y est PAS (cloisonnement)');

  // suppression depuis l'historique agrégé des projets (Business)
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="business"]').click());
  await page.waitForTimeout(200);
  await fr.evaluate(() => { if(document.getElementById('proj-history').hidden) document.getElementById('proj-history-toggle').click(); });
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.querySelector('#proj-history-list [data-delproj]').click());
  await page.waitForTimeout(300);

  const proj = await ls(fr, 'batcave-projets');
  ok(!proj.length, 'la ligne projet a bien disparu');
  ok(!/1,0h/.test(await caseMois(fr, 'ag', '2026-09-02')), 'agenda Batcave à jour SANS action supplémentaire');
  ok(!/1,0h/.test(await caseMois(fr, 'pj', '2026-09-02')), 'agenda Projets perso à jour SANS action supplémentaire');
  const cell = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="dashboard"]').click(); return document.querySelectorAll('#dash-temps .temps-cell')[1].innerText.replace(/\s+/g,''); });
  ok(/Projetsperso0,0h/.test(cell), 'le tableau de bord aussi : ' + cell);
  const sessions = await ls(fr, 'batcave-sessions');
  ok(!sessions.some(s => s.type === 'projet' && s.date === '2026-09-02'), 'aucun bloc "fantôme" dans le journal');
  await ctx.close();
}

console.log('\n== 58) Suppression partielle : seule la matière/activité visée est purgée ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  // deux matières le même jour
  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { document.getElementById('ask-select').value = 'Anatomía I'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);
  await fr.evaluate(() => document.getElementById('timer-discard').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { document.getElementById('ask-select').value = 'Bioquímica'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);

  const sessionsAvant = await ls(fr, 'batcave-sessions');
  ok(sessionsAvant.length === 2, 'deux blocs journalisés (Anatomía I, Bioquímica)');

  // la vue "jour" de la page Études doit nommer chaque matière révisée
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(200);
  const libelles = await fr.evaluate(() => [...document.querySelectorAll('#rv-jour .jr-b')].map(b => b.innerText.replace(/\s+/g,' ').trim()));
  ok(libelles.length === 2, 'deux blocs dessinés dans la vue jour Révision : ' + libelles.length);
  ok(libelles.some(t => /Anatomía I/.test(t)) && libelles.some(t => /Bioquímica/.test(t)),
     'chaque bloc précise la matière révisée : ' + JSON.stringify(libelles));

  // supprime le bloc Bioquímica directement depuis la vue jour (bouton ×)
  const supprime = await fr.evaluate(() => {
    const b = [...document.querySelectorAll('#rv-jour .jr-b')].find(x => x.textContent.includes('Bioquímica'));
    if(!b) return false;
    b.querySelector('[data-delsession]').click();
    return true;
  });
  ok(supprime, 'bouton × trouvé sur le bloc Bioquímica');
  await page.waitForTimeout(300);
  const rev = await ls(fr, 'batcave-revision');
  ok(rev[0].duree === 60 && rev[0].matieres['Anatomía I'] === 60 && !rev[0].matieres['Bioquímica'],
     'Anatomía I intacte, Bioquímica seule retirée : ' + JSON.stringify(rev[0].matieres));
  const sessionsApres = await ls(fr, 'batcave-sessions');
  ok(sessionsApres.length === 1 && sessionsApres[0].label === 'Anatomía I', 'le journal ne garde que le bloc restant');
  const restants = await fr.evaluate(() => [...document.querySelectorAll('#rv-jour .jr-b')].map(b => b.innerText.replace(/\s+/g,' ').trim()));
  ok(restants.length === 1 && /Anatomía I/.test(restants[0]), 'la vue jour se redessine toute seule : ' + JSON.stringify(restants));
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
