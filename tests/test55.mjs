/* Parcours complet : chaque page, son action principale, la trace en stockage — sans aucune erreur de page. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', e => { errs++; pageErrors++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-08T10:00:00+02:00') });
await page.goto(URL, {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(300);
const local = (k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const go = async (p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(120); return fr.evaluate(x => document.querySelector('.page[data-page="' + x + '"]').classList.contains('active') && document.querySelector('.page[data-page="' + x + '"]').innerText.length > 50, p); };
const setVal = (id, v) => fr.evaluate(([i, val]) => { const e = document.getElementById(i); e.value = val; e.dispatchEvent(new Event('input', {bubbles:true})); e.dispatchEvent(new Event('change', {bubbles:true})); }, [id, v]);
const click = (sel) => fr.evaluate(s => { const e = document.querySelector(s); if(!e) return false; e.click(); return true; }, sel);
const texte = (sel) => fr.evaluate(s => (document.querySelector(s) || {innerText:''}).innerText.replace(/\s+/g,' ').trim(), sel);

console.log('\n== 190) Tableau de bord : habitude, Pomodoro, séance ==');
{
  await click('#dash-checklist input[type="checkbox"]');
  await page.waitForTimeout(100);
  const hl = await local('batcave-habitlog');
  ok(hl && Object.values(hl).some(a => a.includes('2026-09-08')), 'une habitude cochée depuis la console est dans le carnet');
  await click('#dash-pomodoro');
  await page.waitForTimeout(100);
  /* le tableau de bord demande d'abord la matière : on valide le choix proposé */
  const demande = await fr.evaluate(() => { const ov = document.getElementById('ask-overlay'); if(ov && !ov.hidden){ document.getElementById('ask-ok').click(); return true; } return false; });
  await page.waitForTimeout(150);
  ok(demande, 'la matière est demandée avant de lancer');
  const t = await local('batcave-timer');
  ok(t && t.pomodoro && t.durationMin > 0, 'le Pomodoro démarre depuis le tableau de bord (' + (t && t.durationMin) + ' min)');
  await page.clock.runFor(10 * 60 * 1000);
  await page.waitForTimeout(200);
  await click('#timer-stop');
  await page.waitForTimeout(200);
  const sessions = await local('batcave-sessions');
  ok(Array.isArray(sessions) && sessions.length === 1 && sessions[0].date === '2026-09-08' && sessions[0].duree === 10, 'arrêt après 10 min → une session de 10 min enregistrée (' + (sessions && sessions.length) + ')');
  const temps = await texte('#dash-temps');
  ok(/0,2/.test(temps), 'le temps du jour affiche 0,2 h : ' + temps.slice(0, 40));
}

console.log('\n== 191) Bilan, Insights, Calendrier, Agenda ==');
{
  ok(await go('bilan'), 'Bilan s\'affiche');
  const n = await fr.evaluate(() => document.querySelectorAll('#bilan-grid .bilan-card').length);
  ok(n >= 9, n + ' cartes de bilan (dont fidélité au plan)');
  ok(/faites sur/.test(await texte('#bilan-plan-note')) , 'prévu vs réalisé chiffré : ' + await texte('#bilan-plan-note'));
  ok(await go('insights'), 'Insights s\'affiche');
  ok(await go('calendrier'), 'Calendrier s\'affiche');
  const cb = await click('#cal-timeline input[type="checkbox"]');
  await page.waitForTimeout(100);
  const cal = await local('batcave-cal-2026-09-08');
  ok(cb && cal && Object.values(cal).some(v => v === true), 'un créneau coché est mémorisé pour le jour');
  ok(await go('agenda'), 'Agenda s\'affiche');
  const cellules = await fr.evaluate(() => document.querySelectorAll('#ag-grid .cal-day:not(.vide)').length);
  ok(cellules >= 28, 'grille du mois : ' + cellules + ' jours');
  await click('#ag-grid .cal-day.aujourdhui');
  await page.waitForTimeout(100);
  ok(/Bioquímica|Révision|Anatomía|Cours|Shopify|10 min|0,2/.test(await texte('#ag-jour')) || (await texte('#ag-jtotal')).length > 0, 'la vue du jour se remplit : ' + (await texte('#ag-jtotal')));
}

