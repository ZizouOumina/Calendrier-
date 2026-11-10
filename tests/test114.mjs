import { chromium } from 'playwright';
/* Le mois de l'argent (onglet Budget). Depuis le 1er octobre, sa mere paie elle-meme le
   loyer et le wifi au proprietaire, et lui vire 700 EUR (plus 1 400) ; le 1er octobre, la Muay Thai sort : le club passe a 70 EUR, plus une licence de 30 EUR par an ; le virement arrive le 25 (sa decision
   du 25 septembre au soir) ; le tout premier arrive encore le 28 septembre. La premiere
   periode va donc du 28 septembre au 24 octobre, les suivantes du 25 au 24. Les courses se
   font le samedi, et une periode en compte 4 ou 5 : le montant pose le jour du virement doit
   tenir meme avec 5, le reste part la veille du suivant. Ce test verifie les chiffres, le fil
   (solde a zero a la fin, jamais negatif), le recalcul quand une charge change, les consignes
   de mise en place, et la mise en page sur iPhone. */
const URL = process.env.BC_URL || 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const pres = (a, b) => Math.abs(a - b) < 0.02;
const browser = await chromium.launch();

async function ouvrir(quand, opts = {}){
  const ctx = await browser.newContext({ viewport: opts.viewport || {width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(opts.charges) await ctx.addInitScript(ch => {
    localStorage.setItem('batcave-fixed-charges', JSON.stringify(ch));
  }, opts.charges);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); document.querySelector('.nav-btn[data-page="budget"]').click(); });
  await page.waitForTimeout(400);
  return {ctx, page, fr};
}

