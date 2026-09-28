# syntax=docker/dockerfile:1
# God's Eye View — image de production pour Render (ou tout hébergeur Docker).
# Build de production + `vite preview`, jamais le serveur de dev `vite` :
# preview n'enregistre pas /api/setup/* (le panneau POWER UP qui écrit .env),
# ne sert que dist/ (ni le code source ni .gev-logs) et tient dans ~130 Mo
# de RAM, contre ~900 Mo pour le serveur de dev après un chargement de page.

FROM node:24-bookworm-slim AS build
WORKDIR /app
# puppeteer ne sert qu'aux scripts de QA : ne jamais télécharger Chrome.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
# Les devDependencies sont NÉCESSAIRES à l'exécution (vite, vite-plugin-cesium, ws) :
# pas de NODE_ENV=production avant cette ligne, pas de `npm prune --omit=dev`.
RUN npm ci --no-audit --no-fund
COPY . .
# Clés navigateur figées dans dist/ AU BUILD (build/vite.js, `define`). Elles sont
# publiques par nature : les restreindre au domaine .onrender.com chez le fournisseur.
ARG GOOGLE_MAPS_API_KEY=""
ARG CESIUM_ION_TOKEN=""
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
# HOST doit valoir exactement 0.0.0.0 dans l'environnement : build/vite.js en déduit
# allowedHosts=true, sinon le nom public (xxx.onrender.com) reçoit un 403.
# PINOKIO_SHARE_LOCAL=true : défense en profondeur, Provider Settings refuse toute
# requête même si quelqu'un relançait un jour ce conteneur avec le serveur de dev.
ENV HOST=0.0.0.0 \
    PORT=4173 \
    PINOKIO_SHARE_LOCAL=true
COPY --from=build /app /app
# Seul le cache est inscriptible par l'utilisateur de l'app. .gev-logs n'est
# volontairement pas créé : la route publique /api/realtime/debug-log ne stocke rien.
RUN mkdir -p /app/.gev-cache && chown node:node /app/.gev-cache
USER node
EXPOSE 4173
# `vite preview` ignore la variable PORT (Vite 6) : on la passe avec --port.
# --configLoader native : pas de fichier temporaire dans node_modules (non inscriptible).
CMD ["sh", "-c", "exec node node_modules/vite/bin/vite.js preview --configLoader native --host 0.0.0.0 --port \"${PORT:-4173}\" --strictPort"]
