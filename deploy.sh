#!/bin/bash

# ============================================
# Script de Déploiement DigitalOcean
# Usage: ./deploy.sh [production|staging]
# ============================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
ENVIRONMENT=${1:-production}
APP_NAME="bafoka-dao-backend"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Déploiement Backend - $ENVIRONMENT${NC}"
echo -e "${GREEN}========================================${NC}"

# Vérification de l'environnement
if [ ! -f ".env.${ENVIRONMENT}" ]; then
    echo -e "${RED}❌ Fichier .env.${ENVIRONMENT} introuvable${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Étape 1: Préparation de l'environnement${NC}"
cp .env.${ENVIRONMENT} .env
echo "✅ Variables d'environnement chargées"

echo -e "${YELLOW}🐳 Étape 2: Arrêt des conteneurs existants${NC}"
docker-compose down || true
echo "✅ Conteneurs arrêtés"

echo -e "${YELLOW}🏗️  Étape 3: Construction de l'image Docker${NC}"
docker-compose build --no-cache
echo "✅ Image construite avec succès"

echo -e "${YELLOW}🚀 Étape 4: Démarrage des services${NC}"
docker-compose up -d
echo "✅ Services démarrés"

echo -e "${YELLOW}⏳ Étape 5: Vérification du health check${NC}"
sleep 10

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Déploiement réussi! API opérationnelle${NC}"
    echo -e "${GREEN}📡 URL: http://localhost:3001${NC}"
    echo -e "${GREEN}📖 Documentation: http://localhost:3001/api-docs${NC}"
else
    echo -e "${RED}❌ Échec du health check (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}📋 Logs des conteneurs:${NC}"
    docker-compose logs --tail=50
    exit 1
fi

echo -e "${YELLOW}📊 Étape 6: Vérification des conteneurs${NC}"
docker-compose ps

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Déploiement terminé avec succès! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"

# Sauvegarde du timestamp de déploiement
echo "$TIMESTAMP" > .last_deployment

# Nettoyage des images non utilisées
echo -e "${YELLOW}🧹 Nettoyage des images inutilisées${NC}"
docker image prune -f

echo -e "${YELLOW}💡 Commandes utiles:${NC}"
echo "  - Logs:         docker-compose logs -f"
echo "  - Arrêter:      docker-compose down"
echo "  - Redémarrer:   docker-compose restart"
echo "  - Shell:        docker exec -it $APP_NAME sh"
