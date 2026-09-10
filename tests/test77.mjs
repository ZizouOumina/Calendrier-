/* Lot 29 — montée en charge des fibres et du lactose.
   Le plan fait passer les légumes verts de presque rien à 350 g/jour et le lait à 250 ml.
   Trois paliers : moitié semaines 1-2, trois quarts semaine 3, plein à partir de la 4.
   On vérifie les grammages affichés, la cible calorique qui suit le palier (donc pas de
   faux échec), le bandeau qui apparaît puis disparaît, et les libellés de courses. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c,m)=>{ if(c) console.log('  ok  '+m); else { err++; console.log('  FAIL '+m); } };
async function jour(quand){
  const ctx = await b.newContext({viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(()=>{window.claude=undefined;});
  const page = await ctx.newPage();
  page.on('pageerror', e=>{err++; console.log('  PAGEERROR '+quand+' : '+e.message);});
  await page.clock.install({time:new Date(quand)});
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached',timeout:20000});
  const fr = page.frames().find(x=>x.url().includes('batcave.html'));
  await fr.evaluate(()=>{document.querySelectorAll('.overlay').forEach(o=>o.hidden=true);});
  await page.waitForTimeout(400);
  return {ctx, fr};
}
const lire = fr => fr.evaluate(()=>{
  document.querySelector('.nav-btn[data-page="repas"]').click();
  const t = document.querySelector('#meal-grid').innerText;
  const veg = [...t.matchAll(/Légumes verts \((\d+)g\)/g)].map(m=>Number(m[1]));
  const lait = (t.match(/Lait demi-écrémé \((\d+)ml\)/)||[])[1];
  const r = document.getElementById('meal-rampe');
  return {veg, lait: lait?Number(lait):null,
          bandeau: r && !r.hidden ? r.textContent : '',
          cible: (document.getElementById('meal-kcal-sub').textContent.match(/\/\s*(\d+)\s*kcal/)||[])[1]};
});

console.log('\n== paliers : grammages et cible calorique ==');
/* jour, légumes déjeuner/dîner, lait, bandeau attendu */
for (const [d, veg, lait, bandeau] of [
  ['2026-09-14',[100,75],125,true],   // semaine 1 : moitié
  ['2026-09-20',[100,75],125,true],   // fin de semaine 1
  ['2026-09-21',[100,75],125,true],   // semaine 2 : moitié
  ['2026-09-28',[150,115],190,true],  // semaine 3 : trois quarts (arrondi au pas de 5 g)
  ['2026-10-05',[200,150],250,false], // semaine 4 : plein volume
  ['2026-11-02',[200,150],250,false]  // bien plus tard : toujours plein
]) {
  const {ctx, fr} = await jour(d+'T09:00:00+02:00');
  const v = await lire(fr);
  ok(JSON.stringify(v.veg)===JSON.stringify(veg) && v.lait===lait,
     d+' : légumes '+JSON.stringify(v.veg)+'g (attendu '+JSON.stringify(veg)+') · lait '+v.lait+'ml (attendu '+lait+')');
  ok(!!v.bandeau===bandeau, d+' : bandeau de montée en charge '+(v.bandeau?'présent':'absent'));
  await ctx.close();
}

console.log('\n== la cible suit le palier : pas de faux échec ==');
/* Le plan plein est à 3 053 kcal. Pendant la montée la cible doit être PLUS BASSE,
   sinon la barre du jour accuse un déficit que le palier a lui-même créé. */
const cibles = {};
for (const d of ['2026-09-14','2026-09-28','2026-10-05']) {
  const {ctx, fr} = await jour(d+'T09:00:00+02:00');
  cibles[d] = Number((await lire(fr)).cible);
  await ctx.close();
}
ok(cibles['2026-10-05'] > 3000 && cibles['2026-10-05'] < 3110, 'semaine 4 : cible '+cibles['2026-10-05']+' kcal (plan plein ~3 053)');
ok(cibles['2026-09-14'] < cibles['2026-09-28'] && cibles['2026-09-28'] < cibles['2026-10-05'],
   'cibles croissantes : '+cibles['2026-09-14']+' < '+cibles['2026-09-28']+' < '+cibles['2026-10-05']);
ok(cibles['2026-10-05'] - cibles['2026-09-14'] < 150,
   'le palier coûte '+(cibles['2026-10-05']-cibles['2026-09-14'])+' kcal/jour — moins de 150, la montée porte sur les fibres, pas sur l\'énergie');

console.log('\n== courses : espèces les moins fermentescibles ==');
{
  const {ctx, fr} = await jour('2026-09-14T09:00:00+02:00');
  const c = await fr.evaluate(()=>{
    document.querySelector('.nav-btn[data-page="courses"]').click();
    return document.querySelector('#courses-grid').innerText;
  });
  ok(/oranges, kiwis, raisin, fraises/.test(c) && !/pommes, poires/.test(c), 'fruits : plus de pommes ni de poires en suggestion');
  ok(/haricots verts, épinards, courgettes/.test(c), 'légumes verts : espèces précisées');
  await ctx.close();
}
await b.close();
console.log(err? '\n'+err+' ECHEC(S)' : '\nTOUT VERT');
process.exit(err?1:0);
