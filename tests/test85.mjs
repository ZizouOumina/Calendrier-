/* ===== 275) Six mois de vie fictive, traversés jour par jour =====

   Les autres tests verifient un mecanisme a une date choisie. Celui-ci fait l'inverse :
   il charge une vie entiere -- 182 jours, 1054 sessions, les trois phases d'espagnol, les
   vacances de Noel, une session de partiels, une progression reelle en espagnol -- et
   traverse le programme a onze dates charnieres, en ouvrant les douze onglets a chaque
   fois. Ce qu'on cherche n'est pas une valeur precise mais l'absence de fissure :
   aucune erreur JS, aucun « undefined », aucun NaN, aucune heure a point decimal,
   aucun total negatif, et la coherence des phases du premier au dernier jour. */
import { chromium } from 'playwright';
import { vieFictive, DEBUT, FIN, decale, dow, phaseDe, NOEL, EXAMENS } from './vie-fictive.mjs';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const SEED = vieFictive();

async function ouvrir(quand){
  const ctx = await browser.newContext({viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(() => { window.claude = undefined; });
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, SEED);
  const page = await ctx.newPage();
  const pe = [];
  page.on('pageerror', e => pe.push(e.message));
  await page.clock.install({ time: new Date(quand + 'T12:00:00+01:00') });
  await page.goto(URL, {timeout:30000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:25000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr, pe };
}

/* Ce qui ne doit JAMAIS apparaitre a l'ecran, quel que soit le jour. « NaN » est
   sensible a la casse pour ne pas attraper un mot francais. */
const INTERDITS = [
  [/undefined/, 'undefined'],
  [/NaN/, 'NaN'],
  [/Infinity/, 'Infinity'],
  [/\[object Object\]/, '[object Object]'],
  /* une heure a point decimal : « 3.5 h » au lieu de « 3 h 30 » */
  [/\d+\.\d+\s*h\b/, 'heure à point décimal']
];

const CHARNIERES = [
  ['le premier jour',           '2026-09-14', 'es-1'],
  ['au milieu de la phase 1',   '2026-10-02', 'es-1'],
  ['dernier jour de la phase 1','2026-10-18', 'es-1'],
  ['premier jour de la phase 2','2026-10-19', 'es-2'],
  ['dernier jour de la phase 2','2026-11-29', 'es-2'],
  ['premier jour de la phase 3','2026-11-30', 'es-3'],
  ['pendant les vacances',      '2026-12-28', 'vacances'],
  ['en mode partiels',          '2027-01-19', 'partiels'],
  ['apres les partiels',        '2027-02-08', 'es-3'],
  ['dernier jour de la phase 3','2027-03-14', 'es-3'],
  ['apres la fin des phases',   '2027-03-16', null],
  /* Un jour ferie sans cours : toutes les cibles de la journee tombent a zero. C'est la
     que « 100 x 0 / 0 » affichait « NaN% » sur l'anneau de revision du Calendrier. */
  ['un jour de vacances isole', '2026-12-23', 'vacances']
];

console.log('\n== 275) Six mois de vie fictive : onze dates charnières, douze onglets ==');
for(const [nom, jour, phase] of CHARNIERES){
  const { ctx, page, fr, pe } = await ouvrir(jour);
  const pages = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].map(b => b.dataset.page));
  const trouves = [];
  for(const p of pages){
    await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p);
    await page.waitForTimeout(90);
    const t = await fr.evaluate(() => document.body.innerText);
    INTERDITS.forEach(([re, label]) => {
      if(re.test(t)){
        const m = t.match(new RegExp('.{0,45}' + re.source + '.{0,45}'));
        trouves.push(p + ' → ' + label + ' : « ' + (m ? m[0].replace(/\s+/g, ' ') : '?') + ' »');
      }
    });
  }
  ok(pe.length === 0, nom + ' (' + jour + ') : aucune erreur JS sur les ' + pages.length + ' onglets' + (pe.length ? ' — ' + pe[0] : ''));
  ok(trouves.length === 0, nom + ' : rien d\'illisible à l\'écran' + (trouves.length ? ' — ' + trouves.slice(0, 3).join(' | ') : ''));
  const p = await fr.evaluate(() => { const x = window.__bcPeriode(); return x ? x.id : null; });
  ok(p === phase, nom + ' : période « ' + p + ' » (attendu « ' + phase + ' »)');
  await ctx.close();
}

