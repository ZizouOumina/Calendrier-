# Où on en est — samedi 19 septembre 2026, au soir

Ce fichier existe pour une seule raison : que rien ne dépende de ma mémoire.
Il dit ce qui est fait, ce qui reste, et ce qui attend une décision de toi.

> **Vérification finale, sur la version publiée :**
> 90 tests · 0 échec · 0 assertion FAIL · 0 erreur de page.
> `audit.mjs` aucun défaut sur les 4 gabarits · `audit-suivi.mjs` aucune erreur de calcul ·
> `contraste.mjs` AA tenu sur les deux thèmes · `verif-pages.mjs` toutes les pages saines.
> La Batcave est en **v78**.

## CE QU'IL RESTE À FAIRE — la seule liste qui compte

### Ce soir
- [ ] **L'essai de restauration** : 💾 → `♻️ Restaurer depuis Drive` → celle du 19.
      Vérifier ensuite que les 32 habitudes et les 4 dépendances sont là.
      *C'est le seul maillon de la chaîne de sauvegarde jamais éprouvé.*
- [ ] **La synchro** : Batcave ouverte sur l'iPhone ET sur l'ordi, cocher une habitude
      sur l'un, recharger l'autre.
- [ ] **Le relevé du placard** : pâtes, riz, flocons, œufs, huile d'olive, beurre de
      cacahuète. La liste travaille sur une photo du 13 septembre.

