#!/usr/bin/env python3
"""La semaine type, tâche par tâche : une page générée depuis le guide embarqué dans la Batcave."""
import json, re, html, sys, os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'batcave.html')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'semaine-type.html')
LUNDI = '2026-11-30'   # 24 novembre : la semaine du 23 part du mardi (le jour 1) -- la semaine type est la premiere entiere

s = open(SRC, encoding='utf-8').read()
G = json.loads(re.search(r'<script type="application/json" id="journees-guide">(.*?)</script>', s, re.S).group(1))
sem = next(x for x in G['semaines'] if x['cle'] == LUNDI)
e = lambda x: html.escape(str(x or ''), quote=True)

NOMS = {'etude': 'Révisions', 'esp': 'Espagnol', 'repas': 'Repas', 'soin': 'Soin', 'maison': 'Maison', 'foi': 'Prière',
        'rdv': 'À faire', 'cours': 'Cours', 'libre': 'Libre', 'sport': 'Sport', 'projet': 'Projet'}

def ligne(r):
    k = r['k'] if r['k'] in NOMS else 'libre'
    heure = e(r['t']) + ('<small>→ ' + e(r['fin']) + '</small>' if r.get('fin') else '')
    detail = ''
    if r.get('d'): detail += '<p>' + e(r['d']) + '</p>'
    if r.get('pas'): detail += '<ol>' + ''.join('<li>' + e(p) + '</li>' for p in r['pas']) + '</ol>'
    tete = ('<span class="h">' + heure + '</span><span class="k k-' + k + '">' + NOMS[k] + '</span>'
            '<span class="t">' + e(r['titre']) + '</span>')
    if r.get('en') or not detail:
        return '<li class="row' + (' pause' if r.get('en') else '') + '"><div class="sum">' + tete + '</div>' + (('<div class="det">' + detail + '</div>') if detail else '') + '</li>'
    return '<li class="row"><details><summary class="sum">' + tete + '</summary><div class="det">' + detail + '</div></details></li>'

jours = []
for i, j in enumerate(sem['jours']):
    notes = ''.join('<li>' + e(n) + '</li>' for n in j.get('notes') or [])
    cases = ''.join('<li>' + e(c) + '</li>' for c in j.get('enPlus') or [])
    routine = ''.join('<li>' + e(c) + '</li>' for c in j.get('routine') or [])   # 16 novembre : la routine a sa liste ; 17 novembre : elle se coche aussi
    prieres = ' · '.join(e(p[0]) + ' <b>' + e(p[1]) + '</b>' for p in j.get('prieres') or [])
    rows = ''.join(ligne(r) for r in j['rows'])
    jours.append(
        '<section class="jour" id="' + e(j['jour'].lower()) + '"><header class="jtete"><h2>' + e(j['jour']) + ' <span>' + str(j['num']) + ' ' + e(j['mois']) + '</span></h2>'
        '<p class="sous">' + str(len(j['rows'])) + ' lignes · ' + e(re.sub(r', comme le tableau de bord$', '', j.get('rattrapage') or '')) + '</p></header>'
        + (('<div class="bloc notes"><h3>À ne pas oublier</h3><ul>' + notes + '</ul></div>') if notes else '')
        + '<p class="prieres"><span>Prières</span> ' + prieres + '</p>'
        + '<ol class="fil">' + rows + '</ol>'
        + (('<div class="bloc cases"><h3>À cocher dans « Ma journée », en plus de tous les jours</h3><ul class="puces">' + cases + '</ul></div>') if cases else '')
        + (('<div class="bloc cases"><h3>La routine du jour, à cocher aussi</h3><ul class="puces">' + routine + '</ul></div>') if routine else '')
        + '</section>')

chaque = ''.join('<li>' + e(x) + '</li>' for x in G['chaqueJour'])
mois = ''.join('<li>' + e(x) + '</li>' for x in G['mois'])
rare = ''.join('<li>' + e(x) + '</li>' for x in G['plusRare'])
# l'ancre suit le nom du jour, et la barre ne montre que les jours de la page : une semaine partielle ne casse plus rien
nav = ''.join('<a href="#' + e(j['jour'].lower()) + '">' + e(j['jour'].lower()[:3]) + '</a>' for j in sem['jours'])

