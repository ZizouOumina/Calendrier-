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
  window.__micro = {instances:[], demarrages:0};
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
  ok(r[0] === 'Déjeuner coché.', 'sans le nom : « ' + r[0] + ' »');
  ok(r[1] === 'Petit-déjeuner coché.', 'avec le nom : « ' + r[1] + ' »');
  ok(r[2] === 'Pomodoro Español.', 'le nom ne gêne pas la commande : « ' + r[2] + ' »');
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

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
