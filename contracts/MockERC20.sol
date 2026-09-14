// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockERC20 - Mock USDT for testing with EIP-2612 Permit support
/// @notice A simple ERC20 token for testing Vault ERC20 functionality with gasless approvals
contract MockERC20 is ERC20, ERC20Permit, Ownable {
    /// @notice Constructor mints initial supply to deployer and initializes Permit
    /// @param initialSupply The amount of tokens to mint to deployer
    constructor(uint256 initialSupply) ERC20("Mock USDT", "USDT") ERC20Permit("Mock USDT") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Mint new tokens (only owner) - for testing purposes
    /// @param to Address to receive tokens
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Override decimals to match USDT (6 decimals)
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
