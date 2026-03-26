// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MockAavePool - Simulates Aave V3 Pool for local Anvil testing
/// @notice Mirrors Aave V3's supply/withdraw interface exactly.
/// @dev NOT for production. Used so AaveStrategy's try/catch can be tested locally.
///      On Sepolia, replace this address with 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
contract MockAavePool {
    // onBehalfOf => asset => amount deposited
    mapping(address => mapping(address => uint256)) public deposits;

    // Flip this to true to simulate Aave going down — triggers the try/catch in AaveStrategy
    bool public shouldRevert;

    /// @notice Toggle failure mode (for testing try/catch isolation)
    function setRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    /// @notice Mirrors Aave V3 Pool.supply() signature exactly
    /// @param asset Token address to supply
    /// @param amount Amount to supply
    /// @param onBehalfOf Who receives the "deposit credit" (strategy address)
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /*referralCode*/
    ) external {
        require(!shouldRevert, "MockAave: simulated failure");
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        deposits[onBehalfOf][asset] += amount;
    }

    /// @notice Mirrors Aave V3 Pool.withdraw() signature exactly
    /// @param asset Token address to withdraw
    /// @param amount Amount to withdraw
    /// @param to Recipient address (vault)
    /// @return Amount actually withdrawn
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(!shouldRevert, "MockAave: simulated failure");
        require(deposits[msg.sender][asset] >= amount, "MockAave: insufficient balance");
        deposits[msg.sender][asset] -= amount;
        IERC20(asset).transfer(to, amount);
        return amount;
    }

    /// @notice Check how much an account has deposited for a given asset
    function getBalance(address user, address asset) external view returns (uint256) {
        return deposits[user][asset];
    }
}
