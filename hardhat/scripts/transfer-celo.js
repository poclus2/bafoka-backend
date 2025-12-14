const hre = require("hardhat");
const { utils } = require("ethers");

/**
 * CONFIGURATION
 * Modifiez ces valeurs selon vos besoins
 */
const CONFIG = {
  // Adresse du destinataire
  RECIPIENT_ADDRESS: "0x00d47AdAcA5e417daCb3936149016737b9fC2F86",
  
  // Montant en CELO (nombre décimal)
  AMOUNT_IN_CELO: "0.1", // Par exemple: "0.5", "1.0", "10.5"
};

/**
 * Script de transfert de CELO
 */
async function main() {
  console.log("\n🚀 DÉBUT DU TRANSFERT DE CELO");
  console.log("=" .repeat(60));

  // 1. Récupérer le signataire (expéditeur)
  const [sender] = await hre.ethers.getSigners();
  console.log(`\n📤 Expéditeur: ${sender.address}`);

  // 2. Valider l'adresse du destinataire
  const recipientAddress = CONFIG.RECIPIENT_ADDRESS;
  if (!utils.isAddress(recipientAddress)) {
    throw new Error(`❌ Adresse destinataire invalide: ${recipientAddress}`);
  }
  console.log(`📥 Destinataire: ${recipientAddress}`);

  // 3. Convertir le montant en Wei
  const amountInWei = utils.parseEther(CONFIG.AMOUNT_IN_CELO);
  console.log(`💰 Montant: ${CONFIG.AMOUNT_IN_CELO} CELO`);

  // 4. Vérifier le solde de l'expéditeur
  const senderBalance = await hre.ethers.provider.getBalance(sender.address);
  console.log(`\n💼 Solde expéditeur: ${utils.formatEther(senderBalance)} CELO`);

  if (senderBalance.lt(amountInWei)) {
    throw new Error(
      `❌ Solde insuffisant!\n` +
      `   Requis: ${CONFIG.AMOUNT_IN_CELO} CELO\n` +
      `   Disponible: ${utils.formatEther(senderBalance)} CELO`
    );
  }

  // 5. Vérifier le solde du destinataire avant transfert
  const recipientBalanceBefore = await hre.ethers.provider.getBalance(recipientAddress);
  console.log(`💼 Solde destinataire (avant): ${utils.formatEther(recipientBalanceBefore)} CELO`);

  // 6. Effectuer le transfert
  console.log(`\n📡 Envoi de la transaction...`);
  
  const tx = await sender.sendTransaction({
    to: recipientAddress,
    value: amountInWei,
  });

  console.log(`⏳ Transaction envoyée: ${tx.hash}`);
  console.log(`🔗 Voir sur l'explorateur: https://alfajores.celoscan.io/tx/${tx.hash}`);
  console.log(`⏳ En attente de confirmation...`);

  // 7. Attendre la confirmation
  const receipt = await tx.wait();

  // 8. Vérifier les soldes après transfert
  const senderBalanceAfter = await hre.ethers.provider.getBalance(sender.address);
  const recipientBalanceAfter = await hre.ethers.provider.getBalance(recipientAddress);

  // 9. Calculer les frais de gas
  const gasUsed = receipt.gasUsed;
  const gasPrice = receipt.effectiveGasPrice || receipt.gasPrice || tx.gasPrice;
  const gasCost = gasUsed.mul(gasPrice);

  // 10. Afficher les résultats
  console.log("\n" + "=".repeat(60));
  console.log("✅ TRANSFERT RÉUSSI !");
  console.log("=".repeat(60));
  console.log(`\n📊 DÉTAILS DE LA TRANSACTION:`);
  console.log(`   Hash: ${receipt.transactionHash}`);
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas utilisé: ${gasUsed.toString()}`);
  console.log(`   Frais de gas: ${utils.formatEther(gasCost)} CELO`);
  
  console.log(`\n💸 RÉSUMÉ DU TRANSFERT:`);
  console.log(`   De: ${sender.address}`);
  console.log(`   À: ${recipientAddress}`);
  console.log(`   Montant: ${CONFIG.AMOUNT_IN_CELO} CELO`);
  
  console.log(`\n💰 SOLDES FINAUX:`);
  console.log(`   Expéditeur: ${utils.formatEther(senderBalanceAfter)} CELO`);
  console.log(`   Destinataire: ${utils.formatEther(recipientBalanceAfter)} CELO`);
  
  console.log(`\n🔗 EXPLORATEUR:`);
  console.log(`   https://alfajores.celoscan.io/tx/${receipt.transactionHash}`);
  console.log("\n" + "=".repeat(60) + "\n");
}

// Exécution du script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n" + "=".repeat(60));
    console.error("❌ ERREUR LORS DU TRANSFERT");
    console.error("=".repeat(60));
    console.error(error);
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  });
