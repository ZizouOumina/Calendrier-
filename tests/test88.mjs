/* ===== 291) L'été, le doublon 🦇 Cours, et le rappel des dates d'examen =====

   Trois choses sans rapport entre elles, sauf qu'elles enlevent du bruit.

   L'ETE : le dernier cours est le vendredi 4 juin 2027. Apres, chaque jour ouvre est une
   JOURNEE SANS COURS -- il travaille tous les jours, il ne prend pas de vacances avant
   2028. La periode « ete » a d'abord vide la grille ; elle ne garde plus que son nom, pour
   que la barre dise « Été 2027 ». Ce qui reste a preciser n'est pas la charge (elle est
   deja juste, celle d'un jour libre de l'annee) mais la DESTINATION de ces heures.

   LE DOUBLON : l'agenda Google porte deja les vrais cours, avec la matiere et la salle,
   importes du portail de la fac. Un « 🦇 Cours » de quatre heures pose par-dessus
   n'ajoutait rien et recouvrait le seul evenement qui disait quelque chose. Le temps
   libre non plus n'est plus rappele : jusqu'a douze notifications par jour pour ne rien
   annoncer.

   LES DATES D'EXAMEN : le mode partiels, la revision repartie entre matieres, le sommeil
   majore et le sport allege partent TOUS de examensState. Vide, la moitie de la Batcave
   dort sans le dire. Un mois apres la rentree, une ligne du Plan du jour le dit. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(quand, seed){
  const ctx = await browser.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:25000});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}

console.log('\n== 291) Le 4 juin est le dernier jour de cours ; le 5, l\'été travaillé commence ==');
{
  const { ctx, fr } = await ouvrir('2027-06-04T09:00:00+02:00');
  const v = await fr.evaluate(() => ({
    sans4: window.__bcSansCours('2027-06-04'), sans7: window.__bcSansCours('2027-06-07'),
    p4: (window.__bcPeriode('2027-06-04') || {}).id || null, p7: (window.__bcPeriode('2027-06-07') || {}).id || null,
    g4: window.__bcGrille('friday', '2027-06-04').map(b => b[0] + ' ' + b[1]),
    g7: window.__bcGrille('monday', '2027-06-07').map(b => b[0] + ' ' + b[1]),
    prevu4: window.__bcPrevu('2027-06-04'), prevu7: window.__bcPrevu('2027-06-07'),
    c7: window.__bcCibleJour('monday', '2027-06-07'),
    cJuin: window.__bcCibleJour('monday', '2027-06-01')
  }));
  ok(v.sans4 === false && v.p4 === null && v.g4.includes('15:30 Cours'),
     'le vendredi 4 juin a encore cours à 15:30 et n\'est dans aucune période');
  ok(v.sans7 === true && v.p7 === 'ete', 'le lundi 7 juin est dans la période « été » et sans cours');
  ok(!v.g7.some(x => /Cours|Trajet cours|Trajet retour/.test(x)), 'plus de cours ni de trajets');
  ok(v.g7.includes('15:00 Annale complète') && v.g7.includes('16:00 Correction + cartes') && v.g7.includes('17:00 Projets perso 4'),
     'la journée est celle d\'un jour sans cours : annale complète, correction, projets');
  ok(v.g7.includes('07:20 Anki 1') && v.g7.includes('08:20 Anki 2'),
     'Anki ne s\'arrête pas : les cartes arrivent à échéance tous les jours, été compris');
  ok(v.g7.some(x => /05:30 Sport/.test(x)) && v.g7.some(x => /Coran/.test(x)) && v.g7.some(x => /19:00 Dîner/.test(x)) && v.g7.some(x => /21:00 Coucher/.test(x)),
     'et le reste de la journée tient : sport, Coran, repas, coucher à 21:00');
  /* La charge d'un jour d'ete est celle d'un jour libre de l'annee scolaire, ni plus ni
     moins : 5 h 20 de revision et 4 h 30 de projets. Ce n'est PAS zero -- une grille vide
     n'apprend rien a quelqu'un qui travaille tous les jours -- et ce n'est pas invente non
     plus : c'est exactement la journee sans cours du 12 octobre ou du 21 janvier. */
  ok(v.c7.rev === 320 && v.c7.proj === 270 && v.c7.es === 0,
     'la charge est celle d\'un jour libre : ' + JSON.stringify(v.c7));
  ok(v.prevu7.rev === 320 && v.prevu7.proj === 270 && v.prevu7.sport === 1,
     'et elle est bien PRÉVUE, donc comptée dans les objectifs du quatrième trimestre');
  ok(v.prevu4.rev > 0 && v.cJuin.rev === 265, 'le 1er et le 4 juin restent des jours de cours (' + v.cJuin.rev + ' min de révision)');
  await ctx.close();
}
{
  /* Le lundi de l'ete prend la FORME du semestre 2 (collation a 14:50), pas celle du
     semestre 1 (16:50, apres un bloc de deux heures) : hors semestre, on garde le dernier. */
  const { ctx, fr } = await ouvrir('2027-07-05T09:00:00+02:00');
  const v = await fr.evaluate(() => ({
    g: window.__bcGrille('monday', '2027-07-05').map(b => b[0] + ' ' + b[1]),
    lab: document.getElementById('cal-schedule-label').textContent,
    rel: document.querySelector('#bc-grille .v').textContent
  }));
  ok(v.g.includes('14:50 Collation entraînement'), 'le lundi d\'été garde la forme du semestre 2, pas celle du semestre 1 (' + v.g.filter(x => /Collation entra/.test(x)) + ')');
  ok(/lundi \(pas de cours\) · Été 2027/.test(v.lab), 'l\'en-tête : « ' + v.lab + ' »');
  ok(/Été 2027/.test(v.rel) && !/pas de cours/.test(v.rel), 'le relevé dit « Été 2027 » sans répéter « pas de cours » : « ' + v.rel + ' »');
  await ctx.close();
}

