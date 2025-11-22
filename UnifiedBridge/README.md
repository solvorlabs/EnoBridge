# 🌉 EnoBridge: Unified Gasless Cross-Chain Bridge with AI Monitoring

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636.svg)
![Node](https://img.shields.io/badge/Node.js-18+-green.svg)
![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)

**EnoBridge** is a next-generation blockchain bridge platform that combines three cutting-edge technologies into a single, seamless solution:

✅ **Gasless Transactions** - Users execute transactions without holding native gas tokens
✅ **Cross-Chain Asset Transfers** - Secure, fast transfers between multiple blockchain networks
✅ **AI-Powered On-Chain Monitoring** - Intelligent monitoring with anomaly detection and predictive analytics

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Deployment](#-deployment)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Smart Contracts](#-smart-contracts)
- [AI Monitoring](#-ai-monitoring)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Features

### 1. Gasless Transaction System (EIP-2771)

- **Meta-Transactions**: Users sign messages instead of transactions
- **No Gas Required**: Relayers pay gas fees on behalf of users
- **ERC20 & ERC721 Support**: Gasless token and NFT transfers
- **ERC20Permit Integration**: Gasless approvals
- **Fee Mechanism**: Sustainable relayer compensation model

### 2. Cross-Chain Asset Transfer

- **ERC20 Bridge**: Lock/Mint and Burn/Unlock mechanisms
- **NFT Bridge**: Cross-chain NFT transfers
- **Dual Relayer Architecture**:
  - **Centralized**: Fast, efficient (< 5 min)
  - **Decentralized**: Trustless, secure (< 15 min)
- **Merkle Proof Verification**: Enhanced security
- **Transfer Limits**: Configurable min/max amounts

### 3. AI-Powered Monitoring

- **Real-Time Anomaly Detection**: Isolation Forest + LSTM models
- **Risk Scoring**: ML-based transaction risk assessment
- **Gas Price Prediction**: ARIMA + Neural Network forecasting
- **Pattern Recognition**: Identify whale activity, arbitrage, fraud
- **Alert System**: Automated alerts for suspicious activity
- **Interactive Dashboard**: Real-time metrics and visualizations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Frontend (React + Vite)                  │
│  ┌──────────┬──────────┬──────────┬─────────────────┐   │
│  │ Gasless  │  Bridge  │  AI      │  Admin Panel    │   │
│  │ Transfer │  UI      │  Monitor │                 │   │
│  └──────────┴──────────┴──────────┴─────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ WebSocket + REST API
┌──────────────────────┴──────────────────────────────────┐
│              Backend (Node.js + Express)                 │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │   Unified    │  AI Service  │  WebSocket Server    │ │
│  │   Relayer    │  Integration │                      │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│         Blockchain Layer (Polygon Amoy + Sepolia)        │
│  ┌─────────────┬──────────────┬─────────────────────┐   │
│  │  Unified    │  Enhanced    │  Tokens             │   │
│  │  Bridge     │  Forwarder   │  (ERC20/ERC721)     │   │
│  └─────────────┴──────────────┴─────────────────────┘   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│          AI Service (Python + FastAPI)                    │
│  ┌──────────────┬──────────────┬─────────────────────┐   │
│  │  Anomaly     │  Risk        │  Gas Prediction     │   │
│  │  Detection   │  Scoring     │                     │   │
│  └──────────────┴──────────────┴─────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB 7.0+
- Redis 7.0+
- Docker & Docker Compose (optional)

### Clone the Repository

```bash
git clone https://github.com/exploring-solver/EnoBridge.git
cd EnoBridge/UnifiedBridge
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Setup

#### 1. Install Dependencies

```bash
# Root project
npm install

# Backend
cd backend && npm install && cd ..

# AI Service
cd ai_service && pip install -r requirements.txt && cd ..

# Frontend (if exists)
cd frontend && npm install && cd ..
```

#### 2. Start Services

```bash
# Terminal 1: MongoDB & Redis
mongod
redis-server

# Terminal 2: AI Service
cd ai_service
python main.py

# Terminal 3: Backend
cd backend
npm run dev

# Terminal 4: Frontend (if exists)
cd frontend
npm run dev
```

---

## 📦 Installation

### Smart Contract Deployment

#### 1. Compile Contracts

```bash
npm run compile
```

#### 2. Deploy to Testnet

```bash
# Deploy to Amoy
npm run deploy:amoy

# Deploy to Sepolia
npm run deploy:sepolia
```

#### 3. Verify Contracts

```bash
# Verify on Amoy
npx hardhat verify --network amoy <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Verify on Sepolia
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Configure Environment

Update `.env` with deployed contract addresses:

```env
# Amoy
AMOY_BRIDGE_ADDRESS=0x...
AMOY_FORWARDER_ADDRESS=0x...
AMOY_TOKEN_ADDRESS=0x...

# Sepolia
SEPOLIA_BRIDGE_ADDRESS=0x...
SEPOLIA_FORWARDER_ADDRESS=0x...
SEPOLIA_WRAPPED_TOKEN_ADDRESS=0x...
```

---

## 🔧 Deployment

### Production Deployment

#### 1. Build Docker Images

```bash
# Backend
docker build -t enobridge-backend:latest ./backend

# AI Service
docker build -t enobridge-ai:latest ./ai_service
```

#### 2. Deploy with Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Configure Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name api.enobridge.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 📖 Usage

### Gasless Transactions

#### Example: Gasless ERC20 Transfer

```javascript
import { ethers } from 'ethers';

// 1. Create forward request
const forwardRequest = {
  from: userAddress,
  to: tokenAddress,
  value: '0',
  gas: '150000',
  nonce: await forwarder.getNonce(userAddress),
  data: tokenInterface.encodeFunctionData('transfer', [recipientAddress, amount])
};

// 2. Sign with EIP-712
const domain = {
  name: 'EnhancedForwarder',
  version: '1',
  chainId: 80002,
  verifyingContract: forwarderAddress
};

const types = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'data', type: 'bytes' }
  ]
};

const signature = await signer._signTypedData(domain, types, forwardRequest);

// 3. Submit to relayer
const response = await fetch('http://localhost:3000/api/gasless/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    forwardRequest,
    signature,
    type: 'execute'
  })
});

const { txId } = await response.json();

// 4. Monitor status
const statusResponse = await fetch(`http://localhost:3000/api/gasless/tx/${txId}`);
const { status, txHash } = await statusResponse.json();
```

### Cross-Chain Bridge

#### Example: Bridge ERC20 from Amoy to Sepolia

```javascript
import { ethers } from 'ethers';

// 1. Approve bridge
const token = new ethers.Contract(tokenAddress, tokenABI, signer);
await token.approve(bridgeAddress, amount);

// 2. Lock tokens on source chain
const bridge = new ethers.Contract(bridgeAddress, bridgeABI, signer);
const tx = await bridge.lockERC20(
  tokenAddress,
  amount,
  11155111, // Sepolia chain ID
  recipientAddress
);

const receipt = await tx.wait();

// 3. Get request ID from event
const lockEvent = receipt.logs.find(log => log.eventName === 'LockRequested');
const requestId = lockEvent.args.requestId;

console.log('Transfer initiated:', requestId);

// 4. Monitor transfer status
const statusResponse = await fetch(`http://localhost:3000/api/bridge/transfer/${requestId}`);
const transfer = await statusResponse.json();

console.log('Status:', transfer.status);
// Status will be: pending → confirmed → completed
```

### AI Monitoring

#### Example: Analyze Transaction

```javascript
const response = await fetch('http://localhost:3000/api/monitoring/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txHash: '0x...',
    type: 'bridge_transfer',
    amount: '1000000000000000000',
    sender: '0x...',
    recipient: '0x...',
    timestamp: new Date().toISOString(),
    gasUsed: '150000',
    gasPrice: '50000000000'
  })
});

