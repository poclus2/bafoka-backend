
const hre = require("hardhat");

async function main() {
    console.log("🚀 Début du déploiement sur Celo Sepolia...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // 1. Déploiement du Token
    console.log("Déploiement du Token...");
    const Token = await hre.ethers.getContractFactory("Token");
    const token = await Token.deploy();
    await token.deployed();
    console.log("✅ Token déployé à:", token.address);

    // 2. Déploiement du DAO
    console.log("Déploiement du TokenGatedDao...");
    const Dao = await hre.ethers.getContractFactory("TokenGatedDao");
    // Assurez-vous que le constructeur attend bien l'adresse du token
    const dao = await Dao.deploy(token.address);
    await dao.deployed();
    console.log("✅ DAO déployé à:", dao.address);

    const fs = require('fs');
    const results = {
        token: token.address,
        dao: dao.address,
        network: hre.network.name
    };
    fs.writeFileSync('deployment_results.json', JSON.stringify(results, null, 2));
    console.log("Résultats sauvegardés dans deployment_results.json");

    // 3. Mint initial pour l'admin (optionnel)
    try {
        console.log("Mint initial pour l'admin...");
        // Si la fonction mint n'est pas reconnue par l'objet contract, on tente un appel bas niveau ou on ignore
        if (typeof token.mint === 'function') {
            const tx = await token.mint(deployer.address, hre.ethers.utils.parseEther("1000000"));
            await tx.wait();
            console.log("✅ 1,000,000 Tokens mintés pour l'admin");
        } else {
            console.warn("⚠️ Fonction mint non trouvée sur l'objet contrat. Artifact mismatch possible.");
        }
    } catch (err) {
        console.error("❌ Erreur lors du mint:", err.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
