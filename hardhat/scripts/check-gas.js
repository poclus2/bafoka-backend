const hre = require("hardhat");

async function main() {
    const provider = hre.ethers.provider;
    const feeData = await provider.getFeeData();

    console.log("Gas Price:", feeData.gasPrice ? hre.ethers.utils.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "null");
    console.log("Max Fee Per Gas:", feeData.maxFeePerGas ? hre.ethers.utils.formatUnits(feeData.maxFeePerGas, "gwei") + " gwei" : "null");
    console.log("Max Priority Fee Per Gas:", feeData.maxPriorityFeePerGas ? hre.ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "gwei") + " gwei" : "null");

    const block = await provider.getBlock("latest");
    console.log("Base Fee:", block.baseFeePerGas ? hre.ethers.utils.formatUnits(block.baseFeePerGas, "gwei") + " gwei" : "null");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
