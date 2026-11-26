# Où on en est — samedi 19 septembre 2026, au soir

> ### Jeudi 26 novembre, 20:00 — le rattrapage, tema par tema, du vendredi 27 au dimanche 6 décembre
> **Ses mots** : « fais moi un plan pour rattraper les cours sur les prochains jours, c'est super important j'ai bcp de
> retard », puis « j'ai pas touché un cours depuis le début de l'année », puis « j'ai combien de temas a rattraper, il faut
> que je rattrape les temes tout en gardant la periode d'espagnol dans ma journée ».
> **Le compte** (cronogramas de `le-semestre.html`, sa dernière sauvegarde Drive date du 20) : **57 temas donnés au 26 novembre**
>   — Anatomía 22, Epidemiología 15, Biología 12, Antropología 8 — et Documentación à part (sa base Notion porte encore
>   des cours de Lille, le vrai plan est sur Canvas). 13 arrivent d'ici le 18 décembre : 70 avant les examens.
> **Le plan** (`RATTRAPAGE_TEMAS`, du 27 novembre au 6 décembre, généré sur la grille réelle avec ses échéances) : chaque
>   bloc d'étude et de projets dit son tema, dans l'ordre des échéances ; l'espagnol, la clôture du cours et la
>   préparation de la veille restent. Vendredi Epidemiología 6, 8, 10 et les tableaux RR/OR (l'examen RR/OR, le 27 au
>   cronograma) ; samedi Antropología 4 et l'actividad 1 (à rendre avant le 30), puis Anatomía 10.1 ; dimanche Anatomía
>   10.2 à 13.1 ; lundi 13.2 et Biología 10 à 12 (le séminaire de génétique, le 1er) ; mardi les láminas 3 et le
>   cuestionario 3 en rappel actif ; mercredi un dernier passage avant 17:30 ; jeudi Antropología 7 à 9 (le cuestionario
>   du 4) ; samedi 5 Anatomía 7 et 8 (le cuestionario 4 du 16). Le reste suit l'ordre des examens : Anatomía,
>   Epidemiología, Biología, un tema court d'Antropología sur quatre. 1 h 30 par tema, 40 min en Antropología,
>   15 min d'Anki chaque matin dès le samedi. **32 temas finis le 6 décembre**, 38 dans la file ensuite (tout vu vers le 19).
>   Le 9 novembre, il voulait seulement le « quand » : il demande un plan, les blocs redisent donc le « quoi ».
> **Dans « Ma journée »** : une ligne du rattrapage s'ouvre sur son tema (`build_guide.py` lit « 📚 titre — détail »),
>   la clôture du soir des 27, 2 et 4 ne dit plus « le tema a déjà été étudié le matin d'avance » (`CONSIGNES_DATEES`).
>   Le protocole ne parle plus des créneaux de la salle et du JJB (repris le 9 novembre seulement).
> **Les pages** : « Ta semaine type » passe à la semaine du 14 décembre (celle du 30 porte le rattrapage) ; « Le plan
>   machine » reprend le compte (57 déjà donnés, 32 au 6 décembre, tout vu vers le 19) ; « Ta semaine » suit le guide.
> **Tests recalés** : 43 (l'urgence du week-end lue les 12 et 13 décembre : les blocs de projets du rattrapage repoussent
> le dernier bloc de révision), 48 (la cible de novembre, 31,9 h ; 24,9 h attendues le 29 ; 34,3 h sur 44), 78 (le lundi
> 30, 5 h 16), 84 (la semaine du 30, 33 h 32 de révision, l'espagnol inchangé), 96 (les créneaux Approfondir lus la
> semaine du 7 décembre : celui du samedi 28 sert au rattrapage).
> **Vérifié** : la campagne complète (115 tests : 110 du premier coup, les 5 recalés verts ensuite, 120, 43 et 78 relancés
>   sur la version finale) ; la saison avec sa sauvegarde, du 26 novembre au 6 juin : A, 193 jours et 3 652 cases, toutes
>   justes, le pas à pas identique à la grille ; ses données réelles (le 24 et le 29) ; « Ma journée » du vendredi 27 et du
>   mercredi 2 sur téléphone : chaque ligne du rattrapage porte son tema, aucune alerte, rien ne déborde ; verif-pages vert.
> **Publié** : la Batcave (v212), « Ta semaine », « Ta semaine type », « Le plan machine ».
> **En attente** : si l'examen RR/OR a eu lieu jeudi ou vendredi, si l'actividad 1 est rendue, et le plan de Documentación.

> ### Mardi 24 novembre, 08:39 — « On décale tout pour avoir un jour 1 le mercredi 25 » : REFUSÉ, le verrou tient
> **Ses mots**, à 08:39, le matin du jour 1 : « On décale tout pour avoir un jour 1 le mercredi 25 ». Pas de raison donnée ;
> la matinée est passée (réveil 05:20, la salle de 07:00).
> **Réponse** : non, rien n'est recalé. C'est le verrou demandé à 00:24 (« Oui, verrouille-le ») et la règle 1 du
> « Plan machine » : une journée ratée ne fait rien recommencer, on reprend à la ligne en cours (08:30, le shake et une
> page de Coran ; 09:00, Anki 2). Jamais deux jours ratés de suite.
> **La salle ratée** : rien à changer. La séance de référence est la première séance FAITE depuis le départ
>   (`premiereSeanceFaite`, depuis le 7 novembre) ; sans séance notée mardi, elle passe d'elle-même au jeudi 26 à 07:00 :
>   le Plan du jour l'annonce ce matin-là (vérifié en simulant mercredi 25 et jeudi 26 : `premierJourSport` = le 26).
> **Rappelé aussi** : l'appel au centro de salud pour les douleurs à la poitrine (la note du jour), et la copie vierge
>   (bouton Sauvegarde) avant toute saisie.
> **Vérifié** (après la réponse) : audit, audit-suivi, audit-cablage, contraste, verif-profonde et ses données réelles (le
>   24 au réveil et à midi, le 29) verts. Deux trouvailles, corrigées :
>   - verif-pages : dans « Ta semaine type », l'ancre « dimanche » était cassée. La semaine du 23 part du mardi, et les
>     ancres suivaient l'ordre des jours, pas leur nom (« lun » ouvrait le mardi, « sam » le dimanche). La page montre
>     désormais la première semaine entière, du lundi 30 novembre au dimanche 6 décembre (ses échéances du 1er, du 2 et
>     du 4, le JJB du mercredi et du vendredi), et chaque ancre suit le nom de son jour (`gen_semaine_type.py`) ; republiée ;
>   - la saison (zz-journee-saison) : la règle réécrite à part ne rangeait pas les brosses dans le ménage du dimanche, et
>     attendait leur ligne à part ; recalée. A : 195 jours, 5 133 lignes, 3 689 cases, toutes justes ; le pas à pas écrit
>     sur 62 jours, la grille de la Batcave sur 133, aucun jour changé depuis l'écriture. B : les 195 jours ouverts
>     comme aujourd'hui, tout coché, décoché et rechargé : tout vert.
>   verif-pages relancé : tout vert, « Ta semaine type » comprise.

> ### Mardi 24 novembre, 00:24 — LE JOUR 1 AU MARDI 24, VERROUILLÉ ; les brosses de douche le dimanche
> **LE VERROU** : à « veux-tu que je refuse les prochains décalages ? », sa réponse : « Oui, verrouille-le ». S'il redemande
> de tout décaler, on ne recale plus rien : on le renvoie à la ligne du jour (`PROGRAMME_DEBUT`, commenté VERROUILLÉ).
> **Ses mots** : « je vais me brusquer et ça va passer j'y crois, donc on décale tout à demain, début de la phase
> d'espagnol etc » ; à 00:24, « demain » = « Mardi 24, ce matin » (sa réponse à la question). Plus tôt : « est-ce que les
> gens tiennent quand ils changent toute leur vie d'un coup ? », puis « j'ai jamais vraiment essayé, je décale sans même
> essayer ». Réponse donnée : la plupart ne tiennent pas (Norcross 1988 : 77 % à une semaine, 19 % à deux ans) ; tout
> d'un coup ou un par un, pas de gagnant net (James 2016) ; ce qui fait tomber, c'est le premier raté vécu comme un échec
> total ; pour lui, le blocage est le démarrage (Steel 2007, Polivy et Herman 2002, Wohl 2010). Il a choisi de se brusquer.
> **Les dates** :
> - le jour 1 (`PROGRAMME_DEBUT`) et la salle (`MUSCU_DEBUT`) au mardi 24 : la séance de référence ce matin-là (un Bas
>   complet), le demi-volume 14 jours après elle, les retests les lundis 21 décembre, 25 janvier et 1er mars ;
> - le JJB garde le mercredi 2 décembre ;
> - le mois d'espagnol (`ES_REPRISE_DEBUT/FIN`) du mardi 24 novembre au mercredi 23 décembre (51 h de blocs, ≈ 47 h 30
>   au minuteur) ; l'épreuve : le diagnostic le dimanche 29, puis les 6, 13 et 20 décembre ;
> - l'e-commerce le jeudi 24 décembre (4 h 50 ce jour-là, 15 h 50 jusqu'au 27, 26 h 20 la semaine du 28) ;
> - l'ancre du dimanche au 29 (`ancre-dimanche-v6`, les ancres posées par la Batcave, dont le 22) : photos et brosse à
>   dents du point de départ le 29, puis les photos les 27 décembre, 24 janvier et 21 février (le bilan peau,
>   `BILAN_PEAU_ISO`) ; les ongles les 29 novembre, 13 décembre… ;
> - l'horizon des objectifs du 24 novembre au 6 juin (migration de l'horizon du 20) ; la boucle poids → calories, rien
>   avant le 15 décembre.
> **Mardi 24, les repas** (`CONSIGNES_DATEES`) : le batch du dimanche 22 n'a pas eu lieu. Déjeuner et dîner simples, avec
> ce qu'il a ; au retour du cours, les courses si le frigo est vide, pour le batch de 19:10.
> **Les brosses de douche en silicone** (sa demande, « en mode d'intervalle ») : `HABIT_SEED_V16`, chaque dimanche, rangées
> avec le ménage (`REGROUPES`) ; la consigne du ménage : liquide vaisselle, dix minutes dans l'eau chaude de la bouilloire,
> suspendues ; rincées après chaque douche. Schéma 73.
> **Ses autres questions** : « je dois juste suivre ma journée et le reste se fait tout seul ? » — oui ; « nettoyer le
> frigo » — déjà dans « Ma journée », le samedi 28 novembre avant de ranger les courses, puis toutes les quatre semaines.
> **Le guide** : `SEMAINES` part de la semaine du 23, gardée du mardi au dimanche ; les neuf semaines ré-extraites avec sa
> sauvegarde du 19. **Les pages** : la prise en main (u7, le batch du 18, laisse sa place à u9, les courses du mardi), les
> dossiers Español (v2.25) et E-commerce, « Paliers de physique », « À quoi sert la Batcave » (les analyses dès le 25),
> « Le plan machine » (le verrou, le rattrapage depuis le mardi : 14 temas d'ici le 29, 70 au 23 décembre, 81 le 27 ;
> le test de la boutique le 24 décembre à 65 temas), programme-sport.md, programme-alimentation.md, la semaine type.
> **Tests recalés** : 41, 42, 43, 47, 48, 49, 52, 57, 59, 64, 65, 66, 68, 73, 74, 75, 76, 78, 81, 82, 83, 84, 85, 88, 90,
> 92, 101, 106, 107, 108, 109, 115, 116, 118, 119, 120, 121 et 123, audit-suivi et zz-journee-saison. Ceux qui lisaient le
> vendredi 20 lisent le mardi 24 ; ceux qui lisaient l'ancre du 22, le dimanche 29. test119 vérifie la graine v16 (les
> brosses chaque dimanche, jamais en semaine, et la consigne du ménage) ; test120 prend aussi ses échéances du 1er au
> 16 décembre (sa sauvegarde du 19), pour que les mardis de décembre suivent le pas à pas.
> **Vérifié** : la campagne complète, 115 tests sur 115 ; avec sa sauvegarde du 19, le mardi 24 (au réveil, et à midi
>   sur téléphone) et le dimanche 29 sans erreur ni débordement, et les 62 jours du pas à pas (24 novembre → 24 janvier)
>   identiques à la grille vivante : aucune alerte « la grille a changé ». Les audits et la saison : l'entrée de 08:39.
> **Publié** : la Batcave (avant tout le reste, vers 00:40), « Ta semaine », « Ta semaine type », la prise en main, les
> dossiers Español et E-commerce, « Paliers de physique », « À quoi sert la Batcave », « Le plan machine ».
> **En attente** : la pesée du dimanche 29, ses premières journées notées, son avis sur le test du 24 décembre.

