/* Lot 23 — la couleur par domaine, le réacteur réduit, la séance du jour en pleine largeur,
   le minuteur de repos, les mensurations, l'expérience de la semaine et Anki à la main. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, opts){
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: opts.viewport || {width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(opts.local) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, opts.local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-focus').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
  await page.waitForTimeout(350);
  return { ctx, page, fr };
}
const aller = async (fr, page, p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="' + x + '"]').click(), p); await page.waitForTimeout(180); };
const MERCREDI = '2026-09-16T10:20:00+02:00';
const LUNDI_SPORT = '2026-10-12T09:00:00+02:00';
const DIMANCHE = '2026-09-20T21:00:00+02:00';

console.log('\n== 290) Chaque famille de pages a sa couleur, et elle est tenue ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI);
  const attendu = {sport:'corps', habitudes:'corps', repas:'table', courses:'table', budget:'argent',
                   coran:'foi', bilan:'suivi', objectifs:'suivi', etudes:'etudes', calendrier:'etudes'};
  const vus = {};
  for(const [pg, dom] of Object.entries(attendu)){
    await aller(fr, page, pg);
    const r = await fr.evaluate(() => {
      const s = document.querySelector('.page.active');
      const c = q => { const e = s.querySelector(q); return e ? getComputedStyle(e).color : null; };
      return { dom: s.dataset.dom, eyebrow: c('.eyebrow'),
               titre: (() => { const e = s.querySelector('.page-head h1'); return e ? getComputedStyle(e).borderBottomColor : null; })(),
               panneau: c('.panel > h3:first-child, .panel > .sub-head:first-child h3') };
    });
    ok(r.dom === dom, pg + ' appartient à « ' + dom + ' » (' + r.dom + ')');
    if(r.eyebrow){
      ok(r.eyebrow === r.titre, pg + ' : l\'exergue et le trait du titre ont la même couleur');
      if(r.panneau) ok(r.panneau === r.eyebrow, pg + ' : les barres de titre des panneaux suivent aussi');
      vus[dom] = r.eyebrow;
    }
  }
  const couleurs = Object.values(vus);
  ok(new Set(couleurs).size === couleurs.length, 'les ' + couleurs.length + ' familles ont des couleurs différentes');
  await ctx.close();
}

console.log('\n== 291) Les trois cellules de temps portent trois couleurs ==');
{
  const { ctx, fr } = await ouvrir(MERCREDI);
  const c = await fr.evaluate(() => {
    const g = q => { const e = document.querySelector(q); return e ? getComputedStyle(e).color : null; };
    return { rev: g('.temps-cell.t-rev .tv'), proj: g('.temps-cell.t-proj .tv'), es: g('.temps-cell.t-es .tv') };
  });
  ok(c.rev && c.proj && c.es, 'les trois cellules existent');
  ok(new Set([c.rev, c.proj, c.es]).size === 3, 'révision, projets et espagnol ont trois couleurs distinctes');
  await ctx.close();
}

console.log('\n== 292) Le réacteur ne prend plus un panneau entier ==');
{
  const { ctx, fr } = await ouvrir(MERCREDI);
  const h = await fr.evaluate(() => {
    const r = q => { const e = document.querySelector(q); return e ? Math.round(e.getBoundingClientRect().height) : null; };
    return { central: r('.panel.mon-central'), reactor: r('.reactor'), planH: r('.mon-plan'),
             plan: Math.round(document.querySelector('.mon-plan').getBoundingClientRect().width),
             suivi: Math.round(document.querySelector('.mon-suivi').getBoundingClientRect().width) };
  });
  ok(h.reactor <= 160, 'le réacteur fait au plus 160 px (' + h.reactor + ')');
  ok(h.central <= 240, 'l\'écran central tient en 240 px (' + h.central + ')');
  ok(h.plan > h.suivi, 'la colonne du Plan du jour est la plus large (' + h.plan + ' contre ' + h.suivi + ')');
  /* la hauteur totale de la zone « agir » dépend du contenu du plan : c'est test14, avec son
     propre jeu de données, qui garde le budget de pixels. Ici on vérifie le rapport de
     surface : le panneau d'UN chiffre ne doit plus dominer celui qu'on lit ligne à ligne. */
  ok(h.central < h.planH, 'l\'écran du score est plus court que le Plan du jour (' + h.central + ' contre ' + h.planH + ')');
  await ctx.close();
}

console.log('\n== 293) La séance du jour prend toute la largeur, et vient en premier ==');
{
  const { ctx, fr, page } = await ouvrir(LUNDI_SPORT);
  await aller(fr, page, 'sport');
  const r = await fr.evaluate(() => {
    const g = document.getElementById('sport-grid');
    const today = g.querySelector('.sport-card.today');
    const autres = [...g.querySelectorAll('.sport-card:not(.today)')];
    return { pleine: Math.round(today.getBoundingClientRect().width) === Math.round(g.getBoundingClientRect().width),
             premiere: g.firstElementChild.classList.contains('today'),
             plusHaut: autres.every(a => a.getBoundingClientRect().top >= today.getBoundingClientRect().top),
             autres: autres.length };
  });
  ok(r.pleine, 'la carte du jour occupe toute la largeur de la grille');
  ok(r.premiere, 'elle est la première');
  ok(r.plusHaut && r.autres === 4, 'les quatre autres séances sont en dessous');
  await ctx.close();
}

