const express = require('express');
const router = express.Router();
const GaslessTransaction = require('../models/GaslessTransaction');
const logger = require('../utils/logger');

// Submit gasless transaction
router.post('/submit', async (req, res) => {
  try {
    const { forwardRequest, signature, type } = req.body;

    if (!forwardRequest || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const relayerService = req.app.locals.relayerService;
    const result = await relayerService.submitGaslessTransaction(forwardRequest, signature, type);

    res.json(result);
  } catch (error) {
    logger.error('Error submitting gasless transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction status
router.get('/tx/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    const tx = await GaslessTransaction.findById(txId);

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      txId: tx._id,
      status: tx.status,
      txHash: tx.txHash,
      gasUsed: tx.gasUsed,
      timestamp: tx.timestamp,
      confirmedAt: tx.confirmedAt,
      errorMessage: tx.errorMessage
    });
  } catch (error) {
    logger.error('Error getting transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get nonce for address
router.get('/nonce/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const relayerService = req.app.locals.relayerService;
    const chain = relayerService.chains.amoy; // Default to Amoy

    const nonce = await chain.forwarder.getNonce(address);

    res.json({ address, nonce: nonce.toString() });
  } catch (error) {
    logger.error('Error getting nonce:', error);
    res.status(500).json({ error: error.message });
  }
});

// Estimate fee
router.post('/estimate-fee', async (req, res) => {
  try {
    const { type, gasEstimate } = req.body;

    // Simple fee calculation (in production, use real-time gas prices)
    const gasCost = (gasEstimate || 150000) * 50; // 50 Gwei
    const relayerMarkup = gasCost * 0.2; // 20% markup
    const totalFee = gasCost + relayerMarkup;

    res.json({
      gasCost: (gasCost / 1e9).toString(),
      relayerMarkup: (relayerMarkup / 1e9).toString(),
      totalFee: (totalFee / 1e9).toString(),
      currency: 'MATIC'
    });
  } catch (error) {
    logger.error('Error estimating fee:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
