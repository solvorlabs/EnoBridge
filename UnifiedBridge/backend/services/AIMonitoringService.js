const axios = require('axios');
const logger = require('../utils/logger');
const Alert = require('../models/Alert');

/**
 * AIMonitoringService
 * Integrates with Python AI service for transaction analysis
 */
class AIMonitoringService {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.apiKey = process.env.AI_SERVICE_API_KEY || '';
    this.isAvailable = false;
  }

  async initialize() {
    logger.info('Initializing AI Monitoring Service...');

    try {
      // Check if AI service is available
      const response = await axios.get(`${this.aiServiceUrl}/health`, {
        timeout: 5000
      });

      if (response.status === 200) {
        this.isAvailable = true;
        logger.info('✅ AI Service is available');
      }
    } catch (error) {
      logger.warn('AI Service not available:', error.message);
      this.isAvailable = false;
    }
  }

  /**
   * Analyze a transaction with AI models
   * @param {Object} txData Transaction data
   * @returns {Object} Analysis results
   */
  async analyzeTransaction(txData) {
    if (!this.isAvailable) {
      logger.warn('AI Service not available, skipping analysis');
      return {
        anomalyScore: 0,
        riskScore: 0,
        isAnomaly: false,
        isHighRisk: false,
        recommendation: 'AI service unavailable'
      };
    }

    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/analyze`,
        txData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          timeout: 10000
        }
      );

      const analysis = response.data;

      // Create alert if needed
      if (analysis.isAnomaly || analysis.isHighRisk) {
        await this.createAlert({
          type: analysis.isAnomaly ? 'anomaly' : 'risk',
          severity: analysis.riskScore > 80 ? 'critical' : analysis.riskScore > 60 ? 'high' : 'medium',
          title: `${analysis.isAnomaly ? 'Anomaly' : 'High Risk'} transaction detected`,
          message: analysis.recommendation || 'Transaction flagged by AI',
          details: analysis,
          relatedTx: txData.txHash,
          relatedAddress: txData.sender,
          score: analysis.isAnomaly ? analysis.anomalyScore : analysis.riskScore
        });
      }

      return analysis;
    } catch (error) {
      logger.error('Error analyzing transaction with AI:', error.message);
      return {
        anomalyScore: 0,
        riskScore: 0,
        isAnomaly: false,
        isHighRisk: false,
        recommendation: 'Analysis failed'
      };
    }
  }

  /**
   * Get gas price predictions
   * @param {number} chainId Chain ID
   * @param {number} horizon Prediction horizon in minutes
   * @returns {Object} Gas price predictions
   */
  async predictGasPrice(chainId, horizon = 30) {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const response = await axios.get(
        `${this.aiServiceUrl}/api/gas-prediction`,
        {
          params: { chain: chainId, horizon },
          headers: { 'X-API-Key': this.apiKey },
          timeout: 5000
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error predicting gas price:', error.message);
      return null;
    }
  }

  /**
   * Get detected patterns
   * @returns {Array} Detected patterns
   */
  async getPatterns() {
    if (!this.isAvailable) {
      return [];
    }

    try {
      const response = await axios.get(
        `${this.aiServiceUrl}/api/patterns`,
        {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 5000
        }
      );

      return response.data.patterns || [];
    } catch (error) {
      logger.error('Error getting patterns:', error.message);
      return [];
    }
  }

  /**
   * Get real-time metrics
   * @param {string} timeRange Time range (1h, 24h, 7d, 30d)
   * @returns {Object} Metrics
   */
  async getMetrics(timeRange = '24h') {
    if (!this.isAvailable) {
      // Return mock metrics if AI service is unavailable
      return {
        totalTransactions: 0,
        totalVolume: '0',
        activeUsers: 0,
        successRate: 100,
        averageGasCost: '0',
        anomaliesDetected: 0,
        highRiskTransactions: 0
      };
    }

    try {
      const response = await axios.get(
        `${this.aiServiceUrl}/api/metrics`,
        {
          params: { timeRange },
          headers: { 'X-API-Key': this.apiKey },
          timeout: 5000
        }
      );

      return response.data.metrics;
    } catch (error) {
      logger.error('Error getting metrics:', error.message);
      return null;
    }
  }

  /**
   * Create an alert
   * @param {Object} alertData Alert data
   * @returns {Object} Created alert
   */
  async createAlert(alertData) {
    try {
      const alert = await Alert.create({
        ...alertData,
        status: 'new',
        timestamp: new Date()
      });

      logger.info(`Alert created: ${alert._id}`, {
        type: alert.type,
        severity: alert.severity,
        title: alert.title
      });

      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Get recent alerts
   * @param {Object} filters Filters
   * @returns {Array} Alerts
   */
  async getAlerts(filters = {}) {
    try {
      const query = {};

      if (filters.severity) {
        query.severity = filters.severity;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.type) {
        query.type = filters.type;
      }

      const alerts = await Alert.find(query)
        .sort({ timestamp: -1 })
        .limit(filters.limit || 50);

      return alerts;
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }
}

module.exports = AIMonitoringService;
