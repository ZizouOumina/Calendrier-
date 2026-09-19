/* L'ancre du cycle du dimanche, recalee sur le 20 septembre.
   Elle etait au 13, une semaine AVANT le jour 1 du programme. Consequence silencieuse :
   sa premiere seance photo tombait le 11 octobre, trois semaines apres le depart, et
   l'image du point de depart -- la seule a laquelle on compare tout le reste de l'annee --
   n'aurait jamais existe. Meme probleme, en plus court, pour la pesee : premiere mesure
   le 27, six jours apres le depart.
   Sa decision du 19 septembre : ancrer au 20, son dernier dimanche avant le programme.
   Ce fichier garde les deux choses qui pouvaient rater :
   1. le semis n'ajoute que les habitudes ABSENTES, donc changer l'ancre d'une graine ne
      touche PAS celles deja enregistrees chez lui. Sans la migration, sa Batcave a lui
      serait restee au 13 pendant que le code affichait 20 ;
   2. la migration ne doit tourner QU'UNE FOIS : si elle rejouait a chaque demarrage, elle
      ecraserait une ancre qu'il aurait deplacee lui-meme. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

async function ouvrir(quand, seed){
  const ctx = await b.newContext({viewport:{width:1440,height:1200}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(x => { window.claude = undefined;
    if(x) Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed || null);
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR : ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:25000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="habitudes"]').click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}
const cartes = fr => fr.evaluate(() => [...document.querySelectorAll('#habits-grid .card .ctitle')].map(x => x.textContent.trim()));
const ancres = fr => fr.evaluate(() => {
  const o = {};
  (JSON.parse(localStorage.getItem('batcave-habits')) || []).forEach(h => { if(h && h.ancre) o[h.id] = h.ancre; });
  return o;
});
/* Une Batcave d'avant la decision : les quatre habitudes du dimanche y portent le 13. */
const AVANT = {
  'batcave-habits': [
    {id:'core-pesee-dim', label:'Pesée, à jeun', icon:'⚖️', jours:[0], cycleSemaines:2, ancre:'2026-09-13'},
    {id:'core-photos-dim', label:'Photos — peau et corps', icon:'📸', jours:[0], cycleSemaines:4, ancre:'2026-09-13'},
    {id:'core-ongles', label:'Ongles — mains ; pieds les dimanches de photo', icon:'✂️', jours:[0], cycleSemaines:2, ancre:'2026-09-13'},
    {id:'core-brosse-dents', label:'Brosse à dents changée', icon:'🪥', jours:[0], cycleSemaines:12, ancre:'2026-09-13'},
    {id:'core-cheveux', label:'Coupe de cheveux', icon:'💈', jours:[6], cycleSemaines:3, ancre:'2026-10-03'}
  ],
  'batcave-habits-seed-v2':true, 'batcave-habits-seed-v3':true, 'batcave-habits-seed-v4':true,
  'batcave-habits-seed-v5':true, 'batcave-habits-seed-v6':true, 'batcave-habits-seed-v7':true,
  'batcave-habits-seed-v8':true
};

console.log('\n== 331) Départ neuf : les quatre habitudes du dimanche partent du 20 ==');
{
  const { ctx, fr } = await ouvrir('2026-09-20T08:00:00+02:00');
  const c = await cartes(fr);
  const dit = n => c.filter(x => x.indexOf(n) > -1)[0] || '(absente)';
  ok(/prochaine fois le 20 sept/.test(dit('Photos')), 'photos : dimanche 20 septembre — l\'image du point de départ existe (' + dit('Photos') + ')');
  ok(/prochaine fois le 20 sept/.test(dit('Pesée')), 'pesée : dimanche 20 septembre, la veille du jour 1');
  ok(/prochaine fois le 20 sept/.test(dit('Ongles')), 'ongles : le 20 aussi');
  ok(/prochaine fois le 20 sept/.test(dit('Brosse à dents')), 'brosse à dents : le 20 aussi');
  const a = await ancres(fr);
  ok(a['core-pesee-dim'] === '2026-09-20' && a['core-photos-dim'] === '2026-09-20'
     && a['core-ongles'] === '2026-09-20' && a['core-brosse-dents'] === '2026-09-20',
     'les quatre ancres valent 2026-09-20 dans le stockage');
  /* La coupe de cheveux a sa propre ancre (un samedi) : elle ne doit pas etre emportee. */
  ok(a['core-cheveux'] === '2026-10-03', 'la coupe de cheveux garde son ancre du samedi 3 octobre (' + a['core-cheveux'] + ')');
  await ctx.close();
}

