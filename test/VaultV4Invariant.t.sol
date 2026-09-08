// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {AaveStrategy} from "../contracts/AaveStrategy.sol";
import {MockERC20} from "../contracts/MockERC20.sol";
import {VaultV4} from "../contracts/VaultV4.sol";
import {MockAToken} from "../contracts/mocks/MockAToken.sol";
import {MockAavePool} from "../contracts/mocks/MockAavePool.sol";

/// @notice Stateful action handler for the live VaultV4 and AaveStrategy accounting path.
/// @dev Expected-empty actions return early. Every attempted state transition is expected to succeed.
contract VaultV4Handler is Test {
    uint256 public constant ACTOR_COUNT = 4;
    uint256 public constant ASSET_UNIT = 1e6;
    uint256 public constant SHARE_UNIT = 1e12;
    uint256 public constant MAX_ASSETS_PER_ACTION = 100_000 * ASSET_UNIT;
    uint256 public constant MAX_SHARES_PER_ACTION = 100_000 * SHARE_UNIT;

    MockERC20 public immutable assetToken;
    VaultV4 public immutable vault;
    AaveStrategy public immutable strategy;
    MockAavePool public immutable pool;
    MockAToken public immutable aToken;
    address public immutable yieldSource;

    address[ACTOR_COUNT] private _actors;

    uint256 public immutable ghostInitialManagedAssets;
    uint256 public immutable ghostInitialShareSupply;
    uint256 public ghostEnteredAssets;
    uint256 public ghostExitedAssets;
    uint256 public ghostVaultDonations;
    uint256 public ghostStrategyDonations;
    uint256 public ghostYield;
    uint256 public ghostATokenLoss;
    uint256 public ghostSharesMinted;
    uint256 public ghostSharesBurned;

    uint256 public depositCalls;
    uint256 public mintCalls;
    uint256 public withdrawCalls;
    uint256 public redeemCalls;
    uint256 public transferCalls;
    uint256 public donationCalls;
    uint256 public yieldCalls;
    uint256 public lossCalls;
    uint256 public investCalls;
    uint256 public divestCalls;

    struct ShareSnapshot {
        uint256 totalSupply;
        uint256[ACTOR_COUNT] balances;
        uint256[ACTOR_COUNT] claims;
    }

    constructor(
        MockERC20 assetToken_,
        VaultV4 vault_,
        AaveStrategy strategy_,
        MockAavePool pool_,
        MockAToken aToken_,
        address[ACTOR_COUNT] memory actors_,
        address yieldSource_
    ) {
        assetToken = assetToken_;
        vault = vault_;
        strategy = strategy_;
        pool = pool_;
        aToken = aToken_;
        yieldSource = yieldSource_;
        _actors = actors_;

        ghostInitialManagedAssets = vault_.totalAssets();
        ghostInitialShareSupply = vault_.totalSupply();
    }

    function actorAt(uint256 index) external view returns (address) {
        return _actors[index];
    }

    function deposit(uint256 actorSeed, uint256 assetsSeed) external {
        address actor = _actor(actorSeed);
        uint256 maxAssets = _min(assetToken.balanceOf(actor), vault.maxDeposit(actor));
        maxAssets = _min(maxAssets, MAX_ASSETS_PER_ACTION);

        uint256 minAssets = vault.previewMint(1);
        if (maxAssets < minAssets) return;

        uint256 assets = bound(assetsSeed, minAssets, maxAssets);
        uint256 expectedShares = vault.previewDeposit(assets);
        assertGt(expectedShares, 0);

        uint256 actorAssetsBefore = assetToken.balanceOf(actor);
        uint256 actorSharesBefore = vault.balanceOf(actor);
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 supplyBefore = vault.totalSupply();

        vm.prank(actor);
        uint256 mintedShares = vault.deposit(assets, actor);

        assertEq(mintedShares, expectedShares);
        assertEq(assetToken.balanceOf(actor) + assets, actorAssetsBefore);
        assertEq(vault.balanceOf(actor), actorSharesBefore + mintedShares);
        assertEq(vault.totalAssets(), managedAssetsBefore + assets);
        assertEq(vault.totalSupply(), supplyBefore + mintedShares);

        ghostEnteredAssets += assets;
        ghostSharesMinted += mintedShares;
        depositCalls += 1;
    }

    function mint(uint256 actorSeed, uint256 sharesSeed) external {
        address actor = _actor(actorSeed);
        uint256 affordableShares = vault.convertToShares(assetToken.balanceOf(actor));
        uint256 maxShares = _min(vault.maxMint(actor), affordableShares);
        maxShares = _min(maxShares, MAX_SHARES_PER_ACTION);
        if (maxShares == 0) return;

        uint256 shares = bound(sharesSeed, 1, maxShares);
        uint256 expectedAssets = vault.previewMint(shares);
        assertGt(expectedAssets, 0);
        assertLe(expectedAssets, assetToken.balanceOf(actor));

        uint256 actorAssetsBefore = assetToken.balanceOf(actor);
        uint256 actorSharesBefore = vault.balanceOf(actor);
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 supplyBefore = vault.totalSupply();

        vm.prank(actor);
        uint256 chargedAssets = vault.mint(shares, actor);

        assertEq(chargedAssets, expectedAssets);
        assertEq(assetToken.balanceOf(actor) + chargedAssets, actorAssetsBefore);
        assertEq(vault.balanceOf(actor), actorSharesBefore + shares);
        assertEq(vault.totalAssets(), managedAssetsBefore + chargedAssets);
        assertEq(vault.totalSupply(), supplyBefore + shares);

        ghostEnteredAssets += chargedAssets;
        ghostSharesMinted += shares;
        mintCalls += 1;
    }

    function withdraw(uint256 actorSeed, uint256 assetsSeed) external {
        address actor = _actor(actorSeed);
        uint256 maxAssets = _min(vault.maxWithdraw(actor), MAX_ASSETS_PER_ACTION);
        if (maxAssets == 0) return;

        uint256 assets = bound(assetsSeed, 1, maxAssets);
        uint256 expectedShares = vault.previewWithdraw(assets);
        uint256 actorAssetsBefore = assetToken.balanceOf(actor);
        uint256 actorSharesBefore = vault.balanceOf(actor);
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 supplyBefore = vault.totalSupply();

        vm.prank(actor);
        uint256 burnedShares = vault.withdraw(assets, actor, actor);

        assertEq(burnedShares, expectedShares);
        assertEq(assetToken.balanceOf(actor), actorAssetsBefore + assets);
        assertEq(vault.balanceOf(actor) + burnedShares, actorSharesBefore);
        assertEq(vault.totalAssets() + assets, managedAssetsBefore);
        assertEq(vault.totalSupply() + burnedShares, supplyBefore);

        ghostExitedAssets += assets;
        ghostSharesBurned += burnedShares;
        withdrawCalls += 1;
    }

    function redeem(uint256 actorSeed, uint256 sharesSeed) external {
        address actor = _actor(actorSeed);
        uint256 maxShares = _min(vault.maxRedeem(actor), MAX_SHARES_PER_ACTION);
        if (maxShares == 0) return;

        uint256 shares = bound(sharesSeed, 1, maxShares);
        uint256 expectedAssets = vault.previewRedeem(shares);
        uint256 actorAssetsBefore = assetToken.balanceOf(actor);
        uint256 actorSharesBefore = vault.balanceOf(actor);
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 supplyBefore = vault.totalSupply();

        vm.prank(actor);
        uint256 returnedAssets = vault.redeem(shares, actor, actor);

        assertEq(returnedAssets, expectedAssets);
        assertEq(assetToken.balanceOf(actor), actorAssetsBefore + returnedAssets);
        assertEq(vault.balanceOf(actor) + shares, actorSharesBefore);
        assertEq(vault.totalAssets() + returnedAssets, managedAssetsBefore);
        assertEq(vault.totalSupply() + shares, supplyBefore);

        ghostExitedAssets += returnedAssets;
        ghostSharesBurned += shares;
        redeemCalls += 1;
    }

    function transferShares(uint256 fromSeed, uint256 toSeed, uint256 sharesSeed) external {
        uint256 fromIndex = fromSeed % ACTOR_COUNT;
        address from = _actors[fromIndex];
        address to = _actors[(fromIndex + 1 + (toSeed % (ACTOR_COUNT - 1))) % ACTOR_COUNT];
        uint256 maxShares = _min(vault.balanceOf(from), MAX_SHARES_PER_ACTION);
        if (maxShares == 0) return;

        uint256 shares = bound(sharesSeed, 1, maxShares);
        uint256 fromSharesBefore = vault.balanceOf(from);
        uint256 toSharesBefore = vault.balanceOf(to);
        uint256 supplyBefore = vault.totalSupply();
        uint256 managedAssetsBefore = vault.totalAssets();

        vm.prank(from);
        assertTrue(vault.transfer(to, shares));

        assertEq(vault.balanceOf(from) + shares, fromSharesBefore);
        assertEq(vault.balanceOf(to), toSharesBefore + shares);
        assertEq(vault.totalSupply(), supplyBefore);
        assertEq(vault.totalAssets(), managedAssetsBefore);
        transferCalls += 1;
    }

    function donate(uint256 actorSeed, uint256 destinationSeed, uint256 assetsSeed) external {
        address actor = _actor(actorSeed);
        uint256 maxAssets = _min(assetToken.balanceOf(actor), MAX_ASSETS_PER_ACTION);
        if (maxAssets == 0) return;

        uint256 assets = bound(assetsSeed, 1, maxAssets);
        address recipient = destinationSeed % 2 == 0 ? address(vault) : address(strategy);
        ShareSnapshot memory sharesBefore = _shareSnapshot();
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 actorAssetsBefore = assetToken.balanceOf(actor);

        vm.prank(actor);
        assertTrue(assetToken.transfer(recipient, assets));

        assertEq(assetToken.balanceOf(actor) + assets, actorAssetsBefore);
        assertEq(vault.totalAssets(), managedAssetsBefore + assets);
        _assertSharesUnchanged(sharesBefore);
        _assertClaimsDidNotDecrease(sharesBefore);

        if (recipient == address(vault)) {
            ghostVaultDonations += assets;
        } else {
            ghostStrategyDonations += assets;
        }
        donationCalls += 1;
    }

    function accrueYield(uint256 assetsSeed) external {
        uint256 maxAssets = _min(aToken.balanceOf(address(strategy)), assetToken.balanceOf(yieldSource));
        maxAssets = _min(maxAssets, MAX_ASSETS_PER_ACTION);
        if (maxAssets == 0) return;

        uint256 assets = bound(assetsSeed, 1, maxAssets);
        ShareSnapshot memory sharesBefore = _shareSnapshot();
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 poolBackingBefore = assetToken.balanceOf(address(pool));
        uint256 receiptSupplyBefore = aToken.totalSupply();

        vm.prank(yieldSource);
        pool.addBackedYield(address(assetToken), address(strategy), assets);

        assertEq(vault.totalAssets(), managedAssetsBefore + assets);
        assertEq(assetToken.balanceOf(address(pool)), poolBackingBefore + assets);
        assertEq(aToken.totalSupply(), receiptSupplyBefore + assets);
        _assertSharesUnchanged(sharesBefore);
        _assertClaimsDidNotDecrease(sharesBefore);

        ghostYield += assets;
        yieldCalls += 1;
    }

    function applyLoss(uint256 assetsSeed) external {
        uint256 maxAssets = _min(aToken.balanceOf(address(strategy)), MAX_ASSETS_PER_ACTION);
        if (maxAssets == 0) return;

        uint256 assets = bound(assetsSeed, 1, maxAssets);
        ShareSnapshot memory sharesBefore = _shareSnapshot();
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 poolBackingBefore = assetToken.balanceOf(address(pool));
        uint256 receiptSupplyBefore = aToken.totalSupply();

        pool.applyATokenLoss(address(assetToken), address(strategy), assets);

        assertEq(vault.totalAssets() + assets, managedAssetsBefore);
        assertEq(assetToken.balanceOf(address(pool)), poolBackingBefore);
        assertEq(aToken.totalSupply() + assets, receiptSupplyBefore);
        _assertSharesUnchanged(sharesBefore);
        _assertClaimsDidNotIncrease(sharesBefore);

        ghostATokenLoss += assets;
        lossCalls += 1;
    }

    function invest(uint256 assetsSeed) external {
        uint256 maxAssets = _min(assetToken.balanceOf(address(vault)), MAX_ASSETS_PER_ACTION);
        if (maxAssets == 0) return;

        uint256 assets = bound(assetsSeed, 1, maxAssets);
        ShareSnapshot memory sharesBefore = _shareSnapshot();
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 vaultIdleBefore = assetToken.balanceOf(address(vault));
        uint256 strategyAssetsBefore = strategy.totalAssets();
        uint256 poolBackingBefore = assetToken.balanceOf(address(pool));
        uint256 receiptSupplyBefore = aToken.totalSupply();

        vault.invest(assets);

        assertEq(vault.totalAssets(), managedAssetsBefore);
        assertEq(assetToken.balanceOf(address(vault)) + assets, vaultIdleBefore);
        assertEq(strategy.totalAssets(), strategyAssetsBefore + assets);
        assertEq(assetToken.balanceOf(address(pool)), poolBackingBefore + assets);
        assertEq(aToken.totalSupply(), receiptSupplyBefore + assets);
        _assertSharesAndClaimsUnchanged(sharesBefore);
        investCalls += 1;
    }

    function divest(uint256 assetsSeed) external {
        uint256 maxAssets = _min(strategy.totalAssets(), MAX_ASSETS_PER_ACTION);
        if (maxAssets == 0) return;

        uint256 assets = bound(assetsSeed, 1, maxAssets);
        ShareSnapshot memory sharesBefore = _shareSnapshot();
        uint256 managedAssetsBefore = vault.totalAssets();
        uint256 vaultIdleBefore = assetToken.balanceOf(address(vault));
        uint256 strategyAssetsBefore = strategy.totalAssets();

        vault.divest(assets, assets);

        assertEq(vault.totalAssets(), managedAssetsBefore);
        assertEq(assetToken.balanceOf(address(vault)), vaultIdleBefore + assets);
        assertEq(strategy.totalAssets() + assets, strategyAssetsBefore);
        _assertSharesAndClaimsUnchanged(sharesBefore);
        divestCalls += 1;
    }

    function _actor(uint256 seed) private view returns (address) {
        return _actors[seed % ACTOR_COUNT];
    }

    function _shareSnapshot() private view returns (ShareSnapshot memory snapshot) {
        snapshot.totalSupply = vault.totalSupply();
        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            uint256 actorShares = vault.balanceOf(_actors[i]);
            snapshot.balances[i] = actorShares;
            snapshot.claims[i] = vault.previewRedeem(actorShares);
        }
    }

    function _assertSharesUnchanged(ShareSnapshot memory beforeSnapshot) private view {
        assertEq(vault.totalSupply(), beforeSnapshot.totalSupply);
        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            assertEq(vault.balanceOf(_actors[i]), beforeSnapshot.balances[i]);
        }
    }

    function _assertSharesAndClaimsUnchanged(ShareSnapshot memory beforeSnapshot) private view {
        _assertSharesUnchanged(beforeSnapshot);
        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            assertEq(vault.previewRedeem(beforeSnapshot.balances[i]), beforeSnapshot.claims[i]);
        }
    }

    function _assertClaimsDidNotDecrease(ShareSnapshot memory beforeSnapshot) private view {
        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            assertGe(vault.previewRedeem(beforeSnapshot.balances[i]), beforeSnapshot.claims[i]);
        }
    }

    function _assertClaimsDidNotIncrease(ShareSnapshot memory beforeSnapshot) private view {
        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            assertLe(vault.previewRedeem(beforeSnapshot.balances[i]), beforeSnapshot.claims[i]);
        }
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}

