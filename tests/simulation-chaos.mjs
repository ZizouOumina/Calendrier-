/* Chaos : chaque champ recoit des valeurs limites, chaque sorte de bouton est cliquee (les
   confirmations acceptees un coup sur deux), sur six mois de donnees fictives, a quatre
   moments et sur deux ecrans. Apres chaque geste : pas d'erreur JS, pas de NaN/undefined a
   l'ecran, pas de debordement. Apres chaque onglet : la Batcave redemarre, le stockage est du
   JSON valide, la coherence ne signale rien. Les gestes qui effacent tout (nouveau depart,
   restauration) passent en dernier. */
import { chromium } from 'playwright';
import { seed, decalage } from './donnees-fictives.mjs';
const URL = 'http://127.0.0.1:8199/host.html';
const browser = await chromium.launch();
let defauts = 0, total = 0, clics = 0;
const ok = (c, m) => { total++; if(!c){ defauts++; console.log('  ✗   ' + m); } };
const PAGES = ['dashboard', 'calendrier', 'etudes', 'bilan', 'insights', 'objectifs', 'systeme', 'budget', 'habitudes', 'coran', 'sport', 'addictions', 'repas', 'prep', 'courses'];
const CAS = [['2026-09-28', '10:00', 'Mac'], ['2026-12-20', '21:00', 'iPhone'], ['2027-01-12', '10:00', 'Mac'], ['2027-06-10', '19:00', 'iPhone']];

