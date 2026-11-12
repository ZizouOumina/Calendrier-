# Les pages « semaine jour par jour »

Ce dossier reconstruit les deux pages de la racine du dépôt, à l'octet près :

| Page | Générateur | Données lues | Gabarit |
| --- | --- | --- | --- |
| `semaine-du-9-novembre.html` (vendredi 13 → dimanche 15) | `build11.py` | `grille11.json` | `template11.html` |
| `semaine-du-16-novembre.html` (lundi 16 → dimanche 22) | `build16.py` | `semaine16.json` | `template16.html` |

```bash
python3 outils/semaine/build11.py
```

```bash
python3 outils/semaine/build16.py
```

Chaque générateur écrit sa page à la racine et un `dataNN.json` de contrôle dans ce dossier (non suivi).

## D'où viennent les données

Les grilles, les consignes, les grammes et la cible « au minuteur » sont **lus dans la Batcave**, jamais recopiés :
le serveur de test sert `tests/batcave.html`, et deux scripts en extraient les jours.

```bash
cd tests && bash sync.sh && (setsid nohup python3 -m http.server 8199 >/dev/null 2>&1 &)
```

```bash
cd tests && node zz-grilles.mjs 2026-11-13 3 ../outils/semaine/grille11.json 2026-11-12T16:00:00+01:00
```

```bash
cd tests && node zz-semaine.mjs ../outils/semaine/semaine16.json
```

`zz-grilles.mjs <début> <n jours> <sortie> [horloge]` sort la grille de chaque jour ; `zz-semaine.mjs <sortie>` sort
la semaine du 16 au 22 novembre (dates écrites dans le script). Pour une nouvelle semaine : copier `build16.py` et
`template16.html`, changer les dates dans la copie et dans `zz-semaine.mjs`, relire les textes écrits à la main
(les pas de chaque bloc, les « trois choses du jour »), puis comparer la page à la Batcave, bloc par bloc.

## Les autres scripts `tests/zz-*.mjs`

- `zz-scan.mjs <horloge> <début> <n>` : la consigne de chaque bloc de chaque jour ; signale tout ce qui n'est pas
  un texte propre (`[object`, `undefined`, `NaN`…) et liste les blocs sans consigne.
- `zz-audit.mjs <horloge> <sortie>` : le texte de tous les onglets, à une heure donnée.
- `zz-c.mjs <horloge> '<json>'` : quelques consignes, `[["libellé", jour 0-6, "AAAA-MM-JJ", "HH:MM"], …]`.
- `zz-habitudes.mjs <AAAA-MM-JJ> …` : les habitudes du jour telles que le tableau de bord les affiche, date par
  date (cycles compris : photos, ongles, brosse à dents) — à comparer aux « en plus aujourd'hui » des pages.
- `zz-rappels.mjs <horloge> <AAAA-MM-JJ> [motif]` : les événements d'agenda que la Batcave écrirait ce jour-là
  (titre, heures, description), pour les comparer à Google Agenda.
- `zz-g.mjs <AAAA-MM-JJ> …` : la grille de quelques jours (`TOUT=1` pour tous les blocs).
- `zz-cibles.mjs <lundi> [n]` et `zz-projets.mjs <lundi> [n]` : les cibles de révision et d'espagnol, et les heures
  de blocs « Projets perso », semaine par semaine.
- `zz-page.mjs <fichier> [horloge]` : une page autonome du dépôt à la largeur d'un téléphone (erreurs, débordement).
- `zz-rev.mjs [horloge]` : pour chaque jour du 9 au 16 novembre, les blocs de travail, leur type et la cible du jour.
- `zz-besoins.mjs <de> <à>` : ce que mangent ces jours, repas par repas, et le total par ingrédient (`BRUT=1` : le plan
  sans la viande de la première semaine) — la base de la liste de courses d'un départ.
- `zz-es.mjs <de> <à>` : les blocs « Español · … » de la grille entre deux dates, en minutes.
- `zz-pages.mjs [dossier]` : ouvre les deux pages semaine à la largeur d'un téléphone, signale les erreurs, affiche
  le haut de la page ; avec un dossier, y dépose une capture par page.
