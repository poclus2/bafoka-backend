#!/usr/bin/env node

/**
 * Script pour synchroniser les ABIs et adresses des contrats entre Hardhat et le backend
 * 
 * Ce script :
 * 1. Copie l'ABI GovernanceDAO.json vers le backend
 * 2. Met à jour le fichier abis.js avec la vraie ABI
 * 3. Met à jour les adresses des contrats dans la configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Synchronisation des ABIs et contrats...');
console.log('===========================================');

// Chemins des fichiers
const artifactsPath = path.join(__dirname, '../artifacts/contracts/GovernanceDAO.sol/GovernanceDAO.json');
const backendAbisPath = path.join(__dirname, '../../src/contracts/abis.js');
const deploymentConfigPath = path.join(__dirname, '../deployments');

try {
  // 1. Lire l'artifact Hardhat
  console.log('📖 Lecture de l\'artifact Hardhat...');
  if (!fs.existsSync(artifactsPath)) {
    throw new Error('Artifact GovernanceDAO.json non trouvé. Compilez d\'abord le contrat.');
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
  const abi = artifact.abi;
  console.log('✅ ABI GovernanceDAO lu avec', abi.length, 'fonctions/événements');

  // 2. Trouver les fichiers de déploiement
  console.log('\n🔍 Recherche des déploiements...');
  const deploymentFiles = fs.readdirSync(deploymentConfigPath)
    .filter(file => file.startsWith('governance-') && file.endsWith('.json'));
  
  console.log('📋 Fichiers de déploiement trouvés:', deploymentFiles);

  // 3. Lire le fichier abis.js actuel
  console.log('\n📝 Mise à jour du fichier abis.js...');
  let abisContent = fs.readFileSync(backendAbisPath, 'utf8');

  // 4. Remplacer l'ABI GovernanceDAO dans le fichier
  const abiString = JSON.stringify(abi, null, 2);
  
  // Pattern pour trouver et remplacer l'ABI existante
  const abiPattern = /(export const GOVERNANCE_ABI = )\[[^\]]*\];/s;
  const newAbiDeclaration = `export const GOVERNANCE_ABI = ${abiString};`;
  
  if (abiPattern.test(abisContent)) {
    abisContent = abisContent.replace(abiPattern, newAbiDeclaration);
    console.log('✅ ABI GovernanceDAO mis à jour dans abis.js');
  } else {
    // Si l'ABI n'existe pas, l'ajouter à la fin
    abisContent += '\n\n// ABI GovernanceDAO (généré automatiquement)\n' + newAbiDeclaration;
    console.log('✅ ABI GovernanceDAO ajouté à abis.js');
  }

  // 5. Écrire le fichier mis à jour
  fs.writeFileSync(backendAbisPath, abisContent);

  // 6. Créer un fichier de configuration pour les adresses
  console.log('\n🏗️ Création du fichier de configuration des contrats...');
  const contractConfigPath = path.join(__dirname, '../../src/contracts/addresses.js');
  
  let contractConfig = '// Adresses des contrats déployés (mis à jour automatiquement)\n\n';
  
  // Ajouter les configurations pour chaque réseau
  deploymentFiles.forEach(file => {
    const deployment = JSON.parse(fs.readFileSync(path.join(deploymentConfigPath, file), 'utf8'));
    const network = deployment.network;
    const address = deployment.contractAddress;
    
    contractConfig += `// Réseau: ${network}\n`;
    contractConfig += `export const GOVERNANCE_ADDRESS_${network.toUpperCase()} = "${address}";\n\n`;
    
    console.log(`📍 ${network}: ${address}`);
  });

  // Ajouter une fonction utilitaire
  contractConfig += `
// Fonction utilitaire pour obtenir l'adresse selon l'environnement
export function getGovernanceAddress(network = 'hardhat') {
  switch (network.toLowerCase()) {
    case 'hardhat':
    case 'localhost':
      return GOVERNANCE_ADDRESS_HARDHAT;
    case 'alfajores':
      return GOVERNANCE_ADDRESS_ALFAJORES;
    case 'celo':
      return GOVERNANCE_ADDRESS_CELO;
    default:
      throw new Error(\`Réseau non supporté: \${network}\`);
  }
}

// Configuration par défaut
export const DEFAULT_NETWORK = process.env.NODE_ENV === 'production' ? 'celo' : 'hardhat';
export const DEFAULT_GOVERNANCE_ADDRESS = getGovernanceAddress(DEFAULT_NETWORK);
`;

  fs.writeFileSync(contractConfigPath, contractConfig);
  console.log('✅ Fichier addresses.js créé/mis à jour');

  // 7. Copier l'artifact complet pour référence
  console.log('\n📁 Copie de l\'artifact complet...');
  const backendArtifactsDir = path.join(__dirname, '../../src/contracts/artifacts');
  if (!fs.existsSync(backendArtifactsDir)) {
    fs.mkdirSync(backendArtifactsDir, { recursive: true });
  }
  
  fs.copyFileSync(artifactsPath, path.join(backendArtifactsDir, 'GovernanceDAO.json'));
  console.log('✅ Artifact copié vers le backend');

  console.log('\n🎉 Synchronisation terminée avec succès!');
  console.log('===========================================');
  console.log('📝 Fichiers mis à jour:');
  console.log('  - backend/src/contracts/abis.js (ABI mis à jour)');
  console.log('  - backend/src/contracts/addresses.js (adresses des contrats)');
  console.log('  - backend/src/contracts/artifacts/GovernanceDAO.json (artifact complet)');
  console.log('\n🔧 Prochaines étapes:');
  console.log('  1. Redémarrer le serveur backend');
  console.log('  2. Tester les endpoints governance');
  console.log('  3. Vérifier la connexion aux contrats');

} catch (error) {
  console.error('\n❌ Erreur lors de la synchronisation:');
  console.error(error.message);
  process.exit(1);
}