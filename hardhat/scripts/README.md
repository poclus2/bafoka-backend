# 📚 Guide Complet des Scripts Hardhat

Ce guide contient tous les scripts disponibles pour gérer votre projet TokenGatedDao sur Celo.

## 📋 Table des Matières

- [Scripts de Transfert de Tokens MT](#-scripts-de-transfert-de-tokens-mt)
- [Scripts de Transfert de CELO](#-scripts-de-transfert-de-celo)
- [Scripts de Déploiement](#-scripts-de-déploiement)
- [Scripts de Vérification](#-scripts-de-vérification)

---

## 🪙 Scripts de Transfert de Tokens MT

Les tokens MT (MyToken) sont des tokens ERC20 requis pour rejoindre la DAO (minimum 100 MT).

### 1. `transfer-tokens.js` - Transfert Simple de Tokens

Transfère des tokens MT d'une adresse à une autre.

**📝 Configuration :**
```javascript
const TOKEN_ADDRESS = "0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC"; // Adresse du contrat MT
const RECIPIENT_ADDRESS = "0xVotreAdresse..."; // Changez ceci
const AMOUNT = "100"; // Montant en MT (sans décimales)
```

**▶️ Utilisation :**
```bash
# Sur Alfajores (testnet)
npx hardhat run scripts/transfer-tokens.js --network alfajores

# Sur Celo Mainnet
npx hardhat run scripts/transfer-tokens.js --network celo
```

**💡 Cas d'usage :** Donner 100 MT à un utilisateur pour qu'il puisse rejoindre la DAO.

---

### 2. `transfer-tokens-batch.js` - Transfert en Batch de Tokens

Transfère des tokens MT à plusieurs destinataires en une seule exécution.

**📝 Configuration :**
```javascript
const RECIPIENTS = [
  { address: "0xAdresse1...", amount: "100" },
  { address: "0xAdresse2...", amount: "100" },
  { address: "0xAdresse3...", amount: "200" },
  // Ajoutez autant d'adresses que nécessaire...
];
```

**▶️ Utilisation :**
```bash
npx hardhat run scripts/transfer-tokens-batch.js --network alfajores
```

**💡 Cas d'usage :** Distribuer des tokens MT à une équipe ou une communauté.

---

### 3. `check-balance.js` - Vérifier les Soldes de Tokens

Vérifie les soldes de tokens MT de plusieurs adresses.

**📝 Configuration :**
```javascript
const ADDRESSES = [
  "0xVotreWallet...",
  "0xAutreWallet...",
  // Ajoutez d'autres adresses...
];
```

**▶️ Utilisation :**
```bash
npx hardhat run scripts/check-balance.js --network alfajores
```

**💡 Cas d'usage :** Vérifier qui a assez de tokens pour rejoindre la DAO.

---

## 💰 Scripts de Transfert de CELO

CELO est la cryptomonnaie native utilisée pour payer les frais de gas.

### 1. `transfer-celo.js` - Transfert Simple de CELO

Transfère des CELO d'une adresse à une autre.

**📝 Configuration :**
```javascript
const CONFIG = {
  RECIPIENT_ADDRESS: "0xVotreAdresse...",
  AMOUNT_IN_CELO: "1.0", // Montant en CELO (avec décimales)
};
```

**▶️ Utilisation :**
```bash
npx hardhat run scripts/transfer-celo.js --network alfajores
```

**💡 Cas d'usage :** Financer un compte avec du CELO pour les frais de gas.

---

### 2. `transfer-celo-batch.js` - Transfert en Batch de CELO

Transfère des CELO à plusieurs destinataires.

**📝 Configuration :**
```javascript
const RECIPIENTS = [
  { address: "0xAdresse1...", amount: "0.5" },
  { address: "0xAdresse2...", amount: "1.0" },
  { address: "0xAdresse3...", amount: "0.25" },
  // Ajoutez d'autres destinataires...
];
```

**▶️ Utilisation :**
```bash
npx hardhat run scripts/transfer-celo-batch.js --network alfajores
```

**💡 Cas d'usage :** Financer plusieurs comptes de test.

---

### 3. `check-celo-balance.js` - Vérifier les Soldes CELO

Vérifie les soldes CELO de plusieurs adresses.

**📝 Configuration :**
```javascript
const ADDRESSES = [
  "0xVotreWallet...",
  "0xAutreWallet...",
  // Ajoutez d'autres adresses...
];
```

**▶️ Utilisation :**
```bash
npx hardhat run scripts/check-celo-balance.js --network alfajores
```

**💡 Cas d'usage :** Vérifier qui a besoin de plus de CELO pour les frais de gas.

---

## 🚀 Scripts de Déploiement

### 1. `deploy.js` - Déployer les Contrats

Déploie les contrats Token et TokenGatedDao sur le réseau.

**▶️ Utilisation :**
```bash
# Sur Alfajores (testnet)
npx hardhat run scripts/deploy.js --network alfajores

# Sur Celo Mainnet
npx hardhat run scripts/deploy.js --network celo
```

**📊 Informations affichées :**
- Adresse du contrat Token
- Adresse du contrat TokenGatedDao
- Gas utilisé
- Frais de déploiement

---

## 🔍 Scripts de Vérification

### `watch.js` - Mode Watch pour le Développement

Surveille les changements dans les contrats et redéploie automatiquement.

**▶️ Utilisation :**
```bash
yarn watch
# ou
npm run watch
```

---

## 📚 Guides Détaillés

Pour plus de détails sur chaque catégorie de scripts :

- **Tokens MT** : Voir [README_TRANSFER_TOKENS.md](./README_TRANSFER_TOKENS.md)
- **CELO** : Voir [README_TRANSFER_CELO.md](./README_TRANSFER_CELO.md)

---

## 🎯 Workflows Complets

### Workflow 1 : Onboarding d'un Nouveau Membre

```bash
# 1. Vérifier que vous avez assez de tokens
npx hardhat run scripts/check-balance.js --network alfajores

# 2. Transférer 100 MT au nouveau membre
# Modifiez RECIPIENT_ADDRESS dans transfer-tokens.js
npx hardhat run scripts/transfer-tokens.js --network alfajores

# 3. (Optionnel) Donner du CELO pour les frais de gas
# Modifiez RECIPIENT_ADDRESS dans transfer-celo.js
npx hardhat run scripts/transfer-celo.js --network alfajores

# 4. Le membre peut maintenant rejoindre la DAO via l'interface web!
```

### Workflow 2 : Onboarding d'une Équipe

```bash
# 1. Configurer les destinataires dans transfer-tokens-batch.js
# Exemple:
# const RECIPIENTS = [
#   { address: "0xMembre1...", amount: "100" },
#   { address: "0xMembre2...", amount: "100" },
#   { address: "0xMembre3...", amount: "100" },
# ];

# 2. Exécuter le transfert batch
npx hardhat run scripts/transfer-tokens-batch.js --network alfajores

# 3. (Optionnel) Financer tous les comptes en CELO
npx hardhat run scripts/transfer-celo-batch.js --network alfajores

# 4. Vérifier que tout le monde a reçu ses tokens
npx hardhat run scripts/check-balance.js --network alfajores
```

### Workflow 3 : Redéployer les Contrats

```bash
# 1. Déployer sur Alfajores
npx hardhat run scripts/deploy.js --network alfajores

# 2. Copier les nouvelles adresses de contrats

# 3. Mettre à jour Constants.tsx dans react-app
# export const CONTRACT_ADDRESS = "0xNouvelleAdresseDao";
# export const TOKEN_ADDRESS = "0xNouvelleAdresseToken";

# 4. Mettre à jour Dao.json et Token.json
# Copier depuis packages/hardhat/artifacts/contracts/...

# 5. Redémarrer l'application Next.js
cd ../react-app
yarn dev
```

---

## ⚠️ Notes Importantes

### Sécurité

- **🔐 Clé Privée** : Ne partagez JAMAIS votre clé privée
- **🧪 Testnet** : Testez toujours sur Alfajores avant le mainnet
- **✅ Vérification** : Vérifiez TOUJOURS les adresses et montants avant d'exécuter

### Configuration du Compte

Les scripts utilisent le compte configuré dans `hardhat.config.js` :

```javascript
networks: {
  alfajores: {
    url: "https://alfajores-forno.celo-testnet.org",
    accounts: [process.env.PRIVATE_KEY], // ⚠️ À configurer dans .env
    chainId: 44787,
  },
}
```

**Configuration .env :**
```bash
PRIVATE_KEY=0xVotreCléPrivée...
```

### Frais de Gas

| Type d'opération | Gas Estimé | Coût (Alfajores) |
|------------------|------------|------------------|
| Transfert CELO | ~21,000 | ~0.000053 CELO |
| Transfert Token MT | ~52,000 | ~0.00013 CELO |
| Join DAO | ~150,000 | ~0.00038 CELO |
| Create Proposal | ~200,000 | ~0.0005 CELO |
| Vote | ~80,000 | ~0.0002 CELO |

### Montants Minimums

- **Rejoindre la DAO** : 100 MT tokens minimum
- **Gas pour transactions** : Minimum 0.001 CELO recommandé par wallet

---

## 🔧 Dépannage

### Erreur : "insufficient funds"

**Solution :**
```bash
# Vérifier votre solde CELO
npx hardhat run scripts/check-celo-balance.js --network alfajores

# Obtenir des CELO de test
# https://faucet.celo.org/
```

### Erreur : "nonce too low"

**Solution :** Attendez quelques secondes et réessayez. Les transactions précédentes sont peut-être encore en attente.

### Erreur : "invalid address"

**Solution :** Vérifiez que l'adresse :
- Commence par `0x`
- Contient exactement 42 caractères (0x + 40 caractères hexadécimaux)
- Respecte le checksum (majuscules/minuscules)

---

## 📚 Ressources

### Testnet (Alfajores)
- **Faucet** : https://faucet.celo.org/
- **Explorateur** : https://alfajores.celoscan.io/
- **Token Contract** : [0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC](https://alfajores.celoscan.io/address/0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC)
- **DAO Contract** : [0xF57e75a597B85239F1125c30f6F5ec4896D66A68](https://alfajores.celoscan.io/address/0xF57e75a597B85239F1125c30f6F5ec4896D66A68)

### Mainnet (Celo)
- **Explorateur** : https://celoscan.io/
- **Documentation** : https://docs.celo.org/

### Documentation Technique
- **Hardhat** : https://hardhat.org/docs
- **Ethers.js** : https://docs.ethers.org/v5/
- **Celo Developer Docs** : https://docs.celo.org/developer

---

## 🆘 Support

Pour toute question ou problème :

1. Consultez d'abord les guides détaillés dans `README_TRANSFER_TOKENS.md` et `README_TRANSFER_CELO.md`
2. Vérifiez la documentation Celo : https://docs.celo.org/
3. Consultez les logs d'erreur détaillés dans le terminal
4. Testez toujours sur Alfajores avant le mainnet

---

## 📝 Changelog

### Version Actuelle

- ✅ Scripts de transfert de tokens MT (simple + batch)
- ✅ Scripts de transfert de CELO (simple + batch)
- ✅ Scripts de vérification des soldes (tokens + CELO)
- ✅ Support complet ethers v5
- ✅ Documentation détaillée
- ✅ Gestion des erreurs et validation
- ✅ Logs détaillés et informatifs

---

**🎉 Bon développement sur Celo !**
