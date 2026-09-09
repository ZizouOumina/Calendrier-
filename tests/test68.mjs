/* Lot 20 : cibles calculées depuis la grille (R21, R26), vacances et jour exclu (R1),
   habitudes acquises et revue automatique (R20), rythme modifiable (R23), rappels et
   clôture Pomodoro (R28), histoire des priorités (R4), clôture de saison (R18),
   sauvegardes chiffrées et exercice de restauration (R15), Notion (R6), douze onglets (R11). */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, extra){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(extra) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, extra);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r && !document.getElementById('opening-ritual-overlay').hidden) r.click(); });
  await page.waitForTimeout(350);
  return { ctx, page, fr };
}
const local = (fr, k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);

console.log('\n== 264) Les cibles sortent de la grille, phase par phase ==');
{
  const { ctx, fr } = await ouvrir('2026-09-15T09:00:00+02:00');
  const p = await fr.evaluate(() => ({
    s14: window.__bcPrevu('2026-09-14'), s19oct: window.__bcPrevu('2026-10-19'), s1dec: window.__bcPrevu('2026-12-01')
  }));
  ok(p.s14.proj === 0 && p.s14.es === 160, 'phase 1 : aucun projet perso prévu, 160 min d\'espagnol (' + JSON.stringify(p.s14) + ')');
  ok(p.s19oct.proj === 55 && p.s19oct.es === 105, 'phase 2 : Projets perso 1 revient (55 min), espagnol 105 min');
  ok(p.s1dec.proj === 105 && p.s1dec.es === 55, 'phase 3 : un seul bloc Español, le reste aux projets');
  const o = await fr.evaluate(() => { const l = {}; window.__bcObjectifs().forEach(x => l[x.id] = {c:x.cible, a:x.auto}); return l; });
  /* Septembre ne compte qu'à partir du 14, et cette part du mois est entièrement en
     phase 1 : aucun bloc Projets perso, donc cible zéro. Octobre en a un peu (la phase 2
     commence le 19), décembre beaucoup plus (phase 3). */
  ok(o['M2026-09:projets_h'].c === 0 && o['M2026-10:projets_h'].c > 0 && o['M2026-10:projets_h'].c < o['M2026-12:projets_h'].c, 'la cible « Projets perso » suit les phases : sept. 0 h (phase 1) · oct. ' + o['M2026-10:projets_h'].c + ' h < déc. ' + o['M2026-12:projets_h'].c + ' h');
  ok(o['T1:espagnol_h'].a === true && o['T1:revision_h'].a === true, 'ces cibles sont marquées « auto » : elles suivront tout changement de grille');
  await ctx.close();
}

console.log('\n== 265) Un jour de TP et les partiels ne créent aucun retard ==');
{
  const TP = {'batcave-journees': {'2026-09-24': {type:'tp', label:'Anatomía I', debut:'11:00', fin:'13:00', trajet:30}}};
  const { ctx, fr } = await ouvrir('2026-09-15T09:00:00+02:00');
  const sans = await fr.evaluate(() => window.__bcCibleGrille('revision_h', '2026-09-21', '2026-09-27'));
  await ctx.close();
  const b = await ouvrir('2026-09-15T09:00:00+02:00', TP);
  const avec = await b.fr.evaluate(() => window.__bcCibleGrille('revision_h', '2026-09-21', '2026-09-27'));
  ok(avec < sans, 'la semaine du TP demande moins de révision : ' + avec + ' h au lieu de ' + sans + ' h');
  const prevuTP = await b.fr.evaluate(() => window.__bcPrevu('2026-09-24'));
  ok(prevuTP.rev < 265, 'le jour du TP, la grille prévoit moins de révision (' + prevuTP.rev + ' min)');
  await b.ctx.close();
  /* partiels : les blocs Projets perso deviennent de la révision ciblée → rien à faire côté projets */
  const c = await ouvrir('2027-01-15T09:00:00+01:00', {'batcave-examens': {'Anatomía I':'2027-01-20'}});
  const pj = await c.fr.evaluate(() => window.__bcPrevu('2027-01-15'));
  ok(pj.proj === 0, 'en mode partiels, aucun projet perso n\'est prévu : pas de retard possible (' + JSON.stringify(pj) + ')');
  await c.ctx.close();
}

