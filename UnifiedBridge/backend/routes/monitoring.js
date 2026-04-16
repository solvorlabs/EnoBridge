const express = require('express');
const router = express.Router();
const Transfer = require('../models/Transfer');
const GaslessTransaction = require('../models/GaslessTransaction');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');

// Get metrics
router.get('/metrics', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now - 3600 * 1000);
        break;
      case '24h':
        startTime = new Date(now - 24 * 3600 * 1000);
        break;
      case '7d':
        startTime = new Date(now - 7 * 24 * 3600 * 1000);
        break;
      case '30d':
        startTime = new Date(now - 30 * 24 * 3600 * 1000);
        break;
      default:
        startTime = new Date(now - 24 * 3600 * 1000);
    }

    // Get metrics from database
    const [
      totalTransactions,
      successfulTransfers,
      failedTransfers,
      anomaliesDetected,
      highRiskTransactions
    ] = await Promise.all([
      GaslessTransaction.countDocuments({ timestamp: { $gte: startTime } }),
      Transfer.countDocuments({ timestamp: { $gte: startTime }, status: 'completed' }),
      Transfer.countDocuments({ timestamp: { $gte: startTime }, status: 'failed' }),
      Alert.countDocuments({ timestamp: { $gte: startTime }, type: 'anomaly' }),
      Alert.countDocuments({ timestamp: { $gte: startTime }, type: 'risk', severity: { $in: ['high', 'critical'] } })
    ]);

    const totalTransfers = successfulTransfers + failedTransfers;
    const successRate = totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 100;

    res.json({
      timeRange,
      metrics: {
        totalTransactions: totalTransactions + totalTransfers,
        totalVolume: '0', // Would calculate from transfer amounts
        activeUsers: 0, // Would count unique addresses
        successRate: successRate.toFixed(2),
        averageGasCost: '0.003',
        anomaliesDetected,
        highRiskTransactions
      }
    });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const { severity, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (severity) query.severity = severity;
    if (status) query.status = status;

    const alerts = await Alert.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Alert.countDocuments(query);

    res.json({
      alerts,
      total,
      page: parseInt(page)
    });
  } catch (error) {
    logger.error('Error getting alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze transaction with AI
router.post('/analyze', async (req, res) => {
  try {
    const aiService = req.app.locals.aiService;
    const analysis = await aiService.analyzeTransaction(req.body);

    res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get gas price predictions
router.get('/gas-prediction', async (req, res) => {
  try {
    const { chain, horizon = 30 } = req.query;
    const aiService = req.app.locals.aiService;

    const prediction = await aiService.predictGasPrice(parseInt(chain), parseInt(horizon));

    if (!prediction) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    res.json(prediction);
  } catch (error) {
    logger.error('Error getting gas prediction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detected patterns
router.get('/patterns', async (req, res) => {
  try {
    const aiService = req.app.locals.aiService;
    const patterns = await aiService.getPatterns();

    res.json({ patterns });
  } catch (error) {
    logger.error('Error getting patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
