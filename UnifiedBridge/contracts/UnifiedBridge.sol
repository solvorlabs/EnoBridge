// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title UnifiedBridge
 * @notice Unified bridge contract with gasless transaction support (EIP-2771)
 * @dev Combines cross-chain asset transfers with meta-transaction capabilities
 *
 * Features:
 * - ERC20 lock/mint and burn/unlock mechanisms
 * - ERC721 (NFT) cross-chain transfers
 * - Gasless transactions via EIP-2771 trusted forwarder
 * - Merkle proof verification for security
 * - Transfer limits and emergency controls
 * - Both centralized and decentralized relayer support
 */
contract UnifiedBridge is AccessControl, ReentrancyGuard, Pausable, ERC2771Context {
    using SafeERC20 for IERC20;

    // ========== Roles ==========
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ========== State Variables ==========

    // Merkle root for transfer verification
    bytes32 public merkleRoot;

    // Mapping to track completed transfers (prevent replay)
    mapping(bytes32 => bool) public completedTransfers;

    // Mapping to track locked ERC20 balances
    mapping(address => uint256) public lockedBalances;

    // Mapping to track locked ERC721 tokens
    mapping(address => mapping(uint256 => bool)) public lockedNFTs;

    // Transfer limits
    uint256 public minTransferAmount;
    uint256 public maxTransferAmount;

    // Supported tokens
    mapping(address => bool) public supportedTokens;
    mapping(address => bool) public supportedNFTs;

    // Chain ID
    uint256 public immutable chainId;

    // Counter for generating unique request IDs
    uint256 private requestCounter;

    // ========== Structs ==========

    struct TransferRequest {
        bytes32 requestId;
        address token;
        address sender;
        address recipient;
        uint256 amount;
        uint256 sourceChain;
        uint256 destinationChain;
        uint256 timestamp;
    }

    struct NFTTransferRequest {
        bytes32 requestId;
        address token;
        address sender;
        address recipient;
        uint256 tokenId;
        uint256 sourceChain;
        uint256 destinationChain;
        uint256 timestamp;
    }

    // ========== Events ==========

    event TokenSupported(address indexed token, bool isNFT);
    event TokenUnsupported(address indexed token);

    event LockRequested(
        bytes32 indexed requestId,
        address indexed token,
        address indexed sender,
        address recipient,
        uint256 amount,
        uint256 destinationChain,
        uint256 timestamp
    );

    event ReleaseCompleted(
        bytes32 indexed requestId,
        address indexed token,
        address indexed recipient,
        uint256 amount,
        uint256 sourceChain
    );

    event NFTLockRequested(
        bytes32 indexed requestId,
        address indexed token,
        address indexed sender,
        address recipient,
        uint256 tokenId,
        uint256 destinationChain,
        uint256 timestamp
    );

    event NFTReleaseCompleted(
        bytes32 indexed requestId,
        address indexed token,
        address indexed recipient,
        uint256 tokenId,
        uint256 sourceChain
    );

    event MerkleRootUpdated(bytes32 indexed newRoot, uint256 timestamp);
    event TransferLimitsUpdated(uint256 minAmount, uint256 maxAmount);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    // ========== Constructor ==========

    /**
     * @param _trustedForwarder Address of the trusted forwarder for meta-transactions
     * @param _admin Address of the admin
     * @param _minTransferAmount Minimum transfer amount
     * @param _maxTransferAmount Maximum transfer amount
     */
    constructor(
        address _trustedForwarder,
        address _admin,
        uint256 _minTransferAmount,
        uint256 _maxTransferAmount
    ) ERC2771Context(_trustedForwarder) {
        require(_admin != address(0), "Invalid admin address");
        require(_maxTransferAmount > _minTransferAmount, "Invalid limits");

        chainId = block.chainid;
        minTransferAmount = _minTransferAmount;
        maxTransferAmount = _maxTransferAmount;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    // ========== Modifiers ==========

    modifier onlySupported(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }

    modifier onlySupportedNFT(address token) {
        require(supportedNFTs[token], "NFT not supported");
        _;
    }

    modifier withinLimits(uint256 amount) {
        require(amount >= minTransferAmount, "Amount below minimum");
        require(amount <= maxTransferAmount, "Amount above maximum");
        _;
    }

    // ========== ERC2771 Override ==========

    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    // ========== Admin Functions ==========

    /**
     * @notice Add a supported ERC20 token
     * @param token Address of the token
     */
    function addSupportedToken(address token) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
        emit TokenSupported(token, false);
    }

    /**
     * @notice Add a supported ERC721 token
     * @param token Address of the NFT contract
     */
    function addSupportedNFT(address token) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "Invalid token address");
        supportedNFTs[token] = true;
        emit TokenSupported(token, true);
    }

    /**
     * @notice Remove a supported token
     * @param token Address of the token
     */
    function removeSupportedToken(address token) external onlyRole(ADMIN_ROLE) {
        supportedTokens[token] = false;
        emit TokenUnsupported(token);
    }

    /**
     * @notice Remove a supported NFT
     * @param token Address of the NFT contract
     */
    function removeSupportedNFT(address token) external onlyRole(ADMIN_ROLE) {
        supportedNFTs[token] = false;
        emit TokenUnsupported(token);
    }

    /**
     * @notice Update Merkle root for transfer verification
     * @param newRoot New Merkle root
     */
    function updateMerkleRoot(bytes32 newRoot) external onlyRole(RELAYER_ROLE) {
        require(newRoot != bytes32(0), "Invalid root");
        merkleRoot = newRoot;
        emit MerkleRootUpdated(newRoot, block.timestamp);
    }

    /**
     * @notice Update transfer limits
     * @param _minAmount New minimum transfer amount
     * @param _maxAmount New maximum transfer amount
     */
    function updateTransferLimits(uint256 _minAmount, uint256 _maxAmount) external onlyRole(ADMIN_ROLE) {
        require(_maxAmount > _minAmount, "Invalid limits");
        minTransferAmount = _minAmount;
        maxTransferAmount = _maxAmount;
        emit TransferLimitsUpdated(_minAmount, _maxAmount);
    }

    /**
     * @notice Pause the bridge
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the bridge
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency withdraw locked tokens
     * @param token Address of the token
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) whenPaused {
        require(to != address(0), "Invalid recipient");
        require(amount <= lockedBalances[token], "Insufficient locked balance");

        lockedBalances[token] -= amount;
        IERC20(token).safeTransfer(to, amount);

        emit EmergencyWithdraw(token, to, amount);
    }

    // ========== ERC20 Bridge Functions ==========

    /**
     * @notice Lock ERC20 tokens to bridge to another chain
     * @param token Address of the token to lock
     * @param amount Amount to lock
     * @param destinationChain Destination chain ID
     * @param recipient Recipient address on destination chain
     * @return requestId Unique request ID for this transfer
     */
    function lockERC20(
        address token,
        uint256 amount,
        uint256 destinationChain,
        address recipient
    )
        external
        whenNotPaused
        nonReentrant
        onlySupported(token)
        withinLimits(amount)
        returns (bytes32 requestId)
    {
        require(recipient != address(0), "Invalid recipient");
        require(destinationChain != chainId, "Cannot bridge to same chain");
        require(amount > 0, "Amount must be greater than 0");

        address sender = _msgSender();

        // Generate unique request ID
        requestId = keccak256(
            abi.encodePacked(
                sender,
                token,
                amount,
                destinationChain,
                block.timestamp,
                requestCounter++
            )
        );

        // Transfer tokens to bridge
        IERC20(token).safeTransferFrom(sender, address(this), amount);
        lockedBalances[token] += amount;

        emit LockRequested(
            requestId,
            token,
            sender,
            recipient,
            amount,
            destinationChain,
            block.timestamp
        );

        return requestId;
    }

    /**
     * @notice Release ERC20 tokens on destination chain
     * @param requestId Unique request ID from source chain
     * @param token Address of the token
     * @param recipient Recipient address
     * @param amount Amount to release
     * @param sourceChain Source chain ID
     * @param merkleProof Merkle proof for verification
     */
    function releaseERC20(
        bytes32 requestId,
        address token,
        address recipient,
        uint256 amount,
        uint256 sourceChain,
        bytes32[] calldata merkleProof
    )
        external
        whenNotPaused
        nonReentrant
        onlyRole(RELAYER_ROLE)
    {
        require(!completedTransfers[requestId], "Transfer already completed");
        require(recipient != address(0), "Invalid recipient");
        require(sourceChain != chainId, "Invalid source chain");

        // Verify Merkle proof
        bytes32 leaf = keccak256(
            abi.encodePacked(requestId, token, recipient, amount, sourceChain)
        );
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");

        // Mark as completed
        completedTransfers[requestId] = true;

        // Release tokens (this would mint on destination chain in production)
        // For simplicity, we're releasing locked tokens here
        require(amount <= lockedBalances[token], "Insufficient locked balance");
        lockedBalances[token] -= amount;
        IERC20(token).safeTransfer(recipient, amount);

        emit ReleaseCompleted(requestId, token, recipient, amount, sourceChain);
    }

    // ========== ERC721 Bridge Functions ==========

    /**
     * @notice Lock ERC721 (NFT) to bridge to another chain
     * @param token Address of the NFT contract
     * @param tokenId Token ID to lock
     * @param destinationChain Destination chain ID
     * @param recipient Recipient address on destination chain
     * @return requestId Unique request ID for this transfer
     */
    function lockERC721(
        address token,
        uint256 tokenId,
        uint256 destinationChain,
        address recipient
    )
        external
        whenNotPaused
        nonReentrant
        onlySupportedNFT(token)
        returns (bytes32 requestId)
    {
        require(recipient != address(0), "Invalid recipient");
        require(destinationChain != chainId, "Cannot bridge to same chain");

        address sender = _msgSender();

        // Generate unique request ID
        requestId = keccak256(
            abi.encodePacked(
                sender,
                token,
                tokenId,
                destinationChain,
                block.timestamp,
                requestCounter++
            )
        );

        // Transfer NFT to bridge
        IERC721(token).transferFrom(sender, address(this), tokenId);
        lockedNFTs[token][tokenId] = true;

        emit NFTLockRequested(
            requestId,
            token,
            sender,
            recipient,
            tokenId,
            destinationChain,
            block.timestamp
        );

        return requestId;
    }

    /**
     * @notice Release ERC721 (NFT) on destination chain
     * @param requestId Unique request ID from source chain
     * @param token Address of the NFT contract
     * @param recipient Recipient address
     * @param tokenId Token ID to release
     * @param sourceChain Source chain ID
     * @param merkleProof Merkle proof for verification
     */
    function releaseERC721(
        bytes32 requestId,
        address token,
        address recipient,
        uint256 tokenId,
        uint256 sourceChain,
        bytes32[] calldata merkleProof
    )
        external
        whenNotPaused
        nonReentrant
        onlyRole(RELAYER_ROLE)
    {
        require(!completedTransfers[requestId], "Transfer already completed");
        require(recipient != address(0), "Invalid recipient");
        require(sourceChain != chainId, "Invalid source chain");

        // Verify Merkle proof
        bytes32 leaf = keccak256(
            abi.encodePacked(requestId, token, recipient, tokenId, sourceChain)
        );
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");

        // Mark as completed
        completedTransfers[requestId] = true;

        // Release NFT
        require(lockedNFTs[token][tokenId], "NFT not locked");
        lockedNFTs[token][tokenId] = false;
        IERC721(token).transferFrom(address(this), recipient, tokenId);

        emit NFTReleaseCompleted(requestId, token, recipient, tokenId, sourceChain);
    }

    // ========== View Functions ==========

    /**
     * @notice Check if a transfer is completed
     * @param requestId Request ID to check
     * @return True if completed, false otherwise
     */
    function isTransferCompleted(bytes32 requestId) external view returns (bool) {
        return completedTransfers[requestId];
    }

    /**
     * @notice Get locked balance for a token
     * @param token Address of the token
     * @return Locked balance
     */
    function getLockedBalance(address token) external view returns (uint256) {
        return lockedBalances[token];
    }

    /**
     * @notice Check if an NFT is locked
     * @param token Address of the NFT contract
     * @param tokenId Token ID
     * @return True if locked, false otherwise
     */
    function isNFTLocked(address token, uint256 tokenId) external view returns (bool) {
        return lockedNFTs[token][tokenId];
    }

    /**
     * @notice Get current chain ID
     * @return Chain ID
     */
    function getChainId() external view returns (uint256) {
        return chainId;
    }

    /**
     * @notice Check if this contract supports EIP-2771
     * @return True if supported
     */
    function isTrustedForwarder(address forwarder) public view override returns (bool) {
        return ERC2771Context.isTrustedForwarder(forwarder);
    }
}
