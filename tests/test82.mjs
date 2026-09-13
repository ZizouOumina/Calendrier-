/* Lot 32 — la matière proposée toute l'année, et la boucle poids à une pesée par semaine.
     · Hors partiels, le lanceur de Pomodoro proposait derniereMatiere() : la matière la
       PLUS travaillée le dernier jour travaillé. Il propose maintenant celle qui en a le
       plus besoin, et dit pourquoi.
     · Le protocole de pesée est passé à une pesée un dimanche sur deux. L'ancien calcul
       exigeait trois pesées par semaine sur deux semaines : il n'aurait jamais rien conclu.
       C'est une pente (moindres carrés sur huit semaines) qui décide désormais. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

async function ouvrir(seed, quand){
  const ctx = await b.newContext({viewport:{width:1440, height:1100}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(s => {
    window.claude = undefined;
    for(const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
  }, seed || {});
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + e.message); });
  await page.clock.install({time: new Date(quand)});
  await page.goto(URL, {timeout:20000}).catch(()=>{});
  await page.frameLocator('#f').locator('#dash-plan').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  await page.waitForTimeout(400);
  return {ctx, page, fr};
}
const aller = async (fr, page, p) => { await fr.evaluate(pg => document.querySelector('.nav-btn[data-page="'+pg+'"]').click(), pg => pg, p).catch(()=>{}) };
/* le journal de révision : { date, duree, matieres:{ <matière>: minutes } } */
const revision = liste => ({'batcave-revision': liste.map((x, i) => ({
  id:'r'+i, date:x.date, duree:Object.values(x.m).reduce((a,b)=>a+b,0), matieres:x.m}))});
const lundis = (premier, n) => { const out=[]; const d=new Date(premier+'T00:00:00'); for(let i=0;i<n;i++){ out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+7);} return out; };
const pesees = paires => Object.fromEntries(paires.map(([iso, kg]) => ['batcave-journal-'+iso, {poids:kg, water:0}]));

/* ouvre la fenêtre « Quelle matière ? » et rend ce qu'elle propose */
async function proposition(fr, page){
  await fr.evaluate(() => { const b = document.getElementById('dash-pomodoro-cours') || document.querySelector('[data-plan-pomodoro]'); if(b) b.click(); });
  await page.waitForTimeout(500);
  return fr.evaluate(() => ({
    ouvert: !document.getElementById('ask-overlay').hidden,
    msg: (document.getElementById('ask-msg').textContent || '').replace(/\s+/g, ' '),
    choisi: document.getElementById('ask-select').value
  }));
}

console.log('\n== 1) Hors partiels : la matière la plus délaissée, et le motif ==');
{
  /* 12 h d'Anatomía I ces trente jours, 30 min de Bioquímica, rien ailleurs. L'ancienne
     règle aurait reproposé Anatomía I — celle du dernier jour travaillé. */
  const seed = Object.assign(
    revision([{date:'2026-11-14', m:{'Anatomía I': 720}}, {date:'2026-11-13', m:{'Bioquímica': 30}}]),
    {'batcave-examens': {'Anatomía I':'2026-12-14', 'Bioquímica':'2026-12-16'}});
  const {ctx, page, fr} = await ouvrir(seed, '2026-11-16T09:40:00+01:00');
  const p = await proposition(fr, page);
  ok(p.ouvert, 'la fenêtre « Quelle matière ? » s’ouvre');
  ok(p.choisi !== 'Anatomía I', 'ce n’est plus la matière du dernier jour travaillé qui est proposée (' + p.choisi + ')');
  ok(/Proposé : /.test(p.msg), 'la proposition est motivée : « ' + (p.msg.match(/Proposé :[^»]*/) || [''])[0].trim() + ' »');
  ok(/h faites sur 30 jours/.test(p.msg), 'le motif chiffre les heures déjà faites');
  await ctx.close();
}
{
  /* à heures égales, c'est l'examen le plus proche qui passe devant */
  const seed = Object.assign(revision([]), {'batcave-examens': {'Bioquímica':'2026-12-16', 'Histología':'2026-11-23'}});
  const {ctx, page, fr} = await ouvrir(seed, '2026-11-16T09:40:00+01:00');
  const p = await proposition(fr, page);
  ok(p.choisi === 'Histología', 'aucune heure faite : l’examen dans une semaine passe devant celui du mois prochain (' + p.choisi + ')');
  ok(/examen le 23 nov\., J-7/.test(p.msg), 'et le motif donne la date et le J- : « ' + (p.msg.match(/Proposé :[^.]*\./) || [''])[0] + ' »');
  await ctx.close();
}
{
  /* une matière sans examen daté n'est pas écartée : elle revient quand on la délaisse */
  const seed = Object.assign(
    revision([{date:'2026-11-14', m:{'Bioquímica': 600}}]),
    {'batcave-examens': {'Bioquímica':'2026-12-16'}});
  const {ctx, page, fr} = await ouvrir(seed, '2026-11-16T09:40:00+01:00');
  const p = await proposition(fr, page);
  ok(p.choisi !== 'Bioquímica', 'la seule matière datée est aussi la plus travaillée : une autre est proposée (' + p.choisi + ')');
  ok(/pas d’examen daté/.test(p.msg), 'et le motif ne prétend pas connaître une date : « ' + (p.msg.match(/Proposé :[^.]*\./) || [''])[0] + ' »');
  await ctx.close();
}

