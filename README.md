# La Batcave

Application personnelle en un seul fichier : `batcave.html` (aucune dépendance à installer, s'ouvre dans un navigateur).
La version publiée vit sur claude.ai (Artifact) avec synchronisation cloud et connecteurs ; ce dépôt est la copie de référence du code.

- `batcave.html` — l'application complète (HTML + CSS + JS).
- `maquette-batcomputer.html` — la maquette statique du tableau de bord Batcomputer.
- `tests/` — campagne Playwright (`test*.mjs`), audit d'affichage (`audit.mjs`), page hôte et scripts.
- `tests/qa-shots.mjs`, `tests/qa-shots2.mjs` — parcours visuel : chaque onglet photographié avec un jeu de données réaliste (images dans `/tmp/qa/`).
- `tests/rapport-hebdo.mjs` — le bilan du dimanche sans ouvrir la page : charge la Batcave dans Chromium avec les documents du cloud (`--cloud <dossier>`, un JSON par clé, tels que les écrit l'action `read_db` de l'outil Artifact) ou un export (`--seed`), et produit `rapport.html` (courriel), `rapport.md` (Notion) et `rapport.json`. Une Routine hebdomadaire l'exécute le dimanche soir et envoie le résultat.
- `dossier-dropshipping.html` — le dossier de formation dropshipping (programme 12 semaines, ads, gestion, fiscalité, exercices corrigés, auto-tests, glossaire) ; page autonome, publiée aussi en Artifact.
- `glossaire-dropshipping-anki.txt` — les 163 cartes du glossaire au format d'import Anki (séparateur tabulation, 3e colonne en étiquettes).

## Lancer la campagne en local

```bash
npm install                      # playwright + http-server
npx playwright install chromium
npm run serve &                  # sert tests/ sur http://127.0.0.1:8199
npm test                         # tous les tests, verdicts dans /tmp/reg10.log
npm run audit                    # 18 pages × 3 gabarits
```

Le workflow GitHub Actions (`.github/workflows/campagne.yml`) rejoue la campagne et l'audit à chaque push.
