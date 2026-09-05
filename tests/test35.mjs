import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(seed) await ctx.addInitScript(s => {
    if(localStorage.getItem('__seed')) return;
    localStorage.setItem('__seed','1');
    Object.keys(s).forEach(k => localStorage.setItem(k, JSON.stringify(s[k])));
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T10:00:00+02:00') });   // mercredi
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(200);
  return { ctx, page, fr };
}
const aller = async (fr, page, p) => { await fr.evaluate(x => document.querySelector('.nav-btn[data-page="'+x+'"]').click(), p); await page.waitForTimeout(200); };

console.log('\n== 61) Cloisonnement des pages : Études = révision, Business = projets perso ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  const boutons = await fr.evaluate(() => ({
    etudes: [...document.querySelectorAll('.page[data-page="etudes"] button')].map(b => b.textContent.trim()).filter(t => /Pomodoro/.test(t)),
    business: [...document.querySelectorAll('.page[data-page="business"] button')].map(b => b.textContent.trim()).filter(t => /Pomodoro/.test(t)),
    /* le plan du jour fabrique un bouton Pomodoro par créneau : on ne compte que
       les deux lanceurs fixes du tableau de bord. */
    dash: [...document.querySelectorAll('.page[data-page="dashboard"] button:not([data-plan-pomodoro])')].map(b => b.textContent.trim()).filter(t => /Pomodoro/.test(t)),
  }));
  ok(boutons.etudes.length === 1 && /Révision/.test(boutons.etudes[0]),
     'la page Études ne lance que de la révision : ' + JSON.stringify(boutons.etudes));
  ok(boutons.business.length === 1 && /Projet perso/.test(boutons.business[0]),
     'la page Business a son propre lanceur projet perso : ' + JSON.stringify(boutons.business));
  ok(boutons.dash.length === 2, 'le tableau de bord garde les deux lanceurs : ' + JSON.stringify(boutons.dash));

  // les trois agendas sont chacun sur leur page, la vue 12 mois est sur l'agenda Batcave
  const placement = await fr.evaluate(() => {
    const page = id => { const el = document.getElementById(id); const s = el && el.closest('.page'); return s ? s.dataset.page : null; };
    return { rv: page('rv-grid'), pj: page('pj-grid'), ag: page('ag-grid'), sem: page('sem-matieres'), an: page('rev-annee') };
  });
  ok(placement.rv === 'etudes' && placement.sem === 'etudes', 'agenda révision + heures par matière sur Études : ' + JSON.stringify(placement));
  ok(placement.pj === 'business', 'agenda projets perso sur Business');
  ok(placement.ag === 'agenda' && placement.an === 'agenda', 'agenda regroupé + vue 12 mois sur Agenda Batcave');
  await ctx.close();
}

