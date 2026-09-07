// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../contracts/VaultV4.sol";
import "../contracts/MockERC20.sol";
import "../contracts/IStrategy.sol";

contract StrategyStub is IStrategy {
    using SafeERC20 for IERC20;

    address public immutable vault;
    IERC20 public immutable underlying;
    bool public failDeposit;
    bool public failWithdraw;
    bool public failTotalAssets;

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

    function setFailTotalAssets(bool value) external {
        failTotalAssets = value;
    }

    function deposit(uint256 amount) external onlyVault returns (uint256 actualInvestedAssets) {
        if (failDeposit) {
            underlying.safeTransfer(vault, amount);
            return 0;
        }
        emit Deposited(amount, amount);
        return amount;
    }

    function withdraw(uint256 amount) external onlyVault returns (uint256 actualReturnedAssets) {
        if (failWithdraw || underlying.balanceOf(address(this)) < amount) {
            return 0;
        }
        underlying.safeTransfer(vault, amount);
        emit Withdrawn(amount, amount);
        return amount;
    }

    function totalAssets() external view returns (uint256) {
        require(!failTotalAssets, "totalAssets failed");
        return underlying.balanceOf(address(this));
    }

    function underlyingToken() external view returns (address) {
        return address(underlying);
    }

    function emergencyWithdraw() external onlyVault returns (uint256 actualReturnedAssets, bool protocolCallSucceeded) {
        uint256 amount = underlying.balanceOf(address(this));
        if (amount > 0) {
            underlying.safeTransfer(vault, amount);
        }
        emit EmergencyWithdrawn(amount, true);
        return (amount, true);
    }
}

