# ============================================
# Dockerfile Multi-Stage pour Backend Node.js
# Optimisé pour Production
# ============================================

# ---- Stage 1: Builder ----
FROM node:18-alpine AS builder

LABEL maintainer="Bafoka DAO Team"
LABEL description="Token Gated DAO Backend API"

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (production uniquement)
RUN npm install --production && \
    npm cache clean --force

# ---- Stage 2: Production ----
FROM node:18-alpine

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copier les dépendances depuis builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copier le code source
COPY --chown=nodejs:nodejs . .

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=3001

# Passer à l'utilisateur non-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Démarrer l'application
CMD ["node", "src/server.js"]
