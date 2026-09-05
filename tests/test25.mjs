import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-03T10:00:00+02:00') });
await page.goto(URL);
await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
let fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(200);

console.log('\n== I) Export JSON : contient bien toutes les données ==');
await fr.evaluate(() => { localStorage.setItem('batcave-revision', JSON.stringify([{id:'x1',date:'2026-09-01',duree:123,matieres:{'Anatomía I':123}}])); });
await fr.evaluate(() => document.querySelector('.backup-trigger').click());
await page.waitForTimeout(300);
const exp = await fr.evaluate(() => ({
  ouvert: !document.getElementById('backup-overlay').hidden,
  json: document.getElementById('backup-export').value,
}));
ok(exp.ouvert, 'la fenêtre de sauvegarde s\'ouvre');
let parsed = null;
try { parsed = JSON.parse(exp.json); } catch(e) {}
ok(parsed !== null, 'le JSON exporté est valide (' + exp.json.length + ' caractères)');
ok(parsed && parsed['batcave-revision'] && parsed['batcave-revision'][0].duree === 123,
   'la révision de 123 min est bien dans l\'export');
const nbCles = parsed ? Object.keys(parsed).length : 0;
ok(nbCles >= 10, nbCles + ' clés de données incluses dans la sauvegarde');

console.log('\n== J) Restauration d\'une sauvegarde ==');
const faux = JSON.stringify({'batcave-revision':[{id:'r9',date:'2026-08-20',duree:999}], 'batcave-goals':{poids:70}});
await fr.evaluate(j => {
  document.getElementById('backup-import').value = j;
  document.getElementById('backup-import-btn').click();
}, faux);
await page.waitForTimeout(250);
const confirmDemande = await fr.evaluate(() => !document.getElementById('ask-overlay').hidden);
ok(confirmDemande, 'une confirmation explicite est demandée avant d\'écraser les données');
await fr.evaluate(() => document.getElementById('ask-ok').click());
await page.waitForTimeout(1400);
// la restauration recharge la page
await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
fr = page.frames().find(x => x.url().includes('batcave.html'));
await page.waitForTimeout(400);
const restaure = await fr.evaluate(() => ({
  rev: JSON.parse(localStorage.getItem('batcave-revision')||'[]'),
  goals: JSON.parse(localStorage.getItem('batcave-goals')||'{}'),
}));
ok(restaure.rev.length===1 && restaure.rev[0].duree===999, 'les données restaurées ont remplacé les anciennes : ' + JSON.stringify(restaure.rev));
ok(Number(restaure.goals.poids)===70, 'les objectifs sont restaurés aussi : poids=' + restaure.goals.poids);

console.log('\n== K) Annulation \u2318Z apr\u00e8s une suppression ==');
const F = () => page.frameLocator('#f');
await F().locator('.nav-btn[data-page="taches"]').waitFor({ state:'visible', timeout:15000 });
const rd2 = F().locator('#ritual-dismiss');
if(await rd2.count()) await rd2.click().catch(()=>{});
await F().locator('.nav-btn[data-page="taches"]').click();
await F().locator('#tk-text').fill('T\u00e2che t\u00e9moin');
await F().locator('#tk-add').click();
await F().locator('#taches-list [data-del]').waitFor({ state:'visible', timeout:10000 });
const avant = await page.evaluate(() => 0) + await F().locator('#taches-list [data-del]').count();
await F().locator('#taches-list [data-del]').first().click();
await page.waitForTimeout(400);
const apres = await F().locator('#taches-list [data-del]').count();
ok(avant === 1 && apres === 0, 't\u00e2che ajout\u00e9e puis supprim\u00e9e (' + avant + ' \u2192 ' + apres + ')');

// chemin 1 : le bouton "Annuler" de la barre latérale
await F().locator('.undo-trigger').last().click();
await page.waitForTimeout(1500);
await F().locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
await page.waitForTimeout(400);
await F().locator('.nav-btn[data-page="taches"]').click();
await page.waitForTimeout(250);
const parBouton = await F().locator('#taches-list').evaluate(el => el.innerText);
ok(/T\u00e2che t\u00e9moin/.test(parBouton), 'bouton "Annuler" : la t\u00e2che est restaur\u00e9e : ' + parBouton.replace(/\s+/g,' ').slice(0,50));

// chemin 2 : raccourci clavier, focus hors champ de saisie
await F().locator('#taches-list [data-del]').first().click();
await page.waitForTimeout(300);
const supprimee2 = await F().locator('#taches-list [data-del]').count();
await F().locator('body').click({ position:{x:5,y:5} });
await page.keyboard.press('Meta+z');
await page.waitForTimeout(1600);
await F().locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
await page.waitForTimeout(400);
await F().locator('.nav-btn[data-page="taches"]').click();
await page.waitForTimeout(250);
const parClavier = await F().locator('#taches-list').evaluate(el => el.innerText);
ok(supprimee2 === 0 && /T\u00e2che t\u00e9moin/.test(parClavier), '\u2318Z clavier : la t\u00e2che est restaur\u00e9e : ' + parClavier.replace(/\s+/g,' ').slice(0,50));

await ctx.close();
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
