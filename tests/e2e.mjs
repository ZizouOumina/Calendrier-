import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let ko = 0;
const ok = (c, m) => { if (c) console.log('  ok   ' + m); else { ko++; console.log('  FAIL ' + m); } };

/* Une semaine plausible : lun 24 nov -> dim 30 nov 2026, apres la bascule du 23 octobre.
   Du travail fait, des habitudes, du sport, des pesees, des echeances, un examen. */
const ms = (iso, hm) => new Date(iso + 'T' + hm + ':00+01:00').getTime();
const S = [];
let n = 0;
const jour = (iso, blocs) => blocs.forEach(([h1, h2, type, label]) => S.push({
  id: 's' + (n++), date: iso, type, label,
  debut: ms(iso, h1), fin: ms(iso, h2),
  duree: Math.round((ms(iso, h2) - ms(iso, h1)) / 60000)
}));
jour('2026-11-23', [['07:20','09:20','cours','Anatomía'],['09:20','11:20','cours','Anatomía'],['11:20','12:20','cours','Epidemiología'],['13:00','15:00','projet','Shopify'],['20:30','21:10','cours','Biología']]);
jour('2026-11-24', [['07:20','09:20','cours','Biología'],['09:20','11:20','cours','Biología'],['13:00','15:00','projet','Shopify'],['20:30','21:30','projet','Shopify']]);
jour('2026-11-25', [['05:30','06:30','projet','Shopify'],['07:20','09:20','cours','Anatomía'],['09:20','11:20','cours','Epidemiología'],['20:30','21:10','cours','Anatomía']]);
jour('2026-11-26', [['07:20','09:20','cours','Anatomía'],['09:20','11:20','cours','Anatomía'],['13:00','14:50','projet','Shopify']]);
jour('2026-11-27', [['05:30','06:30','projet','Shopify'],['07:20','09:20','cours','Biología'],['09:20','11:20','cours','Biología'],['11:20','12:20','projet','Shopify']]);

const seed = {
  'batcave-sessions': S,
  'batcave-examens': {'Anatomía': '2027-01-12', 'Biología': '2027-01-15'},
  'batcave-echeances': [
    {id:'e1', date:'2026-12-02', type:'questionnaire', matiere:'Anatomía', label:'Q3 Sistema Nervioso', fait:false},
    {id:'e2', date:'2026-12-10', type:'rendu', matiere:'Epidemiología', label:'Uso ético de la IA', fait:false},
    {id:'e3', date:'2026-11-20', type:'presentation', matiere:'Biología', label:'Exposición oral', fait:true}
  ],
  'batcave-sport-log': [
    {date:'2026-11-23', type:'Haut lourd', exos:{}},
    {date:'2026-11-24', type:'Bas complet', exos:{}}
  ]
};
['2026-11-23','2026-11-24','2026-11-25','2026-11-26','2026-11-27'].forEach((iso, i) => {
  seed['batcave-journal-' + iso] = {sommeil: String(7 + (i % 2) * 0.5), mood: 4, notes: '', poids: String(65 + i * 0.1), water: 2500, coran: '1', duaa: '1'};
});

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const erreurs = [];
page.on('console', m => { const t = m.text();
  if (m.type() === 'error' && !/ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|ERR_TUNNEL_CONNECTION_FAILED|fonts\.g/.test(t)) erreurs.push(t.slice(0, 120)); });
page.on('pageerror', e => erreurs.push('pageerror: ' + String(e).slice(0, 120)));
/* Le bac a sable coupe tout appel sortant : ERR_TUNNEL_CONNECTION_FAILED n'est pas un
   defaut de la page. On note quand meme l'URL visee, pour verifier qu'il s'agit bien d'un
   connecteur externe et de rien d'autre. */
const reseau = [];
page.on('requestfailed', r => reseau.push(r.url().slice(0, 90) + ' · ' + (r.failure() || {}).errorText));
await page.clock.install({ time: new Date('2026-11-27T18:00:00+01:00') });   /* vendredi */
await page.addInitScript(s => { for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); }, seed);
await page.goto(URL, { waitUntil: 'domcontentloaded' });
const f = page.frames().find(x => x.name() === 'f') || page.frames()[1];
await f.waitForSelector('#dash-plan', { timeout: 25000 });
await page.waitForTimeout(2500);
await f.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /C'est parti/.test(x.textContent)); if (b) b.click(); });
await page.waitForTimeout(600);

console.log('\n== A) Les totaux disent la meme chose partout ==');
const d = await f.evaluate(() => ({
  cells: [...document.querySelectorAll('#dash-temps .temps-cell .tv')].map(e => e.innerText.replace(/\s+/g, ' ')),
  semaine: document.getElementById('dash-semaine').innerText.replace(/\s+/g, ' '),
  total: document.getElementById('dash-temps-total').innerText.replace(/\s+/g, ' ')
}));
/* vendredi 27 : 2 h Anki1+2 + 2 h Etudier = 4 h de revision, 1 h projet matinal + 1 h a 11:20 */
ok(/^📚\s*Révision\s*4 h/.test(d.cells[0].replace(/\s+/g,' ')) || /4 h/.test(d.cells[0]), 'revision du jour : ' + d.cells[0]);
ok(/2 h/.test(d.cells[1]), 'projets du jour : ' + d.cells[1]);
ok(/6 h au total/.test(d.total), 'total du jour = revision + projets : ' + d.total);
ok(/de révision restantes sur/.test(d.semaine) || /atteints/.test(d.semaine), 'ligne semaine presente : ' + d.semaine.slice(0, 90));

console.log('\n== B) Les echeances : compte a rebours, tri, « fait » ==');
const e = await f.evaluate(() => ({
  dash: (document.getElementById('dash-echeances') || {innerText:''}).innerText.replace(/\s+/g, ' '),
}));
ok(/Q3 Sistema Nervioso/.test(e.dash), 'la prochaine echeance est sur le tableau de bord : ' + e.dash.slice(0, 110));
ok(!/Exposición oral/.test(e.dash), 'une echeance marquee faite ne remonte plus');
ok(/J-5|5 j/.test(e.dash), 'le compte a rebours dit 5 jours (27 nov -> 2 dec) : ' + (e.dash.match(/J-\d+|\d+ j/) || [''])[0]);

console.log('\n== C) Les 13 onglets s\'ouvrent, sans erreur et sans vide ==');
const onglets = await f.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].map(b => b.dataset.page));
for (const o of onglets) {
  await f.evaluate(p => { const b = document.querySelector('.nav-btn[data-page="' + p + '"]'); if (b) b.click(); }, o);
  await page.waitForTimeout(450);
  const r = await f.evaluate(p => {
    const el = document.querySelector('.page[data-page="' + p + '"]') || document.getElementById('page-' + p);
    const t = el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
    return { n: t.length, vide: /^\s*$/.test(t) };
  }, o);
  ok(r.n > 60, 'onglet ' + o + ' : ' + r.n + ' caracteres');
}

console.log('\n== D) Aucune erreur JavaScript sur tout le parcours ==');
ok(erreurs.length === 0, erreurs.length ? erreurs.length + ' erreur(s) : ' + erreurs.slice(0, 3).join(' | ') : 'aucune erreur console ni pageerror');
console.log('  --   requetes sortantes coupees par le bac a sable : ' + (reseau.length ? reseau.join('\n       ') : 'aucune'));
ok(reseau.every(u => !/127\.0\.0\.1|localhost/.test(u)), 'aucune requete LOCALE en echec (celles vers l\'exterieur sont normales ici)');

await b.close();
console.log(ko ? '\n' + ko + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(ko ? 1 : 0);