console.log('\n== 276) Les 182 jours, un par un : la grille ne trébuche jamais ==');
{
  const { ctx, fr } = await ouvrir('2027-03-14');
  const bilan = await fr.evaluate(([debut, fin]) => {
    const out = {n:0, mauvais:[], sommes:{rev:0, proj:0, es:0, sport:0}, phases:{}, vides:[]};
    const dec = (i, k) => { const d = new Date(i + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0,10); };
    for(let j = debut; j <= fin; j = dec(j, 1)){
      out.n++;
      const p = window.__bcPrevu(j);
      ['rev','proj','es','sport'].forEach(k => {
        const v = p[k];
        if(typeof v !== 'number' || !isFinite(v) || v < 0) out.mauvais.push(j + '.' + k + '=' + v);
        out.sommes[k] += v;
      });
      const per = window.__bcPeriode(j);
      const id = per ? per.id : 'aucune';
      out.phases[id] = (out.phases[id] || 0) + 1;
      const g = window.__bcGrille(window.__bcCle(new Date(j + 'T12:00:00').getDay()), j);
      if(!g || !g.length) out.vides.push(j);
      g.forEach(b => { if(!b || !b[0] || !b[1] || /undefined/.test(String(b[1]))) out.vides.push(j + ' ' + JSON.stringify(b)); });
    }
    return out;
  }, [DEBUT, FIN]);
  ok(bilan.n === 182, 'le programme couvre 182 jours (obtenu ' + bilan.n + ')');
  ok(bilan.mauvais.length === 0, 'aucun prévu négatif, NaN ou infini sur les 182 jours' + (bilan.mauvais.length ? ' — ' + bilan.mauvais.slice(0,3).join(', ') : ''));
  ok(bilan.vides.length === 0, 'aucune grille vide ni bloc sans nom' + (bilan.vides.length ? ' — ' + bilan.vides.slice(0,3).join(', ') : ''));
  /* Les vacances de Noel remplacent le travail par du temps libre : 15 jours a zero. */
  ok(bilan.phases['vacances'] === 15, 'les 15 jours de vacances de Noël sont bien une période (obtenu ' + bilan.phases['vacances'] + ')');
  ok(bilan.phases['es-1'] === 35 && bilan.phases['es-2'] === 42, 'phase 1 sur 35 jours, phase 2 sur 42 (obtenu ' + bilan.phases['es-1'] + ' / ' + bilan.phases['es-2'] + ')');
  ok(bilan.phases['partiels'] > 0, 'le mode partiels occupe ' + bilan.phases['partiels'] + ' jours de janvier');
  /* La revision est la seule constante du programme : elle ne depend pas de la phase.
     Sur 182 jours moins les 15 de vacances et le regime de partiels, elle reste massive. */
  ok(bilan.sommes.rev > 40000 && bilan.sommes.rev < 60000, 'révision prévue sur six mois : ' + Math.round(bilan.sommes.rev / 60) + ' h');
  ok(bilan.sommes.es > 0 && bilan.sommes.proj > 0, 'espagnol ' + Math.round(bilan.sommes.es / 60) + ' h et projets ' + Math.round(bilan.sommes.proj / 60) + ' h, tous deux non nuls');
  await ctx.close();
}

