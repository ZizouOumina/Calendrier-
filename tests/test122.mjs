/* 17 novembre : le tri des habitudes, tout se coche dans « Ma journée », plus de suivi des cases, le cou du jeudi à la salle.
   Ses mots : « je veux pouvoir cocher dans ma journée, pas besoin de traquer, on va faire un tri dans mes habitudes
   d'abord, puis on va enlever l'onglet habitude […] l'onglet ma journée doit tout afficher correctement » ; puis
   « ok on fait ça, et tu rajoutes un exercice d'entraînement du cou dans le programme d'entraînement le jeudi ».
   Ce test vérifie :
   1. le tri : la revue, la marche, les courses et le cou du jeudi soir sortent -- d'un compte existant comme du cloud ;
   2. « Ma journée » : les habitudes et la routine se cochent, et le restent au rechargement ; un jour passé montre ce
      qui a été coché, un jour à venir la liste ; le vendredi, Dhuhr porte la Jumu'ah ;
   3. l'onglet Habitudes, la console du tableau de bord, la touche H et les cases de la clôture ont disparu ; l'anneau
      extérieur et le plan du jour pointent vers « Ma journée » ;
   4. plus aucun suivi : ni le score, ni la semaine, ni les analyses, ni les objectifs, ni le deen ne comptent les cases ;
   5. le jeudi, la flexion du cou ferme la séance, en trio avec les tractions serviette et le crunch. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();
const RETIREES = ['core-revue', 'core-marche', 'core-courses', 'core-cou-jeudi'];

async function ouvrir(quand, donnees){
  const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(donnees) await ctx.addInitScript(x => { try{ if(!sessionStorage.getItem('__seme')){ Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); sessionStorage.setItem('__seme', '1'); } }catch(e){} }, donnees);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const aller = async (fr, page, p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(250); };
const lire = (fr, k) => fr.evaluate(x => JSON.parse((window.__bcLire || ((c) => localStorage.getItem(c)))(x) || 'null'), k);
async function recharger(page){
  await page.reload({ timeout:20000 }).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  return fr;
}
const JEUDI = '2026-11-26T07:30:00+01:00';   /* 19 novembre : jour 1 au vendredi 20, la salle des le samedi 21 -- le premier jeudi de salle est le 26 (avant : le jeudi 19, jour 1) */

console.log('\n== 1) Le tri : quatre habitudes sortent ==');
{
  const { ctx, fr } = await ouvrir(JEUDI);
  const ids = (await lire(fr, 'batcave-habits')).map(h => h.id);
  ok(!RETIREES.some(i => ids.includes(i)), 'installation neuve : ni la revue, ni la marche, ni les courses, ni le cou (' + ids.length + ' habitudes)');
  ok(['core-fajr', 'core-lumiere', 'core-etirements', 'core-es-conversacion', 'core-douche-froide', 'core-lit', 'core-menage', 'core-creatine'].every(i => ids.includes(i)), 'les autres restent');
  await ctx.close();
}
{
  const vieux = {'batcave-habits': [{id:'core-fajr', label:'Fajr', icon:'🕌'}, {id:'core-revue', label:'Revue de la veille / plan du lendemain', icon:'📝'},
                                    {id:'core-marche', label:'Marche / pas', icon:'🚶'}, {id:'core-courses', label:'Courses faites', icon:'🛒', jour:6},
                                    {id:'core-cou-jeudi', label:'Cou — flexion et extension, 3 × 12-20', icon:'🦴', jours:[4]}, {id:'hab1', label:'Vaisselle', icon:'🍽️'}],
                 'batcave-habitlog': {'core-revue': ['2026-11-25'], 'core-fajr': ['2026-11-25']}};
  const { ctx, page, fr } = await ouvrir(JEUDI, vieux);
  const ids = (await lire(fr, 'batcave-habits')).map(h => h.id);
  ok(!RETIREES.some(i => ids.includes(i)) && ids.includes('core-fajr') && ids.includes('hab1'), 'compte existant : les quatre sont retirées du stockage, ses habitudes à lui restent (' + ids.join(', ') + ')');
  await aller(fr, page, 'journee');
  const vues = await fr.evaluate(() => [...document.querySelectorAll('input[data-mj-hab]')].map(x => x.dataset.mjHab));
  ok(!RETIREES.some(i => vues.includes(i)), 'et « Ma journée » ne les montre pas');
  /* le cloud ramène l'ancienne liste : le filtre repasse à chaque lecture */
  await fr.evaluate(() => { localStorage.setItem('batcave-habits', JSON.stringify([{id:'core-fajr', label:'Fajr', icon:'🕌'}, {id:'core-marche', label:'Marche / pas', icon:'🚶'}])); });
  const fr2 = await recharger(page);
  const apres = (await lire(fr2, 'batcave-habits')).map(h => h.id);
  ok(!apres.includes('core-marche'), 'une liste revenue d\'un autre appareil est nettoyée au démarrage');
  await ctx.close();
}

