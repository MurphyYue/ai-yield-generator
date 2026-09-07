// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStrategy} from "./IStrategy.sol";

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

interface IAaveAToken {
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
    function POOL() external view returns (address);
}

contract AaveStrategy is IStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable vault;
    address public immutable token;
    address public immutable aavePool;
    address public immutable aToken;

    error InvalidVault(address vault);
    error InvalidToken(address token);
    error InvalidPool(address pool);
    error ReserveLookupFailed(address pool, address token);
    error InvalidAToken(address aToken);
    error ATokenUnderlyingMismatch(address expectedUnderlying, address actualUnderlying);
    error ATokenPoolMismatch(address expectedPool, address actualPool);
    error CallerNotVault(address caller);
    error InsufficientAssets(uint256 requestedAssets, uint256 availableAssets);
    error SupplyFailed();
    error SupplyAmountMismatch(uint256 requestedAssets, uint256 actualInvestedAssets);
    error WithdrawFailed();

    modifier onlyVault() {
        if (msg.sender != vault) {
            revert CallerNotVault(msg.sender);
        }
        _;
    }

    constructor(address vault_, address token_, address aavePool_) {
        if (vault_ == address(0) || vault_.code.length == 0) {
            revert InvalidVault(vault_);
        }
        if (token_ == address(0) || token_.code.length == 0) {
            revert InvalidToken(token_);
        }
        if (aavePool_ == address(0) || aavePool_.code.length == 0) {
            revert InvalidPool(aavePool_);
        }

        address resolvedAToken = address(0);
        try IAavePool(aavePool_).getReserveData(token_) returns (IAavePool.ReserveData memory resolvedReserve) {
            resolvedAToken = resolvedReserve.aTokenAddress;
        } catch {
            revert ReserveLookupFailed(aavePool_, token_);
        }

        if (resolvedAToken == address(0) || resolvedAToken.code.length == 0) {
            revert InvalidAToken(resolvedAToken);
        }

        address resolvedUnderlying = address(0);
        try IAaveAToken(resolvedAToken).UNDERLYING_ASSET_ADDRESS() returns (address underlying) {
            resolvedUnderlying = underlying;
        } catch {
            revert InvalidAToken(resolvedAToken);
        }
        if (resolvedUnderlying != token_) {
            revert ATokenUnderlyingMismatch(token_, resolvedUnderlying);
        }

        address resolvedPool = address(0);
        try IAaveAToken(resolvedAToken).POOL() returns (address pool) {
            resolvedPool = pool;
        } catch {
            revert InvalidAToken(resolvedAToken);
        }
        if (resolvedPool != aavePool_) {
            revert ATokenPoolMismatch(aavePool_, resolvedPool);
        }

        vault = vault_;
        token = token_;
        aavePool = aavePool_;
        aToken = resolvedAToken;
    }

    function underlyingToken() external view returns (address) {
        return token;
    }

    function totalAssets() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this)) + IERC20(aToken).balanceOf(address(this));
    }

    function deposit(uint256 requestedAssets) external onlyVault nonReentrant returns (uint256 actualInvestedAssets) {
        uint256 idleBefore = IERC20(token).balanceOf(address(this));
        if (idleBefore < requestedAssets) {
            revert InsufficientAssets(requestedAssets, idleBefore);
        }

        IERC20(token).forceApprove(aavePool, requestedAssets);
        try IAavePool(aavePool).supply(token, requestedAssets, address(this), 0) {}
        catch {
            revert SupplyFailed();
        }
        IERC20(token).forceApprove(aavePool, 0);

        uint256 idleAfter = IERC20(token).balanceOf(address(this));
        actualInvestedAssets = idleAfter > idleBefore ? 0 : idleBefore - idleAfter;
        if (actualInvestedAssets != requestedAssets) {
            revert SupplyAmountMismatch(requestedAssets, actualInvestedAssets);
        }

        emit Deposited(requestedAssets, actualInvestedAssets);
    }

    function withdraw(uint256 requestedAssets) external onlyVault nonReentrant returns (uint256 actualReturnedAssets) {
        uint256 availableAssets = totalAssets();
        if (requestedAssets > availableAssets) {
            revert InsufficientAssets(requestedAssets, availableAssets);
        }

        uint256 vaultBalanceBefore = IERC20(token).balanceOf(vault);
        uint256 idleAssets = IERC20(token).balanceOf(address(this));
        uint256 idleToReturn = idleAssets < requestedAssets ? idleAssets : requestedAssets;
        if (idleToReturn > 0) {
            IERC20(token).safeTransfer(vault, idleToReturn);
        }

        uint256 protocolShortfall = requestedAssets - idleToReturn;
        if (protocolShortfall > 0) {
            try IAavePool(aavePool).withdraw(token, protocolShortfall, vault) returns (uint256) {}
            catch {
                revert WithdrawFailed();
            }
        }

        actualReturnedAssets = IERC20(token).balanceOf(vault) - vaultBalanceBefore;
        emit Withdrawn(requestedAssets, actualReturnedAssets);
    }

    function emergencyWithdraw()
        external
        onlyVault
        nonReentrant
        returns (uint256 actualReturnedAssets, bool protocolCallSucceeded)
    {
        uint256 vaultBalanceBefore = IERC20(token).balanceOf(vault);
        uint256 idleAssets = IERC20(token).balanceOf(address(this));
        if (idleAssets > 0) {
            IERC20(token).safeTransfer(vault, idleAssets);
        }

        protocolCallSucceeded = true;
        try IERC20(aToken).balanceOf(address(this)) returns (uint256 protocolAssets) {
            if (protocolAssets > 0) {
                try IAavePool(aavePool).withdraw(token, type(uint256).max, vault) returns (uint256) {}
                catch {
                    protocolCallSucceeded = false;
                }
            }
        } catch {
            protocolCallSucceeded = false;
        }

        actualReturnedAssets = IERC20(token).balanceOf(vault) - vaultBalanceBefore;
        emit EmergencyWithdrawn(actualReturnedAssets, protocolCallSucceeded);
    }
}
