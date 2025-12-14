


Règles de gouvernance à intégrer directement dans le smart contract (spécification technique)
1. Principes généraux et contraintes de conception
Le smart contract doit refléter la logique “une personne = une voix”, garantir la transparence et l’immutabilité des actions, permettre des opérations de validation par des rôles (modérateurs, comité), et supporter un mécanisme de contestation. Techniquement, il doit utiliser des primitives robustes : contrôle d’accès basé sur AccessControl, mécanismes pausable/upgradeable optionnels, et émission d’événements pour chaque étape majeure.
Le contrat doit être conçu pour fonctionner avec la chaîne Celo et exposer des événements faciles à indexer par le middleware. L’éligibilité des membres (≥ 3 mois, ≥ 10 transactions) sera vérifiée principalement off-chain par le middleware mais matérialisée on-chain via une liste blanche (allowlist) signée ou par des fonctions d’autorisation (ex : registerMember(address) par un oracles/service d’attestation) afin d’éviter la surcharge on-chain.
2. Structures de données essentielles (modèles / structs)

Le smart contract doit contenir un type struct Proposal qui regroupe l’ensemble des métadonnées nécessaires et l’état :
struct Proposal {
    uint256 id;
    address proposer;
    string ipfsCID;           // description complète stockée en IPFS
    string title;
    uint8 impactLevel;       // 0=faible,1=modéré,2=fort
    uint256 startBlock;      // timestamp/block de début du vote
    uint256 endBlock;        // timestamp/block de fin du vote
    uint256 votesFor;
    uint256 votesAgainst;
    bool executed;
    bool cancelled;
    uint256 createdAt;
    mapping(address => bool) hasVoted; // pour éviter double vote
}
On ajoutera un enum ProposalStatus { Pending, Active, Succeeded, Defeated, Executed, Cancelled } pour faciliter la lecture de l’état.
Un struct Vote explicite n’est pas obligatoire si on stocke hasVoted et on incrémente votesFor / votesAgainst, mais il peut être utile pour l’audit :
struct Vote {
    address voter;
    bool support;
    uint256 timestamp;
}
Enfin, on prévoit des mappings : mapping(uint256 => Proposal) public proposals;, mapping(address => MemberInfo) public members; (si on souhaite stocker meta on-chain), et des sets pour moderators et validators (Committee).
3. Rôles et contrôle d’accès
Le contrat doit utiliser des rôles bytes32 via OpenZeppelin AccessControl : DEFAULT_ADMIN_ROLE, MODERATOR_ROLE, VALIDATOR_ROLE. Seul le détenteur d’DEFAULT_ADMIN_ROLE (par ex. multisig d’équipe projet) peut ajouter ou retirer des modérateurs ou validateurs.
Les fonctions addModerator(address), revokeModerator(address), addValidator(address), revokeValidator(address) seront restreintes à onlyRole(DEFAULT_ADMIN_ROLE) ou via un mécanisme de vote communautaire si vous préférez la décentralisation totale.
4. Cycle d’une proposition (fonctions publiques)
Le cycle est codé en fonctions claires, chacune émettant un événement :
createProposal(string ipfsCID, string title, uint8 impactLevel) external returns (uint256 proposalId)
La fonction crée une entrée Proposal, fixe startBlock = block.timestamp ou block.number + delay, calcule endBlock = startBlock + votingPeriod, et émet ProposalCreated(...). L’auteur doit être members[msg.sender] (vérifié).
moderateProposal(uint256 proposalId, uint8 moderationDecision) external onlyRole(MODERATOR_ROLE)
Cette fonction permet aux modérateurs de marquer une proposition comme conforme ou renvoyée pour correction. Elle émet ProposalModerated(...). Si renvoyée, la proposition passe en Pending jusqu’à correction.
castVote(uint256 proposalId, bool support) external
Vérifie : la proposition est Active, l’électeur est éligible (vérifié via allowlist ou members), et hasVoted[msg.sender] == false. Incrémente votesFor ou votesAgainst, marque hasVoted et émet VoteCast(...).
executeProposal(uint256 proposalId) external
Après la fermeture du vote, cette fonction calcule les résultats en vérifiant quorum et majority. Si validée, le champ executed est positionné et l’événement ProposalExecuted émis. Les actions automatiques (si toute exécution implique transfert de fonds) peuvent être implémentées via call to a treasury contract ou en émettant simplement un signal que le middleware traitera (meilleur pour sécurité; exécution off-chain par le service).
cancelProposal(uint256 proposalId) external onlyRole(MODERATOR_ROLE)
Pour annuler une proposition en cas de fraude ou non-conformité. Émet ProposalCancelled.
raiseContest(uint256 proposalId, string reason) external
Permet à un membre de porter un différend. Crée un record de contestation et émet ContestRaised.
resolveContest(uint256 proposalId, bool uphold, string resolutionNote) external onlyRole(VALIDATOR_ROLE)
Le comité tranche ; la décision est inscrite on-chain via ContestResolved.
amendRules(bytes calldata newRulesHash) external
Permet la mise à jour du hash des règles si une procédure d’amendement a été votée ; restreint au processus de gouvernance (exécutée uniquement après vote communautaire). Émet RulesAmended.
5. Paramètres gouvernance codés (configurables)
Les paramètres globaux devront être variables stockées dans le contrat mais modifiables uniquement via un vote de gouvernance ou par l’admin si le projet l’exige. Parmi eux :
uint256 public votingPeriod (ex. 7 jours en secondes / en blocs)
uint256 public quorumPercentage (ex. 30)
uint256 public minApprovalPercentage (ex. 50)
uint256 public contestWindow (48 heures en secondes)
uint256 public minMemberTransactions (10)
uint256 public minMemberAge (3 mois en secondes)
Changer ces valeurs doit se faire via proposeParameterChange(...) + vote + executeParameterChange(...).
6. Événements (pour indexation/middleware)
Le contrat doit émettre événements clairs et complets pour chaque action majeure afin de permettre au middleware d’écouter et d’indexer :
event ProposalCreated(uint256 indexed id, address indexed proposer, string ipfsCID, uint8 impactLevel, uint256 startBlock, uint256 endBlock);
event ProposalModerated(uint256 indexed id, address moderator, uint8 decision);
event VoteCast(uint256 indexed id, address indexed voter, bool support);
event ProposalExecuted(uint256 indexed id, uint256 votesFor, uint256 votesAgainst);
event ProposalCancelled(uint256 indexed id, address cancelledBy);
event ContestRaised(uint256 indexed id, address raisedBy, string reason);
event ContestResolved(uint256 indexed id, address resolvedBy, bool upheld, string resolutionNote);
event ModeratorAdded(address indexed moderator);
event ModeratorRemoved(address indexed moderator);
event RulesAmended(bytes32 newRulesHash, address amendedBy);
7. Sécurité et patterns recommandés
Le contrat doit intégrer les protections classiques : ReentrancyGuard, contrôle d’accès via AccessControl, Pausable pour capter urgence, et idéalement être déployé via un proxy (OpenZeppelin Upgradeable) si le besoin d’amendement technique existe. Les transferts de fonds doivent passer par un coffre (treasury) séparé avec des contrôles multi-signature.
8) Vérification off-chain des critères d’éligibilité
Étant donné que “10 transactions” et “3 mois” sont des critères qui pèsent lourd on-chain (coûts, storage), la meilleure pratique est de faire la validation off-chain par un service d’attestation (middleware). Le middleware fournit alors au smart contract une preuve (signature ou Merkle proof) ou appelle une fonction registerMember(address, attestData, signature) qui ajoute l’adresse à l’allowlist on-chain. Cette approche minimise les coûts on-chain tout en préservant la sécurité.













