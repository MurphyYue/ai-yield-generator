// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStrategy - Generic yield strategy interface
/// @notice Any yield protocol adapter (Aave, Compound, Lido...) must implement this interface.
/// @dev The Vault interacts ONLY through this interface — never with concrete implementations.
///      This is the Strategy Pattern: swap protocols without touching Vault logic.
interface IStrategy {
    /// @notice Deposit tokens into the yield protocol
    /// @dev Called by Vault only. Tokens must already be transferred into this contract before calling.
    /// @param amount Amount of tokens to deposit
    /// @return success True if deposit succeeded; false if protocol call failed (tokens returned to vault)
    function deposit(uint256 amount) external returns (bool success);

    /// @notice Withdraw tokens from the yield protocol back to Vault
    /// @dev Called by Vault only. Sends withdrawn tokens directly to the Vault address.
    /// @param amount Amount of tokens to withdraw
    /// @return success True if withdrawal succeeded
    function withdraw(uint256 amount) external returns (bool success);

    /// @notice Total tokens currently deployed in the yield protocol
    /// @return Amount deposited (net of withdrawals)
    function totalAssets() external view returns (uint256);

    /// @notice The ERC20 token this strategy manages (e.g. USDT address)
    function underlyingToken() external view returns (address);

    /// @notice Emergency pull: withdraw ALL funds back to Vault, bypassing normal flow
    /// @dev Called by Vault only. Use when protocol is compromised or strategy needs replacing.
    /// @return success True if emergency withdrawal succeeded
    function emergencyWithdraw() external returns (bool success);

    // ---- Events ----
    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event EmergencyWithdrawn(uint256 amount);
}
