import dotenv from 'dotenv';
import { deploymentManager } from '../utils/deploymentManager.js';

dotenv.config();

// Lire les informations de déploiement depuis deployments.json
const deployments = deploymentManager.readDeployments();
const governanceContract = deployments.contracts?.GovernanceDAO || {};
const tokenContract = deployments.contracts?.Token || {};
const daoContract = deployments.contracts?.TokenGatedDao || {};

export const config = {
  // Configuration du serveur
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Configuration Celo
  celoRpcUrl: process.env.CELO_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org',
  celoChainId: parseInt(process.env.CELO_CHAIN_ID || '44787'),

  // Adresses des contrats (depuis deployments.json avec fallback sur .env)
  tokenContractAddress: tokenContract.address || process.env.TOKEN_CONTRACT_ADDRESS || '0xD27Da63615C3AC9cc91491C8e23A8C3Eb4f240EC',
  tokenDeploymentBlock: tokenContract.deploymentBlock || 0, // Optimisation: Bloc de départ pour le scan
  daoContractAddress: daoContract.address || process.env.DAO_CONTRACT_ADDRESS || '0xF57e75a597B85239F1125c30f6F5ec4896D66A68',
  governanceContractAddress: governanceContract.address || process.env.GOVERNANCE_CONTRACT_ADDRESS || '',

  // Bloc de déploiement du contrat de gouvernance (pour optimiser les requêtes d'événements)
  governanceDeploymentBlock: governanceContract.deploymentBlock || parseInt(process.env.GOVERNANCE_DEPLOYMENT_BLOCK || '0'),

  // Clé privée de l'administrateur
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',

  // Secret pour la dérivation des wallets
  walletDerivationSecret: process.env.WALLET_DERIVATION_SECRET || 'default-secret-please-change-in-production',

  // Montants de funding automatique (en CELO)
  initialWalletFunding: parseFloat(process.env.INITIAL_WALLET_FUNDING || '0.01'),  // Montant envoyé lors de la création de wallet
  minGasBalance: parseFloat(process.env.MIN_GAS_BALANCE || '0.005'),              // Seuil minimum de gas avant auto-funding
  autoGasAmount: parseFloat(process.env.AUTO_GAS_AMOUNT || '0.01'),               // Montant envoyé automatiquement si gas insuffisant
};

// Validation des variables d'environnement critiques
export const validateConfig = () => {
  const requiredEnvVars = ['ADMIN_PRIVATE_KEY'];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`⚠️  Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    console.warn('⚠️  Certaines fonctionnalités (comme le transfert de tokens) ne seront pas disponibles.');
  }

  // Affichage des informations de déploiement
  console.log('\n📦 Configuration des contrats:');
  if (governanceContract.address) {
    console.log(`   🏛️  GovernanceDAO: ${governanceContract.address}`);
    console.log(`      📍 Bloc de déploiement: ${governanceContract.deploymentBlock || 'non défini'}`);
  } else {
    console.warn('   ⚠️  GovernanceDAO non configuré');
  }

  if (tokenContract.address) {
    console.log(`   🪙  Token: ${tokenContract.address}`);
  }

  if (daoContract.address) {
    console.log(`   🏛️  TokenGatedDao: ${daoContract.address}`);
  }

  // Vérification du contrat de gouvernance
  if (!config.governanceContractAddress) {
    console.warn('⚠️  GOVERNANCE_CONTRACT_ADDRESS non configuré');
    console.warn('⚠️  Déployez d\'abord le contrat de gouvernance avec: cd hardhat && npx hardhat run scripts/deploy-governance.js');
  }

  // Avertissement pour le secret de dérivation
  if (!process.env.WALLET_DERIVATION_SECRET || process.env.WALLET_DERIVATION_SECRET === 'default-secret-please-change-in-production') {
    console.warn('⚠️  WALLET_DERIVATION_SECRET non configuré ou utilise la valeur par défaut');
    console.warn('⚠️  Définissez un secret fort en production pour sécuriser les wallets dérivés');
  }
};