const analysis = await response.json();
console.log(analysis);
// {
//   anomalyScore: 65,
//   riskScore: 30,
//   isAnomaly: false,
//   isHighRisk: false,
//   patterns: ['regular_user'],
//   recommendation: 'Approve'
// }
```

---

## 📡 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Gasless Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/gasless/submit` | Submit gasless transaction |
| GET | `/gasless/tx/:txId` | Get transaction status |
| GET | `/gasless/nonce/:address` | Get nonce for address |
| POST | `/gasless/estimate-fee` | Estimate relayer fee |

### Bridge Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bridge/transfer/:requestId` | Get transfer status |
| GET | `/bridge/transfers?address=0x...` | Get user transfers |
| GET | `/bridge/proof/:requestId` | Get Merkle proof |

### Monitoring Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/monitoring/metrics?timeRange=24h` | Get real-time metrics |
| GET | `/monitoring/alerts` | Get recent alerts |
| POST | `/monitoring/analyze` | Analyze transaction |
| GET | `/monitoring/gas-prediction?chain=80002` | Predict gas prices |
| GET | `/monitoring/patterns` | Get detected patterns |

### WebSocket Events

#### Subscribe to Updates

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Subscribe to transfer updates
socket.emit('subscribe', {
  type: 'user_transfers',
  address: '0x...'
});

