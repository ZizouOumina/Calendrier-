import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
const bloc = (jour, h, min, type, label) => {
  const d = new Date(Date.UTC(2026, 8, jour, h-2, 0, 0));
  return { id:'s'+jour+'-'+h, date:`2026-09-${String(jour).padStart(2,'0')}`, debut:d.getTime(),
           fin:d.getTime()+min*60000, duree:min, type, label };
};
async function ouvrir(sessions){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(x => { if(localStorage.getItem('__s')) return; localStorage.setItem('__s','1');
    Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, {'batcave-sessions': sessions});
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: '+e.message); });
  await page.clock.install({ time: new Date('2026-09-03T21:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="agenda"]').click());
  await page.waitForTimeout(350);
  return { ctx, page, fr };
}

console.log('\n== 82) Vue mois : totaux, pastilles par type, navigation ==');
{
  const { ctx, page, fr } = await ouvrir([
    bloc(3, 8, 60, 'cours', 'Anatomía I'), bloc(3, 10, 60, 'cours', 'Bioquímica'),
    bloc(3, 14, 90, 'projet', 'Boutique'), bloc(3, 20, 30, 'espagnol', 'Vocabulaire'),
    bloc(1, 9, 60, 'cours', 'Fisiología'),
  ]);
  const v = await fr.evaluate(() => ({
    mois: document.getElementById('ag-mois').textContent,
    tuiles: [...document.querySelectorAll('#ag-stats .stat-tile')].map(t => t.innerText.replace(/\s+/g,'')),
    j3: document.querySelector('#ag-grid [data-agjour="2026-09-03"]').innerText.replace(/\s+/g,''),
    j1: document.querySelector('#ag-grid [data-agjour="2026-09-01"]').innerText.replace(/\s+/g,''),
    j2: document.querySelector('[data-agjour="2026-09-02"]').innerText.replace(/\s+/g,''),
    pastillesJ3: document.querySelectorAll('[data-agjour="2026-09-03"] .cal-pt').length,
    pastillesJ1: document.querySelectorAll('[data-agjour="2026-09-01"] .cal-pt').length,
  }));
  ok(/Septembre 2026/.test(v.mois), 'mois affiché : ' + v.mois);
  ok(/Totaldumois5,0h/.test(v.tuiles[0]), 'total du mois = 4h le 3 + 1h le 1er = 5h : ' + v.tuiles[0]);
  /* les tuiles ne distinguent plus que Révision / Projets perso : l'espagnol a été
     retiré comme catégorie propre et compte désormais dans la révision
     (60 + 60 + 60 de cours + 30 d'espagnol = 210 min = 3,5 h). */
  ok(/Révision3,5h/.test(v.tuiles[1]) && /Projetsperso1,5h/.test(v.tuiles[2]) && /Blocs5/.test(v.tuiles[3]), 'répartition par type : ' + v.tuiles.slice(1,4).join(' '));
  ok(/34,0h/.test(v.j3), 'le 3 affiche 4,0h : ' + v.j3);
  ok(v.pastillesJ3 === 3, '3 pastilles le 3 (cours+projet+espagnol) : ' + v.pastillesJ3);
  ok(v.pastillesJ1 === 1, '1 seule pastille le 1er (cours) : ' + v.pastillesJ1);
  ok(v.j2 === '2', 'un jour sans bloc reste vide : « ' + v.j2 + ' »');

  await fr.evaluate(() => document.getElementById('ag-prev').click());
  await page.waitForTimeout(200);
  const aout = await fr.evaluate(() => document.getElementById('ag-mois').textContent);
  ok(/Août 2026/.test(aout), 'navigation vers le mois précédent : ' + aout);
  await ctx.close();
}

console.log('\n== 83) Vue jour : grille horaire des blocs ==');
{
  const { ctx, page, fr } = await ouvrir([
    bloc(3, 8, 60, 'cours', 'Anatomía I'), bloc(3, 14, 90, 'projet', 'Boutique'), bloc(3, 20, 30, 'espagnol', 'Vocabulaire'),
  ]);
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="agenda"]').click());
  await page.waitForTimeout(300);
  const v = await fr.evaluate(() => ({
    label: document.getElementById('ag-jlabel').textContent,
    total: document.getElementById('ag-jtotal').textContent,
    blocs: [...document.querySelectorAll('#ag-jour .jr-b')].map(b => ({
      txt: b.innerText.replace(/\s+/g,' ').trim(), top: Math.round(parseFloat(b.style.top)), h: Math.round(parseFloat(b.style.height)),
    })),
    heures: [...document.querySelectorAll('#ag-jour .jr-h')].map(h => h.textContent),
  }));
  ok(/Jeudi 3 septembre/.test(v.label), 'jour du jour par défaut : ' + v.label);
  ok(/3,0 h · 3 blocs/.test(v.total), 'total de la journée : ' + v.total);
  ok(v.blocs.length === 3, '3 blocs dessinés : ' + v.blocs.length);
  ok(v.heures[0] === '05:00' && v.heures[v.heures.length-1] === '23:00', 'la journée entière est visible (05:00 → 23:00) : ' + v.heures[0] + '…' + v.heures[v.heures.length-1]);
  ok(v.heures.length === 19, '19 repères horaires (05h à 23h inclus) : ' + v.heures.length);
  // 8h avec axe démarrant à 5h => 3h * 40px = 120px ; 60 min => 40px ; 90 min => 60px
  ok(v.blocs[0].top === 120 && v.blocs[0].h === 40, 'le bloc de 8h est posé à 3h du début de l\'axe : ' + JSON.stringify(v.blocs[0]));
  ok(v.blocs[1].h === 60, 'le bloc de 90 min est 1,5× plus haut : ' + v.blocs[1].h + 'px');
  ok(/Anatomía I/.test(v.blocs[0].txt) && /08:00 → 09:00/.test(v.blocs[0].txt), 'libellé + horaire dans le bloc : ' + v.blocs[0].txt);
  await ctx.close();
}

console.log('\n== 84) Navigation entre les jours et clic depuis le mois ==');
{
  const { ctx, page, fr } = await ouvrir([bloc(1, 9, 60, 'cours', 'Fisiología'), bloc(3, 8, 60, 'cours', 'Anatomía I')]);
  await fr.evaluate(() => document.querySelector('#ag-grid [data-agjour="2026-09-01"]').click());
  await page.waitForTimeout(250);
  let v = await fr.evaluate(() => ({
    label: document.getElementById('ag-jlabel').textContent,
    blocs: document.querySelectorAll('#ag-jour .jr-b').length,
    actif: document.querySelector('#ag-grid [data-agjour="2026-09-01"]').classList.contains('actif'),
  }));
  ok(/Mardi 1ᵉʳ septembre/.test(v.label), 'clic sur le 1er dans la grille : ' + v.label);
  ok(v.blocs === 1 && v.actif, 'sa journée s\'affiche et la case est marquée active');

  await fr.evaluate(() => document.getElementById('ag-jprev').click());
  await page.waitForTimeout(200);
  v = await fr.evaluate(() => ({ label: document.getElementById('ag-jlabel').textContent, vide: document.getElementById('ag-jour').innerText }));
  ok(/31 août/.test(v.label) && /Aucun bloc/.test(v.vide), 'jour précédent, sans bloc : ' + v.label + ' — ' + v.vide.trim());
  const mois = await fr.evaluate(() => document.getElementById('ag-mois').textContent);
  ok(/Août 2026/.test(mois), 'la grille suit quand on change de mois : ' + mois);

  await fr.evaluate(() => document.getElementById('ag-jtoday').click());
  await page.waitForTimeout(250);
  v = await fr.evaluate(() => ({ label: document.getElementById('ag-jlabel').textContent, mois: document.getElementById('ag-mois').textContent }));
  ok(/Jeudi 3 septembre/.test(v.label) && /Septembre/.test(v.mois), '« Aujourd\'hui » ramène au bon jour et au bon mois');
  await ctx.close();
}

console.log('\n== 85) Un bloc terminé apparaît sans rechargement, et rien ne part vers Google ==');
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => {
    window.__appels = [];
    const mcp = { callTool(s,t,i){ window.__appels.push(t); return Promise.resolve({content:[],payload:{}}); },
                  watchTool(s,t){ window.__appels.push(t); return () => {}; },
                  invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); } };
    window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: '+e.message); });
  await page.clock.install({ time: new Date('2026-09-03T08:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r=document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="etudes"]').click());
  await page.waitForTimeout(250);
  ok(await fr.evaluate(() => !document.getElementById('timer-durees')) === false, 'le sélecteur de durée est toujours là');
  /* l'ecriture calendrier existe a nouveau (rappels des blocs du planning), mais elle vit
     dans Agenda, cachee sans connecteur, et desactivee par defaut : rien ne part d'ici */
  const plusDeGcal = await fr.evaluate(() => !document.querySelector('.page[data-page="etudes"] #gcal-row') && !document.querySelector('.page[data-page="etudes"] #gcal-toggle'));
  ok(plusDeGcal, 'plus aucune option Google Agenda sur la page Études (les rappels vivent dans Agenda, désactivés par défaut)');

  await fr.evaluate(() => document.getElementById('timer-pomodoro').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { const s=document.getElementById('ask-select'); s.value='Anatomía I'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(200);
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(500);
  const ecritures = await fr.evaluate(() => window.__appels.filter(t => t === 'create_event').length);
  ok(ecritures === 0, 'aucun événement créé dans Google Agenda : ' + ecritures);

  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="agenda"]').click());
  await page.waitForTimeout(350);
  const v = await fr.evaluate(() => ({
    blocs: document.querySelectorAll('#ag-jour .jr-b').length,
    total: document.getElementById('ag-jtotal').textContent,
    case3: document.querySelector('#ag-grid [data-agjour="2026-09-03"]').innerText.replace(/\s+/g,''),
  }));
  ok(v.blocs === 1 && /1,0 h/.test(v.total), 'le bloc terminé apparaît dans la vue jour : ' + v.total);
  ok(/1,0h/.test(v.case3), 'et dans la grille du mois : ' + v.case3);
  await ctx.close();
}
await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
