import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const bl = (jour,h,min,type,label) => { const d=new Date(Date.UTC(2026,8,jour,h-2,0,0));
  return {id:'s'+jour+h+type, date:`2026-09-0${jour}`, debut:d.getTime(), fin:d.getTime()+min*60000, duree:min, type, label}; };
async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(x => { if(localStorage.getItem('__s')) return; localStorage.setItem('__s','1');
    Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: '+e.message); });
  await page.clock.install({ time: new Date('2026-09-03T21:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(300);
  return { ctx, page, fr };
}
const aller = async (fr,page,p) => { await fr.evaluate(pg => document.querySelector('.nav-btn[data-page="'+pg+'"]').click(), p); await page.waitForTimeout(350); };

const SESSIONS = [
  bl(3, 8, 60, 'cours', 'Anatomía I'), bl(3, 10, 60, 'cours', 'Bioquímica'),
  bl(3, 14, 90, 'projet', 'Boutique Shopify'), bl(3, 20, 30, 'projet', 'Refonte site'),
  bl(1, 9, 60, 'cours', 'Fisiología'), bl(2, 15, 45, 'projet', 'Boutique Shopify'),
];

console.log('\n== 88) Page Études : uniquement la révision ==');
{
  const { ctx, page, fr } = await ouvrir({'batcave-sessions': SESSIONS});
  await aller(fr, page, 'etudes');
  const v = await fr.evaluate(() => ({
    blocs: [...document.querySelectorAll('#rv-jour .jr-b')].map(b => b.innerText.replace(/\s+/g,' ').trim()),
    total: document.getElementById('rv-jtotal').textContent,
    case3: document.querySelector('[data-agjour="2026-09-03"]') ? document.querySelector('#rv-grid [data-agjour="2026-09-03"]').innerText.replace(/\s+/g,'') : '?',
    case2: document.querySelector('#rv-grid [data-agjour="2026-09-02"]').innerText.replace(/\s+/g,''),
    espagnol: !!document.getElementById('es-list'),
  }));
  ok(v.blocs.length === 2, '2 blocs le 3 (les 2 cours seulement) : ' + v.blocs.length);
  ok(v.blocs.every(b => /Anatomía|Bioquímica/.test(b)), 'aucun projet perso : ' + v.blocs.join(' | '));
  ok(/2,0 h/.test(v.total), 'total = 2h de révision (pas 4h) : ' + v.total);
  ok(/34,0h/.test(v.case3) === false && /32,0h/.test(v.case3), 'la case du 3 compte 2,0h : ' + v.case3);
  ok(v.case2 === '2', 'le 2 (projet seul) est vide côté révision : « ' + v.case2 + ' »');
  ok(!v.espagnol, 'plus aucun panneau Espagnol');
  await ctx.close();
}

console.log('\n== 89) Page Business : uniquement les projets perso ==');
{
  const { ctx, page, fr } = await ouvrir({'batcave-sessions': SESSIONS});
  await aller(fr, page, 'business');
  const v = await fr.evaluate(() => ({
    blocs: [...document.querySelectorAll('#pj-jour .jr-b')].map(b => b.innerText.replace(/\s+/g,' ').trim()),
    total: document.getElementById('pj-jtotal').textContent,
    case3: document.querySelector('#pj-grid [data-agjour="2026-09-03"]').innerText.replace(/\s+/g,''),
    case1: document.querySelector('#pj-grid [data-agjour="2026-09-01"]').innerText.replace(/\s+/g,''),
  }));
  ok(v.blocs.length === 2, '2 blocs le 3 (les 2 projets seulement) : ' + v.blocs.length);
  ok(v.blocs.every(b => /Boutique|Refonte/.test(b)), 'aucune révision : ' + v.blocs.join(' | '));
  ok(/2,0 h/.test(v.total), 'total = 90+30 min = 2h : ' + v.total);
  ok(/32,0h/.test(v.case3), 'la case du 3 compte 2,0h de projets : ' + v.case3);
  ok(v.case1 === '1ᵉʳ' || v.case1 === '1', 'le 1er (révision seule) est vide côté projets : « ' + v.case1 + ' »');
  await ctx.close();
}

console.log('\n== 90) Agenda Batcave : les deux regroupés ==');
{
  const { ctx, page, fr } = await ouvrir({'batcave-sessions': SESSIONS});
  await aller(fr, page, 'agenda');
  const v = await fr.evaluate(() => ({
    blocs: [...document.querySelectorAll('#ag-jour .jr-b')].map(b => b.innerText.replace(/\s+/g,' ').trim()),
    total: document.getElementById('ag-jtotal').textContent,
    tuiles: [...document.querySelectorAll('#ag-stats .stat-tile')].map(t => t.innerText.replace(/\s+/g,'')),
    pastilles: document.querySelectorAll('#ag-grid [data-agjour="2026-09-03"] .cal-pt').length,
  }));
  ok(v.blocs.length === 4, 'les 4 blocs du 3 sont là : ' + v.blocs.length);
  ok(/4,0 h/.test(v.total), 'total = 2h révision + 2h projets = 4h : ' + v.total);
  ok(/Totaldumois5,8h/.test(v.tuiles[0]), 'total du mois = 345 min = 5,8h : ' + v.tuiles[0]);
  ok(/Révision3,0h/.test(v.tuiles[1]) && /Projetsperso2,7h|Projetsperso2,8h/.test(v.tuiles[2]), 'répartition : ' + v.tuiles.slice(1,3).join(' '));
  ok(v.pastilles === 2, '2 pastilles le 3 (révision + projet) : ' + v.pastilles);
  await ctx.close();
}

console.log('\n== 91) Compteurs du tableau de bord séparés + 2 boutons Pomodoro ==');
{
  const { ctx, page, fr } = await ouvrir({'batcave-sessions': SESSIONS,
    'batcave-revision': [{id:'r', date:'2026-09-03', duree:120, matieres:{'Anatomía I':60,'Bioquímica':60}}],
    'batcave-projets': [{id:'p', date:'2026-09-03', projet:'Boutique Shopify', duree:120}],
    'batcave-espagnol': [{id:'e', date:'2026-09-03', activite:'Vocabulaire', duree:180, niveau:'B1'}]});
  const v = await fr.evaluate(() => ({
    cellules: [...document.querySelectorAll('#dash-temps .temps-cell')].map(c => c.innerText.replace(/\s+/g,'')),
    total: document.getElementById('dash-temps-total').textContent,
    boutons: [...document.querySelectorAll('#dash-pomodoro, #dash-pomodoro-projet')].map(b => b.textContent),
  }));
  ok(v.cellules.length === 2, '2 compteurs seulement : ' + v.cellules.length);
  ok(/Révision2,0h/.test(v.cellules[0]), 'le compteur révision ne compte QUE la révision : ' + v.cellules[0]);
  ok(/Projetsperso2,0h/.test(v.cellules[1]), 'le compteur projets ne compte QUE les projets : ' + v.cellules[1]);
  ok(/4,0 h au total/.test(v.total), 'total = 4h, les 3h d\'espagnol ne comptent plus : ' + v.total);
  ok(v.boutons.length === 2 && /Révision/.test(v.boutons[0]) && /Projet perso/.test(v.boutons[1]),
     'deux boutons Pomodoro : ' + v.boutons.join(' | '));

  // le bouton projet lance bien un Pomodoro projet
  await fr.evaluate(() => document.getElementById('dash-pomodoro-projet').click());
  await page.waitForTimeout(200);
  await fr.evaluate(() => { document.getElementById('ask-input').value = 'Boutique Shopify'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(300);
  const t = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-timer')||'null'));
  ok(t && t.cible === 'projet' && t.projet === 'Boutique Shopify', 'le bouton lance un Pomodoro projet : ' + JSON.stringify(t && {cible:t.cible, projet:t.projet}));
  await ctx.close();
}

console.log('\n== 92) Heures par matière, à la semaine (page Études) ==');
{
  // semaine du 31/08 (lun) au 06/09 (dim) ; semaine précédente 24→30 août
  const sem = [
    bl(1, 8, 120, 'cours', 'Anatomía I'), bl(2, 8, 60, 'cours', 'Anatomía I'),
    bl(2, 10, 90, 'cours', 'Bioquímica'), bl(3, 8, 60, 'cours', 'Fisiología'),
    bl(3, 14, 90, 'projet', 'Boutique Shopify'),   // ne doit pas compter
  ];
  const prec = [
    {id:'p1', date:'2026-08-25', debut:new Date(Date.UTC(2026,7,25,6,0,0)).getTime(), fin:new Date(Date.UTC(2026,7,25,7,0,0)).getTime(), duree:60, type:'cours', label:'Anatomía I'},
    {id:'p2', date:'2026-08-26', debut:new Date(Date.UTC(2026,7,26,6,0,0)).getTime(), fin:new Date(Date.UTC(2026,7,26,9,0,0)).getTime(), duree:180, type:'cours', label:'Bioquímica'},
  ];
  const { ctx, page, fr } = await ouvrir({'batcave-sessions': sem.concat(prec)});
  await aller(fr, page, 'etudes');
  const v = await fr.evaluate(() => ({
    label: document.getElementById('sem-label').textContent,
    txt: document.getElementById('sem-matieres').innerText.replace(/\s+/g,' '),
  }));
  ok(/Cette semaine/.test(v.label), 'semaine en cours par défaut : ' + v.label);
  ok(/Anatomía I 3,0 h/.test(v.txt), 'Anatomía I cumulée sur la semaine (120+60 min) : ' + (v.txt.match(/Anatomía I [^·]*/)||[])[0]);
  ok(/Bioquímica 1,5 h/.test(v.txt), 'Bioquímica 90 min');
  ok(/Fisiología 1,0 h/.test(v.txt), 'Fisiología 60 min');
  ok(!/Boutique/.test(v.txt), 'les projets perso ne sont pas comptés');
  ok(/5,5 h au total sur 3 matières/.test(v.txt), 'total de la semaine : ' + (v.txt.match(/[\d,]+ h au total[^·]*/)||[])[0]);
  ok(/semaine précédente 4,0 h \(\+1,5 h\)/.test(v.txt), 'comparaison à la semaine précédente : ' + (v.txt.match(/semaine précédente.*/)||[])[0]);
  ok(/↓ -1,5 h/.test(v.txt), 'Bioquímica en baisse vs semaine dernière (3,0 → 1,5 h)');

  await fr.evaluate(() => document.getElementById('sem-prev').click());
  await page.waitForTimeout(250);
  const p2 = await fr.evaluate(() => ({ label: document.getElementById('sem-label').textContent, txt: document.getElementById('sem-matieres').innerText.replace(/\s+/g,' ') }));
  ok(/Semaine dernière/.test(p2.label), 'navigation vers la semaine précédente : ' + p2.label);
  ok(/Bioquímica 3,0 h/.test(p2.txt) && /4,0 h au total/.test(p2.txt), 'ses chiffres à elle : ' + (p2.txt.match(/[\d,]+ h au total[^·]*/)||[])[0]);
  await ctx.close();
}
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
