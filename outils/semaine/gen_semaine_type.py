#!/usr/bin/env python3
"""La semaine type, tâche par tâche : une page générée depuis le guide embarqué dans la Batcave."""
import json, re, html, sys, os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'batcave.html')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'semaine-type.html')
LUNDI = '2026-11-23'

s = open(SRC, encoding='utf-8').read()
G = json.loads(re.search(r'<script type="application/json" id="journees-guide">(.*?)</script>', s, re.S).group(1))
sem = next(x for x in G['semaines'] if x['cle'] == LUNDI)
e = lambda x: html.escape(str(x or ''), quote=True)

NOMS = {'etude': 'Révisions', 'esp': 'Espagnol', 'repas': 'Repas', 'soin': 'Soin', 'maison': 'Maison', 'foi': 'Prière',
        'rdv': 'À faire', 'cours': 'Cours', 'libre': 'Libre', 'sport': 'Sport', 'projet': 'Projet'}
ANCRES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

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
    prieres = ' · '.join(e(p[0]) + ' <b>' + e(p[1]) + '</b>' for p in j.get('prieres') or [])
    rows = ''.join(ligne(r) for r in j['rows'])
    jours.append(
        '<section class="jour" id="' + ANCRES[i] + '"><header class="jtete"><h2>' + e(j['jour']) + ' <span>' + str(j['num']) + ' ' + e(j['mois']) + '</span></h2>'
        '<p class="sous">' + str(len(j['rows'])) + ' lignes · ' + e(re.sub(r', comme le tableau de bord$', '', j.get('rattrapage') or '')) + '</p></header>'
        + (('<div class="bloc notes"><h3>À ne pas oublier</h3><ul>' + notes + '</ul></div>') if notes else '')
        + '<p class="prieres"><span>Prières</span> ' + prieres + '</p>'
        + '<ol class="fil">' + rows + '</ol>'
        + (('<div class="bloc cases"><h3>Les cases de ce jour, en plus de celles de tous les jours</h3><ul class="puces">' + cases + '</ul></div>') if cases else '')
        + '</section>')

chaque = ''.join('<li>' + e(x) + '</li>' for x in G['chaqueJour'])
mois = ''.join('<li>' + e(x) + '</li>' for x in G['mois'])
rare = ''.join('<li>' + e(x) + '</li>' for x in G['plusRare'])
SUIVI = [
    ('Les douleurs à la poitrine', 'Chaque épisode : le jour, l’heure, au repos ou à l’effort, la durée, ce que ça fait. C’est exactement ce que le médecin te demandera.', 'santé'),
    ('La fréquence cardiaque au repos', 'Au réveil, assis, 30 secondes au poignet, × 2. Elle baisse quand la forme monte et remonte avant une blessure ou une maladie.', 'santé'),
    ('La forme au réveil, de 1 à 5', 'Avec les courbatures. Avec le sommeil, c’est ce qui dit si la charge de la semaine passe.', 'santé'),
    ('Les douleurs d’articulations', 'Genou, épaule, coude, doigts : où, et de 0 à 10. Au JJB, une douleur qui dure deux semaines doit se voir.', 'santé'),
    ('La peau, une note chaque dimanche', 'De 0 à 3, et le nombre de nouveaux boutons, au moment des photos : le bilan du 14 février aura des chiffres.', 'soin'),
    ('Le fil dentaire', 'Une case, le soir. Le brossage est déjà dans chaque journée ; le fil est ce qu’on saute en premier.', 'soin'),
    ('L’heure du dernier café', 'La règle du sommeil dit « rien après 14:00 » : la noter montre si elle tient.', 'sommeil'),
    ('Le temps d’écran du téléphone', 'Le chiffre du jour, lu dans les réglages du téléphone à la clôture : le plus honnête des compteurs.', 'discipline'),
    ('Les repas hors plan', 'Combien dans la semaine, et lesquels. La balance et le tour de taille disent le résultat ; ça, ça dit pourquoi.', 'repas'),
    ('Le snus', 'Les sachets du jour, ton plafond, et rien après 19:00, si tu veux un suivi plutôt qu’un arrêt.', 'addictions'),
]
suivi = ''.join('<li><b>' + e(t) + '</b><span>' + e(d) + '</span><em>' + e(c) + '</em></li>' for t, d, c in SUIVI)
nav = ''.join('<a href="#' + a + '">' + a[:3] + '</a>' for a in ANCRES)

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
ul.suivi{list-style:none;padding:0;display:grid;gap:10px}
ul.suivi li{display:grid;gap:2px;border-top:1px solid var(--line);padding-top:8px}
ul.suivi span{color:var(--ink2);font-size:.92rem}
ul.suivi em{font:500 .68rem/1 var(--f-chiffre);text-transform:uppercase;letter-spacing:.08em;color:var(--accent);font-style:normal}
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
    <p class="intro">La semaine du lundi 23 au dimanche 29 novembre, telle que la Batcave et l’onglet « Ma journée » te la donnent : chaque tâche à son heure, dans l’ordre, avec tes vraies échéances (l’exposé de Biología mardi, les deux TP de mercredi et jeudi). Touche une ligne pour voir ses étapes. La semaine du 16 est la même, plus ce qui est propre au jour 1 ; à partir du 13 décembre, les blocs « Projets perso » passent à l’e-commerce. S’il manque quelque chose, dis-le-moi.</p>
  </header>
  <nav class="jours" aria-label="Les jours">''' + nav + '''<button type="button" id="tout" aria-pressed="false">Tout déplier</button></nav>
''' + '\n'.join(jours) + '''
  <section class="liste" id="tous-les-jours"><h2>Tous les jours, à cocher</h2><ul>''' + chaque + '''</ul></section>
  <section class="liste" id="chaque-mois"><h2>Une fois par mois</h2><ul>''' + mois + '''</ul></section>
  <section class="liste" id="plus-rarement"><h2>Plus rarement</h2><ul>''' + rare + '''</ul></section>
  <section class="liste" id="a-suivre"><h2>Ce que tu pourrais suivre en plus</h2>
    <p>Tu suis déjà le poids, la taille, les épaules, le sommeil, l’eau, l’humeur, les pas, les pages de Coran, Anki, l’espagnol et les Pomodoros. Voici ce qui manque encore, à ajouter si tu veux :</p>
    <ul class="suivi">''' + suivi + '''</ul></section>
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
