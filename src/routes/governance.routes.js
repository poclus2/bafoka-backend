import express from 'express';
import * as governanceController from '../controllers/governance.controller.js';

/**
 * Routes pour le système de gouvernance DAO
 * 
 * Ce fichier définit toutes les routes pour la gouvernance avec documentation Swagger.
 * Toutes les routes suivent les spécifications décrites dans gov.md
 * 
 * Architecture des routes :
 * - /members : Gestion des membres de la DAO
 * - /proposals : Cycle complet des propositions
 * - /contests : Système de contestation
 * - /dashboard : Analytics et vue d'ensemble
 */

const router = express.Router();

/*//////////////////////////////////////////////////////////////
                        MEMBER ROUTES
//////////////////////////////////////////////////////////////*/

/**
 * @swagger
 * components:
 *   schemas:
 *     MemberRegistration:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           format: address
 *           description: Adresse Ethereum du membre (optionnel si phoneNumber+pin fournis)
 *           example: "0x742d35Cc6634C0532925a3b8D1C9bac1e4bAfDd"
 *         phoneNumber:
 *           type: string
 *           description: Numéro de téléphone pour wallet (optionnel si address fournie)
 *           example: "+33123456789"
 *         pin:
 *           type: string
 *           description: PIN pour débloquer le wallet (requis avec phoneNumber)
 *           example: "1234"
 *         country:
 *           type: string
 *           description: Code pays (optionnel)
 *           example: "FR"
 *       anyOf:
 *         - required: [address]
 *         - required: [phoneNumber, pin]
 * 
 *     MemberEligibility:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           format: address
 *           description: Adresse du membre vérifié
 *         isEligible:
 *           type: boolean
 *           description: Membre éligible pour participer
 *         memberInfo:
 *           type: object
 *           properties:
 *             registered:
 *               type: boolean
 *               description: Membre enregistré dans la DAO
 *             isInAllowList:
 *               type: boolean
 *               description: Membre dans la liste d'autorisation
 *             isActive:
 *               type: boolean
 *               description: Membre actif (non désactivé)
 *             transactionCount:
 *               type: number
 *               description: Nombre de transactions sur la blockchain
 *         blockchainInfo:
 *           type: object
 *           properties:
 *             transactionCount:
 *               type: number
 *               description: Transactions effectuées par le compte
 *               minimum: 10
 *             accountAge:
 *               type: number
 *               description: Âge du compte en jours
 *               minimum: 90
 *         requirements:
 *           type: object
 *           properties:
 *             minTransactions:
 *               type: number
 *               description: Minimum de transactions requis
 *               example: 10
 *             minAccountAge:
 *               type: number
 *               description: Âge minimum requis en jours
 *               example: 90
 *         checks:
 *           type: object
 *           properties:
 *             hasEnoughTransactions:
 *               type: boolean
 *             isOldEnough:
 *               type: boolean
 *             isRegistered:
 *               type: boolean
 *             isActive:
 *               type: boolean
 *             isInAllowList:
 *               type: boolean
 *         nextSteps:
 *           type: string
 *           description: Actions recommandées pour le membre
 */