console.log('\n== 266) Vacances et « aujourd\'hui ne compte pas » ==');
{
  const { ctx, page, fr } = await ouvrir('2026-12-24T10:00:00+01:00', {'batcave-vacances': [{id:'v1', debut:'2026-12-20', fin:'2026-12-31', label:'Noël'}]});
  const g = await fr.evaluate(() => window.__bcGrille('weekday', '2026-12-24').map(b => b[0] + ' ' + b[1]));
  ok(!g.some(x => /Anki|Annales|Español|Projets/.test(x)) && g.filter(x => /Temps libre/.test(x)).length >= 5, 'pendant les vacances, les blocs de travail deviennent du temps libre');
  const prevu = await fr.evaluate(() => window.__bcPrevu('2026-12-24'));
  ok(prevu.rev === 0 && prevu.proj === 0 && prevu.es === 0, 'la grille ne prévoit plus rien : aucune cible, aucun retard');
  const lab = await fr.evaluate(() => document.getElementById('cal-schedule-label').textContent);
  ok(/Vacances · Noël/.test(lab), 'l\'emploi du temps le dit : ' + lab);
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="calendrier"]').click(); document.getElementById('vac-exclu').click(); });
  await page.waitForTimeout(300);
  ok((await local(fr, 'batcave-jours-exclus') || []).indexOf('2026-12-24') > -1, '« Aujourd\'hui ne compte pas » : la journée est enregistrée comme exclue');
  const ex = await fr.evaluate(() => ({ prevu: window.__bcPrevu('2026-12-24'), exclu: window.__bcJourExclu('2026-12-24'), libelle: document.getElementById('cal-schedule-label').textContent }));
  ok(ex.exclu && /ne compte pas/.test(ex.libelle), 'la journée est marquée dans l\'emploi du temps : ' + ex.libelle.slice(-30));
  await ctx.close();
}

console.log('\n== 267) Habitudes : acquises comptées mais rangées, revue cochée à la clôture ==');
{
  const log = {}; const j = [];
  for(let i = 0; i < 60; i++){ const d = new Date(Date.UTC(2026,10,30) - i*86400000); j.push(d.toISOString().slice(0,10)); }
  log['core-lit'] = j.slice();                 /* 60 jours d'affilée → acquise */
  log['core-marche'] = j.filter((x, i) => i % 3 !== 0);   /* ~66 % → pas acquise */
  const { ctx, page, fr } = await ouvrir('2026-11-30T20:40:00+01:00', {'batcave-habitlog': log});
  const a = await fr.evaluate(() => ({ acquises: window.__bcAcquises().map(h => h.id),
                                       liste: [...document.querySelectorAll('#dash-checklist li')].map(l => l.innerText),
                                       cochee: (JSON.parse(localStorage.getItem('batcave-habitlog') || '{}')['core-lit'] || []).indexOf('2026-11-30') > -1 }));
  ok(a.acquises.indexOf('core-lit') > -1 && a.acquises.indexOf('core-marche') < 0, '« Lit fait » est acquise, « Marche » non (' + a.acquises.join(', ') + ')');
  ok(!a.liste.some(x => /Lit fait/.test(x)), 'elle ne prend plus de place dans la check-list du jour');
  ok(a.cochee, 'elle est cochée d\'elle-même : elle continue de compter');
  const acq = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="habitudes"]').click(); const p = document.getElementById('habits-acquises');
    return {visible: !p.hidden, txt: p.innerText.replace(/\s+/g, ' '), grille: document.getElementById('habits-grid').innerText}; });
  ok(acq.visible && /Lit fait/.test(acq.txt) && !/Lit fait/.test(acq.grille), 'le bloc « Habitudes acquises » la montre, la grille des habitudes ne la répète pas');
  await fr.evaluate(() => document.querySelector('[data-raterhab="core-lit"]').click());
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => ({ acquise: window.__bcAcquise(window.__bcHabits ? null : null) , liste: [...document.querySelectorAll('#dash-checklist li')].map(l => l.innerText).join(' ') }));
  ok(/Lit fait/.test(apres.liste), '« Je l\'ai ratée » la remet dans la liste du jour');
  /* clôture : la revue de la veille se coche toute seule */
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="dashboard"]').click(); window.__bcOuvrirCloture ? window.__bcOuvrirCloture() : document.getElementById('bc-cloture').click(); });
  await page.waitForTimeout(300);
  const ouverte = await fr.evaluate(() => !document.getElementById('cloture-overlay').hidden);
  if(ouverte){
    await fr.evaluate(() => document.getElementById('cloture-valider').click());
    await page.waitForTimeout(300);
    const revue = await local(fr, 'batcave-habitlog');
    ok((revue['core-revue'] || []).indexOf('2026-11-30') > -1, 'clôturer la journée coche « Revue de la veille / plan du lendemain »');
  } else ok(false, 'la clôture ne s\'est pas ouverte');
  await ctx.close();
}

