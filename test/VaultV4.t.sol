// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/VaultV4.sol";
import "../contracts/MockERC20.sol";
import "../contracts/IStrategy.sol";

contract StrategyStub is IStrategy {
    using SafeERC20 for IERC20;

    address public immutable vault;
    IERC20 public immutable underlying;
    bool public failDeposit;
    bool public failWithdraw;

    constructor(address vault_, address token_) {
        vault = vault_;
        underlying = IERC20(token_);
    }

    modifier onlyVault() {
        require(msg.sender == vault, "not vault");
        _;
    }

    function setFailDeposit(bool value) external {
        failDeposit = value;
    }

    function setFailWithdraw(bool value) external {
        failWithdraw = value;
    }

    function deposit(uint256 amount) external onlyVault returns (bool success) {
        if (failDeposit) {
            underlying.safeTransfer(vault, amount);
            return false;
        }
        emit Deposited(amount);
        return true;
    }

    function withdraw(uint256 amount) external onlyVault returns (bool success) {
        if (failWithdraw || underlying.balanceOf(address(this)) < amount) {
            return false;
        }
        underlying.safeTransfer(vault, amount);
        emit Withdrawn(amount);
        return true;
    }

    function totalAssets() external view returns (uint256) {
        return underlying.balanceOf(address(this));
    }

    function underlyingToken() external view returns (address) {
        return address(underlying);
    }

    function emergencyWithdraw() external onlyVault returns (bool success) {
        uint256 amount = underlying.balanceOf(address(this));
        if (amount > 0) {
            underlying.safeTransfer(vault, amount);
        }
        emit EmergencyWithdrawn(amount);
        return true;
    }
}