Spécification des endpoints du middleware
Le middleware expose une API REST (ou GraphQL) qui orchestre la logique métier, réalise les vérifications off-chain, gère l’IPFS, les notifications, et envoie les transactions signées au smart contract. Pour chaque endpoint je fournis la méthode HTTP, la route, le payload attendu, la logique métier côté middleware, les validations de sécurité et un exemple de réponse.
Remarque architecturale : le middleware doit être l’unique composant ayant accès à la clé proposant des transactions de modération si vous automatisez certaines actions (privilège restreint, stockée en HSM). Les utilisateurs signent leurs actions côté frontend (signature wallet) ; le middleware vérifie la signature avant de soumettre la transaction au contrat ou de produire une attestation.
Endpoints principaux (résumé explicatif puis détails)
Je vais décrire chaque endpoint en prose en indiquant sa finalité, puis fournir la signature technique.
1) POST /api/v1/proposals/create — soumettre une proposition
Cet endpoint reçoit depuis le front la proposition complète (titre, résumé etCID IPFS du contenu détaillé), vérifie l’éligibilité du membre en consultant la base d’attestations (ancienneté, nombre de transactions), sauvegarde le contenu détaillé sur IPFS si nécessaire, et construit la transaction qui appelle createProposal sur le smart contract. Il renvoie au frontend l’identifiant de la proposition et le hash de transaction une fois la TX minée ou la preuve d’envoi si vous utilisez relayer.
Payload attendu :
{
  "proposer": "0x..",
  "title": "Construction d'un puits",
  "ipfsCID": "Qm...",
  "impactLevel": 2
}
La logique middleware vérifie la signature du proposer (signature off-chain), checke l’éligibilité via attestations et déclenche la transaction on-chain. En cas d’inéligibilité, l’API renvoie un message clair.
Réponse :
{ "status":"submitted", "proposalId": 123, "txHash": "0x..." }
2) POST /api/v1/proposals/:id/moderate — action de modération par modérateur
Ce endpoint permet aux modérateurs de valider ou rejeter une proposition avant sa mise au vote. Le middleware vérifie que l’appelant possède le rôle MODERATOR (auth via wallet + vérif rôle dans la DAO), puis appelle moderateProposal on-chain. Il enregistre la décision dans le journal d’audit et notifie le propositeur.
Payload minimal :
{ "moderator": "0x...", "decision": "approve" } // decision: approve|reject|request_changes
Réponse :
{ "status": "moderated", "proposalId": 123, "decision": "approve", "txHash":"0x..." }
3) POST /api/v1/proposals/:id/vote — voter sur une proposition
Le vote étant une action signée par l’utilisateur via son wallet, le frontend envoie la signature (ou la TX est directement signée par le wallet). Le middleware valide la signature, vérifie l’éligibilité actuelle du votant, et soumet la transaction castVote au contrat. Il peut aussi accepter des votes via un relayer si vous voulez supporter les utilisateurs sans gas (mais sur Celo, gasless patterns existent via relayers).
Payload :
{ "voter":"0x...", "support": true, "signature": "0x..." }
Réponse :
{ "status":"vote_received", "proposalId":123, "txHash":"0x..." }
4) GET /api/v1/proposals/:id — récupérer l’état complet d’une proposition
Le middleware agrège les données on-chain (via lecteur d’événements) et off-chain (IPFS metadata, statut de modération, contestations) et renvoie un objet détaillé qui sera exposé au dashboard.
Réponse structurée :
Contient title, ipfsCID, start/end, votesFor/Against, status, moderatorsNotes, contestations[], events[].
5) GET /api/v1/proposals — liste et filtrage
Endpoint paginé qui liste les propositions avec filtres (status, impactLevel, proposer, date range). Le middleware supporte la recherche textuelle via l’indexation IPFS metadata ou ElasticSearch.
6) POST /api/v1/proposals/:id/contest — déposer une contestation
Permet à un membre d’enregistrer une contestation dans la fenêtre prévue (48h). Le middleware vérifie délai, sauvegarde la preuve (texte, pièces jointes) sur IPFS, et appelle raiseContest on-chain si la politique exige un enregistrement on-chain.
Payload :
{ "raisedBy":"0x...", "reason":"irregular vote count", "evidenceCID":"Qm..." }
7) POST /api/v1/contest/:id/resolve — trancher une contestation (comité)
Endpoint restreint aux validateurs/committee. Après examen physique, le middleware soumet resolveContest on-chain. La résolution inclut la décision (uphold ou dismiss) et une justification.
8) POST /api/v1/members/register — enregistrement / attestation d’éligibilité
Ce endpoint est clé : il reçoit les données d’attestation (réconciliées par le backend) sur l’ancienneté et le nombre de transactions et inscrit l’adresse dans l’allowlist on-chain via registerMember. Si vous utilisez attestation signée, le middleware vérifie la signature d’un oracle puis appelle le smart contract pour setAllowlist.
9) POST /api/v1/roles/moderator et DELETE /api/v1/roles/moderator — gestion des modérateurs
Endpoints admin (ou process de vote) pour ajouter/retirer un modérateur. Le middleware vérifie la provenance (clé HSM/admin multisig) puis appelle grantRole(MODERATOR_ROLE, address) ou revokeRole.
10) GET /api/v1/dashboard — données agrégées pour le tableau de bord
Retourne un objet synthétique avec : nombre de propositions ouvertes, taux de participation moyen, top proposers, état des contestations, statistiques par impactLevel. Le middleware alimente ce endpoint en lisant les events on-chain et les métadatas IPFS.
11) POST /api/v1/notifications/subscribe et /notify — système de notification
Endpoints pour s’abonner aux notifications (webhook/email/WhatsApp) et pour envoyer une notification à la fin d’un vote, en se basant sur un event ProposalExecuted.
12) GET /api/v1/events — stream d’événements on-chain pour front
Permet la lecture paginée d’événements récents (ProposalCreated, VoteCast, ContestRaised, etc.) indexés par le middleware via un service d’écoute (web3 subscription).
13) POST /api/v1/admin/amend-rules — déclencher l’amendement des règles (après vote)
Action exécutée uniquement après quorum et majorité validée on-chain ; le middleware applique l’amendement en appelant amendRules avec le newRulesHash.


