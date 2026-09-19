# -*- coding: utf-8 -*-
"""Paquet Anki « Batcave::Business » — UN SEUL paquet, deux sources.

Il y en avait deux, et c'etait un piege : business-batcave.apkg (249 cartes,
arborescence « Business:: », engendre depuis glossaire-dropshipping-anki.txt) et
anki/Batcave-Business.apkg (218 cartes, « Batcave::Business:: », lu directement
dans dossier-ecommerce.html). Ni l'un ni l'autre ne contenait l'autre : 162 cartes
communes, 87 propres au premier, 56 propres au second. Choisir l'un revenait donc
a perdre les cartes de l'autre -- la mecanique Shopify et la finance personnelle
d'un cote, la douane, le fisc espagnol et la conformite UE de l'autre.

Ce generateur les fond en un seul paquet de 305 cartes.

Deux sources, dans cet ordre de priorite :
  1. dossier-ecommerce.html -- la SOURCE VIVANTE. Un terme change dans le dossier
     change ici. C'est elle qui gagne quand un terme existe des deux cotes.
  2. glossaire-dropshipping-anki.txt -- le COMPLEMENT fige, pour les termes que le
     dossier ne porte pas (ou pas encore).

Les guid sont inchanges (« batcave-biz-<terme> ») : reimporter met a jour les
cartes deja revisees au lieu d'en creer des doubles.
Sortie : anki/Batcave-Business.apkg + anki/Batcave-Business.txt (secours)."""
import genanki, collections, html, io, json, re, os

DOMAINES = {
    'business': '01 Chiffres et unit economics',
    'produit':  '02 Produit et sourcing',
    'ops':      '03 Opérations et logistique',
    'douane':   '04 Douane et import',
    'ads':      '05 Publicité',
    'cro':      '06 Conversion',
    'email':    '07 E-mail et rétention',
    'gestion':  '08 Gestion et pilotage',
    'fiscal':   '09 Fiscalité',
    'legal':    '10 Juridique',
    'ia':       '11 IA et Claude',
    # les cinq domaines que seul le glossaire fige apporte
    'shopify':  '12 La plateforme Shopify',
    'finance':  '13 Finance et argent',
    'seo':      '14 Organique, SEO et créateurs',
    'service':  '15 Service client',
    'marque':   '16 Marque et positionnement',
}

# les vingt du chapitre 29, dans l'ordre des paliers
PRIORITAIRES = [
    'Prix hors taxes', 'COGS', 'Coût rendu', 'Marge brute', 'Coûts variables',
    'Marge de contribution', 'AOV', 'CPM', 'CTR', 'Taux de conversion',
    'CPA', 'CPA maximal', 'ROAS', "ROAS d'équilibre",
    'MER', 'Unit economics', 'Marge nette',
    'Valeur intrinsèque', 'IOSS', 'OSS',
]

MODEL = genanki.Model(
    1609431013, 'Batcave Glossaire v2',
    fields=[{'name': 'Terme'}, {'name': 'Definition'}, {'name': 'Theme'}],
    templates=[{
        'name': 'Terme → définition',
        'qfmt': '<div class="t">{{Terme}}</div><div class="th">{{Theme}}</div>',
        'afmt': '<div class="t">{{Terme}}</div><hr id="answer"><div class="d">{{Definition}}</div>',
    }],
    css=('.card{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:21px;'
         'text-align:center;color:#182029;background:#f5f7f4;padding:20px;line-height:1.5}'
         '.t{font-weight:600;font-size:26px;color:#123}'
         '.th{margin-top:10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a9aa3}'
         '.d{font-size:17px;text-align:left;max-width:34em;margin:0 auto;color:#2b3a45}'
         'hr#answer{border:none;border-top:1px solid #cfd8dc;margin:16px 0}'
         '@media (prefers-color-scheme: dark){.card{background:#12181d;color:#dfe7ec}'
         '.t{color:#eaf2f6}.d{color:#c6d3db}hr#answer{border-top-color:#2b3a45}}')
)

SRC = 'dossier-ecommerce.html'
s = io.open(SRC, encoding='utf-8').read()
G = json.loads(re.search(r'var G = (\[\[.*?\]\]);', s, re.S).group(1))

# ---- Source 2 : le glossaire fige, pour ce que le dossier ne porte pas ----
# Format tabule : terme, definition, etiquettes separees par des espaces. La
# premiere etiquette reconnue comme domaine donne le sous-paquet ; « business »
# est aussi une etiquette generale, donc on ne la retient qu'a defaut d'autre.
COMPLEMENT = 'glossaire-dropshipping-anki.txt'
vus_dossier = {t.lower() for t, _, _ in G}
ajouts, ignores = [], 0
for ligne in io.open(COMPLEMENT, encoding='utf-8'):
    ligne = ligne.rstrip('\n')
    if not ligne or ligne.startswith('#'):
        continue
    champs = ligne.split('\t')
    if len(champs) < 3:
        continue
    terme, definition, etiquettes = champs[0].strip(), champs[1].strip(), champs[2].split()
    if not terme or terme.lower() in vus_dossier:
        ignores += 1          # le dossier le porte deja : c'est LUI qui fait foi
        continue
    dom = next((e for e in etiquettes if e in DOMAINES and e != 'business'), None) \
          or next((e for e in etiquettes if e in DOMAINES), None)
    assert dom, 'terme sans domaine connu : %s (%s)' % (terme, etiquettes)
    vus_dossier.add(terme.lower())
    ajouts.append([terme, definition, dom])

G = G + ajouts

inconnus = sorted({d for _, _, d in G} - set(DOMAINES))
assert not inconnus, 'domaine sans sous-paquet : %s' % inconnus

def prioritaire(terme):
    t = terme.lower()
    return any(p.lower() in t for p in PRIORITAIRES)

DECKS = {}
for i, tag in enumerate(DOMAINES):
    DECKS[tag] = genanki.Deck(1958474200 + i, 'Batcave::Business::' + DOMAINES[tag])

vus, prio = set(), 0
for terme, definition, tag in G:
    cle = terme.lower()
    assert cle not in vus, 'doublon : ' + terme
    vus.add(cle)
    tags = {'business', tag}
    if prioritaire(terme):
        tags.add('prioritaire'); prio += 1
    DECKS[tag].add_note(genanki.Note(
        model=MODEL,
        fields=[html.escape(terme, quote=False), html.escape(definition, quote=False),
                DOMAINES[tag].split(' ', 1)[1]],
        tags=sorted(tags),
        guid=genanki.guid_for('batcave-biz-' + terme)))

os.makedirs('anki', exist_ok=True)
genanki.Package([DECKS[t] for t in DOMAINES]).write_to_file('anki/Batcave-Business.apkg')
with io.open('anki/Batcave-Business.txt', 'w', encoding='utf-8') as f:
    f.write('#separator:tab\n#html:true\n#tags column:3\n')
    for terme, definition, tag in G:
        t = 'business ' + tag + (' prioritaire' if prioritaire(terme) else '')
        f.write('%s\t%s\t%s\n' % (html.escape(terme, quote=False),
                                  html.escape(definition, quote=False), t))

cnt = collections.Counter(d for _, _, d in G)
print('cartes :', len(G), '(dossier %d + complément %d, %d doublons écartés) · dont prioritaires : %d'
      % (len(G) - len(ajouts), len(ajouts), ignores, prio))
for tag in DOMAINES:
    print('  %-38s %3d' % (DOMAINES[tag], cnt[tag]))
