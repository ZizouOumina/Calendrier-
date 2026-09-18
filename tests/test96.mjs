/* ===== 296-299) Les approfondissements : des créneaux, et des rappels qui se déduisent =====

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
  const { ctx, fr } = await ouvrir('2026-09-19T09:30:00+02:00');
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
  const { ctx, fr, page } = await ouvrir('2026-09-19T11:00:00+02:00');
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

  await fr.fill('#appro-sujet', 'Anatomía T1 · homéostasie et compartiments');
  await fr.click('#appro-add');
  await page.waitForTimeout(250);
  const un = await fr.evaluate(() => ({
    note: document.getElementById('appro-note').textContent,
    liste: document.getElementById('appro-liste').innerText.replace(/\s+/g,' '),
    st: window.__bcApproState().liste,
    champ: document.getElementById('appro-sujet').value,
    prochain: window.__bcApproProchain(window.__bcApproState().liste[0])
  }));
  ok(un.st.length === 1 && un.st[0].date === '2026-09-19' && /1 sujet suivi/.test(un.note), 'un sujet enregistré au jour même : ' + un.note);
  ok(/homéostasie/.test(un.liste) && /J\+7/.test(un.liste), 'la liste montre le sujet et son prochain rappel');
  ok(un.prochain.lag === 7 && un.prochain.du === '2026-09-26', 'prochain rappel : J+7 le 26 septembre');
  ok(un.champ === '', 'le champ se vide, prêt pour la séance suivante');
  await ctx.close();
}

console.log('\n== 298) J+7, la note 0-3, et le sujet qui reprend un créneau ==');
{
  const seed = {'batcave-appro': {seq:1, liste:[{id:'a1', sujet:'Anatomía T1 · homéostasie', date:'2026-09-19', notes:[]}]}};
  const { ctx, fr, page } = await ouvrir('2026-09-27T10:30:00+02:00', seed);
  const c = await fr.evaluate(() => ({
    avant: window.__bcApproDus('2026-09-25').length,
    pile: window.__bcApproDus('2026-09-26').map(x => 'J+' + x.lag),
    dus: window.__bcApproDus('2026-09-27').map(x => x.sujet + '/J+' + x.lag),
    consigne: window.__bcConsigne('Réexpliquer', 0, '2026-09-27', '10:20'),
    appro: window.__bcConsigne('Approfondir', 6, '2026-09-26', '09:20')
  }));
  ok(c.avant === 0 && c.pile.join() === 'J+7', 'rien avant le 26, le J+7 pile le 26');
  ok(c.dus.length === 1 && /homéostasie/.test(c.dus[0]), 'le 27, il est toujours dû (il ne se perd pas)');
  ok(/À redire aujourd'hui \(1\)/.test(c.consigne) && /homéostasie/.test(c.consigne), 'Réexpliquer nomme le sujet');
  ok(/toi qui le choisis/.test(c.appro) && /DEUX séances/.test(c.appro), 'Approfondir du samedi : sujet libre, deux séances');

  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(250);
  await fr.click('[data-appro-note="1"][data-appro-lag="7"]');
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => ({
    dus: window.__bcApproDus('2026-09-27').length,
    frag: window.__bcApproFragiles().map(x => x.sujet),
    consigneAppro: window.__bcConsigne('Approfondir', 3, '2026-09-30', '11:20'),
    cache: document.getElementById('appro-dus-bloc').hidden,
    notes: window.__bcApproState().liste[0].notes,
    persiste: JSON.parse(localStorage.getItem('batcave-appro')).liste[0].notes.length
  }));
  ok(apres.dus === 0 && apres.cache, 'noté : le rappel quitte la liste du jour');
  ok(JSON.stringify(apres.notes) === '[{"lag":7,"n":1,"d":"2026-09-27"}]', 'la note est stockée avec son écart et sa date');
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
    await page.clock.install({ time: new Date('2026-09-19T07:00:00+02:00') });
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
  ok(/digne du meilleur/.test(v.texte) && /^«/.test(v.texte.trim()), 'samedi : Épictète, entre guillemets — ' + v.texte.slice(0, 48));
  ok(/Épictète/.test(v.source) && /Manuel/.test(v.source), 'la source est nommée : ' + v.source);
  ok(v.jours.length === 7 && v.jours.every(c => c && c.t && c.a && c.s), 'sept citations, chacune avec texte, auteur et source');
  ok(new Set(v.jours.map(c => c.a)).size === 7, 'sept auteurs différents : ' + v.jours.map(c => c.a).join(', '));
  ok(!v.jours.some(c => /maniere repetee|manière répétée/i.test(c.t)), 'la fausse citation d\'Aristote (Will Durant) n\'est pas là');
  ok(v.avant, 'la citation est au-dessus du Plan du jour');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