/**
 * @swagger
 * /api/governance/members/register:
 *   post:
 *     summary: Enregistre un nouveau membre dans la DAO
 *     description: |
 *       Enregistre un membre après vérification d'éligibilité.
 *       
 *       **Critères d'éligibilité :**
 *       - Au moins 10 transactions sur la blockchain
 *       - Compte âgé d'au moins 3 mois (90 jours)
 *       
 *       **Authentification :**
 *       - Via adresse Ethereum directe
 *       - Via téléphone + PIN (wallet phone-based)
 *     tags:
 *       - Members
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MemberRegistration'
 *           examples:
 *             withAddress:
 *               summary: Enregistrement avec adresse
 *               value:
 *                 address: "0x742d35Cc6634C0532925a3b8D1C9bac1e4bAfDd"
 *                 country: "FR"
 *             withPhone:
 *               summary: Enregistrement avec téléphone
 *               value:
 *                 phoneNumber: "+33123456789"
 *                 pin: "1234"
 *                 country: "FR"
 *     responses:
 *       201:
 *         description: Membre enregistré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 member:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       format: address
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                     transactionCount:
 *                       type: number
 *                     accountAge:
 *                       type: number
 *                     registeredAt:
 *                       type: string
 *                       format: date-time
 *                     eligibilityChecks:
 *                       type: object
 *                       properties:
 *                         transactionCount:
 *                           type: boolean
 *                         accountAge:
 *                           type: boolean
 *                 txHash:
 *                   type: string
 *                   description: Hash de la transaction d'enregistrement
 *                 blockNumber:
 *                   type: number
 *                   description: Numéro de bloc de confirmation
 *                 message:
 *                   type: string
 *       400:
 *         description: Erreur de validation ou critères non remplis
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
 *                 details:
 *                   type: object
 *                   properties:
 *                     currentTransactions:
 *                       type: number
 *                     requiredTransactions:
 *                       type: number
 *                     accountAge:
 *                       type: number
 *       500:
 *         description: Erreur serveur
 */
router.post('/members/register', governanceController.registerMember);

/**
 * @swagger
 * /api/governance/members/{address}/eligibility:
 *   get:
 *     summary: Vérifie l'éligibilité d'un membre
 *     description: |
 *       Vérifie si une adresse répond aux critères d'éligibilité pour participer à la gouvernance.
 *       
 *       Cette route est publique et peut être utilisée avant l'enregistrement.
 *     tags:
 *       - Members
 *     parameters:
 *       - name: address
 *         in: path
 *         required: true
 *         description: Adresse Ethereum du membre
 *         schema:
 *           type: string
 *           format: address
 *           example: "0x742d35Cc6634C0532925a3b8D1C9bac1e4bAfDd"
 *     responses:
 *       200:
 *         description: Informations d'éligibilité récupérées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 eligibility:
 *                   $ref: '#/components/schemas/MemberEligibility'
 *       400:
 *         description: Adresse invalide
 *       500:
 *         description: Erreur serveur
 */
router.get('/members/:address/eligibility', governanceController.checkMemberEligibility);

/**
 * @swagger
 * /api/governance/members/{address}:
 *   delete:
 *     summary: Désenregistre un membre (Admin seulement)
 *     description: |
 *       Supprime un membre de la DAO. Cette action est réservée aux administrateurs
 *       et est irréversible.
 *     tags:
 *       - Members
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - name: address
 *         in: path
 *         required: true
 *         description: Adresse du membre à désenregistrer
 *         schema:
 *           type: string
 *           format: address
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Raison du désenregistrement
 *                 example: "Violation des règles de la DAO"
 *     responses:
 *       200:
 *         description: Membre désenregistré avec succès
 *       403:
 *         description: Accès refusé - droits admin requis
 *       500:
 *         description: Erreur serveur
 */
router.delete('/members/:address', governanceController.deregisterMember);

/*//////////////////////////////////////////////////////////////
                      PROPOSAL ROUTES
//////////////////////////////////////////////////////////////*/

