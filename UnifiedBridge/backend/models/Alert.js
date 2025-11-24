const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['anomaly', 'risk', 'relayer', 'system'],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  relatedTx: {
    type: String,
    index: true
  },
  relatedAddress: {
    type: String,
    index: true
  },
  score: {
    type: Number
  },
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'resolved', 'dismissed'],
    default: 'new',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolvedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Alert', alertSchema);
