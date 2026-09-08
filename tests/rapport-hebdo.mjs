/* Rapport hebdomadaire de la Batcave, sans ouvrir la page à la main.
   Entrée : les documents du cloud Batcave (collection « state », un fichier JSON par clé,
   tels que les écrit l'action read_db de l'outil Artifact avec out_dir), ou un export JSON
   de la Batcave (--seed). La Batcave est chargée dans Chromium avec ces données, à la date
   demandée, et le script en tire les neuf cartes Insights, les priorités, le bilan de la
   semaine et le prévu/réalisé de chaque jour. Sortie : rapport.html (courriel), rapport.md
   (Notion), rapport.json.

   node tests/rapport-hebdo.mjs --cloud /tmp/cloud [--asof 2026-09-07T00:05] [--out /tmp/rapport] [--dir tests]

   --asof : instant « vu par » la Batcave. Par défaut, le lundi 00:05 qui suit si on est
   dimanche, sinon maintenant : ainsi « semaine dernière » est la semaine qui vient de finir. */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => { if(x.startsWith('--')) a.push([x.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));
const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(args.dir || ICI);
const OUT = path.resolve(args.out || '/tmp/rapport');
const TZ = 'Europe/Madrid';
fs.mkdirSync(OUT, { recursive: true });

/* ---------- 1. données ---------- */
function chargerCloud(dir){
  const seed = {};
  const dossier = fs.existsSync(path.join(dir, 'state')) ? path.join(dir, 'state') : dir;
  for(const f of fs.readdirSync(dossier)){
    if(!f.endsWith('.json')) continue;
    const cle = f.slice(0, -5);
    let doc; try{ doc = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8')); }catch(e){ continue; }
    const v = doc && Object.prototype.hasOwnProperty.call(doc, 'v') ? doc.v : doc;
    if(/^batcave-archive-\d{4}-\d{2}$/.test(cle) && v && typeof v === 'object'){
      Object.keys(v).forEach(k => { if(seed[k] === undefined) seed[k] = v[k]; });
    } else seed[cle] = v;
  }
  return seed;
}
let seed;
if(args.seed) seed = JSON.parse(fs.readFileSync(path.resolve(args.seed), 'utf8'));
else if(args.cloud) seed = chargerCloud(path.resolve(args.cloud));
else { console.error('Donne --cloud <dossier> ou --seed <export.json>'); process.exit(2); }
console.log('clés chargées :', Object.keys(seed).length);

/* ---------- 2. instant de référence ---------- */
function partiesLocales(d){
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false, weekday:'short' });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return p;
}
function asofParDefaut(){
  const now = new Date(), p = partiesLocales(now);
  if(p.weekday === 'Sun'){
    const lendemain = new Date(now.getTime() + 86400000), q = partiesLocales(lendemain);
    return `${q.year}-${q.month}-${q.day}T00:05:00`;
  }
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00`;
}
const ASOF = args.asof && args.asof !== true ? String(args.asof) : asofParDefaut();
/* la date locale → instant absolu, via le décalage de Madrid à cette date */
function versInstant(localIso){
  const [d, t] = localIso.split('T');
  const guess = new Date(d + 'T' + (t || '00:00:00') + 'Z');
  const p = partiesLocales(guess);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  const offset = asUtc - guess.getTime();
  return new Date(guess.getTime() - offset);
}
const instant = versInstant(ASOF);
console.log('vu par la Batcave au', ASOF, '(' + TZ + ')');

/* ---------- 3. serveur statique ---------- */
function attendre(ms){ return new Promise(r => setTimeout(r, ms)); }
async function serveur(dir){
  const port = 8190 + Math.floor(Math.random() * 500);
  const p = spawn('npx', ['http-server', '-p', String(port), '-s', '-c-1', dir], { stdio: 'ignore', detached: false });
  for(let i = 0; i < 40; i++){
    await attendre(250);
    try{ const r = await fetch(`http://127.0.0.1:${port}/host.html`); if(r.ok) return { p, port }; }catch(e){}
  }
  p.kill(); throw new Error('http-server ne répond pas sur ' + port);
}
if(!fs.existsSync(path.join(DIR, 'batcave.html')) && fs.existsSync(path.join(DIR, 'sync.sh'))){
  await new Promise((res, rej) => { const s = spawn('bash', ['sync.sh'], { cwd: DIR, stdio: 'inherit' }); s.on('exit', c => c ? rej(new Error('sync.sh')) : res()); });
}
const { p: srv, port } = await serveur(DIR);

