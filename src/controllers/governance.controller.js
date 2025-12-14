import governanceService from '../services/governance.service.js';
import { phoneWalletService } from '../services/phoneWallet.service.js';
import { blockchainService } from '../services/blockchain.service.js';

/**
 * Contrôleurs pour la gestion de la gouvernance DAO
 * 
 * Ce fichier contient tous les contrôleurs pour les endpoints de gouvernance :
 * - Gestion des membres (enregistrement, éligibilité)
 * - Cycle des propositions (création, modération, vote, exécution)
 * - Système de contestation
 * - Dashboard et analytics
 * 
 * Architecture suivie :
 * - Validation robuste des entrées
 * - Gestion d'erreurs avec messages explicites
 * - Support des wallets via téléphone/PIN
 * - Logs détaillés pour audit
 * - Réponses structurées et cohérentes
 */

/*//////////////////////////////////////////////////////////////
                        MEMBER MANAGEMENT
//////////////////////////////////////////////////////////////*/

/**
 * @desc Enregistre un nouveau membre dans la DAO
 * @route POST /api/governance/members/register
 * @access Public (mais vérifie l'éligibilité)
 */
export const registerMember = async (req, res) => {
  try {
    const { address, phoneNumber, pin, country } = req.body;

    // Validation des paramètres
    if (!address && !(phoneNumber && pin)) {
      return res.status(400).json({
        success: false,
        message: 'Adresse Ethereum OU numéro de téléphone + PIN requis'
      });
    }

    let memberAddress = address;

    // Si téléphone/PIN fourni, récupérer l'adresse du wallet
    if (phoneNumber && pin) {
      try {
        const walletResult = phoneWalletService.createOrGetWalletFromPhone(phoneNumber, pin);
        if (!walletResult.success) {
          return res.status(400).json({
            success: false,
            message: 'Informations de téléphone/PIN invalides',
            error: 'Impossible de récupérer le wallet'
          });
        }
        memberAddress = walletResult.wallet.address;
      } catch (walletError) {
        return res.status(400).json({
          success: false,
          message: 'Erreur lors de la récupération du wallet',
          error: walletError.message
        });
      }
    }

    console.log(`👥 Tentative d'enregistrement du membre: ${memberAddress}`);

    // Vérifier si le membre est déjà enregistré
    try {
      const existingMember = await governanceService.getMemberInfo(memberAddress);
      if (existingMember.registered) {
        return res.status(400).json({
          success: false,
          message: 'Ce membre est déjà enregistré dans la DAO',
          member: existingMember
        });
      }
    } catch (error) {
      // Si erreur lors de la récupération, on continue (membre probablement non existant)
    }

    // Vérification de l'éligibilité (≥3 mois, ≥10 transactions)
    let transactionCount = 0;
    let accountAge = 0;

    try {
      // Récupérer le nombre de transactions
      transactionCount = await blockchainService.getTransactionCount(memberAddress);

      // Pour l'âge du compte, on simule en récupérant le premier timestamp de transaction
      // En production, cela devrait être calculé via l'historique blockchain
      const accountInfo = await blockchainService.getAccountInfo(memberAddress);
      console.log(accountInfo);
      console.log(transactionCount);
      console.log(accountAge);

      if (accountInfo && accountInfo.firstTransaction) {
        accountAge = Math.floor((Date.now() - accountInfo.firstTransaction) / (1000 * 60 * 60 * 24));
      } else {
        // Si pas d'info, on simule 180 jours pour les tests
        accountAge = 180;
      }
    } catch (error) {
      console.warn('⚠️  Erreur lors de la vérification blockchain:', error.message);
      // En cas d'erreur, on utilise des valeurs par défaut pour les tests
      // transactionCount = 15;
      // accountAge = 180;
    }

    // Vérification des critères d'éligibilité
    const minTransactions = 10;
    const minAge = 90; // 3 mois

    if (transactionCount < minTransactions) {
      return res.status(400).json({
        success: false,
        message: `Le compte doit avoir effectué au moins ${minTransactions} transactions`,
        details: {
          currentTransactions: transactionCount,
          requiredTransactions: minTransactions,
          accountAge
        }
      });
    }

    if (accountAge < minAge) {
      return res.status(400).json({
        success: false,
        message: `Le compte doit avoir au moins ${minAge} jours d'ancienneté`,
        details: {
          currentAge: accountAge,
          requiredAge: minAge,
          transactionCount
        }
      });
    }

    // Enregistrement du membre
    const result = await governanceService.registerMember(
      memberAddress,
      transactionCount,
      '0x' // Attestation vide pour le moment
    );

    console.log(`✅ Membre enregistré avec succès: ${memberAddress}`);

    res.status(201).json({
      success: true,
      member: {
        address: memberAddress,
        phoneNumber: phoneNumber || null,
        transactionCount,
        accountAge,
        registeredAt: new Date().toISOString(),
        eligibilityChecks: {
          transactionCount: transactionCount >= minTransactions,
          accountAge: accountAge >= minAge
        }
      },
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du membre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du membre',
      error: error.message
    });
  }
};

