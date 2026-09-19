# Où on en est — nuit du 19 au 20 septembre 2026

Ce fichier existe pour une seule raison : que rien ne dépende de ma mémoire.
Il dit ce qui est fait, ce qui reste, et ce qui attend une décision de toi.

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
| 3 phases jusqu'en mars | **une seule**, 19 sept. → 18 oct. |
| diagnostic lundi 14 sept. 13:00 | **dimanche 20 sept. 11:20** |
| DELE B2 blanc 17-18 oct. | **retiré** |
| « Cartes du dernier cours » 09:20 | **Étudier en avance**, 09:20-11:20, un tema *non encore vu* |
| « Annales » 10:20 | **Question ouverte ou autre**, 11:20 |
| « Comprendre le cours » 20:30-21:30 | **Clore le cours du jour**, 20:30-21:10 (18:00 le mardi), 20 min par cours |
| — | **Approfondir, Lire, Simulation dentaire, Réexpliquer** : manquaient tous |
| Universidad de Alicante | **Universidad Europea** |
| Semestre et ECTS vides sur les 11 fiches | remplis — 5 matières au S1 (24 ECTS), 6 au S2 (36) |
| Boutique : « 19 h par semaine » | **0 h** pendant la phase Español, ≈ 17 h après, et un rendu passe avant |

## La chose importante que j'ai trouvée en republiant

**Le jour 1 n'était pas le même dans le code et dans les pages.** Ta décision du
18 au soir — commencer la Batcave le dimanche — était bien passée dans le code
(`PROGRAMME_DEBUT = 2026-09-20`) mais dans **aucune page** : toutes annonçaient
« samedi 19, jour 1 ». Un jour d'écart sur le premier jour compté, et on était
justement le 19.

Vérifié dans l'application, pas déduit : `__bcProgrammeDebut` rend bien
2026-09-20, le dimanche 20 est « Off » au sport, le lundi 21 est « Haut lourd ».
Donc :

- **jour 1 = dimanche 20 septembre** (copie vierge, simulation 09:20, Réexpliquer
  10:20, diagnostic d'espagnol 11:20, contrôle du dimanche 13:30) ;
- **samedi 19 = dernière journée de préparation** (guías docentes, Wuolah, trente
  termes par matière) — la grille tourne, mais rien n'est compté ;
- **séance de référence = lundi 21 à 05:30**, pas le 19 ;
- **retests = lundis 19 octobre, 23 novembre, 28 décembre**, pas les samedis.

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

## À reprendre au réveil, dans l'ordre

1. **Le résultat de la campagne** — elle tournait quand tu es parti. Si elle
   est rouge, c'est la première chose.
2. **Republier les deux derniers artefacts** : Prise en main
   (`QS76Jnd5Rj8ZtfxD74j5d6`) et Dental Mastery OS (`Xx6jKFznJVVR4nacv5nGKm`).
   Déjà republiés cette nuit : la Batcave (v77), Le calendrier du S1 (v6),
   Le semestre (v12), et **« Ce qu'il reste à faire », publié pour la première
   fois** → https://claude.ai/artifact/BdUn7c8D3ssBDzs2w7MaPZ
3. **Ta question sur les objectifs à la fin des périodes** — j'ai la réponse,
   je ne te l'ai pas encore donnée. En deux lignes : rien n'est supprimé, le
   verdict se fige, la période suivante existe déjà, et `recalerObjectifsSemaine()`
   recalcule les cibles « auto » depuis la vraie grille à chaque démarrage —
   donc tes cibles s'ajusteront seules le 25 janvier. Ce qui **manque**, c'est
   une cérémonie de clôture de fin de mois ou de trimestre : `cloturerSaison()`
   existe et a un bouton, mais personne ne te dit « la période est finie, voilà
   ce que tu as fait ». C'est une des cinq décisions ci-dessous.

---

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
