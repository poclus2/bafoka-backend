#!/bin/bash
# ============================================
# Script de Déploiement Bafoka DAO Backend
# Usage: ./deploy.sh [production|staging]
# ============================================

set -e  # Arrêter en cas d'erreur non gérée

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
ENVIRONMENT=${1:-production}
CONTAINER_NAME="bafoka-dao-backend"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log()   { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()    { echo -e "${GREEN}✅ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

echo -e "${GREEN}========================================"
echo -e "  Bafoka DAO — Déploiement $ENVIRONMENT"
echo -e "========================================${NC}"

# ---- Étape 1: Vérifications préalables ----
log "Étape 1/6: Vérifications..."

if [ ! -f ".env.${ENVIRONMENT}" ]; then
    error "Fichier .env.${ENVIRONMENT} introuvable"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "docker-compose n'est pas installé"
    exit 1
fi

ok "Pré-conditions validées"

# ---- Étape 2: Chargement de l'environnement ----
log "Étape 2/6: Chargement de .env.${ENVIRONMENT}..."
cp ".env.${ENVIRONMENT}" .env
ok "Variables d'environnement chargées"

# ---- Étape 3: Sauvegarde de l'ancien conteneur (pour rollback) ----
log "Étape 3/6: Sauvegarde du conteneur actuel..."

if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
    OLD_IMAGE=$(docker inspect --format='{{.Config.Image}}' ${CONTAINER_NAME} 2>/dev/null || echo "")
    echo "$OLD_IMAGE" > .rollback_image
    warn "Ancien conteneur sauvegardé. Image précédente: $OLD_IMAGE"
    warn "Rollback possible avec: docker run --name ${CONTAINER_NAME} ... $OLD_IMAGE"
else
    ok "Pas de conteneur existant (premier déploiement)"
fi

# ---- Étape 4: Build de la nouvelle image ----
log "Étape 4/6: Construction de l'image Docker..."
docker-compose down || true
docker-compose build --no-cache
ok "Image construite avec succès"

# ---- Étape 5: Démarrage des services ----
log "Étape 5/6: Démarrage des services..."
docker-compose up -d
ok "Conteneurs démarrés"

# ---- Étape 6: Vérification avec retry ----
log "Étape 6/6: Vérification du health check (max 60s)..."

MAX_RETRIES=12
RETRY_INTERVAL=5

for i in $(seq 1 $MAX_RETRIES); do
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        ok "Health check OK! (tentative $i/$MAX_RETRIES)"
        echo ""
        echo -e "${GREEN}========================================"
        echo -e "  Déploiement réussi! 🎉"
        echo -e "========================================${NC}"
        echo -e "  📡 API:          http://localhost:3001"
        echo -e "  📖 Swagger:      http://localhost:3001/api-docs"
        echo -e "  📊 Statut:       docker-compose ps"
        echo -e "  📋 Logs:         docker-compose logs -f"
        echo ""
        docker-compose ps
        echo "$TIMESTAMP" > .last_deployment
        docker image prune -f
        exit 0
    fi

    warn "Tentative $i/$MAX_RETRIES — statut HTTP: $HTTP_CODE. Nouvelle tentative dans ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

# ---- Échec: afficher les logs ----
error "Health check échoué après $MAX_RETRIES tentatives"
docker-compose logs --tail=50
exit 1
