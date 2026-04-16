const logger = require('../utils/logger');

/**
 * WebSocketService
 * Handles real-time communication with clients
 */
class WebSocketService {
  constructor(io) {
    this.io = io;
    this.connections = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);
      this.connections.set(socket.id, socket);

      // Handle subscriptions
      socket.on('subscribe', (data) => {
        const { type, ...params } = data;

        switch (type) {
          case 'transaction':
            socket.join(`tx:${params.txId}`);
            logger.info(`Client ${socket.id} subscribed to transaction: ${params.txId}`);
            break;

          case 'user_transfers':
            socket.join(`user:${params.address}`);
            logger.info(`Client ${socket.id} subscribed to user transfers: ${params.address}`);
            break;

          case 'monitoring':
            socket.join('monitoring');
            logger.info(`Client ${socket.id} subscribed to monitoring`);
            break;

          case 'alerts':
            socket.join('alerts');
            logger.info(`Client ${socket.id} subscribed to alerts`);
            break;

          default:
            logger.warn(`Unknown subscription type: ${type}`);
        }
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (data) => {
        const { type, ...params } = data;

        switch (type) {
          case 'transaction':
            socket.leave(`tx:${params.txId}`);
            break;

          case 'user_transfers':
            socket.leave(`user:${params.address}`);
            break;

          case 'monitoring':
            socket.leave('monitoring');
            break;

          case 'alerts':
            socket.leave('alerts');
            break;
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
        this.connections.delete(socket.id);
      });
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Emit an event to all connected clients or specific room
   * @param {string} event Event name
   * @param {Object} data Event data
   * @param {string} room Optional room name
   */
  emit(event, data, room = null) {
    try {
      if (room) {
        this.io.to(room).emit(event, data);
      } else {
        this.io.emit(event, data);
      }
    } catch (error) {
      logger.error('Error emitting WebSocket event:', error);
    }
  }

  /**
   * Broadcast gasless transaction update
   * @param {Object} data Transaction data
   */
  broadcastGaslessUpdate(data) {
    this.emit('gasless_update', data);

    if (data.from) {
      this.emit('gasless_update', data, `user:${data.from}`);
    }

    if (data.txId) {
      this.emit('gasless_update', data, `tx:${data.txId}`);
    }
  }

  /**
   * Broadcast transfer update
   * @param {Object} data Transfer data
   */
  broadcastTransferUpdate(data) {
    this.emit('transfer_update', data);

    if (data.sender) {
      this.emit('transfer_update', data, `user:${data.sender}`);
    }

    if (data.recipient) {
      this.emit('transfer_update', data, `user:${data.recipient}`);
    }

    if (data.requestId) {
      this.emit('transfer_update', data, `tx:${data.requestId}`);
    }
  }

  /**
   * Broadcast alert
   * @param {Object} alert Alert data
   */
  broadcastAlert(alert) {
    this.emit('alert', alert, 'alerts');
    this.emit('alert', alert, 'monitoring');
  }

  /**
   * Broadcast metrics update
   * @param {Object} metrics Metrics data
   */
  broadcastMetrics(metrics) {
    this.emit('metrics_update', metrics, 'monitoring');
  }

  /**
   * Get number of connected clients
   * @returns {number} Number of connections
   */
  getConnectionCount() {
    return this.connections.size;
  }
}

module.exports = WebSocketService;