console.log('\n== 192) Journal, Habitudes, Dépendances ==');
{
  ok(await go('journal'), 'Journal s\'affiche');
  await setVal('j-sommeil', '7');
  await setVal('j-poids', '64.5');
  await click('#jr-water-plus');
  await page.waitForTimeout(100);
  const j = await local('batcave-journal-2026-09-08');
  ok(j && j.sommeil === '7' && j.poids === '64.5' && j.water === 250, 'journal : sommeil 7, poids 64,5, eau 250 ml');
  ok(await go('habitudes'), 'Habitudes s\'affiche');
  const avant = (await local('batcave-habits')).length;
  await setVal('hab-text', 'Lire 10 pages');
  await click('#hab-add');
  await page.waitForTimeout(100);
  const apres = (await local('batcave-habits')).length;
  ok(apres === avant + 1, 'une habitude ajoutée (' + avant + ' → ' + apres + ')');
  ok(await go('addictions'), 'Dépendances s\'affiche');
  await click('[data-start="snus"]');
  await page.waitForTimeout(100);
  const ad = await local('batcave-addictions');
  ok(ad && ad.snus && ad.snus.start === '2026-09-08', 'compteur snus démarré aujourd\'hui');
}

console.log('\n== 193) Repas, Sport, Coran & Duaas ==');
{
  ok(await go('repas'), 'Repas s\'affiche');
  await click('#meal-grid input[type="checkbox"]');
  await page.waitForTimeout(100);
  const m = await local('batcave-meals-2026-09-08');
  ok(m && Object.values(m).some(v => v === true), 'un aliment coché est mémorisé');
  ok(/kcal/.test(await texte('#kcal-note')) || /pesées/.test(await texte('#kcal-note')), 'la boucle poids → calories parle : ' + await texte('#kcal-note'));
  ok(await go('sport'), 'Sport s\'affiche');
  await click('.sport-card.today input[type="checkbox"]');
  await page.waitForTimeout(100);
  const s = await local('batcave-sport-2026-09-08');
  ok(s && Object.values(s).some(v => v === true), 'un exercice coché est mémorisé');
  ok((await texte('#progression-panel')).length > 40, 'le panneau de progression est rendu');
  ok(await go('coran'), 'Coran & Duaas s\'affiche');
  await setVal('cq-sourate', 'Al-Mulk'); await setVal('cq-page', '5');
  await click('#cq-add'); await page.waitForTimeout(100);
  await setVal('dq-nom', 'Duaa du matin'); await click('#dq-add'); await page.waitForTimeout(100);
  ok((await local('batcave-coran')).length === 1 && (await local('batcave-duaas')).length === 1, 'une sourate et une duaa ajoutées');
}

