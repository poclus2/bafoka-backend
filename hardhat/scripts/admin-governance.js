// Script d'administration pour GovernanceDAO
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Script d'administration pour GovernanceDAO
 * 
 * Ce script permet d'effectuer des actions administratives :
 * 1. Gestion des rôles (ajouter/supprimer modérateurs, validateurs)
 * 2. Enregistrement de membres en lot
 * 3. Actions d'urgence (pause/unpause)
 * 4. Configuration des paramètres
 */

async function main() {
  console.log("🛠️ GovernanceDAO Administration Tool");
  console.log("Network:", hre.network.name);
  console.log("=====================================");

  // Chargement de la configuration
  const configPath = path.join(__dirname, '..', 'deployments', `governance-${hre.network.name}.json`);
  
  if (!fs.existsSync(configPath)) {
    console.error("❌ No deployment configuration found");
    console.error("Run deployment script first: npx hardhat run scripts/deploy-governance.js");
    process.exit(1);
  }

  const deploymentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log("📍 Contract Address:", deploymentConfig.contractAddress);

  // Connexion au contrat
  const GovernanceDAO = await hre.ethers.getContractFactory("GovernanceDAO");
  const governanceDAO = GovernanceDAO.attach(deploymentConfig.contractAddress);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Admin Account:", deployer.address);

  // Vérification des permissions
  const DEFAULT_ADMIN_ROLE = await governanceDAO.DEFAULT_ADMIN_ROLE();
  const isAdmin = await governanceDAO.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  if (!isAdmin) {
    console.error("❌ Current account is not an admin of the contract");
    process.exit(1);
  }

  console.log("✅ Admin permissions verified");

  // Menu interactif
  console.log("\n📋 Available Actions:");
  console.log("1. Grant Roles");
  console.log("2. Revoke Roles"); 
  console.log("3. Register Members Batch");
  console.log("4. Emergency Pause");
  console.log("5. Emergency Unpause");
  console.log("6. View Contract Status");
  console.log("7. Exit");

  // Pour la démo, exécutons quelques actions courantes
  await demonstrateAdminActions(governanceDAO);
}

async function demonstrateAdminActions(governanceDAO) {
  console.log("\n🔧 DEMONSTRATING ADMIN ACTIONS");
  console.log("=====================================");

  try {
    // 1. Gestion des rôles
    await manageRoles(governanceDAO);
    
    // 2. Enregistrement de membres en lot
    await batchRegisterMembers(governanceDAO);
    
    // 3. Vérification de l'état
    await viewContractStatus(governanceDAO);
    
  } catch (error) {
    console.error("❌ Admin action failed:", error.message);
  }
}

async function manageRoles(governanceDAO) {
  console.log("\n👑 ROLE MANAGEMENT");
  console.log("-------------------");

  const [deployer, ...accounts] = await hre.ethers.getSigners();
  const MODERATOR_ROLE = await governanceDAO.MODERATOR_ROLE();
  const VALIDATOR_ROLE = await governanceDAO.VALIDATOR_ROLE();

  // Exemples d'adresses pour les tests (utilisez des vraies adresses en production)
  const newModerator = accounts[1]?.address;
  const newValidator = accounts[2]?.address;

  if (newModerator && newValidator) {
    try {
      // Ajouter un modérateur
      console.log(`👥 Granting moderator role to: ${newModerator}`);
      const tx1 = await governanceDAO.grantRole(MODERATOR_ROLE, newModerator);
      await tx1.wait();
      console.log("✅ Moderator role granted");

      // Ajouter un validateur
      console.log(`⚖️ Granting validator role to: ${newValidator}`);
      const tx2 = await governanceDAO.grantRole(VALIDATOR_ROLE, newValidator);
      await tx2.wait();
      console.log("✅ Validator role granted");

      // Vérification
      const isModerator = await governanceDAO.hasRole(MODERATOR_ROLE, newModerator);
      const isValidator = await governanceDAO.hasRole(VALIDATOR_ROLE, newValidator);
      
      console.log(`🔍 Verification:`);
      console.log(`   • New moderator has role: ${isModerator ? '✅' : '❌'}`);
      console.log(`   • New validator has role: ${isValidator ? '✅' : '❌'}`);

    } catch (error) {
      console.log("⚠️ Role management note:", error.message.split('\n')[0]);
    }
  } else {
    console.log("ℹ️ Not enough accounts for role demonstration");
  }
}

async function batchRegisterMembers(governanceDAO) {
  console.log("\n👥 BATCH MEMBER REGISTRATION");
  console.log("-----------------------------");

  // Exemple de membres à enregistrer (utilisez de vraies données en production)
  const membersToRegister = [
    {
      address: "0x742d35Cc6634C0532925a3b8D1C9bac1e4bAfDd",
      transactionCount: 15,
      name: "Demo Member 1"
    },
    {
      address: "0x8ba1f109551bD432803012645Hac136c30bac31f",
      transactionCount: 25,
      name: "Demo Member 2"
    },
    {
      address: "0x1234567890123456789012345678901234567890",
      transactionCount: 30,
      name: "Demo Member 3"
    }
  ];

  console.log(`📝 Registering ${membersToRegister.length} members...`);

  for (const member of membersToRegister) {
    try {
      // Vérifier si déjà enregistré
      const memberInfo = await governanceDAO.getMemberInfo(member.address);
      
      if (!memberInfo.registered) {
        // Vérifier que le nombre de transactions est suffisant
        if (member.transactionCount >= 10) {
          const tx = await governanceDAO.registerMember(
            member.address,
            member.transactionCount,
            '0x' // Attestation vide
          );
          await tx.wait();
          console.log(`✅ ${member.name} registered (${member.transactionCount} txs)`);
        } else {
          console.log(`❌ ${member.name} - insufficient transaction count (${member.transactionCount} < 10)`);
        }
      } else {
        console.log(`ℹ️ ${member.name} already registered`);
      }
    } catch (error) {
      console.log(`❌ Failed to register ${member.name}: ${error.message.split('\n')[0]}`);
    }
  }

  // Afficher le total de membres
  const totalMembers = await governanceDAO.getTotalActiveMembers();
  console.log(`📊 Total registered members: ${totalMembers}`);
}

