const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['erc20', 'erc721'],
    required: true
  },
  sourceChain: {
    type: Number,
    required: true
  },
  destinationChain: {
    type: Number,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    required: true,
    index: true
  },
  recipient: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: String // For ERC20
  },
  tokenId: {
    type: String // For ERC721
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  lockTxHash: {
    type: String,
    index: true
  },
  unlockTxHash: {
    type: String
  },
  merkleProof: [{
    type: String
  }],
  relayerMode: {
    type: String,
    enum: ['centralized', 'decentralized'],
    default: 'centralized'
  },
  relayer: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  }
});

module.exports = mongoose.model('Transfer', transferSchema);