console.log('\n== 268) Rythme d\'une habitude, modifiable sans l\'archiver ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-15T09:00:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="habitudes"]').click());
  await page.waitForTimeout(200);
  const avant = await fr.evaluate(() => window.__bcHabitJours({jours:null, id:'core-marche'}));
  await fr.evaluate(() => { const s = document.querySelector('[data-hab-rythme="core-marche"]'); s.value = '1,3,5'; s.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(300);
  const h = (await local(fr, 'batcave-habits')).find(x => x.id === 'core-marche');
  ok(h && Array.isArray(h.jours) && h.jours.join(',') === '1,3,5', 'la marche passe à lundi · mercredi · vendredi (' + JSON.stringify(h.jours) + ')');
  ok(!h.archived, 'l\'habitude n\'a pas été archivée ni recréée : c\'est la même, avec son historique');
  const affiche = await fr.evaluate(() => document.querySelector('[data-hab-rythme="core-marche"]').value);
  ok(affiche === '1,3,5', 'la carte affiche le nouveau rythme');
  await ctx.close();
}

console.log('\n== 269) Pomodoro : le rappel dit quoi lancer, la clôture compte les blocs ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-15T20:35:00+02:00');
  const r = await fr.evaluate(() => window.__bcRappels('2026-09-15').filter(b => /Anki 1|Annales/.test(b.titre)).map(b => ({t:b.titre, d:b.description})));
  ok(r.length >= 2 && r.every(x => /^Lance le Pomodoro « /.test(x.d)), 'chaque bloc de travail dit « Lance le Pomodoro « … » » : ' + (r[0] && r[0].d.slice(0, 45)));
  const coucher = await fr.evaluate(() => window.__bcRappels('2026-09-15').filter(b => /Coucher/.test(b.titre))[0]);
  ok(!/Lance le Pomodoro/.test(coucher.description), 'le coucher, lui, ne réclame pas de Pomodoro');
  const bp = await fr.evaluate(() => window.__bcSansPomodoro());
  ok(bp.total > 0 && bp.sans === bp.total, 'aucun Pomodoro aujourd\'hui : ' + bp.sans + ' blocs sur ' + bp.total + ' sans minuteur');
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(300);
  const txt = await fr.evaluate(() => document.getElementById('cl-pomodoro').textContent);
  ok(/blocs? sur \d+ sans Pomodoro/.test(txt), 'la clôture le dit : ' + txt.slice(0, 70));
  await fr.evaluate(() => document.getElementById('cloture-valider').click());
  await page.waitForTimeout(300);
  const jr = await local(fr, 'batcave-journal-2026-09-15');
  ok(jr && jr.sansPomodoro === bp.sans, 'le journal du jour garde le compte (' + (jr && jr.sansPomodoro) + ')');
  await ctx.close();
}

console.log('\n== 270) Une priorité qui revient trois semaines change de ton ==');
{
  const hist = {'Sommeil': {premiere:'2026-08-31', semaines:['2026-08-31','2026-09-07','2026-09-14'], action:'Coucher plus tôt'}};
  const { ctx, fr } = await ouvrir('2026-09-15T09:00:00+02:00', {'batcave-insights-hist': hist});
  const t = await fr.evaluate(() => window.__bcTonPriorite('Sommeil'));
  ok(t.n === 3 && t.niveau === 'insistant' && /3ᵉ semaine/.test(t.prefixe), 'troisième retour : ton insistant (' + t.prefixe + ')');
  const t1 = await fr.evaluate(() => window.__bcTonPriorite('Jamais vue'));
  ok(t1.n === 0 && t1.prefixe === '', 'une priorité neuve reste neutre');
  await ctx.close();
}

