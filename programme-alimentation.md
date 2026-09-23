# Programme d'alimentation — La Batcave

Copie de référence du plan appliqué dans la Batcave (onglets Repas, Préparation et Courses).
Copie du **20 septembre 2026**, après le retrait du poisson. Le plan démarre le **lundi
21 septembre 2026** avec le reste du programme (jour 1 ; les cours, eux, ont repris le 14).

> Ce fichier ne calcule rien : il recopie ce que la Batcave applique. Si un chiffre diverge,
> c'est l'application qui fait foi — les macros, la liste de courses et la session de
> préparation y sortent toutes de la MÊME source (`compoRepas`), pas de trois tables
> recopiées à la main.

## Le cadre
- 64 kg · 182 cm · 20 ans · quatre séances de sport par semaine · objectif **72 kg** à mars 2027 (environ +1,3 kg par mois, 0,31 kg par semaine — relevé de 70 à 72 kg le 23 septembre).
- **3 230 kcal par jour · protéines 166 g (2,6 g/kg) · glucides 377 g · lipides 115 g.** Tout est pesé cru. (3 131 kcal avant le 23 septembre : le jambon de la collation est remplacé par deux œufs durs.)
- Cinq prises par jour. Riz à midi, pâtes le soir. Depuis le 20 septembre, **poulet tous les midis et viande hachée 5 % tous les soirs** : la rotation ne change plus d'un jour à l'autre.
- Eau : 3 litres par jour.
- Viande **halal, achetée à la boucherie** — pas en supermarché, aucune exception. (Le jambon, qui y était aussi, est sorti du plan le 23 septembre.)

## Les cinq prises

| Heure | Prise | Contenu | Apport |
|---|---|---|---|
| 06:45 | Petit-déjeuner | Flocons d'avoine 80 g · skyr 180 g · 2 œufs (100 g) · beurre de cacahuète 25 g · banane 120 g | 821 kcal · P 50 · G 93 · L 28 |
| 12:20 | Déjeuner | Riz 155 g cru · poulet 80 g · légumes verts 200 g · huile d'olive 30 ml | 978 kcal · P 35 · G 134 · L 33 |
| 14:50 | Collation entraînement | Pain complet 60 g · 2 œufs durs (100 g) · fromage 20 g | 363 kcal · P 23 · G 27 · L 17 |
| 20:00 (19:00 le week-end) | Dîner | Pâtes 105 g crues · viande hachée 5 % 90 g · légumes verts 150 g · huile d'olive 15 ml · 1 fruit (≈ 120 g) | 752 kcal · P 37 · G 96 · L 22 |
| 21:30 (20:30 le week-end) | Collation soir | Skyr 125 g · miel 20 g · beurre de cacahuète 30 g | 316 kcal · P 21 · G 27 · L 15 |

Les grammes de pâtes du dîner sont les seuls à bouger : c'est là que s'écrit l'ajustement de
la boucle poids → calories (voir plus bas).

> **Pourquoi le poisson est sorti (20 septembre).** À 13 € le kilo il coûtait plus du double
> du poulet pour la même place dans l'assiette, et il imposait deux cuissons de plus le
> dimanche. Les macros ne bougent pas : les quantités de poulet et de viande hachée ont été
> reprises pour tenir les mêmes 3 131 kcal et les mêmes 161 g de protéines.

> **Pourquoi le skyr et pas le yaourt grec.** Le skyr ne contient que deux ingrédients —
> lait écrémé pasteurisé et ferments — donc le lactosérum a été égoutté. Les yaourts grecs
> « alto en proteínas » du même rayon ajoutent de la *proteína de leche*, qui en rapporte.
> Le lactosérum est la fraction laitière la plus associée à l'acné, et le protocole peau
> rend son verdict le 13 décembre : on ne change rien avant. L'étiquette est donc à relire
> en rayon quelle que soit l'enseigne : c'est la liste d'ingrédients qui décide, pas la
> marque. Il l'achetait à Alcampo ; depuis son relevé du 21 septembre c'est **Lidl**, à
> 0,75 € la boîte de 150 g, soit 5,00 €/kg — contre 6,44 €/kg pour les 480 g à 3,09 €
> d'Alcampo.

## La boucle poids → calories
- Pesée **un dimanche sur deux**, à jeun, après les toilettes, avant de boire, toujours dans les mêmes conditions. Saisie dans le Journal ou à la clôture du soir.
- La Batcave lit une **pente** : une droite des moindres carrés sur les pesées des **douze dernières semaines** (84 jours), dont elle tire le gain par semaine. Il lui faut au moins **4 pesées étalées sur 12 jours**.
- Elle rejoue le calcul en retirant chaque pesée une par une : si la recommandation change en enlevant une seule d'entre elles, elle ne propose rien et nomme la pesée qui décidait de tout. Un dimanche salé ne fait donc pas retirer 100 kcal.
- L'ajustement s'écrit dans les pâtes du dîner : +150 kcal = +40 g de pâtes crues (3,6 kcal par gramme cru, arrondi à 10 g). La liste de courses suit (× 7 jours, × le cycle de la catégorie).
- Rythme visé : environ 1 kg par mois. Si le poids stagne trois semaines, on rouvre le chiffre, pas tout le plan.

## Les courses
Les quantités ne sont pas recopiées : elles sortent du plan de repas × 7 jours × le cycle de
la catégorie, puis s'arrondissent **au-dessus** du conditionnement réel. La viande ne
s'arrondit pas — le boucher pèse le montant exact. Les fruits se comptent à l'unité.

