/**
 * Test de connexion entre le backend et le contrat GovernanceDAO
 * 
 * Ce script valide que :
 * 1. Le backend utilise la bonne ABI GovernanceDAO
 * 2. L'ABI est compatible avec les appels de fonction
 * 3. La configuration de connexion fonctionne
 */

const fs = require('fs');
const path = require('path');

// Import de la configuration backend
const governanceABI = require('../../src/contracts/abis.js').governanceABI;
const addresses = require('../../src/contracts/addresses.js');

console.log("🔍 Testing GovernanceDAO Backend Connection");
console.log("==========================================\n");

// 1. Vérification de l'ABI
console.log("📋 ABI Verification:");
console.log("   • ABI loaded:", governanceABI ? "✅" : "❌");
console.log("   • ABI functions count:", governanceABI ? governanceABI.length : 0);

if (governanceABI) {
  // Vérifier les fonctions essentielles
  const functions = governanceABI.filter(item => item.type === 'function');
  const events = governanceABI.filter(item => item.type === 'event');
  
  console.log("   • Functions found:", functions.length);
  console.log("   • Events found:", events.length);
  
  // Fonctions critiques à vérifier
  const criticalFunctions = [
    'createProposal',
    'vote',
    'executeProposal',
    'getProposal',
    'votingPeriod',
    'contestWindow',
    'quorumPercentage',
    'minApprovalPercentage'
  ];
  
  console.log("\n   🔧 Critical Functions Check:");
  criticalFunctions.forEach(funcName => {
    const found = functions.find(f => f.name === funcName);
    console.log(`   • ${funcName}: ${found ? '✅' : '❌'}`);
  });
}

// 2. Vérification des adresses
console.log("\n📍 Contract Addresses:");
console.log("   • Addresses module loaded:", addresses ? "✅" : "❌");

if (addresses) {
  console.log("   • getGovernanceAddress function:", typeof addresses.getGovernanceAddress === 'function' ? "✅" : "❌");
  
  try {
    const govAddress = addresses.getGovernanceAddress();
    console.log("   • Governance address:", govAddress || "❌ Not set");
    console.log("   • Address format valid:", govAddress && govAddress.startsWith('0x') && govAddress.length === 42 ? "✅" : "❌");
  } catch (error) {
    console.log("   • Address retrieval error:", error.message);
  }
}

// 3. Vérification de la configuration réseau
console.log("\n🌐 Network Configuration:");

const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  console.log("   • Backend .env file:", "✅");
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const rpcUrl = envContent.match(/CELO_RPC_URL=(.+)/)?.[1];
  const chainId = envContent.match(/CELO_CHAIN_ID=(.+)/)?.[1];
  const govAddress = envContent.match(/GOVERNANCE_CONTRACT_ADDRESS=(.+)/)?.[1];
  
  console.log("   • RPC URL configured:", rpcUrl ? "✅" : "❌");
  console.log("   • Chain ID configured:", chainId ? "✅" : "❌");
  console.log("   • Governance address configured:", govAddress ? "✅" : "❌");
  
  if (rpcUrl) console.log("   • RPC URL:", rpcUrl);
  if (chainId) console.log("   • Chain ID:", chainId);
  if (govAddress) console.log("   • Contract Address:", govAddress);
} else {
  console.log("   • Backend .env file:", "❌ Not found");
}

// 4. Test de compatibilité ethers
console.log("\n⚙️  Ethers Compatibility Test:");

try {
  // Simulation d'un appel backend
  const ethers = require('ethers');
  console.log("   • Ethers import:", "✅");
  console.log("   • Ethers version:", ethers.version);
  
  // Test de création d'interface avec l'ABI
  if (governanceABI) {
    const contractInterface = new ethers.utils.Interface(governanceABI);
    console.log("   • ABI Interface creation:", "✅");
    console.log("   • Functions in interface:", Object.keys(contractInterface.functions).length);
    
    // Test de quelques fonctions spécifiques
    const testFunctions = ['createProposal', 'vote', 'getProposal'];
    testFunctions.forEach(funcName => {
      try {
        const func = contractInterface.functions[funcName];
        console.log(`   • Function ${funcName} signature: ${func ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   • Function ${funcName} test: ❌ ${error.message}`);
      }
    });
  }
  
} catch (error) {
  console.log("   • Ethers test error:", error.message);
}

// 5. Résumé et recommandations
console.log("\n📊 Summary:");
console.log("==========================================");

let issues = [];
let successes = [];

if (!governanceABI) {
  issues.push("ABI not loaded - run sync-contracts script");
} else {
  successes.push("ABI loaded correctly");
}

if (!addresses || typeof addresses.getGovernanceAddress !== 'function') {
  issues.push("Addresses module not configured properly");
} else {
  successes.push("Address module configured");
}

try {
  const govAddress = addresses?.getGovernanceAddress();
  if (!govAddress || !govAddress.startsWith('0x')) {
    issues.push("Invalid governance contract address");
  } else {
    successes.push("Valid contract address");
  }
} catch (error) {
  issues.push("Cannot retrieve governance address");
}

console.log("✅ Successes:");
successes.forEach(success => console.log(`   • ${success}`));

if (issues.length > 0) {
  console.log("\n❌ Issues to fix:");
  issues.forEach(issue => console.log(`   • ${issue}`));
  
  console.log("\n🔧 Recommended actions:");
  if (issues.some(issue => issue.includes('ABI'))) {
    console.log("   1. Run: node scripts/sync-contracts.js");
  }
  if (issues.some(issue => issue.includes('address'))) {
    console.log("   2. Deploy contract and update .env files");
  }
  console.log("   3. Restart backend server");
  console.log("   4. Test API endpoints");
} else {
  console.log("\n🎉 All checks passed!");
  console.log("✅ Backend should be able to connect to GovernanceDAO contract");
  console.log("\n🚀 Next steps:");
  console.log("   1. Start/restart backend server");
  console.log("   2. Test governance endpoints:");
  console.log("      curl http://localhost:3001/api/governance/dashboard");
  console.log("   3. Create test proposals and test voting");
}

console.log("\n==========================================");