/**
 * @desc Vérifie l'éligibilité d'un membre
 * @route GET /api/governance/members/:address/eligibility
 * @access Public
 */
export const checkMemberEligibility = async (req, res) => {
  try {
    const { address } = req.params;

    // Validation de l'adresse
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        message: 'Adresse Ethereum invalide'
      });
    }

    console.log(`🔍 Vérification d'éligibilité pour: ${address}`);

    // Récupération des informations du membre
    let memberInfo;
    try {
      memberInfo = await governanceService.getMemberInfo(address);
    } catch (error) {
      memberInfo = {
        address,
        registered: false,
        isInAllowList: false,
        isActive: false,
        transactionCount: 0,
        isEligible: false
      };
    }

    // Récupération des informations blockchain
    let transactionCount = 0;
    let accountAge = 0;

    try {
      transactionCount = await blockchainService.getTransactionCount(address);

      // Simulation de l'âge du compte (en production, calculer via blockchain)
      const accountInfo = await blockchainService.getAccountInfo(address);
      if (accountInfo && accountInfo.firstTransaction) {
        accountAge = Math.floor((Date.now() - accountInfo.firstTransaction) / (1000 * 60 * 60 * 24));
      } else {
        accountAge = 180; // Valeur par défaut pour les tests
      }
    } catch (error) {
      console.warn('⚠️  Erreur lors de la récupération des infos blockchain:', error.message);
    }

    // Critères d'éligibilité
    const requirements = {
      minTransactions: 10,
      minAccountAge: 90, // jours
      mustBeRegistered: true,
      mustBeActive: true
    };

    // Calcul de l'éligibilité
    const eligibilityChecks = {
      hasEnoughTransactions: transactionCount >= requirements.minTransactions,
      isOldEnough: accountAge >= requirements.minAccountAge,
      isRegistered: memberInfo.registered,
      isActive: memberInfo.isActive,
      isInAllowList: memberInfo.isInAllowList
    };

    const isFullyEligible = Object.values(eligibilityChecks).every(check => check);

    res.json({
      success: true,
      eligibility: {
        address,
        isEligible: isFullyEligible,
        memberInfo,
        blockchainInfo: {
          transactionCount,
          accountAge
        },
        requirements,
        checks: eligibilityChecks,
        nextSteps: isFullyEligible ?
          'Membre éligible pour toutes les actions' :
          'Enregistrement requis ou critères non remplis'
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification d\'éligibilité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification d\'éligibilité',
      error: error.message
    });
  }
};

/**
 * @desc Désenregistre un membre (admin seulement)
 * @route DELETE /api/governance/members/:address
 * @access Admin
 */
export const deregisterMember = async (req, res) => {
  try {
    const { address } = req.params;
    const { reason } = req.body;

    console.log(`👥 Désenregistrement du membre: ${address}`);

    const result = await governanceService.deregisterMember(address);

    res.json({
      success: true,
      deregistration: {
        address,
        reason: reason || 'Non spécifiée',
        deregisteredAt: new Date().toISOString()
      },
      txHash: result.txHash,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Erreur lors du désenregistrement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du désenregistrement du membre',
      error: error.message
    });
  }
};