/**
 * @swagger
 * components:
 *   schemas:
 *     ProposalCreation:
 *       type: object
 *       properties:
 *         proposerAddress:
 *           type: string
 *           format: address
 *           description: Adresse du proposant (optionnel si phoneNumber+pin)
 *         phoneNumber:
 *           type: string
 *           description: Téléphone pour authentification wallet
 *           example: "+33123456789"
 *         pin:
 *           type: string
 *           description: PIN pour débloquer wallet
 *           example: "1234"
 *         title:
 *           type: string
 *           description: Titre de la proposition
 *           maxLength: 200
 *           example: "Amélioration du système de gouvernance"
 *         description:
 *           type: string
 *           description: Description courte (détails complets dans IPFS)
 *           maxLength: 500
 *           example: "Proposition d'amélioration du processus de vote"
 *         ipfsCID:
 *           type: string
 *           description: CID IPFS du contenu détaillé de la proposition
 *           example: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
 *         impactLevel:
 *           type: number
 *           description: Niveau d'impact (0=Faible, 1=Modéré, 2=Fort)
 *           enum: [0, 1, 2]
 *           example: 1
 *       anyOf:
 *         - required: [proposerAddress, title, ipfsCID, impactLevel]
 *         - required: [phoneNumber, pin, title, ipfsCID, impactLevel]
 * 
 *     Proposal:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           description: ID unique de la proposition
 *         proposer:
 *           type: string
 *           format: address
 *           description: Adresse du proposant
 *         title:
 *           type: string
 *           description: Titre de la proposition
 *         description:
 *           type: string
 *           description: Description courte
 *         ipfsCID:
 *           type: string
 *           description: CID IPFS du contenu complet
 *         impactLevel:
 *           type: number
 *           enum: [0, 1, 2]
 *         impactLevelText:
 *           type: string
 *           enum: ["Faible", "Modéré", "Fort"]
 *         status:
 *           type: number
 *           enum: [0, 1, 2, 3, 4, 5]
 *         statusText:
 *           type: string
 *           enum: ["En attente", "Actif", "Adopté", "Rejeté", "Exécuté", "Annulé"]
 *         votesFor:
 *           type: number
 *           description: Nombre de votes favorables
 *         votesAgainst:
 *           type: number
 *           description: Nombre de votes défavorables
 *         startBlock:
 *           type: number
 *           description: Bloc de début du vote
 *         endBlock:
 *           type: number
 *           description: Bloc de fin du vote
 *         votingProgress:
 *           type: object
 *           properties:
 *             totalVotes:
 *               type: number
 *             votesFor:
 *               type: number
 *             votesAgainst:
 *               type: number
 *             supportPercentage:
 *               type: number
 *               minimum: 0
 *               maximum: 100
 *         timing:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               format: date-time
 *             endDate:
 *               type: string
 *               format: date-time
 *             isVotingActive:
 *               type: boolean
 *             timeRemaining:
 *               type: number
 *               description: Temps restant en millisecondes
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/governance/proposals:
 *   post:
 *     summary: Crée une nouvelle proposition
 *     description: |
 *       Crée une proposition qui passera par le cycle de modération puis de vote.
 *       
 *       **Prérequis :**
 *       - Être un membre enregistré et éligible
 *       - Fournir un contenu détaillé sur IPFS
 *       - Authentification par téléphone+PIN ou adresse
 *     tags:
 *       - Proposals
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProposalCreation'
 *           examples:
 *             phoneAuth:
 *               summary: Création avec authentification téléphone
 *               value:
 *                 phoneNumber: "+33123456789"
 *                 pin: "1234"
 *                 title: "Amélioration du système de vote"
 *                 description: "Proposition pour optimiser le processus de vote"
 *                 ipfsCID: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
 *                 impactLevel: 1
 *     responses:
 *       201:
 *         description: Proposition créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 proposal:
 *                   $ref: '#/components/schemas/Proposal'
 *                 txHash:
 *                   type: string
 *                 blockNumber:
 *                   type: number
 *                 message:
 *                   type: string
 *       400:
 *         description: Erreur de validation ou membre non éligible
 *       403:
 *         description: Membre non autorisé
 *       500:
 *         description: Erreur serveur
 *   get:
 *     summary: Liste les propositions avec filtres et pagination
 *     description: |
 *       Récupère une liste paginée de propositions avec possibilité de filtrage.
 *       
 *       **Filtres disponibles :**
 *       - Par statut (pending, active, succeeded, etc.)
 *       - Par niveau d'impact
 *       - Par proposant
 *       - Par période de blocs
 *     tags:
 *       - Proposals
 *     parameters:
 *       - name: status
 *         in: query
 *         description: Filtre par statut (0-5)
 *         schema:
 *           type: number
 *           enum: [0, 1, 2, 3, 4, 5]
 *       - name: impactLevel
 *         in: query
 *         description: Filtre par niveau d'impact (0-2)
 *         schema:
 *           type: number
 *           enum: [0, 1, 2]
 *       - name: proposer
 *         in: query
 *         description: Filtre par adresse du proposant
 *         schema:
 *           type: string
 *           format: address
 *       - name: fromBlock
 *         in: query
 *         description: Bloc de début pour la recherche
 *         schema:
 *           type: string
 *           default: "earliest"
 *       - name: toBlock
 *         in: query
 *         description: Bloc de fin pour la recherche
 *         schema:
 *           type: string
 *           default: "latest"
 *       - name: page
 *         in: query
 *         description: Numéro de page
 *         schema:
 *           type: number
 *           default: 1
 *           minimum: 1
 *       - name: limit
 *         in: query
 *         description: Nombre d'éléments par page
 *         schema:
 *           type: number
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *       - name: sortBy
 *         in: query
 *         description: Champ de tri
 *         schema:
 *           type: string
 *           enum: ["createdAt", "startBlock", "endBlock", "status", "impactLevel"]
 *           default: "createdAt"
 *       - name: sortOrder
 *         in: query
 *         description: Ordre de tri
 *         schema:
 *           type: string
 *           enum: ["asc", "desc"]
 *           default: "desc"
 *     responses:
 *       200:
 *         description: Liste des propositions récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 proposals:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Proposal'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *                 filters:
 *                   type: object
 *                 sorting:
 *                   type: object
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     byStatus:
 *                       type: object
 *                     byImpactLevel:
 *                       type: object
 *       500:
 *         description: Erreur serveur
 */
