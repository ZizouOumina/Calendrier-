/* Alfred v2 — parler sans taper, enchaîner, et être compris.
   Trois reproches réglés ici :
     · il fallait appuyer sur Entrée après avoir dicté — la phrase part maintenant toute
       seule une seconde après le dernier mot ;
     · une réponse fermait la conversation — l'écran repasse à l'écoute et on enchaîne ;
     · sa grammaire tenait en six commandes — elle en couvre maintenant toute la journée,
       à deux fautes de dictée près, et ce qu'il ne comprend pas, il le propose. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

const FAUX = () => {
  window.__dit = [];
  window.SpeechSynthesisUtterance = function(t){ this.text = t; this.rate = 1; this.pitch = 1;
    this.volume = 1; this.voice = null; this.lang = ''; this.onend = null; this.onerror = null; this.onboundary = null; };
  const SYNTH = {getVoices: function(){ return [{name:'Thomas', lang:'fr-FR'}]; }, onvoiceschanged: null,
    cancel: function(){}, speak: function(u){ window.__dit.push(u.text); setTimeout(function(){ if(u.onend) u.onend(); }, 10); }};
  try{ Object.defineProperty(window, 'speechSynthesis', {value: SYNTH, configurable:true, writable:true}); }catch(e){}
};

async function ouvrir(seed, quand){
  const ctx = await b.newContext({viewport:{width:1440, height:1100}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(FAUX);
  await ctx.addInitScript(s => { window.claude = undefined;
    for(const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, seed || {});
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + e.message); });
  await page.clock.install({time: new Date(quand || '2026-09-14T13:00:00+02:00')});
  /* un cadre qui REFUSE le micro : exactement la page publiée sur claude.ai */
  await page.goto('http://127.0.0.1:8199/');
  await page.setContent('<iframe id="f" allow="microphone \'none\'" src="http://127.0.0.1:8199/batcave.html" style="width:1400px;height:1050px;border:0"></iframe>');
  await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => { if(o.id !== 'alfred-overlay') o.hidden = true; }));
  await page.waitForTimeout(400);
  return {ctx, page, fr};
}
const rep = (fr, phrase) => fr.evaluate(p => window.__bcVoix.executer(p), phrase);
const ecran = fr => fr.evaluate(() => ({
  ouvert: !document.getElementById('alfred-overlay').hidden,
  etat: (document.getElementById('alfred-etat') || {}).textContent || '',
  dit: (document.getElementById('alfred-dit') || {}).textContent || '',
  rep: (document.getElementById('alfred-rep') || {}).textContent || '',
  champ: (document.getElementById('alfred-champ') || {}).value || '',
  onglet: !(document.getElementById('alfred-onglet') || {}).hidden
}));
const dicter = async (fr, page, phrase, attendre) => {
  await fr.evaluate(p => { const c = document.getElementById('alfred-champ'); c.value = p; c.dispatchEvent(new Event('input')); }, phrase);
  await page.waitForTimeout(attendre === undefined ? 1800 : attendre);
};

console.log('\n== 1) La phrase part toute seule : plus d’Entrée ==');
{
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(700);
  ok((await ecran(fr)).ouvert, 'l’écran d’Alfred s’ouvre');
  /* on écrit sans jamais toucher à Entrée */
  await fr.evaluate(() => { const c = document.getElementById('alfred-champ'); c.value = 'coche le déjeuner'; c.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(400);
  const pendant = await ecran(fr);
  ok(/j’exécute dans/.test(pendant.etat), 'le compte à rebours est visible : « ' + pendant.etat + ' »');
  await page.waitForTimeout(1200);
  const apres = await ecran(fr);
  ok(/Déjeuner coché, Monsieur\./.test(apres.rep), 'sans Entrée, la phrase est exécutée : « ' + apres.rep + ' »');
  ok((await fr.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('batcave-meals-2026-09-14') || '{}')).length)) > 0, 'et le repas est coché pour de vrai');
  await ctx.close();
}