// Listen for updates
socket.on('transfer_update', (data) => {
  console.log('Transfer updated:', data);
});

// Subscribe to alerts
socket.emit('subscribe', { type: 'alerts' });

socket.on('alert', (alert) => {
  console.log('New alert:', alert);
});
```

---

## 📝 Smart Contracts

### UnifiedBridge.sol

Main bridge contract with gasless support (EIP-2771).

**Key Functions:**
- `lockERC20(token, amount, destChain, recipient)` - Lock tokens for bridging
- `releaseERC20(requestId, token, recipient, amount, sourceChain, proof)` - Release tokens on destination
- `lockERC721(token, tokenId, destChain, recipient)` - Lock NFT for bridging
- `releaseERC721(requestId, token, recipient, tokenId, sourceChain, proof)` - Release NFT
- `updateMerkleRoot(newRoot)` - Update Merkle root (RELAYER_ROLE)
- `pause() / unpause()` - Emergency controls

**Security Features:**
- Merkle proof verification
- Replay protection
- Transfer limits
- Role-based access control
- Pausable

### EnhancedForwarder.sol

Meta-transaction forwarder with EIP-2771 compliance.

**Key Functions:**
- `execute(ForwardRequest, signature)` - Execute meta-transaction
- `forwardERC20Transfer(request, signature)` - Gasless ERC20 transfer
- `forwardERC721Transfer(request, signature)` - Gasless NFT transfer
- `getNonce(address)` - Get nonce for address
- `verify(request, signature)` - Verify signature

**Features:**
- EIP-712 typed data signing
- Nonce management
- Fee mechanism
- ERC20Permit support

---

## 🤖 AI Monitoring

### Anomaly Detection

**Algorithm**: Isolation Forest + LSTM
**Triggers**: Transactions > 3 standard deviations from mean
**Score Range**: 0-100
**Threshold**: 70

### Risk Scoring

**Algorithm**: Gradient Boosting Classifier
**Features**:
- Transfer amount
- Sender address age
- Transaction velocity
- Time of day
- Address reputation

**Score Range**: 0-100
**High Risk**: > 70

### Gas Price Prediction

**Algorithm**: ARIMA + LSTM Ensemble
**Horizons**: 15, 30, 60 minutes
**Accuracy**: MAPE < 10%
**Update Frequency**: Every 5 minutes

---

## 🧪 Testing

### Run Smart Contract Tests

```bash
npx hardhat test
```

### Run Backend Tests

```bash
cd backend
npm test
```

### Test Coverage

```bash
npx hardhat coverage
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Hardhat for development framework
- FastAPI for AI service framework
- The Ethereum and Polygon communities

---

## 📞 Support

- **GitHub Issues**: [github.com/exploring-solver/EnoBridge/issues](https://github.com/exploring-solver/EnoBridge/issues)
- **Documentation**: See `PROJECT_OVERVIEW.md` and `REQUIREMENTS_AND_APPROACH.md`

---

**Built with ❤️ by the EnoBridge Team**
