import { ethers } from 'ethers';
import { config } from '../config/config.js';
import { GOVERNANCE_ABI } from '../contracts/abis.js';
import { phoneWalletService } from './phoneWallet.service.js';
import { gasManager } from './gasManager.service.js';

/**
 * Service pour la gestion de la gouvernance de la DAO
 * 
 * Ce service gère toutes les interactions avec le smart contract GovernanceDAO :
 * - Gestion des membres (enregistrement, éligibilité)
 * - Cycle complet des propositions (création, modération, vote, exécution)
 * - Système de contestation
 * - Rôles et permissions (modérateurs, validateurs)
 * - Événements et indexation
 * 
 * Architecture :
 * - Utilise ethers.js pour les interactions blockchain
 * - Gestion des erreurs robuste avec messages explicites
 * - Support des wallets via téléphone/PIN ou clés privées
 * - Logs détaillés pour audit et debug
 * - Cache des données fréquemment utilisées
 */
class GovernanceService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.celoRpcUrl);
    this.contractAddress = config.governanceContractAddress;
    this.contract = null;
    this.adminWallet = null;

    // Cache pour optimiser les lectures
    this.cache = {
      members: new Map(),
      proposals: new Map(),
      lastCacheUpdate: 0,
      cacheDuration: 30000 // 30 secondes
    };

    // Initialisation asynchrone non-bloquante
    this.initService().catch(err => {
      console.warn('⚠️ Attention: Initialisation GovernanceService échouée (continuera en mode dégradé)');
    });
  }

  /**
   * Initialise le service et le contrat de gouvernance
   * @private
   */
  async initService() {
    try {
      // Initialisation du wallet administrateur
      if (config.adminPrivateKey) {
        this.adminWallet = new ethers.Wallet(config.adminPrivateKey, this.provider);
        console.log(`🏛️  Admin wallet initialisé: ${this.adminWallet.address}`);
      }

      // Initialisation du contrat de gouvernance
      if (this.contractAddress) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          GOVERNANCE_ABI,
          this.adminWallet || this.provider
        );
        console.log(`📜 Contrat de gouvernance initialisé: ${this.contractAddress}`);

        // Test de connexion
        await this.testConnection();
      } else {
        console.warn('⚠️  Adresse du contrat de gouvernance non configurée');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du service de gouvernance:', error.message);
      throw error;
    }
  }

  /**
   * Teste la connexion au contrat
   * @private
   */
  async testConnection() {
    try {
      const currentProposalId = await this.contract.getCurrentProposalId();
      console.log(`✅ Connexion au contrat réussie. Propositions actuelles: ${currentProposalId}`);
      return true;
    } catch (error) {
      console.error('❌ Échec du test de connexion:', error.message);
      throw error;
    }
  }

  /**
   * Vérifie si le cache est encore valide
   * @private
   */
  isCacheValid() {
    return (Date.now() - this.cache.lastCacheUpdate) < this.cache.cacheDuration;
  }

  /**
   * Met à jour le timestamp du cache
   * @private
   */
  updateCacheTimestamp() {
    this.cache.lastCacheUpdate = Date.now();
  }

  /*//////////////////////////////////////////////////////////////
                        MEMBER MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  /**
   * Enregistre un nouveau membre dans la DAO
   * @param {string} memberAddress Adresse du membre à enregistrer
   * @param {number} transactionCount Nombre de transactions validées off-chain
   * @param {string} attestation Données d'attestation (hex string)
   * @returns {Promise<Object>} Résultat de l'enregistrement
   */
  async registerMember(memberAddress, transactionCount, attestation = '0x') {
    try {
      console.log(`👥 Enregistrement du membre: ${memberAddress}`);

      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      if (!this.adminWallet) {
        throw new Error('Wallet administrateur non configuré');
      }

      // Validation des paramètres
      if (!ethers.isAddress(memberAddress)) {
        throw new Error('Adresse invalide');
      }

      if (transactionCount < 10) {
        throw new Error('Nombre de transactions insuffisant (minimum 10)');
      }

      // Vérifier si le membre est déjà enregistré
      const isAlreadyRegistered = await this.contract.allowList(memberAddress);
      if (isAlreadyRegistered) {
        throw new Error('Membre déjà enregistré');
      }

      // Envoi de la transaction
      const tx = await this.contract.registerMember(
        memberAddress,
        transactionCount,
        attestation
      );

      console.log(`⏳ Transaction d'enregistrement envoyée: ${tx.hash}`);

      // Attente de la confirmation
      const receipt = await tx.wait();

      console.log(`✅ Membre enregistré avec succès dans le bloc ${receipt.blockNumber}`);

      // Mise à jour du cache
      this.cache.members.set(memberAddress, {
        registered: true,
        transactionCount,
        registeredAt: Date.now(),
        isActive: true
      });

      return {
        success: true,
        member: {
          address: memberAddress,
          transactionCount,
          registeredAt: new Date().toISOString()
        },
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        message: 'Membre enregistré avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du membre:', error);
      throw new Error(`Erreur lors de l'enregistrement du membre: ${error.message}`);
    }
  }

  /**
   * Désenregistre un membre de la DAO
   * @param {string} memberAddress Adresse du membre à désenregistrer
   * @returns {Promise<Object>} Résultat du désenregistrement
   */
  async deregisterMember(memberAddress) {
    try {
      console.log(`👥 Désenregistrement du membre: ${memberAddress}`);

      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      // Envoi de la transaction
      const tx = await this.contract.deregisterMember(memberAddress);
      const receipt = await tx.wait();

      console.log(`✅ Membre désenregistré avec succès`);

      // Mise à jour du cache
      this.cache.members.delete(memberAddress);

      return {
        success: true,
        txHash: receipt.hash,
        message: 'Membre désenregistré avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur lors du désenregistrement:', error);
      throw new Error(`Erreur lors du désenregistrement: ${error.message}`);
    }
  }

  /**
   * Vérifie si un membre est éligible
   * @param {string} memberAddress Adresse du membre
   * @returns {Promise<boolean>} true si le membre est éligible
   */
  async isMemberEligible(memberAddress) {
    try {
      if (!this.contract) {
        return false;
      }

      const isEligible = await this.contract.isEligibleMember(memberAddress);
      return isEligible;

    } catch (error) {
      console.error('❌ Erreur lors de la vérification d\'éligibilité:', error);
      return false;
    }
  }

  /**
   * Récupère les informations détaillées d'un membre
   * @param {string} memberAddress Adresse du membre
   * @returns {Promise<Object>} Informations du membre
   */
  async getMemberInfo(memberAddress) {
    try {
      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      // Vérifier le cache d'abord
      if (this.isCacheValid() && this.cache.members.has(memberAddress)) {
        return this.cache.members.get(memberAddress);
      }

      const [isInAllowList, memberData] = await Promise.all([
        this.contract.allowList(memberAddress),
        this.contract.members(memberAddress)
      ]);

      const memberInfo = {
        address: memberAddress,
        registered: memberData.registered,
        isInAllowList: isInAllowList,
        registeredAt: Number(memberData.registeredAt),
        transactionCount: Number(memberData.transactionCount),
        isActive: memberData.isActive,
        isEligible: isInAllowList && memberData.isActive
      };

      // Mise à jour du cache
      this.cache.members.set(memberAddress, memberInfo);
      this.updateCacheTimestamp();

      return memberInfo;

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des infos membre:', error);
      throw new Error(`Erreur lors de la récupération des infos membre: ${error.message}`);
    }
  }

  /*//////////////////////////////////////////////////////////////
                      PROPOSAL MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  /**
   * Crée une nouvelle proposition
   * @param {Object} proposerWallet Wallet du proposant (avec privateKey)
   * @param {string} ipfsCID CID IPFS du contenu détaillé
   * @param {string} title Titre de la proposition
   * @param {number} impactLevel Niveau d'impact (0-2)
   * @returns {Promise<Object>} Résultat de la création
   */
  async createProposal(proposerWallet, ipfsCID, title, impactLevel) {
    try {
      console.log(`📝 Création de proposition par: ${proposerWallet.address}`);

      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      // Validation des paramètres
      if (!ipfsCID || ipfsCID.trim() === '') {
        throw new Error('CID IPFS requis');
      }
      if (!title || title.trim() === '') {
        throw new Error('Titre requis');
      }
      if (impactLevel < 0 || impactLevel > 2) {
        throw new Error('Niveau d\'impact invalide (0-2)');
      }

      // Vérification de l'éligibilité du proposant
      const isEligible = await this.isMemberEligible(proposerWallet.address);
      if (!isEligible) {
        throw new Error('Le proposant n\'est pas un membre éligible');
      }

      // Création du wallet connecté
      let walletWithPrivateKey;
      if (proposerWallet.privateKey) {
        walletWithPrivateKey = new ethers.Wallet(proposerWallet.privateKey, this.provider);
      } else {
        throw new Error('Clé privée du proposant requise');
      }

      const contractWithProposer = this.contract.connect(walletWithPrivateKey);

      // Vérifier et financer le gas si nécessaire
      console.log(`⛽ Vérification du gas pour la création de proposition...`);
      try {
        await gasManager.checkAndFundGas(proposerWallet.address, 'create proposal');
      } catch (gasError) {
        throw new Error(`Impossible de préparer la transaction: ${gasError.message}`);
      }

      // Envoi de la transaction
      const tx = await contractWithProposer.createProposal(ipfsCID, title, impactLevel);

      console.log(`⏳ Transaction de création envoyée: ${tx.hash}`);

      const receipt = await tx.wait();

      // Extraction de l'événement ProposalCreated
      let proposalId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          if (parsedLog.name === 'ProposalCreated') {
            proposalId = parsedLog.args.id.toString();
            break;
          }
        } catch (error) {
          // Ignorer les logs qui ne correspondent pas au contrat
          continue;
        }
      }

      console.log(`✅ Proposition créée avec succès. ID: ${proposalId}`);

      return {
        success: true,
        proposalId: proposalId,
        proposal: {
          id: proposalId,
          proposer: proposerWallet.address,
          title,
          ipfsCID,
          impactLevel,
          createdAt: new Date().toISOString()
        },
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        message: 'Proposition créée avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur lors de la création de proposition:', error);
      throw new Error(`Erreur lors de la création de proposition: ${error.message}`);
    }
  }

  /**
   * Modère une proposition (modérateurs uniquement)
   * @param {string} proposalId ID de la proposition
   * @param {number} decision Décision de modération (0=approve, 1=reject, 2=request_changes)
   * @param {string} note Note explicative
   * @returns {Promise<Object>} Résultat de la modération
   */
  async moderateProposal(proposalId, decision, note = '') {
    try {
      console.log(`🛡️  Modération de la proposition ${proposalId}`);

      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      if (!this.adminWallet) {
        throw new Error('Wallet administrateur requis pour la modération');
      }

      // Validation de la décision
      if (decision < 0 || decision > 2) {
        throw new Error('Décision de modération invalide (0-2)');
      }

      // Envoi de la transaction
      const tx = await this.contract.moderateProposal(proposalId, decision, note);
      const receipt = await tx.wait();

      const decisionText = ['approve', 'reject', 'request_changes'][decision];
      console.log(`✅ Proposition ${proposalId} modérée: ${decisionText}`);

      return {
        success: true,
        moderation: {
          proposalId,
          decision: decisionText,
          note,
          moderatedAt: new Date().toISOString()
        },
        txHash: receipt.hash,
        message: 'Proposition modérée avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur lors de la modération:', error);
      throw new Error(`Erreur lors de la modération: ${error.message}`);
    }
  }

  /**
   * Vote sur une proposition
   * @param {Object} voterWallet Wallet du votant
   * @param {string} proposalId ID de la proposition
   * @param {boolean} support true pour voter pour, false pour voter contre
   * @returns {Promise<Object>} Résultat du vote
   */
  async castVote(voterWallet, proposalId, support) {
    try {
      console.log(`🗳️  Vote sur la proposition ${proposalId} par: ${voterWallet.address}`);

      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      // Vérification de l'éligibilité
      const isEligible = await this.isMemberEligible(voterWallet.address);
      if (!isEligible) {
        throw new Error('Le votant n\'est pas un membre éligible');
      }

      // Vérification si déjà voté
      const hasVoted = await this.contract.hasVoted(proposalId, voterWallet.address);
      if (hasVoted) {
        throw new Error('Vous avez déjà voté pour cette proposition');
      }

      // Création du wallet connecté
      let walletWithPrivateKey;
      if (voterWallet.privateKey) {
        walletWithPrivateKey = new ethers.Wallet(voterWallet.privateKey, this.provider);
      } else {
        throw new Error('Clé privée du votant requise');
      }

      const contractWithVoter = this.contract.connect(walletWithPrivateKey);

      // Vérifier et financer le gas si nécessaire
      console.log(`⛽ Vérification du gas pour le vote...`);
      try {
        await gasManager.checkAndFundGas(voterWallet.address, 'cast vote');
      } catch (gasError) {
        throw new Error(`Impossible de préparer la transaction: ${gasError.message}`);
      }

      // Envoi de la transaction
      const tx = await contractWithVoter.castVote(proposalId, support);
      const receipt = await tx.wait();

      console.log(`✅ Vote enregistré avec succès`);

      return {
        success: true,
        vote: {
          proposalId,
          voter: voterWallet.address,
          support,
          votedAt: new Date().toISOString()
        },
        txHash: receipt.hash,
        message: 'Vote enregistré avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur lors du vote:', error);
      this._handleGovernanceError(error);
    }
  }

  /**
   * Analyse et normalise les erreurs de gouvernance
   * @private
   * @param {Error} error Erreur brute
   */
  _handleGovernanceError(error) {
    const msg = error.message || '';

    if (msg.includes('Proposal not active')) {
      const e = new Error('La proposition n\'est pas active (en attente de modération ou terminée)');
      e.code = 'PROPOSAL_NOT_ACTIVE';
      e.status = 400;
      throw e;
    }

    if (msg.includes('Already voted')) {
      const e = new Error('Vous avez déjà voté pour cette proposition');
      e.code = 'ALREADY_VOTED';
      e.status = 400;
      throw e;
    }

    if (msg.includes('Voting not started')) {
      const e = new Error('Le vote n\'a pas encore commencé');
      e.code = 'VOTING_NOT_STARTED';
      e.status = 400;
      throw e;
    }

    if (msg.includes('Voting period ended')) {
      const e = new Error('La période de vote est terminée');
      e.code = 'VOTING_ENDED';
      e.status = 400;
      throw e;
    }

    // Erreur par défaut
    throw new Error(`Erreur lors du vote: ${msg}`);
  }

  /**
   * Exécute une proposition après la fin du vote
   * @param {string} proposalId ID de la proposition
   * @returns {Promise<Object>} Résultat de l'exécution
   */
  async executeProposal(proposalId) {
    try {
      console.log(`⚡ Exécution de la proposition ${proposalId}`);

      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      // Envoi de la transaction
      const tx = await this.contract.executeProposal(proposalId);
      const receipt = await tx.wait();

      console.log(`✅ Proposition exécutée avec succès`);

      // Extraction des résultats depuis les événements
      let executionResult = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          if (parsedLog.name === 'ProposalExecuted') {
            executionResult = {
              proposalId: parsedLog.args.id.toString(),
              votesFor: parsedLog.args.votesFor.toString(),
              votesAgainst: parsedLog.args.votesAgainst.toString(),
              succeeded: parsedLog.args.succeeded
            };
            break;
          }
        } catch (error) {
          continue;
        }
      }

      return {
        success: true,
        execution: {
          proposalId,
          result: executionResult,
          executedAt: new Date().toISOString()
        },
        txHash: receipt.hash,
        message: 'Proposition exécutée avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution:', error);
      throw new Error(`Erreur lors de l'exécution: ${error.message}`);
    }
  }

  /**
   * Annule une proposition (modérateurs uniquement)
   * @param {string} proposalId ID de la proposition
   * @param {string} reason Raison de l'annulation
   * @returns {Promise<Object>} Résultat de l'annulation
   */
  async cancelProposal(proposalId, reason) {
    try {
      console.log(`❌ Annulation de la proposition ${proposalId}`);

      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      if (!this.adminWallet) {
        throw new Error('Wallet administrateur requis pour l\'annulation');
      }

      // Envoi de la transaction
      const tx = await this.contract.cancelProposal(proposalId, reason);
      const receipt = await tx.wait();

      console.log(`✅ Proposition annulée avec succès`);

      return {
        success: true,
        cancellation: {
          proposalId,
          reason,
          cancelledAt: new Date().toISOString()
        },
        txHash: receipt.hash,
        message: 'Proposition annulée avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'annulation:', error);
      throw new Error(`Erreur lors de l'annulation: ${error.message}`);
    }
  }

  /**
   * Récupère les détails d'une proposition
   * @param {string} proposalId ID de la proposition
   * @returns {Promise<Object>} Détails de la proposition
   */
  async getProposal(proposalId) {
    try {
      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      // Vérifier le cache d'abord
      if (this.isCacheValid() && this.cache.proposals.has(proposalId)) {
        return this.cache.proposals.get(proposalId);
      }

      const proposalData = await this.contract.getProposal(proposalId);

      const proposal = {
        id: proposalData.id.toString(),
        proposer: proposalData.proposer,
        ipfsCID: proposalData.ipfsCID,
        title: proposalData.title,
        impactLevel: Number(proposalData.impactLevel),
        startBlock: proposalData.startBlock.toString(),
        endBlock: proposalData.endBlock.toString(),
        votesFor: proposalData.votesFor.toString(),
        votesAgainst: proposalData.votesAgainst.toString(),
        executed: proposalData.executed,
        cancelled: proposalData.cancelled,
        createdAt: proposalData.createdAt.toString(),
        status: Number(proposalData.status)
      };

      // Mise à jour du cache
      this.cache.proposals.set(proposalId, proposal);
      this.updateCacheTimestamp();

      return proposal;

    } catch (error) {
      console.error('❌ Erreur lors de la récupération de proposition:', error);
      throw new Error(`Erreur lors de la récupération de proposition: ${error.message}`);
    }
  }

  /*//////////////////////////////////////////////////////////////
                       CONTEST MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  /**
   * Dépose une contestation
   * @param {Object} contestantWallet Wallet du contestant
   * @param {string} proposalId ID de la proposition contestée
   * @param {string} reason Raison de la contestation
   * @param {string} evidenceCID CID IPFS des preuves
   * @returns {Promise<Object>} Résultat de la contestation
   */
  async raiseContest(contestantWallet, proposalId, reason, evidenceCID = '') {
    try {
      console.log(`⚖️  Contestation de la proposition ${proposalId} par: ${contestantWallet.address}`);

      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      // Validation
      if (!reason || reason.trim() === '') {
        throw new Error('Raison de contestation requise');
      }

      // Vérification de l'éligibilité
      const isEligible = await this.isMemberEligible(contestantWallet.address);
      if (!isEligible) {
        throw new Error('Le contestant n\'est pas un membre éligible');
      }

      // Création du wallet connecté
      let walletWithPrivateKey;
      if (contestantWallet.privateKey) {
        walletWithPrivateKey = new ethers.Wallet(contestantWallet.privateKey, this.provider);
      } else {
        throw new Error('Clé privée du contestant requise');
      }

      const contractWithContestant = this.contract.connect(walletWithPrivateKey);

      // Vérifier et financer le gas si nécessaire
      console.log(`⛽ Vérification du gas pour la contestation...`);
      try {
        await gasManager.checkAndFundGas(contestantWallet.address, 'raise contest');
      } catch (gasError) {
        throw new Error(`Impossible de préparer la transaction: ${gasError.message}`);
      }

      // Envoi de la transaction
      const tx = await contractWithContestant.raiseContest(proposalId, reason, evidenceCID);
      const receipt = await tx.wait();

      // Extraction de l'ID de contestation
      let contestId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          if (parsedLog.name === 'ContestRaised') {
            contestId = parsedLog.args.contestId.toString();
            break;
          }
        } catch (error) {
          continue;
        }
      }

      console.log(`✅ Contestation déposée avec succès. ID: ${contestId}`);

      return {
        success: true,
        contestId,
        contest: {
          contestId,
          proposalId,
          raisedBy: contestantWallet.address,
          reason,
          evidenceCID,
          raisedAt: new Date().toISOString()
        },
        txHash: receipt.hash,
        message: 'Contestation déposée avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur lors de la contestation:', error);
      throw new Error(`Erreur lors de la contestation: ${error.message}`);
    }
  }

  /**
   * Résout une contestation (validateurs uniquement)
   * @param {string} contestId ID de la contestation
   * @param {boolean} uphold true si la contestation est justifiée
   * @param {string} resolutionNote Note de résolution
   * @returns {Promise<Object>} Résultat de la résolution
   */
  async resolveContest(contestId, uphold, resolutionNote) {
    try {
      console.log(`⚖️  Résolution de la contestation ${contestId}`);

      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      if (!this.adminWallet) {
        throw new Error('Wallet administrateur requis pour la résolution');
      }

      // Envoi de la transaction
      const tx = await this.contract.resolveContest(contestId, uphold, resolutionNote);
      const receipt = await tx.wait();

      console.log(`✅ Contestation résolue: ${uphold ? 'maintenue' : 'rejetée'}`);

      return {
        success: true,
        resolution: {
          contestId,
          upheld: uphold,
          resolutionNote,
          resolvedAt: new Date().toISOString()
        },
        txHash: receipt.hash,
        message: 'Contestation résolue avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur lors de la résolution:', error);
      throw new Error(`Erreur lors de la résolution: ${error.message}`);
    }
  }

  /**
   * Récupère les détails d'une contestation
   * @param {string} contestId ID de la contestation
   * @returns {Promise<Object>} Détails de la contestation
   */
  async getContest(contestId) {
    try {
      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      const contestData = await this.contract.getContest(contestId);

      return {
        id: contestData.id.toString(),
        proposalId: contestData.proposalId.toString(),
        raisedBy: contestData.raisedBy,
        reason: contestData.reason,
        evidenceCID: contestData.evidenceCID,
        resolved: contestData.resolved,
        upheld: contestData.upheld,
        resolutionNote: contestData.resolutionNote,
        resolvedBy: contestData.resolvedBy,
        createdAt: contestData.createdAt.toString(),
        resolvedAt: contestData.resolvedAt.toString()
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération de contestation:', error);
      throw new Error(`Erreur lors de la récupération de contestation: ${error.message}`);
    }
  }

  /*//////////////////////////////////////////////////////////////
                           EVENT QUERIES
  //////////////////////////////////////////////////////////////*/

  /**
   * Récupère les événements de création de propositions
   * @param {string|number} fromBlock Bloc de début (par défaut: bloc de déploiement du contrat)
   * @param {string|number} toBlock Bloc de fin
   * @returns {Promise<Array>} Liste des événements
   */
  async getProposalEvents(fromBlock = null, toBlock = 'latest') {
    try {
      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      // Obtenir le dernier bloc si toBlock est 'latest'
      let normalizedToBlock = toBlock;
      if (toBlock === 'latest') {
        normalizedToBlock = await this.provider.getBlockNumber();
      } else if (typeof toBlock === 'string' && toBlock !== 'earliest' && toBlock !== 'pending') {
        const parsed = parseInt(toBlock, 10);
        if (!isNaN(parsed)) {
          normalizedToBlock = parsed;
        }
      }

      // Normaliser fromBlock - utiliser le bloc de déploiement par défaut
      let normalizedFromBlock = fromBlock;
      if (fromBlock === null || fromBlock === 'earliest') {
        // Utiliser le bloc de déploiement du contrat au lieu de 0
        normalizedFromBlock = config.governanceDeploymentBlock || 0;
        console.log(`📍 Utilisation du bloc de déploiement: ${normalizedFromBlock}`);
      } else if (typeof fromBlock === 'string' && fromBlock !== 'latest' && fromBlock !== 'pending') {
        const parsed = parseInt(fromBlock, 10);
        if (!isNaN(parsed)) {
          normalizedFromBlock = parsed;
        }
      }

      // Limiter la portée pour les RPC avec limitations
      const MAX_BLOCK_RANGE = 45000; // Un peu en dessous de 50000 pour être sûr
      const blockRange = normalizedToBlock - normalizedFromBlock;

      console.log(`🔍 Récupération des événements ProposalCreated`);
      console.log(`📊 Range: ${normalizedFromBlock} -> ${normalizedToBlock} (${blockRange} blocs)`);

      const filter = this.contract.filters.ProposalCreated();
      let allEvents = [];

      // Si la portée est trop grande, diviser en chunks
      if (blockRange > MAX_BLOCK_RANGE) {
        console.log(`⚠️  Portée trop large, division en chunks de ${MAX_BLOCK_RANGE} blocs`);

        for (let currentFrom = normalizedFromBlock; currentFrom < normalizedToBlock; currentFrom += MAX_BLOCK_RANGE) {
          const currentTo = Math.min(currentFrom + MAX_BLOCK_RANGE - 1, normalizedToBlock);

          console.log(`🔄 Chunk: blocs ${currentFrom} -> ${currentTo}`);

          try {
            const chunkEvents = await this.contract.queryFilter(filter, currentFrom, currentTo);
            allEvents.push(...chunkEvents);
            console.log(`   📝 ${chunkEvents.length} événements trouvés dans ce chunk`);

            // Petit délai pour éviter de surcharger le RPC
            if (currentFrom + MAX_BLOCK_RANGE < normalizedToBlock) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (chunkError) {
            console.error(`❌ Erreur dans le chunk ${currentFrom}-${currentTo}:`, chunkError.message);
            // Continue avec le chunk suivant plutôt que d'échouer complètement
          }
        }
      } else {
        // Portée acceptable, requête directe
        allEvents = await this.contract.queryFilter(filter, normalizedFromBlock, normalizedToBlock);
      }

      console.log(`✅ ${allEvents.length} événements récupérés au total`);

      return allEvents.map(event => ({
        proposalId: event.args.id.toString(),
        proposer: event.args.proposer,
        ipfsCID: event.args.ipfsCID,
        impactLevel: Number(event.args.impactLevel),
        startBlock: event.args.startBlock.toString(),
        endBlock: event.args.endBlock.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: new Date().toISOString() // TODO: Récupérer le timestamp du bloc
      }));

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des événements:', error);
      throw new Error(`Erreur lors de la récupération des événements: ${error.message}`);
    }
  }

  /**
   * Récupère les événements de vote pour une proposition
   * @param {string} proposalId ID de la proposition
   * @param {string|number} fromBlock Bloc de début (par défaut: bloc de déploiement du contrat)
   * @param {string|number} toBlock Bloc de fin
   * @returns {Promise<Array>} Liste des votes
   */
  async getVoteEvents(proposalId, fromBlock = null, toBlock = 'latest') {
    try {
      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      // Obtenir le dernier bloc si toBlock est 'latest'
      let normalizedToBlock = toBlock;
      if (toBlock === 'latest') {
        normalizedToBlock = await this.provider.getBlockNumber();
      } else if (typeof toBlock === 'string' && toBlock !== 'earliest' && toBlock !== 'pending') {
        const parsed = parseInt(toBlock, 10);
        if (!isNaN(parsed)) {
          normalizedToBlock = parsed;
        }
      }

      // Normaliser fromBlock - utiliser le bloc de déploiement par défaut
      let normalizedFromBlock = fromBlock;
      if (fromBlock === null || fromBlock === 'earliest') {
        // Utiliser le bloc de déploiement du contrat au lieu de 0
        normalizedFromBlock = config.governanceDeploymentBlock || 0;
        console.log(`📍 Utilisation du bloc de déploiement: ${normalizedFromBlock}`);
      } else if (typeof fromBlock === 'string' && fromBlock !== 'latest' && fromBlock !== 'pending') {
        const parsed = parseInt(fromBlock, 10);
        if (!isNaN(parsed)) {
          normalizedFromBlock = parsed;
        }
      }

      // Limiter la portée pour les RPC avec limitations
      const MAX_BLOCK_RANGE = 45000;
      const blockRange = normalizedToBlock - normalizedFromBlock;

      console.log(`🗳️  Récupération des votes pour proposition ${proposalId}`);
      console.log(`📊 Range: ${normalizedFromBlock} -> ${normalizedToBlock} (${blockRange} blocs)`);

      const filter = this.contract.filters.VoteCast(proposalId);
      let allEvents = [];

      // Si la portée est trop grande, diviser en chunks
      if (blockRange > MAX_BLOCK_RANGE) {
        console.log(`⚠️  Portée trop large, division en chunks de ${MAX_BLOCK_RANGE} blocs`);

        for (let currentFrom = normalizedFromBlock; currentFrom < normalizedToBlock; currentFrom += MAX_BLOCK_RANGE) {
          const currentTo = Math.min(currentFrom + MAX_BLOCK_RANGE - 1, normalizedToBlock);

          console.log(`🔄 Chunk: blocs ${currentFrom} -> ${currentTo}`);

          try {
            const chunkEvents = await this.contract.queryFilter(filter, currentFrom, currentTo);
            allEvents.push(...chunkEvents);
            console.log(`   📝 ${chunkEvents.length} votes trouvés dans ce chunk`);

            // Petit délai pour éviter de surcharger le RPC
            if (currentFrom + MAX_BLOCK_RANGE < normalizedToBlock) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (chunkError) {
            console.error(`❌ Erreur dans le chunk ${currentFrom}-${currentTo}:`, chunkError.message);
          }
        }
      } else {
        // Portée acceptable, requête directe
        allEvents = await this.contract.queryFilter(filter, normalizedFromBlock, normalizedToBlock);
      }

      console.log(`✅ ${allEvents.length} votes récupérés au total`);

      return allEvents.map(event => ({
        proposalId: event.args.id.toString(),
        voter: event.args.voter,
        support: event.args.support,
        timestamp: event.args.timestamp.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      }));

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des votes:', error);
      throw new Error(`Erreur lors de la récupération des votes: ${error.message}`);
    }
  }

  /*//////////////////////////////////////////////////////////////
                            UTILITIES
  //////////////////////////////////////////////////////////////*/

  /**
   * Récupère le nombre total de propositions
   * @returns {Promise<string>} Nombre de propositions
   */
  async getCurrentProposalId() {
    try {
      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      const id = await this.contract.getCurrentProposalId();
      return id.toString();

    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'ID:', error);
      throw new Error(`Erreur lors de la récupération de l'ID: ${error.message}`);
    }
  }

  /**
   * Récupère le nombre total de membres actifs
   * @returns {Promise<string>} Nombre de membres actifs
   */
  async getTotalActiveMembers() {
    try {
      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      const count = await this.contract.totalActiveMembers();
      return count.toString();

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des membres:', error);
      throw new Error(`Erreur lors de la récupération des membres: ${error.message}`);
    }
  }

  /**
   * Récupère les paramètres de gouvernance
   * @returns {Promise<Object>} Paramètres de gouvernance
   */
  async getGovernanceParameters() {
    try {
      if (!this.contract) {
        throw new Error('Contrat de gouvernance non initialisé');
      }

      const [votingPeriod, quorumPercentage, minApprovalPercentage, contestWindow, rulesHash] =
        await Promise.all([
          this.contract.votingPeriod(),
          this.contract.quorumPercentage(),
          this.contract.minApprovalPercentage(),
          this.contract.contestWindow(),
          this.contract.rulesHash()
        ]);

      return {
        votingPeriod: votingPeriod.toString(),
        quorumPercentage: quorumPercentage.toString(),
        minApprovalPercentage: minApprovalPercentage.toString(),
        contestWindow: contestWindow.toString(),
        rulesHash
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des paramètres:', error);
      throw new Error(`Erreur lors de la récupération des paramètres: ${error.message}`);
    }
  }

  /**
   * Nettoie le cache (utile pour les tests ou refresh manuel)
   */
  clearCache() {
    this.cache.members.clear();
    this.cache.proposals.clear();
    this.cache.lastCacheUpdate = 0;
    console.log('🧹 Cache nettoyé');
  }
}

// Export d'une instance singleton
export const governanceService = new GovernanceService();
export default governanceService;