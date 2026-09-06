import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { try{ localStorage.setItem('batcave-duree-bloc', '60'); }catch(e){} });   /* sessions d'1 h : la durée est accessoire ici */
  if(seed) await ctx.addInitScript(s => {
    if(localStorage.getItem('__seed')) return;
    localStorage.setItem('__seed','1');
    Object.keys(s).forEach(k => localStorage.setItem(k, JSON.stringify(s[k])));
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T08:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay:not([hidden])').forEach(o => { const b = o.querySelector('.btn'); if(b) b.click(); }); });
  await fr.evaluate(() => { document.querySelector('.nav-btn[data-page="etudes"]').click();
                            document.querySelector('.nav-btn[data-page="etudes"]').click(); });
  await page.waitForTimeout(250);
  return { ctx, page, fr };
}
const bloc = async (fr, page, choix, bouton) => {
  await fr.evaluate(b => document.getElementById(b).click(), bouton || 'timer-pomodoro');
  await page.waitForTimeout(150);
  await fr.evaluate(c => { const s = document.getElementById('ask-select');
    if(!s.hidden){ s.value = c; } else { document.getElementById('ask-input').value = c; }
    document.getElementById('ask-ok').click(); }, choix);
  await page.waitForTimeout(150);
  await page.clock.fastForward('01:00:01');
  await page.waitForTimeout(400);
};

console.log('\n== 28) Chaque bloc est journalisé individuellement ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  await bloc(fr, page, 'Anatomía I');              // 08:00 → 09:00
  await page.clock.fastForward('00:05:01'); await page.waitForTimeout(400);   // pause -> bloc 2
  await page.clock.fastForward('01:00:01'); await page.waitForTimeout(400);   // Anatomía I again
  await fr.evaluate(() => document.getElementById('timer-discard').click());
  await page.waitForTimeout(200);
  await bloc(fr, page, 'Bioquímica');
  const sessions = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-sessions') || '[]'));
  ok(sessions.length === 3, '3 blocs enregistrés séparément (obtenu ' + sessions.length + ')');
  ok(sessions.filter(s => s.label === 'Anatomía I').length === 2 && sessions.filter(s => s.label === 'Bioquímica').length === 1,
     'chaque bloc garde sa matière : ' + sessions.map(s => s.label).join(', '));
  ok(sessions.every(s => s.duree === 60 && s.type === 'cours' && s.date === '2026-09-02'), 'durée, type et date corrects sur chaque bloc');
  const rev = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-revision')));
  ok(rev.length === 1 && rev[0].duree === 180, 'les totaux restent consolidés en une ligne (180 min)');

  const liste = await fr.evaluate(() => ({
    titre: document.getElementById('rv-jlabel').textContent,
    txt: document.getElementById('rv-jour').innerText.replace(/\s+/g,' '),
    lignes: document.querySelectorAll('#rv-jour .jr-b').length
  }));
  ok(/Mercredi 2 septembre/i.test(liste.titre), 'la vue nomme le jour affiché : ' + liste.titre.trim());
  ok(liste.lignes === 3, '3 lignes affichées, une par bloc');
  ok(/08:00 → 09:00/.test(liste.txt), 'créneau horaire du premier bloc : ' + liste.txt.slice(0, 60));
  ok(/🔵 Anatomía I/.test(liste.txt) && /🔵 Bioquímica/.test(liste.txt), "matière par bloc affichée : " + liste.txt.slice(0,80));
  ok((liste.txt.match(/60 min/g) || []).length === 3, "durée par bloc");
  await ctx.close();
}

console.log('\n== 29) La liste suit le jour cliqué dans le calendrier ==');
{
  const { ctx, page, fr } = await ouvrir({
    'batcave-sessions': [
      {id:'s1', date:'2026-09-01', debut: new Date('2026-09-01T07:20:00+02:00').getTime(), fin: new Date('2026-09-01T08:20:00+02:00').getTime(), duree:60, type:'cours', label:'Microbiología'},
      {id:'s2', date:'2026-09-01', debut: new Date('2026-09-01T10:00:00+02:00').getTime(), fin: new Date('2026-09-01T10:45:00+02:00').getTime(), duree:45, type:'espagnol', label:'Conversation'},
      {id:'s3', date:'2026-08-31', debut: new Date('2026-08-31T14:00:00+02:00').getTime(), fin: new Date('2026-08-31T15:30:00+02:00').getTime(), duree:90, type:'projet', label:'Boutique'}
    ],
    'batcave-revision': [{id:'r1', date:'2026-09-01', duree:60, matieres:{'Microbiología':60}}],
    'batcave-espagnol': [{id:'e1', date:'2026-09-01', activite:'Conversation', duree:45, niveau:'A2', dele:''}],
    'batcave-projets': [{id:'p1', date:'2026-08-31', projet:'Boutique', duree:90}],
    'batcave-revision-fusionnee': true
  });
  let t = await fr.evaluate(() => document.getElementById('rv-jour').innerText);
  ok(/Aucune session de révision ce jour-là/.test(t), 'au départ : aujourd\'hui, vide');
  await fr.evaluate(() => document.querySelector('#rv-grid [data-agjour="2026-09-01"]').click());
  await page.waitForTimeout(250);
  const j1 = await fr.evaluate(() => ({
    titre: document.getElementById('rv-jlabel').textContent,
    txt: document.getElementById('rv-jour').innerText.replace(/\s+/g,' '),
    n: document.querySelectorAll('#rv-jour .jr-b').length
  }));
  ok(/Mardi 1ᵉʳ septembre/i.test(j1.titre), 'le titre suit le clic : ' + j1.titre.trim());
  ok(j1.n === 1, 'un seul bloc de révision ce jour-là (l\'espagnol n\'est plus suivi) : ' + j1.n);
  ok(/🔵 Microbiología/.test(j1.txt) && /07:20 → 08:20/.test(j1.txt), 'bloc de cours avec matière et créneau');
  ok(/60 min/.test(j1.txt), 'durée affichée sur le bloc');
  await fr.evaluate(() => document.getElementById('rv-prev').click());
  await page.waitForTimeout(200);
  /* un bloc de projet perso se consulte sur la page Business, pas dans la vue révision */
  const j2 = await fr.evaluate(() => {
    document.querySelector('.nav-btn[data-page="business"]').click();
    document.getElementById('pj-prev').click();
    document.querySelector('#pj-grid [data-agjour="2026-08-31"]').click();
    return document.getElementById('pj-jour').innerText.replace(/\s+/g,' ');
  });
  ok(/🟠 Boutique/.test(j2) && /14:00 → 15:30/.test(j2), 'projet perso d\'un autre mois, côté Business : ' + j2.slice(0, 60));
  await ctx.close();
}

console.log('\n== 30) Journée antérieure au journal : on le dit ==');
{
  const { ctx, page, fr } = await ouvrir({
    'batcave-revision': [{id:'r1', date:'2026-08-28', duree:120, matieres:{'Bioquímica':120}}],
    'batcave-revision-fusionnee': true
  });
  await fr.evaluate(() => document.getElementById('rv-prev').click());
  await page.waitForTimeout(200);
  await fr.evaluate(() => document.querySelector('#rv-grid [data-agjour="2026-08-28"]').click());
  await page.waitForTimeout(250);
  const t = await fr.evaluate(() => document.getElementById('rv-jour').innerText.replace(/\s+/g,' '));
  ok(/sans détail horaire/.test(t), 'message honnête plutôt qu\'une grille vide : ' + t.slice(0, 90));
  ok(/2,0 h enregistrées/.test(t), 'le total connu est quand même montré');
  await ctx.close();
}

console.log('\n== 31) Supprimer un bloc corrige les totaux ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  await bloc(fr, page, 'Anatomía I');
  await fr.evaluate(() => document.getElementById('timer-discard').click());
  await page.waitForTimeout(200);
  await bloc(fr, page, 'Bioquímica');
  let rev = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-revision')));
  ok(rev[0].duree === 120 && rev[0].matieres['Anatomía I'] === 60 && rev[0].matieres['Bioquímica'] === 60, 'avant : 120 min, deux matières');
  await fr.evaluate(() => {
    const l = [...document.querySelectorAll('#rv-jour .jr-b')].find(x => x.textContent.includes('Anatomía I'));
    l.querySelector('[data-delsession]').click();
  });
  await page.waitForTimeout(300);
  rev = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-revision')));
  const sess = await fr.evaluate(() => JSON.parse(localStorage.getItem('batcave-sessions')));
  ok(rev[0].duree === 60, 'après suppression : 60 min (et non plus 120)');
  ok(rev[0].matieres['Anatomía I'] === undefined && rev[0].matieres['Bioquímica'] === 60, 'la matière supprimée disparaît de la répartition');
  ok(sess.length === 1, 'le bloc est retiré du journal');
  const cal = await fr.evaluate(() => document.querySelector('#rv-grid [data-agjour="2026-09-02"]').innerText.replace(/\s+/g,' '));
  ok(/1,0h/.test(cal), 'le calendrier se met à jour : ' + cal);
  const j7 = await fr.evaluate(() => document.getElementById('rev-matieres-7').innerText.replace(/\s+/g,' '));
  ok(!/Anatomía I/.test(j7) && /Bioquímica/.test(j7), 'la répartition par matière suit aussi : ' + j7);
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
