/* 84) L'emploi du temps reel : lundi et mardi, et les cibles hebdo par phase.
   Releve semaine par semaine sur le portail Universidad Europea, 39 semaines. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let ko = 0;
const ok = (c, t) => { console.log((c ? '  ok  ' : '  FAIL ') + t); if (!c) ko++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
const page = await ctx.newPage();
/* R16 : la date est injectee, jamais celle de la machine. Toutes les assertions ci-dessous
   passent une date ISO explicite, mais la page doit demarrer sur une horloge maitrisee. */
await page.clock.install({ time: new Date('2026-09-21T09:00:00+02:00') });
await page.goto(URL, { waitUntil:'load', timeout:20000 });
const fr = page.frames().find(f => /batcave/.test(f.url())) || page.mainFrame();
await fr.waitForFunction(() => !!window.__bcGrille && !!window.__bcPrevu && !!window.__bcCle, null, { timeout:20000 });

console.log('\n== 84.1) cleJournee distingue lundi, mardi et le reste ==');
{
  const c = await fr.evaluate(() => [0,1,2,3,4,5,6].map(d => window.__bcCle(d)));
  ok(c[1] === 'monday',   'lundi  -> monday  (' + c[1] + ')');
  ok(c[2] === 'tuesday',  'mardi  -> tuesday (' + c[2] + ')');
  ok(c[4] === 'weekday',  'jeudi  -> weekday (' + c[4] + ')');
  ok(c[3] === 'wednesday' && c[5] === 'friday' && c[6] === 'saturday' && c[0] === 'weekend', 'les autres jours sont inchanges');
}

console.log('\n== 84.2) Les horaires de cours sont ceux du portail ==');
{
  const h = await fr.evaluate(() => {
    const g = c => window.__bcGrille(c, '2026-09-21');
    const cours = c => { const p = g(c), i = p.findIndex(b => b[1] === 'Cours');
      return i < 0 ? null : p[i][0] + '-' + p[i+1][0]; };
    return { lun: cours('monday'), mar: cours('tuesday'), mer: cours('wednesday'),
             jeu: cours('weekday'), ven: cours('friday') };
  });
  ok(h.lun === '17:30-19:30', 'lundi    17:30-19:30 (' + h.lun + ')');
  ok(h.mar === '15:30-17:30', 'mardi    15:30-17:30 (' + h.mar + ')');
  ok(h.mer === '15:30-19:30', 'mercredi 15:30-19:30 (' + h.mer + ')');
  ok(h.jeu === '15:30-19:30', 'jeudi    15:30-19:30 (' + h.jeu + ')');
  ok(h.ven === '15:30-19:30', 'vendredi 15:30-19:30 (' + h.ven + ')');
}

console.log('\n== 84.3) Le trajet suit le cours, il ne reste pas a 15:00 ==');
{
  const t = await fr.evaluate(() => {
    const at = (c, h) => (window.__bcGrille(c, '2026-09-21').find(b => b[0] === h) || [])[1] || null;
    return { lunTrajet: at('monday', '17:00'), lunColl: at('monday', '16:50'),
             marRetour: at('tuesday', '17:30'), lun15: at('monday', '15:00') };
  });
  ok(t.lunTrajet === 'Trajet cours',   'lundi, depart a 17:00 et non 15:00');
  ok(t.lunColl === 'Collation entraînement', 'lundi, la collation suit a 16:50');
  ok(t.marRetour === 'Trajet retour',  'mardi, retour des 17:30');
  ok(t.lun15 !== null && t.lun15 !== 'Cours', 'lundi 15:00 n\'est plus un cours (' + t.lun15 + ')');
}

