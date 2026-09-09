# -*- coding: utf-8 -*-
"""Paquet Anki « Batcave::Business » : le glossaire du dossier e-commerce, lu
DIRECTEMENT dans dossier-ecommerce.html — donc toujours en phase avec lui.
Les vingt termes du chapitre 29 portent l'etiquette « prioritaire » : ce sont
ceux qui portent tous les autres, et Anki doit les remonter en premier.
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
print('cartes :', len(G), '· dont prioritaires :', prio)
for tag in DOMAINES:
    print('  %-38s %3d' % (DOMAINES[tag], cnt[tag]))
