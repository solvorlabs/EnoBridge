const mongoose = require('mongoose');

const gaslessTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['execute', 'erc20_transfer', 'erc721_transfer'],
    required: true
  },
  forwardRequest: {
    from: { type: String, required: true, index: true },
    to: { type: String, required: true },
    value: { type: String, default: '0' },
    gas: { type: String, required: true },
    nonce: { type: String, required: true },
    data: { type: String, required: true }
  },
  signature: {
    type: String,
    required: true
  },
  txHash: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'confirmed', 'failed'],
    default: 'pending',
    index: true
  },
  gasUsed: {
    type: String
  },
  gasCost: {
    type: String
  },
  relayerFee: {
    type: String
  },
  relayer: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  confirmedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  }
});

module.exports = mongoose.model('GaslessTransaction', gaslessTransactionSchema);
