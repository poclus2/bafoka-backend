import { blockchainService } from '../services/blockchain.service.js';
import { phoneWalletService } from '../services/phoneWallet.service.js';
import { gasManager } from '../services/gasManager.service.js';

export const transferController = {
  /**
   * POST /api/transfer
   * Transfère des tokens depuis le compte administrateur
   */
  transferTokens: async (req, res) => {
    try {
      const { toAddress, amount } = req.body;

      // Validation des paramètres
      if (!toAddress || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Adresse de destination et montant requis'
        });
      }

      // Validation de l'adresse
      if (!blockchainService.isValidAddress(toAddress)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse de destination invalide'
        });
      }

      // Validation du montant
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Montant invalide (doit être un nombre positif)'
        });
      }

      const result = await blockchainService.transferTokens(toAddress, amountNum);

      res.status(200).json({
        success: true,
        message: 'Transfert effectué avec succès',
        data: result
      });
    } catch (error) {
      // Gestion des erreurs spécifiques
      if (error.message.includes('Clé privée administrateur non configurée')) {
        return res.status(503).json({
          success: false,
          message: 'Service de transfert non disponible',
          error: 'Configuration administrateur manquante'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors du transfert',
        error: error.message
      });
    }
  },

  /**
   * POST /api/transfer/mint
   * Génère des tokens (Admin uniquement)
   */
  mintTokens: async (req, res) => {
    try {
      const { toAddress, amount } = req.body;

      // Validation des paramètres
      if (!toAddress || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Adresse de destination et montant requis'
        });
      }

      // Validation de l'adresse
      if (!blockchainService.isValidAddress(toAddress)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse de destination invalide'
        });
      }

      const result = await blockchainService.mintTokens(toAddress, amount);

      res.status(200).json({
        success: true,
        message: 'Mint effectué avec succès',
        data: result
      });
    } catch (error) {
      // Gestion des erreurs spécifiques
      if (error.message.includes('Clé privée administrateur non configurée')) {
        return res.status(503).json({
          success: false,
          message: 'Service non disponible',
          error: 'Configuration administrateur manquante'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors du mint',
        error: error.message
      });
    }
  },

  /**
   * POST /api/transfer/phone
   * Transfère des tokens en utilisant l'authentification phone/PIN
   */
  transferTokensWithPhone: async (req, res) => {
    try {
      const { phoneNumber, pin, toAddress, amount } = req.body;

      // Validation des paramètres obligatoires
      if (!phoneNumber || !pin || !toAddress || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Numéro de téléphone, PIN, adresse de destination et montant requis',
          required: ['phoneNumber', 'pin', 'toAddress', 'amount']
        });
      }

      // Validation du PIN
      const pinValidation = phoneWalletService.validatePIN(pin);
      if (!pinValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'PIN invalide',
          error: pinValidation.error
        });
      }

      // Validation du numéro de téléphone
      const phoneValidation = phoneWalletService.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Numéro de téléphone invalide',
          error: phoneValidation.error
        });
      }

      // Validation de l'adresse de destination
      if (!blockchainService.isValidAddress(toAddress)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse de destination invalide'
        });
      }

      // Validation du montant
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Montant invalide (doit être un nombre positif)'
        });
      }

      // Vérifier que l'utilisateur a bien accès à son wallet
      let senderWallet;
      try {
        senderWallet = phoneWalletService.createOrGetWalletFromPhone(phoneNumber, pin);
      } catch (authError) {
        return res.status(401).json({
          success: false,
          message: 'Authentification échouée',
          error: authError.message
        });
      }

      console.log(`📱 Transfert initié par: ${senderWallet.wallet.phoneNumber} (${senderWallet.wallet.address})`);

      // Vérifier et financer le gas si nécessaire
      let gasCheckResult;
      try {
        gasCheckResult = await gasManager.checkAndFundGas(
          senderWallet.wallet.address,
          'token transfer'
        );
      } catch (gasError) {
        return res.status(503).json({
          success: false,
          message: 'Impossible de préparer la transaction',
          error: gasError.message
        });
      }

      // Effectuer le transfert
      const result = await blockchainService.transferTokenWithPhoneAuth(
        phoneNumber,
        pin,
        toAddress,
        amount
      );

      res.status(200).json({
        success: true,
        message: 'Transfert effectué avec succès',
        data: {
          ...result,
          fromPhoneNumber: phoneValidation.formatted, // Numéro formaté
          fromAddress: senderWallet.wallet.address,
          gasFunding: gasCheckResult // Info sur le funding automatique
        }
      });

    } catch (error) {
      console.error('❌ Erreur dans transferTokensWithPhone:', error);

      // Gestion des erreurs spécifiques
      if (error.message.includes('Solde insuffisant')) {
        return res.status(402).json({
          success: false,
          message: 'Solde insuffisant pour effectuer le transfert',
          error: error.message
        });
      }

      if (error.message.includes('Transaction échouée')) {
        return res.status(500).json({
          success: false,
          message: 'Transaction échouée sur la blockchain',
          error: error.message
        });
      }

      if (error.message.includes('Erreur lors de la dérivation')) {
        return res.status(401).json({
          success: false,
          message: 'Erreur d\'authentification',
          error: 'Impossible de générer le wallet avec ces credentials'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur interne lors du transfert',
        error: error.message
      });
    }
  },

  /**
   * GET /api/transfer/estimate
   * Estime les frais de gas pour un transfert
   */
  estimateTransferCost: async (req, res) => {
    try {
      const { toAddress, amount } = req.query;

      if (!toAddress || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Adresse de destination et montant requis'
        });
      }

      if (!blockchainService.isValidAddress(toAddress)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse de destination invalide'
        });
      }

      // Note: Cette fonctionnalité nécessite une estimation de gas
      // Pour l'instant, on retourne une estimation approximative
      res.status(200).json({
        success: true,
        message: 'Estimation des frais',
        data: {
          toAddress,
          amount,
          estimatedGas: 'À implémenter',
          note: 'Fonctionnalité d\'estimation à venir'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'estimation',
        error: error.message
      });
    }
  }
};
