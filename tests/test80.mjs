/* Lot 31 — les quatre améliorations choisies, éprouvées sur des données fictives.
     1. Alfred répond aux QUESTIONS (« où j'en suis ? », « et après ? », « combien de
        cartes ? ») sans rien cocher ni rien lancer.
     4. Une séance de sport à moitié faite vaut une demi-séance dans l'objectif.
     6. La boucle poids → calories ne se laisse plus retourner par une seule pesée.
     7. Le mode partiels s'annonce une semaine avant de s'enclencher. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

const JOUR = '2026-09-14';                       /* lundi, jour 1 du programme */
async function ouvrir(seed, quand){
  const ctx = await b.newContext({viewport:{width:1440, height:1200}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(s => {
    window.claude = undefined;
    for(const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
  }, seed || {});
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + e.message); });
  await page.clock.install({time: new Date(quand || (JOUR + 'T18:00:00+02:00'))});
  await page.goto(URL, {timeout:20000}).catch(()=>{});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  await page.waitForTimeout(400);
  return {ctx, page, fr};
}
const aller = async (fr, page, p) => { await fr.evaluate(pg => document.querySelector('.nav-btn[data-page="'+pg+'"]').click(), p); await page.waitForTimeout(600); };
const plan = fr => fr.evaluate(() => document.getElementById('dash-plan').innerText);
const dit  = (fr, phrase) => fr.evaluate(p => window.__bcVoix.executer(p), phrase);
const journalPoids = (iso, kg) => ({['batcave-journal-' + iso]: {poids: kg, water: 0}});
const pesees = liste => Object.assign({}, ...liste.map(([iso, kg]) => journalPoids(iso, kg)));
const jours = (debut, n) => { const out = []; const d = new Date(debut + 'T00:00:00'); for(let i = 0; i < n; i++){ out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate() + 1); } return out; };

