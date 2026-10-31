import { chromium } from 'playwright';
/* Le plan sommeil, la piscine du mardi et le JJB du 28 (21 octobre, 1 h du matin).
   « Cap sur 05:20 » : le lever revient a l'heure de la grille par crans de trente minutes
   tous les deux jours, le coucher suit, et pas de 05:30 avant le lundi 26 -- la muscu y
   commence, avec la seance de reference. Le jour 1 passe au mercredi 21. La piscine prend
   l'heure qui suit le cours du mardi (17:30) des le 27, et finit par des intervalles des le
   17 novembre ; le JJB commence le mercredi 28. Ce test lit les grilles, les heures de lever
   et de coucher, les cibles de sommeil, le panneau cardio et les tours de la montee en charge. */
const URL = process.env.BC_URL || 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();

async function ouvrir(quand, seed){
  const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const CLE = ['weekend', 'monday', 'tuesday', 'wednesday', 'weekday', 'friday', 'saturday'];
const grille = (fr, iso) => fr.evaluate(([c, i]) => window.__bcGrille(c, i).map(b => b[0] + ' ' + b[1]), [CLE[new Date(iso + 'T12:00:00').getDay()], iso]);

console.log('\n== 1) Les paliers du plan sommeil, matin et soir ==');
{
  const { ctx, fr } = await ouvrir('2026-10-21T07:20:00+02:00');
  const debut = await fr.evaluate(() => window.__bcProgrammeDebut);
  /* 21 octobre au matin : « on commence jeudi matin » -- le jour 1 passe au jeudi 22 ; les
     paliers du plan sommeil, eux, ne bougent pas (le mercredi garde son lever de 07:15).
     31 octobre : rien n'avait commence -- le jour 1 passe au dimanche 1er novembre. Les paliers
     d'octobre restent ecrits (ils sont passes) ; le lever de 05:20 vaut des dimanche. */
  ok(debut === '2026-11-01', 'le jour 1 est le dimanche 1er novembre (' + debut + ')');
  const mer = await grille(fr, '2026-10-21');
  ok(mer[0] === '07:15 ⏰ Lever' && mer.includes('07:20 Douche + préparation') && mer.includes('07:30 Petit-déjeuner + Coran (1 page)') && mer.includes('07:45 Anki 1'),
     'mercredi 21 : lever 07:15, douche, petit-déjeuner, et le premier bloc à 07:45 (' + mer.slice(0, 4).join(' · ') + ')');
  ok(!mer.some(b => /^0[56]:/.test(b)), 'rien avant le lever : ni Anki matinal ni sport');
  ok(mer.includes('20:45 Temps libre') && mer.includes('21:55 🚿 Douche du soir') && mer.includes('22:10 📖 Écran off — lecture papier') && mer.includes('22:40 Brossage de dents') && mer.slice(-1)[0] === '22:45 Coucher',
     'mercredi 21 au soir : temps libre, douche 21:55, écran off 22:10, dents 22:40, coucher 22:45');
  const jeu = await grille(fr, '2026-10-22'), ven = await grille(fr, '2026-10-23'), sam = await grille(fr, '2026-10-24'), dim = await grille(fr, '2026-10-25');
  ok(jeu[0] === '06:45 ⏰ Lever' && jeu.includes('07:20 Anki 1') && jeu.slice(-1)[0] === '22:45 Coucher', 'jeudi 22 : lever 06:45, Anki à 07:20, coucher 22:45');
  ok(ven[0] === '06:45 ⏰ Lever' && !ven.some(b => /escribir largo/.test(b)) && ven.slice(-1)[0] === '22:15 Coucher', 'vendredi 23 : lever 06:45, pas d\'escribir largo à 05:30, coucher 22:15');
  ok(sam[0] === '06:15 ⏰ Lever' && sam.includes('06:30 Douche + préparation') && sam.includes('06:45 Petit-déjeuner + Coran (1 page)') && sam.slice(-1)[0] === '22:15 Coucher',
     'samedi 24 : lever 06:15, douche et petit-déjeuner à leur heure, coucher 22:15');
  ok(dim[0] === '05:30 Projets perso matinal' && dim.slice(-1)[0] === '21:35 Coucher' && !dim.some(b => /Lever/.test(b)), 'dimanche 25 : la grille, sans palier (05:20 à l\'heure d\'hiver)');
  const h = await fr.evaluate(() => ({
    l21: window.__bcLever('wednesday', '2026-10-21'), c21: window.__bcCoucher('wednesday', '2026-10-21'),
    l24: window.__bcLever('saturday', '2026-10-24'), l26: window.__bcLever('monday', '2026-10-26'),
    s21: window.__bcSommeilCible('2026-10-21'), s22: window.__bcSommeilCible('2026-10-22'), s26: window.__bcSommeilCible('2026-10-26')
  }));
  ok(h.l21 === '07:15' && h.c21 === '22:45' && h.l24 === '06:15' && h.l26 === '05:30', 'lever et coucher lus dans le plan : ' + [h.l21, h.c21, h.l24, h.l26].join(' / '));
  ok(Math.abs(h.s21 - 8.25) < 0.01 && Math.abs(h.s22 - 8) < 0.01 && Math.abs(h.s26 - 7 - 55 / 60) < 0.01,
     'cibles de sommeil : 8 h 15 la première nuit (23:00 → 07:15), 8 h la suivante (22:45 → 06:45), 7 h 55 dès la grille (' + [h.s21, h.s22, h.s26].map(x => x.toFixed(2)).join(' / ') + ')');
  const lever = await fr.evaluate(() => window.__bcConsigne('⏰ Lever', 3, '2026-10-21', '07:15'));
  ok(/loin du lit/.test(lever) && /dehors/.test(lever), 'la consigne du lever : alarme loin du lit, lumière dehors (' + lever.slice(0, 60) + '…)');
  await ctx.close();
}

console.log('\n== 2) La muscu attend le lundi 2 novembre, la montée en charge part de là ==');
{
  const { ctx, fr } = await ouvrir('2026-10-21T07:20:00+02:00');
  const r = await fr.evaluate(() => ({
    premier: window.__bcPremierJourSport(),
    types: ['2026-11-01', '2026-11-02', '2026-11-03'].map(d => window.__bcTypeSport(d)),
    f: ['2026-11-02', '2026-11-15', '2026-11-16'].map(d => window.__bcFacteurTours(d))
  }));
  ok(r.premier === '2026-11-02', 'la première séance est le lundi 2 novembre (' + r.premier + ')');
  ok(r.types[0] === 'Off' && r.types[1] === 'Haut volume' && r.types[2] === 'Bas complet', 'le dimanche 1er sans muscu, puis haut volume et bas complet : ' + r.types.join(' / '));
  ok(r.f[0] === 0.5 && r.f[1] === 0.5 && r.f[2] === 1, 'tours × ½ du 2 au 15 novembre, complets le 16 (' + r.f.join(' / ') + ')');
  await ctx.close();
}

console.log('\n== 3) La piscine du mardi, puis les intervalles ; le JJB du 28 ==');
{
  const { ctx, fr } = await ouvrir('2026-10-27T10:00:00+01:00');
  const m20 = await grille(fr, '2026-10-20'), m27 = await grille(fr, '2026-10-27'), m17 = await grille(fr, '2026-11-17');
  ok(!m20.some(b => /Piscine/.test(b)), 'pas de piscine avant le 27');
  ok(m27.includes('17:30 🏊 Piscine') && m27.includes('18:30 Trajet retour') && m27.includes('19:00 Dîner') && m27.includes('19:30 Clore le cours du jour') && m27.includes('19:50 Temps libre'),
     'mardi 27 : piscine 17:30, trajet 18:30, dîner 19:00, Clore 19:30 (vingt minutes), temps libre 19:50');
  /* 30 octobre : plus de piscine (sa decision, PISCINE_FIN) -- le mardi 27 garde la sienne. */
  ok(!m17.some(x => /Piscine/.test(x)) && m17.includes('18:00 Dîner'), 'mardi 17 novembre : plus de piscine, dîner 18:00 (' + m17.filter(x => /^1[78]/.test(x)).join(' · ') + ')');
  const lun = await grille(fr, '2026-10-26'), mer = await grille(fr, '2026-10-28');
  ok(!lun.some(b => /JJB/.test(b)) && mer.includes('10:30 🥋 JJB'), 'pas de JJB le lundi 26, le premier est le mercredi 28');
  const c = await fr.evaluate(() => ({
    cible: window.__bcCibleCardio('2026-10-27'),
    sorties: window.__bcSortiesCardio('2026-10-26').map(x => x.iso + ' ' + (x.combat || x.piscine)),
    consigne: window.__bcConsigne('🏊 Piscine', 2, '2026-10-27', '17:30'),
    intervalles: window.__bcConsigne('🏊 Piscine · intervalles', 2, '2026-11-17', '17:30')
  }));
  ok(c.cible === 35, 'la piscine vise 35 minutes (' + c.cible + ')');
  ok(c.sorties.join(',') === '2026-10-27 piscine,2026-10-28 JJB,2026-10-30 JJB', 'la semaine du 26 au panneau cardio : ' + c.sorties.join(', '));
  ok(/35 minutes/.test(c.consigne) && /sd\.ua\.es/.test(c.consigne) && /tiède/.test(c.consigne), 'consigne de la piscine : ' + c.consigne.slice(0, 70) + '…');
  ok(/8 × \(50 m vite, 50 m tranquille\)/.test(c.intervalles), 'consigne des intervalles : ' + c.intervalles.slice(0, 80) + '…');
  await ctx.close();
}

console.log('\n== 4) L\'alimentation du 21 octobre : shake, sauces comptées, couscous, collation combat, sardines ==');
{
  const { ctx, fr } = await ouvrir('2026-11-03T08:00:00+01:00');
  const r = await fr.evaluate(() => {
    const c = (n, iso) => window.__bcCompoRepas(n, iso, true).map(x => x.c + ' ' + x.q).join(', ');
    return {
      shake: c('Petit-déjeuner', '2026-11-03'),
      dejLun: c('Déjeuner', '2026-11-02'), dejMar: c('Déjeuner', '2026-11-03'),
      dinMar: c('Dîner', '2026-11-03'), dinLun: c('Dîner', '2026-11-02'), dinMar27: c('Dîner', '2026-10-27'),
      colMar: c('Collation entraînement', '2026-11-03'), colLun: c('Collation entraînement', '2026-11-02'),
      combat: c('Collation combat', '2026-11-02'),
      besoin: window.__bcBesoinSemaine
    };
  });
  ok(/fruitsrouges 100/.test(r.shake) && /miel 20/.test(r.shake), 'shake : 100 g de fruits rouges, 20 g de miel (25 octobre : celui qui lui reste) (' + r.shake + ')');
  /* 23 octobre, le plan de prise de masse : les memes grammes tous les jours -- 140 g de semoule et 120 g
     de poulet a midi, 15 ml d'huile (10 crus) et la harissa ; 120 g de viande hachee le soir. */
  /* 23 octobre au soir, le plan dense : riz 125 g midi et soir, 100 g de viande, 80 g de legumes, l'huile
     crue sur le riz (25 ml a midi, 15 le soir apres la sauce) ; la collation est une poignee. */
  /* 25 octobre : 80 g de viande par repas, 5 ml d'huile crue de plus. */
  ok(/^riz 125, poulet 70, legumes 80/.test(r.dejLun) && /^riz 125, poulet 70/.test(r.dejMar), 'riz à midi : 125 g et 70 g de poulet (0,4 g de protéines par kilo à chaque repas, 25 octobre), le lundi (combat) comme le mardi');
  /* 29 octobre au soir : plus de sauces a partir du 30 -- l'huile crue, le sel iode et les epices,
     les 5 ml d'huile que la sauce remplacait reviennent le soir (25 ml), et 10 g d'amandes de plus a la
     collation rendent le reste (50 g). Les jours d'avant gardent leur sauce comptee. */
  ok(/huile 30$/.test(r.dejLun), 'lundi midi : riz à l\'huile d\'olive, plus de harissa comptée depuis le 30 octobre (' + r.dejLun + ')');
  ok(/huile 30$/.test(r.dejMar) && !/creme/.test(r.dejMar), 'mardi midi : le même riz, sans sauce (' + r.dejMar + ')');
  ok(/^riz 125, hachee 70, legumes 80, huile 25$/.test(r.dinMar), 'mardi soir : riz 125 g, 70 g de viande, 25 ml d\'huile (les 5 ml que la sauce remplaçait reviennent), plus de pesto ni de parmesan (' + r.dinMar + ')');
  ok(/^riz 125, hachee 70, legumes 80, huile 20, pestoverde 15, parmesan 10$/.test(r.dinMar27), 'mardi 27 octobre, avant la fin des sauces : pesto verde et parmesan comptés, 5 ml d\'huile en moins (' + r.dinMar27 + ')');
  /* 26 octobre : plus de fromage -- un 3e oeuf, a la meme place. 27 octobre : 100 g de cottage cheese
     a la place du 3e oeuf ; le mardi et le jeudi, la boite de sardines remplace les oeufs et le cottage. */
  ok(/^amandes 50, sardines 85, cottage 0, dattes 70$/.test(r.colMar) && !/fromage/.test(r.colMar), 'mardi 14:50 : la poignée — amandes, sardines à la place des œufs et du cottage cheese, 7 dattes (' + r.colMar + ')');
  ok(/^amandes 50, oeufs 100, cottage 100, dattes 70$/.test(r.colLun) && !/fromage/.test(r.colLun), 'lundi 14:50 : 50 g d\'amandes depuis la fin des sauces (30 octobre), deux œufs, 100 g de cottage cheese, plus de fromage (' + r.colLun + ')');
  ok(r.combat === 'banane 120, galettes 20, miel 15', 'collation combat : banane, 2 galettes de riz, 15 g de miel (' + r.combat + ')');
  ok(!('creme' in r.besoin) && !('pestoverde' in r.besoin) && r.besoin.sardines === 2 && r.besoin.galettes === 6 && r.besoin.fruitsrouges === 700 && r.besoin.riz === 1750 && !('couscous' in r.besoin) && !('pates' in r.besoin) && r.besoin.dattes === 490,
     'courses : les condiments restent hors liste ; 2 sardines, 6 galettes, 700 g de fruits rouges, 1 750 g de riz (midi et soir), plus de semoule ni de pâtes, 490 g de dattes (70 g par jour depuis le 25 octobre)');
  await ctx.close();
}

console.log('\n== 5) Le sport du 21 octobre : test 400 m, mobilité, mesures notées ==');
{
  const { ctx, page, fr } = await ouvrir('2026-11-03T08:00:00+01:00');
  const t3 = await grille(fr, '2026-11-03'), t10 = await grille(fr, '2026-11-10'), d8 = await grille(fr, '2026-11-08');
  ok(!t3.some(x => /Piscine/.test(x)) && !t10.some(x => /Piscine/.test(x)), 'plus de piscine depuis le 30 octobre : ni test du 400 m le 3, ni séance le 10');
  ok(d8.includes('19:30 🧘 Mobilité des hanches') && d8.includes('19:40 Temps libre'), 'dimanche : dix minutes de mobilité des hanches à 19:30');
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(!/Test du mois à la piscine/.test(plan), 'le plan du jour ne réclame plus le 400 m');
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="sport"]').click(); });
  await page.waitForTimeout(300);
  await fr.evaluate(() => { document.getElementById('cardio-tests-toggle').click(); document.getElementById('mesure-nage').value = '8:40'; document.getElementById('mesure-nage-ok').click(); document.getElementById('mesure-fc').value = '62'; document.getElementById('mesure-fc-ok').click(); });
  await page.waitForTimeout(300);
  const st = await fr.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-cardio-tests') || 'null'));
  ok(st && st.nage['2026-11-03'] === 520 && st.fc['2026-11-03'] === 62, '400 m en 8:40 (520 s) et FC 62 bpm enregistrés (' + JSON.stringify(st) + ')');
  const bouton = await fr.evaluate(() => document.getElementById('cardio-tests-toggle').textContent);
  ok(/62 bpm/.test(bouton) && /8:40/.test(bouton), 'le bouton replié dit les derniers chiffres (' + bouton + ')');
  const plan2 = await fr.evaluate(() => { window.__bcRenderPlan && window.__bcRenderPlan(); return document.getElementById('dash-plan').innerText; });
  ok(!/Test du mois à la piscine/.test(plan2), 'une fois noté, le rappel disparaît');
  await ctx.close();
}

