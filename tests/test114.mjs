import { chromium } from 'playwright';
/* Le mois de l'argent (onglet Budget). Le virement de 1 400 EUR arrive le 25 (sa decision
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
  ok(a.revenu === 1400, 'revenu : 1 400 EUR');
  ok(a.fixes === 987, 'charges fixes : 987 EUR (' + a.fixes + ')');
  ok(pres(a.semaine, 51.07), 'courses : 51,07 EUR par semaine, amandes estimees comprises (' + a.semaine.toFixed(2) + ')');
  ok(a.estimes.length === 1 && /Amandes/.test(a.estimes[0].label) && a.estimes[0].prix.eur === 13, 'une seule estimation : les amandes a 13 EUR/kg');
  ok(a.cagnotte === 150, 'jour du virement : 150 EUR dans la cagnotte (' + a.cagnotte + ')');
  ok(a.periode.debut === '2026-09-28' && a.periode.fin === '2026-10-24', 'premiere periode du 28 sept. (dernier virement a l\'ancienne date) au 24 oct.');
  ok(a.periode.samedis === 4, '4 samedis de courses');
  ok(pres(a.periode.balayage, 58.71), 'le 24 : environ 58,71 EUR a balayer (' + a.periode.balayage.toFixed(2) + ')');
  ok(pres(a.moyenne, 191.69), 'epargne moyenne : 191,69 EUR par mois (' + a.moyenne.toFixed(2) + ')');
  ok(a.prochaine5 && a.prochaine5.debut === '2026-12-25' && a.prochaine5.fin === '2027-01-24' && a.prochaine5.samedis === 5, 'prochaine periode a 5 samedis : 25 dec. -> 24 janv.');
  ok(pres(a.prochaine5.balayage, 7.64), 'avec 5 samedis, il reste encore 7,64 EUR le 24');
  const L = a.lignes;
  ok(L[0].montant === 1400 && L[0].plus && L[0].quand === 'le 28', 'le fil commence par le virement, le 28 pour cette premiere periode');
  ok(L[1].montant === 150 && L[1].cagnotte && L[1].quand === 'le 28', 'puis la cagnotte, le meme jour');
  ok(L[2].montant === 100 && /club/.test(L[2].action) && L[2].quand === 'le 28', 'puis le club, 100 EUR, le 28');
  const proprio = L.find(l => /propri/.test(l.action));
  ok(proprio && proprio.montant === 781 && proprio.quand === 'le 1er', 'un seul virement au proprietaire : 781 EUR le 1er');
  ok(proprio && /Loyer 700/.test(proprio.detail) && /70/.test(proprio.detail) && /Wifi 11/.test(proprio.detail), 'le detail du virement : loyer + eau/electricite + wifi');
  ok(['iCloud', 'Claude Pro', 'Bouygues'].every(n => L.some(l => l.action === n && !l.faire)), 'iCloud, Claude Pro et Bouygues partent seuls (auto)');
  ok(Math.abs(L[L.length - 1].solde) < 0.001 && L[L.length - 1].quand === 'le 24', 'le 24, le compte est a zero apres le balayage');
  ok(L.every(l => l.solde > -0.001), 'le solde n\'est jamais negatif dans le fil');
  const somme = L.slice(1).reduce((t, l) => t + l.montant, 0);
  ok(pres(somme, 1400), 'tout ce qui sort fait exactement 1 400 EUR');
  const txt = await fr.evaluate(() => document.getElementById('budget-mois-panel').innerText);
  ok(/Le mois de l.argent/.test(txt), 'le panneau est dans l\'onglet Budget');
  ok(txt.includes('150,00 €') && txt.includes('1 400,00 €'), 'montants affiches : 150,00 EUR et 1 400,00 EUR (espace fine)');
  ok(/28 sept\..*24 oct\..*4 samedis/.test(txt), 'la periode et ses samedis sont ecrits en tete');
  ok(/Le 28, dans la cagnotte/.test(txt) && /Ce mois-ci le 28, puis chaque 25/.test(txt), 'la tuile dit : ce mois-ci le 28, puis chaque 25');
  ok(/Le 24, en plus/.test(txt), 'la tuile du balayage dit le 24');
  ok(/virement permanent de 1\u202f400 \u20ac le 25/.test(txt), 'consigne : le virement permanent de ta mere, le 25');
  ok(/Jar/.test(txt) && /\u00c9pargne et business/.test(txt), 'consigne : la cagnotte Wise');
  const faits = await fr.evaluate(() => [...document.querySelectorAll('.ma-setup li')].filter(li => li.querySelector('.badge.good')).map(li => li.querySelector('b').textContent));
  ok(faits.length === 2 && /iCloud/.test(faits[0]) && /Bouygues/.test(faits[1]), 'deux consignes marquees faites : Apple et Bouygues ' + JSON.stringify(faits));
  ok(/vrai montant de l.eau/.test(txt) && /rel\u00e8ve leur prix/.test(txt), 'consignes : facture d\'eau et d\'electricite, prix des amandes');
  ok(/le 25 \(virement et cagnotte\), le 28 \(club\), le 1er \(propri\u00e9taire\), le 24/.test(txt), 'les quatre rappels de l\'agenda sont nommes');
  ok(/Si le 25 tombe un week-end/.test(txt), 'regle : un 25 de week-end, c\'est prevu');
  ok(/70 € estim/.test(txt) && /prix à relever/.test(txt), 'les deux estimations sont dites (eau/electricite, amandes)');
  const ordre = await fr.evaluate(() => { const p = document.getElementById('budget-mois-panel'); return p.previousElementSibling && p.previousElementSibling.id; });
  ok(ordre === 'budget-stats', 'place juste sous les chiffres du mois');
  await ctx.close();
}

console.log('— dimanche 3 janvier : une periode a 5 samedis');
{
  const {ctx, fr} = await ouvrir('2027-01-03T20:00:00+01:00');
  const a = await fr.evaluate(() => window.__bcMoisArgent('2027-01-03'));
  ok(a.periode.debut === '2026-12-25' && a.periode.fin === '2027-01-24' && a.periode.samedis === 5, 'periode du 25 dec. au 24 janv., 5 samedis');
  ok(a.cagnotte === 150, 'la cagnotte du 25 ne bouge pas : 150 EUR');
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
    {id:'fc1', label:'Loyer', montant:700, cat:'Logement'},
    {id:'fc2', label:'Wifi', montant:11, cat:'Abonnements'},
    {id:'fc3', label:'Téléphone portable', montant:11, cat:'Abonnements'},
    {id:'fc5', label:'Eau + Électricité', montant:70, cat:'Eau & Électricité'},
    {id:'fc6', label:'Transports', montant:40, cat:'Transport (TAM)'},
    {id:'fc7', label:'Coiffeur', montant:30, cat:'Autres'},
    {id:'fc8', label:'iCloud', montant:3, cat:'Abonnements'},
    {id:'fc9', label:'Claude Pro', montant:22, cat:'Abonnements'},
    {id:'fc10', label:'Club JJB / Muay Thai', montant:100, cat:'Abonnements'},
    {id:'fcx1', label:'Assurance', montant:240, cat:'Autres', periode:'annuel'}
  ];
  const {ctx, fr} = await ouvrir('2026-09-25T20:00:00+02:00', {charges});
  const a = await fr.evaluate(() => window.__bcMoisArgent('2026-09-25'));
  ok(a.fixes === 1007, 'charges fixes : 1 007 EUR avec une assurance lissee de 20 EUR (' + a.fixes + ')');
  ok(a.cagnotte === 130, 'la cagnotte du 28 descend a 130 EUR (' + a.cagnotte + ')');
  const autre = a.lignes.find(l => /Assurance/.test(l.action));
  ok(autre && pres(autre.montant, 20), 'la charge sans date passe dans le fil, 20 EUR par mois');
  ok(Math.abs(a.lignes[a.lignes.length - 1].solde) < 0.001, 'et le compte finit toujours a zero le 27');
  ok(a.lignes[a.lignes.length - 1].cagnotte && /Balaye/.test(a.lignes[a.lignes.length - 1].action), 'le balayage reste la derniere ligne');
  await ctx.close();
}

console.log('— des charges au-dessus du virement : le fil le dit, sans solde negatif affiche');
{
  const charges = [
    {id:'fc1', label:'Loyer', montant:1300, cat:'Logement'},
    {id:'fc2', label:'Wifi', montant:11, cat:'Abonnements'},
    {id:'fc5', label:'Eau + Électricité', montant:70, cat:'Eau & Électricité'},
    {id:'fc8', label:'iCloud', montant:3, cat:'Abonnements'},
    {id:'fc9', label:'Claude Pro', montant:22, cat:'Abonnements'},
    {id:'fc10', label:'Club JJB / Muay Thai', montant:100, cat:'Abonnements'}
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
