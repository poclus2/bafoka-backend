# Token Gated DAO - Backend API

Backend Node.js pour la gestion des tokens et transactions sur le réseau Celo.

## 🚀 Fonctionnalités

- ✅ **Création de compte** : Génération de nouveaux wallets avec clé privée et phrase mnémonique
- 💰 **Récupération du solde** : Consultation du solde CELO et du token natif de la plateforme
- 📋 **Liste des transactions** : Historique complet des transactions du token pour une adresse
- 💸 **Transfert de tokens** : Envoi de tokens depuis le compte administrateur

## 📁 Structure du projet

```
backend/
├── src/
│   ├── config/
│   │   └── config.js              # Configuration centralisée
│   ├── contracts/
│   │   └── abis.js                # ABIs des smart contracts
│   ├── controllers/
│   │   ├── account.controller.js  # Gestion des comptes
│   │   ├── balance.controller.js  # Consultation des soldes
│   │   ├── transaction.controller.js # Historique des transactions
│   │   └── transfer.controller.js # Transferts de tokens
│   ├── services/
│   │   ├── account.service.js     # Logique métier des comptes
│   │   └── blockchain.service.js  # Interactions blockchain
│   ├── routes/
│   │   ├── account.routes.js      # Routes des comptes
│   │   ├── balance.routes.js      # Routes des soldes
│   │   ├── transaction.routes.js  # Routes des transactions
│   │   ├── transfer.routes.js     # Routes des transferts
│   │   └── index.js               # Routeur principal
│   ├── middleware/
│   │   ├── errorHandler.js        # Gestion des erreurs
│   │   └── logger.js              # Logging des requêtes
│   ├── app.js                     # Configuration Express
│   └── server.js                  # Point d'entrée
├── .env.example                   # Template des variables d'environnement
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Installation

### Prérequis

- Node.js >= 18
- npm ou yarn

### Installation des dépendances

```bash
cd backend
npm install
```

### Configuration

1. Créez un fichier `.env` à partir de `.env.example` :

```bash
cp .env.example .env
```

2. Modifiez les variables d'environnement dans `.env` :

```env
# Configuration du serveur
PORT=3001
NODE_ENV=development

# Configuration Celo
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
CELO_CHAIN_ID=44787

# Adresses des contrats déployés
TOKEN_CONTRACT_ADDRESS=0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC
DAO_CONTRACT_ADDRESS=0xF57e75a597B85239F1125c30f6F5ec4896D66A68

# Clé privée du compte administrateur (pour les transferts)
ADMIN_PRIVATE_KEY=votre_cle_privee_ici
```

⚠️ **Important** : Ne commitez jamais votre fichier `.env` !

## 🚀 Démarrage

### Mode développement (avec rechargement automatique)

```bash
npm run dev
```

### Mode production

```bash
npm start
```

Le serveur démarre sur `http://localhost:3001`

## � Documentation interactive (Swagger)

Une documentation interactive complète est disponible via Swagger UI :

**URL** : `http://localhost:3001/api-docs`

La documentation Swagger vous permet de :
- ✅ Voir tous les endpoints avec leurs paramètres
- ✅ Tester directement les endpoints depuis votre navigateur
- ✅ Consulter les schémas de requêtes et réponses
- ✅ Télécharger la spécification OpenAPI (JSON) : `http://localhost:3001/api-docs.json`

### Captures d'écran

Swagger UI offre une interface moderne avec :
- 🎯 Liste organisée des endpoints par catégorie
- 📝 Descriptions détaillées de chaque endpoint
- 🧪 Bouton "Try it out" pour tester en direct
- 📋 Exemples de requêtes et réponses
- 📊 Schémas de données interactifs

## �📡 API Endpoints

### 🏥 Health Check

**GET** `/api/health`

Vérifie l'état de santé de l'API et la connexion blockchain.

```bash
curl http://localhost:3001/api/health
```

