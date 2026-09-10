# La Batcave

Application personnelle en un seul fichier : `batcave.html` (aucune dépendance à installer, s'ouvre dans un navigateur).
La version publiée vit sur claude.ai (Artifact) avec synchronisation cloud et connecteurs ; ce dépôt est la copie de référence du code.

- `batcave.html` — l'application complète (HTML + CSS + JS).
- `maquette-batcomputer.html` — la maquette statique du tableau de bord Batcomputer.
- `tests/` — campagne Playwright (`test*.mjs`), audit d'affichage (`audit.mjs`), page hôte et scripts.
- `tests/saisir.mjs` — le pilote de la saisie du sport au pas (boutons + et −), partagé par les tests qui enregistrent une séance.
- `tests/jeu-180.mjs` — jeu de données déterministe de 180 jours (journal, repas, sport, sessions, habitudes, budget, business), rejoué par `test67.mjs` avant chaque publication : chargement, insights, douze onglets sur iPhone.
- `guide-anki.html` — la méthode Anki pour le dentaire (une carte = une chose à récupérer, trois formats, séance de fabrication en trois passes, huit erreurs, réglages des trois paquets) ; page autonome, publiée aussi en Artifact.
- `tests/qa-shots.mjs`, `tests/qa-shots2.mjs` — parcours visuel : chaque onglet photographié avec un jeu de données réaliste (images dans `/tmp/qa/`).
- `tests/rapport-hebdo.mjs` — le bilan du dimanche sans ouvrir la page : charge la Batcave dans Chromium avec les documents du cloud (`--cloud <dossier>`, un JSON par clé, tels que les écrit l'action `read_db` de l'outil Artifact) ou un export (`--seed`), et produit `rapport.html` (courriel), `rapport.md` (Notion) et `rapport.json`. Depuis le lot 20 il inclut la phase en cours, les objectifs du mois avec leur statut, les blocs sans Pomodoro de la semaine, les habitudes acquises, les cours Notion pas faits, les jours de vacances ou exclus, l'exercice de restauration et la fin de saison. Une Routine hebdomadaire l'exécute le dimanche soir et envoie le résultat.
- `dossier-dropshipping.html` — le dossier de formation dropshipping (programme 12 semaines, ads, gestion, fiscalité, exercices corrigés, auto-tests, glossaire) ; page autonome, publiée aussi en Artifact.
- `dossier-espagnol.html` — le Dossier Español (du zéro au C1 : phases dès le 14 septembre, jour 1, grille, grammaire A1→C1 en check-list, lexiques, formules, compétences, examens, pièges, outils, mesures) ; page autonome, publiée aussi en Artifact.
- `dentaire-batcave.apkg` — la structure du paquet Anki « Dentaire » : douze sous-paquets (dix matières de première année, plus Errores et Vocabulario de clase), chacun avec une carte de garde rappelant l'étiquette et la commande du projet Claude ; `deck-dentaire.py` le générateur.
- `business-batcave.apkg` — le paquet Anki « Business · Batcave » : les 249 cartes du glossaire en quinze sous-paquets numérotés dans l'ordre du dossier (chiffres, finance, produit, plateforme Shopify, publicité, conversion, organique, e-mail, service, marque, opérations, gestion, fiscalité, juridique, IA) ; `deck-business.py` le générateur.
- `glossaire-dropshipping-anki.txt` — les mêmes 249 cartes au format d'import texte (séparateur tabulation, 3e colonne en étiquettes) : chiffres, finance, produit, plateforme Shopify, publicité, conversion, organique, e-mail, service, marque, opérations, gestion, fiscalité, juridique, IA.
- `dossier-espagnol.html` — le Dossier Español (du zéro au C1 : phases dès le 14 septembre, jour 1, grille, grammaire en check-list, lexiques, examens, pièges, outils, mesures) ; page autonome, publiée aussi en Artifact.
- `reflexion-batcave-v2.html` — le deuxième dossier de réflexion sur la Batcave (état au 8 septembre, diagnostic, modèle de maturité, vingt propositions, ordre, questions) ; page autonome, publiée aussi en Artifact.
- `programme-alimentation.md`, `programme-sport.md` — copies de référence du plan alimentaire (prises, rotation, boucle poids → calories, courses, et depuis le lot 29 la section « Santé intestinale » : montée en charge des fibres et du lactose sur trois semaines, six suspects du ballonnement, protocole de test une variable à la fois, signes qui imposent un avis médical) et du programme de sport v2 (quatre séances, abdos lestés à chaque séance, cou en flexion et extension le lundi et le jeudi et en inclinaison latérale le mardi, trapèzes le jeudi et le samedi, échauffements, progression, lest).
- `vocabulaire-espagnol.md`, `vocabulaire-shopify-finance.md` — les mêmes cartes en listes de lecture (485 phrases espagnoles par sous-deck, 163 termes e-commerce et finance par thème).
- `prise-en-main.html` — la check-list de prise en main (Batcave onglet par onglet, sport, nutrition, Anki, projets Claude, dossiers, routines, dates), coches gardées dans le navigateur ; page autonome, publiée aussi en Artifact.
- `espagnol-batcave.apkg` — le paquet Anki « Español · Batcave » : 485 cartes à trou en espagnol, sept sous-paquets dans l'ordre du dossier ; `espagnol-batcave-anki.txt` est la même chose en import texte (type Cloze, 4e colonne = sous-paquet) et `deck-espagnol.py` le générateur (genanki).

## Lancer la campagne en local

```bash
npm install                      # playwright + http-server
npx playwright install chromium
npm run serve &                  # sert tests/ sur http://127.0.0.1:8199
npm test                         # tous les tests, verdicts dans /tmp/reg10.log
npm run audit                    # toutes les pages × 3 gabarits
```

Le workflow GitHub Actions (`.github/workflows/campagne.yml`) rejoue la campagne et l'audit à chaque push.