async function viewContractStatus(governanceDAO) {
  console.log("\n📊 CONTRACT STATUS OVERVIEW");
  console.log("----------------------------");

  try {
    // Informations de base
    const isPaused = await governanceDAO.paused();
    const totalMembers = await governanceDAO.getTotalActiveMembers();
    const currentProposalId = await governanceDAO.getCurrentProposalId();
    const params = await governanceDAO.getGovernanceParameters();

    console.log("🏛️ Governance State:");
    console.log(`   • Contract Status: ${isPaused ? '⏸️ PAUSED' : '▶️ ACTIVE'}`);
    console.log(`   • Total Members: ${totalMembers}`);
    console.log(`   • Total Proposals: ${currentProposalId - 1}`);
    
    console.log("\n⚙️ Parameters:");
    console.log(`   • Voting Period: ${params.votingPeriod / (24 * 60 * 60)} days`);
    console.log(`   • Contest Window: ${params.contestWindow / (60 * 60)} hours`);
    console.log(`   • Quorum: ${params.quorumPercentage}%`);
    console.log(`   • Approval Threshold: ${params.minApprovalPercentage}%`);

    // Compter les propositions par statut
    const statusCounts = [0, 0, 0, 0, 0, 0]; // Pending, Active, Succeeded, Defeated, Executed, Cancelled
    
    for (let i = 1; i < currentProposalId; i++) {
      try {
        const proposal = await governanceDAO.getProposal(i);
        statusCounts[proposal.status]++;
      } catch (error) {
        // Proposition invalide, ignorer
      }
    }

    console.log("\n📋 Proposals by Status:");
    const statusNames = ['Pending', 'Active', 'Succeeded', 'Defeated', 'Executed', 'Cancelled'];
    statusNames.forEach((name, index) => {
      if (statusCounts[index] > 0) {
        console.log(`   • ${name}: ${statusCounts[index]}`);
      }
    });

  } catch (error) {
    console.log("❌ Failed to get contract status:", error.message);
  }
}

// Actions d'urgence
async function emergencyPause(governanceDAO) {
  console.log("\n🚨 EMERGENCY PAUSE");
  console.log("------------------");
  
  try {
    const tx = await governanceDAO.pause();
    await tx.wait();
    console.log("✅ Contract paused successfully");
    console.log("⚠️ All governance functions are now disabled");
  } catch (error) {
    console.log("❌ Failed to pause contract:", error.message);
  }
}

async function emergencyUnpause(governanceDAO) {
  console.log("\n🟢 EMERGENCY UNPAUSE");
  console.log("--------------------");
  
  try {
    const tx = await governanceDAO.unpause();
    await tx.wait();
    console.log("✅ Contract unpaused successfully");
    console.log("🎉 All governance functions are now enabled");
  } catch (error) {
    console.log("❌ Failed to unpause contract:", error.message);
  }
}

// Fonctions utilitaires pour gestion des rôles
async function listRoleMembers(governanceDAO) {
  console.log("\n👥 ROLE MEMBERS");
  console.log("---------------");
  
  // Note: Pour lister tous les membres d'un rôle, il faudrait parcourir
  // les événements RoleGranted ou maintenir une liste dans le contrat
  console.log("ℹ️ Use events or backend API to get complete role member lists");
  
  const [deployer] = await hre.ethers.getSigners();
  const DEFAULT_ADMIN_ROLE = await governanceDAO.DEFAULT_ADMIN_ROLE();
  const MODERATOR_ROLE = await governanceDAO.MODERATOR_ROLE();
  const VALIDATOR_ROLE = await governanceDAO.VALIDATOR_ROLE();
  
  console.log("🔍 Current account roles:");
  console.log(`   • Admin: ${await governanceDAO.hasRole(DEFAULT_ADMIN_ROLE, deployer.address) ? '✅' : '❌'}`);
  console.log(`   • Moderator: ${await governanceDAO.hasRole(MODERATOR_ROLE, deployer.address) ? '✅' : '❌'}`);
  console.log(`   • Validator: ${await governanceDAO.hasRole(VALIDATOR_ROLE, deployer.address) ? '✅' : '❌'}`);
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:');
  console.error(error);
  process.exit(1);
});

// Exécution du script
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎉 Administration session completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Administration error:');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { 
  main, 
  manageRoles, 
  batchRegisterMembers, 
  viewContractStatus,
  emergencyPause,
  emergencyUnpause 
};