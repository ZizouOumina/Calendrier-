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
  return {ctx, page, fr};
}
console.log('\n== tours : moitie deux semaines, puis complet ==');
/* Le programme ouvre le MERCREDI 23 septembre : la semaine de programme court du mercredi
   au mardi. S1 = 23-29 sept., S2 = 30 sept.-6 oct. (toutes deux a moitie des tours),
   S3 des le 7 oct. */
/* Les tractions ouvrent le Haut lourd du LUNDI : on ne compare que des lundis.
   Depuis le depart du mardi 22 : lundi 28 sept. ferme S1, lundi 5 oct. ferme S2 (toutes
   deux a moitie des tours), lundi 12 oct. est en S3, lundi 19 en S4. Le lundi 21 sept.,
   lui, est passe AVANT le programme et n'a plus de facteur du tout. */
for (const [d, attendu, moitie] of [['2026-09-28',2,true],['2026-10-05',2,true],['2026-10-12',4,false],['2026-10-19',4,false]]) {
  const {ctx, fr} = await jour(d+'T05:35:00+02:00');
  const t = await fr.evaluate(()=>{const c=document.getElementById('dash-sport'); return c?c.innerText.replace(/\s+/g,' '):'';});
  const m = t.match(/Tractions ([\d/]+)/);
  const n = m ? m[1].split('/').length : 0;
  ok(n===attendu && /tours × ½/.test(t)===moitie,
     d+' : tractions '+n+' tours (attendu '+attendu+')' + (/tours × ½/.test(t)?' · bandeau ½ présent':' · pas de bandeau, volume complet'));
  await ctx.close();
}
/* Depuis le 12 septembre, le DIMANCHE est le jour d'entretien. La pesee y tombe une semaine
   sur deux, la seance photo une semaine sur quatre, et les deux partent de la MEME ancre.
   Cette ancre etait au 13 septembre, une semaine avant le jour 1 : sa premiere photo serait
   tombee le 11 octobre, trois semaines apres le depart, et l'image du point de depart
   n'aurait jamais existe. Elle est au 20 septembre depuis sa decision du 19.
   La coupe de cheveux est le samedi (le coiffeur est ferme le dimanche), une semaine sur
   trois, ancree au 3 octobre — elle ne tombe donc sur aucun dimanche, et c'est ce que
   verifie la colonne « coupe ». */
console.log('\n== habitudes : pesee un dimanche sur deux, photos un sur quatre, coupe le samedi ==');
for (const [d, jour_, pesee, coupe] of [
  ['2026-09-14','lundi 14',false,false],
  ['2026-09-13','dimanche 13 (avant l\'ancre)',false,false],
  ['2026-09-20','dimanche 20 (l\'ancre)',true,false],
  ['2026-09-27','dimanche 27',false,false],
  ['2026-10-04','dimanche 4 oct',true,false],
  ['2026-10-11','dimanche 11 oct',false,false],
  ['2026-10-18','dimanche 18 oct',true,false],
  ['2026-10-25','dimanche 25 oct',false,false],
  ['2026-10-03','samedi 3 oct',false,true],
  ['2026-09-15','mardi 15',false,false]]) {
  const {ctx, fr} = await jour(d+'T09:00:00+02:00');
  const h = await fr.evaluate(()=>{
    const l=[...document.querySelectorAll('#dash-checklist li label')].map(x=>x.textContent);
    return {pesee: l.some(t=>/Pesée/.test(t)), photos: l.some(t=>/Photos/.test(t)),
            cheveux: l.some(t=>/Coupe de cheveux/.test(t)), n:l.length};
  });
  /* une seance photo ne peut exister qu'un dimanche de pesee : l'inverse serait un bug
     d'ancrage. Le detail des dates de photo est verifie dans test90. */
  ok(h.pesee===pesee && (!h.photos || h.pesee) && h.cheveux===coupe,
     jour_+' : pesée '+h.pesee+' · photos '+h.photos+' · coupe '+h.cheveux+' ('+h.n+' habitudes)');
  await ctx.close();
}
/* Le jour 1 est le MERCREDI 23, et le mercredi EST off au sport : premierJourSport()
   avance donc au JEUDI 24, un haut volume. La seance de reference y mesure les maximums
   de tractions et de dips -- le meme haut du corps que la seance -- et ceux du bas
   attendent le premier bas complet, le mardi 29. Rien avant le 24, rien apres : le 23,
   jour 1, n'a PAS de seance de reference, et c'est ce que la ligne du 23 verifie. */
/* 26 septembre : le jour 1 passe au LUNDI 28, un jour de sport (haut volume) -- la seance de
   reference est le jour 1 lui-meme. Rien du 25 au 27, rien le 29. */
console.log('\n== seance de reference : le premier jour de SPORT du programme, lundi 28 ==');
for (const [d, attendu] of [['2026-09-25',false],['2026-09-26',false],['2026-09-27',false],['2026-09-28',true],['2026-09-29',false]]) {
  const {ctx, fr} = await jour(d+'T05:35:00+02:00');
  const p = await fr.evaluate(()=>document.getElementById('dash-plan').innerText);
  ok(/Séance de référence/.test(p)===attendu, d+' : séance de référence dans le plan = '+/Séance de référence/.test(p));
  await ctx.close();
}
await b.close();
console.log(err? '\n'+err+' ECHEC(S)' : '\nTOUT VERT');
process.exit(err?1:0);
