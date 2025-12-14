# 💰 Scripts de Transfert CELO

Ce dossier contient des scripts pour transférer la cryptomonnaie native CELO entre adresses.

## 📋 Scripts Disponibles

### 1. `transfer-celo.js` - Transfert Simple

Transfère des CELO d'une adresse à une autre.

**Configuration dans le script :**
```javascript
const CONFIG = {
  RECIPIENT_ADDRESS: "0xd4daa304d1e3c3d6E1C48e0d7c1DEAF048714ae1",
  AMOUNT_IN_CELO: "1.0", // Montant en CELO
};
```

**Utilisation :**
```bash
# Sur Alfajores (testnet)
npx hardhat run scripts/transfer-celo.js --network alfajores

# Sur Celo Mainnet
npx hardhat run scripts/transfer-celo.js --network celo
```

### 2. `transfer-celo-batch.js` - Transfert en Batch

Transfère des CELO à plusieurs destinataires en une seule exécution.

**Configuration dans le script :**
```javascript
const RECIPIENTS = [
  {
    address: "0xd4daa304d1e3c3d6E1C48e0d7c1DEAF048714ae1",
    amount: "1.0", // CELO
  },
  {
    address: "0x1234567890123456789012345678901234567890",
    amount: "0.5", // CELO
  },
  // Ajoutez d'autres destinataires...
];
```

**Utilisation :**
```bash
# Sur Alfajores (testnet)
npx hardhat run scripts/transfer-celo-batch.js --network alfajores

# Sur Celo Mainnet
npx hardhat run scripts/transfer-celo-batch.js --network celo
```

### 3. `check-celo-balance.js` - Vérification des Soldes

Vérifie les soldes CELO de plusieurs adresses.

**Configuration dans le script :**
```javascript
const ADDRESSES = [
  "0xadA758c4561233bE28daf54BEaC161750EF1C73e",
  "0xd4daa304d1e3c3d6E1C48e0d7c1DEAF048714ae1",
  // Ajoutez d'autres adresses...
];
```

**Utilisation :**
```bash
# Sur Alfajores (testnet)
npx hardhat run scripts/check-celo-balance.js --network alfajores

# Sur Celo Mainnet
npx hardhat run scripts/check-celo-balance.js --network celo
```

## 🔧 Configuration

### Modifier les Paramètres

1. **Ouvrez le script** que vous voulez utiliser
2. **Modifiez la section CONFIG** ou **RECIPIENTS** en haut du fichier
3. **Sauvegardez** le fichier
4. **Exécutez** le script

### Configuration du Compte Expéditeur

Les scripts utilisent le premier compte configuré dans votre `hardhat.config.js` :

```javascript
networks: {
  alfajores: {
    url: "https://alfajores-forno.celo-testnet.org",
    accounts: [process.env.PRIVATE_KEY], // Votre clé privée
    chainId: 44787,
  },
}
```

**⚠️ IMPORTANT :** Ne partagez JAMAIS votre clé privée !

## 📊 Exemples de Sortie

### Transfert Simple Réussi

```
🚀 DÉBUT DU TRANSFERT DE CELO
============================================================

📤 Expéditeur: 0xadA758c4561233bE28daf54BEaC161750EF1C73e
📥 Destinataire: 0xd4daa304d1e3c3d6E1C48e0d7c1DEAF048714ae1
💰 Montant: 1.0 CELO

💼 Solde expéditeur: 3.49 CELO
💼 Solde destinataire (avant): 0.0 CELO

📡 Envoi de la transaction...
⏳ Transaction envoyée: 0x123...abc
🔗 Voir sur l'explorateur: https://alfajores.celoscan.io/tx/0x123...abc
⏳ En attente de confirmation...

============================================================
✅ TRANSFERT RÉUSSI !
============================================================

📊 DÉTAILS DE LA TRANSACTION:
   Hash: 0x123...abc
   Block: 59034150
   Gas utilisé: 21000
   Frais de gas: 0.0000525 CELO

💸 RÉSUMÉ DU TRANSFERT:
   De: 0xadA758c4561233bE28daf54BEaC161750EF1C73e
   À: 0xd4daa304d1e3c3d6E1C48e0d7c1DEAF048714ae1
   Montant: 1.0 CELO

💰 SOLDES FINAUX:
   Expéditeur: 2.4899475 CELO
   Destinataire: 1.0 CELO

🔗 EXPLORATEUR:
   https://alfajores.celoscan.io/tx/0x123...abc
```

