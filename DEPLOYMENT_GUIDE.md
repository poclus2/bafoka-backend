# 🚀 Guide de Déploiement Complet - Smart Contracts

## 📍 Localisation des Scripts

Tous les scripts de déploiement se trouvent dans :
```
backend/hardhat/scripts/
```

## 🗺️ Script de Déploiement Unique

Il n'y a désormais qu'**UN SEUL SCRIPT** pour tout faire.

| Script | Ce qu'il fait | Quand l'utiliser ? |
|--------|---------------|-------------------|
| `deploy-complete.js` | Déploie **TOUT** (Token + DAO + Gouvernance) | Pour toute installation ou réinstallation |

**Commande Unique :**
```bash
npx hardhat run scripts/deploy-complete.js --network sepolia
```

Ce script va automatiquement :
1. Déployer le Token
2. Déployer le DAO
3. Déployer la Gouvernance
4. Configurer les rôles Admin/Moderator/Validator
5. Mettre à jour `deployments.json`
6. Mettre à jour vos fichiers `.env`

---

## 📋 Détails du Script

---

## 🔧 Configuration Requise

### 1. Fichier `.env`

Créez/vérifiez votre fichier `.env` :

```bash
# RPC URLs
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org

# Private Key (SANS le préfixe 0x)
ADMIN_PRIVATE_KEY=votre_cle_privee_sans_0x

# Chain ID
CELO_CHAIN_ID=11142220  # Celo Sepolia

# Wallet Derivation Secret
WALLET_DERIVATION_SECRET=your-super-secret-key

# Funding automatique
INITIAL_WALLET_FUNDING=0.01
MIN_GAS_BALANCE=0.005
AUTO_GAS_AMOUNT=0.01
```

### 2. Hardhat Config

Le fichier `hardhat.config.js` doit contenir :

```javascript
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.CELO_RPC_URL,
      accounts: [process.env.ADMIN_PRIVATE_KEY],
      chainId: 11155111
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};
```

---

## 📝 Procédure de Déploiement Complète

### Étape 1: Préparer l'Environnement

```bash
# Se placer dans le dossier backend
cd backend

# Installer les dépendances si nécessaire
npm install

# Vérifier la configuration
cat .env
```

### Étape 2: Vérifier le Solde du Wallet

```bash
# Vérifier le solde CELO
npx hardhat run scripts/check-celo-balance.js --network sepolia
```

**Minimum requis**: 0.1 CELO pour les frais de gas

### Étape 3: Déployer les Contrats

#### Option A: Déploiement Complet (Recommandé)

```bash
# 1. Déployer Token + DAO
npx hardhat run scripts/deploy-all.js --network sepolia

# 2. Déployer Governance
npx hardhat run scripts/deploy-governance.js --network sepolia
```

#### Option B: Déploiement Individuel

```bash
# Seulement le Token et DAO
npx hardhat run scripts/deploy-all.js --network sepolia

# OU seulement la Governance
npx hardhat run scripts/deploy-governance.js --network sepolia
```

### Étape 4: Vérifier le Déploiement

```bash
# Vérifier les contrats sur la blockchain
node test-blockchain.js
```

### Étape 5: Redémarrer le Backend

```bash
# Le backend charge automatiquement les nouvelles adresses depuis deployments.json
npm run dev
```

---

## 📦 Fichier deployments.json

Après le déploiement, `deployments.json` est automatiquement mis à jour :

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "lastUpdate": "2025-11-26T15:00:00.000Z",
  "contracts": {
    "Token": {
      "address": "0x46Af09B729809fFabA2E35afA85Fb2FAe225Fbe8",
      "deploymentBlock": 9711000,
      "deploymentTimestamp": 1732633200,
      "transactionHash": "0x...",
      "deployer": "0x489D5434264807a6255d71A35F7f9E8e3abdF1cb",
      "gasUsed": "1234567"
    },
    "TokenGatedDao": {
      "address": "0xe781bD6e09290Bf4Fb5d8e97dd6F5ccb4724D7aD",
      "deploymentBlock": 9711001,
      "tokenAddress": "0x46Af09B729809fFabA2E35afA85Fb2FAe225Fbe8"
    },
    "GovernanceDAO": {
      "address": "0x27b58Bd8c4028a7504F666A954721B8547a6b09a",
      "deploymentBlock": 9711002
    }
  }
}
```

---

## 🔍 Vérification Post-Déploiement

### 1. Vérifier les Adresses

```bash
# Afficher deployments.json
cat deployments.json
```

### 2. Tester les Contrats

```bash
# Script de test complet
node test-blockchain.js
```

**Résultat attendu**:
```
✅ Tests réussis: 9+
✅ Token - Métadonnées
✅ Token - Total Supply
✅ Governance - Paramètres
✅ Governance - Rôles Admin
```

### 3. Vérifier via l'API

```bash
# Health check
curl http://localhost:3001/api/health

