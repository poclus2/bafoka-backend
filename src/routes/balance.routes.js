import express from 'express';
import { balanceController } from '../controllers/balance.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/balance/{address}:
 *   get:
 *     summary: Récupère tous les soldes (CELO + Token)
 *     description: Retourne le solde CELO (natif) et le solde du token personnalisé pour une adresse donnée
 *     tags: [Balance]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Address'
 *         description: Adresse du compte
 *         example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *     responses:
 *       200:
 *         description: Soldes récupérés avec succès
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
 *                   example: Soldes récupérés avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       $ref: '#/components/schemas/Address'
 *                     celo:
 *                       $ref: '#/components/schemas/CeloBalance'
 *                     token:
 *                       $ref: '#/components/schemas/TokenBalance'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:address', balanceController.getBalances);

/**
 * @swagger
 * /api/balance/{address}/celo:
 *   get:
 *     summary: Récupère uniquement le solde CELO
 *     description: Retourne le solde CELO (crypto-monnaie native) pour une adresse donnée
 *     tags: [Balance]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Address'
 *         description: Adresse du compte
 *         example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *     responses:
 *       200:
 *         description: Solde CELO récupéré avec succès
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
 *                   example: Solde CELO récupéré avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       $ref: '#/components/schemas/Address'
 *                     balance:
 *                       $ref: '#/components/schemas/CeloBalance'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:address/celo', balanceController.getCeloBalance);

/**
 * @swagger
 * /api/balance/{address}/token:
 *   get:
 *     summary: Récupère uniquement le solde Token
 *     description: Retourne le solde du token personnalisé de la plateforme pour une adresse donnée
 *     tags: [Balance]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Address'
 *         description: Adresse du compte
 *         example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *     responses:
 *       200:
 *         description: Solde token récupéré avec succès
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
 *                   example: Solde token récupéré avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       $ref: '#/components/schemas/Address'
 *                     balance:
 *                       $ref: '#/components/schemas/TokenBalance'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:address/token', balanceController.getTokenBalance);

export default router;
