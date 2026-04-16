# EnoBridge: Requirements & Technical Approach

## 📋 Table of Contents
1. [Functional Requirements](#functional-requirements)
2. [Non-Functional Requirements](#non-functional-requirements)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Approach](#implementation-approach)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [API Specifications](#api-specifications)
7. [Deployment Strategy](#deployment-strategy)

---

## 1. Functional Requirements

### 1.1 Gasless Transaction System

#### FR-G1: Meta-Transaction Submission
**Requirement**: Users must be able to submit transactions without holding native gas tokens.

**Acceptance Criteria:**
- User signs a message with transaction data
- Relayer validates signature and submits transaction
- Transaction executes with user as `_msgSender()` (EIP-2771)
- User receives transaction receipt

**Components:**
- Smart Contract: `Forwarder.sol` with `execute()` function
- Backend: Relayer service to submit transactions
- Frontend: Signature request UI

#### FR-G2: Gasless ERC20 Transfers
**Requirement**: Users can transfer ERC20 tokens without gas.

**Acceptance Criteria:**
- Support for standard ERC20 transfers
- Support for ERC20Permit (gasless approvals)
- Nonce management to prevent replay attacks
- Fee mechanism for relayer compensation

**Components:**
- Smart Contract: `forwardERC20Transfer()`, `forwardERC20TransferWithPermit()`
- Backend: ERC20 transfer monitoring
- Frontend: Token transfer form

#### FR-G3: Gasless ERC721 Transfers
**Requirement**: Users can transfer NFTs without gas.

**Acceptance Criteria:**
- Support for ERC721 transfers
- Ownership verification
- Safe transfer checks

**Components:**
- Smart Contract: `forwardERC721Transfer()`
- Backend: NFT transfer relaying
- Frontend: NFT selection and transfer UI

#### FR-G4: Relayer Fee Management
**Requirement**: Relayers must be compensated for gas costs.

**Acceptance Criteria:**
- Fee calculation based on gas price + markup
- Multiple fee payment methods (native token, ERC20)
- Fee collection mechanism
- Fee estimation API

**Components:**
- Smart Contract: Fee calculation in forwarder
- Backend: Fee estimation service
- Frontend: Fee display before transaction

### 1.2 Cross-Chain Asset Transfer

#### FR-C1: ERC20 Lock/Mint Bridge
**Requirement**: Users can bridge ERC20 tokens between chains.

**Acceptance Criteria:**
- Lock tokens on source chain
- Emit `LockRequested` event
- Relayer detects event and generates proof
- Mint equivalent tokens on destination chain
- Verify Merkle proof before minting

**Components:**
- Smart Contracts: `UnifiedBridge.sol` on both chains
- Backend: Event monitoring, proof generation
- Frontend: Bridge UI with network selection

#### FR-C2: ERC20 Burn/Unlock Bridge
**Requirement**: Users can bridge tokens back to source chain.

**Acceptance Criteria:**
- Burn wrapped tokens on destination chain
- Emit `ReleaseRequested` event
- Unlock original tokens on source chain
- Verify proof before unlocking

**Components:**
- Same as FR-C1

#### FR-C3: ERC721 Cross-Chain Transfer
**Requirement**: NFTs can be transferred between chains.

**Acceptance Criteria:**
- Lock NFT on source chain
- Mint wrapped NFT on destination chain
- Burn wrapped NFT and unlock original
- Preserve NFT metadata

**Components:**
- Smart Contracts: NFT-specific bridge functions
- Backend: NFT event monitoring
- Frontend: NFT gallery and transfer UI

#### FR-C4: Centralized Relayer Mode
**Requirement**: System supports centralized relayer for fast transfers.

**Acceptance Criteria:**
- Single trusted relayer with RELAYER_ROLE
- Automatic event monitoring
- Fast transaction submission (< 2 min)
- Merkle proof generation
- Transfer queue management

**Components:**
- Backend: `CentralizedRelayerService.js`
- Smart Contract: Role-based access in bridge

#### FR-C5: Decentralized Relayer Mode
**Requirement**: System supports decentralized relayers for trustless transfers.

**Acceptance Criteria:**
- Multiple independent relayers
- Merkle-based relayer verification
- Consensus mechanism (minimum confirmations)
- Relayer registration and staking
- Slashing for malicious behavior

**Components:**
- Smart Contract: `RelayerManager.sol`
- Backend: `DecentralizedRelayerService.js`
- Frontend: Relayer registration UI

#### FR-C6: Transfer Status Tracking
**Requirement**: Users can track transfer status in real-time.

**Acceptance Criteria:**
- Status states: Pending, Confirmed, Completed, Failed
- Real-time updates via WebSocket
- Transaction hash on both chains
- Estimated completion time
- Error details for failed transfers

**Components:**
- Backend: Status tracking service
- Database: Transfer records
- Frontend: Status display component

### 1.3 AI-Powered Monitoring

#### FR-AI1: Real-Time Transaction Monitoring
**Requirement**: System monitors all transactions in real-time.

**Acceptance Criteria:**
- Track every gasless transaction
- Track every bridge transfer
- Record transaction metadata (amount, sender, timestamp, gas used)
- Store data for analysis
- Update metrics every 5 seconds

**Components:**
- Backend: Event listeners, data collectors
- Database: Time-series data storage
- AI Service: Data ingestion pipeline

#### FR-AI2: Anomaly Detection
**Requirement**: AI detects unusual transaction patterns.

**Acceptance Criteria:**
- Detect unusual transfer amounts (> 3 standard deviations)
- Identify rapid-fire transactions (velocity check)
- Flag suspicious addresses
- Detect pump-and-dump patterns
- Generate anomaly scores (0-100)
- Alert when score > threshold (e.g., 70)

**Components:**
- AI Service: Isolation Forest model, LSTM neural network
- Backend: Alert dispatcher
- Frontend: Anomaly visualization

**ML Models:**
```python
# Isolation Forest for outlier detection
model = IsolationForest(contamination=0.05, random_state=42)

# LSTM for sequence anomaly detection
model = Sequential([
    LSTM(64, return_sequences=True),
    LSTM(32),
    Dense(1, activation='sigmoid')
])
```

#### FR-AI3: Risk Scoring
**Requirement**: Each transaction receives an AI-generated risk score.

**Acceptance Criteria:**
- Score based on multiple factors:
  - Sender address history
  - Transfer amount relative to average
  - Time of day
  - Destination address reputation
  - Previous failed transactions
- Score range: 0 (safe) to 100 (high risk)
- Automatically flag scores > 80
- Relayer can reject high-risk transactions

**Components:**
- AI Service: Gradient Boosting Classifier
- Backend: Risk assessment API
- Frontend: Risk indicator on transfers

**Features for Risk Model:**
- `transfer_amount_usd`
- `sender_transaction_count`
- `sender_age_days`
- `time_since_last_tx_hours`
- `is_contract_address`
- `gas_price_percentile`
- `amount_deviation_from_mean`

#### FR-AI4: Gas Price Prediction
**Requirement**: AI predicts optimal gas prices for relayer transactions.

**Acceptance Criteria:**
- Predict gas prices for next 15, 30, 60 minutes
- Accuracy: Mean Absolute Percentage Error (MAPE) < 10%
- Update predictions every 5 minutes
- Consider: time of day, day of week, network congestion
- Provide confidence intervals

**Components:**
- AI Service: ARIMA + Neural Network ensemble
- Backend: Gas price tracker
- Frontend: Gas price chart with predictions

**Model:**
```python
# Time series forecasting
from statsmodels.tsa.arima.model import ARIMA
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

# Ensemble: ARIMA + LSTM
```

#### FR-AI5: Pattern Recognition
**Requirement**: Identify common transaction patterns.

**Acceptance Criteria:**
- Cluster similar transactions
- Identify user behavior patterns (whale, arbitrageur, regular user)
- Detect wash trading
- Identify bridge attack patterns (similar to Nomad attack)
- Visualize patterns on dashboard

**Components:**
- AI Service: K-Means, DBSCAN clustering
- Backend: Pattern storage
- Frontend: Pattern visualization

#### FR-AI6: Monitoring Dashboard
**Requirement**: Comprehensive dashboard for monitoring insights.

**Acceptance Criteria:**
- Real-time metrics:
  - Total transactions (24h, 7d, 30d)
  - Total volume (USD)
  - Active users
  - Success rate
  - Average gas cost
- Interactive charts:
  - Transaction volume over time
  - Gas prices with predictions
  - Anomaly events timeline
  - Risk score distribution
- Alert feed (latest alerts)
- Top relayers leaderboard
- Network health indicators

**Components:**
- Frontend: `AIMonitoringDashboard.jsx`
- Backend: Metrics aggregation API
- Real-time: WebSocket for live updates

#### FR-AI7: Alert System
**Requirement**: Automated alerts for critical events.

**Acceptance Criteria:**
- Alert types:
  - High-risk transaction detected
  - Anomaly score > threshold
  - Relayer offline/slow
  - Failed transaction spike
  - Bridge contract paused
- Alert channels:
  - In-app notifications
  - Email (optional)
  - Webhook (for integrations)
- Alert management:
  - Mark as read/unread
  - Dismiss
  - Escalate
  - Filter by severity

**Components:**
- Backend: Alert service, notification dispatcher
- Frontend: Alert component, notification bell
- Database: Alert storage

### 1.4 User Interface

#### FR-UI1: Unified Dashboard
**Requirement**: Single dashboard integrating all features.

**Acceptance Criteria:**
- Navigation: Gasless, Bridge, Monitoring, History, Admin
- Wallet connection (MetaMask, WalletConnect, Coinbase Wallet)
- Network switching
- Responsive design (mobile, tablet, desktop)
- Dark/light mode

**Components:**
- `UnifiedDashboard.jsx`
- `Navigation.jsx`
- `WalletConnect.jsx`

#### FR-UI2: Gasless Transaction UI
**Requirement**: User-friendly gasless transaction interface.

**Acceptance Criteria:**
- Token selection dropdown
- Amount input with balance display
- Recipient address input with validation
- Fee estimate display
- Submit button triggers signature request
- Transaction status modal

**Components:**
- `GaslessTransfer.jsx`
- `TokenSelector.jsx`
- `FeeEstimator.jsx`

#### FR-UI3: Bridge UI
**Requirement**: Intuitive cross-chain bridge interface.

**Acceptance Criteria:**
- Source network selector
- Destination network selector
- Token/NFT selection
- Amount input
- Relayer mode toggle (centralized/decentralized)
- Transfer preview with fees
- Initiate transfer button
- Real-time status tracker

**Components:**
- `BridgeInterface.jsx`
- `NetworkSelector.jsx`
- `TransferPreview.jsx`
- `TransferStatus.jsx`

#### FR-UI4: Transaction History
**Requirement**: View all past transactions.

**Acceptance Criteria:**
- Filter by type (gasless, bridge, all)
- Filter by status (pending, completed, failed)
- Search by transaction hash or address
- Pagination (20 per page)
- Export to CSV
- Click to view details

**Components:**
- `TransactionHistory.jsx`
- `TransactionDetails.jsx`

#### FR-UI5: Admin Panel
**Requirement**: Administrative interface for system management.

**Acceptance Criteria:**
- Relayer management:
  - View all relayers
  - Add/remove relayers (decentralized mode)
  - View relayer performance stats
- Emergency controls:
  - Pause/unpause bridge
  - Emergency withdraw
- Configuration:
  - Update transfer limits
  - Update fee rates
  - Update AI model parameters
- Analytics:
  - System health metrics
  - Financial reports

**Components:**
- `AdminPanel.jsx`
- `RelayerManagement.jsx`
- `EmergencyControls.jsx`

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Gasless transaction submission | < 3 seconds | From signature to on-chain |
| Bridge transfer (centralized) | < 5 minutes | Lock to mint |
| Bridge transfer (decentralized) | < 15 minutes | Lock to mint |
| API response time | < 200ms | 95th percentile |
| WebSocket latency | < 100ms | Real-time updates |
| AI inference time | < 1 second | Risk score calculation |
| Dashboard load time | < 2 seconds | Initial render |

### 2.2 Scalability

| Aspect | Target |
|--------|--------|
| Concurrent users | 10,000+ |
| Transactions per second | 100+ (per chain) |
| Bridge transfers per hour | 1,000+ |
| API requests per second | 500+ |
| Database size | 1TB+ (with archival) |
| WebSocket connections | 5,000+ |

### 2.3 Reliability

| Aspect | Target |
|--------|--------|
| System uptime | 99.9% |
| Transaction success rate | > 99% |
| Relayer availability | > 99.5% |
| AI model availability | > 99% |
| Data persistence | 100% (no data loss) |

### 2.4 Security

| Requirement | Implementation |
|-------------|----------------|
| Smart contract security | Audited, OpenZeppelin libraries, ReentrancyGuard |
| Private key management | HSM or encrypted storage, never exposed |
| API authentication | JWT tokens for admin, rate limiting |
| DDoS protection | Rate limiting, CloudFlare/AWS Shield |
| Input validation | All user inputs sanitized |
| Data encryption | TLS for all communications, encrypted DB |
| Signature verification | EIP-712 typed data signing |

### 2.5 Usability

| Aspect | Target |
|--------|--------|
| Time to first transaction | < 3 minutes (including wallet setup) |
| Learning curve | < 10 minutes to understand all features |
| Accessibility | WCAG 2.1 Level AA compliance |
| Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Mobile responsiveness | Fully functional on mobile devices |

### 2.6 Maintainability

| Aspect | Implementation |
|--------|----------------|
| Code documentation | JSDoc for all functions, README for each module |
| Testing coverage | > 80% for smart contracts, > 70% for backend |
| Deployment automation | Docker Compose, CI/CD pipelines |
| Logging | Structured logging with levels (debug, info, warn, error) |
| Monitoring | Prometheus metrics, Grafana dashboards |
| Error handling | Graceful degradation, user-friendly error messages |

---

## 3. Technical Architecture

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend Layer                                  │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Unified UI     │  │  AI Monitoring   │  │   Admin Panel    │          │
│  │  - Gasless TX    │  │   Dashboard      │  │  - Config Mgmt   │          │
│  │  - Bridge        │  │  - Real-time     │  │  - Emergency     │          │
│  │  - Wallet Mgmt   │  │  - Charts        │  │  - Analytics     │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           └─────────────────────┴─────────────────────┘                     │
│                                 │                                           │
│                          WebSocket + REST API                               │
└─────────────────────────────────┴───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────────────────────┐
│                           Backend Layer                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    API Gateway (Express.js)                  │            │
│  │  - Authentication   - Rate Limiting   - Request Routing     │            │
│  └────┬────────────────────────┬─────────────────────┬─────────┘            │
│       │                        │                     │                      │
│  ┌────▼────────┐  ┌───────────▼──────┐  ┌──────────▼─────────┐             │
│  │  Gasless    │  │   Bridge         │  │  AI Monitoring     │             │
│  │  Relayer    │  │   Relayer        │  │  Service           │             │
│  │  Service    │  │   Service        │  │                    │             │
│  │             │  │  ┌──────────┐    │  │  ┌──────────────┐ │             │
│  │ - Signature │  │  │Centralized│   │  │  │ Anomaly Det. │ │             │
│  │   Verify    │  │  │  Relayer  │   │  │  │ Risk Scoring │ │             │
│  │ - TX Submit │  │  └──────────┘    │  │  │ Gas Predict. │ │             │
│  │ - Fee Calc  │  │  ┌──────────┐    │  │  │ Pattern Rec. │ │             │
│  │             │  │  │Decentralized│ │  │  └──────────────┘ │             │
│  │             │  │  │  Relayer  │   │  │                    │             │
│  │             │  │  └──────────┘    │  │  (Python/FastAPI)  │             │
│  └─────────────┘  └────────┬─────────┘  └──────────┬─────────┘             │
│                            │                       │                        │
│  ┌─────────────────────────▼───────────────────────▼─────────┐              │
│  │                  Shared Services                           │              │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │              │
│  │  │   Merkle    │  │   WebSocket  │  │  Monitoring  │      │              │
│  │  │   Proof Gen │  │   Server     │  │  & Metrics   │      │              │
│  │  └─────────────┘  └──────────────┘  └──────────────┘      │              │
│  └──────────────────────────────────────────────────────────┘              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │                    Data Layer                             │               │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │               │
│  │  │ MongoDB  │  │  Redis   │  │  InfluxDB│  │  Files   │ │               │
│  │  │(Transfers)│ │ (Cache)  │  │(Metrics) │  │ (Blocks) │ │               │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │               │
│  └──────────────────────────────────────────────────────────┘               │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────┐
│                         Blockchain Layer                                     │
│                                                                              │
│  ┌────────────────────────┐              ┌────────────────────────┐         │
│  │     Chain A (Amoy)     │              │   Chain B (Sepolia)    │         │
│  │                        │              │                        │         │
│  │ ┌──────────────────┐   │              │ ┌──────────────────┐   │         │
│  │ │ UnifiedBridge    │   │  Events      │ │ UnifiedBridge    │   │         │
│  │ │ - lock()         │───┼──────────────┼─▶ mint()           │   │         │
│  │ │ - unlock()       │◀──┼──────────────┼──│ burn()           │   │         │
│  │ └──────────────────┘   │    Relayer   │ └──────────────────┘   │         │
│  │                        │              │                        │         │
│  │ ┌──────────────────┐   │              │ ┌──────────────────┐   │         │
│  │ │ Forwarder        │   │              │ │ Forwarder        │   │         │
│  │ │ - execute()      │   │              │ │ - execute()      │   │         │
│  │ └──────────────────┘   │              │ └──────────────────┘   │         │
│  │                        │              │                        │         │
│  │ ┌──────────────────┐   │              │ ┌──────────────────┐   │         │
│  │ │ RelayerManager   │   │              │ │ RelayerManager   │   │         │
│  │ └──────────────────┘   │              │ └──────────────────┘   │         │
│  │                        │              │                        │         │
│  │ ┌──────────────────┐   │              │ ┌──────────────────┐   │         │
│  │ │ Tokens           │   │              │ │ WrappedTokens    │   │         │
│  │ │ (ERC20/ERC721)   │   │              │ │ (ERC20/ERC721)   │   │         │
│  │ └──────────────────┘   │              │ └──────────────────┘   │         │
│  └────────────────────────┘              └────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Smart Contract Architecture

```solidity
// Contract Hierarchy

┌─────────────────────────────────────────────────────────────┐
│                    UnifiedBridge.sol                        │
│  Inherits: AccessControl, ReentrancyGuard, Pausable         │
│                                                             │
│  Features:                                                  │
│  - ERC20 lock/mint, burn/unlock                            │
│  - ERC721 lock/mint, burn/unlock                           │
│  - Gasless transaction support (EIP-2771)                  │
│  - Merkle proof verification                               │
│  - Transfer limits                                         │
│  - Emergency controls                                      │
│                                                             │
│  Key Functions:                                             │
│  - lockERC20(token, amount, destChain, recipient)          │
│  - unlockERC20(requestId, recipient, amount, proof)        │
│  - lockERC721(tokenAddr, tokenId, destChain, recipient)    │
│  - unlockERC721(requestId, recipient, tokenId, proof)      │
│  - updateMerkleRoot(root) [RELAYER_ROLE]                   │
│  - pause/unpause() [ADMIN_ROLE]                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Forwarder.sol                            │
│  Inherits: EIP2771Context                                   │
│                                                             │
│  Features:                                                  │
│  - Meta-transaction execution                              │
│  - Nonce management                                        │
│  - Signature verification (EIP-712)                        │
│  - Fee calculation and collection                          │
│                                                             │
│  Key Functions:                                             │
│  - execute(ForwardRequest, signature)                      │
│  - forwardERC20Transfer(token, from, to, amount, sig)      │
│  - forwardERC20TransferWithPermit(...)                     │
│  - forwardERC721Transfer(token, from, to, tokenId, sig)    │
│  - getNonce(from) view                                     │
│  - verify(request, signature) view                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 RelayerManager.sol                          │
│  Inherits: AccessControl                                    │
│                                                             │
│  Features:                                                  │
│  - Decentralized relayer registry                          │
│  - Merkle-based verification                               │
│  - Relayer staking                                         │
│  - Slashing for misbehavior                                │
│                                                             │
│  Key Functions:                                             │
│  - registerRelayer(stake) payable                          │
│  - verifyRelayer(address, proof) view                      │
│  - updateRelayerRoot(root) [MANAGER_ROLE]                  │
│  - slashRelayer(address) [ADMIN_ROLE]                      │
│  - withdrawStake()                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Token Contracts                              │
│                                                             │
│  Token.sol (Native)         WrappedToken.sol                │
│  - ERC20                    - ERC20                         │
│  - Mintable                 - Controlled minting            │
│  - Burnable                 - Bridge-only mint/burn         │
│  - Permit (EIP-2612)        - Permit                        │
│                                                             │
│  NFT.sol (Native)           WrappedNFT.sol                  │
│  - ERC721                   - ERC721                        │
│  - Mintable                 - Controlled minting            │
│  - Burnable                 - Bridge-only mint/burn         │
│  - Metadata                 - Metadata mirroring            │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Backend Service Architecture

```javascript
// Service Modules

backend/
├── app.js                          // Main Express app
├── config/
│   ├── index.js                    // Configuration management
│   ├── contracts.js                // Contract addresses & ABIs
│   └── chains.js                   // Chain configurations
├── services/
│   ├── GaslessRelayerService.js    // Gasless transaction handling
│   ├── CentralizedRelayerService.js // Centralized bridge relayer
│   ├── DecentralizedRelayerService.js // Decentralized relayer
│   ├── MerkleService.js            // Merkle tree & proof generation
│   ├── MonitoringService.js        // Event monitoring
│   └── AIService.js                // AI model integration
├── routes/
│   ├── gasless.js                  // Gasless transaction endpoints
│   ├── bridge.js                   // Bridge operation endpoints
│   ├── monitoring.js               // Monitoring data endpoints
│   └── admin.js                    // Admin endpoints
├── middleware/
│   ├── auth.js                     // JWT authentication
│   ├── rateLimit.js                // Rate limiting
│   └── validation.js               // Input validation
├── models/
│   ├── Transfer.js                 // Transfer schema (MongoDB)
│   ├── Transaction.js              // Transaction schema
│   ├── Alert.js                    // Alert schema
│   └── Relayer.js                  // Relayer schema
├── utils/
│   ├── web3.js                     // Web3 utilities
│   ├── logger.js                   // Logging setup
│   └── helpers.js                  // Helper functions
└── websocket/
    └── server.js                   // WebSocket server
```

### 3.4 AI Service Architecture

```python
# AI Service (Python FastAPI)

ai_service/
├── main.py                         // FastAPI app entry
├── models/
│   ├── anomaly_detection.py        // Isolation Forest + LSTM
│   ├── risk_scoring.py             // Gradient Boosting Classifier
│   ├── gas_prediction.py           // ARIMA + Neural Network
│   └── pattern_recognition.py      // Clustering algorithms
├── data/
│   ├── preprocessor.py             // Data preprocessing
│   ├── feature_engineering.py      // Feature extraction
│   └── data_loader.py              // Data loading utilities
├── training/
│   ├── train_anomaly.py            // Train anomaly models
│   ├── train_risk.py               // Train risk model
│   └── train_gas.py                // Train gas predictor
├── api/
│   ├── anomaly.py                  // Anomaly detection endpoints
│   ├── risk.py                     // Risk scoring endpoints
│   ├── gas.py                      // Gas prediction endpoints
│   └── patterns.py                 // Pattern recognition endpoints
├── utils/
│   ├── metrics.py                  // Model evaluation metrics
│   └── logger.py                   // Logging
└── config.py                       // Configuration
```

### 3.5 Database Schema

#### MongoDB Collections

**transfers:**
```javascript
{
  _id: ObjectId,
  requestId: String,           // Unique transfer ID
  type: String,                // "erc20" | "erc721"
  sourceChain: Number,         // Chain ID
  destinationChain: Number,    // Chain ID
  token: String,               // Token address
  sender: String,              // User address
  recipient: String,           // Recipient address
  amount: String,              // Amount (for ERC20)
  tokenId: String,             // Token ID (for ERC721)
  status: String,              // "pending" | "confirmed" | "completed" | "failed"
  lockTxHash: String,          // Lock/burn transaction hash
  unlockTxHash: String,        // Unlock/mint transaction hash
  merkleProof: [String],       // Merkle proof
  relayerMode: String,         // "centralized" | "decentralized"
  relayer: String,             // Relayer address
  timestamp: Date,
  completedAt: Date,
  errorMessage: String
}
```

**gasless_transactions:**
```javascript
{
  _id: ObjectId,
  type: String,                // "execute" | "erc20_transfer" | "erc721_transfer"
  forwardRequest: {
    from: String,
    to: String,
    value: String,
    gas: String,
    nonce: String,
    data: String
  },
  signature: String,
  txHash: String,
  status: String,              // "pending" | "submitted" | "confirmed" | "failed"
  gasUsed: String,
  gasCost: String,             // In native token
  relayerFee: String,
  relayer: String,
  timestamp: Date,
  confirmedAt: Date,
  errorMessage: String
}
```

**alerts:**
```javascript
{
  _id: ObjectId,
  type: String,                // "anomaly" | "risk" | "relayer" | "system"
  severity: String,            // "low" | "medium" | "high" | "critical"
  title: String,
  message: String,
  details: Object,             // Additional data
  relatedTx: String,           // Transaction hash
  relatedAddress: String,      // Address involved
  score: Number,               // Risk/anomaly score
  status: String,              // "new" | "acknowledged" | "resolved" | "dismissed"
  timestamp: Date,
  resolvedAt: Date
}
```

**relayers:**
```javascript
{
  _id: ObjectId,
  address: String,
  mode: String,                // "centralized" | "decentralized"
  isActive: Boolean,
  stake: String,               // Stake amount (for decentralized)
  performanceScore: Number,    // 0-100
  totalTransactions: Number,
  successfulTransactions: Number,
  failedTransactions: Number,
  totalGasUsed: String,
  totalFeesEarned: String,
  lastActiveAt: Date,
  registeredAt: Date
}
```

#### InfluxDB (Time-Series Data)

**transactions_metrics:**
- Measurement: `transactions`
- Tags: `chain_id`, `type`, `status`
- Fields: `count`, `volume_usd`, `gas_used`
- Timestamp: nanosecond precision

**gas_prices:**
- Measurement: `gas_prices`
- Tags: `chain_id`
- Fields: `base_fee`, `priority_fee`, `predicted_base_fee`
- Timestamp: nanosecond precision

**anomaly_scores:**
- Measurement: `anomaly_scores`
- Tags: `tx_hash`, `type`
- Fields: `score`, `threshold`
- Timestamp: nanosecond precision

---

## 4. Implementation Approach

### 4.1 Development Phases

#### Phase 1: Unified Smart Contracts (Week 1-2)
**Goal**: Create integrated smart contracts

**Tasks:**
1. Develop `UnifiedBridge.sol`:
   - Combine bridge and gasless features
   - Implement EIP-2771 support in bridge
   - Add comprehensive events
   - Implement transfer limits
   - Add emergency controls

2. Enhance `Forwarder.sol`:
   - Add bridge-specific meta-transaction types
   - Optimize gas usage
   - Add fee calculation

3. Update `RelayerManager.sol`:
   - Improve relayer verification
   - Add performance tracking
   - Implement slashing mechanism

4. Create comprehensive tests:
   - Unit tests for all functions
   - Integration tests
   - Gas optimization tests
   - Attack scenario tests

**Deliverables:**
- Fully tested smart contracts
- Deployment scripts for testnet
- Contract documentation

#### Phase 2: Backend Infrastructure (Week 3-4)
**Goal**: Build unified backend with AI integration

**Tasks:**
1. Unified API Server:
   - Express.js setup with modular routes
   - MongoDB integration
   - Redis caching
   - JWT authentication
   - Rate limiting

2. Gasless Relayer Service:
   - Signature verification
   - Transaction submission
   - Fee calculation
   - Queue management

3. Bridge Relayer Service:
   - Event monitoring (both modes)
   - Merkle proof generation
   - Transfer processing
   - Status tracking

4. AI Service (Python):
   - FastAPI setup
   - Model training scripts
   - Inference endpoints
   - Data pipeline

5. WebSocket Server:
   - Real-time updates
   - Room management
   - Event broadcasting

6. Monitoring & Logging:
   - Structured logging
   - Prometheus metrics
   - Health check endpoints

**Deliverables:**
- Backend services running in Docker
- API documentation (Swagger)
- Monitoring dashboards

#### Phase 3: AI Model Development (Week 5-6)
**Goal**: Train and deploy AI models

**Tasks:**
1. Data Collection:
   - Historical transaction data
   - Gas price data
   - Label creation for supervised learning

2. Anomaly Detection:
   - Isolation Forest training
   - LSTM sequence model training
   - Threshold tuning
   - Evaluation (precision, recall, F1)

3. Risk Scoring:
   - Feature engineering
   - Gradient Boosting training
   - Cross-validation
   - Model interpretation (SHAP values)

4. Gas Prediction:
   - Time series data preparation
   - ARIMA model training
   - Neural network training
   - Ensemble creation
   - Evaluation (MAPE, RMSE)

5. Pattern Recognition:
   - Clustering analysis
   - User segmentation
   - Pattern labeling

6. Model Deployment:
   - Model serialization
   - API integration
   - Load testing
   - Continuous monitoring

**Deliverables:**
- Trained ML models
- Model evaluation reports
- API endpoints for inference
- Model monitoring setup

#### Phase 4: Frontend Development (Week 7-8)
**Goal**: Build comprehensive user interface

**Tasks:**
1. Project Setup:
   - React + Vite
   - TailwindCSS + Material-UI
   - wagmi + ethers.js
   - React Query
   - WebSocket client

2. Core Components:
   - WalletConnect
   - NetworkSelector
   - TokenSelector
   - AmountInput
   - TransactionStatus

3. Feature Pages:
   - Gasless Transaction Page
   - Bridge Page
   - AI Monitoring Dashboard
   - Transaction History
   - Admin Panel

4. AI Dashboard Components:
   - Real-time metrics cards
   - Interactive charts (Recharts)
   - Anomaly timeline
   - Alert feed
   - Risk score visualization
   - Gas prediction chart

5. Responsive Design:
   - Mobile layout
   - Tablet layout
   - Desktop layout
   - Dark/light mode

6. Integration:
   - WebSocket connection
   - API calls with React Query
   - Error handling
   - Loading states

**Deliverables:**
- Fully functional frontend
- Responsive design
- User documentation

#### Phase 5: Integration & Testing (Week 9)
**Goal**: End-to-end integration and testing

**Tasks:**
1. Integration Testing:
   - Gasless transaction flow
   - Bridge transfer flow (both modes)
   - AI monitoring pipeline
   - WebSocket real-time updates

2. Performance Testing:
   - Load testing (Artillery, k6)
   - Stress testing
   - API benchmarking
   - Database query optimization

3. Security Testing:
   - Smart contract audit (automated tools)
   - Penetration testing
   - Signature verification tests
   - Rate limiting tests

4. User Acceptance Testing:
   - User flows
   - Error handling
   - Edge cases

**Deliverables:**
- Test reports
- Performance benchmarks
- Security audit report
- Bug fixes

#### Phase 6: Deployment & Documentation (Week 10)
**Goal**: Deploy to production and create documentation

**Tasks:**
1. Smart Contract Deployment:
   - Deploy to testnets (Amoy, Sepolia)
   - Verify contracts on explorers
   - Grant roles
   - Initialize bridge

2. Backend Deployment:
   - Docker images
   - Docker Compose setup
   - Environment configuration
   - Deploy to server (AWS/DigitalOcean)

3. Frontend Deployment:
   - Build optimization
   - Deploy to Vercel/Netlify
   - Configure environment variables

4. Documentation:
   - README for each module
   - API documentation
   - User guide
   - Developer guide
   - Architecture documentation

5. Monitoring Setup:
   - Prometheus + Grafana
   - Alerting rules
   - Uptime monitoring

**Deliverables:**
- Production deployment
- Complete documentation
- Monitoring dashboards
- Deployment guide

### 4.2 Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Smart Contract Language | Solidity 0.8.20 | Latest stable, well-supported |
| Smart Contract Framework | Hardhat | Better TypeScript support, plugins |
| Backend Language | Node.js (JavaScript) | Ecosystem, async I/O, ethers.js integration |
| Backend Framework | Express.js | Lightweight, flexible, well-documented |
| AI Language | Python | Best ML libraries, ecosystem |
| AI Framework | TensorFlow + scikit-learn | Production-ready, comprehensive |
| Frontend Framework | React 19 | Component-based, large ecosystem |
| Build Tool | Vite | Fast, modern, great DX |
| UI Framework | Material-UI + TailwindCSS | Professional components + utility-first CSS |
| Web3 Library | wagmi + ethers.js | React hooks, type-safe, widely used |
| State Management | TanStack Query | Server state management, caching |
| Database (Relational) | MongoDB | Flexible schema, JSON-like documents |
| Database (Time-Series) | InfluxDB | Optimized for metrics, Grafana integration |
| Caching | Redis | Fast, in-memory, pub/sub support |
| Real-time Communication | Socket.io | Bidirectional, fallback support |
| Containerization | Docker | Consistency, portability |
| Monitoring | Prometheus + Grafana | Industry standard, powerful querying |

### 4.3 Development Best Practices

**Smart Contracts:**
- Follow Solidity style guide
- Use OpenZeppelin libraries
- Comprehensive NatSpec documentation
- 100% test coverage for critical paths
- Gas optimization (avoid loops, use events)
- Use modifiers for access control
- Emit events for all state changes

**Backend:**
- Modular architecture (services, routes, models)
- Error handling with try/catch
- Input validation on all endpoints
- Structured logging (Winston)
- Environment-based configuration
- Async/await for asynchronous operations
- Database connection pooling

**Frontend:**
- Component-based architecture
- Custom hooks for reusable logic
- Prop-types or TypeScript for type safety
- Error boundaries
- Lazy loading for code splitting
- Memoization for expensive computations
- Accessibility (ARIA labels, keyboard navigation)

**AI/ML:**
- Separate training and inference code
- Version control for models (MLflow)
- Data validation before training
- Cross-validation for model selection
- Model monitoring for drift detection
- A/B testing for model updates
- Document model assumptions and limitations

---

## 5. Data Flow Diagrams

### 5.1 Gasless Transaction Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ 1. Connect Wallet
     │
┌────▼──────────────────────────────────────────┐
│  Frontend: Gasless Transaction Page            │
│  - User inputs: token, recipient, amount       │
│  - Click "Transfer" button                     │
└────┬──────────────────────────────────────────┘
     │ 2. Request signature
     │
┌────▼──────────────────────────────────────────┐
│  Wallet: Sign typed data (EIP-712)             │
│  - ForwardRequest{ from, to, value, gas,       │
│    nonce, data }                               │
│  - User approves signature                     │
└────┬──────────────────────────────────────────┘
     │ 3. Send signature + request
     │
┌────▼──────────────────────────────────────────┐
│  Backend: POST /api/gasless/submit             │
│  - Validate signature                          │
│  - Check nonce                                 │
│  - Calculate fee                               │
│  - Add to queue                                │
└────┬──────────────────────────────────────────┘
     │ 4. Submit to blockchain
     │
┌────▼──────────────────────────────────────────┐
│  Gasless Relayer Service                       │
│  - Pop from queue                              │
│  - forwarder.execute(request, signature)       │
│  - Pay gas from relayer wallet                 │
└────┬──────────────────────────────────────────┘
     │ 5. Transaction submitted
     │
┌────▼──────────────────────────────────────────┐
│  Blockchain: Forwarder Contract                │
│  - Verify signature                            │
│  - Check nonce                                 │
│  - Execute call with user as _msgSender()      │
│  - Emit TransactionExecuted event              │
└────┬──────────────────────────────────────────┘
     │ 6. Monitor transaction
     │
┌────▼──────────────────────────────────────────┐
│  Monitoring Service                            │
│  - Listen for events                           │
│  - Update transaction status                   │
│  - WebSocket broadcast to frontend             │
└────┬──────────────────────────────────────────┘
     │ 7. Real-time update
     │
┌────▼──────────────────────────────────────────┐
│  Frontend: Transaction confirmed! ✅           │
│  - Show success message                        │
│  - Update transaction history                  │
└───────────────────────────────────────────────┘
```

### 5.2 Cross-Chain Bridge Flow (Centralized Relayer)

```
┌──────────┐
│   User   │
└────┬─────┘
     │ 1. Initiate bridge transfer
     │
┌────▼──────────────────────────────────────────┐
│  Frontend: Bridge Page                         │
│  - Select source chain (Amoy)                  │
│  - Select destination chain (Sepolia)          │
│  - Select token, enter amount                  │
│  - Click "Transfer"                            │
└────┬──────────────────────────────────────────┘
     │ 2. Approve & lock tokens
     │
┌────▼──────────────────────────────────────────┐
│  Blockchain (Amoy): UnifiedBridge              │
│  - token.approve(bridge, amount)               │
│  - bridge.lockERC20(token, amount, destChain,  │
│    recipient)                                  │
│  - Emit LockRequested(requestId, user, amount) │
└────┬──────────────────────────────────────────┘
     │ 3. Event detected
     │
┌────▼──────────────────────────────────────────┐
│  Centralized Relayer Service (Monitoring Amoy) │
│  - Detect LockRequested event                  │
│  - Extract: requestId, user, amount, destChain │
│  - Store transfer record                       │
└────┬──────────────────────────────────────────┘
     │ 4. Generate Merkle proof
     │
┌────▼──────────────────────────────────────────┐
│  Merkle Service                                │
│  - Add transfer to Merkle tree                 │
│  - Calculate new Merkle root                   │
│  - Generate proof for this transfer            │
│  - Store proof                                 │
└────┬──────────────────────────────────────────┘
     │ 5. Update Merkle root on destination
     │
┌────▼──────────────────────────────────────────┐
│  Blockchain (Sepolia): UnifiedBridge           │
│  - bridge.updateMerkleRoot(newRoot)            │
│    [called by RELAYER_ROLE]                    │
│  - Emit MerkleRootUpdated(newRoot)             │
└────┬──────────────────────────────────────────┘
     │ 6. Mint tokens on destination
     │
┌────▼──────────────────────────────────────────┐
│  Centralized Relayer Service                   │
│  - bridge.unlockERC20(requestId, recipient,    │
│    amount, proof)                              │
│  - Wait for confirmation                       │
└────┬──────────────────────────────────────────┘
     │ 7. Unlock/mint executed
     │
┌────▼──────────────────────────────────────────┐
│  Blockchain (Sepolia): UnifiedBridge           │
│  - Verify Merkle proof                         │
│  - Verify not already claimed                  │
│  - Mint wrapped tokens to recipient            │
│  - Emit ReleaseCompleted(requestId, recipient) │
└────┬──────────────────────────────────────────┘
     │ 8. Update transfer status
     │
┌────▼──────────────────────────────────────────┐
│  Monitoring Service                            │
│  - Detect ReleaseCompleted event               │
│  - Update transfer status: "completed"         │
│  - WebSocket broadcast to frontend             │
│  - AI Service: Analyze transfer                │
└────┬──────────────────────────────────────────┘
     │ 9. Real-time update
     │
┌────▼──────────────────────────────────────────┐
│  Frontend: Transfer completed! ✅              │
│  - Show both transaction hashes                │
│  - Update transfer history                     │
└───────────────────────────────────────────────┘
```

### 5.3 AI Monitoring Flow

```
┌──────────────────────────────────────────────┐
│  Blockchain: Transactions occurring           │
│  - Gasless transactions                       │
│  - Bridge transfers                           │
│  - Regular transactions                       │
└────┬─────────────────────────────────────────┘
     │ 1. Events emitted
     │
┌────▼─────────────────────────────────────────┐
│  Monitoring Service (Node.js)                 │
│  - Listen to all contract events              │
│  - Parse event data                           │
│  - Extract features:                          │
│    * amount, timestamp, addresses             │
│    * gas used, gas price                      │
│    * transaction type                         │
│  - Store in MongoDB + InfluxDB                │
└────┬─────────────────────────────────────────┘
     │ 2. Send data to AI service
     │
┌────▼─────────────────────────────────────────┐
│  AI Service: POST /api/ai/analyze             │
│  - Receive transaction data                   │
│  - Preprocess data                            │
│    * Normalize amounts                        │
│    * Calculate derived features               │
│    * Time-based features (hour, day of week)  │
└────┬─────────────────────────────────────────┘
     │ 3. Run anomaly detection
     │
┌────▼─────────────────────────────────────────┐
│  Anomaly Detection Model                      │
│  - Isolation Forest: check if outlier         │
│  - LSTM: check sequence anomaly               │
│  - Combine scores                             │
│  - If score > 70: ANOMALY DETECTED            │
└────┬─────────────────────────────────────────┘
     │ 4. Run risk scoring
     │
┌────▼─────────────────────────────────────────┐
│  Risk Scoring Model                           │
│  - Extract features:                          │
│    * Sender address age                       │
│    * Transaction count history                │
│    * Amount deviation                         │
│    * Time since last transaction              │
│  - Gradient Boosting Classifier prediction    │
│  - Output: risk score 0-100                   │
└────┬─────────────────────────────────────────┘
     │ 5. Pattern recognition
     │
┌────▼─────────────────────────────────────────┐
│  Pattern Recognition                          │
│  - Cluster similar transactions               │
│  - Identify user type (whale, arbitrageur)    │
│  - Detect wash trading patterns               │
│  - Detect bridge attack patterns              │
└────┬─────────────────────────────────────────┘
     │ 6. Return analysis
     │
┌────▼─────────────────────────────────────────┐
│  AI Service Response                          │
│  {                                            │
│    anomalyScore: 85,                          │
│    riskScore: 72,                             │
│    isAnomaly: true,                           │
│    isHighRisk: false,                         │
│    patterns: ["rapid_transactions"],          │
│    recommendation: "Monitor closely"          │
│  }                                            │
└────┬─────────────────────────────────────────┘
     │ 7. Create alert if needed
     │
┌────▼─────────────────────────────────────────┐
│  Backend: Alert Service                       │
│  - If anomaly or high risk:                   │
│    * Create alert record                      │
│    * Determine severity                       │
│    * Store in database                        │
│    * WebSocket broadcast                      │
│  - Update metrics                             │
└────┬─────────────────────────────────────────┘
     │ 8. Real-time dashboard update
     │
┌────▼─────────────────────────────────────────┐
│  Frontend: AI Monitoring Dashboard            │
│  - WebSocket receives update                  │
│  - Add alert to alert feed                    │
│  - Update anomaly chart                       │
│  - Update metrics (total anomalies +1)        │
│  - Show notification                          │
└───────────────────────────────────────────────┘
     │ 9. Admin reviews
     │
┌────▼─────────────────────────────────────────┐
│  Admin: Review alert                          │
│  - View transaction details                   │
│  - Check AI analysis                          │
│  - Decide: dismiss, escalate, or block        │
│  - If block: add to blacklist                 │
└───────────────────────────────────────────────┘
```

---

## 6. API Specifications

### 6.1 Gasless Transaction APIs

#### POST `/api/gasless/submit`
**Description**: Submit a gasless transaction for relay

**Request Body:**
```json
{
  "forwardRequest": {
    "from": "0x...",
    "to": "0x...",
    "value": "0",
    "gas": "100000",
    "nonce": "5",
    "data": "0x..."
  },
  "signature": "0x...",
  "type": "execute" | "erc20_transfer" | "erc721_transfer"
}
```

**Response (200):**
```json
{
  "success": true,
  "txId": "64b5f1a2c8d...",
  "estimatedGas": "95000",
  "relayerFee": "0.001",
  "status": "pending"
}
```

#### GET `/api/gasless/tx/:txId`
**Description**: Get gasless transaction status

**Response (200):**
```json
{
  "txId": "64b5f1a2c8d...",
  "status": "confirmed",
  "txHash": "0x...",
  "gasUsed": "92000",
  "timestamp": "2025-01-15T10:30:00Z",
  "confirmedAt": "2025-01-15T10:30:45Z"
}
```

#### GET `/api/gasless/nonce/:address`
**Description**: Get next nonce for an address

**Response (200):**
```json
{
  "address": "0x...",
  "nonce": "6"
}
```

#### POST `/api/gasless/estimate-fee`
**Description**: Estimate relayer fee for a transaction

**Request Body:**
```json
{
  "type": "erc20_transfer",
  "gasEstimate": "100000"
}
```

**Response (200):**
```json
{
  "gasCost": "0.002",
  "relayerMarkup": "0.0005",
  "totalFee": "0.0025",
  "currency": "MATIC"
}
```

### 6.2 Bridge APIs

#### POST `/api/bridge/transfer`
**Description**: Initiate a bridge transfer (returns status, doesn't submit TX)

**Request Body:**
```json
{
  "sourceChain": 80002,
  "destinationChain": 11155111,
  "token": "0x...",
  "amount": "1000000000000000000",
  "recipient": "0x...",
  "type": "erc20",
  "relayerMode": "centralized" | "decentralized"
}
```

**Response (200):**
```json
{
  "requestId": "0x1234...",
  "estimatedTime": "300",
  "estimatedFee": "0.01",
  "requiredApproval": true
}
```

#### GET `/api/bridge/transfer/:requestId`
**Description**: Get transfer status

**Response (200):**
```json
{
  "requestId": "0x1234...",
  "status": "completed",
  "sourceChain": 80002,
  "destinationChain": 11155111,
  "lockTxHash": "0xabc...",
  "unlockTxHash": "0xdef...",
  "amount": "1000000000000000000",
  "timestamp": "2025-01-15T10:00:00Z",
  "completedAt": "2025-01-15T10:04:30Z"
}
```

#### GET `/api/bridge/transfers`
**Description**: Get all transfers for a user

**Query Parameters:**
- `address` (required): User address
- `status`: Filter by status
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response (200):**
```json
{
  "transfers": [
    {
      "requestId": "0x1234...",
      "status": "completed",
      "amount": "1000000000000000000",
      "timestamp": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pages": 3
}
```

#### POST `/api/bridge/proof/:requestId`
**Description**: Get Merkle proof for a transfer

**Response (200):**
```json
{
  "requestId": "0x1234...",
  "proof": ["0x...", "0x...", "0x..."],
  "root": "0x...",
  "verified": true
}
```

### 6.3 AI Monitoring APIs

#### POST `/api/ai/analyze`
**Description**: Analyze a transaction with AI

**Request Body:**
```json
{
  "txHash": "0x...",
  "type": "bridge_transfer",
  "amount": "1000000000000000000",
  "sender": "0x...",
  "recipient": "0x...",
  "timestamp": "2025-01-15T10:00:00Z",
  "gasUsed": "150000",
  "gasPrice": "50000000000"
}
```

**Response (200):**
```json
{
  "anomalyScore": 65,
  "riskScore": 30,
  "isAnomaly": false,
  "isHighRisk": false,
  "patterns": ["regular_user"],
  "recommendation": "Approve",
  "analysis": {
    "amountDeviation": 0.5,
    "velocityCheck": "normal",
    "addressReputation": "good",
    "timeAnalysis": "typical_hours"
  }
}
```

#### GET `/api/ai/metrics`
**Description**: Get real-time metrics

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d`

**Response (200):**
```json
{
  "timeRange": "24h",
  "metrics": {
    "totalTransactions": 1523,
    "totalVolume": "15234.56",
    "activeUsers": 342,
    "successRate": 99.2,
    "averageGasCost": "0.003",
    "anomaliesDetected": 12,
    "highRiskTransactions": 3
  }
}
```

#### GET `/api/ai/gas-prediction`
**Description**: Get gas price predictions

**Query Parameters:**
- `chain`: Chain ID
- `horizon`: Prediction horizon in minutes (15, 30, 60)

**Response (200):**
```json
{
  "chain": 80002,
  "current": {
    "baseFee": "50000000000",
    "priorityFee": "2000000000",
    "timestamp": "2025-01-15T10:00:00Z"
  },
  "predictions": [
    {
      "time": "2025-01-15T10:15:00Z",
      "baseFee": "48000000000",
      "confidence": 0.85
    },
    {
      "time": "2025-01-15T10:30:00Z",
      "baseFee": "45000000000",
      "confidence": 0.78
    }
  ]
}
```

#### GET `/api/ai/alerts`
**Description**: Get recent alerts

**Query Parameters:**
- `severity`: Filter by severity
- `status`: Filter by status
- `page`: Page number
- `limit`: Items per page

**Response (200):**
```json
{
  "alerts": [
    {
      "id": "64b5f...",
      "type": "anomaly",
      "severity": "high",
      "title": "Unusual transfer amount detected",
      "message": "Transfer of 100 ETH is 5x standard deviation above mean",
      "score": 85,
      "txHash": "0x...",
      "timestamp": "2025-01-15T10:30:00Z",
      "status": "new"
    }
  ],
  "total": 15,
  "page": 1
}
```

#### GET `/api/ai/patterns`
**Description**: Get detected patterns

**Response (200):**
```json
{
  "patterns": [
    {
      "type": "whale_activity",
      "count": 5,
      "addresses": ["0x...", "0x..."],
      "totalVolume": "5000.00",
      "lastSeen": "2025-01-15T10:00:00Z"
    },
    {
      "type": "arbitrage",
      "count": 23,
      "description": "Rapid back-and-forth transfers",
      "lastSeen": "2025-01-15T09:45:00Z"
    }
  ]
}
```

### 6.4 Admin APIs

#### POST `/api/admin/relayer/add`
**Description**: Add a new relayer (decentralized mode)
**Auth**: Required (JWT)

**Request Body:**
```json
{
  "address": "0x...",
  "stake": "100000000000000000000"
}
```

**Response (200):**
```json
{
  "success": true,
  "relayer": {
    "address": "0x...",
    "stake": "100000000000000000000",
    "isActive": true
  }
}
```

#### POST `/api/admin/bridge/pause`
**Description**: Pause the bridge (emergency)
**Auth**: Required (JWT, ADMIN role)

**Request Body:**
```json
{
  "chain": 80002,
  "reason": "Security incident"
}
```

**Response (200):**
```json
{
  "success": true,
  "txHash": "0x...",
  "chain": 80002,
  "paused": true
}
```

#### GET `/api/admin/stats`
**Description**: Get admin statistics
**Auth**: Required (JWT)

**Response (200):**
```json
{
  "totalTransactions": 15234,
  "totalVolume": "1523456.78",
  "totalFees": "152.34",
  "activeRelayers": 5,
  "systemHealth": {
    "apiStatus": "healthy",
    "databaseStatus": "healthy",
    "relayerStatus": "healthy",
    "aiServiceStatus": "healthy"
  }
}
```

### 6.5 WebSocket Events

**Connection:**
```javascript
const socket = io('wss://api.enobridge.com');
```

**Client → Server Events:**
```javascript
// Subscribe to transaction updates
socket.emit('subscribe', {
  type: 'transaction',
  txId: '64b5f...'
});

// Subscribe to user transfers
socket.emit('subscribe', {
  type: 'user_transfers',
  address: '0x...'
});

// Subscribe to monitoring data
socket.emit('subscribe', {
  type: 'monitoring',
  metrics: ['transactions', 'alerts']
});
```

**Server → Client Events:**
```javascript
// Transaction status update
socket.on('transaction_update', (data) => {
  // data: { txId, status, txHash, ... }
});

// Transfer status update
socket.on('transfer_update', (data) => {
  // data: { requestId, status, ... }
});

// New alert
socket.on('new_alert', (data) => {
  // data: { type, severity, message, ... }
});

// Metrics update
socket.on('metrics_update', (data) => {
  // data: { totalTransactions, volume, ... }
});
```

---

## 7. Deployment Strategy

### 7.1 Infrastructure

**Production Environment:**
```
┌─────────────────────────────────────────────┐
│  Load Balancer (Nginx)                      │
│  - SSL Termination                          │
│  - Rate Limiting                            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│  Application Servers (3x)                   │
│  - Node.js Backend (Docker)                 │
│  - Python AI Service (Docker)               │
│  - WebSocket Server (Docker)                │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│  Database Cluster                           │
│  - MongoDB (Replica Set, 3 nodes)           │
│  - Redis (Cluster, 3 nodes)                 │
│  - InfluxDB (Single instance with backup)   │
└─────────────────────────────────────────────┘
```

**Blockchain Infrastructure:**
- RPC Endpoints: Alchemy or Infura (with fallback)
- Relayer Wallets: Separate hot wallets for each chain
- Private Keys: AWS KMS or HashiCorp Vault

**Frontend Hosting:**
- Platform: Vercel or Netlify
- CDN: Global edge network
- SSL: Automatic

### 7.2 Deployment Steps

**1. Smart Contract Deployment:**
```bash
# Deploy to Amoy
npx hardhat run scripts/deploy-unified.js --network amoy

# Deploy to Sepolia
npx hardhat run scripts/deploy-unified.js --network sepolia

# Verify contracts
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

**2. Backend Deployment:**
```bash
# Build Docker images
docker build -t enobridge-backend:v1.0 ./backend
docker build -t enobridge-ai:v1.0 ./ai_service

# Push to registry
docker push enobridge-backend:v1.0
docker push enobridge-ai:v1.0

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

**3. Frontend Deployment:**
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

**4. Configuration:**
```bash
# Set environment variables
# Backend
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
AMOY_RPC_URL=https://...
SEPOLIA_RPC_URL=https://...
RELAYER_PRIVATE_KEY=0x...
JWT_SECRET=...

# Frontend
VITE_API_URL=https://api.enobridge.com
VITE_WS_URL=wss://api.enobridge.com
VITE_AMOY_BRIDGE_ADDRESS=0x...
VITE_SEPOLIA_BRIDGE_ADDRESS=0x...
```

### 7.3 Monitoring & Alerting

**Prometheus Metrics:**
- `enobridge_transactions_total{chain, type, status}`
- `enobridge_transaction_duration_seconds{chain, type}`
- `enobridge_api_requests_total{endpoint, method, status}`
- `enobridge_ai_inference_duration_seconds{model}`
- `enobridge_relayer_balance{chain}`

**Grafana Dashboards:**
- System Overview (transactions, volume, users)
- API Performance (latency, throughput, errors)
- Blockchain Metrics (gas prices, confirmations)
- AI Metrics (anomaly rate, risk scores)
- Relayer Health (balance, success rate)

**Alerting Rules:**
- Relayer balance < threshold → Page on-call
- Transaction failure rate > 5% → Slack alert
- API latency > 1s → Email alert
- Bridge paused → Immediate page
- High-risk transaction detected → Slack alert

### 7.4 Security Measures

**Infrastructure:**
- Firewall: Only ports 80, 443 open
- SSH: Key-based only, no password
- Database: Not publicly accessible
- Secrets: Stored in AWS Secrets Manager or Vault

**Application:**
- Rate Limiting: 100 req/min per IP
- Authentication: JWT with 1h expiration
- Input Validation: All endpoints
- CORS: Whitelist frontend domain only
- Security Headers: CSP, X-Frame-Options, etc.

**Smart Contracts:**
- Audit: Professional audit before mainnet
- Pausable: Emergency stop mechanism
- Upgradeable: Proxy pattern for critical contracts
- Monitoring: Alert on all admin actions

---

## 8. Testing Strategy

### 8.1 Smart Contract Tests

**Unit Tests (Hardhat):**
```javascript
describe("UnifiedBridge", () => {
  it("Should lock ERC20 tokens", async () => {
    // Test lock function
  });

  it("Should reject invalid Merkle proofs", async () => {
    // Security test
  });

  it("Should prevent replay attacks", async () => {
    // Nonce test
  });
});
```

**Coverage Target:** > 90%

**Tools:**
- Hardhat
- Waffle
- solidity-coverage

### 8.2 Backend Tests

**Unit Tests:**
- Service functions
- Utility functions
- Model validations

**Integration Tests:**
- API endpoints
- Database operations
- External service calls

**Tools:**
- Jest
- Supertest
- MongoDB Memory Server

### 8.3 Frontend Tests

**Component Tests:**
- React Testing Library
- User interactions
- State management

**E2E Tests:**
- Cypress or Playwright
- Full user flows
- Wallet interactions (mocked)

### 8.4 Performance Tests

**Load Testing:**
```yaml
# Artillery config
scenarios:
  - name: "Bridge transfer flow"
    flow:
      - post:
          url: "/api/bridge/transfer"
          json:
            sourceChain: 80002
            amount: "1000000000000000000"
```

**Targets:**
- 100 concurrent users
- 1000 requests/second
- < 200ms response time

### 8.5 Security Tests

**Automated:**
- Slither (smart contracts)
- MythX (smart contracts)
- npm audit (dependencies)
- OWASP ZAP (API)

**Manual:**
- Signature verification edge cases
- Access control tests
- Reentrancy tests
- Front-running scenarios

---

## 9. Success Criteria

### 9.1 Functional Success

- [ ] Users can execute gasless transactions with < 5 second confirmation
- [ ] Users can bridge ERC20 tokens between Amoy and Sepolia
- [ ] Users can bridge ERC721 tokens between chains
- [ ] Both centralized and decentralized relayer modes work
- [ ] AI successfully detects anomalies with > 90% accuracy
- [ ] Risk scoring model achieves > 85% precision
- [ ] Gas prediction MAPE < 15%
- [ ] Real-time dashboard updates within 1 second of events
- [ ] Admin can pause/unpause bridge
- [ ] Admin can manage relayers

### 9.2 Non-Functional Success

- [ ] System uptime > 99%
- [ ] API response time < 200ms (95th percentile)
- [ ] Bridge transfer completion < 5 minutes (centralized)
- [ ] Smart contracts pass audit with no critical issues
- [ ] Frontend loads in < 2 seconds
- [ ] Mobile responsive design works on all screen sizes
- [ ] Documentation is complete and accurate
- [ ] Test coverage > 80% (contracts), > 70% (backend)

### 9.3 Business Success

- [ ] > 100 successful bridge transfers in first week
- [ ] > 50 active users in first month
- [ ] Zero security incidents
- [ ] Positive user feedback (> 4/5 rating)
- [ ] Media coverage or blog posts about the project

---

This comprehensive requirements and approach document provides the complete blueprint for building EnoBridge. Every component, API, and flow is specified in detail to guide the implementation phase.
