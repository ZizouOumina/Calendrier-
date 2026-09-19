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
  ok(v.g7.includes('15:00 Projets perso 4') && v.g7.includes('16:00 Projets perso 5') && v.g7.includes('17:00 Lire') && v.g7.includes('18:00 Réexpliquer'),
     'la journée est celle d\'un jour sans cours : deux blocs de projet, Lire et Réexpliquer');
  ok(v.g7.includes('07:20 Anki 1') && v.g7.includes('08:20 Anki 2'),
     'Anki ne s\'arrête pas : les cartes arrivent à échéance tous les jours, été compris');
  ok(v.g7.some(x => /05:30 Sport/.test(x)) && v.g7.some(x => /Coran/.test(x)) && v.g7.some(x => /19:00 Dîner/.test(x)) && v.g7.some(x => /21:00 Coucher/.test(x)),
     'et le reste de la journée tient : sport, Coran, repas, coucher à 21:00');
  /* La charge d'un jour d'ete est celle d'un jour libre de l'annee scolaire, ni plus ni
     moins : 6 h 15 de revision et 3 h 35 de projets. Ce n'est PAS zero -- une grille vide
     n'apprend rien a quelqu'un qui travaille tous les jours -- et ce n'est pas invente non
     plus : c'est exactement la journee sans cours du 12 octobre ou du 21 janvier. */
  ok(v.c7.rev === 375 && v.c7.proj === 215 && v.c7.es === 0,
     'la charge est celle d\'un jour libre : ' + JSON.stringify(v.c7));
  ok(v.prevu7.rev === 375 && v.prevu7.proj === 215 && v.prevu7.sport === 1,
     'et elle est bien PRÉVUE, donc comptée dans les objectifs du quatrième trimestre');
  ok(v.prevu4.rev > 0 && v.cJuin.rev === 305, 'le 1er et le 4 juin restent des jours de cours (' + v.cJuin.rev + ' min de révision)');
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
  /* Depuis le 19 septembre, des vacances saisies sont une JOURNEE SANS COURS, exactement.
     La propriete qui compte est donc celle-ci : un jour de vacances et un jour ordinaire
     sans cours produisent la MEME grille et les MEMES rappels. Deux facons de ne pas avoir
     cours pour un seul geste, ca n'avait pas lieu d'etre.
     Avant, des vacances remplacaient tout par du temps libre et mettaient les cibles a
     zero ; une vraie coupure se declare maintenant jour par jour avec « Aujourd'hui ne
     compte pas », qui sort le jour des moyennes sans toucher a la grille. */
  const a = await ouvrir('2027-07-01T09:00:00+02:00',
    {'batcave-vacances': [{id:'v1', debut:'2027-07-01', fin:'2027-07-01', label:'test'}]});
  const v = await a.fr.evaluate(() => ({
    r: window.__bcRappels('2027-07-01').map(b => b.titre),
    g: window.__bcGrille('weekday', '2027-07-01').map(b => b[1]),
    c: window.__bcCibleJour('weekday', '2027-07-01')
  }));
  await a.ctx.close();
  const b2 = await ouvrir('2027-07-01T09:00:00+02:00');
  const o = await b2.fr.evaluate(() => ({
    r: window.__bcRappels('2027-07-01').map(b => b.titre),
    g: window.__bcGrille('weekday', '2027-07-01').map(b => b[1]),
    c: window.__bcCibleJour('weekday', '2027-07-01')
  }));
  await b2.ctx.close();
  ok(v.g.join('|') === o.g.join('|'), 'vacances et jour sans cours : la même grille, bloc pour bloc (' + v.g.length + ')');
  ok(v.r.join('|') === o.r.join('|'), 'et les mêmes rappels dans le téléphone (' + v.r.length + ')');
  ok(JSON.stringify(v.c) === JSON.stringify(o.c) && v.c.rev > 0,
     'et les mêmes cibles, qui ne sont pas nulles : ' + JSON.stringify(v.c));
  ok(v.g.some(x => /Anki 1/.test(x)) && v.g.some(x => /Projets perso/.test(x)),
     'la journée de travail tient — ce n\'est pas du temps libre');
  ok(v.r.includes('🦇 Sport') && v.r.includes('🦇 Dîner'), 'et les ancres sont là : sport et repas');
}
{
  /* Un jour d'ete ordinaire pousse la journee entiere : c'est un jour de travail. */
  const { ctx, fr } = await ouvrir('2027-07-01T09:00:00+02:00');
  const r = await fr.evaluate(() => window.__bcRappels('2027-07-01').map(b => b.titre));
  ok(r.includes('🦇 Anki 1') && r.includes('🦇 Réexpliquer') && r.length >= 18,
     'un jour d\'été ordinaire rappelle la journée entière : ' + r.length + ' rappels');
  ok(!r.includes('🦇 Cours'), 'et toujours pas de bloc Cours — il n\'y en a plus');
  await ctx.close();
}