console.log('\n== 292) L\'agenda Google : ni 🦇 Cours, ni 🦇 Temps libre ==');
{
  const { ctx, fr } = await ouvrir('2026-09-14T09:00:00+02:00');
  const v = await fr.evaluate(() => ({
    r: window.__bcRappels('2026-09-14').map(b => b.titre),
    g: window.__bcGrille('monday', '2026-09-14').map(b => b[1]),
    rDim: window.__bcRappels('2026-09-20').map(b => b.titre)
  }));
  ok(!v.r.some(x => x === '🦇 Cours'), 'aucun rappel « 🦇 Cours » : les vrais cours sont déjà dans l\'agenda avec la matière et la salle');
  ok(v.g.includes('Cours'), 'mais le créneau reste dans la grille de la Batcave — c\'est lui qui structure la journée');
  ok(v.r.includes('🦇 Trajet cours') && v.r.includes('🦇 Trajet retour'),
     'les trajets restent rappelés : eux disent quand partir');
  ok(v.r.length === v.g.length - 1, 'un rappel par bloc sauf le cours : ' + v.r.length + ' rappels pour ' + v.g.length + ' blocs');
  ok(v.rDim.some(x => /Temps libre/.test(x)),
     'le dimanche, « Temps libre » reste rappelé : il marque la fin du travail et porte la consigne de la revue de la semaine');
  ok(v.rDim.includes('🦇 Coucher'), 'le coucher est rappelé, 30 min avant');
  await ctx.close();
}
{
  /* Une journee VRAIMENT vide -- des vacances saisies a la main -- ne pousse plus rien : le
     mecanisme existe toujours, meme s'il ne compte pas s'en servir avant 2028. */
  const { ctx, fr } = await ouvrir('2027-07-01T09:00:00+02:00',
    {'batcave-vacances': [{id:'v1', debut:'2027-07-01', fin:'2027-07-01', label:'test'}]});
  const v = await fr.evaluate(() => ({
    r: window.__bcRappels('2027-07-01').map(b => b.titre),
    g: window.__bcGrille('weekday', '2027-07-01').map(b => b[1]),
    c: window.__bcCibleJour('weekday', '2027-07-01')
  }));
  ok(!v.g.some(x => /Anki|Annale|Cartes|Projets perso|Comprendre|Correction/.test(x)) && v.c.rev === 0 && v.c.proj === 0,
     'des vacances saisies vident bien la journée et mettent les cibles à zéro (' + JSON.stringify(v.c) + ')');
  ok(!v.r.some(x => /Temps libre/.test(x)) && v.r.length <= 12,
     'et une journée sans un seul bloc de travail ne pousse plus douze « temps libre » dans le téléphone : ' + v.r.length + ' rappels');
  ok(v.r.includes('🦇 Sport') && v.r.includes('🦇 Dîner'), 'restent les ancres : sport et repas');
  await ctx.close();
}
{
  /* Un jour d'ete ORDINAIRE, lui, pousse la journee entiere : c'est un jour de travail. */
  const { ctx, fr } = await ouvrir('2027-07-01T09:00:00+02:00');
  const r = await fr.evaluate(() => window.__bcRappels('2027-07-01').map(b => b.titre));
  ok(r.includes('🦇 Anki 1') && r.includes('🦇 Annale complète') && r.length >= 20,
     'un jour d\'été ordinaire rappelle la journée entière : ' + r.length + ' rappels');
  ok(!r.includes('🦇 Cours'), 'et toujours pas de bloc Cours — il n\'y en a plus');
  await ctx.close();
}

