/* Alfred — le mot d'appel et le mode veille.
   La reconnaissance vocale du navigateur est remplacée par une fausse, pilotée depuis le
   test : on lui fait « entendre » des phrases et on vérifie ce que la Batcave en fait.
   Ce qui est éprouvé ici : « Alfred » accepté puis ignoré en tête de phrase, le micro qui
   ne s'ouvre pas tout seul, la veille qui n'obéit qu'aux phrases appelées par son nom,
   et le réglage qui reste sur l'appareil (jamais synchronisé). */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c,m)=>{ if(c) console.log('  ok  '+m); else { err++; console.log('  FAIL '+m); } };

/* Fausse reconnaissance : elle note ce qu'on lui demande et laisse le test livrer un
   résultat quand il veut. Aucun micro réel n'est ouvert. */
const FAUX_MICRO = () => {
  window.__micro = Object.assign({instances:[], demarrages:0}, window.__micro || {});
  function Faux(){
    this.lang = ''; this.continuous = false; this.interimResults = true; this.maxAlternatives = 1;
    this.onresult = null; this.onerror = null; this.onend = null;
    this.demarre = false;
    window.__micro.instances.push(this);
    window.__micro.dernier = this;
  }
  Faux.prototype.start = function(){ this.demarre = true; window.__micro.demarrages++; };
  Faux.prototype.stop = function(){ this.demarre = false; if(this.onend) this.onend(); };
  Faux.prototype.abort = function(){ this.demarre = false; if(this.onend) this.onend(); };
  window.SpeechRecognition = Faux;
  window.webkitSpeechRecognition = Faux;
  /* Fausse synthèse : elle note ce qu'Alfred dit, sans qu'aucun son ne sorte. Les voix
     proposées imitent celles d'un Mac : deux françaises, une anglaise. */
  window.__dit = [];
  const VOIX = [{name:'Amélie', lang:'fr-CA'}, {name:'Daniel', lang:'en-GB'},
                {name:'Thomas', lang:'fr-FR'}, {name:'Google français', lang:'fr-FR'}];
  window.SpeechSynthesisUtterance = function(t){ this.text = t; this.rate = 1; this.pitch = 1; this.volume = 1;
                                                 this.voice = null; this.lang = ''; this.onend = null; this.onerror = null; };
  /* window.speechSynthesis est en lecture seule dans un vrai navigateur : on le remplace
     par definePropertyc, sinon l'affectation est ignorée sans rien dire. */
  const FAUSSE_SYNTHESE = {
    getVoices: function(){ return VOIX; },
    onvoiceschanged: null,
    annulations: 0,
    cancel: function(){ this.annulations++; },
    speak: function(u){ window.__dit.push({texte:u.text, rate:u.rate, pitch:u.pitch,
                                           voix:u.voice ? u.voice.name : null, lang:u.lang});
                        setTimeout(function(){ if(u.onend) u.onend(); }, 20); }
  };
  try{ Object.defineProperty(window, 'speechSynthesis', {value: FAUSSE_SYNTHESE, configurable: true, writable: true}); }
  catch(e){ window.speechSynthesis = FAUSSE_SYNTHESE; }
  /* Fausse autorisation : c'est getUserMedia qui fait apparaître la bulle du navigateur.
     window.__micro.autorisation pilote la réponse — 'ok', 'refus', 'cadre', 'aucun-micro'. */
  window.__micro = window.__micro || {};
  window.__micro.autorisation = 'ok';
  const erreur = (nom) => { const e = new Error(nom); e.name = nom; return e; };
  const FAUX_MEDIA = {
    getUserMedia: function(){
      const a = window.__micro.autorisation;
      window.__micro.demandes = (window.__micro.demandes || 0) + 1;
      if(a === 'refus' || a === 'cadre') return Promise.reject(erreur('NotAllowedError'));
      if(a === 'aucun-micro') return Promise.reject(erreur('NotFoundError'));
      return Promise.resolve({getTracks: function(){ return [{stop: function(){}}]; }});
    }
  };
  try{ Object.defineProperty(navigator, 'mediaDevices', {value: FAUX_MEDIA, configurable: true, writable: true}); }
  catch(e){}
  /* et l'état de la permission, qui départage « tu as refusé » de « on ne t'a rien demandé » */
  try{ Object.defineProperty(navigator, 'permissions', {configurable: true, writable: true, value: {
    query: function(){ return Promise.resolve({state: window.__micro.autorisation === 'refus' ? 'denied' : 'prompt'}); }
  }}); }catch(e){}
  /* dire(phrase) : le micro courant « entend » cette phrase, en une seule alternative. */
  window.__dire = function(phrase){
    const r = window.__micro.dernier;
    if(!r || !r.onresult) return 'pas de micro';
    const alt = [{transcript: phrase}];
    alt.isFinal = true;
    const res = [alt]; res.resultIndex = 0;
    r.onresult({resultIndex: 0, results: res});
    return 'dit';
  };
};