/*//////////////////////////////////////////////////////////////
                      PROPOSAL MANAGEMENT
//////////////////////////////////////////////////////////////*/

/**
 * @desc Crée une nouvelle proposition
 * @route POST /api/governance/proposals
 * @access Members
 */
export const createProposal = async (req, res) => {
  try {
    const {
      proposerAddress,
      phoneNumber,
      pin,
      title,
      description,
      ipfsCID,
      impactLevel
    } = req.body;

    // Validation des champs obligatoires
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Titre de la proposition requis'
      });
    }

    if (!ipfsCID || ipfsCID.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'CID IPFS du contenu détaillé requis'
      });
    }

    if (impactLevel === undefined || impactLevel < 0 || impactLevel > 2) {
      return res.status(400).json({
        success: false,
        message: 'Niveau d\'impact invalide (0=faible, 1=modéré, 2=fort)'
      });
    }

    let proposerWallet;

    // Récupérer le wallet du proposant
    if (phoneNumber && pin) {
      try {
        const walletResult = phoneWalletService.createOrGetWalletFromPhone(phoneNumber, pin);
        if (!walletResult.success) {
          return res.status(400).json({
            success: false,
            message: 'Informations de téléphone/PIN invalides'
          });
        }

        // Récupérer la clé privée pour signer la transaction
        const privateKey = phoneWalletService.derivePrivateKeyFromPhone(phoneNumber, pin);
        proposerWallet = {
          address: walletResult.wallet.address,
          privateKey: privateKey
        };
      } catch (walletError) {
        return res.status(400).json({
          success: false,
          message: 'Erreur lors de la récupération du wallet',
          error: walletError.message
        });
      }
    } else if (proposerAddress) {
      // Pour simplifier, on assume que l'adresse est valide
      // En production, il faudrait une signature ou authentification
      return res.status(400).json({
        success: false,
        message: 'Authentification par téléphone/PIN requise pour créer une proposition'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Téléphone/PIN requis pour l\'authentification'
      });
    }

    console.log(`📝 Création de proposition par: ${proposerWallet.address}`);

    // Vérifier l'éligibilité du proposant
    const isEligible = await governanceService.isMemberEligible(proposerWallet.address);
    if (!isEligible) {
      return res.status(403).json({
        success: false,
        message: 'Le proposant n\'est pas un membre éligible de la DAO',
        help: 'Enregistrez-vous d\'abord via /api/governance/members/register'
      });
    }

    // Création de la proposition
    const result = await governanceService.createProposal(
      proposerWallet,
      ipfsCID,
      title,
      impactLevel
    );

    console.log(`✅ Proposition créée avec succès: ${result.proposalId}`);

    res.status(201).json({
      success: true,
      proposal: {
        id: result.proposalId,
        proposer: proposerWallet.address,
        title,
        description: description || 'Voir contenu IPFS pour description complète',
        ipfsCID,
        impactLevel,
        impactLevelText: ['Faible', 'Modéré', 'Fort'][impactLevel],
        status: 'Pending',
        statusText: 'En attente de modération',
        createdAt: new Date().toISOString()
      },
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Erreur lors de la création de proposition:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la proposition',
      error: error.message
    });
  }
};

/**
 * @desc Récupère une proposition par ID
 * @route GET /api/governance/proposals/:proposalId
 * @access Public
 */