console.log('\n== 2) Taper n’est pas gêné : chaque frappe repousse le départ ==');
{
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(400);
  for(const bout of ['coche', 'coche le dé', 'coche le déjeu']){
    await fr.evaluate(p => { const c = document.getElementById('alfred-champ'); c.value = p; c.dispatchEvent(new Event('input')); }, bout);
    await page.waitForTimeout(600);
  }
  ok((await ecran(fr)).rep === '', 'rien n’a été exécuté pendant qu’on tape (1,8 s écoulées)');
  await ctx.close();
}

console.log('\n== 3) Une réponse n’est pas une fin : on enchaîne ==');
{
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(400);
  await dicter(fr, page, 'coche le petit déjeuner');
  await page.waitForTimeout(1400);
  const e = await ecran(fr);
  ok(e.ouvert, 'l’écran est resté ouvert');
  ok(e.etat === 'à l’écoute' && e.champ === '', 'et il est repassé à l’écoute, champ vide : on peut parler de nouveau (' + e.etat + ')');
  await dicter(fr, page, 'coche le dîner');
  const e2 = await ecran(fr);
  ok(/Dîner coché/.test(e2.rep), 'la deuxième phrase passe sans rien rouvrir : « ' + e2.rep + ' »');
  await ctx.close();
}

console.log('\n== 4) Ce qu’il ne comprend pas, il le propose ==');
{
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(400);
  await dicter(fr, page, 'pomodoro de révision là maintenant', 0);
  await page.waitForTimeout(1600);
  let e = await ecran(fr);
  ok(/Pomodoro révision/.test(e.rep), 'une phrase un peu bavarde marche quand même : « ' + e.rep + ' »');
  await ctx.close();
}
{
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(400);
  await dicter(fr, page, 'cochez le petit déjeune');
  const e = await ecran(fr);
  ok(/Petit-déjeuner coché/.test(e.rep), 'la dictée peut se tromper de deux lettres : « ' + e.rep + ' »');
  await ctx.close();
}
{
  const {ctx, page, fr} = await ouvrir();
  const r = await fr.evaluate(() => window.__bcVoix.executer('la capitale du Pérou'));
  ok(r === null, 'une phrase hors sujet ne déclenche rien');
  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(400);
  await dicter(fr, page, 'coche le petit déjeunette machin');
  const e = await ecran(fr);
  ok(/Petit-déjeuner coché|Vouliez-vous dire/.test(e.rep), 'sinon il propose la commande la plus proche : « ' + e.rep + ' »');
  await ctx.close();
}

