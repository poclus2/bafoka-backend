require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config({ path: ".env" });
require("hardhat-deploy");
const { task } = require("hardhat/config");
require("@nomiclabs/hardhat-ethers");
require("@typechain/hardhat");
require("hardhat-celo");

// This is the mnemonic used by celo-devchain
const DEVCHAIN_MNEMONIC =
    "concert load couple harbor equip island argue ramp clarify fence smart topic";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    // defaultNetwork,
    networks: {
        celosepolia: {
            url: "https://celo-sepolia.drpc.org",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 11142220, // Celo Sepolia Chain ID
            timeout: 120000, // 2 minutes
            gasPrice: 50000000000, // 50 Gwei
        },
    },
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            viaIR: true,
        },
    },
    namedAccounts: {
        deployer: 0,
    },
    typechain: {
        outDir: "types",
        target: "web3-v1",
        alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
        externalArtifacts: ["externalArtifacts/*.json"], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
    },
};

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

task(
    "devchain-keys",
    "Prints the private keys associated with the devchain",
    async (taskArgs, hre) => {
        const accounts = await hre.ethers.getSigners();
        const hdNode = hre.ethers.utils.HDNode.fromMnemonic(DEVCHAIN_MNEMONIC);
        for (let i = 0; i < accounts.length; i++) {
            const account = hdNode.derivePath(`m/44'/60'/0'/0/${i}`);
            console.log(
                `Account ${i}\nAddress: ${account.address}\nKey: ${account.privateKey}`
            );
        }
    }
);

task("create-account", "Prints a new private key", async (taskArgs, hre) => {
    const wallet = new hre.ethers.Wallet.createRandom();
    console.log(`PRIVATE_KEY="` + wallet.privateKey + `"`);
    console.log();
    console.log(`Your account address: `, wallet.address);
});

task("print-account", "Prints the address of the account", () => {
    const wallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY);
    console.log(`Account: `, wallet.address);
});