router.post('/proposals', governanceController.createProposal);
router.get('/proposals', governanceController.listProposals);

/**
 * @swagger
 * /api/governance/proposals/{proposalId}:
 *   get:
 *     summary: Récupère une proposition par ID
 *     description: |
 *       Récupère les détails complets d'une proposition, incluant :
 *       - Informations de base (titre, description, proposant)
 *       - Statut et progression du vote
 *       - Timing (dates de début/fin, temps restant)
 *       - Résultats de vote actuels
 *     tags:
 *       - Proposals
 *     parameters:
 *       - name: proposalId
 *         in: path
 *         required: true
 *         description: ID unique de la proposition
 *         schema:
 *           type: number
 *           example: 1
 *     responses:
 *       200:
 *         description: Détails de la proposition récupérés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 proposal:
 *                   $ref: '#/components/schemas/Proposal'
 *       404:
 *         description: Proposition non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get('/proposals/:proposalId', governanceController.getProposal);

/**
 * @swagger
 * /api/governance/proposals/{proposalId}/moderate:
 *   post:
 *     summary: Modère une proposition (Modérateurs seulement)
 *     description: |
 *       Permet aux modérateurs de décider du sort d'une proposition :
 *       - Approuver (passage au vote)
 *       - Rejeter (fin du processus)
 *       - Demander des modifications
 *     tags:
 *       - Proposals
 *     security:
 *       - ModeratorAuth: []
 *     parameters:
 *       - name: proposalId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: number
 *                 enum: [0, 1, 2]
 *                 description: "0=Approuver, 1=Rejeter, 2=Demander modifications"
 *                 example: 0
 *               note:
 *                 type: string
 *                 description: Note explicative de la décision
 *                 example: "Proposition conforme aux standards de la DAO"
 *     responses:
 *       200:
 *         description: Modération effectuée avec succès
 *       400:
 *         description: Décision invalide
 *       403:
 *         description: Accès refusé - droits modérateur requis
 *       500:
 *         description: Erreur serveur
 */
