import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

/* Cette graine est un profil D'AVANT le 21 septembre : elle porte encore la charge fixe
   « Courses » de 300 €/mois. C'est volontaire -- c'est ce qui fait passer la migration
   charges-v2, qui la retire. Elle comptait la nourriture deux fois, une fois en forfait
   et une fois en tickets réels, et ses 300 € étaient faux : les prix qu'il a relevés en
   magasin les 20 et 21 septembre donnent nettement moins. Ce qui la remplace n'est pas
   une dépense mais un PLAFOND sur la catégorie Nourriture, calculé sur ces relevés. */
const SEED = [
  {id:'fc1', label:'Loyer', montant:700, cat:'Logement'},
  {id:'fc2', label:'Wifi', montant:11, cat:'Abonnements'},
  {id:'fc3', label:'Téléphone portable', montant:11, cat:'Abonnements'},
  {id:'fc4', label:'Courses', montant:300, cat:'Nourriture'},
  {id:'fc5', label:'Eau + Électricité', montant:70, cat:'Eau & Électricité'},
  {id:'fc6', label:'Transports', montant:40, cat:'Transport (TAM)'},
  {id:'fc7', label:'Coiffeur', montant:30, cat:'Autres'},
  {id:'fc9', label:'Claude Pro', montant:22, cat:'Abonnements'}
];

async function scenario(nom, icloudMontant, limiteAbo, txMontant){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const charges = SEED.concat(icloudMontant === null ? [] : [{id:'fc8', label:'iCloud', montant:icloudMontant, cat:'Abonnements'}]);
  await ctx.addInitScript(([ch, lim, txm]) => {
    localStorage.setItem('batcave-fixed-charges', JSON.stringify(ch));
    localStorage.setItem('batcave-budget-limits', JSON.stringify({'Abonnements': lim}));
    if(txm !== null){
      localStorage.setItem('batcave-transactions', JSON.stringify([
        {id:'fctx1', date:'2026-09-01', type:'Dépense', categorie:'Abonnements', montant:txm, methode:'Virement', fixed:true, label:'iCloud'}
      ]));
      localStorage.setItem('batcave-fc-logged-fc8-2026-09', 'true');
    }
  }, [charges, limiteAbo, txMontant]);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T12:00:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  const out = await fr.evaluate(() => ({
    charges: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-fixed-charges')),
    limits: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-budget-limits')),
    tx: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-transactions') || '[]'),
    /* Le plafond attendu est calculé par la page elle-même : l'écrire à la main ici
       le figerait, et il bougera dès qu'il enverra le prix du beurre de cacahuète. */
    moisPlan: window.__bcCoutSemaine ? Math.round(window.__bcCoutSemaine().mois) : null
  }));
  await ctx.close();
  return out;
}

console.log('\n== 9) iCloud 1 € -> 3 € ==');
let r = await scenario('normal', 1, 45, 1);
let fc8 = r.charges.filter(c => c.id === 'fc8')[0];
ok(fc8 && fc8.montant === 3, 'charge iCloud passée à 3 € (obtenu: ' + (fc8 ? fc8.montant : 'absente') + ')');
/* 25 septembre : la migration v2 ajoute le club (fc10, 90 EUR) et releve le plafond Abonnements d'autant */
ok(r.limits['Abonnements'] === 147, 'budget Abonnements 45 → 47 → 137 → 147 € avec le club à 100 € (obtenu: ' + r.limits['Abonnements'] + ')');
const txIc = r.tx.filter(t => t.label === 'iCloud');
ok(txIc.length === 1 && txIc[0].montant === 3, 'la dépense de septembre est corrigée à 3 € (obtenu: ' + JSON.stringify(txIc.map(t=>t.montant)) + ')');
const total = r.charges.reduce((s,c) => s + c.montant, 0);
ok(total === 987, 'total des charges fixes = 987 €/mois (887 + le club 100), les 300 € de « Courses » sortis (obtenu: ' + total + ')');
/* La migration, vérifiée des deux côtés : la charge part, et le plafond arrive. */
ok(!r.charges.some(c => c.id === 'fc4'), 'la charge fixe « Courses » de 300 € a été retirée');
ok(r.moisPlan > 0 && r.limits['Nourriture'] === r.moisPlan,
   'et un plafond Nourriture la remplace, à la valeur calculée sur ses relevés : ' + r.limits['Nourriture'] + ' € (' + r.moisPlan + ' attendu)');
