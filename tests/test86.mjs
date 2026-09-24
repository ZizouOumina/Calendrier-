/* Lot 34, revu le 19 septembre 2026 — la preuve que les portes sont bien parties.

   Ce fichier eprouvait la CONVERSION : une porte franchie rendait un bloc Español aux
   projets, a partir de demain, jamais retroactivement. Les portes ont ete retirees le
   19 septembre (voir test83 pour la raison). Ce qui doit etre protege maintenant, c'est
   la propriete inverse et elle est plus importante : rien ne peut plus toucher a la
   grille par ce chemin -- y compris une conversion qui trainerait dans le stockage d'un
   ancien appareil. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

/* 21 jours avant le 12 octobre 2026, notes de cours du lundi au vendredi (le 9 et le 12,
   sans cours, ne comptent pas ; le programme partant du 19 septembre, treize jours comptent). « note » fixe le
   niveau : 3 partout ouvre les deux portes, 2 n'en ouvre aucune. */
function suivi(note){
  const out = {};
  const dec = (i,k) => { const d = new Date(i+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+k); return d.toISOString().slice(0,10); };
  for(let k = 20; k >= 0; k--){
    const j = dec('2026-10-12', -k), w = new Date(j+'T00:00:00Z').getUTCDay();
    if(w >= 1 && w <= 5 && j >= '2026-09-14') out[j] = note;
  }
  return out;
}
const SEED = (note, errores) => ({
  'batcave-cours-suivi': suivi(note),
  /* le critere objectif : erreurs pour 100 mots du dernier bilan tombant dans la fenetre */
  'batcave-revue': [{id:'rv1', date:'2026-10-11', marche:'', coince:'', ajust:'', espanol:{errores: errores, oral:6, drill:120}}],
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


console.log('\n== 281) Aucun bouton de conversion, quelle que soit la note ==');
{
  const { ctx, fr, page } = await ouvrir('2026-10-12T12:00:00+02:00', SEED(3, 1.0));
  await allerEtudes(fr, page);
  const v = await fr.evaluate(() => ({
    convertir: document.querySelectorAll('#portes-etat [data-porte-convertir]').length,
    rendre: document.querySelectorAll('#portes-etat [data-porte-rendre]').length,
    portes: (window.__bcPortes('2026-10-12') || {}).portes.length,
    txt: (document.getElementById('portes-etat') || {}).innerText || ''
  }));
  ok(v.convertir === 0 && v.rendre === 0, 'aucun bouton de conversion ni de retour (' + v.convertir + ' / ' + v.rendre + ')');
  ok(v.portes === 0, 'et aucune porte dans le modèle (' + v.portes + ')');
  ok(/suivi tes cours|Aucun jour de cours noté/.test(v.txt), 'le panneau montre la mesure, pas un portillon');
  await ctx.close();
}

console.log('\n== 282) Une conversion qui traîne dans le stockage ne convertit plus rien ==');
{
  /* Le cas qui compte : un ancien appareil, ou une sauvegarde d'avant le 19 septembre,
     rapporte « c1 : converti depuis le 8 octobre ». La grille ne doit pas y obéir. */
  const { ctx, fr } = await ouvrir('2026-10-12T12:00:00+02:00',
    Object.assign(SEED(3, 1.0), {'batcave-portes': {p1:true, p2:true, c1:'2026-10-08', c2:'2026-10-08'}}));
  const g = await grille(fr, '2026-10-13');
  ok(!g.some(x => /20:30/.test(x)) && g.some(x => /Muay Thai/.test(x)),
     'le mardi soir est à la Muay Thai (régime combat) : ' + (g.filter(x => /19:30/.test(x))[0] || '—'));
  ok(g.some(x => /14:00 Español · escribir/.test(x)),
     'et 14:00 reste de l\'espagnol (13:00 est « Lire » le mardi) : ' + (g.filter(x => /^14:00/.test(x))[0] || '—'));
  await ctx.close();
}

console.log('\n== 283) La note du jour se pose toujours, et se retire ==');
{
  /* La mesure survit aux portes : c'est tout l'intérêt de ne pas avoir supprimé la note. */
  const { ctx, fr, page } = await ouvrir('2026-10-13T21:00:00+02:00', SEED(2, 2.0));
  await allerEtudes(fr, page);
  const v = await fr.evaluate(() => {
    window.__bcNoterCours('2026-10-13', 3);
    const a = window.__bcNoterCours && JSON.parse(localStorage.getItem('batcave-cours-suivi') || '{}')['2026-10-13'];
    window.__bcNoterCours('2026-10-13', null);
    const b = JSON.parse(localStorage.getItem('batcave-cours-suivi') || '{}')['2026-10-13'];
    return { pose: a, retire: b };
  });
  ok(v.pose === 3, 'la note se pose (3)');
  ok(v.retire === undefined, 'et se retire');
  await ctx.close();
}

console.log('\n== 284) Le mode partiels n\'est pas touché par la suppression ==');
{
  const { ctx, fr } = await ouvrir('2026-10-12T12:00:00+02:00',
    Object.assign(SEED(3, 1.2), {'batcave-examens': {'Anatomía I':'2026-10-16'}}));
  const p = await fr.evaluate(() => { const x = window.__bcPeriode('2026-10-13'); return x ? x.id : null; });
  ok(p === 'partiels', 'le 13 octobre est toujours en mode partiels (' + p + ')');
  const g = await grille(fr, '2026-10-13');
  /* Garde-fou du 23 septembre : les partiels ne remplacent plus rien, donc ils n'effacent
     plus la phase Español en dessous -- ils lui empruntent ses renommages. Sans ca, une
     semaine d'examen en octobre rendait tous les blocs Español au dropshipping. */
  ok(g.some(x => /14:00 Español/.test(x)), 'et 14:00 reste le bloc Español de la phase : les partiels ne l\'effacent pas (' + g.filter(x => /^14:00/.test(x)) + ')');
  ok(!g.some(x => /Cours$/.test(x)), 'le 13 octobre en partiels : pas de cours');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT (test86)');
process.exit(errs ? 1 : 0);
