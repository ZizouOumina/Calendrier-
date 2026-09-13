/* Le lot du 12 septembre au soir : le dimanche devient le jour d'entretien.
   Ce que ce fichier garde :
   - les habitudes RETIREES ne reviennent pas, meme rapportees par la synchro cloud ;
   - le cycle de N semaines tombe sur les bonnes dates, ancre comprise ;
   - la serie et le taux d'une habitude a cycle ne comptent QUE les jours dus -- sans ca,
     une coupe de cheveux d'une semaine sur trois se lisait « ratee » deux samedis sur trois ;
   - les mensurations ont bien disparu partout ;
   - et aucune banniere d'incoherence ne s'allume au demarrage, ce qui etait le symptome
     quand un semis listait encore une habitude retiree. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

async function jour(quand, local){
  const ctx = await b.newContext({viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(seed => {
    window.claude = undefined;
    Object.keys(seed || {}).forEach(k => localStorage.setItem(k, JSON.stringify(seed[k])));
    window.__w = [];
    const vrai = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v){ window.__w.push(k); return vrai.call(this, k, v); };
  }, local || {});
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + quand + ' : ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const ids = fr => fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-habits') || '[]').map(h => h.id));
const duJour = fr => fr.evaluate(() => [...document.querySelectorAll('#dash-checklist li label')].map(x => x.textContent));

console.log('\n== 301) Installation neuve : les retirees ne sont jamais semees ==');
{
  const { ctx, fr } = await jour('2026-09-20T09:00:00+02:00');
  const l = await ids(fr);
  ok(!l.includes('core-gratitude') && !l.includes('core-pesee') && !l.includes('core-photos'),
     'ni gratitude, ni pesée du lundi, ni photos de quinzaine');
  ok(l.includes('core-pesee-dim') && l.includes('core-photos-dim') && l.includes('core-cheveux')
     && l.includes('core-rasage') && l.includes('core-brosse-dents') && l.includes('core-shampoing')
     && l.includes('core-serviette-visage') && l.includes('core-serviette-corps')
     && l.includes('core-draps') && l.includes('core-menage') && l.includes('core-ongles'),
     'les onze nouvelles sont là (' + l.length + ' habitudes au total)');
  await ctx.close();
}

console.log('\n== 302) Une liste venue du cloud avec les retirees est nettoyée, une seule fois ==');
{
  const sale = [{id:'core-lit', label:'Lit fait', icon:'🛏️'},
                {id:'core-gratitude', label:'3 choses', icon:'🙏'},
                {id:'core-pesee', label:'Pesée du lundi, à jeun', icon:'⚖️', jours:[1]}];
  const { ctx, fr } = await jour('2026-09-21T09:00:00+02:00', {
    'batcave-habits': sale, 'batcave-habits-seed-v2': true, 'batcave-habits-seed-v3': true,
    'batcave-habits-seed-v4': true, 'batcave-habits-seed-v5': true, 'batcave-habits-seed-v6': true, 'batcave-habits-seed-v7': true });
  const l = await ids(fr);
  ok(!l.includes('core-gratitude') && !l.includes('core-pesee') && l.includes('core-lit'),
     'les deux retirées sont parties, le reste est intact (' + l.join(', ') + ')');
  const n = await fr.evaluate(() => window.__w.filter(k => k === 'batcave-habits').length);
  ok(n === 1, 'une seule réécriture de batcave-habits, pas une par appel (' + n + ')');
  await ctx.close();
}

console.log('\n== 303) Un cloud déjà propre ne déclenche aucune réécriture ==');
{
  const propre = [{id:'core-lit', label:'Lit fait', icon:'🛏️'},
                  {id:'core-pesee-dim', label:'Pesée du dimanche, à jeun', icon:'⚖️', jours:[0]}];
  const { ctx, fr } = await jour('2026-09-21T09:00:00+02:00', {
    'batcave-habits': propre, 'batcave-habits-seed-v2': true, 'batcave-habits-seed-v3': true,
    'batcave-habits-seed-v4': true, 'batcave-habits-seed-v5': true, 'batcave-habits-seed-v6': true, 'batcave-habits-seed-v7': true });
  const n = await fr.evaluate(() => window.__w.filter(k => k === 'batcave-habits').length);
  ok(n === 0, 'aucune écriture (' + n + ')');
  await ctx.close();
}

console.log('\n== 304) La coupe de cheveux : le SAMEDI, une semaine sur trois ==');
/* Le coiffeur est ferme le dimanche. Coupe le samedi 12 septembre, donc due le 3 octobre,
   puis le 24, puis le 14 novembre. Avant l'ancre, elle ne s'affiche pas du tout : rien n'est
   « en retard » avant d'exister. */
