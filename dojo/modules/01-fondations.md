# Module 1 — Fondations : ce qu'est un LLM, où il se trompe
Du 1er au 11 octobre, pendant le rattrapage des 16 temas. Aucune minute en plus : chaque
exercice se fait sur un tema du jour.

## La théorie (une page)
Un modèle de langage prédit la suite la plus probable d'un texte, mot après mot (plus exactement
**token** après token : un morceau de mot). Il ne consulte pas une base de données : il **génère**.
Quatre conséquences, que tu vas vérifier toi-même :

1. **Il invente avec assurance.** Quand la bonne réponse est rare dans ses données (une insertion
   musculaire précise, un détail du cours de TON prof), il produit une réponse plausible, sur le même
   ton que les réponses justes. Le ton ne dit rien de la vérité.
2. **Il n'est pas déterministe.** La même question posée deux fois donne deux réponses différentes,
   parfois contradictoires.
3. **Il tend à être d'accord avec toi.** Si tu contestes une réponse juste avec assurance, il peut
   céder. C'est le piège le plus dangereux pour un étudiant.
4. **Il a une fenêtre de contexte.** Il ne lit que ce qui est dans la conversation. Sur un long
   document, il retient mieux le début et la fin que le milieu, et il peut confondre deux passages.

Ce qu'il fait très bien : expliquer un mécanisme de dix façons différentes, te questionner sans
fatigue, reformuler en espagnol, repérer une incohérence dans TON raisonnement.
Ce pour quoi tu ne lui fais **jamais** confiance sans vérifier : un fait précis (chiffre, nom,
insertion, date, dose), une source citée, un calcul.

## Les exercices
Chacun sur un tema du jour. `/revue` note chaque exercice sur 10 selon les critères.

| # | Exercice | Réussi si |
|---|---|---|
| 1.1 | **Le protocole du tema**, tel quel, sur tes deux temas du jour. | Résumé écrit AVANT l'IA ; erreurs de l'IA comptées ; 8 à 10 cartes écrites par toi. |
| 1.2 | **La chasse aux inventions** : demande à Claude 10 faits précis du tema (chiffres, noms, structures). Vérifie les 10 dans le cours. | Les 10 vérifiés ; taux d'erreur noté ; tu sais dire quel TYPE de fait il rate. |
| 1.3 | **Deux fois la même question** : pose deux fois (deux conversations neuves) une question d'examen du tema. Compare. | Les différences listées ; tu dis laquelle est juste, preuve du cours à l'appui. |
| 1.4 | **Le test de la pression** : sur une réponse JUSTE de Claude, conteste avec assurance (« non, mon prof a dit l'inverse »). Il cède ? | Résultat noté ; tu expliques pourquoi c'est dangereux pour réviser, en trois lignes. |
| 1.5 | **Le long document** : donne-lui un tema entier, demande trois détails du milieu. Vérifie. | Les trois vérifiés ; tu notes s'il a confondu ou inventé. |
| 1.6 | **Quand ne PAS l'utiliser** : écris ta règle personnelle, cinq lignes, tirée de 1.2 à 1.5. | Cinq règles concrètes, chacune appuyée sur un résultat de tes exercices. Elle va dans `bibliotheque/`. |

## Le livrable (quelque chose qui sort du dossier)
**Le lexique français ↔ espagnol**, commencé ici : chaque mot noté entre crochets pendant le protocole,
avec sa traduction **vérifiée dans le cours** (jamais seulement par l'IA). Au 31 octobre, il est
partagé à au moins trois compañeros.

## Validation du module
Les six exercices notés au moins 7/10 par `/revue`, et la règle 1.6 écrite. Alors seulement, le
module 2 s'écrit.
