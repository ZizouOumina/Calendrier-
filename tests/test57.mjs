/* Charge réaliste (deux semaines sous 70 % → cible réduite temporaire) et relevé OBJECTIF dans la barre. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { try{ if(sessionStorage.getItem('__a57')) return; sessionStorage.setItem('__a57','1'); }catch(e){} Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const texte = (fr, sel) => fr.evaluate(s => (document.querySelector(s) || {innerText:''}).innerText.replace(/\s+/g,' ').trim(), sel);
/* mardi 22 sept 2026 10:00 ; les semaines du 7 et du 14 ont eu des sessions, mais ~50 % du plan */
const MARDI22 = '2026-09-22T10:00:00+02:00';
function sessionsMoitie(){
  const out = [];
  const jours = ['2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13','2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-19','2026-09-20'];
  jours.forEach((iso, i) => {
    const t0 = new Date(iso + 'T07:20:00+02:00').getTime();
    out.push({id:'c' + i, date: iso, type:'cours', label:'Anatomía', duree:150, debut:t0, fin:t0 + 150*60000});       /* 2,5 h sur 4-5 h */
    out.push({id:'p' + i, date: iso, type:'projet', label:'Shopify', duree:60, debut:t0 + 5*3600e3, fin:t0 + 6*3600e3}); /* 1 h sur 1-3 h */
  });
  return out;
}

console.log('\n== 210) Deux semaines à ~50 % : la proposition apparaît dans le plan ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI22, {'batcave-sessions': sessionsMoitie()});
  const plan = await texte(fr, '#dash-plan');
  ok(/réduire la cible du jour de 20 %/.test(plan), 'proposition dans le plan : ' + (plan.match(/Fidélité[^?]*\?/) || [''])[0].slice(0, 90));
  const temps = await texte(fr, '#dash-temps');
  ok(/\/ 4,4h/.test(temps), 'avant : cible du jour 4,4 h de révision (' + temps.slice(0, 40) + ')');
  const objAvant = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="objectifs"]').click(); const r = [...document.querySelectorAll('#obj-liste .obj-row')].find(x => /^Révision/.test(x.innerText)); return r ? r.innerText.replace(/\s+/g,' ') : ''; });
  const attenduAvant = Number((objAvant.match(/attendu ([\d,]+)/) || ['', '0'])[1].replace(',', '.'));
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="dashboard"]').click());
  await fr.evaluate(() => document.querySelector('[data-plan-charge-oui]').click());
  await page.waitForTimeout(250);
  const ch = await local(fr, 'batcave-charge');
  ok(ch && ch.facteur === 0.8 && ch.depuis === '2026-09-22' && ch.jusqua === '2026-10-05', 'charge réduite de 20 % du 22 sept. au 5 oct.');
  const temps2 = await texte(fr, '#dash-temps');
  ok(/\/ 3,5h/.test(temps2) && /\/ 1,9h/.test(temps2), 'après : cible du jour 3,5 h de révision et 1,9 h de projets (' + temps2.slice(0, 50) + ')');
  const sem = await texte(fr, '#dash-semaine');
  ok(/Charge réduite de 20 % jusqu'au 0?5 oct\./.test(sem), 'la note de la semaine le dit : ' + sem.slice(0, 60));
  const objApres = await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="objectifs"]').click(); const r = [...document.querySelectorAll('#obj-liste .obj-row')].find(x => /^Révision/.test(x.innerText)); return r ? r.innerText.replace(/\s+/g,' ') : ''; });
  const attenduApres = Number((objApres.match(/attendu ([\d,]+)/) || ['', '0'])[1].replace(',', '.'));
  ok(attenduAvant > 0 && attenduApres < attenduAvant, 'le rythme attendu de l\'objectif Révision baisse (' + attenduAvant + ' → ' + attenduApres + ' h), la cible du mois ne bouge pas');
  ok(!/réduire la cible du jour/.test(await texte(fr, '#dash-plan')), 'la proposition ne revient pas tant que la réduction est active');
  await ctx.close();
}

console.log('\n== 211) Refuser : plus proposé cette semaine ; sans aucune session : jamais proposé ==');
{
  const { ctx, fr, page } = await ouvrir(MARDI22, {'batcave-sessions': sessionsMoitie()});
  await fr.evaluate(() => document.querySelector('[data-plan-charge-non]').click());
  await page.waitForTimeout(200);
  const ch = await local(fr, 'batcave-charge');
  ok(ch && ch.refus === '2026-09-21', 'le refus est noté pour la semaine du 21 sept.');
  ok(!/réduire la cible du jour/.test(await texte(fr, '#dash-plan')), 'et la proposition disparaît');
  ok(/\/ 4,4h/.test(await texte(fr, '#dash-temps')), 'la cible reste à 4,4 h');
  await ctx.close();
  const o = await ouvrir(MARDI22);
  ok(!/réduire la cible du jour/.test(await texte(o.fr, '#dash-plan')), 'sans aucune session les deux semaines précédentes : pas de proposition (non-usage ≠ infidélité)');
  await o.ctx.close();
}

console.log('\n== 212) La réduction se termine toute seule ==');
{
  const { ctx, fr } = await ouvrir('2026-10-06T10:00:00+02:00', {'batcave-charge': {facteur:0.8, depuis:'2026-09-22', jusqua:'2026-10-05', motif:'test'}});
  ok(/\/ 4,4h/.test(await texte(fr, '#dash-temps')), 'le 6 octobre : cible de nouveau à 4,4 h');
  ok(!/Charge réduite/.test(await texte(fr, '#dash-semaine')), 'plus de mention de charge réduite');
  await ctx.close();
}

console.log('\n== 213) Relevé OBJECTIF dans la barre ==');
{
  const { ctx, fr } = await ouvrir(MARDI22, {'batcave-sessions': sessionsMoitie()});
  const r = await fr.evaluate(() => ({ txt: document.querySelector('#bc-objectif .v').textContent, titre: document.querySelector('#bc-objectif .v').title }));
  ok(/^(Révision|Projets perso|Séances de sport tenues|Espagnol|Habitudes tenues|Eau moyenne \/ jour|Sommeil moyen \/ nuit) [−+][\d,]+ /.test(r.txt), 'le pire objectif du mois est affiché : ' + r.txt);
  ok(/de retard sur le mois/.test(r.titre) && /attendu à ce jour/.test(r.titre), 'le détail est dans l\'info-bulle : ' + r.titre.slice(0, 80));
  await fr.evaluate(() => document.getElementById('bc-objectif').click());
  ok(await fr.evaluate(() => document.querySelector('.page[data-page="objectifs"]').classList.contains('active')), 'un clic ouvre la page Objectifs');
  await ctx.close();
  /* tout dans les clous : premier jour du mois, rien n'est en retard */
  const o = await ouvrir('2026-09-01T10:00:00+02:00');
  const t2 = await o.fr.evaluate(() => document.querySelector('#bc-objectif .v').textContent);
  ok(t2 === 'mois dans les clous' || t2 === '—', 'sans retard : « ' + t2 + ' »');
  await o.ctx.close();
}

console.log(errs ? '\nÉCHEC : ' + errs + ' erreur(s)' : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