console.log('\n== 271) Clôture de saison : nouvel horizon sans rien ressaisir ==');
{
  const { ctx, page, fr } = await ouvrir('2027-03-12T09:00:00+01:00', {'batcave-goals': {poids:68, coran:150, duaas:90}});
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="objectifs"]').click());
  await page.waitForTimeout(250);
  ok(await fr.evaluate(() => !document.getElementById('saison-cloturer').hidden), 'à J-2, le bouton « Clôturer la saison » apparaît');
  await fr.evaluate(() => window.__bcCloturerSaison());
  await page.waitForTimeout(500);
  const h = await local(fr, 'batcave-horizon'), sa = await local(fr, 'batcave-saisons'), dep = await local(fr, 'batcave-goals-depart');
  ok(h.debut === '2027-03-14' && h.fin === '2027-09-14', 'le nouvel horizon va du 14 mars au 14 septembre (' + h.debut + ' → ' + h.fin + ')');
  ok(sa.length === 1 && sa[0].goals.length === 3, 'la saison précédente est archivée avec ses trois cartes');
  ok(Number(dep.poids) === 68, 'le poids repart de 68 kg, la valeur atteinte');
  const t = await fr.evaluate(() => ({ tri: window.__bcTrimestres().length, mois: window.__bcMois().length,
                                       objs: window.__bcObjectifs().filter(o => o.pid === 'M2027-04').length }));
  ok(t.tri >= 5 && t.mois >= 13, 'les trimestres et les mois de la nouvelle saison existent (' + t.tri + ' trimestres, ' + t.mois + ' mois)');
  ok(t.objs > 0, 'les objectifs d\'avril 2027 sont semés tout seuls (' + t.objs + ')');
  await ctx.close();
}

console.log('\n== 272) Sauvegarde chiffrée et exercice de restauration ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-15T09:00:00+02:00');
  const r = await fr.evaluate(async () => {
    const clair = JSON.stringify({'batcave-test': 42});
    const chiffre = await window.__bcChiffrer(clair, 'gotham');
    const env = JSON.parse(chiffre);
    let ouvert = null, refus = false;
    try{ ouvert = await window.__bcDechiffrer(env, 'gotham'); }catch(e){}
    try{ await window.__bcDechiffrer(env, 'mauvaise'); }catch(e){ refus = true; }
    return {env: env, ouvert: ouvert, refus: refus, brut: chiffre.indexOf('batcave-test') };
  });
  ok(r.env.batcaveChiffre === 1 && r.brut === -1, 'le contenu chiffré ne laisse rien lire en clair');
  ok(r.ouvert && r.ouvert['batcave-test'] === 42, 'la bonne phrase de passe le rouvre à l\'identique');
  ok(r.refus, 'une mauvaise phrase est refusée');
  ok(await fr.evaluate(() => window.__bcExercice()), 'jamais fait : l\'exercice de restauration est dû');
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(/Exercice de restauration/.test(plan), 'il remonte dans le plan du jour');
  await fr.evaluate(() => { document.querySelector('.backup-trigger').click(); document.getElementById('drill-fait').click(); });
  await page.waitForTimeout(250);
  ok(await local(fr, 'batcave-last-restore-drill') === '2026-09-15', 'l\'exercice est noté à la date du jour');
  ok(!(await fr.evaluate(() => window.__bcExercice())), 'il n\'est plus dû');
  await ctx.close();
}

