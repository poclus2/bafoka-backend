import { phoneWalletService } from '../services/phoneWallet.service.js';
import { blockchainService } from '../services/blockchain.service.js';
import { config } from '../config/config.js';

export const accountController = {
  /**
   * POST /api/accounts/create
   * Crée ou récupère un wallet à partir d'un numéro de téléphone + PIN
   * Et envoie automatiquement 0.1 CELO au nouveau compte
   */
  createAccount: async (req, res) => {
    try {
      const { phoneNumber, pin, country } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Numéro de téléphone requis'
        });
      }

      if (!pin) {
        return res.status(400).json({
          success: false,
          message: 'Code PIN requis (4 à 8 chiffres)'
        });
      }

      // Validation du numéro
      const validation = phoneWalletService.validatePhoneNumber(phoneNumber, country || 'FR');

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Numéro de téléphone invalide',
          error: validation.error,
          hint: 'Utilisez le format international avec indicatif (ex: +33612345678) ou le format local si vous spécifiez le pays'
        });
      }

      // Création/récupération du wallet
      const result = phoneWalletService.createOrGetWalletFromPhone(
        phoneNumber,
        pin
      );

      // Envoi automatique de CELO au nouveau compte (montant configurable)
      let fundingTransaction = null;
      try {
        // L'adresse est dans result.wallet.address
        const walletAddress = result.wallet.address;
        const fundingAmount = config.initialWalletFunding.toString();
        console.log(`🎁 Envoi de ${fundingAmount} CELO au nouveau compte ${walletAddress}...`);

        fundingTransaction = await blockchainService.sendCelo(walletAddress, fundingAmount);
        console.log(`✅ Funding CELO réussi! TxHash: ${fundingTransaction.transactionHash}`);

        // Funding initial en Tokens Bafoka (3000 BFK)
        console.log(`🪙 Mint de 3000 BFK pour ${walletAddress}...`);
        const mintTransaction = await blockchainService.mintTokens(walletAddress, "3000");
        console.log(`✅ Mint BFK réussi! TxHash: ${mintTransaction.transactionHash}`);

        fundingTransaction = {
          celo: fundingTransaction,
          token: mintTransaction
        };

      } catch (fundingError) {
        console.error('⚠️  Erreur lors du funding initial:', fundingError.message);
        // On ne bloque pas la création du compte même si le funding échoue
        fundingTransaction = {
          error: fundingError.message,
          status: 'failed'
        };
      }

      res.status(201).json({
        success: true,
        message: 'Compte créé/récupéré avec succès',
        data: {
          ...result,
          initialFunding: fundingTransaction
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du compte',
        error: error.message
      });
    }
  },

  /**
   * POST /api/accounts/verify
   * Vérifie l'accès à un wallet (authentification)
   */
  verifyAccess: async (req, res) => {
    try {
      const { phoneNumber, pin, address } = req.body;

      if (!phoneNumber || !address || !pin) {
        return res.status(400).json({
          success: false,
          message: 'Numéro de téléphone, PIN et adresse requis'
        });
      }

      const isValid = phoneWalletService.verifyWalletAccess(
        phoneNumber,
        pin,
        address
      );

      res.status(200).json({
        success: true,
        data: {
          isValid,
          message: isValid
            ? '✅ Authentification réussie'
            : '❌ Authentification échouée - Vérifiez votre numéro et PIN'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification',
        error: error.message
      });
    }
  }
};