console.log('\n== 1) Alfred répond aux questions ==');
{
  /* une séance de révision et une d'espagnol déjà faites, trois exercices de sport cochés */
  const seed = {
    'batcave-sessions': [
      {id:'q1', date:JOUR, debut:0, fin:0, duree:110, type:'cours',  label:'Anatomie'},
      {id:'q2', date:JOUR, debut:0, fin:0, duree:60,  type:'projet', label:'Español · Conversación'}
    ],
    ['batcave-sport-' + JOUR]: {'Haut lourd-0':true, 'Haut lourd-1':true, 'Haut lourd-2':true},
    'batcave-anki': {paquets: {'Dentaire': {dus:42}, 'Español': {dus:8}}, maj: Date.now()}
  };
  const {ctx, fr} = await ouvrir(seed);
  const r = await fr.evaluate(() => ({
    bilan:   window.__bcVoix.executer('Alfred, où j’en suis ?'),
    bilan2:  window.__bcVoix.executer('alfred fais le point'),
    suite:   window.__bcVoix.executer('Alfred, c’est quoi la suite ?'),
    cartes:  window.__bcVoix.executer('Alfred, combien de cartes dues ?'),
    inconnu: window.__bcVoix.executer('Alfred, quelle est la capitale du Pérou')
  }));
  ok(/^Aujourd'hui, Monsieur : /.test(r.bilan), 'Alfred lit la journée : « ' + String(r.bilan) + ' »');
  ok(/1 heure 50/.test(r.bilan), 'les 110 min de révision sont dites en toutes lettres, pas « 1 h 50 » : ' + (String(r.bilan).match(/révision[^,]*/) || [''])[0]);
  ok(/révision 1 heure 50 sur 4 heures 25, il reste 2 heures 35/.test(r.bilan), 'fait, cible et reste, tous les trois : ' + (String(r.bilan).match(/révision[^,]*, [^,]*/) || [''])[0]);
  ok(/séance 3 sur 10 exercices/.test(r.bilan), 'la séance du jour est comptée en exercices : ' + (String(r.bilan).match(/séance[^,.]*/) || [''])[0]);
  ok(/espagnol 1 heure sur /.test(r.bilan) && !/projets perso 1 heure/.test(r.bilan), 'l’heure d’Español est dite en espagnol, pas en projets perso : ' + (String(r.bilan).match(/projets perso[^,]*, espagnol[^,]*/) || [''])[0]);
  ok(/0 pour cent des calories/.test(r.bilan), 'et les calories du jour : ' + (String(r.bilan).match(/[\d]+ pour cent des calories/) || [''])[0]);
  ok(r.bilan2 === r.bilan, '« fais le point » donne exactement la même réponse');
  ok(/^Prochain bloc, Monsieur : |^Plus rien au planning/.test(String(r.suite)), 'le prochain bloc : « ' + r.suite + ' »');
  ok(r.cartes === '50 cartes dues, Monsieur.', 'les cartes dues, tous paquets confondus (42 + 8) : « ' + r.cartes + ' »');
  ok(r.inconnu === null, 'une question hors sujet ne rend rien (elle sera dite « je n’ai pas compris »)');
  /* et surtout : une QUESTION ne change rien */
  const apres = await fr.evaluate(() => ({
    minuteur: !!(window.__bcVoix && document.getElementById('timer-overlay') && !document.getElementById('timer-overlay').hidden),
    repas: Object.keys(JSON.parse(localStorage.getItem('batcave-meals-' + '2026-09-14') || '{}')).length
  }));
  ok(apres.minuteur === false && apres.repas === 0, 'aucun minuteur lancé, aucun repas coché : une question ne fait que lire');
  await ctx.close();
}

console.log('\n== 2) « bilan du soir » reste la clôture, pas une question ==');
{
  const {ctx, fr} = await ouvrir();
  const r = await dit(fr, 'Alfred, bilan du soir');
  ok(r === 'La clôture du jour, Monsieur.', 'l’ordre garde la priorité sur la question : « ' + r + ' »');
  await ctx.close();
}

console.log('\n== 3) Une séance à moitié faite vaut une demi-séance ==');
{
  for(const [n, attendu, desc] of [[0,'0,0','aucune case'], [3,'0,3','3 sur 10'], [5,'0,5','5 sur 10, la moitié'], [10,'1,0','les 10']]){
    const st = {}; for(let i = 0; i < n; i++) st['Haut lourd-' + i] = true;
    const {ctx, page, fr} = await ouvrir({['batcave-sport-' + JOUR]: st});
    await aller(fr, page, 'objectifs');
    const o = await fr.evaluate(() => document.querySelector('section.page[data-page="objectifs"]').innerText);
    const m = o.match(/Séances de sport tenues[\s\S]{0,60}?réel\s*\n?([\d,]+) séances/);
    ok(m && m[1] === attendu, desc + ' → ' + (m ? m[1] : '?') + ' séance comptée (' + attendu + ' attendu)');
    await ctx.close();
  }
}

console.log('\n== 4) Une pesée salée ne fait plus retirer 100 kcal ==');
{
  /* Deux semaines de pesées : 7 jours à 64,0 puis 7 jours à 64,4 — SAUF un matin à 66,0.
     Moyenne brute des 7 derniers jours : 64,63 → +0,63 kg, soit plus de deux fois le
     rythme visé (0,23) → l'ancien calcul retirait 100 kcal pour un dîner salé. */
  const av = jours('2026-09-01', 7).map(iso => [iso, 64.0]);
  const rec = jours('2026-09-08', 7).map((iso, i) => [iso, i === 3 ? 66.0 : 64.4]);
  const {ctx, page, fr} = await ouvrir(pesees(av.concat(rec)));
  await aller(fr, page, 'repas');
  const k = await fr.evaluate(() => ({note: document.getElementById('kcal-note').innerText,
                                      txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' ')}));
  ok(!/-100/.test(k.note), 'la pesée à 66,0 kg ne déclenche plus de coupe : ' + k.note);
  ok(/rien à changer/.test(k.note), 'verdict : rien à changer (' + k.note + ')');
  ok(/Tendance : \+0,40 kg/.test(k.txt), 'tendance élaguée : +0,40 kg au lieu de +0,63 — ' + (k.txt.match(/Tendance[^.]*/) || [''])[0]);
  await ctx.close();
}
{
  /* Quand la tendance tient VRAIMENT à une seule pesée (4 pesées par semaine, donc pas
     d'élagage), Alfred ne recommande rien et dit laquelle. */
  const av = ['2026-09-01','2026-09-03','2026-09-05','2026-09-07'].map(iso => [iso, 64.0]);
  const rec = [['2026-09-08',64.4],['2026-09-10',64.4],['2026-09-12',64.4],['2026-09-14',66.0]];
  const {ctx, page, fr} = await ouvrir(pesees(av.concat(rec)));
  await aller(fr, page, 'repas');
  const k = await fr.evaluate(() => ({note: document.getElementById('kcal-note').innerText,
                                      txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' '),
                                      btn: document.getElementById('kcal-appliquer').hidden}));
  ok(/une seule pesée décide/.test(k.note), 'la note le dit : ' + k.note);
  ok(/sans celle du 14 sept/.test(k.txt) && /66,0 kg/.test(k.txt), 'et elle nomme la pesée en cause : ' + (k.txt.match(/Une seule pesée[^.]*\./) || [''])[0]);
  ok(k.btn === true, 'le bouton « Appliquer » reste masqué tant qu’une pesée de plus n’a pas tranché');
  await ctx.close();
}
{
  /* et une vraie prise franche passe toujours : 64,0 → 65,0, sept pesées de chaque côté */
  const av = jours('2026-09-01', 7).map(iso => [iso, 64.0]);
  const rec = jours('2026-09-08', 7).map(iso => [iso, 65.0]);
  const {ctx, page, fr} = await ouvrir(pesees(av.concat(rec)));
  await aller(fr, page, 'repas');
  const note = await fr.evaluate(() => document.getElementById('kcal-note').innerText);
  ok(/-100 kcal/.test(note), 'une prise franche de 1 kg en une semaine fait toujours retirer 100 kcal : ' + note);
  await ctx.close();
}

