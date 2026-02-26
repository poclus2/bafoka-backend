# ============================================
# Dockerfile Multi-Stage pour Backend Node.js
# Optimisé pour Production
# ============================================

# ---- Stage 1: Builder ----
# Node 20 LTS = support garanti jusqu'en avril 2026
FROM node:20-alpine AS builder

LABEL maintainer="Bafoka DAO Team"
LABEL description="Token Gated DAO Backend API"

WORKDIR /app

# Copier les fichiers de dépendances EN PREMIER (cache Docker optimal)
COPY package*.json ./

# npm ci = installation STRICTEMENT reproductible depuis package-lock.json
# Beaucoup plus rapide et fiable que npm install en CI/CD
RUN npm ci --only=production && \
    npm cache clean --force

# ---- Stage 2: Production ----
FROM node:20-alpine

# curl pour le healthcheck (plus fiable que Node seul)
RUN apk add --no-cache curl

# Utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copier les dépendances depuis builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copier uniquement le code source (pas les fichiers dev)
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs package*.json ./

# Exposer le port
EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001

USER nodejs

# Health check via curl (beaucoup plus léger que Node)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -fs http://localhost:3001/api/health || exit 1

CMD ["node", "src/server.js"]
