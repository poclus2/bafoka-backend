// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title GovernanceDAO
 * @dev Smart contract pour la gouvernance de la DAO TokenGated
 * @dev Implémente le système "une personne = une voix" avec modération et contestation
 * 
 * Architecture:
 * - Contrôle d'accès via OpenZeppelin AccessControl
 * - Protection contre la réentrance
 * - Système de pause d'urgence
 * - Éligibilité des membres via allowlist off-chain
 * - Stockage IPFS pour le contenu détaillé
 * - Système de contestation avec fenêtre temporelle
 */
contract GovernanceDAO is AccessControl, ReentrancyGuard, Pausable {
    
    /*//////////////////////////////////////////////////////////////
                                 ENUMS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Statuts possibles d'une proposition
     */
    enum ProposalStatus { 
        Pending,    // En attente de modération
        Active,     // Vote en cours
        Succeeded,  // Adoptée (quorum + majorité atteints)
        Defeated,   // Rejetée (quorum non atteint ou majorité contre)
        Executed,   // Exécutée
        Cancelled   // Annulée par modération
    }
    
    /**
     * @dev Décisions de modération possibles
     */
    enum ModerationDecision {
        Approve,        // Approuver la proposition
        Reject,         // Rejeter définitivement
        RequestChanges  // Demander des modifications
    }
    
    /*//////////////////////////////////////////////////////////////
                                 ROLES
    //////////////////////////////////////////////////////////////*/
    
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Structure complète d'une proposition
     * @dev Suit les spécifications du document gov.md
     */
    struct Proposal {
        uint256 id;                    // ID unique de la proposition
        address proposer;              // Adresse du proposant
        string ipfsCID;               // CID IPFS du contenu détaillé
        string title;                 // Titre de la proposition
        uint8 impactLevel;            // 0=faible, 1=modéré, 2=fort
        uint256 startBlock;           // Timestamp de début du vote
        uint256 endBlock;             // Timestamp de fin du vote
        uint256 votesFor;             // Nombre de votes pour
        uint256 votesAgainst;         // Nombre de votes contre
        bool executed;                // Proposition exécutée
        bool cancelled;               // Proposition annulée
        uint256 createdAt;            // Timestamp de création
        ProposalStatus status;        // Statut actuel
        mapping(address => bool) hasVoted; // Mapping des votants
    }
    
    /**
     * @dev Structure d'une contestation
     */
    struct Contest {
        uint256 id;                   // ID unique de la contestation
        uint256 proposalId;           // ID de la proposition contestée
        address raisedBy;             // Adresse du contestant
        string reason;                // Raison de la contestation
        string evidenceCID;           // CID IPFS des preuves
        bool resolved;                // Contestation résolue
        bool upheld;                  // Décision finale (maintenue ou non)
        string resolutionNote;        // Note de résolution
        address resolvedBy;           // Adresse du validateur
        uint256 createdAt;            // Timestamp de création
        uint256 resolvedAt;           // Timestamp de résolution
    }
    
    /**
     * @dev Informations sur un membre
     * @dev Utilisé pour l'audit et les statistiques
     */
    struct MemberInfo {
        bool registered;              // Membre enregistré
        uint256 registeredAt;         // Date d'enregistrement
        uint256 transactionCount;     // Nombre de transactions validées
        bool isActive;                // Statut actif
    }
    
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    
    // Compteurs pour les IDs
    uint256 private _proposalIdCounter;
    uint256 private _contestIdCounter;
    
    // Mappings principaux
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => Contest) public contests;
    mapping(address => MemberInfo) public members;
    mapping(address => bool) public allowList;
    
    // Paramètres de gouvernance configurables
    uint256 public votingPeriod = 7 days;              // Période de vote (7 jours)
    uint256 public quorumPercentage = 30;              // Quorum requis (30%)
    uint256 public minApprovalPercentage = 50;         // Majorité requise (50%)
    uint256 public contestWindow = 48 hours;           // Fenêtre de contestation (48h)
    uint256 public minMemberTransactions = 10;         // Minimum de transactions
    uint256 public minMemberAge = 90 days;             // Ancienneté minimum (3 mois)
    
    // Hash des règles de gouvernance
    bytes32 public rulesHash;
    
    // Statistiques
    uint256 public totalActiveMembers;
    
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Émis lors de la création d'une proposition
     */
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string ipfsCID,
        uint8 impactLevel,
        uint256 startBlock,
        uint256 endBlock
    );
    
    /**
     * @dev Émis lors de la modération d'une proposition
     */
    event ProposalModerated(
        uint256 indexed id,
        address indexed moderator,
        uint8 decision,
        string note
    );
    
    /**
     * @dev Émis lors d'un vote
     */
    event VoteCast(
        uint256 indexed id,
        address indexed voter,
        bool support,
        uint256 timestamp
    );
    
    /**
     * @dev Émis lors de l'exécution d'une proposition
     */
    event ProposalExecuted(
        uint256 indexed id,
        uint256 votesFor,
        uint256 votesAgainst,
        bool succeeded
    );
    
    /**
     * @dev Émis lors de l'annulation d'une proposition
     */
    event ProposalCancelled(
        uint256 indexed id,
        address indexed cancelledBy,
        string reason
    );
    
    /**
     * @dev Émis lors du dépôt d'une contestation
     */
    event ContestRaised(
        uint256 indexed contestId,
        uint256 indexed proposalId,
        address indexed raisedBy,
        string reason
    );
    
    /**
     * @dev Émis lors de la résolution d'une contestation
     */
    event ContestResolved(
        uint256 indexed contestId,
        uint256 indexed proposalId,
        address indexed resolvedBy,
        bool upheld,
        string resolutionNote
    );
    
    /**
     * @dev Émis lors de l'enregistrement d'un membre
     */
    event MemberRegistered(
        address indexed member,
        uint256 transactionCount,
        uint256 timestamp
    );
    
    /**
     * @dev Émis lors de la désinscription d'un membre
     */
    event MemberDeregistered(
        address indexed member,
        uint256 timestamp
    );
    
    /**
     * @dev Émis lors de la modification des règles
     */
    event RulesAmended(
        bytes32 newRulesHash,
        address indexed amendedBy
    );
    
    /**
     * @dev Émis lors de l'ajout d'un modérateur
     */
    event ModeratorAdded(address indexed moderator);
    
    /**
     * @dev Émis lors de la suppression d'un modérateur
     */
    event ModeratorRemoved(address indexed moderator);
    
    /**
     * @dev Émis lors de l'ajout d'un validateur
     */
    event ValidatorAdded(address indexed validator);
    
    /**
     * @dev Émis lors de la suppression d'un validateur
     */
    event ValidatorRemoved(address indexed validator);
    
    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Vérifie qu'un membre est actif et éligible
     */
    modifier onlyActiveMember() {
        require(allowList[msg.sender], "Governance: Not an active member");
        require(members[msg.sender].isActive, "Governance: Member not active");
        _;
    }
    
    /**
     * @dev Vérifie qu'une proposition existe
     */
    modifier proposalExists(uint256 proposalId) {
        require(
            proposalId > 0 && proposalId <= _proposalIdCounter,
            "Governance: Proposal does not exist"
        );
        _;
    }
    
    /**
     * @dev Vérifie qu'une contestation existe
     */
    modifier contestExists(uint256 contestId) {
        require(
            contestId > 0 && contestId <= _contestIdCounter,
            "Governance: Contest does not exist"
        );
        _;
    }
    
    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Initialise le contrat de gouvernance
     * @param admin Adresse de l'administrateur principal
     */
    constructor(address admin) {
        require(admin != address(0), "Governance: Invalid admin address");
        
        // Attribution du rôle d'administrateur
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        
        // Hash initial des règles
        rulesHash = keccak256("TokenGated DAO Rules v1.0");
        
        emit RulesAmended(rulesHash, admin);
    }
    
    /*//////////////////////////////////////////////////////////////
                         MEMBER MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Enregistre un nouveau membre dans la DAO
     * @dev Fonction appelée par l'admin après vérification off-chain
     * @param member Adresse du membre à enregistrer
     * @param transactionCount Nombre de transactions validées off-chain
     * @param attestation Données d'attestation (signature, preuve)
     */
    function registerMember(
        address member,
        uint256 transactionCount,
        bytes calldata attestation
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(member != address(0), "Governance: Invalid member address");
        require(!allowList[member], "Governance: Member already registered");
        require(
            transactionCount >= minMemberTransactions,
            "Governance: Insufficient transaction count"
        );
        
        // Enregistrement du membre
        members[member] = MemberInfo({
            registered: true,
            registeredAt: block.timestamp,
            transactionCount: transactionCount,
            isActive: true
        });
        
        // Ajout à la liste blanche
        allowList[member] = true;
        totalActiveMembers++;
        
        emit MemberRegistered(member, transactionCount, block.timestamp);
    }
    
    /**
     * @dev Désenregistre un membre de la DAO
     * @param member Adresse du membre à désenregistrer
     */
    function deregisterMember(address member) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(allowList[member], "Governance: Member not registered");
        
        // Désactivation du membre
        allowList[member] = false;
        members[member].isActive = false;
        
        if (totalActiveMembers > 0) {
            totalActiveMembers--;
        }
        
        emit MemberDeregistered(member, block.timestamp);
    }
    
    /*//////////////////////////////////////////////////////////////
                        PROPOSAL MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Crée une nouvelle proposition
     * @param ipfsCID CID IPFS du contenu détaillé
     * @param title Titre de la proposition
     * @param impactLevel Niveau d'impact (0=faible, 1=modéré, 2=fort)
     * @return proposalId ID de la proposition créée
     */
    function createProposal(
        string calldata ipfsCID,
        string calldata title,
        uint8 impactLevel
    ) external onlyActiveMember whenNotPaused nonReentrant returns (uint256) {
        require(bytes(ipfsCID).length > 0, "Governance: Empty IPFS CID");
        require(bytes(title).length > 0, "Governance: Empty title");
        require(impactLevel <= 2, "Governance: Invalid impact level");
        
        // Incrémentation du compteur et récupération de l'ID
        _proposalIdCounter++;
        uint256 proposalId = _proposalIdCounter;
        
        // Initialisation de la proposition
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.ipfsCID = ipfsCID;
        newProposal.title = title;
        newProposal.impactLevel = impactLevel;
        newProposal.startBlock = block.timestamp;
        newProposal.endBlock = block.timestamp + votingPeriod;
        newProposal.createdAt = block.timestamp;
        newProposal.status = ProposalStatus.Pending; // En attente de modération
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            ipfsCID,
            impactLevel,
            newProposal.startBlock,
            newProposal.endBlock
        );
        
        return proposalId;
    }
    
    /**
     * @dev Modère une proposition (modérateurs uniquement)
     * @param proposalId ID de la proposition
     * @param decision Décision de modération
     * @param note Note explicative (optionnelle)
     */
    function moderateProposal(
        uint256 proposalId,
        uint8 decision,
        string calldata note
    ) external onlyRole(MODERATOR_ROLE) proposalExists(proposalId) whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(
            proposal.status == ProposalStatus.Pending,
            "Governance: Proposal not pending moderation"
        );
        
        // Application de la décision
        if (decision == uint8(ModerationDecision.Approve)) {
            proposal.status = ProposalStatus.Active;
        } else if (decision == uint8(ModerationDecision.Reject)) {
            proposal.status = ProposalStatus.Defeated;
        }
        // RequestChanges garde le statut Pending
        
        emit ProposalModerated(proposalId, msg.sender, decision, note);
    }
    
    /**
     * @dev Vote sur une proposition
     * @param proposalId ID de la proposition
     * @param support true pour voter pour, false pour voter contre
     */
    function castVote(
        uint256 proposalId,
        bool support
    ) external onlyActiveMember proposalExists(proposalId) whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            proposal.status == ProposalStatus.Active,
            "Governance: Proposal not active"
        );
        require(
            block.timestamp >= proposal.startBlock,
            "Governance: Voting not started"
        );
        require(
            block.timestamp <= proposal.endBlock,
            "Governance: Voting period ended"
        );
        require(
            !proposal.hasVoted[msg.sender],
            "Governance: Already voted"
        );
        
        // Enregistrement du vote
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }
        
        emit VoteCast(proposalId, msg.sender, support, block.timestamp);
    }
    
    /**
     * @dev Exécute une proposition après la fin du vote
     * @param proposalId ID de la proposition
     */
    function executeProposal(
        uint256 proposalId
    ) external proposalExists(proposalId) whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            proposal.status == ProposalStatus.Active,
            "Governance: Proposal not active"
        );
        require(
            block.timestamp > proposal.endBlock,
            "Governance: Voting still active"
        );
        require(!proposal.executed, "Governance: Already executed");
        
        // Calcul des résultats
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        bool quorumReached = false;
        bool majorityReached = false;
        
        // Vérification du quorum
        if (totalActiveMembers > 0) {
            quorumReached = (totalVotes * 100) >= (totalActiveMembers * quorumPercentage);
        }
        
        // Vérification de la majorité
        if (totalVotes > 0) {
            majorityReached = (proposal.votesFor * 100) >= (totalVotes * minApprovalPercentage);
        }
        
        // Détermination du succès
        bool succeeded = quorumReached && majorityReached;
        
        // Mise à jour du statut
        proposal.executed = true;
        proposal.status = succeeded ? ProposalStatus.Succeeded : ProposalStatus.Defeated;
        
        emit ProposalExecuted(
            proposalId,
            proposal.votesFor,
            proposal.votesAgainst,
            succeeded
        );
    }
    
    /**
     * @dev Annule une proposition (modérateurs uniquement)
     * @param proposalId ID de la proposition
     * @param reason Raison de l'annulation
     */
    function cancelProposal(
        uint256 proposalId,
        string calldata reason
    ) external onlyRole(MODERATOR_ROLE) proposalExists(proposalId) whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Governance: Cannot cancel executed proposal");
        require(!proposal.cancelled, "Governance: Already cancelled");
        
        proposal.cancelled = true;
        proposal.status = ProposalStatus.Cancelled;
        
        emit ProposalCancelled(proposalId, msg.sender, reason);
    }
    
    /*//////////////////////////////////////////////////////////////
                         CONTEST MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Dépose une contestation
     * @param proposalId ID de la proposition contestée
     * @param reason Raison de la contestation
     * @param evidenceCID CID IPFS des preuves
     * @return contestId ID de la contestation créée
     */
    function raiseContest(
        uint256 proposalId,
        string calldata reason,
        string calldata evidenceCID
    ) external onlyActiveMember proposalExists(proposalId) whenNotPaused returns (uint256) {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            block.timestamp <= proposal.endBlock + contestWindow,
            "Governance: Contest period expired"
        );
        require(bytes(reason).length > 0, "Governance: Empty reason");
        
        // Incrémentation et création de la contestation
        _contestIdCounter++;
        uint256 contestId = _contestIdCounter;
        
        contests[contestId] = Contest({
            id: contestId,
            proposalId: proposalId,
            raisedBy: msg.sender,
            reason: reason,
            evidenceCID: evidenceCID,
            resolved: false,
            upheld: false,
            resolutionNote: "",
            resolvedBy: address(0),
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        
        emit ContestRaised(contestId, proposalId, msg.sender, reason);
        
        return contestId;
    }
    
    /**
     * @dev Résout une contestation (validateurs uniquement)
     * @param contestId ID de la contestation
     * @param uphold true si la contestation est justifiée
     * @param resolutionNote Note de résolution
     */
    function resolveContest(
        uint256 contestId,
        bool uphold,
        string calldata resolutionNote
    ) external onlyRole(VALIDATOR_ROLE) contestExists(contestId) whenNotPaused {
        Contest storage contest = contests[contestId];
        require(!contest.resolved, "Governance: Contest already resolved");
        
        // Mise à jour de la contestation
        contest.resolved = true;
        contest.upheld = uphold;
        contest.resolutionNote = resolutionNote;
        contest.resolvedBy = msg.sender;
        contest.resolvedAt = block.timestamp;
        
        emit ContestResolved(
            contestId,
            contest.proposalId,
            msg.sender,
            uphold,
            resolutionNote
        );
    }
    
    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Met à jour le hash des règles de gouvernance
     * @param newRulesHash Nouveau hash des règles
     */
    function amendRules(bytes32 newRulesHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRulesHash != bytes32(0), "Governance: Invalid rules hash");
        
        rulesHash = newRulesHash;
        emit RulesAmended(newRulesHash, msg.sender);
    }
    
    /**
     * @dev Met à jour les paramètres de gouvernance
     * @param _votingPeriod Nouvelle période de vote
     * @param _quorumPercentage Nouveau pourcentage de quorum
     * @param _minApprovalPercentage Nouveau pourcentage de majorité
     * @param _contestWindow Nouvelle fenêtre de contestation
     */
    function updateGovernanceParameters(
        uint256 _votingPeriod,
        uint256 _quorumPercentage,
        uint256 _minApprovalPercentage,
        uint256 _contestWindow
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_quorumPercentage <= 100, "Governance: Invalid quorum percentage");
        require(_minApprovalPercentage <= 100, "Governance: Invalid approval percentage");
        require(_votingPeriod > 0, "Governance: Invalid voting period");
        require(_contestWindow > 0, "Governance: Invalid contest window");
        
        votingPeriod = _votingPeriod;
        quorumPercentage = _quorumPercentage;
        minApprovalPercentage = _minApprovalPercentage;
        contestWindow = _contestWindow;
    }
    
    /**
     * @dev Ajoute un modérateur
     * @param moderator Adresse du nouveau modérateur
     */
    function addModerator(address moderator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(moderator != address(0), "Governance: Invalid moderator address");
        
        _grantRole(MODERATOR_ROLE, moderator);
        emit ModeratorAdded(moderator);
    }
    
    /**
     * @dev Supprime un modérateur
     * @param moderator Adresse du modérateur à supprimer
     */
    function removeModerator(address moderator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MODERATOR_ROLE, moderator);
        emit ModeratorRemoved(moderator);
    }
    
    /**
     * @dev Ajoute un validateur
     * @param validator Adresse du nouveau validateur
     */
    function addValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(validator != address(0), "Governance: Invalid validator address");
        
        _grantRole(VALIDATOR_ROLE, validator);
        emit ValidatorAdded(validator);
    }
    
    /**
     * @dev Supprime un validateur
     * @param validator Adresse du validateur à supprimer
     */
    function removeValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VALIDATOR_ROLE, validator);
        emit ValidatorRemoved(validator);
    }
    
    /*//////////////////////////////////////////////////////////////
                             VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Récupère les détails d'une proposition
     * @param proposalId ID de la proposition
     */
    function getProposal(uint256 proposalId)
        external
        view
        proposalExists(proposalId)
        returns (
            uint256 id,
            address proposer,
            string memory ipfsCID,
            string memory title,
            uint8 impactLevel,
            uint256 startBlock,
            uint256 endBlock,
            uint256 votesFor,
            uint256 votesAgainst,
            bool executed,
            bool cancelled,
            uint256 createdAt,
            ProposalStatus status
        )
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.ipfsCID,
            proposal.title,
            proposal.impactLevel,
            proposal.startBlock,
            proposal.endBlock,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.executed,
            proposal.cancelled,
            proposal.createdAt,
            proposal.status
        );
    }
    
    /**
     * @dev Vérifie si un utilisateur a voté pour une proposition
     * @param proposalId ID de la proposition
     * @param voter Adresse du votant
     * @return true si l'utilisateur a voté
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }
    
    /**
     * @dev Récupère les détails d'une contestation
     * @param contestId ID de la contestation
     */
    function getContest(uint256 contestId)
        external
        view
        contestExists(contestId)
        returns (
            uint256 id,
            uint256 proposalId,
            address raisedBy,
            string memory reason,
            string memory evidenceCID,
            bool resolved,
            bool upheld,
            string memory resolutionNote,
            address resolvedBy,
            uint256 createdAt,
            uint256 resolvedAt
        )
    {
        Contest storage contest = contests[contestId];
        return (
            contest.id,
            contest.proposalId,
            contest.raisedBy,
            contest.reason,
            contest.evidenceCID,
            contest.resolved,
            contest.upheld,
            contest.resolutionNote,
            contest.resolvedBy,
            contest.createdAt,
            contest.resolvedAt
        );
    }
    
    /**
     * @dev Récupère le nombre total de propositions
     * @return Nombre de propositions créées
     */
    function getCurrentProposalId() external view returns (uint256) {
        return _proposalIdCounter;
    }
    
    /**
     * @dev Récupère le nombre total de contestations
     * @return Nombre de contestations créées
     */
    function getCurrentContestId() external view returns (uint256) {
        return _contestIdCounter;
    }
    
    /**
     * @dev Vérifie si un membre est éligible et actif
     * @param member Adresse du membre
     * @return true si le membre est éligible
     */
    function isEligibleMember(address member) external view returns (bool) {
        return allowList[member] && members[member].isActive;
    }
    
    /*//////////////////////////////////////////////////////////////
                            EMERGENCY FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Met en pause le contrat (urgence)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Reprend le fonctionnement du contrat
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /*//////////////////////////////////////////////////////////////
                            SUPPORTSINTERFACE
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Voir {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}