### Transfert Batch

```
🚀 DÉBUT DU TRANSFERT CELO EN BATCH
============================================================

📤 Expéditeur: 0xadA758c4561233bE28daf54BEaC161750EF1C73e

🔍 Validation de 3 destinataire(s)...
✅ Toutes les adresses sont valides

💰 Montant total: 2.5000 CELO
💼 Solde expéditeur: 10.0 CELO

📡 Début des transferts...
============================================================

[1/3] Transfert vers 0xd4daa304d1e3c3d6E1C48e0d7c1DEAF048714ae1
   Montant: 1.0 CELO
   ⏳ Transaction: 0x123...abc
   ✅ Succès! Block: 59034150, Gas: 21000

[2/3] Transfert vers 0x1234567890123456789012345678901234567890
   Montant: 1.0 CELO
   ⏳ Transaction: 0x456...def
   ✅ Succès! Block: 59034151, Gas: 21000

[3/3] Transfert vers 0x7890...1234
   Montant: 0.5 CELO
   ⏳ Transaction: 0x789...ghi
   ✅ Succès! Block: 59034152, Gas: 21000

============================================================
📊 RÉSUMÉ DES TRANSFERTS
============================================================

✅ Succès: 3/3
❌ Échecs: 0/3
💰 Total transféré: 2.5000 CELO
⛽ Total frais de gas: 0.0001575 CELO
💼 Solde expéditeur final: 7.4998425 CELO
```

## ⚠️ Notes Importantes

### Sécurité

1. **Clé Privée** : Ne partagez jamais votre clé privée
2. **Testnet** : Testez toujours sur Alfajores avant le mainnet
3. **Montants** : Vérifiez deux fois les montants et adresses
4. **Solde** : Assurez-vous d'avoir assez de CELO pour les frais de gas

### Frais de Gas

- **Transfert CELO** : ~21,000 gas (~0.0000525 CELO sur Alfajores)
- **Batch** : 21,000 gas × nombre de transferts
- **Toujours** garder un peu de CELO pour les frais

### Différences avec le Transfert de Tokens

| Aspect | CELO (natif) | MT Token (ERC20) |
|--------|-------------|------------------|
| Type | Cryptomonnaie native | Token ERC20 |
| Contrat | Aucun | Oui (0xD27D...) |
| Gas | ~21,000 | ~52,000 |
| Méthode | `sendTransaction` | `transfer()` |

## 🚀 Cas d'Usage

### 1. Financer des Comptes de Test
```javascript
// transfer-celo-batch.js
const RECIPIENTS = [
  { address: "0xTest1...", amount: "0.1" },
  { address: "0xTest2...", amount: "0.1" },
  { address: "0xTest3...", amount: "0.1" },
];
```

### 2. Transférer à un Utilisateur
```javascript
// transfer-celo.js
const CONFIG = {
  RECIPIENT_ADDRESS: "0xUser...",
  AMOUNT_IN_CELO: "5.0",
};
```

### 3. Vérifier les Soldes
```javascript
// check-celo-balance.js
const ADDRESSES = [
  "0xWallet1...",
  "0xWallet2...",
  "0xWallet3...",
];
```

## 🔍 Dépannage

### Erreur : "Solde insuffisant"
- Vérifiez votre solde avec `check-celo-balance.js`
- Obtenez des CELO de test sur [Celo Faucet](https://faucet.celo.org/)

### Erreur : "Adresse invalide"
- Vérifiez le format de l'adresse (0x...)
- Vérifiez le checksum de l'adresse

### Erreur : "Transaction failed"
- Vérifiez que l'adresse destinataire existe
- Vérifiez votre connexion au réseau
- Augmentez le gas limit si nécessaire

## 📚 Ressources

- [Celo Faucet (testnet)](https://faucet.celo.org/)
- [Alfajores Explorer](https://alfajores.celoscan.io/)
- [Celo Mainnet Explorer](https://celoscan.io/)
- [Documentation Celo](https://docs.celo.org/)

## 🆘 Support

Pour toute question ou problème :
1. Vérifiez la documentation Celo
2. Consultez les logs d'erreur
3. Testez d'abord sur Alfajores
4. Vérifiez les soldes avant tout transfert
