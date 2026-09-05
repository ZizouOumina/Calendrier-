import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const browser = await chromium.launch();
/* trois gabarits : Mac large, iPad portrait, iPad paysage */
const VUES = [
  {nom:'Mac 1440', w:1440, h:1000},
  {nom:'iPad portrait 834', w:834, h:1112},
  {nom:'iPad paysage 1024', w:1024, h:768},
];
let TOTAL = 0;
for(const V of VUES){
console.log('\n===== ' + V.nom + ' =====');
const ctx = await browser.newContext({ viewport:{width:V.w,height:V.h}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(() => {
  if(localStorage.getItem('__seed')) return;
  localStorage.setItem('__seed','1');
  const S = {
    'batcave-revision': [
      {id:'r1', date:'2026-08-31', duree:180, matieres:{'Anatomía I':120,'Bioquímica':60}},
      {id:'r2', date:'2026-09-01', duree:240, matieres:{'Anatomía I':60,'Fisiología':120,'Histología':60}},
      {id:'r3', date:'2026-09-02', duree:120, matieres:{'Bioquímica':120}},
    ],
    'batcave-projets': [
      {id:'p1', date:'2026-09-01', duree:90,  projet:'Boutique Shopify'},
      {id:'p2', date:'2026-09-02', duree:120, projet:'Boutique Shopify'},
    ],
    'batcave-sessions': [
      {id:'s1', date:'2026-09-02', type:'cours', label:'Bioquímica', duree:60, debut:new Date('2026-09-02T07:20:00+02:00').getTime(), fin:new Date('2026-09-02T08:20:00+02:00').getTime()},
      {id:'s3', date:'2026-09-02', type:'projet', label:'Boutique Shopify', duree:120, debut:new Date('2026-09-02T13:30:00+02:00').getTime(), fin:new Date('2026-09-02T15:30:00+02:00').getTime()},
    ],
    'batcave-journal': [{date:'2026-09-02', water:6, sommeil:7.5, humeur:4, note:'Bonne journée'}],
    'batcave-budget': [
      {id:'b1', date:'2026-09-01', categorie:'Courses', montant:-45.5, type:'depense'},
      {id:'b2', date:'2026-09-01', categorie:'Bourse', montant:900, type:'entree'},
    ],
    'batcave-sport': [{id:'sp1', date:'2026-09-01', activite:'Musculation', duree:60}],
  };
  Object.keys(S).forEach(k => localStorage.setItem(k, JSON.stringify(S[k])));
});
const page = await ctx.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push('PAGEERROR: ' + e.message));
await page.clock.install({ time: new Date('2026-09-02T16:30:00+02:00') });
await page.goto(URL);
await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(400);

const pages = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].map(b => b.dataset.page));
let total = 0;
for(const p of pages){
  await fr.evaluate(x => document.querySelector('.nav-btn[data-page="'+x+'"]').click(), p);
  await page.waitForTimeout(450);
  const r = await fr.evaluate(x => {
    const sec = document.querySelector('.page[data-page="'+x+'"]');
    const txt = sec ? sec.innerText : '';
    const pb = [];
    // valeurs cassées visibles
    ['undefined','NaN','[object Object]','Infinity','null'].forEach(m => {
      if(txt.includes(m)) pb.push('valeur cassée « '+m+' »');
    });
    // décimales à l'anglaise dans le texte affiché (hors dates jj.mm et versions)
    const pts = (txt.match(/\b\d+\.\d+\s*(h|€|%|\/5|L|kg)?/g)||[]).filter(t => /[hL€%]|\/5|kg/.test(t));
    if(pts.length) pb.push('décimale à point : ' + [...new Set(pts)].slice(0,4).join(', '));
    // panneaux visibles totalement vides
    const vides = [...(sec ? sec.querySelectorAll('.panel') : [])]
      .filter(el => el.offsetParent !== null && el.innerText.trim() === '').length;
    if(vides) pb.push(vides + ' panneau(x) vide(s)');
    // débordement horizontal
    if(sec && sec.scrollWidth > sec.clientWidth + 2) pb.push('débordement horizontal ('+sec.scrollWidth+'>'+sec.clientWidth+')');
    return pb;
  }, p);
  if(r.length){ total += r.length; console.log('  ⚠ ' + p + ' : ' + r.join(' | ')); }
  else console.log('  ok ' + p);
}
erreurs.forEach(e => console.log('  ⚠ ' + e));
TOTAL += total + erreurs.length;
await ctx.close();
}
console.log(TOTAL === 0 ? '\nAUCUN DEFAUT SUR LES 3 GABARITS' : `\nDEFAUTS: ${TOTAL}`);
await browser.close();
process.exit(TOTAL === 0 ? 0 : 1);