console.log('\n== 62) Lancer un Pomodoro projet depuis Business amène au minuteur ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  await aller(fr, page, 'business');
  await fr.evaluate(() => document.getElementById('biz-pomodoro-projet').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { document.getElementById('ask-input').value = 'Boutique Shopify'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(300);
  const etat = await fr.evaluate(() => ({
    page: document.querySelector('.page.active').dataset.page,
    tourne: !document.getElementById('timer-running').hidden,
    cible: document.getElementById('timer-dial-tag').textContent,
  }));
  ok(etat.page === 'etudes', 'on bascule sur la page qui porte le cadran : ' + etat.page);
  ok(etat.tourne, 'le minuteur tourne vraiment');
  ok(/Boutique Shopify/.test(etat.cible), 'le cadran affiche le projet : ' + etat.cible);
  await ctx.close();
}

console.log('\n== 62 bis) Un second lancement n\'écrase pas la session en cours ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  await aller(fr, page, 'business');
  await fr.evaluate(() => document.getElementById('biz-pomodoro-projet').click());
  await page.waitForTimeout(150);
  await fr.evaluate(() => { document.getElementById('ask-input').value = 'Boutique Shopify'; document.getElementById('ask-ok').click(); });
  await page.waitForTimeout(250);
  await page.clock.fastForward('00:10:00'); await page.waitForTimeout(250);
  const avant = await fr.evaluate(() => document.getElementById('timer-display').textContent);
  // second clic : doit être refusé, pas repartir de zéro
  await aller(fr, page, 'business');
  await fr.evaluate(() => document.getElementById('biz-pomodoro-projet').click());
  await page.waitForTimeout(250);
  const apres = await fr.evaluate(() => ({
    dialogue: !document.getElementById('ask-overlay').hidden,
    temps: document.getElementById('timer-display').textContent,
    toast: document.getElementById('toast').textContent,
  }));
  ok(!apres.dialogue, 'aucun nouveau dialogue de projet ne s\'ouvre');
  ok(apres.temps === avant, 'le décompte continue sans repartir à zéro (' + avant + ' → ' + apres.temps + ')');
  ok(/déjà en cours/.test(apres.toast), 'un message explique pourquoi : ' + apres.toast);
  await ctx.close();
}

console.log('\n== 63) Heures par matière : les semaines antérieures au journal ne sont plus vides ==');
{
  // semaine du 17 au 23 août 2026 : que des totaux agrégés, aucun bloc journalisé
  const { ctx, page, fr } = await ouvrir({
    'batcave-revision': [
      {id:'r1', date:'2026-08-18', duree:180, matieres:{'Anatomía I':120, 'Bioquímica':60}},
      {id:'r2', date:'2026-08-20', duree:150, matieres:{'Anatomía I':90}},   // 60 min non attribuées
    ],
    'batcave-sessions': [],
  });
  await aller(fr, page, 'etudes');
  // recule de 2 semaines (2 sept → semaine du 17 août)
  await fr.evaluate(() => { document.getElementById('sem-prev').click(); document.getElementById('sem-prev').click(); });
  await page.waitForTimeout(200);
  const t = await fr.evaluate(() => ({
    label: document.getElementById('sem-label').textContent,
    txt: document.getElementById('sem-matieres').innerText.replace(/\s+/g,' '),
  }));
  ok(/17 août → 23 août/.test(t.label), 'semaine visée : ' + t.label);
  ok(!/Aucune révision/.test(t.txt), 'la semaine agrégée n\'est plus déclarée vide');
  ok(/Anatomía I/.test(t.txt) && /3,5 h/.test(t.txt), 'Anatomía I : 120 + 90 = 3,5 h — ' + t.txt.slice(0,90));
  ok(/Bioquímica/.test(t.txt) && /1,0 h/.test(t.txt), 'Bioquímica : 1,0 h');
  ok(/Sans matière précisée/.test(t.txt), 'le reliquat non attribué apparaît honnêtement');
  ok(/5,5 h au total sur 3 matières/.test(t.txt), 'total hebdo cohérent (180 + 150 = 5,5 h) : ' + t.txt.slice(-120));
  await ctx.close();
}

console.log('\n== 64) Écart hebdo : « stable » plutôt qu\'un -0,0 h trompeur ==');
{
  const { ctx, page, fr } = await ouvrir({
    'batcave-revision': [
      {id:'r1', date:'2026-08-31', duree:62, matieres:{'Anatomía I':62}},   // semaine en cours (lun 31 août)
      {id:'r2', date:'2026-08-24', duree:60, matieres:{'Anatomía I':60}},   // semaine précédente
    ],
    'batcave-sessions': [],
  });
  await aller(fr, page, 'etudes');
  const txt = await fr.evaluate(() => document.getElementById('sem-matieres').innerText.replace(/\s+/g,' '));
  ok(/stable/.test(txt) && !/-0,0/.test(txt), '2 min d\'écart → « stable », pas de -0,0 h : ' + txt.slice(0,100));
  await ctx.close();
}

console.log('\n== 65) Agenda Batcave : les tuiles d\'un mois ancien ne mentent plus ==');
{
  // août 2026 : uniquement des agrégats (pas un seul bloc journalisé)
  const { ctx, page, fr } = await ouvrir({
    'batcave-revision': [{id:'r1', date:'2026-08-18', duree:180, matieres:{'Anatomía I':180}}],
    'batcave-projets':  [{id:'p1', date:'2026-08-19', duree:120, projet:'Boutique Shopify'}],
    'batcave-sessions': [],
  });
  await aller(fr, page, 'agenda');
  await fr.evaluate(() => document.getElementById('ag-prev').click());   // septembre → août
  await page.waitForTimeout(200);
  const vue = await fr.evaluate(() => ({
    mois: document.getElementById('ag-mois').textContent,
    tuiles: document.getElementById('ag-stats').innerText.replace(/\s+/g,' '),
    case18: document.querySelector('#ag-grid [data-agjour="2026-08-18"]').innerText.replace(/\s+/g,''),
    case19: document.querySelector('#ag-grid [data-agjour="2026-08-19"]').innerText.replace(/\s+/g,''),
  }));
  ok(/Août 2026/i.test(vue.mois), 'mois affiché : ' + vue.mois);
  ok(/3,0h/.test(vue.case18) && /2,0h/.test(vue.case19), 'la grille montre bien les heures agrégées : ' + vue.case18 + ' / ' + vue.case19);
  ok(/Total du mois 5,0/.test(vue.tuiles), 'tuile « Total du mois » cohérente avec la grille : ' + vue.tuiles);
  ok(/Révision 3,0/.test(vue.tuiles) && /Projets perso 2,0/.test(vue.tuiles), 'répartition révision / projets correcte');
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
