# Shopify : compétences à maîtriser et grille d'audit

Mets à jour la colonne « Statut » (à faire / vu / maîtrisé) après chaque « point Shopify ». Le tuteur s'en sert pour savoir quoi m'expliquer ensuite.

## A · Compétences, dans l'ordre d'apprentissage
| # | Compétence | Où dans l'admin | Statut |
|---|---|---|---|
| 1 | Réglages généraux : devise, unités, fuseau, TVA incluse dans les prix | Paramètres → Général, Taxes | à faire |
| 2 | Produits, variantes, SKU, stock, prix barré (règle des 30 jours) | Produits | à faire |
| 3 | Collections manuelles et automatiques | Produits → Collections | à faire |
| 4 | Thème Dawn : sections, blocs, éditeur, presets, vitesse | Boutique en ligne → Thèmes → Personnaliser | à faire |
| 5 | Page produit optimisée : ordre des sections, preuve, FAQ, bundle | Personnaliser → modèle produit | à faire |
| 6 | Pages légales et menus (aviso legal, privacidad, cookies, envíos, devoluciones) | Boutique en ligne → Pages, Navigation ; Paramètres → Politiques | à faire |
| 7 | Paiements : Shopify Payments, PayPal, Shop Pay, captures | Paramètres → Paiements | à faire |
| 8 | Checkout : champs, compte invité, upsell post-achat, extensibilité | Paramètres → Paiement (checkout) | à faire |
| 9 | Livraison : profils, zones, tarifs, seuil de gratuité, délais affichés | Paramètres → Expédition et livraison | à faire |
| 10 | Taxes : Espagne 21 %, OSS au-delà de 10 000 € UE, IOSS côté fournisseur | Paramètres → Taxes et droits | à faire |
| 11 | Markets : pays, langues, devises, domaines | Paramètres → Marchés | à faire |
| 12 | Réductions : codes, automatiques, par lot, limites | Réductions | à faire |
| 13 | Apps : installer, mesurer l'impact sur la vitesse, désinstaller | Apps | à faire |
| 14 | Canaux : Facebook & Instagram (pixel + API), TikTok, Google & YouTube (Merchant Center) | Canaux de vente | à faire |
| 15 | Confidentialité client et bannière de cookies, Consent Mode | Paramètres → Confidentialité des clients | à faire |
| 16 | Analytics et rapports : conversion, panier moyen, sources, cohortes | Analyses de données | à faire |
| 17 | Commandes : traitement, suivi, remboursements, litiges | Commandes | à faire |
| 18 | Clients, segments, Shopify Email vs Klaviyo | Clients, Marketing | à faire |
| 19 | Shopify Flow : automatisations (tag, e-mail, alerte stock) | Apps → Flow | à faire |
| 20 | Métachamps et métaobjets (tableaux de caractéristiques, FAQ dynamiques) | Paramètres → Données personnalisées | à faire |
| 21 | Liquid, bases : afficher une variable, une condition, une boucle dans une section | Modifier le code | à faire |
| 22 | Shopify CLI et thèmes en local (avec Claude Code) | Terminal | à faire |
| 23 | Domaines, e-mails d'expéditeur, SPF/DKIM/DMARC | Paramètres → Domaines, Notifications | à faire |
| 24 | Sauvegarde et export : produits, clients, commandes en CSV | Chaque section → Exporter | à faire |

## B · Grille d'audit d'une boutique (« audit boutique »)
Note chaque ligne 0 (absent), 1 (présent mais faible), 2 (bon). Corrige d'abord les 0 dans les blocs Tunnel et Confiance.

### Vitesse
- LCP mobile ≤ 2,5 s, CLS ≤ 0,1, score PageSpeed ≥ 70 ; nombre d'apps ≤ 6 ; images WebP ≤ 200 ko.

### Page produit
- Au-dessus de la ligne de flottaison : image ou vidéo, promesse en une phrase, prix, note ou preuve, bouton.
- Description en blocs : problème, promesse, mécanisme, preuve, caractéristiques, FAQ.
- Bundle 1 / 2 / 3 avec la deuxième option mise en avant ; garantie visible ; délai de livraison réel affiché.
- Avis authentiques, photos de clients, réponse aux avis négatifs.

### Tunnel
- Frais de port et taxes visibles avant le paiement ; compte invité ; Shop Pay, Apple Pay, Google Pay, PayPal ; nombre d'écrans ≤ 4.
- Upsell post-achat ; e-mails de confirmation et de suivi personnalisés.

### Confiance et légal
- Aviso legal complet ; privacidad ; cookies avec bannière bloquante ; envíos y devoluciones (14 jours) ; contact visible ; nom de marque, pas nom de produit.

### Mesure
- Pixel Meta + API (EMQ ≥ 6), pixel TikTok + API, GA4, Consent Mode v2 ; UTM sur toutes les pubs ; sondage post-achat.

### E-mail
- Klaviyo : bienvenue, panier abandonné (3 mails), navigation abandonnée, post-achat, reconquête ; SPF, DKIM, DMARC configurés.

### Opérations
- Synchronisation fournisseur ; suivi automatique ; réponses types ; politique de retour appliquée ; provisions IVA et IRPF virées chaque lundi.

## C · Journal d'optimisation (une ligne par changement)
| Date | Changement | Hypothèse | Mesure à 3 jours | Verdict |
|---|---|---|---|---|
| … | … | … | … | garder / annuler |