router.post('/proposals/:proposalId/moderate', governanceController.moderateProposal);

/**
 * @swagger
 * /api/governance/proposals/{proposalId}/vote:
 *   post:
 *     summary: Vote sur une proposition
 *     description: |
 *       Permet aux membres éligibles de voter pour ou contre une proposition active.
 *       
 *       **Règles de vote :**
 *       - Un vote par membre par proposition
 *       - Vote seulement pendant la période de vote
 *       - Membre doit être éligible et enregistré
 *     tags:
 *       - Proposals
 *     parameters:
 *       - name: proposalId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voterAddress:
 *                 type: string
 *                 format: address
 *                 description: Adresse du votant (optionnel si phoneNumber+pin)
 *               phoneNumber:
 *                 type: string
 *                 description: Téléphone pour authentification
 *                 example: "+33123456789"
 *               pin:
 *                 type: string
 *                 description: PIN pour débloquer wallet
 *                 example: "1234"
 *               support:
 *                 type: boolean
 *                 description: Vote (true=Pour, false=Contre)
 *                 example: true
 *             anyOf:
 *               - required: [voterAddress, support]
 *               - required: [phoneNumber, pin, support]
 *     responses:
 *       200:
 *         description: Vote enregistré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 vote:
 *                   type: object
 *                   properties:
 *                     proposalId:
 *                       type: number
 *                     voter:
 *                       type: string
 *                     support:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 txHash:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Erreur de validation ou vote déjà effectué
 *       403:
 *         description: Membre non éligible ou période de vote fermée
 *       500:
 *         description: Erreur serveur
 */
router.post('/proposals/:proposalId/vote', governanceController.castVote);

/**
 * @swagger
 * /api/governance/proposals/{proposalId}/execute:
 *   post:
 *     summary: Exécute une proposition adoptée
 *     description: |
 *       Exécute une proposition qui a été adoptée lors du vote.
 *       Cette action peut être effectuée par n'importe qui une fois les conditions remplies.
 *     tags:
 *       - Proposals
 *     parameters:
 *       - name: proposalId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Proposition exécutée avec succès
 *       400:
 *         description: Proposition non exécutable (conditions non remplies)
 *       500:
 *         description: Erreur lors de l'exécution
 */
router.post('/proposals/:proposalId/execute', governanceController.executeProposal);

/**
 * @swagger
 * /api/governance/proposals/{proposalId}/cancel:
 *   post:
 *     summary: Annule une proposition (Modérateurs seulement)
 *     description: |
 *       Annule une proposition en cours pour des raisons exceptionnelles.
 *       Cette action est réservée aux modérateurs et est définitive.
 *     tags:
 *       - Proposals
 *     security:
 *       - ModeratorAuth: []
 *     parameters:
 *       - name: proposalId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Raison de l'annulation
 *                 example: "Proposition contraire aux statuts de la DAO"
 *     responses:
 *       200:
 *         description: Proposition annulée avec succès
 *       400:
 *         description: Raison manquante ou proposition non annulable
 *       403:
 *         description: Accès refusé - droits modérateur requis
 *       500:
 *         description: Erreur serveur
 */
router.post('/proposals/:proposalId/cancel', governanceController.cancelProposal);

/**
 * @swagger
 * /api/governance/proposals/{proposalId}/votes:
 *   get:
 *     summary: Récupère tous les votes d'une proposition
 *     description: |
 *       Récupère la liste détaillée de tous les votes pour une proposition,
 *       incluant un résumé statistique.
 *     tags:
 *       - Proposals
 *     parameters:
 *       - name: proposalId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *       - name: fromBlock
 *         in: query
 *         description: Bloc de début pour la recherche des votes
 *         schema:
 *           type: string
 *           default: "earliest"
 *       - name: toBlock
 *         in: query
 *         description: Bloc de fin pour la recherche des votes
 *         schema:
 *           type: string
 *           default: "latest"
 *     responses:
 *       200:
 *         description: Votes récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 proposalId:
 *                   type: number
 *                 votes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       voter:
 *                         type: string
 *                         format: address
 *                       support:
 *                         type: boolean
 *                       supportText:
 *                         type: string
 *                         enum: ["Pour", "Contre"]
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       txHash:
 *                         type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalVotes:
 *                       type: number
 *                     votesFor:
 *                       type: number
 *                     votesAgainst:
 *                       type: number
 *                     supportPercentage:
 *                       type: number
 *       500:
 *         description: Erreur serveur
 */