console.log('\n== 2) La boucle poids marche avec UNE pesée par lundi ==');
const L = lundis('2026-09-28', 8);              /* 8 lundis, du 28 sept. au 16 nov. */
{
  const {ctx, page, fr} = await ouvrir(pesees(L.map(iso => [iso, 64.0])), '2026-11-16T09:40:00+01:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="repas"]').click());
  await page.waitForTimeout(500);
  const k = await fr.evaluate(() => ({note: document.getElementById('kcal-note').innerText,
                                      txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' ')}));
  ok(/\+150 kcal/.test(k.note), 'huit lundis à 64,0 kg : stagnation → +150 kcal (' + k.note + ')');
  ok(/8 pesées étalées sur 49 jours/.test(k.txt), 'et la tendance dit sur quoi elle s’appuie : ' + (k.txt.match(/Tendance[^.]*/) || [''])[0]);
  await ctx.close();
}
{
  /* +0,23 kg par semaine, exactement le rythme visé */
  const {ctx, page, fr} = await ouvrir(pesees(L.map((iso, i) => [iso, Number((64.0 + 0.23*i).toFixed(2))])), '2026-11-16T09:40:00+01:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="repas"]').click());
  await page.waitForTimeout(500);
  const k = await fr.evaluate(() => ({note: document.getElementById('kcal-note').innerText,
                                      txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' ')}));
  ok(/rien à changer/.test(k.note), 'pile le rythme visé → on ne touche à rien (' + k.note + ')');
  ok(/Tendance : \+0,23 kg \/ semaine/.test(k.txt), 'la pente lue vaut bien +0,23 kg / semaine : ' + (k.txt.match(/Tendance[^.]*/) || [''])[0]);
  await ctx.close();
}
{
  /* +0,6 kg par semaine : trop vite */
  const {ctx, page, fr} = await ouvrir(pesees(L.map((iso, i) => [iso, Number((64.0 + 0.6*i).toFixed(2))])), '2026-11-16T09:40:00+01:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="repas"]').click());
  await page.waitForTimeout(500);
  const note = await fr.evaluate(() => document.getElementById('kcal-note').innerText);
  ok(/-100 kcal/.test(note), '+0,6 kg par semaine → retire 100 kcal (' + note + ')');
  await ctx.close();
}
{
  /* trois lundis seulement : pas de pente, et le message dit quoi faire */
  const {ctx, page, fr} = await ouvrir(pesees(lundis('2026-11-02', 3).map(iso => [iso, 64.0])), '2026-11-16T09:40:00+01:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="repas"]').click());
  await page.waitForTimeout(500);
  const k = await fr.evaluate(() => ({note: document.getElementById('kcal-note').innerText,
                                      txt: document.getElementById('kcal-analyse').innerText.replace(/\s+/g,' '),
                                      btn: document.getElementById('kcal-appliquer').hidden}));
  ok(/en attente de pesées/.test(k.note) && k.btn, 'trois lundis : rien n’est recommandé, le bouton reste masqué');
  ok(/au moins 4 pesées étalées sur 12 jours/.test(k.txt) && /3 pesées sur 14 jours/.test(k.txt), 'et il dit exactement ce qui manque : ' + (k.txt.match(/Il faut[^.]*\./) || [''])[0]);
  ok(/une pesée un dimanche sur deux/i.test(k.txt), 'en rappelant le protocole');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
