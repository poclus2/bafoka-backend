# ============================================
# Makefile — Commandes simplifiées
# Usage: make <commande>
# ============================================

.PHONY: help dev build up down logs shell restart health status clean deploy-prod

# Afficher l'aide par défaut
help:
	@echo ""
	@echo "  🚀 Bafoka DAO Backend — Commandes disponibles"
	@echo "  ================================================"
	@echo ""
	@echo "  DÉVELOPPEMENT"
	@echo "  make dev          → Démarrer en mode watch (nodemon)"
	@echo "  make install      → Installer les dépendances"
	@echo ""
	@echo "  DOCKER (LOCAL)"
	@echo "  make build        → Construire l'image Docker"
	@echo "  make up           → Démarrer les conteneurs (background)"
	@echo "  make down         → Arrêter et supprimer les conteneurs"
	@echo "  make restart      → Redémarrer le backend uniquement"
	@echo "  make logs         → Afficher les logs en temps réel"
	@echo "  make shell        → Ouvrir un shell dans le conteneur"
	@echo ""
	@echo "  MONITORING"
	@echo "  make health       → Vérifier l'état de l'API"
	@echo "  make status       → État des conteneurs Docker"
	@echo ""
	@echo "  PRODUCTION"
	@echo "  make deploy-prod  → Déployer en production"
	@echo "  make clean        → Nettoyer les images inutilisées"
	@echo ""

## Développement
install:
	npm install

dev:
	npm run dev

## Docker Local
build:
	docker-compose build --no-cache

up:
	docker-compose up -d
	@echo "✅ Conteneurs démarrés."
	@echo "   API:  http://localhost:3001"
	@echo "   Docs: http://localhost:3001/api-docs"

down:
	docker-compose down

restart:
	docker-compose restart backend

logs:
	docker-compose logs -f --tail=100 backend

shell:
	docker exec -it bafoka-dao-backend sh

## Monitoring
health:
	@curl -sf http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || \
	 curl -sf http://localhost:3001/api/health || \
	 echo "❌ API non disponible"

status:
	@docker-compose ps

## Production
deploy-prod:
	@./deploy.sh production

clean:
	docker image prune -f
	docker volume prune -f
	@echo "✅ Nettoyage terminé."