> ### Lundi 23 novembre — « Le plan machine » : études, corps, argent, étape par étape
> **Ses mots** : « je veux devenir une machine academique, athletique et avoir un gros patrimoine, je veux un guide etape
> par etape ».
> **Lu avant d'écrire** :
> - sa dernière sauvegarde Drive est du vendredi 20 à 13:01, rien depuis. La pesée du dimanche 22 n'y est pas ;
> - le bilan du dimanche 22 (page générée par la Batcave) : 0 minute sur 26 h 03 prévues, 0 séance, 0 pesée ;
> - le cache Notion du 18 : 81 temas sur 81 « pas fait » (Anatomía I 26, Epidemiología 20, Biología celular 14,
>   Documentación 11, Antropología 10) ;
> - sa page « Que faire de ton argent pendant tes études : 7 plans », faite ailleurs le jour même : ≈ 199 000 € de prêts
>   à l'été 2027 (50 875 € BNP déjà sur son compte, 48 000 € à débloquer, deux prêts à 0 % pour 100 000 €), l'AideFi dès
>   l'hiver 2027, le plan D (un grand 4 pièces en 5 chambres, 10 % sous le marché) ou tout placé (plan G).
> **La page** (`plan-machine.html`, publiée : https://claude.ai/artifact/Cxw8yn1TtkBRHN4sEiytfL, icône « map ») :
> - le relevé du lundi, puis six règles. La première : le jour 1 ne bouge plus (posé à douze dates depuis la mi-octobre) ;
> - la route en sept étapes, de cette semaine (étape 0, « Tu es ici ») au cabinet (étape 6). Chaque étape a trois
>   chantiers (études, corps, argent) et une condition de passage ;
> - le rattrapage chiffré : ≈ 104 h au protocole de la Batcave. Deux temas par jour de cours, trois les autres jours :
>   16 d'ici le 29, 65 au 20 décembre, tout vu le 26 ;
> - l'argent en trois poches (le mois, l'emprunté, l'investi), une projection à 5 % réel avec un calculateur (3, 5 ou 7 %),
>   où placer en Espagne (fonds indexé plutôt qu'ETF à cause du traspaso, vérifié sur MyInvestor et Economipedia), et
>   ce qu'il ne fait pas ;
> - le tableau de bord, la reprise après un décrochage, ses huit pages. « Ton empire dentaire » et « Dental Mastery OS »
>   ne sont plus publiées : aucun lien vers elles.
> **Décidé par défaut, dit dans la réponse** :
> - le test du dimanche 20 décembre : 60 temas vus sur 81, sinon la boutique attend le 21 janvier (la règle de son
>   dossier E-commerce) ;
> - l'hypothèse de placement : 100 €/mois dès septembre 2027, 1 000 €/mois dès juillet 2031.
> **Vérifié** : le rendu à 400 et 1 280 px (aucun débordement, aucune erreur) ; le calculateur, dont le tableau statique
> égale celui du script ; le jour de la semaine de chaque date citée.
> **En attente** : la pesée du dimanche 29, son avis sur le test du 20 décembre, le JJB au 2 décembre, les rappels des
> cours de la fac.

> ### Jeudi 19 novembre — le jour 1 au vendredi 20 ; pas de JJB en novembre
> **Ses mots** : « on commence tout demain vendredi, ce mois ci j'aurais pas assez pour le JJB ». Sa sauvegarde du 19
> (17:40) : les courses de mercredi cochées, rien d'autre de noté.
> **Les dates** :
> - le jour 1 (`PROGRAMME_DEBUT`) passe au vendredi 20 ;
> - la salle (`MUSCU_DEBUT`) aussi, mais le vendredi n'a pas de salle : la première séance, la séance de référence, est
>   le samedi 21. Demi-volume jusqu'au 4 décembre ; les retests restent les lundis 14 décembre, 18 janvier et 22 février
>   (la semaine de la première séance est toujours celle du 16) ;
> - le JJB : pas en novembre. La pause (`COMBAT_PAUSE_2`) va jusqu'au mardi 1er décembre, et le premier JJB est le
>   mercredi 2. Choix par défaut, dit dans la réponse : le premier cours de décembre, payé avec l'argent du 25 (la
>   licence, 30 €, et décembre, 70 €). L'abonnement de novembre sort des dettes (`A_REGLER`). D'ici là, les matins de
>   club sont des blocs d'étude (question ouverte à 10:20, le livrable de la semaine à 11:20), sans collation combat ni
>   shake de récup ;
> - le mois d'espagnol (`ES_REPRISE_DEBUT/FIN`) va du vendredi 20 novembre au samedi 19 décembre, un mois pile : 50 h 20
>   de blocs, dont 46 h 59 au minuteur. L'e-commerce commence le dimanche 20 décembre (4 h 30 ce jour-là, puis 23 h 20 la
>   semaine du 21). Les quatre dimanches de l'épreuve ne bougent pas ;
> - l'horizon des objectifs part du 20 novembre (migration des horizons du 16 et du 19) ;
> - la semaine de référence des courses (`BESOIN_SEMAINE`) devient celle du 14 décembre, la première pleine (salle, JJB,
>   cours, sans férié) ; celle du 23 n'a plus de JJB.
> **L'agenda** : la Batcave du jeudi l'avait déjà remis sur le jeudi 19 à 17:43. J'ai retiré à la main la collation
> combat, le trajet du club (et son rappel de 10:15), le JJB et le retour du club du vendredi 20 ; le reste se refait à
> la prochaine ouverture (le jour 1 a changé, la remise au propre repart du 20 au 24 janvier).
> **Le guide** : « Ta semaine » et « Ma journée » partent du vendredi 20 (66 jours), les dix semaines ré-extraites avec
> sa sauvegarde du 19. Le samedi 21, la ligne de la salle dit la séance de référence. Le vendredi 20, l'appel au centro
> de salud ne dit plus « en rentrant de la salle ». « Ta semaine type » reste la semaine du 23, la vraie semaine qui
> vient, et dit que le JJB n'y est pas.
> **Les pages** : la prise en main (le club le mercredi 2 décembre, les cases du départ au vendredi 20, sans nouvelle
> clé pour garder ce qu'il a coché ; l'épreuve du dimanche disait encore trois dates, elle en dit quatre), le dossier
> Español (v2.24), le dossier E-commerce, « Paliers de physique » (la base mesurée le samedi 21), programme-sport.md et
> programme-alimentation.md (le JJB disait encore « à partir du 2 novembre »), suivi-batcave.
> **Corrigé en passant** :
> - le premier club après la pause (mercredi 2 décembre) annonçait la tenue de salle de mardi, lundi, samedi et jeudi : la
>   consigne remontait jusqu'au dernier JJB. Pendant la pause, la machine du lundi, du mercredi et du vendredi a lieu quand
>   même (l'habitude du linge) : elle s'arrête désormais au dernier jour de machine, et ne dit plus que mardi ;
> - un soir de veille avec deux échéances le lendemain (le mercredi 25, le 1er et le 15 décembre), la note de « Ma
>   journée » mélangeait les matières ; chacune garde la sienne.
> **Tests recalés** : 47, 48, 49, 52, 53, 57, 59, 64, 65, 66, 70, 74, 75, 76, 78, 80, 81, 83, 84, 85, 86, 87, 88, 100,
> 106, 107, 109, 114, 115, 118, 120, 122 et 123, zz-semaine, zz-journee-saison et audit-suivi. Ceux qui lisaient un JJB en
> novembre lisent la semaine du 14 décembre, la première pleine.
> **Vérifié** : la campagne complète (115 tests) ; les sept audits (audit, audit-suivi recalé, audit-cablage, verif-pages, contraste,
>   verif-profonde, et ses données réelles le 19 au soir, le 20 et le 22) ; la saison avec sa sauvegarde du 19, du
>   20 novembre au 6 juin : A, 199 jours et 3 769 cases, toutes justes, le pas à pas identique à la grille sur ses 66 jours ;
>   B, chaque jour ouvert comme aujourd'hui, coché, décoché et rechargé, tout vert.
> **Publié** : la Batcave, « Ta semaine », « Ta semaine type », « À quoi sert la Batcave », la prise en main, les
>   dossiers Español et E-commerce, « Paliers de physique ».
> **En attente** : sa pesée de dimanche 22, sa réponse sur les rappels des cours de la fac, et la date du JJB si le
> mercredi 2 décembre ne lui va pas.

> ### Mercredi 18 novembre — le jour 1 au jeudi 19 ; un mois d'espagnol pile, puis l'e-commerce
> **Ses mots** : « ensuite on vas decaler le premier jour a demain, jeudi 19/11, on va tout decaler, le programme
> d'apprentissage d'espagnol doit prendre 1 mois pile, parce que apres je commence a rebosser sur l'eccomerce, pas le
> choix ». Pour manger de jeudi à samedi : « je vais faire les courses et cuisiner apres les cours ajd ».
> **Les dates (schéma 72)** :
> - le jour 1 (`PROGRAMME_DEBUT`) et la salle (`MUSCU_DEBUT`) passent au jeudi 19 ;
> - la pause du combat (`COMBAT_PAUSE_2`) va jusqu'au mercredi 18 : le premier JJB est le vendredi 20, et le club
>   (licence et abonnement de novembre) se paie ce jour-là ;
> - le mois d'espagnol (`ES_REPRISE_DEBUT/FIN`) va du jeudi 19 novembre au vendredi 18 décembre, 30 jours : environ
>   50 h de blocs, dont 47 h au minuteur. L'e-commerce reprend le samedi 19 décembre ;
> - les quatre passages de l'épreuve d'espagnol tombent les dimanches 22 et 29 novembre, 6 et 13 décembre ;
> - l'horizon des objectifs va du 19 novembre au 6 juin (migration de l'horizon du 16).
> - Ce qui se compte depuis le jour 1 suit tout seul. Les retests restent les lundis 14 décembre, 18 janvier et
>   22 février (lundi des semaines 5, 10 et 15 de muscu).
> - La salle : séance de référence le jeudi 19, à demi-volume jusqu'au 2 décembre, complète dès le 3.
> **Le batch de ce soir** (`BATCH_SOIR_DEPART`) : le plan du jour de mercredi le dit, après les cours, en une heure :
> - les courses : 210 g de poulet, 280 g de viande hachée, 240 g de brocoli, 320 g d'épinards, 6 œufs, une boîte de
>   sardines (la collation de jeudi) ;
> - la cuisson : 375 g de pâtes du placard, six boîtes au frigo (3 midis, 3 soirs). Le riz se cuit chaque matin ;
> - son dîner de mercredi : une septième portion, mangée tout de suite (70 g de viande hachée, 80 g d'épinards, 125 g
>   de riz cuits le soir). La consigne du dîner du 18 le dit aussi : il n'y avait pas encore de boîte.
> Les midis du jeudi au samedi disent « cuites au batch de mercredi soir ». La liste lui est partie par notification
> à 18:55, avant la fin de ses cours (je la croyais déjà envoyée : elle ne l'était pas).
> **L'agenda** : à la prochaine ouverture de la Batcave, la remise au propre repart une fois, du jeudi 19 au 24 janvier.
> **Les pages** :
> - « Ta semaine » commence au jeudi 19 (67 jours jusqu'au 24 janvier) ; « Ta semaine type » et la prise en main suivent ;
> - le dossier Español (v2.23) et le dossier E-commerce sont recalés (semaine 1 du 21 au 27 décembre) ;
> - « Paliers de physique » part du jeudi 19, comme programme-sport.md et programme-alimentation.md (du 19 novembre au
>   6 juin) ;
> - l'onglet Sport dit « JJB dès le vendredi 20 novembre ».
> **Corrigé en passant (le guide)** : un soir de préparation (« Préparer · … » de 20:25 à 20:45), « Prépare demain »
> tombait à 20:45, à la même heure que la douche, et la note du jeudi disait 20:40. Elle passe après la douche, à 21:00,
> et la note dit l'heure de la ligne. Le jeudi 19 est concerné : l'Actividad 4 d'Antropología du vendredi.
> **Tests recalés** : 41, 43, 45, 47, 48, 49, 52, 57, 59, 64, 65, 68, 70, 71, 73, 74, 75, 76, 78, 81 à 85, 87, 88, 96,
> 106, 107, 109, 115, 118 et 120. Les dates qui tombaient avant le jeudi 19, ou dans le mois d'espagnol qui finit
> désormais le 18 décembre, passent à des dates équivalentes. test84 vérifie aussi le mois pile : de l'espagnol le
> vendredi 18 décembre, plus rien le samedi 19.
> **Vérifié** :
> - la campagne complète (115 tests), puis 74, 115, 120, 64 et 88 après les dernières retouches ;
> - la saison avec ses données (zz-journee-saison, du 19 novembre au 6 juin) : A, 200 jours et 3 786 cases, toutes
>   justes, le pas à pas écrit identique à la grille sur ses 67 jours ; B, chaque jour ouvert comme aujourd'hui, coché, décoché et rechargé, tout vert ;
> - les sept audits : audit, audit-suivi (recalé : ses calculs d'un lundi se lisent au lundi 23, le jour 1 au jeudi 19,
>   et le 14 décembre est désormais dans le mois d'espagnol), audit-cablage, verif-pages, contraste, verif-profonde, et
>   ses données réelles le 18 au soir, le 19 et le 22 ;
> - l'onglet Sport : « dès le vendredi 20 » plutôt que « dès le vendredi 20 novembre », pour qu'il garde sa hauteur
>   (test88).
> **Publié** : la Batcave, « Ta semaine », « Ta semaine type », « À quoi sert la Batcave », la prise en main, les
> dossiers Español et E-commerce, « Paliers de physique ».
> **En attente** : sa pesée de dimanche 22 (60 ou 64 kg), et sa réponse sur les rappels des cours de la fac.

> ### Mardi 17 novembre, l'après-midi — l'agenda ne sonne qu'aux départs ; le jeudi en 55 minutes ; le dimanche allégé
> **Ses mots** : « fais la 2, ajuste pour la 3, et la 5, je te dirai ce dimanche pour la pesée ». Trois des cinq
> améliorations proposées le midi.
> **Google Agenda (la 2)** : il sonnait 5 min avant chaque bloc, de 17 à 26 fois par jour (21,5 en moyenne sur la saison).
> Il ne sonne plus qu'aux moments où il faut bouger (`rappelBloc`) :
> - 5 min avant chaque départ (« Trajet salle », « Trajet cours », « Trajet club », « Trajet mosquée », « Trajet · » un
>   examen) ; « Trajet retour » se tait ;
> - à l'ouverture de la clôture, et 30 min avant le coucher.
> Les autres blocs restent dans l'agenda, à leur heure, sans aucun rappel (`useDefaultReminders:false`). Ça fait 3,3
> moments par jour en moyenne, entre 2 et 5. Les rappels posés à part (les deux brossages, les tapis) et les cours de la
> fac ne changent pas.
> L'envoi n'écrit plus que ce qui diffère vraiment de l'agenda (`alignerSurBloc`) : l'heure, le titre, la consigne, le
> rappel. Un événement déjà juste ne coûte aucun appel. Le rappel va sur la SÉRIE : Google le reporte aussi sur les
> occurrences déjà modifiées, vérifié sur « Anki matinal » dans son agenda. La remise au propre jusqu'au 24 janvier
> repart une fois (`GCAL_RECONSTRUCTION_TACHES` = 2) pour poser les bons rappels.
> J'ai déjà coupé moi-même les 18 séries muettes de mercredi et le « Préparer · Anatomia 1 » du 18 : demain, son agenda
> ne sonne plus qu'au trajet du club, au trajet des cours, à la clôture et au coucher. Google refuse plus de quelques
> écritures à la fois (« Resource has been exhausted ») : la Batcave en fait trois en parallèle, comme le 12.
> **Le jeudi (la 3)** : la séance durait environ 74 min, pas 55. Le calcul compte les séries, les repos, l'échauffement
> et le passage d'un poste à l'autre ; le lundi, le mardi et le samedi tiennent déjà. Elle tombe à environ 54 min :
> - tractions et développé couché passent de 4 à 3 séries (dos 14 séries par semaine, pectoraux 9) ;
> - les repos des paires sont plus courts : 60 s / 90 s, puis 45 s / 75 s, 30 s / 60 s, et 30 s entre les trois du trio.
> Entre deux séries d'un même gros muscle, il reste plus de 3 min (3 min 20 aux tractions, 3 min 40 au couché). Les
> exercices et leur ordre ne bougent pas : le journal et la progression se lisent pareil. programme-sport.md suit.
> **Le dimanche (la 5)** : le jour où leur case mère tombe, les tâches suivantes s'y rangent (`REGROUPES`, `casesDuJour`).
> - Avec le ménage : l'entretien des machines (la semaine, le mois), le filtre de la machine à laver, le détartrage, le
>   rideau de douche, les pièces neuves du robot et de l'aspirateur.
> - Avec les draps : la serviette de corps, le matelas, l'oreiller, la couette.
> La case mère dit « avec : … » et se coche seule. Leurs dates ne bougent pas : elles suivent un cycle sur le calendrier,
> pas la dernière coche. Le compte, la clôture, le plan du jour et l'anneau comptent les cases affichées.
> Le dimanche passe de 24-26 cases à 21-24, soit 2 ou 3 de moins, et non « environ 6 » comme je l'avais annoncé.
> « Ta semaine » et « Ta semaine type » regroupent pareil.
> **Vérifié** :
> - test123 (les trois changements), test52 et test118 (les rappels, avec un agenda simulé qui garde les rappels et les
>   reporte d'une série sur ses occurrences), test47, test70 et test72 (le jeudi) ;
> - la campagne complète (115 tests) et les audits (audit, audit-suivi, audit-cablage, verif-pages, contraste,
>   verif-profonde, et la vérification avec ses données réelles) ;
> - la saison avec ses données (zz-journee-saison) : A, 203 jours et 3 842 cases (99 de moins), toutes justes ; B,
>   chaque jour coché, décoché et rechargé.
> **En attente** : sa pesée de dimanche 22 (60 ou 64 kg) pour recaler les calories et l'objectif de juin.

> ### Mardi 17 novembre — tout se coche dans « Ma journée », sans suivi ; le cou du jeudi à la salle
> **Ses mots** : « je veux pouvoir cocher dans ma journée, pas besoin de traquer, on va faire un tri dans mes habitudes
> d'abord, puis on va enlever l'onglet habitude […] mais ça veut aussi dire que l'onglet ma journée doit tout afficher
> correctement, il ne peut pas y avoir d'erreurs ». Il a validé le tri proposé (« ok on fait ça »), et ajouté : « tu
> rajoutes un exercice d'entraînement du cou dans le programme d'entraînement le jeudi ».
> **Le tri (schéma 72, `HABITUDES_RETIREES`, sans drapeau)** : la revue de la veille (la clôture la fait), la marche
> (les pas ne se notent plus), « Courses faites » (le bloc et la liste le disent) et le cou du jeudi soir sortent. Le
> filtre passe à chaque lecture, donc une liste revenue d'un autre appareil est nettoyée aussi. Les graines V2, V3 et
> V10 ne les portent plus. Il reste 44 cases : 16 habitudes et 28 gestes de routine, de 17 à 26 par jour.
> **Un seul endroit où cocher** : « Ma journée » montre « Tes habitudes du jour » puis « La routine du jour », toutes
> deux à cocher (`sansCase` ne fait plus que ranger la routine). Un jour passé montre ce qui a été coché, un jour à
> venir la liste ; le vendredi, Dhuhr porte la Jumu'ah. Sont retirés :
> - l'onglet Habitudes (Coran & Duaas prend sa place dans la barre) ;
> - la console du tableau de bord ;
> - la touche H ;
> - les boutons du plan du jour qui cochaient ;
> - les cases de la clôture, qui ne coche plus rien (ni la revue, ni la créatine par la puce masquée des compléments).
> L'anneau extérieur du réacteur suit « Ma journée » (« ma journée 5/17 »). Le plan du jour dit combien il en reste et
> ouvre l'onglet. La clôture rappelle ce qui n'est pas coché.
> **Plus aucun suivi des cases** :
> - plus de séries, de taux ni d'habitudes « acquises » (elles se cochaient toutes seules) ;
> - le score du jour ne compte plus que la séance et le sommeil ;
> - la semaine perd « Habitudes tenues » (8 chiffres), la clôture du dimanche aussi (6) ;
> - l'analyse « Habitude la plus délaissée » sort (7 analyses) ;
> - les objectifs du mois « habitudes tenues » semés sont retirés (`elaguerObjectifs`) ;
> - le deen des « 5 qui comptent » ne compte plus les prières de la semaine (le Coran reste) ;
> - l'expérience de la semaine ne propose plus les cases, l'eau ni la nutrition.
> **Le cou du jeudi** : la flexion du cou (celle du lundi, même nom, donc la progression se partage) ferme la séance du
> jeudi, dans les repos des tractions serviette et du crunch, un tour des trois. Un seul exercice, comme il l'a demandé :
> la séance garde ses 55 minutes et le retour de 07:55. Le cou travaille trois fois par semaine (12 séries) :
> - lundi, flexion et extension ;
> - mardi, inclinaisons ;
> - jeudi, flexion.
> La liste des paires sait lire un trio (`trio:true`).
> **La vérification de la saison** (`tests/zz-journee-saison.mjs`, avec ses données) :
> - A : chaque jour du 16 novembre au 6 juin à la suite. 203 jours, 5 411 lignes, toutes avec leur heure, dans l'ordre,
>   un bloc de travail toujours avec sa consigne. 3 941 cases, chacune le bon jour, recalculées à part depuis leurs
>   jours, leur cycle et leur ancre. Aucune erreur, aucun « undefined ». Le pas à pas écrit (70 jours) colle à la grille.
> - B : chaque jour ouvert comme « aujourd'hui » à 07:00. Tout est coché une case à la fois, la première décochée, puis
>   la page rechargée : les 203 jours restent exactement comme laissés.
> **Les pages** :
> - les 10 semaines du guide sont ré-extraites (seules les cases retirées changent), « Ta semaine » et « Ta semaine
>   type » sont reconstruites (« À cocher dans « Ma journée » », la routine « à cocher aussi ») ;
> - « Ce que tu pourrais suivre en plus » sort de la semaine type ;
> - « À quoi sert la Batcave » suit, ainsi que la prise en main (ses cases du jour étaient fausses : le shampoing du
>   mercredi, la serviette de corps du mercredi, la marche, la revue), le guide des étirements, le dossier Español et
>   `programme-sport.md`.
> **Tests** : nouveau test122 (le tri, « Ma journée », un seul endroit, plus de suivi, le cou du jeudi) ; test121 et
> la campagne recalés (voir le commit).

> ### Lundi 16 novembre, tard le soir — le suivi allégé
> **Sa question** : « est-ce que ça fait beaucoup tu trouves, est-ce que j'ai vraiment besoin de suivre tout ça ou c'est
> contre-productif ». Ma réponse : c'est trop, une centaine de gestes un lundi.
> **Sa décision** : « enlève ça vu que ma journée les traque ». Ça couvre les repas aliment par aliment, les cases de
> routine, et à la clôture l'eau, les pas, l'humeur, Anki et les compléments.
> **Fait (schéma 71, `sans-case-v1`)** :
> - La routine (29 habitudes : le ménage, le linge, les serviettes, l'hygiène, l'entretien, la créatine) garde ses
>   dates, puisque ce sont elles qui font les consignes du ménage, de la laverie, du frigo, du coiffeur et de la
>   commande des pièces. Elle sort des cases à cocher (`sansCase`, `casesDuJour`) : plus rien dans le score, les
>   bilans, les objectifs ni les analyses. « Ma journée » la dit dans ses lignes et dans « La routine du jour ». L'onglet
>   Habitudes la liste (« Dans Ma journée, sans case ») avec un bouton « Remettre la case ». Il reste 19 cases, de 15 à
>   18 par jour.
> - Les repas n'ont plus de case par aliment : la carte dit quoi manger. Le panneau d'apport, la barre du jour et le
>   panneau du tableau de bord sont masqués. Le score ne compte plus les calories, la semaine perd « Nutrition » et
>   l'analyse « Balance énergétique » sort. La boucle poids → calories, qui ne lit que les pesées, reste.
> - La clôture masque l'eau, les pas, l'humeur, Anki (du jour et de la semaine) et les compléments. Le score ne compte
>   plus l'eau, la semaine perd « Eau » et « Pas » (9 chiffres), le tableau de bord ne montre plus l'eau ni l'humeur, et
>   le panneau Anki des études ne s'affiche plus.
> - « Ta semaine » et « Ta semaine type » séparent « À cocher » de « La routine du jour, sans case ». « La case Linge »
>   et « la Batcave le coche » disparaissent des textes. « À quoi sert la Batcave » suit.
>
> **Les blocs du Calendrier** : il a demandé ce que voulait dire « arrêter de les cocher », puis il a dit oui (« Ok
> fait »). Leurs cases sont retirées : la grille se lit, et un bloc de travail couvert à moitié par le minuteur porte
> « ✓ minuteur », calculé à l'affichage sans rien écrire.
> Correction de ma réponse : aucun calcul ne lisait ces cases. La fidélité au plan, « prévu contre réalisé », le bloc
> fragile, la dérive du premier bloc et le créneau se mesurent tous au minuteur. Il ne perd donc rien. Tests 55 et 63.
> **Tests** :
> - recalés sur ses décisions : 28, 38, 40, 42, 49, 53, 55, 59, 62, 67, 69, 71, 72, 73, 76, 94, 101, 109 et 120 ;
> - 60, 65, 68, 90, 92 et 101 gardent la mécanique des cartes et les dates des habitudes à rythme, routine laissée en
>   cases (drapeau posé) ;
> - nouveau test121 : le suivi allégé de bout en bout.
>
> test14, l'échec connu de la hauteur du tableau de bord, passe depuis que le panneau des repas est masqué.

> ### Lundi 16 novembre, le soir — ce qu'il lui reste à faire, les pièces de rechange, la mâchoire
> **Ses réponses** : pas besoin de donner les modèles du robot et de l'aspirateur-serpillière ; pas de nouveaux suivis
> (ni le compteur de sachets à la place du compteur d'arrêt) ; l'emploi du temps du S2 n'est pas encore sorti.
> **Les notifications** (« j'ai pas besoin d'avoir plein de notifs sur google agenda, tant que ce que je dois faire
> s'affiche précisément dans ma journée dans la batcave ») : les 33 notifications 🔔 posées par la reconstruction du 15
> au soir sont retirées de son agenda, et la Batcave n'en pose plus (`blocsARappeler` ne porte plus de tâches). Les
> rappels de blocs de toujours restent. Les deux rappels 🔧 posés une heure plus tôt pour commander les pièces sont
> retirés aussi.
> **Les pièces** : sans les modèles, la Batcave ne connaît pas les références. Deux semaines avant chaque pièce neuve, le
> ménage du dimanche (« Ma journée ») dit donc de la commander, s'il n'en a pas d'avance :
> - le 13 décembre, le filtre du robot ;
> - le 10 janvier, la brosse latérale ;
> - le 7 février, le filtre et les pièces de l'aspirateur-serpillière ;
> - le 4 avril, le filtre ;
> - le 2 mai, les brosses ;
> - le 30 mai, le filtre du 13 juin.
>
> Tests 52, 118 (scénario 2 ter réécrit sur son état du 16) et 119 (scénario 9). La simulation vérifie qu'il n'y a plus
> de notification, et chaque commande deux semaines avant sa pièce.
> **Le bilan du suivi** (« fais-moi un bilan de tout ce qui va être traqué par la batcave, vraiment dans le détail, comme ça
> je vois vraiment à quoi elle va me servir ») : nouvelle page « À quoi sert la Batcave » (`suivi-batcave.html`),
> relevée dans la Batcave avec ses données. Elle reprend, domaine par domaine, ce qu'il note et ce que la Batcave en fait :
> - les 48 cases, par jour et par rythme ;
> - chaque champ de la clôture ;
> - les études, le sport, la table, le corps, le deen, l'argent et les bilans ;
> - les neuf analyses et leur date d'allumage, à partir du 16 : du 19 au 23 novembre, et le 7 décembre pour la boucle.
>
> Elle signale aussi que le compteur du snus suppose un arrêt depuis le 8 novembre.
> **Ses mots** : « j'ai super mal quand je me réveille le matin à la mâchoire, je pense que c'est à cause des snus ».
> Réponse : c'est probablement du bruxisme du sommeil, que la nicotine favorise. On teste deux semaines sans sachet
> après 17:30 (4 h avant le coucher) et jamais en dormant. S'il n'y a pas de mieux, c'est le dentiste et une gouttière.
> Il en parle aussi au centro de salud. Les signaux d'alerte : un seul côté avec la gencive gonflée (dent de sagesse),
> ou une douleur à l'effort ou avec la poitrine (le 112).

> ### Dimanche 15 novembre, tard le soir — chaque tâche rare à sa date et notifiée, la saison jusqu'au 6 juin, la saison simulée
> **Ses mots** : « 1 oui, 3 oui aussi, mais il n'y a pas tout, comment je sais quand est-ce que je devrais remplacer ma
> brosse à dents par exemple, est-ce que j'aurais une notif dans la batcave ? ça apparaîtra dans mes tâches du jour ? » ;
> puis « vérifie bien qu'il n'y a aucune contradiction, et simule sur plusieurs semaines que tout fonctionne bien, donc
> que tu n'as rien oublié, exemple aller à la laverie etc ».
> **Graine v15 (schéma 70)** : sept cases à date fixe, chacune un dimanche :
> - le filtre du robot, toutes les 8 semaines dès le 27 décembre ;
> - sa brosse latérale, toutes les 16 semaines dès le 24 janvier ;
> - ses brosses principales, toutes les 36 semaines, le 16 mai ;
> - la brosse-rouleau et le filtre de l'aspirateur-serpillière, toutes les 16 semaines, le 21 février ;
> - l'oreiller à la laverie, toutes les 16 semaines, le 3 janvier ;
> - la couette, toutes les 26 semaines, le 17 janvier ;
> - le matelas tourné et aspiré, toutes les 13 semaines, le 6 décembre.
>
> Les consignes les disent le bon jour. La laverie du batch prend le matelas, l'oreiller et la couette, le ménage les
> pièces neuves, et les courses commencent par le coiffeur son samedi.
> **Les notifications** : chaque tâche du jour sonne dans Google Agenda. C'est un événement « 🦇 🔔 » par heure, qui
> n'occupe pas l'agenda :
> - la pesée et les photos à 05:21, la brosse à dents neuve à 05:24 (22 novembre, 14 février, 9 mai) ;
> - le coiffeur à 13:00 ;
> - le frigo et la laverie à 15:25 ;
> - le ménage du mois à 16:25 ;
> - les ongles à 19:40.
>
> À la prochaine ouverture, la Batcave reconstruit l'agenda une fois (`taches: 1`), avec toutes les notifications
> jusqu'au 24 janvier. Ensuite, chaque ouverture pose celles d'aujourd'hui et de demain.
> **L'horizon** (« 3 oui ») : la saison va du 16 novembre au 6 juin, 203 jours, et les objectifs portent sur 7 mois. Le
> poids va de 64 à 72 kg à +0,28 kg par semaine, soit environ 1,2 kg par mois. La note de l'objectif,
> `programme-alimentation.md` et `programme-sport.md` suivent. Un horizon encore égal à l'ancien défaut (14 septembre →
> 14 mars) est remplacé une fois. Reste à trancher le 22 novembre : il disait 60 kg le 4 novembre, et la Batcave part de
> 64, sa pesée de septembre.
> **La saison simulée** (`tests/zz-saison.mjs` puis `zz-saison.py`, avec ses données) : les 203 jours sont lus un par
> un : la grille, les cases, les consignes du ménage, de la laverie, du rangement et des courses, et les rappels de
> l'agenda.
> - Premier semestre : aucune contradiction, rien d'oublié. La laverie revient chaque dimanche, le batch chaque mardi,
>   et chaque tâche périodique garde son rythme, avec sa consigne et sa notification le bon jour.
> - Elle a trouvé le coiffeur absent de la consigne des courses ; c'est corrigé.
> - Second semestre : la grille est provisoire. Le batch du mardi manque dès le 26 janvier, et le coucher passe à 22:40
>   le mardi et le mercredi. C'est à refaire avec son emploi du temps du S2.
>
> **Tests** : 43, 49, 68, 75 et 109 recalés sur l'horizon et le schéma. 52 compte les quatre notifications de la fenêtre
> des jours sans cours, et 67 a un jeu de six mois qui finit le 2 juin. 108 passe à +0,28 kg, 118 gagne le scénario
> 2 ter et 119 le scénario 9. Les fixtures 42 et 90 portent la v15.
> **Après coup** (« il me reste quoi à faire ») : le frigo (le 28 novembre) et le détartrage (le 13 décembre) demandent du
> vinaigre blanc, qui n'était pas dans la liste de courses. Il y entre dans Maison et ménage : deux bouteilles d'1 L
> toutes les 12 semaines chez Mercadona, dues dès le samedi 28, donc achetées aux courses de 13:30, avant le frigo de
> 15:30. Jamais dans le lave-vaisselle. Tests 53 et 117.

> ### Dimanche 15 novembre, le soir — l'entretien des machines, et la semaine tâche par tâche
> **Ses mots** : « t'as tout mis, même le nettoyage de mon aspirateur serpillère […] même le nettoyage de mon roomba
> automatique. Je veux que tout soit dedans comme ça j'ai pas besoin de réfléchir. Donne-moi la liste de tout ce que je
> dois faire dans la semaine en fonction de la journée […] et une liste de trucs que je pourrais rajouter dans le tracking. »
> **Trouvé** : le robot (l'« aspirateur » de la Batcave, 15:45 et 18:15 tous les jours d'après la série « Enlever les
> tapis ») n'avait aucun entretien ; l'aspirateur-serpillière, seulement « réservoir vidé et rincé » ; le filtre de la
> machine à laver, le détartrage et le frigo flottaient dans « chaque mois » sans jour.
> **Fait** — graine v14 (schéma 69), cinq cases, chacune son jour : « Robot et aspirateur nettoyés » chaque dimanche ; « Entretien du mois des machines » (robot : capteurs, contacts de charge, roue avant, brosse latérale ;
> aspirateur : brosse lavée, joint ; lave-vaisselle : filtre) les 29 novembre, 27 décembre, 24 janvier ; « Machine à laver : filtre et joint » les 6 décembre, 3 janvier ; « Bouilloire et rice cooker détartrés » avec le rideau, les
> 13 décembre, 10 janvier ; « Frigo vidé et nettoyé » au samedi des courses, 28 novembre, 26 décembre, 23 janvier. La
> consigne du ménage du dimanche dit chaque geste (et la bonde de la douche, l'éponge changée) ; celle du rangement
> commence par le frigo son samedi. Chaque jour, le guide dit les tapis enlevés à 14:52 et, à 20:40, les tapis remis et
> le bac du robot vidé ; la série de l'agenda le dit aussi. « Plus rarement » : les pièces du robot (filtre tous les
> 2 mois, brosse latérale 3 à 6, brosses principales 6 à 12, roue avant 12) et de l'aspirateur (3 à 6 mois). Une Batcave
> neuve sème aussi la v14 (sinon la bannière d'incohérence s'allumait). Tests 42, 90, 109, 119 (scénario 8).
> **La semaine tâche par tâche** : nouvelle page « Ta semaine type » (`semaine-type.html`, générée depuis le guide :
> la semaine du 23 au 29 novembre, ses 232 lignes, chaque mois, plus rarement, et dix idées de suivi — douleurs à la
> poitrine, fréquence cardiaque au repos, forme au réveil, articulations, peau, fil dentaire, dernier café, temps d'écran,
> repas hors plan, snus).

> ### Dimanche 15 novembre, l'après-midi — le tri des artefacts, le brossage de midi, « Ma journée » au complet
> **Ses mots** : « fais un tri dans mes artefacts, et supprime ceux qui sont outdatés. Et aussi rajoute un 3e brossage de
> dents après le déjeuner. Je veux aussi que tu vérifies que tu as bien mis tout ce qu'il y avait à mettre dans l'onglet
> Ma journée […] je veux que toutes les étapes soient dessus. »
> **Artefacts** : supprimés, « Semaine du 16 novembre » et « Du samedi 14 au dimanche 15 novembre » (remplacées par
> « Ta semaine ») et « Cap sur 05:20 » (le plan sommeil du 20 au 26 octobre, fini ; sa mention quitte la consigne du
> lever). Leurs sources restent dans le dépôt. Remises à jour : « Paliers de physique » (départ le 16 novembre,
> 4 séances de salle et 3 de JJB, séance de référence le 16 et retests les 14 décembre, 18 janvier et 22 février,
> photos dès le 22, 68 kg ≈ fin février et 72 kg ≈ juin au rythme de +0,3 kg par semaine) et « Cinq minutes
> d'étirements » (v1.1 : les moments recalés sur la grille actuelle, plus de course ni de parc). Gardées telles
> quelles : la Batcave, « Ta semaine », la prise en main, les deux dossiers, « Le linge » (à jour depuis le 13),
> « Le semestre », le tajwid, le programme de sa mère.
> **Le brossage de midi** : une ligne à la fin du déjeuner dans le guide et dans la grille vivante de l'onglet — 12:40
> du lundi au jeudi, 13:10 le week-end, 13:15 le vendredi (avant la mosquée), 17:00 les deux jours d'examen où le
> déjeuner est à 16:00. Dans l'agenda : trois séries « 🦇 Brossage de dents après le déjeuner » et deux événements
> (7 et 13 janvier), protégés comme les autres (`GCAL_PROTEGES`). Prise en main : la ligne du déjeuner le dit.
> **« Ma journée » au complet** : l'audit des 70 jours a trouvé les blocs d'étude fondus en « Révisions · 1 h 10 »
> sans consigne (176 lignes vides — un reste du rattrapage) : chacun a maintenant sa ligne et sa consigne (304 lignes).
> Le temps libre et le coucher portent leur consigne ; le vendredi, Jumu'ah dit qu'elle remplace Dhuhr ; le samedi,
> le balai après le rangement des courses ; la serviette de visage les jours où la douche ne la nommait pas ; les
> nouvelles à la famille au dîner les jours sans trajet retour ; les 30 min d'espagnol avec un natif là où elles ont
> lieu (le tuteur, le cours, le club, sinon le soir) ; les dix formules à la fin du premier Anki quand Anki 2 ne les
> prend pas (après le mois d'espagnol, ses 5 dernières minutes vont au paquet Business) ; un soir sans cours a sa
> ligne « Écrans coupés » (étirements, 20 pages, téléphone hors de la chambre), qui manquait.
> **Bug trouvé en route** (`grilleEvenement`) : un examen du matin effaçait le JJB de 10:30 mais gardait « Retour du
> club » à 12:00 (shake de récup, douche, machine du kimono, sans club) et un « Trajet retour » de 10:30 à 12:00, les
> 11, 18 et 20 janvier. Un bloc satellite part maintenant avec le sien, et le temps rendu devient « Repos après
> l'examen » (sa consigne : une vraie pause, et ce que tu n'as pas su écrit à chaud).
> **Tests** : test120 (une ligne par bloc d'étude, trois brossages par jour, celui de midi à la fin du déjeuner,
> 70 jours sur 70).

> ### Dimanche 15 novembre — le jour 1 au lundi 16, une semaine normale dès 05:20
> **Ses mots** : « je veux que tout soit aligné sur le programme de tout le temps, on s'en fout de cette semaine, je veux
> que quand je commence à l'utiliser lundi tout soit comme d'habitude. Et je vois qu'un brossage de dents dans la
> journée […] recale tout sur lundi », puis « revérifie toute la Batcave ».
> **Fait** : `PROGRAMME_DEBUT` = `ES_REPRISE_DEBUT` = `2026-11-16` — le mois d'espagnol va du lundi 16 au samedi
> 12 décembre, l'épreuve du dimanche passe le 22 (le diagnostic), le 29 et le 6 décembre. Plus de rattrapage : les
> entrées du 14 et du 15 de `RATTRAPAGE_TEMAS` sont retirées. L'ancre du dimanche passe au 22 (`ANCRE_DIMANCHE`,
> migration `ancre-dimanche-v5`, rejouée après la synchro, schéma 68) : photos, pesée, brosse à dents neuve et ongles
> partent du 22, le bilan peau tombe le 14 février. Avant le jour 1, rien ne s'affiche comme un retard : ni
> « Révision — 0 sur 3 h 30 » ni « Hors rythme » au tableau de bord, et le contrôle de l'agenda (`joursAControler`)
> saute ces jours-là. La veille d'un dimanche, le message annonce le batch de 14:30.
> **Le brossage** : le guide (« Ma journée », « Ta semaine ») a sa ligne du matin à 05:25 (2 min, fluor, cracher sans
> rincer ; la brosse neuve les dimanches où elle se change) et celle du soir (2 min, fil dentaire). Hors du guide (après
> le 24 janvier, ou quand une grille change), l'onglet ajoute lui-même le réveil et le brossage, dix et cinq minutes
> avant le premier bloc (`lignesMatin`). Dans l'agenda, une série « 🦇 Brossage de dents du matin », chaque jour à
> 05:25 du 16 novembre au 24 janvier (notification à l'heure), protégée comme les tapis (`GCAL_PROTEGES`) : le
> nettoyage du jour et le contrôle n'y touchent pas. L'agenda réel de lundi 16 a été relu : ses 26 rappels 🦇 sont
> exactement ceux de la Batcave, plus les tapis.
> **Revérification** : les renvois de section sont corrigés — gramática vers la section 07 du dossier Español,
> fiscalité vers la section 18 du dossier e-commerce. « Projets perso 3 » ne dit plus « depuis le 28 septembre ».
> « Projets perso 4 » ne dit plus « lundi, juste avant de partir en cours » les jours sans cours : Noël, janvier et
> partiels, soit 17 blocs du guide. Les heures du dossier e-commerce sont revérifiées sur la grille : 4 h 30 le
> 13 décembre, 17 h 20 la semaine du 14, 22 à 26 h du 23 décembre au 24 janvier, 13 h 20 fin janvier, 15 h 20 à la
> mi-mars, 18 h 30 la semaine de partiels du 24 mai. « Les semaines de partiels, tout s'arrête » était faux : les
> jours de partiels sont des jours sans cours. Les jours de salle, la ligne de 08:30 du guide disait « Lance le riz »
> alors que le riz part en rentrant de la salle (07:55) : elle dit maintenant « Le shake et une page de Coran », le riz
> déjà lancé. Le dossier Español, la prise en main et le guide (70 jours, 0 grille différente) sont recalés sur le 16.
> **Agenda** : les 9 événements d'étude du dimanche 15 sont supprimés, et les trois épreuves (22 et 29 novembre,
> 6 décembre) réécrites. Le temps libre du 15 au soir ne propose plus la revue du dimanche : la première est le 22. Comme `programme` a changé, la Batcave refait une reconstruction complète à la prochaine
> ouverture, du 16 novembre au 24 janvier ; les consignes corrigées y passent.
> **Tests** : test120 et les tests 41, 43, 48, 49, 59, 65, 74, 75, 78, 81, 85, 88, 90, 92, 101, 107, 109, 115, 116, 118
> et 119 sont recalés sur le 16. test43 lit l'urgence de la révision dans la semaine du 16 : avant le jour 1, le plan
> ne la reproche plus. test107 vérifie que rien n'est contrôlé avant le jour 1 (la semaine réelle du 25 septembre ne
> l'est plus), puis contrôle la première semaine, du 18 au 24 novembre. test116 décale ses pesées d'une semaine : la
> stabilisation finit le 6 décembre, et les photos tombent le 20 décembre. Les audits `audit-cablage` et `audit-suivi`
> sont remis à jour.

> ### Samedi 14 novembre, tard le soir — l'onglet « Ma journée »
> **Ses mots** : « tu peux pas mettre tout ce que je dois faire précisément dans la batcave, comme ça j'évite de devoir
> toucher à d'autres artefacts et tout est centralisé, au jour le jour […] un onglet, aujourd'hui, et dedans ça regroupe
> tout précisément, ce dont on avait parlé, que ça soit le nettoyage, brossage de dents à telle heure etc. »
> **Fait** : onglet `journee` (deuxième de la barre, touche 2 ; la touche 0 ouvre désormais le dixième). Les 72 jours du
> guide (14 novembre → 24 janvier) sont embarqués dans `#journees-guide` par `outils/semaine/build_guide.py`, avec la grille
> d'origine de chaque jour (`sig`) : si la grille vivante diffère (un examen, une échéance, un jour sans cours ajoutés
> depuis), l'onglet le dit et montre la grille de la Batcave, bloc par bloc ; hors du guide aussi. En haut, la carte
> « Maintenant » (ligne en cours, prière dans ses dix minutes, ligne suivante, bouton 🍅 pour les blocs de travail) ; les
> lignes passées se replient (un toucher les rouvre) ; les cases du jour se cochent sur place (`toggleHabit`, les mêmes
> que Habitudes). Classes `mj-*` (le préfixe `jr-` appartenait déjà aux journées reconstruites). Test `test120` ; tests
> 67, 68, 69, 88, 95 et 110 passés à dix onglets.
> **Trouvé en route** : la semaine du 16 du guide avait été extraite sans ses données — les quatre soirs de préparation de
> ses échéances (exposé de Biología le 17, Práctica 5 le 18, Práctica 2 d'Anatomía le 19, Actividad 4 d'Antropología le 20)
> manquaient. `semaine16.json` ré-extrait avec sa sauvegarde, `build16.py` connaît les blocs « Préparer · … » (la
> préparation compte dans les révisions, « Prépare demain » passe à 20:45, un rappel dans la journée). Son état en ligne
> du 14 au soir (échéances, examens, jours exclus) est identique à la sauvegarde du 11 : les 72 grilles coïncident.
> **Rideau** : le libellé passait sur trois lignes au téléphone (test71) ; il devient « Rideau de douche à la machine,
> 40 °C », et l'ancien libellé exact est remplacé chez lui sans drapeau (`LIBELLES_REMPLACES`, test119 scénario 7).

> ### Samedi 14 novembre, le soir — le rideau de douche, une fois par mois
> **Ses mots** : « rajoute le lavage du rideau une fois par mois, dans ma batcave etc., comme ça je garde le track de
> tout ». Le rideau neuf : 100 % polyester, le bas lesté recoupé (des pinces le lestent en attendant).
> **Fait** : habitude `core-rideau-douche` (graine v13, schéma 67), le dimanche toutes les quatre semaines dès le
> 13 décembre (puis 10 janvier, 7 février) ; ces dimanches-là, la consigne du ménage commence par le rideau (machine
> 40 °C au début, raccroché humide à la fin). Guide : liste « Chaque mois », semaines ré-extraites (13 décembre,
> 10 janvier) ; « Ta journée, pas à pas » (« Moins souvent ») ; agenda : les deux ménages concernés (test119,
> scénario 6 ; test42 et test90 complétés de la v13).

> ### Vendredi 13 novembre, le soir — « j'ai pas acheté de viande, j'ai pas fait toutes les courses, on va faire ça demain » ; « dans la batcave les connecteurs ne marchent pas »
> **Demain sans batch** : `BATCH_DATES` vide (plus de batch le vendredi), `VIANDE_PREMIERE_SEMAINE` neutralisée.
> Samedi 14 et dimanche 15 à midi, le repas frais des dimanches (`midiFrais` : 3 œufs, 80 g de brocoli, le riz ; le samedi,
> « sinon le placard », les courses étant à 13:30) ; samedi soir, la viande hachée des courses cuite sur le moment ; au
> rangement, 3 œufs durs pour la collation. La liste du 13 et du 14 porte 560 g de viande hachée (dont 70 pour samedi soir)
> et 24 œufs (21 au plan) ; le 21, la semaine type revient. Agenda : les cinq rappels concernés mis à jour depuis la
> conversation ; guide et « Ta journée, pas à pas » suivent (test119, scénario 5).
> **Connecteurs** : vérifiés un par un depuis la conversation (agenda, météo, Drive, Shopify) — tous répondent. Sa base en
> ligne montre que sa Batcave a écrit l'agenda à 15:57 (remise au propre réussie : 1 659 déjà justes, 25 adoptés, 2 corrigés),
> lu Notion à 15:56 et fait sa sauvegarde du jour : la panne qu'il a vue vers 17:45 était côté claude.ai (cette session
> aussi a perdu ses connecteurs au même moment). Corrigé quand même : la météo appelait « AccuWeather® » en dur ; elle
> demande maintenant à `listTools()` le nom que claude.ai affiche chez lui (« AccuWeather » sinon), avec un filet à 8 s.

> ### Vendredi 13 novembre, l'après-midi — « je veux que tout soit parfait pour demain, ça doit être nickel »
> **Ses mots** : « décale tout à partir de demain, et prendre les photos etc je fais ça quand, on considère que demain
> c'est le premier jour de courses aussi » ; puis « je veux que tout soit parfait pour demain ».
> **Agenda** : relu samedi et dimanche — il portait l'ancien plan (« jour 2 sur 3 », « jour 3 sur 3 » à 05:30) : la
> remise au propre du 12 avait tourné pour le vendredi 13. Les deux consignes corrigées depuis la conversation, et la
> Batcave refait la remise au propre une fois quand elle a été faite pour un autre jour 1 (`reconstructionAJour`, le
> relevé porte désormais `programme`) : à la prochaine ouverture, du samedi 14 au 24 janvier. Le rappel LuxTrust du
> samedi 20:00 renvoyait au formulaire en ligne (qui veut l'ancien numéro) : déplacé au vendredi 20 à 12:50, en appel
> (LuxTrust lundi-vendredi 08:00-18:00, sinon BGL).
> **Photos, brosse, ongles** : sa sauvegarde du 11 portait encore l'ancre d'origine (13 septembre) sur les trois
> habitudes à cycle, drapeaux v1 et v2 posés — rien le dimanche 15, les photos le 6 décembre. `ancre-dimanche-v4`
> (schéma 65) reprend les ancres posées par la Batcave (13 et 20 septembre, 4 octobre) : dimanche 15 au réveil, puis
> les photos les 13 décembre, 10 janvier, 7 février ; les ongles un dimanche sur deux (29 novembre, 13 décembre…).
> Les neuf semaines du guide ré-extraites avec ses données.
> **Pages** : « Ta journée, pas à pas » au samedi 14 (la viande de jeudi cuite aujourd'hui, le centro de salud
> aujourd'hui ou lundi 08:00, le proprio samedi, le guide jusqu'au 24 janvier) ; samedi soir, le linge plié « si tu as
> lancé une machine hier » ; le titre de la page des deux premiers jours.
> **Le réveil du jour 1, relu avec SES données** (sauvegarde du 11) : le plan du jour s'ouvrait sur onze consignes
> ponctuelles d'octobre restées « à faire » (l'ancien jour 1 du 22, un coucher à 22:45, des courses de couscous…) :
> `taches-octobre-v1` (schéma 66) les retire une fois, par identifiant ; restent ses trois démarches (ambassade, fac,
> IKEA). Sa copie vierge datait du 22 septembre, et le plan ne la réclamait plus : une copie d'avant le jour 1 se refait
> (« Copie vierge à refaire — celle du 22 sept. »), et le plan se redessine après la confirmation. Le contrôle des séries
> lit maintenant tous les « 🦇 » du jour (occurrences et événements uniques), ignore « Enlever les tapis », et se tait
> pendant un envoi ou s'il est plus vieux que la dernière remise au propre (celui du 10 annonçait douze écarts).

> ### Vendredi 13 novembre — le jour 1 passe au samedi 14
> **Ses mots** : « on commence tout samedi, la j'ai dormi trop tard je me suis reveille trop tard ».
> **Fait** : `PROGRAMME_DEBUT` au samedi 14 ; le rattrapage serré tient en deux jours (« jour 1 sur 2 » samedi, « jour 2
> sur 2 » dimanche, mêmes créneaux) ; le mois d'espagnol commence avec le jour 1 (`ES_REPRISE_DEBUT`, 14 novembre) et
> garde sa fin, le 12 décembre — l'e-commerce, le dimanche 13 décembre, ne bouge pas. Le batch du vendredi reste
> (`BATCH_DATES`) : la viande achetée jeudi ne se garde pas un jour de plus crue (sinon, au congélateur). La page des
> premiers jours devient « Du samedi 14 au dimanche 15 » (grille11.json ré-extraite), le guide « Ta semaine » s'ouvre
> sur le samedi 14, « Ta journée, pas à pas », le Dossier Español (2.21) et le Dossier E-commerce suivent. Le vendredi
> reste : le cours de 15:30 (le cuestionario IA, 10 %, présence obligatoire), l'actividad 3 d'Antropología à 17:30, et
> l'appel au centro de salud (sinon lundi dès 08:00). Agenda : la Batcave reconstruit à partir du samedi 14 (la remise
> au propre n'avait pas encore tourné, ou elle met samedi et dimanche à jour à la première ouverture du samedi).

> ### Jeudi 12 novembre, le soir — l'agenda remis au propre jusqu'au 24 janvier, le budget, le guide
> **Ses mots** : « je veux que tout soit parfait, et que je n'ai plus besoin de toucher quoi que ce soit avant le
> debut du 2ieme semestre » ; « et pour le budget, je le vois pas dans tes tasks » ; « tu peux changer mon agenda
> google librement » ; « je veux tout supprimer en meme temps, pas une par une » ; « on a fait nimp, recommence a
> 100% tout, tu sais ce que je veux ».
> **Google Agenda** : 95 rappels en trop ou en double supprimés depuis la conversation (16 novembre → 7 janvier). Le
> reste se fait dans la Batcave, à l'ouverture, sans une validation par événement (chaque suppression demandait la
> sienne depuis la conversation) : les 124 rappels en trop du 7 au 22 janvier (`GCAL_NETTOYAGE_JANVIER`, une fois,
> drapeau `batcave-gcal-nettoyage-janvier`), puis la reconstruction complète du vendredi 13 novembre au dimanche
> 24 janvier (`reconstruireAgenda`, trois jours à la fois, drapeau `batcave-gcal-reconstruction`) : chaque bloc à son
> heure, avec le titre et la consigne de ce jour-là ; tout autre « 🦇 » du jour retiré (anciennes séries, doublons,
> trajets des jours sans cours) ; les cours de la fac et l'argent (sans « 🦇 ») restent. Une coupure reprend à
> l'ouverture suivante. Deux gardes : chaque jour poussé retire les « 🦇 » qu'il ne porte plus (sauf
> `GCAL_PROTEGES` : « Enlever les tapis ») ; un événement du relevé qui n'est plus dans l'agenda ne compte plus — sans
> quoi le jour passait pour « déjà envoyé » et le nettoyage retirait la copie restante. Le rappel du 25 dit 100 € (la
> Batcave), plus 130. `.claude/settings.json` autorise Google Calendar sans validation dans les prochaines sessions.
> **Budget** : l'enveloppe vérifiée de bout en bout (test117 réécrit) : cagnotte de 100 € le 25, chaque mois — le mois
> le plus cher de l'horizon (celui de la licence de novembre 2027) fixe le montant sûr ; le 24, 61,51 € plus ce qui
> reste des 300 € partent à la cagnotte. Barre « L'enveloppe » dans Budget. À régler : l'abonnement de novembre (70 €)
> et la licence (30 €), au club lundi 16 par carte Wise, 100 € en tout. Le gratte-langue rejoint le soin (pharmacie,
> samedi 14 : « j'en ai » s'il en a déjà un) — 28 produits.
> **Guide « Ta semaine »** jusqu'au dimanche 24 janvier (onze semaines) : les vacances de Noël (23 décembre →
> 6 janvier), les partiels (Anatomía I jeudi 7 à 13:30 ; Epidemiología lundi 11 à 08:30 ; Biología celular mercredi 13
> à 13:30 ; Documentación lundi 18 et Antropología mercredi 20 à 08:30), chacun avec sa préparation la veille au soir
> et le matin, le départ et le retour ; jamais une prière pendant un examen ; les 21 et 22 janvier entre les deux
> semestres. Batcave : « Veille de l'examen d'Anatomía I », « Départ pour l'examen d'… » (et plus « Veille de Examen ·
> … »), et le retour d'un jour d'examen sans « résumé oral du cours ».
> **Noël** : « oui je reste a alicante pour noel » — la grille des vacances et le guide le supposaient déjà, rien ne
> change. **Le rattrapage, ce qu'il demande le soir même** (« j'ai combien de cours a rattraper ») : la file comptée le
> 9 novembre, 44 temas (Anatomía 9 : T1-T6, T10, T11, T12 ; Biología 11 ; Epidemiología 11 ; Antropología 7 ;
> Documentación 6), rien de fait depuis, plus ceux de la semaine du 9 au cronograma (Biología 12, Epidemiología 12 et
> 13, Antropología 8 le vendredi 13) : ≈ 48, à recouper avec Canvas. Ses échéances : vendredi 13 à 15:30 le
> cuestionario « uso ético de la IA en salud » (Epidemiología, en classe), 17:30 l'actividad 3 d'Antropología.
> **LuxTrust** (le 12 au soir) : l'appli était sur un téléphone cassé, sans sauvegarde ; il n'a plus l'ancien numéro, et
> au téléphone il ne se souvient plus des questions de sécurité. La banque est BGL BNP Paribas (service client
> +352 42 42-2500, lundi-vendredi 8-18 h ; elle renvoie les identifiants LuxTrust à LuxTrust, +352 24 550 550). Ce qui
> lui a été dit : redemander à LuxTrust la vérification vidéo (procédure « sans appareil », 20 €) avec le nouveau
> numéro ; sinon BGL, qui l'a identifié à l'ouverture du compte ; plan B, une nouvelle identité LuxTrust par vidéo
> (50 € pour 3 ans), à relier ensuite au Web Banking BGL. Rien de bloqué : sa mère vire sur le Wise.
> **En attente de lui** : les prix des sardines (ou maquereau), des galettes de riz, du Nutella.

