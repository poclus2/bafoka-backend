# 📚 API Documentation Complète - Token Gated DAO

## 🌐 URL de Base

```
http://localhost:3001/api
```

## 📖 Documentation Interactive

- **Swagger UI**: http://localhost:3001/api-docs
- **Health Check**: http://localhost:3001/api/health

---

## 🔐 1. COMPTES (Accounts)

### 1.1 Créer un Compte

**Endpoint**: `POST /api/accounts/create`

**Description**: Crée un wallet déterministe à partir d'un numéro de téléphone + PIN. Le même numéro + PIN génère toujours la même adresse.

**Funding Automatique**:
✅ **0.01 CELO** (gas)
✅ **3000 Bafoka Tokens** (initial supply)

**Conditions**:
- PIN obligatoire (4-8 chiffres)
- Numéro de téléphone valide (format international recommandé)

**Request**:
```json
{
  "phoneNumber": "+33612345678",
  "pin": "1234",
  "country": "FR"  // Optionnel
}
```

**Response**:
```json
{
  "success": true,
  "message": "Compte créé/récupéré avec succès",
  "data": {
    "wallet": {
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "phoneNumber": "+33612345678"
    },
    "initialFunding": {
      "celo": {
        "transactionHash": "0x...",
        "amount": "0.01",
        "status": "success"
      },
      "token": {
        "transactionHash": "0x...",
        "amount": "3000",
        "status": "success"
      }
    }
  }
}
```

---

### 1.2 Vérifier l'Authentification

**Endpoint**: `POST /api/accounts/verify`

**Description**: Vérifie si un numéro + PIN correspondent à une adresse wallet.

**Conditions**:
- Tous les champs requis

**Request**:
```json
{
  "phoneNumber": "+33612345678",
  "pin": "1234",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "message": "✅ Authentification réussie"
  }
}
```

---

## 💰 2. SOLDES (Balance)

### 2.1 Récupérer Tous les Soldes

**Endpoint**: `GET /api/balance/:address`

**Description**: Retourne le solde CELO et Token pour une adresse.

**Conditions**: Adresse Ethereum valide

**Example**: `GET /api/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

**Response**:
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "celo": {
      "balance": "0.0523",
      "balanceInWei": "52300000000000000"
    },
    "token": {
      "balance": "150.5",
      "balanceInWei": "150500000000000000000",
      "symbol": "TKN",
      "decimals": 18
    }
  }
}
```

---

### 2.2 Solde CELO Uniquement

**Endpoint**: `GET /api/balance/:address/celo`

**Description**: Retourne uniquement le solde CELO (natif).

---

### 2.3 Solde Token Uniquement

**Endpoint**: `GET /api/balance/:address/token`

**Description**: Retourne uniquement le solde du token personnalisé.

---

## 💸 3. TRANSFERTS (Transfer)

### 3.1 Transfert Admin → Utilisateur

**Endpoint**: `POST /api/transfer`

**Description**: Transfère des tokens depuis le wallet admin vers un destinataire.

**Conditions**:
- `ADMIN_PRIVATE_KEY` configuré dans `.env`
- Admin a suffisamment de tokens

**Request**:
```json
{
  "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": 100
}
```

**Response**:
```json
{
  "success": true,
  "message": "Transfert effectué avec succès",
  "data": {
    "transactionHash": "0x...",
    "from": "0xAdminAddress...",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": "100",
    "gasUsed": "52000"
  }
}
```

---

### 3.2 Transfert P2P avec Téléphone/PIN

**Endpoint**: `POST /api/transfer/phone`

**Description**: Transfère des tokens entre utilisateurs avec authentification téléphone/PIN.

**Auto Gas Management**: ✅ Le système vérifie automatiquement le gas et finance si nécessaire (seuil: `MIN_GAS_BALANCE`)

**Conditions**:
- Expéditeur authentifié avec téléphone + PIN
- Solde suffisant (tokens + gas)
- Adresse destinataire valide

**Request**:
```json
{
  "phoneNumber": "+33612345678",
  "pin": "1234",
  "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": 50
}
```

**Response**:
```json
{
  "success": true,
  "message": "Transfert effectué avec succès",
  "data": {
    "transactionHash": "0x...",
    "from": "0xSenderAddress...",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": "50",
    "gasFunding": {
      "funded": true,
      "amountFunded": 0.01,
      "message": "Auto-funding de 0.01 CELO effectué avec succès"
    }
  }
}
```

