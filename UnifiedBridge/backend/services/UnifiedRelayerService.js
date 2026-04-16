const { ethers } = require('ethers');
const MerkleTree = require('merkletreejs').MerkleTree;
const keccak256 = require('keccak256');
const logger = require('../utils/logger');
const Transfer = require('../models/Transfer');
const GaslessTransaction = require('../models/GaslessTransaction');

/**
 * UnifiedRelayerService
 * Handles both gasless transactions and cross-chain transfers
 * Supports centralized and decentralized relayer modes
 */
class UnifiedRelayerService {
  constructor(wsService, aiService) {
    this.wsService = wsService;
    this.aiService = aiService;
    this.chains = {};
    this.isRunning = false;
    this.gaslessQueue = [];
    this.transferQueue = [];
    this.merkleTree = null;
    this.transfers = [];
  }

  async initialize() {
    logger.info('Initializing Unified Relayer Service...');

    // Initialize Amoy chain
    this.chains.amoy = {
      provider: new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL),
      wallet: new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL)),
      chainId: 80002,
      bridge: null,
      forwarder: null,
      lastBlock: 0
    };

    // Initialize Sepolia chain
    this.chains.sepolia = {
      provider: new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL),
      wallet: new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)),
      chainId: 11155111,
      bridge: null,
      forwarder: null,
      lastBlock: 0
    };

    // Load contract ABIs and addresses
    const bridgeABI = require('../config/abis/UnifiedBridge.json');
    const forwarderABI = require('../config/abis/EnhancedForwarder.json');

    // Initialize contracts
    for (const [name, chain] of Object.entries(this.chains)) {
      const bridgeAddress = process.env[`${name.toUpperCase()}_BRIDGE_ADDRESS`];
      const forwarderAddress = process.env[`${name.toUpperCase()}_FORWARDER_ADDRESS`];

      chain.bridge = new ethers.Contract(bridgeAddress, bridgeABI, chain.wallet);
      chain.forwarder = new ethers.Contract(forwarderAddress, forwarderABI, chain.wallet);

      logger.info(`✅ Initialized ${name} - Bridge: ${bridgeAddress}, Forwarder: ${forwarderAddress}`);
    }

    // Load existing transfers from database
    await this.loadTransfers();

    logger.info('Unified Relayer Service initialized');
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Relayer service already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Unified Relayer Service...');

    // Start event listeners for all chains
    for (const [name, chain] of Object.entries(this.chains)) {
      this.startEventListeners(name, chain);
    }

    // Start queue processors
    this.processGaslessQueue();
    this.processTransferQueue();

    // Start periodic tasks
    this.startPeriodicTasks();

    logger.info('✅ Unified Relayer Service started');
  }

  async stop() {
    this.isRunning = false;
    logger.info('Unified Relayer Service stopped');
  }

  // ========== Event Listeners ==========

  startEventListeners(chainName, chain) {
    logger.info(`Starting event listeners for ${chainName}...`);

    // Listen for LockRequested events (ERC20)
    chain.bridge.on('LockRequested', async (requestId, token, sender, recipient, amount, destinationChain, timestamp, event) => {
      logger.info(`🔒 LockRequested detected on ${chainName}:`, {
        requestId,
        token,
        sender,
        recipient,
        amount: ethers.formatEther(amount),
        destinationChain: destinationChain.toString()
      });

      try {
        // Create transfer record
        const transfer = await Transfer.create({
          requestId,
          type: 'erc20',
          sourceChain: chain.chainId,
          destinationChain: Number(destinationChain),
          token,
          sender,
          recipient,
          amount: amount.toString(),
          status: 'pending',
          lockTxHash: event.log.transactionHash,
          relayerMode: 'centralized',
          relayer: chain.wallet.address,
          timestamp: new Date()
        });

        // Add to transfer queue
        this.transferQueue.push(transfer);

        // Update Merkle tree
        await this.updateMerkleTree(transfer);

        // Send to AI for analysis
        await this.analyzeWithAI(transfer, event.log.transactionHash);

        // WebSocket notification
        this.wsService.emit('transfer_update', {
          requestId,
          status: 'pending',
          message: 'Transfer detected and queued for processing'
        });
      } catch (error) {
        logger.error('Error handling LockRequested event:', error);
      }
    });

    // Listen for NFTLockRequested events
    chain.bridge.on('NFTLockRequested', async (requestId, token, sender, recipient, tokenId, destinationChain, timestamp, event) => {
      logger.info(`🖼️  NFTLockRequested detected on ${chainName}:`, {
        requestId,
        token,
        tokenId: tokenId.toString()
      });

      try {
        const transfer = await Transfer.create({
          requestId,
          type: 'erc721',
          sourceChain: chain.chainId,
          destinationChain: Number(destinationChain),
          token,
          sender,
          recipient,
          tokenId: tokenId.toString(),
          status: 'pending',
          lockTxHash: event.log.transactionHash,
          relayerMode: 'centralized',
          relayer: chain.wallet.address,
          timestamp: new Date()
        });

        this.transferQueue.push(transfer);
        await this.updateMerkleTree(transfer);
        await this.analyzeWithAI(transfer, event.log.transactionHash);

        this.wsService.emit('transfer_update', {
          requestId,
          status: 'pending',
          message: 'NFT transfer detected'
        });
      } catch (error) {
        logger.error('Error handling NFTLockRequested event:', error);
      }
    });

    // Listen for ReleaseCompleted events
    chain.bridge.on('ReleaseCompleted', async (requestId, token, recipient, amount, sourceChain) => {
      logger.info(`✅ ReleaseCompleted detected on ${chainName}:`, { requestId });

      try {
        const transfer = await Transfer.findOne({ requestId });
        if (transfer) {
          transfer.status = 'completed';
          transfer.completedAt = new Date();
          await transfer.save();

          this.wsService.emit('transfer_update', {
            requestId,
            status: 'completed',
            message: 'Transfer completed successfully'
          });
        }
      } catch (error) {
        logger.error('Error handling ReleaseCompleted event:', error);
      }
    });

    // Listen for gasless transaction events
    chain.forwarder.on('TransactionExecuted', async (from, to, data, nonce, success, returnData, event) => {
      logger.info(`⚡ Gasless transaction executed on ${chainName}:`, {
        from,
        to,
        success,
        nonce: nonce.toString()
      });

      try {
        await GaslessTransaction.updateOne(
          { 'forwardRequest.from': from, 'forwardRequest.nonce': nonce.toString() },
          {
            $set: {
              status: success ? 'confirmed' : 'failed',
              txHash: event.log.transactionHash,
              confirmedAt: new Date()
            }
          }
        );

        this.wsService.emit('gasless_update', {
          from,
          nonce: nonce.toString(),
          status: success ? 'confirmed' : 'failed',
          txHash: event.log.transactionHash
        });
      } catch (error) {
        logger.error('Error handling TransactionExecuted event:', error);
      }
    });
  }

  // ========== Gasless Transaction Processing ==========

  async submitGaslessTransaction(forwardRequest, signature, type = 'execute') {
    logger.info('Submitting gasless transaction:', {
      from: forwardRequest.from,
      to: forwardRequest.to,
      type
    });

    try {
      // Verify signature
      const chain = this.chains.amoy; // Default to Amoy for now
      const isValid = await chain.forwarder.verify(forwardRequest, signature);
      if (!isValid) {
        throw new Error('Invalid signature');
      }

      // Create transaction record
      const gaslessTx = await GaslessTransaction.create({
        type,
        forwardRequest,
        signature,
        status: 'pending',
        relayer: chain.wallet.address,
        timestamp: new Date()
      });

      // Add to queue
      this.gaslessQueue.push(gaslessTx);

      return {
        success: true,
        txId: gaslessTx._id.toString(),
        status: 'pending'
      };
    } catch (error) {
      logger.error('Error submitting gasless transaction:', error);
      throw error;
    }
  }

  async processGaslessQueue() {
    while (this.isRunning) {
      try {
        if (this.gaslessQueue.length > 0) {
          const gaslessTx = this.gaslessQueue.shift();
          await this.executeGaslessTransaction(gaslessTx);
        }
      } catch (error) {
        logger.error('Error processing gasless queue:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // Process every 2 seconds
    }
  }

  async executeGaslessTransaction(gaslessTx) {
    logger.info('Executing gasless transaction:', gaslessTx._id);

    try {
      const chain = this.chains.amoy; // Default to Amoy

      // Execute the transaction
      const tx = await chain.forwarder.execute(
        gaslessTx.forwardRequest,
        gaslessTx.signature,
        {
          gasLimit: 300000
        }
      );

      // Update status
      gaslessTx.status = 'submitted';
      gaslessTx.txHash = tx.hash;
      await gaslessTx.save();

      logger.info(`Gasless transaction submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      gaslessTx.status = receipt.status === 1 ? 'confirmed' : 'failed';
      gaslessTx.gasUsed = receipt.gasUsed.toString();
      gaslessTx.confirmedAt = new Date();
      await gaslessTx.save();

      // Calculate gas cost
      const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice;
      const gasCost = ethers.formatEther(gasPrice * receipt.gasUsed);

      logger.info(`Gasless transaction confirmed: ${tx.hash}, Gas used: ${receipt.gasUsed}, Cost: ${gasCost} ETH`);

      // WebSocket notification
      this.wsService.emit('gasless_update', {
        txId: gaslessTx._id.toString(),
        status: gaslessTx.status,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        gasCost
      });

    } catch (error) {
      logger.error('Error executing gasless transaction:', error);
      gaslessTx.status = 'failed';
      gaslessTx.errorMessage = error.message;
      await gaslessTx.save();
    }
  }

  // ========== Cross-Chain Transfer Processing ==========

  async processTransferQueue() {
    while (this.isRunning) {
      try {
        if (this.transferQueue.length > 0) {
          const transfer = this.transferQueue.shift();
          await this.processTransfer(transfer);
        }
      } catch (error) {
        logger.error('Error processing transfer queue:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Process every 5 seconds
    }
  }

  async processTransfer(transfer) {
    logger.info('Processing transfer:', transfer.requestId);

    try {
      // Determine destination chain
      const destChainName = transfer.destinationChain === 80002 ? 'amoy' : 'sepolia';
      const destChain = this.chains[destChainName];

      // Update Merkle root on destination chain
      if (this.merkleTree) {
        const merkleRoot = this.merkleTree.getHexRoot();
        const tx = await destChain.bridge.updateMerkleRoot(merkleRoot, {
          gasLimit: 200000
        });
        await tx.wait();
        logger.info(`Merkle root updated on ${destChainName}: ${merkleRoot}`);
      }

      // Generate proof for this transfer
      const proof = this.generateProof(transfer);

      // Execute release on destination chain
      let releaseTx;
      if (transfer.type === 'erc20') {
        releaseTx = await destChain.bridge.releaseERC20(
          transfer.requestId,
          transfer.token,
          transfer.recipient,
          transfer.amount,
          transfer.sourceChain,
          proof,
          {
            gasLimit: 300000
          }
        );
      } else if (transfer.type === 'erc721') {
        releaseTx = await destChain.bridge.releaseERC721(
          transfer.requestId,
          transfer.token,
          transfer.recipient,
          transfer.tokenId,
          transfer.sourceChain,
          proof,
          {
            gasLimit: 300000
          }
        );
      }

      const receipt = await releaseTx.wait();

      // Update transfer status
      transfer.status = 'completed';
      transfer.unlockTxHash = releaseTx.hash;
      transfer.completedAt = new Date();
      await transfer.save();

      logger.info(`✅ Transfer completed: ${transfer.requestId}, TX: ${releaseTx.hash}`);

      // WebSocket notification
      this.wsService.emit('transfer_update', {
        requestId: transfer.requestId,
        status: 'completed',
        unlockTxHash: releaseTx.hash
      });

    } catch (error) {
      logger.error('Error processing transfer:', error);
      transfer.status = 'failed';
      transfer.errorMessage = error.message;
      await transfer.save();

      this.wsService.emit('transfer_update', {
        requestId: transfer.requestId,
        status: 'failed',
        error: error.message
      });
    }
  }

  // ========== Merkle Tree Management ==========

  async loadTransfers() {
    const transfers = await Transfer.find({ status: { $ne: 'failed' } });
    this.transfers = transfers;
    this.buildMerkleTree();
    logger.info(`Loaded ${transfers.length} transfers`);
  }

  buildMerkleTree() {
    if (this.transfers.length === 0) {
      this.merkleTree = null;
      return;
    }

    const leaves = this.transfers.map(transfer => {
      if (transfer.type === 'erc20') {
        return keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256'],
            [transfer.requestId, transfer.token, transfer.recipient, transfer.amount, transfer.sourceChain]
          )
        );
      } else {
        return keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256'],
            [transfer.requestId, transfer.token, transfer.recipient, transfer.tokenId, transfer.sourceChain]
          )
        );
      }
    });

    this.merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    logger.info(`Merkle tree built with ${leaves.length} leaves`);
  }

  async updateMerkleTree(newTransfer) {
    this.transfers.push(newTransfer);
    this.buildMerkleTree();
  }

  generateProof(transfer) {
    if (!this.merkleTree) {
      return [];
    }

    let leaf;
    if (transfer.type === 'erc20') {
      leaf = keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'address', 'address', 'uint256', 'uint256'],
          [transfer.requestId, transfer.token, transfer.recipient, transfer.amount, transfer.sourceChain]
        )
      );
    } else {
      leaf = keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'address', 'address', 'uint256', 'uint256'],
          [transfer.requestId, transfer.token, transfer.recipient, transfer.tokenId, transfer.sourceChain]
        )
      );
    }

    const proof = this.merkleTree.getHexProof(leaf);
    return proof;
  }

  // ========== AI Integration ==========

  async analyzeWithAI(transfer, txHash) {
    try {
      const analysis = await this.aiService.analyzeTransaction({
        txHash,
        type: 'bridge_transfer',
        amount: transfer.amount || '0',
        sender: transfer.sender,
        recipient: transfer.recipient,
        timestamp: transfer.timestamp,
        gasUsed: '0',
        gasPrice: '0'
      });

      // If high risk or anomaly, create alert
      if (analysis.isHighRisk || analysis.isAnomaly) {
        logger.warn(`⚠️  Suspicious transfer detected: ${transfer.requestId}`, analysis);
        this.wsService.emit('alert', {
          type: analysis.isAnomaly ? 'anomaly' : 'risk',
          severity: analysis.riskScore > 80 ? 'high' : 'medium',
          title: `Suspicious ${transfer.type} transfer detected`,
          transferId: transfer.requestId,
          analysis
        });
      }
    } catch (error) {
      logger.error('Error analyzing with AI:', error);
    }
  }

  // ========== Periodic Tasks ==========

  startPeriodicTasks() {
    // Check relayer balances every hour
    setInterval(async () => {
      for (const [name, chain] of Object.entries(this.chains)) {
        const balance = await chain.provider.getBalance(chain.wallet.address);
        const balanceEth = ethers.formatEther(balance);
        logger.info(`Relayer balance on ${name}: ${balanceEth} ETH`);

        if (parseFloat(balanceEth) < 0.1) {
          logger.warn(`⚠️  Low balance on ${name}: ${balanceEth} ETH`);
          this.wsService.emit('alert', {
            type: 'relayer',
            severity: 'high',
            title: `Low relayer balance on ${name}`,
            message: `Current balance: ${balanceEth} ETH`
          });
        }
      }
    }, 3600000); // Every hour
  }
}

module.exports = UnifiedRelayerService;
