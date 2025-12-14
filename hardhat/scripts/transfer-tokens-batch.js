/**
 * Script pour transférer des tokens MT à plusieurs adresses
 * 
 * Usage:
 *   npx hardhat run scripts/transfer-tokens-batch.js --network alfajores
 * 
 * Configuration:
 *   - Modifier le tableau RECIPIENTS avec les adresses et montants
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");

// ═══════════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION - MODIFIEZ CES VALEURS
// ═══════════════════════════════════════════════════════════════════

// Adresse du contrat Token déployé sur Alfajores
const TOKEN_ADDRESS = "0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC";

// Liste des destinataires avec leurs montants
// Format: { address: "0x...", amount: 100 }
const RECIPIENTS = [
  {
    address: "0xADDRESS_1_HERE",
    amount: 100, // en MT
  },
  {
    address: "0xADDRESS_2_HERE",
    amount: 200, // en MT
  },
  {
    address: "0xADDRESS_3_HERE",
    amount: 150, // en MT
  },
  // Ajoutez autant d'adresses que nécessaire
];

// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("🪙  SCRIPT DE TRANSFERT BATCH DE TOKENS MT");
  console.log("═".repeat(60) + "\n");

  // Obtenir le signeur
  const [sender] = await ethers.getSigners();
  
  console.log("📊 Configuration:");
  console.log("   Token Contract:", TOKEN_ADDRESS);
  console.log("   Sender (vous):", sender.address);
  console.log("   Nombre de destinataires:", RECIPIENTS.length);
  console.log("");

  // Valider toutes les adresses
  let hasInvalidAddress = false;
  let totalAmount = 0;

  for (let i = 0; i < RECIPIENTS.length; i++) {
    const recipient = RECIPIENTS[i];
    
    if (recipient.address.includes("ADDRESS_") || recipient.address.includes("HERE")) {
      console.error(`❌ Destinataire ${i + 1}: Adresse non modifiée (${recipient.address})`);
      hasInvalidAddress = true;
    } else if (!ethers.utils.isAddress(recipient.address)) {
      console.error(`❌ Destinataire ${i + 1}: Adresse invalide (${recipient.address})`);
      hasInvalidAddress = true;
    } else if (recipient.amount <= 0) {
      console.error(`❌ Destinataire ${i + 1}: Montant invalide (${recipient.amount})`);
      hasInvalidAddress = true;
    } else {
      console.log(`✅ Destinataire ${i + 1}: ${recipient.address} → ${recipient.amount} MT`);
      totalAmount += recipient.amount;
    }
  }

  console.log("");

  if (hasInvalidAddress) {
    console.error("❌ Certaines adresses ou montants sont invalides !");
    console.log("💡 Modifiez le tableau RECIPIENTS dans le script\n");
    process.exit(1);
  }

  console.log("📊 Total à envoyer:", totalAmount, "MT\n");

  // Se connecter au contrat Token
  const Token = await ethers.getContractFactory("Token");
  const token = Token.attach(TOKEN_ADDRESS);

  // Vérifier le solde du sender
  const senderBalance = await token.balanceOf(sender.address);
  const senderBalanceFormatted = ethers.utils.formatEther(senderBalance);
  
  console.log("💰 Votre solde:", senderBalanceFormatted, "MT\n");

  // Vérifier que le sender a assez de tokens
  const totalAmountInWei = ethers.utils.parseEther(totalAmount.toString());
  
  if (senderBalance.lt(totalAmountInWei)) {
    console.error("❌ ERREUR: Solde insuffisant !");
    console.log("   Vous avez:", senderBalanceFormatted, "MT");
    console.log("   Vous devez envoyer:", totalAmount, "MT");
    console.log("   Manquant:", totalAmount - parseFloat(senderBalanceFormatted), "MT\n");
    process.exit(1);
  }

  // Demander confirmation
  console.log("⚠️  Vous allez envoyer des tokens à", RECIPIENTS.length, "adresse(s)");
  console.log("   Total:", totalAmount, "MT");
  console.log("");
  console.log("🚀 Démarrage des transferts...\n");

  // Effectuer les transferts un par un
  const results = [];

  for (let i = 0; i < RECIPIENTS.length; i++) {
    const recipient = RECIPIENTS[i];
    const amountInWei = ethers.utils.parseEther(recipient.amount.toString());

    console.log(`📤 Transfert ${i + 1}/${RECIPIENTS.length}:`);
    console.log(`   Destinataire: ${recipient.address}`);
    console.log(`   Montant: ${recipient.amount} MT`);

    try {
      const tx = await token.transfer(recipient.address, amountInWei);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   En attente de confirmation...`);
      
      const receipt = await tx.wait();
      
      console.log(`   ✅ Confirmé (block ${receipt.blockNumber})`);
      console.log("");

      results.push({
        index: i + 1,
        address: recipient.address,
        amount: recipient.amount,
        success: true,
        txHash: tx.hash,
      });

    } catch (error) {
      console.error(`   ❌ ERREUR: ${error.message}`);
      console.log("");

      results.push({
        index: i + 1,
        address: recipient.address,
        amount: recipient.amount,
        success: false,
        error: error.message,
      });
    }
  }

  // Résumé final
  console.log("═".repeat(60));
  console.log("📊 RÉSUMÉ DES TRANSFERTS");
  console.log("═".repeat(60) + "\n");

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Réussis: ${successful.length}/${RECIPIENTS.length}`);
  console.log(`❌ Échoués: ${failed.length}/${RECIPIENTS.length}`);
  console.log("");

  if (successful.length > 0) {
    console.log("✅ Transferts réussis:");
    successful.forEach(r => {
      console.log(`   ${r.index}. ${r.address} → ${r.amount} MT`);
      console.log(`      https://alfajores.celoscan.io/tx/${r.txHash}`);
    });
    console.log("");
  }

  if (failed.length > 0) {
    console.log("❌ Transferts échoués:");
    failed.forEach(r => {
      console.log(`   ${r.index}. ${r.address} → ${r.amount} MT`);
      console.log(`      Erreur: ${r.error}`);
    });
    console.log("");
  }

  // Vérifier le nouveau solde
  const newBalance = await token.balanceOf(sender.address);
  const newBalanceFormatted = ethers.utils.formatEther(newBalance);
  
  const totalSent = successful.reduce((sum, r) => sum + r.amount, 0);

  console.log("💰 Votre nouveau solde:", newBalanceFormatted, "MT");
  console.log("📤 Total envoyé:", totalSent, "MT");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