**Les prix sont les siens**, relevés les 20 et 21 septembre — **les seize lignes**, chacune
avec sa boutique et sa date, aucune estimation, aucun trou. Le 19 il avait fait sauter les
estimations (« enlève l'estimation de budget, dès que j'achèterai je t'enverrai les
factures ») ; ce qui est écrit ici n'est donc plus une estimation mais un relevé. Ce que ça
donne : **46,32 € par semaine, 200,71 € par mois** (44,89 et 194,54 avant le 23 septembre : deux œufs remplacent le jambon), calculés sur ce qu'il mange (le besoin
hebdomadaire) et non sur l'achat du jour — un bidon d'huile de 2 L dure cinq semaines. Ce
montant est le *plan* ; ce qu'il a vraiment payé se saisit dans Budget → Nourriture à partir
de ses tickets, et c'est ce dernier qui compte dans ses dépenses du mois. Un **plafond**
Nourriture y est posé à 201 € (195 avant le 23 septembre), à la place de l'ancienne charge fixe « Courses » de
300 €/mois, qui comptait la nourriture deux fois.

**Chaque semaine** — 7 articles

| Article | À prendre | Le plan demande | Où | Prix relevé |
|---|---|---|---|---|
| Poulet | 560 g (pesé au comptoir) | 560 g | Boucherie | 7,50 €/kg |
| Viande hachée 5 % | 630 g (pesée au comptoir) | 630 g | Boucherie | 12,00 €/kg |
| Skyr | 2,25 kg (15 boîtes de 150 g) | 2 135 g | Lidl | 5,00 €/kg — 0,75 € la boîte |
| Œufs | 30 (5 boîtes de 6) | 28 | Lidl | 1,69 € la boîte de 6 |
| Pain complet | 450 g (1 paquet) | 420 g | Lidl | 1,05 € les 450 g, 16 tranches |
| Bananes | 7 | 7 | Lidl | 1,48 €/kg |
| Fruits (pommes, poires, oranges…) | 7 | 7 | Frutería, de saison | ≈ 2 €/kg |

La boîte d'œufs de 12 est à 2,84 €, soit moins cher à l'unité que celle de 6 : trois boîtes
de 6 font les 30, mais deux de 12 plus une de 6 coûtent moins.

**Toutes les 2 semaines** — deux articles.
- **Légumes verts surgelés 5 kg** (le plan en demande 4 900 g), Lidl, 1,25 €/kg. Deux
  semaines et pas quatre : 10 kg de surgelés ne rentrent pas dans son congélateur.
- **Fromage en tranches 400 g**, un paquet d'édam (le plan en demande 280 g sur deux
  semaines), Lidl, 2,55 € les 400 g — et **cuajo vegetal** sur l'étiquette, à vérifier en
  rayon. Il était dans « Chaque semaine » jusqu'au 22 septembre alors qu'il portait déjà un
  cycle de deux semaines : 140 g par semaine contre un conditionnement de 400, un paquet
  couvre presque trois semaines. Il est maintenant rangé là où son cycle est écrit.

**Toutes les 4 semaines** — riz 5 kg (4 340 g, 1,09 €/kg) · pâtes 3 kg (2 940 g, plus la
boucle kcal s'il y en a une, 1,09 €/kg) · flocons d'avoine 2,5 kg (2 240 g, 1,50 €/kg,
0,75 € les 500 g) · miel 1 kg (560 g, 10,00 €/kg). Tout chez Lidl.

**Toutes les 5 semaines** — beurre de cacahuète 2 kg (1 925 g), Alcampo, 5,30 €/kg —
2,65 € le pot de 500 g de crème 100 % cacahuète moulue à la meule (tarif en ligne) ·
huile d'olive **2 L, un bidon** (1 575 ml demandés), Lidl, 11,89 € les 2 L. L'huile est
montée à 315 ml par semaine depuis le retrait du poisson : 30 ml à midi avec le poulet,
15 ml le soir avec la viande hachée, les sept jours. Le bidon de 2 L couvre donc le cycle
à lui seul, et il reste 425 ml — qui ne sont pas perdus : il coche la ligne sans acheter
tant qu'il lui en reste.

**Tous les 3 mois** — créatine monohydrate, 1 pot de 500 g, en ligne. 5 g par jour.

**Aucun stock n'est supposé** : la liste part de zéro à chaque passage. Ce qu'il a déjà, il le
coche sans l'acheter.

## La préparation du dimanche (14:30, deux heures)
Une session, **quatorze boîtes** : les sept repas de midi et les sept du soir. L'onglet
Préparation écrit tout depuis le plan — ce qu'il y a à cuire, l'ordre minuté, et le contenu
exact de chaque boîte.

À cuire pour la semaine : riz 1 085 g crus · pâtes 735 g · poulet 560 g · viande hachée 630 g
· légumes 2 450 g · 315 ml d'huile · 28 œufs durs (le matin et la collation).

- **Quatre jours au frigo, trois au congélateur** : de la viande cuite tient quatre jours à 4 °C, pas sept.
- Refroidir à découvert avant de fermer ; deux heures maximum entre la casserole et le frigo.
- Ne jamais réchauffer deux fois. Le fruit reste entier, jamais dans la boîte.
- Le petit-déjeuner et les deux collations ne se préparent pas : ils s'assemblent en cinq minutes.

## Ce qui est suivi dans la Batcave
- Les cinq cases de l'onglet Repas se réinitialisent à minuit ; la barre du jour prorate les calories aux cases cochées.
- L'onglet Courses n'affiche que les catégories dues ce samedi-là et annonce la date du prochain passage de chacune. Cocher tous les articles dus coche l'habitude « Courses faites ».
- Objectif à six mois : 72 kg, lu automatiquement dans les pesées du Journal.
