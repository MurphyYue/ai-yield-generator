// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MockAToken} from "./MockAToken.sol";

/// @title Mock Aave V3 Pool
/// @notice A local one-to-one Aave pool model with configurable failure and liquidity behavior.
/// @dev This contract is test-only. Underlying assets remain in the pool as aToken backing.
contract MockAavePool {
    using SafeERC20 for IERC20;

    /// @dev Matches the return layout of Aave V3 Pool.getReserveData(address).
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

    mapping(address asset => ReserveData data) private _reserves;

    bool public lookupShouldRevert;
    bool public supplyShouldRevert;
    bool public withdrawShouldRevert;

    uint256 public maxSupplyAmount = type(uint256).max;
    uint256 public maxWithdrawAmount = type(uint256).max;
    bool public withdrawReturnOverrideEnabled;
    uint256 public withdrawReturnOverride;

    uint256 public supplyCallCount;
    uint256 public withdrawCallCount;

    address public lastSupplyAsset;
    uint256 public lastSupplyAmount;
    uint256 public lastSupplyActual;
    address public lastSupplyOnBehalfOf;

    address public lastWithdrawAsset;
    uint256 public lastWithdrawRequested;
    uint256 public lastWithdrawActual;
    address public lastWithdrawTo;

    /// @notice Assigns the receipt token returned for an underlying reserve.
    /// @dev Passing zero clears the reserve. Deliberately invalid addresses are allowed for validation tests.
    function configureReserve(address asset, address aToken) external {
        require(asset != address(0), "MockAave: invalid asset");
        _reserves[asset].aTokenAddress = aToken;
    }

    /// @notice Returns reserve data with the same ABI layout as Aave V3.
    function getReserveData(address asset) external view returns (ReserveData memory) {
        require(!lookupShouldRevert, "MockAave: lookup failure");
        return _reserves[asset];
    }

    /// @notice Transfers underlying backing into the pool and mints receipt tokens one-to-one.
    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        require(!supplyShouldRevert, "MockAave: supply failure");
        MockAToken receiptToken = _receiptToken(asset);

        uint256 actualAmount = _min(amount, maxSupplyAmount);

        supplyCallCount += 1;
        lastSupplyAsset = asset;
        lastSupplyAmount = amount;
        lastSupplyActual = actualAmount;
        lastSupplyOnBehalfOf = onBehalfOf;

        IERC20(asset).safeTransferFrom(msg.sender, address(this), actualAmount);
        receiptToken.mint(onBehalfOf, actualAmount);
    }

    /// @notice Burns caller receipt tokens and sends as much underlying as configured liquidity allows.
    /// @param amount Requested underlying amount, or max uint to request the caller's full receipt balance.
    /// @return reportedAmount The actual transfer by default, or the configured test override.
    function withdraw(address asset, uint256 amount, address to) external returns (uint256 reportedAmount) {
        require(!withdrawShouldRevert, "MockAave: withdraw failure");
        MockAToken receiptToken = _receiptToken(asset);

        uint256 receiptBalance = receiptToken.balanceOf(msg.sender);
        uint256 requestedAmount = amount == type(uint256).max ? receiptBalance : amount;
        require(requestedAmount <= receiptBalance, "MockAave: insufficient aToken balance");

        uint256 actualAmount = _min(requestedAmount, maxWithdrawAmount);
        actualAmount = _min(actualAmount, IERC20(asset).balanceOf(address(this)));

        withdrawCallCount += 1;
        lastWithdrawAsset = asset;
        lastWithdrawRequested = amount;
        lastWithdrawActual = actualAmount;
        lastWithdrawTo = to;

        receiptToken.burn(msg.sender, actualAmount);
        IERC20(asset).safeTransfer(to, actualAmount);

        if (withdrawReturnOverrideEnabled) return withdrawReturnOverride;
        return actualAmount;
    }

    /// @notice Independently enables reserve lookup failures.
    function setLookupRevert(bool shouldRevert) external {
        lookupShouldRevert = shouldRevert;
    }

    /// @notice Independently enables supply failures.
    function setSupplyRevert(bool shouldRevert) external {
        supplyShouldRevert = shouldRevert;
    }

    /// @notice Independently enables withdrawal failures.
    function setWithdrawRevert(bool shouldRevert) external {
        withdrawShouldRevert = shouldRevert;
    }

    /// @notice Sets all three failure controls for backward-compatible tests.
    function setRevert(bool shouldRevert) external {
        lookupShouldRevert = shouldRevert;
        supplyShouldRevert = shouldRevert;
        withdrawShouldRevert = shouldRevert;
    }

    /// @notice Caps how much a supply call actually consumes and mints.
    function setMaxSupplyAmount(uint256 amount) external {
        maxSupplyAmount = amount;
    }

    /// @notice Caps the amount actually burned and transferred by each withdrawal.
    function setMaxWithdrawAmount(uint256 amount) external {
        maxWithdrawAmount = amount;
    }

    /// @notice Overrides only the reported withdrawal return value, not the actual token movement.
    function setWithdrawReturnOverride(bool enabled, uint256 reportedAmount) external {
        withdrawReturnOverrideEnabled = enabled;
        withdrawReturnOverride = reportedAmount;
    }

    /// @notice Adds fully backed yield to an account by pulling underlying before minting receipts.
    function addBackedYield(address asset, address account, uint256 amount) external {
        MockAToken receiptToken = _receiptToken(asset);
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        receiptToken.mint(account, amount);
    }

    /// @notice Models receipt-token loss by burning an account's aTokens without reducing backing.
    /// @dev Leaving surplus backing keeps later mock withdrawals solvent.
    function applyATokenLoss(address asset, address account, uint256 amount) external {
        _receiptToken(asset).burn(account, amount);
    }

    /// @notice Returns an account's current receipt-token balance for an asset.
    function getBalance(address account, address asset) external view returns (uint256) {
        address aToken = _reserves[asset].aTokenAddress;
        return aToken == address(0) ? 0 : IERC20(aToken).balanceOf(account);
    }

    function _receiptToken(address asset) private view returns (MockAToken receiptToken) {
        address aToken = _reserves[asset].aTokenAddress;
        require(aToken != address(0), "MockAave: reserve not configured");
        return MockAToken(aToken);
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}