router.get('/proposals/:proposalId/votes', governanceController.getProposalVotes);

/*//////////////////////////////////////////////////////////////
                       CONTEST ROUTES
//////////////////////////////////////////////////////////////*/

/**
 * @swagger
 * components:
 *   schemas:
 *     Contest:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           description: ID unique de la contestation
 *         proposalId:
 *           type: number
 *           description: ID de la proposition contestée
 *         contestant:
 *           type: string
 *           format: address
 *           description: Adresse du contestant
 *         reason:
 *           type: string
 *           description: Raison de la contestation
 *         evidenceCID:
 *           type: string
 *           description: CID IPFS des preuves
 *         isResolved:
 *           type: boolean
 *           description: Contestation résolue ou non
 *         upheld:
 *           type: boolean
 *           description: Contestation acceptée (si résolue)
 *         resolutionNote:
 *           type: string
 *           description: Note de résolution
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/governance/proposals/{proposalId}/contest:
 *   post:
 *     summary: Dépose une contestation sur une proposition
 *     description: |
 *       Permet aux membres de contester une proposition pour des raisons valides :
 *       - Violation des règles de la DAO
 *       - Information incorrecte ou trompeuse
 *       - Processus non respecté
 *       
 *       La contestation suspend temporairement l'exécution en attendant résolution.
 *     tags:
 *       - Contests
 *     parameters:
 *       - name: proposalId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contestantAddress:
 *                 type: string
 *                 format: address
 *                 description: Adresse du contestant (optionnel si phoneNumber+pin)
 *               phoneNumber:
 *                 type: string
 *                 description: Téléphone pour authentification
 *                 example: "+33123456789"
 *               pin:
 *                 type: string
 *                 description: PIN pour débloquer wallet
 *                 example: "1234"
 *               reason:
 *                 type: string
 *                 description: Raison détaillée de la contestation
 *                 maxLength: 1000
 *                 example: "La proposition viole l'article 3 des statuts de la DAO"
 *               evidenceCID:
 *                 type: string
 *                 description: CID IPFS des documents de preuve (optionnel)
 *                 example: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
 *             anyOf:
 *               - required: [contestantAddress, reason]
 *               - required: [phoneNumber, pin, reason]
 *     responses:
 *       201:
 *         description: Contestation déposée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 contest:
 *                   $ref: '#/components/schemas/Contest'
 *                 txHash:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Erreur de validation
 *       403:
 *         description: Membre non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.post('/proposals/:proposalId/contest', governanceController.raiseContest);

/**
 * @swagger
 * /api/governance/contests/{contestId}/resolve:
 *   post:
 *     summary: Résout une contestation (Validateurs seulement)
 *     description: |
 *       Permet aux validateurs de résoudre une contestation en l'acceptant ou la rejetant.
 *       
 *       **Impact de la résolution :**
 *       - Si acceptée : peut annuler la proposition ou demander corrections
 *       - Si rejetée : la proposition continue son cours normal
 *     tags:
 *       - Contests
 *     security:
 *       - ValidatorAuth: []
 *     parameters:
 *       - name: contestId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uphold
 *               - resolutionNote
 *             properties:
 *               uphold:
 *                 type: boolean
 *                 description: Accepter la contestation (true) ou la rejeter (false)
 *                 example: false
 *               resolutionNote:
 *                 type: string
 *                 description: Explication détaillée de la décision
 *                 maxLength: 1000
 *                 example: "Après analyse, la proposition respecte les statuts de la DAO"
 *     responses:
 *       200:
 *         description: Contestation résolue avec succès
 *       400:
 *         description: Paramètres manquants ou invalides
 *       403:
 *         description: Accès refusé - droits validateur requis
 *       500:
 *         description: Erreur serveur
 */
