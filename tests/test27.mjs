import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(seed) await ctx.addInitScript(x => { if(localStorage.getItem('__s')) return; localStorage.setItem('__s','1');
    Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: '+e.message); });
  await page.clock.install({ time: new Date('2026-09-03T08:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="budget"]').click());
  await page.waitForTimeout(250);
  return { ctx, page, fr };
}

console.log('\n== 63) Charges annuelles et trimestrielles, lissées au mois ==');
{
  const { ctx, page, fr } = await ouvrir({'batcave-fixed-charges': [], 'batcave-transactions': []});
  async function ajouter(label, montant, periode){
    await fr.evaluate(a => {
      document.getElementById('fc-label').value = a.label;
      document.getElementById('fc-montant').value = String(a.montant);
      document.getElementById('fc-periode').value = a.periode;
      document.getElementById('fc-add').click();
    }, {label, montant, periode});
    await page.waitForTimeout(200);
  }
  await ajouter('Loyer', 700, 'mensuel');
  await ajouter('Assurance', 240, 'annuel');
  await ajouter('Licence sport', 90, 'trimestriel');

  // une ligne par charge, pour éviter qu'une regex déborde sur la suivante
  const lignes = await fr.evaluate(() => [...document.querySelectorAll('#fixed-charges-list li')].map(li => li.innerText.replace(/\s+/g,' ').trim()));
  const lgn = n => lignes.find(l => l.startsWith(n)) || '(absente)';
  ok(/240 €\/an soit 20 €\/mois/.test(lgn('Assurance')), 'l\'annuel affiche son équivalent mensuel : ' + lgn('Assurance'));
  ok(/90 €\/trimestre soit 30 €\/mois/.test(lgn('Licence sport')), 'le trimestriel aussi : ' + lgn('Licence sport'));
  ok(/700 €\/mois/.test(lgn('Loyer')) && !/soit/.test(lgn('Loyer')), 'le mensuel reste affiché simplement : ' + lgn('Loyer'));

  const total = await fr.evaluate(() => document.getElementById('fixed-charges-total').textContent);
  // +25 € : iCloud (3 €) et Claude Pro (22 €) sont réinjectés d'office par la migration
  ok(/775/.test(total), 'total lissé = 700 + 20 + 30 + 25 (charges par défaut) = 775 €/mois : ' + total);

  const tuile = await fr.evaluate(() => document.querySelectorAll('#budget-stats .stat-tile')[4].innerText.replace(/\s+/g,''));
  ok(/775/.test(tuile), 'la tuile "Charges fixes" affiche le même total lissé : ' + tuile);

  const tx = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-transactions')||'[]').filter(t=>t.fixed));
  const assurance = tx.find(t => /Assurance/.test(t.label||''));
  ok(assurance && assurance.montant === 20, 'la transaction du mois pour l\'assurance est de 20 € (pas 240) : ' + (assurance&&assurance.montant));
  ok(assurance && /lissé/.test(assurance.label), 'son libellé indique le lissage : ' + (assurance&&assurance.label));
  const somme = tx.reduce((a,t)=>a+Number(t.montant),0);
  ok(Math.round(somme) === 775, 'les dépenses fixes du mois totalisent 775 € : ' + somme);
  await ctx.close();
}

console.log('\n== 64) Rétrocompatibilité : charges existantes sans périodicité ==');
{
  const { ctx, page, fr } = await ouvrir({
    'batcave-fixed-charges': [{id:'old1', label:'Ancien loyer', montant:500, cat:'Logement'}],
    'batcave-transactions': []
  });
  const total = await fr.evaluate(() => document.getElementById('fixed-charges-total').textContent);
  ok(/525/.test(total), 'une charge sans champ "periode" reste mensuelle (500 + 25 par défaut) : ' + total);
  const liste = await fr.evaluate(() => document.getElementById('fixed-charges-list').innerText.replace(/\s+/g,' '));
  const ligneAnc = await fr.evaluate(() => [...document.querySelectorAll('#fixed-charges-list li')].map(li => li.innerText.replace(/\s+/g,' ')).find(l => l.startsWith('Ancien loyer')) || '');
  ok(/500 €\/mois/.test(ligneAnc) && !/soit/.test(ligneAnc), 'affichée comme mensuelle, sans mention de lissage : ' + ligneAnc);
  await ctx.close();
}
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
