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
for (const [d, attendu, moitie] of [['2026-09-14',2,true],['2026-09-21',2,true],['2026-09-28',4,false],['2026-10-12',4,false]]) {
  const {ctx, fr} = await jour(d+'T05:35:00+02:00');
  const t = await fr.evaluate(()=>{const c=document.getElementById('dash-sport'); return c?c.innerText.replace(/\s+/g,' '):'';});
  const m = t.match(/Tractions ([\d/]+)/);
  const n = m ? m[1].split('/').length : 0;
  ok(n===attendu && /tours × ½/.test(t)===moitie,
     d+' : tractions '+n+' tours (attendu '+attendu+')' + (/tours × ½/.test(t)?' · bandeau ½ présent':' · pas de bandeau, volume complet'));
  await ctx.close();
}
/* Depuis le 12 septembre, le DIMANCHE est le jour d'entretien. La pesee y tombe une semaine
   sur deux, ancree au 13 septembre ; la seance photo une semaine sur quatre, meme ancre. La
   coupe de cheveux est le samedi (le coiffeur est ferme le dimanche), une semaine sur trois,
   ancree au 3 octobre — elle ne tombe donc sur aucun dimanche, et c'est ce que verifie la
   colonne « coupe ». */
console.log('\n== habitudes : pesee un dimanche sur deux, photos un sur quatre, coupe le samedi ==');
for (const [d, jour_, pesee, coupe] of [
  ['2026-09-14','lundi 14',false,false],
  ['2026-09-13','dimanche 13',true,false],
  ['2026-09-20','dimanche 20',false,false],
  ['2026-09-27','dimanche 27',true,false],
  ['2026-10-04','dimanche 4 oct',false,false],
  ['2026-10-11','dimanche 11 oct',true,false],
  ['2026-10-25','dimanche 25 oct',true,false],
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
console.log('\n== seance de reference, uniquement le 14 ==');
for (const [d, attendu] of [['2026-09-14',true],['2026-09-15',false]]) {
  const {ctx, fr} = await jour(d+'T05:35:00+02:00');
  const p = await fr.evaluate(()=>document.getElementById('dash-plan').innerText);
  ok(/Séance de référence/.test(p)===attendu, d+' : séance de référence dans le plan = '+/Séance de référence/.test(p));
  await ctx.close();
}
await b.close();
console.log(err? '\n'+err+' ECHEC(S)' : '\nTOUT VERT');
process.exit(err?1:0);