console.log('\n== 6) Le 21 octobre au soir : shake de récup, pesée chaque dimanche, snus, peau, lumière, sac ==');
{
  const { ctx, page, fr } = await ouvrir('2026-11-02T20:50:00+01:00');
  const r = await fr.evaluate(() => ({
    recup: window.__bcCompoRepas('Récup combat', '2026-11-02', true).map(x => x.c + ' ' + x.q).join(', '),
    kcal: window.__bcMacrosRepas({name:'Récup combat'}, '2026-11-02'),
    lun: window.__bcMacrosJour('2026-11-02').kcal, mar: window.__bcMacrosJour('2026-11-03').kcal,
    avoine: window.__bcBesoinSemaine.avoine,
    habits: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habits') || '[]'),
    snus: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-addictions') || '{}').snus
  }));
  ok(r.recup === 'avoine 250, banane 120, flocons 20' && r.kcal.kcal === 292, 'shake de récup : 250 ml de boisson d\'avoine, une banane, 20 g de flocons, 292 kcal (étiquette Lidl depuis le 25 octobre) (' + r.recup + ')');
  /* 23 octobre : plus de semoule en plus les jours de combat -- l'ecart, ce sont la collation combat et le shake de recup (≈ 530 kcal), moins les sardines du mardi. */
  ok(r.lun - r.mar > 400, 'il ne compte que les jours de combat : lundi ' + r.lun + ' kcal, mardi ' + r.mar);
  ok(r.avoine === 3550, 'courses : 2,8 L pour les shakes du matin (400 ml depuis le 23 octobre) + 750 ml pour les trois récups = 3 550 ml (' + r.avoine + ')');
  const pesee = r.habits.filter(h => h.id === 'core-pesee-dim')[0], lumiere = r.habits.filter(h => h.id === 'core-lumiere')[0];
  ok(pesee && !pesee.cycleSemaines && !pesee.ancre, 'la pesée tombe chaque dimanche (' + JSON.stringify(pesee) + ')');
  ok(lumiere && !lumiere.jours, 'la lumière du matin est une habitude de chaque jour (' + JSON.stringify(lumiere) + ')');
  ok(r.snus && r.snus.start === '2026-11-01', 'le compteur de snus part du dimanche 1er, le jour 1 (' + JSON.stringify(r.snus) + ')');
  await fr.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', {key:'c', bubbles:true})); });
  await page.waitForTimeout(300);
  const sac = await fr.evaluate(() => document.getElementById('cl-sac').textContent);
  ok(!/maillot/.test(sac) && /cours/.test(sac) && !/kimono/.test(sac), 'lundi soir, la clôture dit le sac du mardi : les cours, plus de maillot (' + sac + ')');
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="addictions"]').click(); });
  await page.waitForTimeout(200);
  const plan = await fr.evaluate(() => document.getElementById('snus-plan').innerText);
  ok(/3 à 5 minutes/.test(plan) && /112/.test(plan), 'le plan anti-envie est sous les compteurs');
  await ctx.close();
}
{
  /* Une Batcave d'avant : la pesee portait un cycle de deux semaines, le snus un depart ancien. */
  const { ctx, page, fr } = await ouvrir('2026-11-03T20:50:00+01:00', {
    'batcave-habits': [{id:'core-pesee-dim', label:'Pesée, à jeun', icon:'⚖️', jours:[0], cycleSemaines:2, ancre:'2026-10-04'}],
    'batcave-addictions': {snus:{start:'2026-09-01', record:4, log:[]}}
  });
  const r = await fr.evaluate(() => ({
    habits: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habits') || '[]'),
    snus: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-addictions') || '{}').snus
  }));
  const pesee = r.habits.filter(h => h.id === 'core-pesee-dim')[0];
  ok(pesee && !pesee.cycleSemaines && !pesee.ancre, 'migration : la pesée enregistrée une semaine sur deux passe à chaque dimanche');
  ok(r.snus.start === '2026-11-01' && r.snus.record === 4, 'migration : un départ ancien passe au 1er novembre, le record ne bouge pas (' + JSON.stringify(r.snus) + ')');
  await fr.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', {key:'c', bubbles:true})); });
  await page.waitForTimeout(300);
  const sac = await fr.evaluate(() => document.getElementById('cl-sac').textContent);
  ok(/kimono/.test(sac) && !/maillot/.test(sac), 'mardi soir : le kimono pour le JJB du mercredi (' + sac + ')');
  await ctx.close();
}
{
  /* Une rechute deja notee apres le jour 1 : le compteur ne recule pas. */
  const { ctx, fr } = await ouvrir('2026-11-05T09:00:00+01:00', {'batcave-addictions': {snus:{start:'2026-11-03', record:8, log:[{id:'lg1', date:'2026-11-03', note:''}]}}});
  const snus = await fr.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-addictions') || '{}').snus);
  ok(snus.start === '2026-11-03', 'un départ après le 1er (une rechute notée) reste tel quel (' + snus.start + ')');
  await ctx.close();
}
{
  /* 31 octobre : ouverte la veille du jour 1, la migration attend (« attente ») au lieu de se
     clore ; le lendemain, a la premiere ouverture, elle joue. */
  const { ctx, page, fr } = await ouvrir('2026-10-31T20:00:00+01:00', {'batcave-addictions': {snus:{start:'2026-10-22', record:0, log:[]}}});
  const lire = f => f.evaluate(() => ({ snus: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-addictions') || '{}').snus, drap: localStorage.getItem('batcave-snus-arret-v3') }));
  const veille = await lire(fr);
  ok(veille.snus.start === '2026-10-22' && /attente/.test(veille.drap || ''), 'samedi 31 : rien ne bouge, la migration attend (' + JSON.stringify(veille) + ')');
  await page.clock.setSystemTime(new Date('2026-11-01T07:00:00+01:00'));
  await page.reload();
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  await page.waitForTimeout(500);
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  const jour1 = await lire(fr2);
  ok(jour1.snus.start === '2026-11-01' && jour1.drap === 'true', 'dimanche 1er : le compteur part du jour 1 (' + JSON.stringify(jour1) + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-12-13T09:00:00+01:00');
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(/Bilan peau des 12 semaines/.test(plan), 'dimanche 13 décembre : le plan du jour demande le bilan peau');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-12-06T09:00:00+01:00');
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(!/Bilan peau/.test(plan), 'et pas un autre dimanche');
  await ctx.close();
}

console.log('\n== 7) Départ au dimanche 1er novembre : le vrai rattrapage, 38 temas, file vide le 24 ==');
{
  /* 31 octobre : le plan du 22 au 29 octobre n'a jamais commencé ; il est remplacé par un plan
     généré sur la grille réelle, qui suit les échéances (cuestionarios, prácticas). */
  const { ctx, fr } = await ouvrir('2026-11-01T07:20:00+01:00');
  const c = await fr.evaluate(() => ({
    oct22: window.__bcConsigne('Anki 1', 4, '2026-10-22', '07:20'),
    dim: window.__bcConsigne('Projets perso matinal', 0, '2026-11-01', '05:30'),
    dim2: window.__bcConsigne('Anki 1', 0, '2026-11-01', '07:20'),
    dim3: window.__bcConsigne('Anki 2', 0, '2026-11-01', '08:20'),
    mer4: window.__bcConsigne('Approfondir', 3, '2026-11-04', '13:00'),
    mer4b: window.__bcConsigne('Anki 1', 3, '2026-11-04', '07:20'),
    ven6: window.__bcConsigne('Anki 1', 5, '2026-11-06', '07:20'),
    mer11: window.__bcConsigne('Approfondir', 3, '2026-11-11', '13:00'),
    fin: window.__bcConsigne('Anki 2', 2, '2026-11-24', '09:00'),
    apres: window.__bcConsigne('Étudier en avance', 3, '2026-11-25', '08:20')
  }));
  ok(!/Rattrapage/.test(c.oct22), 'jeudi 22 octobre : l\'ancien plan a disparu');
  ok(/jour 1 sur 22/.test(c.dim) && /Antropología 4/.test(c.dim), 'dimanche 1er, jour 1 sur 22 : Antropología 4 à 05:30 (cuestionario du vendredi 6)');
  ok(/Anatomía T3/.test(c.dim2) && /Anatomía T4/.test(c.dim3), 'puis Anatomía T3 et T4 : le cuestionario 2 (T3 à T6) d\'abord');
  ok(/Anatomía T6/.test(c.mer4b) && /Cuestionario 2 d'Anatomía/.test(c.mer4), 'mercredi 4 : T6 le matin, le rappel actif du cuestionario 2 à 13:00');
  ok(/Cuestionario d'Antropología/.test(c.ven6), 'vendredi 6 : le rappel d\'Antropología avant le cuestionario du soir');
  ok(/Vidal-Alaball/.test(c.mer11), 'mercredi 11 : l\'article du cuestionario IA d\'Epidemiología');
  ok(/Epidemiología 15/.test(c.fin) && /file est vide/.test(c.fin), 'mardi 24 : Epidemiología 15, la file est vide');
  ok(!/Rattrapage/.test(c.apres), 'mercredi 25 : plus de rattrapage, Étudier en avance reprend son rôle');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
