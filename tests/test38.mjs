import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(quand, seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(450);
  return { ctx, page, fr };
}
const aller = async (fr,page,p) => { await fr.evaluate(pg => document.querySelector('.nav-btn[data-page="'+pg+'"]').click(), p); await page.waitForTimeout(350); };

/* jeudi 3 sept 2026 (jour de cours) et samedi 5 sept 2026 */
const JEUDI = '2026-09-03T10:00:00+02:00';
const SAMEDI = '2026-09-05T10:00:00+02:00';

console.log('\n== 76-79) « Courses faites » est retirée (le tri du 17 novembre) : la liste se coche en magasin ==');
{
  for(const quand of [JEUDI, SAMEDI]){
    const { ctx, page, fr } = await ouvrir(quand);
    await aller(fr, page, 'journee');
    const t = await fr.evaluate(() => document.getElementById('mj-corps').innerText);
    ok(!/Courses faites/.test(t), (quand === JEUDI ? 'jeudi' : 'samedi') + ' : pas de « Courses faites » dans « Ma journée »');
    await ctx.close();
  }
}
{
  const { ctx, page, fr } = await ouvrir(SAMEDI);
  await aller(fr, page, 'courses');
  const avant = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  ok(/^0\//.test(avant.trim()), 'au départ la liste est vide : ' + avant);
  /* chaque clic redessine la grille : on re-cible l'élément à chaque tour */
  const total = await fr.evaluate(() => document.querySelectorAll('#courses-grid input[type=checkbox]').length);
  for(let i = 0; i < total; i++){
    await fr.evaluate(() => { const cb = [...document.querySelectorAll('#courses-grid input[type=checkbox]')].find(x => !x.checked); if(cb) cb.click(); });
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(300);
  const apres = await fr.evaluate(() => document.getElementById('courses-summary').textContent);
  const log = await fr.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habitlog')||'{}')['core-courses']||[]);
  ok(new RegExp('^' + total + '/' + total).test(apres.trim()) && log.length === 0, 'la liste complète se coche en magasin (' + apres.trim() + '), sans case derrière');
  await ctx.close();
}

console.log('\n== 80) La journée du samedi réserve 2 h de courses ==');
{
  const { ctx, page, fr } = await ouvrir(SAMEDI);
  await aller(fr, page, 'calendrier');
  const v = await fr.evaluate(() => {
    const jour = [...document.querySelectorAll('.week-cal-day')].find(d => d.classList.contains('today'));
    return {
      type: document.body.innerText.match(/samedi \(courses\)/) ? 'samedi (courses)' : null,
      lignes: [...jour.querySelectorAll('.wc-row')].map(r => r.textContent.trim()),
    };
  });
  const courses = v.lignes.find(l => /Courses de la semaine/.test(l));
  const rangement = v.lignes.find(l => /Rangement des courses/.test(l));
  ok(!!courses && /13:30/.test(courses), 'créneau courses à 13:30 : ' + courses);
  ok(!!rangement && /15:30/.test(rangement), 'soit 2 h pleines, puis rangement à 15:30 : ' + rangement);
  ok(v.type === 'samedi (courses)', 'le planning est étiqueté « samedi (courses) »');

  /* Le point clé : les 2 h 30 libérées sont prises sur la révision ET les projets,
     au même pourcentage, pour que le rapport 7:4 du week-end soit conservé. */
  const min = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const creneaux = v.lignes.map(l => ({ debut: min(l.slice(0,5)), texte: l.slice(5) }))
                           .sort((a,b) => a.debut - b.debut);
  const duree = (motif) => creneaux.reduce((acc, c, i) => {
    if(!motif.test(c.texte)) return acc;
    const fin = i < creneaux.length-1 ? creneaux[i+1].debut : min('22:00');
    return acc + (fin - c.debut);
  }, 0);
  const rev = duree(/Anki|Cartes|Approfondir|Étudier en avance|Question ouverte/), proj = duree(/Projets perso/);
  ok(rev === 300, 'révision samedi = 5 h pile : ' + rev + ' min');
  ok(proj === 120, 'projets perso = 2 h pile (11:20 et 17:00 ; 18:00 est du temps libre) : ' + proj + ' min');
  /* contrainte Pomodoro : chaque bloc de travail doit être un multiple d'une heure */
  const blocs = creneaux.filter(c => /Anki|Cartes|Approfondir|Étudier en avance|Question ouverte|Projets perso/.test(c.texte)).map((c) => {
    const i = creneaux.indexOf(c);
    const fin = i < creneaux.length-1 ? creneaux[i+1].debut : min('22:00');
    return { texte: c.texte.trim(), duree: fin - c.debut };
  });
  ok(blocs.every(b => b.duree % 60 === 0),
     'chaque bloc tombe sur l\'heure pleine : ' + blocs.map(b => b.duree/60 + 'h').join(' + '));
  ok(Math.abs(rev/proj - 5/2) < 0.01, 'ratio révision/projets = 5:2 : ' + (rev/proj).toFixed(3));
  ok(duree(/Courses de la semaine|Rangement des courses/) === 150, 'courses + rangement = 2 h 30');

  const objectif = await fr.evaluate(() => document.getElementById('cal-revision-sub').textContent);
  ok(/4 h 25 visées/.test(objectif), 'l\'objectif affiché correspond à la journée réelle : ' + objectif);
  await ctx.close();
}

console.log('\n== 81) Dimanche garde le planning week-end, sans courses ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-06T10:00:00+02:00');
  await aller(fr, page, 'calendrier');
  const lignes = await fr.evaluate(() => {
    const jour = [...document.querySelectorAll('.week-cal-day')].find(d => d.classList.contains('today'));
    return [...jour.querySelectorAll('.wc-row')].map(r => r.textContent.trim());
  });
  ok(!lignes.some(l => /Courses de la semaine/.test(l)), 'dimanche : aucun créneau courses');
  ok(lignes.some(l => /Projets perso/.test(l)), 'dimanche : le bloc projets du matin est là');
  await ctx.close();
}

console.log('\n== 82) Une seule source : vue semaine = emploi du temps ==');
{
  /* Avant, « Emploi du temps » lisait le planning type et « Vue de la semaine » lisait
     Google en priorité : le planning devenait invisible dès que l'agenda contenait
     quelque chose. Les deux doivent maintenant montrer la même journée. */
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => {
    const ev = (h, titre) => ({ summary: titre,
      start:{dateTime:'2026-09-05T'+h+':00+02:00'}, end:{dateTime:'2026-09-05T'+h.replace(/^(\d\d)/, (m)=>String(+m+1).padStart(2,'0'))+':00+02:00'} });
    const payload = {events: [ ev('10:05', 'Rendez-vous dentiste'), ev('07:20', 'Doublon planning') ]};
    const mcp = {
      callTool(){ return Promise.resolve({payload:{}}); },
      watchTool(server, tool, input, handler){
        Promise.resolve().then(() => {
          if(tool === 'list_events') handler({type:'data', result:{payload}});
          else handler({type:'error', error:{code:'server_not_connected', message:'x'}});
        });
        return () => {};
      },
      invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
    };
    window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(SAMEDI) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#cal-timeline').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(600);
  await aller(fr, page, 'calendrier');
  const v = await fr.evaluate(() => {
    const jour = [...document.querySelectorAll('.week-cal-day')].find(d => d.classList.contains('today'));
    return {
      semaine: [...jour.querySelectorAll('.wc-row')].map(r => r.querySelector('.wc-time').textContent + ' ' + r.querySelector('.wc-label').textContent.trim()),
      emploi: [...document.querySelectorAll('#cal-timeline li')].map(l => l.querySelector('.t-time').textContent + ' ' + l.querySelector('label').textContent.trim()),
      etiquette: document.getElementById('cal-schedule-label').textContent,
      source: document.getElementById('week-cal-source').textContent,
    };
  });
  ok(JSON.stringify(v.semaine) === JSON.stringify(v.emploi),
     'les deux vues affichent exactement la même journée (' + v.emploi.length + ' créneaux)');
  ok(v.emploi.some(l => /Courses de la semaine/.test(l)), 'le planning ajusté est bien là malgré Google');
  ok(v.emploi.some(l => /10:05.*📅.*dentiste/.test(l)), 'un événement Google sans équivalent est ajouté : '
     + (v.emploi.find(l => /dentiste/.test(l)) || '—'));
  ok(!v.emploi.some(l => /Doublon planning/.test(l)),
     'un événement Google à la même heure qu\'un bloc ne le double pas');
  ok(/samedi/.test(v.etiquette), 'l\'emploi du temps annonce le bon jour : ' + v.etiquette);
  ok(/planning type/.test(v.source) && /Google/.test(v.source), 'la source est annoncée : ' + v.source);
  await ctx.close();
}

await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
