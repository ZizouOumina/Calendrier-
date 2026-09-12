/* ===== 285) Le semestre 2, et les jours ouvrés sans cours =====

   Deux choses nouvelles dans la grille, et elles ne sont pas de la meme nature.

   Le SEMESTRE est dans la grille de BASE : 24 h de cours par semaine a partir du
   25 janvier, mardi et mercredi jusqu'a 21:30, et le lundi qui redemarre a 15:30. Il ne
   pouvait pas etre une periode : periodeGrille ne rend qu'une periode par date et la
   phase 3 court jusqu'au 14 mars -- un « semestre 2 » range parmi les periodes aurait
   masque la phase 3 pendant sept semaines. Ce test verifie precisement ce chevauchement.

   Les JOURS SANS COURS liberent la plage de cours : annale complete, correction, puis les
   blocs de projet de la phase en cours -- et le soir du week-end, diner a 19:00, coucher
   a 21:00. Ce qui compte : aucun bloc n'est pose deux fois dans la meme journee, les
   phases Español et le mode partiels s'appliquent par-dessus sans configuration en plus,
   et le coucher, le lever et la cible de sommeil suivent la DATE et non le jour de la
   semaine. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

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
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
/* la grille du jour a une date, sous forme « HH:MM Libellé » */
const jour = (fr, iso) => fr.evaluate(i => {
  const cle = window.__bcCle(new Date(i + 'T12:00:00').getDay());
  return window.__bcGrille(cle, i).map(b => b[0] + ' ' + b[1]);
}, iso);
const infos = (fr, iso) => fr.evaluate(i => {
  const cle = window.__bcCle(new Date(i + 'T12:00:00').getDay());
  return { cle, sem: (window.__bcSemestre(i) || {}).id || null, sans: window.__bcSansCours(i),
           per: (window.__bcPeriode(i) || {}).id || null,
           lever: window.__bcLever(cle, i), coucher: window.__bcCoucher(cle, i),
           sommeil: Math.round(window.__bcSommeilCible(i) * 100) / 100,
           cible: window.__bcCibleJour(cle, i) };
}, iso);

console.log('\n== 285) Le semestre 2 : 24 h de cours, mardi et mercredi jusqu\'a 21:30 ==');
{
  const { ctx, fr } = await ouvrir('2027-02-02T09:00:00+01:00');
  const lu = await infos(fr, '2027-02-01'), ma = await infos(fr, '2027-02-02');
  const me = await infos(fr, '2027-02-03'), je = await infos(fr, '2027-02-04'), ve = await infos(fr, '2027-02-05');
  ok([lu, ma, me, je, ve].every(x => x.sem === 's2'), 'du 1er au 5 février, semestre 2 : ' + [lu, ma, me, je, ve].map(x => x.sem).join('/'));

  const gl = await jour(fr, '2027-02-01');
  ok(gl.includes('15:30 Cours') && gl.includes('19:30 Trajet retour'),
     'lundi : le cours redémarre à 15:30 (il était à 17:30 au semestre 1) et finit à 19:30');
  ok(!gl.some(x => /Projets perso 4/.test(x)),
     'lundi : les deux heures libres de l\'après-midi du semestre 1 ont disparu — plus de Projets perso 4');

  const gm = await jour(fr, '2027-02-02');
  ok(gm.includes('15:30 Cours') && gm.includes('21:30 Trajet retour') && gm.includes('22:00 Dîner') && gm.includes('22:40 Coucher'),
     'mardi : cours 15:30 → 21:30, dîner 22:00, coucher 22:40');
  ok(!gm.some(x => /Comprendre le cours du jour/.test(x)),
     'mardi : aucun bloc de travail le soir — il n\'y a plus de soir');
  const gme = await jour(fr, '2027-02-03');
  ok(gme[0] === '06:30 Douche + préparation' && gme.includes('21:30 Trajet retour'),
     'mercredi : lever à 06:30 (le créneau Anki de 05:30 saute après une nuit courte) et cours jusqu\'à 21:30');

  ok(ma.coucher === '22:40' && me.coucher === '22:40' && lu.coucher === '21:55' && je.coucher === '21:55',
     'le coucher suit la DATE : 22:40 mardi et mercredi, 21:55 lundi et jeudi (' + [lu, ma, me, je].map(x => x.coucher).join('/') + ')');
  ok(me.lever === '06:30' && ma.lever === '05:30', 'le lever suit la date aussi : 06:30 le mercredi, 05:30 le mardi');
  ok(ma.sommeil === 7.58 && me.sommeil === 7.83 && je.sommeil === 6.83,
     'la cible de sommeil est celle que l\'emploi du temps permet, pas 8 h : ' + [ma, me, je].map(x => x.sommeil).join(' / ') + ' h');
  ok(ma.cible.rev === 210 && lu.cible.rev === 265,
     'mardi perd le bloc « Comprendre » : 210 min de révision contre 265 le lundi');
  await ctx.close();
}