console.log('\n== 293) Sans dates d\'examen, la Batcave le dit — et se taît dès la première saisie ==');
{
  const { ctx, fr } = await ouvrir('2026-10-14T09:00:00+02:00');
  const a = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(!/Aucune date d’examen/.test(a), 'le 14 octobre, un mois après la rentrée, rien encore');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-10-15T09:00:00+02:00');
  const v = await fr.evaluate(() => ({
    t: document.getElementById('dash-plan').innerText,
    btn: document.querySelectorAll('#dash-plan [data-ouvrir="etudes"]').length
  }));
  ok(/Aucune date d’examen saisie/.test(v.t), 'le 15 octobre, la ligne apparaît');
  ok(/pas de mode partiels/.test(v.t) && /sommeil majoré/.test(v.t), 'et elle dit ce qui reste éteint tant qu\'elles manquent');
  ok(v.btn === 1, 'un bouton qui ouvre l\'onglet Études');
  await ctx.close();
}
{
  /* 26 jours : sous les 30 jours qui font entrer l'examen dans le Plan du jour */
  const { ctx, fr } = await ouvrir('2026-10-15T09:00:00+02:00', {'batcave-examens':{'Anatomía I':'2026-11-10'}});
  const v = await fr.evaluate(() => ({
    t: document.getElementById('dash-plan').innerText,
    btn: document.querySelectorAll('#dash-plan [data-ouvrir="etudes"]').length
  }));
  ok(!/Aucune date d’examen/.test(v.t) && v.btn === 0, 'une seule date saisie suffit à la faire disparaître');
  ok(/Examen Anatomía I dans 26 jours/.test(v.t), 'et l\'examen prend sa place dans le plan : ' + (v.t.match(/Examen [^\n]+/) || [])[0]);
  await ctx.close();
}

