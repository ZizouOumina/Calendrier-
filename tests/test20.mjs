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
  await page.waitForTimeout(200);
  return { ctx, page, fr };
}

console.log('\n== 58) Projets perso : plus de formulaire manuel, Pomodoro uniquement (cohérent avec Cours/Espagnol) ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="business"]').click());
  await page.waitForTimeout(200);

  const absent = await fr.evaluate(() => ({
    projAdd: !document.getElementById('proj-add'),
    projDate: !document.getElementById('proj-date'),
    projNom: !document.getElementById('proj-nom'),
    projDuree: !document.getElementById('proj-duree'),
    projSuggestions: !document.getElementById('proj-suggestions'),
  }));
  ok(absent.projAdd && absent.projDate && absent.projNom && absent.projDuree && absent.projSuggestions,
     'le formulaire manuel (date/nom/durée/bouton) a bien disparu de la page Business');

  const stillThere = await fr.evaluate(() => ({
    stats: !!document.getElementById('proj-stats'),
    byName: !!document.getElementById('proj-by-name'),
    chart: !!document.getElementById('proj-chart'),
    history: !!document.getElementById('proj-history-list'),
  }));
  ok(stillThere.stats && stillThere.byName && stillThere.chart && stillThere.history,
     'les stats, la répartition par projet, le graphique et l\'historique restent bien affichés');

  // Le chemin normal (Pomodoro) fonctionne toujours et alimente cette même page.
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => document.getElementById('biz-pomodoro-projet').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { document.getElementById('ask-input').value = 'Refonte site'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);

  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="business"]').click());
  await page.waitForTimeout(200);
  const byName = await fr.evaluate(() => document.getElementById('proj-by-name').innerText.replace(/\s+/g,''));
  ok(/Refontesite1,0h/.test(byName), 'la session Pomodoro alimente bien "Par projet (total)" sans formulaire manuel : ' + byName);

  const cell = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="dashboard"]').click();
    return document.querySelectorAll('#dash-temps .temps-cell')[1].innerText.replace(/\s+/g,'');
  });
  ok(/1,0h/.test(cell), 'et le tableau de bord aussi : ' + cell);

  await ctx.close();
}

console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