contract VaultV4Test is Test {
    VaultV4 public vault;
    MockERC20 public usdc;
    StrategyStub public strategy;

    address public manager;
    address public operator;
    address public treasurer;
    address public feeTreasury;
    address public user1;
    address public user2;
    address public hacker;

    uint256 constant UNIT = 1e6;
    uint256 constant INITIAL_SUPPLY = 2_000_000 * UNIT;
    uint256 constant DEPOSIT = 100 * UNIT;

    function setUp() public {
        manager = makeAddr("manager");
        operator = makeAddr("operator");
        treasurer = makeAddr("treasurer");
        feeTreasury = makeAddr("feeTreasury");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        hacker = makeAddr("hacker");

        usdc = new MockERC20(INITIAL_SUPPLY);
        vault = new VaultV4(address(usdc), feeTreasury);
        strategy = new StrategyStub(address(vault), address(usdc));

        vault.grantManagerRole(manager);
        vault.grantOperatorRole(operator);
        vault.grantTreasurerRole(treasurer);
        vault.setStrategy(address(strategy));

        usdc.transfer(user1, 500_000 * UNIT);
        usdc.transfer(user2, 500_000 * UNIT);

        vm.prank(user1);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _depositFor(address user, uint256 amount) internal {
        vm.prank(user);
        vault.deposit(amount, user);
    }

    function _investAsTreasurer(uint256 amount) internal {
        vm.prank(operator);
        vault.invest(amount);
    }

    function _divestAsTreasurer(uint256 amount, uint256 minAmountOut) internal {
        vm.prank(operator);
        vault.divest(amount, minAmountOut);
    }

    function testDepositMints4626Shares() public {
        vm.prank(user1);
        uint256 shares = vault.deposit(DEPOSIT, user1);

        assertEq(shares, DEPOSIT);
        assertEq(vault.balanceOf(user1), DEPOSIT);
        assertEq(vault.totalSupply(), DEPOSIT);
    }

    function testSharePriceGrowsAfterYield() public {
        _depositFor(user1, DEPOSIT);
        uint256 shares = vault.balanceOf(user1);
        uint256 beforeAssets = vault.previewRedeem(shares);

        _investAsTreasurer(DEPOSIT);
        deal(address(usdc), address(strategy), DEPOSIT + 10 * UNIT);

        uint256 afterAssets = vault.previewRedeem(shares);
        assertGt(afterAssets, beforeAssets);
    }

    function testWithdrawBurnsCorrectShares() public {
        _depositFor(user1, DEPOSIT);

        uint256 sharesBefore = vault.balanceOf(user1);
        uint256 expectedSharesBurned = vault.previewWithdraw(40 * UNIT);

        vm.prank(user1);
        uint256 sharesBurned = vault.withdraw(40 * UNIT, user1, user1);

        assertEq(sharesBurned, expectedSharesBurned);
        assertLt(vault.balanceOf(user1), sharesBefore);
        assertEq(usdc.balanceOf(user1), 500_000 * UNIT - DEPOSIT + 40 * UNIT);
    }

    function testTwoUsersShareYieldProportionally() public {
        _depositFor(user1, DEPOSIT);
        _depositFor(user2, DEPOSIT);

        _investAsTreasurer(2 * DEPOSIT);
        deal(address(usdc), address(strategy), 2 * DEPOSIT + 10 * UNIT);

        assertApproxEqAbs(vault.previewRedeem(vault.balanceOf(user1)), vault.previewRedeem(vault.balanceOf(user2)), 1);
    }

    function testInflationAttackPrevented() public {
        _depositFor(user1, 1);

        usdc.transfer(address(vault), 1_000 * UNIT);

        vm.prank(user2);
        uint256 shares = vault.deposit(DEPOSIT, user2);

        assertGt(shares, 0);
        assertGt(vault.previewRedeem(vault.balanceOf(user2)), 0);
    }

    function testWithdrawRevertsIfIdleLiquidityInsufficient() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);

        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(1, user1, user1);
    }

    function testDivestThenWithdrawSucceeds() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);
        _divestAsTreasurer(DEPOSIT, DEPOSIT);

        uint256 shares = vault.balanceOf(user1);
        vm.prank(user1);
        uint256 assets = vault.redeem(shares, user1, user1);

        assertEq(assets, DEPOSIT);
        assertEq(vault.balanceOf(user1), 0);
    }

    function testDivestSlippageReverts() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);

        vm.prank(treasurer);
        vm.expectRevert("Slippage: received less than minAmountOut");
        vault.divest(DEPOSIT, DEPOSIT + 1);
    }

    function testLargeWithdrawalNonceFlow() public {
        vm.prank(treasurer);
        vault.setLargeWithdrawalThreshold(10 * UNIT);

        _depositFor(user1, 15 * UNIT);

        vm.prank(user1);
        vault.requestLargeWithdrawal(12 * UNIT, user1);

        vm.prank(treasurer);
        vault.approveLargeWithdrawal(user1, user1, 12 * UNIT, 0);

        vm.prank(user1);
        vault.withdraw(12 * UNIT, user1, user1);

        assertEq(vault.withdrawalNonce(user1), 1);
    }

    function testLargeWithdrawalWrongNonceReverts() public {
        vm.prank(treasurer);
        vault.setLargeWithdrawalThreshold(10 * UNIT);

        _depositFor(user1, 15 * UNIT);

        vm.prank(user1);
        vault.requestLargeWithdrawal(12 * UNIT, user1);

        vm.prank(treasurer);
        vault.approveLargeWithdrawal(user1, user1, 12 * UNIT, 1);

        vm.prank(user1);
        vm.expectRevert("Large withdrawal requires treasurer approval");
        vault.withdraw(12 * UNIT, user1, user1);
    }

    function testInvestRespectsPause() public {
        _depositFor(user1, DEPOSIT);

        vm.prank(manager);
        vault.pause();

        vm.prank(treasurer);
        vm.expectRevert();
        vault.invest(DEPOSIT);
    }

    function testDivestRespectsPause() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);

        vm.prank(manager);
        vault.pause();

        vm.prank(operator);
        vm.expectRevert();
        vault.divest(DEPOSIT, DEPOSIT);
    }

    function testEmergencyDivestWhilePaused() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);

        vm.prank(manager);
        vault.pause();

        vault.emergencyDivest();
        assertEq(vault.getStrategyBalance(), 0);
        assertEq(vault.strategyPrincipal(), 0);
    }

    function testDepositCapEnforced() public {
        vm.prank(treasurer);
        vault.setDepositCap(50 * UNIT);

        vm.prank(user1);
        vm.expectRevert();
        vault.deposit(DEPOSIT, user1);
    }

    function testMaxDepositReflectsCap() public {
        vm.prank(treasurer);
        vault.setDepositCap(150 * UNIT);

        _depositFor(user1, DEPOSIT);
        assertEq(vault.maxDeposit(user2), 50 * UNIT);
    }

    function testPerformanceFeeOnRealizedYieldOnly() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);

        deal(address(usdc), address(strategy), DEPOSIT + 20 * UNIT);
        uint256 treasurySharesBefore = vault.balanceOf(feeTreasury);

        _divestAsTreasurer(DEPOSIT + 20 * UNIT, DEPOSIT + 20 * UNIT);

        assertGt(vault.balanceOf(feeTreasury), treasurySharesBefore);
    }

    function testNoPerformanceFeeWhenNoProfit() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);
        _divestAsTreasurer(DEPOSIT, DEPOSIT);

        assertEq(vault.balanceOf(feeTreasury), 0);
    }

    function testTreasuryReceivesSharesNotAssets() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);

        deal(address(usdc), address(strategy), DEPOSIT + 10 * UNIT);
        uint256 treasuryUsdcBefore = usdc.balanceOf(feeTreasury);

        _divestAsTreasurer(DEPOSIT + 10 * UNIT, DEPOSIT + 10 * UNIT);

        assertEq(usdc.balanceOf(feeTreasury), treasuryUsdcBefore);
        assertGt(vault.balanceOf(feeTreasury), 0);
    }

    function testUserReceivesNetYieldAfterFee() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);

        deal(address(usdc), address(strategy), DEPOSIT + 10 * UNIT);
        _divestAsTreasurer(DEPOSIT + 10 * UNIT, DEPOSIT + 10 * UNIT);

        uint256 assets = vault.previewRedeem(vault.balanceOf(user1));
        assertGt(assets, DEPOSIT);
        assertLt(assets, DEPOSIT + 10 * UNIT);
    }

    function testPerformanceFeeRespectsCap() public {
        vm.prank(treasurer);
        vm.expectRevert("Fee exceeds maximum");
        vault.setPerformanceFee(2_001);
    }

    function testSetFeeTreasuryAdminOnly() public {
        vm.prank(hacker);
        vm.expectRevert();
        vault.setFeeTreasury(hacker);
    }

    function testSetPerformanceFeeTreasurerOnly() public {
        vm.prank(hacker);
        vm.expectRevert();
        vault.setPerformanceFee(500);
    }

    function testMultipleUsersShareNetYieldAndTreasuryGetsFeeShares() public {
        _depositFor(user1, DEPOSIT);
        _depositFor(user2, DEPOSIT);
        _investAsTreasurer(2 * DEPOSIT);

        deal(address(usdc), address(strategy), 2 * DEPOSIT + 20 * UNIT);
        _divestAsTreasurer(2 * DEPOSIT + 20 * UNIT, 2 * DEPOSIT + 20 * UNIT);

        assertGt(vault.balanceOf(feeTreasury), 0);
        assertApproxEqAbs(vault.previewRedeem(vault.balanceOf(user1)), vault.previewRedeem(vault.balanceOf(user2)), 1);
    }

    function testDivestWithSlippageAndFee() public {
        _depositFor(user1, DEPOSIT);
        _investAsTreasurer(DEPOSIT);

        deal(address(usdc), address(strategy), DEPOSIT + 5 * UNIT);
        _divestAsTreasurer(DEPOSIT + 5 * UNIT, DEPOSIT + 5 * UNIT);

        assertGt(vault.balanceOf(feeTreasury), 0);
    }
}
