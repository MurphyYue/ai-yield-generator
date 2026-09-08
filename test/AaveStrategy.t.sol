// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AaveStrategy} from "../contracts/AaveStrategy.sol";
import {IStrategy} from "../contracts/IStrategy.sol";
import {MockERC20} from "../contracts/MockERC20.sol";
import {MockAToken} from "../contracts/mocks/MockAToken.sol";
import {MockAavePool} from "../contracts/mocks/MockAavePool.sol";
import {VaultV4} from "../contracts/VaultV4.sol";

/// @dev Deliberately reports values that disagree with real token movements.
///      This proves that VaultV4 measures its own asset balance deltas.
contract MisreportingStrategy is IStrategy {
    using SafeERC20 for IERC20;

    address public immutable vault;
    address public immutable underlyingToken;

    uint256 public depositReport;
    uint256 public depositRefund;
    uint256 public withdrawReport;
    uint256 public withdrawTransfer;
    uint256 public emergencyReport;
    bool public totalAssetsShouldRevert;

    constructor(address vault_, address underlyingToken_) {
        vault = vault_;
        underlyingToken = underlyingToken_;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "not vault");
        _;
    }

    function setDepositBehavior(uint256 refundAmount, uint256 reportAmount) external {
        depositRefund = refundAmount;
        depositReport = reportAmount;
    }

    function setWithdrawBehavior(uint256 transferAmount, uint256 reportAmount) external {
        withdrawTransfer = transferAmount;
        withdrawReport = reportAmount;
    }

    function setEmergencyReport(uint256 value) external {
        emergencyReport = value;
    }

    function setTotalAssetsRevert(bool shouldRevert) external {
        totalAssetsShouldRevert = shouldRevert;
    }

    function deposit(uint256) external onlyVault returns (uint256 actualInvestedAssets) {
        uint256 refund = depositRefund;
        uint256 balance = IERC20(underlyingToken).balanceOf(address(this));
        if (refund > balance) refund = balance;
        if (refund > 0) IERC20(underlyingToken).safeTransfer(vault, refund);
        return depositReport;
    }

    function withdraw(uint256) external onlyVault returns (uint256 actualReturnedAssets) {
        uint256 amount = withdrawTransfer;
        uint256 balance = IERC20(underlyingToken).balanceOf(address(this));
        if (amount > balance) amount = balance;
        if (amount > 0) IERC20(underlyingToken).safeTransfer(vault, amount);
        return withdrawReport;
    }

    function emergencyWithdraw() external onlyVault returns (uint256 actualReturnedAssets, bool protocolCallSucceeded) {
        uint256 balance = IERC20(underlyingToken).balanceOf(address(this));
        if (balance > 0) IERC20(underlyingToken).safeTransfer(vault, balance);
        return (emergencyReport, false);
    }

    function totalAssets() external view returns (uint256) {
        if (totalAssetsShouldRevert) revert("totalAssets failed");
        return IERC20(underlyingToken).balanceOf(address(this));
    }
}

/// @dev Attempts to call back into VaultV4 while an invest or divest is in progress.
contract ReentrantStrategy is IStrategy {
    using SafeERC20 for IERC20;

    enum Callback {
        None,
        Deposit,
        Withdraw
    }

    address public immutable vault;
    address public immutable underlyingToken;
    Callback public callback;

    constructor(address vault_, address underlyingToken_) {
        vault = vault_;
        underlyingToken = underlyingToken_;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "not vault");
        _;
    }

    function setCallback(Callback callback_) external {
        callback = callback_;
    }

    function deposit(uint256 requestedAssets) external onlyVault returns (uint256 actualInvestedAssets) {
        if (callback == Callback.Deposit) {
            VaultV4(vault).invest(1);
        }
        emit Deposited(requestedAssets, requestedAssets);
        return requestedAssets;
    }

    function withdraw(uint256 requestedAssets) external onlyVault returns (uint256 actualReturnedAssets) {
        if (callback == Callback.Withdraw) {
            VaultV4(vault).divest(1, 0);
        }
        IERC20(underlyingToken).safeTransfer(vault, requestedAssets);
        emit Withdrawn(requestedAssets, requestedAssets);
        return requestedAssets;
    }

    function emergencyWithdraw() external onlyVault returns (uint256 actualReturnedAssets, bool protocolCallSucceeded) {
        actualReturnedAssets = IERC20(underlyingToken).balanceOf(address(this));
        if (actualReturnedAssets > 0) {
            IERC20(underlyingToken).safeTransfer(vault, actualReturnedAssets);
        }
        emit EmergencyWithdrawn(actualReturnedAssets, true);
        return (actualReturnedAssets, true);
    }

    function totalAssets() external view returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
    }
}