contract VaultV4Test is Test {
    event DepositCapUpdated(uint256 oldCap, uint256 newCap);

    VaultV4 public vault;
    MockERC20 public usdc;
    StrategyStub public strategy;

    address public manager;
    address public operator;
    address public treasurer;
    address public user1;
    address public user2;
    address public hacker;

    uint256 constant UNIT = 1e6;
    uint256 constant SHARE_SCALE = 1e6;
    uint256 constant INITIAL_SUPPLY = 2_000_000 * UNIT;
    uint256 constant DEPOSIT = 100 * UNIT;

    function setUp() public {
        manager = makeAddr("manager");
        operator = makeAddr("operator");
        treasurer = makeAddr("treasurer");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        hacker = makeAddr("hacker");

        usdc = new MockERC20(INITIAL_SUPPLY);
        vault = new VaultV4(address(usdc));
        strategy = new StrategyStub(address(vault), address(usdc));

        vault.grantManagerRole(manager);
        vault.grantOperatorRole(operator);
        vault.grantTreasurerRole(treasurer);
        vault.setStrategy(address(strategy));

        vm.prank(treasurer);
        vault.setDepositCap(type(uint256).max);

        assertTrue(usdc.transfer(user1, 500_000 * UNIT));
        assertTrue(usdc.transfer(user2, 500_000 * UNIT));

        vm.prank(user1);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _depositFor(address user, uint256 amount) internal {
        vm.prank(user);
        vault.deposit(amount, user);
    }

    function _investAsOperator(uint256 amount) internal {
        vm.prank(operator);
        vault.invest(amount);
    }

    function _divestAsOperator(uint256 amount, uint256 minAmountOut) internal {
        vm.prank(operator);
        vault.divest(amount, minAmountOut);
    }

    function testDepositMints4626Shares() public {
        vm.prank(user1);
        uint256 shares = vault.deposit(DEPOSIT, user1);

        assertEq(shares, DEPOSIT * SHARE_SCALE);
        assertEq(vault.balanceOf(user1), DEPOSIT * SHARE_SCALE);
        assertEq(vault.totalSupply(), DEPOSIT * SHARE_SCALE);
    }

    function testSharePriceGrowsAfterYield() public {
        _depositFor(user1, DEPOSIT);
        uint256 shares = vault.balanceOf(user1);
        uint256 beforeAssets = vault.previewRedeem(shares);

        _investAsOperator(DEPOSIT);
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

        _investAsOperator(2 * DEPOSIT);
        deal(address(usdc), address(strategy), 2 * DEPOSIT + 10 * UNIT);

        assertApproxEqAbs(vault.previewRedeem(vault.balanceOf(user1)), vault.previewRedeem(vault.balanceOf(user2)), 1);
    }

    function testWithdrawRevertsIfIdleLiquidityInsufficient() public {
        _depositFor(user1, DEPOSIT);
        _investAsOperator(DEPOSIT);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxWithdraw.selector, user1, 1, 0));
        vault.withdraw(1, user1, user1);
    }

    function testMaxRedeemAllowsFullExitWhenAllAssetsAreIdleAfterLoss() public {
        _depositFor(user1, DEPOSIT);
        uint256 userShares = vault.balanceOf(user1);

        deal(address(usdc), address(vault), 1);

        assertEq(vault.previewRedeem(userShares), 1);
        assertEq(vault.maxWithdraw(user1), 1);
        assertEq(vault.maxRedeem(user1), userShares);

        vm.prank(user1);
        assertEq(vault.redeem(userShares, user1, user1), 1);
        assertEq(vault.balanceOf(user1), 0);
    }

    function testMaxRedeemIsTightAtPartialIdleLiquidity() public {
        _depositFor(user1, DEPOSIT);
        _investAsOperator(90 * UNIT);

        uint256 idleAssets = vault.getIdleAssets();
        uint256 userShares = vault.balanceOf(user1);
        uint256 maxShares = vault.maxRedeem(user1);

        assertEq(idleAssets, 10 * UNIT);
        assertEq(vault.maxWithdraw(user1), idleAssets);
        assertEq(maxShares, vault.previewWithdraw(idleAssets + 1) - 1);
        assertLt(maxShares, userShares);
        assertGt(maxShares, vault.convertToShares(idleAssets));
        assertLe(vault.previewRedeem(maxShares), idleAssets);
        assertGt(vault.previewRedeem(maxShares + 1), idleAssets);

        uint256 expectedSharesBurned = vault.previewWithdraw(idleAssets);
        uint256 operationSnapshot = vm.snapshotState();
        vm.prank(user1);
        assertEq(vault.withdraw(idleAssets, user1, user1), expectedSharesBurned);
        assertTrue(vm.revertToState(operationSnapshot));

        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxWithdraw.selector, user1, idleAssets + 1, idleAssets)
        );
        vault.withdraw(idleAssets + 1, user1, user1);

        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxRedeem.selector, user1, maxShares + 1, maxShares)
        );
        vault.redeem(maxShares + 1, user1, user1);

        vm.prank(user1);
        uint256 assetsOut = vault.redeem(maxShares, user1, user1);
        assertLe(assetsOut, idleAssets);
    }

    function testZeroIdleLiquidityClosesWithdrawAndRedeemWithoutReadingStrategy() public {
        _depositFor(user1, DEPOSIT);
        _investAsOperator(DEPOSIT);
        strategy.setFailTotalAssets(true);

        assertEq(vault.maxWithdraw(user1), 0);
        assertEq(vault.maxRedeem(user1), 0);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxWithdraw.selector, user1, 1, 0));
        vault.withdraw(1, user1, user1);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxRedeem.selector, user1, 1, 0));
        vault.redeem(1, user1, user1);
    }

    function testPauseClosesWithdrawAndRedeem() public {
        _depositFor(user1, DEPOSIT);
        uint256 userShares = vault.balanceOf(user1);

        vm.prank(manager);
        vault.pause();

        assertEq(vault.maxWithdraw(user1), 0);
        assertEq(vault.maxRedeem(user1), 0);

        vm.prank(user1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.withdraw(1, user1, user1);

        vm.prank(user1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.redeem(userShares, user1, user1);
    }

    function testFuzzMaxWithdrawAndMaxRedeemAreTightAtIdleLiquidity(
        uint96 depositSeed,
        uint96 investSeed,
        uint96 strategyAssetsSeed
    ) public {
        uint256 depositAssets = bound(uint256(depositSeed), UNIT, 100_000 * UNIT);
        uint256 investedAssets = bound(uint256(investSeed), 0, depositAssets);
        _depositFor(user1, depositAssets);
        if (investedAssets > 0) {
            _investAsOperator(investedAssets);
        }

        uint256 strategyAssets = bound(uint256(strategyAssetsSeed), 0, 2 * depositAssets);
        deal(address(usdc), address(strategy), strategyAssets);

        uint256 idleAssets = vault.getIdleAssets();
        uint256 ownerShares = vault.balanceOf(user1);
        if (idleAssets == 0) {
            assertEq(vault.maxWithdraw(user1), 0);
            assertEq(vault.maxRedeem(user1), 0);
            return;
        }

        uint256 ownerClaim = vault.previewRedeem(ownerShares);
        uint256 maxAssets = vault.maxWithdraw(user1);
        uint256 maxShares = vault.maxRedeem(user1);

        assertEq(maxAssets, ownerClaim < idleAssets ? ownerClaim : idleAssets);
        assertLe(maxShares, ownerShares);
        assertLe(vault.previewRedeem(maxShares), idleAssets);

        if (ownerClaim <= idleAssets) {
            assertEq(maxShares, ownerShares);
        } else {
            assertEq(maxShares, vault.previewWithdraw(idleAssets + 1) - 1);
            assertGt(vault.previewRedeem(maxShares + 1), idleAssets);
        }

        if (maxShares > 0) {
            vm.prank(user1);
            assertLe(vault.redeem(maxShares, user1, user1), idleAssets);
        }
    }

    function testDivestThenWithdrawSucceeds() public {
        _depositFor(user1, DEPOSIT);
        _investAsOperator(DEPOSIT);
        _divestAsOperator(DEPOSIT, DEPOSIT);

        uint256 shares = vault.balanceOf(user1);
        vm.prank(user1);
        uint256 assets = vault.redeem(shares, user1, user1);

        assertEq(assets, DEPOSIT);
        assertEq(vault.balanceOf(user1), 0);
    }

    function testDivestSlippageReverts() public {
        _depositFor(user1, DEPOSIT);
        _investAsOperator(DEPOSIT);

        vm.prank(operator);
        vm.expectRevert("Slippage: received less than minAmountOut");
        vault.divest(DEPOSIT, DEPOSIT + 1);
    }

    function testWithdrawalDoesNotRequirePolicyApproval() public {
        uint256 depositAmount = 15_000 * UNIT;
        uint256 withdrawalAmount = 12_000 * UNIT;
        _depositFor(user1, depositAmount);

        vm.prank(user1);
        vault.withdraw(withdrawalAmount, user1, user1);

        assertEq(usdc.balanceOf(user1), 500_000 * UNIT - depositAmount + withdrawalAmount);
    }

    function testInvestRespectsPause() public {
        _depositFor(user1, DEPOSIT);

        vm.prank(manager);
        vault.pause();

        vm.prank(operator);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.invest(DEPOSIT);
    }

    function testDivestRespectsPause() public {
        _depositFor(user1, DEPOSIT);
        _investAsOperator(DEPOSIT);

        vm.prank(manager);
        vault.pause();

        vm.prank(operator);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.divest(DEPOSIT, DEPOSIT);
    }

    function testEmergencyDivestWhilePaused() public {
        _depositFor(user1, DEPOSIT);
        _investAsOperator(DEPOSIT);

        vm.prank(manager);
        vault.pause();

        vault.emergencyDivest();
        assertEq(vault.getStrategyBalance(), 0);
    }

    function testDepositCapEnforced() public {
        vm.prank(treasurer);
        vault.setDepositCap(50 * UNIT);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxDeposit.selector, user1, DEPOSIT, 50 * UNIT));
        vault.deposit(DEPOSIT, user1);
    }

    function testMaxDepositReflectsCap() public {
        vm.prank(treasurer);
        vault.setDepositCap(150 * UNIT);

        _depositFor(user1, DEPOSIT);
        assertEq(vault.maxDeposit(user2), 50 * UNIT);
    }

    function testDefaultZeroCapClosesPositiveDepositAndMint() public {
        VaultV4 closedVault = new VaultV4(address(usdc));
        uint256 userBalanceBefore = usdc.balanceOf(user1);

        vm.prank(user1);
        usdc.approve(address(closedVault), type(uint256).max);

        assertEq(closedVault.depositCap(), 0);
        assertEq(closedVault.maxDeposit(user1), 0);
        assertEq(closedVault.maxMint(user1), 0);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxDeposit.selector, user1, 1, 0));
        closedVault.deposit(1, user1);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxMint.selector, user1, 1, 0));
        closedVault.mint(1, user1);

        assertEq(usdc.balanceOf(user1), userBalanceBefore);
        assertEq(closedVault.totalAssets(), 0);
        assertEq(closedVault.totalSupply(), 0);
    }

    function testDefaultZeroCapAllowsZeroNoOps() public {
        VaultV4 closedVault = new VaultV4(address(usdc));

        vm.prank(user1);
        assertEq(closedVault.deposit(0, user1), 0);

        vm.prank(user1);
        assertEq(closedVault.mint(0, user1), 0);

        assertEq(closedVault.totalAssets(), 0);
        assertEq(closedVault.totalSupply(), 0);
    }

    function testZeroCapStillAllowsHolderExit() public {
        _depositFor(user1, DEPOSIT);

        vm.prank(treasurer);
        vault.setDepositCap(0);

        assertEq(vault.maxDeposit(user2), 0);
        assertEq(vault.maxMint(user2), 0);
        assertGt(vault.maxWithdraw(user1), 0);
        assertGt(vault.maxRedeem(user1), 0);

        uint256 userShares = vault.balanceOf(user1);
        vm.prank(user1);
        uint256 assets = vault.redeem(userShares, user1, user1);

        assertEq(assets, DEPOSIT);
        assertEq(vault.balanceOf(user1), 0);
    }

    function testZeroCapDoesNotPauseTransfersInvestOrDivest() public {
        _depositFor(user1, DEPOSIT);

        vm.prank(treasurer);
        vault.setDepositCap(0);

        uint256 transferShares = vault.balanceOf(user1) / 10;
        vm.prank(user1);
        assertTrue(vault.transfer(user2, transferShares));
        _investAsOperator(50 * UNIT);
        _divestAsOperator(50 * UNIT, 50 * UNIT);

        assertEq(vault.balanceOf(user2), transferShares);
        assertEq(vault.getStrategyBalance(), 0);
        assertEq(vault.getIdleAssets(), DEPOSIT);
    }

    function testTreasurerCanCloseAndReopenCap() public {
        _depositFor(user1, DEPOSIT);

        vm.startPrank(treasurer);
        vault.setDepositCap(0);
        assertEq(vault.maxDeposit(user2), 0);
        vault.setDepositCap(150 * UNIT);
        vm.stopPrank();

        assertEq(vault.maxDeposit(user2), 50 * UNIT);
    }

    function testSetDepositCapTreasurerOnly() public {
        bytes32 treasurerRole = vault.TREASURER_ROLE();
        vm.prank(hacker);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, hacker, treasurerRole)
        );
        vault.setDepositCap(50 * UNIT);
    }

    function testDepositCapUpdateEmitsOldAndNewValues() public {
        vm.startPrank(treasurer);

        vm.expectEmit(false, false, false, true, address(vault));
        emit DepositCapUpdated(type(uint256).max, 0);
        vault.setDepositCap(0);

        vm.expectEmit(false, false, false, true, address(vault));
        emit DepositCapUpdated(0, 50 * UNIT);
        vault.setDepositCap(50 * UNIT);

        vm.stopPrank();
    }

    function testMaxUintCapIsExplicitUnlimitedSentinel() public {
        assertEq(vault.depositCap(), type(uint256).max);
        assertEq(vault.maxDeposit(user1), type(uint256).max);
        assertEq(vault.maxMint(user1), type(uint256).max);

        _depositFor(user1, DEPOSIT);
        assertEq(vault.totalAssets(), DEPOSIT);
    }

    function testFiniteCapIncludesIdleStrategyAssetsAndDonations() public {
        _depositFor(user1, DEPOSIT);
        _investAsOperator(40 * UNIT);
        assertTrue(usdc.transfer(address(vault), 10 * UNIT));

        vm.prank(treasurer);
        vault.setDepositCap(300 * UNIT);

        assertEq(vault.totalAssets(), 110 * UNIT);
        assertEq(vault.maxDeposit(user2), 190 * UNIT);
    }

    function testExactMaxDepositSucceedsAndOneAboveReverts() public {
        _depositFor(user1, DEPOSIT);

        vm.prank(treasurer);
        vault.setDepositCap(150 * UNIT);

        uint256 maxAssets = vault.maxDeposit(user2);
        assertEq(maxAssets, 50 * UNIT);

        vm.prank(user2);
        vm.expectRevert(
            abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxDeposit.selector, user2, maxAssets + 1, maxAssets)
        );
        vault.deposit(maxAssets + 1, user2);

        vm.prank(user2);
        vault.deposit(maxAssets, user2);
        assertEq(vault.totalAssets(), 150 * UNIT);
    }

    function testMaxMintIsTightAtFiniteCap() public {
        _depositFor(user1, DEPOSIT);

        vm.prank(treasurer);
        vault.setDepositCap(150 * UNIT);

        uint256 remainingAssets = vault.maxDeposit(user2);
        uint256 maxShares = vault.maxMint(user2);
        assertLe(vault.previewMint(maxShares), remainingAssets);
        assertGt(vault.previewMint(maxShares + 1), remainingAssets);

        vm.prank(user2);
        vm.expectRevert(
            abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxMint.selector, user2, maxShares + 1, maxShares)
        );
        vault.mint(maxShares + 1, user2);

        vm.prank(user2);
        vault.mint(maxShares, user2);
        assertLe(vault.totalAssets(), 150 * UNIT);
    }

    function testCapAtOrBelowTotalAssetsClosesInflows() public {
        _depositFor(user1, DEPOSIT);

        vm.startPrank(treasurer);
        vault.setDepositCap(DEPOSIT);
        assertEq(vault.maxDeposit(user2), 0);
        assertEq(vault.maxMint(user2), 0);

        vault.setDepositCap(DEPOSIT - 1);
        vm.stopPrank();

        assertEq(vault.maxDeposit(user2), 0);
        assertEq(vault.maxMint(user2), 0);
        assertGt(vault.maxWithdraw(user1), 0);
    }

    function testDonationAboveCapClosesInflowsButPreservesExit() public {
        _depositFor(user1, DEPOSIT);

        vm.prank(treasurer);
        vault.setDepositCap(105 * UNIT);
        assertTrue(usdc.transfer(address(vault), 10 * UNIT));

        assertEq(vault.totalAssets(), 110 * UNIT);
        assertEq(vault.maxDeposit(user2), 0);
        assertEq(vault.maxMint(user2), 0);

        vm.prank(user1);
        vault.withdraw(50 * UNIT, user1, user1);
        assertEq(usdc.balanceOf(user1), 500_000 * UNIT - 50 * UNIT);
    }

    function testPauseOverridesFiniteAndUnlimitedCap() public {
        assertEq(vault.maxDeposit(user1), type(uint256).max);

        vm.prank(manager);
        vault.pause();
        assertEq(vault.maxDeposit(user1), 0);
        assertEq(vault.maxMint(user1), 0);

        vm.prank(user1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.deposit(1, user1);

        vm.prank(manager);
        vault.unpause();
        assertEq(vault.maxDeposit(user1), type(uint256).max);

        vm.prank(treasurer);
        vault.setDepositCap(50 * UNIT);
        assertEq(vault.maxDeposit(user1), 50 * UNIT);

        vm.prank(manager);
        vault.pause();
        assertEq(vault.maxDeposit(user1), 0);
        assertEq(vault.maxMint(user1), 0);
    }

    function testClosedAndPausedMaxMintDoNotReadRevertingStrategy() public {
        vm.prank(treasurer);
        vault.setDepositCap(0);
        strategy.setFailTotalAssets(true);

        assertEq(vault.maxDeposit(user1), 0);
        assertEq(vault.maxMint(user1), 0);

        vm.prank(treasurer);
        vault.setDepositCap(type(uint256).max);
        vm.prank(manager);
        vault.pause();

        assertEq(vault.maxDeposit(user1), 0);
        assertEq(vault.maxMint(user1), 0);
    }

    function testPreviewsRemainConversionQuotesWhenCapIsClosed() public {
        vm.prank(treasurer);
        vault.setDepositCap(0);

        assertEq(vault.maxDeposit(user1), 0);
        assertEq(vault.maxMint(user1), 0);
        assertGt(vault.previewDeposit(DEPOSIT), 0);
        assertGt(vault.previewMint(DEPOSIT), 0);
    }

    function testFuzzFiniteCapReportsRemainingAumCapacity(uint96 initialSeed, uint96 donationSeed, uint96 capSeed)
        public
    {
        // Keep this cap property in an ordinary depositor state. Adversarial
        // first-depositor/donation ratios belong to the inflation suite.
        uint256 initialAssets = bound(uint256(initialSeed), UNIT, 100_000 * UNIT);
        uint256 donationAssets = bound(uint256(donationSeed), 0, initialAssets);
        uint256 finiteCap = bound(uint256(capSeed), 1, 250_000 * UNIT);

        _depositFor(user1, initialAssets);
        if (donationAssets > 0) {
            assertTrue(usdc.transfer(address(vault), donationAssets));
        }

        vm.prank(treasurer);
        vault.setDepositCap(finiteCap);

        uint256 managedAssets = vault.totalAssets();
        uint256 expectedRemaining = managedAssets >= finiteCap ? 0 : finiteCap - managedAssets;
        assertEq(vault.maxDeposit(user2), expectedRemaining);
    }

    function testFuzzSuccessfulDepositNeverCrossesFiniteCap(uint96 initialSeed, uint96 headroomSeed, uint96 depositSeed)
        public
    {
        uint256 initialAssets = bound(uint256(initialSeed), 1, 100_000 * UNIT);
        uint256 headroom = bound(uint256(headroomSeed), 1, 100_000 * UNIT);
        uint256 depositAssets = bound(uint256(depositSeed), 1, headroom);
        uint256 finiteCap = initialAssets + headroom;

        _depositFor(user1, initialAssets);
        vm.prank(treasurer);
        vault.setDepositCap(finiteCap);

        _depositFor(user2, depositAssets);
        assertLe(vault.totalAssets(), finiteCap);
    }

    function testFuzzZeroCapRejectsPositiveDepositAndMint(uint96 assetsSeed, uint96 sharesSeed) public {
        uint256 assets = bound(uint256(assetsSeed), 1, 100_000 * UNIT);
        uint256 shares = bound(uint256(sharesSeed), 1, 100_000 * UNIT);
        uint256 userBalanceBefore = usdc.balanceOf(user1);

        vm.prank(treasurer);
        vault.setDepositCap(0);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxDeposit.selector, user1, assets, 0));
        vault.deposit(assets, user1);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxMint.selector, user1, shares, 0));
        vault.mint(shares, user1);

        assertEq(usdc.balanceOf(user1), userBalanceBefore);
        assertEq(vault.totalAssets(), 0);
        assertEq(vault.totalSupply(), 0);
    }

    function testDivestWithYieldDoesNotMintShares() public {
        _depositFor(user1, DEPOSIT);
        _investAsOperator(DEPOSIT);

        uint256 supplyBefore = vault.totalSupply();
        uint256 userSharesBefore = vault.balanceOf(user1);
        deal(address(usdc), address(strategy), DEPOSIT + 5 * UNIT);

        _divestAsOperator(DEPOSIT + 5 * UNIT, DEPOSIT + 5 * UNIT);

        assertEq(vault.totalSupply(), supplyBefore);
        assertEq(vault.balanceOf(user1), userSharesBefore);
        // ERC-4626 conversion rounds down, and OpenZeppelin's virtual asset can
        // make the redeemable amount one raw USDC unit below the nominal yield.
        assertApproxEqAbs(vault.previewRedeem(userSharesBefore), DEPOSIT + 5 * UNIT, 1);
    }

    function testShareTransferAllowedWhileActive() public {
        _depositFor(user1, DEPOSIT);

        uint256 transferShares = vault.balanceOf(user1) / 4;
        vm.prank(user1);
        assertTrue(vault.transfer(user2, transferShares));

        assertEq(vault.balanceOf(user1), 3 * transferShares);
        assertEq(vault.balanceOf(user2), transferShares);
    }

    function testShareTransferRevertsWhilePaused() public {
        _depositFor(user1, DEPOSIT);

        vm.prank(manager);
        vault.pause();

        uint256 transferShares = vault.balanceOf(user1) / 4;
        vm.prank(user1);
        vm.expectRevert("Vault is paused");
        vault.transfer(user2, transferShares);
    }
}
