/* ===== 281) Les portes convertissent vraiment un bloc =====

   Jusqu'ici le panneau annoncait « tu peux convertir ce bloc » et rien ne le faisait :
   portesEtat n'etait lu nulle part par la grille. Il l'est desormais sous la forme d'une
   DATE de conversion. Ce test verifie les quatre choses qui comptent : le bouton
   n'apparait que quand la porte est franchie, la conversion ne reecrit pas le passe, la
   grille ET les cibles suivent, et la porte refermee ne reprend rien toute seule. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

/* 21 jours avant le 5 octobre 2026, notes de cours du lundi au vendredi. « note » fixe le
   niveau : 3 partout ouvre les deux portes, 2 n'en ouvre aucune. */
function suivi(note){
  const out = {};
  const dec = (i,k) => { const d = new Date(i+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+k); return d.toISOString().slice(0,10); };
  for(let k = 20; k >= 0; k--){
    const j = dec('2026-10-05', -k), w = new Date(j+'T00:00:00Z').getUTCDay();
    if(w >= 1 && w <= 5 && j >= '2026-09-14') out[j] = note;
  }
  return out;
}
const SEED = (note, errores) => ({
  'batcave-cours-suivi': suivi(note),
  /* le critere objectif : erreurs pour 100 mots du dernier bilan tombant dans la fenetre */
  'batcave-revue': [{id:'rv1', date:'2026-10-04', marche:'', coince:'', ajust:'', espanol:{errores: errores, oral:6, drill:120}}],
  /* la porte 2 exige en plus un examen deja passe */
  'batcave-examens': {'Anatomía I':'2026-09-25'}
});

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
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const grille = (fr, iso) => fr.evaluate(i => window.__bcGrille(window.__bcCle(new Date(i+'T12:00:00').getDay()), i).map(b => b[0] + ' ' + b[1]), iso);
const allerEtudes = async (fr, page) => { await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click()); await page.waitForTimeout(300); };

console.log('\n== 281) Aucune porte franchie : aucun bouton de conversion ==');
{
  const { ctx, fr, page } = await ouvrir('2026-10-05T12:00:00+02:00', SEED(2, 5.0));
  await allerEtudes(fr, page);
  const v = await fr.evaluate(() => ({
    conv: document.querySelectorAll('#portes-etat [data-porte-convertir]').length,
    rendre: document.querySelectorAll('#portes-etat [data-porte-rendre]').length,
    note: document.getElementById('portes-note').textContent,
    txt: document.getElementById('portes-etat').innerText.replace(/\s+/g, ' ').slice(0, 130)
  }));
  ok(v.conv === 0 && v.rendre === 0, 'aucun bouton tant que rien n\'est franchi (' + v.conv + ' / ' + v.rendre + ')');
  ok(/aucune porte franchie/.test(v.note), 'le relevé le dit : « ' + v.note + ' »');
  ok(/2,00|il faut 2,5/.test(v.txt), 'le panneau dit ce qui manque : ' + v.txt);
  await ctx.close();
}

console.log('\n== 282) Les deux portes franchies : deux boutons, et la grille ne bouge pas encore ==');
{
  const { ctx, fr, page } = await ouvrir('2026-10-05T12:00:00+02:00', SEED(3, 1.2));
  await allerEtudes(fr, page);
  const v = await fr.evaluate(() => ({
    conv: [...document.querySelectorAll('#portes-etat [data-porte-convertir]')].map(b => b.textContent),
    note: document.getElementById('portes-note').textContent
  }));
  ok(v.conv.length === 2, 'les deux portes sont franchies : ' + v.conv.length + ' bouton(s)');
  ok(/6 oct\./.test(v.conv[0] || ''), 'le bouton annonce la date : « ' + (v.conv[0] || '') + ' »');
  ok(/2 portes franchies/.test(v.note), 'relevé : « ' + v.note + ' »');
  /* Franchie n'est pas convertie : tant qu'il ne clique pas, la grille est intacte. */
  const g = await grille(fr, '2026-10-06');
  ok(g.includes('14:00 Español · preparar la clase') && g.includes('19:00 Español · registro académico'),
     'porte franchie mais non convertie : la grille est inchangée (' + g.filter(x => /14:00|19:00/.test(x)).join(' · ') + ')');
  await ctx.close();
}

