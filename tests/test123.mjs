/* 17 novembre, « fais la 2, ajuste pour la 3, et la 5 » :
   1. Google Agenda ne sonne plus qu'aux moments où il faut bouger : 5 min avant chaque départ (la salle, les cours, le club,
      la mosquée, un examen), à la clôture et 30 min avant le coucher. Les autres blocs restent dans l'agenda, sans rappel.
   2. La séance du jeudi tient dans 07:00 → 07:55 : une série de moins aux tractions et au développé couché, des repos plus
      courts dans les paires -- plus de 3 min entre deux séries d'un même gros muscle.
   3. Le dimanche, l'entretien des machines se coche avec le ménage, le linge rare avec les draps (« avec : … »). */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();

async function ouvrir(quand){
  const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
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

console.log('\n== 1) L\'agenda ne sonne qu\'aux départs, à la clôture et au coucher ==');
{
  const { ctx, fr } = await ouvrir('2026-11-17T15:00:00+01:00');
  const regle = await fr.evaluate(() => ['Trajet salle', 'Trajet cours', 'Trajet club', 'Trajet mosquée', 'Trajet · Examen · Anatomía I', 'Trajet retour',
    'Coucher', 'Anki matinal', 'Déjeuner', 'Préparer · Examen · Anatomía I', '🥋 JJB', 'Sport'].map(l => [l, window.__bcRappelBloc(l)]));
  const R = Object.fromEntries(regle);
  ok(R['Trajet salle'] === 5 && R['Trajet cours'] === 5 && R['Trajet club'] === 5 && R['Trajet mosquée'] === 5 && R['Trajet · Examen · Anatomía I'] === 5,
     'chaque départ sonne 5 min avant : la salle, les cours, le club, la mosquée, un examen');
  ok(R['Coucher'] === 30, 'le coucher, 30 min avant');
  ok(['Trajet retour', 'Anki matinal', 'Déjeuner', 'Préparer · Examen · Anatomía I', '🥋 JJB', 'Sport'].every(l => R[l] === null), 'le reste ne sonne pas : ' + regle.filter(x => x[1] === null).map(x => x[0]).join(', '));
  /* une semaine type : ce qui sonne, jour par jour (19 novembre : pas de JJB avant le 2 decembre -- la semaine pleine est celle du 14) */
  const semaine = await fr.evaluate(() => ['2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19', '2026-12-20'].map(iso => {
    const b = window.__bcRappels(iso);
    return { iso, n: b.length, sonnent: b.filter(x => x.rappel !== null).map(x => x.titre.replace('🦇 ', '') + ' ' + x.rappel), muets: b.filter(x => x.rappel === null).length };
  }));
  semaine.forEach(j => console.log('      ' + j.iso + ' : ' + j.sonnent.join(' · ') + ' (' + j.muets + ' blocs muets)'));
  ok(semaine.every(j => j.sonnent.length >= 2 && j.sonnent.length <= 5), 'de 2 à 5 moments par jour (au lieu de ' + Math.min(...semaine.map(j => j.n)) + ' à ' + Math.max(...semaine.map(j => j.n)) + ')');
  ok(semaine.every(j => j.sonnent.includes('Coucher 30') && j.sonnent.includes('Clôture du jour 0')), 'chaque jour : la clôture à son heure et le coucher 30 min avant');
  const lundi = semaine[0].sonnent, vendredi = semaine[4].sonnent;
  ok(lundi.includes('Trajet salle 5') && lundi.includes('Trajet club 5') && lundi.includes('Trajet cours 5'), 'lundi : la salle, le club, les cours (' + lundi.join(', ') + ')');
  ok(vendredi.includes('Trajet mosquée 5'), 'vendredi : la mosquée pour la Jumu’ah (' + vendredi.join(', ') + ')');
  const tous = await fr.evaluate(() => window.__bcRappels('2026-12-15'));
  ok(tous.every(b => b.rappelBase === b.rappel), 'la grille type et la grille du jour s\'accordent : le rappel peut aller sur la série');
  await ctx.close();
}

console.log('\n== 2) Le jeudi tient dans 07:00 → 07:55 ==');
{
  const { ctx, page, fr } = await ouvrir('2026-11-26T07:00:00+01:00');   /* 19 novembre : le premier jeudi de salle est le 26 */
  const s = await fr.evaluate(() => window.__bcSessionsSport().filter(x => x.type === 'Haut lourd')[0]);
  const reps = Object.fromEntries(s.exercises.map(e => [e.name, e.reps]));
  ok(reps['Tractions'] === '3×5-8' && reps['Développé couché barre'] === '3×5-8', 'une série de moins : tractions et développé couché en 3 × 5-8');
  ok(s.exercises.length === 11 && s.exercises[10].name === 'Flexion du cou' && s.exercises[10].trio === true, 'les mêmes onze exercices, dans le même ordre, le cou en trio à la fin');
  ok(JSON.stringify(s.repos) === JSON.stringify(['60 s / 90 s', '60 s / 90 s', '45 s / 75 s', '30 s / 60 s', '30 s entre les trois']), 'les repos : ' + s.repos.join(' · '));
  /* le temps, recalculé : une série lourde ≈ 35 s, explosive ≈ 15 s, d'isolation ≈ 40-45 s ; l'échauffement 7 min, 1 min par changement de poste */
  const serie = { 'Pompes claquées': 15, 'Tractions': 35, 'Développé couché barre': 35, 'Rowing barre': 35, 'Dips': 35, 'Face pulls': 45, 'Élévations latérales': 45,
                  'Extension triceps à la poulie au-dessus de la tête': 40, 'Tractions serviette (grip kimono)': 25, 'Crunch à la poulie': 35, 'Flexion du cou': 40 };
  const sec = t => { const m = /(\d+)\s*min(?:\s*(\d+))?/.exec(t), x = /(\d+)\s*s/.exec(t); return m ? Number(m[1]) * 60 + Number(m[2] || 0) : (x ? Number(x[1]) : 0); };
  const tours = e => Number(e.reps.split('×')[0]);
  let total = 7 * 60 + 4 * 60, minParMuscle = 9999;
  const ex = s.exercises;
  [[0, 1], [2, 3], [4, 5], [6, 7]].forEach(([a, b], k) => {
    const [r1, r2] = s.repos[k].split('/').map(sec), A = ex[a], B = ex[b], n = Math.max(tours(A), tours(B));
    for(let i = 0; i < n; i++){ if(i < tours(A)) total += serie[A.name] + r1; if(i < tours(B)) total += serie[B.name] + (i < n - 1 ? r2 : 0); }
    if(k < 2) minParMuscle = Math.min(minParMuscle, serie[A.name] + r1 + serie[B.name] + r2);
  });
  const r = sec(s.repos[4]), trio = [ex[8], ex[9], ex[10]], n = Math.max(...trio.map(tours));
  for(let i = 0; i < n; i++) trio.forEach(e => { if(i < tours(e)) total += serie[e.name] + r; });
  const min = Math.round(total / 60);
  ok(min >= 50 && min <= 55, 'environ ' + min + ' min, échauffement et changements de poste compris (avant : environ 74)');
  ok(minParMuscle >= 180, 'entre deux séries des gros exercices, chaque muscle se repose plus de 3 min (' + Math.floor(minParMuscle / 60) + ' min ' + (minParMuscle % 60) + ')');
  await aller(fr, page, 'sport');
  const carte = await fr.evaluate(() => document.querySelector('.sport-card.today').innerText);
  ok(/repos 60 s \/ 90 s/.test(carte) && /un tour des trois repos 30 s entre les trois/.test(carte) && !/2 min 30/.test(carte), 'la carte du jeudi affiche les nouveaux repos');
  const boutons = await fr.evaluate(() => [...document.querySelectorAll('[data-repos]')].map(x => Number(x.dataset.repos)));
  ok(boutons.includes(30) && boutons.includes(60) && boutons.includes(90) && !boutons.includes(150), 'le minuteur propose 30, 60, 90 s… et plus 2 min 30 (' + boutons.join(', ') + ')');
  await ctx.close();
}

console.log('\n== 3) Le dimanche : l\'entretien avec le ménage, le linge rare avec les draps ==');
{
  const { ctx, page, fr } = await ouvrir('2026-12-13T07:00:00+01:00');
  await aller(fr, page, 'journee');
  const r = await fr.evaluate(() => ({
    routine: [...document.querySelectorAll('#mj-routine li')].map(li => li.textContent),
    ids: [...document.querySelectorAll('#mj-routine input[data-mj-hab]')].map(x => x.dataset.mjHab),
    brut: window.__bcHabitsDuJour(0, '2026-12-13').map(h => h.id),
    compte: (document.getElementById('mj-routine-compte') || {}).textContent || ''
  }));
  const menage = r.routine.find(t => /Ménage du dimanche/.test(t)) || '';
  /* 24 novembre : les brosses de douche en silicone, lavees et desinfectees chaque dimanche, closent la liste */
  ok(/Ménage du dimanche avec : rideau de douche à la machine, 40 °C · bouilloire et rice cooker détartrés · robot et aspirateur nettoyés · brosses de douche lavées et désinfectées$/.test(menage), 'le ménage porte l\'entretien du jour : « ' + menage + ' »');
  ok(['core-rideau-douche', 'core-detartrage', 'core-entretien-semaine'].every(id => r.brut.includes(id) && !r.ids.includes(id)), 'le rideau, le détartrage et l\'entretien tombent bien ce dimanche, mais n\'ont plus leur propre case');
  const draps = r.routine.find(t => /Draps/.test(t)) || '';
  ok(/Draps et taies d’oreiller changés avec : serviette de corps changée/.test(draps) && !r.ids.includes('core-serviette-corps'), 'la serviette de corps se coche avec les draps : « ' + draps + ' »');
  ok(r.compte === '0 / ' + r.ids.length, 'le compte de la routine suit les cases affichées (' + r.compte + ', ' + r.ids.length + ' cases)');
  /* cocher le ménage : une case, et elle reste cochée au rechargement */
  await fr.evaluate(() => document.querySelector('input[data-mj-hab="core-menage"]').click());
  await page.waitForTimeout(200);
  const apres = await fr.evaluate(() => ({ coche: document.querySelector('input[data-mj-hab="core-menage"]').checked,
    fait: document.querySelector('input[data-mj-hab="core-menage"]').closest('li').className,
    p: (() => { const x = document.getElementById('mj-routine-compte'); return x ? x.textContent : ''; })() }));
  ok(apres.coche && /fait/.test(apres.fait) && /mj-groupe/.test(apres.fait), 'la case du ménage se coche (et garde toute la ligne pour son détail)');
  const plan = await fr.evaluate(() => { const items = [...document.querySelectorAll('#dash-plan li, #dash-plan .plan-item')].map(x => x.textContent).filter(t => /Ma journée/.test(t)); return items[0] || ''; });
  const total = await fr.evaluate(() => [...document.querySelectorAll('#mj-cases input[data-mj-hab], #mj-routine input[data-mj-hab]')].length);
  const coches = await fr.evaluate(() => [...document.querySelectorAll('#mj-cases input[data-mj-hab], #mj-routine input[data-mj-hab]')].filter(x => x.checked).length);
  ok(!plan || new RegExp('Ma journée : ' + (total - coches) + ' case').test(plan), 'le plan du jour compte les cases affichées (' + (plan || 'pas de ligne') + ', ' + (total - coches) + ' attendues)');
  /* le mercredi, la serviette de corps n'a pas de draps où se ranger : sa case reste */
  const mer = await fr.evaluate(() => { window.__bcJournee.aller('2026-12-16'); return { ids: window.__bcJournee.cases('2026-12-16').map(x => x.id), brut: window.__bcHabitsDuJour(3, '2026-12-16').map(h => h.id) }; });
  ok(!mer.brut.includes('core-serviette-corps') || mer.ids.includes('core-serviette-corps'), 'un autre jour, une tâche sans sa case mère garde sa propre case');
  const sem = await fr.evaluate(() => { const n = []; for(const iso of ['2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19']) n.push(window.__bcJournee.cases(iso).length === window.__bcHabitsDuJour(new Date(iso + 'T12:00:00Z').getUTCDay(), iso).length); return n; });
  ok(sem.every(Boolean), 'du lundi au samedi, rien ne change');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