async function ouvrir(ctx, page){
  await page.goto(URL, {timeout: 30000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state: 'attached', timeout: 30000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.waitForFunction(() => window.__bcInitFini === true, null, {timeout: 20000}).catch(() => {});
  await fr.evaluate(() => { ['ritual-dismiss'].forEach(id => { const r = document.getElementById(id); if(r && r.offsetParent !== null) r.click(); }); });
  return fr;
}
/* ce qui tourne dans la page : signature d'un bouton, liste des boutons visibles, remise au calme */
const OUTILS = `
  window.__sig = function(el){
    var d = [].slice.call(el.attributes).filter(function(a){ return a.name.indexOf('data-') === 0; }).map(function(a){ return a.name; }).sort().join(',');
    return (el.id ? '#' + el.id : '') + '|' + d + '|' + (el.id || d ? '' : (el.textContent || '').trim().slice(0, 24));
  };
  window.__visible = function(el){ if(!el || el.disabled) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  window.__calmer = function(){
    for(var n = 0; n < 4; n++){
      var ov = [].slice.call(document.querySelectorAll('.overlay')).filter(function(o){ return !o.hidden; });
      if(!ov.length) return;
      var o = ov[ov.length - 1];
      var b = o.querySelector('#ask-cancel, #cloture-close, #backup-close, #ritual-close, #pilote-fermer, #demain-fermer, .edel, [id$="-close"], [id$="-fermer"]');
      if(o.id === 'focus-overlay'){ var s = [].slice.call(o.querySelectorAll('button')).filter(function(x){ return /Arr[êe]t|Stop|Termin|Abandon|Fermer/i.test(x.textContent); })[0]; if(s) s.click(); else o.hidden = true; continue; }
      if(b) b.click(); else o.hidden = true;
    }
  };`;
const RISQUE = /reinit|nouveau-depart|restaur|restore|vierge|copie|undo|annuler-tout|cloud-refresh|reprise/i;

for(const [date, heure, ecran] of CAS){
  const vp = ecran === 'Mac' ? {width: 1440, height: 900} : {width: 390, height: 844};
  const ctx = await browser.newContext({ viewport: vp, timezoneId: 'Europe/Madrid', locale: 'fr-FR', hasTouch: ecran !== 'Mac', acceptDownloads: false });
  await ctx.addInitScript(() => { window.claude = undefined; });
  await ctx.addInitScript(x => { if(!sessionStorage.getItem('chaos-seme')){ sessionStorage.setItem('chaos-seme', '1'); Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); } }, seed(date));
  await ctx.addInitScript(OUTILS);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.on('filechooser', f => {});
  await page.clock.install({ time: new Date(date + 'T' + heure + ':00' + decalage(date)) });
  console.log('\n══ ' + ecran + ' · ' + date + ' ' + heure + ' ══');
  let fr = await ouvrir(ctx, page);
  for(const p of PAGES){
    const avantErr = erreurs.length;
    /* 1. les champs : valeurs limites */
    await fr.evaluate(p => {
      document.querySelector('.nav-btn[data-page="' + p + '"]').click();
      var sec = document.querySelector('.page[data-page="' + p + '"]');
      var LIM = {number: ['', '0', '-5', '99999', '3.5'], text: ['', ' ', "é'\"<b>x</b> 🦇", 'x'.repeat(240)], date: ['', '1999-01-01', '2099-12-31'], time: ['', '00:00', '23:59'], textarea: ['', 'ligne\nligne 🦇']};
      var i = 0;
      sec.querySelectorAll('input, select, textarea').forEach(function(el){
        if(!window.__visible(el) || el.type === 'checkbox' || el.type === 'radio' || el.type === 'file' || el.type === 'hidden') return;
        i++;
        if(el.tagName === 'SELECT'){ if(el.options.length) el.selectedIndex = i % el.options.length; }
        else { var l = LIM[el.tagName === 'TEXTAREA' ? 'textarea' : el.type] || LIM.text; el.value = l[i % l.length]; }
        el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true}));
      });
    }, p).catch(e => erreurs.push('champs ' + p + ' : ' + e.message));
    /* 2. chaque sorte de bouton, les risques a la fin */
    const sigs = await fr.evaluate(p => {
      var sec = document.querySelector('.page[data-page="' + p + '"]'), vus = {}, out = [];
      sec.querySelectorAll('button, [role="button"], input[type="checkbox"], summary, .chip').forEach(function(el){ if(!window.__visible(el)) return; var s = window.__sig(el); if(vus[s]) return; vus[s] = true; out.push(s); });
      return out;
    }, p).catch(() => []);
    const ordre = sigs.filter(s => !RISQUE.test(s)).concat(sigs.filter(s => RISQUE.test(s)));
    let n = 0;
    for(const sig of ordre.slice(0, 70)){
      n++; clics++;
      const accepter = n % 2 === 0;
      let r;
      try{
        r = await fr.evaluate(({p, sig, accepter}) => {
          var sec = document.querySelector('.page[data-page="' + p + '"]');
          if(!sec.classList.contains('active')) document.querySelector('.nav-btn[data-page="' + p + '"]').click();
          var el = [].slice.call(sec.querySelectorAll('button, [role="button"], input[type="checkbox"], summary, .chip')).filter(function(x){ return window.__sig(x) === sig && window.__visible(x); })[0];
          if(!el) return {absent: true};
          el.click();
          var ask = document.getElementById('ask-overlay');
          if(ask && !ask.hidden){ var champ = ask.querySelector('input, select'); if(champ && champ.tagName === 'INPUT' && !champ.value) champ.value = '7'; document.getElementById(accepter ? 'ask-ok' : 'ask-cancel').click(); }
          return {absent: false};
        }, {p, sig, accepter});
      }catch(e){ r = {nav: true}; }
      /* apres les animations (rebond 220 ms) : on mesure l'etat qui reste, pas un instant de transition */
      await page.waitForTimeout(260);
      if(r.nav){ fr = await ouvrir(ctx, page).catch(() => fr); continue; }
      if(r.absent) continue;
      const etat = await fr.evaluate(p => {
        window.__calmer();
        var sec = document.querySelector('.page[data-page="' + p + '"]'), t = sec ? sec.innerText : '';
        var W = document.documentElement.clientWidth, hors = [].slice.call(document.querySelectorAll('.toast, .overlay-panel')).filter(function(e){ if(e.hidden || e.closest('[hidden]')) return false; var r = e.getBoundingClientRect(); return r.width > 0 && (r.right > W + 1 || r.left < -1); }).map(function(e){ return e.id || e.className; });
        if(document.documentElement.scrollWidth > W + 1){
          var tous = [];
          document.querySelectorAll('body *').forEach(function(e){ var r = e.getBoundingClientRect(); if(r.right > W + 1 && r.width > 0){ var par = e.parentElement; if(par && par.getBoundingClientRect().right <= W + 1) tous.push(e.tagName + '#' + e.id + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 30) + ' ' + getComputedStyle(e).position + ' r=' + Math.round(r.right) + '«' + (e.textContent || '').trim().slice(0, 16) + '»'); } });
          hors = hors.concat(tous.filter(function(t){ return !/^NAV|nav-btn/.test(t); }).slice(0, 3));
          if(!hors.length){
            var brut = [];
            document.querySelectorAll('body *').forEach(function(e){ if(e.closest('nav')) return; var r = e.getBoundingClientRect(); if(r.right > W + 1 || e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 300) brut.push(e.tagName + '#' + e.id + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 24) + ' r=' + Math.round(r.right) + ' w=' + Math.round(r.width) + ' sw=' + e.scrollWidth + ' ' + getComputedStyle(e).position); });
            var r1 = document.querySelector('.bc-row-1');
            if(r1 && r1.scrollWidth > r1.clientWidth + 1) hors.push('bc-row-1 : ' + [].slice.call(r1.children).map(function(c){ return c.tagName + '#' + c.id + '.' + String(c.className).slice(0, 22) + ' w=' + Math.round(c.getBoundingClientRect().width) + (c.hidden ? ' (caché)' : '') + ' «' + (c.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26) + '»'; }).join(' | ') + ' ; flex-wrap=' + getComputedStyle(r1).flexWrap);
            else hors.push('sw=' + document.documentElement.scrollWidth + ' ' + brut.slice(0, 5).join(' / '));
          }
        }
        return {s: (t.match(/\bNaN\b|undefined|\[object|Infinity/g) || []).slice(0, 2), deb: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || hors.length > 0, hors: hors, plein: /Stockage plein/.test((document.getElementById('toast') || {}).textContent || '')};
      }, p).catch(() => ({s: [], deb: false, plein: false, perdu: true}));
      if(etat.perdu){ fr = await ouvrir(ctx, page).catch(() => fr); continue; }
      ok(!etat.s.length && !etat.deb && !etat.plein, ecran + ' ' + date + ' · ' + p + ' · clic ' + sig + (etat.s.length ? ' → ' + etat.s.join(',') : '') + (etat.deb ? ' → déborde' + (etat.hors && etat.hors.length ? ' (' + etat.hors.join(',') + ')' : '') : '') + (etat.plein ? ' → stockage plein' : ''));
    }
    ok(erreurs.length === avantErr, ecran + ' ' + date + ' · ' + p + ' : aucune erreur JS (' + n + ' boutons)' + (erreurs.length > avantErr ? ' · ' + erreurs.slice(avantErr, avantErr + 2).join(' | ') : ''));
    /* 3. la Batcave redemarre sur ce qui vient d'etre ecrit */
    fr = await ouvrir(ctx, page);
    const sain = await fr.evaluate(() => {
      var mauvais = [];
      for(var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if(k.indexOf('batcave-') !== 0) continue; try{ JSON.parse(localStorage.getItem(k)); }catch(e){ mauvais.push(k); } }
      var sante = window.__bcSante ? window.__bcSante() : [];
      var co = sante.filter(function(x){ return x.id === 'coherence'; })[0];
      return {mauvais: mauvais, coherence: co ? (co.ok ? '' : co.texte) : '', init: window.__bcInitFini === true};
    });
    ok(sain.init && !sain.mauvais.length, ecran + ' ' + date + ' · après ' + p + ' : redémarrage propre' + (sain.mauvais.length ? ' · JSON abîmé ' + sain.mauvais.join(',') : ''));
    if(sain.coherence) console.log('      (cohérence après ' + p + ' : ' + sain.coherence + ')');
  }
  ok(!erreurs.length, ecran + ' ' + date + ' : aucune erreur JS au total' + (erreurs.length ? ' · ' + [...new Set(erreurs)].slice(0, 3).join(' | ') : ''));
  await ctx.close();
}
await browser.close();
console.log('\n' + clics + ' clics · ' + total + ' vérifications · ' + (defauts ? defauts + ' DÉFAUT(S)' : 'RIEN À SIGNALER'));
process.exit(defauts ? 1 : 0);
