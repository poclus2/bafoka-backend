# 🧪 Guide d'Utilisation - Test Blockchain

## Description

`test-blockchain.js` est un script de test complet qui vérifie le bon fonctionnement de tous les smart contracts déployés sur la blockchain.

## 🎯 Ce qui est testé

### 1. Connexion Réseau
- ✅ Connexion au RPC
- ✅ Récupération du bloc actuel
- ✅ Informations réseau (chainId, nom)
- ✅ Prix du gas

### 2. Contrat Token (ERC20)
- ✅ Métadonnées (name, symbol, decimals)
- ✅ Total supply
- ✅ Balance du wallet admin
- ✅ Fonction transfer

### 3. Contrat DAO
- ✅ Adresse du token lié
- ✅ Nombre de membres
- ✅ Vérification membership

### 4. Contrat Governance
- ✅ Paramètres (voting period, contest window, quorum, approval)
- ✅ Nombre de propositions
- ✅ Rôles (Admin, Moderator, Validator)
- ✅ Membership

## 📋 Prérequis

1. **Contrats déployés** sur le réseau
2. **Variables d'environnement** configurées dans `.env`:
   ```bash
   CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
   ADMIN_PRIVATE_KEY=0x...
   TOKEN_CONTRACT_ADDRESS=0x...
   DAO_CONTRACT_ADDRESS=0x...
   GOVERNANCE_CONTRACT_ADDRESS=0x...
   ```
3. **Wallet admin** avec des fonds (pour les tests de transaction)

## 🚀 Utilisation

### Exécution Simple

```bash
node test-blockchain.js
```

### Avec npm script

Ajoutez dans `package.json`:
```json
{
  "scripts": {
    "test:blockchain": "node test-blockchain.js"
  }
}
```

Puis exécutez:
```bash
npm run test:blockchain
```

## 📊 Résultats

Le script affiche:

### Résultats en Temps Réel

```
╔══════════════════════════════════════════════════════════╗
║          🧪 TEST SUITE BLOCKCHAIN                        ║
╚══════════════════════════════════════════════════════════╝

ℹ️  Initialisation de la connexion blockchain...
✅ Connecté au réseau: sepolia (chainId: 11155111)
ℹ️  Bloc actuel: 9711212
✅ Wallet admin: 0x489D5434264807a6255d71A35F7f9E8e3abdF1cb
ℹ️  Solde admin: 0.5432 CELO

============================================================
🌐 TESTS DE CONNEXION RÉSEAU
============================================================
🧪 Test: Network - Current Block
ℹ️    Bloc actuel: 9711212
✅ PASSED: Network - Current Block

============================================================
📄 TESTS DU CONTRAT TOKEN (ERC20)
============================================================
🧪 Test: Token - Métadonnées (name, symbol, decimals)
ℹ️    Name: MyToken
ℹ️    Symbol: MT
ℹ️    Decimals: 18
✅ PASSED: Token - Métadonnées (name, symbol, decimals)

🧪 Test: Token - Total Supply
ℹ️    Total Supply: 200000.0 tokens
✅ PASSED: Token - Total Supply

🧪 Test: Token - Fonction Transfer
ℹ️    Transfert de 0.001 token vers 0x46F01F4c...
ℹ️    Balance destinataire: 0.001 tokens
✅ PASSED: Token - Fonction Transfer
```

### Résumé Final

```
============================================================
📊 RÉSUMÉ DES TESTS
============================================================

Total de tests: 14
✅ Tests réussis: 9
❌ Tests échoués: 5

Taux de réussite: 64.3%

⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.
============================================================
```

## 🔧 Personnalisation

### Ajouter un Test

```javascript
// Dans la classe BlockchainTester

async testCustomFeature() {
  await this.runTest('Mon Test Custom', async () => {
    // Votre logique de test
    const result = await this.tokenContract.someFunction();
    
    log.info(`  Résultat: ${result}`);
    
    if (!result) {
      throw new Error('Le test a échoué');
    }
  });
}

// Puis l'appeler dans runAllTests()
async runAllTests() {
  // ... autres tests
  await this.testCustomFeature();
  // ...
}
```

### Modifier les ABIs

Si vos contrats ont des fonctions différentes, modifiez les ABIs au début du fichier:

```javascript
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  // Ajoutez vos fonctions ici
  "function myCustomFunction() view returns (uint256)"
];
```

## ⚠️ Erreurs Courantes

### 1. "CELO_RPC_URL non défini"

**Solution**: Vérifiez que `.env` contient `CELO_RPC_URL`

### 2. "Contrat non disponible - tests ignorés"

**Solution**: Vérifiez que les adresses sont dans `deployments.json` ou `.env`

### 3. "execution reverted"

**Causes possibles**:
- Fonction n'existe pas dans le contrat
- Contrat non déployé correctement
- ABI incorrect

**Solution**: Vérifiez l'ABI et le déploiement du contrat

### 4. "Solde admin insuffisant"

**Solution**: Rechargez le wallet admin avec du CELO

## 📈 Interprétation des Résultats

### Taux de Réussite

- **100%**: 🎉 Parfait ! Tous les contrats fonctionnent
- **80-99%**: ✅ Bon, quelques fonctions optionnelles échouent
- **50-79%**: ⚠️  Problèmes à investiguer
- **< 50%**: ❌ Problèmes majeurs, vérifiez les déploiements

### Tests Critiques

Ces tests **DOIVENT** passer:
- ✅ Network - Current Block
- ✅ Token - Métadonnées
- ✅ Token - Total Supply
- ✅ Governance - Paramètres

Si ces tests échouent, il y a un problème de configuration ou de déploiement.

## 🔄 Automatisation

### CI/CD Integration

Ajoutez dans votre pipeline CI/CD:

```yaml
# .github/workflows/test.yml
- name: Test Blockchain
  run: npm run test:blockchain
  env:
    CELO_RPC_URL: ${{ secrets.CELO_RPC_URL }}
    ADMIN_PRIVATE_KEY: ${{ secrets.ADMIN_PRIVATE_KEY }}
```

### Cron Job

Pour des tests réguliers:

```bash
# Tous les jours à 2h du matin
0 2 * * * cd /path/to/backend && node test-blockchain.js >> logs/blockchain-tests.log 2>&1
```

## 💡 Bonnes Pratiques

1. **Exécutez les tests après chaque déploiement**
2. **Vérifiez les logs en cas d'échec**
3. **Gardez les ABIs à jour** avec vos contrats
4. **Testez sur testnet** avant mainnet
5. **Documentez les résultats** pour référence future

## 🔗 Liens Utiles

- [Documentation Ethers.js](https://docs.ethers.org/)
- [Celo Documentation](https://docs.celo.org/)
- [API Documentation](./API_DOCUMENTATION.md)

## 📞 Support

En cas de problème:
1. Vérifiez les logs détaillés
2. Consultez les erreurs spécifiques
3. Vérifiez la configuration `.env`
4. Testez la connexion RPC manuellement

---

**Dernière mise à jour**: 2025-11-26