# Dashboard governance
curl http://localhost:3001/api/governance/dashboard
```

---

## 🌐 Réseaux Supportés

### Sepolia Testnet (Recommandé pour tests)

```bash
npx hardhat run scripts/deploy-all.js --network sepolia
```

**Configuration**:
- RPC: `https://sepolia.infura.io/v3/YOUR_KEY`
- Chain ID: 11155111
- Faucet: https://sepoliafaucet.com/

### Celo Mainnet

```bash
npx hardhat run scripts/deploy-all.js --network celo
```

**Configuration**:
- RPC: `https://forno.celo.org`
- Chain ID: 42220

### Localhost (Développement)

```bash
# Terminal 1: Démarrer un nœud local
npx hardhat node

# Terminal 2: Déployer
npx hardhat run scripts/deploy-all.js --network localhost
```

---

## ⚠️ Erreurs Courantes

### 1. "Insufficient funds"

**Problème**: Pas assez de CELO pour les frais de gas

**Solution**:
```bash
# Vérifier le solde
npx hardhat run scripts/check-celo-balance.js --network sepolia

# Obtenir du CELO testnet
# Visitez: https://sepoliafaucet.com/
```

### 2. "Invalid private key"

**Problème**: Clé privée mal formatée dans `.env`

**Solution**:
```bash
# La clé doit être SANS le préfixe 0x
ADMIN_PRIVATE_KEY=abc123...  # ✅ Correct
ADMIN_PRIVATE_KEY=0xabc123...  # ❌ Incorrect
```

### 3. "Network not found"

**Problème**: Réseau non configuré dans `hardhat.config.js`

**Solution**: Vérifiez que le réseau est défini dans la configuration

### 4. "Contract already deployed"

**Problème**: Tentative de redéploiement

**Solution**: C'est normal ! Chaque déploiement crée de nouvelles instances. Les anciennes adresses restent valides.

---

## 🔄 Redéploiement

Pour redéployer les contrats :

```bash
# 1. Déployer de nouvelles instances
npx hardhat run scripts/deploy-all.js --network sepolia

# 2. deployments.json est automatiquement mis à jour

# 3. Redémarrer le backend
npm run dev
```

**Note**: Les anciennes adresses de contrats restent sur la blockchain mais ne seront plus utilisées par l'application.

---

## 📊 Coûts de Déploiement

### Estimation des Gas (Sepolia)

| Contrat | Gas Estimé | Coût (~20 gwei) |
|---------|------------|-----------------|
| Token | ~1,200,000 | ~0.024 ETH |
| TokenGatedDao | ~800,000 | ~0.016 ETH |
| GovernanceDAO | ~2,500,000 | ~0.050 ETH |
| **Total** | **~4,500,000** | **~0.09 ETH** |

**Recommandation**: Avoir au moins **0.1 CELO** pour le déploiement complet

---

## 🛠️ Scripts Utilitaires

### Vérifier la Balance

```bash
npx hardhat run scripts/check-balance.js --network sepolia
```

### Vérifier la Gouvernance

```bash
npx hardhat run scripts/check-governance.js --network sepolia
```

### Transférer des Tokens

```bash
npx hardhat run scripts/transfer-tokens.js --network sepolia
```

---

## 📝 Checklist de Déploiement

- [ ] `.env` configuré avec RPC_URL et PRIVATE_KEY
- [ ] Wallet a suffisamment de CELO (min 0.1)
- [ ] `hardhat.config.js` configuré pour le réseau cible
- [ ] Dépendances installées (`npm install`)
- [ ] Déploiement Token + DAO (`deploy-all.js`)
- [ ] Déploiement Governance (`deploy-governance.js`)
- [ ] `deployments.json` mis à jour
- [ ] Tests blockchain passent (`test-blockchain.js`)
- [ ] Backend redémarré (`npm run dev`)
- [ ] API Health check OK

---

## 🔗 Fichiers Importants

- [`deploy-all.js`](file:///home/toor/Project/FreeLance/TokenGatedDao/backend/hardhat/scripts/deploy-all.js) - Déploiement Token + DAO
- [`deploy-governance.js`](file:///home/toor/Project/FreeLance/TokenGatedDao/backend/hardhat/scripts/deploy-governance.js) - Déploiement Governance
- [`deployments.json`](file:///home/toor/Project/FreeLance/TokenGatedDao/backend/deployments.json) - Adresses déployées
- [`test-blockchain.js`](file:///home/toor/Project/FreeLance/TokenGatedDao/backend/test-blockchain.js) - Tests
- [`.env`](file:///home/toor/Project/FreeLance/TokenGatedDao/backend/.env) - Configuration

---

## 💡 Bonnes Pratiques

1. **Toujours tester sur testnet** avant mainnet
2. **Sauvegarder** les adresses de contrats
3. **Vérifier** les contrats après déploiement
4. **Documenter** les paramètres de gouvernance
5. **Tester** l'API après chaque déploiement

---

**Dernière mise à jour**: 2025-11-26
