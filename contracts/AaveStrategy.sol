// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IStrategy.sol";

/// @dev Minimal Aave V3 Pool interface — only the two functions we need
interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @title AaveStrategy - Routes Vault funds into Aave V3 to earn yield
/// @notice Implements IStrategy. Only the Vault contract may call deposit/withdraw.
/// @dev KEY SAFETY DESIGN:
///      1. Permission locking: onlyVault modifier on all state-changing functions
///      2. Fund routing: Vault.invest() → strategy.deposit() → Aave.supply()
///      3. Failure isolation: try/catch wraps every Aave call.
///         If Aave fails, tokens return to Vault — main Vault operations are NEVER affected.
///
///      Local testing:  deploy with MockAavePool address
///      Sepolia testnet: deploy with 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
contract AaveStrategy is IStrategy {
    /// @notice Vault address — only caller allowed to deposit/withdraw
    address public immutable vault;

    /// @notice The ERC20 token this strategy manages (e.g. USDT)
    address public immutable token;

    /// @notice Aave V3 Pool address (MockAavePool locally, real pool on Sepolia)
    address public aavePool;

    /// @notice Internal accounting: how much is currently in Aave
    uint256 private _depositedToPool;

    /// @notice Only the Vault contract can call protected functions
    modifier onlyVault() {
        require(msg.sender == vault, "AaveStrategy: caller is not the vault");
        _;
    }

    constructor(address _vault, address _token, address _aavePool) {
        require(_vault != address(0), "AaveStrategy: invalid vault");
        require(_token != address(0), "AaveStrategy: invalid token");
        require(_aavePool != address(0), "AaveStrategy: invalid pool");
        vault = _vault;
        token = _token;
        aavePool = _aavePool;
    }

    /// @notice Deposit tokens into Aave. Tokens must be in this contract before calling.
    /// @dev If Aave.supply() reverts: catch block returns tokens to vault, returns false.
    ///      Vault's invest() will then revert (with tokens safely back in vault).
    function deposit(uint256 amount) external onlyVault returns (bool success) {
        require(IERC20(token).balanceOf(address(this)) >= amount, "AaveStrategy: insufficient balance");

        // Approve Aave pool to pull tokens from this strategy
        IERC20(token).approve(aavePool, amount);

        try IAavePool(aavePool).supply(token, amount, address(this), 0) {
            _depositedToPool += amount;
            emit Deposited(amount);
            return true;
        } catch {
            // Aave failed — return tokens to vault so nothing is lost
            IERC20(token).approve(aavePool, 0); // clear approval
            IERC20(token).transfer(vault, amount);
            return false;
        }
    }

    /// @notice Withdraw tokens from Aave directly to Vault.
    /// @dev Aave sends tokens to `vault` address directly. If Aave fails, returns false.
    function withdraw(uint256 amount) external onlyVault returns (bool success) {
        require(_depositedToPool >= amount, "AaveStrategy: exceeds deposited amount");

        try IAavePool(aavePool).withdraw(token, amount, vault) {
            _depositedToPool -= amount;
            emit Withdrawn(amount);
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Returns how many tokens are currently deployed in Aave
    function totalAssets() external view returns (uint256) {
        return _depositedToPool;
    }

    /// @notice Returns the ERC20 token address this strategy manages
    function underlyingToken() external view returns (address) {
        return token;
    }

    /// @notice Emergency: withdraw all funds back to Vault regardless of normal flow
    /// @dev Only Vault can call. Use when Aave is compromised or strategy is being replaced.
    function emergencyWithdraw() external onlyVault returns (bool success) {
        if (_depositedToPool == 0) return true;

        uint256 amount = _depositedToPool;
        try IAavePool(aavePool).withdraw(token, amount, vault) {
            _depositedToPool = 0;
            emit EmergencyWithdrawn(amount);
            return true;
        } catch {
            return false;
        }
    }
}
