/* B3 — charge restante de la semaine, et cibles journalières dérivées du planning. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(quand, seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#dash-semaine').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(450);
  return { ctx, page, fr };
}
const texte = (fr, sel) => fr.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);
const bloc = (date, type, min, h) => ({ id:'s'+date+type+h, date, type, duree:min, label:type==='projet'?'Projet':'Cours',
  debut: new Date(date+'T'+h+':00:00+02:00').getTime(), fin: new Date(date+'T'+h+':00:00+02:00').getTime()+min*60000 });

console.log('\n== 105) Charge restante : cible hebdo moins le fait depuis lundi ==');
{
  /* lundi 31/08 : 3 h rév + 1 h proj · mardi 01/09 : 5 h rév + 3 h proj → fait 8 h / 4 h */
  const seed = {'batcave-sessions': [
    bloc('2026-08-31','cours',180,'07'), bloc('2026-08-31','projet',60,'11'),
    bloc('2026-09-01','cours',300,'07'), bloc('2026-09-01','projet',180,'11')
  ]};
  const { ctx, fr } = await ouvrir('2026-09-02T10:00:00+02:00', seed);   /* mercredi */
  const t = await texte(fr, '#dash-semaine');
  ok(/21 h 54 de révision restantes sur 29 h 54/.test(t), '29 h 54 − 8 h = 21 h 54 de révision (' + t.slice(0,70) + '…)');
  ok(/18 h 30 de projets sur 22 h 30/.test(t), '22 h 30 − 4 h = 18 h 30 de projets');
  ok(/5 jours/.test(t), 'mercredi → dimanche : 5 jours');
  ok(/~8 h \d\d\/jour/.test(t), '(21 h 54 + 18 h 30) / 5 jours : ' + (t.match(/~[^)]*/)||[])[0]);
  await ctx.close();
}

console.log('\n== 106) Dimanche : 1 jour restant ; semaine bouclée : message de réussite ==');
{
  const { ctx, fr } = await ouvrir('2026-09-06T10:00:00+02:00');
  ok(/1 jour \(/.test(await texte(fr, '#dash-semaine')), 'dimanche : « 1 jour »');
  await ctx.close();
}
{
  const s = [];
  /* 240 min/jour et non 200 : la cible de projets est passee a 22 h 30 avec les trois blocs
     nes de l'emploi du temps reel, et 6 x 200 min = 20 h ne la couvrait plus. */
  ['2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05'].forEach(d => { s.push(bloc(d,'cours',330,'07')); s.push(bloc(d,'projet',240,'12')); });
  const { ctx, fr } = await ouvrir('2026-09-06T10:00:00+02:00', {'batcave-sessions': s});
  ok(/Objectifs de la semaine atteints/.test(await texte(fr, '#dash-semaine')), 'tout fait : « Objectifs de la semaine atteints »');
  await ctx.close();
}

console.log('\n== 107) Cibles du jour dérivées du planning (plus de 5/4/5/4 à la main) ==');
for(const [nom, quand, rev, proj] of [['mercredi','2026-09-02T10:00:00+02:00','5 h 15','2 h 40'],['vendredi','2026-09-04T10:00:00+02:00','3 h 30','2 h 45'],['samedi','2026-09-05T10:00:00+02:00','4 h 25','2 h 45'],['dimanche','2026-09-06T10:00:00+02:00','3 h 30','2 h 45']]){
  const { ctx, fr } = await ouvrir(quand);
  const cells = await fr.evaluate(() => [...document.querySelectorAll('#dash-temps .temps-cell .tv')].map(e => e.innerText.replace(/\s+/g,' ')));
  ok((cells[0] || '').indexOf('/ ' + rev) > -1, nom + ' : révision / ' + rev + ' (' + cells[0] + ')');
  ok((cells[1] || '').indexOf('/ ' + proj) > -1, nom + ' : projets / ' + proj + ' (' + cells[1] + ')');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
