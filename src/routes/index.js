import express from 'express';
import accountRoutes from './account.routes.js';
import balanceRoutes from './balance.routes.js';
import transactionRoutes from './transaction.routes.js';
import transferRoutes from './transfer.routes.js';
import governanceRoutes from './governance.routes.js';
import { blockchainService } from '../services/blockchain.service.js';
import { config } from '../config/config.js';

const router = express.Router();

// Routes de l'API
router.use('/accounts', accountRoutes);
router.use('/balance', balanceRoutes);
router.use('/transactions', transactionRoutes);
router.use('/transfer', transferRoutes);
router.use('/governance', governanceRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Vérifie l'état de santé de l'API
 *     description: Retourne l'état du service, les informations du réseau blockchain et les adresses des contrats déployés
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API opérationnelle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: API opérationnelle
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-12T10:30:00.000Z"
 *                     network:
 *                       $ref: '#/components/schemas/NetworkInfo'
 *                     contracts:
 *                       type: object
 *                       properties:
 *                         token:
 *                           $ref: '#/components/schemas/Address'
 *                         dao:
 *                           $ref: '#/components/schemas/Address'
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */
router.get('/health', async (req, res) => {
  try {
    const networkInfo = await blockchainService.getNetworkInfo();
    
    res.status(200).json({
      success: true,
      message: 'API opérationnelle',
      data: {
        timestamp: new Date().toISOString(),
        network: networkInfo,
        contracts: {
          token: config.tokenContractAddress,
          dao: config.daoContractAddress
        },
        version: '1.0.0'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service partiellement disponible',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Page d'accueil de l'API
 *     description: Retourne la liste de tous les endpoints disponibles et les informations générales de l'API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Informations de l'API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Bienvenue sur l'API Token Gated DAO
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 endpoints:
 *                   type: object
 *                   description: Liste organisée de tous les endpoints
 *                 documentation:
 *                   type: string
 *                   example: Consultez le README.md pour plus d'informations
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bienvenue sur l\'API Token Gated DAO',
    version: '1.0.0',
    endpoints: {
      accounts: {
        create: 'POST /api/accounts/create - Créer un compte avec numéro + PIN',
        verify: 'POST /api/accounts/verify - Vérifier l\'authentification'
      },
      balance: {
        getAll: 'GET /api/balance/:address',
        getCelo: 'GET /api/balance/:address/celo',
        getToken: 'GET /api/balance/:address/token'
      },
      transactions: {
        getAll: 'GET /api/transactions/:address',
        getSent: 'GET /api/transactions/:address/sent',
        getReceived: 'GET /api/transactions/:address/received'
      },
      transfer: {
        send: 'POST /api/transfer',
        estimate: 'GET /api/transfer/estimate'
      },
      governance: {
        dashboard: 'GET /api/governance/dashboard',
        registerMember: 'POST /api/governance/members/register',
        checkEligibility: 'GET /api/governance/members/:address/eligibility',
        createProposal: 'POST /api/governance/proposals',
        listProposals: 'GET /api/governance/proposals',
        getProposal: 'GET /api/governance/proposals/:id',
        voteProposal: 'POST /api/governance/proposals/:id/vote',
        moderateProposal: 'POST /api/governance/proposals/:id/moderate',
        executeProposal: 'POST /api/governance/proposals/:id/execute',
        raiseContest: 'POST /api/governance/proposals/:id/contest',
        resolveContest: 'POST /api/governance/contests/:id/resolve'
      },
      system: {
        health: 'GET /api/health'
      }
    },
    documentation: 'Consultez le README.md pour plus d\'informations'
  });
});

export default router;