console.log('\n== 273) Notion : les cours pas faits remontent ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-15T09:00:00+02:00');
  const r = await fr.evaluate(() => {
    const faux = {results:[
      {'':'PAS FAIT ', 'Fiché':'__NO__', 'Compris':'__NO__', 'Cartes Anki':'__NO__', 'Cours':'Structure du génome', url:'https://n/1'},
      {'':'PAS FAIT ', 'Fiché':'__NO__', 'Compris':'__NO__', 'Cartes Anki':'__NO__', 'Cours':'Mutabilité', url:'https://n/2'},
      {'':'FAIT', 'Fiché':'__YES__', 'Compris':'__YES__', 'Cartes Anki':'__YES__', 'Cours':'Analyse des gènes', url:'https://n/3'}
    ]};
    window.__bcNotion('Anatomía I', faux);
    window.__bcNotion('Psicología', {results:[{'':'FAIT', 'Fiché':'__YES__', 'Cours':'Introduction', url:'https://n/4'}]});
    return {retards: window.__bcNotionRetards(), pasFait: window.__bcCoursPasFait({'':'PAS FAIT ', 'Cours':'x'}), fait: window.__bcCoursPasFait({'':'FAIT', 'Cours':'x'})};
  });
  ok(r.pasFait === true && r.fait === false, 'un cours « PAS FAIT » est reconnu, un cours fait aussi');
  ok(r.retards.length === 1 && r.retards[0].matiere === 'Anatomía I' && r.retards[0].n === 2, 'Anatomía I : 2 cours pas faits sur 3 (' + JSON.stringify(r.retards.map(x => x.matiere + ':' + x.n)) + ')');
  const vue = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="etudes"]').click(); const p = document.getElementById('notion-panel'); return {visible: !p.hidden, txt: p.innerText.replace(/\s+/g, ' ')}; });
  ok(vue.visible && /Anatomía I — 2 cours pas faits sur 3/.test(vue.txt), 'le panneau Études le montre : ' + vue.txt.slice(60, 130));
  const plan = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="dashboard"]').click(); return document.getElementById('dash-plan').innerText; });
  ok(/Anatomía I — 2 cours pas faits dans Notion/.test(plan), 'et le plan du jour le remonte');
  ok((await local(fr, 'batcave-notion-cache'))['Anatomía I'].pasFait.length === 2, 'le cache garde la liste, même sans connecteur');
  await ctx.close();
}

console.log('\n== 274) Douze onglets, et rien de perdu ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-15T09:00:00+02:00');
  const nav = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].filter(b => !b.hidden).map(b => b.dataset.page));
  ok(nav.length === 12, 'douze onglets visibles : ' + nav.join(' '));
  ok(nav.indexOf('business') < 0, 'Business reste caché tant qu\'aucune boutique n\'est branchée');
  const sem = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="bilan"]').click();
    return {actives: [...document.querySelectorAll('.page.active')].map(p => p.dataset.page),
            revue: !!document.querySelector('.page[data-page="bilan"] #revue-panel'),
            journal: !!document.querySelector('.page[data-page="bilan"] #journal-hist-panel')}; });
  ok(sem.actives.join(' ') === 'bilan insights', '« Semaine » ouvre le bilan ET les insights');
  ok(sem.revue && sem.journal, 'la revue de la semaine et l\'historique du journal y sont rangés');
  const corps = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="addictions"]').click(); return [...document.querySelectorAll('.page.active')].map(p => p.dataset.page); });
  ok(corps.join(' ') === 'addictions vie', '« Corps » ouvre Dépendances et Santé');
  const etudes = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="etudes"]').click(); return [...document.querySelectorAll('.page.active')].map(p => p.dataset.page); });
  ok(etudes.join(' ') === 'etudes agenda', '« Études » ouvre Études et l\'agenda du travail');
  const dash = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="dashboard"]').click(); return [...document.querySelectorAll('.page.active')].map(p => p.dataset.page); });
  ok(dash.join(' ') === 'dashboard taches', 'le tableau de bord porte les tâches');
  /* le journal a rejoint la clôture */
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(250);
  const cl = await fr.evaluate(() => ({ coran: !!document.getElementById('cl-coran'), duaa: !!document.getElementById('cl-duaa'),
                                        comp: document.querySelectorAll('#cl-complements .chip').length }));
  ok(cl.coran && cl.duaa && cl.comp > 0, 'page de Coran, duaa et compléments sont passés dans la clôture (' + cl.comp + ' compléments)');
  await fr.evaluate(() => { document.getElementById('cl-coran').value = '42'; document.getElementById('cl-duaa').value = 'duaa du voyage';
                            document.querySelector('#cl-complements .chip').click(); document.getElementById('cloture-valider').click(); });
  await page.waitForTimeout(300);
  const jr = await local(fr, 'batcave-journal-2026-09-15');
  ok(jr && jr.coran === '42' && /voyage/.test(jr.duaa) && jr.complements.length === 1, 'la clôture les enregistre dans le journal du jour');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\nFAILS: ' + errs : '\nTOUT OK (test68)');
process.exit(errs ? 1 : 0);
