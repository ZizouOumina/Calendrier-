/* Lot 32 — Alfred quand le micro marche VRAIMENT (le cas du Mac).
   Jusqu'ici le réacteur ne s'allumait que sur le chemin du clavier : quand le navigateur
   accordait le micro, on parlait devant un simple toast « J'écoute… », sans transcription
   ni animation. Ce fichier éprouve les deux chemins et les trois contextes :
     · page directe (batcave.html ouvert en local) → le micro est à portée ;
     · cadre qui refuse le micro (la page publiée sur claude.ai) → dictée au clavier ;
   La reconnaissance du navigateur est remplacée par une fausse : aucun micro réel n'est
   ouvert, aucun son n'est émis, et le test décide ce qu'Alfred « entend ». */
import { chromium } from 'playwright';
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

/* Fausse reconnaissance, avec résultats intermédiaires ET finals. */
const FAUX = () => {
  window.__micro = {instances:[], demarrages:0, autorisation:'ok'};
  function Faux(){
    this.lang = ''; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1;
    this.onresult = null; this.onerror = null; this.onend = null; this.demarre = false;
    window.__micro.instances.push(this); window.__micro.dernier = this;
  }
  Faux.prototype.start = function(){ this.demarre = true; window.__micro.demarrages++; };
  Faux.prototype.stop = function(){ this.demarre = false; if(this.onend) this.onend(); };
  Faux.prototype.abort = function(){ this.demarre = false; if(this.onend) this.onend(); };
  window.SpeechRecognition = Faux; window.webkitSpeechRecognition = Faux;
  window.__dit = [];
  const VOIX = [{name:'Thomas', lang:'fr-FR'}, {name:'Daniel', lang:'en-GB'}];
  window.SpeechSynthesisUtterance = function(t){ this.text = t; this.rate = 1; this.pitch = 1; this.volume = 1;
    this.voice = null; this.lang = ''; this.onend = null; this.onerror = null; this.onboundary = null; };
  const SYNTH = {getVoices: function(){ return VOIX; }, onvoiceschanged: null, cancel: function(){},
    speak: function(u){ window.__dit.push(u.text); setTimeout(function(){ if(u.onend) u.onend(); }, 20); }};
  try{ Object.defineProperty(window, 'speechSynthesis', {value: SYNTH, configurable:true, writable:true}); }catch(e){}
  const erreur = n => { const e = new Error(n); e.name = n; return e; };
  try{ Object.defineProperty(navigator, 'mediaDevices', {configurable:true, writable:true, value:{
    getUserMedia: function(){
      const a = window.__micro.autorisation;
      if(a === 'refus') return Promise.reject(erreur('NotAllowedError'));
      if(a === 'aucun-micro') return Promise.reject(erreur('NotFoundError'));
      return Promise.resolve({getTracks: function(){ return [{stop: function(){}}]; }});
    }}}); }catch(e){}
  try{ Object.defineProperty(navigator, 'permissions', {configurable:true, writable:true, value:{
    query: function(){ return Promise.resolve({state: window.__micro.autorisation === 'refus' ? 'denied' : 'prompt'}); }}}); }catch(e){}
  /* entendre(phrase, final) : un résultat intermédiaire, ou final */
  window.__entendre = function(phrase, final){
    const r = window.__micro.dernier;
    if(!r || !r.onresult) return 'pas de micro';
    const alt = [{transcript: phrase}];
    alt.isFinal = !!final;
    const res = [alt]; res.resultIndex = 0;
    r.onresult({resultIndex: 0, results: res});
    return 'dit';
  };
};

const b = await chromium.launch();
async function ouvrir(cadreRefuse){
  const ctx = await b.newContext({viewport:{width:1440, height:1100}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(FAUX);
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + e.message); });
  await page.clock.install({time: new Date('2026-09-14T09:40:00+02:00')});
  if(cadreRefuse){
    await page.goto('http://127.0.0.1:8199/');
    await page.setContent('<iframe id="f" allow="microphone \'none\'" src="http://127.0.0.1:8199/batcave.html" style="width:1400px;height:1000px;border:0"></iframe>');
  } else {
    await page.goto('http://127.0.0.1:8199/batcave.html');
  }
  await page.waitForTimeout(1600);
  const fr = cadreRefuse ? page.frames().find(x => x.url().includes('batcave.html')) : page.mainFrame();
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => { if(o.id !== 'alfred-overlay') o.hidden = true; }));
  await page.waitForTimeout(300);
  return {ctx, page, fr};
}
const ecran = fr => fr.evaluate(() => {
  const o = document.getElementById('alfred-overlay');
  return {ouvert: o ? !o.hidden : null,
          dit: (document.getElementById('alfred-dit') || {}).textContent || '',
          rep: (document.getElementById('alfred-rep') || {}).textContent || '',
          focusChamp: document.activeElement === document.getElementById('alfred-champ')};
});

