const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Simple auth middleware (in production, use proper JWT authentication)
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Get admin statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const Transfer = require('../models/Transfer');
    const GaslessTransaction = require('../models/GaslessTransaction');
    const relayerService = req.app.locals.relayerService;

    const [totalTransfers, totalGasless] = await Promise.all([
      Transfer.countDocuments(),
      GaslessTransaction.countDocuments()
    ]);

    res.json({
      totalTransactions: totalTransfers + totalGasless,
      totalTransfers,
      totalGasless,
      totalVolume: '0',
      totalFees: '0',
      activeRelayers: Object.keys(relayerService.chains).length,
      systemHealth: {
        apiStatus: 'healthy',
        databaseStatus: 'healthy',
        relayerStatus: 'healthy',
        aiServiceStatus: relayerService.aiService.isAvailable ? 'healthy' : 'degraded'
      }
    });
  } catch (error) {
    logger.error('Error getting admin stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pause bridge
router.post('/bridge/pause', authMiddleware, async (req, res) => {
  try {
    const { chain, reason } = req.body;
    const relayerService = req.app.locals.relayerService;

    const chainName = chain === 80002 ? 'amoy' : 'sepolia';
    const chainObj = relayerService.chains[chainName];

    const tx = await chainObj.bridge.pause();
    await tx.wait();

    logger.warn(`Bridge paused on ${chainName}: ${reason}`);

    res.json({
      success: true,
      txHash: tx.hash,
      chain,
      paused: true
    });
  } catch (error) {
    logger.error('Error pausing bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unpause bridge
router.post('/bridge/unpause', authMiddleware, async (req, res) => {
  try {
    const { chain } = req.body;
    const relayerService = req.app.locals.relayerService;

    const chainName = chain === 80002 ? 'amoy' : 'sepolia';
    const chainObj = relayerService.chains[chainName];

    const tx = await chainObj.bridge.unpause();
    await tx.wait();

    logger.info(`Bridge unpaused on ${chainName}`);

    res.json({
      success: true,
      txHash: tx.hash,
      chain,
      paused: false
    });
  } catch (error) {
    logger.error('Error unpausing bridge:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