> ### Jeudi 12 novembre — la laverie, les dattes, trois brossages par jour
> **Ses mots** : « elle est a 5 min de marche de chez moi, et le cycle lavage+sechage dure 45 min » ; « donc 8€
> total » ; « les dates, cest 5€ le kilo » ; « je passe le fil dentaire, la brosse a dent et je nettoie ma langue, je
> le fais 3 fois par jour » ; et pour les prix : « touts les prix [...] que je ne t'ai jamais envoyé tu me demandes ».
> **Fait** : laverie à 15:35 (5 min à pied), 45 min, retour vers 16:30, le lit refait au début du ménage ; 8 €
> confirmés. Dattes à 5 €/kg : courses 45,76 €/semaine, plafond Nourriture 200 → 211 € (`plafond-nourriture-v11`,
> schéma 63), cagnotte du 25 de 90 à 70 € (agenda réécrit). Dentifrice toutes les 7 semaines (pas 10), fil dentaire
> toutes les 10 (pas 26).
> **Le soir, l'enveloppe** : « mets pas les prix des produits de nettoyage et de santé, on va juste dire que j'ai
> 300€ par mois pour les courses etc » ; la laverie « compte dans les 300 ». Les prix du soin et du ménage sortent
> (la liste garde produits, rythmes et « fini ») ; `ENVELOPPE_COURSES` (300 €, dès le 25 novembre) remplace les
> plafonds Nourriture, Soin et santé, Maison et ménage (`enveloppe-courses-v1`, schéma 64) ; Budget : une barre
> « L'enveloppe ». Plan d'argent : cagnotte du 25 à 100 € (les douze périodes qui viennent comptent la licence de
> novembre 2027, 30 € d'un coup ; 130 € sans elle), épargne moyenne 159,01 € + le reste de l'enveloppe. Agenda : le
> rappel du 25 dit 100 € depuis le 12 au soir.
> **En attente** : les prix des sardines, des galettes, du Nutella ; un gratte-langue ? ; la banque (pas d'accès
> LuxTrust, virement de sa mère sur le compte luxembourgeois) ; le club pas payé ce mois-ci ; draps et housses.

> ### Jeudi 12 novembre, l'après-midi — « un guide à la semaine, pour chaque jour, précisément »
> **Ses mots** : « donc il me faut un guide a la semaine, pour chaque jour, precisement ».
> **Fait** : une seule page, « Ta semaine, jour par jour » (`ta-semaine.html`, `outils/semaine/build_guide.py`) : six
> semaines, du vendredi 13 novembre au dimanche 20 décembre, chaque jour heure par heure, ouverte sur aujourd'hui.
> Les dix premiers jours sont ceux des deux pages d'origine ; les quatre semaines suivantes sont construites depuis la
> Batcave seule (consignes, cases du jour, grammes) — le lundi 23 sort identique, bloc pour bloc, au lundi 16 écrit à
> la main. Le mardi 8 décembre (férié, l'Inmaculada) a sa grille sans cours ; le samedi 12, la fin du mois d'espagnol ;
> le dimanche 13, l'e-commerce et les photos. « Ta journée, pas à pas » renvoie à cette page.
> **Une incohérence corrigée** : pendant le mois d'espagnol, les blocs Projets perso qui restent (jeudi 11:20, samedi
> 18:00) envoyaient « sinon, au dossier e-commerce », alors que l'e-commerce commence le 13 décembre (« pile 1 mois ») :
> ils disent maintenant « le livrable de la semaine (un devoir de la fac), sinon des révisions ». La page de la semaine
> du 16 suit. Les vacances de Noël (à partir du 23 décembre) attendent de savoir où il les passe.

> ### Jeudi 12 novembre — la viande jetée, le jour 1 au vendredi 13
> **Ses mots** (9 h) : « j'ai jeté donc je vais devoir refaire les courses, on commence tout demain pétante, est-ce
> que tu as tout vérifié pour un début demain […] dans mon guide journalier tu as mis tout tout tout ce que je dois
> faire tous les jours ».
> **Fait** : jour 1 au vendredi 13 (`PROGRAMME_DEBUT`) ; mois d'espagnol du 13 novembre au samedi 12 décembre, projets
> et e-commerce le dimanche 13 décembre (« pile 1 mois ») ; rattrapage serré sur trois jours (vendredi → dimanche,
> « jour N sur 3 »), le vendredi de 07:20 à 11:00 avec l'appel au centro de salud à 08:00 ; salle et JJB toujours le
> lundi 16 (le médecin d'abord). Batch de démarrage le vendredi à 11:00 avec la viande achetée jeudi au comptoir
> (`VIANDE_PREMIERE_SEMAINE` : 210 g de poulet, 140 g de viande hachée, 70 g par boîte, fraîche, rien au
> congélateur) : 4 boîtes au frigo, la dernière dimanche midi ; la consigne du samedi soir (la boîte du congélateur)
> est retirée, le déjeuner du dimanche dit « la dernière boîte du batch ». La veille du jour 1, le plan du jour dit
> les courses de la viande ; le déjeuner et le dîner du jeudi disent « pas encore de boîte » (la viande du jour et
> 9 œufs gardés pour le batch). Hors du mois d'espagnol, « Trajet cours », « Cours » et « Trajet retour » ont enfin une
> consigne (`zz-scan` : 60 jours, 1 378 blocs, aucun sans consigne).
> **Courses du jeudi 12** : 250 g de blanc de poulet et 150 g de viande hachée de bœuf maigre au comptoir (le plan en
> demande 210 et 140) ; le reste seulement s'il manque (calculé dans la Batcave pour vendredi → dimanche midi).
> **Google Agenda** : le batch et l'appel au centro de salud passent à vendredi ; les courses jeudi à 14:05 ; vendredi
> recalé bloc par bloc sur la Batcave (rattrapage, « Question ouverte » 10:20, déjeuner tout chaud, clôture 20:05),
> puis l'après-midi, tout le week-end remis mot pour mot sur la Batcave (`zz-rappels`) : dix descriptions de
> vendredi ; samedi, qui gardait les heures d'un samedi de salle (Anki 05:30, douche 08:15) et des pâtes au
> déjeuner, réaligné (17 rappels) avec le 05:30 du rattrapage, Anki 2 et la clôture créés ; dimanche, 20 textes
> (le riz à 250 g, le diagnostic d'espagnol) et la clôture ; et le dîner du jeudi.
> **Tests** : 19 recalés sur le vendredi 13 (rattrapage sur 3 jours, mois repris jusqu'au 12 décembre, seuils
> du 13-14 décembre, clôture vieille de 5 jours, semaine de cours notés) ; campagne complète verte, sauf test14.
> **Pages** : « Du vendredi 13 au dimanche 15 novembre » ; « Ta journée, pas à pas » au vendredi 13, avec une
> section « Les cases du jour, toutes » (les dix-sept de chaque jour, celles de chaque jour de la semaine, les rares) ;
> Dossier Español 2.20 ; Dossier E-commerce au dimanche 13 décembre (dépôt).

> ### Mercredi 11 novembre — le jour 1 au jeudi 12, le linge de maison à la laverie, l'audit
> **Ses mots** : « donc on commence tout demain » (le 10, 18 h), « reverifie tout tout tout dans la batcave, je veux
> aucune incoherence », « tout tout tout doit etre parfait » ; puis le 11, 15 h 40 : « les draps serviettes etc je
> vais les laver a la laverie. on commence tout tout tout demain jeudi 12 novembre ».
> **Fait** : jour 1 au jeudi 12 (`PROGRAMME_DEBUT`). Mois d'espagnol du 12 novembre au 11 décembre, épreuve les 15,
> 22, 29 novembre et 6 décembre. Rattrapage serré sur quatre jours (jeudi → dimanche), en horaires seulement, avec le
> total « au minuteur » que suit le tableau de bord ; les créneaux pris sur les projets comptent enfin comme révision
> (`typeBlocJour`). Batch de démarrage jeudi 11:00 → 12:20 : la viande achetée lundi, congelée mercredi soir, se cuit
> sans décongeler (120 g de poulet à midi jusqu'à dimanche, 160 g de viande hachée le soir jusqu'à samedi, six
> boîtes) ; l'onglet Meal prep décrit cette semaine-là, l'onglet Repas affiche les vrais grammes, et la boucle
> poids → calories compte cette viande dans le plan. La semaine du départ ne compte qu'à partir du jour 1 (objectifs,
> fidélité, prévu vs réalisé) ; plus de salle depuis le lundi 9 (`SANS_SALLE_DEBUT`).
> **L'audit** : l'épreuve du dimanche (le protocole de 45 min dans le bloc simulación, le drill saisi à la clôture,
> les chiffres enfin relus par le panneau — la revue était rangée au lundi) ; consignes ajoutées là où il n'y avait
> rien (douche, sieste, collation avec le fromage de sa mère, session du dimanche, ménage, mosquée, courses) ;
> textes périmés (sport « dès le 16 », snus « depuis le 8 », espagnol « jusqu'au 11 décembre », virement de sa
> mère, Anki matinal, le mois d'espagnol jour par jour, la phrase du jour off, « Approfondir » pendant le
> rattrapage).
> **Laverie** : chaque dimanche après la session de batch, draps, taies, serviettes et lavettes (≈ 8 € : lavage à
> 60 °C, séchage), une ligne dans le plan d'argent ; la cagnotte du 25 passe de 130 à 90 € ; plafond « Maison et
> ménage » relevé à 50 € (14,34 de produits + 34,67 de laverie) s'il valait encore 15 (`postes-soin-maison-v3`) ou 14
> (`postes-soin-maison-v4`, schéma 61 : une Batcave pas rouverte le 10 restait à 14) ; 50 € aussi sur une installation
> neuve ; l'onglet Courses dit la laverie à côté du soin et du ménage ; la lessive dure 48 semaines (quatre machines
> par semaine à la maison).
> **Le soir, encore** : la consigne du dîner du 11 (la viande au congélateur) s'affichait « [object Object] » dans la
> Batcave — une consigne datée sans suite rendait l'objet au lieu de son texte (`consigneDatee`), corrigé et publié
> aussitôt ; dans l'agenda, son titre devient « 🦇 Dîner · d'abord, la viande au congélateur » (avec « — », la synchro
> ne le reconnaissait pas et aurait recréé un « 🦇 Dîner » à 20:00). Les courses du samedi 14 avaient le même défaut,
> corrigé du même coup ; `tests/zz-scan.mjs` relit désormais la consigne de chaque bloc de chaque jour (60 jours, zéro
> anomalie) et test115 garde les quatre formes de consigne datée. Le sac du soir oubliait la salle de 07:00 :
> « tenue de salle, serviette, cadenas », plus « bandes et gants pour le sac » la veille du mardi et du samedi, comme la
> consigne du départ pour la salle et la page de la semaine. Au retour du club, la consigne nomme la machine : kimono
> et rashguard à 30 °C, à l'envers, avec la tenue de salle du matin et celles des jours de salle depuis le dernier
> combat (lues dans la grille), jamais d'adoucissant ; la série de l'agenda dit la même chose. Page du 16 : le lundi,
> « la tenue de salle de ce matin » seulement (pas de salle le samedi 14). Guide « Le linge » : le sac de la laverie
> ne porte plus que draps, taies, serviettes et lavettes ; sous-vêtements et chaussettes avec les vêtements du mardi.
> **Outils** : les générateurs des pages semaine sont dans `outils/semaine/` (ils ne vivaient que dans un dossier
> temporaire) ; relancés sur des données relues dans la Batcave, ils redonnent les deux pages à l'octet près.
> **La nuit du 11 au 12** — ses mots, avant de dormir : « je veux que tout soit parfait au reveil […] si il ya des
> trucs auxquels je nai pas pensé fait les aussi », puis « tout commence demain. L'espagnol etc ? Comme ça dans pile
> 1 mois je commence l'ecommerce […] J'ai jeté mes snus et je commence à bien manger demain ».
> *Les photos du point de départ* : le cycle du dimanche (photos toutes les quatre semaines, brosse à dents toutes
> les douze, ongles toutes les deux) était resté ancré au 4 octobre — première série le 29 novembre, et le bilan peau
> du 7 février hors d'un dimanche de photos. `ANCRE_DIMANCHE` passe au 15 novembre, premier dimanche du programme
> (`ancre-dimanche-v3`, schéma 62) : photos les 15 novembre, 13 décembre, 10 janvier et 7 février ; brosse neuve le
> 15 (le paquet s'achète le 14). La page du dimanche 15 les dit, avec le tour d'épaules à la clôture.
> *La viande* : il s'est couché sans dire s'il l'avait congelée — le batch du jeudi (Batcave, Meal prep, page,
> agenda) dit aussi quoi faire si elle est restée au frigo : la date limite des barquettes et l'odeur décident.
> *Page du 16* : plus d'« ongles » le dimanche 22 (un dimanche sur deux : 15, 29) ; `tests/zz-habitudes.mjs` compare
> les habitudes de chaque jour à celles des pages.
> *« Ta journée, pas à pas »* (épinglée, restée au 31 octobre) : réécrite sur la Batcave — jour 1 au jeudi 12,
> rattrapage du 12 au 15, mois d'espagnol jusqu'au 11 décembre, e-commerce le 12 ; plus de peroxyde ni de SPF (visage
> lavé, puis Skinoren là où il a des boutons) ; riz 125 g dès le 16 ; « Clore » à 18:30 le mardi ; deux sessions de
> batch ; la laverie ; photos et bilan peau du 7 février ; plus de 400 m nagé ; les cases « une seule fois » du
> jeudi 12 (centro de salud, propriétaire) ; liens vers les deux pages semaine et « Le linge ».
> *Dossier E-commerce* : départ recalé au samedi 12 décembre (≈ 17 h par semaine dès la semaine du 14, 23 à 26 h à
> Noël, 13 h au second semestre — lu dans la grille), les dates de ses douze semaines glissent de sept semaines.
> *Campagne* : 109 fichiers, 2 946 vérifications vertes ; test14 seul en échec (antérieur), test116 recalé sur le
> nouveau dimanche de photos (13 décembre). Batcave publiée en version 186.
> **Reste à faire** : republier le Dossier E-commerce (514 Ko : la publication exige de relire toute la version en
> ligne, trop lourd cette nuit) et recaler ses jalons une fois les dates d'examen de janvier saisies ;
> `calendrier-s1.html` (septembre) n'est plus la référence de la grille — c'est la Batcave.
> **Google Agenda** : les rappels 💶 réécrits (700 €, 90 € de cagnotte, propriétaire pour l'eau et l'électricité
> seulement, club 70 € le 5, licence au club le 16) ; jeudi 12 recalé (batch à 11:00, centro de salud à 08:00).
> **Pages** : semaine du 12 (jeudi → dimanche), semaine du 16 (laverie, épreuve), dossier Español 2.19.

> ### Mardi 10 novembre — un lave-vaisselle par jour, cinq machines par semaine
> **Ses mots** : « lave vaisselle 1 fois par jour. et pour la machine a laver je la lance combien de fois par semaine? »
> **Fait** : les pastilles « Todo en 1 » toutes les 4 semaines (le paquet de 30), le sel toutes les 8 ; soin et ménage
> ≈ 43,03 € par mois (maison et ménage 15,22) ; le plafond « Maison et ménage » suit de 14 à 15 € s'il valait encore
> 14 (`postes-soin-maison-v2`, schéma 58) ; la cagnotte reste à 130 €. Pages de la semaine : le lave-vaisselle
> rempli et lancé chaque soir après le dîner ; le vendredi, la tenue de salle du jeudi part avec le kimono.
> **La machine à laver** (réponse) : 2 cette semaine (mardi soir, dimanche 16:30) ; 5 dès le 16 — lundi, mercredi
> et vendredi au retour du JJB (kimono et rashguard, 30 °C), mardi 19:10 (vêtements), dimanche 16:30 (draps et
> serviettes, 60 °C).

> ### Lundi 9 novembre, la nuit — le soin, la santé et le ménage comptés au centime
> **Ses mots** : « aussi les produits de soin et de santé. je veux meme traquer les produits de nettoyage pour la
> maison. comme ca tout ce que je dépense est comptabilisé », puis sa liste (lessive par 10 kg, adoucissant, poudre
> de lave-vaisselle, dégraissant, surfaces, sol ; déo, shampoing, gel douche, dentifrice, nettoyant visage, papier
> toilette) et « quoi d'autre ? », et « pour le sol je peux utiliser quoi ? vu que j'ai l'aspirateur serpillère ».
> **Fait** : deux rayons en fin de liste de Courses, « Soin et santé » (12) et « Maison et ménage » (16), tous dus le
> samedi 14 (il coche « j'en ai » pour ce qu'il a). Ajoutés à sa liste : le sel du lave-vaisselle (eau très
> calcaire), liquide vaisselle, éponges, lavettes, sacs poubelle et congélation,
> essuie-tout, gel WC, anticalcaire, savon pour les mains, fil dentaire, brosse à dents, rasoirs et gel, mouchoirs,
> Skinoren. Prix relevés **en ligne** le 9 novembre (Mercadona Alicante, Alcampo pour la lessive),
> marques du magasin ; le Skinoren reste « prix à relever » et compte 19,90 € dans le plan d'argent. Les rythmes
> partent de sa grille (5 machines, ~17 douches, rasage du dimanche…) puis se **mesurent** : le bouton « fini »
> ramène le produit au samedi suivant (le jour même un samedi avant 16:00) et la durée entre deux « fini »
> remplace la mienne. ≈ 41,34 € par mois (27,81 soin et santé dont ≈ 21,56 de Skinoren, 13,53 maison et ménage).
> Budget : « Santé » devient « Soin et santé », « Maison et ménage » arrive (plafonds 28 et 14 €) ; Nourriture
> reste 200 €. Plan d'argent : une ligne « Soin et maison », leur moyenne par samedi dès le 14 ; la cagnotte du
> 25 passe de 180 à 130 €. Migrations `courses-plan-v12` et `postes-soin-maison-v1`, schéma 57, test117.
> Pages de la semaine : le tour de la salle de bain samedi 14, les tickets rangés par poste au rangement.
> **Le sol** : pas de friegasuelos (la mousse remonte dans l'appareil) ; eau seule ou la solution de sa marque.
> **Puis** : « je peux acheter du vinaigre blanc pour le mettre dans le lave vaisselle [...] je peux faire une poudre
> maison moins chère ». Non aux deux (le vinaigre use les joints ; une poudre maison, sans enzymes, laisse un voile
> blanc avec cette eau) : les pastilles « Todo en 1 » de Mercadona, 2,95 € les 30 (0,10 € le lavage, contre ~0,12
> pour la poudre Finish), le rinçage dedans — la ligne « Liquide de rinçage » sort, le sel reste. Le vinaigre sert
> au détartrage de la bouilloire et de la cuve du rice cooker.
> **Reste** : la marque et le modèle de l'aspirateur-serpillière, et la fréquence réelle du lave-vaisselle.

> ### Lundi 9 novembre, la nuit — Google Agenda reconstruit sur le plan actuel
> **Ses mots** : « j'ai pas de muay thai le mardi » ; puis, à « je reconstruis ton agenda sur le plan actuel ? » :
> « oui ». Son agenda gardait les séries 🦇 de septembre : la Muay Thai du mardi 19:30 (sortie le 1er octobre),
> la course de 05:30 jusqu'au parc, le skyr à l'ail, « pain complet, fromage » à la collation, un coucher à 22:00.
> La Batcave n'aligne que le jour et le lendemain quand il l'ouvre, et ne supprime jamais une série adoptée.
> **Fait** : 85 séries créées depuis la grille du jour de la Batcave (`__bcRappels`), sous ses propres titres pour
> qu'elle les adopte sans doublon : dès le 10 novembre ; salle et JJB dès le 16 (pas de sport cette semaine) ; les
> blocs d'espagnol jusqu'au 8 décembre (`UNTIL`), les « Projets perso » qui les remplacent dès le 9 ; descriptions
> courtes et à jour (pâtes à midi, Nutella, sessions de batch, viande du mardi), révisions sans contenu (« c'est
> toi qui choisis quoi »). 66 anciennes séries supprimées ; gardés : « 🦇 Enlever les tapis » (14:52), les rappels
> 💶, les cours de la fac. L'ancien « 🦇 Rangement des courses » du samedi 15:30 (`kv478nj1svmo0ckekl2vc0s0us`),
> dont il avait refusé la suppression par erreur (« j'ai pas fait exprès »), est supprimé aussi : 67 en tout. Le
> samedi 21 ne montre plus que les nouvelles séries. Le rappel « 💶 Paie le club (100 €) » du 28 est inchangé
> (question laissée sans réponse ; la Batcave compte 70 € le 5).

> ### Lundi 9 novembre, plus tard — le Nutella sur les galettes, dans la Batcave aussi
> **Ses mots** (plus tôt dans la soirée) : « sur les galettes de riz tu peux remplacer par du nutella » ; le miel
> reste dans le shake. Jusqu'ici, seule la page de la semaine le disait ; la Batcave, qui fait foi, disait encore
> le miel.
> **Fait** (`NUTELLA_DEBUT` = 10 novembre) : la collation combat devient banane, 2 galettes et 15 g de Nutella
> (aliment ajouté, étiquette UE : 539 kcal, 6,3 g de protéines, 57,5 g de glucides, 30,9 g de lipides pour
> 100 g), dans le plan, l'onglet Repas et la consigne ; les jours d'avant gardent leur miel. Courses : le miel
> ne sert plus qu'au shake, un pot de 750 g toutes les cinq semaines au lieu de deux ; un pot de Nutella de
> 400 g entre en fin des réserves de cinq semaines (Alcampo, prix à relever). Plafond Nourriture 207 -> 200 €
> (`plafond-nourriture-v10`, schéma 56) ; la cagnotte du plan d'argent passe à 180 €.
> **Corrigé au passage** : la recette sans sauce du midi disait « riz nature » les jours de pâtes ; la consigne
> du déjeuner dit maintenant « cuites au batch du mardi » de mercredi à samedi ; l'huile du dimanche midi frais
> (20 ml, dont 10 crus) dans l'onglet Repas ; la règle « Le goût » parle des pâtes à midi.
> Tests 53, 94, 99, 103, 108, 109 et 114 recalés.

> ### Lundi 9 novembre, le soir — deux batchs par semaine, plus rien au congélateur
> **Ses mots** : « si je divise le batch cooking en deux jours, comme ça je congèle ni riz ni pâtes ».
> **Fait** (`DEUX_BATCHS_DEBUT` = 15 novembre) : deux sessions d'une heure. Le dimanche à 14:30, le dîner du
> dimanche puis lundi et mardi, midi et soir (5 boîtes, et les 15 œufs durs) ; le mardi à 19:10, dans le temps
> libre après le dîner, mercredi à samedi (8 boîtes). Tout au frigo, quatre jours au plus. Le dimanche midi,
> dès le 22 (`dimancheFrais`) : un repas frais, pâtes, 3 œufs, brocoli, 20 ml d'huile (le 15, la dernière
> boîte du congélateur). La viande crue du mardi, achetée le samedi, part au congélateur au rangement des
> courses (nouvelle consigne du samedi, grammes calculés) et descend au frigo le lundi soir (consigne du
> dîner). Courses : 18 œufs, 420 g de poulet. Le plafond Nourriture passe de 209 à 207 €
> (`plafond-nourriture-v9`, schéma 55 : son cloud gardait les 209 de la v8). L'onglet Préparation montre
> les deux sessions, leurs postes et leurs heures. Tests 53, 94, 108, 109 et 114 recalés.
> **À noter** : je lui avais dit « mardi à 18:05 » (l'heure du batch de cette semaine) ; dès le 17, son
> mardi dîne à 18:00 et n'est libre qu'à 19:10 — la session est à 19:10, le dîner du mardi vient du dimanche.

> ### Lundi 9 novembre — des pâtes à midi, le riz le soir ; la peau commence mardi
> **Ses mots** : « le riz, ça monte vite au cerveau », puis « au pire, pâtes à midi tous les jours et riz le soir
> tous les jours » ; « j'ai rien commencé, même le traitement, et je n'ai pas de peroxyde ».
> **Fait** : dès le lundi 16 (`PATES_MIDI_DEBUT`), 125 g de pâtes à midi, cuites au batch du dimanche et rangées
> dans les boîtes du midi ; le riz, 125 g, se cuit chaque matin pour le soir. Mêmes calories, 5,75 g de protéines
> de plus. Courses : les pâtes en fin des réserves de 4 semaines (7 paquets de 500 g), le riz passe à 4 kg ; la
> semaine type des besoins devient celle du 16 ; 3 paquets à prendre samedi 14 pour aller jusqu'au 28. Le bilan
> peau des 12 semaines passe au dimanche 7 février 2027. Tests 53, 94, 99, 103, 114 et 115 recalés.

> ### Dimanche 8 novembre, le soir — le budget remis au réel
> **Ses mots** : « c'est quoi mes frais fixes », puis « j'ai pas encore payé ma licence de JJB, elle se
> paye en une fois, et je n'ai pas payé le proprio pour les deux mois d'électricité », « il y a
> l'abonnement Basic-Fit aussi », « j'ai pris le premium, et j'ai pas de carte de transports encore ».
> **Trouvé dans son cloud** : la ligne « Courses 300 € », retirée le 21 septembre, était revenue (sa
> liste du 27 octobre) ; avec elle, 548,50 € de charges, une cagnotte à zéro et un trou de 46 € le 24.
> **Fait** (`fc-migration-v5`, rejouée après le cloud ; schéma 54) : « Courses 300 € » et les
> transports sortent, avec leurs dépenses automatiques ; Basic-Fit Premium entre, 29,99 € toutes les
> 4 semaines (nouvelle périodicité, 32,49 € par mois) ; la licence se paie en une fois, en novembre
> (`uneFois`) : le plan d'argent la sort en entier dans cette période, le budget la garde lissée ;
> plafonds Nourriture 209 €, Abonnements 140,99 €, Eau et électricité 70 €. Le plan d'argent se lit
> période par période, et la cagnotte garde la marge d'un second prélèvement Basic-Fit (27,49 €) :
> **170 €** le 25. Frais fixes : **240,99 € par mois**. Un bloc « À régler » dans le mois de l'argent :
> le proprio (2 mois, ≈ 140 €) et la licence (30 €), chacun avec un bouton « Payé ».

> ### Dimanche 8 novembre — plus de cottage cheese, le 3e œuf revient
> **Ses mots** : « enlève le cottage cheese, ça me dégoûte, je peux remplacer par quoi ».
> **Le changement** : dès le 8, la collation redevient 50 g d'amandes, **3 œufs durs** et 7 dattes
> (≈ 700 kcal, 31 g de protéines, 0,49 g par kilo) ; le mardi et le jeudi, la boîte de sardines
> remplace les trois œufs. Les jours d'avant gardent leur cottage cheese (`COTTAGE_FIN`). La journée :
> ≈ 3 275 kcal et 126 g de protéines (2,0 g par kilo), ≈ 3 800 kcal et 136 g les jours de JJB.
> **Ce qui suit** : la liste de courses perd sa ligne (17 articles) et passe à 15 œufs (trois boîtes
> de 6) ; la semaine type des besoins devient celle du 9 ; le batch cooking cuit 15 œufs. Le budget
> compte les 5 œufs de plus (+1,41 € par semaine au plan ; le cottage cheese n'avait pas de prix) : la
> cagnotte conseillée passe de 200 à 190 €, le plafond Nourriture de 201 à 209 € (migration v8, s'il
> vaut encore 201). L'autre option proposée : 150 g de skyr nature avec les dattes coupées dedans,
> qui garde toutes les protéines.

> ### Samedi 7 novembre, le soir — le rattrapage refait, le mois d'espagnol repris
> **Ses mots** : « refais le plan de rattrapage avec le réveil à 5h30 […] il faut que je rattrape
> énormément de cours sur la semaine qui vient, et on décale aussi le début de la période
> d'apprentissage d'espagnol », puis « le rattrapage et l'espagnol en même temps », puis « pas le 8
> mais le 9, demain je vais faire le mealprep ». Rien n'a été fait du 6 au 7 (malade).
> **Espagnol** : es-1 s'arrête le samedi 7 (le passé garde ses blocs) ; le dimanche 8 est hors phase ;
> le mois repart en entier du **lundi 9 au mardi 8 décembre** (`es-1-reprise`, ≈ 11 h de blocs par
> semaine). L'épreuve suit : diagnostic le 15, puis 22, 29 novembre et 6 décembre. L'objectif
> « Espagnol » ne compte plus les blocs d'avant le 9 : 30,6 h en novembre, 11,8 h en décembre.
> **Rattrapage** : les 44 temas, du **lundi 9**, régénéré sur la grille réelle (lever 05:20, Anki 05:30)
> dans l'ordre des échéances : Anatomía T2 et Biología 10 le lundi (practicas 1 et 4), T10 à T12 avant la
> practica 2 (semaine du 16), Epidemiología 6, 8 et 10 avant RR/OR (26-27), l'article du cuestionario IA
> le 12. Les blocs d'espagnol restent à l'espagnol ; du 9 au 14, la salle et le JJB attendent le
> médecin et leurs créneaux vont au rattrapage (la muscu part de la première séance faite). **34 temas
> du 9 au 15, la file vide le mardi 24.** Le dossier Español et la prise en main suivent les dates.

> ### Samedi 7 novembre — sport v8 : le sac et le combat
> **Sa demande** : un programme athlétique, pas trop massif, qui serve au JJB et au sac (gants achetés,
> abonnement en salle), polyarticulaires bienvenus. **Le haut ne bouge pas** (lundi volume, jeudi lourd).
> **Mardi** : sauts sur box + squat, soulevé de terre roumain + cou, puis **3 rounds techniques au sac**.
> **Samedi** : **lancers rotatifs au médecine-ball** (à la place des sauts en longueur) + bulgare, Nordic +
> relevés, élévations + curl marteau, puis **3 rounds d'intervalles** (14 × 3 s à fond, 10 s légers).
> Shadow boxing en échauffement ces deux jours. Sortent leg curl assis, mollets, hip thrust (55 min tenues).
> Sources : Loturco 2016, Dunn 2022 (le coup suit les jambes), Pinto 2026 (rotation), Kamandulis 2018 (sac
> en intervalles), Arseneau 2011 (intensité du sac). **« J'ai rien fait encore »** : la montée en charge
> (14 jours à la moitié des tours), la séance de référence et les retests (lundis des semaines 5, 10, 15)
> partent maintenant de la **première séance faite**, plus d'une date écrite.

> ### Samedi 31 octobre, la nuit — le vrai départ, le dimanche 1er novembre
> **Départ** : rien n'avait commencé le 22 (« on commence tout dimanche matin »). Jour 1 au dimanche
> 1er novembre, lever 05:20 d'un coup, muscu et JJB le lundi 2 (tours × ½ jusqu'au 15, retests les
> 23 novembre, 28 décembre et 1er février), courses faites le 31, snus au 1er (migration v3, schéma 52),
> stabilisation de la boucle poids jusqu'au 22 novembre. La phase Español garde sa fin, le 15 novembre.
> **Rattrapage** : 38 temas donnés au 30 octobre (cronogramas de `le-semestre.html`), plan généré sur la
> grille réelle du 1er au 24 novembre, dans l'ordre des échéances (cuestionario 2 d'Anatomía le 4 ou 5,
> cuestionario d'Antropología le 6, prácticas, RR/OR les 26-27). Les temas d'Anatomía donnés ensuite
> passent devant. **À lui de confirmer** que les profs ont suivi le cronograma, et le compte de Documentación.
> **Sport v7** « athlétique, pas massif » : puissance en tête (sauts, pompes claquées, en paire avec le
> gros exercice), Nordic, leg extension et curl EZ sortis, face pulls le lundi. **Tour de taille** chaque
> dimanche dans la clôture, tour d'épaules le dimanche des photos ; +1 cm par mois → −100 kcal.
> **Audit de ce qui s'affiche** : préparation, courses, sport, snus, objectifs, Approfondir, déjeuner,
> trajet du lundi, épreuve d'espagnol (dimanches calculés). **Agenda** : les séries 🦇 de septembre
> portaient encore pâtes, fromage, parc, Muay Thai ; l'instance du jour et du lendemain reprend désormais
> la consigne du jour. Les séries au-delà de demain gardent leurs anciennes heures et descriptions : le
> connecteur ne sait pas réécrire une récurrence — à décider avec lui (les supprimer, et la Batcave pose
> les blocs du jour).
> **En attente** : test14 (le tableau de bord dépasse son seuil de 3 px, échec antérieur à ce lot) ;
> la page « Les délices de Yanis » (semoule, pâtes, beurre de cacahuète) n'est pas touchée sans son avis.

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

- **Le mois de l'argent** (Budget, 25 septembre au soir) : panneau `budget-mois-panel`,
  `moisArgent(iso)` / `renderMoisArgent()`, test `test114`. 192 € n'était qu'une **moyenne**
  (193,62 € depuis le prix des amandes) : une période d'un virement au suivant compte 4 ou 5 samedis de courses, et avec 5
  il ne reste qu'environ 158 €. D'où **150 € le jour du virement** (ce que laisse même une période
  à 5 samedis, arrondi à la dizaine en dessous) et **le reste la veille du suivant**
  (≈ 60,49 € avec 4 samedis, ≈ 9,87 € avec 5). **Le virement passe au 25** (sa décision, le 25 au
  soir) : le 28 laissait trop peu de marge avant le loyer quand il tombe un week-end (28 nov.
  samedi, 28 févr. 2027 dimanche). Le premier virement arrive encore le 28 septembre
  (`REVENU_MOIS.depuis`) : première période du 28 sept. au 24 oct., puis du 25 au 24. Le club
  garde le 28. Consignes « À mettre en place une fois » dans le panneau (virement permanent de
  sa mère, Jar Wise « Épargne et business », Apple et Bouygues faits, facture d'eau et
  d'électricité). **Amandes : 12 €/kg** (son relevé du 25 au soir, `PRIX.amandes`) — plus aucune
  ligne « prix à relever », `PRIX_ESTIMES` vide ; courses 50,63 €/semaine, 219,38 €/mois ;
  plafond Nourriture 201 → 219 si c'est encore le mien (`plafond-nourriture-v4`). Agenda 💶 : 28 sept. 12:35 (virement, une fois), le 25 (virement et
  cagnotte, `68n5dpque190a6p9bm5lnp2ft4`), le 28 (club, `i0hja7ddt7f6m193du4cno1rgk`), le 1er
  (propriétaire), le 24 (le reste, `ournj3sp5574qef64r8s80muk4`).
- **Phase Español : un mois pile à partir du samedi 26 septembre** (sa demande du 25 au soir,
  « j'ai pas encore commencé ») : `PERIODES_GRILLE` es-1 finit le **dimanche 25 octobre** inclus,
  les projets reviennent le **lundi 26**. `EPREUVE_FIN` = 25 octobre : cinq passages (27 sept., 4,
  11, 18, 25 oct.). Textes de la Batcave, 11 séries 🦇 de l'agenda (« Jusqu'au 25 octobre »), pages
  (journée type, calendrier S1 v1.3, le semestre, prise en main, dossiers Español et E-commerce,
  Dental Mastery OS) et tests 64, 78, 85, 100, 107 recalibrés.
- Branche : `claude/notion-addictions-nutrition-tracker-pf3lmg`. Tout est poussé.
- Serveur de tests : `python3 -m http.server 8199 --bind 127.0.0.1` depuis `tests/`.
- Campagne : `bash tests/runall.sh`, résultat dans `/tmp/reg10.log`, finit par `ALL_DONE`.
- Audits : `audit.mjs`, `audit-suivi.mjs`, `contraste.mjs`, `verif-pages.mjs`, lancés depuis `tests/`.
- La référence qui fait foi pour la grille, c'est **`calendrier-s1.html`**. Quand
  un document et elle se contredisent, c'est elle qui a raison — et c'est
  comme ça que les routines ont été corrigées.
