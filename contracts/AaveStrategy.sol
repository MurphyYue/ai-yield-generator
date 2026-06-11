// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

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

contract AaveStrategy is IStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable vault;
    address public immutable token;
    address public immutable aavePool;
    address public aToken;
    uint256 private _depositedToPool;

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

    function deposit(uint256 amount) external onlyVault nonReentrant returns (bool success) {
        require(IERC20(token).balanceOf(address(this)) >= amount, "AaveStrategy: insufficient balance");
        _resolveAToken();

        IERC20(token).forceApprove(aavePool, amount);
        _depositedToPool += amount;

        try IAavePool(aavePool).supply(token, amount, address(this), 0) {
            emit Deposited(amount);
            return true;
        } catch {
            _depositedToPool -= amount;
            IERC20(token).forceApprove(aavePool, 0);
            IERC20(token).safeTransfer(vault, amount);
            return false;
        }
    }

    function withdraw(uint256 amount) external onlyVault nonReentrant returns (bool success) {
        require(totalAssets() >= amount, "AaveStrategy: exceeds total assets");

        uint256 principalReduction = amount > _depositedToPool ? _depositedToPool : amount;
        _depositedToPool -= principalReduction;

        try IAavePool(aavePool).withdraw(token, amount, vault) {
            emit Withdrawn(amount);
            return true;
        } catch {
            _depositedToPool += principalReduction;
            return false;
        }
    }

    function totalAssets() public view returns (uint256) {
        if (aToken != address(0)) {
            return IERC20(aToken).balanceOf(address(this));
        }
        return _depositedToPool;
    }

    function underlyingToken() external view returns (address) {
        return token;
    }

    function emergencyWithdraw() external onlyVault nonReentrant returns (bool success) {
        uint256 amount = totalAssets();
        if (amount == 0) return true;

        _depositedToPool = 0;
        try IAavePool(aavePool).withdraw(token, amount, vault) {
            emit EmergencyWithdrawn(amount);
            return true;
        } catch {
            _depositedToPool = amount;
            return false;
        }
    }

    function _resolveAToken() internal {
        if (aToken != address(0)) return;

        try IAavePool(aavePool).getReserveData(token) returns (IAavePool.ReserveData memory reserveData) {
            aToken = reserveData.aTokenAddress;
        } catch {}
    }
}
