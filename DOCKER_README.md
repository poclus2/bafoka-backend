# 🐳 Docker Deployment - Quick Start

## 📦 Fichiers Docker Créés

Tous les fichiers nécessaires pour déployer sur DigitalOcean ont été créés :

```
backend/
├── Dockerfile                    # Image Docker multi-stage optimisée
├── docker-compose.yml            # Orchestration (backend + nginx)
├── .dockerignore                 # Exclusions pour Docker build
├── nginx.conf                    # Reverse proxy avec SSL/TLS
├── .env.production               # Template variables production
├── deploy.sh                     # Script de déploiement automatisé
└── DIGITALOCEAN_DEPLOYMENT.md    # Guide complet (voir artifacts)
```

---

## 🚀 Déploiement Local (Test)

### 1. Configuration

```bash
# Copier le template
cp .env.example .env

# Configurer les variables
nano .env
```

### 2. Lancer avec Docker

```bash
# Build et démarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Tester l'API
curl http://localhost:3001/api/health
```

### 3. Arrêter

```bash
docker-compose down
```

---

## ☁️ Déploiement DigitalOcean

### Méthode Rapide

1. **Créer un Droplet Ubuntu 22.04** (2GB RAM, $12/mois)
2. **Se connecter en SSH** : `ssh root@YOUR_IP`
3. **Cloner le repo** :
   ```bash
   git clone https://github.com/YOUR_USERNAME/bafoka-backend.git
   cd bafoka-backend
   ```
4. **Configurer** `.env` avec vos vraies valeurs
5. **Déployer** :
   ```bash
   chmod +x deploy.sh
   ./deploy.sh production
   ```

### Guide Complet

👉 **Consultez le guide détaillé** : [`DIGITALOCEAN_DEPLOYMENT.md`](file:///C:/Users/LENOVO/.gemini/antigravity/brain/a348e998-37a3-42fe-8f26-eb1047f4a3b9/DIGITALOCEAN_DEPLOYMENT.md)

Ce guide couvre :
- ✅ Création du droplet
- ✅ Installation Docker
- ✅ Configuration firewall (UFW)
- ✅ SSL/HTTPS avec Let's Encrypt
- ✅ Monitoring et maintenance
- ✅ Résolution de problèmes

---

## 📋 Checklist Avant Déploiement

- [ ] **Contrats blockchain déployés** (addresses notées)
- [ ] **Wallet admin créé** avec fonds pour gas
- [ ] **Secret généré** : `openssl rand -base64 32`
- [ ] **Domaine DNS configuré** (optionnel pour HTTPS)
- [ ] **Fichier `.env`** complété avec vraies valeurs

---

## 🔧 Configuration Production

### Variables Critiques à Modifier

Dans `.env.production` :

```bash
# 1. Adresses des contrats (OBLIGATOIRE)
TOKEN_CONTRACT_ADDRESS=0xYourTokenAddress
DAO_CONTRACT_ADDRESS=0xYourDAOAddress
GOVERNANCE_CONTRACT_ADDRESS=0xYourGovernanceAddress

# 2. Clé privée admin (CRITIQUE - Sécurisé)
ADMIN_PRIVATE_KEY=0xYourPrivateKey

# 3. Secret de dérivation (CRITIQUE)
WALLET_DERIVATION_SECRET=$(openssl rand -base64 32)

# 4. CORS (votre domaine frontend)
ALLOWED_ORIGINS=https://app.yourdomain.com
```

---

## 🏗️ Architecture Docker

### Multi-Stage Build

```
Stage 1 (Builder) → Installation dépendances
Stage 2 (Production) → Image Alpine légère (60-80MB)
```

**Sécurité** :
- ✅ Utilisateur non-root
- ✅ Health check intégré
- ✅ Limites de ressources

### Services

```yaml
backend:   Port 3001 (API Node.js)
nginx:     Port 80/443 (Reverse proxy)
```

---

## 📊 Health Check

```bash
# Local
curl http://localhost:3001/api/health

# Production
curl https://api.yourdomain.com/api/health
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "API opérationnelle",
  "data": {
    "network": { "name": "sepolia", "chainId": 11155111 },
    "contracts": { ... }
  }
}
```

---

## 🛠️ Commandes Utiles

```bash
# Logs en temps réel
docker-compose logs -f backend

# Redémarrer
docker-compose restart

# Rebuild complet
docker-compose up -d --build

# Shell dans le conteneur
docker exec -it bafoka-dao-backend sh

# Statistiques ressources
docker stats

# Nettoyer les images inutilisées
docker image prune -f
```

---

## ⚙️ Configuration Nginx

Le reverse proxy nginx fournit :

- ✅ **SSL/TLS** avec Let's Encrypt
- ✅ **Rate limiting** (100 req/min)
- ✅ **Compression gzip**
- ✅ **Headers de sécurité** (HSTS, CSP, XSS)
- ✅ **Proxy vers backend** avec timeout optimisé

---

## 🔐 Sécurité

### Mesures Implémentées

1. **Docker**
   - Utilisateur non-root (nodejs:1001)
   - Image Alpine (surface d'attaque réduite)
   - Secrets via variables d'environnement

2. **Nginx**
   - Rate limiting (protection DDoS)
   - Headers de sécurité (HSTS, X-Frame-Options)
   - SSL moderne (TLS 1.2+)

3. **Serveur**
   - Firewall UFW
   - Fail2ban (protection brute-force SSH)
   - Permissions fichiers strictes (`.env` → 600)

---

## 💰 Coûts DigitalOcean

| Configuration | Specs | Prix/mois |
|---------------|-------|-----------|
| **Minimal** | 1GB RAM, 1 CPU | $6 |
| **Recommandé** | 2GB RAM, 2 CPU | $12 |
| **Production** | 4GB RAM, 2 CPU | $24 |

**Optionnel** :
- Backups automatiques : +20%
- Load Balancer : +$12
- Floating IP : +$4

---

## 🆘 Résolution de Problèmes

### API ne démarre pas

```bash
# Vérifier les logs
docker-compose logs backend

# Vérifier les variables d'environnement
docker exec bafoka-dao-backend env | grep -E 'TOKEN|ADMIN'

# Redémarrer proprement
docker-compose down && docker-compose up -d
```

### Erreur blockchain

```bash
# Tester le RPC manuellement
curl -X POST https://ethereum-sepolia-rpc.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Certificat SSL expiré

```bash
# Renouveler manuellement
sudo certbot renew

# Redémarrer nginx
docker-compose restart nginx
```

---

## 📚 Documentation Complète

- 📖 **Guide DigitalOcean** : Voir artifacts → `DIGITALOCEAN_DEPLOYMENT.md`
- 📖 **API Documentation** : `http://localhost:3001/api-docs` (Swagger)
- 📖 **Backend README** : `README.md`

---

## ✅ Prochaines Étapes

1. **Tester localement** avec `docker-compose up -d`
2. **Configurer** `.env.production` avec vos valeurs
3. **Créer un Droplet** DigitalOcean
4. **Suivre le guide** `DIGITALOCEAN_DEPLOYMENT.md`
5. **Configurer SSL** avec Let's Encrypt
6. **Monitorer** avec DigitalOcean Monitoring

---

**🎉 Votre backend est prêt à être déployé sur DigitalOcean !**

Pour toute question, consultez le guide complet ou les logs Docker.