Spécifications techniques complémentaires et recommandations pratiques
A) Authentification & sécurité
Les endpoints doivent forcer la signature wallet pour actions sensibles (createProposal, vote, contest). Le middleware valide la signature et compare l’adresse signataire au champ proposer/voter. Pour les actions restreintes (moderation, résolution), le middleware doit vérifier que l’adresse possède le rôle correspondant on-chain (hasRole(MODERATOR_ROLE, address)) avant d’accepter la requête.
Le secret clé du relayer ou du compte admin doit être stocké dans un HSM / secret manager et toutes les TX envoyées en production doivent être soumises via un service de queue (retry) et surveillées (notification en cas d’échec).
B) Traitement off-chain vs on-chain
Toutes les données lourdes (description complète, evidence) sont stockées sur IPFS et référencées par ipfsCID on-chain. Les règles d’éligibilité technique (10 transactions, 3 mois) sont d’abord évaluées off-chain puis matérialisées par une attestation on-chain (registerMember) afin d’éviter gas costs élevés et garder vérifiabilité.
C) Modèle de notification
Le middleware doit écouter les événements on-chain et déclencher des notifications (WhatsApp/Push/SMS) pour les étapes critiques : proposition modérée, vote ouvert, vote clos, décision exécutée, contestation ouverte/close.
D) Auditabilité et logs
Toutes les actions middleware doivent être journalisées (audit log) et stockées durablement pour permettre des audits indépendants. Les events smart contract résument la source de vérité, mais les logs middleware donnent le contexte (IPFS CID, preuves, analyse de conformité).
E) Tests et déploiement
Prévoir une suite de tests unitaires Solidity (Hardhat/Foundry) couvrant : création, modération, vote, égalité, contestation, résolution, param changes, pausable behavior. Préparer des scripts de migration pour environment staging (Celo Alfajores) puis mainnet.