console.log('\n== 2) « Ma journée » : tout se coche, et le reste ==');
{
  const { ctx, page, fr } = await ouvrir(JEUDI);
  await aller(fr, page, 'journee');
  const r = await fr.evaluate(() => ({
    cases: [...document.querySelectorAll('#mj-cases input[data-mj-hab]')].map(x => x.dataset.mjHab),
    routine: [...document.querySelectorAll('#mj-routine input[data-mj-hab]')].map(x => x.dataset.mjHab),
    titres: [...document.querySelectorAll('#mj-cases h3, #mj-routine h3')].map(x => x.textContent),
    dus: window.__bcHabitsDuJour(4, '2026-11-26').map(h => h.id) }));
  ok(r.titres.join(' | ') === 'Tes habitudes du jour | La routine du jour', 'deux listes : ' + r.titres.join(' | '));
  ok(r.cases.includes('core-fajr') && r.cases.includes('core-lumiere') && r.routine.includes('core-lit') && r.routine.includes('core-creatine'), 'les habitudes et la routine ont leurs cases');
  ok([...r.cases, ...r.routine].sort().join() === [...r.dus].sort().join(), 'exactement ce qui tombe ce jeudi (' + r.dus.length + ')');
  /* tout cocher, une à une */
  for(const id of [...r.cases, ...r.routine]) await fr.evaluate(i => document.querySelector('input[data-mj-hab="' + i + '"]').click(), id);
  await page.waitForTimeout(200);
  const comptes = await fr.evaluate(() => ['mj-cases-compte', 'mj-routine-compte'].map(i => document.getElementById(i).textContent));
  ok(comptes[0] === r.cases.length + ' / ' + r.cases.length && comptes[1] === r.routine.length + ' / ' + r.routine.length, 'les comptes : ' + comptes.join(' · '));
  const leg = await fr.evaluate(() => document.getElementById('leg-hab').textContent);
  ok(leg === 'ma journée ' + r.dus.length + '/' + r.dus.length, 'l\'anneau du tableau de bord suit : « ' + leg + ' »');
  /* puis en décocher une */
  await fr.evaluate(() => document.querySelector('input[data-mj-hab="core-lit"]').click());
  const fr2 = await recharger(page);
  await aller(fr2, page, 'journee');
  const relu = await fr2.evaluate(() => Object.fromEntries([...document.querySelectorAll('input[data-mj-hab]')].map(x => [x.dataset.mjHab, x.checked])));
  ok(relu['core-lit'] === false && relu['core-fajr'] === true && relu['core-creatine'] === true, 'au rechargement : les cochées le restent, la décochée aussi');
  /* la veille et le lendemain */
  const hier = await fr2.evaluate(() => { window.__bcJournee.aller('2026-11-25'); return { cases: document.querySelectorAll('#mj-corps input[data-mj-hab]').length, note: document.getElementById('mj-cases-compte').textContent }; });
  ok(hier.cases === 0 && / cochées$/.test(hier.note), 'un jour passé : pas de case, ce qui a été coché (« ' + hier.note + ' »)');
  const demain = await fr2.evaluate(() => { window.__bcJournee.aller('2026-11-27'); return { cases: document.querySelectorAll('#mj-corps input[data-mj-hab]').length, note: document.getElementById('mj-cases-compte').textContent,
    dhuhr: [...document.querySelectorAll('#mj-cases li')].map(x => x.textContent).filter(t => /Dhuhr/.test(t))[0] }; });
  ok(demain.cases === 0 && /se cochent le jour même/.test(demain.note), 'un jour à venir : la liste, qui se cochera le jour même');
  ok(/Jumu’ah/.test(demain.dhuhr || ''), 'le vendredi, Dhuhr porte la Jumu\'ah : « ' + demain.dhuhr + ' »');
  await ctx.close();
}