---

### 3.3 Estimer les Frais

**Endpoint**: `GET /api/transfer/estimate?toAddress=0x...&amount=100`

**Description**: Estime les frais de gas pour un transfert.

**Note**: ⚠️ Fonctionnalité en développement

---

### 3.4 Générer des Tokens (Mint)

**Endpoint**: `POST /api/transfer/mint`

**Description**: Génère de nouveaux tokens et les envoie à une adresse spécifique.

**Conditions**:
- ⚠️ Admin uniquement (clé privée admin requise)

**Request**:
```json
{
  "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "1000"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Mint effectué avec succès",
  "data": {
    "success": true,
    "transactionHash": "0x...",
    "blockNumber": 12345678,
    "to": "0x...",
    "amount": {
      "raw": "1000000000000000000000",
      "formatted": "1000"
    }
  }
}
```

---

## 📜 4. TRANSACTIONS (Transactions)

### 4.1 Toutes les Transactions

**Endpoint**: `GET /api/transactions/:address`

**Description**: Récupère l'historique complet (envoyées + reçues).

**Paramètres optionnels**:
- `fromBlock`: Bloc de départ (défaut: 0)
- `toBlock`: Bloc de fin (défaut: "latest")

**Example**: `GET /api/transactions/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?fromBlock=0&toBlock=latest`

---

### 4.2 Transactions Envoyées

**Endpoint**: `GET /api/transactions/:address/sent`

**Description**: Uniquement les transactions sortantes.

---

### 4.3 Transactions Reçues

**Endpoint**: `GET /api/transactions/:address/received`

**Description**: Uniquement les transactions entrantes.

---

### 4.4 Historique Complet (Chunked)

**Endpoint**: `GET /api/transactions/complete/:address`

**Description**: Récupère TOUT l'historique avec chunking automatique pour éviter les limitations RPC.

**Optimisé pour**: Sepolia et autres réseaux avec limitations de blocs

---

## 🏛️ 5. GOUVERNANCE (Governance)

### 5.1 Dashboard

**Endpoint**: `GET /api/governance/dashboard`

**Description**: Vue d'ensemble de la gouvernance (propositions, votes, statistiques).