router.post('/contests/:contestId/resolve', governanceController.resolveContest);

/**
 * @swagger
 * /api/governance/contests/{contestId}:
 *   get:
 *     summary: Récupère une contestation par ID
 *     description: |
 *       Récupère les détails complets d'une contestation incluant :
 *       - Informations du contestant et de la proposition
 *       - Raison et preuves fournies
 *       - Statut de résolution et décision
 *     tags:
 *       - Contests
 *     parameters:
 *       - name: contestId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Contestation récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 contest:
 *                   $ref: '#/components/schemas/Contest'
 *       404:
 *         description: Contestation non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get('/contests/:contestId', governanceController.getContest);

/*//////////////////////////////////////////////////////////////
                     DASHBOARD & ANALYTICS
//////////////////////////////////////////////////////////////*/

/**
 * @swagger
 * /api/governance/dashboard:
 *   get:
 *     summary: Dashboard principal de gouvernance
 *     description: |
 *       Fournit une vue d'ensemble complète de la gouvernance incluant :
 *       - Statistiques générales (membres, propositions)
 *       - Répartition par statut et niveau d'impact
 *       - Taux de participation et métriques d'engagement
 *       - Propositions récentes
 *       - Paramètres de gouvernance actuels
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Dashboard généré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 dashboard:
 *                   type: object
 *                   properties:
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         overview:
 *                           type: object
 *                           properties:
 *                             totalProposals:
 *                               type: number
 *                               description: Nombre total de propositions
 *                             totalMembers:
 *                               type: number
 *                               description: Nombre total de membres actifs
 *                             activeProposals:
 *                               type: number
 *                               description: Propositions en cours de vote
 *                             executedProposals:
 *                               type: number
 *                               description: Propositions exécutées
 *                         proposalsByStatus:
 *                           type: object
 *                           properties:
 *                             pending:
 *                               type: number
 *                             active:
 *                               type: number
 *                             succeeded:
 *                               type: number
 *                             defeated:
 *                               type: number
 *                             executed:
 *                               type: number
 *                             cancelled:
 *                               type: number
 *                         proposalsByImpact:
 *                           type: object
 *                           properties:
 *                             low:
 *                               type: number
 *                             medium:
 *                               type: number
 *                             high:
 *                               type: number
 *                         participation:
 *                           type: object
 *                           properties:
 *                             averageVotes:
 *                               type: number
 *                               description: Moyenne de votes par proposition
 *                             participationRate:
 *                               type: number
 *                               description: Taux de participation en pourcentage
 *                     recentProposals:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Proposal'
 *                       maxItems: 5
 *                       description: 5 propositions les plus récentes
 *                     governanceParameters:
 *                       type: object
 *                       properties:
 *                         votingPeriod:
 *                           type: string
 *                           description: Durée du vote (ex 7 jours)
 *                         quorumRequired:
 *                           type: string
 *                           description: Quorum requis (ex 20%)
 *                         approvalThreshold:
 *                           type: string
 *                           description: Seuil d'approbation (ex 51%)
 *                         contestWindow:
 *                           type: string
 *                           description: Fenêtre de contestation (ex 48 heures)
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       description: Dernière mise à jour du dashboard
 *       500:
 *         description: Erreur lors de la génération du dashboard
 */
router.get('/dashboard', governanceController.getDashboard);

/*//////////////////////////////////////////////////////////////
                       EXPORT & DOCUMENTATION
//////////////////////////////////////////////////////////////*/

