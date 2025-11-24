const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log("\n================================================");
  console.log("EnoBridge Unified Deployment");
  console.log("================================================");
  console.log("Network:", network);
  console.log("Chain ID:", chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("================================================\n");

  const deployments = {};

  // Deploy Token (test token)
  console.log("1. Deploying Token...");
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(
    "EnoBridge Token",
    "ENOTOKEN",
    hre.ethers.parseEther("1000000") // 1M initial supply
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ Token deployed to:", tokenAddress);
  deployments.token = tokenAddress;

  // Deploy EnhancedForwarder
  console.log("\n2. Deploying EnhancedForwarder...");
  const EnhancedForwarder = await hre.ethers.getContractFactory("EnhancedForwarder");
  const forwarder = await EnhancedForwarder.deploy(
    deployer.address, // fee collector
    100 // 1% relayer fee
  );
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log("✅ EnhancedForwarder deployed to:", forwarderAddress);
  deployments.forwarder = forwarderAddress;

  // Deploy UnifiedBridge
  console.log("\n3. Deploying UnifiedBridge...");
  const UnifiedBridge = await hre.ethers.getContractFactory("UnifiedBridge");
  const bridge = await UnifiedBridge.deploy(
    forwarderAddress, // trusted forwarder
    deployer.address, // admin
    hre.ethers.parseEther("0.01"), // min transfer: 0.01 tokens
    hre.ethers.parseEther("1000") // max transfer: 1000 tokens
  );
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("✅ UnifiedBridge deployed to:", bridgeAddress);
  deployments.bridge = bridgeAddress;

  // Deploy WrappedToken
  console.log("\n4. Deploying WrappedToken...");
  const WrappedToken = await hre.ethers.getContractFactory("WrappedToken");
  const wrappedToken = await WrappedToken.deploy(
    "Wrapped EnoBridge Token",
    "wENOTOKEN",
    bridgeAddress
  );
  await wrappedToken.waitForDeployment();
  const wrappedTokenAddress = await wrappedToken.getAddress();
  console.log("✅ WrappedToken deployed to:", wrappedTokenAddress);
  deployments.wrappedToken = wrappedTokenAddress;

  // Setup: Add supported token
  console.log("\n5. Setting up bridge...");
  const tx1 = await bridge.addSupportedToken(tokenAddress);
  await tx1.wait();
  console.log("✅ Added token as supported");

  // Setup: Grant relayer role
  const RELAYER_ROLE = await bridge.RELAYER_ROLE();
  const tx2 = await bridge.grantRole(RELAYER_ROLE, deployer.address);
  await tx2.wait();
  console.log("✅ Granted RELAYER_ROLE to deployer");

  // Approve bridge to spend tokens (for testing)
  const tx3 = await token.approve(bridgeAddress, hre.ethers.parseEther("100000"));
  await tx3.wait();
  console.log("✅ Approved bridge to spend tokens");

  // Save deployment info
  deployments.network = network;
  deployments.chainId = chainId.toString();
  deployments.deployer = deployer.address;
  deployments.timestamp = new Date().toISOString();

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

  console.log("\n================================================");
  console.log("Deployment Summary");
  console.log("================================================");
  console.log("Token:", tokenAddress);
  console.log("EnhancedForwarder:", forwarderAddress);
  console.log("UnifiedBridge:", bridgeAddress);
  console.log("WrappedToken:", wrappedTokenAddress);
  console.log("\nDeployment info saved to:", deploymentFile);
  console.log("================================================\n");

  console.log("📝 To verify contracts, run:");
  console.log(`npx hardhat verify --network ${network} ${tokenAddress} "EnoBridge Token" "ENOTOKEN" "1000000000000000000000000"`);
  console.log(`npx hardhat verify --network ${network} ${forwarderAddress} "${deployer.address}" "100"`);
  console.log(`npx hardhat verify --network ${network} ${bridgeAddress} "${forwarderAddress}" "${deployer.address}" "10000000000000000" "1000000000000000000000"`);
  console.log(`npx hardhat verify --network ${network} ${wrappedTokenAddress} "Wrapped EnoBridge Token" "wENOTOKEN" "${bridgeAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
