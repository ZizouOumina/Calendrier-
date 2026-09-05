# La Batcave

Application personnelle en un seul fichier : `batcave.html` (aucune dépendance à installer, s'ouvre dans un navigateur).
La version publiée vit sur claude.ai (Artifact) avec synchronisation cloud et connecteurs ; ce dépôt est la copie de référence du code.

- `batcave.html` — l'application complète (HTML + CSS + JS).
- `maquette-batcomputer.html` — la maquette statique du tableau de bord Batcomputer.
- `tests/` — campagne Playwright : `bash tests/runall.sh` (nécessite `npx http-server -p 8199 -c-1 .` lancé depuis `tests/` et `playwright` installé), `node tests/audit.mjs` pour l'audit d'affichage sur trois gabarits.
