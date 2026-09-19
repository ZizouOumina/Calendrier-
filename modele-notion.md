# Le modèle de base Notion — une matière, un semestre, une année

Ce fichier existe pour une seule raison : quand le semestre 2 arrivera, puis la deuxième
année, puis la troisième, il ne faut pas redécider à chaque fois ce que contient une base
de matière. On applique ce modèle, et c'est tout.

## Le modèle

Une base par matière, rangée sous la page du semestre (`P1 / SEMESTRE 1`, `P1 / SEMESTRE 2`,
puis `P2 / …`). Neuf colonnes, pas une de plus :

| Colonne | Type | À quoi elle sert |
|---|---|---|
| **Cours** | titre | Le nom du tema, tel que le prof le donne |
| **État** | statut | PAS FAIT · A REVOIR ABSOLUMENT · REVOIR + ACC · PAS OUF · CA PASSE · CARRE |
| **CM** | case | Le cours magistral a eu lieu / a été suivi |
| **Compris** | case | Tu as compris en sortant, pas « tu as lu » |
| **Fiché** | case | La fiche existe |
| **Cartes Anki** | case | Les cartes de ce tema sont créées |
| **Approfondi** | case | Une séance « Approfondir » a porté sur ce tema |
| **Remarques** | texte | Ce qui ne rentre dans aucune case |

Les cinq cases se lisent d'un coup d'œil en vue tableau : c'est le seul but. Le statut porte
le jugement, les cases portent les faits.

### Pourquoi « Approfondi » est une case et pas une date

Les dates de l'approfondissement vivent dans la Batcave, pas ici : c'est elle qui tient les
rappels à J+7, J+30 et J+90 et les notes 0-3. Notion n'a besoin que du drapeau — quels temas
ont eu leur heure. Dupliquer les dates aux deux endroits, c'est s'assurer qu'elles finiront
par se contredire.

### Ce qui est délibérément absent

- **Date** — le cronograma de la fac change, et la Batcave tient déjà le calendrier. Une date
  recopiée ici serait fausse au premier décalage.
- **Prof** — sans usage : on ne travaille pas différemment selon qui enseigne.
- **Pages**, **Nombre de tours**, **Texte**, **Notes**, **Notes ACC**, **ccb**, **Vu en classe** —
  des restes d'un modèle d'une autre année. « Vu en classe » fait doublon avec CM.

## La procédure, pour un nouveau semestre ou une nouvelle année

1. Créer la page du semestre sous l'année (`P2 / SEMESTRE 1`…).
2. Une base par matière de ce semestre, nommée comme la guía docente, avec l'emoji de la
   matière. Le nom de la matière suffit — pas de suffixe d'année dans le titre, le chemin
   le dit déjà.
3. Poser les neuf colonnes ci-dessus, dans cet ordre.
4. Créer une ligne par tema du programme (section *Contenidos* de la guía docente), titre
   seul, tout le reste vide.
5. Vue par défaut : tableau, trié sur **Cours**, toutes les colonnes affichées.

Rien d'autre. Pas de vue par prof, pas de calendrier, pas de relation entre bases : chaque
ajout de structure est une chose de plus à tenir à jour toute l'année.

## L'état au 19 septembre 2026

`Approfondi` posée dans les trois bases du SEMESTRE 1, et `Date`, `ccb`, `Notes ACC`
retirées. Il reste ces écarts au modèle, qui effacent des données et attendent donc un
feu vert explicite :

| Base | Écart |
|---|---|
| 💀 Anatomía I | `Pages` en trop |
| 🦠 Biología celular | `Prof` (noms d'une autre fac), `Nombre de tours`, et le statut s'appelle `État 1` au lieu de `État` |
| ➗ Epidemiología | `Prof`, `Texte`, `Notes`, `Vu en classe` |

**Le SEMESTRE 2 n'est pas construit.** Ce qui s'y trouve aujourd'hui est un reste : des
bases qui portent les noms des matières du S1 et contiennent le contenu d'un autre cursus
(« Estimation - intervalle de confiance », « Cariologie », « Odontogénese »). Il n'y a rien
à y corriger et rien à y sauver — on partira de la page blanche, avec ce modèle, le jour où
le calendrier du S2 arrivera. Même chose pour chaque année suivante.
