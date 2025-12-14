import express from 'express';
import { accountController } from '../controllers/account.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/accounts/create:
 *   post:
 *     summary: Crée un compte wallet à partir d'un numéro de téléphone
 *     description: |
 *       **UNIQUE MÉTHODE DE CRÉATION DE COMPTE**
 *       
 *       Génère un wallet de manière déterministe à partir d'un numéro de téléphone + PIN.
 *       Le même numéro + PIN génère toujours la même adresse.
 *       
 *       ### 🔒 Sécurité
 *       - PIN obligatoire (4 à 8 chiffres)
 *       - Dérivation PBKDF2-SHA256 avec 100,000 itérations
 *       - Salt serveur secret
 *       - **La clé privée n'est JAMAIS retournée**
 *       
 *       ### 🎁 Funding Initial
 *       - **0.1 CELO envoyé automatiquement** au nouveau compte
 *       - Permet de payer les frais de gas dès la création
 *       - Le compte est immédiatement utilisable
 *       
 *       ### 💡 Utilisation
 *       1. Créez votre compte avec votre numéro + PIN
 *       2. Recevez automatiquement 0.1 CELO
 *       3. Récupérez votre adresse publique
 *       4. Utilisez cette adresse pour tous les autres endpoints (balance, transactions, etc.)
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - pin
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Numéro de téléphone au format international (+33...) ou local
 *                 example: "+33612345678"
 *               pin:
 *                 type: string
 *                 description: Code PIN (4 à 8 chiffres OBLIGATOIRE)
 *                 minLength: 4
 *                 maxLength: 8
 *                 pattern: '^[0-9]{4,8}$'
 *                 example: "1234"
 *               country:
 *                 type: string
 *                 description: Code pays ISO (ex FR, US, GB) si numéro local
 *                 example: "FR"
 *           examples:
 *             creation:
 *               summary: Création de compte
 *               value:
 *                 phoneNumber: "+33612345678"
 *                 pin: "1234"
 *             localNumber:
 *               summary: Avec numéro local
 *               value:
 *                 phoneNumber: "0612345678"
 *                 country: "FR"
 *                 pin: "5678"
 *     responses:
 *       201:
 *         description: Compte créé avec succès
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
 *                   example: Compte créé/récupéré avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           description: Adresse publique du wallet
 *                           example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *                         phoneNumber:
 *                           type: string
 *                           example: "+33612345678"
 *                     message:
 *                       type: string
 *                       example: "✅ Wallet créé avec succès ! Utilisez cette adresse pour toutes vos transactions."
 *                     info:
 *                       type: string
 *                       example: "Conservez précieusement votre numéro de téléphone et votre PIN."
 *                     initialFunding:
 *                       type: object
 *                       description: Détails du funding initial (CELO + Tokens)
 *                       properties:
 *                         celo:
 *                           type: object
 *                           properties:
 *                             transactionHash:
 *                               type: string
 *                               example: "0x123..."
 *                             amount:
 *                               type: string
 *                               example: "0.01"
 *                             status:
 *                               type: string
 *                               example: "success"
 *                         token:
 *                           type: object
 *                           properties:
 *                             transactionHash:
 *                               type: string
 *                               example: "0xabc..."
 *                             amount:
 *                               type: string
 *                               example: "3000"
 *                             status:
 *                               type: string
 *                               example: "success"
 *       400:
 *         description: Requête invalide (numéro ou PIN manquant/invalide)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/create', accountController.createAccount);

/**
 * @swagger
 * /api/accounts/verify:
 *   post:
 *     summary: Vérifie l'authentification d'un utilisateur
 *     description: |
 *       Vérifie si un numéro de téléphone + PIN correspondent à une adresse wallet donnée.
 *       
 *       Utile pour l'authentification des utilisateurs avant des opérations sensibles.
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - pin
 *               - address
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Numéro de téléphone
 *                 example: "+33612345678"
 *               pin:
 *                 type: string
 *                 description: Code PIN (4 à 8 chiffres)
 *                 example: "1234"
 *               address:
 *                 type: string
 *                 description: Adresse du wallet à vérifier
 *                 example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *     responses:
 *       200:
 *         description: Résultat de la vérification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "✅ Authentification réussie"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/verify', accountController.verifyAccess);

export default router;
