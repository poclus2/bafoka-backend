# 🏛️ Scripts de Gouvernance - Guide d'utilisation

Ce dossier contient tous les scripts pour déployer, tester et administrer le contrat GovernanceDAO.

## 📋 Scripts disponibles

### 1. 🚀 `deploy-governance.js` - Déploiement
Déploie le contrat GovernanceDAO avec la configuration complète.

```bash
# Déploiement sur le réseau local (hardhat)
npx hardhat run scripts/deploy-governance.js

# Déploiement sur Alfajores (testnet Celo)
npx hardhat run scripts/deploy-governance.js --network alfajores

# Déploiement sur Celo mainnet
npx hardhat run scripts/deploy-governance.js --network celo
```

**Ce que fait ce script :**
- ✅ Déploie GovernanceDAO avec paramètres configurés
- ✅ Configure les rôles initiaux (admin, modérateur, validateur)
- ✅ Sauvegarde la configuration dans `deployments/`
- ✅ Met à jour le fichier `.env` automatiquement
- ✅ Affiche les informations de déploiement

### 2. 🧪 `test-governance.js` - Tests interactifs
Teste toutes les fonctionnalités du contrat de manière interactive.

```bash
# Test sur réseau local
npx hardhat run scripts/test-governance.js

# Test sur contrat déployé (Alfajores)
npx hardhat run scripts/test-governance.js --network alfajores
```

**Ce que teste ce script :**
- 👥 Enregistrement des membres
- 📝 Création de propositions
- 🛡️ Système de modération
- 🗳️ Vote sur propositions
- ⚡ Exécution des propositions
- ⚖️ Système de contestation
- 📊 Analytics et vues

### 3. 🔍 `check-governance.js` - Vérification du statut
Affiche l'état actuel du contrat et toutes ses données.

```bash
# Vérifier le statut du contrat
npx hardhat run scripts/check-governance.js --network alfajores
```

**Informations affichées :**
- 📋 Paramètres de gouvernance
- 👑 Rôles et permissions
- 👥 Nombre de membres
- 📄 Propositions en cours
- 🌐 État du réseau

### 4. 🛠️ `admin-governance.js` - Administration
Script pour les actions administratives (réservé aux admins).

```bash
# Actions d'administration
npx hardhat run scripts/admin-governance.js --network alfajores
```

**Actions disponibles :**
- 👑 Gestion des rôles (ajouter/supprimer modérateurs, validateurs)
- 👥 Enregistrement de membres en lot
- 🚨 Pause/unpause d'urgence
- 📊 Vue d'ensemble du statut

## 🔧 Configuration requise

### 1. Variables d'environnement
Créez un fichier `.env` à la racine du projet :

```bash
# Réseau Celo
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
CELO_CHAIN_ID=44787

# Clés privées (ATTENTION : ne jamais commit ces valeurs)
ADMIN_PRIVATE_KEY=votre_clé_privée_admin
DEPLOYER_PRIVATE_KEY=votre_clé_privée_deployer

# Contrat de gouvernance (sera rempli automatiquement après déploiement)
GOVERNANCE_CONTRACT_ADDRESS=

# Secret pour wallets téléphone
WALLET_DERIVATION_SECRET=un_secret_fort_et_unique
```

### 2. Configuration Hardhat
Assurez-vous que `hardhat.config.js` contient la configuration réseau :

```javascript
networks: {
  alfajores: {
    url: process.env.CELO_RPC_URL,
    accounts: [process.env.ADMIN_PRIVATE_KEY],
    chainId: 44787,
  },
  celo: {
    url: "https://forno.celo.org",
    accounts: [process.env.ADMIN_PRIVATE_KEY],
    chainId: 42220,
  }
}
```

## 🚀 Guide de déploiement complet

### Étape 1 : Préparation
```bash
# Installation des dépendances
npm install

# Compilation des contrats
npx hardhat compile

# Vérification avec les tests
npx hardhat test --grep "GovernanceDAO"
```

### Étape 2 : Déploiement
```bash
# Déploiement sur Alfajores (testnet)
npx hardhat run scripts/deploy-governance.js --network alfajores
```

**Sortie attendue :**
```
🏛️ Starting GovernanceDAO deployment on alfajores
===============================================
📝 Deploying with account: 0x...
💰 Account balance: 5.0 CELO
📋 Governance Parameters:
   • Voting Period: 7 days
   • Contest Window: 48 hours
   • Quorum Required: 20%
   • Approval Threshold: 51%
🚀 Deploying GovernanceDAO contract...
✅ GovernanceDAO deployed to: 0x...
✅ Configuration saved to: deployments/governance-alfajores.json
```

