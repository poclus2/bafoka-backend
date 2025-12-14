# 🪙 Scripts de Gestion des Tokens MT

## Vue d'ensemble

Ces scripts permettent de transférer des tokens MT (MyToken) aux utilisateurs du DAO.

---

## 📋 Prérequis

1. **Node.js et Yarn** installés
2. **Fichier `.env`** configuré dans `packages/hardhat/` avec :
   ```env
   PRIVATE_KEY=votre_clé_privée
   CELOSCAN_API_KEY=votre_api_key_celoscan
   ```
3. **Solde CELO** suffisant pour les frais de transaction
4. **Solde MT** suffisant pour effectuer les transferts

---

## 📝 Scripts Disponibles

### 1. Transfer Simple (Une Adresse)

**Fichier** : `scripts/transfer-tokens.js`

Transférer des tokens à une seule adresse.

#### Configuration

Ouvrir le fichier et modifier :

```javascript
// Adresse du destinataire
const RECIPIENT_ADDRESS = "0xVOTRE_ADRESSE_ICI";

// Montant en MT (pas en wei)
const AMOUNT = 100;
```

#### Utilisation

```bash
cd packages/hardhat
npx hardhat run scripts/transfer-tokens.js --network alfajores
```

#### Exemple de Résultat

```
════════════════════════════════════════════════════════════
🪙  SCRIPT DE TRANSFERT DE TOKENS MT
════════════════════════════════════════════════════════════

📊 Configuration:
   Token Contract: 0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC
   Sender (vous): 0xadA758c4561233bE28daf54BEaC161750EF1C73e
   Recipient: 0xd4daa304d1e3c3d6E1C48e0d7c1DEAF048714ae1
   Amount: 100 MT

🔍 Vérification des soldes AVANT le transfert...
   Votre solde: 200000.0 MT
   Solde du destinataire: 0.0 MT

🚀 Envoi des tokens en cours...
   Transaction hash: 0x24a640cd...
   ✅ Transaction confirmée !

✅ TRANSFERT RÉUSSI !
```

---

### 2. Transfer Batch (Plusieurs Adresses)

**Fichier** : `scripts/transfer-tokens-batch.js`

Transférer des tokens à plusieurs adresses en une seule exécution.

#### Configuration

Ouvrir le fichier et modifier le tableau `RECIPIENTS` :

```javascript
const RECIPIENTS = [
  {
    address: "0xADRESSE_1",
    amount: 100, // en MT
  },
  {
    address: "0xADRESSE_2",
    amount: 200, // en MT
  },
  {
    address: "0xADRESSE_3",
    amount: 150, // en MT
  },
  // Ajoutez autant d'adresses que nécessaire
];
```

#### Utilisation

```bash
cd packages/hardhat
npx hardhat run scripts/transfer-tokens-batch.js --network alfajores
```

#### Exemple de Résultat

```
════════════════════════════════════════════════════════════
🪙  SCRIPT DE TRANSFERT BATCH DE TOKENS MT
════════════════════════════════════════════════════════════

📊 Configuration:
   Nombre de destinataires: 3
   Total à envoyer: 450 MT

💰 Votre solde: 200000.0 MT

🚀 Démarrage des transferts...

📤 Transfert 1/3:
   Destinataire: 0xADRESSE_1
   Montant: 100 MT
   ✅ Confirmé

📤 Transfert 2/3:
   Destinataire: 0xADRESSE_2
   Montant: 200 MT
   ✅ Confirmé

📤 Transfert 3/3:
   Destinataire: 0xADRESSE_3
   Montant: 150 MT
   ✅ Confirmé

✅ Réussis: 3/3
```

---

## 🔍 Informations Importantes

### Adresses des Contrats

| Contrat | Adresse | Réseau |
|---------|---------|--------|
| Token (MT) | `0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC` | Alfajores |
| DAO | `0xF57e75a597B85239F1125c30f6F5ec4896D66A68` | Alfajores |

### Montants Recommandés

- **100 MT** : Minimum pour rejoindre le DAO
- **200+ MT** : Recommandé pour créer plusieurs proposals

### Coût en Gas

- Chaque transfert coûte environ **0.001-0.002 CELO** en frais de gas
- Assurez-vous d'avoir suffisamment de CELO pour les frais

---

## ⚠️ Erreurs Courantes

### 1. "RECIPIENT_ADDRESS non modifiée"

**Problème** : Vous n'avez pas changé l'adresse du destinataire

**Solution** : Ouvrir le script et remplacer `0xYOUR_ADDRESS_HERE` par l'adresse réelle

### 2. "Solde insuffisant"

**Problème** : Vous n'avez pas assez de tokens MT

**Solution** : Vérifier votre solde avec :
```bash
npx hardhat run scripts/check-balance.js --network alfajores
```

### 3. "call revert exception"

**Problème** : Mauvais réseau ou mauvaise adresse de contrat

**Solution** : 
- Vérifier que vous utilisez `--network alfajores`
- Vérifier que l'adresse du contrat est correcte

### 4. "Transaction underpriced"

**Problème** : Gas price trop bas

**Solution** : Hardhat ajuste automatiquement, réessayez simplement

---

## 📊 Vérification des Transferts

### Sur Celoscan

Chaque transfert réussi affiche un lien vers Celoscan :
```
https://alfajores.celoscan.io/tx/0xTRANSACTION_HASH
```

### Avec le Script check-balance.js

```bash
npx hardhat run scripts/check-balance.js --network alfajores
```

---

## 💡 Cas d'Usage

### Distribuer des Tokens aux Membres

1. **Identifier les membres** qui ont besoin de tokens
2. **Créer une liste** dans `transfer-tokens-batch.js`
3. **Exécuter le script** pour distribuer à tous en une fois

### Donner des Tokens à un Nouveau Membre

1. **Obtenir l'adresse** du nouveau membre
2. **Modifier** `transfer-tokens.js` avec son adresse
3. **Envoyer 100 MT** pour qu'il puisse rejoindre le DAO

### Récompenser les Contributeurs

1. **Décider des montants** selon les contributions
2. **Utiliser** `transfer-tokens-batch.js` pour plusieurs personnes
3. **Vérifier** que tous ont reçu leurs tokens

---

## 🔒 Sécurité

### Protection de la Clé Privée

- ✅ **Toujours** utiliser un fichier `.env`
- ❌ **Jamais** commit la clé privée dans Git
- ✅ `.env` est dans `.gitignore`

### Vérification Avant Envoi

Les scripts affichent toujours :
- L'adresse du destinataire
- Le montant à envoyer
- Votre solde actuel

**Vérifiez ces informations avant de confirmer !**

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifier** que vous êtes sur le bon réseau (Alfajores)
2. **Vérifier** que vous avez assez de CELO pour les frais
3. **Vérifier** que vous avez assez de MT pour transférer
4. **Consulter** les logs d'erreur pour plus de détails

---

## 🔗 Liens Utiles

- [Celo Faucet (Alfajores)](https://faucet.celo.org/alfajores)
- [Celoscan (Alfajores)](https://alfajores.celoscan.io/)
- [Documentation Celo](https://docs.celo.org/)

---

**Dernière mise à jour** : 9 octobre 2025