console.log('— vendredi 25 septembre : la premiere periode, 28 sept. -> 24 oct.');
{
  const {ctx, fr} = await ouvrir('2026-09-25T20:00:00+02:00');
  const a = await fr.evaluate(() => window.__bcMoisArgent('2026-09-25'));
  ok(a.revenu === 700, 'revenu : 700 EUR (loyer et wifi payes par sa mere)');
  /* 8 novembre : plus de transports (pas de carte), Basic-Fit Premium (29,99 EUR toutes les 4 semaines,
     32,49 EUR par mois), la licence payee en une fois en novembre (lissee dans le budget). */
  ok(pres(a.fixes, 240.99), 'charges fixes : 240,99 EUR, sans loyer ni wifi ni transports, club 70 EUR, licence lissee a 2,50 EUR, Basic-Fit Premium a 32,49 EUR par mois (' + a.fixes + ')');
  /* 21 octobre : le couscous, les fruits rouges, les galettes de riz et les sardines entrent sans prix
     (son ticket) -- hors du calcul jusque-la ; le riz sort, les oeufs, les amandes, l'huile et le miel baissent.
     Le meme soir, le shake de recup des jours de JJB : 3 bananes, 750 ml de boisson d'avoine et 60 g de
     flocons de plus par semaine, +1,18 EUR (38,59 -> 39,77). */
  /* 23 octobre : plus de creme a midi, l'huile d'olive revient les mardis, vendredis et samedis -- +30 ml, +0,18 EUR. */
  /* 23 octobre au soir, le plan dense : riz midi et soir, 100 g de viande, plus de pain ni de fruits, l'huile
     et les amandes remontent ; les dattes attendent leur prix -- 40,48 EUR par semaine. */
  /* 25 octobre : 50 g de viande par repas (≈ 120 g de proteines), 20 g de miel le matin -- 34,51 EUR. */
  /* 25 octobre au soir : 70 g (0,4 g/kg de proteines par repas) -- 37,24 EUR. */
  /* 26 octobre : le fromage sort, 5 oeufs de plus par semaine -- 38,01 EUR. */
  /* 27 octobre : le cottage cheese (prix a relever, hors total) remplace le 3e oeuf -- 36,61 EUR. */
  /* 30 octobre : plus de sauces -- 10 g d'amandes de plus par jour (+0,84 EUR) et les 5 ml d'huile que
     la sauce remplacait le soir (+0,21 EUR) : 37,65 EUR. */
  /* 30 octobre : son releve chez Alcampo -- les fruits rouges, 2,85 EUR les 450 g (6,33 EUR/kg), 700 g par
     semaine : +4,43 EUR, 42,09 EUR. */
  /* 8 novembre : le cottage cheese sort (il le degoute ; il n'avait pas de prix, il etait hors du total) et
     5 oeufs de plus par semaine entrent : +1,41 EUR, 43,50 EUR. Le meme soir, le budget remis au reel (sans
     transports, avec Basic-Fit, la licence en une fois) : la cagnotte garde la marge d'un second
     prelevement Basic-Fit dans une periode (27,49 EUR) -- 170 EUR. */
  /* 9 novembre au soir : deux sessions de batch, le dimanche midi frais -- 3 oeufs de plus, 70 g de poulet et
     10 ml d'huile de moins par semaine : 43,76 EUR (le plafond, lui, baisse : les oeufs restent en 3 boites de 6). */
  /* Le meme soir, le Nutella remplace le miel sur les galettes du JJB : 45 g de miel de moins par semaine
     (-0,45 EUR), le Nutella attend son prix -- 43,31 EUR ; un pot de miel de moins toutes les cinq semaines. */
  ok(pres(a.semaine, 43.31), 'courses : 43,31 EUR par semaine hors les articles sans prix (dattes, sardines, galettes, Nutella), les fruits rouges releves le 30 octobre, les oeufs du 8 et du 9 novembre, le miel du shake seul (' + a.semaine.toFixed(2) + ')');
  ok(a.estimes.length === 0, 'plus aucune estimation : les amandes ont leur prix releve');
  /* 9 novembre, la nuit : le soin, la sante et le menage entrent dans le plan -- 9,63 EUR par semaine en moyenne
     (9,54 avec les pastilles du lave-vaisselle, 9,93 a un lavage par jour ; le Skinoren compte 19,90 EUR), des le samedi 14. La periode la plus chere (5 samedis) en porte 49,65 : la
     cagnotte descend de 180 a 130 EUR. */
  ok(a.cagnotte === 130, 'jour du virement : 130 EUR dans la cagnotte (230 avant le prix des fruits rouges, 30 octobre ; 200 avant les oeufs du 8 novembre ; 190 avant Basic-Fit ; 170 avant le pot de miel en moins du 9 novembre au soir ; 180 avant le soin et le menage) — ce que laisse la periode la plus chere, les courses comptees en caisse (plan dense du 23 octobre au soir) (' + a.cagnotte + ')');
  ok(a.periode.debut === '2026-09-28' && a.periode.fin === '2026-10-24', 'premiere periode du 28 sept. (dernier virement a l\'ancienne date) au 24 oct.');
  ok(a.periode.samedis === 4, '4 samedis de courses');
  ok(pres(a.periode.balayage, 142.62), 'le 24 : environ 142,62 EUR a balayer — cette periode-ci n\'a pas encore de soin ni de menage (ils commencent le 14 novembre), et la cagnotte prend 50 EUR de moins (' + a.periode.balayage.toFixed(2) + ')');
  ok(pres(a.moyenne, 215.55), 'epargne moyenne : 215,55 EUR par mois — 258,58 moins les 43,03 EUR du soin et du menage, un lave-vaisselle par jour (hors les prix a relever) (' + a.moyenne.toFixed(2) + ')');
  ok(a.prochaine5 && a.prochaine5.debut === '2026-12-25' && a.prochaine5.fin === '2027-01-24' && a.prochaine5.samedis === 5, 'prochaine periode a 5 samedis : 25 dec. -> 24 janv.');
  ok(pres(a.prochaine5.balayage, 31.11), 'avec 5 samedis, les reserves, le soin et le menage, il reste encore 31,11 EUR le 24, la marge d\'un second prelevement Basic-Fit (' + a.prochaine5.balayage.toFixed(2) + ')');
  const L = a.lignes;
  ok(L[0].montant === 700 && L[0].plus && L[0].quand === 'le 28', 'le fil commence par le virement, le 28 pour cette premiere periode');
  ok(L[1].montant === 130 && L[1].cagnotte && L[1].quand === 'le 28', 'puis la cagnotte, le meme jour');
  const club = L.find(l => /club/.test(l.action));
  ok(club && club.montant === 70 && club.quand === 'le 5', 'le club, 70 EUR, le 5 : il le paie le lundi 5, premier jour de JJB (4 octobre)');
  const lic = L.find(l => /Licence/.test(l.action));
  /* 8 novembre : la licence se paie en une fois, en novembre -- pas de ligne dans cette periode-ci. */
  ok(!lic, 'la licence JJB se paie en une fois, en novembre : aucune ligne du 28 sept. au 24 oct.');
  const nov = await fr.evaluate(() => { const b = window.__bcMoisArgent('2026-11-08'); return {lic: b.lignes.find(l => /Licence/.test(l.action)) || null, bf: b.lignes.find(l => /Basic-Fit/.test(l.action)) || null, somme: b.lignes.slice(1).reduce((t, l) => t + l.montant, 0)}; });
  ok(nov.lic && nov.lic.montant === 30 && /en une fois/.test(nov.lic.action), 'du 25 oct. au 24 nov. : la licence, 30 EUR en une fois (' + JSON.stringify(nov.lic) + ')');
  ok(nov.bf && pres(nov.bf.montant, 32.49) && /29,99/.test(nov.bf.detail) && /13 fois par an/.test(nov.bf.detail), 'Basic-Fit : 29,99 EUR toutes les 4 semaines, 32,49 EUR par mois dans le fil (' + (nov.bf && nov.bf.detail) + ')');
  ok(pres(nov.somme, 700), 'et ce fil-la aussi fait exactement 700 EUR (' + nov.somme + ')');
  const proprio = L.find(l => /propri/.test(l.action));
  ok(proprio && proprio.montant === 70 && proprio.quand === 'le 1er', 'au proprietaire, seulement l\'eau et l\'electricite : 70 EUR le 1er');
  ok(proprio && /\u00e0 la main/.test(proprio.action) && /lui qui te le donne/.test(proprio.detail), 'le virement du proprietaire : a la main, au montant qu\'il donne');
  ok(proprio && /Eau \+ \u00c9lectricit\u00e9 70/.test(proprio.detail) && !/Loyer|Wifi/.test(proprio.detail), 'le detail du virement : eau et electricite, plus de loyer ni de wifi');
  ok(['iCloud', 'Claude Pro', 'Bouygues'].every(n => L.some(l => l.action === n && !l.faire)), 'iCloud, Claude Pro et Bouygues partent seuls (auto)');
  ok(Math.abs(L[L.length - 1].solde) < 0.001 && L[L.length - 1].quand === 'le 24', 'le 24, le compte est a zero apres le balayage');
  ok(L.every(l => l.solde > -0.001), 'le solde n\'est jamais negatif dans le fil');
  const somme = L.slice(1).reduce((t, l) => t + l.montant, 0);
  ok(pres(somme, 700), 'tout ce qui sort fait exactement 700 EUR');
  const txt = await fr.evaluate(() => document.getElementById('budget-mois-panel').innerText);
  ok(/Le mois de l.argent/.test(txt), 'le panneau est dans l\'onglet Budget');
  ok(txt.includes('170,00 €') && txt.includes('700,00 €'), 'montants affiches : 170,00 EUR et 700,00 EUR');
  ok(/28 sept\..*24 oct\..*4 samedis/.test(txt), 'la periode et ses samedis sont ecrits en tete');
  ok(/Le 28, dans la cagnotte/.test(txt) && /Ce mois-ci le 28, puis chaque 25/.test(txt), 'la tuile dit : ce mois-ci le 28, puis chaque 25');
  ok(/Le 24, en plus/.test(txt), 'la tuile du balayage dit le 24');
  ok(/virement permanent de 700 \u20ac le 25/.test(txt) && /loyer et le wifi, elle les paie elle-m\u00eame/.test(txt), 'consigne : le virement permanent de 700 EUR le 25, le loyer et le wifi payes par sa mere');
  ok(/Jar/.test(txt) && /\u00c9pargne et business/.test(txt), 'consigne : la cagnotte Wise');
  const faits = await fr.evaluate(() => [...document.querySelectorAll('.ma-setup li')].filter(li => li.querySelector('.badge.good')).map(li => li.querySelector('b').textContent));
  ok(faits.length === 3 && /Jar/.test(faits[0]) && /iCloud/.test(faits[1]) && /Bouygues/.test(faits[2]), 'trois consignes marquees faites : le Jar, Apple et Bouygues ' + JSON.stringify(faits));
  ok(/virement du 1er se fait \u00e0 la main, jamais programm\u00e9/.test(txt) && /il te dit combien payer/.test(txt) && !/rel\u00e8ve leur prix/.test(txt), 'consigne : le proprietaire donne le montant, virement a la main ; plus de consigne pour les amandes');
  ok(/le vrai montant suit ta conso/.test(txt) && !/pas encore connu/.test(txt), 'le pied dit : eau et electricite suivent la conso');
  ok(/le 25 \(virement et cagnotte\), le 1er \(propri\u00e9taire\), le 5 \(club\), le 24/.test(txt), 'les quatre rappels de l\'agenda sont nommes');
  ok(/Si le 25 tombe un week-end/.test(txt), 'regle : un 25 de week-end, c\'est prevu');
  ok(/70 € estim/.test(txt) && !/prix à relever/.test(txt) && !/amandes/i.test(txt), 'une seule estimation dite : l\'eau et l\'electricite (les amandes ont leur prix)');
  const ordre = await fr.evaluate(() => { const p = document.getElementById('budget-mois-panel'); return p.previousElementSibling && p.previousElementSibling.id; });
  ok(ordre === 'budget-stats', 'place juste sous les chiffres du mois');
  await ctx.close();
}

