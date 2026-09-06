/* Synchronisations entre pages : une action sur une page, son effet partout où la donnée est
   lue — puis un rechargement pour prouver que tout est écrit, pas seulement affiché. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; try{ localStorage.setItem('batcave-duree-bloc', '25'); }catch(e){} });
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-08T10:00:00+02:00') });   /* mardi : Bas complet, Cartes du dernier cours */
await page.goto(URL, {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
let fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(300);
const aller = async (p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(80); };
const txt = (sel) => fr.evaluate(s => (document.querySelector(s) || {}).innerText || (document.querySelector(s) || {}).textContent || '', sel);
const click = async (sel) => { await fr.evaluate(s => document.querySelector(s).click(), sel); await page.waitForTimeout(120); };
const setVal = async (id, v) => { await fr.evaluate(([i, x]) => { const el = document.getElementById(i); el.value = x; el.dispatchEvent(new Event('change', {bubbles:true})); }, [id, v]); await page.waitForTimeout(120); };
const repondre = async (valeur) => { await fr.evaluate(v => { const sel = document.getElementById('ask-select'), inp = document.getElementById('ask-input'); if(!sel.hidden){ sel.value = [...sel.options].some(o => o.value === v) ? v : sel.options[0].value; } else inp.value = v || ''; document.getElementById('ask-ok').click(); }, valeur); await page.waitForTimeout(150); };
const annulerMinuteur = async () => { await aller('etudes'); await click('#timer-cancel'); await repondre(''); await page.waitForTimeout(120); };

console.log('\n== 190) Un Pomodoro de révision se voit sur six pages ==');
{
  await aller('etudes');
  await click('#timer-pomodoro'); await repondre('Anatomía I');
  await page.clock.fastForward('00:25:01'); await page.waitForTimeout(400);
  await annulerMinuteur();
  ok(/Aujourd'hui[\s\S]*?0,4\s*h/.test(await txt('#rev-stats')), 'Études : aujourd\'hui 0,4 h');
  ok(/Anatomía I[\s\S]*?0,4h/.test(await txt('#rev-matieres-7')), 'Études : par matière, Anatomía I 0,4 h');
  await aller('dashboard');
  ok(/Révision[\s\S]*?0,4h/.test(await txt('#dash-temps')), 'Tableau de bord : temps du jour 0,4 h');
  ok(/révision 0,4\/4 h 25 h/.test(await txt('#leg-rev')), 'Réacteur : légende révision 0,4 / 4 h 25 (' + await txt('#leg-rev') + ')');
  await aller('calendrier');
  ok(/0,4h \/ 4 h 25 visées/.test(await txt('#cal-revision-sub')), 'Calendrier : 0,4h / 4 h 25 visées');
  await aller('agenda');
  ok(/0,4 h · 1 bloc/.test(await txt('#ag-jtotal')), 'Agenda Batcave : 0,4 h · 1 bloc (' + await txt('#ag-jtotal') + ')');
  await aller('bilan');
  ok(/Révision[\s\S]*?0,4h/.test(await txt('#bilan-grid')), 'Bilan : révision 0,4 h cette semaine');
  await aller('objectifs');
  const rev = await fr.evaluate(() => [...document.querySelectorAll('#obj-liste .obj-row')].map(r => r.innerText.replace(/\s+/g,' ')).find(t => /^Révision/.test(t)) || '');
  ok(/réel 0,4 h/.test(rev), 'Objectifs (mois) : révision réel 0,4 h (' + rev.slice(0, 50) + ')');
}

console.log('\n== 191) Un Pomodoro de projet perso se voit sur Business, le tableau de bord et l\'agenda ==');
{
  await aller('dashboard');
  await click('#dash-pomodoro-projet'); await repondre('Shopify');
  await page.clock.fastForward('00:25:01'); await page.waitForTimeout(400);
  await annulerMinuteur();
  await aller('business');
  ok(/Aujourd'hui[\s\S]*?0,4\s*h/.test(await txt('#proj-stats')), 'Business : aujourd\'hui 0,4 h');
  ok(/Shopify[\s\S]*?0,4h/.test(await txt('#proj-by-name')), 'Business : par projet, Shopify 0,4 h');
  await aller('dashboard');
  ok(/Projets perso[\s\S]*?0,4h/.test(await txt('#dash-temps')), 'Tableau de bord : projets 0,4 h');
  ok(/0,8 h au total/.test(await txt('#dash-temps-total')), 'Score du jour : 0,8 h au total');
  await aller('agenda');
  ok(/0,8 h · 2 blocs/.test(await txt('#ag-jtotal')), 'Agenda Batcave : 0,8 h · 2 blocs');
  const pastilles = await fr.evaluate(() => document.querySelectorAll('#ag-grid .cal-day.aujourdhui .cal-pt').length);
  ok(pastilles === 2, 'la case du jour porte deux pastilles (révision + projet)');
}

console.log('\n== 192) Habitude cochée sur le tableau de bord → Habitudes, score, bilan ==');
{
  await aller('dashboard');
  const id = await fr.evaluate(() => document.querySelector('#dash-checklist [data-togglehab]').dataset.togglehab);
  await click('#dash-checklist [data-togglehab]');
  const compte = await txt('#dash-check-count');
  ok(/^1\//.test(compte), 'compteur des habitudes : ' + compte);
  await aller('habitudes');
  const carte = await fr.evaluate(x => [...document.querySelectorAll('#habits-grid .card')].find(c => c.querySelector('[data-togglehab="' + x + '"]')).innerText, id);
  ok(/Fait aujourd'hui/.test(carte) && /1\s*jour/i.test(carte), 'Habitudes : « Fait aujourd\'hui », série 1 jour' + (/Fait aujourd'hui/.test(carte) && /1\s*jour/i.test(carte) ? '' : ' — carte : ' + JSON.stringify(carte).slice(0, 300)));
  await aller('bilan');
  ok(/Habitudes tenues[\s\S]*?[1-9]\d?%/.test(await txt('#bilan-grid')), 'Bilan : habitudes tenues > 0 %');
}

console.log('\n== 193) Eau, sommeil, poids : Calendrier et Journal → tableau de bord, Objectifs, Bilan ==');
{
  await aller('calendrier');
  await click('#cal-water-plus'); await click('#cal-water-plus');
  ok(/0,5 L \/ 3,0 L/.test(await txt('#cal-water-sub')), 'Calendrier : 0,5 L');
  await aller('journal');
  ok(/0,5 \/ 3,0 L/.test(await txt('#jr-water-sub')), 'Journal : 0,5 / 3,0 L');
  await setVal('j-sommeil', '8'); await setVal('j-poids', '64.5');
  await aller('dashboard');
  const rel = await txt('#dash-releves');
  ok(/Sommeil[\s\S]*?8,0/.test(rel) && /Poids[\s\S]*?64,5/.test(rel), 'Relevés : sommeil 8,0 h, poids 64,5 kg');
  ok(/Eau[\s\S]*?0,5 \/ 3,0 L/.test(await txt('#dash-journal')), 'Journal du jour (tableau de bord) : eau 0,5 L');
  await aller('objectifs');
  ok(/1 pesée/.test(await txt('#weight-chart-sub')), 'Objectifs : courbe de poids, 1 pesée');
  await aller('bilan');
  ok(/Sommeil \/ nuit[\s\S]*?8,0h/.test(await txt('#bilan-grid')), 'Bilan : sommeil 8,0 h');
  await aller('repas');
  ok(/1 pesée|pesées sur chacune/.test(await txt('#kcal-analyse')), 'Boucle poids → calories : la pesée est prise en compte');
}

console.log('\n== 194) Repas cochés → tableau de bord et score ==');
{
  await aller('repas');
  for(let i = 0; i < 10; i++){
    const encore = await fr.evaluate(() => { const card = document.querySelector('.meal-card'); const cb = card && card.querySelector('input:not(:checked)'); if(!cb) return false; cb.click(); return true; });
    if(!encore) break;
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(200);
  ok(/826 \/ 3053 kcal/.test(await txt('#meal-kcal-sub')), 'Repas : 826 / 3053 kcal');
  await aller('dashboard');
  ok(/Petit-déjeuner[\s\S]*?5\/5/.test(await txt('#dash-meals')), 'Tableau de bord : petit-déjeuner 5/5');
  ok(/27% kcal/.test(await txt('#dash-meals-kcal-pct')), 'Tableau de bord : 27 % des kcal');
}

console.log('\n== 195) Séries de sport → Sport, tableau de bord, Objectifs ==');
{
  await aller('sport');
  await fr.evaluate(() => { const inp = document.querySelector('.sport-card.today [data-series]'); inp.value = '10/10'; inp.dispatchEvent(new Event('change', {bubbles:true})); });
  await page.waitForTimeout(200);
  ok(await fr.evaluate(() => document.querySelector('.sport-card.today li').classList.contains('checked')), 'Sport : Split squat bulgare coché');
  await aller('dashboard');
  await fr.evaluate(() => { const b = document.getElementById('dash-more-toggle'); if(document.getElementById('dash-more').hidden) b.click(); });
  ok(/Bas complet[\s\S]*?1\/6/.test(await txt('#dash-sport')), 'Tableau de bord : Bas complet 1/6');
}

console.log('\n== 196) Tâche, dépense, Coran → tableau de bord et Bilan ==');
{
  await aller('taches');
  await setVal('tk-text', 'Réviser anatomie'); await setVal('tk-due', '2026-09-08'); await click('#tk-add');
  await aller('dashboard');
  ok(/Réviser anatomie/.test(await txt('#dash-taches')), 'Tableau de bord : la tâche est listée');
  ok(/À faire aujourd'hui — Réviser anatomie/.test(await txt('#dash-plan')), 'Plan du jour : « À faire aujourd\'hui — Réviser anatomie »');
  await aller('budget');
  await setVal('tx-montant', '12'); await click('#tx-add');
  await aller('dashboard');
  ok(/Dépenses[\s\S]*?\d+ €/.test(await txt('#dash-budget')), 'Tableau de bord : dépenses du mois mises à jour');
  await aller('bilan');
  ok(/Dépenses variables[\s\S]*?12€/.test(await txt('#bilan-grid')), 'Bilan : 12 € de dépenses variables');
  await aller('coran');
  await setVal('cq-sourate', 'Al-Fatiha'); await setVal('cq-page', '3'); await click('#cq-add');
  await aller('dashboard');
  ok(/Coran[\s\S]*?3 \/ 180 p\./.test(await txt('#dash-coran')), 'Tableau de bord : Coran 3 / 180 p.');
  ok(/Coran[\s\S]*?3/.test(await txt('#dash-releves')), 'Relevés : Coran 3');
}

console.log('\n== 197) Rechargement : tout est écrit, rien n\'était seulement affiché ==');
{
  await page.reload({ timeout:20000 }).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  fr = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(300);
  const d = await fr.evaluate(() => ({ temps: document.getElementById('dash-temps').innerText, total: document.getElementById('dash-temps-total').innerText, compte: document.getElementById('dash-check-count').textContent, releves: document.getElementById('dash-releves').innerText, meals: document.getElementById('dash-meals').innerText, taches: document.getElementById('dash-taches').innerText, coran: document.getElementById('dash-coran').innerText }));
  ok(/Révision[\s\S]*?0,4h/.test(d.temps) && /Projets perso[\s\S]*?0,4h/.test(d.temps) && /0,8 h au total/.test(d.total), 'temps du jour conservé (0,4 + 0,4)');
  ok(/^1\//.test(d.compte), 'habitude conservée');
  ok(/64,5/.test(d.releves) && /8,0/.test(d.releves) && /Coran[\s\S]*?3/.test(d.releves), 'poids, sommeil et Coran conservés');
  ok(/Petit-déjeuner[\s\S]*?5\/5/.test(d.meals) && /Réviser anatomie/.test(d.taches) && /3 \/ 180/.test(d.coran), 'repas, tâche et Coran conservés');
  const bannière = await fr.evaluate(() => document.getElementById('coherence-banner').hidden);
  ok(bannière === true, 'aucune incohérence signalée après tout ça');
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
