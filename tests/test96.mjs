/* ===== 296-302) Les approfondissements : des créneaux, et des rappels qui se déduisent =====

   La grille donne trois CRENEAUX par semaine -- mercredi 11:20, samedi 09:20 et samedi 10:20
   (le bloc du samedi matin dure deux heures, donc deux seances). Elle ne dit pas ce qu'on y
   met : le sujet est choisi sur place, et ECRIT dans Etudes -> Approfondissements une fois la
   seance finie. C'est cette saisie, et rien d'autre, qui declenche les rappels a J+7, J+30 et
   J+90 au bloc « Réexpliquer ».

   Ce test garde la boucle complete : saisir, voir revenir, noter 0-3, et voir un sujet note
   sous 2 reprendre le prochain creneau « Approfondir ». Il garde aussi les sept citations du
   matin, qui s'affichent dans la meme carte d'ouverture. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(quand, seed){
  const ctx = await browser.newContext({viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:25000});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}

console.log('\n== 296) La grille donne les créneaux, pas les sujets ==');
{
  const { ctx, fr } = await ouvrir('2026-09-20T09:30:00+02:00');
  const g = await fr.evaluate(() => {
    const at = (cle, iso, h) => (window.__bcGrille(cle, iso).find(b => b[0] === h) || [])[1];
    return {
      mer: at('wednesday','2026-09-23','11:20'), sam: at('saturday','2026-09-19','09:20'),
      lun: at('monday','2026-09-21','11:20'), mar: at('tuesday','2026-09-22','11:20'), jeu: at('weekday','2026-09-24','11:20'),
      dim: at('weekend','2026-09-20','10:20'),
      /* le samedi : 09:20 → 11:20, donc deux heures pleines */
      samFin: (window.__bcGrille('saturday','2026-09-19').find(b => b[0] === '11:20') || [])[0]
    };
  });
  ok(g.mer === 'Approfondir', 'mercredi 11:20 = Approfondir (' + g.mer + ')');
  ok(g.sam === 'Approfondir' && g.samFin === '11:20', 'samedi 09:20 → 11:20 = Approfondir, deux heures');
  ok(g.lun === 'Question ouverte ou autre' && g.mar === 'Question ouverte ou autre' && g.jeu === 'Question ouverte ou autre',
     'lundi, mardi et jeudi gardent leur question ouverte');
  ok(g.dim === 'Réexpliquer', 'dimanche 10:20 = Réexpliquer');
  await ctx.close();
}

console.log('\n== 297) Saisir un sujet : la Batcave prend le relais ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-20T11:00:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(250);
  const vide = await fr.evaluate(() => ({
    panneau: !!document.getElementById('appro-panel'),
    note: document.getElementById('appro-note').textContent,
    dus: document.getElementById('appro-dus-bloc').hidden,
    invite: document.getElementById('appro-liste').textContent
  }));
  ok(vide.panneau && /aucun sujet/.test(vide.note) && vide.dus, 'au départ : panneau vide, aucun rappel — ' + vide.note);
  ok(/mercredi 11:20 ou un samedi 09:20/.test(vide.invite), 'et il dit où sont les créneaux');

  /* La matière se choisit dans une liste — celle du SEMESTRE EN COURS — le numéro et le nom
     du tema se tapent : la Batcave ne connaît pas les intitulés de chaque cours. */
  const form = await fr.evaluate(() => ({
    matieres: [...document.querySelectorAll('#appro-matiere option')].map(o => o.value),
    hint: document.getElementById('appro-hint').textContent
  }));
  ok(form.matieres.length === 5 && form.matieres.includes('Anatomía I') && form.matieres.includes('Epidemiología'),
     'en septembre, les cinq matières du S1 et rien d\'autre (' + form.matieres.join(', ') + ')');
  ok(/temas/.test(form.hint) && /font foi/.test(form.hint), 'et le compte reste un repère, pas une limite : ' + form.hint);

  await fr.selectOption('#appro-matiere', 'Anatomía I');
  await fr.fill('#appro-tema', '1');
  await fr.fill('#appro-nom', 'homéostasie et compartiments');
  await fr.click('#appro-add');
  await page.waitForTimeout(250);
  const un = await fr.evaluate(() => ({
    note: document.getElementById('appro-note').textContent,
    liste: document.getElementById('appro-liste').innerText.replace(/\s+/g,' '),
    st: window.__bcApproState().liste,
    tema: document.getElementById('appro-tema').value,
    nom: document.getElementById('appro-nom').value,
    prochain: window.__bcApproProchain(window.__bcApproState().liste[0])
  }));
  ok(un.st.length === 1 && un.st[0].date === '2026-09-20' && /1 sujet suivi/.test(un.note), 'un sujet enregistré au jour même : ' + un.note);
  ok(un.st[0].sujet === 'Anatomía I T1 · homéostasie et compartiments', 'le libellé est reconstruit des trois champs : ' + un.st[0].sujet);
  ok(un.st[0].matiere === 'Anatomía I' && un.st[0].tema === '1' && un.st[0].nom === 'homéostasie et compartiments',
     'et les trois champs restent séparés, pour pouvoir trier un jour');
  ok(/homéostasie/.test(un.liste) && /J\+7/.test(un.liste), 'la liste montre le sujet et son prochain rappel');
  ok(un.prochain.lag === 7 && un.prochain.du === '2026-09-27', 'prochain rappel : J+7 le 27 septembre');
  ok(un.tema === '' && un.nom === '', 'les champs se vident, prêts pour la séance suivante');

  /* Sans numéro ni nom, rien n'est enregistré : une matière seule ne dit pas ce qu'on a fait. */
  await fr.click('#appro-add');
  await page.waitForTimeout(200);
  const seul = await fr.evaluate(() => window.__bcApproState().liste.length);
  ok(seul === 1, 'une matière seule, sans tema ni nom, n\'enregistre rien');
  await ctx.close();
}