console.log('\n== 293) Sans dates d\'examen, la Batcave le dit — et se taît dès la première saisie ==');
{
  /* le seuil est PROGRAMME_DEBUT + 31 jours : 21 sept. + 31 = 22 octobre */
  const { ctx, fr } = await ouvrir('2026-10-21T09:00:00+02:00');
  const a = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(!/Aucune date d’examen/.test(a), 'le 21 octobre, la veille du seuil, rien encore');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-10-22T09:00:00+02:00');
  const v = await fr.evaluate(() => ({
    t: document.getElementById('dash-plan').innerText,
    btn: document.querySelectorAll('#dash-plan [data-ouvrir="etudes"]').length
  }));
  ok(/Aucune date d’examen saisie/.test(v.t), 'le 22 octobre, la ligne apparaît');
  ok(/pas de mode partiels/.test(v.t) && /sommeil majoré/.test(v.t), 'et elle dit ce qui reste éteint tant qu\'elles manquent');
  ok(v.btn === 1, 'un bouton qui ouvre l\'onglet Études');
  await ctx.close();
}
{
  /* 25 jours : sous les 30 jours qui font entrer l'examen dans le Plan du jour */
  const { ctx, fr } = await ouvrir('2026-10-16T09:00:00+02:00', {'batcave-examens':{'Anatomía I':'2026-11-10'}});
  const v = await fr.evaluate(() => ({
    t: document.getElementById('dash-plan').innerText,
    btn: document.querySelectorAll('#dash-plan [data-ouvrir="etudes"]').length
  }));
  ok(!/Aucune date d’examen/.test(v.t) && v.btn === 0, 'une seule date saisie suffit à la faire disparaître');
  ok(/Examen Anatomía I dans 25 jours/.test(v.t), 'et l\'examen prend sa place dans le plan : ' + (v.t.match(/Examen [^\n]+/) || [])[0]);
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
  /* lot 39 : le 7 décembre est retiré de la liste (cours de Documentación ce jour-là).
     lot 42 : 22 → 25, trois fériés en semaine que le calendrier académique officiel donne et
     que la liste n'avait pas — le 19 mars (San José) et les 8 et 9 avril (Santa Faz). */
  ok(/25 jours à venir/.test(dep.note), 'la liste de départ : « ' + dep.note + ' »');
  ok(dep.st === null, 'et elle ne coûte rien en stockage tant que rien n\'est saisi');

  /* ajouter un jour : le mardi 22 septembre, dans le programme (le 18 est avant le depart,
     et sansCoursLe n'y libere rien) */
  await fr.evaluate(() => { document.getElementById('sc-date').value = '2026-09-22'; document.getElementById('sc-add').click(); });
  await page.waitForTimeout(300);
  const ap = await fr.evaluate(() => ({
    sans: window.__bcSansCours('2026-09-22'),
    g: window.__bcGrille('tuesday', '2026-09-22').map(b => b[0] + ' ' + b[1]),
    st: JSON.parse(localStorage.getItem('batcave-jours-sans-cours')),
    note: document.getElementById('sans-cours-note').textContent
  }));
  ok(ap.sans === true && ap.g.includes('15:00 Español · hablar') && ap.g.includes('21:00 Coucher'),
     'le 22 septembre devient un jour sans cours, grille comprise');
  ok(ap.st.ajoutes.length === 1 && ap.st.ajoutes[0] === '2026-09-22' && !ap.st.retires.length,
     'on ne garde que l\'écart à la liste de départ : ' + JSON.stringify(ap.st));
  ok(/26 jours à venir/.test(ap.note), 'le relevé suit : « ' + ap.note + ' »');

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

console.log('\n== 309) L\'onglet Calendrier désencombré ==');
{
  /* Quatre panneaux sur six étaient de la CONFIGURATION — réglée trois fois par an — et
     occupaient 48 % de l'onglet sur écran, 56 % sur téléphone, entre les deux seules
     choses qu'on y regarde tous les jours. Mesuré avant : 4 524 px / 5 472 px. */
  const { ctx, page, fr } = await ouvrir('2026-09-23T09:00:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
  await page.waitForTimeout(300);
  const v = await fr.evaluate(() => {
    const sec = document.querySelector('section.page[data-page="calendrier"]');
    return {
      hauteur: Math.round(sec.getBoundingClientRect().height),
      ordre: [...sec.querySelectorAll(':scope > .panel')].map(d => ((d.querySelector('h3')||{}).textContent||'').trim().split('—')[0].trim()),
      excPlie: document.getElementById('exceptions-corps').hidden,
      formPlie: document.getElementById('ech-form').hidden,
      note: document.getElementById('exceptions-note').textContent,
      lignes: [...document.querySelectorAll('#sans-cours-liste li')].map(l => l.innerText.replace(/\s+/g,' ').trim())
    };
  });
  ok(v.hauteur < 3200, 'l\'onglet tient en ' + v.hauteur + ' px (4 524 avant)');
  ok(v.ordre[1] === 'Emploi du temps' && v.ordre[2] === 'Vue de la semaine',
     'les deux choses qu\'on regarde tous les jours se touchent : ' + v.ordre.join(' | '));
  ok(/Exceptions du calendrier/.test(v.ordre[4]) && v.excPlie, 'les exceptions sont en bas, et pliées');
  ok(v.formPlie, 'le formulaire des échéances aussi');
  ok(/25 jours sans cours à venir/.test(v.note), 'mais l\'en-tête dit ce qu\'il y a dedans : « ' + v.note + ' »');

  /* Par période, pas par date : Noël tenait onze lignes pour une seule chose. */
  ok(v.lignes.length === 6, 'six lignes au lieu de vingt-quatre (' + v.lignes.length + ')');
  ok(/23 déc.*→.*06 janv.*11 jours ouvrés/.test(v.lignes[2]), 'Noël sur une ligne : ' + v.lignes[2]);
  ok(/^08 déc/.test(v.lignes[1]) && !/→/.test(v.lignes[1]), 'un jour seul n\'invente pas de plage : ' + v.lignes[1]);

  /* La croix d'une plage rend la période entière, en une écriture. */
  await fr.evaluate(() => { document.getElementById('exceptions-toggle').click(); });
  await page.waitForTimeout(150);
  const ouvert = await fr.evaluate(() => ({
    hidden: document.getElementById('exceptions-corps').hidden,
    aria: document.getElementById('exceptions-toggle').getAttribute('aria-expanded')
  }));
  ok(!ouvert.hidden && ouvert.aria === 'true', 'le bouton ouvre, et l\'annonce aux lecteurs d\'écran');

  await fr.evaluate(() => document.querySelector('#sans-cours-liste [data-sccours*="2026-12-23"]').click());
  await page.waitForTimeout(350);
  const apres = await fr.evaluate(() => ({
    st: JSON.parse(localStorage.getItem('batcave-jours-sans-cours')),
    noel: window.__bcSansCours('2026-12-24'),
    autre: window.__bcSansCours('2026-12-08')
  }));
  ok(apres.st.retires.length === 11 && !apres.noel, 'la croix rend les onze jours d\'un coup, en une seule écriture');
  ok(apres.autre === true, 'et ne touche pas aux autres périodes');
  await ctx.close();
}

console.log('\n== 310) Sport, Études et Préparation : la référence se plie, le travail reste ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-23T09:00:00+02:00');
  const aller = async (pg) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="'+x+'"]').click(), pg); await page.waitForTimeout(320); };
  const haut = (pg) => fr.evaluate(x => Math.round(document.querySelector('section.page[data-page="'+x+'"]').getBoundingClientRect().height), pg);

  /* SPORT — « Progression » déroulait les vingt-sept exercices progressifs du programme,
     1 863 px sur téléphone, 76 % de l'onglet. Le mercredi 23 est un JOUR DE REPOS : rien
     à ouvrir, et le bouton doit le dire autrement. */
  await aller('sport');
  const sp = await fr.evaluate(() => ({
    entete: document.getElementById('progression-jour').textContent,
    duJour: document.querySelectorAll('#progression-liste li').length,
    autres: document.querySelectorAll('#progression-autres li').length,
    plie: document.getElementById('progression-autres').hidden,
    bouton: document.getElementById('progression-autres-toggle').textContent.trim()
  }));
  const hSport = await haut('sport');
  ok(hSport < 2600, 'l\'onglet Sport tient en ' + hSport + ' px (3 312 avant, à 1440 px de large)');
  ok(!sp.duJour && /Jour de repos/.test(sp.entete), 'mercredi est un jour de repos, et il le dit : ' + sp.entete);
  ok(sp.plie && sp.autres > 0, 'les ' + sp.autres + ' exercices restent pliés, pas perdus');
  ok(/^Les \d+ exercices du programme ▾$/.test(sp.bouton), 'et le bouton se nomme pour un jour sans séance : « ' + sp.bouton + ' »');
  await fr.evaluate(() => document.getElementById('progression-autres-toggle').click());
  await page.waitForTimeout(200);
  const spo = await fr.evaluate(() => ({
    ouvert: !document.getElementById('progression-autres').hidden,
    bouton: document.getElementById('progression-autres-toggle').textContent.trim(),
    aria: document.getElementById('progression-autres-toggle').getAttribute('aria-expanded')
  }));
  ok(spo.ouvert && /▴$/.test(spo.bouton) && spo.aria === 'true', 'et le bouton les rend : « ' + spo.bouton + ' »');

  /* ÉTUDES — trois panneaux de référence pliés, et les portes d'espagnol remontées
     contre l'espagnol : deux panneaux sur le même sujet étaient séparés par trois autres. */
  await aller('etudes');
  const et = await fr.evaluate(() => {
    const sec = document.querySelector('section.page[data-page="etudes"]');
    return {
      ordre: [...sec.querySelectorAll('.panel h3')].map(h => h.textContent.trim().slice(0, 30)),
      plis: ['eval-fold','portes-fold','agenda-rev-fold'].map(i => document.getElementById(i).hidden),
      jourVisible: !!document.getElementById('portes-aujourdhui')
    };
  });
  const iEs = et.ordre.findIndex(t => /Espagnol/.test(t) && !/portes/i.test(t));
  ok(await haut('etudes') < 5200, 'l\'onglet Études tient en ' + (await haut('etudes')) + ' px (6 988 avant)');
  ok(/portes/i.test(et.ordre[iEs + 1] || ''), 'les portes d\'espagnol suivent l\'espagnol : ' + et.ordre.slice(iEs, iEs + 2).join(' puis '));
  ok(et.plis.every(Boolean), 'les trois panneaux de référence sont pliés');
  ok(et.jourVisible, 'mais la note du cours du jour, elle, reste hors du pli');
  await fr.evaluate(() => document.getElementById('agenda-rev-toggle').click());
  await page.waitForTimeout(250);
  const cal = await fr.evaluate(() => ({
    ouvert: !document.getElementById('agenda-rev-fold').hidden,
    cases: document.querySelectorAll('#rv-grid > *').length,
    mois: document.getElementById('rv-mois').textContent
  }));
  ok(cal.ouvert && cal.cases >= 28 && /2026/.test(cal.mois),
     'le calendrier se redessine à l\'ouverture (' + cal.cases + ' cases, ' + cal.mois + ') — une grille cachée mesure zéro');

  /* PRÉPARATION — les quatorze boîtes et les huit règles, de la lecture du dimanche. */
  await aller('prep');
  const pr = await fr.evaluate(() => ({
    boites: document.getElementById('prep-boites').hidden,
    regles: document.getElementById('prep-regles').hidden,
    ordre: document.querySelectorAll('#prep-ordre li').length
  }));
  ok(await haut('prep') < 2200, 'l\'onglet Préparation tient en ' + (await haut('prep')) + ' px (4 167 avant)');
  ok(pr.boites && pr.regles, 'boîtes et règles pliées');
  ok(pr.ordre > 0, 'mais « L\'ordre, minuté » reste ouvert : c\'est la procédure, pas de la référence');
  await fr.evaluate(() => document.getElementById('prep-boites-toggle').click());
  await page.waitForTimeout(200);
  const nb = await fr.evaluate(() => document.querySelectorAll('#prep-boites .prep-boite').length);
  ok(nb === 7, 'et les sept boîtes de la semaine sont là quand on les ouvre (' + nb + ')');
  await ctx.close();
}

