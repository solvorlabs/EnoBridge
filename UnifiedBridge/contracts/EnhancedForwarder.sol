// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title EnhancedForwarder
 * @notice Meta-transaction forwarder with EIP-2771 and EIP-712 support
 * @dev Allows users to execute transactions without paying gas fees
 *
 * Features:
 * - General meta-transaction execution
 * - Gasless ERC20 transfers
 * - Gasless ERC721 transfers
 * - ERC20Permit integration for gasless approvals
 * - Nonce management for replay protection
 * - Fee mechanism for relayer compensation
 */
contract EnhancedForwarder is EIP712 {
    using ECDSA for bytes32;

    // ========== Structs ==========

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

    struct ERC20TransferRequest {
        address from;
        address token;
        address to;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }

    struct ERC721TransferRequest {
        address from;
        address token;
        address to;
        uint256 tokenId;
        uint256 nonce;
        uint256 deadline;
    }

    // ========== State Variables ==========

    // Nonces for replay protection
    mapping(address => uint256) private _nonces;

    // Fee collector address
    address public feeCollector;

    // Relayer fee percentage (in basis points, e.g., 100 = 1%)
    uint256 public relayerFee;

    // EIP-712 type hashes
    bytes32 private constant FORWARD_REQUEST_TYPEHASH =
        keccak256(
            "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
        );

    bytes32 private constant ERC20_TRANSFER_TYPEHASH =
        keccak256(
            "ERC20TransferRequest(address from,address token,address to,uint256 amount,uint256 nonce,uint256 deadline)"
        );

    bytes32 private constant ERC721_TRANSFER_TYPEHASH =
        keccak256(
            "ERC721TransferRequest(address from,address token,address to,uint256 tokenId,uint256 nonce,uint256 deadline)"
        );

    // ========== Events ==========

    event TransactionExecuted(
        address indexed from,
        address indexed to,
        bytes data,
        uint256 nonce,
        bool success,
        bytes returnData
    );

    event ERC20Transferred(
        address indexed from,
        address indexed token,
        address indexed to,
        uint256 amount,
        uint256 nonce
    );

    event ERC721Transferred(
        address indexed from,
        address indexed token,
        address indexed to,
        uint256 tokenId,
        uint256 nonce
    );

    event FeeCollectorUpdated(address indexed newFeeCollector);
    event RelayerFeeUpdated(uint256 newFee);

    // ========== Constructor ==========

    constructor(address _feeCollector, uint256 _relayerFee) EIP712("EnhancedForwarder", "1") {
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_relayerFee <= 1000, "Fee too high"); // Max 10%
        feeCollector = _feeCollector;
        relayerFee = _relayerFee;
    }

    // ========== Admin Functions ==========

    function setFeeCollector(address _feeCollector) external {
        require(msg.sender == feeCollector, "Only fee collector");
        require(_feeCollector != address(0), "Invalid address");
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(_feeCollector);
    }

    function setRelayerFee(uint256 _relayerFee) external {
        require(msg.sender == feeCollector, "Only fee collector");
        require(_relayerFee <= 1000, "Fee too high");
        relayerFee = _relayerFee;
        emit RelayerFeeUpdated(_relayerFee);
    }

    // ========== Meta-Transaction Execution ==========

    /**
     * @notice Execute a meta-transaction
     * @param req ForwardRequest struct
     * @param signature Signature from the user
     * @return success Whether the transaction succeeded
     * @return returnData Data returned from the transaction
     */
    function execute(
        ForwardRequest calldata req,
        bytes calldata signature
    ) external payable returns (bool success, bytes memory returnData) {
        // Verify signature
        require(verify(req, signature), "Invalid signature");

        // Verify nonce
        require(_nonces[req.from] == req.nonce, "Invalid nonce");

        // Increment nonce
        _nonces[req.from]++;

        // Execute the transaction
        (success, returnData) = req.to.call{gas: req.gas, value: req.value}(
            abi.encodePacked(req.data, req.from)
        );

        // Emit event
        emit TransactionExecuted(req.from, req.to, req.data, req.nonce, success, returnData);

        return (success, returnData);
    }

    /**
     * @notice Verify a ForwardRequest signature
     * @param req ForwardRequest struct
     * @param signature Signature to verify
     * @return True if signature is valid
     */
    function verify(
        ForwardRequest calldata req,
        bytes calldata signature
    ) public view returns (bool) {
        address signer = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    FORWARD_REQUEST_TYPEHASH,
                    req.from,
                    req.to,
                    req.value,
                    req.gas,
                    req.nonce,
                    keccak256(req.data)
                )
            )
        ).recover(signature);

        return signer == req.from;
    }

    // ========== Gasless ERC20 Transfer ==========

    /**
     * @notice Execute a gasless ERC20 transfer
     * @param req ERC20TransferRequest struct
     * @param signature Signature from the user
     */
    function forwardERC20Transfer(
        ERC20TransferRequest calldata req,
        bytes calldata signature
    ) external {
        // Verify signature
        require(verifyERC20Transfer(req, signature), "Invalid signature");

        // Verify nonce
        require(_nonces[req.from] == req.nonce, "Invalid nonce");

        // Verify deadline
        require(block.timestamp <= req.deadline, "Request expired");

        // Increment nonce
        _nonces[req.from]++;

        // Calculate fee
        uint256 fee = (req.amount * relayerFee) / 10000;
        uint256 amountAfterFee = req.amount - fee;

        // Transfer tokens
        IERC20 token = IERC20(req.token);
        require(token.transferFrom(req.from, req.to, amountAfterFee), "Transfer failed");

        // Transfer fee to fee collector
        if (fee > 0) {
            require(token.transferFrom(req.from, feeCollector, fee), "Fee transfer failed");
        }

        emit ERC20Transferred(req.from, req.token, req.to, req.amount, req.nonce);
    }

    /**
     * @notice Execute a gasless ERC20 transfer with Permit
     * @param req ERC20TransferRequest struct
     * @param signature Signature for the transfer request
     * @param permitDeadline Deadline for the permit
     * @param permitV V component of permit signature
     * @param permitR R component of permit signature
     * @param permitS S component of permit signature
     */
    function forwardERC20TransferWithPermit(
        ERC20TransferRequest calldata req,
        bytes calldata signature,
        uint256 permitDeadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external {
        // Verify transfer signature
        require(verifyERC20Transfer(req, signature), "Invalid signature");

        // Verify nonce
        require(_nonces[req.from] == req.nonce, "Invalid nonce");

        // Verify deadline
        require(block.timestamp <= req.deadline, "Request expired");

        // Increment nonce
        _nonces[req.from]++;

        // Execute permit
        IERC20Permit(req.token).permit(
            req.from,
            address(this),
            req.amount,
            permitDeadline,
            permitV,
            permitR,
            permitS
        );

        // Calculate fee
        uint256 fee = (req.amount * relayerFee) / 10000;
        uint256 amountAfterFee = req.amount - fee;

        // Transfer tokens
        IERC20 token = IERC20(req.token);
        require(token.transferFrom(req.from, req.to, amountAfterFee), "Transfer failed");

        // Transfer fee to fee collector
        if (fee > 0) {
            require(token.transferFrom(req.from, feeCollector, fee), "Fee transfer failed");
        }

        emit ERC20Transferred(req.from, req.token, req.to, req.amount, req.nonce);
    }

    /**
     * @notice Verify an ERC20TransferRequest signature
     * @param req ERC20TransferRequest struct
     * @param signature Signature to verify
     * @return True if signature is valid
     */
    function verifyERC20Transfer(
        ERC20TransferRequest calldata req,
        bytes calldata signature
    ) public view returns (bool) {
        address signer = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ERC20_TRANSFER_TYPEHASH,
                    req.from,
                    req.token,
                    req.to,
                    req.amount,
                    req.nonce,
                    req.deadline
                )
            )
        ).recover(signature);

        return signer == req.from;
    }

    // ========== Gasless ERC721 Transfer ==========

    /**
     * @notice Execute a gasless ERC721 transfer
     * @param req ERC721TransferRequest struct
     * @param signature Signature from the user
     */
    function forwardERC721Transfer(
        ERC721TransferRequest calldata req,
        bytes calldata signature
    ) external {
        // Verify signature
        require(verifyERC721Transfer(req, signature), "Invalid signature");

        // Verify nonce
        require(_nonces[req.from] == req.nonce, "Invalid nonce");

        // Verify deadline
        require(block.timestamp <= req.deadline, "Request expired");

        // Increment nonce
        _nonces[req.from]++;

        // Transfer NFT
        IERC721(req.token).transferFrom(req.from, req.to, req.tokenId);

        emit ERC721Transferred(req.from, req.token, req.to, req.tokenId, req.nonce);
    }

    /**
     * @notice Verify an ERC721TransferRequest signature
     * @param req ERC721TransferRequest struct
     * @param signature Signature to verify
     * @return True if signature is valid
     */
    function verifyERC721Transfer(
        ERC721TransferRequest calldata req,
        bytes calldata signature
    ) public view returns (bool) {
        address signer = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ERC721_TRANSFER_TYPEHASH,
                    req.from,
                    req.token,
                    req.to,
                    req.tokenId,
                    req.nonce,
                    req.deadline
                )
            )
        ).recover(signature);

        return signer == req.from;
    }

    // ========== View Functions ==========

    /**
     * @notice Get the current nonce for an address
     * @param from Address to check
     * @return Current nonce
     */
    function getNonce(address from) external view returns (uint256) {
        return _nonces[from];
    }

    /**
     * @notice Check if this contract supports EIP-2771
     * @return True
     */
    function isTrustedForwarder() external pure returns (bool) {
        return true;
    }

    /**
     * @notice Get domain separator for EIP-712
     * @return Domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