for (const [d, nom, du] of [['2026-09-19','sam. 19 sept (avant l\'ancre)',false],
                            ['2026-09-26','sam. 26 sept',false],
                            ['2026-10-03','sam. 3 oct',true],
                            ['2026-10-10','sam. 10 oct',false],
                            ['2026-10-17','sam. 17 oct',false],
                            ['2026-10-24','sam. 24 oct',true],
                            ['2026-11-14','sam. 14 nov',true],
                            ['2026-10-04','dim. 4 oct (pas un samedi)',false]]) {
  const { ctx, fr } = await jour(d + 'T09:00:00+02:00');
  const l = await duJour(fr);
  ok(l.some(t => /Coupe de cheveux/.test(t)) === du, nom + ' : coupe ' + (du ? 'due' : 'pas due'));
  await ctx.close();
}

console.log('\n== 305) La brosse à dents : douze semaines ==');
for (const [d, nom, du] of [['2026-09-13','dim. 13 sept (la première)',true],
                            ['2026-09-20','dim. 20 sept',false],
                            ['2026-12-06','dim. 6 déc',true],
                            ['2026-12-13','dim. 13 déc',false]]) {
  const { ctx, fr } = await jour(d + 'T09:00:00+02:00');
  const l = await duJour(fr);
  ok(l.some(t => /Brosse à dents/.test(t)) === du, nom + ' : brosse ' + (du ? 'due' : 'pas due'));
  await ctx.close();
}

console.log('\n== 305b) Pesée un dimanche sur deux, photos une fois sur quatre ==');
/* Les deux sont ancrees au 13 septembre, donc une seance photo tombe TOUJOURS un dimanche de
   pesee, jamais l'inverse. Quatre semaines pour les photos parce que la seance sert a deux
   suivis lents : l'acne se juge sur douze semaines, et un corps qui prend un kilo par mois ne
   se voit pas a quinze jours d'ecart.
   Le shampoing, lui, tombe les quatre jours de sport : lundi, mardi, jeudi, samedi. */
for (const [d, nom, pesee, photos, shamp] of [['2026-09-13','dim. 13 sept',true,true,false],
                                              ['2026-09-20','dim. 20 sept',false,false,false],
                                              ['2026-09-27','dim. 27 sept',true,false,false],
                                              ['2026-10-04','dim. 4 oct',false,false,false],
                                              ['2026-10-11','dim. 11 oct',true,true,false],
                                              ['2026-10-25','dim. 25 oct',true,false,false],
                                              ['2026-11-08','dim. 8 nov',true,true,false],
                                              ['2026-12-06','dim. 6 déc',true,true,false],
                                              ['2026-09-14','lun. 14 (sport)',false,false,true],
                                              ['2026-09-15','mar. 15 (sport)',false,false,true],
                                              ['2026-09-16','mer. 16 (repos)',false,false,false],
                                              ['2026-09-17','jeu. 17 (sport)',false,false,true],
                                              ['2026-09-18','ven. 18 (repos)',false,false,false],
                                              ['2026-09-19','sam. 19 (sport)',false,false,true]]) {
  const { ctx, fr } = await jour(d + 'T09:00:00+02:00');
  const l = await duJour(fr);
  const p = l.some(t => /Photos/.test(t)), pe = l.some(t => /Pesée/.test(t)),
        sh = l.some(t => /Shampoing/.test(t));
  ok(pe === pesee && p === photos && sh === shamp,
     nom + ' : pesée ' + pe + ' · photos ' + p + ' · shampoing ' + sh);
  /* une photo sans pesee le meme matin serait une erreur d'ancrage */
  if(p) ok(pe, nom + ' : la séance photo tombe bien un dimanche de pesée');
  await ctx.close();
}

