# -*- coding: utf-8 -*-
"""Paquet Anki « Dentaire · Batcave » : les onze asignaturas de première année à Alicante,
un sous-paquet par matière, plus Errores et Vocabulario de clase.
Chaque sous-paquet arrive avec une carte de garde (à suspendre ou supprimer) qui rappelle
le nom officiel, l'étiquette et la commande du projet Claude. Les vraies cartes viennent des cours.
Sortie : dentaire-batcave.apkg"""
import genanki

# (étiquette, nom du sous-paquet, nom officiel complet)
MATIERES = [
    ('anatomia-1',      '01 Anatomía y fisiología I',      'Anatomía y fisiología del cuerpo humano I'),
    ('anatomia-2',      '02 Anatomía y fisiología II',     'Anatomía y fisiología del cuerpo humano II'),
    ('antropologia',    '03 Antropología e historia',      'Antropología e historia de la odontología'),
    ('biologia-celular','04 Biología celular y genética',  'Biología celular y genética humana'),
    ('bioquimica',      '05 Bioquímica',                   'Bioquímica'),
    ('documentacion',   '06 Documentación y metodología',  'Documentación e introducción a la metodología de la investigación en odontología'),
    ('epidemiologia',   '07 Epidemiología y bioestadística','Epidemiología, salud pública y bioestadística aplicada'),
    ('idioma',          '08 Idioma moderno',               'Idioma moderno'),
    ('clinica',         '09 Introducción a la clínica',    'Introducción a la clínica odontológica'),
    ('microbiologia',   '10 Microbiología e inmunología',  'Microbiología general e inmunología'),
    ('psicologia',      '11 Psicología y comunicación',    'Psicología y habilidades de comunicación'),
]
TRANSVERSES = [
    ('errores', '00 Errores',
     'Les erreurs d\'annales et les cartes ratées, une carte de correction par cause. '
     'Alimenté au bloc « Cartes d\'erreurs de la semaine », le samedi à 16:00. '
     'Étiquette : la matière plus <b>erreur</b> et la semaine, par exemple <b>bioquimica erreur s03</b>.'),
    ('vocabulario', '12 Vocabulario de clase',
     'Les quinze termes des slides préparés chaque jour au bloc « Español · preparar la clase », '
     'définition en espagnol, jamais de traduction française. Étiquette : <b>vocabulario</b> plus la matière.'),
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
         '.m{margin-top:10px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#8a9aa3}'
         '.a{font-size:18px;text-align:left;max-width:34em;margin:0 auto;color:#2b3a45}'
         'hr#answer{border:none;border-top:1px solid #cfd8dc;margin:16px 0}')
)

GARDE = ('Comment remplir ce paquet ?',
         '<b>{officiel}</b><br><br>'
         'Cartes produites par le projet Claude « Dentaire », commande <b>cartas</b> : format tabulé '
         'recto, verso, étiquette, une idée par carte, cloze pour les listes et les formules.<br><br>'
         'Étiquette de la matière : <b>{tag}</b>. Carte d\'erreur : <b>{tag} erreur s03</b>.<br><br>'
         'Le cours se fiche le soir au bloc « Comprendre le cours du jour », les cartes se créent '
         'le lendemain à 09:20 au bloc « Cartes du dernier cours ». En espagnol dès le 14 septembre.<br><br>'
         'Pense-bête : suspends ou supprime cette carte quand elle ne sert plus.')

decks = []
for i, (tag, nom, officiel) in enumerate(MATIERES):
    d = genanki.Deck(1958473300 + i, 'Dentaire::' + nom)
    d.add_note(genanki.Note(model=MODEL,
        fields=[GARDE[0], GARDE[1].format(tag=tag, officiel=officiel), officiel],
        tags=['dentaire', tag, 'garde'], guid=genanki.guid_for('batcave-dent2-' + tag)))
    decks.append(d)

for i, (tag, nom, quoi) in enumerate(TRANSVERSES):
    d = genanki.Deck(1958473340 + i, 'Dentaire::' + nom)
    d.add_note(genanki.Note(model=MODEL, fields=['À quoi sert ce paquet ?', quoi, nom.split(' ', 1)[1]],
        tags=['dentaire', tag, 'garde'], guid=genanki.guid_for('batcave-dent2-' + tag)))
    decks.append(d)

decks.sort(key=lambda d: d.name)
genanki.Package(decks).write_to_file('dentaire-batcave.apkg')
print('paquets :', len(decks))
for d in decks:
    print(' ', d.name)
