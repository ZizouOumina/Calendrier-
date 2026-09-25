/* Lot 53 — Alfred, le majordome : l'analyseur d'intentions en français branché sur les
   vraies fonctions de la Batcave, l'écran, le raccourci A, la voix (réglage), le repli sans
   Claude. Adapté de JARVIS (imranshiundu/Jarvis). Rien ici n'a besoin d'un micro. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { errs++; console.log('  FAIL ' + m); } };
const browser = await chromium.launch();
async function ouvrir(quand, seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, k.indexOf('bc-') === 0 ? String(x[k]) : JSON.stringify(x[k]))); }, seed);
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
const dire = (fr, q) => fr.evaluate(q => window.__bcAlfred.traiter(q), q);
const journal = (fr, iso) => fr.evaluate(iso => JSON.parse(localStorage.getItem('batcave-journal-' + iso) || '{}'), iso);

console.log('\n== 430) Alfred comprend et agit ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  ok(await fr.evaluate(() => window.__bcAlfred.intents >= 20), 'au moins vingt intentions');
  let r = await dire(fr, 'bonjour');
  ok(/^Bonjour, Monsieur\. Vous êtes sur « Étudier en avance », jusqu’à 10:05\./.test(r), 'salut : ' + r);
  r = await dire(fr, 'briefing');
  ok(/^lundi 28 septembre\. En cours : Étudier en avance, 08:20 → 10:05\. Jour de combat : JJB à 10:30, eau 3,5 L, collation combat\. Muscu : haut volume\./.test(r) && /Tapis enlevés à 14:45/.test(r), 'briefing : ' + r.slice(0, 120) + '…');
  r = await dire(fr, 'quelle heure il est');
  ok(r === 'Il est 10:00.', 'l\'heure : ' + r);
  r = await dire(fr, 'prochain bloc');
  ok(/^En cours : Étudier en avance, jusqu’à 10:05 \(reste 5 min\)\. Ensuite : Collation combat à 10:05\./.test(r), 'bloc en cours et suivant, avec la consigne : ' + r.slice(0, 90) + '…');
  r = await dire(fr, "j'ai bu 500 ml");
  ok(r === 'Noté : +500 ml. Aujourd’hui 0,5 L sur 3,5 L.' && (await journal(fr, '2026-09-28')).water === 500, 'l\'eau est enregistrée : ' + r);
  r = await dire(fr, 'j\'ai bu 1,5 l');
  ok(/\+1500 ml\. Aujourd’hui 2,0 L sur 3,5 L/.test(r), 'les litres aussi : ' + r);
  r = await dire(fr, 'combien d\'eau');
  ok(r === '2,0 L bus sur 3,5 L visés aujourd’hui.', 'le compte : ' + r);
  r = await dire(fr, 'je pèse 71,8');
  ok(r === 'Poids noté : 71,8 kg.' && (await journal(fr, '2026-09-28')).poids === '71.8', 'le poids est enregistré');
  r = await dire(fr, 'je pèse 700');
  ok(/Je n’y crois pas/.test(r) && (await journal(fr, '2026-09-28')).poids === '71.8', '700 kg : refusé, le poids reste');
  r = await dire(fr, 'coche fajr');
  ok(r === 'Coché : Fajr.' && await fr.evaluate(() => (JSON.parse(localStorage.getItem('batcave-habitlog') || '{}')['core-fajr'] || []).indexOf('2026-09-28') > -1), 'l\'habitude est cochée');
  r = await dire(fr, 'coche fajr');
  ok(/déjà cochée/.test(r), 'deux fois : « déjà cochée »');
  r = await dire(fr, 'coche licorne');
  ok(/Je ne trouve pas d’habitude « licorne »/.test(r), 'inconnue : la liste du jour est proposée');
  r = await dire(fr, 'ouvre sport');
  ok(r === 'Voilà sport.' && await fr.evaluate(() => document.querySelector('.page.active').dataset.page === 'sport' && document.getElementById('alfred-overlay').hidden), 'ouvre l\'onglet Sport et se retire');
  r = await dire(fr, 'santé');
  ok(/^Tout est en ordre/.test(r), 'la santé de la Batcave : ' + r);
  r = await dire(fr, 'séance du jour');
  ok(/^Haut volume \(55 min\), 0\/11 exercices faits : Tractions 4×8-15/.test(r), 'la séance : ' + r.slice(0, 60) + '…');
  r = await dire(fr, 'combat');
  ok(/^JJB à 10:30, collation combat à 10:05/.test(r), 'le combat du jour : ' + r.slice(0, 50) + '…');
  r = await dire(fr, 'qu\'est-ce que je mange');
  ok(/^Prochain repas : Collation combat à 10:05 — Banane \(120g\)/.test(r), 'le prochain repas : ' + r.slice(0, 60) + '…');
  r = await dire(fr, 'tapis');
  ok(/14:45/.test(r) && /15:45/.test(r), 'les tapis');
  r = await dire(fr, 'lance le pomodoro');
  ok(r === 'Pomodoro lancé.', 'lance le Pomodoro du bloc');
  r = await dire(fr, 'blabla inconnu');
  ok(/Je ne sais pas faire ça \(encore\)/.test(r) && /ouvrez la Batcave depuis son lien/.test(r), 'sans Claude dans la page, il le dit : ' + r);
  const h = await fr.evaluate(() => window.__bcAlfred.historique().length);
  ok(h >= 40, 'le fil garde les échanges (' + h + ' lignes)');
  await ctx.close();
}

console.log('\n== 431) L\'écran, le bouton, la touche A, la voix ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-28T10:00:00+02:00');
  ok(await fr.evaluate(() => document.getElementById('alfred-overlay').hidden), 'fermé au départ');
  await fr.evaluate(() => document.getElementById('alfred-btn').click());
  await page.waitForTimeout(150);
  const o = await fr.evaluate(() => ({ ouvert: !document.getElementById('alfred-overlay').hidden, premiere: (document.querySelector('#alfred-fil li') || {}).textContent, chips: document.querySelectorAll('#alfred-chips .chip').length, claude: document.getElementById('alfred-claude').hidden }));
  ok(o.ouvert && /À votre service, Monsieur/.test(o.premiere) && o.chips === 7, 'le bouton de la barre ouvre Alfred, qui se présente, avec ' + o.chips + ' raccourcis');
  ok(o.claude === true, 'sans lien Batcave, la mention Claude reste cachée');
  await fr.evaluate(() => { const i = document.getElementById('alfred-texte'); i.value = 'j\'ai bu 250 ml'; document.getElementById('alfred-envoyer').click(); });
  await page.waitForTimeout(150);
  ok((await journal(fr, '2026-09-28')).water === 250 && await fr.evaluate(() => document.getElementById('alfred-texte').value === ''), 'le formulaire envoie et se vide');
  await fr.evaluate(() => document.querySelector('#alfred-chips [data-alfred="santé"]').click());
  await page.waitForTimeout(150);
  ok(await fr.evaluate(() => /Tout est en ordre/.test([...document.querySelectorAll('#alfred-fil li.alfred')].pop().textContent)), 'un raccourci parle à Alfred');
  await fr.evaluate(() => document.getElementById('alfred-close').click());
  await page.keyboard.press('a'); await page.waitForTimeout(120);
  ok(await fr.evaluate(() => !document.getElementById('alfred-overlay').hidden), 'A ouvre Alfred');
  /* le champ de saisie a le focus : A y tape une lettre ; c'est Échap qui ferme */
  await page.keyboard.press('Escape'); await page.waitForTimeout(120);
  ok(await fr.evaluate(() => document.getElementById('alfred-overlay').hidden), 'Échap le referme');
  const v = await fr.evaluate(() => { const c = document.getElementById('alfred-voix'); const avant = c.checked; c.click(); return { avant, apres: c.checked, stocke: localStorage.getItem('bc-alfred-voix') }; });
  ok(v.avant === false && v.apres === true && v.stocke === '1', 'la voix est éteinte par défaut, et le réglage vit sur l\'appareil');
  await ctx.close();
}
{
  const { ctx, fr } = await ouvrir('2026-09-28T21:15:00+02:00', {'bc-alfred-voix': '1'});
  const r = await fr.evaluate(() => ({ coche: document.getElementById('alfred-voix').checked, cl: window.__bcAlfred.traiter('clôture'), ouverte: !document.getElementById('cloture-overlay').hidden }));
  ok(r.coche === true, 'le réglage de la voix est relu');
  ok(/La clôture du jour est ouverte/.test(r.cl) && r.ouverte, '« clôture » ouvre la clôture');
  await ctx.close();
}

console.log('\n== 432) Le contexte donné à Claude ==');
{
  const { ctx, fr } = await ouvrir('2026-09-28T10:00:00+02:00', {'batcave-journal-2026-09-28': {water: 750, poids: '72'}});
  const c = await fr.evaluate(() => window.__bcAlfred.contexte());
  ok(/^Date : lundi 28 septembre, il est 10:00\./.test(c), 'la date et l\'heure');
  ok(/Bloc en cours : Étudier en avance \(08:20-10:05\)\./.test(c), 'le bloc');
  ok(/Grille du jour : 05:30 Sport \| 06:30 Douche/.test(c), 'la grille du jour');
  ok(/Les cinq qui comptent : Sommeil \(/.test(c) && /Eau : 0,8 L \/ 3\.5 L\. Poids : 72\./.test(c), 'les cinq, l\'eau et le poids');
  ok(!/undefined|NaN/.test(c), 'aucune valeur brute');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\nFAILS: ' + errs : '\nALL OK');
process.exit(errs ? 1 : 0);
