# God's Eye View — déploiement

Ce dossier est une copie de [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view)
au commit `81eb44340d90feda5b5283438f6e5fdad5cabbdd` (licence MIT, voir `LICENSE`). Il est
identique à l'original, sauf `docs/media/` : les GIF de démonstration (68 Mo) n'ont pas été
copiés, donc les images du `README.md` anglais sont absentes. Les fichiers ajoutés pour le
déploiement sont `Dockerfile`, `.dockerignore`, ce fichier, `../render.yaml` et une
exception dans le `.gitignore` racine, pour garder les icônes PNG de la couche ALPR.

## Pourquoi un serveur, et pas GitHub Pages

L'application n'est pas un simple site statique. Son serveur Node relaie presque toutes les
données en direct sous `/api/…` : avions, navires, satellites, caméras, radio, trafic, feux,
météo. Sur GitHub Pages, seuls le globe, la recherche et les séismes fonctionneraient.
**Les caméras de surveillance exigent le serveur.** Elles passent par `/api/cctv/…`, qui va
chercher les images chez les opérateurs publics.

Le `Dockerfile` construit l'app, puis la sert avec `vite preview`, le serveur prévu pour une
version construite. Il lance les mêmes 26 relais de données que le serveur de développement,
mais :

- il ne sert que `dist/` : ni le code source ni les journaux ne sont lisibles ;
- il n'active jamais le panneau POWER UP / Provider Settings, qui écrit les clés dans `.env`,
  donc aucun visiteur ne peut modifier les clés ;
- il occupe environ 70 Mo de RAM au démarrage, contre près de 900 Mo pour le serveur de dev
  après un chargement de page ; l'offre gratuite de Render en donne 512.

## Mettre en ligne sur Render (gratuit, environ 5 minutes)

1. Ouvrir <https://dashboard.render.com> et se connecter avec GitHub.
2. **New → Blueprint**.
3. Donner l'accès au dépôt `ZizouOumina/Calendrier-`, le choisir, puis choisir la branche
   `claude/gods-eye-view-deploy-w759qz`. Plus tard, ce sera la branche par défaut, une fois
   la branche fusionnée.
4. Render lit `render.yaml` et propose le service `gods-eye-view` (Docker, Free, Francfort).
   Cliquer **Apply**, sans renseigner de clé.
5. Le premier build prend quelques minutes. L'adresse finale ressemble à
   `https://gods-eye-view-xxxx.onrender.com`.

Ensuite, chaque commit qui touche `gods-eye-view/` ou `render.yaml` redéploie tout seul. Les
commits de la Batcave ne déclenchent rien, grâce au `buildFilter`.

### Voir les caméras

**Data Layers → Cameras**, puis aller sur une ville couverte : Austin, Texas, Californie,
Londres, Ontario, Finlande, Colombie-Britannique, Tallinn, Delaware (en vidéo continue),
Nouvelle-Galles du Sud ou Calgary. Il y a environ 3 600 caméras routières publiques, sans
aucune clé. L'image est projetée dans la ville en 3D. L'orientation de chaque caméra est
estimée, et on peut la corriger en faisant glisser la poignée sur la caméra.

### Limites de l'offre gratuite

- Le service se met en veille après 15 minutes sans visite. La visite suivante le réveille
  en environ une minute.
- Il y a 750 heures d'instance par mois, largement assez pour un seul service.
- Au-delà de la bande passante incluse, et sans moyen de paiement enregistré, Render suspend
  le service jusqu'au mois suivant. Un premier chargement de l'app pèse plusieurs Mo.

## Clés optionnelles

Sans clé, on a le globe (Esri ou OSM), les avions, les avions militaires, les satellites, les
séismes, les caméras, la radio et les lancements. Les clés se règlent sur Render, dans le
service, onglet **Environment**. Le panneau POWER UP n'existe pas en production.

| Clé | Ce qu'elle ajoute | Moment où elle agit |
|---|---|---|
| `CESIUM_ION_TOKEN` | 3D photoréaliste Google via Cesium ion, relief mondial | au build : **Save, rebuild, and deploy** |
| `GOOGLE_MAPS_API_KEY` | 3D Google en direct, avec facturation, et la recherche Google | au build |
| `OPENAI_API_KEY` | commande vocale et résumé IA du HUD | à l'exécution |
| `AISSTREAM_API_KEY` | navires en direct | à l'exécution |
| `FIRMS_MAP_KEY` | feux actifs NASA | à l'exécution |
| `TOMTOM_API_KEY` | trafic | à l'exécution |
| `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET` | quota OpenSky plus large | à l'exécution |

**Attention, le site est public.** Toute personne qui connaît l'adresse peut dépenser les
clés côté serveur, comme OpenAI ou TomTom. Avant d'en ajouter une, fixer un plafond de
dépense chez le fournisseur. On peut aussi limiter le débit avec
`GEV_RATELIMIT_OPENAI_PER_MIN` et `GEV_RATELIMIT_GOOGLE_PER_MIN`, mais derrière Render la
limite s'applique à tout le site, pas à chaque visiteur. Les clés navigateur
(`CESIUM_ION_TOKEN`, `GOOGLE_MAPS_API_KEY`) sont lisibles dans la page : les restreindre au
domaine `*.onrender.com` du service chez Cesium ou Google.

## Tester en local

```bash
cd gods-eye-view
docker build -t gods-eye-view .
docker run --rm -p 4173:4173 gods-eye-view   # http://localhost:4173
```

Sans Docker, avec Node 24 : `npm ci && npm run dev`, comme dans le README d'origine.

## Ce qui a été vérifié avant la mise en ligne

Le 28 septembre 2026, l'image a été construite puis lancée comme Render le fait, avec
`PORT=10000` et un nom d'hôte public :

- la page répond 200 et l'app démarre dans Chromium sans aucune erreur JavaScript, avec ses
  26 couches ;
- `/api/setup/*` répond 404, même à une requête d'attaque forgée, et aucun `.env` n'est écrit ;
- `/src/…` renvoie la page d'accueil et non le code source ;
- le processus tourne sous l'utilisateur `node` et occupe environ 72 Mo de RAM ;
- la route caméras `/api/cctv/sources` répond.

La machine de test bloquait les sites des fournisseurs de données. Les données en direct
(caméras, avions, satellites) restent donc à constater sur l'adresse Render.

## Mettre à jour vers une version plus récente

Recopier le dépôt d'origine à un commit plus récent, en gardant `Dockerfile`,
`.dockerignore` et `DEPLOIEMENT.md` :

```bash
git clone https://github.com/bilawalsidhu/gods-eye-view.git /tmp/gev
git -C /tmp/gev archive HEAD | tar -x -C gods-eye-view
rm -rf gods-eye-view/docs/media/*.gif gods-eye-view/docs/media/*.png gods-eye-view/docs/media/start-here
```

Puis remplacer le numéro de commit en haut de ce fichier.