/// @title Lean V4 Aave strategy lifecycle tests
/// @notice Exercises the VaultV4 <-> AaveStrategy <-> Aave V3 boundary.
contract AaveStrategyTest is Test {
    event StrategySet(address indexed previousStrategy, address indexed newStrategy);
    event Invested(address indexed strategy, uint256 requestedAssets, uint256 actualInvestedAssets);
    event Divested(address indexed strategy, uint256 requestedAssets, uint256 actualReturnedAssets);
    event EmergencyDivested(address indexed strategy, uint256 actualReturnedAssets, bool protocolCallSucceeded);

    event Deposited(uint256 requestedAssets, uint256 actualInvestedAssets);
    event Withdrawn(uint256 requestedAssets, uint256 actualReturnedAssets);
    event EmergencyWithdrawn(uint256 actualReturnedAssets, bool protocolCallSucceeded);

    uint256 internal constant UNIT = 1e6;
    uint256 internal constant INITIAL_SUPPLY = 2_000_000 * UNIT;
    uint256 internal constant USER_BALANCE = 500_000 * UNIT;
    uint256 internal constant DEPOSIT_AMOUNT = 1_000 * UNIT;
    uint256 internal constant INVEST_AMOUNT = 600 * UNIT;

    MockERC20 internal usdc;
    MockERC20 internal otherAsset;
    VaultV4 internal vault;
    MockAavePool internal pool;
    MockAToken internal aToken;
    AaveStrategy internal strategy;

    address internal operator;
    address internal hacker;
    address internal user;

    function setUp() public {
        operator = makeAddr("operator");
        hacker = makeAddr("hacker");
        user = makeAddr("user");

        usdc = new MockERC20(INITIAL_SUPPLY);
        otherAsset = new MockERC20(INITIAL_SUPPLY);
        vault = new VaultV4(address(usdc));
        pool = new MockAavePool();
        aToken = new MockAToken(address(usdc), address(pool));
        pool.configureReserve(address(usdc), address(aToken));
        strategy = new AaveStrategy(address(vault), address(usdc), address(pool));

        vault.grantOperatorRole(operator);
        vault.setDepositCap(type(uint256).max);
        vault.setStrategy(address(strategy));

        assertTrue(usdc.transfer(user, USER_BALANCE));
        vm.prank(user);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _deposit(uint256 amount) internal {
        vm.prank(user);
        vault.deposit(amount, user);
    }

    function _invest(uint256 amount) internal {
        vm.prank(operator);
        vault.invest(amount);
    }

    function _divest(uint256 amount, uint256 minAmountOut) internal {
        vm.prank(operator);
        vault.divest(amount, minAmountOut);
    }

    function _depositAndInvest(uint256 depositAmount, uint256 investAmount) internal {
        _deposit(depositAmount);
        _invest(investAmount);
    }

    function _newReplacement() internal returns (AaveStrategy) {
        return new AaveStrategy(address(vault), address(usdc), address(pool));
    }

    // ---------------------------------------------------------------------
    // Construction and binding
    // ---------------------------------------------------------------------

    function testConstructorStoresValidatedConfiguration() public view {
        assertEq(strategy.vault(), address(vault));
        assertEq(strategy.underlyingToken(), address(usdc));
        assertEq(strategy.aavePool(), address(pool));
        assertEq(strategy.aToken(), address(aToken));
    }

    function testConstructorRejectsInvalidVault() public {
        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.InvalidVault.selector, address(0)));
        new AaveStrategy(address(0), address(usdc), address(pool));

        address noCode = makeAddr("vault without code");
        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.InvalidVault.selector, noCode));
        new AaveStrategy(noCode, address(usdc), address(pool));
    }

    function testConstructorRejectsInvalidToken() public {
        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.InvalidToken.selector, address(0)));
        new AaveStrategy(address(vault), address(0), address(pool));

        address noCode = makeAddr("token without code");
        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.InvalidToken.selector, noCode));
        new AaveStrategy(address(vault), noCode, address(pool));
    }

    function testConstructorRejectsInvalidPool() public {
        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.InvalidPool.selector, address(0)));
        new AaveStrategy(address(vault), address(usdc), address(0));

        address noCode = makeAddr("pool without code");
        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.InvalidPool.selector, noCode));
        new AaveStrategy(address(vault), address(usdc), noCode);
    }

    function testConstructorFailsClosedWhenReserveLookupReverts() public {
        MockAavePool revertingPool = new MockAavePool();
        revertingPool.setLookupRevert(true);

        vm.expectRevert(
            abi.encodeWithSelector(AaveStrategy.ReserveLookupFailed.selector, address(revertingPool), address(usdc))
        );
        new AaveStrategy(address(vault), address(usdc), address(revertingPool));
    }

    function testConstructorRejectsZeroOrNonContractAToken() public {
        MockAavePool unconfiguredPool = new MockAavePool();
        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.InvalidAToken.selector, address(0)));
        new AaveStrategy(address(vault), address(usdc), address(unconfiguredPool));

        address noCode = makeAddr("aToken without code");
        unconfiguredPool.configureReserve(address(usdc), noCode);
        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.InvalidAToken.selector, noCode));
        new AaveStrategy(address(vault), address(usdc), address(unconfiguredPool));
    }

    function testConstructorRejectsATokenUnderlyingMismatch() public {
        MockAavePool localPool = new MockAavePool();
        MockAToken wrongAToken = new MockAToken(address(otherAsset), address(localPool));
        localPool.configureReserve(address(usdc), address(wrongAToken));

        vm.expectRevert(
            abi.encodeWithSelector(AaveStrategy.ATokenUnderlyingMismatch.selector, address(usdc), address(otherAsset))
        );
        new AaveStrategy(address(vault), address(usdc), address(localPool));
    }

    function testConstructorRejectsATokenPoolMismatch() public {
        MockAavePool localPool = new MockAavePool();
        MockAavePool wrongPool = new MockAavePool();
        MockAToken wrongAToken = new MockAToken(address(usdc), address(wrongPool));
        localPool.configureReserve(address(usdc), address(wrongAToken));

        vm.expectRevert(
            abi.encodeWithSelector(AaveStrategy.ATokenPoolMismatch.selector, address(localPool), address(wrongPool))
        );
        new AaveStrategy(address(vault), address(usdc), address(localPool));
    }

    function testSetStrategyRejectsZeroAndNonContractAddresses() public {
        vm.expectRevert(abi.encodeWithSelector(VaultV4.InvalidStrategy.selector, address(0)));
        vault.setStrategy(address(0));

        address noCode = makeAddr("strategy without code");
        vm.expectRevert(abi.encodeWithSelector(VaultV4.InvalidStrategy.selector, noCode));
        vault.setStrategy(noCode);
    }

    function testSetStrategyRejectsWrongAssetBinding() public {
        MockAToken otherAToken = new MockAToken(address(otherAsset), address(pool));
        pool.configureReserve(address(otherAsset), address(otherAToken));
        AaveStrategy wrongAssetStrategy = new AaveStrategy(address(vault), address(otherAsset), address(pool));

        vm.expectRevert(
            abi.encodeWithSelector(VaultV4.StrategyAssetMismatch.selector, address(usdc), address(otherAsset))
        );
        vault.setStrategy(address(wrongAssetStrategy));
    }

    function testSetStrategyRejectsWrongVaultBinding() public {
        VaultV4 otherVault = new VaultV4(address(usdc));
        AaveStrategy wrongVaultStrategy = new AaveStrategy(address(otherVault), address(usdc), address(pool));

        vm.expectRevert(
            abi.encodeWithSelector(VaultV4.StrategyVaultMismatch.selector, address(vault), address(otherVault))
        );
        vault.setStrategy(address(wrongVaultStrategy));
    }

    // ---------------------------------------------------------------------
    // Access control
    // ---------------------------------------------------------------------

    function testOnlyVaultCanCallStrategyFunctions() public {
        vm.startPrank(hacker);

        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.CallerNotVault.selector, hacker));
        strategy.deposit(1);

        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.CallerNotVault.selector, hacker));
        strategy.withdraw(1);

        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.CallerNotVault.selector, hacker));
        strategy.emergencyWithdraw();

        vm.stopPrank();
    }

    function testOnlyOperatorCanInvestAndDivest() public {
        _deposit(DEPOSIT_AMOUNT);
        bytes32 operatorRole = vault.OPERATOR_ROLE();

        vm.startPrank(hacker);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, hacker, operatorRole)
        );
        vault.invest(1);

        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, hacker, operatorRole)
        );
        vault.divest(1, 0);
        vm.stopPrank();
    }

    function testOnlyAdminCanSetStrategyAndEmergencyDivest() public {
        bytes32 adminRole = vault.DEFAULT_ADMIN_ROLE();

        vm.startPrank(hacker);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, hacker, adminRole)
        );
        vault.setStrategy(address(strategy));

        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, hacker, adminRole)
        );
        vault.emergencyDivest();
        vm.stopPrank();
    }

    // ---------------------------------------------------------------------
    // Accounting and normal lifecycle
    // ---------------------------------------------------------------------

    function testTotalAssetsIncludesIdleUnderlyingAndATokenBalance() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 idleDonation = 17 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));

        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT);
        assertEq(usdc.balanceOf(address(strategy)), idleDonation);
        assertEq(strategy.totalAssets(), INVEST_AMOUNT + idleDonation);
        assertEq(vault.totalAssets(), DEPOSIT_AMOUNT + idleDonation);
    }

    function testInvestSuppliesOnlyRequestedAssetsAndPreservesPriorIdleDonation() public {
        _deposit(DEPOSIT_AMOUNT);
        uint256 idleDonation = 11 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));

        vm.expectEmit(false, false, false, true, address(strategy));
        emit Deposited(INVEST_AMOUNT, INVEST_AMOUNT);
        vm.expectEmit(true, false, false, true, address(vault));
        emit Invested(address(strategy), INVEST_AMOUNT, INVEST_AMOUNT);
        _invest(INVEST_AMOUNT);

        assertEq(usdc.balanceOf(address(strategy)), idleDonation);
        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT);
        assertEq(usdc.balanceOf(address(pool)), INVEST_AMOUNT);
        assertEq(strategy.totalAssets(), INVEST_AMOUNT + idleDonation);
        assertEq(vault.getIdleAssets(), DEPOSIT_AMOUNT - INVEST_AMOUNT);
        assertEq(usdc.allowance(address(strategy), address(pool)), 0);
    }

    function testSupplyFailureRevertsWithoutLosingVaultAssets() public {
        _deposit(DEPOSIT_AMOUNT);
        pool.setSupplyRevert(true);
        uint256 idleBefore = vault.getIdleAssets();

        vm.prank(operator);
        vm.expectRevert(AaveStrategy.SupplyFailed.selector);
        vault.invest(INVEST_AMOUNT);

        assertEq(vault.getIdleAssets(), idleBefore);
        assertEq(strategy.totalAssets(), 0);
        assertEq(aToken.balanceOf(address(strategy)), 0);
        assertEq(usdc.allowance(address(strategy), address(pool)), 0);
    }

    function testPartialSupplyRevertsAndRollsBackVaultAssets() public {
        _deposit(DEPOSIT_AMOUNT);
        uint256 partialSupply = INVEST_AMOUNT - 1;
        pool.setMaxSupplyAmount(partialSupply);
        uint256 idleBefore = vault.getIdleAssets();

        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(AaveStrategy.SupplyAmountMismatch.selector, INVEST_AMOUNT, partialSupply)
        );
        vault.invest(INVEST_AMOUNT);

        assertEq(vault.getIdleAssets(), idleBefore);
        assertEq(strategy.totalAssets(), 0);
        assertEq(aToken.balanceOf(address(strategy)), 0);
        assertEq(usdc.balanceOf(address(pool)), 0);
        assertEq(usdc.allowance(address(strategy), address(pool)), 0);
    }

    function testStrategyDepositRejectsAmountAboveItsIdleBalance() public {
        vm.prank(address(vault));
        vm.expectRevert(abi.encodeWithSelector(AaveStrategy.InsufficientAssets.selector, 1, 0));
        strategy.deposit(1);
    }

    function testBackedYieldRaisesStrategyAssetsAndShareValue() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 userShares = vault.balanceOf(user);
        uint256 claimBefore = vault.previewRedeem(userShares);
        uint256 yieldAmount = 60 * UNIT;

        usdc.approve(address(pool), yieldAmount);
        pool.addBackedYield(address(usdc), address(strategy), yieldAmount);

        assertEq(strategy.totalAssets(), INVEST_AMOUNT + yieldAmount);
        assertEq(vault.totalAssets(), DEPOSIT_AMOUNT + yieldAmount);
        assertGt(vault.previewRedeem(userShares), claimBefore);
    }

    function testATokenLossLowersStrategyAssetsAndShareValue() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 userShares = vault.balanceOf(user);
        uint256 claimBefore = vault.previewRedeem(userShares);
        uint256 loss = 90 * UNIT;

        pool.applyATokenLoss(address(usdc), address(strategy), loss);

        assertEq(strategy.totalAssets(), INVEST_AMOUNT - loss);
        assertEq(vault.totalAssets(), DEPOSIT_AMOUNT - loss);
        assertLt(vault.previewRedeem(userShares), claimBefore);
    }

    function testATokenLossIsAllocatedProportionallyAcrossTwoUnequalHolders() public {
        address secondUser = makeAddr("second user");
        assertTrue(usdc.transfer(secondUser, USER_BALANCE));
        vm.prank(secondUser);
        usdc.approve(address(vault), type(uint256).max);

        uint256 firstDeposit = 1_000 * UNIT;
        uint256 secondDeposit = 2_000 * UNIT;
        uint256 loss = 300 * UNIT;

        _deposit(firstDeposit);
        vm.prank(secondUser);
        vault.deposit(secondDeposit, secondUser);
        _invest(firstDeposit + secondDeposit);

        uint256 firstShares = vault.balanceOf(user);
        uint256 secondShares = vault.balanceOf(secondUser);
        uint256 supplyBefore = vault.totalSupply();
        uint256 firstClaimBefore = vault.previewRedeem(firstShares);
        uint256 secondClaimBefore = vault.previewRedeem(secondShares);

        assertEq(secondShares, 2 * firstShares);
        assertEq(firstClaimBefore, firstDeposit);
        assertEq(secondClaimBefore, secondDeposit);

        pool.applyATokenLoss(address(usdc), address(strategy), loss);

        uint256 firstClaimAfter = vault.previewRedeem(firstShares);
        uint256 secondClaimAfter = vault.previewRedeem(secondShares);
        uint256 firstLoss = firstClaimBefore - firstClaimAfter;
        uint256 secondLoss = secondClaimBefore - secondClaimAfter;

        assertEq(strategy.totalAssets(), 2_700 * UNIT);
        assertEq(vault.totalAssets(), 2_700 * UNIT);
        assertEq(firstClaimAfter, 900 * UNIT);
        assertEq(secondClaimAfter, 1_800 * UNIT);
        assertEq(firstLoss, 100 * UNIT);
        assertEq(secondLoss, 200 * UNIT);
        assertEq(secondLoss, 2 * firstLoss);
        assertEq(vault.balanceOf(user), firstShares);
        assertEq(vault.balanceOf(secondUser), secondShares);
        assertEq(vault.totalSupply(), supplyBefore);
    }

    function testDivestReturnsExactRequestedAmount() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 vaultBalanceBefore = vault.getIdleAssets();

        vm.expectEmit(false, false, false, true, address(strategy));
        emit Withdrawn(200 * UNIT, 200 * UNIT);
        vm.expectEmit(true, false, false, true, address(vault));
        emit Divested(address(strategy), 200 * UNIT, 200 * UNIT);
        _divest(200 * UNIT, 200 * UNIT);

        assertEq(vault.getIdleAssets(), vaultBalanceBefore + 200 * UNIT);
        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT - 200 * UNIT);
        assertEq(strategy.totalAssets(), INVEST_AMOUNT - 200 * UNIT);
    }

    function testWithdrawUsesIdleUnderlyingBeforeAaveLiquidity() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 idleDonation = 25 * UNIT;
        uint256 requested = 70 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));

        _divest(requested, requested);

        assertEq(usdc.balanceOf(address(strategy)), 0);
        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT - (requested - idleDonation));
        assertEq(strategy.totalAssets(), INVEST_AMOUNT - (requested - idleDonation));
        assertEq(pool.lastWithdrawRequested(), requested - idleDonation);
    }

    function testWithdrawDoesNotCallAaveWhenStrategyIdleCoversRequest() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 idleDonation = 75 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));
        pool.setWithdrawRevert(true);

        _divest(50 * UNIT, 50 * UNIT);

        assertEq(usdc.balanceOf(address(strategy)), idleDonation - 50 * UNIT);
        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT);
        assertEq(pool.withdrawCallCount(), 0);
    }

    function testPartialAaveWithdrawalSucceedsWhenMinOutAcceptsActualDelta() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        pool.setMaxWithdrawAmount(40 * UNIT);

        vm.expectEmit(false, false, false, true, address(strategy));
        emit Withdrawn(100 * UNIT, 40 * UNIT);
        vm.expectEmit(true, false, false, true, address(vault));
        emit Divested(address(strategy), 100 * UNIT, 40 * UNIT);
        _divest(100 * UNIT, 40 * UNIT);

        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT - 40 * UNIT);
        assertEq(vault.getIdleAssets(), DEPOSIT_AMOUNT - INVEST_AMOUNT + 40 * UNIT);
    }

    function testMinOutRevertsAndRollsBackPartialAaveWithdrawal() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        pool.setMaxWithdrawAmount(40 * UNIT);
        uint256 vaultBalanceBefore = vault.getIdleAssets();

        vm.prank(operator);
        vm.expectRevert("Slippage: received less than minAmountOut");
        vault.divest(100 * UNIT, 41 * UNIT);

        assertEq(vault.getIdleAssets(), vaultBalanceBefore);
        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT);
        assertEq(strategy.totalAssets(), INVEST_AMOUNT);
    }

    function testAaveReturnValueCannotOverstateActualWithdrawal() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        pool.setMaxWithdrawAmount(30 * UNIT);
        pool.setWithdrawReturnOverride(true, type(uint256).max);

        _divest(100 * UNIT, 30 * UNIT);

        assertEq(vault.getIdleAssets(), DEPOSIT_AMOUNT - INVEST_AMOUNT + 30 * UNIT);
        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT - 30 * UNIT);
    }

    function testAaveReturnValueCannotUnderstateActualWithdrawal() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        pool.setWithdrawReturnOverride(true, 1);

        _divest(100 * UNIT, 100 * UNIT);

        assertEq(vault.getIdleAssets(), DEPOSIT_AMOUNT - INVEST_AMOUNT + 100 * UNIT);
        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT - 100 * UNIT);
    }

    function testVaultDivestRejectsRequestAboveReportedStrategyAssets() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);

        vm.prank(operator);
        vm.expectRevert("Insufficient strategy balance");
        vault.divest(INVEST_AMOUNT + 1, 0);
    }

    function testStrategyWithdrawRejectsRequestAboveReportedStrategyAssets() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);

        vm.prank(address(vault));
        vm.expectRevert(
            abi.encodeWithSelector(AaveStrategy.InsufficientAssets.selector, INVEST_AMOUNT + 1, INVEST_AMOUNT)
        );
        strategy.withdraw(INVEST_AMOUNT + 1);
    }

    function testWithdrawFailureRevertsAtomically() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 idleDonation = 25 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));
        pool.setWithdrawRevert(true);

        vm.prank(operator);
        vm.expectRevert(AaveStrategy.WithdrawFailed.selector);
        vault.divest(100 * UNIT, 0);

        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT);
        assertEq(usdc.balanceOf(address(strategy)), idleDonation);
        assertEq(vault.getIdleAssets(), DEPOSIT_AMOUNT - INVEST_AMOUNT);
    }

    // ---------------------------------------------------------------------
    // Vault balance-delta authority
    // ---------------------------------------------------------------------

    function testVaultRejectsStrategyDepositReportMismatch() public {
        VaultV4 localVault = new VaultV4(address(usdc));
        MisreportingStrategy liar = new MisreportingStrategy(address(localVault), address(usdc));
        localVault.setStrategy(address(liar));
        localVault.setDepositCap(type(uint256).max);
        liar.setDepositBehavior(0, 99 * UNIT);
        assertTrue(usdc.transfer(address(localVault), 100 * UNIT));

        vm.expectRevert(
            abi.encodeWithSelector(VaultV4.StrategyDepositMismatch.selector, 100 * UNIT, 99 * UNIT, 100 * UNIT)
        );
        localVault.invest(100 * UNIT);

        assertEq(usdc.balanceOf(address(localVault)), 100 * UNIT);
        assertEq(usdc.balanceOf(address(liar)), 0);
    }

    function testVaultRejectsStrategyThatReportsInvestmentButRefundsAssets() public {
        VaultV4 localVault = new VaultV4(address(usdc));
        MisreportingStrategy liar = new MisreportingStrategy(address(localVault), address(usdc));
        localVault.setStrategy(address(liar));
        liar.setDepositBehavior(100 * UNIT, 100 * UNIT);
        assertTrue(usdc.transfer(address(localVault), 100 * UNIT));

        vm.expectRevert(abi.encodeWithSelector(VaultV4.StrategyDepositMismatch.selector, 100 * UNIT, 100 * UNIT, 0));
        localVault.invest(100 * UNIT);

        assertEq(usdc.balanceOf(address(localVault)), 100 * UNIT);
        assertEq(usdc.balanceOf(address(liar)), 0);
    }

    function testVaultInvestRejectsReentrantStrategyCallback() public {
        VaultV4 localVault = new VaultV4(address(usdc));
        ReentrantStrategy attacker = new ReentrantStrategy(address(localVault), address(usdc));
        localVault.setStrategy(address(attacker));
        localVault.grantOperatorRole(address(attacker));
        assertTrue(usdc.transfer(address(localVault), 100 * UNIT));
        attacker.setCallback(ReentrantStrategy.Callback.Deposit);

        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        localVault.invest(100 * UNIT);

        assertEq(usdc.balanceOf(address(localVault)), 100 * UNIT);
        assertEq(usdc.balanceOf(address(attacker)), 0);
    }

    function testVaultDivestUsesBalanceDeltaInsteadOfStrategyReport() public {
        VaultV4 localVault = new VaultV4(address(usdc));
        MisreportingStrategy liar = new MisreportingStrategy(address(localVault), address(usdc));
        localVault.setStrategy(address(liar));
        localVault.setDepositCap(type(uint256).max);
        liar.setDepositBehavior(0, 100 * UNIT);
        liar.setWithdrawBehavior(25 * UNIT, type(uint256).max);
        assertTrue(usdc.transfer(address(localVault), 100 * UNIT));
        localVault.invest(100 * UNIT);

        vm.expectEmit(true, false, false, true, address(localVault));
        emit Divested(address(liar), 80 * UNIT, 25 * UNIT);
        localVault.divest(80 * UNIT, 25 * UNIT);

        assertEq(usdc.balanceOf(address(localVault)), 25 * UNIT);
        assertEq(usdc.balanceOf(address(liar)), 75 * UNIT);
    }

    function testVaultDivestRejectsReentrantStrategyCallback() public {
        VaultV4 localVault = new VaultV4(address(usdc));
        ReentrantStrategy attacker = new ReentrantStrategy(address(localVault), address(usdc));
        localVault.setStrategy(address(attacker));
        localVault.grantOperatorRole(address(attacker));
        assertTrue(usdc.transfer(address(localVault), 100 * UNIT));
        localVault.invest(100 * UNIT);
        attacker.setCallback(ReentrantStrategy.Callback.Withdraw);

        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        localVault.divest(100 * UNIT, 0);

        assertEq(usdc.balanceOf(address(localVault)), 0);
        assertEq(usdc.balanceOf(address(attacker)), 100 * UNIT);
    }

    function testVaultEmergencyUsesBalanceDeltaInsteadOfStrategyReport() public {
        VaultV4 localVault = new VaultV4(address(usdc));
        MisreportingStrategy liar = new MisreportingStrategy(address(localVault), address(usdc));
        localVault.setStrategy(address(liar));
        liar.setEmergencyReport(0);
        assertTrue(usdc.transfer(address(liar), 45 * UNIT));

        vm.expectEmit(true, false, false, true, address(localVault));
        emit EmergencyDivested(address(liar), 45 * UNIT, false);
        localVault.emergencyDivest();

        assertEq(usdc.balanceOf(address(localVault)), 45 * UNIT);
        assertEq(usdc.balanceOf(address(liar)), 0);
    }

    // ---------------------------------------------------------------------
    // Replacement and emergency recovery
    // ---------------------------------------------------------------------

    function testCannotReplaceStrategyWhileATokenPositionRemains() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        AaveStrategy replacement = _newReplacement();

        vm.expectRevert(abi.encodeWithSelector(VaultV4.StrategyHasAssets.selector, address(strategy), INVEST_AMOUNT));
        vault.setStrategy(address(replacement));
    }

    function testCannotReplaceStrategyWhileIdleUnderlyingRemains() public {
        uint256 idleDonation = 13 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));
        AaveStrategy replacement = _newReplacement();

        vm.expectRevert(abi.encodeWithSelector(VaultV4.StrategyHasAssets.selector, address(strategy), idleDonation));
        vault.setStrategy(address(replacement));
    }

    function testCanReplaceStrategyAfterAllAssetsAreRecovered() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        _divest(INVEST_AMOUNT, INVEST_AMOUNT);
        AaveStrategy replacement = _newReplacement();

        vm.expectEmit(true, true, false, true, address(vault));
        emit StrategySet(address(strategy), address(replacement));
        vault.setStrategy(address(replacement));

        assertEq(address(vault.strategy()), address(replacement));
    }

    function testCannotReplaceStrategyWhenCurrentAssetReadReverts() public {
        VaultV4 localVault = new VaultV4(address(usdc));
        MisreportingStrategy current = new MisreportingStrategy(address(localVault), address(usdc));
        MisreportingStrategy replacement = new MisreportingStrategy(address(localVault), address(usdc));
        localVault.setStrategy(address(current));
        current.setTotalAssetsRevert(true);

        vm.expectRevert("totalAssets failed");
        localVault.setStrategy(address(replacement));

        assertEq(address(localVault.strategy()), address(current));
    }

    function testEmergencyRecoversIdleUnderlyingAndAavePosition() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 idleDonation = 20 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));
        uint256 vaultBalanceBefore = vault.getIdleAssets();

        vm.expectEmit(false, false, false, true, address(strategy));
        emit EmergencyWithdrawn(INVEST_AMOUNT + idleDonation, true);
        vm.expectEmit(true, false, false, true, address(vault));
        emit EmergencyDivested(address(strategy), INVEST_AMOUNT + idleDonation, true);
        vault.emergencyDivest();

        assertEq(vault.getIdleAssets(), vaultBalanceBefore + INVEST_AMOUNT + idleDonation);
        assertEq(strategy.totalAssets(), 0);
        assertEq(aToken.balanceOf(address(strategy)), 0);
    }

    function testEmergencyBestEffortKeepsIdleRecoveryWhenAaveFails() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 idleDonation = 20 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));
        pool.setWithdrawRevert(true);
        uint256 vaultBalanceBefore = vault.getIdleAssets();

        vm.expectEmit(false, false, false, true, address(strategy));
        emit EmergencyWithdrawn(idleDonation, false);
        vm.expectEmit(true, false, false, true, address(vault));
        emit EmergencyDivested(address(strategy), idleDonation, false);
        vault.emergencyDivest();

        assertEq(vault.getIdleAssets(), vaultBalanceBefore + idleDonation);
        assertEq(usdc.balanceOf(address(strategy)), 0);
        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT);
        assertEq(strategy.totalAssets(), INVEST_AMOUNT);
    }

    function testEmergencyBestEffortKeepsIdleRecoveryWhenATokenReadFails() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 idleDonation = 20 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));
        aToken.setBalanceOfRevert(true);
        uint256 vaultBalanceBefore = vault.getIdleAssets();

        vm.expectEmit(false, false, false, true, address(strategy));
        emit EmergencyWithdrawn(idleDonation, false);
        vm.expectEmit(true, false, false, true, address(vault));
        emit EmergencyDivested(address(strategy), idleDonation, false);
        vault.emergencyDivest();

        assertEq(vault.getIdleAssets(), vaultBalanceBefore + idleDonation);
        assertEq(usdc.balanceOf(address(strategy)), 0);

        aToken.setBalanceOfRevert(false);
        assertEq(aToken.balanceOf(address(strategy)), INVEST_AMOUNT);
        assertEq(strategy.totalAssets(), INVEST_AMOUNT);
    }

    function testEmergencyRecordsSuccessfulPartialProtocolRecoveryAndKeepsResidualAccounted() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        uint256 idleDonation = 20 * UNIT;
        uint256 protocolRecovery = 100 * UNIT;
        assertTrue(usdc.transfer(address(strategy), idleDonation));
        pool.setMaxWithdrawAmount(protocolRecovery);
        uint256 vaultBalanceBefore = vault.getIdleAssets();

        vm.expectEmit(false, false, false, true, address(strategy));
        emit EmergencyWithdrawn(idleDonation + protocolRecovery, true);
        vm.expectEmit(true, false, false, true, address(vault));
        emit EmergencyDivested(address(strategy), idleDonation + protocolRecovery, true);
        vault.emergencyDivest();

        uint256 residual = INVEST_AMOUNT - protocolRecovery;
        assertEq(vault.getIdleAssets(), vaultBalanceBefore + idleDonation + protocolRecovery);
        assertEq(aToken.balanceOf(address(strategy)), residual);
        assertEq(strategy.totalAssets(), residual);

        AaveStrategy replacement = _newReplacement();
        vm.expectRevert(abi.encodeWithSelector(VaultV4.StrategyHasAssets.selector, address(strategy), residual));
        vault.setStrategy(address(replacement));
    }

    function testEmergencyFailureLeavesResidualPositionBlockingReplacement() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        pool.setWithdrawRevert(true);
        vault.emergencyDivest();
        AaveStrategy replacement = _newReplacement();

        vm.expectRevert(abi.encodeWithSelector(VaultV4.StrategyHasAssets.selector, address(strategy), INVEST_AMOUNT));
        vault.setStrategy(address(replacement));
    }

    function testEmergencyCanBeRetriedBeforeStrategyReplacement() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        pool.setWithdrawRevert(true);
        vault.emergencyDivest();
        assertEq(strategy.totalAssets(), INVEST_AMOUNT);

        pool.setWithdrawRevert(false);
        vault.emergencyDivest();
        assertEq(strategy.totalAssets(), 0);

        AaveStrategy replacement = _newReplacement();
        vault.setStrategy(address(replacement));
        assertEq(address(vault.strategy()), address(replacement));
    }

    function testEmergencyRecoveryWorksWhileVaultIsPaused() public {
        _depositAndInvest(DEPOSIT_AMOUNT, INVEST_AMOUNT);
        vault.pause();

        vault.emergencyDivest();

        assertEq(strategy.totalAssets(), 0);
        assertEq(vault.getIdleAssets(), DEPOSIT_AMOUNT);
    }
}