async function ouvrir(veille){
  const ctx = await b.newContext({viewport:{width:1440,height:1300}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(FAUX_MICRO);
  if(veille !== undefined) await ctx.addInitScript(v=>{ try{ localStorage.setItem('bc-alfred-veille', v); }catch(e){} }, veille);
  await ctx.addInitScript(()=>{ window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e=>{err++; console.log('  PAGEERROR '+e.message);});
  await page.clock.install({time:new Date('2026-09-14T09:00:00+02:00')});
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached',timeout:20000});
  const fr = page.frames().find(x=>x.url().includes('batcave.html'));
  await fr.evaluate(()=>document.querySelectorAll('.overlay').forEach(o=>o.hidden=true));
  await page.waitForTimeout(400);
  return {ctx, page, fr};
}
const etatBoutons = fr => fr.evaluate(()=>{
  const a = document.getElementById('voix-btn'), v = document.getElementById('alfred-veille');
  return {parlerVisible: a && !a.hidden, parlerTexte: a ? a.textContent.trim() : null,
          veilleVisible: v && !v.hidden, veilleTexte: v ? v.textContent.trim() : null,
          veilleArmee: v ? v.getAttribute('aria-pressed') : null};
});
const repasCoches = fr => fr.evaluate(()=>{
  const s = JSON.parse(localStorage.getItem('batcave-meals-2026-09-14') || '{}');
  return Object.keys(s).filter(k=>s[k]).length;
});

console.log('\n== 1) Les deux boutons, et le micro qui reste fermé ==');
{
  const {ctx, fr} = await ouvrir();
  const e = await etatBoutons(fr);
  ok(e.parlerVisible && /Alfred/.test(e.parlerTexte), 'le bouton porte son nom : « ' + e.parlerTexte + ' »');
  ok(e.veilleVisible && e.veilleTexte === '🦇 Veille', 'l\'interrupteur de veille est là : « ' + e.veilleTexte + ' »');
  ok(e.veilleArmee === 'false', 'la veille est ÉTEINTE par défaut');
  const d = await fr.evaluate(()=>window.__micro.demarrages);
  ok(d === 0, 'aucun micro ouvert à l\'ouverture de la Batcave (' + d + ' démarrage)');
  await ctx.close();
}

console.log('\n== 2) « Alfred » est accepté puis ignoré en tête de phrase ==');
{
  const {ctx, fr} = await ouvrir();
  const r = await fr.evaluate(()=>[
    window.__bcVoix.executer('coche le déjeuner'),
    window.__bcVoix.executer('Alfred, coche le petit-déjeuner'),
    window.__bcVoix.executer('alfred lance un pomodoro espagnol'),
    window.__bcVoix.executer('Alfred')
  ]);
  ok(r[0] === 'Déjeuner coché, Monsieur.', 'sans le nom : « ' + r[0] + ' »');
  ok(r[1] === 'Petit-déjeuner coché, Monsieur.', 'avec le nom : « ' + r[1] + ' »');
  ok(r[2] === 'Pomodoro Español, Monsieur.', 'le nom ne gêne pas la commande : « ' + r[2] + ' »');
  ok(r[3] === null, 'le nom seul ne déclenche rien');
  await ctx.close();
}

console.log('\n== 3) Appuyer sur le bouton : une commande, puis le micro se referme ==');
{
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(()=>document.getElementById('voix-btn').click());
  await page.waitForTimeout(60);
  ok(await fr.evaluate(()=>window.__micro.demarrages) === 1, 'le micro s\'ouvre au clic');
  ok(await fr.evaluate(()=>window.__micro.dernier.continuous) === false, 'écoute ponctuelle : continuous = false');
  await fr.evaluate(()=>window.__dire('coche le dîner'));
  await page.waitForTimeout(80);
  ok(await repasCoches(fr) > 0, 'la phrase agit : le dîner est coché');
  ok(await fr.evaluate(()=>window.__micro.dernier.demarre) === false, 'le micro se referme après la commande');
  await ctx.close();
}

console.log('\n== 4) Mode veille : seules les phrases appelées par son nom agissent ==');
{
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(()=>document.getElementById('alfred-veille').click());
  await page.waitForTimeout(80);
  const e = await etatBoutons(fr);
  ok(e.veilleTexte === '🦇 Écoute' && e.veilleArmee === 'true', 'la veille est armée : « ' + e.veilleTexte + ' »');
  ok(await fr.evaluate(()=>window.__micro.dernier.continuous) === true, 'micro ouvert en continu');
  ok(await fr.evaluate(()=>localStorage.getItem('bc-alfred-veille')) === '1', 'le choix est retenu sur l\'appareil');

  /* une conversation dans la pièce, sans le mot d'appel : rien ne doit bouger */
  await fr.evaluate(()=>window.__dire('coche le déjeuner'));
  await page.waitForTimeout(80);
  ok(await repasCoches(fr) === 0, 'une phrase sans « Alfred » ne coche rien');

  await fr.evaluate(()=>window.__dire('Alfred, coche le déjeuner'));
  await page.waitForTimeout(80);
  ok(await repasCoches(fr) > 0, 'la même phrase précédée de « Alfred » agit');

  await fr.evaluate(()=>document.getElementById('alfred-veille').click());
  await page.waitForTimeout(80);
  const e2 = await etatBoutons(fr);
  ok(e2.veilleTexte === '🦇 Veille' && e2.veilleArmee === 'false', 'on repasse en veille d\'un clic');
  ok(await fr.evaluate(()=>localStorage.getItem('bc-alfred-veille')) === '0', 'et le choix est retenu');
  await ctx.close();
}

console.log('\n== 5) Le réglage reste sur l\'appareil, et se reprend à l\'ouverture ==');
{
  const {ctx, fr} = await ouvrir('1');
  const e = await etatBoutons(fr);
  ok(e.veilleTexte === '🦇 Écoute', 'veille armée sur cet appareil : elle est reprise à l\'ouverture');
  ok(await fr.evaluate(()=>window.__micro.demarrages) >= 1, 'le micro se rouvre tout seul dans ce mode');
  const cles = await fr.evaluate(()=>Object.keys(localStorage).filter(k=>/alfred/i.test(k)));
  ok(cles.length === 1 && cles[0] === 'bc-alfred-veille' && !/^batcave-/.test(cles[0]),
     'la clé n\'a pas le préfixe batcave- : jamais synchronisée entre le Mac et l\'iPhone (' + cles.join(', ') + ')');
  await ctx.close();
}

console.log('\n== 6) Micro refusé : Alfred se désarme au lieu d\'insister ==');
{
  const {ctx, page, fr} = await ouvrir('1');
  await fr.evaluate(()=>{ const r = window.__micro.dernier; r.onerror({error:'not-allowed'}); });
  await page.waitForTimeout(120);
  const e = await etatBoutons(fr);
  ok(e.veilleTexte === '🦇 Veille' && e.veilleArmee === 'false', 'la veille se coupe d\'elle-même');
  ok(await fr.evaluate(()=>localStorage.getItem('bc-alfred-veille')) === '0', 'et le réglage suit : pas de boucle au prochain chargement');
  await ctx.close();
}

console.log('\n== 7) Alfred répond à voix haute, et ne s\'écoute pas parler ==');
{
  const {ctx, page, fr} = await ouvrir();
  const v = await fr.evaluate(()=>{ const x = window.__bcVoix.voix(); return x ? {nom:x.name, lang:x.lang} : null; });
  ok(v && v.nom === 'Thomas', 'il choisit une voix française masculine parmi celles de l\'appareil : ' + JSON.stringify(v));

  await fr.evaluate(()=>document.getElementById('voix-btn').click());
  await page.waitForTimeout(60);
  await fr.evaluate(()=>window.__dire('Alfred, coche le déjeuner'));
  await page.waitForTimeout(120);
  const d = await fr.evaluate(()=>window.__dit);
  ok(d.length === 1, 'une seule phrase prononcée (' + d.length + ')');
  ok(d[0] && /Déjeuner coché, Monsieur\.$/.test(d[0].texte), 'et c\'est bien sa réponse, dans son registre : « ' + (d[0]||{}).texte + ' »');
  ok(d[0] && d[0].voix === 'Thomas' && d[0].lang === 'fr-FR', 'prononcée avec la voix choisie : ' + (d[0]||{}).voix);
  ok(d[0] && d[0].rate < 1 && d[0].pitch < 1, 'ralentie et descendue d\'un cran : débit ' + (d[0]||{}).rate + ', hauteur ' + (d[0]||{}).pitch);
  await ctx.close();
}
{
  /* En veille, le micro est ouvert : s'il restait ouvert pendant qu'Alfred parle, il
     s'entendrait lui-même. Le micro doit se fermer, puis se rouvrir seul. */
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(()=>document.getElementById('alfred-veille').click());
  await page.waitForTimeout(80);
  const avant = await fr.evaluate(()=>window.__micro.demarrages);
  await fr.evaluate(()=>window.__dire('Alfred, clôture'));
  await page.waitForTimeout(10);
  ok(await fr.evaluate(()=>window.__micro.dernier.demarre) === false, 'le micro se ferme pendant qu\'il parle');
  await page.waitForTimeout(700);
  const apres = await fr.evaluate(()=>window.__micro.demarrages);
  ok(apres > avant, 'et se rouvre tout seul une fois la phrase finie (' + avant + ' → ' + apres + ')');
  ok(await fr.evaluate(()=>window.__bcVoix.enVeille()) === true, 'la veille est toujours armée');
  const d = await fr.evaluate(()=>window.__dit.map(x=>x.texte));
  ok(d.length === 1 && /Monsieur/.test(d[0]), 'une phrase, une seule : « ' + d[0] + ' »');
  await ctx.close();
}
{
  /* Ce qui n'est pas compris se dit aussi : le silence laisse croire à une panne. */
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(()=>document.getElementById('voix-btn').click());
  await page.waitForTimeout(60);
  await fr.evaluate(()=>window.__dire('fais-moi un café'));
  await page.waitForTimeout(120);
  const d = await fr.evaluate(()=>window.__dit.map(x=>x.texte));
  ok(d.length === 1 && /pas compris, Monsieur/.test(d[0]), 'il le dit au lieu de se taire : « ' + (d[0]||'') + ' »');
  await ctx.close();
}

console.log('\n== 8) Micro impossible : Alfred dit laquelle des trois raisons ==');
for(const [cas, attendu, quoi] of [
  ['refus',       /refus.*pour ce site|Param.*tres du site/i, 'tu as refusé → où le rétablir'],
  ['cadre',       /n.{0,3}a même pas demandé|pas le droit d.{0,3}ouvrir le micro/i, 'le cadre de claude.ai → ce n\'est pas ton réglage'],
  ['aucun-micro', /Aucun micro/i, 'pas de micro branché']
]){
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(a => { window.__micro.autorisation = a; }, cas);
  await fr.evaluate(() => document.getElementById('voix-btn').click());
  await page.waitForTimeout(200);
  const cause = await fr.evaluate(() => window.__bcVoix.cause());
  const msg = await fr.evaluate(() => (document.querySelector('.toast, #toast') || {}).textContent || '');
  ok(cause === cas, cas + ' : la cause est reconnue (' + cause + ')');
  ok(attendu.test(msg), '  → il explique ' + quoi + ' : « ' + msg.slice(0, 96) + ' »');
  ok(await fr.evaluate(() => window.__micro.dernier && window.__micro.dernier.demarre) !== true, '  → et il n\'ouvre pas le micro pour rien');
  await ctx.close();
}
{
  /* le cas du cadre est le plus probable sur la page publiée : la veille doit refuser
     de s'armer, pas rester allumée sur un micro qui n'écoutera jamais. */
  const {ctx, page, fr} = await ouvrir();
  await fr.evaluate(() => { window.__micro.autorisation = 'cadre'; });
  await fr.evaluate(() => document.getElementById('alfred-veille').click());
  await page.waitForTimeout(220);
  const e = await etatBoutons(fr);
  ok(e.veilleTexte === '🦇 Veille' && e.veilleArmee === 'false', 'la veille refuse de s\'armer sans micro');
  ok(await fr.evaluate(() => localStorage.getItem('bc-alfred-veille')) === '0', 'et le réglage ne ment pas au prochain chargement');
  await ctx.close();
}

console.log('\n== 9) Micro hors de portée : la dictée du clavier prend le relais ==');
{
  /* Le cas réel de la page publiée : le cadre refuse le micro AVANT toute demande.
     La politique de permissions est simulée telle que Chrome l'expose. */
  const ctx = await b.newContext({viewport:{width:1440,height:1300}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(FAUX_MICRO);
  await ctx.addInitScript(() => {
    window.claude = undefined;
    try{ Object.defineProperty(document, 'featurePolicy', {configurable:true, value:{
      allowsFeature: function(f){ return f !== 'microphone'; }
    }}); }catch(e){}
  });
  const page = await ctx.newPage();
  page.on('pageerror', e=>{err++; console.log('  PAGEERROR '+e.message);});
  await page.clock.install({time:new Date('2026-09-14T09:00:00+02:00')});
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached',timeout:20000});
  const fr = page.frames().find(x=>x.url().includes('batcave.html'));
  await fr.evaluate(()=>document.querySelectorAll('.overlay').forEach(o=>o.hidden=true));
  await page.waitForTimeout(400);

  const e = await etatBoutons(fr);
  ok(e.parlerVisible && e.parlerTexte === '⌨️ Alfred', 'le bouton annonce la dictée : « ' + e.parlerTexte + ' »');
  ok(e.veilleVisible === false, 'l\'interrupteur de veille disparaît : il n\'aurait rien à armer');
  ok(await fr.evaluate(()=>window.__micro.demarrages) === 0, 'aucune tentative d\'ouverture du micro');

  /* on appuie : un champ de texte s'ouvre, pas un micro */
  await fr.evaluate(()=>document.getElementById('voix-btn').click());
  await page.waitForTimeout(200);
  const champ = await fr.evaluate(()=>({ouvert: !document.getElementById('ask-overlay').hidden,
                                        titre: document.getElementById('ask-title').textContent,
                                        msg: document.getElementById('ask-msg').textContent}));
  ok(champ.ouvert, 'un champ s\'ouvre au lieu du micro');
  ok(/Alfred/.test(champ.titre) && /Fn Fn|🎤/.test(champ.msg), 'et il dit comment dicter : « ' + champ.msg.slice(0, 80) + ' »');

  /* la phrase dictée passe par la même grammaire, et la réponse est dite à voix haute */
  await fr.evaluate(()=>{ document.getElementById('ask-input').value = 'Alfred, coche le déjeuner';
                          document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(220);
  const coches = await fr.evaluate(()=>{ const s = JSON.parse(localStorage.getItem('batcave-meals-2026-09-14') || '{}');
                                         return Object.keys(s).filter(k=>s[k]).length; });
  ok(coches > 0, 'la phrase dictée agit : le déjeuner est coché');
  const dit = await fr.evaluate(()=>window.__dit.map(x=>x.texte));
  ok(dit.length === 1 && /Déjeuner coché, Monsieur\.$/.test(dit[0]), 'et Alfred répond de la même voix : « ' + (dit[0]||'') + ' »');

  /* une phrase hors périmètre le dit aussi, au lieu de ne rien faire */
  await fr.evaluate(()=>document.getElementById('voix-btn').click());
  await page.waitForTimeout(150);
  await fr.evaluate(()=>{ document.getElementById('ask-input').value = 'fais-moi un café';
                          document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(220);
  const dit2 = await fr.evaluate(()=>window.__dit.map(x=>x.texte));
  ok(dit2.length === 2 && /pas compris, Monsieur/.test(dit2[1]), 'une phrase hors périmètre est dite, pas ignorée : « ' + (dit2[1]||'') + ' »');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