Exemple minimal de signatures de fonctions Solidity (résumé lisible)

Pour faciliter l’implémentation, voici des signatures simplifiées à coder en Solidity (OpenZeppelin patterns) :
function createProposal(string calldata ipfsCID, string calldata title, uint8 impactLevel) external returns (uint256);
function moderateProposal(uint256 proposalId, uint8 decision) external onlyRole(MODERATOR_ROLE);
function castVote(uint256 proposalId, bool support) external;
function executeProposal(uint256 proposalId) external;
function cancelProposal(uint256 proposalId) external onlyRole(MODERATOR_ROLE);
function raiseContest(uint256 proposalId, string calldata reason) external;
function resolveContest(uint256 proposalId, bool uphold, string calldata note) external onlyRole(VALIDATOR_ROLE);
function registerMember(address member, bytes calldata attestation) external; // called by middleware/oracle
function amendRules(bytes32 newRulesHash) external; // executed only after governance process


Synthèse et prochain pas concrets
Pour avancer rapidement vers un prototype fonctionnel, je recommande l’ordre suivant : d’abord implémenter la logique on-chain minimale (Proposal struct, createProposal, castVote, events, roles) et déployer sur Celo testnet. Parallèlement, développer le middleware avec endpoints create, vote, getProposal, dashboard, et le module d’attestation registerMember. 