console.log('\n== 310 bis) Un jour de séance : seuls ses exercices restent ouverts ==');
{
  /* Lundi 21 septembre, premier jour de sport du programme. C'est la branche qui compte :
     la liste ouverte doit être celle de la séance du jour, et elle seule. */
  const { ctx, page, fr } = await ouvrir('2026-09-21T09:00:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="sport"]').click());
  await page.waitForTimeout(350);
  const v = await fr.evaluate(() => ({
    entete: document.getElementById('progression-jour').textContent,
    duJour: [...document.querySelectorAll('#progression-liste li b')].map(b => b.textContent),
    autres: document.querySelectorAll('#progression-autres li').length,
    plie: document.getElementById('progression-autres').hidden,
    bouton: document.getElementById('progression-autres-toggle').textContent.trim()
  }));
  ok(v.duJour.length > 0 && /séance du jour/.test(v.entete), 'la séance du jour est ouverte : ' + v.entete);
  ok(v.plie && v.autres > v.duJour.length, 'les ' + v.autres + ' autres sont pliés derrière un bouton');
  ok(/^Les \d+ autres exercices ▾$/.test(v.bouton), 'qui dit combien : « ' + v.bouton + ' »');
  ok(v.duJour.length + v.autres === (await fr.evaluate(() => document.querySelectorAll('#progression-liste li, #progression-autres li').length)),
     'et rien n\'est perdu entre les deux listes (' + v.duJour.length + ' + ' + v.autres + ')');
  await ctx.close();
}