console.log('\n== 332) Une Batcave déjà enregistrée est migrée au chargement ==');
{
  /* Le cas qui compte : la SIENNE. Le semis n'ajoute que ce qui manque — sans migration,
     ses habitudes seraient restees au 13 et l'ecran aurait menti. */
  const { ctx, fr } = await ouvrir('2026-09-20T08:00:00+02:00', AVANT);
  const a = await ancres(fr);
  ok(a['core-pesee-dim'] === '2026-09-20' && a['core-photos-dim'] === '2026-09-20'
     && a['core-ongles'] === '2026-09-20' && a['core-brosse-dents'] === '2026-09-20',
     'les quatre ancres du 13 ont été réécrites au 20');
  ok(a['core-cheveux'] === '2026-10-03', 'et celle qui n\'était pas au 13 n\'a pas bougé');
  const c = await cartes(fr);
  ok(/prochaine fois le 20 sept/.test(c.filter(x => x.indexOf('Photos') > -1)[0] || ''),
     'l\'écran dit la même chose que le stockage');
  await ctx.close();
}

console.log('\n== 333) La migration ne tourne qu\'une fois ==');
{
  /* Un mois plus tard il decide de decaler sa seance photo d'une semaine, a la main.
     Si la migration rejouait, elle ecraserait son choix au prochain demarrage — mais
     seulement s'il avait remis le 13, ce qui est le vrai garde-fou : on verifie que le
     drapeau est pose, et qu'une ancre remise au 13 APRES coup survit. */
  const apres = JSON.parse(JSON.stringify(AVANT));
  apres['batcave-ancre-dimanche-v1'] = true;
  const { ctx, fr } = await ouvrir('2026-10-18T08:00:00+02:00', apres);
  const a = await ancres(fr);
  ok(a['core-photos-dim'] === '2026-09-13',
     'le drapeau posé, une ancre au 13 est laissée telle quelle — c\'est son choix, pas une donnée périmée (' + a['core-photos-dim'] + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-20T08:00:00+02:00', AVANT);
  const pose = await fr.evaluate(() => localStorage.getItem('batcave-ancre-dimanche-v1'));
  ok(pose === 'true', 'et la première migration pose bien le drapeau (' + pose + ')');
  await ctx.close();
}

console.log('\n== 334) Le rythme reste le bon après le 20 ==');
{
  const { ctx, fr } = await ouvrir('2026-10-18T08:00:00+02:00');
  const c = await cartes(fr);
  const dit = n => c.filter(x => x.indexOf(n) > -1)[0] || '(absente)';
  /* 20 septembre + 4 semaines = 18 octobre ; + 4 = 15 novembre. */
  ok(/prochaine fois le 18 oct/.test(dit('Photos')), 'photos le 18 octobre, quatre semaines après (' + dit('Photos') + ')');
  ok(/prochaine fois le 18 oct/.test(dit('Pesée')), 'et la pesée tombe le même jour, deux semaines sur deux');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-11-15T08:00:00+02:00');
  const c = await cartes(fr);
  ok(/prochaine fois le 15 nov/.test(c.filter(x => x.indexOf('Photos') > -1)[0] || ''),
     'puis le 15 novembre — la photo tombe toujours un dimanche de pesée');
  await ctx.close();
}

console.log('\n== 335) La marche a enfin une cible ==');
{
  /* « Marche / pas » n'etait defini nulle part : une seule occurrence dans tout le projet,
     sa propre declaration. Ni combien, ni pourquoi. Meme defaut que les etirements. */
  const { ctx, fr } = await ouvrir('2026-09-21T08:00:00+02:00');
  const l = await fr.evaluate(() => (JSON.parse(localStorage.getItem('batcave-habits')) || [])
    .filter(h => h.id === 'core-marche').map(h => h.label)[0]);
  ok(/8\u202f000 pas|8 000 pas/.test(l || ''), 'le libellé porte la cible : « ' + l + ' »');
  await ctx.close();
}
{
  /* Et une Batcave deja enregistree avec l'ancien libelle est migree. */
  const vieux = {'batcave-habits': [{id:'core-marche', label:'Marche / pas', icon:'\ud83d\udeb6'}],
    'batcave-habits-seed-v2':true,'batcave-habits-seed-v3':true,'batcave-habits-seed-v4':true,
    'batcave-habits-seed-v5':true,'batcave-habits-seed-v6':true,'batcave-habits-seed-v7':true,
    'batcave-habits-seed-v8':true};
  const { ctx, fr } = await ouvrir('2026-09-21T08:00:00+02:00', vieux);
  const l = await fr.evaluate(() => (JSON.parse(localStorage.getItem('batcave-habits')) || [])
    .filter(h => h.id === 'core-marche').map(h => h.label)[0]);
  ok(/8 000 pas/.test(l || ''), 'l\'ancien libellé est réécrit au chargement (« ' + l + ' »)');
  await ctx.close();
}
{
  /* Mais un libelle qu'il a personnalise lui-meme ne doit PAS etre ecrase. */
  const sien = {'batcave-habits': [{id:'core-marche', label:'Marche — 12 000 pas', icon:'\ud83d\udeb6'}],
    'batcave-marche-cible-v1': true,
    'batcave-habits-seed-v2':true,'batcave-habits-seed-v3':true,'batcave-habits-seed-v4':true,
    'batcave-habits-seed-v5':true,'batcave-habits-seed-v6':true,'batcave-habits-seed-v7':true,
    'batcave-habits-seed-v8':true};
  const { ctx, fr } = await ouvrir('2026-09-21T08:00:00+02:00', sien);
  const l = await fr.evaluate(() => (JSON.parse(localStorage.getItem('batcave-habits')) || [])
    .filter(h => h.id === 'core-marche').map(h => h.label)[0]);
  ok(l === 'Marche — 12 000 pas', 'son propre libellé n\'est jamais écrasé (« ' + l + ' »)');
  await ctx.close();
}

console.log('\n== 336) Les pas se saisissent, et ils cochent la case ==');
{
  /* Sa demande : « je mettrai mes pas de la journee selon mon appli sante ». Donc un
     CHIFFRE, pas une case. Et le chiffre doit decider de la case, sinon il saisit 9 200
     pas et voit quand meme sa case grise -- deux ecrans qui se contredisent. */
  const { ctx, page, fr } = await ouvrir('2026-09-23T21:20:00+02:00');
  ok(await fr.evaluate(() => !!document.getElementById('cl-pas')),
     'la clôture du soir porte un champ « Pas du jour »');
  const cible = await fr.evaluate(() => window.__bcPasCible());
  ok(cible === 8000, 'la cible est lue DANS le libellé de l\'habitude, pas écrite deux fois (' + cible + ')');

  const coche = () => fr.evaluate(() => ((JSON.parse(localStorage.getItem('batcave-habitlog')) || {})['core-marche'] || []).indexOf('2026-09-23') > -1);
  ok(!(await coche()), 'au départ la case Marche n\'est pas cochée');
  await fr.evaluate(() => window.__bcAccorderMarche(9200));
  await page.waitForTimeout(200);
  ok(await coche(), '9 200 pas → la case se coche toute seule');
  await fr.evaluate(() => window.__bcAccorderMarche(4000));
  await page.waitForTimeout(200);
  ok(!(await coche()), 'corrigé à 4 000 → elle se décoche : le chiffre fait foi');
  /* Et elle ne doit pas basculer deux fois si on resaisit la meme valeur. */
  await fr.evaluate(() => { window.__bcAccorderMarche(9000); window.__bcAccorderMarche(9000); });
  await page.waitForTimeout(200);
  ok(await coche(), 'saisir deux fois la même valeur ne fait pas rebasculer la case');
  await ctx.close();
}
{
  /* La cible suit le libelle : s'il la passe a 12 000, le seuil suit. C'est ce qui evite
     qu'un chiffre vive a deux endroits. */
  const sien = {'batcave-habits': [{id:'core-marche', label:'Marche — 12 000 pas', icon:'\ud83d\udeb6'}],
    'batcave-marche-cible-v1': true,
    'batcave-habits-seed-v2':true,'batcave-habits-seed-v3':true,'batcave-habits-seed-v4':true,
    'batcave-habits-seed-v5':true,'batcave-habits-seed-v6':true,'batcave-habits-seed-v7':true,
    'batcave-habits-seed-v8':true};
  const { ctx, fr } = await ouvrir('2026-09-23T21:20:00+02:00', sien);
  const c = await fr.evaluate(() => window.__bcPasCible());
  ok(c === 12000, 'libellé à 12 000 → le seuil vaut 12 000 (' + c + ')');
  await ctx.close();
}
{
  /* La ligne du Bilan : une moyenne par jour, sur les jours qui portent un chiffre. */
  const seed = {
    'batcave-journal-2026-09-21': {pas: 9000}, 'batcave-journal-2026-09-22': {pas: 7000},
    'batcave-journal-2026-09-23': {pas: 8000}
  };
  const { ctx, page, fr } = await ouvrir('2026-09-23T21:20:00+02:00', seed);
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="bilan"]').click(); });
  await page.waitForTimeout(500);
  const t = await fr.evaluate(() => document.getElementById('bilan-grid').innerText);
  ok(/Pas \/ jour/.test(t), 'le Bilan porte une ligne « Pas / jour »');
  const ligne = (t.match(/Pas \/ jour[^]{0,40}/) || [''])[0].replace(/\n/g, ' ');
  ok(/8[\s\u202f\u00a0]000/.test(ligne), 'avec la moyenne des trois jours saisis, 8 000 (' + ligne + ')');
  /* Un nombre de pas n'a pas de decimale : « 8000,0 » se lit comme une erreur de calcul. */
  ok(!/8000,0/.test(ligne), 'et sans décimale — un nombre de pas est un entier');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ECHEC(S)' : '\nTOUT EST VERT');
process.exit(err ? 1 : 0);
