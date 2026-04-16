const express = require('express');
const router = express.Router();
const Transfer = require('../models/Transfer');
const logger = require('../utils/logger');

// Get transfer status
router.get('/transfer/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const transfer = await Transfer.findOne({ requestId });

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    res.json(transfer);
  } catch (error) {
    logger.error('Error getting transfer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transfers for a user
router.get('/transfers', async (req, res) => {
  try {
    const { address, status, page = 1, limit = 20 } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    const query = {
      $or: [{ sender: address }, { recipient: address }]
    };

    if (status) {
      query.status = status;
    }

    const transfers = await Transfer.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transfer.countDocuments(query);

    res.json({
      transfers,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error getting transfers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Merkle proof for a transfer
router.get('/proof/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const relayerService = req.app.locals.relayerService;

    const transfer = await Transfer.findOne({ requestId });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const proof = relayerService.generateProof(transfer);
    const root = relayerService.merkleTree ? relayerService.merkleTree.getHexRoot() : '0x';

    res.json({
      requestId,
      proof,
      root,
      verified: proof.length > 0
    });
  } catch (error) {
    logger.error('Error getting proof:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