console.log('\n== 311) Neuf onglets, et rien qui devient inatteignable ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-23T09:00:00+02:00');
  const v = await fr.evaluate(() => ({
    visibles: [...document.querySelectorAll('.nav-btn[data-page]')].filter(b => !b.hidden).map(b => b.dataset.page),
    toutes: [...document.querySelectorAll('.nav-btn[data-page]')].map(b => b.dataset.page),
    groupes: [...document.querySelectorAll('.nav-label')].map(l => l.textContent),
    rangees: document.querySelectorAll('.sous-nav').length,
    pastilles: document.querySelectorAll('.sous-onglet').length
  }));
  ok(v.visibles.length === 9, 'neuf boutons dans la barre : ' + v.visibles.join(' '));
  ok(v.toutes.length === 18, 'mais les dix-huit boutons restent dans le DOM (' + v.toutes.length + ') — rien n\'a été supprimé');
  ok(v.groupes.join(' | ') === 'Aujourd’hui | Le travail | Le corps',
     'et les trois intertitres veulent dire quelque chose : ' + v.groupes.join(' | '));
  ok(v.rangees === 7 && v.pastilles === 17, 'sept pages groupées, dix-sept pastilles (' + v.rangees + '/' + v.pastilles + ')');

  /* Chaque page reste atteignable par son bouton caché : c'est ce qui fait que les liens
     internes, les raccourcis et tout le reste continuent de marcher. Et c'est le bouton de
     TÊTE qui s'allume dans la barre, sinon on croit n'avoir pas changé de page. */
  for (const [pg, tete] of [['coran','habitudes'], ['prep','repas'], ['courses','repas'], ['objectifs','bilan']]) {
    const r = await fr.evaluate(x => {
      document.querySelector('.nav-btn[data-page="' + x + '"]').click();
      return { seule: [...document.querySelectorAll('.page.active')].map(s => s.dataset.page),
               allume: [...document.querySelectorAll('.nav-btn[data-page].active')].filter(b => !b.hidden).map(b => b.dataset.page),
               pastille: [...document.querySelectorAll('.page.active .sous-onglet.on')].map(b => b.dataset.sousnav) };
    }, pg);
    ok(r.seule.join('+') === pg, pg + ' s\'ouvre seule, sans rien empiler (' + r.seule.join('+') + ')');
    ok(r.allume.join(',') === tete, 'et c\'est « ' + tete + ' » qui s\'allume dans la barre');
    ok(r.pastille.join(',') === pg, 'avec la bonne pastille sélectionnée');
  }

  /* Les compositions data-pages sont un AUTRE mécanisme : elles empilent, et elles sont
     voulues. Le regroupement ne doit pas y toucher. */
  const emp = await fr.evaluate(() => {
    const lire = x => { document.querySelector('.nav-btn[data-page="' + x + '"]').click();
                        return [...document.querySelectorAll('.page.active')].map(s => s.dataset.page).join('+'); };
    return { dash: lire('dashboard'), bilan: lire('bilan'), corps: lire('addictions'), etudes: lire('etudes') };
  });
  ok(emp.dash === 'dashboard+taches', 'le tableau de bord porte toujours les Tâches (' + emp.dash + ')');
  ok(emp.bilan === 'bilan+insights', 'Semaine porte toujours les Insights (' + emp.bilan + ')');
  ok(emp.corps === 'addictions+vie', 'Corps porte toujours Santé (' + emp.corps + ')');
  ok(emp.etudes === 'etudes+agenda', 'Études porte toujours l\'Agenda (' + emp.etudes + ')');

  /* La pastille navigue vraiment, et passe par le bouton de nav : tous les recalculs
     d'ouverture restent au même endroit. */
  const past = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="repas"]').click();
    document.querySelector('.page[data-page="repas"] .sous-onglet[data-sousnav="courses"]').click();
    return { pages: [...document.querySelectorAll('.page.active')].map(s => s.dataset.page).join('+'),
             tete: [...document.querySelectorAll('.nav-btn[data-page].active')].filter(b => !b.hidden).map(b => b.dataset.page).join(',') };
  });
  ok(past.pages === 'courses' && past.tete === 'repas', 'la pastille « Courses » ouvre Courses et garde Table allumé');

  /* Neuf onglets visibles : les chiffres 1 à 9 couvrent enfin toute la barre. */
  const clav = await fr.evaluate(() => {
    const t = k => { document.dispatchEvent(new KeyboardEvent('keydown', {key:k, bubbles:true}));
                     return [...document.querySelectorAll('.page.active')].map(s => s.dataset.page)[0]; };
    return [t('1'), t('9')];
  });
  ok(clav[0] === 'dashboard' && clav[1] === 'repas', 'les touches 1 et 9 vont du premier au dernier onglet : ' + clav.join(' → '));
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