console.log('\n== 294) Le panneau « Jours sans cours » : la saisie fait foi ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-14T09:00:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
  await page.waitForTimeout(250);
  const dep = await fr.evaluate(() => ({
    note: document.getElementById('sans-cours-note').textContent,
    n: document.querySelectorAll('#sans-cours-liste [data-sccours]').length,
    st: localStorage.getItem('batcave-jours-sans-cours')
  }));
  ok(/23 jours à venir/.test(dep.note), 'la liste de départ : « ' + dep.note + ' »');
  ok(dep.st === null, 'et elle ne coûte rien en stockage tant que rien n\'est saisi');

  /* ajouter un jour : le jeudi 17 septembre */
  await fr.evaluate(() => { document.getElementById('sc-date').value = '2026-09-17'; document.getElementById('sc-add').click(); });
  await page.waitForTimeout(300);
  const ap = await fr.evaluate(() => ({
    sans: window.__bcSansCours('2026-09-17'),
    g: window.__bcGrille('weekday', '2026-09-17').map(b => b[0] + ' ' + b[1]),
    st: JSON.parse(localStorage.getItem('batcave-jours-sans-cours')),
    note: document.getElementById('sans-cours-note').textContent
  }));
  ok(ap.sans === true && ap.g.includes('15:00 Annale complète') && ap.g.includes('21:00 Coucher'),
     'le 17 septembre devient un jour sans cours, grille comprise');
  ok(ap.st.ajoutes.length === 1 && ap.st.ajoutes[0] === '2026-09-17' && !ap.st.retires.length,
     'on ne garde que l\'écart à la liste de départ : ' + JSON.stringify(ap.st));
  ok(/24 jours à venir/.test(ap.note), 'le relevé suit : « ' + ap.note + ' »');

  /* retirer un jour de la liste de depart : le 12 octobre */
  await fr.evaluate(() => { document.getElementById('sc-date').value = '2026-10-12'; document.getElementById('sc-cours').click(); });
  await page.waitForTimeout(300);
  const re = await fr.evaluate(() => ({
    sans: window.__bcSansCours('2026-10-12'),
    g: window.__bcGrille('monday', '2026-10-12').map(b => b[1]),
    st: JSON.parse(localStorage.getItem('batcave-jours-sans-cours')),
    repris: document.querySelectorAll('#sans-cours-liste [data-scsans]').length
  }));
  ok(re.sans === false && re.g.includes('Cours'), 'le 12 octobre retrouve son cours');
  ok(re.st.retires.length === 1 && re.st.retires[0] === '2026-10-12', 'l\'écart inverse est gardé : ' + JSON.stringify(re.st.retires));
  ok(re.repris === 1, 'et la ligne reste visible, avec sa croix, pour pouvoir revenir en arrière');

  /* la deduction aussi doit pouvoir etre contredite : le 21 janvier, entre les semestres */
  await fr.evaluate(() => { document.getElementById('sc-date').value = '2027-01-21'; document.getElementById('sc-cours').click(); });
  await page.waitForTimeout(300);
  const de = await fr.evaluate(() => ({ sans: window.__bcSansCours('2027-01-21'), g: window.__bcGrille('weekday','2027-01-21').map(b => b[1]) }));
  ok(de.sans === false && de.g.includes('Cours'),
     'même un jour sans cours DÉDUIT des dates de semestre peut être contredit à la main');
  await ctx.close();
}

console.log('\n== 295) La remise à zéro du 14 garde les décisions de calendrier ==');
{
  /* Les jours sans cours corriges a la main et la date de conversion d'une porte sont de la
     CONFIGURATION, pas des saisies du quotidien : une remise a zero qui les effacerait
     annulerait en silence deux decisions sur son emploi du temps -- la liste de depart
     reprendrait la main, et un bloc rendu aux projets redeviendrait de l'espagnol. */
  const { ctx, fr } = await ouvrir('2026-09-14T09:00:00+02:00');
  const v = await fr.evaluate(() => ({
    garde: ['batcave-jours-sans-cours', 'batcave-portes', 'batcave-vacances', 'batcave-jours-exclus', 'batcave-examens']
             .map(k => k + '=' + String(window.__bcReinitGarder(k))),
    efface: ['batcave-sessions', 'batcave-taches', 'batcave-cours-suivi']
             .map(k => k + '=' + String(window.__bcReinitGarder(k)))
  }));
  ok(v.garde.every(x => /=true$/.test(x)), 'gardés : ' + v.garde.join(' · '));
  ok(v.efface.every(x => /=false$/.test(x)), 'effacés : ' + v.efface.join(' · '));
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
