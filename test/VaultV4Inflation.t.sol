// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "../contracts/MockERC20.sol";
import "../contracts/VaultV4.sol";

contract MockEighteenDecimalToken is ERC20 {
    constructor() ERC20("Eighteen Decimal Token", "EIGHTEEN") {}
}

contract VaultV4InflationTest is Test {
    uint256 internal constant ASSET_UNIT = 1e6;
    uint256 internal constant SHARE_SCALE = 1e6;
    uint256 internal constant INITIAL_SUPPLY = 2_000_000 * ASSET_UNIT;
    uint256 internal constant USER_BALANCE = 500_000 * ASSET_UNIT;

    MockERC20 internal usdc;
    VaultV4 internal vault;

    address internal attacker;
    address internal victim;

    function setUp() public {
        attacker = makeAddr("attacker");
        victim = makeAddr("victim");

        usdc = new MockERC20(INITIAL_SUPPLY);
        vault = new VaultV4(address(usdc));
        vault.setDepositCap(type(uint256).max);

        assertTrue(usdc.transfer(attacker, USER_BALANCE));
        assertTrue(usdc.transfer(victim, USER_BALANCE));

        vm.prank(attacker);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(victim);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _depositAs(address account, uint256 assets) internal returns (uint256 shares) {
        vm.prank(account);
        return vault.deposit(assets, account);
    }

    function _donateAsAttacker(uint256 assets) internal {
        vm.prank(attacker);
        assertTrue(usdc.transfer(address(vault), assets));
    }

    function testVaultRequiresSixDecimalAsset() public {
        MockEighteenDecimalToken unsupportedAsset = new MockEighteenDecimalToken();

        vm.expectRevert(abi.encodeWithSelector(VaultV4.UnsupportedAssetDecimals.selector, 18));
        new VaultV4(address(unsupportedAsset));
    }

    function testOffsetSixUsesTwelveShareDecimalsAndExactInitialRate() public {
        assertEq(usdc.decimals(), 6);
        assertEq(vault.decimals(), 12);
        assertEq(vault.previewDeposit(ASSET_UNIT), ASSET_UNIT * SHARE_SCALE);

        uint256 shares = _depositAs(victim, ASSET_UNIT);
        assertEq(shares, ASSET_UNIT * SHARE_SCALE);
        assertEq(vault.previewRedeem(shares), ASSET_UNIT);
    }

    function testHistoricalDonationAttackMintsSharesAndCostsAttacker() public {
        uint256 attackerSeed = 1;
        uint256 donation = 1_000 * ASSET_UNIT;
        uint256 victimAssets = 100 * ASSET_UNIT;

        uint256 attackerShares = _depositAs(attacker, attackerSeed);
        _donateAsAttacker(donation);
        uint256 victimShares = _depositAs(victim, victimAssets);

        assertEq(attackerShares, SHARE_SCALE);
        assertEq(victimShares, 199_999);

        uint256 attackerSpend = attackerSeed + donation;
        vm.prank(attacker);
        uint256 attackerAssetsOut = vault.redeem(attackerShares, attacker, attacker);

        assertEq(attackerAssetsOut, 500_000_228);
        assertEq(attackerSpend - attackerAssetsOut, 499_999_773);
        assertLt(attackerAssetsOut, attackerSpend);
    }

    function testOneShareBoundaryBelowThresholdMintsOneRawShare() public {
        _depositAs(attacker, 1);
        _donateAsAttacker(1_999_998);

        assertEq(vault.previewDeposit(1), 1);
        assertEq(_depositAs(victim, 1), 1);
    }

    function testZeroShareBoundaryRevertsBeforeVictimAssetsMove() public {
        _depositAs(attacker, 1);
        _donateAsAttacker(1_999_999);

        uint256 victimBalanceBefore = usdc.balanceOf(victim);
        uint256 vaultAssetsBefore = vault.totalAssets();
        uint256 supplyBefore = vault.totalSupply();
        assertEq(vault.previewDeposit(1), 0);

        vm.prank(victim);
        vm.expectRevert(abi.encodeWithSelector(VaultV4.ZeroSharesForAssets.selector, 1));
        vault.deposit(1, victim);

        assertEq(usdc.balanceOf(victim), victimBalanceBefore);
        assertEq(vault.totalAssets(), vaultAssetsBefore);
        assertEq(vault.totalSupply(), supplyBefore);
    }

    function testEmptyVaultDonationBoundary() public {
        _donateAsAttacker(999_999);
        assertEq(vault.previewDeposit(1), 1);
        assertEq(_depositAs(victim, 1), 1);
    }

    function testEmptyVaultDonationAtThresholdReverts() public {
        _donateAsAttacker(ASSET_UNIT);

        assertEq(vault.previewDeposit(1), 0);
        vm.prank(victim);
        vm.expectRevert(abi.encodeWithSelector(VaultV4.ZeroSharesForAssets.selector, 1));
        vault.deposit(1, victim);
    }

    function testFiniteCapReportsZeroWhenRemainingAssetWouldMintZeroShares() public {
        _depositAs(attacker, 1);
        _donateAsAttacker(1_999_999);
        vault.setDepositCap(vault.totalAssets() + 1);

        assertEq(vault.previewDeposit(1), 0);
        assertEq(vault.maxDeposit(victim), 0);
        assertEq(vault.maxMint(victim), 0);

        vm.prank(victim);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxDeposit.selector, victim, 1, 0));
        vault.deposit(1, victim);
    }

    function testDonationCanConsumeCapButCannotMintShares() public {
        uint256 finiteCap = 100 * ASSET_UNIT;
        vault.setDepositCap(finiteCap);
        _donateAsAttacker(finiteCap);

        assertEq(vault.totalSupply(), 0);
        assertEq(vault.totalAssets(), finiteCap);
        assertEq(vault.maxDeposit(victim), 0);

        vm.prank(victim);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxDeposit.selector, victim, 1, 0));
        vault.deposit(1, victim);
    }

    function testDirectDonationDoesNotMintSharesAndBenefitsExistingHolder() public {
        uint256 attackerShares = _depositAs(attacker, 100 * ASSET_UNIT);
        uint256 supplyBefore = vault.totalSupply();
        uint256 redeemableBefore = vault.previewRedeem(attackerShares);

        _donateAsAttacker(10 * ASSET_UNIT);

        assertEq(vault.totalSupply(), supplyBefore);
        assertEq(vault.balanceOf(attacker), attackerShares);
        assertGt(vault.previewRedeem(attackerShares), redeemableBefore);
    }

    function testFuzzInitialRateIsExact(uint96 assetsSeed) public {
        uint256 assets = bound(uint256(assetsSeed), 1, 100_000 * ASSET_UNIT);
        uint256 expectedShares = assets * SHARE_SCALE;

        assertEq(vault.previewDeposit(assets), expectedShares);
        assertEq(_depositAs(victim, assets), expectedShares);
    }

    function testFuzzOneShareAndZeroShareDonationBoundaries(uint96 seedInput, uint96 victimInput) public {
        uint256 attackerSeed = bound(uint256(seedInput), 1, 999);
        uint256 victimAssets = bound(uint256(victimInput), 1, 100);
        uint256 thresholdNumerator = victimAssets * SHARE_SCALE * (attackerSeed + 1);
        uint256 oneShareDonation = thresholdNumerator - attackerSeed - 1;
        uint256 zeroShareDonation = thresholdNumerator - attackerSeed;

        _depositAs(attacker, attackerSeed);
        uint256 seededState = vm.snapshotState();

        _donateAsAttacker(oneShareDonation);
        assertEq(vault.previewDeposit(victimAssets), 1);
        assertEq(_depositAs(victim, victimAssets), 1);

        assertTrue(vm.revertToState(seededState));

        _donateAsAttacker(zeroShareDonation);
        assertEq(vault.previewDeposit(victimAssets), 0);
        vm.prank(victim);
        vm.expectRevert(abi.encodeWithSelector(VaultV4.ZeroSharesForAssets.selector, victimAssets));
        vault.deposit(victimAssets, victim);
    }

    function testFuzzSingleVictimDonationAttackNeverProfits(uint96 seedInput, uint96 donationInput, uint96 victimInput)
        public
    {
        uint256 attackerSeed = bound(uint256(seedInput), 1, 10_000 * ASSET_UNIT);
        uint256 donation = bound(uint256(donationInput), 1, 100_000 * ASSET_UNIT);
        uint256 victimAssets = bound(uint256(victimInput), 1, 100_000 * ASSET_UNIT);

        uint256 attackerShares = _depositAs(attacker, attackerSeed);
        _donateAsAttacker(donation);

        uint256 victimPreview = vault.previewDeposit(victimAssets);
        uint256 victimShares;
        if (victimPreview == 0) {
            vm.prank(victim);
            vm.expectRevert(abi.encodeWithSelector(VaultV4.ZeroSharesForAssets.selector, victimAssets));
            vault.deposit(victimAssets, victim);
        } else {
            victimShares = _depositAs(victim, victimAssets);
            assertEq(victimShares, victimPreview);
        }

        uint256 postVictimState = vm.snapshotState();

        vm.prank(attacker);
        uint256 attackerFirstAssetsOut = vault.redeem(attackerShares, attacker, attacker);
        assertLe(attackerFirstAssetsOut, attackerSeed + donation);

        assertTrue(vm.revertToState(postVictimState));
        if (victimShares > 0) {
            vm.prank(victim);
            vault.redeem(victimShares, victim, victim);
        }

        vm.prank(attacker);
        uint256 attackerLastAssetsOut = vault.redeem(attackerShares, attacker, attacker);
        assertLe(attackerLastAssetsOut, attackerSeed + donation);
    }

    function testFuzzAtLeastOneUsdcCanaryDepositRoundingLossIsBounded(
        uint96 seedInput,
        uint96 donationInput,
        uint96 victimInput
    ) public {
        uint256 canaryCap = 50 * ASSET_UNIT;
        uint256 attackerSeed = bound(uint256(seedInput), 0, 49 * ASSET_UNIT);
        uint256 donation = bound(uint256(donationInput), 0, 49 * ASSET_UNIT - attackerSeed);
        uint256 victimAssets = bound(uint256(victimInput), ASSET_UNIT, canaryCap - attackerSeed - donation);
        vault.setDepositCap(canaryCap);

        if (attackerSeed > 0) {
            _depositAs(attacker, attackerSeed);
        }
        if (donation > 0) {
            _donateAsAttacker(donation);
        }

        uint256 victimShares = _depositAs(victim, victimAssets);
        uint256 immediatelyRedeemable = vault.previewRedeem(victimShares);
        assertLe(immediatelyRedeemable, victimAssets);
        assertLe(victimAssets - immediatelyRedeemable, 49);
    }

    function testFuzzPositiveMintAlwaysRequiresAssets(uint96 seedInput, uint96 donationInput, uint96 sharesInput)
        public
    {
        uint256 attackerSeed = bound(uint256(seedInput), 0, 10_000 * ASSET_UNIT);
        uint256 donation = bound(uint256(donationInput), 0, 100_000 * ASSET_UNIT);
        if (attackerSeed > 0) {
            _depositAs(attacker, attackerSeed);
        }
        if (donation > 0) {
            _donateAsAttacker(donation);
        }

        uint256 affordableShares = vault.convertToShares(USER_BALANCE);
        assertGt(affordableShares, 0);
        uint256 shares = bound(uint256(sharesInput), 1, affordableShares);
        uint256 expectedAssets = vault.previewMint(shares);
        assertGt(expectedAssets, 0);
        assertLe(expectedAssets, USER_BALANCE);

        vm.prank(victim);
        uint256 chargedAssets = vault.mint(shares, victim);
        assertEq(chargedAssets, expectedAssets);
    }
}