export const getProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;

    console.log(`📋 Récupération de la proposition: ${proposalId}`);

    const proposal = await governanceService.getProposal(proposalId);

    // Enrichissement des données
    const enrichedProposal = {
      ...proposal,
      impactLevelText: ['Faible', 'Modéré', 'Fort'][proposal.impactLevel],
      statusText: ['En attente', 'Actif', 'Adopté', 'Rejeté', 'Exécuté', 'Annulé'][proposal.status],
      votingProgress: {
        totalVotes: parseInt(proposal.votesFor) + parseInt(proposal.votesAgainst),
        votesFor: parseInt(proposal.votesFor),
        votesAgainst: parseInt(proposal.votesAgainst),
        supportPercentage: parseInt(proposal.votesFor) + parseInt(proposal.votesAgainst) > 0 ?
          Math.round((parseInt(proposal.votesFor) / (parseInt(proposal.votesFor) + parseInt(proposal.votesAgainst))) * 100) : 0
      },
      timing: {
        startDate: new Date(parseInt(proposal.startBlock) * 1000).toISOString(),
        endDate: new Date(parseInt(proposal.endBlock) * 1000).toISOString(),
        isVotingActive: Date.now() >= parseInt(proposal.startBlock) * 1000 &&
          Date.now() <= parseInt(proposal.endBlock) * 1000 &&
          proposal.status === 1, // Status.Active
        timeRemaining: Math.max(0, parseInt(proposal.endBlock) * 1000 - Date.now())
      }
    };

    res.json({
      success: true,
      proposal: enrichedProposal
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de proposition:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la proposition',
      error: error.message
    });
  }
};

/**
 * @desc Liste les propositions avec filtres et pagination
 * @route GET /api/governance/proposals
 * @access Public
 */
export const listProposals = async (req, res) => {
  try {
    const {
      status,
      impactLevel,
      proposer,
      fromBlock = 'earliest',
      toBlock = 'latest',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log(`📋 Récupération des propositions (page ${page}, limite ${limit})`);

    // Récupération des événements de propositions
    const proposalEvents = await governanceService.getProposalEvents(fromBlock, toBlock);

    // Récupération des détails de chaque proposition
    const proposalsWithDetails = await Promise.all(
      proposalEvents.map(async (event) => {
        try {
          const proposal = await governanceService.getProposal(event.proposalId);
          return {
            ...proposal,
            ...event,
            impactLevelText: ['Faible', 'Modéré', 'Fort'][proposal.impactLevel],
            statusText: ['En attente', 'Actif', 'Adopté', 'Rejeté', 'Exécuté', 'Annulé'][proposal.status]
          };
        } catch (error) {
          console.error(`Erreur pour la proposition ${event.proposalId}:`, error.message);
          return null;
        }
      })
    );

    // Filtrage des propositions valides
    let filteredProposals = proposalsWithDetails.filter(p => p !== null);

    // Application des filtres
    if (status !== undefined) {
      filteredProposals = filteredProposals.filter(p => p.status == parseInt(status));
    }
    if (impactLevel !== undefined) {
      filteredProposals = filteredProposals.filter(p => p.impactLevel == parseInt(impactLevel));
    }
    if (proposer) {
      filteredProposals = filteredProposals.filter(p =>
        p.proposer.toLowerCase() === proposer.toLowerCase()
      );
    }

    // Tri
    filteredProposals.sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;

      if (sortBy === 'createdAt' || sortBy === 'startBlock' || sortBy === 'endBlock') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedProposals = filteredProposals.slice(startIndex, endIndex);

    // Statistiques
    const stats = {
      total: filteredProposals.length,
      byStatus: {
        pending: filteredProposals.filter(p => p.status === 0).length,
        active: filteredProposals.filter(p => p.status === 1).length,
        succeeded: filteredProposals.filter(p => p.status === 2).length,
        defeated: filteredProposals.filter(p => p.status === 3).length,
        executed: filteredProposals.filter(p => p.status === 4).length,
        cancelled: filteredProposals.filter(p => p.status === 5).length
      },
      byImpactLevel: {
        low: filteredProposals.filter(p => p.impactLevel === 0).length,
        medium: filteredProposals.filter(p => p.impactLevel === 1).length,
        high: filteredProposals.filter(p => p.impactLevel === 2).length
      }
    };

    res.json({
      success: true,
      proposals: paginatedProposals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredProposals.length,
        totalPages: Math.ceil(filteredProposals.length / parseInt(limit)),
        hasNext: endIndex < filteredProposals.length,
        hasPrev: parseInt(page) > 1
      },
      filters: {
        status: status !== undefined ? parseInt(status) : null,
        impactLevel: impactLevel !== undefined ? parseInt(impactLevel) : null,
        proposer: proposer || null
      },
      sorting: {
        sortBy,
        sortOrder
      },
      statistics: stats
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des propositions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des propositions',
      error: error.message
    });
  }
};