console.log('\n== 283) Un clic : le bloc revient aux projets DEMAIN, jamais hier ==');
{
  const { ctx, fr, page } = await ouvrir('2026-10-05T12:00:00+02:00', SEED(3, 1.2));
  await allerEtudes(fr, page);
  const avant = await fr.evaluate(() => window.__bcPrevu('2026-10-06'));
  await fr.evaluate(() => document.querySelector('#portes-etat [data-porte-convertir="1"]').click());
  await page.waitForTimeout(350);
  /* Un LUNDI deja vecu : le vendredi n'a pas de « Projets perso 3 », il ne prouverait rien. */
  const hier = await grille(fr, '2026-09-28'), aujourdhui = await grille(fr, '2026-10-05'), demain = await grille(fr, '2026-10-06');
  ok(hier.includes('14:00 Español · preparar la clase'), 'le lundi 28 septembre, déjà vécu, garde sa grille');
  ok(aujourdhui.includes('14:00 Español · preparar la clase'), 'aujourd\'hui aussi : la conversion prend demain');
  ok(demain.includes('14:00 Projets perso 3'), 'demain, le bloc de 14:00 est redevenu Projets perso');
  ok(!demain.some(x => /Español · preparar la clase/.test(x)), 'plus aucun « preparar la clase » demain');
  const apres = await fr.evaluate(() => window.__bcPrevu('2026-10-06'));
  ok(apres.proj === avant.proj + 50 && apres.es === avant.es - 50, 'les cibles suivent : projets ' + avant.proj + ' → ' + apres.proj + ' min, espagnol ' + avant.es + ' → ' + apres.es);
  ok(apres.rev === avant.rev, 'la révision ne bouge pas (' + apres.rev + ' min)');
  /* La décision est persistée, pas seulement affichée. */
  const etat = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-portes') || '{}'));
  ok(etat.c1 === '2026-10-06', 'la décision est enregistrée avec sa date : ' + JSON.stringify(etat.c1));
  /* La deuxième porte prend le deuxième bloc, pas le même. */
  await fr.evaluate(() => document.querySelector('#portes-etat [data-porte-convertir="2"]').click());
  await page.waitForTimeout(350);
  const d2 = await grille(fr, '2026-10-06');
  ok(d2.includes('19:00 Projets perso 5') && d2.includes('13:00 Español · escribir'),
     'la porte 2 rend « registro académico » et laisse « escribir » : ' + d2.filter(x => /13:00|19:00/.test(x)).join(' · '));
  const note = await fr.evaluate(() => document.getElementById('portes-note').textContent);
  ok(/2 portes converties/.test(note), 'relevé : « ' + note + ' »');
  await ctx.close();
}

console.log('\n== 284) Rendre le bloc à l\'espagnol : le chemin inverse existe ==');
{
  const { ctx, fr, page } = await ouvrir('2026-10-05T12:00:00+02:00',
    Object.assign(SEED(3, 1.2), {'batcave-portes': {p1:true, p2:true, c1:'2026-10-01'}}));
  await allerEtudes(fr, page);
  const g0 = await grille(fr, '2026-10-06');
  ok(g0.includes('14:00 Projets perso 3'), 'la conversion enregistrée s\'applique au rechargement');
  const b = await fr.evaluate(() => { const x = document.querySelector('#portes-etat [data-porte-rendre="1"]'); return x ? x.textContent : null; });
  ok(!!b && /espagnol/.test(b), 'le bouton inverse est là : « ' + b + ' »');
  await fr.evaluate(() => document.querySelector('#portes-etat [data-porte-rendre="1"]').click());
  await page.waitForTimeout(350);
  const g1 = await grille(fr, '2026-10-06');
  ok(g1.includes('14:00 Español · preparar la clase'), 'le bloc est rendu à l\'espagnol');
  ok(await fr.evaluate(() => !JSON.parse(localStorage.getItem('batcave-portes') || '{}').c1), 'la date de conversion est effacée');
  await ctx.close();
}

console.log('\n== 285) Porte refermée : on le dit, on ne reprend rien tout seul ==');
{
  /* Notes retombées à 2 : la porte se referme (hystérésis sous 2,2), mais le bloc déjà
     converti reste aux projets — un planning qui bougerait sans qu'il l'ait demandé serait
     pire que le problème. */
  const { ctx, fr, page } = await ouvrir('2026-10-05T12:00:00+02:00',
    Object.assign(SEED(2, 5.0), {'batcave-portes': {p1:true, c1:'2026-10-01'}}));
  await allerEtudes(fr, page);
  const v = await fr.evaluate(() => ({
    txt: document.getElementById('portes-etat').innerText.replace(/\s+/g, ' '),
    rendre: document.querySelectorAll('#portes-etat [data-porte-rendre]').length
  }));
  ok(/s’est refermée|s'est refermée/.test(v.txt), 'le panneau annonce la fermeture : ' + (v.txt.match(/.{0,30}refermée.{0,60}/) || [''])[0]);
  ok(v.rendre === 1, 'le bouton pour rendre le bloc reste proposé');
  const g = await grille(fr, '2026-10-06');
  ok(g.includes('14:00 Projets perso 3'), 'le bloc reste aux projets tant qu\'il ne le rend pas');
  await ctx.close();
}

console.log('\n== 286) En partiels, une porte convertie ne rend rien ==');
{
  /* La révision passe avant : une porte ne rend pas trois heures au dropshipping la
     semaine d'un examen. L'examen du 9 octobre ouvre les partiels du 2 au 9. */
  const { ctx, fr, page } = await ouvrir('2026-10-05T12:00:00+02:00',
    Object.assign(SEED(3, 1.2), {'batcave-examens': {'Anatomía I':'2026-10-09'}, 'batcave-portes': {p1:true, p2:true, c1:'2026-10-01', c2:'2026-10-01'}}));
  await allerEtudes(fr, page);
  const p = await fr.evaluate(() => { const x = window.__bcPeriode('2026-10-06'); return x ? x.id : null; });
  ok(p === 'partiels', 'le 6 octobre est en mode partiels (' + p + ')');
  const g = await grille(fr, '2026-10-06');
  ok(g.includes('14:00 Español') && !g.includes('14:00 Projets perso 3'), 'le bloc de 14:00 reste le bloc Español du mode partiels : ' + g.filter(x => /14:00|19:00/.test(x)).join(' · '));
  ok(g.includes('19:00 Révision ciblée'), 'et 19:00 reste de la révision ciblée, pas du projet');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT (test86)');
process.exit(errs ? 1 : 0);
