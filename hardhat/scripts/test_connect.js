
const hre = require("hardhat");
const fs = require('fs');

async function main() {
    try {
        console.log("Test connection...");
        fs.writeFileSync('test_log.txt', 'Starting test...\n');

        const [signer] = await hre.ethers.getSigners();
        const address = await signer.getAddress();
        const balance = await signer.getBalance();

        const output = `Address: ${address}\nBalance: ${balance.toString()}\nNetwork: ${hre.network.name}`;
        console.log(output);
        fs.appendFileSync('test_log.txt', output);

    } catch (err) {
        console.error(err);
        fs.appendFileSync('test_log.txt', 'Error: ' + err.message);
    }
}

main();
