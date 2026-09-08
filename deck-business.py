# -*- coding: utf-8 -*-
"""Paquet Anki « Business · Batcave » : le glossaire e-commerce, Shopify et finance,
rangé en sous-paquets dans l'ordre du dossier dropshipping.
Source : glossaire-dropshipping-anki.txt (recto, verso, étiquette).
Sortie : business-batcave.apkg (import direct, un double-clic)."""
import genanki, collections

SOUS = [
    ('business',  '01 Chiffres et unit economics'),
    ('finance',   '02 Finance et argent'),
    ('produit',   '03 Produit et sourcing'),
    ('shopify',   '04 La plateforme Shopify'),
    ('ads',       '05 Publicité'),
    ('cro',       '06 Conversion'),
    ('seo',       '07 Organique, SEO et créateurs'),
    ('email',     '08 E-mail et rétention'),
    ('service',   '09 Service client'),
    ('marque',    '10 Marque et positionnement'),
    ('ops',       '11 Opérations et logistique'),
    ('gestion',   '12 Gestion et pilotage'),
    ('fiscal',    '13 Fiscalité'),
    ('legal',     '14 Juridique'),
    ('ia',        '15 IA et Claude'),
]

MODEL = genanki.Model(
    1609431012, 'Batcave Glossaire',
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
         'hr#answer{border:none;border-top:1px solid #cfd8dc;margin:16px 0}')
)

rows = []
for l in open('glossaire-dropshipping-anki.txt', encoding='utf-8'):
    if l.startswith('#') or not l.strip():
        continue
    p = l.rstrip('\n').split('\t')
    assert len(p) == 3, p
    rows.append(p)

noms = dict(SOUS)
manquants = {t for _, _, t in rows} - set(noms)
assert not manquants, manquants

DECKS = {}
for i, (tag, nom) in enumerate(SOUS):
    DECKS[tag] = genanki.Deck(1958473100 + i, 'Business::' + nom)

vus = set()
for terme, definition, tag in rows:
    assert terme.lower() not in vus, 'doublon: ' + terme
    vus.add(terme.lower())
    DECKS[tag].add_note(genanki.Note(
        model=MODEL,
        fields=[terme, definition, noms[tag].split(' ', 1)[1]],
        tags=sorted({'business', tag}),
        guid=genanki.guid_for('batcave-biz-' + terme)))

genanki.Package([DECKS[t] for t, _ in SOUS]).write_to_file('business-batcave.apkg')
cnt = collections.Counter(t for _, _, t in rows)
print('cartes :', len(rows))
for tag, nom in SOUS:
    print(' ', nom, cnt[tag])