console.log('\n== 294) Le minuteur de repos propose les temps de la séance ==');
{
  const { ctx, fr, page } = await ouvrir(LUNDI_SPORT);
  await aller(fr, page, 'sport');
  const secs = await fr.evaluate(() => [...document.querySelectorAll('[data-repos]')].map(x => Number(x.dataset.repos)));
  ok(secs.indexOf(45) > -1 && secs.indexOf(90) > -1 && secs.indexOf(75) > -1 && secs.indexOf(30) > -1,
     'les repos du lundi (30, 45, 60, 75, 90 s) sont proposés : ' + secs.join(', '));
  ok(secs.length <= 7 && secs.every((v, i, a) => i === 0 || v > a[i-1]), 'sept boutons au plus, triés');
  await fr.evaluate(() => document.querySelector('[data-repos="90"]').click());
  await page.waitForTimeout(200);
  ok(await fr.evaluate(() => !document.getElementById('repos-compte').hidden), 'le décompte apparaît');
  const t1 = await fr.evaluate(() => document.getElementById('repos-reste').textContent);
  ok(/^1:2\d|^1:30$/.test(t1), 'il part de 1:30 (' + t1 + ')');
  await fr.evaluate(() => document.getElementById('repos-stop').click());
  await page.waitForTimeout(150);
  ok(await fr.evaluate(() => document.getElementById('repos-compte').hidden), '« arrêter » le referme');
  await ctx.close();
}

console.log('\n== 295) Mensurations : saisie, écart, rappel du mois ==');
{
  const { ctx, fr, page } = await ouvrir(LUNDI_SPORT);
  const rappel = await fr.evaluate(() => document.getElementById('dash-plan').innerText);
  ok(/Mensurations du mois/.test(rappel), 'le plan du jour réclame la mesure du mois');
  await aller(fr, page, 'sport');
  await fr.evaluate(() => { document.getElementById('ms-cou').value = '37,5'; document.getElementById('ms-bras').value = '31,2'; document.getElementById('ms-add').click(); });
  await page.waitForTimeout(250);
  const m = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-mesures') || '[]'));
  ok(m.length === 1 && m[0].cou === 37.5 && m[0].bras === 31.2 && m[0].taille === null,
     'la virgule est acceptée, un champ vide reste vide (' + JSON.stringify(m[0] && [m[0].cou, m[0].bras, m[0].taille]) + ')');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await page.waitForTimeout(200);
  ok(!/Mensurations du mois/.test(await fr.evaluate(() => document.getElementById('dash-plan').innerText)), 'le rappel disparaît une fois la mesure prise');
  await ctx.close();
  /* le mois suivant, l'écart s'affiche */
  const avant = [{id:'m1', date:'2026-09-14', cou:36.8, bras:30.5, taille:76}];
  const b2 = await ouvrir(LUNDI_SPORT, { local: {'batcave-mesures': avant} });
  await aller(b2.fr, b2.page, 'sport');
  await b2.fr.evaluate(() => { document.getElementById('ms-cou').value = '37,4'; document.getElementById('ms-add').click(); });
  await b2.page.waitForTimeout(250);
  const txt = await b2.fr.evaluate(() => document.getElementById('mesures-liste').innerText.replace(/\s+/g, ' '));
  ok(/37,4 cm \+0,6/.test(txt), 'l\'écart avec la mesure précédente est affiché (' + txt.slice(0, 70) + ')');
  await b2.ctx.close();
}

console.log('\n== 296) L\'expérience de la semaine : déclaration puis verdict ==');
{
  const { ctx, fr, page } = await ouvrir(DIMANCHE);
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(250);
  ok(await fr.evaluate(() => document.querySelectorAll('#cl-exp-mesure option').length) === 9, 'neuf mesures proposées');
  await fr.evaluate(() => { document.getElementById('cl-exp-quoi').value = 'Coucher à 21:30'; document.getElementById('cl-exp-mesure').value = 'sleepH'; document.getElementById('cloture-valider').click(); });
  await page.waitForTimeout(350);
  const x = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-experiences') || '[]'));
  ok(x.length === 1 && x[0].lundi === '2026-09-21' && x[0].mesure === 'sleepH',
     'l\'expérience porte sur la semaine qui commence lundi (' + (x[0] && x[0].lundi) + ')');
  ok(x[0].avant !== null && x[0].avant !== undefined, 'la valeur de départ est figée à la déclaration');
  await ctx.close();
}

