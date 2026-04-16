const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const logger = require('./utils/logger');
const connectDatabase = require('./config/database');
const UnifiedRelayerService = require('./services/UnifiedRelayerService');
const AIMonitoringService = require('./services/AIMonitoringService');
const WebSocketService = require('./websocket/server');

// Routes
const gaslessRoutes = require('./routes/gasless');
const bridgeRoutes = require('./routes/bridge');
const monitoringRoutes = require('./routes/monitoring');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/gasless', gaslessRoutes);
app.use('/api/bridge', bridgeRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing EnoBridge Unified Backend...');

    // Connect to databases
    await connectDatabase();
    logger.info('✅ Databases connected');

    // Initialize WebSocket service
    const wsService = new WebSocketService(io);
    wsService.initialize();
    logger.info('✅ WebSocket service initialized');

    // Initialize AI Monitoring Service
    const aiService = new AIMonitoringService();
    await aiService.initialize();
    logger.info('✅ AI Monitoring service initialized');

    // Initialize Unified Relayer Service
    const relayerService = new UnifiedRelayerService(wsService, aiService);
    await relayerService.initialize();
    await relayerService.start();
    logger.info('✅ Unified Relayer service started');

    // Make services available globally
    app.locals.relayerService = relayerService;
    app.locals.aiService = aiService;
    app.locals.wsService = wsService;

    logger.info('🚀 All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
server.listen(PORT, async () => {
  logger.info(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║          🌉 EnoBridge Unified Backend v1.0              ║
║                                                          ║
║  Gasless Transactions + Cross-Chain Bridge              ║
║  + AI-Powered Monitoring                                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

Server running on port ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
`);

  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');

    // Cleanup services
    if (app.locals.relayerService) {
      await app.locals.relayerService.stop();
    }

    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
});

module.exports = { app, server, io };
