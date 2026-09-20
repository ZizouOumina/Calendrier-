# Programme d'alimentation — La Batcave

Copie de référence du plan appliqué dans la Batcave (onglets Repas, Préparation et Courses).
Copie du **20 septembre 2026**, après le retrait du poisson. Le plan démarre le **lundi
21 septembre 2026** avec le reste du programme (jour 1 ; les cours, eux, ont repris le 14).

> Ce fichier ne calcule rien : il recopie ce que la Batcave applique. Si un chiffre diverge,
> c'est l'application qui fait foi — les macros, la liste de courses et la session de
> préparation y sortent toutes de la MÊME source (`compoRepas`), pas de trois tables
> recopiées à la main.

## Le cadre
- 64 kg · 182 cm · 20 ans · quatre séances de sport par semaine · objectif 70 kg à mars 2027 (environ +1 kg par mois).
- **3 131 kcal par jour · protéines 161 g (2,5 g/kg) · glucides 377 g · lipides 106 g.** Tout est pesé cru.
- Cinq prises par jour. Riz à midi, pâtes le soir. Depuis le 20 septembre, **poulet tous les midis et viande hachée 5 % tous les soirs** : la rotation ne change plus d'un jour à l'autre.
- Eau : 3 litres par jour.
- Viande et jambon **halal, achetés à la boucherie** — pas en supermarché, aucune exception.

## Les cinq prises

| Heure | Prise | Contenu | Apport |
|---|---|---|---|
| 06:45 | Petit-déjeuner | Flocons d'avoine 80 g · skyr 180 g · 2 œufs (100 g) · beurre de cacahuète 25 g · banane 120 g | 821 kcal · P 50 · G 93 · L 28 |
| 12:20 | Déjeuner | Riz 155 g cru · poulet 80 g · légumes verts 200 g · huile d'olive 30 ml | 978 kcal · P 35 · G 134 · L 33 |
| 14:50 | Collation entraînement | Pain complet 60 g · jambon 40 g · fromage 20 g | 264 kcal · P 18 · G 27 · L 8 |
| 20:00 (19:00 le week-end) | Dîner | Pâtes 105 g crues · viande hachée 5 % 90 g · légumes verts 150 g · huile d'olive 15 ml · 1 fruit (≈ 120 g) | 752 kcal · P 37 · G 96 · L 22 |
| 21:30 (20:30 le week-end) | Collation soir | Skyr 125 g · miel 20 g · beurre de cacahuète 30 g | 316 kcal · P 21 · G 27 · L 15 |

Les grammes de pâtes du dîner sont les seuls à bouger : c'est là que s'écrit l'ajustement de
la boucle poids → calories (voir plus bas).

> **Pourquoi le poisson est sorti (20 septembre).** À 13 € le kilo il coûtait plus du double
> du poulet pour la même place dans l'assiette, et il imposait deux cuissons de plus le
> dimanche. Les macros ne bougent pas : les quantités de poulet et de viande hachée ont été
> reprises pour tenir les mêmes 3 131 kcal et les mêmes 161 g de protéines.

> **Pourquoi le skyr et pas le yaourt grec.** Le skyr d'Alcampo ne contient que deux
> ingrédients — lait écrémé pasteurisé et ferments — donc le lactosérum a été égoutté. Les
> yaourts grecs « alto en proteínas » du même rayon ajoutent de la *proteína de leche*, qui en
> rapporte. Le lactosérum est la fraction laitière la plus associée à l'acné, et le protocole
> peau rend son verdict le 13 décembre : on ne change rien avant. Prix constaté : 3,09 € les
> 480 g.

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

**Aucun prix n'est écrit ici** : c'est sa décision du 19 septembre. Les montants réels se
saisissent dans Budget → Nourriture à partir de ses tickets de caisse.

**Chaque semaine** — 9 articles

| Article | À prendre | Le plan demande | Où |
|---|---|---|---|
| Poulet | 560 g | 560 g | Boucher |
| Viande hachée 5 % | 630 g | 630 g | Boucher |
| Skyr | 2,25 kg (5 pots de 450 g) | 2 135 g | Alcampo |
| Œufs | 18 (3 boîtes de 6) | 14 | Lidl |
| Jambon | 300 g (2 paquets de 150 g) | 280 g | Boucher |
| Fromage en tranches | 150 g | 140 g | Lidl (cuajo vegetal) |
| Pain complet | 450 g | 420 g | Lidl |
| Bananes | 7 | 7 | Mercadillo |
| Fruits (pommes, poires, oranges…) | 7 | 7 | Mercadillo, de saison |

**Toutes les 2 semaines** — légumes verts surgelés **5 kg** (le plan en demande 4 900 g).
Deux semaines et pas quatre : 10 kg de surgelés ne rentrent pas dans son congélateur.

**Toutes les 4 semaines** — riz 5 kg (4 340 g) · pâtes 3 kg (2 940 g, plus la boucle kcal
s'il y en a une) · flocons d'avoine 2,5 kg (2 240 g) · miel 750 g (560 g).

**Toutes les 5 semaines** — beurre de cacahuète 2 kg (1 925 g) · huile d'olive 2,25 L
(1 575 ml). L'huile est montée à 315 ml par semaine depuis le retrait du poisson : 30 ml à
midi avec le poulet, 15 ml le soir avec la viande hachée, les sept jours.

**Aucun stock n'est supposé** : la liste part de zéro à chaque passage. Ce qu'il a déjà, il le
coche sans l'acheter.

## La préparation du dimanche (14:30, deux heures)
Une session, **quatorze boîtes** : les sept repas de midi et les sept du soir. L'onglet
Préparation écrit tout depuis le plan — ce qu'il y a à cuire, l'ordre minuté, et le contenu
exact de chaque boîte.

À cuire pour la semaine : riz 1 085 g crus · pâtes 735 g · poulet 560 g · viande hachée 630 g
· légumes 2 450 g · 315 ml d'huile · 14 œufs durs.

- **Quatre jours au frigo, trois au congélateur** : de la viande cuite tient quatre jours à 4 °C, pas sept.
- Refroidir à découvert avant de fermer ; deux heures maximum entre la casserole et le frigo.
- Ne jamais réchauffer deux fois. Le fruit reste entier, jamais dans la boîte.
- Le petit-déjeuner et les deux collations ne se préparent pas : ils s'assemblent en cinq minutes.

## Ce qui est suivi dans la Batcave
- Les cinq cases de l'onglet Repas se réinitialisent à minuit ; la barre du jour prorate les calories aux cases cochées.
- L'onglet Courses n'affiche que les catégories dues ce samedi-là et annonce la date du prochain passage de chacune. Cocher tous les articles dus coche l'habitude « Courses faites ».
- Objectif à six mois : 70 kg, lu automatiquement dans les pesées du Journal.