### 👤 Comptes

#### Créer un nouveau compte

**POST** `/api/accounts/create`

Génère un nouveau wallet avec clé privée et phrase mnémonique.

```bash
curl -X POST http://localhost:3001/api/accounts/create
```

**Réponse** :
```json
{
  "success": true,
  "message": "Compte créé avec succès",
  "data": {
    "success": true,
    "account": {
      "address": "0x...",
      "privateKey": "0x...",
      "mnemonic": "word1 word2 word3 ..."
    },
    "warning": "⚠️ IMPORTANT: Sauvegardez votre clé privée..."
  }
}
```

#### Importer depuis une clé privée

**POST** `/api/accounts/import/privatekey`

```bash
curl -X POST http://localhost:3001/api/accounts/import/privatekey \
  -H "Content-Type: application/json" \
  -d '{"privateKey": "0x..."}'
```

#### Importer depuis une phrase mnémonique

**POST** `/api/accounts/import/mnemonic`

```bash
curl -X POST http://localhost:3001/api/accounts/import/mnemonic \
  -H "Content-Type: application/json" \
  -d '{"mnemonic": "word1 word2 word3 ..."}'
```

#### Valider une adresse

**GET** `/api/accounts/validate/:address`

```bash
curl http://localhost:3001/api/accounts/validate/0x...
```

### 💰 Soldes

#### Récupérer tous les soldes (CELO + Token)

**GET** `/api/balance/:address`

```bash
curl http://localhost:3001/api/balance/0x...
```

**Réponse** :
```json
{
  "success": true,
  "message": "Soldes récupérés avec succès",
  "data": {
    "address": "0x...",
    "celo": {
      "raw": "1000000000000000000",
      "formatted": "1.0",
      "symbol": "CELO"
    },
    "token": {
      "raw": "5000000000000000000000",
      "formatted": "5000.0",
      "symbol": "MT",
      "name": "MyToken",
      "decimals": 18,
      "contractAddress": "0x..."
    }
  }
}
```

#### Récupérer uniquement le solde CELO

**GET** `/api/balance/:address/celo`

```bash
curl http://localhost:3001/api/balance/0x.../celo
```

#### Récupérer uniquement le solde Token

**GET** `/api/balance/:address/token`

```bash
curl http://localhost:3001/api/balance/0x.../token
```

### 📋 Transactions

#### Récupérer toutes les transactions

**GET** `/api/transactions/:address`

Query params optionnels :
- `fromBlock` : Bloc de départ (défaut: 0)
- `toBlock` : Bloc de fin (défaut: "latest")

```bash
curl http://localhost:3001/api/transactions/0x...
```

**Réponse** :
```json
{
  "success": true,
  "message": "Transactions récupérées avec succès",
  "data": {
    "address": "0x...",
    "contractAddress": "0x...",
    "totalTransactions": 10,
    "transactions": [
      {
        "hash": "0x...",
        "blockNumber": 12345678,
        "timestamp": 1234567890,
        "from": "0x...",
        "to": "0x...",
        "value": {
          "raw": "1000000000000000000",
          "formatted": "1.0"
        },
        "type": "sent"
      }
    ]
  }
}
```

#### Récupérer uniquement les transactions envoyées

**GET** `/api/transactions/:address/sent`

```bash
curl http://localhost:3001/api/transactions/0x.../sent
```

#### Récupérer uniquement les transactions reçues

**GET** `/api/transactions/:address/received`

```bash
curl http://localhost:3001/api/transactions/0x.../received
```

### 💸 Transferts

#### Transférer des tokens

**POST** `/api/transfer`

⚠️ Nécessite la configuration de `ADMIN_PRIVATE_KEY` dans `.env`

```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "toAddress": "0x...",
    "amount": 100
  }'
```