/**
 * @desc Modère une proposition (modérateurs uniquement)
 * @route POST /api/governance/proposals/:proposalId/moderate
 * @access Moderators
 */
export const moderateProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { decision, note } = req.body;

    // Validation de la décision
    if (decision === undefined || decision < 0 || decision > 2) {
      return res.status(400).json({
        success: false,
        message: 'Décision de modération invalide',
        validDecisions: {
          0: 'Approuver',
          1: 'Rejeter',
          2: 'Demander des modifications'
        }
      });
    }

    console.log(`🛡️  Modération de la proposition ${proposalId}`);

    const result = await governanceService.moderateProposal(proposalId, decision, note || '');

    res.json({
      success: true,
      moderation: result.moderation,
      txHash: result.txHash,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Erreur lors de la modération:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modération de la proposition',
      error: error.message
    });
  }
};

/**
 * @desc Vote sur une proposition
 * @route POST /api/governance/proposals/:proposalId/vote
 * @access Members
 */
export const castVote = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { voterAddress, phoneNumber, pin, support } = req.body;

    if (support === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Position de vote requise (support: true/false)'
      });
    }

    let voterWallet;

    // Récupérer le wallet du votant
    if (phoneNumber && pin) {
      try {
        const walletResult = phoneWalletService.createOrGetWalletFromPhone(phoneNumber, pin);
        if (!walletResult.success) {
          return res.status(400).json({
            success: false,
            message: 'Informations de téléphone/PIN invalides'
          });
        }

        // Récupérer la clé privée pour signer
        const privateKey = phoneWalletService.derivePrivateKeyFromPhone(phoneNumber, pin);
        voterWallet = {
          address: walletResult.wallet.address,
          privateKey: privateKey
        };
      } catch (walletError) {
        return res.status(400).json({
          success: false,
          message: 'Erreur lors de la récupération du wallet',
          error: walletError.message
        });
      }
    } else if (voterAddress) {
      return res.status(400).json({
        success: false,
        message: 'Authentification par téléphone/PIN requise pour voter'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Téléphone/PIN requis pour l\'authentification'
      });
    }

    console.log(`🗳️  Vote sur la proposition ${proposalId} par: ${voterWallet.address}`);

    // Vérifier l'éligibilité du votant
    const isEligible = await governanceService.isMemberEligible(voterWallet.address);
    if (!isEligible) {
      return res.status(403).json({
        success: false,
        message: 'Le votant n\'est pas un membre éligible de la DAO'
      });
    }

    // Vérifier si déjà voté
    const hasVoted = await governanceService.contract.hasVoted(proposalId, voterWallet.address);
    if (hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà voté pour cette proposition'
      });
    }

    const result = await governanceService.castVote(voterWallet, proposalId, support);

    res.json({
      success: true,
      vote: result.vote,
      txHash: result.txHash,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Erreur lors du vote:', error);

    // Si l'erreur vient du service avec un statut spécifique (ex: 400)
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        error: error.code || 'GOVERNANCE_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors du vote',
      error: error.message
    });
  }
};

/**
 * @desc Exécute une proposition après la fin du vote
 * @route POST /api/governance/proposals/:proposalId/execute
 * @access Public (mais vérifie les conditions)
 */
export const executeProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;

    console.log(`⚡ Exécution de la proposition ${proposalId}`);

    const result = await governanceService.executeProposal(proposalId);

    res.json({
      success: true,
      execution: result.execution,
      txHash: result.txHash,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'exécution de la proposition',
      error: error.message
    });
  }
};

