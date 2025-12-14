// Script de déploiement COMPLET et UNIFIÉ
// Déploie : Token + TokenGatedDao + GovernanceDAO
// Configure : Rôles + Fichiers de config (.env, deployments.json)

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { deploymentManager } = require('./utils/deploymentManager.cjs');

async function main() {
    console.log("\n🚀 DÉMARRAGE DU DÉPLOIEMENT COMPLET sur", hre.network.name);
    console.log("===================================================");

    // 1. Initialisation
    const [deployer] = await hre.ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const balance = await deployer.getBalance();

    console.log("📝 Compte de déploiement:", deployerAddress);
    console.log("💰 Solde:", hre.ethers.utils.formatEther(balance), "CELO");

    if (balance.lt(hre.ethers.utils.parseEther("0.1"))) {
        console.warn("⚠️  ATTENTION: Solde faible. Recommandé: 0.1 CELO minimum.");
    }

    try {
        // ===================================================
        // 2. Déploiement du TOKEN
        // ===================================================
        console.log("\n📄 [1/3] Déploiement du contrat TOKEN...");
        const Token = await hre.ethers.getContractFactory("Token");
        const token = await Token.deploy();
        await token.deployed();

        const tokenReceipt = await token.deployTransaction.wait();
        console.log("✅ Token déployé:", token.address);

        // Mise à jour deployments.json
        deploymentManager.updateNetwork(hre.network.name);
        deploymentManager.updateContract('Token', {
            address: token.address,
            deploymentBlock: tokenReceipt.blockNumber,
            deploymentTimestamp: Math.floor(Date.now() / 1000),
            transactionHash: token.deployTransaction.hash,
            deployer: deployerAddress,
            gasUsed: tokenReceipt.gasUsed.toString()
        });

        // ===================================================
        // 3. Déploiement du DAO
        // ===================================================
        console.log("\n🏛️  [2/3] Déploiement du contrat TokenGatedDao...");
        const TokenGatedDao = await hre.ethers.getContractFactory("TokenGatedDao");
        const tokenGatedDao = await TokenGatedDao.deploy(token.address);
        await tokenGatedDao.deployed();

        const daoReceipt = await tokenGatedDao.deployTransaction.wait();
        console.log("✅ TokenGatedDao déployé:", tokenGatedDao.address);

        // Mise à jour deployments.json
        deploymentManager.updateContract('TokenGatedDao', {
            address: tokenGatedDao.address,
            deploymentBlock: daoReceipt.blockNumber,
            deploymentTimestamp: Math.floor(Date.now() / 1000),
            transactionHash: tokenGatedDao.deployTransaction.hash,
            deployer: deployerAddress,
            gasUsed: daoReceipt.gasUsed.toString(),
            tokenAddress: token.address
        });

        // ===================================================
        // 4. Déploiement de la GOUVERNANCE
        // ===================================================
        console.log("\n⚖️  [3/3] Déploiement du contrat GovernanceDAO...");

        // Paramètres de gouvernance
        const governanceParams = {
            votingPeriod: 7 * 24 * 60 * 60,      // 7 jours
            contestWindow: 48 * 60 * 60,         // 48 heures
            quorumPercentage: 30,                // 30%
            minApprovalPercentage: 50            // 50%
        };

        const GovernanceDAO = await hre.ethers.getContractFactory("GovernanceDAO");
        const governanceDAO = await GovernanceDAO.deploy(deployerAddress);
        await governanceDAO.deployed();

        const govReceipt = await governanceDAO.deployTransaction.wait();
        console.log("✅ GovernanceDAO déployé:", governanceDAO.address);

        // Configuration des rôles
        console.log("\n👑 Configuration des rôles...");
        const MODERATOR_ROLE = await governanceDAO.MODERATOR_ROLE();
        const VALIDATOR_ROLE = await governanceDAO.VALIDATOR_ROLE();

        await (await governanceDAO.grantRole(MODERATOR_ROLE, deployerAddress)).wait();
        console.log("   • Rôle MODERATOR attribué à l'admin");

        await (await governanceDAO.grantRole(VALIDATOR_ROLE, deployerAddress)).wait();
        console.log("   • Rôle VALIDATOR attribué à l'admin");

        // Mise à jour deployments.json
        deploymentManager.updateContract('GovernanceDAO', {
            address: governanceDAO.address,
            deploymentBlock: govReceipt.blockNumber,
            deploymentTimestamp: Math.floor(Date.now() / 1000),
            transactionHash: governanceDAO.deployTransaction.hash,
            deployer: deployerAddress,
            gasUsed: govReceipt.gasUsed.toString()
        });

        // ===================================================
        // 5. Mise à jour des fichiers .env
        // ===================================================
        console.log("\n📝 Mise à jour des fichiers de configuration...");

        const updateEnvFile = (filePath) => {
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');

                const updates = {
                    'TOKEN_CONTRACT_ADDRESS': token.address,
                    'DAO_CONTRACT_ADDRESS': tokenGatedDao.address,
                    'GOVERNANCE_CONTRACT_ADDRESS': governanceDAO.address,
                    'GOVERNANCE_DEPLOYMENT_BLOCK': govReceipt.blockNumber
                };

                for (const [key, value] of Object.entries(updates)) {
                    const regex = new RegExp(`^${key}=.*$`, 'm');
                    if (regex.test(content)) {
                        content = content.replace(regex, `${key}=${value}`);
                    } else {
                        content += `\n${key}=${value}`;
                    }
                }

                fs.writeFileSync(filePath, content);
                console.log(`✅ ${path.basename(filePath)} mis à jour`);
            }
        };

        updateEnvFile(path.join(__dirname, '..', '.env')); // hardhat/.env
        updateEnvFile(path.join(__dirname, '..', '..', '.env')); // backend/.env

        // ===================================================
        // 6. Résumé
        // ===================================================
        console.log("\n🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !");
        console.log("===================================================");
        console.log("📍 Token:", token.address);
        console.log("📍 DAO:", tokenGatedDao.address);
        console.log("📍 Governance:", governanceDAO.address);
        console.log("===================================================");
        console.log("\n👉 Prochaines étapes :");
        console.log("1. Redémarrez le backend (npm run dev)");
        console.log("2. Testez l'API (node test-blockchain.js)");

    } catch (error) {
        console.error("\n❌ ERREUR DE DÉPLOIEMENT:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
