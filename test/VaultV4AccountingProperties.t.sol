// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../contracts/MockERC20.sol";
import {VaultV4} from "../contracts/VaultV4.sol";

contract VaultV4AccountingPropertiesTest is Test {
    uint256 internal constant ASSET_UNIT = 1e6;
    uint256 internal constant INITIAL_SUPPLY = 2_000_000 * ASSET_UNIT;
    uint256 internal constant ACTOR_BALANCE = 300_000 * ASSET_UNIT;

    MockERC20 internal usdc;
    VaultV4 internal vault;

    address internal incumbent;
    address internal actor;
    address internal holderTwo;
    address internal holderThree;

    function setUp() public {
        incumbent = makeAddr("incumbent");
        actor = makeAddr("actor");
        holderTwo = makeAddr("holderTwo");
        holderThree = makeAddr("holderThree");

        usdc = new MockERC20(INITIAL_SUPPLY);
        vault = new VaultV4(address(usdc));
        vault.setDepositCap(type(uint256).max);

        _fundAndApprove(incumbent);
        _fundAndApprove(actor);
        _fundAndApprove(holderTwo);
        _fundAndApprove(holderThree);
    }

    function _fundAndApprove(address account) internal {
        assertTrue(usdc.transfer(account, ACTOR_BALANCE));
        vm.prank(account);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _depositAs(address account, uint256 assets) internal returns (uint256 shares) {
        vm.prank(account);
        return vault.deposit(assets, account);
    }

    function _donate(uint256 assets) internal {
        if (assets > 0) {
            assertTrue(usdc.transfer(address(vault), assets));
        }
    }

    function _prepareOrdinaryRate(uint96 seedInput, uint96 donationInput)
        internal
        returns (uint256 seedAssets, uint256 donationAssets)
    {
        seedAssets = bound(uint256(seedInput), ASSET_UNIT, 100_000 * ASSET_UNIT);
        donationAssets = bound(uint256(donationInput), 0, seedAssets);
        _depositAs(incumbent, seedAssets);
        _donate(donationAssets);
    }

    function testFuzzAssetShareAssetViewRoundTripNeverIncreases(
        uint96 seedInput,
        uint96 donationInput,
        uint96 assetsInput
    ) public {
        _prepareOrdinaryRate(seedInput, donationInput);
        uint256 assets = bound(uint256(assetsInput), 1, 100_000 * ASSET_UNIT);

        uint256 shares = vault.convertToShares(assets);
        uint256 roundTripAssets = vault.convertToAssets(shares);

        assertLe(roundTripAssets, assets);
    }

    function testFuzzShareAssetShareViewRoundTripNeverIncreases(
        uint96 seedInput,
        uint96 donationInput,
        uint96 sharesInput
    ) public {
        _prepareOrdinaryRate(seedInput, donationInput);
        uint256 maxShares = vault.convertToShares(ACTOR_BALANCE);
        uint256 shares = bound(uint256(sharesInput), 1, maxShares);

        uint256 assets = vault.convertToAssets(shares);
        uint256 roundTripShares = vault.convertToShares(assets);

        assertLe(roundTripShares, shares);
    }

    function testFuzzDepositUsesGreatestSharesCoveredByAssets(
        uint96 seedInput,
        uint96 donationInput,
        uint96 assetsInput
    ) public {
        _prepareOrdinaryRate(seedInput, donationInput);
        uint256 assets = bound(uint256(assetsInput), 1, 100_000 * ASSET_UNIT);
        uint256 expectedShares = vault.previewDeposit(assets);
        assertGt(expectedShares, 0);

        assertLe(vault.previewMint(expectedShares), assets);
        assertGt(vault.previewMint(expectedShares + 1), assets);

        uint256 actorAssetsBefore = usdc.balanceOf(actor);
        uint256 actorSharesBefore = vault.balanceOf(actor);
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 supplyBefore = vault.totalSupply();

        uint256 mintedShares = _depositAs(actor, assets);

        assertEq(mintedShares, expectedShares);
        assertEq(usdc.balanceOf(actor) + assets, actorAssetsBefore);
        assertEq(vault.balanceOf(actor), actorSharesBefore + expectedShares);
        assertEq(vault.totalAssets(), managedAssetsBefore + assets);
        assertEq(vault.totalSupply(), supplyBefore + expectedShares);
    }

    function testFuzzMintUsesLeastAssetsCoveringShares(uint96 seedInput, uint96 donationInput, uint96 sharesInput)
        public
    {
        _prepareOrdinaryRate(seedInput, donationInput);
        uint256 affordableShares = vault.convertToShares(usdc.balanceOf(actor));
        assertGt(affordableShares, 0);
        uint256 shares = bound(uint256(sharesInput), 1, affordableShares);
        uint256 expectedAssets = vault.previewMint(shares);
        assertGt(expectedAssets, 0);

        assertGe(vault.previewDeposit(expectedAssets), shares);
        assertLt(vault.previewDeposit(expectedAssets - 1), shares);

        uint256 actorAssetsBefore = usdc.balanceOf(actor);
        uint256 actorSharesBefore = vault.balanceOf(actor);
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 supplyBefore = vault.totalSupply();

        vm.prank(actor);
        uint256 chargedAssets = vault.mint(shares, actor);

        assertEq(chargedAssets, expectedAssets);
        assertEq(usdc.balanceOf(actor) + expectedAssets, actorAssetsBefore);
        assertEq(vault.balanceOf(actor), actorSharesBefore + shares);
        assertEq(vault.totalAssets(), managedAssetsBefore + expectedAssets);
        assertEq(vault.totalSupply(), supplyBefore + shares);
    }

    function testFuzzWithdrawUsesLeastSharesCoveringAssets(uint96 seedInput, uint96 donationInput, uint96 assetsInput)
        public
    {
        _prepareOrdinaryRate(seedInput, donationInput);
        uint256 maxAssets = vault.maxWithdraw(incumbent);
        assertGt(maxAssets, 0);
        uint256 assets = bound(uint256(assetsInput), 1, maxAssets);
        uint256 expectedShares = vault.previewWithdraw(assets);
        assertGt(expectedShares, 0);

        assertGe(vault.previewRedeem(expectedShares), assets);
        assertLt(vault.previewRedeem(expectedShares - 1), assets);

        uint256 ownerAssetsBefore = usdc.balanceOf(incumbent);
        uint256 ownerSharesBefore = vault.balanceOf(incumbent);
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 supplyBefore = vault.totalSupply();

        vm.prank(incumbent);
        uint256 burnedShares = vault.withdraw(assets, incumbent, incumbent);

        assertEq(burnedShares, expectedShares);
        assertEq(usdc.balanceOf(incumbent), ownerAssetsBefore + assets);
        assertEq(vault.balanceOf(incumbent) + expectedShares, ownerSharesBefore);
        assertEq(vault.totalAssets() + assets, managedAssetsBefore);
        assertEq(vault.totalSupply() + expectedShares, supplyBefore);
    }

    function testFuzzRedeemUsesGreatestAssetsCoveredByShares(uint96 seedInput, uint96 donationInput, uint96 sharesInput)
        public
    {
        _prepareOrdinaryRate(seedInput, donationInput);
        uint256 ownerSharesBefore = vault.balanceOf(incumbent);
        uint256 shares = bound(uint256(sharesInput), 1, ownerSharesBefore);
        uint256 expectedAssets = vault.previewRedeem(shares);

        assertLe(vault.previewWithdraw(expectedAssets), shares);
        assertGt(vault.previewWithdraw(expectedAssets + 1), shares);

        uint256 ownerAssetsBefore = usdc.balanceOf(incumbent);
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 supplyBefore = vault.totalSupply();

        vm.prank(incumbent);
        uint256 returnedAssets = vault.redeem(shares, incumbent, incumbent);

        assertEq(returnedAssets, expectedAssets);
        assertEq(usdc.balanceOf(incumbent), ownerAssetsBefore + expectedAssets);
        assertEq(vault.balanceOf(incumbent) + shares, ownerSharesBefore);
        assertEq(vault.totalAssets() + expectedAssets, managedAssetsBefore);
        assertEq(vault.totalSupply() + shares, supplyBefore);
    }

    function testFuzzActualDepositRedeemRoundTripNeverProfits(
        uint96 seedInput,
        uint96 donationInput,
        uint96 assetsInput
    ) public {
        _prepareOrdinaryRate(seedInput, donationInput);
        uint256 assets = bound(uint256(assetsInput), 1, 100_000 * ASSET_UNIT);
        uint256 actorBalanceBefore = usdc.balanceOf(actor);
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 expectedShares = vault.previewDeposit(assets);
        assertGt(expectedShares, 0);

        uint256 mintedShares = _depositAs(actor, assets);
        assertEq(mintedShares, expectedShares);

        vm.prank(actor);
        uint256 assetsOut = vault.redeem(mintedShares, actor, actor);

        assertLe(assetsOut, assets);
        assertLe(usdc.balanceOf(actor), actorBalanceBefore);
        assertGe(vault.totalAssets(), managedAssetsBefore);
        assertEq(vault.balanceOf(actor), 0);
    }

    function testFuzzActualMintRedeemRoundTripNeverProfits(uint96 seedInput, uint96 donationInput, uint96 sharesInput)
        public
    {
        _prepareOrdinaryRate(seedInput, donationInput);
        uint256 actorBalanceBefore = usdc.balanceOf(actor);
        uint256 affordableShares = vault.convertToShares(actorBalanceBefore);
        uint256 shares = bound(uint256(sharesInput), 1, affordableShares);
        uint256 expectedAssets = vault.previewMint(shares);
        assertGt(expectedAssets, 0);
        assertLe(expectedAssets, actorBalanceBefore);

        vm.prank(actor);
        uint256 chargedAssets = vault.mint(shares, actor);
        assertEq(chargedAssets, expectedAssets);

        vm.prank(actor);
        uint256 assetsOut = vault.redeem(shares, actor, actor);

        assertLe(assetsOut, chargedAssets);
        assertLe(usdc.balanceOf(actor), actorBalanceBefore);
        assertEq(vault.balanceOf(actor), 0);
    }

    function testFuzzAggregateFloorClaimsNeverExceedTotalAssets(
        uint96 firstInput,
        uint96 secondInput,
        uint96 thirdInput,
        uint96 donationInput,
        uint96 remainingInput
    ) public {
        uint256 firstAssets = bound(uint256(firstInput), 1, 100_000 * ASSET_UNIT);
        uint256 secondAssets = bound(uint256(secondInput), 1, 100_000 * ASSET_UNIT);
        uint256 thirdAssets = bound(uint256(thirdInput), 1, 100_000 * ASSET_UNIT);
        uint256 donationAssets = bound(uint256(donationInput), 0, 100_000 * ASSET_UNIT);

        uint256 firstShares = _depositAs(incumbent, firstAssets);
        _depositAs(holderTwo, secondAssets);
        _depositAs(holderThree, thirdAssets);
        _donate(donationAssets);

        uint256 transferredShares = firstShares / 7;
        if (transferredShares > 0) {
            vm.prank(incumbent);
            assertTrue(vault.transfer(actor, transferredShares));
        }

        uint256 managedBeforeLoss = vault.totalAssets();
        uint256 remainingAssets = bound(uint256(remainingInput), 0, managedBeforeLoss);
        deal(address(usdc), address(vault), remainingAssets);

        _assertAggregateClaimsCovered();
    }

    function testAggregateClaimsRemainCoveredAfterSeventyFivePercentLoss() public {
        _depositAs(incumbent, 100 * ASSET_UNIT);
        _depositAs(holderTwo, 100 * ASSET_UNIT);
        _depositAs(holderThree, 100 * ASSET_UNIT);

        deal(address(usdc), address(vault), 75 * ASSET_UNIT);

        uint256 firstClaim = vault.previewRedeem(vault.balanceOf(incumbent));
        uint256 secondClaim = vault.previewRedeem(vault.balanceOf(holderTwo));
        uint256 thirdClaim = vault.previewRedeem(vault.balanceOf(holderThree));

        assertApproxEqAbs(firstClaim, secondClaim, 1);
        assertApproxEqAbs(secondClaim, thirdClaim, 1);
        assertLe(firstClaim + secondClaim + thirdClaim, vault.totalAssets());
        _assertAggregateClaimsCovered();
    }

    function _assertAggregateClaimsCovered() internal view {
        uint256 incumbentShares = vault.balanceOf(incumbent);
        uint256 actorShares = vault.balanceOf(actor);
        uint256 holderTwoShares = vault.balanceOf(holderTwo);
        uint256 holderThreeShares = vault.balanceOf(holderThree);
        assertEq(incumbentShares + actorShares + holderTwoShares + holderThreeShares, vault.totalSupply());

        uint256 summedClaims = vault.previewRedeem(incumbentShares) + vault.previewRedeem(actorShares)
            + vault.previewRedeem(holderTwoShares) + vault.previewRedeem(holderThreeShares);
        uint256 wholeSupplyClaim = vault.previewRedeem(vault.totalSupply());

        assertLe(summedClaims, wholeSupplyClaim);
        assertLe(wholeSupplyClaim - summedClaims, 3);
        assertLe(wholeSupplyClaim, vault.totalAssets());
    }
}
