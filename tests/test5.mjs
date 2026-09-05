import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

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
    charges: JSON.parse(localStorage.getItem('batcave-fixed-charges')),
    limits: JSON.parse(localStorage.getItem('batcave-budget-limits')),
    tx: JSON.parse(localStorage.getItem('batcave-transactions') || '[]')
  }));
  await ctx.close();
  return out;
}

console.log('\n== 9) iCloud 1 € -> 3 € ==');
let r = await scenario('normal', 1, 45, 1);
let fc8 = r.charges.filter(c => c.id === 'fc8')[0];
ok(fc8 && fc8.montant === 3, 'charge iCloud passée à 3 € (obtenu: ' + (fc8 ? fc8.montant : 'absente') + ')');
ok(r.limits['Abonnements'] === 47, 'budget Abonnements 45 → 47 € (obtenu: ' + r.limits['Abonnements'] + ')');
const txIc = r.tx.filter(t => t.label === 'iCloud');
ok(txIc.length === 1 && txIc[0].montant === 3, 'la dépense de septembre est corrigée à 3 € (obtenu: ' + JSON.stringify(txIc.map(t=>t.montant)) + ')');
const total = r.charges.reduce((s,c) => s + c.montant, 0);
ok(total === 1187, 'total des charges fixes = 1187 €/mois (obtenu: ' + total + ')');

// pas de double application au rechargement
const ctx2 = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx2.addInitScript(([ch]) => {
  if(localStorage.getItem('__seeded')) return;   // sinon le rechargement re-sème l'ancien prix
  localStorage.setItem('__seeded', '1');
  localStorage.setItem('batcave-fixed-charges', JSON.stringify(ch));
  localStorage.setItem('batcave-budget-limits', JSON.stringify({'Abonnements': 45}));
}, [SEED.concat([{id:'fc8', label:'iCloud', montant:1, cat:'Abonnements'}])]);
const p2 = await ctx2.newPage();
p2.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await p2.goto(URL);
await p2.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
await p2.reload();
await p2.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr2 = p2.frames().find(x => x.url().includes('batcave.html'));
const r2 = await fr2.evaluate(() => ({ c: JSON.parse(localStorage.getItem('batcave-fixed-charges')), l: JSON.parse(localStorage.getItem('batcave-budget-limits')) }));
ok(r2.c.filter(c=>c.id==='fc8')[0].montant === 3 && r2.l['Abonnements'] === 47, 'rechargement : pas de seconde augmentation (3 € / budget 47 €)');
await ctx2.close();

// montant déjà personnalisé -> respecté
let r3 = await scenario('perso', 5, 49, null);
ok(r3.charges.filter(c=>c.id==='fc8')[0].montant === 5, 'un montant modifié à la main (5 €) n\'est pas écrasé');

// installation neuve
const ctx4 = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const p4 = await ctx4.newPage();
p4.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await p4.goto(URL);
await p4.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
const fr4 = p4.frames().find(x => x.url().includes('batcave.html'));
const r4 = await fr4.evaluate(() => JSON.parse(localStorage.getItem('batcave-fixed-charges')));
ok(r4.filter(c=>c.id==='fc8')[0].montant === 3, 'installation neuve : iCloud seedé à 3 €');
ok(r4.reduce((s,c)=>s+c.montant,0) === 1187, 'installation neuve : total 1187 €');
// affichage
await fr4.evaluate(() => document.querySelector('.nav-btn[data-page="budget"]').click());
await p4.waitForTimeout(300);
const txt = await fr4.evaluate(() => document.body.innerText);
ok(/1\s*187/.test(txt.replace(/ | /g,' ')), 'le total 1 187 € s\'affiche dans Budget');
await ctx4.close();

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