console.log('\n== 298) J+7, la note 0-3, et le sujet qui reprend un créneau ==');
{
  const seed = {'batcave-appro': {seq:1, liste:[{id:'a1', sujet:'Anatomía I T1 · homéostasie', date:'2026-09-20', notes:[]}]}};
  const { ctx, fr, page } = await ouvrir('2026-09-28T10:30:00+02:00', seed);
  const c = await fr.evaluate(() => ({
    avant: window.__bcApproDus('2026-09-26').length,
    pile: window.__bcApproDus('2026-09-27').map(x => 'J+' + x.lag),
    dus: window.__bcApproDus('2026-09-28').map(x => x.sujet + '/J+' + x.lag),
    consigne: window.__bcConsigne('Réexpliquer', 0, '2026-09-28', '10:20'),
    appro: window.__bcConsigne('Approfondir', 6, '2026-09-26', '09:20')
  }));
  ok(c.avant === 0 && c.pile.join() === 'J+7', 'rien avant le 27, le J+7 pile le 27');
  ok(c.dus.length === 1 && /homéostasie/.test(c.dus[0]), 'le 28, il est toujours dû (il ne se perd pas)');
  ok(/À redire aujourd'hui \(1\)/.test(c.consigne) && /homéostasie/.test(c.consigne), 'Réexpliquer nomme le sujet');
  ok(/toi qui le choisis/.test(c.appro) && /DEUX séances/.test(c.appro), 'Approfondir du samedi : sujet libre, deux séances');

  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(250);
  await fr.click('[data-appro-note="1"][data-appro-lag="7"]');
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => ({
    dus: window.__bcApproDus('2026-09-28').length,
    frag: window.__bcApproFragiles().map(x => x.sujet),
    consigneAppro: window.__bcConsigne('Approfondir', 3, '2026-09-30', '11:20'),
    cache: document.getElementById('appro-dus-bloc').hidden,
    notes: window.__bcApproState().liste[0].notes,
    persiste: JSON.parse(localStorage.getItem('batcave-appro')).liste[0].notes.length
  }));
  ok(apres.dus === 0 && apres.cache, 'noté : le rappel quitte la liste du jour');
  ok(JSON.stringify(apres.notes) === '[{"lag":7,"n":1,"d":"2026-09-28"}]', 'la note est stockée avec son écart et sa date');
  ok(apres.persiste === 1, 'et elle survit au rechargement (localStorage)');
  ok(apres.frag.length === 1, 'une note sous 2 rend le sujet fragile');
  ok(/À repasser d'abord/.test(apres.consigneAppro) && /homéostasie/.test(apres.consigneAppro),
     'le mercredi suivant, Approfondir le redemande en premier');
  await ctx.close();
}

