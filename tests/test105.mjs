/* Les bases Notion surveillees : une par matiere REELLE, et seulement celles du semestre
   EN COURS. Ecrit le 23 septembre au soir, quand le SEMESTRE 2 a enfin ses six vraies
   matieres dans Notion (Idioma moderno creee le soir meme).

   Ce que ce test protege : jusqu'ici NOTION_BASES etait une liste plate, et tout ce qui
   s'y trouvait etait lu en permanence. Y ajouter le S2 aurait fait remonter des temas de
   Bioquimica dans le Plan du jour en octobre -- le meme bruit que les six bases fantomes
   de PASS qu'on venait d'enlever, avec de vraies bases cette fois. Chaque entree porte
   donc son semestre, et basesNotionDuSemestre() ne rend que celles du semestre courant.
   La bascule est la MEME que celle du panneau Approfondissements (numSemestre), pour
   qu'il n'y ait qu'un seul 25 janvier dans toute l'application. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => { window.claude = undefined; });
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-10-14T10:00:00+02:00') });
await page.goto(URL, {timeout:20000}).catch(() => {});
await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(300);

console.log('\n== 257) Les onze bases sont declarees, et chacune porte son semestre ==');
{
  const b = await fr.evaluate(() => window.__bcNotionBases());
  ok(b.length === 11, 'onze bases declarees (' + b.length + ')');
  ok(b.filter(x => x.sem === 1).length === 5, 'cinq au semestre 1 (' + b.filter(x => x.sem === 1).length + ')');
  ok(b.filter(x => x.sem === 2).length === 6, 'six au semestre 2 (' + b.filter(x => x.sem === 2).length + ')');
  ok(b.every(x => x.sem === 1 || x.sem === 2), 'aucune base sans semestre');
  /* Deux matieres qui pointent sur la meme base, c'est le bug de septembre a l'envers :
     une seule repondrait, l'autre afficherait ses cours. */
  const ids = b.map(x => x.ds);
  ok(new Set(ids).size === ids.length, 'aucun identifiant de base en double');
  ok(b.every(x => /^collection:\/\/[0-9a-f-]{36}$/.test(x.ds)), 'toutes les adresses ont la forme attendue');
  /* Anatomia I ne doit plus pointer sur l'orpheline 54fe... */
  const a1 = b.filter(x => x.m === 'Anatomía I')[0];
  ok(!!a1 && /11becda1/.test(a1.ds), 'Anatomía I pointe sur la base du SEMESTRE 1, pas sur l\'orpheline');
}

console.log('\n== 258) En octobre, seules les cinq du S1 sont surveillees ==');
{
  const r = await fr.evaluate(() => ({
    n: window.__bcNotionBasesDu().length,
    sems: window.__bcNotionBasesDu().map(x => x.sem),
    noms: window.__bcNotionBasesDu().map(x => x.m)
  }));
  ok(r.n === 5, 'cinq bases surveillees le 14 octobre (' + r.n + ')');
  ok(r.sems.every(s => s === 1), 'toutes du semestre 1');
  ok(r.noms.indexOf('Bioquímica') === -1, 'Bioquímica ne remonte pas — elle est au S2');
}

console.log('\n== 259) Apres le 25 janvier, ce sont les six du S2 ==');
{
  const r = await fr.evaluate(() => ({
    fev: window.__bcNotionBasesDu('2027-02-15').map(x => x.m),
    sems: window.__bcNotionBasesDu('2027-02-15').map(x => x.sem)
  }));
  ok(r.fev.length === 6, 'six bases surveillees le 15 février (' + r.fev.length + ')');
  ok(r.sems.every(s => s === 2), 'toutes du semestre 2');
  ok(r.fev.indexOf('Idioma moderno') > -1, 'Idioma moderno en fait partie');
  ok(r.fev.indexOf('Anatomía I') === -1, 'Anatomía I ne remonte plus — le S1 est fini');
}

console.log('\n== 260) La bascule est celle de numSemestre, pas une deuxieme date ==');
{
  /* Le 19 janvier est le dernier jour du S1 ; le 25 le premier du S2. L'entre-deux
     (20-22 janvier) n'a pas de semestre : numSemestre retombe sur le 1 avant le 25. */
  const r = await fr.evaluate(() => ({
    j19: window.__bcNotionBasesDu('2027-01-19').length,
    j21: window.__bcNotionBasesDu('2027-01-21').length,
    j25: window.__bcNotionBasesDu('2027-01-25').length,
    n19: window.__bcNumSemestre ? window.__bcNumSemestre('2027-01-19') : null,
    n25: window.__bcNumSemestre ? window.__bcNumSemestre('2027-01-25') : null
  }));
  ok(r.j19 === 5, 'le 19 janvier, dernier jour du S1 : cinq bases (' + r.j19 + ')');
  ok(r.j21 === 5, 'le 21 janvier, entre les deux semestres : toujours cinq (' + r.j21 + ')');
  ok(r.j25 === 6, 'le 25 janvier, premier jour du S2 : six bases (' + r.j25 + ')');
  if(r.n19 !== null){
    ok(r.n19 === 1 && r.n25 === 2, 'la bascule suit numSemestre (' + r.n19 + ' → ' + r.n25 + ')');
  }
}

console.log(errs ? '\nERREURS: ' + errs : '\nTOUT VERT');
await browser.close();
process.exit(errs ? 1 : 0);