console.log('\n== 1) Le micro est à portée : le réacteur s’allume et écrit ce que tu dis ==');
{
  const {ctx, page, fr} = await ouvrir(false);
  const av = await fr.evaluate(() => ({
    horsDePortee: window.__bcVoix.dispo === false,
    texteBouton: document.getElementById('voix-btn').textContent.trim(),
    veilleVisible: !document.getElementById('alfred-veille').hidden
  }));
  ok(av.texteBouton === '🎙️ Alfred', 'le bouton annonce le micro, pas le clavier : « ' + av.texteBouton + ' »');
  ok(av.veilleVisible, 'et l’interrupteur de veille est proposé — il a un micro à armer');
  ok(await fr.evaluate(() => window.__bcVoix.diagnostic().then(c => c === null)), 'le diagnostic ne trouve aucun obstacle : le micro est accessible');

  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(700);
  let e = await ecran(fr);
  ok(e.ouvert, 'le réacteur s’ouvre — c’est le trou qui vient d’être bouché : avant, on parlait devant un toast');
  ok(e.focusChamp, 'et le champ garde le focus : on peut parler OU taper sans rien rouvrir');
  ok(await fr.evaluate(() => window.__bcVoix.ecoutant()), 'le micro écoute');
  ok(await fr.evaluate(() => window.__micro.dernier.interimResults === true),
     'la reconnaissance rend les résultats intermédiaires — sans eux, la phrase ne s’écrit qu’à la fin');

  /* on parle : d'abord un bout de phrase, puis la phrase entière */
  await fr.evaluate(() => window.__entendre('coche le', false));
  await page.waitForTimeout(200);
  e = await ecran(fr);
  ok(/coche le/.test(e.dit), 'la phrase s’écrit pendant qu’on parle : « ' + e.dit + ' »');
  ok(e.rep === '', 'et rien n’est exécuté sur un bout de phrase');

  await fr.evaluate(() => window.__entendre('coche le déjeuner', true));
  await page.waitForTimeout(500);
  e = await ecran(fr);
  ok(/Déjeuner coché, Monsieur\./.test(e.rep), 'la réponse s’écrit sur le réacteur : « ' + e.rep + ' »');
  const dit = await fr.evaluate(() => window.__dit);
  ok(dit.some(t => /Déjeuner coché/.test(t)), 'et elle est dite à voix haute (' + dit.length + ' énoncé)');
  const etat = await fr.evaluate(() => window.__bcAlfred.etat());
  ok(etat === 'parle' || etat === 'fini', 'le réacteur passe au vert pendant qu’il répond (état : ' + etat + ')');
  const coches = await fr.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('batcave-meals-2026-09-14') || '{}')).length);
  ok(coches > 0, 'et le repas est réellement coché (' + coches + ' cases)');
  await ctx.close();
}

console.log('\n== 2) Rien entendu : le réacteur ne reste pas figé sur « écoute » ==');
{
  const {ctx, page, fr} = await ouvrir(false);
  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(700);
  await fr.evaluate(() => { const r = window.__micro.dernier; if(r.onerror) r.onerror({error:'no-speech'}); });
  await page.waitForTimeout(400);
  const e = await ecran(fr);
  ok(/Rien entendu/.test(e.rep), 'il le dit sur l’écran au lieu de tourner dans le vide : « ' + e.rep + ' »');
  ok(await fr.evaluate(() => window.__bcAlfred.etat()) === 'fini', 'et le réacteur retombe');
  await ctx.close();
}

console.log('\n== 3) Le cadre refuse le micro (la page publiée) : la dictée prend le relais ==');
{
  const {ctx, page, fr} = await ouvrir(true);
  const av = await fr.evaluate(() => ({
    texteBouton: document.getElementById('voix-btn').textContent.trim(),
    veilleVisible: !document.getElementById('alfred-veille').hidden,
    politique: (function(){ try{ var p = document.featurePolicy || document.permissionsPolicy; return p.allowsFeature('microphone'); }catch(e){ return 'erreur'; } })()
  }));
  ok(av.politique === false, 'le navigateur dit lui-même que la page n’a pas droit au micro');
  ok(av.texteBouton === '⌨️ Alfred', 'le bouton bascule sur le clavier : « ' + av.texteBouton + ' »');
  ok(!av.veilleVisible, 'et la veille disparaît : elle n’aurait rien à armer');
  ok(await fr.evaluate(() => window.__bcVoix.diagnostic().then(c => c === 'cadre')), 'le diagnostic nomme la vraie cause : « cadre »');

  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(700);
  const e = await ecran(fr);
  ok(e.ouvert && e.focusChamp, 'le réacteur s’ouvre avec le champ prêt : Fn Fn sur le Mac, 🎤 sur l’iPhone');
  ok(await fr.evaluate(() => window.__micro.demarrages) === 0, 'et aucun micro n’a été ouvert — on ne fait pas semblant d’essayer');
  await fr.evaluate(() => { const c = document.getElementById('alfred-champ'); c.value = 'Alfred, où j’en suis ?'; c.dispatchEvent(new Event('input')); c.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true})); });
  await page.waitForTimeout(500);
  const e2 = await ecran(fr);
  ok(/^Aujourd'hui, Monsieur : /.test(e2.rep), 'la même grammaire répond au clavier : « ' + e2.rep.slice(0, 70) + '… »');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