console.log('\n== 299) Plusieurs sujets, plusieurs échéances, et le retard ==');
{
  const seed = {'batcave-appro': {seq:2, liste:[
    {id:'a1', sujet:'Sujet ancien', date:'2026-09-19', notes:[{lag:7,n:3,d:'2026-09-27'}]},
    {id:'a2', sujet:'Sujet récent', date:'2026-11-14', notes:[]}
  ]}};
  const { ctx, fr } = await ouvrir('2026-12-20T10:30:00+01:00', seed);
  const v = await fr.evaluate(() => ({
    dus: window.__bcApproDus('2026-12-20').map(x => x.sujet + '/J+' + x.lag + '/retard' + x.retard),
    consigne: window.__bcConsigne('Réexpliquer', 0, '2026-12-20', '10:20'),
    lags: window.__bcApproDus('2026-12-20').map(x => x.lag)
  }));
  /* a1 : J+7 déjà noté, restent J+30 (19 oct.) et J+90 (18 déc.).
     a2 : J+7 (21 nov.) et J+30 (14 déc.). Soit quatre. */
  ok(v.dus.length === 4, 'quatre rappels dus, le J+7 déjà noté ne revient pas : ' + v.dus.join(' | '));
  ok(v.lags[0] === 90, 'le plus long passe en premier — c\'est le plus fragile (' + v.lags.join(',') + ')');
  ok(/dû depuis 62 j/.test(v.consigne), 'la consigne dit le retard, elle ne le cache pas');
  ok(!/undefined|NaN/.test(v.consigne), 'et elle reste propre : ' + v.consigne.slice(0, 80));
  await ctx.close();
}

console.log('\n== 300) La citation du matin, une par jour de la semaine ==');
{
  const { ctx, page } = await (async () => {
    const ctx = await browser.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
    await ctx.addInitScript(() => { window.claude = undefined; });
    const page = await ctx.newPage();
    page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
    await page.clock.install({ time: new Date('2026-09-20T07:00:00+02:00') });
    await page.goto(URL, {timeout:25000});
    await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
    await page.waitForTimeout(400);
    return { ctx, page };
  })();
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  const v = await fr.evaluate(() => {
    const tous = [...document.querySelectorAll('#opening-ritual-overlay *')];
    return {
      ouvert: !document.getElementById('opening-ritual-overlay').hidden,
      texte: document.getElementById('ritual-citation-texte').textContent,
      source: document.getElementById('ritual-citation-source').textContent,
      jours: [0,1,2,3,4,5,6].map(d => window.__bcCitation(d)),
      avant: tous.findIndex(e => e.id === 'ritual-citation') < tous.findIndex(e => e.id === 'ritual-plan')
    };
  });
  ok(v.ouvert, 'la carte d\'ouverture s\'affiche au premier lancement du jour');
  ok(/excellent est aussi difficile/.test(v.texte) && /^«/.test(v.texte.trim()), 'jour 1, un dimanche : Spinoza, entre guillemets — ' + v.texte.slice(0, 48));
  ok(/Spinoza/.test(v.source) && /Éthique/.test(v.source), 'la source est nommée : ' + v.source);
  ok(v.jours.length === 7 && v.jours.every(c => c && c.t && c.a && c.s), 'sept citations, chacune avec texte, auteur et source');
  ok(new Set(v.jours.map(c => c.a)).size === 7, 'sept auteurs différents : ' + v.jours.map(c => c.a).join(', '));
  ok(!v.jours.some(c => /maniere repetee|manière répétée/i.test(c.t)), 'la fausse citation d\'Aristote (Will Durant) n\'est pas là');
  ok(v.avant, 'la citation est au-dessus du Plan du jour');
  await ctx.close();
}

console.log('\n== 301) La liste des matières suit le semestre ==');
{
  /* « au S1 on me laisse choisir parmi seulement les matières du premier semestre, et au S2
     que les matières du S2 ». La source est EVAL_MATIERES, le seul endroit qui porte le
     numéro de semestre : 5 matières au S1 (24 ECTS), 6 au S2 (36). */
  const lire = async (quand) => {
    const { ctx, fr, page } = await ouvrir(quand);
    await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
    await page.waitForTimeout(200);
    const v = await fr.evaluate(() => ({
      opts: [...document.querySelectorAll('#appro-matiere option')].map(o => o.value),
      hint: document.getElementById('appro-hint').textContent
    }));
    await ctx.close();
    return v;
  };

  const s1 = await lire('2026-10-05T10:00:00+02:00');
  ok(s1.opts.join('|') === 'Anatomía I|Biología celular|Epidemiología|Antropología|Documentación',
     'octobre : les cinq du S1, 6 ECTS en tête — ' + s1.opts.join(', '));
  ok(!s1.opts.some(m => /Bioquímica|Microbiología|Psicología|Anatomía II|Clínica|Idioma/.test(m)),
     'aucune matière du S2 ne traîne dans la liste');
  ok(/Semestre 1 — 5 matières/.test(s1.hint), 'et le texte sous le champ le dit : ' + s1.hint);

  const s2 = await lire('2027-03-10T10:00:00+01:00');
  ok(s2.opts.length === 6 && s2.opts.includes('Anatomía II') && s2.opts.includes('Bioquímica') &&
     s2.opts.includes('Microbiología') && s2.opts.includes('Psicología'),
     'mars : les six du S2 — ' + s2.opts.join(', '));
  ok(!s2.opts.includes('Anatomía I') && !s2.opts.includes('Epidemiología') && !s2.opts.includes('Documentación'),
     'et plus une seule du S1 : le semestre est fini, on n\'y saisit plus rien');
  ok(/Semestre 2 — 6 matières/.test(s2.hint), 'le texte suit : ' + s2.hint);

  /* Janvier : hors semestre au sens de la grille (le S2 ouvre le 25). C'est le mois des
     examens du S1 — la liste doit rester celle du S1, pas basculer trop tôt. */
  const jan = await lire('2027-01-12T10:00:00+01:00');
  ok(jan.opts.includes('Anatomía I') && !jan.opts.includes('Bioquímica'),
     'entre les deux semestres, en pleins examens du S1, la liste reste au S1 — ' + jan.opts.join(', '));
}