page = '''<title>Ta semaine type</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* Un carnet de bord : sept jours empilés, une ligne par tâche, l'heure en marge ; la couleur dit le domaine, rien d'autre. */
:root{
  --bg:#eef1f3; --paper:#fbfcfc; --ink:#17212b; --ink2:#53616e; --line:#d4dbe1; --accent:#2a5d8f;
  --c-etude:#3b6fb6; --c-esp:#b0457a; --c-repas:#b8741a; --c-soin:#2f8a7a; --c-maison:#7a6a3a; --c-foi:#6b5bb5;
  --c-rdv:#c0392b; --c-cours:#3d7d3d; --c-libre:#8a949e; --c-sport:#c25b21; --c-projet:#4c6e8e;
  --f-titre:"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;
  --f-texte:"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif;
  --f-chiffre:"JetBrains Mono", ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --bg:#0f151b; --paper:#161e26; --ink:#e6ecf1; --ink2:#a1adb8; --line:#2a3542; --accent:#7fb2e5;
  --c-etude:#7ea8e6; --c-esp:#e48bb7; --c-repas:#e2a85a; --c-soin:#6cc7b5; --c-maison:#c9b67e; --c-foi:#a99ae8;
  --c-rdv:#f08a7e; --c-cours:#86c486; --c-libre:#97a3ae; --c-sport:#f0915a; --c-projet:#8db0d0; color-scheme:dark } }
:root[data-theme="dark"]{
  --bg:#0f151b; --paper:#161e26; --ink:#e6ecf1; --ink2:#a1adb8; --line:#2a3542; --accent:#7fb2e5;
  --c-etude:#7ea8e6; --c-esp:#e48bb7; --c-repas:#e2a85a; --c-soin:#6cc7b5; --c-maison:#c9b67e; --c-foi:#a99ae8;
  --c-rdv:#f08a7e; --c-cours:#86c486; --c-libre:#97a3ae; --c-sport:#f0915a; --c-projet:#8db0d0; color-scheme:dark }
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:16px/1.5 var(--f-texte);margin:0}
.wrap{max-width:860px;margin:0 auto;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px));padding-block:28px 64px;display:grid;gap:22px}
h1,h2,h3{font-family:var(--f-titre);margin:0;text-wrap:balance}
h1{font-size:clamp(2rem,6vw,2.9rem);font-weight:800;line-height:1.05}
.intro{color:var(--ink2);max-width:62ch;margin:8px 0 0}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top, 0px);z-index:10;background:var(--bg)}
nav.jours{position:sticky;top:env(safe-area-inset-top, 0px);z-index:5;background:var(--bg);display:flex;gap:6px;flex-wrap:wrap;padding-block:8px;align-items:center}
nav.jours a{font:500 .8rem/1 var(--f-chiffre);text-transform:uppercase;letter-spacing:.06em;color:var(--ink);text-decoration:none;border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:7px 11px}
nav.jours a:hover,nav.jours a:focus-visible{border-color:var(--accent);color:var(--accent);outline:none}
nav.jours button{margin-left:auto;font:600 .8rem/1 var(--f-texte);border:1px solid var(--accent);color:var(--accent);background:transparent;border-radius:999px;padding:7px 12px;cursor:pointer}
nav.jours button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.jour{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:16px;display:grid;gap:12px;scroll-margin-top:calc(env(safe-area-inset-top, 0px) + 56px);min-width:0}
.jtete h2{font-size:1.55rem;font-weight:800}
.jtete h2 span{font-weight:600;color:var(--ink2)}
.sous{margin:2px 0 0;color:var(--ink2);font-size:.88rem}
.bloc h3{font-size:.95rem;margin-bottom:6px}
.notes{border-left:3px solid var(--accent);padding-left:12px}
.notes ul{margin:0;padding-left:18px;display:grid;gap:3px;font-size:.93rem}
.prieres{margin:0;font-size:.86rem;color:var(--ink2)}
.prieres span{font:500 .72rem/1 var(--f-chiffre);text-transform:uppercase;letter-spacing:.08em;color:var(--c-foi);margin-right:4px}
.prieres b{font-family:var(--f-chiffre);font-weight:500;color:var(--ink)}
ol.fil{list-style:none;margin:0;padding:0;display:grid;border-top:1px solid var(--line)}
.row{border-bottom:1px solid var(--line);min-width:0}
.sum{display:grid;grid-template-columns:4.6rem 5.4rem minmax(0,1fr);gap:8px;align-items:baseline;padding:8px 2px;list-style:none}
summary.sum{cursor:pointer}
summary.sum::-webkit-details-marker{display:none}
summary.sum .t::after{content:" ＋";color:var(--ink2);font-weight:400}
details[open] summary.sum .t::after{content:" －"}
summary.sum:focus-visible{outline:2px solid var(--accent);outline-offset:1px;border-radius:4px}
.h{font:500 .86rem/1.3 var(--f-chiffre);font-variant-numeric:tabular-nums}
.h small{display:block;color:var(--ink2);font-size:.74rem}
.k{font:500 .66rem/1.2 var(--f-chiffre);text-transform:uppercase;letter-spacing:.06em;color:var(--kc);white-space:nowrap}
.k::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--kc);margin-right:5px;vertical-align:1px}
.k-etude{--kc:var(--c-etude)}.k-esp{--kc:var(--c-esp)}.k-repas{--kc:var(--c-repas)}.k-soin{--kc:var(--c-soin)}.k-maison{--kc:var(--c-maison)}
.k-foi{--kc:var(--c-foi)}.k-rdv{--kc:var(--c-rdv)}.k-cours{--kc:var(--c-cours)}.k-libre{--kc:var(--c-libre)}.k-sport{--kc:var(--c-sport)}.k-projet{--kc:var(--c-projet)}
.t{font-weight:700;min-width:0;overflow-wrap:anywhere}
.pause .t{font-weight:400;color:var(--ink2)}
.det{padding:0 2px 10px calc(4.6rem + 8px);color:var(--ink2);font-size:.92rem;min-width:0}
.det p{margin:0 0 6px}
.det ol{margin:0;padding-left:18px;display:grid;gap:3px}
.pause .det{padding-top:0}
.cases ul.puces{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}
.cases li{font-size:.84rem;border:1px solid var(--line);border-radius:999px;padding:3px 10px;background:var(--bg)}
.liste{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:16px;display:grid;gap:8px;min-width:0}
.liste h2{font-size:1.3rem;font-weight:800}
.liste ul{margin:0;padding-left:18px;display:grid;gap:4px}
.liste p{margin:0;color:var(--ink2);max-width:62ch}
@media (max-width:520px){
  .sum{grid-template-columns:3.9rem minmax(0,1fr);row-gap:2px}
  .sum .k{grid-column:2}
  .sum .t{grid-column:2}
  .det{padding-left:calc(3.9rem + 8px)}
}
@media (prefers-reduced-motion: reduce){ html{scroll-behavior:auto} }
html{scroll-behavior:smooth}
</style>
<div class="wrap">
  <header>
    <h1>Ta semaine type</h1>
    <p class="intro">La semaine du lundi 30 novembre au dimanche 6 décembre, la première semaine entière du programme, telle que la Batcave et l’onglet « Ma journée » te la donnent : chaque tâche à son heure, dans l’ordre, avec tes vraies échéances (les Problemas de Genética mardi, les Láminas et le Q3 d’Anatomía mercredi, le Q3 d’Antropología vendredi, chacun préparé la veille au soir). Touche une ligne pour voir ses étapes. Le JJB reprend cette semaine-là : mercredi et vendredi à 10:30, à la place du bloc de 10:20, et le lundi s’y ajoute dès le 7 décembre. À partir du jeudi 24 décembre, les blocs « Projets perso » passent à l’e-commerce. S’il manque quelque chose, dis-le-moi.</p>
  </header>
  <nav class="jours" aria-label="Les jours">''' + nav + '''<button type="button" id="tout" aria-pressed="false">Tout déplier</button></nav>
''' + '\n'.join(jours) + '''
  <section class="liste" id="tous-les-jours"><h2>Tous les jours, à cocher dans « Ma journée »</h2><ul>''' + chaque + '''</ul></section>
  <section class="liste" id="chaque-mois"><h2>Une fois par mois</h2><ul>''' + mois + '''</ul></section>
  <section class="liste" id="plus-rarement"><h2>Plus rarement</h2><ul>''' + rare + '''</ul></section>
</div>
<script>
(function(){
  var b = document.getElementById('tout'); if(!b) return;
  b.addEventListener('click', function(){
    var ouvrir = b.getAttribute('aria-pressed') !== 'true';
    document.querySelectorAll('ol.fil details').forEach(function(d){ d.open = ouvrir; });
    b.setAttribute('aria-pressed', ouvrir ? 'true' : 'false');
    b.textContent = ouvrir ? 'Tout replier' : 'Tout déplier';
  });
})();
</script>
'''
open(OUT, 'w', encoding='utf-8').write(page)
print('écrit', OUT, len(page), 'octets ·', sum(len(j['rows']) for j in sem['jours']), 'lignes')
