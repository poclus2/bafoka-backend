import { blockchainService } from '../services/blockchain.service.js';

export const balanceController = {
  /**
   * GET /api/balance/:address
   * Récupère le solde CELO et Token d'une adresse
   */
  getBalances: async (req, res) => {
    try {
      const { address } = req.params;

      // Validation de l'adresse
      if (!blockchainService.isValidAddress(address)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse invalide'
        });
      }

      const balances = await blockchainService.getBalances(address);

      res.status(200).json({
        success: true,
        message: 'Soldes récupérés avec succès',
        data: balances
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des soldes',
        error: error.message
      });
    }
  },

  /**
   * GET /api/balance/:address/celo
   * Récupère uniquement le solde CELO d'une adresse
   */
  getCeloBalance: async (req, res) => {
    try {
      const { address } = req.params;

      if (!blockchainService.isValidAddress(address)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse invalide'
        });
      }

      const balance = await blockchainService.getCeloBalance(address);

      res.status(200).json({
        success: true,
        message: 'Solde CELO récupéré avec succès',
        data: {
          address,
          balance
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du solde CELO',
        error: error.message
      });
    }
  },

  /**
   * GET /api/balance/:address/token
   * Récupère uniquement le solde Token d'une adresse
   */
  getTokenBalance: async (req, res) => {
    try {
      const { address } = req.params;

      if (!blockchainService.isValidAddress(address)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse invalide'
        });
      }

      const balance = await blockchainService.getTokenBalance(address);

      res.status(200).json({
        success: true,
        message: 'Solde token récupéré avec succès',
        data: {
          address,
          balance
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du solde token',
        error: error.message
      });
    }
  }
};