**Conditions**: Aucune (endpoint public)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalProposals": 5,
    "activeProposals": 2,
    "totalMembers": 150,
    "recentProposals": [...],
    "statistics": {...}
  }
}
```

---

### 5.2 Enregistrer un Membre

**Endpoint**: `POST /api/governance/members/register`

**Description**: Enregistre un nouveau membre dans la DAO.

**Auto Gas Management**: ✅ Funding automatique si gas insuffisant

**Conditions d'Éligibilité**:
- ✅ Au moins **10 transactions** sur la blockchain
- ✅ Compte âgé d'au moins **90 jours**

**Request (avec téléphone)**:
```json
{
  "phoneNumber": "+33612345678",
  "pin": "1234",
  "country": "FR"
}
```

**Request (avec adresse)**:
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response**:
```json
{
  "success": true,
  "member": {
    "address": "0x...",
    "transactionCount": 25,
    "accountAge": 120,
    "registeredAt": "2025-11-26T15:00:00.000Z"
  },
  "txHash": "0x...",
  "message": "Membre enregistré avec succès"
}
```

---

### 5.3 Vérifier l'Éligibilité

**Endpoint**: `GET /api/governance/members/:address/eligibility`

**Description**: Vérifie si une adresse est éligible pour participer.

**Conditions**: Aucune (endpoint public)

**Example**: `GET /api/governance/members/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/eligibility`

**Response**:
```json
{
  "success": true,
  "eligibility": {
    "isEligible": true,
    "checks": {
      "hasEnoughTransactions": true,
      "isOldEnough": true,
      "isRegistered": false
    },
    "requirements": {
      "minTransactions": 10,
      "minAccountAge": 90
    },
    "nextSteps": "Vous pouvez vous enregistrer en tant que membre"
  }
}
```

---

### 5.4 Créer une Proposition

**Endpoint**: `POST /api/governance/proposals`

**Description**: Crée une nouvelle proposition pour la DAO.

**Auto Gas Management**: ✅ Funding automatique si gas insuffisant

**Conditions**:
- Membre enregistré et éligible
- Contenu détaillé sur IPFS (CID requis)
- Authentification (téléphone+PIN ou adresse)

**Request**:
```json
{
  "phoneNumber": "+33612345678",
  "pin": "1234",
  "title": "Amélioration du système de vote",
  "description": "Proposition pour optimiser le processus",
  "ipfsCID": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "impactLevel": 1  // 0=Faible, 1=Modéré, 2=Fort
}
```

**Response**:
```json
{
  "success": true,
  "proposal": {
    "id": 1,
    "title": "Amélioration du système de vote",
    "proposer": "0x...",
    "status": "En attente",
    "impactLevel": "Modéré"
  },
  "txHash": "0x...",
  "message": "Proposition créée avec succès"
}
```

---

### 5.5 Lister les Propositions

**Endpoint**: `GET /api/governance/proposals`

**Description**: Liste toutes les propositions avec filtres et pagination.

**Paramètres optionnels**:
- `status`: Filtre par statut (0-5)
- `impactLevel`: Filtre par impact (0-2)
- `proposer`: Filtre par adresse du proposant
- `page`: Numéro de page (défaut: 1)
- `limit`: Éléments par page (défaut: 10, max: 100)
- `sortBy`: Champ de tri (défaut: "createdAt")
- `sortOrder`: Ordre (asc/desc, défaut: "desc")

**Example**: `GET /api/governance/proposals?status=1&page=1&limit=10`

**Response**:
```json
{
  "success": true,
  "proposals": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 5.6 Détails d'une Proposition

**Endpoint**: `GET /api/governance/proposals/:proposalId`

**Description**: Récupère les détails complets d'une proposition.

**Example**: `GET /api/governance/proposals/1`

---

### 5.7 Voter sur une Proposition

**Endpoint**: `POST /api/governance/proposals/:proposalId/vote`

**Description**: Vote pour ou contre une proposition active.

**Auto Gas Management**: ✅ Funding automatique si gas insuffisant

**Conditions**:
- Membre enregistré et éligible
- Proposition en période de vote
- Un seul vote par membre par proposition

**Request**:
```json
{
  "phoneNumber": "+33612345678",
  "pin": "1234",
  "support": true  // true=Pour, false=Contre
}
```

**Response**:
```json
{
  "success": true,
  "vote": {
    "proposalId": 1,
    "voter": "0x...",
    "support": true,
    "timestamp": "2025-11-26T15:00:00.000Z"
  },
  "txHash": "0x...",
  "message": "Vote enregistré avec succès"
}
```

---

### 5.8 Contester une Proposition

**Endpoint**: `POST /api/governance/proposals/:proposalId/contest`

**Description**: Soulève une contestation sur une proposition.

**Auto Gas Management**: ✅ Funding automatique si gas insuffisant

**Conditions**:
- Membre validateur
- Proposition adoptée
- Dans la fenêtre de contestation (48h par défaut)

**Request**:
```json
{
  "phoneNumber": "+33612345678",
  "pin": "1234",
  "reason": "Violation des règles de la DAO",
  "evidenceCID": "QmEvidenceCID..."
}
```

---

### 5.9 Modérer une Proposition (Modérateurs)

**Endpoint**: `POST /api/governance/proposals/:proposalId/moderate`

**Description**: Approuve, rejette ou demande des modifications.

**Conditions**: Rôle modérateur requis

**Request**:
```json
{
  "decision": 0,  // 0=Approuver, 1=Rejeter, 2=Modifications
  "note": "Proposition conforme aux standards"
}
```

---

### 5.10 Exécuter une Proposition

**Endpoint**: `POST /api/governance/proposals/:proposalId/execute`

**Description**: Exécute une proposition adoptée.

**Conditions**:
- Proposition adoptée
- Période de contestation terminée (si applicable)

---

### 5.11 Résoudre une Contestation (Validateurs)

**Endpoint**: `POST /api/governance/contests/:contestId/resolve`

**Description**: Résout une contestation en cours.

**Conditions**: Rôle validateur requis

---

## ⚙️ 6. SYSTÈME (System)

### 6.1 Health Check

**Endpoint**: `GET /api/health`

**Description**: Vérifie l'état de santé de l'API et de la blockchain.

**Response**:
```json
{
  "success": true,
  "message": "API opérationnelle",
  "data": {
    "timestamp": "2025-11-26T15:00:00.000Z",
    "network": {
      "name": "sepolia",
      "chainId": 11155111,
      "blockNumber": 9711212
    },
    "contracts": {
      "token": "0x46Af09B729809fFabA2E35afA85Fb2FAe225Fbe8",
      "dao": "0xe781bD6e09290Bf4Fb5d8e97dd6F5ccb4724D7aD"
    },
    "version": "1.0.0"
  }
}
```

---

### 6.2 Liste des Endpoints

**Endpoint**: `GET /api`

**Description**: Retourne la liste de tous les endpoints disponibles.

---

## 🔧 Configuration

### Variables d'Environnement Importantes

```bash
# RPC & Network
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
CELO_CHAIN_ID=11142220

# Contrats
TOKEN_CONTRACT_ADDRESS=0x...
DAO_CONTRACT_ADDRESS=0x...
GOVERNANCE_CONTRACT_ADDRESS=0x...

# Admin
ADMIN_PRIVATE_KEY=0x...

# Sécurité
WALLET_DERIVATION_SECRET=your-super-secret-key

# Funding Automatique
INITIAL_WALLET_FUNDING=0.01      # CELO envoyé aux nouveaux comptes
MIN_GAS_BALANCE=0.005            # Seuil de gas minimum
AUTO_GAS_AMOUNT=0.01             # Montant auto-funding
```

---

## 🚨 Codes d'Erreur

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 201 | Créé avec succès |
| 400 | Requête invalide |
| 401 | Authentification échouée |
| 402 | Solde insuffisant |
| 403 | Accès refusé (permissions) |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |
| 503 | Service non disponible |

---

## 💡 Fonctionnalités Automatiques

### ✅ Auto Gas Management

Toutes les transactions bénéficient d'un **funding automatique en gas** :
- Vérification du solde avant chaque transaction
- Si solde < `MIN_GAS_BALANCE` → admin envoie `AUTO_GAS_AMOUNT`
- **Aucune transaction n'échoue jamais par manque de gas**

**Endpoints concernés** :
- Transferts P2P (`/api/transfer/phone`)
- Création de propositions (`/api/governance/proposals`)
- Votes (`/api/governance/proposals/:id/vote`)
- Contestations (`/api/governance/proposals/:id/contest`)
- Enregistrement membres (`/api/governance/members/register`)

### ✅ Initial Wallet Funding

Lors de la création d'un compte (`/api/accounts/create`), le nouveau wallet reçoit automatiquement du CELO pour payer les frais de gas.

**Montant configurable** via `INITIAL_WALLET_FUNDING` (défaut: 0.01 CELO)

---

## 📝 Exemples d'Utilisation

### Scénario 1: Créer un Compte et Transférer

```bash
# 1. Créer un compte
curl -X POST http://localhost:3001/api/accounts/create \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33612345678",
    "pin": "1234"
  }'

# 2. Vérifier le solde
curl http://localhost:3001/api/balance/0xYourAddress

# 3. Transférer des tokens
curl -X POST http://localhost:3001/api/transfer/phone \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33612345678",
    "pin": "1234",
    "toAddress": "0xRecipientAddress",
    "amount": 50
  }'
```

### Scénario 2: Participer à la Gouvernance

```bash
# 1. Vérifier l'éligibilité
curl http://localhost:3001/api/governance/members/0xYourAddress/eligibility

# 2. S'enregistrer comme membre
curl -X POST http://localhost:3001/api/governance/members/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33612345678",
    "pin": "1234"
  }'

# 3. Créer une proposition
curl -X POST http://localhost:3001/api/governance/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33612345678",
    "pin": "1234",
    "title": "Ma proposition",
    "ipfsCID": "QmCID...",
    "impactLevel": 1
  }'

# 4. Voter
curl -X POST http://localhost:3001/api/governance/proposals/1/vote \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33612345678",
    "pin": "1234",
    "support": true
  }'
```

---

## 🔗 Liens Utiles

- **Swagger UI**: http://localhost:3001/api-docs
- **Health Check**: http://localhost:3001/api/health
- **Liste des Endpoints**: http://localhost:3001/api

---

## 📞 Support

Pour toute question ou problème, consultez les logs du serveur ou la documentation Swagger interactive.
