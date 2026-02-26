# 🏛️ Bafoka DAO — Backend API

> API Node.js pour la gestion des wallets, tokens et gouvernance décentralisée sur le réseau **Celo**.
> Authentification sans mot de passe via **numéro de téléphone + PIN**.

[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com)
[![Ethers.js](https://img.shields.io/badge/Ethers.js-v6-purple)](https://docs.ethers.org)
[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📋 Table des matières

1. [Fonctionnalités](#-fonctionnalités)
2. [Architecture du projet](#-architecture-du-projet)
3. [🛠️ Tutoriel — Déploiement Backend](#️-tutoriel--déploiement-backend)
   - [Prérequis](#prérequis)
   - [Déploiement local (développement)](#déploiement-local-développement)
   - [Déploiement Docker (recommandé)](#déploiement-docker-recommandé)
   - [Déploiement production (DigitalOcean)](#déploiement-production-digitalocean)
   - [CI/CD automatique (GitHub Actions)](#cicd-automatique-github-actions)
4. [⛓️ Tutoriel — Déploiement des Smart Contracts](#️-tutoriel--déploiement-des-smart-contracts)
   - [Présentation des contrats](#présentation-des-contrats)
   - [Prérequis Hardhat](#prérequis-hardhat)
   - [Configurer le wallet de déploiement](#configurer-le-wallet-de-déploiement)
   - [Déploiement complet (Token + DAO + Gouvernance)](#déploiement-complet-token--dao--gouvernance)
   - [Vérifier le déploiement](#vérifier-le-déploiement)
   - [Mettre à jour le backend](#mettre-à-jour-le-backend)
5. [📖 Tutoriel — Utilisation de l'API](#-tutoriel--utilisation-de-lapi)
   - [Health Check](#health-check)
   - [Gestion des comptes](#gestion-des-comptes)
   - [Soldes](#soldes)
   - [Transactions](#transactions)
   - [Transferts](#transferts)
   - [Gouvernance DAO](#gouvernance-dao)
6. [Variables d'environnement](#-variables-denvironnement)
7. [Sécurité](#-sécurité)
8. [Dépannage](#-dépannage)

---

## ✨ Fonctionnalités

| Domaine | Fonctionnalités |
|---|---|
| **Wallets** | Création déterministe via téléphone + PIN (PBKDF2) |
| **Tokens BFK** | Consultation solde, historique, transfert, mint |
| **CELO** | Envoi de CELO natif, consultation solde |
| **Gouvernance** | Enregistrement membres, propositions IPFS, votes on-chain |
| **Sécurité** | Helmet, CORS, rate limiting Nginx, user non-root Docker |
| **Docs** | Swagger UI interactif disponible sur `/api-docs` |

---

## 📁 Architecture du projet

```
backend/
├── src/
│   ├── app.js                        # Configuration Express (middleware, routes)
│   ├── server.js                     # Point d'entrée — démarrage du serveur
│   ├── config/
│   │   ├── config.js                 # Variables d'environnement centralisées
│   │   └── swagger.js                # Configuration Swagger/OpenAPI
│   ├── contracts/
│   │   └── abis.js                   # ABI Token + DAO (smart contracts Celo)
│   ├── controllers/
│   │   ├── account.controller.js     # Création/vérification de comptes
│   │   ├── balance.controller.js     # Consultation des soldes
│   │   ├── transaction.controller.js # Historique des transactions
│   │   ├── transfer.controller.js    # Transferts de tokens/CELO
│   │   └── governance.controller.js  # Logique DAO complète
│   ├── services/
│   │   ├── blockchain.service.js     # Ethers.js — lectures/écritures blockchain
│   │   ├── phoneWallet.service.js    # Dérivation wallet depuis téléphone+PIN
│   │   ├── governance.service.js     # Interface contrat de gouvernance
│   │   └── gasManager.service.js     # Gestion automatique du gas
│   ├── routes/
│   │   ├── index.js                  # Routeur principal + /health
│   │   ├── account.routes.js
│   │   ├── balance.routes.js
│   │   ├── transaction.routes.js
│   │   ├── transfer.routes.js
│   │   └── governance.routes.js
│   └── middleware/
│       ├── errorHandler.js           # Gestionnaire centralisé des erreurs
│       └── logger.js                 # Logger des requêtes HTTP
├── hardhat/                          # Smart contracts + scripts de déploiement
├── Dockerfile                        # Image multi-stage (Node 20 Alpine)
├── docker-compose.yml                # Stack locale (backend + Nginx)
├── docker-compose.prod.yml           # Override production (image GHCR)
├── nginx.conf                        # Reverse proxy avec SSL + rate limiting
├── deploy.sh                         # Script de déploiement manuel
├── Makefile                          # Commandes simplifiées
└── .env.example                      # Template des variables d'environnement
```

---

## 🛠️ Tutoriel — Déploiement

### Prérequis

#### Pour le développement local
| Outil | Version minimale | Vérification |
|---|---|---|
| **Node.js** | v20 LTS | `node --version` |
| **npm** | v10+ | `npm --version` |
| **Git** | v2.x | `git --version` |

#### Pour le déploiement Docker
| Outil | Version minimale | Vérification |
|---|---|---|
| **Docker** | v24+ | `docker --version` |
| **Docker Compose** | v2.x | `docker compose version` |
| **Make** | Tout | `make --version` *(facultatif mais pratique)* |

---

### Déploiement local (développement)

#### Étape 1 — Cloner le projet

```bash
git clone https://github.com/votre-org/bafoka-backend.git
cd bafoka-backend
```

#### Étape 2 — Installer les dépendances

```bash
npm install
```

> 💡 Utilisez `npm ci` à la place si vous souhaitez une installation strictement reproductible (comme en CI/CD).

#### Étape 3 — Configurer les variables d'environnement

```bash
# Copier le template
cp .env.example .env
```

Ouvrez `.env` et renseignez les valeurs suivantes (minimum requis pour démarrer) :

```env
# ── Serveur ───────────────────────────────────────────
PORT=3001
NODE_ENV=development

# ── Blockchain Celo ───────────────────────────────────
# Testnet Celo Sepolia (recommandé pour les tests)
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
CELO_CHAIN_ID=11142220

# ── Contrats déployés ─────────────────────────────────
TOKEN_CONTRACT_ADDRESS=0xAEA24F4C64c515bd5744C9fba01BB38CcF02Ee43
DAO_CONTRACT_ADDRESS=0xF57e75a597B85239F1125c30f6F5ec4896D66A68
GOVERNANCE_CONTRACT_ADDRESS=0x...  # Adresse du contrat de gouvernance

# Numéro du bloc où le contrat de gouvernance a été déployé
# Optimise fortement les requêtes d'événements (ne pas laisser à 0 en prod)
GOVERNANCE_DEPLOYMENT_BLOCK=12345678

# ── Administration ────────────────────────────────────
# Clé privée du wallet admin (utilisé pour mint/transfert)
# ⚠️ JAMAIS committer cette valeur
ADMIN_PRIVATE_KEY=0x...

# ── Sécurité Wallets ──────────────────────────────────
# Salt secret pour la dérivation PBKDF2 des wallets téléphone
# ⚠️ NE JAMAIS CHANGER EN PRODUCTION — invalide tous les wallets
WALLET_DERIVATION_SECRET=un-secret-de-minimum-32-caracteres-ici

# ── Funding automatique ───────────────────────────────
# CELO envoyé automatiquement lors de la création d'un compte
INITIAL_WALLET_FUNDING=0.01
MIN_GAS_BALANCE=0.005
AUTO_GAS_AMOUNT=0.01
```

#### Étape 4 — Démarrer le serveur

```bash
# Mode développement avec rechargement automatique
npm run dev

# Mode production simple
npm start
```

**Sortie attendue :**
```
📡 Provider initialisé avec https://forno.celo-sepolia.celo-testnet.org (No-Batching Mode)
🚀 Serveur Bafoka DAO démarré!
📡 API: http://localhost:3001
📖 Documentation Swagger: http://localhost:3001/api-docs
🌍 Environnement: development
```

#### Étape 5 — Vérifier le bon fonctionnement

```bash
curl http://localhost:3001/api/health
```

Réponse attendue :
```json
{
  "success": true,
  "message": "API opérationnelle",
  "data": {
    "network": { "chainId": 11142220, "currentBlockNumber": 9876543 },
    "contracts": {
      "token": "0xAEA24F4C64c515bd5744C9fba01BB38CcF02Ee43",
      "dao": "0xF57e75a597B85239F1125c30f6F5ec4896D66A68"
    },
    "version": "1.0.0"
  }
}
```

---

### Déploiement Docker (recommandé)

Docker est la méthode recommandée pour éviter les problèmes de dépendances et garantir la reproductibilité.

#### Étape 1 — Préparer le fichier d'environnement

```bash
cp .env.example .env
# → Remplir .env avec vos vraies valeurs (voir section précédente)
```

#### Étape 2 — Construire et démarrer

**Avec Make (le plus simple) :**
```bash
make build   # Construit l'image Docker
make up      # Démarre les conteneurs en arrière-plan
make logs    # Suit les logs en temps réel
```

**Avec docker-compose (commandes complètes) :**
```bash
# Construire l'image
docker-compose build --no-cache

# Démarrer backend + Nginx en arrière-plan
docker-compose up -d

# Vérifier l'état
docker-compose ps

# Suivre les logs
docker-compose logs -f backend
```

#### Étape 3 — Vérifier le déploiement

```bash
# Santé via API
curl http://localhost:3001/api/health

# Ou avec Make
make health
```

#### Commandes utiles

```bash
make logs      # Logs en temps réel
make shell     # Ouvrir un terminal dans le conteneur
make restart   # Redémarrer uniquement le backend
make down      # Arrêter tous les conteneurs
make status    # Voir l'état des conteneurs
make clean     # Nettoyer les images inutilisées
```

---

### Déploiement production (DigitalOcean)

Ce guide suppose un **Droplet Ubuntu 22.04** avec Docker installé.

#### Étape 1 — Préparer le serveur

Connectez-vous via SSH et installez les dépendances :

```bash
ssh root@VOTRE_IP_SERVEUR

# Installer Docker
curl -fsSL https://get.docker.com | sh

# Installer docker-compose
apt-get install -y docker-compose-plugin

# Vérifier
docker --version
docker compose version
```

#### Étape 2 — Créer le dossier de l'application

```bash
mkdir -p /root/bafoka-backend
cd /root/bafoka-backend
```

#### Étape 3 — Créer le fichier d'environnement de production

```bash
nano .env.production
```

Remplissez le fichier avec vos valeurs de production :

```env
NODE_ENV=production
PORT=3001
CELO_RPC_URL=https://forno.celo.org  # Mainnet Celo
CELO_CHAIN_ID=42220

TOKEN_CONTRACT_ADDRESS=0x...
DAO_CONTRACT_ADDRESS=0x...
GOVERNANCE_CONTRACT_ADDRESS=0x...
GOVERNANCE_DEPLOYMENT_BLOCK=XXXXX   # ← Bloc de déploiement réel

ADMIN_PRIVATE_KEY=0x...              # ← Wallet admin avec CELO
WALLET_DERIVATION_SECRET=...        # ← Secret fort, min 32 chars

INITIAL_WALLET_FUNDING=0.01
MIN_GAS_BALANCE=0.005
AUTO_GAS_AMOUNT=0.01

ALLOWED_ORIGINS=https://votre-domaine.com
```

> ⚠️ **Ne commitez jamais `.env.production` dans Git !**

#### Étape 4 — Configurer Nginx avec votre domaine

Éditez `nginx.conf` et remplacez `your-domain.com` par votre vrai domaine :

```bash
sed -i 's/your-domain.com/api.votre-domaine.com/g' nginx.conf
```

#### Étape 5 — Générer les certificats SSL (Let's Encrypt)

```bash
apt-get install -y certbot
certbot certonly --standalone -d api.votre-domaine.com

# Copier les certificats là où Nginx les attend
mkdir -p ssl
cp /etc/letsencrypt/live/api.votre-domaine.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/api.votre-domaine.com/privkey.pem ssl/
```

#### Étape 6 — Déployer

```bash
# Si vous avez cloné le repo sur le serveur
./deploy.sh production
```

Ou avec docker-compose :
```bash
cp .env.production .env
docker-compose build --no-cache
docker-compose up -d
```

#### Étape 7 — Vérifier

```bash
curl https://api.votre-domaine.com/api/health
```

#### Renouvellement SSL automatique

```bash
# Ajouter dans crontab
crontab -e

# Ajouter la ligne (renouvellement tous les mois)
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/api.votre-domaine.com/fullchain.pem /root/bafoka-backend/ssl/ && cp /etc/letsencrypt/live/api.votre-domaine.com/privkey.pem /root/bafoka-backend/ssl/ && docker-compose -f /root/bafoka-backend/docker-compose.yml restart nginx
```

---

### CI/CD automatique (GitHub Actions)

Le pipeline CI/CD se déclenche automatiquement à chaque push sur `main`.

#### Étape 1 — Configurer les secrets GitHub

Dans votre dépôt GitHub, allez dans **Settings → Secrets and variables → Actions** et créez les secrets suivants :

| Secret | Description | Exemple |
|---|---|---|
| `DO_HOST` | IP ou domaine du serveur | `164.92.xxx.xxx` |
| `DO_USER` | Utilisateur SSH | `root` |
| `DO_SSH_KEY` | Clé privée SSH complète | `-----BEGIN OPENSSH...` |

**Générer une clé SSH dédiée au déploiement :**
```bash
# Sur votre machine locale
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/bafoka_deploy

# Ajouter la clé publique sur le serveur
ssh-copy-id -i ~/.ssh/bafoka_deploy.pub root@VOTRE_IP_SERVEUR

# Copier la clé PRIVÉE dans GitHub Secrets (DO_SSH_KEY)
cat ~/.ssh/bafoka_deploy
```

#### Étape 2 — Configurer l'environnement protégé (optionnel mais recommandé)

Dans GitHub, allez dans **Settings → Environments → New environment → production**.

Vous pouvez y activer une approbation manuelle obligatoire avant chaque déploiement.

#### Étape 3 — Pousser sur main

```bash
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main
```

Le pipeline effectuera automatiquement :
1. 🏗️ **Build** de l'image Docker avec cache (5× plus rapide)
2. 📦 **Push** vers GitHub Container Registry (GHCR)
3. 🚀 **Déploiement** sur le serveur via SSH
4. ✅ **Health check** avec retry 6× (rollback automatique si échec)

#### Déclencher un déploiement manuellement

Dans GitHub → **Actions → Deploy to DigitalOcean → Run workflow**.

---

## ⛓️ Tutoriel — Déploiement des Smart Contracts

Cette section couvre le déploiement depuis zéro des 3 contrats Solidity qui alimentent le backend. À effectuer **avant** de lancer le backend pour la première fois, ou à chaque mise à jour des contrats.

### Présentation des contrats

| Contrat | Fichier | Rôle |
|---|---|---|
| **Token** | `Token.sol` | Token ERC-20 BFK — monnaie de la DAO |
| **TokenGatedDao** | `TokenGatedDao.sol` | Registre des membres et droits d'accès |
| **GovernanceDAO** | `GovernanceDAO.sol` | Cycle complet des propositions et votes |

Les 3 contrats sont déployés en une seule commande via le script unifié `deploy-complete.js`.

---

### Prérequis Hardhat

#### Outils nécessaires

```bash
# Node.js v20 LTS requis
node --version  # → v20.x.x

# Yarn (gestionnaire de paquets du sous-projet Hardhat)
npm install -g yarn
```

#### Installer les dépendances Hardhat

```bash
# Se placer dans le sous-dossier hardhat
cd hardhat

yarn install
```

---

### Configurer le wallet de déploiement

#### Étape 1 — Créer un wallet dédié au déploiement

> ⚠️ Ne jamais utiliser votre wallet personnel pour déployer des contrats. Créez-en un dédié.

Utilisez la tâche Hardhat intégrée :

```bash
npx hardhat create-account
```

Sortie :
```
PRIVATE_KEY="0xabc123..."

Your account address: 0x4A5b6C7dXXXXXXXX
```

#### Étape 2 — Alimenter le wallet en CELO

Pour déployer sur **Celo Sepolia (testnet)**, obtenez des CELO de test gratuits :
1. Rendez-vous sur **[faucet.celo.org](https://faucet.celo.org)**
2. Choisissez le réseau **Celo Sepolia**
3. Collez l'adresse de votre wallet de déploiement
4. Cliquez sur **Faucet**

> Vous aurez besoin d'au moins **0.1 CELO** pour les 3 déploiements.

Pour le **Mainnet Celo**, achetez du CELO sur un exchange (Coinbase, Binance) et transférez-le vers l'adresse de déploiement.

#### Étape 3 — Créer le fichier de configuration Hardhat

```bash
# Dans le dossier hardhat/
cp .envexample .env
nano .env
```

Contenu du fichier `hardhat/.env` :

```env
# Clé privée du wallet de déploiement (SANS le préfixe 0x)
PRIVATE_KEY=votre_cle_privee_ici_sans_0x
```

> ⚠️ Ce fichier est dans `.gitignore`. Ne le commitez jamais.

---

### Déploiement complet (Token + DAO + Gouvernance)

#### Vérifier la connexion au réseau

Avant de déployer, assurez-vous que votre wallet est bien connecté :

```bash
# Dans hardhat/
npx hardhat accounts --network celosepolia
```

Sortie attendue :
```
0x4A5b6C7dXXXXXX  ← votre adresse de déploiement
```

```bash
# Vérifier le solde
npx hardhat run scripts/check-gas.js --network celosepolia
```

#### Lancer le déploiement

```bash
# Déploiement sur Celo Sepolia (testnet)
npx hardhat run scripts/deploy-complete.js --network celosepolia
```

Sortie attendue :
```
🚀 DÉMARRAGE DU DÉPLOIEMENT COMPLET sur celosepolia
===================================================
📝 Compte de déploiement: 0x4A5b6C7dXXXXXXXX
💰 Solde: 0.25 CELO

📄 [1/3] Déploiement du contrat TOKEN...
✅ Token déployé: 0xAAAA...1111

🏛️  [2/3] Déploiement du contrat TokenGatedDao...
✅ TokenGatedDao déployé: 0xBBBB...2222

⚖️  [3/3] Déploiement du contrat GovernanceDAO...
✅ GovernanceDAO déployé: 0xCCCC...3333

👑 Configuration des rôles...
   • Rôle MODERATOR attribué à l'admin
   • Rôle VALIDATOR attribué à l'admin

📝 Mise à jour des fichiers de configuration...
✅ .env mis à jour
✅ backend/.env mis à jour

🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !
===================================================
📍 Token:      0xAAAA...1111
📍 DAO:        0xBBBB...2222
📍 Governance: 0xCCCC...3333
===================================================
```

> 💡 Le script met automatiquement à jour `hardhat/.env` **et** `backend/.env` avec les nouvelles adresses et le bloc de déploiement. Pas besoin de copier-coller manuellement.

#### Redéployer un contrat individuellement

Si vous avez besoin de redéployer uniquement un contrat :

```bash
# Déploiement manuel d'un contrat spécifique
npx hardhat run scripts/manual_deploy.js --network celosepolia
```

---

### Vérifier le déploiement

#### Tester la connexion aux contrats

```bash
# Test de connexion complet (Token + Governance)
npx hardhat run scripts/test-governance-connection.js --network celosepolia
```

#### Vérifier le solde après déploiement

```bash
npx hardhat run scripts/check_balance_multi.js --network celosepolia
```

#### Vérifier sur l'explorateur blockchain

Vos contrats sont publiquement vérifiables sur :
- **Celo Sepolia explorer** : [celoscan.io](https://celoscan.io) → coller l'adresse du contrat
- Vous verrez le code source, les transactions et l'état du contrat

---

### Mettre à jour le backend

Après un déploiement, le fichier `backend/.env` est automatiquement mis à jour par le script. Vérifiez néanmoins que ces variables sont bien présentes :

```bash
# Vérifier le contenu du .env du backend
cat ../.env | grep -E 'CONTRACT|BLOCK'
```

Doit afficher :
```env
TOKEN_CONTRACT_ADDRESS=0xAAAA...1111
DAO_CONTRACT_ADDRESS=0xBBBB...2222
GOVERNANCE_CONTRACT_ADDRESS=0xCCCC...3333
GOVERNANCE_DEPLOYMENT_BLOCK=9876543
```

Ensuite, redémarrez le backend pour charger les nouvelles adresses :

```bash
# Depuis la racine du projet backend
npm run dev
# Ou avec Docker
make restart
```

**Vérification finale :**
```bash
curl http://localhost:3001/api/health
```
Les adresses de contrats dans la réponse doivent correspondre aux nouvelles adresses déployées.

---

## 📖 Tutoriel — Utilisation de l'API

> **Base URL** : `http://localhost:3001` (local) ou `https://api.votre-domaine.com` (production)
>
> **Documentation interactive** : `GET /api-docs` (Swagger UI)

Tous les exemples utilisent `curl`. Remplacez `BASE_URL` par votre URL réelle.

```bash
BASE_URL="http://localhost:3001"
```

---

### Health Check

Vérifier que l'API et la connexion blockchain sont opérationnelles.

```bash
curl $BASE_URL/api/health
```

<details>
<summary>Réponse exemple</summary>

```json
{
  "success": true,
  "message": "API opérationnelle",
  "data": {
    "timestamp": "2025-10-15T10:30:00.000Z",
    "network": {
      "chainId": 11142220,
      "name": "custom-celo",
      "currentBlockNumber": 9876543
    },
    "contracts": {
      "token": "0xAEA24F4C64c515bd5744C9fba01BB38CcF02Ee43",
      "dao": "0xF57e75a597B85239F1125c30f6F5ec4896D66A68"
    },
    "version": "1.0.0"
  }
}
```
</details>

---

### Gestion des comptes

Le système utilise un wallet **déterministe** : le même téléphone + PIN génère toujours la même adresse blockchain. Il n'y a pas de base de données — le wallet est recalculé à la volée.

#### ➕ Créer un compte

```bash
# POST /api/accounts/create
curl -X POST $BASE_URL/api/accounts/create \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250700000001",
    "pin": "1234",
    "country": "CI"
  }'
```

**Paramètres :**
| Champ | Type | Requis | Description |
|---|---|---|---|
| `phoneNumber` | string | ✅ | Numéro international (ex: `+2250700000001`) |
| `pin` | string | ✅ | Code PIN numérique, 4 à 8 chiffres |
| `country` | string | ❌ | Code ISO pays (ex: `CI`, `FR`, `US`) — aide à parser les numéros locaux |

<details>
<summary>Réponse exemple</summary>

```json
{
  "success": true,
  "message": "Compte créé/récupéré avec succès",
  "data": {
    "success": true,
    "wallet": {
      "address": "0x4A5b6C7d8E9f...",
      "phoneNumber": "+2250700000001"
    },
    "message": "✅ Wallet créé avec succès !",
    "initialFunding": {
      "celo": {
        "transactionHash": "0xabc123...",
        "amount": "0.01",
        "status": "success"
      },
      "token": {
        "transactionHash": "0xdef456...",
        "blockNumber": 9876544
      }
    }
  }
}
```
</details>

> 💡 Le compte reçoit automatiquement **0.01 CELO** (pour le gas) et **3000 BFK** (tokens du projet) lors de sa création.

#### 🔐 Vérifier l'accès à un wallet

Permet de valider qu'un utilisateur est bien propriétaire d'une adresse (authentification).

```bash
# POST /api/accounts/verify
curl -X POST $BASE_URL/api/accounts/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250700000001",
    "pin": "1234",
    "address": "0x4A5b6C7d8E9f..."
  }'
```

<details>
<summary>Réponse exemple</summary>

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "message": "✅ Authentification réussie"
  }
}
```
</details>

---

### Soldes

#### 💰 Tous les soldes (CELO + BFK)

```bash
# GET /api/balance/:address
curl $BASE_URL/api/balance/0x4A5b6C7d8E9f...
```

<details>
<summary>Réponse exemple</summary>

```json
{
  "success": true,
  "data": {
    "address": "0x4A5b6C7d8E9f...",
    "celo": {
      "raw": "10000000000000000",
      "formatted": "0.01",
      "symbol": "CELO"
    },
    "token": {
      "raw": "3000000000000000000000",
      "formatted": "3000.0",
      "symbol": "BFK",
      "name": "Bafoka Token",
      "decimals": 18,
      "contractAddress": "0xAEA24F4C64c515bd5744C9fba01BB38CcF02Ee43"
    }
  }
}
```
</details>

#### 🔵 Solde CELO uniquement

```bash
curl $BASE_URL/api/balance/0x4A5b6C7d8E9f.../celo
```

#### 🟣 Solde Token BFK uniquement

```bash
curl $BASE_URL/api/balance/0x4A5b6C7d8E9f.../token
```

---

### Transactions

#### 📋 Historique des transactions (envoyées + reçues)

```bash
# GET /api/transactions/:address
# Params optionnels: ?limit=20&fromBlock=9000000&toBlock=latest
curl "$BASE_URL/api/transactions/0x4A5b6C7d8E9f...?limit=20"
```

**Paramètres de requête :**
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `limit` | number | 10 | Nombre max de transactions à retourner |
| `fromBlock` | number | 0 | Bloc de départ (laisser vide pour scanner tout) |
| `toBlock` | number/string | `latest` | Bloc de fin |

<details>
<summary>Réponse exemple</summary>

```json
{
  "success": true,
  "data": {
    "address": "0x4A5b6C7d8E9f...",
    "contractAddress": "0xAEA24F4C64c515bd5744C9fba01BB38CcF02Ee43",
    "totalTransactions": 5,
    "transactions": [
      {
        "hash": "0xf1e2d3c4b5a6...",
        "blockNumber": 9876540,
        "timestamp": 1728900000,
        "from": "0xAdminWallet...",
        "to": "0x4A5b6C7d8E9f...",
        "value": {
          "raw": "3000000000000000000000",
          "formatted": "3000.0"
        },
        "type": "received"
      }
    ]
  }
}
```
</details>

#### 📤 Transactions envoyées uniquement

```bash
curl $BASE_URL/api/transactions/0x4A5b6C7d8E9f.../sent
```

#### 📥 Transactions reçues uniquement

```bash
curl $BASE_URL/api/transactions/0x4A5b6C7d8E9f.../received
```

---

### Transferts

#### 💸 Envoyer des tokens BFK (via téléphone/PIN)

```bash
# POST /api/transfer
curl -X POST $BASE_URL/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250700000001",
    "pin": "1234",
    "toAddress": "0xDestinataire...",
    "amount": "50"
  }'
```

**Paramètres :**
| Champ | Type | Description |
|---|---|---|
| `phoneNumber` | string | Téléphone de l'expéditeur |
| `pin` | string | PIN de l'expéditeur |
| `toAddress` | string | Adresse Ethereum du destinataire |
| `amount` | string | Montant en BFK (ex: `"50"` pour 50 tokens) |

<details>
<summary>Réponse exemple</summary>

```json
{
  "success": true,
  "data": {
    "transactionHash": "0x7a8b9c0d1e2f...",
    "blockNumber": 9876600,
    "from": "0xExpéditeur...",
    "to": "0xDestinataire...",
    "amount": "50",
    "gasUsed": "52000",
    "status": "confirmed",
    "timestamp": "2025-10-15T10:35:00.000Z"
  }
}
```
</details>

#### 📊 Estimer les frais de gas

```bash
# GET /api/transfer/estimate?toAddress=0x...&amount=50
curl "$BASE_URL/api/transfer/estimate?toAddress=0xDestinataire...&amount=50"
```

---

### Gouvernance DAO

Le système de gouvernance suit un cycle complet : **Enregistrement → Proposition → Modération → Vote → Exécution**.

#### 📊 Dashboard de gouvernance

```bash
curl $BASE_URL/api/governance/dashboard
```

#### 👤 Vérifier l'éligibilité d'un membre

Avant de s'inscrire, un utilisateur peut vérifier s'il remplit les critères :
- ✅ Au moins **10 transactions** on-chain
- ✅ Compte âgé d'au moins **90 jours**

```bash
# GET /api/governance/members/:address/eligibility
curl $BASE_URL/api/governance/members/0x4A5b6C7d8E9f.../eligibility
```

<details>
<summary>Réponse exemple</summary>

```json
{
  "success": true,
  "eligibility": {
    "address": "0x4A5b6C7d8E9f...",
    "isEligible": true,
    "blockchainInfo": {
      "transactionCount": 15,
      "accountAge": 120
    },
    "requirements": {
      "minTransactions": 10,
      "minAccountAge": 90
    },
    "checks": {
      "hasEnoughTransactions": true,
      "isOldEnough": true,
      "isRegistered": false,
      "isActive": false
    },
    "nextSteps": "Enregistrement requis ou critères non remplis"
  }
}
```
</details>

#### ✍️ S'enregistrer comme membre

```bash
# POST /api/governance/members/register
curl -X POST $BASE_URL/api/governance/members/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250700000001",
    "pin": "1234"
  }'
```

#### 📝 Créer une proposition

Le contenu détaillé de la proposition doit être stocké au préalable sur **IPFS** et le CID fourni ici.

```bash
# POST /api/governance/proposals
curl -X POST $BASE_URL/api/governance/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250700000001",
    "pin": "1234",
    "title": "Augmenter le budget de développement",
    "description": "Proposition pour allouer 10% des fonds à R&D",
    "ipfsCID": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "impactLevel": 1
  }'
```

**Niveaux d'impact :**
| Valeur | Texte | Usage |
|---|---|---|
| `0` | Faible | Changements mineurs |
| `1` | Modéré | Changements importants |
| `2` | Fort | Décisions critiques pour la DAO |

#### 📋 Lister les propositions

```bash
# GET /api/governance/proposals
# Paramètres optionnels: ?status=1&impactLevel=1&page=1&limit=10&sortBy=createdAt&sortOrder=desc
curl "$BASE_URL/api/governance/proposals?status=1&page=1&limit=10"
```

**Statuts disponibles :**
| Valeur | Signification |
|---|---|
| `0` | En attente de modération |
| `1` | Actif (en cours de vote) |
| `2` | Adopté |
| `3` | Rejeté |
| `4` | Exécuté |
| `5` | Annulé |

#### 🗳️ Voter sur une proposition

```bash
# POST /api/governance/proposals/:proposalId/vote
curl -X POST $BASE_URL/api/governance/proposals/1/vote \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250700000001",
    "pin": "1234",
    "support": true
  }'
```

| Champ | Valeur | Description |
|---|---|---|
| `support` | `true` | Vote **Pour** |
| `support` | `false` | Vote **Contre** |

#### ⚡ Exécuter une proposition adoptée

```bash
# POST /api/governance/proposals/:proposalId/execute
curl -X POST $BASE_URL/api/governance/proposals/1/execute
```

---

## 🔐 Variables d'environnement

| Variable | Requis | Description |
|---|---|---|
| `PORT` | ❌ | Port du serveur (défaut: `3001`) |
| `NODE_ENV` | ❌ | `development` ou `production` |
| `CELO_RPC_URL` | ✅ | URL du nœud RPC Celo |
| `CELO_CHAIN_ID` | ✅ | Chain ID (`42220`=Mainnet, `11142220`=Sepolia) |
| `TOKEN_CONTRACT_ADDRESS` | ✅ | Adresse du contrat Token BFK |
| `DAO_CONTRACT_ADDRESS` | ✅ | Adresse du contrat DAO |
| `GOVERNANCE_CONTRACT_ADDRESS` | ✅ | Adresse du contrat de gouvernance |
| `GOVERNANCE_DEPLOYMENT_BLOCK` | ✅ | Bloc de déploiement (optimise les scans) |
| `ADMIN_PRIVATE_KEY` | ✅ | Clé privée du wallet administrateur |
| `WALLET_DERIVATION_SECRET` | ✅ | Salt secret PBKDF2 (immuable en prod) |
| `INITIAL_WALLET_FUNDING` | ❌ | CELO envoyé à la création (défaut: `0.01`) |
| `MIN_GAS_BALANCE` | ❌ | Seuil de gas pour l'auto-funding |
| `ALLOWED_ORIGINS` | ❌ | Origines CORS autorisées (prod) |

---

## 🔒 Sécurité

- **Helmet.js** — Headers HTTP sécurisés
- **CORS** — Origines configurables par environnement
- **Nginx** — Rate limiting 100 req/min + protection DDoS
- **User non-root** — Docker exécute sous un compte système dédié
- **PBKDF2 (100 000 itérations)** — Dérivation de clé résistante aux attaques brute-force

> ⚠️ **Points critiques :**
> - `ADMIN_PRIVATE_KEY` : Gardez ce wallet avec un solde **minimal** (juste assez pour le gas)
> - `WALLET_DERIVATION_SECRET` : **Ne changez jamais** cette valeur en production. Un changement rend tous les wallets inaccessibles
> - Configurez `ALLOWED_ORIGINS` en production (ne pas laisser `*`)

---

## 🐛 Dépannage

### L'API ne démarre pas

```bash
# Vérifier les logs Docker
docker-compose logs -f backend

# Vérifier que le fichier .env existe
ls -la .env

# Tester la connexion RPC manuellement
curl https://forno.celo-sepolia.celo-testnet.org \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Erreur "Adresse invalide" lors d'un transfert

Le contrat Token est peut-être mal configuré. Vérifiez dans les logs au démarrage :
```
🚨 RESCUE MODE: Adresse Token invalide détectée...
```
→ Mettez à jour `TOKEN_CONTRACT_ADDRESS` dans `.env`

### Transactions très lentes ou timeout

Le RPC public peut être limité. Solutions :
1. Utilisez un RPC privé (Alchemy, Infura, ou un nœud Celo Auto-hébergé)
2. Augmentez `GOVERNANCE_DEPLOYMENT_BLOCK` pour réduire la plage de scan

### Le health check échoue en Docker

```bash
# Vérifier que le conteneur tourne
docker ps

# Voir les logs des dernières 50 lignes
docker-compose logs --tail=50 backend

# Tester depuis l'intérieur du conteneur
docker exec -it bafoka-dao-backend curl http://localhost:3001/api/health
```

---

## 📄 Licence

MIT — Voir [LICENSE](LICENSE)

## 👥 Équipe

Bafoka DAO Team — Harestech