console.log('\n== 5) Le mode partiels s’annonce une semaine avant ==');
{
  /* premier examen le 24 : le mode s'enclenche le 17 (J-7), donc 3 jours après le 14 */
  const {ctx, fr} = await ouvrir({'batcave-examens': {Anatomie:'2026-09-24', Biochimie:'2026-09-26'}});
  const t = await plan(fr);
  const ligne = t.split('\n').filter(l => /Mode partiels/.test(l))[0] || '';
  ok(/Mode partiels dans 3 jours/.test(ligne), 'annoncé à 3 jours : ' + ligne.slice(0, 90));
  ok(/s'enclenche le 17 sept/.test(ligne), 'avec la date d’enclenchement : ' + (ligne.match(/enclenche[^(]*/) || [''])[0]);
  ok(/2 examens/.test(ligne) && /dernier le 26 sept/.test(ligne), 'et la session qu’il couvre : ' + (ligne.match(/\(2 examens[^)]*\)/) || [''])[0]);
  ok(/Annales ciblées/.test(ligne) && /un seul bloc Español/.test(ligne) && /sport allégé/.test(ligne), 'et ce qui change, en toutes lettres');
  await ctx.close();
}
{
  /* trop loin : le 1er octobre, le mode commence le 24 septembre, soit 10 jours — muet */
  const {ctx, fr} = await ouvrir({'batcave-examens': {Anatomie:'2026-10-01'}});
  ok(!/Mode partiels/.test(await plan(fr)), 'à 10 jours, rien n’est annoncé : on ne prévient pas pour prévenir');
  await ctx.close();
}
{
  /* déjà dedans : premier examen le 18, le mode a commencé le 11 — plus rien à annoncer */
  const {ctx, fr} = await ouvrir({'batcave-examens': {Anatomie:'2026-09-18'}});
  const t = await plan(fr);
  ok(!/Mode partiels dans/.test(t), 'une fois le mode enclenché, l’annonce disparaît');
  await ctx.close();
}
{
  /* aucun examen daté : rien */
  const {ctx, fr} = await ouvrir();
  ok(!/Mode partiels/.test(await plan(fr)), 'sans examen daté, aucune annonce');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