/* ---------- 4. la Batcave lit ses données ---------- */
const browser = await chromium.launch();
let data;
try{
  const ctx = await browser.newContext({ viewport:{width:1440, height:900}, timezoneId: TZ, locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = { use(){ return Promise.resolve(null); } }; });
  await ctx.addInitScript(x => { Object.keys(x).forEach(k => { try{ localStorage.setItem(k, JSON.stringify(x[k])); }catch(e){} }); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('  PAGEERROR: ' + e.message));
  await page.clock.install({ time: instant });
  await page.goto(`http://127.0.0.1:${port}/host.html`);
  await page.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout: 20000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(400);
  data = await fr.evaluate(() => {
    const ins = window.__bcInsights().map(i => ({ icon: i.icon, title: i.title, text: i.text, action: i.action || '', score: i.score, n: i.n || 0, page: i.page || '', tendance: i.tendance ? { txt: i.tendance.txt, sens: i.tendance.sens, bon: i.tendance.bon } : null, serie: i.serie && i.serie.v ? { v: i.serie.v, label: i.serie.label || '', unite: i.serie.unite || '', cible: i.serie.cible == null ? null : i.serie.cible } : null }));
    const vu = window.__bcInsightsVu ? window.__bcInsightsVu() : {};
    const prio = ins.filter(i => i.action && i.score >= 20 && !vu[i.title]).slice(0, 3);
    return { insights: ins, priorites: prio, semaine: window.__bcSemaine(-1), avant: window.__bcSemaine(-2) };
  });
  await ctx.close();
} finally {
  await browser.close();
  srv.kill();
}

/* ---------- 5. mise en forme ---------- */
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const dateFr = iso => { const d = new Date(iso + 'T12:00:00'); return d.getDate() + ' ' + MOIS[d.getMonth()]; };
const jourFr = iso => JOURS[new Date(iso + 'T12:00:00').getDay()];
const hmin = m => { m = Math.round(m || 0); if(m < 60) return m + ' min'; const r = m % 60; return Math.floor(m / 60) + ' h' + (r ? ' ' + String(r).padStart(2, '0') : ''); };
const virg = (x, d = 1) => Number(x || 0).toFixed(d).replace('.', ',');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const jours = data.semaine.jours;
const titreSemaine = `Semaine du ${dateFr(jours[0])} au ${dateFr(jours[6])}`;
const LIGNES = [
  ['revH', 'Révision', 'h', true], ['projH', 'Projets perso', 'h', true], ['fidelitePct', 'Fidélité au plan', '%', true],
  ['habitPct', 'Habitudes tenues', '%', true], ['sleepH', 'Sommeil par nuit', 'h', true], ['waterL', 'Eau par jour', 'L', true],
  ['kcalPct', 'Nutrition par jour', '%', true], ['sportPct', 'Séances tenues', '%', true], ['dep', 'Dépenses variables', '€', false]
];
const stats = data.semaine.stats, avant = data.avant.stats;
const cle = (o, k) => { if(o[k] !== undefined) return o[k]; const alt = Object.keys(o).find(x => x.toLowerCase() === k.toLowerCase() || (k === 'fidelitePct' && /fidel/i.test(x))); return alt ? o[alt] : undefined; };
const lignesBilan = LIGNES.map(([k, label, u, plusEstMieux]) => {
  const c = cle(stats, k), a = cle(avant, k);
  if(c === undefined) return null;
  const dec = u === '%' || u === '€' ? 0 : 1;
  const delta = (a === undefined || a === null) ? null : c - a;
  const sens = delta === null || Math.abs(delta) < (u === 'h' || u === 'L' ? 0.05 : 0.5) ? 'stable' : (delta > 0 ? 'hausse' : 'baisse');
  const bon = sens === 'stable' ? null : ((delta > 0) === plusEstMieux);
  const vide = !(Number(c) > 0) && !(Number(a) > 0);
  return { label, valeur: vide ? '—' : virg(c, dec) + ' ' + u, avant: a === undefined || a === null || vide ? '' : virg(a, dec) + ' ' + u, delta: delta === null || vide ? '' : (delta >= 0 ? '+' : '−') + virg(Math.abs(delta), dec) + ' ' + u, sens: vide ? 'stable' : sens, bon: vide ? null : bon };
}).filter(Boolean);
const totalPrevu = data.semaine.parJour.reduce((s, j) => s + j.prevu, 0), totalFait = data.semaine.parJour.reduce((s, j) => s + j.rev + j.proj, 0);
const joursSuivis = data.semaine.parJour.filter(j => j.rev + j.proj > 0).length;
const rien = joursSuivis === 0 && !lignesBilan.some(l => /[1-9]/.test(l.valeur));

const C = { fond:'#f5f7f9', carte:'#ffffff', ink:'#141c24', dim:'#5b6b78', bord:'#dfe5ea', accent:'#0e7c8c', bon:'#2e8b57', warn:'#b8651b', faint:'#8a98a3' };
const fleche = t => !t ? '' : (t.sens === 'up' ? '↗' : t.sens === 'down' ? '↘' : '→') + ' ' + t.txt;
const couleurT = t => !t || t.bon === null ? C.faint : (t.bon ? C.bon : C.warn);
function sparkHtml(serie){
  if(!serie || !serie.v || serie.v.filter(x => typeof x === 'number').length < 3) return '';
  const v = serie.v.filter(x => typeof x === 'number'); const W = 240, H = 40, p = 4;
  const tous = v.slice(); if(serie.cible != null) tous.push(serie.cible);
  let min = Math.min(...tous), max = Math.max(...tous); if(max - min < 1e-9){ max = min + 1; min = min - 1; }
  const x = i => p + i * (W - 2 * p) / (v.length - 1), y = val => H - p - (val - min) * (H - 2 * p) / (max - min);
  const pts = v.map((val, i) => x(i).toFixed(1) + ',' + y(val).toFixed(1)).join(' ');
  const cible = serie.cible != null ? `<line x1="${p}" x2="${W - p}" y1="${y(serie.cible).toFixed(1)}" y2="${y(serie.cible).toFixed(1)}" stroke="${C.faint}" stroke-dasharray="3 3" stroke-width="1"/>` : '';
  return `<svg width="240" height="40" viewBox="0 0 ${W} ${H}" style="display:block; margin:8px 0 2px;">${cible}<polyline points="${pts}" fill="none" stroke="${C.accent}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${x(v.length - 1).toFixed(1)}" cy="${y(v[v.length - 1]).toFixed(1)}" r="2.6" fill="${C.accent}"/></svg><div style="font:11px monospace; color:${C.faint};">${esc(serie.label)} · ${virg(Math.min(...v))} → ${virg(Math.max(...v))} ${esc(serie.unite)}${serie.cible != null ? ' · cible ' + virg(serie.cible) + ' ' + esc(serie.unite) : ''}</div>`;
}
const carteHtml = it => `
<div style="background:${C.carte}; border:1px solid ${C.bord}; border-radius:10px; padding:16px 18px; margin:0 0 12px;">
  <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
    <div style="font-size:16px; font-weight:600; color:${C.ink};">${it.icon} ${esc(it.title)}</div>
    ${it.tendance ? `<div style="font:11px monospace; color:${couleurT(it.tendance)}; white-space:nowrap;">${esc(fleche(it.tendance))}</div>` : ''}
  </div>
  <p style="margin:6px 0 0; font-size:14px; line-height:1.5; color:${C.dim};">${esc(it.text)}</p>
  ${sparkHtml(it.serie)}
  ${it.action ? `<div style="margin-top:10px; padding:8px 12px; border-left:3px solid ${C.accent}; background:${C.fond}; font-size:13px; line-height:1.5; color:${C.ink};"><b style="color:${C.accent}; font:11px monospace; letter-spacing:.1em;">ACTION</b> ${esc(it.action)}</div>` : ''}
  <div style="margin-top:8px; font:11px monospace; color:${C.faint};">${it.n ? it.n + (it.n > 1 ? ' points de données' : ' point de données') : 'pas encore de données'}</div>
</div>`;
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Batcave · ${esc(titreSemaine)}</title></head>
<body style="margin:0; background:${C.fond}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; color:${C.ink};">
<div style="max-width:640px; margin:0 auto; padding:24px 16px 40px;">
  <div style="font:11px monospace; letter-spacing:.16em; color:${C.accent}; text-transform:uppercase;">🦇 La Batcave · bilan du dimanche</div>
  <h1 style="margin:6px 0 4px; font-size:26px; line-height:1.15;">${esc(titreSemaine)}</h1>
  <div style="font-size:13px; color:${C.dim}; margin-bottom:18px;">${joursSuivis} jour${joursSuivis > 1 ? 's' : ''} avec du travail enregistré · ${hmin(totalFait)} faites sur ${hmin(totalPrevu)} prévues${rien ? ' · aucune donnée cette semaine : la Batcave n\'a rien reçu (clôture du soir, Pomodoro, calendrier coché)' : ''}</div>
  ${data.priorites.length ? `<div style="background:${C.carte}; border:1px solid ${C.bord}; border-left:4px solid ${C.accent}; border-radius:10px; padding:14px 18px; margin-bottom:18px;">
    <div style="font-size:15px; font-weight:600; margin-bottom:6px;">🔎 Priorités de la semaine</div>
    <ol style="margin:0; padding-left:20px; font-size:14px; line-height:1.5; color:${C.ink};">${data.priorites.map(p => `<li style="margin:4px 0;"><b>${esc(p.title)}</b> — ${esc(p.action)}</li>`).join('')}</ol>
  </div>` : `<div style="font-size:13px; color:${C.dim}; margin-bottom:18px;">Aucune priorité à remonter cette semaine.</div>`}
  <h2 style="font-size:17px; margin:18px 0 8px;">Bilan de la semaine</h2>
  <table style="width:100%; border-collapse:collapse; background:${C.carte}; border:1px solid ${C.bord}; border-radius:10px; font-size:13.5px;">
    <tr style="color:${C.faint}; font:11px monospace;"><td style="padding:8px 12px;">mesure</td><td style="padding:8px 12px; text-align:right;">cette semaine</td><td style="padding:8px 12px; text-align:right;">semaine d'avant</td><td style="padding:8px 12px; text-align:right;">écart</td></tr>
    ${lignesBilan.map(l => `<tr style="border-top:1px solid ${C.bord};"><td style="padding:8px 12px;">${esc(l.label)}</td><td style="padding:8px 12px; text-align:right; font-weight:600;">${esc(l.valeur)}</td><td style="padding:8px 12px; text-align:right; color:${C.dim};">${esc(l.avant)}</td><td style="padding:8px 12px; text-align:right; color:${l.bon === null ? C.faint : (l.bon ? C.bon : C.warn)};">${esc(l.delta || '·')}</td></tr>`).join('')}
  </table>
  <table style="width:100%; border-collapse:collapse; margin-top:10px; font:12px monospace; color:${C.dim};">
    <tr>${data.semaine.parJour.map(j => `<td style="text-align:center; padding:4px 0;">${jourFr(j.iso)}</td>`).join('')}</tr>
    <tr>${data.semaine.parJour.map(j => `<td style="text-align:center; padding:2px 0; color:${j.rev + j.proj >= j.prevu * 0.7 ? C.bon : (j.rev + j.proj > 0 ? C.warn : C.faint)}; font-weight:600;">${virg((j.rev + j.proj) / 60)}</td>`).join('')}</tr>
    <tr>${data.semaine.parJour.map(j => `<td style="text-align:center; padding:2px 0; color:${C.faint};">/ ${virg(j.prevu / 60)} h</td>`).join('')}</tr>
  </table>
  <h2 style="font-size:17px; margin:22px 0 10px;">Les neuf cartes</h2>
  ${data.insights.map(carteHtml).join('')}
  <div style="margin-top:22px; font:11px monospace; color:${C.faint}; line-height:1.6;">Généré par la Batcave depuis ton cloud, sans intervention. Les actions sont des propositions : c'est toi qui décides. Pour mettre une priorité en pause sept jours, ouvre l'onglet Insights et appuie sur « Vu ».</div>
</div></body></html>`;

const md = [
  `**${titreSemaine}** · ${joursSuivis} jour${joursSuivis > 1 ? 's' : ''} avec du travail enregistré · ${hmin(totalFait)} faites sur ${hmin(totalPrevu)} prévues`,
  '',
  '## 🔎 Priorités de la semaine',
  data.priorites.length ? data.priorites.map((p, i) => `${i + 1}. **${p.title}** — ${p.action}`).join('\n') : 'Aucune priorité à remonter cette semaine.',
  '',
  '## Bilan de la semaine',
  '| Mesure | Cette semaine | Semaine d\'avant | Écart |', '|---|---|---|---|',
  ...lignesBilan.map(l => `| ${l.label} | ${l.valeur} | ${l.avant} | ${l.delta || '·'} |`),
  '',
  '| ' + data.semaine.parJour.map(j => jourFr(j.iso)).join(' | ') + ' |',
  '|' + data.semaine.parJour.map(() => '---').join('|') + '|',
  '| ' + data.semaine.parJour.map(j => `${virg((j.rev + j.proj) / 60)} / ${virg(j.prevu / 60)} h`).join(' | ') + ' |',
  '',
  '## Les neuf cartes',
  ...data.insights.map(it => [`### ${it.icon} ${it.title}${it.tendance ? ' · ' + fleche(it.tendance) : ''}`, it.text, it.action ? `> **Action** — ${it.action}` : '', `_${it.n ? it.n + ' points de données' : 'pas encore de données'}_`, ''].join('\n')),
  '_Généré par la Batcave depuis ton cloud. Les actions sont des propositions._'
].join('\n');

fs.writeFileSync(path.join(OUT, 'rapport.html'), html);
fs.writeFileSync(path.join(OUT, 'rapport.md'), md);
fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify({ asof: ASOF, titre: titreSemaine, sujet: `🦇 Batcave · ${titreSemaine}`, priorites: data.priorites, bilan: lignesBilan, parJour: data.semaine.parJour, insights: data.insights }, null, 2));
fs.writeFileSync(path.join(OUT, 'sujet.txt'), `🦇 Batcave · ${titreSemaine}`);
console.log('rapport écrit dans', OUT, '·', data.priorites.length, 'priorités ·', data.insights.length, 'cartes ·', lignesBilan.length, 'lignes de bilan');