console.log('\n== 286) Le chevauchement : la phase 3 tient pendant le semestre 2 ==');
{
  const { ctx, fr } = await ouvrir('2027-02-02T09:00:00+01:00');
  const v = await fr.evaluate(() => ({
    p25: (window.__bcPeriode('2027-01-25') || {}).id || null,
    p314: (window.__bcPeriode('2027-03-14') || {}).id || null,
    p315: (window.__bcPeriode('2027-03-15') || {}).id || null,
    es: (window.__bcGrille('tuesday', '2027-02-02').find(b => b[0] === '13:00') || [])[1],
    apres: (window.__bcGrille('tuesday', '2027-03-16').find(b => b[0] === '13:00') || [])[1]
  }));
  ok(v.p25 === 'es-3' && v.p314 === 'es-3', 'du 25 janvier au 14 mars, la phase 3 s\'applique malgré le semestre 2 (' + v.p25 + ' / ' + v.p314 + ')');
  ok(v.es === 'Español', 'le bloc de 13:00 est bien Español un mardi du semestre 2');
  ok(v.p315 === null && v.apres === 'Projets perso 2', 'le 15 mars la phase s\'arrête et le bloc revient aux projets');
  await ctx.close();
}

console.log('\n== 287) Un jour sans cours : la plage se libère, sans jamais doubler un bloc ==');
{
  const { ctx, fr } = await ouvrir('2026-10-12T09:00:00+02:00');
  const i = await infos(fr, '2026-10-12'), g = await jour(fr, '2026-10-12');
  ok(i.sans === true && i.per === 'es-1', 'le lundi 12 octobre (Fiesta Nacional) est sans cours, et toujours en phase 1');
  ok(!g.some(x => /Cours|Trajet cours|Trajet retour/.test(x)), 'plus de cours, plus de trajets : ' + g.slice(13, 16).join(' | '));
  ok(g.includes('16:50 Collation entraînement') && g.includes('17:00 Annale complète') && g.includes('18:00 Correction + cartes'),
     'la plage devient une annale complète puis sa correction');
  ok(g.includes('19:00 Dîner') && g.includes('21:00 Coucher'), 'le soir est celui du week-end : dîner 19:00, coucher 21:00');
  const pp4 = g.filter(x => /Español · hablar/.test(x));
  ok(pp4.length === 1 && pp4[0] === '15:00 Español · hablar',
     'le bloc que le lundi du semestre 1 portait déjà à 15:00 n\'est pas reposé une seconde fois (' + pp4.join(' / ') + ')');
  ok(i.coucher === '21:00' && i.sommeil === 8.5, 'coucher 21:00 et 8 h 30 de sommeil visées — un jour libre est une nuit pleine');

  /* le jeudi 1er avril 2027 : sans cours, hors phase Español -- les blocs de projet restent des projets */
  const a = await jour(fr, '2027-04-01');
  ok(a.includes('15:00 Annale complète') && a.includes('17:00 Projets perso 4') && a.includes('18:00 Projets perso 5'),
     'hors phase, la plage libérée porte les blocs de projet : ' + a.slice(14, 18).join(' | '));
  const doublons = a.filter((x, k) => a.some((y, l) => l !== k && y.slice(6) === x.slice(6) && x.slice(6) !== 'Temps libre'));
  ok(doublons.length === 0, 'aucun libellé en double dans la journée' + (doublons.length ? ' : ' + doublons.join(' / ') : ''));

  /* le vendredi 26 mars 2027 (Semana Santa) : la Jumu'ah est intacte, PP2 du matin non redouble */
  const f = await jour(fr, '2027-03-26');
  ok(f.some(x => /Jumu'ah/.test(x)) && f.includes('11:20 Projets perso 2') && f.includes('17:00 Projets perso 4'),
     'le vendredi garde sa Jumu\'ah, et Projets perso 2 du matin n\'est pas redoublé l\'après-midi');
  await ctx.close();
}

console.log('\n== 288) L\'entre-deux des semestres se déduit des dates, il n\'est dans aucune liste ==');
{
  const { ctx, fr } = await ouvrir('2027-01-21T09:00:00+01:00');
  const v = await fr.evaluate(() => ({
    j19: window.__bcSansCours('2027-01-19'), j20: window.__bcSansCours('2027-01-20'),
    j22: window.__bcSansCours('2027-01-22'), j25: window.__bcSansCours('2027-01-25'),
    liste: window.__bcJoursSansCours(),
    g: window.__bcGrille('weekday', '2027-01-21').map(b => b[0] + ' ' + b[1])
  }));
  ok(v.j19 === false && v.j20 === true && v.j22 === true && v.j25 === false,
     'le 19 il y a cours, du 20 au 22 non, le 25 le semestre 2 démarre (' + [v.j19, v.j20, v.j22, v.j25].join('/') + ')');
  ok(!v.liste.ajoutes.length && !v.liste.retires.length, 'et rien n\'a été saisi pour cela : c\'est déduit des dates de semestre');
  ok(v.g.includes('15:00 Annale complète') && v.g.includes('21:00 Coucher'), 'le jeudi 21 janvier a bien l\'agenda d\'un jour sans cours');
  await ctx.close();
}

console.log('\n== 289) Le mode partiels passe devant, même un jour sans cours ==');
{
  /* un examen le 4 janvier 2027 ouvre les partiels du 28 decembre au 4 janvier : le
     28 decembre est un lundi sans cours ET en mode partiels. La revision doit gagner. */
  const { ctx, fr } = await ouvrir('2026-12-28T09:00:00+01:00', {'batcave-examens':{'Anatomía I':'2027-01-04'}});
  const v = await fr.evaluate(() => ({
    p: (window.__bcPeriode('2026-12-28') || {}).id || null, sans: window.__bcSansCours('2026-12-28'),
    g: window.__bcGrille('monday', '2026-12-28').map(b => b[0] + ' ' + b[1]),
    c: window.__bcCibleJour('monday', '2026-12-28')
  }));
  ok(v.p === 'partiels' && v.sans === true, 'le 28 décembre : sans cours ET en mode partiels');
  const es = v.g.filter(x => /Español/.test(x));
  ok(es.length === 1, 'un seul bloc Español dans la journée, comme le veut le mode partiels (' + es.join(' / ') + ')');
  /* le 28 decembre est un LUNDI du semestre 1 : la collation est a 16:50, donc l'annale
     complete tombe a 17:00 et non a 15:00 comme les autres jours. */
  ok(v.g.includes('17:00 Annale complète') && v.g.filter(x => /Révision ciblée/.test(x)).length === 3,
     'la plage libérée est de la révision ciblée, pas du dropshipping : ' + v.g.filter(x => /Révision ciblée/.test(x)).length + ' blocs, annale à 17:00');
  ok(v.c.proj === 0, 'aucune minute de projet prévue la semaine d\'un examen (' + v.c.proj + ')');
  await ctx.close();
}

console.log('\n== 290) L\'en-tête « Emploi du temps » lit la plage dans la grille ==');
{
  const { ctx, fr } = await ouvrir('2027-02-02T09:00:00+01:00');
  const a = await fr.evaluate(() => document.getElementById('cal-schedule-label').textContent);
  ok(/mardi \(cours 15:30 → 21:30\)/.test(a), 'un mardi du semestre 2 : « ' + a + ' »');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-10-12T09:00:00+02:00');
  const b = await fr.evaluate(() => ({ l: document.getElementById('cal-schedule-label').textContent,
                                       g: document.querySelector('#bc-grille .v').textContent }));
  ok(/lundi \(pas de cours\)/.test(b.l), 'un lundi sans cours : « ' + b.l + ' »');
  ok(/pas de cours/.test(b.g), 'le relevé GRILLE du tableau de bord le dit aussi : « ' + b.g + ' »');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-18T09:00:00+02:00');
  const c = await fr.evaluate(() => document.getElementById('cal-schedule-label').textContent);
  ok(/vendredi \(Jumu'ah · cours 15:30 → 19:30\)/.test(c), 'le vendredi garde sa mention Jumu\'ah devant la plage : « ' + c + ' »');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
