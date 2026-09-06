/* L'heure de coucher annoncée sur le tableau de bord doit être celle DU JOUR.
   L'alerte « Hors rythme » calculait son déclenchement avec heureCoucher() mais affichait
   « 22h » en dur : une heure qui n'existe dans aucun planning depuis le passage à 21:30 en
   semaine et 21:00 le week-end. Le message contredisait donc son propre calcul. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(quand){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#dash-plan').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(450);
  return { ctx, fr };
}
const plan = fr => fr.evaluate(() => document.getElementById('dash-plan').innerText);

/* tard dans la soirée, aucune révision saisie → l'alerte de rythme se déclenche à coup sûr */
const JOURS = [
  ['mercredi',  '2026-09-02T20:00:00+02:00', '21:55'],
  ['vendredi',  '2026-09-04T19:00:00+02:00', '21:55'],
  ['samedi',    '2026-09-05T20:00:00+02:00', '21:00'],
  ['dimanche',  '2026-09-06T19:00:00+02:00', '21:00']
];

console.log('\n== 93) L\'alerte de rythme annonce le coucher du jour ==');
for(const [nom, quand, attendu] of JOURS){
  const { ctx, fr } = await ouvrir(quand);
  const t = await plan(fr);
  ok(/Hors rythme/.test(t), nom + ' : l\'alerte de rythme est bien déclenchée');
  ok(t.includes('coucher prévu (' + attendu + ')'), nom + ' : coucher annoncé à ' + attendu);
  ok(!/\(22h\)|22:00/.test(t), nom + ' : plus aucune trace de 22h');
  await ctx.close();
}

console.log('\n== 94) Aucune heure de coucher écrite en dur dans le code ==');
{
  const { ctx, fr } = await ouvrir(JOURS[0][1]);
  /* le seul « 22:00 » toléré est le repli défensif de heureCoucher(), jamais un texte affiché */
  const dur = await fr.evaluate(() => {
    const src = document.documentElement.outerHTML;
    return (src.match(/coucher prévu \(2\dh?\d*\)/g) || []);
  });
  ok(dur.length === 0, 'aucun « coucher prévu (…) » figé dans le HTML rendu');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
