/* Lot 50 — la Batcave a 100 % : un seul numero de schema, le panneau Sante et son releve,
   le plan de secours en texte, la reprise depuis Drive sur un appareil vide, les bornes de
   saisie, l'annulation par geste, le rappel de cloture dans l'agenda, le changement d'heure
   du 25 octobre, le demarrage en deux temps. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();
async function ouvrir(quand, seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const lire = (fr, k) => fr.evaluate(k => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))(k) || 'null'), k);

console.log('\n== 400) Un seul numéro de schéma ==');
{
  const { ctx, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  const r = await fr.evaluate(() => ({ s: window.__bcSchema(), m: window.__bcDrapeaux(), fini: window.__bcInitFini === true }));
  ok(r.s.attendu === 50 && r.s.enregistre === 50, 'batcave-schema écrit au démarrage : ' + r.s.enregistre + ' (attendu ' + r.s.attendu + ')');
  ok(r.m.length === 0, 'toutes les migrations ont posé leur drapeau au premier chargement (manquants : ' + (r.m.join(', ') || 'aucun') + ')');
  ok(await lire(fr, 'batcave-schema') === 50, 'la clé batcave-schema vaut 50');
  ok(r.fini, 'le second temps du démarrage (les autres onglets) est terminé');
  await ctx.close();
}

console.log('\n== 401) Santé de la Batcave : six contrôles, un relevé qui ne s\'allume qu\'en défaut ==');
{
  const { ctx, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  const r = await fr.evaluate(() => ({ vide: window.__bcAppVide(), sante: window.__bcSante().map(c => c.id + ':' + (c.ok ? 'ok' : 'KO')), releve: document.getElementById('bc-sante').hidden, banniere: document.getElementById('reprise-banner').hidden }));
  ok(r.vide === true, 'appareil neuf : l\'appli est vide (les charges fixes auto ne comptent pas)');
  ok(r.sante.every(x => /:ok$/.test(x)) && r.sante.length === 6, 'appli neuve : six contrôles, tous verts (' + r.sante.join(' ') + ')');
  ok(r.releve === true, 'le relevé SANTÉ de la barre reste caché quand tout est en ordre');
  ok(r.banniere === true, 'sans connecteur Drive, la bannière « Reprendre depuis Drive » ne s\'affiche pas');
  await ctx.close();
}
{
  const seed = {'batcave-journal-2026-09-25': {sommeil:'7', cloture:'21:20'}};
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00', seed);
  const r = await fr.evaluate(() => ({ vide: window.__bcAppVide(), sante: window.__bcSante().filter(c => !c.ok).map(c => c.id), releve: document.getElementById('bc-sante').hidden, txt: document.querySelector('#bc-sante .v').textContent }));
  ok(r.vide === false, 'une clôture suffit : l\'appli n\'est plus neuve');
  ok(r.sante.join(',') === 'sauvegarde,exercice,cloture', 'trois défauts : aucune sauvegarde, aucun exercice, clôture vieille de 3 jours (' + r.sante.join(', ') + ')');
  ok(r.releve === false && /3 défauts/.test(r.txt), 'le relevé SANTÉ s\'allume : ' + r.txt);
  await fr.evaluate(() => document.getElementById('bc-sante').click());
  await page.waitForTimeout(300);
  const p = await fr.evaluate(() => ({ ouvert: !document.getElementById('backup-overlay').hidden, n: document.querySelectorAll('#sante-liste li').length, rouges: document.querySelectorAll('#sante-liste .obj-led.retard').length, resume: document.getElementById('sante-resume').textContent }));
  ok(p.ouvert && p.n === 6 && p.rouges === 3, 'clic : le panneau Sauvegarde s\'ouvre avec les six lignes, trois en rouge (' + p.n + ' / ' + p.rouges + ') — ' + p.resume);
  await ctx.close();
}
{
  const seed = {'batcave-journal-2026-09-27': {sommeil:'7', cloture:'21:20'}, 'batcave-last-manual-backup': '2026-09-27', 'batcave-last-restore-drill': '2026-09-20'};
  const { ctx, fr } = await ouvrir('2026-09-28T10:00:00+02:00', seed);
  const r = await fr.evaluate(() => window.__bcSante().filter(c => !c.ok).map(c => c.id));
  ok(r.length === 0, 'sauvegarde d\'hier, exercice récent, clôture d\'hier : tout vert (' + (r.join(', ') || 'aucun défaut') + ')');
  await ctx.close();
}

console.log('\n== 402) Le plan de secours en texte ==');
{
  const { ctx, fr } = await ouvrir('2026-09-27T20:00:00+02:00');
  const t = await fr.evaluate(() => window.__bcPlanTexte('2026-09-28'));
  ok(/^LA BATCAVE — plan de la semaine du 28 sept\. au 04 oct\./.test(t), 'en-tête : ' + t.split('\n')[0]);
  ok(/LUNDI 28 sept\. — combat\n  05:30  Sport\n/.test(t) && /  10:30  🥋 JJB\n/.test(t), 'lundi : la grille combat, ligne par ligne');
  ok(/MARDI 29 sept\. — combat[\s\S]*  19:30  🥊 Muay Thai\n[\s\S]*  22:00  Coucher/.test(t), 'mardi : Muay Thai 19:30, coucher 22:00');
  ok(/DIMANCHE 04 oct\.\n/.test(t) && !/DIMANCHE 04 oct\. — combat/.test(t), 'dimanche : pas de combat');
  ok(/LES 5 QUI COMPTENT\n  Sommeil : /.test(t) && /\n  Argent : /.test(t), 'les cinq qui comptent, avec leur chiffre du jour');
  ok(/Lever 05:30 · coucher 21:35 · eau 3,5 L les jours de combat, 3 L sinon\./.test(t), 'pied : lever, coucher, eau — ' + t.split('\n').pop());
  ok(!/undefined|NaN|\[object/.test(t), 'aucune valeur brute dans le texte');
  await ctx.close();
}

console.log('\n== 403) Les bornes de saisie et l\'annulation d\'un geste ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T20:30:00+02:00');
  await fr.evaluate(() => document.getElementById('bc-cloture').click());
  await page.waitForTimeout(300);
  ok(await fr.evaluate(() => !document.getElementById('cloture-overlay').hidden), 'la clôture s\'ouvre depuis la barre');
  await fr.evaluate(() => { document.getElementById('cl-sommeil').value = '25'; document.getElementById('cloture-valider').click(); });
  await page.waitForTimeout(200);
  const r1 = await fr.evaluate(() => ({ toast: document.getElementById('toast').textContent, ouvert: !document.getElementById('cloture-overlay').hidden, actif: document.activeElement && document.activeElement.id }));
  ok(/Valeur impossible : 25 h de sommeil \(attendu entre 0 et 14\)/.test(r1.toast) && r1.ouvert, '25 h de sommeil : refusé, la clôture reste ouverte — ' + r1.toast);
  ok(r1.actif === 'cl-sommeil', 'le curseur revient sur le champ fautif (' + r1.actif + ')');
  ok(await lire(fr, 'batcave-journal-2026-09-28') === null || !(await lire(fr, 'batcave-journal-2026-09-28')).cloture, 'rien n\'est enregistré');
  await fr.evaluate(() => { document.getElementById('cl-sommeil').value = '7'; document.getElementById('cl-poids').value = '700'; document.getElementById('cloture-valider').click(); });
  await page.waitForTimeout(200);
  ok(/Valeur impossible : 700 kg/.test(await fr.evaluate(() => document.getElementById('toast').textContent)), '700 kg : refusé aussi');
  await fr.evaluate(() => { document.getElementById('cl-poids').value = '72'; document.getElementById('cl-aulit').value = '6'; document.getElementById('cloture-valider').click(); });
  await page.waitForTimeout(200);
  ok(/au lit ne peut pas être plus court/.test(await fr.evaluate(() => document.getElementById('toast').textContent)), '6 h au lit pour 7 h de sommeil : refusé');
  await fr.evaluate(() => { document.getElementById('cl-aulit').value = '8'; document.getElementById('cloture-valider').click(); });
  await page.waitForTimeout(300);
  const j = await lire(fr, 'batcave-journal-2026-09-28');
  ok(j && j.cloture && j.sommeil === '7' && j.poids === '72', 'valeurs plausibles : la clôture passe (' + JSON.stringify({s: j && j.sommeil, p: j && j.poids}) + ')');
  const t2 = await fr.evaluate(() => ({ txt: document.getElementById('toast').textContent, bouton: !!document.querySelector('#toast .toast-annuler'), cache: document.getElementById('toast').hidden }));
  ok(/Journée clôturée/.test(t2.txt) && t2.bouton && !t2.cache, 'le toast de clôture porte un bouton « Annuler »');
  /* Annuler : la clôture a écrit le journal, les habitudes et le livrable dans un seul
     geste ; tout doit revenir d'un coup (rechargement de la page). */
  await fr.evaluate(() => document.querySelector('#toast .toast-annuler').click());
  await page.waitForTimeout(1200);
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  const j2 = await fr2.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-journal-2026-09-28') || 'null'));
  ok(!j2 || !j2.cloture, 'après « Annuler », la journée n\'est plus clôturée (' + JSON.stringify(j2) + ')');
  ok(/annulée/.test(await fr2.evaluate(() => document.getElementById('toast').textContent)), 'et la Batcave le dit : ' + (await fr2.evaluate(() => document.getElementById('toast').textContent)));
  await ctx.close();
}
{
  /* les séries de sport : 250 reps ou 300 kg sont des fautes de frappe */
  const { ctx, page, fr } = await ouvrir('2026-10-01T06:00:00+02:00');
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="sport"]').click(); });
  await page.waitForTimeout(300);
  const r = await fr.evaluate(() => {
    const avant = (JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-sport-log') || '[]')).length;
    const ok1 = window.__bcLogSession ? true : true;
    return { avant };
  });
  const res = await fr.evaluate(() => {
    /* saisie directe par la fonction : une série absurde, puis une bonne */
    const ex = {name:'Tractions', reps:'3×5-8'};
    const a = window.__bcEnregistrerSeries('Haut lourd', 0, ex, '250/8/8', '0');
    const toastA = document.getElementById('toast').textContent;
    const b = window.__bcEnregistrerSeries('Haut lourd', 0, ex, '8/8/8', '300');
    const toastB = document.getElementById('toast').textContent;
    const c = window.__bcEnregistrerSeries('Haut lourd', 0, ex, '8/8/8', '5');
    const toastC = document.getElementById('toast').textContent;
    return { a, toastA, b, toastB, c, toastC, n: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-sport-log') || '[]').length, bouton: !!document.querySelector('#toast .toast-annuler') };
  });
  ok(res.a === false && /Saisie impossible \(250 reps\)/.test(res.toastA), '250 reps : refusé — ' + res.toastA);
  ok(res.b === false && /Saisie impossible \(300 kg\)/.test(res.toastB), '300 kg : refusé — ' + res.toastB);
  ok(res.c === true && res.n === 1 && /Tractions : 8\/8\/8 @5 kg enregistré/.test(res.toastC) && res.bouton, '8/8/8 @5 kg : enregistré, avec « Annuler » — ' + res.toastC);
  await ctx.close();
}

console.log('\n== 404) Le rappel de clôture part dans l\'agenda, et disparaît une fois la journée close ==');
{
  const { ctx, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  const r = await fr.evaluate(() => ({
    lun: window.__bcRappels('2026-09-28').filter(b => b.cle === 'cloture')[0],
    mar: window.__bcRappels('2026-09-29').filter(b => b.cle === 'cloture')[0],
    avant: window.__bcRappels('2026-09-20').filter(b => b.cle === 'cloture').length,
    ete: window.__bcRappels('2027-07-05').filter(b => b.cle === 'cloture').length
  }));
  ok(r.lun && r.lun.debut === 20 * 60 + 5 && r.lun.fin === r.lun.debut + 5 && r.lun.libre === true && r.lun.rappel === 0 && r.lun.titre === '🦇 Clôture du jour', 'lundi : « Clôture du jour » à 20:05 (coucher 21:35 − 1 h 30), 5 min, n\'occupe pas l\'agenda');
  ok(r.mar && r.mar.debut === 20 * 60 + 30, 'mardi (coucher 22:00) : à 20:30');
  ok(r.avant === 0, 'avant le programme : pas de rappel');
  ok(r.ete === 1, 'l\'été aussi (journées sans cours, elles travaillent) : le rappel y est');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-28T21:00:00+02:00', {'batcave-journal-2026-09-28': {sommeil:'7', cloture:'20:40'}});
  const n = await fr.evaluate(() => window.__bcRappels('2026-09-28').filter(b => b.cle === 'cloture').length);
  ok(n === 0, 'journée déjà clôturée : le rappel n\'est plus dans la liste (il sera retiré de l\'agenda)');
  await ctx.close();
}

console.log('\n== 405) Le changement d\'heure du 25 octobre ==');
{
  const { ctx, fr } = await ouvrir('2026-10-25T10:00:00+01:00');
  const r = await fr.evaluate(() => ({
    avant: window.__bcDecalage('2026-10-24'), jour: window.__bcDecalage('2026-10-25'), apres: window.__bcDecalage('2026-10-26'),
    som: window.__bcSommeilCible('2026-10-25'), somLun: window.__bcSommeilCible('2026-10-26'),
    lever: window.__bcLever('weekend', '2026-10-25'),
    premier: window.__bcRappels('2026-10-26')[0], grille: window.__bcGrille('weekend', '2026-10-25').map(b => b[0] + ' ' + b[1]),
    heure: document.getElementById('bc-time') ? document.getElementById('bc-time').textContent : ''
  }));
  ok(r.avant === '+02:00' && r.jour === '+01:00' && r.apres === '+01:00', 'décalage Madrid : +02:00 le 24, +01:00 dès le 25 (' + [r.avant, r.jour, r.apres].join(' / ') + ')');
  ok(Math.abs(r.som - (24 - 21 - 35 / 60 + 5.5)) < 0.01 && Math.abs(r.somLun - r.som) < 0.01, 'la cible de sommeil suit la grille (7 h 55), pas l\'heure gagnée cette nuit-là (' + r.som.toFixed(2) + ' h)');
  ok(r.lever === '05:30' && r.grille[0] === '05:30 Projets perso matinal', 'dimanche 25 : lever 05:30, la grille combat du dimanche');
  ok(r.premier && r.premier.debut === 330, 'lundi 26 : le premier rappel part à 05:30 (' + r.premier.debut + ' min)');
  await ctx.close();
}

console.log('\n== 406) Le démarrage en deux temps : un onglet ouvert tout de suite est construit ==');
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-28T10:00:00+02:00') });
  await page.goto('http://127.0.0.1:8199/batcave.html', {timeout:20000}).catch(() => {});
  /* juste après le chargement : le tableau de bord est là ; on clique Sport sans attendre */
  const r = await page.evaluate(() => {
    const plan = document.getElementById('dash-plan').innerText.length > 0;
    window.__bcInitFini = window.__bcInitFini || false;
    document.querySelector('.nav-btn[data-page="sport"]').click();
    return { plan, fini: window.__bcInitFini === true, sport: document.getElementById('sport-grid').innerText.length > 50 };
  });
  ok(r.plan, 'le plan du jour est rendu dès le premier temps');
  ok(r.fini && r.sport, 'le clic sur Sport termine l\'initialisation et l\'onglet est plein (' + r.sport + ')');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\nFAILS: ' + errs : '\nALL OK');
process.exit(errs ? 1 : 0);
