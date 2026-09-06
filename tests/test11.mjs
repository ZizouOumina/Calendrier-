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
  await fr.evaluate(() => { document.querySelectorAll('.overlay:not([hidden])').forEach(o => { const b = o.querySelector('.btn'); if(b) b.click(); }); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(250);
  return { ctx, page, fr };
}

console.log('\n== 24) La série, calculée sur tes données ==');
{
  const { ctx, fr } = await ouvrir({
    'batcave-revision': [
      {id:'r1', date:'2026-09-02', duree:180, matieres:{'Anatomía I':120, 'Bioquímica':60}},
      {id:'r2', date:'2026-09-01', duree:60,  matieres:{'Microbiología':60}}
    ],
    'batcave-projets': [{id:'p1', date:'2026-08-31', projet:'Boutique', duree:45},
                        {id:'p2', date:'2026-08-29', projet:'Boutique', duree:90}],
    'batcave-revision-fusionnee': true
  });
  const t = await fr.evaluate(() => ({
    timer: document.getElementById('timer-serie').textContent,
    dash: document.getElementById('dash-serie').textContent,
    cache: document.getElementById('timer-serie').hidden,
    tuiles: document.getElementById('rev-stats').innerText.replace(/\s+/g,' ')
  }));
  ok(t.cache === false && /Série : 3 jours d'affilée/.test(t.timer), '3 jours d\'affilée (02/09, 01/09, 31/08 en projet perso) : ' + t.timer.trim());
  ok(/record 3 j/.test(t.timer), 'record correct malgré le trou du 30/08');
  ok(/Série : 3 jours/.test(t.dash), 'affichée aussi sur le tableau de bord');
  ok(/🔥 Série 3j · record 3/.test(t.tuiles), 'tuile dans les stats de révision : ' + t.tuiles);
  await ctx.close();
}
{
  // rien aujourd'hui, mais hier oui : la série ne doit pas tomber à zéro avant la fin du jour
  const { ctx, fr } = await ouvrir({
    'batcave-revision': [{id:'r1', date:'2026-09-01', duree:60, matieres:{'Bioquímica':60}}],
    'batcave-revision-fusionnee': true
  });
  const t = await fr.evaluate(() => document.getElementById('timer-serie').textContent);
  ok(/Série : 1 jour d'affilée/.test(t), 'journée pas encore entamée : la série d\'hier tient (' + t.trim() + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir(null);
  ok(await fr.evaluate(() => document.getElementById('timer-serie').hidden) === true, 'aucune donnée : rien ne s\'affiche');
  await ctx.close();
}

console.log('\n== 25) Le calendrier des révisions ==');
{
  const { ctx, page, fr } = await ouvrir({
    'batcave-revision': [
      {id:'r1', date:'2026-09-02', duree:180, matieres:{'Anatomía I':120, 'Bioquímica':60}},
      {id:'r2', date:'2026-09-01', duree:60,  matieres:{'Microbiología':60}}
    ],
    'batcave-projets': [{id:'p1', date:'2026-08-31', projet:'Boutique', duree:45},
                        {id:'p2', date:'2026-08-29', projet:'Boutique', duree:90}],
    'batcave-revision-fusionnee': true
  });
  const g = await fr.evaluate(() => {
    const cases = [...document.querySelectorAll('#rv-grid .cal-day')];
    return {
      label: document.getElementById('rv-mois').textContent,
      entete: [...document.querySelectorAll('#rv-head span')].map(s => s.textContent),
      vides: cases.filter(c => c.classList.contains('vide')).length,
      jours: cases.filter(c => !c.classList.contains('vide')).length,
      j1: cases.find(c => c.dataset.agjour === '2026-09-01').innerText.replace(/\s+/g,' '),
      j2: cases.find(c => c.dataset.agjour === '2026-09-02').innerText.replace(/\s+/g,' '),
      j2cls: cases.find(c => c.dataset.agjour === '2026-09-02').className,
      j5: cases.find(c => c.dataset.agjour === '2026-09-05').innerText.trim()
    };
  });
  ok(/septembre 2026/i.test(g.label), 'mois affiché : ' + g.label);
  ok(g.entete.join(' ') === 'Lun Mar Mer Jeu Ven Sam Dim', 'semaine qui commence le lundi : ' + g.entete.join(' '));
  ok(g.jours === 30, 'septembre : 30 cases (obtenu ' + g.jours + ')');
  const decalage = (new Date(2026, 8, 1).getDay() + 6) % 7;
  ok(g.vides === decalage, 'décalage du 1er correct (' + g.vides + ' cases vides)');
  ok(/3,0h/.test(g.j2), 'le 02/09 affiche 3,0h : « ' + g.j2 + ' »');
  ok(/1,0h/.test(g.j1), 'le 01/09 affiche 1,0h');
  ok(/aujourdhui/.test(g.j2cls) && /actif/.test(g.j2cls), 'aujourd\'hui est marqué et sélectionné par défaut');
  ok(/n3/.test(g.j2cls), 'intensité forte pour 3 h (' + g.j2cls.trim() + ')');
  ok(g.j5 === '5', 'un jour sans révision reste vide');

  const det = await fr.evaluate(() => ({
    jour: document.getElementById('rv-jlabel').textContent,
    total: document.getElementById('rv-jtotal').textContent,
    corps: document.getElementById('rv-jour').innerText.replace(/\s+/g,' ')
  }));
  ok(/mercredi 2 septembre/i.test(det.jour), 'jour sélectionné : ' + det.jour.trim());
  ok(/3,0 h/.test(det.total), 'total du jour affiché : ' + det.total);
  ok(/sans détail horaire/.test(det.corps), 'journée sans blocs journalisés : message explicite : ' + det.corps.slice(0,80));

  await fr.evaluate(() => document.querySelector('#rv-grid [data-agjour="2026-09-01"]').click());
  await page.waitForTimeout(200);
  const det1 = await fr.evaluate(() => ({
    jour: document.getElementById('rv-jlabel').textContent,
    total: document.getElementById('rv-jtotal').textContent
  }));
  ok(/mardi 1ᵉʳ septembre/i.test(det1.jour) && /1,0 h/.test(det1.total), 'clic sur le 01/09 : ' + det1.jour.trim() + ' — ' + det1.total);

  await fr.evaluate(() => document.querySelector('#rv-grid [data-agjour="2026-09-05"]').click());
  await page.waitForTimeout(200);
  ok(/Aucune session de révision ce jour-là/.test(await fr.evaluate(() => document.getElementById('rv-jour').innerText)), 'jour vide : message clair');

  console.log('\n== 26) Navigation entre les mois ==');
  await fr.evaluate(() => document.getElementById('rv-prev').click());
  await page.waitForTimeout(200);
  const a = await fr.evaluate(() => ({
    label: document.getElementById('rv-mois').textContent,
    jours: document.querySelectorAll('#rv-grid .cal-day:not(.vide)').length,
    j31: document.querySelector('#rv-grid [data-agjour="2026-08-31"]').innerText.replace(/\s+/g,' '),
    j29: document.querySelector('#rv-grid [data-agjour="2026-08-29"]').innerText.replace(/\s+/g,' '),
    pts29: document.querySelectorAll('[data-agjour="2026-08-29"] .cal-pt').length,
    pts31: document.querySelectorAll('[data-agjour="2026-08-31"] .cal-pt').length
  }));
  ok(/août 2026/i.test(a.label), 'mois précédent : ' + a.label);
  ok(a.jours === 31, 'août : 31 cases');
  /* la grille de la page Études ne montre QUE la révision : les journées de projet perso
     y sont vides, et se retrouvent sur la grille de la page Business */
  ok(a.j31 === '31' && a.j29 === '29', 'les journées de projet perso n\'apparaissent pas côté révision : ' + a.j31 + ' / ' + a.j29);
  ok(a.pts31 === 0 && a.pts29 === 0, 'pas de pastille dans la vue révision (un seul type)');
  const proj = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="business"]').click();
    document.getElementById('pj-prev').click();
    return {
      j31: document.querySelector('#pj-grid [data-agjour="2026-08-31"]').innerText.replace(/\s+/g,' '),
      j29: document.querySelector('#pj-grid [data-agjour="2026-08-29"]').innerText.replace(/\s+/g,' ')
    };
  });
  ok(/0,8h/.test(proj.j31) && /1,5h/.test(proj.j29), 'et elles apparaissent bien sur la grille Business : ' + proj.j31 + ' / ' + proj.j29);
  await fr.evaluate(() => document.querySelector('#pj-grid [data-agjour="2026-08-29"]').click());
  await page.waitForTimeout(200);
  const det29 = await fr.evaluate(() => document.getElementById('pj-jtotal').textContent);
  ok(/1,5 h/.test(det29), 'total d\'un jour de projet côté Business : ' + det29);
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="etudes"]').click();
                            document.getElementById('rv-next').click(); document.getElementById('rv-next').click(); });
  await page.waitForTimeout(200);
  ok(/octobre 2026/i.test(await fr.evaluate(() => document.getElementById('rv-mois').textContent)), 'deux clics « suivant » → octobre');
  await ctx.close();
}

console.log('\n== 27) Le calendrier suit les nouveaux blocs ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(200);
  await fr.evaluate(() => { document.getElementById('ask-select').value = 'Psicología'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(500);
  const apres = await fr.evaluate(() => ({
    case: document.querySelector('#rv-grid [data-agjour="2026-09-02"]').innerText.replace(/\s+/g,' '),
    detail: document.getElementById('rv-jour').innerText.replace(/\s+/g,' '),
    serie: document.getElementById('timer-serie').textContent
  }));
  ok(/1,0h/.test(apres.case), 'la case du jour se met à jour sans recharger : ' + apres.case);
  ok(/🔵 Psicología/.test(apres.detail), 'la matière apparaît sur le bloc : ' + apres.detail.slice(-70));
  ok(/Série : 1 jour/.test(apres.serie), 'et la série démarre : ' + apres.serie.trim());
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
