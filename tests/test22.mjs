import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(seed) await ctx.addInitScript(s => {
    if(localStorage.getItem('__seed')) return;
    localStorage.setItem('__seed','1');
    Object.keys(s).forEach(k => localStorage.setItem(k, JSON.stringify(s[k])));
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T10:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(200);
  return { ctx, page, fr };
}

console.log('\n== 60) Camemberts Entrées / Dépenses sur la page Budget ==');
{
  // charges fixes vidées : sinon l'app pré-remplit Loyer/Wifi/etc. chaque mois et l'état "vide" n'existe jamais
  const { ctx, page, fr } = await ouvrir({ 'batcave-fixed-charges': [] });

  // état vide : message plutôt qu'un camembert cassé
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="budget"]').click());
  await page.waitForTimeout(150);
  const empty = await fr.evaluate(() => ({
    entrees: document.getElementById('budget-pie-entrees').innerText,
    // les charges fixes par défaut (iCloud + Claude Pro, migration automatique) alimentent
    // toujours "Abonnements" même sur une install vierge : la page Dépenses n'est donc
    // jamais littéralement vide, on vérifie juste qu'elle affiche bien cette base de 25 €.
    depenses: document.getElementById('budget-pie-depenses').innerText.replace(/\s+/g,' '),
  }));
  ok(/Aucune entrée/.test(empty.entrees), 'camembert Entrées vide → message clair : ' + empty.entrees);
  ok(/Abonnements 25 € · 100%/.test(empty.depenses), 'camembert Dépenses part de la base "Abonnements" (charges fixes par défaut) : ' + empty.depenses);

  // on ajoute des transactions des deux types, plusieurs catégories
  async function ajouterTx(type, cat, montant){
    await fr.evaluate(function(a){
      document.getElementById('tx-date').value = '2026-09-02';
      document.getElementById('tx-type').value = a.type;
      document.getElementById('tx-type').dispatchEvent(new Event('change'));
      document.getElementById('tx-cat').value = a.cat;
      document.getElementById('tx-montant').value = String(a.montant);
      document.getElementById('tx-add').click();
    }, {type, cat, montant});
    await page.waitForTimeout(80);
  }
  await ajouterTx('Entrée', 'Shopify', 800);
  await ajouterTx('Entrée', 'Aide familiale', 200);
  await ajouterTx('Dépense', 'Logement', 400);
  await ajouterTx('Dépense', 'Nourriture', 150);
  await ajouterTx('Dépense', 'Loisirs', 50);

  const after = await fr.evaluate(() => ({
    entreesSlices: document.querySelectorAll('#budget-pie-entrees svg path, #budget-pie-entrees svg circle').length,
    depensesSlices: document.querySelectorAll('#budget-pie-depenses svg path, #budget-pie-depenses svg circle').length,
    entreesTxt: document.getElementById('budget-pie-entrees').innerText.replace(/\s+/g,' '),
    depensesTxt: document.getElementById('budget-pie-depenses').innerText.replace(/\s+/g,' '),
  }));
  ok(after.entreesSlices === 2, '2 parts dans le camembert Entrées (Shopify + Aide familiale) : ' + after.entreesSlices);
  // 4 = Logement/Nourriture/Loisirs ajoutés + la base "Abonnements" (25 €) déjà présente
  ok(after.depensesSlices === 4, '4 parts dans le camembert Dépenses (Logement/Nourriture/Loisirs + base Abonnements) : ' + after.depensesSlices);
  ok(/Shopify/.test(after.entreesTxt) && /800/.test(after.entreesTxt) && /80%/.test(after.entreesTxt), 'légende Entrées correcte (montant + %) : ' + after.entreesTxt);
  ok(/Logement/.test(after.depensesTxt) && /400/.test(after.depensesTxt) && /64%/.test(after.depensesTxt), 'légende Dépenses correcte (montant + %, triée par montant décroissant) : ' + after.depensesTxt);

  // suppression d'une transaction (Loisirs, la plus récente ajoutée) : le camembert Dépenses
  // doit se recalculer tout seul, sans rester figé sur l'ancien total.
  await fr.evaluate(() => document.querySelector('#tx-list [data-deltx]').click());
  await page.waitForTimeout(150);
  const afterDel = await fr.evaluate(() => ({
    depensesSlices: document.querySelectorAll('#budget-pie-depenses svg path, #budget-pie-depenses svg circle').length,
    depensesTxt: document.getElementById('budget-pie-depenses').innerText.replace(/\s+/g,' '),
  }));
  ok(afterDel.depensesSlices === 3, 'après suppression de "Loisirs", le camembert Dépenses repasse à 3 parts (était 4) : ' + afterDel.depensesSlices);
  ok(!/Loisirs/.test(afterDel.depensesTxt), '"Loisirs" a bien disparu de la légende sans rechargement manuel : ' + afterDel.depensesTxt);

  await ctx.close();
}

console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