console.log('\n== 194) Tâches (ajout, suppression, annulation ⌘Z), Budget ==');
{
  ok(await go('taches'), 'Tâches s\'affiche');
  await setVal('tk-text', 'Acheter des gants'); await setVal('tk-priority', 'Haute');
  await click('#tk-add'); await page.waitForTimeout(100);
  let tk = await local('batcave-taches');
  ok(tk.length === 1 && tk[0].priority === 'Haute', 'tâche ajoutée en priorité haute');
  await click('#taches-list .edel'); await page.waitForTimeout(150);
  /* la suppression peut demander confirmation */
  await fr.evaluate(() => { const b = document.getElementById('ask-ok'); const ov = b && b.closest('.overlay'); if(ov && !ov.hidden) b.click(); });
  await page.waitForTimeout(150);
  tk = await local('batcave-taches');
  ok(tk.length === 0, 'tâche supprimée');
  await fr.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {key:'z', metaKey:true, bubbles:true})));
  await page.waitForTimeout(150);
  tk = await local('batcave-taches');
  ok(tk.length === 1, '⌘Z la restaure');
  ok(await go('budget'), 'Budget s\'affiche');
  await setVal('tx-montant', '12.5'); await click('#tx-add'); await page.waitForTimeout(100);
  const tx = await local('batcave-transactions');
  /* les charges fixes de septembre sont déjà journalisées automatiquement : on cherche la nôtre */
  ok(tx.some(t => t.montant === 12.5 && !t.fixed) && tx.filter(t => t.fixed).length >= 9, 'dépense de 12,50 € ajoutée à côté des ' + tx.filter(t => t.fixed).length + ' charges fixes journalisées');
  await setVal('fc-label', 'Salle de sport'); await setVal('fc-montant', '25'); await click('#fc-add'); await page.waitForTimeout(100);
  const fc = await local('batcave-fixed-charges');
  ok(fc.some(c => c.label === 'Salle de sport'), 'charge fixe ajoutée');
}

console.log('\n== 195) Études (date d\'examen), Business, Objectifs, Santé, Courses ==');
{
  ok(await go('etudes'), 'Études s\'affiche');
  const okEx = await fr.evaluate(() => { const i = document.querySelector('[data-examen]'); if(!i) return false; i.value = '2026-10-20'; i.dispatchEvent(new Event('change', {bubbles:true})); return i.dataset.examen; });
  await page.waitForTimeout(100);
  const ex = await local('batcave-examens');
  ok(okEx && ex && ex[okEx] === '2026-10-20', 'date d\'examen posée pour ' + okEx);
  ok(await go('business'), 'Business s\'affiche');
  await setVal('bz-mois', '2026-09'); await setVal('bz-ca', '300'); await setVal('bz-benef', '120'); await click('#bz-add'); await page.waitForTimeout(100);
  ok((await local('batcave-business')).length === 1, 'mois Shopify ajouté');
  ok(await go('objectifs'), 'Objectifs s\'affiche');
  const nObj = await fr.evaluate(() => document.querySelectorAll('#obj-liste .obj-row').length);
  ok(nObj >= 8, nObj + ' objectifs du mois, comparés au réel');
  ok(await go('vie'), 'Santé s\'affiche');
  await setVal('sa-date', '2026-09-20'); await click('#sa-add'); await page.waitForTimeout(100);
  ok((await local('batcave-sante')).length === 1, 'rendez-vous santé ajouté');
  ok(await go('courses'), 'Courses s\'affiche');
  await click('#courses-grid input[type="checkbox"]'); await page.waitForTimeout(100);
  ok(Object.values(await local('batcave-courses')).some(v => v === true), 'article coché');
  await click('#courses-reset'); await page.waitForTimeout(100);
  ok(Object.keys(await local('batcave-courses') || {}).length === 0, 'réinitialisé pour samedi');
}

console.log('\n== 196) Sauvegarde : l\'export porte tout ==');
{
  await click('.backup-trigger');
  await page.waitForTimeout(100);
  const exp = await fr.evaluate(() => document.getElementById('backup-export').value);
  let obj = null; try{ obj = JSON.parse(exp); }catch(e){}
  const cles = obj ? Object.keys(obj) : [];
  ok(obj && cles.length > 20 && ['batcave-sessions','batcave-journal-2026-09-08','batcave-taches','batcave-examens','batcave-objectifs','batcave-habitlog'].every(k => cles.includes(k)), 'export JSON valide avec ' + cles.length + ' clés, dont celles créées pendant le parcours');
  const banniere = await fr.evaluate(() => document.getElementById('coherence-banner').hidden);
  ok(banniere === true, 'aucune incohérence ni clé inconnue après le parcours');
  ok(pageErrors === 0, 'aucune erreur de page sur tout le parcours');
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await ctx.close();
await browser.close();
process.exit(errs ? 1 : 0);
