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
  /* 16 novembre : la routine est sans case chez lui ; ce test vérifie les dates des habitudes à rythme, lues dans les cases -- la routine y reste en cases (drapeau posé) */
  await ctx.addInitScript(x => { window.claude = undefined; localStorage.setItem('batcave-sans-case-v1', 'true');
    if(x) Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed || null);
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR : ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:25000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="journee"]').click(); });   /* 17 novembre : l'onglet Habitudes est retiré */
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}
/* 17 novembre : l'onglet Habitudes, ses cartes et leur « prochaine fois le … » sont retirés. La date se vérifie à la
   source -- le premier jour où la case tombe (habitsDuJour, ce que « Ma journée » affiche) -- et dans « Ma journée ». */
const prochaine = (fr, motif, debut) => fr.evaluate(([m, d]) => {
  for(let i = 0; i < 400; i++){ const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + i);
    const iso = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    if(window.__bcHabitsDuJour(x.getDay(), iso).some(h => new RegExp(m).test(h.label))) return iso; }
  return null; }, [motif, debut]);
const habit = (fr, id) => fr.evaluate(x => (JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habits')) || []).filter(h => h && h.id === x)[0] || null, id);
const journee = (fr, iso) => fr.evaluate(x => { window.__bcJournee.aller(x); return [...document.querySelectorAll('#mj-cases li, #mj-routine li')].map(l => l.textContent.replace(/^✓ /, '')); }, iso);
const chaqueDimanche = h => !!h && JSON.stringify(h.jours) === '[0]' && !(h.cycleSemaines > 1);
const ancres = fr => fr.evaluate(() => {
  const o = {};
  (JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habits')) || []).forEach(h => { if(h && h.ancre) o[h.id] = h.ancre; });
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

/* 28 septembre au soir, « tout commence demain » : le jour 1 passe au mardi 29 et l'ancre du
   dimanche au 4 OCTOBRE, premier dimanche du programme -- la meme raison qu'au 19 : la photo
   et la pesee du point de depart doivent tomber au depart. Une seconde migration
   (ancre-dimanche-v2) reecrit les ancres deja enregistrees au 20 (les siennes). */
/* 11 novembre, la nuit : le jour 1 est le jeudi 12 novembre, et l'ancre du dimanche passe au 15, premier dimanche
   du programme -- toujours la meme raison. Une troisieme migration (ancre-dimanche-v3) reecrit les ancres deja
   enregistrees au 4 octobre (les siennes). Les photos : 15 novembre, 13 decembre, 10 janvier, 7 fevrier -- le
   dimanche du bilan peau. */
console.log('\n== 331) Départ neuf : les habitudes à cycle du dimanche partent du 22 novembre ==');
{
  const { ctx, fr } = await ouvrir('2026-09-29T08:00:00+02:00');
  const ph = await prochaine(fr, 'Photos', '2026-09-29');
  ok(ph === '2026-11-22', 'photos : dimanche 22 novembre — l\'image du point de départ existe (' + ph + ')');
  /* 21 octobre au soir : la pesee tombe chaque dimanche, sans cycle */
  ok(chaqueDimanche(await habit(fr, 'core-pesee-dim')), 'pesée : chaque dimanche');
  ok(await prochaine(fr, 'Ongles', '2026-09-29') === '2026-11-22', 'ongles : le 22 aussi');
  ok(await prochaine(fr, 'Brosse à dents', '2026-09-29') === '2026-11-22', 'brosse à dents : le 22 aussi');
  const a = await ancres(fr);
  ok(!a['core-pesee-dim'] && a['core-photos-dim'] === '2026-11-22'
     && a['core-ongles'] === '2026-11-22' && a['core-brosse-dents'] === '2026-11-22',
     'la pesée n\'a plus d\'ancre (chaque dimanche depuis le 21 octobre), les trois autres valent 2026-11-22 dans le stockage');
  /* La coupe de cheveux a sa propre ancre (un samedi) : elle ne doit pas etre emportee. */
  ok(a['core-cheveux'] === '2026-10-31', 'la coupe de cheveux a sa propre ancre, un samedi : le 31 octobre depuis le 30 septembre (coiffeur sauté ce mois-ci) (' + a['core-cheveux'] + ')');
  await ctx.close();
}

console.log('\n== 332) Une Batcave déjà enregistrée est migrée au chargement ==');
{
  /* Le cas le plus ancien : des ancres au 13. */
  const { ctx, fr } = await ouvrir('2026-09-29T08:00:00+02:00', AVANT);
  const a = await ancres(fr);
  ok(!a['core-pesee-dim'] && a['core-photos-dim'] === '2026-11-22'
     && a['core-ongles'] === '2026-11-22' && a['core-brosse-dents'] === '2026-11-22',
     'les trois ancres du 13 ont été réécrites au 22 novembre, la pesée a perdu la sienne (chaque dimanche)');
  ok(a['core-cheveux'] === '2026-10-31', 'et celle qui n\'était pas au 13 suit sa propre migration : le 3 octobre passe au 31 (coiffeur sauté)');
  ok((await journee(fr, '2026-11-22')).some(t => /Photos/.test(t)), '« Ma journée » du 22 novembre dit la même chose que le stockage : les photos');
  await ctx.close();
}
{
  /* Le cas qui compte : la SIENNE, deja migree au 20 par la v1. */
  const sienne = JSON.parse(JSON.stringify(AVANT));
  sienne['batcave-habits'].forEach(h => { if(h.ancre === '2026-09-13') h.ancre = '2026-09-20'; });
  sienne['batcave-ancre-dimanche-v1'] = true;
  const { ctx, fr } = await ouvrir('2026-09-29T08:00:00+02:00', sienne);
  const a = await ancres(fr);
  ok(!a['core-pesee-dim'] && a['core-photos-dim'] === '2026-11-22'
     && a['core-ongles'] === '2026-11-22' && a['core-brosse-dents'] === '2026-11-22' && a['core-cheveux'] === '2026-10-31',
     'des ancres au 20 septembre passent au 22 novembre, la coupe va au 31 octobre (' + JSON.stringify(a) + ')');
  await ctx.close();
}
{
  /* Le cas qui compte aujourd'hui : la SIENNE, au 4 octobre depuis la v2, ouverte le matin du jour 1. Les trois
     ancres passent au 22 novembre (v3) ; la coupe de cheveux garde la sienne ; une ancre posee a la main ailleurs
     (ici les ongles, decales d'une semaine) ne bouge pas. */
  const sienne = JSON.parse(JSON.stringify(AVANT));
  sienne['batcave-habits'].forEach(h => { if(h.ancre === '2026-09-13') h.ancre = '2026-10-04'; if(h.id === 'core-pesee-dim'){ delete h.cycleSemaines; delete h.ancre; } if(h.id === 'core-cheveux') h.ancre = '2026-10-31'; });
  sienne['batcave-ancre-dimanche-v1'] = true; sienne['batcave-ancre-dimanche-v2'] = true; sienne['batcave-pesee-hebdo-v1'] = true;
  const { ctx, fr } = await ouvrir('2026-11-12T05:25:00+01:00', sienne);
  const a = await ancres(fr);
  ok(a['core-photos-dim'] === '2026-11-22' && a['core-ongles'] === '2026-11-22' && a['core-brosse-dents'] === '2026-11-22' && a['core-cheveux'] === '2026-10-31',
     'le matin du jour 1 : ses trois ancres du 4 octobre passent au dimanche 22 novembre, la coupe reste au 31 octobre (' + JSON.stringify(a) + ')');
  ok(await prochaine(fr, 'Photos', '2026-11-12') === '2026-11-22', 'et les photos tombent le 22 novembre');
  ok(await fr.evaluate(() => (window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-ancre-dimanche-v3')) === 'true', 'le drapeau de la v3 est posé');
  await ctx.close();
  const main = JSON.parse(JSON.stringify(sienne));
  main['batcave-habits'].forEach(h => { if(h.id === 'core-ongles') h.ancre = '2026-10-11'; });
  const b2 = await ouvrir('2026-11-12T05:25:00+01:00', main);
  const a2 = await ancres(b2.fr);
  ok(a2['core-ongles'] === '2026-10-11' && a2['core-photos-dim'] === '2026-11-22', 'une ancre qu\'il a posée lui-même (les ongles au 11 octobre) ne bouge pas (' + JSON.stringify(a2) + ')');
  await b2.ctx.close();
}

console.log('\n== 333) La migration ne tourne qu\'une fois ==');
{
  /* Un mois plus tard il decide de decaler sa seance photo, a la main. Si la migration
     rejouait, elle ecraserait son choix au prochain demarrage : on verifie que les drapeaux
     sont poses, et qu'une ancre remise au 13 ou au 20 APRES coup survit. */
  /* 13 novembre : une ancre au 13 septembre n'est plus un choix possible -- c'est l'ancre d'origine de la Batcave, et
     SA sauvegarde du 11 la portait encore, drapeaux poses (v4, plus bas). Le choix a la main se lit sur une autre date. */
  const apres = JSON.parse(JSON.stringify(AVANT));
  apres['batcave-habits'].forEach(h => { if(h.id === 'core-photos-dim') h.ancre = '2026-10-11'; });
  apres['batcave-ancre-dimanche-v1'] = true;
  apres['batcave-ancre-dimanche-v2'] = true;
  const { ctx, fr } = await ouvrir('2026-10-18T08:00:00+02:00', apres);
  const a = await ancres(fr);
  ok(a['core-photos-dim'] === '2026-10-11',
     'les drapeaux posés, une ancre posée à la main (le 11 octobre) est laissée telle quelle — c\'est son choix (' + a['core-photos-dim'] + ')');
  await ctx.close();
}
{
  /* 13 novembre, SA sauvegarde du 11 : les trois ancres au 13 septembre, les drapeaux v1, v2 et v3 poses -- une synchro
     ou une restauration avait remis les anciennes ancres apres eux. Ni photos, ni brosse, ni ongles le dimanche 15, et
     les photos le 6 decembre. La v4 reprend toutes les ancres posees par la Batcave (13 et 20 septembre, 4 octobre). */
  const sienne = JSON.parse(JSON.stringify(AVANT));
  sienne['batcave-habits'].forEach(h => { if(h.id === 'core-pesee-dim'){ delete h.cycleSemaines; delete h.ancre; } if(h.id === 'core-cheveux') h.ancre = '2026-10-31'; });
  sienne['batcave-ancre-dimanche-v1'] = true; sienne['batcave-ancre-dimanche-v2'] = true; sienne['batcave-ancre-dimanche-v3'] = true; sienne['batcave-pesee-hebdo-v1'] = true;
  const { ctx, fr } = await ouvrir('2026-11-13T21:00:00+01:00', sienne);
  const a = await ancres(fr);
  ok(a['core-photos-dim'] === '2026-11-22' && a['core-ongles'] === '2026-11-22' && a['core-brosse-dents'] === '2026-11-22' && a['core-cheveux'] === '2026-10-31',
     'ses trois ancres du 13 septembre passent au dimanche 22 novembre, la coupe reste au 31 octobre (' + JSON.stringify(a) + ')');
  const j22 = await journee(fr, '2026-11-22');
  ok(['Photos', 'Brosse à dents', 'Ongles'].every(m => j22.some(t => t.indexOf(m) > -1)) && await prochaine(fr, 'Photos', '2026-11-13') === '2026-11-22',
     'photos, brosse et ongles dans « Ma journée » du dimanche 22, pas avant');
  ok(await fr.evaluate(() => (window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-ancre-dimanche-v4')) === 'true', 'le drapeau de la v4 est posé');
  await ctx.close();
}
{
  /* 15 novembre, « recale tout sur lundi » : SON etat en ligne du 14 au soir -- les trois ancres au 15 novembre (la v4 faite),
     les drapeaux v1 a v4 poses. Le jour 1 passe au lundi 16 : la v5 les porte au dimanche 22, premier dimanche du programme.
     Une ancre posee a la main ailleurs ne bouge pas. */
  const sienne = JSON.parse(JSON.stringify(AVANT));
  sienne['batcave-habits'].forEach(h => { if(h.id === 'core-pesee-dim'){ delete h.cycleSemaines; delete h.ancre; } else if(h.id === 'core-cheveux') h.ancre = '2026-10-31'; else if(h.ancre) h.ancre = '2026-11-15'; });
  ['v1','v2','v3','v4'].forEach(v => { sienne['batcave-ancre-dimanche-' + v] = true; }); sienne['batcave-pesee-hebdo-v1'] = true;
  const { ctx, fr } = await ouvrir('2026-11-15T09:00:00+01:00', sienne);
  const a = await ancres(fr);
  ok(a['core-photos-dim'] === '2026-11-22' && a['core-ongles'] === '2026-11-22' && a['core-brosse-dents'] === '2026-11-22' && a['core-cheveux'] === '2026-10-31',
     'v5 : ses trois ancres du 15 novembre passent au dimanche 22, la coupe reste au 31 octobre (' + JSON.stringify(a) + ')');
  const cases = await journee(fr, '2026-11-15');
  ok(!cases.some(t => /Photos|Brosse à dents|Ongles/.test(t)), 'et ce dimanche 15, veille du jour 1, ne réclame ni photos, ni brosse, ni ongles');
  ok(await fr.evaluate(() => (window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-ancre-dimanche-v5')) === 'true', 'le drapeau de la v5 est posé');
  await ctx.close();
  const main = JSON.parse(JSON.stringify(sienne));
  main['batcave-habits'].forEach(h => { if(h.id === 'core-ongles') h.ancre = '2026-11-29'; });
  const b2 = await ouvrir('2026-11-15T09:00:00+01:00', main);
  const a2 = await ancres(b2.fr);
  ok(a2['core-ongles'] === '2026-11-29' && a2['core-photos-dim'] === '2026-11-22', 'une ancre posée à la main (les ongles au 29) ne bouge pas (' + JSON.stringify(a2) + ')');
  await b2.ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-29T08:00:00+02:00', AVANT);
  const lire = k => fr.evaluate(k => (window.__bcLire || ((k) => localStorage.getItem(k)))(k), k);
  const v1 = await lire('batcave-ancre-dimanche-v1'), v2 = await lire('batcave-ancre-dimanche-v2'), v3 = await lire('batcave-ancre-dimanche-v3'), v4 = await lire('batcave-ancre-dimanche-v4'), v5 = await lire('batcave-ancre-dimanche-v5');
  ok(v1 === 'true' && v2 === 'true' && v3 === 'true' && v4 === 'true' && v5 === 'true', 'et la première ouverture pose bien les cinq drapeaux (' + v1 + ' / ' + v2 + ' / ' + v3 + ' / ' + v4 + ' / ' + v5 + ')');
  await ctx.close();
}

console.log('\n== 334) Le rythme reste le bon après le 22 novembre ==');
{
  const { ctx, fr } = await ouvrir('2026-11-23T08:00:00+01:00');
  /* 15 novembre, « recale tout sur lundi » : l'ancre au dimanche 22. 22 novembre + 4 semaines = 20 decembre (photos) ;
     + 12 semaines = 14 fevrier (brosse a dents, et le bilan peau). */
  ok(chaqueDimanche(await habit(fr, 'core-pesee-dim')), 'pesée : chaque dimanche, sans cycle');
  const p2 = await prochaine(fr, 'Photos', '2026-11-23'), b2 = await prochaine(fr, 'Brosse à dents', '2026-11-23');
  ok(p2 === '2026-12-20', 'photos le 20 décembre, quatre semaines après (' + p2 + ')');
  ok(b2 === '2027-02-14', 'brosse à dents le 14 février, douze semaines après (' + b2 + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-12-20T08:00:00+01:00');
  const j = await fr.evaluate(() => [...document.querySelectorAll('#mj-cases li, #mj-routine li')].map(l => l.textContent));
  ok(j.some(t => /Photos/.test(t)) && j.some(t => /Pesée/.test(t)), 'puis le 20 décembre — la photo tombe toujours un dimanche de pesée');
  await ctx.close();
}
{
  /* Le bilan peau des douze semaines tombe un dimanche de photos : la consigne « photos du jour, comparees a ta
     premiere serie » a ses deux series. 15 novembre : le 14 fevrier (BILAN_PEAU_ISO), plus le 7. */
  const { ctx, fr } = await ouvrir('2027-02-14T08:00:00+01:00');
  const v = await fr.evaluate(() => ({ plan: document.getElementById('dash-plan').innerText, cases: (window.__bcJournee.rendre(), [...document.querySelectorAll('#mj-cases li label, #mj-routine li label')].map(x => x.textContent)) }));
  ok(/Bilan peau des 12 semaines/.test(v.plan) && v.cases.some(t => /Photos/.test(t)), 'dimanche 14 février : le bilan peau, et les photos sont une case du jour');
  await ctx.close();
}

console.log('\n== 335-336) La marche est retirée (le tri du 17 novembre) : les pas ne se notent plus, et rien ne coche ==');
{
  const { ctx, fr } = await ouvrir('2026-09-21T08:00:00+02:00');
  ok(!(await habit(fr, 'core-marche')), 'installation neuve : pas de case « Marche »');
  await ctx.close();
}
for(const label of ['Marche / pas', 'Marche — 12 000 pas']){
  /* l'ancien libellé comme le sien : la case sort par son identifiant, quel que soit son nom */
  const vieux = {'batcave-habits': [{id:'core-marche', label: label, icon:'\ud83d\udeb6'}],
    'batcave-habits-seed-v2':true,'batcave-habits-seed-v3':true,'batcave-habits-seed-v4':true,
    'batcave-habits-seed-v5':true,'batcave-habits-seed-v6':true,'batcave-habits-seed-v7':true,
    'batcave-habits-seed-v8':true};
  const { ctx, fr } = await ouvrir('2026-09-21T08:00:00+02:00', vieux);
  ok(!(await habit(fr, 'core-marche')), 'une Batcave enregistrée avec « ' + label + ' » la perd au chargement');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-23T21:20:00+02:00');
  ok(await fr.evaluate(() => !!document.getElementById('cl-pas') && document.getElementById('cl-pas').closest('[hidden]') !== null),
     'le champ « Pas du jour » reste dans la clôture, masqué');
  ok(await fr.evaluate(() => typeof window.__bcPasCible === 'undefined' && typeof window.__bcAccorderMarche === 'undefined'), 'et plus rien ne coche une case depuis les pas');
  await ctx.close();
}
{
  const seed = {
    'batcave-journal-2026-09-21': {pas: 9000}, 'batcave-journal-2026-09-22': {pas: 7000},
    'batcave-journal-2026-09-23': {pas: 8000}
  };
  const { ctx, page, fr } = await ouvrir('2026-09-23T21:20:00+02:00', seed);
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="bilan"]').click(); });
  await page.waitForTimeout(500);
  const t = await fr.evaluate(() => document.getElementById('bilan-grid').innerText);
  /* 16 novembre, sa décision : les pas ne se notent plus -- la ligne « Pas / jour » sort du Bilan */
  ok(!/Pas \/ jour/.test(t), 'le Bilan ne porte plus de ligne « Pas / jour »');
  await ctx.close();
}

console.log('\n== 337) La taie d\u2019oreiller du mercredi ==');
{
  /* Sa question du 20 septembre : « le soir si je lave pas mes cheveux je vais salir mes
     tetes de coussin non ? ». Les cheveux, non -- les laver le soir serait pire, on se
     couche mouille. Mais la TAIE, oui : changee une seule fois par semaine (le dimanche,
     avec les draps), elle rend six nuits de sebum a une peau qui fait de l'acne. D'ou une
     seconde taie propre, le mercredi. */
  const { ctx, fr } = await ouvrir('2026-09-23T09:00:00+02:00');   /* un mercredi */
  const mer = await fr.evaluate(() => [...document.querySelectorAll('#mj-corps input[data-mj-hab]')].map(x => x.dataset.mjHab));
  ok(mer.includes('core-taie-merc'), 'le mercredi, elle est à cocher dans « Ma journée »');
  const h = await fr.evaluate(() => (JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habits')) || [])
    .filter(x => x && x.id === 'core-taie-merc'));
  ok(h.length === 1, 'une seule occurrence de core-taie-merc dans le stockage (' + h.length + ')');
  ok(h.length === 1 && JSON.stringify(h[0].jours) === '[3]', 'et elle ne vaut que le mercredi (' + JSON.stringify(h[0] && h[0].jours) + ')');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-24T09:00:00+02:00');   /* un jeudi */
  const jeu = await fr.evaluate(() => [...document.querySelectorAll('#mj-corps input[data-mj-hab]')].map(x => x.dataset.mjHab));
  ok(!jeu.includes('core-taie-merc'), 'le jeudi, elle n\'est pas dans « Ma journée »');
  await ctx.close();
}
{
  /* Le semis n'ajoute que les habitudes ABSENTES : une Batcave deja remplie la recoit
     sans rien perdre, et la banniere « cle inconnue » ne se leve pas sur la graine v9. */
  const { ctx, fr } = await ouvrir('2026-09-23T09:00:00+02:00', {'batcave-habits': [
    {id:'core-lit', label:'Lit fait', icon:'\ud83d\udecf\ufe0f'},
    {id:'core-draps', label:'Draps et taies d\u2019oreiller chang\u00e9s', icon:'\ud83e\uddfa', jours:[0]}
  ]});
  const ids = await fr.evaluate(() => (JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-habits')) || []).map(h => h.id));
  ok(ids.indexOf('core-taie-merc') > -1, 'ajoutee a une Batcave existante');
  ok(ids.indexOf('core-lit') > -1 && ids.indexOf('core-draps') > -1, 'sans toucher a celles deja la');
  const banniere = await fr.evaluate(() => /Cl\u00e9 inconnue du code/i.test(document.body.innerText));
  ok(!banniere, 'aucune banniere « cle inconnue » : la graine v9 est au registre');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ECHEC(S)' : '\nTOUT EST VERT');
process.exit(err ? 1 : 0);