/* Le profil d'un utilisateur de la v89 : le plafond y avait été posé à 186 €, calculé
   sur quinze prix sur seize (le beurre de cacahuète comptait pour zéro). Avec ses
   5,30 €/kg le plan monte, et la migration plafond-nourriture-v2 doit corriger — mais
   UNIQUEMENT si le plafond vaut encore 186, c'est-à-dire s'il est de la Batcave et non
   de lui. Les deux moitiés se vérifient : celle qui corrige, et celle qui s'abstient. */
{
  const bump = async (plafond) => {
    const c = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
    await c.addInitScript(([lim]) => {
      localStorage.setItem('batcave-fixed-charges', JSON.stringify([{id:'fc1', label:'Loyer', montant:700, cat:'Logement'}]));
      localStorage.setItem('batcave-budget-limits', JSON.stringify({'Nourriture': lim}));
      localStorage.setItem('batcave-charges-v2', 'true');
    }, [plafond]);
    const pg = await c.newPage();
    await pg.clock.install({ time: new Date('2026-09-22T10:00:00+02:00') });
    pg.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
    await pg.goto(URL);
    await pg.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
    const f = pg.frames().find(x => x.url().includes('batcave.html'));
    const out = await f.evaluate(() => ({
      plafond: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-budget-limits'))['Nourriture'],
      attendu: Math.round(window.__bcCoutSemaine().mois)
    }));
    await c.close();
    return out;
  };
  const corrige = await bump(186);
  ok(corrige.plafond === corrige.attendu && corrige.attendu > 186,
     'plafond de la v89 (186 €) corrigé à ' + corrige.plafond + ' € (' + corrige.attendu + ' attendu)');
  const sien = await bump(250);
  ok(sien.plafond === 250, 'un plafond réglé à la main (250 €) n\'est PAS écrasé (' + sien.plafond + ' €)');
}

// pas de double application au rechargement
const ctx2 = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx2.addInitScript(([ch]) => {
  if((window.__bcLire || ((k) => localStorage.getItem(k)))('__seeded')) return;   // sinon le rechargement re-sème l'ancien prix
  localStorage.setItem('__seeded', '1');
  localStorage.setItem('batcave-fixed-charges', JSON.stringify(ch));
  localStorage.setItem('batcave-budget-limits', JSON.stringify({'Abonnements': 45}));
}, [SEED.concat([{id:'fc8', label:'iCloud', montant:1, cat:'Abonnements'}])]);
const p2 = await ctx2.newPage();
await p2.clock.install({ time: new Date('2026-09-15T09:00:00+02:00') });   /* date injectée : jamais l'horloge de la machine */
p2.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await p2.goto(URL);
await p2.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
await p2.reload();
await p2.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr2 = p2.frames().find(x => x.url().includes('batcave.html'));
const r2 = await fr2.evaluate(() => ({ c: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-fixed-charges')), l: JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-budget-limits')) }));
ok(r2.c.filter(c=>c.id==='fc8')[0].montant === 3 && r2.l['Abonnements'] === 147, 'rechargement : pas de seconde augmentation (3 € / budget 147 €)');
await ctx2.close();

// montant déjà personnalisé -> respecté
let r3 = await scenario('perso', 5, 49, null);
ok(r3.charges.filter(c=>c.id==='fc8')[0].montant === 5, 'un montant modifié à la main (5 €) n\'est pas écrasé');

// installation neuve
const ctx4 = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const p4 = await ctx4.newPage();
await p4.clock.install({ time: new Date('2026-09-15T09:00:00+02:00') });   /* date injectée : jamais l'horloge de la machine */
p4.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await p4.goto(URL);
await p4.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr4 = p4.frames().find(x => x.url().includes('batcave.html'));
const r4 = await fr4.evaluate(() => JSON.parse((window.__bcLire || ((k) => localStorage.getItem(k)))('batcave-fixed-charges')));
ok(r4.filter(c=>c.id==='fc8')[0].montant === 3, 'installation neuve : iCloud seedé à 3 €');
ok(r4.reduce((s,c)=>s+c.montant,0) === 987, 'installation neuve : total 987 €');
ok(!r4.some(c => c.label === 'Courses'), 'installation neuve : aucune charge « Courses » dans la graine');
// affichage
await fr4.evaluate(() => document.querySelector('.nav-btn[data-page="budget"]').click());
await p4.waitForTimeout(300);
const txt = await fr4.evaluate(() => document.body.innerText);
ok(/987/.test(txt.replace(/ | /g,' ')), 'le total 987 € s\'affiche dans Budget');
await ctx4.close();

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
