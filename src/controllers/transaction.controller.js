import { blockchainService } from '../services/blockchain.service.js';

export const transactionController = {
  /**
   * GET /api/transactions/:address
   * Récupère la liste des transactions token pour une adresse
   */
  getTransactions: async (req, res) => {
    try {
      const { address } = req.params;
      let { fromBlock, toBlock } = req.query;

      // Validation de l'adresse
      if (!blockchainService.isValidAddress(address)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse invalide'
        });
      }

      // Normalisation des paramètres de bloc
      // Si fromBlock est fourni et est un nombre, le convertir en entier
      if (fromBlock !== undefined && fromBlock !== null && fromBlock !== '') {
        if (fromBlock !== 'latest' && fromBlock !== 'earliest' && fromBlock !== 'pending') {
          const parsed = parseInt(fromBlock, 10);
          if (isNaN(parsed) || parsed < 0) {
            return res.status(400).json({
              success: false,
              message: 'fromBlock doit être un nombre positif ou "latest"'
            });
          }
          fromBlock = parsed;
        }
      } else {
        fromBlock = 0;
      }

      // Si toBlock est fourni et est un nombre, le convertir en entier
      if (toBlock !== undefined && toBlock !== null && toBlock !== '') {
        if (toBlock !== 'latest' && toBlock !== 'earliest' && toBlock !== 'pending') {
          const parsed = parseInt(toBlock, 10);
          if (isNaN(parsed) || parsed < 0) {
            return res.status(400).json({
              success: false,
              message: 'toBlock doit être un nombre positif ou "latest"'
            });
          }
          toBlock = parsed;
        }
      } else {
        toBlock = 'latest';
      }

      const transactions = await blockchainService.getTokenTransactions(
        address,
        fromBlock,
        toBlock
      );

      res.status(200).json({
        success: true,
        message: 'Transactions récupérées avec succès',
        data: transactions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des transactions',
        error: error.message
      });
    }
  },

  /**
   * GET /api/transactions/:address/sent
   * Récupère uniquement les transactions envoyées
   */
  getSentTransactions: async (req, res) => {
    try {
      const { address } = req.params;
      let { fromBlock, toBlock } = req.query;

      if (!blockchainService.isValidAddress(address)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse invalide'
        });
      }

      // Normalisation des paramètres de bloc
      if (fromBlock !== undefined && fromBlock !== null && fromBlock !== '') {
        if (fromBlock !== 'latest' && fromBlock !== 'earliest' && fromBlock !== 'pending') {
          const parsed = parseInt(fromBlock, 10);
          if (!isNaN(parsed) && parsed >= 0) {
            fromBlock = parsed;
          }
        }
      } else {
        fromBlock = 0;
      }

      if (toBlock !== undefined && toBlock !== null && toBlock !== '') {
        if (toBlock !== 'latest' && toBlock !== 'earliest' && toBlock !== 'pending') {
          const parsed = parseInt(toBlock, 10);
          if (!isNaN(parsed) && parsed >= 0) {
            toBlock = parsed;
          }
        }
      } else {
        toBlock = 'latest';
      }

      const result = await blockchainService.getTokenTransactions(
        address,
        fromBlock,
        toBlock
      );

      const sentTransactions = result.transactions.filter(tx => tx.type === 'sent');

      res.status(200).json({
        success: true,
        message: 'Transactions envoyées récupérées avec succès',
        data: {
          address: result.address,
          contractAddress: result.contractAddress,
          totalTransactions: sentTransactions.length,
          transactions: sentTransactions
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des transactions',
        error: error.message
      });
    }
  },

  /**
   * GET /api/transactions/:address/received
   * Récupère uniquement les transactions reçues
   */
  getReceivedTransactions: async (req, res) => {
    try {
      const { address } = req.params;
      let { fromBlock, toBlock } = req.query;

      if (!blockchainService.isValidAddress(address)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse invalide'
        });
      }

      // Normalisation des paramètres de bloc
      if (fromBlock !== undefined && fromBlock !== null && fromBlock !== '') {
        if (fromBlock !== 'latest' && fromBlock !== 'earliest' && fromBlock !== 'pending') {
          const parsed = parseInt(fromBlock, 10);
          if (!isNaN(parsed) && parsed >= 0) {
            fromBlock = parsed;
          }
        }
      } else {
        fromBlock = 0;
      }

      if (toBlock !== undefined && toBlock !== null && toBlock !== '') {
        if (toBlock !== 'latest' && toBlock !== 'earliest' && toBlock !== 'pending') {
          const parsed = parseInt(toBlock, 10);
          if (!isNaN(parsed) && parsed >= 0) {
            toBlock = parsed;
          }
        }
      } else {
        toBlock = 'latest';
      }

      const result = await blockchainService.getTokenTransactions(
        address,
        fromBlock,
        toBlock
      );

      const receivedTransactions = result.transactions.filter(tx => tx.type === 'received');

      res.status(200).json({
        success: true,
        message: 'Transactions reçues récupérées avec succès',
        data: {
          address: result.address,
          contractAddress: result.contractAddress,
          totalTransactions: receivedTransactions.length,
          transactions: receivedTransactions
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des transactions',
        error: error.message
      });
    }
  },

  /**
   * GET /api/transactions/complete/:address
   * Récupère TOUTES les transactions token pour une adresse (chunked pour RPC limités)
   */
  getTransactionsComplete: async (req, res) => {
    try {
      const { address } = req.params;
      let { fromBlock, toBlock } = req.query;

      // Validation de l'adresse
      if (!blockchainService.isValidAddress(address)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse invalide'
        });
      }

      // Normalisation des paramètres de bloc
      if (fromBlock !== undefined && fromBlock !== null && fromBlock !== '') {
        if (fromBlock !== 'latest' && fromBlock !== 'earliest' && fromBlock !== 'pending') {
          const parsed = parseInt(fromBlock, 10);
          if (isNaN(parsed) || parsed < 0) {
            return res.status(400).json({
              success: false,
              message: 'fromBlock doit être un nombre positif ou "latest"'
            });
          }
          fromBlock = parsed;
        }
      } else {
        fromBlock = 0;
      }

      if (toBlock !== undefined && toBlock !== null && toBlock !== '') {
        if (toBlock !== 'latest' && toBlock !== 'earliest' && toBlock !== 'pending') {
          const parsed = parseInt(toBlock, 10);
          if (isNaN(parsed) || parsed < 0) {
            return res.status(400).json({
              success: false,
              message: 'toBlock doit être un nombre positif or "latest"'
            });
          }
          toBlock = parsed;
        }
      } else {
        toBlock = 'latest';
      }

      const result = await blockchainService.getTokenTransactionsComplete(
        address,
        fromBlock,
        toBlock
      );

      res.status(200).json({
        success: true,
        message: `Toutes les transactions récupérées avec succès (${result._info.chunksProcessed} chunks traités)`,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération complète des transactions',
        error: error.message
      });
    }
  }
};
