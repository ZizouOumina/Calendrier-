#!/bin/bash
# Copie servie aux tests. On retire le <link> Google Fonts : dans le bac a sable, cette
# requete passe par un proxy et reste parfois pendante ; or une feuille de style en
# attente bloque l'execution des scripts qui la suivent -- la page restait en
# readyState "loading" et le boot ne demarrait jamais. C'etait la cause de toutes les
# instabilites (goto en timeout, reload jamais termine). Le fichier reel n'est pas touche.
cd "$(dirname "$0")"
sed '/fonts\.googleapis\.com/d' ../batcave.html > ./batcave.html
