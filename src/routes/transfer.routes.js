import express from 'express';
import { transferController } from '../controllers/transfer.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/transfer:
 *   post:
 *     summary: Transfère des tokens
 *     description: |
 *       Effectue un transfert de tokens depuis le compte administrateur vers une adresse destinataire.
 *       
 *       ⚠️ **Prérequis** : La variable d'environnement `ADMIN_PRIVATE_KEY` doit être configurée.
 *       
 *       Cette fonctionnalité permet de distribuer des tokens aux utilisateurs de la plateforme.
 *     tags: [Transfer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toAddress
 *               - amount
 *             properties:
 *               toAddress:
 *                 $ref: '#/components/schemas/Address'
 *                 description: Adresse du destinataire
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 description: Montant à transférer (en unités token, pas en wei)
 *                 example: 100
 *           examples:
 *             transfer100Tokens:
 *               summary: Transférer 100 tokens
 *               value:
 *                 toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *                 amount: 100
 *             transfer0.5Tokens:
 *               summary: Transférer 0.5 token
 *               value:
 *                 toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *                 amount: 0.5
 *     responses:
 *       200:
 *         description: Transfert effectué avec succès
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
 *                   example: Transfert effectué avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     transactionHash:
 *                       type: string
 *                       example: "0x1234567890abcdef..."
 *                     blockNumber:
 *                       type: integer
 *                       example: 12345678
 *                     from:
 *                       $ref: '#/components/schemas/Address'
 *                     to:
 *                       $ref: '#/components/schemas/Address'
 *                     amount:
 *                       $ref: '#/components/schemas/Balance'
 *                     gasUsed:
 *                       type: string
 *                       example: "52000"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         description: Service de transfert non disponible (clé privée admin non configurée)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Service de transfert non disponible
 *                 error:
 *                   type: string
 *                   example: Configuration administrateur manquante
 */
router.post('/', transferController.transferTokens);

/**
 * @swagger
 * /api/transfer/mint:
 *   post:
 *     summary: Génère de nouveaux tokens (Admin uniquement)
 *     description: |
 *       Génère (mint) de nouveaux tokens Bafoka vers une adresse donnée.
 *       
 *       ⚠️ **Prérequis** : Clé privée Admin configurée et doit être propriéaire du contrat.
 *     tags: [Transfer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toAddress
 *               - amount
 *             properties:
 *               toAddress:
 *                 $ref: '#/components/schemas/Address'
 *                 description: Adresse du destinataire
 *               amount:
 *                 type: string
 *                 description: Montant à générer
 *                 example: "1000"
 *     responses:
 *       200:
 *         description: Mint effectué avec succès
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/mint', transferController.mintTokens);

/**
 * @swagger
 * /api/transfer/phone:
 *   post:
 *     summary: Transfère des tokens avec authentification téléphone/PIN
 *     description: |
 *       Effectue un transfert de tokens en utilisant l'authentification par numéro de téléphone et PIN.
 *       
 *       Le système régénère l'adresse de l'expéditeur à partir de son numéro de téléphone et PIN,
 *       puis signe la transaction avec sa clé privée dérivée de manière déterministe.
 *       
 *       ⚠️ **Important** : 
 *       - Le PIN doit contenir entre 4 et 8 chiffres
 *       - Le numéro de téléphone doit être au format international (+33...)
 *       - L'expéditeur doit avoir suffisamment de tokens pour le transfert + frais de gas
 *     tags: [Transfer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - pin
 *               - toAddress
 *               - amount
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Numéro de téléphone de l'expéditeur (format international recommandé)
 *                 pattern: '^[+]?[0-9\s\-\(\)\.]+$'
 *                 example: "+33612345678"
 *               pin:
 *                 type: string
 *                 description: Code PIN (4-8 chiffres)
 *                 pattern: '^\d{4,8}$'
 *                 example: "1234"
 *               toAddress:
 *                 $ref: '#/components/schemas/Address'
 *                 description: Adresse du destinataire
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 description: Montant à transférer (en unités token)
 *                 example: 50
 *           examples:
 *             transferFromPhone:
 *               summary: Transfert depuis un compte téléphone
 *               value:
 *                 phoneNumber: "+33612345678"
 *                 pin: "1234"
 *                 toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *                 amount: 50
 *     responses:
 *       200:
 *         description: Transfert effectué avec succès
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
 *                   example: Transfert effectué avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     transactionHash:
 *                       type: string
 *                       example: "0xabcd1234567890ef..."
 *                     blockNumber:
 *                       type: integer
 *                       example: 12345679
 *                     from:
 *                       $ref: '#/components/schemas/Address'
 *                       description: Adresse générée à partir du téléphone/PIN
 *                     to:
 *                       $ref: '#/components/schemas/Address'
 *                     amount:
 *                       type: string
 *                       example: "50"
 *                     amountInWei:
 *                       type: string
 *                       example: "50000000000000000000"
 *                     gasUsed:
 *                       type: string
 *                       example: "52000"
 *                     gasPrice:
 *                       type: string
 *                       example: "20000000000"
 *                     status:
 *                       type: string
 *                       example: "confirmed"
 *                     networkUsed:
 *                       type: string
 *                       example: "sepolia"
 *                     chainId:
 *                       type: integer
 *                       example: 11155111
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     fromPhoneNumber:
 *                       type: string
 *                       example: "+33612345678"
 *                     fromAddress:
 *                       $ref: '#/components/schemas/Address'
 *       400:
 *         description: Paramètres invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "PIN invalide"
 *                 error:
 *                   type: string
 *                   example: "Le PIN doit contenir entre 4 et 8 chiffres"
 *                 required:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["phoneNumber", "pin", "toAddress", "amount"]
 *       401:
 *         description: Authentification échouée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Authentification échouée"
 *                 error:
 *                   type: string
 *                   example: "Le PIN doit contenir uniquement des chiffres"
 *       402:
 *         description: Solde insuffisant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Solde insuffisant pour effectuer le transfert"
 *                 error:
 *                   type: string
 *                   example: "Solde insuffisant. Balance: 10.5 tokens, demandé: 50 tokens"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/phone', transferController.transferTokensWithPhone);

/**
 * @swagger
 * /api/transfer/estimate:
 *   get:
 *     summary: Estime les frais de gas pour un transfert
 *     description: |
 *       Calcule une estimation des frais de gas nécessaires pour effectuer un transfert.
 *       
 *       ⚠️ **Note** : Cette fonctionnalité est en cours de développement et retourne actuellement une estimation approximative.
 *     tags: [Transfer]
 *     parameters:
 *       - in: query
 *         name: toAddress
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Address'
 *         description: Adresse de destination
 *         example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *           minimum: 0
 *           exclusiveMinimum: true
 *         description: Montant à transférer
 *         example: 100
 *     responses:
 *       200:
 *         description: Estimation des frais
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
 *                   example: Estimation des frais
 *                 data:
 *                   type: object
 *                   properties:
 *                     toAddress:
 *                       $ref: '#/components/schemas/Address'
 *                     amount:
 *                       type: number
 *                       example: 100
 *                     estimatedGas:
 *                       type: string
 *                       example: À implémenter
 *                     note:
 *                       type: string
 *                       example: Fonctionnalité d'estimation à venir
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/estimate', transferController.estimateTransferCost);

export default router;
