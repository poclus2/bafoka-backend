/**
 * Script pour transférer des tokens MT à une adresse
 * 
 * Usage:
 *   npx hardhat run scripts/transfer-tokens.js --network alfajores
 * 
 * Configuration:
 *   - Modifier RECIPIENT_ADDRESS : L'adresse qui recevra les tokens
 *   - Modifier AMOUNT : Le montant de tokens à envoyer (en MT, pas en wei)
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");

// ═══════════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION - MODIFIEZ CES VALEURS
// ═══════════════════════════════════════════════════════════════════

// Adresse du contrat Token déployé sur Alfajores
const TOKEN_ADDRESS = "0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC";

// Adresse qui recevra les tokens (MODIFIEZ CETTE VALEUR)
const RECIPIENT_ADDRESS = "0x00d47AdAcA5e417daCb3936149016737b9fC2F86";

// Montant de tokens à envoyer (en MT, pas en wei)
// Exemple: 100 = 100 MT tokens
const AMOUNT = 100;

// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("🪙  SCRIPT DE TRANSFERT DE TOKENS MT");
  console.log("═".repeat(60) + "\n");

  // Vérifier que l'adresse du destinataire a été modifiée
  if (RECIPIENT_ADDRESS === "0xYOUR_ADDRESS_HERE") {
    console.error("❌ ERREUR: Vous devez modifier RECIPIENT_ADDRESS dans le script !");
    console.log("\n💡 Ouvrez le fichier scripts/transfer-tokens.js");
    console.log("   et changez RECIPIENT_ADDRESS par l'adresse du destinataire\n");
    process.exit(1);
  }

  // Valider l'adresse
  if (!ethers.utils.isAddress(RECIPIENT_ADDRESS)) {
    console.error("❌ ERREUR: RECIPIENT_ADDRESS n'est pas une adresse valide !");
    console.log("   Adresse fournie:", RECIPIENT_ADDRESS, "\n");
    process.exit(1);
  }

  // Valider le montant
  if (AMOUNT <= 0) {
    console.error("❌ ERREUR: AMOUNT doit être supérieur à 0 !");
    process.exit(1);
  }

  // Obtenir le signeur (celui qui envoie les tokens)
  const [sender] = await ethers.getSigners();
  
  console.log("📊 Configuration:");
  console.log("   Token Contract:", TOKEN_ADDRESS);
  console.log("   Sender (vous):", sender.address);
  console.log("   Recipient:", RECIPIENT_ADDRESS);
  console.log("   Amount:", AMOUNT, "MT");
  console.log("");

  // Se connecter au contrat Token
  const Token = await ethers.getContractFactory("Token");
  const token = Token.attach(TOKEN_ADDRESS);

  console.log("🔍 Vérification des soldes AVANT le transfert...\n");

  // Vérifier le solde du sender
  const senderBalanceBefore = await token.balanceOf(sender.address);
  const senderBalanceFormatted = ethers.utils.formatEther(senderBalanceBefore);
  
  console.log("   Votre solde:", senderBalanceFormatted, "MT");

  // Vérifier que le sender a assez de tokens
  const amountInWei = ethers.utils.parseEther(AMOUNT.toString());
  
  if (senderBalanceBefore.lt(amountInWei)) {
    console.error("\n❌ ERREUR: Solde insuffisant !");
    console.log("   Vous avez:", senderBalanceFormatted, "MT");
    console.log("   Vous voulez envoyer:", AMOUNT, "MT");
    console.log("\n💡 Vous devez avoir assez de tokens pour effectuer ce transfert.\n");
    process.exit(1);
  }

  // Vérifier le solde du destinataire avant
  const recipientBalanceBefore = await token.balanceOf(RECIPIENT_ADDRESS);
  const recipientBalanceBeforeFormatted = ethers.utils.formatEther(recipientBalanceBefore);
  
  console.log("   Solde du destinataire:", recipientBalanceBeforeFormatted, "MT");
  console.log("");

  // Effectuer le transfert
  console.log("🚀 Envoi des tokens en cours...\n");

  try {
    const tx = await token.transfer(RECIPIENT_ADDRESS, amountInWei);
    
    console.log("   Transaction hash:", tx.hash);
    console.log("   En attente de confirmation...");
    
    const receipt = await tx.wait();
    
    console.log("   ✅ Transaction confirmée !");
    console.log("   Block number:", receipt.blockNumber);
    console.log("   Gas utilisé:", receipt.gasUsed.toString());
    console.log("");

    // Vérifier les soldes APRÈS le transfert
    console.log("🔍 Vérification des soldes APRÈS le transfert...\n");

    const senderBalanceAfter = await token.balanceOf(sender.address);
    const senderBalanceAfterFormatted = ethers.utils.formatEther(senderBalanceAfter);
    
    const recipientBalanceAfter = await token.balanceOf(RECIPIENT_ADDRESS);
    const recipientBalanceAfterFormatted = ethers.utils.formatEther(recipientBalanceAfter);

    console.log("   Votre nouveau solde:", senderBalanceAfterFormatted, "MT");
    console.log("   Nouveau solde du destinataire:", recipientBalanceAfterFormatted, "MT");
    console.log("");

    // Résumé
    console.log("═".repeat(60));
    console.log("✅ TRANSFERT RÉUSSI !");
    console.log("═".repeat(60));
    console.log("");
    console.log("📝 Résumé:");
    console.log("   De:", sender.address);
    console.log("   À:", RECIPIENT_ADDRESS);
    console.log("   Montant:", AMOUNT, "MT");
    console.log("");
    console.log("🔗 Voir la transaction sur Celoscan:");
    console.log("   https://alfajores.celoscan.io/tx/" + tx.hash);
    console.log("");
    console.log("💡 Le destinataire peut maintenant:");
    console.log("   - Rejoindre le DAO (nécessite 100 MT)");
    console.log("   - Créer des proposals");
    console.log("   - Voter sur les proposals");
    console.log("");

  } catch (error) {
    console.error("\n❌ ERREUR lors du transfert:");
    console.error("   Message:", error.message);
    
    if (error.reason) {
      console.error("   Raison:", error.reason);
    }
    
    console.log("");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