console.log('\n== 3) Un seul endroit où cocher ==');
{
  const { ctx, page, fr } = await ouvrir(JEUDI);
  const r = await fr.evaluate(() => ({
    nav: [...document.querySelectorAll('.nav-btn[data-page]')].filter(b => !b.hidden).map(b => b.dataset.page),
    page: !!document.querySelector('.page[data-page="habitudes"]'), console: !!document.getElementById('dash-checklist'),
    sousNav: [...document.querySelectorAll('.page[data-page="coran"] .sous-onglet')].length }));
  ok(!r.nav.includes('habitudes') && !r.page, 'l\'onglet Habitudes est retiré');
  ok(r.nav.includes('coran') && r.sousNav === 0, 'Coran & Duaas prend sa place dans la barre, sans pastilles');
  ok(!r.console, 'la console des habitudes du tableau de bord est retirée');
  const plan = await fr.evaluate(() => [...document.querySelectorAll('#dash-plan [data-ouvrir="journee"]')].length);
  /* le plan du jour pointe vers « Ma journée » (il garde les sept plus urgentes : la ligne peut ne pas s'afficher) */
  const items = await fr.evaluate(() => window.__bcPlanDuJour().map(x => ({ text: x.text, type: x.action && x.action.type })));
  const mj = items.filter(x => x.type === 'journee');
  ok(mj.length === 1 && /^Ma journée : \d+ cases? pas encore cochées?$/.test(mj[0].text), 'le plan du jour dit combien il reste à cocher : « ' + (mj[0] || {}).text + ' »');
  ok(!items.some(x => x.type === 'habits'), 'et ne propose plus de boutons qui cochent');
  ok(plan <= 1, 'au plus un bouton vers « Ma journée »');
  /* la touche H ne coche plus rien */
  const avant = JSON.stringify(await lire(fr, 'batcave-habitlog'));
  await page.keyboard.press('h'); await page.waitForTimeout(200);
  ok(JSON.stringify(await lire(fr, 'batcave-habitlog')) === avant, 'la touche H ne coche plus rien');
  /* la clôture : plus de cases, un rappel de ce qui reste */
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(250);
  const cl = await fr.evaluate(() => ({ cases: !!document.getElementById('cl-habitudes'), rappel: (document.getElementById('cl-journee') || {}).textContent || '' }));
  ok(!cl.cases && /^📋 Pas encore coché dans « Ma journée » : /.test(cl.rappel), 'la clôture ne coche plus rien, elle rappelle ce qui reste : « ' + cl.rappel.slice(0, 70) + '… »');
  const logAvant = JSON.stringify(await lire(fr, 'batcave-habitlog'));
  await fr.evaluate(() => document.getElementById('cloture-valider').click());
  await page.waitForTimeout(400);
  ok(JSON.stringify(await lire(fr, 'batcave-habitlog')) === logAvant, 'clôturer la journée ne coche rien (ni la revue, ni la créatine)');
  await ctx.close();
}