### Dimanche 20
- [ ] **Les courses** — 46 articles, tout est dû (semaine d'ancre). Le matin.
      Chaque ligne porte maintenant une **pastille** qui dit où l'acheter au moins cher :
      boucher (halal), Lidl (sec, surgelé, volume), Alcampo (skyr, bidon d'huile 5 L),
      Mercadona (hygiène, ménage), mercadillo (fruits).
- [ ] **Le ticket de caisse** → me l'envoyer, je saisis les vrais montants dans
      Budget → Nourriture.
- [ ] **Le batch cooking** — bloc de 14:30, déjà dans l'agenda Google.

### Avant lundi — les trois magasins vides, vérifiés dans sa vraie sauvegarde
- [ ] **Les 5 dates d'examen de janvier** (+ horaires). Sans elles, le **mode partiels**
      ne s'enclenche jamais, et la matière proposée au minuteur ne peut pas se calculer
      par « examen le plus proche ».
- [ ] **Les échéances du semestre** — date, type, matière, libellé. Sans elles, le
      compte à rebours J-N, le bloc du soir « Préparer · … » et les cinq lignes du
      tableau de bord restent éteints. Il y a au moins l'infografía de Documentación.
- [ ] **Les paquets Anki** — noms et cartes dues.

### Lundi 21, jour 1
- [ ] **La copie vierge**, au réveil, AVANT toute saisie.
- [ ] **Le poids de départ**, à jeun, dans la clôture du soir. *(Pas de mensurations :
      la fonctionnalité a été retirée, il me l'a rappelé.)*
- [ ] **05:30** : le téléphone sonne, ou pas. Me le dire.

### Hors Batcave, sans urgence
- [ ] **Notion** : les trois bases du S1 portent encore ses cours de PASS à Lille.
      Il s'en charge lui-même (« touches pas au notion »).
- [ ] **Le paquet Anki Business** — 305 cartes, à importer le **19 octobre**, pas avant.

### RAYÉ — ne pas rouvrir
- Les jours fériés et les vacances : **déjà dans le code** (`JOURS_SANS_COURS_LISTE`),
  relus le 18 septembre dans le calendrier académique officiel.
- Les mensurations au mètre ruban : fonctionnalité retirée, zéro occurrence dans le code.
  J'avais sondé une clé qui n'a jamais existé et lu son absence comme un trou.
- Le papier imprimante et l'encre dans les courses : sa décision, c'est non.

## Ses décisions du 19 septembre, toutes honorées

| Décision | État |
|---|---|
| Ne pas toucher à Notion | respecté |
| Un seul palier d'objectifs (le mois) | fait — 140 objectifs → 72 |
| Un moyen de se tester avant le 19 octobre | l'épreuve du dimanche : 27 sept., 4, 11, 18 oct. |
| Commencer lundi, pas samedi | jour 1 = lundi 21 septembre |
| Courses le dimanche matin | ancre au samedi 19, premier passage le 20 |
| Plus d'estimation de budget | retirée de bout en bout |
| Cocher même sans acheter | c'était déjà le comportement |
| Les produits d'entretien de retour | Maison (4 sem.) + Ménage (8 sem.) + 6 lignes d'hygiène |
| Supprimer la page Journal | faite, son historique sauvé |
| Un seul paquet Anki Business | 305 cartes, aucune perdue |
| Plus de magnésium | retiré partout, et il ne peut pas revenir par la synchro |
| Où acheter quoi, dans la Batcave et brièvement | une pastille par ligne de courses |

## Les quatre défauts réels trouvés aujourd'hui, et comment

Aucun ne venait d'une relecture de code. Tous sont sortis parce qu'il a changé d'avis
ou posé une question — c'est la leçon à garder pour la suite.

1. **`ANCRE_COURSES` faisait double emploi.** Elle est le battement du rythme (elle doit
   rester un samedi) mais servait aussi de jour des premières courses. Les deux rappels
   du premier jour tombaient donc le 19, un jour où il n'y allait pas, et ne revenaient
   jamais. D'où `PREMIER_JOUR_COURSES = 2026-09-20`.
2. **La stabilisation poids → calories partait du mauvais jour.** Elle comptait depuis
   l'ancre du rythme au lieu du jour où il a vraiment de quoi manger le plan. La coupure
   passe du 17 au 11 octobre.
3. **Le jour 1 était faux dans quatre documents**, révélé par « je commence lundi ».
4. **Deux textes renvoyaient à la page Journal supprimée** — la tuile Sommeil du tableau
   de bord et la courbe de poids vide. Trouvés par la campagne, pas à l'œil.

## Ce que j'ai vérifié sur son compte, et qui marche déjà

- **Google Agenda** : lundi 21 porte 22 blocs 🦇, heures justes, consignes en description,
  rappel à 5 min, fuseau Europe/Madrid.
- **Drive** : quatre sauvegardes automatiques (16 au 19 sept.) dans `01 · Sauvegardes`.
  La dernière fait 80 Ko, se décode, parse, et contient 65 clés — dont ses 32 habitudes,
  4 dépendances, 9 transactions, 9 charges fixes.
- **La rotation** garde tout à ≤ 7 jours, une par semaine jusqu'à 60 jours, une par mois
  ensuite. Celle du 16 partira seule le 23. **Ne pas les supprimer à la main.**

## Réserve à connaître

La Batcave déclare cinq connecteurs jamais éprouvés en session : AccuWeather (×2),
Spotify, Shopify, Notion. Seuls Google Agenda et Google Drive ont été vérifiés en vrai.

---

## Fait cette nuit, commité et poussé (`5b0bcd6`)

**Les routines Claude sont remises à la page.** Réponse à ta question : elles
ne l'étaient pas. Vérifié bloc par bloc contre la grille réelle, sondée sur
les sept jours de la phase Español, et contre « Le calendrier du S1 ».

| Ce que la routine disait | Ce que la grille dit |
|---|---|
| Español · gramática à 11:20 | **13:00** du lundi au jeudi (11:20 le samedi seulement) |
| Español · escribir à 13:00 | **14:00** |
| « preparar la clase » à 14:00 | **n'existe plus** |
| « Español · DELE » samedi 18:00 | **n'existe plus** |
| tutor « vendredi et samedi » | vendredi **11:20**, samedi **17:00** |
| — | **hablar** lundi 15:00 : manquait |
| — | **serie en VO** mardi 20:30 : manquait |
| 3 phases jusqu'en mars | **une seule**, 21 sept. → 18 oct. |
| diagnostic lundi 14 sept. 13:00 | **dimanche 27 sept. 11:20**, premier passage de l'épreuve du dimanche |
| DELE B2 blanc 17-18 oct. | **retiré** |
| « Cartes du dernier cours » 09:20 | **Étudier en avance**, 09:20-11:20, un tema *non encore vu* |
| « Annales » 10:20 | **Question ouverte ou autre**, 11:20 |
| « Comprendre le cours » 20:30-21:30 | **Clore le cours du jour**, 20:30-21:10 (18:00 le mardi), 20 min par cours |
| — | **Approfondir, Lire, Simulation dentaire, Réexpliquer** : manquaient tous |
| Universidad de Alicante | **Universidad Europea** |
| Semestre et ECTS vides sur les 11 fiches | remplis — 5 matières au S1 (24 ECTS), 6 au S2 (36) |
| Boutique : « 19 h par semaine » | **0 h** pendant la phase Español, ≈ 17 h après, et un rendu passe avant |

## La chose importante que j'ai trouvée en republiant

**Le jour 1 n'était pas le même dans le code et dans les pages**, puis tu l'as
déplacé une dernière fois. Ta décision du 18 au soir — commencer le dimanche —
était passée dans le code (`PROGRAMME_DEBUT = 2026-09-20`) mais dans **aucune
page** : toutes annonçaient « samedi 19, jour 1 ». Corrigé partout, puis tu as
tranché le 19 : **tu commences le lundi**, le temps de régler ton sommeil.

État final, vérifié dans l'application et pas déduit — `__bcProgrammeDebut` rend
2026-09-21, le lundi 21 est « Haut lourd » :

- **jour 1 = lundi 21 septembre** (copie vierge à prendre ce matin-là, avant la
  première saisie) ;
- **du 19 au 20 = les deux dernières journées de préparation** (guías docentes,
  Wuolah, trente termes par matière) — la grille tourne, mais rien n'est compté ;
- **premier jour de courses = samedi 19** (`ANCRE_COURSES`), aujourd'hui, avant
  même le jour 1 : les courses n'attendent pas le programme ;
- **séance de référence = lundi 21 à 05:30** — le jour 1 est lui-même un jour de
  sport, donc pas de décalage ;
- **retests = lundis 19 octobre, 23 novembre, 28 décembre** ;
- **épreuve du dimanche = 27 sept., 4, 11 et 18 octobre** — le 27 est la ligne de
  départ, le 18 la fin de la période d'espagnol.

La Batcave calculait déjà tout ça correctement — mais son propre panneau Sport
écrivait encore « le samedi, jour 1 du programme ». Corrigé.

Corrigé aussi dans Le semestre, qui gardait la grille d'avant le 18 septembre :
le § 14 (« Les dix premiers jours ») donnait deux créneaux d'une heure le matin,
« 14:00 slides du jour » et « 20:30 Comprendre » ; les recettes B, D et E
nommaient des blocs qui n'existent plus. Réécrits.

**Deux correctifs dans la Batcave :**
- Le panneau des portes disait « le bloc escribir reste jusqu'au 14 mars » :
  vestige des trois phases. Il tient jusqu'au **18 octobre**.
- Contraste : la pastille de sous-onglet allumée donnait 3,83:1 en thème
  clair sur les sept pages groupées. Corrigée, 5,1:1. Les deux thèmes tiennent.

**Et avant ça :** le test88 des vacances (`da60da5`).

---

## Les sept documents republiés cette nuit

| Page | Version | Ce qui a changé |
|---|---|---|
| La Batcave | v77 | Contraste des sous-onglets ; le texte des portes |
| Le calendrier du S1 | v0.8 | Jour 1 au lundi 21, dates de démarrage d'Approfondir, Lire, Réexpliquer |
| Le semestre | v12 | § 14 réécrit, recettes B, D, E, § 11 |
| Prise en main | v47 | Jour 1, séance de référence, retests, intercambio |
| Dossier Español | v2.6 | **§ 05 et § 06 entièrement réécrits**, § 04, § 12, § 13, § 14 |
| Dental Mastery OS | v2.1 | Bloc du soir, semaine 1, colophon |
| **Ce qu'il reste à faire** | v1, **publié pour la première fois** | https://claude.ai/artifact/BdUn7c8D3ssBDzs2w7MaPZ |

## À reprendre au réveil, dans l'ordre

1. **Ta question sur les objectifs à la fin des périodes** — j'ai la réponse,
   je ne te l'ai pas encore donnée. En deux lignes : rien n'est supprimé, le
   verdict se fige, la période suivante existe déjà, et `recalerObjectifsSemaine()`
   recalcule les cibles « auto » depuis la vraie grille à chaque démarrage —
   donc tes cibles s'ajusteront seules le 25 janvier. Ce qui **manque**, c'est
   une cérémonie de clôture de fin de mois ou de trimestre : `cloturerSaison()`
   existe et a un bouton, mais personne ne te dit « la période est finie, voilà
   ce que tu as fait ». C'est une des cinq décisions ci-dessous.

---


## Une chose que j'ai tranchée et que tu peux défaire

Le bandeau du Dossier Español, écrit le 17 septembre, disait que **le drill de
conjugaison de cinq minutes était retiré**. Mais l'accélérateur 4, la section 09,
la section 12 et la section 13 le décrivent tous comme actif, et les cinq chiffres
du dimanche le comptent. J'ai gardé le drill et réécrit le bandeau : une page ne
peut pas se contredire quatre fois. Si tu voulais vraiment le supprimer, c'est
une ligne à enlever dans quatre sections — dis-le et je le fais.

## Ce qui attend une décision de toi

1. **Les portes d'espagnol méritent-elles de rester ?** Elles convertissent un
   bloc Español en bloc de projet quand ta note de cours tient 21 jours. Mais
   il faut 12 jours de cours notés sur 21, et la phase entière ne dure que
   quatre semaines : la première porte ne peut s'ouvrir que mi-octobre, à
   quelques jours de la bascule automatique du 19. Elles ne gagnent presque
   rien. À garder, à simplifier, ou à retirer — dis-moi.
2. **Aligner les trois bases Notion sur le modèle** (Pages, Prof, Nombre de
   tours, `État 1` → `État`, Texte, Notes, Vu en classe).
3. **Les cinq fonctionnalités conditionnelles** de `reste-a-faire.html`.
4. **La clôture de saison** (point 3 ci-dessus).
5. **Le S2** : on le construit quand tu auras le calendrier.

---

## Ce qu'il faut savoir pour reprendre

- Branche : `claude/notion-addictions-nutrition-tracker-pf3lmg`. Tout est poussé.
- Serveur de tests : `python3 -m http.server 8199 --bind 127.0.0.1` depuis `tests/`.
- Campagne : `bash tests/runall.sh`, résultat dans `/tmp/reg10.log`, finit par `ALL_DONE`.
- Audits : `audit.mjs`, `audit-suivi.mjs`, `contraste.mjs`, `verif-pages.mjs`, lancés depuis `tests/`.
- La référence qui fait foi pour la grille, c'est **`calendrier-s1.html`**. Quand
  un document et elle se contredisent, c'est elle qui a raison — et c'est
  comme ça que les routines ont été corrigées.
