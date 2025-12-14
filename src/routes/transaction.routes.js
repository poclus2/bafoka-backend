import express from 'express';
import { transactionController } from '../controllers/transaction.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/transactions/{address}:
 *   get:
 *     summary: Récupère toutes les transactions token
 *     description: Retourne l'historique complet des transactions (envoyées et reçues) du token personnalisé pour une adresse donnée
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Address'
 *         description: Adresse du compte
 *         example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *       - in: query
 *         name: fromBlock
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Numéro de bloc de départ (0 par défaut)
 *         example: 0
 *       - in: query
 *         name: toBlock
 *         schema:
 *           type: string
 *         description: Numéro de bloc de fin ou "latest" (latest par défaut)
 *         example: "latest"
 *     responses:
 *       200:
 *         description: Transactions récupérées avec succès
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
 *                   example: Transactions récupérées avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       $ref: '#/components/schemas/Address'
 *                     contractAddress:
 *                       $ref: '#/components/schemas/Address'
 *                     totalTransactions:
 *                       type: integer
 *                       example: 10
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:address', transactionController.getTransactions);

/**
 * @swagger
 * /api/transactions/{address}/sent:
 *   get:
 *     summary: Récupère uniquement les transactions envoyées
 *     description: Retourne l'historique des transactions envoyées (sortantes) du token personnalisé pour une adresse donnée
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Address'
 *         description: Adresse du compte
 *         example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *       - in: query
 *         name: fromBlock
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Numéro de bloc de départ (0 par défaut)
 *       - in: query
 *         name: toBlock
 *         schema:
 *           type: string
 *         description: Numéro de bloc de fin ou "latest" (latest par défaut)
 *     responses:
 *       200:
 *         description: Transactions envoyées récupérées avec succès
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
 *                   example: Transactions envoyées récupérées avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       $ref: '#/components/schemas/Address'
 *                     contractAddress:
 *                       $ref: '#/components/schemas/Address'
 *                     totalTransactions:
 *                       type: integer
 *                       example: 5
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:address/sent', transactionController.getSentTransactions);

/**
 * @swagger
 * /api/transactions/{address}/received:
 *   get:
 *     summary: Récupère uniquement les transactions reçues
 *     description: Retourne l'historique des transactions reçues (entrantes) du token personnalisé pour une adresse donnée
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Address'
 *         description: Adresse du compte
 *         example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *       - in: query
 *         name: fromBlock
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Numéro de bloc de départ (0 par défaut)
 *       - in: query
 *         name: toBlock
 *         schema:
 *           type: string
 *         description: Numéro de bloc de fin ou "latest" (latest par défaut)
 *     responses:
 *       200:
 *         description: Transactions reçues récupérées avec succès
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
 *                   example: Transactions reçues récupérées avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       $ref: '#/components/schemas/Address'
 *                     contractAddress:
 *                       $ref: '#/components/schemas/Address'
 *                     totalTransactions:
 *                       type: integer
 *                       example: 5
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:address/received', transactionController.getReceivedTransactions);

/**
 * @swagger
 * /api/transactions/complete/{address}:
 *   get:
 *     summary: Récupère TOUTES les transactions (version chunked)
 *     description: |
 *       Récupère l'historique complet des transactions en utilisant le chunking pour éviter les limitations des RPC gratuits.
 *       ⚠️ **Spécialement optimisé pour Sepolia et autres réseaux avec limitations de 10,000 blocs**
 *       
 *       Cette endpoint divise automatiquement les requêtes en chunks de 5,000 blocs pour respecter les limitations des RPC gratuits.
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Address'
 *         description: Adresse du compte
 *         example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *       - in: query
 *         name: fromBlock
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Numéro de bloc de départ (0 par défaut pour historique complet)
 *         example: 0
 *       - in: query
 *         name: toBlock
 *         schema:
 *           type: string
 *         description: Numéro de bloc de fin ou "latest" (latest par défaut)
 *         example: "latest"
 *     responses:
 *       200:
 *         description: Toutes les transactions récupérées avec succès
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
 *                   example: "Toutes les transactions récupérées avec succès (3 chunks traités)"
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       $ref: '#/components/schemas/Address'
 *                     contractAddress:
 *                       $ref: '#/components/schemas/Address'
 *                     totalTransactions:
 *                       type: integer
 *                       example: 25
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *                     _info:
 *                       type: object
 *                       description: Informations sur le processus de chunking
 *                       properties:
 *                         method:
 *                           type: string
 *                           example: "chunked"
 *                         chunksProcessed:
 *                           type: integer
 *                           example: 3
 *                         chunkSize:
 *                           type: integer
 *                           example: 5000
 *                         totalBlocks:
 *                           type: integer
 *                           example: 12543
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/complete/:address', transactionController.getTransactionsComplete);

export default router;