console.log('\n== 84.4) Les heures liberees entrent dans le pool, pas en dur ==');
{
  const r = await fr.evaluate(() => {
    const lab = (c, iso, h) => (window.__bcGrille(c, iso).find(b => b[0] === h) || [])[1] || null;
    return {
      es1_lun15: lab('monday',  '2026-09-21', '15:00'),
      es1_mar19: lab('tuesday', '2026-09-22', '19:00'),
      es1_mar20: lab('tuesday', '2026-09-22', '20:30'),
      es1_lun14: lab('monday',  '2026-09-21', '14:00'),
      es2_mar20: lab('tuesday', '2026-10-20', '20:30'),
      type_lun15: lab('monday', '2027-03-22', '15:00')
    };
  });
  ok(/^Español/.test(r.es1_lun15), 'phase 1 : lundi 15:00 est de l\'espagnol (' + r.es1_lun15 + ')');
  ok(r.es1_lun14 !== r.es1_lun15, 'lundi 14:00 et 15:00 ne sont pas le meme bloc deux fois (' + r.es1_lun14 + ' / ' + r.es1_lun15 + ')');
  ok(/^Español/.test(r.es1_mar19), 'phase 1 : mardi 19:00 est de l\'espagnol (' + r.es1_mar19 + ')');
  ok(/Serie en VO/.test(r.es1_mar20), 'phase 1 : mardi 20:30 est la serie en VO (' + r.es1_mar20 + ')');
  ok(r.es2_mar20 === 'Projets perso 6', 'phase 2 : mardi 20:30 est la PREMIERE heure qui revient aux projets (' + r.es2_mar20 + ')');
  ok(r.type_lun15 === 'Projets perso 4', 'grille type : lundi 15:00 est un bloc de projet (' + r.type_lun15 + ')');
}

console.log('\n== 84.5) Le mardi, comprendre le cours remonte a 18:00 ==');
{
  const m = await fr.evaluate(() => {
    const p = window.__bcGrille('tuesday', '2026-09-22');
    const i = p.findIndex(b => /^Comprendre/.test(b[1]));
    return { h: i < 0 ? null : p[i][0], n: p.filter(b => /^Comprendre/.test(b[1])).length };
  });
  ok(m.h === '18:00', 'mardi, comprendre le cours a 18:00 (' + m.h + ')');
  ok(m.n === 1, 'une seule fois dans la journee, pas deux (' + m.n + ')');
}

console.log('\n== 84.6) Cibles hebdo : constantes en revision, croissantes en projets ==');
{
  const sem = async (L) => fr.evaluate((L) => {
    const d0 = new Date(L + 'T12:00:00'); let T = {rev:0, proj:0, es:0};
    for (let i = 0; i < 7; i++) { const d = new Date(d0); d.setDate(d.getDate() + i);
      const c = window.__bcPrevu(d.toISOString().slice(0,10)); T.rev += c.rev; T.proj += c.proj; T.es += c.es; }
    return {rev: T.rev/60, proj: T.proj/60, es: T.es/60};
  }, L);
  const t = await sem('2026-09-07'), e1 = await sem('2026-09-21'), e2 = await sem('2026-10-26'), e3 = await sem('2026-12-14');
  const pr = x => Math.round(x * 100) / 100;
  ok(pr(t.rev) === pr(e1.rev) && pr(e1.rev) === pr(e2.rev) && pr(e2.rev) === pr(e3.rev),
     'la revision ne bouge pas d\'une phase a l\'autre : ' + pr(e1.rev) + ' h');
  ok(pr(e1.rev) === 29.92, 'revision = 29 h 55 de travail reel par semaine (' + pr(e1.rev) + ')');
  ok(pr(e1.proj) === 0, 'phase 1 : aucun temps de projet, tout va a l\'espagnol (' + pr(e1.proj) + ')');
  ok(e1.es > 20 && e1.es < 21, 'phase 1 : 20 h 41 d\'espagnol (' + pr(e1.es) + ')');
  ok(e1.proj < e2.proj && e2.proj < e3.proj && e3.proj < t.proj,
     'les projets montent a chaque phase : ' + [pr(e1.proj), pr(e2.proj), pr(e3.proj), pr(t.proj)].join(' -> '));
  ok(e1.es > e2.es && e2.es > e3.es, 'l\'espagnol descend a chaque phase : ' + [pr(e1.es), pr(e2.es), pr(e3.es)].join(' -> '));
  ok(pr(t.proj) === 22.52, 'grille type : 22 h 31 de projets par semaine (' + pr(t.proj) + ')');
}

await browser.close();
console.log(ko ? '\n' + ko + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(ko ? 1 : 0);