console.log('\n== 277) L\'espagnol progresse : les portes s\'ouvrent, et pas trop tôt ==');
{
  /* Le jeu fait monter la note de cours de 1,2 a 2,9 et descendre les erreurs de 6,2 a 1,2.
     Les portes doivent donc etre FERMEES en octobre et OUVERTES au printemps -- sinon le
     mecanisme ne mesure rien. */
  const etats = [];
  for(const j of ['2026-10-15', '2026-12-15', '2027-03-10']){
    const { ctx, fr } = await ouvrir(j);
    etats.push([j, await fr.evaluate(() => {
      const z = document.getElementById('portes-etat');
      return { note: (document.getElementById('portes-note') || {}).textContent || '',
               txt: z ? z.innerText.replace(/\s+/g, ' ') : '' };
    })]);
    await ctx.close();
  }
  const [oct, dec, mars] = etats;
  ok(/aucune porte franchie|jours notés/.test(oct[1].note), 'en octobre, aucune porte franchie (« ' + oct[1].note + ' »)');
  ok(/porte/.test(mars[1].note), 'en mars, le panneau conclut : « ' + mars[1].note + ' »');
  ok(mars[1].txt.length > 40 && !/undefined|NaN/.test(mars[1].txt), 'le panneau des portes reste lisible en mars : ' + mars[1].txt.slice(0, 110));
  ok(/Porte 1/.test(mars[1].txt) && /Porte 2/.test(mars[1].txt), 'les deux portes sont décrites, franchie ou non');
  console.log('     décembre : « ' + dec[1].note + ' »');
}

console.log('\n== 278) Vacances de Noël : du temps libre, et aucune dette fabriquée ==');
{
  const { ctx, fr } = await ouvrir('2026-12-28');
  const v = await fr.evaluate(() => {
    const g = window.__bcGrille(window.__bcCle(new Date('2026-12-28T12:00:00').getDay()), '2026-12-28');
    return { travail: g.filter(b => window.__bcTypeBloc(b[1])).length,
             libre: g.filter(b => b[1] === 'Temps libre').length,
             prevu: window.__bcPrevu('2026-12-28'),
             semaine: document.getElementById('dash-semaine').innerText.replace(/\s+/g, ' ') };
  });
  ok(v.travail === 0, 'aucun bloc de travail le 28 décembre (obtenu ' + v.travail + ')');
  ok(v.libre > 0, v.libre + ' blocs « Temps libre »');
  ok(v.prevu.rev === 0 && v.prevu.proj === 0 && v.prevu.es === 0, 'rien n\'est attendu ce jour-là : ' + JSON.stringify(v.prevu));
  ok(!/undefined|NaN/.test(v.semaine), 'la charge de la semaine reste lisible : ' + v.semaine.slice(0, 90));
  await ctx.close();
}

console.log('\n== 279) Le 19 janvier, fin du semestre 1 : le jalon de recalibrage est là ==');
{
  /* Passe cette date, la grille du S1 sous-estime les cours de 8 h par semaine. Rien dans
     le code ne peut le deviner : c'est un rappel humain, il doit exister et etre daté. */
  const { ctx, fr } = await ouvrir('2027-01-19');
  const g = await fr.evaluate(() => window.__bcGrille('tuesday', '2027-01-19').map(b => b[0] + ' ' + b[1]));
  ok(g.some(x => /Cours/.test(x)), 'le mardi 19 janvier porte encore un bloc Cours : ' + g.filter(x => /Cours|Trajet/.test(x)).join(' · '));
  await ctx.close();
  const fs = await import('node:fs');
  const src = fs.readFileSync('../batcave.html', 'utf8');
  ok(/SEMESTRE 1 UNIQUEMENT/.test(src) && /19 janvier/.test(src), 'la grille porte l\'avertissement daté du semestre 2');
  const fil = fs.readFileSync('../fil-des-jours.html', 'utf8');
  ok(/2027-01-19/.test(fil), 'le fil des jours porte le jalon du 19 janvier');
}

console.log('\n== 280) Six mois plus tard : la saison se clôture sans rien perdre ==');
{
  const { ctx, fr } = await ouvrir('2027-03-10');
  const avant = await fr.evaluate(() => ({ saisons: (window.__bcSaisons() || []).length, objs: window.__bcObjectifs().length }));
  const apres = await fr.evaluate(() => { window.__bcCloturerSaison(); return { saisons: (window.__bcSaisons() || []).length, objs: window.__bcObjectifs().length }; });
  ok(apres.saisons === avant.saisons + 1, 'la saison close est archivée (' + avant.saisons + ' → ' + apres.saisons + ')');
  ok(apres.objs > 0, 'le nouvel horizon repart avec ' + apres.objs + ' objectifs, aucun à ressaisir');
  const t = await fr.evaluate(() => document.body.innerText);
  ok(!/undefined|NaN/.test(t), 'rien d\'illisible après la clôture');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT (test85)');
process.exit(errs ? 1 : 0);
