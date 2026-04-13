// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/// @dev Minimal Aave V3 Pool interface — only the two functions we need
interface IAavePool {
    struct ReserveData {
        uint256 configuration;
        uint128 liquidityIndex;
        uint128 currentLiquidityRate;
        uint128 variableBorrowIndex;
        uint128 currentVariableBorrowRate;
        uint128 currentStableBorrowRate;
        uint40 lastUpdateTimestamp;
        uint16 id;
        address aTokenAddress;
        address stableDebtTokenAddress;
        address variableDebtTokenAddress;
        address interestRateStrategyAddress;
        uint128 accruedToTreasury;
        uint128 unbacked;
        uint128 isolationModeTotalDebt;
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getReserveData(address asset) external view returns (ReserveData memory);
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
contract AaveStrategy is IStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Vault address — only caller allowed to deposit/withdraw
    address public immutable vault;

    /// @notice The ERC20 token this strategy manages (e.g. USDT)
    address public immutable token;

    /// @notice Aave V3 Pool address (MockAavePool locally, real pool on Sepolia)
    address public immutable aavePool;

    /// @notice aToken address for the configured reserve. Remains zero in mock environments.
    address public aToken;

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
        _resolveAToken();
    }

    /// @notice Deposit tokens into Aave. Tokens must be in this contract before calling.
    /// @dev If Aave.supply() reverts: catch block returns tokens to vault, returns false.
    ///      Vault's invest() will then revert (with tokens safely back in vault).
    function deposit(uint256 amount) external onlyVault nonReentrant returns (bool success) {
        require(IERC20(token).balanceOf(address(this)) >= amount, "AaveStrategy: insufficient balance");
        _resolveAToken();

        // Approve Aave pool to pull tokens from this strategy
        IERC20(token).forceApprove(aavePool, amount);
        _depositedToPool += amount;

        try IAavePool(aavePool).supply(token, amount, address(this), 0) {
            emit Deposited(amount);
            return true;
        } catch {
            // Aave failed — return tokens to vault so nothing is lost
            _depositedToPool -= amount;
            IERC20(token).forceApprove(aavePool, 0); // clear approval
            IERC20(token).safeTransfer(vault, amount);
            return false;
        }
    }

    /// @notice Withdraw tokens from Aave directly to Vault.
    /// @dev Aave sends tokens to `vault` address directly. If Aave fails, returns false.
    function withdraw(uint256 amount) external onlyVault nonReentrant returns (bool success) {
        require(_depositedToPool >= amount, "AaveStrategy: exceeds deposited amount");
        _depositedToPool -= amount;

        try IAavePool(aavePool).withdraw(token, amount, vault) {
            emit Withdrawn(amount);
            return true;
        } catch {
            _depositedToPool += amount;
            return false;
        }
    }

    /// @notice Returns how many tokens are currently deployed in Aave
    function totalAssets() external view returns (uint256) {
        if (aToken != address(0)) {
            return IERC20(aToken).balanceOf(address(this));
        }
        return _depositedToPool;
    }

    /// @notice Returns the ERC20 token address this strategy manages
    function underlyingToken() external view returns (address) {
        return token;
    }

    /// @notice Emergency: withdraw all funds back to Vault regardless of normal flow
    /// @dev Only Vault can call. Use when Aave is compromised or strategy is being replaced.
    function emergencyWithdraw() external onlyVault nonReentrant returns (bool success) {
        if (_depositedToPool == 0) return true;

        uint256 amount = _depositedToPool;
        _depositedToPool = 0;
        try IAavePool(aavePool).withdraw(token, amount, vault) {
            emit EmergencyWithdrawn(amount);
            return true;
        } catch {
            _depositedToPool = amount;
            return false;
        }
    }

    /// @dev Resolves the reserve's aToken address on real Aave pools.
    ///      In mock environments this call is expected to fail and fall back to internal accounting.
    function _resolveAToken() internal {
        if (aToken != address(0)) return;

        try IAavePool(aavePool).getReserveData(token) returns (IAavePool.ReserveData memory reserveData) {
            aToken = reserveData.aTokenAddress;
        } catch {}
    }
}