console.log('\n== 297) Le verdict est calculé, pas ressenti ==');
{
  const semaine = {};
  for(const d of ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27'])
    semaine['batcave-journal-' + d] = {sommeil:'8.1', water:2500, complements:[], coran:'', duaa:'', notes:'', mood:4, poids:''};
  const exp = [{id:'xp1', lundi:'2026-09-21', enonce:'Coucher à 21:30', mesure:'sleepH', avant:6.8, apres:null, verdict:null, clos:null}];
  const { ctx, fr, page } = await ouvrir('2026-09-27T21:00:00+02:00', { local: Object.assign({'batcave-experiences': exp}, semaine) });
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(300);
  const aperçu = await fr.evaluate(() => document.getElementById('cl-exp-verdict').innerText.replace(/\s+/g, ' '));
  ok(/6,8 h → 8,1 h/.test(aperçu) && /ça a marché/.test(aperçu), 'l\'aperçu montre départ, arrivée et verdict : ' + aperçu.slice(0, 90));
  await fr.evaluate(() => document.getElementById('cloture-valider').click());
  await page.waitForTimeout(350);
  const x = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-experiences') || '[]'));
  ok(x[0].verdict === 'marche' && x[0].apres === 8.1 && x[0].clos === '2026-09-27', 'le verdict est enregistré (' + JSON.stringify([x[0].verdict, x[0].apres]) + ')');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="bilan"]').click());
  await page.waitForTimeout(250);
  ok(/ça a marché/.test(await fr.evaluate(() => document.getElementById('exp-liste').innerText)), 'le Bilan garde la trace du verdict');
  await ctx.close();
  /* une variation minuscule ne fait pas un résultat */
  const exp2 = [{id:'xp2', lundi:'2026-09-21', enonce:'Test', mesure:'sleepH', avant:8.0, apres:null, verdict:null, clos:null}];
  const petit = {};
  for(const d of ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27'])
    petit['batcave-journal-' + d] = {sommeil:'8.1', water:2000, complements:[], coran:'', duaa:'', notes:'', mood:3, poids:''};
  const n = await ouvrir('2026-09-27T21:00:00+02:00', { local: Object.assign({'batcave-experiences': exp2}, petit) });
  await n.fr.evaluate(() => { document.getElementById('bc-cloture').click(); document.getElementById('cloture-valider').click(); });
  await n.page.waitForTimeout(350);
  const y = await n.fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-experiences') || '[]'));
  ok(y[0].verdict === 'neutre', '+0,1 h de sommeil : « pas d\'effet mesurable » (' + y[0].verdict + ')');
  await n.ctx.close();
}

console.log('\n== 298) Anki à la main depuis la page publiée ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI);
  await aller(fr, page, 'etudes');
  const expl = await fr.evaluate(() => document.getElementById('anki-explique').innerText);
  ok(/ne peut pas parler à ton Mac/.test(expl) && /Saisis les chiffres à la main/.test(expl),
     'la page publiée dit clairement que la lecture automatique est impossible');
  ok(await fr.evaluate(() => document.getElementById('anki-lire').hidden), 'le bouton de lecture automatique est masqué hors fichier local');
  await fr.evaluate(() => { document.getElementById('ak-dentaire').value = '230'; document.getElementById('ak-revues').value = '10'; document.getElementById('ak-sangsues').value = '7'; document.getElementById('ak-add').click(); });
  await page.waitForTimeout(300);
  const corps = await fr.evaluate(() => document.getElementById('anki-corps').innerText.replace(/\s+/g, ' '));
  ok(/Dentaire 230 à revoir/.test(corps), 'le chiffre saisi s\'affiche');
  ok(/Español pas renseigné/.test(corps), 'un paquet non saisi n\'est pas écrasé par un zéro');
  ok(/Plus de 220 cartes dues/.test(corps), 'le seuil de charge se déclenche sur une saisie manuelle');
  ok(/saisi/.test(await fr.evaluate(() => document.getElementById('anki-maj').textContent)), 'la source est indiquée comme saisie');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await page.waitForTimeout(250);
  ok(/230 cartes dues dans Anki/.test(await fr.evaluate(() => document.getElementById('dash-plan').innerText)),
     'les cartes dues remontent dans le plan du jour');
  await ctx.close();
}

console.log('\n== 299) La clôture du soir prend aussi les chiffres d\'Anki ==');
{
  const { ctx, fr, page } = await ouvrir('2026-09-16T21:00:00+02:00');
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(250);
  ok(await fr.evaluate(() => !!document.getElementById('cl-ak-dus')), 'les deux champs Anki sont dans la clôture complète');
  await fr.evaluate(() => { document.querySelector('[data-cl-mode="court"]').click(); });
  await page.waitForTimeout(150);
  ok(await fr.evaluate(() => document.getElementById('cl-ak-dus').offsetParent === null), 'ils disparaissent en clôture express');
  await fr.evaluate(() => { document.querySelector('[data-cl-mode="complet"]').click();
                            document.getElementById('cl-ak-dus').value = '150'; document.getElementById('cl-ak-revues').value = '260';
                            document.getElementById('cloture-valider').click(); });
  await page.waitForTimeout(350);
  const a = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-anki') || 'null'));
  ok(a && a.source === 'saisie' && a.paquets.Dentaire.dus === 150 && a.revues === 260,
     'la clôture écrit les chiffres (' + JSON.stringify(a && [a.paquets.Dentaire.dus, a.revues]) + ')');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
