const hre = require("hardhat");
const { utils } = require("ethers");

/**
 * CONFIGURATION
 * Ajoutez autant de destinataires que nécessaire
 */
const RECIPIENTS = [
  {
    address: "0x00d47AdAcA5e417daCb3936149016737b9fC2F86",
    amount: "0.3", // CELO
  },
  {
    address: "0x0003f5E4CB635c22F1723Ae18858D175d99Cd770",
    amount: "0.3", // CELO
  },
  {
    address: "0x6A789A649F5deDFDa71F9faacD1ca5b24c6Ed929",
    amount: "0.3", // CELO
  }
  // Ajoutez d'autres destinataires ici...
];

/**
 * Script de transfert de CELO en batch
 */
async function main() {
  console.log("\n🚀 DÉBUT DU TRANSFERT CELO EN BATCH");
  console.log("=" .repeat(60));

  // 1. Récupérer le signataire (expéditeur)
  const [sender] = await hre.ethers.getSigners();
  console.log(`\n📤 Expéditeur: ${sender.address}`);

  // 2. Valider toutes les adresses
  console.log(`\n🔍 Validation de ${RECIPIENTS.length} destinataire(s)...`);
  for (let i = 0; i < RECIPIENTS.length; i++) {
    const recipient = RECIPIENTS[i];
    if (!utils.isAddress(recipient.address)) {
      throw new Error(
        `❌ Adresse invalide à l'index ${i}: ${recipient.address}`
      );
    }
    if (parseFloat(recipient.amount) <= 0) {
      throw new Error(
        `❌ Montant invalide à l'index ${i}: ${recipient.amount} CELO`
      );
    }
  }
  console.log(`✅ Toutes les adresses sont valides`);

  // 3. Calculer le montant total
  const totalAmount = RECIPIENTS.reduce((sum, recipient) => {
    return sum + parseFloat(recipient.amount);
  }, 0);
  const totalAmountInWei = utils.parseEther(totalAmount.toString());

  console.log(`\n💰 Montant total: ${totalAmount.toFixed(4)} CELO`);

  // 4. Vérifier le solde de l'expéditeur
  const senderBalance = await hre.ethers.provider.getBalance(sender.address);
  console.log(`💼 Solde expéditeur: ${utils.formatEther(senderBalance)} CELO`);

  // Estimer les frais de gas (environ 21000 gas par transfert)
  const estimatedGasCost = utils.parseEther("0.001").mul(RECIPIENTS.length);
  const requiredBalance = totalAmountInWei.add(estimatedGasCost);

  if (senderBalance.lt(requiredBalance)) {
    throw new Error(
      `❌ Solde insuffisant!\n` +
      `   Requis (transferts + gas): ${utils.formatEther(requiredBalance)} CELO\n` +
      `   Disponible: ${utils.formatEther(senderBalance)} CELO`
    );
  }

  // 5. Effectuer les transferts
  console.log(`\n📡 Début des transferts...`);
  console.log("=".repeat(60));

  const results = [];
  let successCount = 0;
  let failureCount = 0;
  let totalGasCost = hre.ethers.BigNumber.from(0);

  for (let i = 0; i < RECIPIENTS.length; i++) {
    const recipient = RECIPIENTS[i];
    console.log(`\n[${i + 1}/${RECIPIENTS.length}] Transfert vers ${recipient.address}`);
    console.log(`   Montant: ${recipient.amount} CELO`);

    try {
      // Obtenir le solde avant
      const balanceBefore = await hre.ethers.provider.getBalance(recipient.address);

      // Effectuer le transfert
      const tx = await sender.sendTransaction({
        to: recipient.address,
        value: utils.parseEther(recipient.amount),
      });

      console.log(`   ⏳ Transaction: ${tx.hash}`);
      
      // Attendre la confirmation
      const receipt = await tx.wait();

      // Calculer les frais de gas
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.effectiveGasPrice || receipt.gasPrice || tx.gasPrice;
      const gasCost = gasUsed.mul(gasPrice);
      totalGasCost = totalGasCost.add(gasCost);

      // Obtenir le solde après
      const balanceAfter = await hre.ethers.provider.getBalance(recipient.address);

      console.log(`   ✅ Succès! Block: ${receipt.blockNumber}, Gas: ${gasUsed.toString()}`);

      results.push({
        success: true,
        address: recipient.address,
        amount: recipient.amount,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: gasUsed.toString(),
        gasCost: utils.formatEther(gasCost),
        balanceBefore: utils.formatEther(balanceBefore),
        balanceAfter: utils.formatEther(balanceAfter),
      });

      successCount++;
    } catch (error) {
      console.log(`   ❌ Échec: ${error.message}`);
      
      results.push({
        success: false,
        address: recipient.address,
        amount: recipient.amount,
        error: error.message,
      });

      failureCount++;
    }

    // Petite pause entre les transactions pour éviter les problèmes de nonce
    if (i < RECIPIENTS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 6. Afficher le résumé
  const senderBalanceAfter = await hre.ethers.provider.getBalance(sender.address);

  console.log("\n" + "=".repeat(60));
  console.log("📊 RÉSUMÉ DES TRANSFERTS");
  console.log("=".repeat(60));

  console.log(`\n✅ Succès: ${successCount}/${RECIPIENTS.length}`);
  console.log(`❌ Échecs: ${failureCount}/${RECIPIENTS.length}`);
  console.log(`💰 Total transféré: ${totalAmount.toFixed(4)} CELO`);
  console.log(`⛽ Total frais de gas: ${utils.formatEther(totalGasCost)} CELO`);
  console.log(`💼 Solde expéditeur final: ${utils.formatEther(senderBalanceAfter)} CELO`);

  // Afficher les détails des transferts réussis
  if (successCount > 0) {
    console.log(`\n✅ TRANSFERTS RÉUSSIS:`);
    console.log("=".repeat(60));
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`\n[${index + 1}] ${result.address}`);
        console.log(`   Montant: ${result.amount} CELO`);
        console.log(`   Transaction: ${result.txHash}`);
        console.log(`   Block: ${result.blockNumber}`);
        console.log(`   Gas: ${result.gasUsed} (${result.gasCost} CELO)`);
        console.log(`   Solde destinataire: ${result.balanceBefore} → ${result.balanceAfter} CELO`);
        console.log(`   🔗 https://alfajores.celoscan.io/tx/${result.txHash}`);
      }
    });
  }

  // Afficher les détails des échecs
  if (failureCount > 0) {
    console.log(`\n❌ TRANSFERTS ÉCHOUÉS:`);
    console.log("=".repeat(60));
    results.forEach((result, index) => {
      if (!result.success) {
        console.log(`\n[${index + 1}] ${result.address}`);
        console.log(`   Montant: ${result.amount} CELO`);
        console.log(`   Erreur: ${result.error}`);
      }
    });
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

// Exécution du script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n" + "=".repeat(60));
    console.error("❌ ERREUR FATALE");
    console.error("=".repeat(60));
    console.error(error);
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  });
