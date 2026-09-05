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
  await page.clock.install({ time: new Date('2026-09-03T20:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="insights"]').click());
  await page.waitForTimeout(250);
  return { ctx, page, fr };
}
const cartes = fr => fr.evaluate(() => [...document.querySelectorAll('#insights-grid .panel')].map(p => p.innerText.replace(/\s+/g,' ')));

console.log('\n== 65) Créneau le plus productif (données insuffisantes) ==');
{
  const { ctx, fr } = await ouvrir({'batcave-sessions': []});
  const c = await cartes(fr);
  const creneau = c.find(x => /créneau le plus productif/i.test(x));
  ok(!!creneau, 'la carte "créneau" est affichée');
  ok(/0\/8 minimum/.test(creneau), 'message clair tant qu\'il n\'y a pas assez de blocs : ' + creneau.slice(0,90));
  await ctx.close();
}

console.log('\n== 66) Créneau le plus productif (assez de données) ==');
{
  // 10 blocs : 6 le matin 8h-10h, 4 le soir 20h-22h
  const sessions = [];
  const mk = (jour, heure, duree) => {
    const d = new Date(Date.UTC(2026, 7, jour, heure - 2, 0, 0)); // +02:00 Madrid
    return { id:'s'+jour+'-'+heure, date:`2026-08-${String(jour).padStart(2,'0')}`, debut:d.getTime(),
             fin:d.getTime()+duree*60000, duree, type:'cours', label:'Anatomía I' };
  };
  for(let i=0;i<6;i++) sessions.push(mk(10+i, 8, 60));
  for(let i=0;i<4;i++) sessions.push(mk(10+i, 20, 25));
  const { ctx, fr } = await ouvrir({'batcave-sessions': sessions});
  const c = await cartes(fr);
  const creneau = c.find(x => /créneau le plus productif/i.test(x));
  ok(/08h–10h/.test(creneau), 'identifie bien la tranche 08h–10h : ' + creneau.slice(0,120));
  ok(/6,0h/.test(creneau), 'cumule les 6 blocs d\'une heure : ' + (creneau.match(/[\d,]+h cumulées/)||[])[0]);
  ok(/20h–22h/.test(creneau) && /1,7h/.test(creneau), 'et signale le créneau le moins rentable (4×25 min = 1,7h)');
  await ctx.close();
}

console.log('\n== 67) Sommeil → révision du lendemain ==');
{
  const seed = {'batcave-revision': []};
  // 8 nuits : 4 courtes (5h) suivies de 1h de révision, 4 longues (8h) suivies de 3h
  const rev = [];
  for(let i=0;i<8;i++){
    const nuit = new Date(2026, 7, 20+i);
    const iso = `2026-08-${String(20+i).padStart(2,'0')}`;
    const lendemain = `2026-08-${String(21+i).padStart(2,'0')}`;
    const court = i % 2 === 0;
    seed['batcave-journal-'+iso] = { sommeil: court ? 5 : 8, water:0, complements:[], coran:'', duaa:'', poids:'', mood:null, notes:'' };
    rev.push({ id:'r'+i, date: lendemain, duree: court ? 60 : 180 });
  }
  seed['batcave-revision'] = rev;
  const { ctx, fr } = await ouvrir(seed);
  const c = await cartes(fr);
  const som = c.find(x => /Sommeil et révision du lendemain/i.test(x));
  ok(!!som, 'la carte sommeil→révision est affichée');
  ok(/tu révises .* de plus en moyenne/.test(som), 'détecte que les nuits longues précèdent plus de révision : ' + som.slice(0,150));
  ok(/8 nuits/.test(som), 'indique la taille de l\'échantillon (8 nuits)');
  await ctx.close();
}

console.log('\n== 68) Aucune régression sur les analyses existantes ==');
{
  const { ctx, fr } = await ouvrir(null);
  const c = await cartes(fr);
  ok(c.length === 6, '6 cartes au total (4 anciennes + 2 nouvelles) : ' + c.length);
  const titres = ['créneau le plus productif','Sommeil et révision','Sommeil & humeur','Séances de sport','Habitude la plus délaissée','Révision par jour'];
  const manquants = titres.filter(t => !c.some(x => x.toLowerCase().includes(t.toLowerCase())));
  ok(manquants.length === 0, 'toutes les analyses sont présentes : ' + (manquants.join(', ') || 'OK'));
  await ctx.close();
}
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