console.log('\n== 305c) Les ongles : un dimanche sur deux, et les pieds les dimanches de photo ==');
/* Une seule ligne, ancree au 13 septembre comme la pesee -- donc les MEMES dimanches qu'elle.
   Les pieds n'ont pas leur propre habitude : le libelle dit qu'ils tombent les dimanches de
   photo, et comme les photos sont un cycle de quatre semaines sur la meme ancre, un dimanche
   de photo est toujours un dimanche d'ongles. C'est cette implication-la qu'on verrouille
   ici : si quelqu'un deplace une des deux ancres, le libelle devient un mensonge. */
for (const [d, nom, du] of [['2026-09-13','dim. 13 sept',true],
                            ['2026-09-20','dim. 20 sept',false],
                            ['2026-09-27','dim. 27 sept',true],
                            ['2026-10-04','dim. 4 oct',false],
                            ['2026-10-11','dim. 11 oct',true],
                            ['2026-11-08','dim. 8 nov',true],
                            ['2026-12-06','dim. 6 déc',true],
                            ['2026-09-14','lun. 14',false],
                            ['2026-09-19','sam. 19',false]]) {
  const { ctx, fr } = await jour(d + 'T09:00:00+02:00');
  const l = await duJour(fr);
  const on = l.some(t => /Ongles/.test(t)), ph = l.some(t => /Photos/.test(t)),
        pe = l.some(t => /Pesée/.test(t));
  ok(on === du, nom + ' : ongles ' + on + ' (' + du + ' attendu)');
  ok(on === pe, nom + ' : les ongles tombent exactement les dimanches de pesée');
  /* le libelle promet « pieds les dimanches de photo » : une photo sans ongles le rendrait faux */
  if(ph) ok(on, nom + ' : jour de photo, donc jour d\'ongles — les pieds ont bien une case');
  await ctx.close();
}
{
  const { ctx, fr } = await jour('2026-09-13T09:00:00+02:00');
  const t = (await duJour(fr)).find(x => /Ongles/.test(x)) || '';
  ok(/mains/.test(t) && /pieds les dimanches de photo/.test(t),
     'le libellé porte la règle : « ' + t.trim() + ' »');
  await ctx.close();
}

console.log('\n== 306) Série et taux ne comptent que les jours dus ==');
{
  /* Deux coupes tenues, le 4 et le 25 octobre. Les dimanches intermediaires ne sont pas des
     echecs : la serie doit valoir 2 et le taux 100 %, pas 2 sur 4. */
  const log = {'core-cheveux': ['2026-10-03','2026-10-24']};
  const { ctx, fr } = await jour('2026-10-24T20:00:00+02:00', {'batcave-habitlog': log});
  const r = await fr.evaluate(() => ({
    serie: window.__bcHabitStreak ? window.__bcHabitStreak('core-cheveux') : null,
    taux: window.__bcHabitRate ? window.__bcHabitRate('core-cheveux', 30) : null
  }));
  if(r.serie === null){
    const carte = await fr.evaluate(() => {
      document.querySelector('.nav-btn[data-page="habitudes"]').click();
      return [...document.querySelectorAll('#habits-grid .card')]
        .map(c => c.innerText.replace(/\s+/g, ' ')).filter(t => /Coupe de cheveux/.test(t))[0] || '';
    });
    /* La carte porte la serie et les deux taux. Un cycle mal compte donnerait « 30j 50% »
       (2 tenues sur 4 dimanches) et une serie cassee a 1. */
    ok(/2 JOURS D.AFFIL/i.test(carte) && /7j 100%/.test(carte) && /30j 100%/.test(carte),
       'série 2, taux 7j et 30j à 100 % (' + carte.slice(0, 110) + ')');
  } else {
    ok(r.serie === 2, 'série = 2, les dimanches non dus ne la cassent pas (' + r.serie + ')');
    ok(r.taux === 100, 'taux = 100 %, on ne divise que par les jours dus (' + r.taux + ')');
  }
  await ctx.close();
}