console.log('\n== 5) Ce qu’il sait faire, maintenant ==');
{
  const {ctx, page, fr} = await ouvrir({'batcave-anki': {paquets:{Dentaire:{dus:10}}, maj:'2026-09-14T08:00:00.000Z'}});
  const R = {};
  for(const [cle, phrase] of [
    ['eau',     'Alfred, j’ai bu 500 ml'],
    ['verre',   'Alfred, un verre d’eau'],
    ['sommeil', 'Alfred, j’ai dormi 7 h 30'],
    ['poids',   'Alfred, je pèse 64,5 kg'],
    ['humeur',  'Alfred, humeur 4'],
    ['coran',   'Alfred, page 12 du Coran'],
    ['tache',   'Alfred, ajoute une tâche appeler la fac'],
    ['anki',    'Alfred, 42 cartes dues'],
    ['aide',    'Alfred, qu’est-ce que tu sais faire'],
    ['score',   'Alfred, mon score'],
    ['seance',  'Alfred, quelle séance aujourd’hui'],
    ['qeau',    'Alfred, combien d’eau']
  ]) R[cle] = await rep(fr, phrase);
  ok(/500 millilitres notés/.test(R.eau), 'eau : « ' + R.eau + ' »');
  ok(/250 millilitres notés/.test(R.verre), 'un verre = 250 ml : « ' + R.verre + ' »');
  ok(/7 heures 30 de sommeil/.test(R.sommeil), 'sommeil : « ' + R.sommeil + ' »');
  ok(/64 virgule 5 kilos/.test(R.poids), 'poids : « ' + R.poids + ' »');
  ok(/Humeur 4 sur 5/.test(R.humeur), 'humeur : « ' + R.humeur + ' »');
  ok(/Page 12 du Coran/.test(R.coran), 'Coran : « ' + R.coran + ' »');
  ok(/Tâche ajoutée.*appeler la fac/.test(R.tache), 'tâche : « ' + R.tache + ' »');
  ok(/42 cartes dues notées/.test(R.anki), 'Anki : « ' + R.anki + ' »');
  ok(/Je sais : /.test(R.aide), 'aide : « ' + R.aide.slice(0, 60) + '… »');
  ok(/Score du jour : \d+ pour cent/.test(R.score), 'score : « ' + R.score + ' »');
  ok(/Séance du jour|Jour sans séance/.test(R.seance), 'séance : « ' + R.seance + ' »');
  ok(/litre sur/.test(R.qeau), 'question eau : « ' + R.qeau + ' »');
  /* et tout ça a réellement été écrit */
  const j = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-journal-2026-09-14') || '{}'));
  ok(j.water === 750 && j.sommeil === 7.5 && j.poids === 64.5 && j.mood === 4 && Number(j.coran) === 12,
     'le journal porte les cinq valeurs : eau ' + j.water + ', sommeil ' + j.sommeil + ', poids ' + j.poids + ', humeur ' + j.mood + ', Coran ' + j.coran);
  const t = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-taches') || '[]'));
  ok(t.some(x => /appeler la fac/i.test(x.text)), 'la tâche est dans la liste');
  const a = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-anki') || '{}'));
  ok(a.paquets && a.paquets['Dentaire'] && a.paquets['Dentaire'].dus === 42, 'et le relevé Anki porte 42 cartes dues');
  await ctx.close();
}

console.log('\n== 6) Le sport, les mains occupées ==');
{
  const {ctx, page, fr} = await ouvrir();
  const un = await rep(fr, 'Alfred, tractions faites');
  ok(/coché, Monsieur — \d+ sur \d+/.test(String(un)), 'un exercice se coche à la voix : « ' + un + ' »');
  const tout = await rep(fr, 'Alfred, séance finie');
  ok(/Séance .* terminée, Monsieur/.test(String(tout)), 'et la séance entière : « ' + tout + ' »');
  const st = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-sport-2026-09-14') || '{}'));
  ok(Object.keys(st).filter(k => st[k]).length >= 10, 'les cases sont cochées pour de vrai (' + Object.keys(st).filter(k => st[k]).length + ')');
  await ctx.close();
}

console.log('\n== 7) Naviguer à la voix ==');
{
  const {ctx, page, fr} = await ouvrir();
  const r = await rep(fr, 'Alfred, ouvre le sport');
  await page.waitForTimeout(300);
  ok(/Sport, Monsieur/.test(String(r)), 'il annonce l’onglet : « ' + r + ' »');
  ok(await fr.evaluate(() => { const s = document.querySelector('section.page[data-page="sport"]'); return s && !s.hidden; }), 'et l’onglet Sport est bien affiché');
  await ctx.close();
}

console.log('\n== 8) La sortie de secours : ouvrir dans un onglet ==');
{
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(500);
  const e = await ecran(fr);
  ok(e.onglet, 'dans un cadre qui refuse le micro, le bouton « Ouvrir dans un onglet » est proposé');
  const aide = await fr.evaluate(() => document.getElementById('alfred-aide').textContent);
  ok(/part toute seule/.test(aide), 'et l’aide dit que la phrase part seule : « ' + aide.slice(0, 80) + '… »');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