**Réponse** :
```json
{
  "success": true,
  "message": "Transfert effectué avec succès",
  "data": {
    "success": true,
    "transactionHash": "0x...",
    "blockNumber": 12345678,
    "from": "0x...",
    "to": "0x...",
    "amount": {
      "raw": "100000000000000000000",
      "formatted": "100"
    },
    "gasUsed": "52000"
  }
}
```

#### Estimer les frais d'un transfert

**GET** `/api/transfer/estimate`

Query params :
- `toAddress` : Adresse de destination
- `amount` : Montant à transférer

```bash
curl "http://localhost:3001/api/transfer/estimate?toAddress=0x...&amount=100"
```

## 🔒 Sécurité

- ✅ Helmet.js pour les headers de sécurité
- ✅ CORS configuré
- ✅ Validation des entrées
- ✅ Gestion des erreurs centralisée
- ⚠️ **Important** : Ne partagez JAMAIS votre `ADMIN_PRIVATE_KEY`
- ⚠️ Utilisez des variables d'environnement pour les données sensibles

## 🧪 Tests

Pour tester rapidement l'API, vous pouvez utiliser :

```bash
# Test de santé
curl http://localhost:3001/api/health

# Création d'un compte
curl -X POST http://localhost:3001/api/accounts/create

# Récupération des soldes (remplacez par une vraie adresse)
curl http://localhost:3001/api/balance/0xYourAddressHere
```

## 📝 Logs

Les logs sont affichés dans la console en mode développement :

```
🔗 Connexion au réseau Celo...
✅ Connecté au réseau: alfajores
📊 Chain ID: 44787
🔢 Bloc actuel: 12345678

📜 Contrats configurés:
   Token: 0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC
   DAO: 0xF57e75a597B85239F1125c30f6F5ec4896D66A68

🚀 Serveur démarré avec succès!
📡 API disponible sur: http://localhost:3001
📖 Documentation: http://localhost:3001/api
```

## 🐛 Debugging

Si vous rencontrez des problèmes :

1. Vérifiez que le RPC Celo est accessible
2. Vérifiez que les adresses de contrats sont correctes
3. Consultez les logs du serveur
4. Testez avec le endpoint `/api/health`

## 🌐 Réseaux Supportés

Le projet supporte maintenant plusieurs réseaux blockchain :

### Celo (Production et Test)
- **Celo Mainnet** : Production
- **Alfajores** : Testnet Celo (actuellement avec problèmes de gas price)

### Ethereum
- **Sepolia** : ✅ **Testnet Ethereum (Recommandé)**
  - Chain ID : 11155111
  - RPC : https://sepolia.drpc.org
  - Explorer : https://sepolia.etherscan.io/
  - Status : **Opérationnel** ✅

### Configuration des réseaux

Voir les fichiers de documentation :
- 📖 [Configuration Sepolia](./SEPOLIA_CONFIGURATION.md)
- 🚀 [Guide de Déploiement Sepolia](./SEPOLIA_DEPLOYMENT_GUIDE.md)

```bash
# Déployer sur Sepolia (Ethereum testnet)
npx hardhat run scripts/deploy-governance.js --network sepolia

# Déployer sur Alfajores (Celo testnet)
npx hardhat run scripts/deploy-governance.js --network alfajores

# Tester la connexion aux réseaux
npx hardhat run scripts/test-networks.js --network sepolia
```

## 🚧 TODO / Améliorations futures

- [ ] Ajouter l'authentification JWT
- [ ] Implémenter un système de cache (Redis)
- [ ] Ajouter des endpoints pour la DAO
- [ ] Implémenter l'estimation précise des frais de gas
- [ ] Ajouter des tests unitaires et d'intégration
- [ ] Dockeriser l'application
- [ ] Ajouter la pagination pour les transactions
- [ ] Implémenter des webhooks pour les événements blockchain

## 📄 Licence

MIT

## 👥 Support

Pour toute question ou problème, consultez la documentation ou ouvrez une issue.
