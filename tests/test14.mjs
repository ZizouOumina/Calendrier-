import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

async function ouvrir(seed, taille){
  const ctx = await browser.newContext({ viewport: taille || {width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  if(seed) await ctx.addInitScript(s => {
    if(localStorage.getItem('__seed')) return;
    localStorage.setItem('__seed','1');
    Object.keys(s).forEach(k => localStorage.setItem(k, JSON.stringify(s[k])));
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T10:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(250);
  return { ctx, page, fr };
}

console.log('\n== 33) Barre de titre Batcomputer : deux rangées, compacte ==');
{
  const { ctx, fr } = await ouvrir(null);
  const h = await fr.evaluate(() => {
    const bar = document.querySelector('.page[data-page="dashboard"] > .bc-bar');
    const releves = [...bar.querySelectorAll('.bc-row-2 .bc-r')].filter(s => !s.hidden);
    const hauteurs = new Set(releves.map(s => Math.round(s.getBoundingClientRect().top)));
    const r1 = bar.querySelector('.bc-row-1').getBoundingClientRect();
    return { n: releves.length, lignes: hauteurs.size, hauteur: Math.round(bar.getBoundingClientRect().height), r1: Math.round(r1.height),
             txt: document.getElementById('dash-greeting').textContent.trim(),
             horloge: document.getElementById('bc-clock').textContent.trim(),
             nom: bar.querySelector('.bc-name').textContent.trim(),
             actionsDroite: Math.round(bar.querySelector('.bc-actions').getBoundingClientRect().right) >= Math.round(r1.right) - 20,
             ancienne: !!document.querySelector('.page[data-page="dashboard"] .page-head, .page[data-page="dashboard"] .dash-statusline') };
  });
  ok(h.n === 6, 'les 6 relevés (météo, sync, ♫, sauvegarde, clôture, objectif) sont sur la deuxième rangée (' + h.n + ')');
  ok(h.lignes <= 2, 'ils tiennent sur deux lignes au plus à 1440px (' + h.lignes + ')');
  ok(h.r1 < 50, 'première rangée sur une ligne : ' + h.r1 + 'px');
  ok(h.hauteur < 130, 'barre compacte : ' + h.hauteur + 'px');
  ok(h.actionsDroite, 'les actions (Notion) sont calées à droite');
  ok(/Bonjour|Bonsoir|Bon après-midi/.test(h.txt), 'salutation présente : ' + h.txt.slice(0, 60));
  ok(/^\d{2}:\d{2}$/.test(h.horloge) && h.horloge === '10:00', 'horloge du Batcomputer à l\'heure : ' + h.horloge);
  ok(/BATCOMPUTER/.test(h.nom), 'identité affichée : ' + h.nom.replace(/\s+/g,' '));
  ok(h.ancienne === false, 'l\'ancienne en-tête n\'existe plus (pas de doublon)');
  await ctx.close();
}

console.log('\n== 34) « Prochainement » est dans le Plan du jour ==');
{
  const { ctx, fr } = await ouvrir({
    'batcave-taches': [{id:'t1', text:'Réviser anatomie', due:'2026-09-10', priority:'Haute', status:'À faire'}],
    'batcave-sante': [{id:'sa1', date:'2026-09-15', type:'RDV dentaire', notes:''}]
  });
  const p = await fr.evaluate(() => {
    const plan = document.getElementById('dash-plan').closest('.panel');
    return { memePanneau: plan.contains(document.getElementById('dash-upcoming')),
             titre: plan.querySelector('h3').textContent,
             sousTitre: [...plan.querySelectorAll('p')].map(x => x.textContent).join('|'),
             aVenir: document.getElementById('dash-upcoming').innerText.replace(/\s+/g,' '),
             panneaux: document.querySelectorAll('.page[data-page="dashboard"] > .panel').length };
  });
  ok(p.memePanneau, '« À venir » vit dans le même panneau que le Plan du jour');
  ok(/Plan du jour/.test(p.titre) && /À venir/.test(p.sousTitre), 'un seul panneau, deux sections : ' + p.titre.trim());
  ok(/RDV dentaire/.test(p.aVenir) && /Réviser anatomie/.test(p.aVenir), 'échéances listées : ' + p.aVenir.slice(0, 70));
  await ctx.close();
}

console.log('\n== 35) Les dépendances suivent les habitudes ==');
{
  const { ctx, fr } = await ouvrir(null);
  const o = await fr.evaluate(() => {
    const enfants = [...document.querySelector('.page[data-page="dashboard"]').children];
    const iHab = enfants.findIndex(e => e.contains(document.getElementById('dash-checklist')));
    const iDep = enfants.findIndex(e => e.id === 'dash-stats');
    const iPlus = enfants.findIndex(e => e.id === 'dash-more-toggle');
    return { iHab, iDep, iPlus, nDep: document.querySelectorAll('#dash-stats .stat-tile').length };
  });
  ok(o.iDep === o.iHab + 1, 'les dépendances viennent juste après les habitudes (positions ' + o.iHab + ' → ' + o.iDep + ')');
  ok(o.iPlus > o.iDep, 'et avant la zone repliée');
  ok(o.nDep === 4, 'les 4 compteurs de dépendances sont bien là');
  await ctx.close();
}

console.log('\n== 36) Agir en haut, consulter replié ==');
{
  const { ctx, page, fr } = await ouvrir(null);
  let e = await fr.evaluate(() => ({
    replie: document.getElementById('dash-more').hidden,
    libelle: document.getElementById('dash-more-toggle').textContent,
    basAgir: Math.round(document.getElementById('dash-more-toggle').getBoundingClientRect().bottom)
  }));
  ok(e.replie === true, 'la zone « consulter » est repliée par défaut');
  ok(/Voir le reste de la journée/.test(e.libelle), 'libellé du bouton : ' + e.libelle.trim());
  // 1400 → 1500 : la vision Batcomputer ajoute le bandeau de relevés (budget, sommeil, poids,
  // Coran) sous les dépendances, pour lire ces quatre chiffres sans déplier la suite.
  ok(e.basAgir < 1560, 'la zone « agir » tient en environ un écran et demi (' + e.basAgir + 'px)');
  // les panneaux repliés restent alimentés
  const caches = await fr.evaluate(() => document.getElementById('dash-more').innerText.length);
  ok(caches > 50, 'le contenu replié est déjà rendu (' + caches + ' caractères), pas vide');
  await fr.evaluate(() => document.getElementById('dash-more-toggle').click());
  await page.waitForTimeout(200);
  e = await fr.evaluate(() => ({
    ouvert: !document.getElementById('dash-more').hidden,
    libelle: document.getElementById('dash-more-toggle').textContent,
    memo: JSON.parse(localStorage.getItem('batcave-dash-more'))
  }));
  ok(e.ouvert && /Masquer le reste/.test(e.libelle), 'un clic déplie : ' + e.libelle.trim());
  ok(e.memo === true, 'le choix est mémorisé');
  await page.reload();
  await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  ok(await fr2.evaluate(() => document.getElementById('dash-more').hidden) === false, 'toujours déplié après rechargement');
  await ctx.close();
}

console.log('\n== 37) Rien n\'a été perdu ==');
{
  const { ctx, fr } = await ouvrir(null);
  const ids = ['dash-plan','dash-upcoming','dash-score-num','dash-temps','dash-checklist','dash-stats',
               'dash-journal','dash-meals','dash-courses-count','dash-sport','dash-goals',
               'dash-taches','dash-budget','dash-coran','dash-greeting','dash-weather','dash-notion-btn'];
  const manquants = await fr.evaluate(l => l.filter(i => !document.getElementById(i)), ids);
  ok(manquants.length === 0, 'les 17 blocs du tableau de bord sont tous présents' + (manquants.length ? ' — manque ' + manquants.join(', ') : ''));
  const remplis = await fr.evaluate(() => ({
    journal: document.getElementById('dash-journal').children.length,
    repas: document.getElementById('dash-meals').children.length,
    coran: document.getElementById('dash-coran').children.length
  }));
  ok(remplis.journal > 0 && remplis.repas > 0 && remplis.coran > 0, 'et toujours alimentés (journal ' + remplis.journal + ', repas ' + remplis.repas + ', coran ' + remplis.coran + ')');
  await ctx.close();
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
