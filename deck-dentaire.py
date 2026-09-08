# -*- coding: utf-8 -*-
"""Paquet Anki « Dentaire · Batcave » : la structure des dix matières de première année,
un sous-paquet par asignatura, plus les sous-paquets d'erreurs.
Chaque sous-paquet arrive avec une carte de garde (suspendable) qui rappelle l'étiquette,
la commande du projet Claude et le format d'une carte. Les vraies cartes viennent de tes cours.
Sortie : dentaire-batcave.apkg"""
import genanki

MATIERES = [
    ('anatomia',                 '01 Anatomía humana',                'Anatomie humaine'),
    ('histologia',               '02 Histología',                     'Histologie'),
    ('biologia-celular',         '03 Biología celular y embriología', 'Biologie cellulaire et embryologie'),
    ('bioquimica',               '04 Bioquímica',                     'Biochimie'),
    ('fisiologia',               '05 Fisiología',                     'Physiologie'),
    ('microbiologia',            '06 Microbiología',                  'Microbiologie'),
    ('anatomia-dental',          '07 Anatomía dental',                'Anatomie dentaire'),
    ('materiales-dentales',      '08 Materiales dentales',            'Matériaux dentaires'),
    ('bioestadistica',           '09 Bioestadística y metodología',   'Biostatistique et méthodologie'),
    ('introduccion-odontologia', '10 Introducción a la odontología',  'Introduction à l\'odontologie'),
]
# Deux paquets transverses : les erreurs d'annales, et le vocabulaire espagnol des cours.
TRANSVERSES = [
    ('errores',   '00 Errores',   'Les erreurs d\'annales et de cartes ratées, une carte par cause, revues le samedi à 16:00.'),
    ('vocabulario', '11 Vocabulario de clase', 'Les quinze termes des slides préparés chaque jour au bloc « preparar la clase », définition en espagnol.'),
]

MODEL = genanki.Model(
    1609431013, 'Batcave Dentaire',
    fields=[{'name': 'Recto'}, {'name': 'Verso'}, {'name': 'Matiere'}],
    templates=[{
        'name': 'Recto → verso',
        'qfmt': '<div class="q">{{Recto}}</div><div class="m">{{Matiere}}</div>',
        'afmt': '<div class="q">{{Recto}}</div><hr id="answer"><div class="a">{{Verso}}</div>',
    }],
    css=('.card{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:21px;'
         'text-align:center;color:#182029;background:#f5f7f4;padding:20px;line-height:1.5}'
         '.q{font-weight:600;font-size:24px;color:#123}'
         '.m{margin-top:10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a9aa3}'
         '.a{font-size:18px;text-align:left;max-width:34em;margin:0 auto;color:#2b3a45}'
         'hr#answer{border:none;border-top:1px solid #cfd8dc;margin:16px 0}')
)

GARDE = ('Comment remplir ce paquet ?',
         'Cartes produites par le projet Claude « Dentaire », commande <b>cartas</b> : format tabulé '
         '<i>recto, verso, étiquette</i>, une idée par carte, cloze pour les listes et les formules.<br><br>'
         'Étiquette de la matière : <b>{tag}</b>. Pour une carte d\'erreur, ajoute <b>erreur</b> et la semaine, '
         'par exemple <b>{tag} erreur s03</b>.<br><br>'
         'Les cours se fichent le soir au bloc « Comprendre le cours du jour », les cartes se créent le lendemain '
         'à 09:20 au bloc « Cartes du dernier cours ». En espagnol à partir du 14 septembre.<br><br>'
         'Cette carte est un pense-bête : suspends-la ou supprime-la quand tu n\'en as plus besoin.')

decks = []
for i, (tag, nom, fr) in enumerate(MATIERES):
    d = genanki.Deck(1958473200 + i, 'Dentaire::' + nom)
    d.add_note(genanki.Note(model=MODEL, fields=[GARDE[0], GARDE[1].format(tag=tag), nom.split(' ', 1)[1] + ' · ' + fr],
                            tags=['dentaire', tag, 'garde'], guid=genanki.guid_for('batcave-dent-garde-' + tag)))
    decks.append(d)

for i, (tag, nom, quoi) in enumerate(TRANSVERSES):
    d = genanki.Deck(1958473230 + i, 'Dentaire::' + nom)
    d.add_note(genanki.Note(model=MODEL, fields=['À quoi sert ce paquet ?', quoi, nom.split(' ', 1)[1]],
                            tags=['dentaire', tag, 'garde'], guid=genanki.guid_for('batcave-dent-garde-' + tag)))
    decks.append(d)

# ordre d'affichage : 00 Errores en tête, puis les matières, puis le vocabulaire
decks.sort(key=lambda d: d.name)
genanki.Package(decks).write_to_file('dentaire-batcave.apkg')
print('paquets :', len(decks))
for d in decks:
    print(' ', d.name)