console.log('\n== 306b) La balance énergétique voit les pesées d\'il y a plus d\'un mois ==');
/* Le piege : la carte lisait les pesees sur 28 JOURS et en exigeait quatre. Avec une pesee
   tous les quinze jours il n'en existe que deux sur 28 jours — la carte ne se serait jamais
   allumee, pas une fois en six mois, et rien ne l'aurait signale. Sa fenetre de PESEES est
   passee a 84 jours, celle des REPAS reste a 28 (une moyenne calorique vieille de trois mois
   ne dit plus ce qu'on mange). Ce test compte ce que la carte voit : quatre pesees espacees
   de quinze jours, dont deux au-dela de 28 jours. */
{
  const j = {};
  [0, 14, 28, 42].forEach(n => {
    const d = new Date('2026-11-15T12:00:00Z'); d.setDate(d.getDate() - n);
    j['batcave-journal-' + d.toISOString().slice(0, 10)] = {poids: 64 + n * 0.03, water: 0};
  });
  const { ctx, fr } = await jour('2026-11-15T09:00:00+01:00', j);
  const txt = await fr.evaluate(() => {
    const c = window.__bcInsights().filter(i => /Balance énergétique/.test(i.title))[0];
    return c ? c.text : '';
  });
  const n = (txt.match(/(\d+) pesées/) || [])[1];
  ok(n === '4', 'les quatre pesées sont vues, celles de 28 et 42 jours comprises (' + n + ' — « ' + txt.slice(0, 95) + ' »)');
  ok(/4 pesées sur 12 semaines/.test(txt), 'et le message annonce la bonne fenêtre');
  await ctx.close();
}

console.log('\n== 307) Les mensurations ont disparu ==');
{
  const { ctx, fr, page } = await jour('2026-10-01T09:00:00+02:00');
  const plan = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(!/Mensuration/i.test(plan), 'plus de rappel dans le plan du jour');
  const sport = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="sport"]').click();
    return { panneau: !!document.getElementById('mesures-panel'), champ: !!document.getElementById('ms-cou'),
             txt: document.querySelector('section.page[data-page="sport"]').innerText };
  });
  ok(!sport.panneau && !sport.champ, 'plus de panneau ni de champ dans l\'onglet Sport');
  ok(!/Mensuration/i.test(sport.txt), 'le mot n\'apparaît plus dans l\'onglet');
  const cle = await fr.evaluate(() => Object.keys(localStorage).filter(k => /mesures/.test(k)));
  ok(cle.length === 0, 'aucune clé « mesures » écrite (' + JSON.stringify(cle) + ')');
  await ctx.close();
}

console.log('\n== 308) Le ménage du dimanche : dans la grille, donc dans l\'agenda ==');
{
  const { ctx, fr } = await jour('2026-10-11T09:00:00+02:00');
  const r = await fr.evaluate(() => {
    const g = window.__bcGrilleBase ? window.__bcGrilleBase('weekend', '2026-10-11') : [];
    const i = g.findIndex(x => /Ménage/.test(x[1]));
    return { heure: i > -1 ? g[i][0] : null, suivant: i > -1 && g[i+1] ? g[i+1].join(' ') : null,
             rappels: (window.__bcBlocsARappeler ? window.__bcBlocsARappeler('2026-10-11') : []).map(x => x.titre || x[1] || '') };
  });
  ok(r.heure === '16:30', 'le ménage est à 16:30 (' + r.heure + ')');
  ok(/^17:30 Repos/.test(r.suivant || ''), 'le repos suit à 17:30 (' + r.suivant + ')');
  await ctx.close();
}

console.log('\n== 309) Aucune bannière d\'incohérence au démarrage ==');
for (const d of ['2026-09-14','2026-09-20','2026-10-04','2026-12-13']) {
  const { ctx, fr } = await jour(d + 'T09:00:00+02:00');
  const banniere = await fr.evaluate(() => {
    const e = document.getElementById('coherence-banner');
    return e && !e.hidden && e.offsetHeight > 0 ? e.innerText.replace(/\s+/g, ' ') : '';
  });
  ok(banniere === '', d + ' : rien à signaler' + (banniere ? ' — ' + banniere.slice(0, 110) : ''));
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
