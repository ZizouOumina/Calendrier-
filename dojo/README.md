# Le dojo — IA, apprise en faisant

Ouvert le 30 septembre 2026, validé le même soir (« oui oui »).

## Pourquoi il existe
Les outils sont les mêmes pour tout le monde. Ce qui ne l'est pas : la profondeur dans un
domaine, le jugement, et ce qu'on a réellement construit. Le dojo n'est donc **pas** un
cours sur l'IA : c'est la manière dont tu utilises l'IA **dans ton vrai travail** —
la fac d'abord, la boutique à partir de novembre — et ce que ça produit de vérifiable.

## Les cinq règles
1. **Toujours le vrai travail.** Pas d'exercice qui ne sert qu'au dojo. Chaque exercice se fait
   sur un tema, une question d'examen, ou (en novembre) la boutique.
2. **Toi d'abord, l'IA ensuite.** Résumé, cartes, premier jet : c'est toi. L'IA questionne,
   critique, compare. Jamais l'inverse.
3. **On vérifie ce qui compte.** Tout fait appris avec l'IA est confronté au cours. Chaque erreur
   de l'IA trouvée est comptée : c'est l'indicateur du jugement.
4. **Rien ne reste dans le dossier.** Chaque module finit par quelque chose d'utile à quelqu'un
   d'autre (un compañero, un client, un lecteur).
5. **Zéro minute en plus.** Le dojo vit dans les blocs qui existent déjà. S'il te faut du temps
   « pour le dojo », c'est qu'on a recréé une Batcave.

## Le rituel quotidien (bloc « Étudier en avance », 09:20 ; 08:20 les jours de JJB)
Un tema (diapo d'environ 60 pages), 1 h 30 — le protocole complet est dans `bibliotheque/protocole-tema.md` :
0. **10 min de survol** — le plan du diapo, les diapos qui comptent.
1. **45 min partie par partie, sans IA** — tu lis une partie, tu fermes, tu écris de mémoire.
2. **20 min socratique** — dans le Projet « Dentaire » : `tema` + ton résumé. Claude te questionne,
   ne te donne jamais la réponse.
3. **5 min de vérification** — ce qu'il a affirmé, contre le cours. Chaque erreur de l'IA → notée.
4. **10 min de cartes** — tu écris 8 à 10 cartes ; `vérifie mes cartes` pour la critique.

Le soir, une ligne dans le journal de `progression.md` : tema fait, erreurs de l'IA trouvées,
ce qui a coincé.

## Le rituel hebdomadaire (dimanche, 10 min, avec la revue guidée de la Batcave)
`/bilan` dans une session Claude Code ouverte sur ce dépôt. Il relit `progression.md`,
compare aux objectifs, fixe la semaine suivante — et dit franchement si ça ne va pas.

## Les commandes (Claude Code, à la racine du dépôt)
| Commande | Rôle |
|---|---|
| `/exercice` | le prochain exercice du module en cours, calé sur ton tema du jour |
| `/revue` | relit ton travail, le note sur 10 avec les critères du module, sans complaisance |
| `/bilan` | la revue de la semaine : indicateurs, points faibles, plan de la semaine |

`/quiz` (répétition espacée) et `/diagnostic` arrivent en novembre, avec le module 4.

## Ce qui est volontairement absent
- Les modules 2 à 8 : ils s'écrivent **quand tu y arrives**, pas avant. Écrire tout le cursus
  d'avance, c'est exactement la procrastination sophistiquée dont on veut se protéger.
- Un journal séparé : une ligne par jour dans `progression.md` suffit.
- La veille IA : 30 minutes par semaine au maximum, le dimanche, et seulement si le reste est fait.
