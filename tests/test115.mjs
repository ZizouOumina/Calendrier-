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

async function ouvrir(quand){
  const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
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
  ok(debut === '2026-10-21', 'le jour 1 est le mercredi 21 (' + debut + ')');
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

console.log('\n== 2) La muscu attend le lundi 26, la montée en charge part de là ==');
{
  const { ctx, fr } = await ouvrir('2026-10-21T07:20:00+02:00');
  const r = await fr.evaluate(() => ({
    premier: window.__bcPremierJourSport(),
    types: ['2026-10-21', '2026-10-22', '2026-10-24', '2026-10-26', '2026-10-27'].map(d => window.__bcTypeSport(d)),
    f: ['2026-10-26', '2026-11-08', '2026-11-09'].map(d => window.__bcFacteurTours(d))
  }));
  ok(r.premier === '2026-10-26', 'la première séance est le lundi 26 (' + r.premier + ')');
  ok(r.types[0] === 'Off' && r.types[1] === 'Off' && r.types[2] === 'Off' && r.types[3] === 'Haut volume' && r.types[4] === 'Bas complet', 'pas de muscu avant le 26, puis haut volume et bas complet : ' + r.types.join(' / '));
  ok(r.f[0] === 0.5 && r.f[1] === 0.5 && r.f[2] === 1, 'tours × ½ du 26 octobre au 8 novembre, complets le 9 (' + r.f.join(' / ') + ')');
  await ctx.close();
}

console.log('\n== 3) La piscine du mardi, puis les intervalles ; le JJB du 28 ==');
{
  const { ctx, fr } = await ouvrir('2026-10-27T10:00:00+01:00');
  const m20 = await grille(fr, '2026-10-20'), m27 = await grille(fr, '2026-10-27'), m17 = await grille(fr, '2026-11-17');
  ok(!m20.some(b => /Piscine/.test(b)), 'pas de piscine avant le 27');
  ok(m27.includes('17:30 🏊 Piscine') && m27.includes('18:30 Trajet retour') && m27.includes('19:00 Dîner') && m27.includes('19:30 Clore le cours du jour') && m27.includes('19:50 Temps libre'),
     'mardi 27 : piscine 17:30, trajet 18:30, dîner 19:00, Clore 19:30 (vingt minutes), temps libre 19:50');
  ok(m17.includes('17:30 🏊 Piscine · intervalles'), 'mardi 17 novembre : la piscine finit par des intervalles');
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

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
