# Passer au semestre suivant, puis à l'année suivante

Deux passages à faire, et ils n'ont rien à voir l'un avec l'autre en quantité de travail.
Ce fichier dit exactement ce qui bascule tout seul, ce qui demande une information que tu
es le seul à avoir, et ce qui demande du code.

---

## Ce qui bascule tout seul — aucune action

La Batcave est structurée par semestre depuis le début. Le 25 janvier, sans que personne
ne touche à rien :

- **La grille du jour** passe de `SCHEDULES` à `SCHEDULES_S2` — 24 h de cours par semaine au
  lieu de 16, mardi et mercredi jusqu'à 21:30, le lundi qui redémarre à 15:30.
- **La liste des matières** du panneau Approfondissements passe des cinq du S1 aux six du S2.
  Entre le 19 et le 25 janvier, elle reste au S1 : c'est la semaine où tu le révises.
- **Le panneau des pondérations** met le S2 en premier et replie le S1.
- **Les jours sans cours du S2** sont déjà là — 19 mars, Semana Santa, Santa Faz — vérifiés
  sur les couleurs du calendrier académique, pas sur son texte.
- **L'entre-deux** (20, 21, 22 janvier) est déduit des dates de semestre, il n'est listé
  nulle part.
- **Les approfondissements sont gardés.** Un sujet écrit en décembre sort son J+90 en mars,
  au milieu du S2. C'est voulu : un semestre d'approfondissements est de la mémoire, pas un
  compteur de la semaine.
- **Les objectifs se recalent** sur la grille réelle à chaque démarrage. Une semaine de S2
  plus chargée déplace les cibles toute seule.

---

## Le passage S1 → S2 · janvier 2027

### Ce que toi seul peux apporter

1. **Ton emploi du temps S2 réel.** Il n'est pas encore dans Google Agenda : la dernière
   séance importée est le 19 janvier. `SCHEDULES_S2` vient du portail de la fac, relevé à la
   main — c'est une hypothèse, pas une observation. Dès que le portail publie le S2,
   importe-le et je le balaie jour par jour comme j'ai fait pour le S1.
2. **Les dates d'examen du S2** (la période d'évaluation court du 17 mai au 4 juin) →
   Études → Échéances d'examens.
3. **Les échéances Canvas** du S2 → Calendrier → Échéances.

### Ce que je fais

4. **Notion** : les six bases du S2, avec le modèle de `modele-notion.md`. Le SEMESTRE 2
   part de la page blanche — ce qui s'y trouve aujourd'hui est un reste d'un autre cursus.
5. **Anki** : les sous-paquets des six matières du S2 dans le paquet Dentaire.
6. **Google Agenda** : les séries 🦇 reconstruites sur la grille du S2.
7. **Les pages** : « Le calendrier du S1 » a un équivalent S2 à écrire.

### Une décision à prendre

Le programme des 173 jours finit le **14 mars 2027**, au milieu du S2. Rien ne s'arrête ce
jour-là dans le code — le compteur continue simplement de compter. Il faudra trancher :
un nouveau programme jusqu'en juin, ou celui-ci qui continue sans date de fin.

---

## Le passage d'année · P1 → P2, septembre 2027

La **machinerie ne change pas** : la grille, les semestres, les approfondissements, les
objectifs, les jours sans cours, tout continue de fonctionner. Ce qui change, ce sont des
**données**, et elles tiennent en sept constantes.

| Constante | Ce qu'elle porte |
|---|---|
| `MATIERES_SEED` | Le nom court et le nom long de chaque matière |
| `EVAL_MATIERES` | Pondérations, ECTS, semestre, nombre de temas — relevés dans les guías docentes |
| `SEMESTRES` | Les deux dates de début et de fin |
| `SCHEDULES` / `SCHEDULES_S2` | Les deux emplois du temps |
| `JOURS_SANS_COURS_LISTE` | Le calendrier académique de l'année |
| `PROGRAMME_DEBUT` / `PROGRAMME_FIN` | Le jour 1 et la durée |
| `ANCRE_COURSES` | Le premier samedi de courses |

Plus, hors code : le Notion `P2` avec ses deux semestres, les sous-paquets Anki, et les
pages qui nomment des matières de P1.

**Ce qu'il faut pour y arriver** — dans cet ordre, parce que chaque étape dépend de la
précédente :

1. Les **onze guías docentes de P2**, dans Drive. C'est la source de `EVAL_MATIERES` : sans
   elles, les pondérations sont des suppositions, et une pondération fausse envoie
   travailler au mauvais endroit pendant six mois.
2. Le **calendrier académique 2027-28**. Même méthode : lire les couleurs, pas le texte.
3. L'**emploi du temps P2** dans Google Agenda, pour vérifier la grille jour par jour.
4. La décision sur le **nouveau départ** : la Batcave sait remettre à zéro en gardant la
   configuration (`REINIT_GARDER` — habitudes, objectifs, charges fixes, jours sans cours
   corrigés à la main, approfondissements). À trancher à ce moment-là : repartir de zéro sur
   les compteurs, ou garder l'année 1 dans l'historique.

### Une amélioration que je te propose pour ce jour-là

Ces sept constantes sont aujourd'hui **dispersées** dans le fichier — `MATIERES_SEED` à la
ligne 5172, `SEMESTRES` à 12263, `ANCRE_COURSES` à 10203. Les rassembler dans un seul bloc
« LE CURSUS », en tête du script, ferait du passage d'année une modification à un seul
endroit au lieu de sept. Ça ne change aucun comportement, et ça se teste. C'est le genre de
chantier à faire **entre deux années**, jamais pendant.
