// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title WrappedToken
 * @notice Wrapped ERC20 token for destination chain
 * @dev Only the bridge can mint/burn
 */
contract WrappedToken is ERC20, ERC20Burnable, ERC20Permit, AccessControl {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    constructor(
        string memory name,
        string memory symbol,
        address bridge
    ) ERC20(name, symbol) ERC20Permit(name) {
        require(bridge != address(0), "Invalid bridge address");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BRIDGE_ROLE, bridge);
    }

    function mint(address to, uint256 amount) external onlyRole(BRIDGE_ROLE) {
        _mint(to, amount);
    }

    function burnFrom(address account, uint256 amount) public override onlyRole(BRIDGE_ROLE) {
        _burn(account, amount);
    }
}