/**
 * @desc Annule une proposition (modérateurs uniquement)
 * @route POST /api/governance/proposals/:proposalId/cancel
 * @access Moderators
 */
export const cancelProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Raison de l\'annulation requise'
      });
    }

    console.log(`❌ Annulation de la proposition ${proposalId}`);

    const result = await governanceService.cancelProposal(proposalId, reason);

    res.json({
      success: true,
      cancellation: result.cancellation,
      txHash: result.txHash,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'annulation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la proposition',
      error: error.message
    });
  }
};

/*//////////////////////////////////////////////////////////////
                       CONTEST MANAGEMENT
//////////////////////////////////////////////////////////////*/

/**
 * @desc Dépose une contestation
 * @route POST /api/governance/proposals/:proposalId/contest
 * @access Members
 */
export const raiseContest = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { contestantAddress, phoneNumber, pin, reason, evidenceCID } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Raison de la contestation requise'
      });
    }

    let contestantWallet;

    // Récupérer le wallet du contestant
    if (phoneNumber && pin) {
      try {
        const walletResult = phoneWalletService.createOrGetWalletFromPhone(phoneNumber, pin);
        if (!walletResult.success) {
          return res.status(400).json({
            success: false,
            message: 'Informations de téléphone/PIN invalides'
          });
        }

        const privateKey = phoneWalletService.derivePrivateKeyFromPhone(phoneNumber, pin);
        contestantWallet = {
          address: walletResult.wallet.address,
          privateKey: privateKey
        };
      } catch (walletError) {
        return res.status(400).json({
          success: false,
          message: 'Erreur lors de la récupération du wallet',
          error: walletError.message
        });
      }
    } else if (contestantAddress) {
      return res.status(400).json({
        success: false,
        message: 'Authentification par téléphone/PIN requise'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Téléphone/PIN requis pour l\'authentification'
      });
    }

    console.log(`⚖️  Contestation de la proposition ${proposalId} par: ${contestantWallet.address}`);

    const result = await governanceService.raiseContest(
      contestantWallet,
      proposalId,
      reason,
      evidenceCID || ''
    );

    res.status(201).json({
      success: true,
      contest: result.contest,
      txHash: result.txHash,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Erreur lors de la contestation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la contestation',
      error: error.message
    });
  }
};

/**
 * @desc Résout une contestation (validateurs uniquement)
 * @route POST /api/governance/contests/:contestId/resolve
 * @access Validators
 */
export const resolveContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { uphold, resolutionNote } = req.body;

    if (uphold === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Décision de résolution requise (uphold: true/false)'
      });
    }

    if (!resolutionNote || resolutionNote.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Note de résolution requise'
      });
    }

    console.log(`⚖️  Résolution de la contestation ${contestId}`);

    const result = await governanceService.resolveContest(contestId, uphold, resolutionNote);

    res.json({
      success: true,
      resolution: result.resolution,
      txHash: result.txHash,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Erreur lors de la résolution:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la résolution de la contestation',
      error: error.message
    });
  }
};

/**
 * @desc Récupère une contestation par ID
 * @route GET /api/governance/contests/:contestId
 * @access Public
 */
export const getContest = async (req, res) => {
  try {
    const { contestId } = req.params;

    console.log(`⚖️  Récupération de la contestation ${contestId}`);

    const contest = await governanceService.getContest(contestId);

    res.json({
      success: true,
      contest
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de contestation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la contestation',
      error: error.message
    });
  }
};

/*//////////////////////////////////////////////////////////////
                      DASHBOARD & ANALYTICS
//////////////////////////////////////////////////////////////*/

/**
 * @desc Dashboard principal avec statistiques de gouvernance
 * @route GET /api/governance/dashboard
 * @access Public
 */