console.log('\n== 302) La Batcave apprend les temas qu\'on lui donne ==');
{
  /* « tu connais même pas tous les temas que j'ai » — non, et aucune guía ne les donne.
     Elle les apprend donc de la saisie : le nom déjà tapé pour un numéro revient tout seul,
     et la liste des numéros déjà approfondis s'affiche sous le champ. */
  const seed = {'batcave-appro': {seq:2, liste:[
    {id:'a1', sujet:'Anatomía I T4 · le tissu osseux', matiere:'Anatomía I', tema:'4', nom:'le tissu osseux', date:'2026-10-01', notes:[]},
    {id:'a2', sujet:'Biología celular T2 · la membrane', matiere:'Biología celular', tema:'2', nom:'la membrane', date:'2026-10-03', notes:[]}
  ]}};
  const { ctx, fr, page } = await ouvrir('2026-10-07T10:00:00+02:00', seed);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(250);

  const anat = await fr.evaluate(() => ({
    hint: document.getElementById('appro-hint').textContent,
    dl: [...document.querySelectorAll('#appro-noms option')].map(o => o.value)
  }));
  ok(/Déjà approfondis ici : T4/.test(anat.hint), 'Anatomía I : elle sait que le T4 est fait — ' + anat.hint);
  ok(anat.dl.join('|') === 'le tissu osseux', 'et le champ « Nom du tema » propose ce nom-là, pas celui d\'une autre matière');

  /* Retaper le numéro 4 remplit le nom tout seul. */
  await fr.fill('#appro-tema', '4');
  await page.waitForTimeout(120);
  const rempli = await fr.evaluate(() => document.getElementById('appro-nom').value);
  ok(rempli === 'le tissu osseux', 'retaper « 4 » remet le nom : ' + rempli);

  /* Mais jamais par-dessus ce qui est déjà écrit. */
  await fr.fill('#appro-nom', 'autre chose');
  await fr.fill('#appro-tema', '4');
  await page.waitForTimeout(120);
  ok(await fr.evaluate(() => document.getElementById('appro-nom').value) === 'autre chose',
     'et il n\'écrase jamais un nom déjà tapé');

  /* Changer de matière change ce qu'elle propose. */
  await fr.selectOption('#appro-matiere', 'Biología celular');
  await page.waitForTimeout(150);
  const bio = await fr.evaluate(() => ({
    hint: document.getElementById('appro-hint').textContent,
    dl: [...document.querySelectorAll('#appro-noms option')].map(o => o.value)
  }));
  ok(/Déjà approfondis ici : T2/.test(bio.hint) && !/T4/.test(bio.hint),
     'Biología celular : T2, et le T4 d\'anatomie ne déborde pas — ' + bio.hint);
  ok(bio.dl.join('|') === 'la membrane', 'la datalist suit la matière');

  /* Un deuxième passage s'enregistre bien comme une séance de plus, et se dit. */
  await fr.fill('#appro-tema', '2');
  await fr.fill('#appro-nom', 'la membrane');
  await fr.click('#appro-add');
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => ({
    n: window.__bcApproState().liste.filter(e => e.matiere === 'Biología celular' && e.tema === '2').length,
    toast: (document.querySelector('.toast, #toast') || {}).textContent || ''
  }));
  ok(apres.n === 2, 'repasser sur un tema crée une seconde séance, avec ses propres J+ (' + apres.n + ')');
  ok(/2. passage/.test(apres.toast), 'et le message le dit, pour ne pas croire à un doublon — ' + apres.toast);
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