/**
 * @swagger
 * tags:
 *   - name: Members
 *     description: Gestion des membres de la DAO (enregistrement, éligibilité, désenregistrement)
 *   - name: Proposals
 *     description: Cycle complet des propositions (création, modération, vote, exécution)
 *   - name: Contests
 *     description: Système de contestation pour challenger les décisions
 *   - name: Dashboard
 *     description: Vues d'ensemble et analytics de gouvernance
 * 
 * components:
 *   securitySchemes:
 *     AdminAuth:
 *       type: http
 *       scheme: bearer
 *       description: Token d'authentification pour les administrateurs
 *     ModeratorAuth:
 *       type: http
 *       scheme: bearer
 *       description: Token d'authentification pour les modérateurs
 *     ValidatorAuth:
 *       type: http
 *       scheme: bearer
 *       description: Token d'authentification pour les validateurs
 *     PhonePinAuth:
 *       type: object
 *       properties:
 *         phoneNumber:
 *           type: string
 *         pin:
 *           type: string
 *       description: Authentification par téléphone et PIN
 * 
 *   parameters:
 *     ProposalIdParam:
 *       name: proposalId
 *       in: path
 *       required: true
 *       description: ID unique de la proposition
 *       schema:
 *         type: number
 *         minimum: 1
 *     AddressParam:
 *       name: address
 *       in: path
 *       required: true
 *       description: Adresse Ethereum
 *       schema:
 *         type: string
 *         pattern: '^0x[a-fA-F0-9]{40}$'
 *     ContestIdParam:
 *       name: contestId
 *       in: path
 *       required: true
 *       description: ID unique de la contestation
 *       schema:
 *         type: number
 *         minimum: 1
 * 
 *   responses:
 *     BadRequest:
 *       description: Erreur de validation des paramètres
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *               error:
 *                 type: string
 *     Unauthorized:
 *       description: Authentification requise
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Authentification requise"
 *     Forbidden:
 *       description: Accès refusé - droits insuffisants
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Droits insuffisants pour cette action"
 *     NotFound:
 *       description: Ressource non trouvée
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Ressource non trouvée"
 *     InternalError:
 *       description: Erreur interne du serveur
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *               error:
 *                 type: string
 * 
 * info:
 *   title: TokenGated DAO - API de Gouvernance
 *   description: |
 *     API complète pour le système de gouvernance décentralisée.
 *     
 *     ## Fonctionnalités principales
 *     
 *     ### 🏛️ Gouvernance Décentralisée
 *     - Système de vote "une personne = un vote"
 *     - Gestion des membres avec critères d'éligibilité
 *     - Propositions avec modération et cycle de vie complet
 *     - Système de contestation pour la transparence
 *     
 *     ### 🔐 Authentification Flexible
 *     - Support des wallets Ethereum classiques
 *     - Authentification par téléphone + PIN
 *     - Gestion des rôles (membres, modérateurs, validateurs, admins)
 *     
 *     ### 📊 Analytics et Transparence
 *     - Dashboard complet avec métriques de participation
 *     - Historique détaillé de tous les votes et décisions
 *     - Statistiques en temps réel de la DAO
 *     
 *     ## Architecture
 *     
 *     Le système est basé sur un smart contract GovernanceDAO déployé sur Celo,
 *     avec une API backend qui facilite l'interaction et enrichit les données.
 *     
 *     Tous les états critiques sont stockés on-chain pour la décentralisation,
 *     tandis que les métadonnées et cache sont gérés par l'API.
 *   version: '1.0.0'
 *   contact:
 *     name: TokenGated DAO Team
 *     email: governance@tokengated.dao
 *   license:
 *     name: MIT
 *     url: https://opensource.org/licenses/MIT
 * 
 * servers:
 *   - url: http://localhost:3001/api
 *     description: Serveur de développement
 *   - url: https://api.tokengated.dao/api
 *     description: Serveur de production
 */

export default router;