console.log('— dimanche 3 janvier : une periode a 5 samedis');
{
  const {ctx, fr} = await ouvrir('2027-01-03T20:00:00+01:00');
  const a = await fr.evaluate(() => window.__bcMoisArgent('2027-01-03'));
  ok(a.periode.debut === '2026-12-25' && a.periode.fin === '2027-01-24' && a.periode.samedis === 5, 'periode du 25 dec. au 24 janv., 5 samedis');
  ok(a.cagnotte === 130, 'la cagnotte du 25 ne bouge pas : 130 EUR');
  ok(a.periode.balayage >= 0, 'et le compte ne passe pas dans le rouge (' + a.periode.balayage.toFixed(2) + ' EUR le 24)');
  ok(a.lignes[0].quand === 'le 25' && a.lignes[1].quand === 'le 25' && a.lignes[a.lignes.length - 1].quand === 'le 24', 'virement et cagnotte le 25, balayage le 24');
  const tete = await fr.evaluate(() => document.getElementById('ma-periode').textContent);
  ok(/25 déc\..*24 janv\..*5 samedis/.test(tete), 'la tete dit 5 samedis (' + tete + ')');
  const tuile = await fr.evaluate(() => document.querySelector('.ma-chiffre').innerText);
  ok(/Le 25, dans la cagnotte/.test(tuile) && /Fixe, chaque mois/.test(tuile), 'la tuile dit le 25, sans mention de transition');
  /* deux ans de periodes : jamais de solde negatif le 27 */
  const neg = await fr.evaluate(() => {
    const r = []; let x = '2026-09-28';
    for(let k = 0; k < 24; k++){
      const a = window.__bcMoisArgent(x);
      if(a.periode.balayage < 0) r.push(x);
      const d = new Date(a.periode.fin + 'T00:00:00'); d.setDate(d.getDate() + 1);
      x = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    return r;
  });
  ok(neg.length === 0, '24 periodes : aucune fin de periode dans le rouge ' + JSON.stringify(neg));
  ok(await fr.evaluate(() => window.__bcMoisArgent('2026-09-01').periode.debut === '2026-09-28'), 'avant le premier virement, le plan montre la periode du 28 sept.');
  ok(await fr.evaluate(() => window.__bcMoisArgent('2026-09-25').periode.debut === '2026-09-28'), 'le 25 septembre (aujourd\'hui) : pas encore de virement, le plan montre la periode du 28');
  ok(await fr.evaluate(() => window.__bcMoisArgent('2026-10-24').periode.debut === '2026-09-28' && window.__bcMoisArgent('2026-10-25').periode.debut === '2026-10-25'), 'le 24 oct. ferme la premiere periode, le 25 ouvre la suivante');
  ok(await fr.evaluate(() => window.__bcMoisArgent('2027-02-24').periode.debut === '2027-01-25' && window.__bcMoisArgent('2027-02-25').periode.fin === '2027-03-24'), 'fevrier : le 25 fevr. ouvre une periode qui finit le 24 mars');
  await ctx.close();
}

console.log('— une charge qui change : le plan suit');
{
  const charges = [
    {id:'fc3', label:'Téléphone portable', montant:11, cat:'Abonnements'},
    {id:'fc5', label:'Eau + Électricité', montant:70, cat:'Eau & Électricité'},
    {id:'fc6', label:'Transports', montant:40, cat:'Transport (TAM)'},
    {id:'fc7', label:'Coiffeur', montant:30, cat:'Autres'},
    {id:'fc8', label:'iCloud', montant:3, cat:'Abonnements'},
    {id:'fc9', label:'Claude Pro', montant:22, cat:'Abonnements'},
    {id:'fc10', label:'Club JJB', montant:70, cat:'Abonnements'},
    {id:'fc11', label:'Licence JJB', montant:30, cat:'Abonnements', periode:'annuel'},
    {id:'fcx1', label:'Assurance', montant:240, cat:'Autres', periode:'annuel'}
  ];
  const {ctx, fr} = await ouvrir('2026-09-25T20:00:00+02:00', {charges});
  const a = await fr.evaluate(() => window.__bcMoisArgent('2026-09-25'));
  /* 8 novembre : la v5 retire les transports a 40 EUR (pas de carte) et ajoute Basic-Fit Premium. */
  ok(pres(a.fixes, 260.99), 'charges fixes : 260,99 EUR avec une assurance lissee de 20 EUR (sans transports, avec Basic-Fit) (' + a.fixes + ')');
  ok(a.cagnotte === 110, 'la cagnotte du 28 descend a 110 EUR (150 avant le pot de miel en moins du 9 novembre au soir, 160 avant le soin et le menage) (' + a.cagnotte + ')');
  const autre = a.lignes.find(l => /Assurance/.test(l.action));
  ok(autre && autre.action === 'Assurance' && pres(autre.montant, 20), 'la charge sans date passe dans le fil : 20 EUR par mois -- la licence, payee en une fois en novembre, n\'est pas de cette periode (' + (autre && autre.action) + ')');
  ok(Math.abs(a.lignes[a.lignes.length - 1].solde) < 0.001, 'et le compte finit toujours a zero le 27');
  ok(a.lignes[a.lignes.length - 1].cagnotte && /Balaye/.test(a.lignes[a.lignes.length - 1].action), 'le balayage reste la derniere ligne');
  await ctx.close();
}

console.log('— des charges au-dessus du virement : le fil le dit, sans solde negatif affiche');
{
  const charges = [
    {id:'fcx2', label:'Assurance auto', montant:800, cat:'Autres'},
    {id:'fc5', label:'Eau + Électricité', montant:70, cat:'Eau & Électricité'},
    {id:'fc8', label:'iCloud', montant:3, cat:'Abonnements'},
    {id:'fc9', label:'Claude Pro', montant:22, cat:'Abonnements'},
    {id:'fc10', label:'Club JJB', montant:70, cat:'Abonnements'},
    {id:'fc11', label:'Licence JJB', montant:30, cat:'Abonnements', periode:'annuel'}
  ];
  const {ctx, fr} = await ouvrir('2026-09-25T20:00:00+02:00', {charges});
  const a = await fr.evaluate(() => window.__bcMoisArgent('2026-09-25'));
  ok(a.cagnotte === 0, 'rien dans la cagnotte le 28 (' + a.cagnotte + ')');
  const der = a.lignes[a.lignes.length - 1];
  ok(der.montant < 0 && der.plus && /manque/.test(der.action), 'la derniere ligne dit ce qui manque (' + der.montant.toFixed(2) + ')');
  ok(Math.abs(der.solde) < 0.001, 'et ramene le compte a zero');
  const txt = await fr.evaluate(() => document.getElementById('budget-mois-panel').innerText);
  ok(!/−-|\+-/.test(txt), 'aucun montant a double signe dans le panneau');
  await ctx.close();
}

console.log('— le plafond Nourriture suit le prix des amandes');
{
  for(const [avant, attendu, nom, drapeaux] of [[201, 200, 'pose par la Batcave (201) : suit le plan en caisse, 200 (conditionnements et cycles compris ; hors les prix a relever ; les fruits rouges releves le 30 octobre ; les oeufs du 8 novembre ; les deux batchs et le Nutella du 9)'], [209, 200, 'la valeur du 4 octobre (209) : 200'], [206, 200, 'la valeur du 6 octobre (206) : 200'], [180, 180, 'regle a la main (180) : ne bouge pas'],
      /* 8 novembre : sa Batcave a deja joue les migrations v2 a v7 et garde 201 ; la v8 le remonte */
      [201, 200, 'deja migre jusqu\'a la v7, toujours 201 : la v8 le recale a 200 (les oeufs du 8 novembre, les deux batchs et le Nutella du 9)', ['v2', 'v3', 'v4', 'v5', 'v6', 'v7']],
      /* 9 novembre au soir : sa Batcave garde les 209 poses par la v8 la veille ; la v9 les ramene a 207 */
      [209, 200, 'deja migre jusqu\'a la v8, 209 : la v9 le ramene a 200 (le dimanche midi frais, le Nutella)', ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']],
      /* le meme soir : une Batcave qui a deja la v9 garde 207 ; la v10 (le Nutella) le ramene a 200 */
      [207, 200, 'deja migre jusqu\'a la v9, 207 : la v10 le ramene a 200 (un pot de miel en moins)', ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9']],
      [180, 180, 'deja migre jusqu\'a la v9, regle a la main (180) : la v10 n\'y touche pas', ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9']],
      [180, 180, 'deja migre jusqu\'a la v8, regle a la main (180) : la v9 n\'y touche pas', ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']],
      [180, 180, 'deja migre jusqu\'a la v7, regle a la main (180) : la v8 n\'y touche pas', ['v2', 'v3', 'v4', 'v5', 'v6', 'v7']]]){
    const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
    await ctx.addInitScript(([v, d]) => { window.claude = undefined; localStorage.setItem('batcave-budget-limits', JSON.stringify({Nourriture: v})); d.forEach(k => localStorage.setItem('batcave-plafond-nourriture-' + k, 'true')); }, [avant, drapeaux || []]);
    const page = await ctx.newPage();
    page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
    await page.clock.install({ time: new Date('2026-09-25T21:00:00+02:00') });
    await page.goto(URL);
    await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:20000 });
    const fr = page.frames().find(x => x.url().includes('batcave.html'));
    await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout:20000});
    const p = await fr.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-budget-limits') || '{}').Nourriture);
    ok(p === attendu, 'plafond ' + nom + ' (' + p + ')');
    await ctx.close();
  }
}

console.log('— iPhone, theme jour');
{
  const {ctx, fr} = await ouvrir('2026-09-25T20:00:00+02:00', {viewport:{width:390, height:844}});
  await fr.evaluate(() => document.documentElement.setAttribute('data-theme', 'jour'));
  const m = await fr.evaluate(() => {
    const p = document.getElementById('budget-mois-panel');
    const tuiles = [...p.querySelectorAll('.ma-chiffre')].map(t => t.getBoundingClientRect());
    const deb = [...p.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'auto' && e.clientWidth > 0).map(e => e.className);
    return {sw: document.documentElement.scrollWidth, iw: window.innerWidth, col: tuiles.every(t => Math.abs(t.left - tuiles[0].left) < 1), deb};
  });
  ok(m.sw <= m.iw, 'pas de defilement horizontal (' + m.sw + '/' + m.iw + ')');
  ok(m.col, 'les trois chiffres s\'empilent en une colonne');
  ok(m.deb.length === 0, 'aucun texte coupe dans le panneau ' + JSON.stringify(m.deb));
  await ctx.close();
}

await browser.close();
console.log(errs ? 'ECHECS: ' + errs : 'TOUT OK');
process.exit(errs ? 1 : 0);