export const getDashboard = async (req, res) => {
  try {
    console.log('📊 Génération du dashboard de gouvernance');

    // Récupération des données de base
    const [
      currentProposalId,
      totalMembers,
      proposalEvents,
      governanceParams
    ] = await Promise.all([
      governanceService.getCurrentProposalId(),
      governanceService.getTotalActiveMembers(),
      governanceService.getProposalEvents('earliest', 'latest'),
      governanceService.getGovernanceParameters()
    ]);

    // Récupération des détails des propositions récentes
    const recentProposals = await Promise.all(
      proposalEvents.slice(-10).map(async (event) => {
        try {
          const proposal = await governanceService.getProposal(event.proposalId);
          return {
            ...proposal,
            ...event,
            impactLevelText: ['Faible', 'Modéré', 'Fort'][proposal.impactLevel],
            statusText: ['En attente', 'Actif', 'Adopté', 'Rejeté', 'Exécuté', 'Annulé'][proposal.status]
          };
        } catch (error) {
          return null;
        }
      })
    );

    const validProposals = recentProposals.filter(p => p !== null);

    // Calcul des statistiques
    const stats = {
      overview: {
        totalProposals: parseInt(currentProposalId),
        totalMembers: parseInt(totalMembers),
        activeProposals: validProposals.filter(p => p.status === 1).length,
        executedProposals: validProposals.filter(p => p.status === 4).length
      },
      proposalsByStatus: {
        pending: validProposals.filter(p => p.status === 0).length,
        active: validProposals.filter(p => p.status === 1).length,
        succeeded: validProposals.filter(p => p.status === 2).length,
        defeated: validProposals.filter(p => p.status === 3).length,
        executed: validProposals.filter(p => p.status === 4).length,
        cancelled: validProposals.filter(p => p.status === 5).length
      },
      proposalsByImpact: {
        low: validProposals.filter(p => p.impactLevel === 0).length,
        medium: validProposals.filter(p => p.impactLevel === 1).length,
        high: validProposals.filter(p => p.impactLevel === 2).length
      },
      participation: {
        averageVotes: validProposals.length > 0 ?
          Math.round(validProposals.reduce((sum, p) =>
            sum + parseInt(p.votesFor) + parseInt(p.votesAgainst), 0) / validProposals.length) : 0,
        participationRate: totalMembers > 0 && validProposals.length > 0 ?
          Math.round((validProposals.reduce((sum, p) =>
            sum + parseInt(p.votesFor) + parseInt(p.votesAgainst), 0) /
            (validProposals.length * parseInt(totalMembers))) * 100) : 0
      }
    };

    res.json({
      success: true,
      dashboard: {
        statistics: stats,
        recentProposals: validProposals.slice(-5),
        governanceParameters: {
          votingPeriod: `${Math.round(parseInt(governanceParams.votingPeriod) / 86400)} jours`,
          quorumRequired: `${governanceParams.quorumPercentage}%`,
          approvalThreshold: `${governanceParams.minApprovalPercentage}%`,
          contestWindow: `${Math.round(parseInt(governanceParams.contestWindow) / 3600)} heures`
        },
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération du dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du dashboard',
      error: error.message
    });
  }
};

/**
 * @desc Récupère les votes d'une proposition
 * @route GET /api/governance/proposals/:proposalId/votes
 * @access Public
 */
export const getProposalVotes = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { fromBlock = 'earliest', toBlock = 'latest' } = req.query;

    console.log(`🗳️  Récupération des votes pour la proposition ${proposalId}`);

    const votes = await governanceService.getVoteEvents(proposalId, fromBlock, toBlock);

    // Calcul du résumé
    const summary = {
      totalVotes: votes.length,
      votesFor: votes.filter(v => v.support).length,
      votesAgainst: votes.filter(v => !v.support).length,
      supportPercentage: votes.length > 0 ?
        Math.round((votes.filter(v => v.support).length / votes.length) * 100) : 0
    };

    // Ajout d'informations enrichies aux votes
    const enrichedVotes = votes.map(vote => ({
      ...vote,
      supportText: vote.support ? 'Pour' : 'Contre',
      timestamp: new Date(parseInt(vote.timestamp) * 1000).toISOString()
    }));

    res.json({
      success: true,
      proposalId,
      votes: enrichedVotes,
      summary
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des votes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des votes',
      error: error.message
    });
  }
};