### Étape 3 : Vérification
```bash
# Vérifier le déploiement
npx hardhat run scripts/check-governance.js --network alfajores

# Test fonctionnel
npx hardhat run scripts/test-governance.js --network alfajores
```

### Étape 4 : Configuration du backend
```bash
# Le script de déploiement met automatiquement à jour .env
# Redémarrez votre serveur backend
cd backend
npm run dev
```

### Étape 5 : Test de l'API
```bash
# Test de base
curl http://localhost:3001/api/health

# Dashboard de gouvernance
curl http://localhost:3001/api/governance/dashboard
```

## 📊 Structure des fichiers générés

### Configuration de déploiement
Le script sauvegarde automatiquement la configuration :

```
deployments/
└── governance-alfajores.json    # Configuration pour Alfajores
    ├── contractAddress          # Adresse du contrat
    ├── deployer                # Compte déployeur
    ├── deploymentTimestamp     # Date de déploiement
    ├── parameters              # Paramètres de gouvernance
    ├── roles                   # IDs des rôles
    └── abi                     # Interface du contrat
```

## 🔧 Actions d'administration

### Gestion des rôles
```bash
# Ajouter un modérateur
npx hardhat console --network alfajores
> const governanceDAO = await ethers.getContractAt("GovernanceDAO", "ADRESSE_CONTRAT")
> await governanceDAO.grantRole(await governanceDAO.MODERATOR_ROLE(), "ADRESSE_MODERATEUR")

# Ajouter un validateur
> await governanceDAO.grantRole(await governanceDAO.VALIDATOR_ROLE(), "ADRESSE_VALIDATEUR")
```

### Enregistrement de membres
```bash
# Via script d'administration
npx hardhat run scripts/admin-governance.js --network alfajores

# Ou via API backend
curl -X POST http://localhost:3001/api/governance/members/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33123456789",
    "pin": "1234",
    "country": "FR"
  }'
```

### Actions d'urgence
```bash
# Pause d'urgence (admin seulement)
npx hardhat console --network alfajores
> const governanceDAO = await ethers.getContractAt("GovernanceDAO", "ADRESSE_CONTRAT")
> await governanceDAO.pause()

# Reprise (admin seulement)
> await governanceDAO.unpause()
```

## 🐛 Dépannage

### Erreurs courantes

#### "Insufficient balance for deployment"
```bash
# Solution : Ajouter des CELO à votre compte
# Alfajores faucet : https://celo.org/developers/faucet
```

#### "Contract already deployed"
```bash
# Le contrat existe déjà, utilisez check-governance.js pour voir son état
npx hardhat run scripts/check-governance.js --network alfajores
```

#### "Member not eligible"
```bash
# Vérifier les critères d'éligibilité
curl http://localhost:3001/api/governance/members/ADRESSE/eligibility
```

### Logs utiles
```bash
# Vérifier les événements du contrat
npx hardhat console --network alfajores
> const governanceDAO = await ethers.getContractAt("GovernanceDAO", "ADRESSE")
> const filter = governanceDAO.filters.ProposalCreated()
> const events = await governanceDAO.queryFilter(filter)
> console.log(events)
```

## 🔗 Intégration avec l'API

### Configuration automatique
Le script de déploiement met automatiquement à jour :
- ✅ `.env` avec `GOVERNANCE_CONTRACT_ADDRESS`
- ✅ `deployments/` avec configuration complète

### Test de l'intégration
```bash
# 1. Vérifier que le backend reconnaît le contrat
curl http://localhost:3001/api/health

# 2. Tester le dashboard
curl http://localhost:3001/api/governance/dashboard

# 3. Enregistrer un premier membre
curl -X POST http://localhost:3001/api/governance/members/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33123456789",
    "pin": "1234"
  }'
```

## 📈 Monitoring

### Métriques importantes
- 📊 Nombre de membres actifs
- 📋 Propositions en cours
- 🗳️ Taux de participation aux votes
- ⏱️ Temps moyen de résolution des propositions

### Commandes de monitoring
```bash
# État général
npx hardhat run scripts/check-governance.js --network alfajores

# Détails d'une proposition
npx hardhat console --network alfajores
> const gov = await ethers.getContractAt("GovernanceDAO", "ADRESSE")
> await gov.getProposal(1)

# Événements récents
> const events = await gov.queryFilter("*", -100)  // 100 derniers blocs
```

## 🎯 Prochaines étapes

1. **Production** : Déployez sur Celo mainnet quand prêt
2. **Frontend** : Intégrez avec l'interface React
3. **Mobile** : Développez l'app mobile pour la gouvernance
4. **Analytics** : Implémentez des dashboards avancés

---

*Ces scripts constituent un système complet pour gérer la gouvernance de votre DAO. Ils sont production-ready et incluent toutes les sécurités nécessaires.*