contract VaultV4InvariantTest is StdInvariant, Test {
    uint256 internal constant ACTOR_COUNT = 4;
    uint256 internal constant ASSET_UNIT = 1e6;
    uint256 internal constant SHARE_UNIT = 1e12;
    uint256 internal constant INITIAL_SUPPLY = 10_000_000 * ASSET_UNIT;
    uint256 internal constant ACTOR_FUNDING = 1_000_000 * ASSET_UNIT;
    uint256 internal constant YIELD_FUNDING = 1_000_000 * ASSET_UNIT;
    uint256 internal constant SEED_DEPOSIT = 100 * ASSET_UNIT;

    MockERC20 internal assetToken;
    VaultV4 internal vault;
    AaveStrategy internal strategy;
    MockAavePool internal pool;
    MockAToken internal aToken;
    VaultV4Handler internal handler;

    address[ACTOR_COUNT] internal actors;
    address internal yieldSource;

    function setUp() public {
        actors[0] = makeAddr("invariant actor 0");
        actors[1] = makeAddr("invariant actor 1");
        actors[2] = makeAddr("invariant actor 2");
        actors[3] = makeAddr("invariant actor 3");
        yieldSource = makeAddr("invariant yield source");

        assetToken = new MockERC20(INITIAL_SUPPLY);
        vault = new VaultV4(address(assetToken));
        pool = new MockAavePool();
        aToken = new MockAToken(address(assetToken), address(pool));
        pool.configureReserve(address(assetToken), address(aToken));
        strategy = new AaveStrategy(address(vault), address(assetToken), address(pool));
        vault.setStrategy(address(strategy));
        vault.setDepositCap(type(uint256).max);

        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            assertTrue(assetToken.transfer(actors[i], ACTOR_FUNDING));
            vm.prank(actors[i]);
            assetToken.approve(address(vault), type(uint256).max);
        }

        assertTrue(assetToken.transfer(yieldSource, YIELD_FUNDING));
        vm.prank(yieldSource);
        assetToken.approve(address(pool), type(uint256).max);

        vm.prank(actors[0]);
        vault.deposit(SEED_DEPOSIT, actors[0]);
        vm.prank(actors[1]);
        vault.deposit(SEED_DEPOSIT, actors[1]);
        vault.invest(SEED_DEPOSIT);

        handler = new VaultV4Handler(assetToken, vault, strategy, pool, aToken, actors, yieldSource);
        vault.grantOperatorRole(address(handler));

        bytes4[] memory selectors = new bytes4[](10);
        selectors[0] = VaultV4Handler.deposit.selector;
        selectors[1] = VaultV4Handler.mint.selector;
        selectors[2] = VaultV4Handler.withdraw.selector;
        selectors[3] = VaultV4Handler.redeem.selector;
        selectors[4] = VaultV4Handler.transferShares.selector;
        selectors[5] = VaultV4Handler.donate.selector;
        selectors[6] = VaultV4Handler.accrueYield.selector;
        selectors[7] = VaultV4Handler.applyLoss.selector;
        selectors[8] = VaultV4Handler.invest.selector;
        selectors[9] = VaultV4Handler.divest.selector;
        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariant_reportedAssetsMatchBalancesAndGhostFlows() public view {
        uint256 balanceDerivedAssets = assetToken.balanceOf(address(vault)) + assetToken.balanceOf(address(strategy))
            + aToken.balanceOf(address(strategy));
        assertEq(vault.totalAssets(), balanceDerivedAssets);

        uint256 accountedAfterOutflows = vault.totalAssets() + handler.ghostExitedAssets() + handler.ghostATokenLoss();
        uint256 accountedInflows = handler.ghostInitialManagedAssets() + handler.ghostEnteredAssets()
            + handler.ghostVaultDonations() + handler.ghostStrategyDonations() + handler.ghostYield();
        assertEq(accountedAfterOutflows, accountedInflows);
    }

    function invariant_poolBackingTracksReceiptSupplyAndRealizedLoss() public view {
        uint256 poolBacking = assetToken.balanceOf(address(pool));
        uint256 receiptSupply = aToken.totalSupply();
        assertGe(poolBacking, receiptSupply);
        assertEq(poolBacking, receiptSupply + handler.ghostATokenLoss());
    }

    function invariant_allSharesBelongToTrackedActors() public view {
        uint256 trackedShares;
        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            trackedShares += vault.balanceOf(actors[i]);
        }

        assertEq(vault.totalSupply(), trackedShares);
        assertEq(
            vault.totalSupply() + handler.ghostSharesBurned(),
            handler.ghostInitialShareSupply() + handler.ghostSharesMinted()
        );
    }

    function invariant_aggregateClaimsRemainCovered() public view {
        uint256 summedClaims;
        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            summedClaims += vault.previewRedeem(vault.balanceOf(actors[i]));
        }

        uint256 wholeSupplyClaim = vault.previewRedeem(vault.totalSupply());
        assertLe(summedClaims, wholeSupplyClaim);
        assertLe(wholeSupplyClaim, vault.totalAssets());
        assertLe(wholeSupplyClaim - summedClaims, ACTOR_COUNT - 1);
    }

    function invariant_idleLiquidityLimitsAreExact() public view {
        assertFalse(vault.paused());
        uint256 idleAssets = assetToken.balanceOf(address(vault));

        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            address actor = actors[i];
            uint256 actorShares = vault.balanceOf(actor);
            uint256 actorClaim = vault.previewRedeem(actorShares);
            uint256 expectedMaxWithdraw = actorClaim < idleAssets ? actorClaim : idleAssets;
            assertEq(vault.maxWithdraw(actor), expectedMaxWithdraw);

            uint256 maxRedeem = vault.maxRedeem(actor);
            assertLe(maxRedeem, actorShares);

            if (actorShares == 0 || idleAssets == 0) {
                assertEq(maxRedeem, 0);
            } else if (actorClaim <= idleAssets) {
                assertEq(maxRedeem, actorShares);
            } else {
                assertEq(maxRedeem, vault.previewWithdraw(idleAssets + 1) - 1);
                assertGt(vault.previewRedeem(maxRedeem + 1), idleAssets);
            }

            assertLe(vault.previewRedeem(maxRedeem), idleAssets);
        }
    }

    function invariant_underlyingSupplyIsPhysicallyConserved() public view {
        uint256 accountedSupply = assetToken.balanceOf(address(this)) + assetToken.balanceOf(address(handler))
            + assetToken.balanceOf(yieldSource) + assetToken.balanceOf(address(vault))
            + assetToken.balanceOf(address(strategy)) + assetToken.balanceOf(address(pool))
            + assetToken.balanceOf(address(aToken));

        for (uint256 i = 0; i < ACTOR_COUNT; ++i) {
            accountedSupply += assetToken.balanceOf(actors[i]);
        }

        assertEq(accountedSupply, assetToken.totalSupply());
    }

    function invariant_configurationRemainsBound() public view {
        assertEq(vault.asset(), address(assetToken));
        assertEq(address(vault.strategy()), address(strategy));
        assertEq(strategy.vault(), address(vault));
        assertEq(strategy.underlyingToken(), address(assetToken));
        assertEq(strategy.aavePool(), address(pool));
        assertEq(strategy.aToken(), address(aToken));
        assertEq(aToken.POOL(), address(pool));
        assertEq(aToken.UNDERLYING_ASSET_ADDRESS(), address(assetToken));
    }

    function testHandlerActionsAreReachable() public {
        handler.deposit(2, ASSET_UNIT);
        handler.mint(3, SHARE_UNIT);
        handler.withdraw(0, ASSET_UNIT);
        handler.redeem(1, SHARE_UNIT);
        handler.transferShares(0, 1, SHARE_UNIT);
        handler.donate(3, 0, ASSET_UNIT);
        handler.donate(2, 1, ASSET_UNIT);
        handler.accrueYield(ASSET_UNIT);
        handler.applyLoss(ASSET_UNIT);
        handler.invest(ASSET_UNIT);
        handler.divest(ASSET_UNIT);

        assertEq(handler.depositCalls(), 1);
        assertEq(handler.mintCalls(), 1);
        assertEq(handler.withdrawCalls(), 1);
        assertEq(handler.redeemCalls(), 1);
        assertEq(handler.transferCalls(), 1);
        assertEq(handler.donationCalls(), 2);
        assertEq(handler.ghostVaultDonations(), ASSET_UNIT);
        assertEq(handler.ghostStrategyDonations(), ASSET_UNIT);
        assertEq(handler.yieldCalls(), 1);
        assertEq(handler.lossCalls(), 1);
        assertEq(handler.investCalls(), 1);
        assertEq(handler.divestCalls(), 1);

        invariant_reportedAssetsMatchBalancesAndGhostFlows();
        invariant_poolBackingTracksReceiptSupplyAndRealizedLoss();
        invariant_allSharesBelongToTrackedActors();
        invariant_aggregateClaimsRemainCovered();
        invariant_idleLiquidityLimitsAreExact();
        invariant_underlyingSupplyIsPhysicallyConserved();
        invariant_configurationRemainsBound();
    }
}
