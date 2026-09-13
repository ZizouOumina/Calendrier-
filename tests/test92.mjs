/* Le scenario de lundi : une Batcave pleine de donnees, la remise a zero, et ce qui
   doit survivre -- les habitudes, les generations de semis, et rien d'autre de sale. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c,m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

const ctx = await b.newContext({viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + e.message); });
await page.clock.install({ time: new Date('2026-09-14T07:00:00+02:00') });
await page.goto('http://127.0.0.1:8199/host.html');
await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:20000});
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
await page.waitForTimeout(500);

/* On salit : des saisies de journee, un log d'habitudes, une phrase de passe. */
await fr.evaluate(() => {
  localStorage.setItem('batcave-journees', JSON.stringify({'2026-09-13':{poids:64.2, eau:2}}));
  localStorage.setItem('batcave-habitlog', JSON.stringify({'2026-09-13':{'core-ongles':true}}));
  localStorage.setItem('bc-phrase', JSON.stringify('secret'));
});

const avant = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-habits')||'[]').map(h=>h.id));
ok(avant.includes('core-ongles'), 'avant la remise à zéro : core-ongles est là (' + avant.length + ' habitudes)');

/* La remise a zero, par la fonction reelle de l'application. */
const res = await fr.evaluate(() => {
  const g = window.__bcReinitGarder;
  if(!g) return {err:'pas de sonde __bcReinitGarder'};
  const tout = Object.keys(localStorage);
  const efface = [], gardes = [];
  tout.forEach(k => {
    if(k.indexOf('batcave-') !== 0) return;
    if(g(k)) gardes.push(k); else { localStorage.removeItem(k); efface.push(k); }
  });
  return {efface, gardes, habitsGarde: g('batcave-habits'), v7Garde: g('batcave-habits-seed-v7'),
          logEfface: !g('batcave-habitlog')};
});
ok(!res.err, res.err || 'la sonde de remise à zéro répond');
ok(res.habitsGarde, 'batcave-habits est gardée par la remise à zéro');
ok(res.v7Garde, 'batcave-habits-seed-v7 est gardée — sinon le semis rejouerait');
ok(res.logEfface, 'le journal des habitudes (habitlog) est bien effacé');
ok(res.efface.length > 0, res.efface.length + ' clé(s) effacée(s)');

/* Rechargement : c'est la que le semis pourrait re-ajouter ou perdre quelque chose. */
await page.reload();
await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:20000});
const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
await fr2.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
await page.waitForTimeout(600);
const apres = await fr2.evaluate(() => JSON.parse(localStorage.getItem('batcave-habits')||'[]').map(h=>h.id));
ok(apres.includes('core-ongles'), 'après la remise à zéro et rechargement : core-ongles survit');
ok(apres.length === avant.length, 'aucune habitude perdue ni dupliquée (' + avant.length + ' → ' + apres.length + ')');
ok(new Set(apres).size === apres.length, 'aucun doublon d\'identifiant');
/* batcave-journees est volontairement GARDEE (il rentre le poids du 13 lundi) :
   on verifie donc l'inverse -- qu'elle a bien survecu. */
const journees = await fr2.evaluate(() => localStorage.getItem('batcave-journees'));
ok(/64\.2/.test(journees || ''), 'le journal des journées survit, comme prévu (poids du 13 conservé)');
const hl = await fr2.evaluate(() => localStorage.getItem('batcave-habitlog'));
ok(!hl || hl === 'null' || hl === '{}', 'les coches d\'habitudes repartent de zéro (' + hl + ')');

/* Et la banniere d'incoherence doit rester eteinte. */
const banniere = await fr2.evaluate(() => {
  const t = document.body.innerText;
  return /incohérence|Le semis d'habitudes est marqué fait/i.test(t) ? t.slice(0,160) : '';
});
ok(!banniere, 'aucune bannière d\'incohérence après la remise à zéro' + (banniere ? ' — ' + banniere : ''));

/* Le dimanche 27 : premier dimanche d'ongles APRES la remise a zero. */
await page.clock.setFixedTime(new Date('2026-09-27T09:00:00+02:00'));
await page.reload();
await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:20000});
const fr3 = page.frames().find(x => x.url().includes('batcave.html'));
await fr3.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
await page.waitForTimeout(600);
const l27 = await fr3.evaluate(() => [...document.querySelectorAll('#dash-checklist li label')].map(x=>x.textContent));
ok(l27.some(t=>/Ongles/.test(t)), 'dim. 27 sept : la case ongles est bien là, après la remise à zéro');
ok(!l27.some(t=>/Photos/.test(t)), 'dim. 27 sept : pas de photos, donc mains seulement');

await ctx.close(); await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
