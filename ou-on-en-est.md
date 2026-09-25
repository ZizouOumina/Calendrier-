# Où on en est — samedi 19 septembre 2026, au soir

Ce fichier existe pour une seule raison : que rien ne dépende de ma mémoire.
Il dit ce qui est fait, ce qui reste, et ce qui attend une décision de toi.

> ### Lots 50 à 52 — vendredi 25 septembre, au matin
> **50 · À 100 %** : un seul numéro de schéma (`SCHEMA_VERSION`, `DRAPEAUX_MIGRATION`), panneau
> Santé + relevé `SANTÉ` (allumé seulement en défaut), plan de secours texte hebdo dans Drive,
> « Reprendre depuis Drive » sur appareil vide, bornes de saisie, annulation par geste (bouton
> Annuler dans le toast), rappel « Clôture du jour » dans l'agenda, démarrage en deux temps.
> **51 · Interface** : les six entrées ont été essayées puis retirées (« j'aimais bien le
> layout d'avant ») — la barre reste à neuf onglets ; gardés : mode pilote plein écran (⛶ Maintenant, touche M), feuilles qui montent du bas sur iPhone,
> thème pur noir. **52 · Système** : carte orbitale (Semaine → Système), canvas 2D.
> **53 · Demain** : la clôture validée enchaîne sur le plan du lendemain (grille, combat /
> sans cours / journée saisie, lever, coucher, eau, échéances) ; aussi bouton « Demain → » du
> Plan du jour et touche D. `tests/simulation.mjs` : deux semaines fictives, 88 vérifications.
> **54 · Ardoise et laiton** : palette choisie par Zizou parmi huit (page « Trois palettes pour
> la Batcave »). Graphite chaud, encre ivoire, accent laiton ; thème jour sable ; trame d'écran
> retirée ; titres en Rajdhani 700 (Bebas parti). Les jetons `--cyan*` gardent leur nom mais
> valent laiton. Contraste AA tenu sur les deux thèmes (contraste.mjs).
> **55 · Longévité (nuit du 25)** : listes datées en un document par mois (`batcave-sessions-2027-03`…,
> relues d'un seul tenant par `chargerFractionne`), habitudes des années passées en bits
> (`batcave-habitlog-2026`), sessions de plus de 120 jours repliées dans les totaux, totaux et séries
> de sport de plus de 400 jours repliés (`batcave-resume-AAAA`, une meilleure série par exercice et
> par mois), archives mensuelles au cloud seulement, relevés d'agenda et rattrapages purgés après
> 14 jours. Replis rejoués après chaque hydratation. Fin de programme = fin de saison
> (`finProgramme()`). Correctifs trouvés par les simulations : objectifs ajoutés effacés au
> rechargement, archive de saison quadratique, revues plafonnées à 260, barre et notification qui
> débordaient sur iPhone, montants et cibles absurdes, échéances du Système toujours à 0, record sous
> la série, restauration qui ajoutait, archives cloud qui survivaient au nouveau départ, archive de
> saison compacte (une ligne par objectif du mois ou de la saison, ~5 Ko), et le repli rejoué après
> synchronisation relit l'état depuis le stockage (sinon la série perdait un jour par jour).
> Simulations : `simulation-5ans.mjs` (jour par jour, faux cloud aux vraies limites),
> `simulation-chaos.mjs`, `simulation-issues.mjs`, `simulation-longue.mjs`. Les tests lisent les
> listes par `window.__bcLire`.
> **56 · Écritures hors ligne (matin du 25)** : une écriture refusée par le cloud n'était jamais
> renvoyée, et la réouverture la remplaçait par l'ancienne version du cloud (vérifié : l'ancienne
> version perdait les 30 min notées sur l'iPhone hors ligne). Maintenant : registre `bc-cloud-attente`
> (propre à l'appareil) tenu jusqu'à confirmation, un nouvel essai sur `unavailable`, et à chaque
> instantané une clé en attente n'est jamais écrasée — la version locale repart si aucun autre
> appareil n'a écrit, sinon fusion à trois voies depuis la base commune (`bc-cloud-base`, gardée en
> mémoire et écrite seulement après un échec, une fusion ou le passage en arrière-plan) : lignes par
> `id`, suppressions respectées, minutes de révision et de projets additionnées. L'hydratation attend
> un instantané définitif (`metadata.fromCache` faux), 20 s au plus. Le nouveau départ et les
> restaurations vident la file. La revue du dimanche rejoint les listes découpées par mois
> (`batcave-revue-AAAA-MM`). Test : `tests/test113.mjs` (Mac + iPhone, coupures, cache partiel,
> erreur passagère, fusion, nouveau départ).
> **Résultats sur la version publiée (v106)** : campagne 105/105, six audits verts, simulations
> issues 58, longue 400, chaos 897, deux semaines 88, deux appareils 33, et cinq ans jour par jour
> (26 sept. 2026 → 25 sept. 2031) : 6 031 vérifications, 0 défaut, série de 1 826 jours intacte.
> Au bout de cinq ans : ~1,9 M caractères en local (~74 % des 5 Mo de Safari ; sport-log 641 K,
> journal 397 K, revue 148 K, transactions 127 K), 837 documents au cloud, plus gros 58 Kio
> (`saisons`). Si la marge devient juste : replier davantage le journal du sport.
> Rapport : `rapport-cinq-ans.html` (artefact « Cinq ans simulés »).
> Hors Batcave : « 🦇 Enlever les tapis » dans Google Agenda (tous les jours à 14:52, après la micro-sieste —
> l'aspirateur passe à 15:45 et 18:15), et la consigne du trajet le rappelle.
>
> ### ⚠️ Dernier changement — nuit du vendredi 25 septembre : le régime combat (lot 49)
> **Du lundi 28 septembre au 24 janvier (veille du S2, partiels compris)**, `SCHEDULES_COMBAT` remplace la grille du
> semestre 1 (`grilleBase`, `regimeCombat`). JJB lundi, mercredi et vendredi 10:30 (Anki 1,
> Étudier en avance 08:20 → 10:05, collation combat, trajet, JJB, retour, déjeuner 12:20),
> Muay Thai mardi 19:30 (dîner 18:00, Clore 18:30, coucher 22:00). **Lever 05:30 tous les
> jours, coucher 21:35** ; le week-end a un bloc projets à 05:30, le samedi 18:00 → 19:30 et
> le dimanche 17:30 → 19:00 sont des projets (« Projets perso 3 »), le jeudi 11:20 aussi.
> Jours sans cours : mêmes heures (`SOIREE_SANS_COURS_COMBAT`, `SOIREE_SANS_COURS_MT`).
> **Sport** : lundi et jeudi inversés (`TYPE_BY_DAY_COMBAT` : lundi volume, jeudi lourd),
> samedi off, plus de course ni de sprints ; relevés de jambes, curl inversé, relevés de
> genoux, fentes sortis ; mollets le mardi, élévations latérales et superset curl/triceps le
> lundi. Le panneau Cardio devient « Cardio & combat » (`estCombat`, `combatDuJour`,
> `COMBAT_MIN = 90`), ses quatre séances se cochent. **Repas** : cinquième prise « Collation
> combat » (banane 120, flocons 50, amandes 15 = 388 kcal) les quatre jours de combat
> seulement (`repasActif`, `jourDeCombat`, `ORDRE_REPAS`) ; `BESOIN_SEMAINE` sur la semaine
> du 28 (bananes 11, flocons 760, amandes 445 g). **Eau** : 3,5 L les jours de combat
> (`objectifEauL`). **Budget** : fc10 « Club JJB / Muay Thai » 100 € (90 € jusqu'au soir du 25, ajustement `fc-prix-club-100`), Abonnements
> (`migrerChargesFixesV2`). **Projets sans Pomodoro** : `typeBlocPlan` rend null pour
> « Projets perso » (plus de cible, de fidélité, de bloc manqué, d'objectif projets_h) ; case
> « livrable de la semaine fait » à la clôture du dimanche (`batcave-livrables`). **Les cinq
> qui comptent** (`METRIQUES_PRIORITAIRES`, statut `lent` pour les autres, panneau
> « Les 5 qui comptent » sur le tableau de bord et dans Objectifs). **Efficacité de sommeil
> mesurée** (`efficaciteMesuree` : sommeil ÷ au lit sur 14 nuits, dès 7 nuits, remplace 0,88).
> Shampoing lundi → vendredi dès le 28 (`shampoing-combat-v1`). **Google Agenda** : 21 anciennes
> séries supprimées, 31 créées, 16 copies ponctuelles pour le week-end du 25-27 ;
> sauvegardes `gcal-semaine-28sep-AVANT-combat.json`, `gcal-25-27sep-AVANT-combat.json`,
> plan `combat/exec-gcal.json` (scratchpad). Améliorations acceptées : 1 (inversion lundi/jeudi)
> et 6 (eau) ; refusées : dimanche repos, semaine allégée, combat = espagnol, Anki trajets,
> joker samedi, Superprof.
>
> ### Changement précédent — nuit du jeudi 24 septembre
> **L'alimentation passe à quatre prises.** La collation du soir sort (mal au ventre) ; son
> skyr devient une sauce au déjeuner et au dîner, son miel va dans les flocons. Le beurre de
> cacahuète est remplacé par des **amandes ou noix** (55 g par jour : 30 le matin, 25 à 14:50).
> Le riz reste à 155 g crus (descendu à 125 puis remis, sa décision), le poulet à 80 g. Plan :
> **3 226 kcal, 163 g de protéines**. La créatine passe au dîner. Les amandes n'ont **pas encore de prix** : la
> ligne dit « prix à relever » et le plafond Nourriture (201 €) n'est pas recalculé tant qu'il
> manque. **Google Agenda** : séries « Collation soir » supprimées (semaine et week-end), douche
> et coucher de semaine refaits à 21:25 et 21:35 (mardi 21:45 / 21:55, temps libre 21:30).
> Sauvegarde des anciennes séries : `gcal-series-soir-avant-24sep.json` (scratchpad).
>
> ### Changement précédent — mercredi 23 septembre au matin
> Encore une nuit blanche : « on décale tout à demain, le début etc., et on décale la période
> d'espagnol aussi ». **Le jour 1 est le jeudi 24 septembre** (`PROGRAMME_DEBUT = '2026-09-24'`,
> 172 jours jusqu'au 14 mars), la séance de référence est le jour 1 lui-même (haut volume), les
> retests restent les jeudis 22 octobre, 26 novembre et 31 décembre. **La phase Español finit le
> vendredi 23 octobre**, les projets démarrent le samedi 24 ; les quatre routines ont été
> réalignées sur ces dates (elles disaient encore 18/19 octobre). Les notes ci-dessous sur le
> jour 1 et la fin de phase sont antérieures.
>
> ### Ce qui avait changé — lundi 21 septembre
> Le corps de ce fichier est un instantané du **19 septembre au soir** : il n'est pas
> réécrit, pour que le compte rendu reste vrai à sa date. Quatre choses ont bougé depuis,
> et ce sont elles qui font foi :
>
> - **Le jour 1 est le mercredi 23 septembre** — repoussé une première fois du 21 au 22 dans la nuit du 20,
>   puis du 22 au 23 le soir du 22, après une nuit blanche et un cours manqué. Le programme
>   fait donc **173 jours** : le 14 mars, fin de saison, ne bouge pas. (Ancienne note : repoussé dans la nuit du 20
>   au 21, à 2 h du matin). `PROGRAMME_DEBUT = '2026-09-22'`. La semaine de programme court
>   donc du **mardi au lundi**.
> - **La séance de référence tombe sur un Bas complet**, puisque le mardi en est un :
>   `premierJourSport()` rend le 22 lui-même. Les **maximums de tractions et de dips se
>   prennent le jeudi 24**, au premier jour de haut. Les retests des semaines 5, 10 et 15
>   suivent la même règle : **mardis 20 octobre, 24 novembre, 29 décembre**.
> - **La phase Español va jusqu'au 22 octobre** (au lieu du 18) : « pile 1 mois du mardi ».
>   Les onze blocs reviennent aux projets le **23 octobre**. En revanche **l'épreuve du
>   dimanche garde ses quatre passages — 27 sept., 4, 11 et 18 octobre** (`EPREUVE_FIN`) :
>   c'est une série de mesures, pas la phase.
> - **L'onglet Courses ne porte plus que de la nourriture** : 17 articles, 5 catégories.
>   Les 28 lignes d'hygiène et d'entretien ont été retirées (migration `courses-plan-v8`,
>   les coches conservées). « Le fil des jours » a été supprimé : son successeur est
>   **Ce qu'il reste à faire**.

> **Vérification finale, sur la version publiée :**
> 90 tests · 0 échec · 0 assertion FAIL · 0 erreur de page.
> `audit.mjs` aucun défaut sur les 4 gabarits · `audit-suivi.mjs` aucune erreur de calcul ·
> `contraste.mjs` AA tenu sur les deux thèmes · `verif-pages.mjs` toutes les pages saines.
> La Batcave est en **v78**.

## CE QU'IL RESTE À FAIRE — la seule liste qui compte

### Ce soir
- [ ] **L'essai de restauration** : 💾 → `♻️ Restaurer depuis Drive` → celle du 19.
      Vérifier ensuite que la liste d’habitudes et les 4 dépendances sont là.
      *C'est le seul maillon de la chaîne de sauvegarde jamais éprouvé.*
- [ ] **La synchro** : Batcave ouverte sur l'iPhone ET sur l'ordi, cocher une habitude
      sur l'un, recharger l'autre.
- [ ] **Le relevé du placard** : pâtes, riz, flocons, œufs, huile d'olive, beurre de
      cacahuète. La liste travaille sur une photo du 13 septembre.

### Dimanche 20
- [ ] **Les courses** — **17 articles**, tout est dû (semaine d'ancre). Le matin.
      La liste ne porte plus que de la nourriture depuis le 20 au soir : hygiène, maison,
      ménage et brosse à dents en sont sortis. Chaque ligne porte une **pastille** qui dit
      où l'acheter au moins cher. Ces adresses ont changé le 21 septembre, une fois les prix
      relevés en rayon : boucherie (halal, obligatoire), **Lidl pour presque tout le reste**
      — dont le skyr (0,75 € la boîte de 150 g) et l'huile (11,89 € le bidon de 2 L), qui
      étaient à Alcampo —, frutería (fruits de saison), Alcampo (le beurre de cacahuète
      seul, 5,30 €/kg), en ligne (créatine). Mercadona ne figure plus nulle part. Les
      **seize** lignes portent un prix relevé : 44,89 € la semaine, 194,54 € le mois.
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
| Commencer lundi, pas samedi | jour 1 = **mercredi 23 septembre** (repoussé du 21 dans la nuit du 20 au 21 : « on a dit qu'on commence mardi la Batcave ») |
| La phase Español « pile un mois du mardi » | elle se **termine le 22 octobre** au lieu du 18 ; les projets perso démarrent le 23 |
| Courses le dimanche matin | ancre au samedi 19, premier passage le 20 |
| Plus d'estimation de budget | retirée de bout en bout |
| Cocher même sans acheter | c'était déjà le comportement |
| Les produits d'entretien de retour, puis ressortis | revenus le 19, rythmes recalculés le 20, **sortis le 20 au soir** — « juste les aliments et la bouffe » |
| La liste de courses ne porte que de la nourriture | 17 lignes, toutes issues du plan de repas sauf la créatine |
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