console.log('\n== 4) Plus de suivi des cases ==');
{
  const { ctx, page, fr } = await ouvrir(JEUDI);
  const score = () => fr.evaluate(() => document.getElementById('dash-score-num').textContent + ' ' + document.getElementById('dash-score-detail').textContent);
  const s0 = await score();
  await aller(fr, page, 'journee');
  await fr.evaluate(() => document.querySelector('input[data-mj-hab="core-fajr"]').click());
  await aller(fr, page, 'dashboard');
  const s1 = await score();
  ok(s0 === s1 && /Le score s’allume à la première série cochée à la salle, ou au sommeil noté/.test(s1), 'cocher une case ne touche pas le score du jour (« ' + s1.slice(0, 60) + '… »)');
  await aller(fr, page, 'bilan');
  const b = await fr.evaluate(() => [...document.querySelectorAll('#bilan-grid .bilan-card')].map(x => x.innerText.replace(/\s+/g, ' ')));
  ok(b.length === 8 && !b.some(x => /Habitudes/.test(x)), 'la semaine : huit chiffres, plus « Habitudes tenues »');
  const r = await fr.evaluate(() => ({
    insights: window.__bcInsights().map(x => x.title),
    chiffres: window.__bcChiffresSemaine().map(x => x.label),
    exp: [...document.querySelectorAll('#cl-exp-mesure option, #exp-mesure option')].map(o => o.value),
    cinq: [...document.querySelectorAll('#dash-goals li')].map(x => x.textContent).filter(t => /Deen/.test(t))[0] || null,
    objOpts: [...document.querySelectorAll('#obj-metrique option')].map(o => o.value) }));
  ok(r.insights.length === 7 && !r.insights.includes('Habitude la plus délaissée'), 'sept analyses, plus « Habitude la plus délaissée »');
  ok(r.chiffres.length === 6 && !r.chiffres.includes('Habitudes'), 'la clôture du dimanche : six chiffres, plus les habitudes');
  ok(!r.exp.some(v => ['habitPct', 'waterL', 'kcalPct'].includes(v)), 'l\'expérience de la semaine ne propose plus les cases, l\'eau ni la nutrition');
  if(r.cinq !== null) ok(!/prières \d/.test(r.cinq) && /Coran/.test(r.cinq), 'le deen ne compte plus les prières de la semaine : « ' + r.cinq + ' »');
  ok(!r.objOpts.includes('habitudes_pct') && !r.objOpts.includes('eau_moy'), 'un objectif ne se crée plus sur les cases ni sur l\'eau');
  const objs = await lire(fr, 'batcave-objectifs');
  ok(!(objs && objs.liste || []).some(o => o.metrique === 'habitudes_pct' && o.auto !== false && !o.fixe), 'les objectifs « habitudes tenues » semés sont retirés');
  await ctx.close();
}

console.log('\n== 5) Le jeudi : la flexion du cou ferme la séance ==');
{
  const { ctx, page, fr } = await ouvrir(JEUDI);
  await aller(fr, page, 'sport');
  const r = await fr.evaluate(() => {
    const hl = window.__bcSessionsSport().filter(x => x.type === 'Haut lourd')[0];
    const carte = document.querySelector('.sport-card.today');
    return { noms: hl.exercises.map(e => e.name), trio: !!hl.exercises[10].trio, texte: carte ? carte.innerText : '' };
  });
  ok(/Haut lourd/.test(r.texte) && /0\/11/.test(r.texte), 'la séance du jeudi compte onze exercices');
  ok(/5 · Tractions serviette \(grip kimono\) \+ Crunch à la poulie \+ Flexion du cou, un tour des trois/.test(r.texte), 'la dernière ligne : tractions serviette, crunch, cou — un tour des trois');
  ok(r.noms.length === 11 && r.noms[10] === 'Flexion du cou' && r.trio && r.noms[8] === 'Tractions serviette (grip kimono)' && r.noms[9] === 'Crunch à la poulie', 'la flexion du cou en dernier, en trio : les dix premiers gardent leur place');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
