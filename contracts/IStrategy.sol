// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStrategy - Asset-measured yield strategy interface
/// @notice Minimal interface used by VaultV4 to allocate and recover its underlying asset.
/// @dev Returned amounts are measured asset movements, not success flags or internal principal counters.
interface IStrategy {
    /// @notice Vault contract authorized to call state-changing strategy functions.
    function vault() external view returns (address);

    /// @notice ERC-20 asset managed by the strategy.
    function underlyingToken() external view returns (address);

    /// @notice Total underlying-equivalent assets controlled by the strategy.
    function totalAssets() external view returns (uint256);

    /// @notice Deploy already-transferred underlying into the external protocol.
    /// @return actualInvestedAssets Underlying actually consumed by the protocol.
    function deposit(uint256 requestedAssets) external returns (uint256 actualInvestedAssets);

    /// @notice Return up to `requestedAssets` from strategy idle funds and the external protocol.
    /// @return actualReturnedAssets Underlying actually delivered to the Vault.
    function withdraw(uint256 requestedAssets) external returns (uint256 actualReturnedAssets);

    /// @notice Best-effort recovery of all idle and externally deployed assets.
    /// @return actualReturnedAssets Underlying recovered to the Vault in this call.
    /// @return protocolCallSucceeded Whether the external-protocol recovery call avoided a revert.
    /// @dev A true value does not imply that every protocol asset was recovered; callers must query totalAssets.
    function emergencyWithdraw() external returns (uint256 actualReturnedAssets, bool protocolCallSucceeded);

    // ---- Events ----
    event Deposited(uint256 requestedAssets, uint256 actualInvestedAssets);
    event Withdrawn(uint256 requestedAssets, uint256 actualReturnedAssets);
    event EmergencyWithdrawn(uint256 actualReturnedAssets, bool protocolCallSucceeded);
}
