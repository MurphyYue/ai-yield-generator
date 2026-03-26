// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/VaultV3.sol";
import "../contracts/AaveStrategy.sol";
import "../contracts/IStrategy.sol";
import "../contracts/MockERC20.sol";
import "../contracts/mocks/MockAavePool.sol";

/// @title AaveStrategy Test Suite
/// @notice Tests the Strategy Pattern: VaultV3 <-> AaveStrategy <-> MockAavePool
contract AaveStrategyTest is Test {
    VaultV3 public vault;
    AaveStrategy public aaveStrategy;
    MockERC20 public usdt;
    MockAavePool public mockPool;

    address public admin;
    address public treasurer;
    address public hacker;
    address public user1;

    uint256 constant USDT_DECIMALS = 6;
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 10 ** USDT_DECIMALS; // 1M USDT
    uint256 constant INVEST_AMOUNT = 500 * 10 ** USDT_DECIMALS;         // 500 USDT

    function setUp() public {
        admin = makeAddr("admin");
        treasurer = makeAddr("treasurer");
        hacker = makeAddr("hacker");
        user1 = makeAddr("user1");

        // Deploy token and pool mocks
        usdt = new MockERC20(INITIAL_SUPPLY);
        mockPool = new MockAavePool();

        // Deploy Vault (this test contract = deployer = gets all roles)
        vault = new VaultV3();

        // Deploy AaveStrategy pointing at vault, USDT, and MockAavePool
        aaveStrategy = new AaveStrategy(address(vault), address(usdt), address(mockPool));

        // Set strategy in vault (this contract has DEFAULT_ADMIN_ROLE)
        vault.setStrategy(address(aaveStrategy));

        // Grant treasurer role to treasurer address
        vault.grantTreasurerRole(treasurer);

        // Fund vault with USDT for testing
        usdt.transfer(address(vault), INVEST_AMOUNT * 2);
    }

    // ================================================================
    // SECTION 1: Access Control Tests
    // ================================================================

    /// @notice Only vault can call strategy.deposit()
    function testOnlyVaultCanDeposit() public {
        usdt.transfer(address(aaveStrategy), INVEST_AMOUNT);

        vm.prank(hacker);
        vm.expectRevert("AaveStrategy: caller is not the vault");
        aaveStrategy.deposit(INVEST_AMOUNT);
    }

    /// @notice Only vault can call strategy.withdraw()
    function testOnlyVaultCanWithdraw() public {
        vm.prank(hacker);
        vm.expectRevert("AaveStrategy: caller is not the vault");
        aaveStrategy.withdraw(INVEST_AMOUNT);
    }

    /// @notice Only vault can call strategy.emergencyWithdraw()
    function testOnlyVaultCanEmergencyWithdraw() public {
        vm.prank(hacker);
        vm.expectRevert("AaveStrategy: caller is not the vault");
        aaveStrategy.emergencyWithdraw();
    }

    /// @notice Only TREASURER_ROLE can call vault.invest()
    function testOnlyTreasurerCanInvest() public {
        vm.prank(hacker);
        vm.expectRevert();
        vault.invest(address(usdt), INVEST_AMOUNT);
    }

    /// @notice Only TREASURER_ROLE can call vault.divest()
    function testOnlyTreasurerCanDivest() public {
        // First invest so there's something to divest
        vault.invest(address(usdt), INVEST_AMOUNT);

        vm.prank(hacker);
        vm.expectRevert();
        vault.divest(INVEST_AMOUNT);
    }

    /// @notice Only DEFAULT_ADMIN_ROLE can call vault.setStrategy()
    function testOnlyAdminCanSetStrategy() public {
        vm.prank(hacker);
        vm.expectRevert();
        vault.setStrategy(address(aaveStrategy));
    }

    // ================================================================
    // SECTION 2: Happy Path Tests
    // ================================================================

    /// @notice vault.invest() moves tokens: vault → strategy → MockAavePool
    function testInvestMovesTokensToPool() public {
        uint256 vaultBalanceBefore = usdt.balanceOf(address(vault));

        vault.invest(address(usdt), INVEST_AMOUNT);

        // Vault balance decreases
        assertEq(usdt.balanceOf(address(vault)), vaultBalanceBefore - INVEST_AMOUNT);

        // Strategy holds nothing (tokens went straight to pool)
        assertEq(usdt.balanceOf(address(aaveStrategy)), 0);

        // Pool holds the tokens
        assertEq(usdt.balanceOf(address(mockPool)), INVEST_AMOUNT);

        // Strategy internal accounting is updated
        assertEq(aaveStrategy.totalAssets(), INVEST_AMOUNT);
    }

    /// @notice vault.divest() moves tokens back: MockAavePool → vault
    function testDivestMovesTokensBackToVault() public {
        vault.invest(address(usdt), INVEST_AMOUNT);

        uint256 vaultBalanceBefore = usdt.balanceOf(address(vault));

        vault.divest(INVEST_AMOUNT);

        // Vault gets tokens back
        assertEq(usdt.balanceOf(address(vault)), vaultBalanceBefore + INVEST_AMOUNT);

        // Pool is empty
        assertEq(usdt.balanceOf(address(mockPool)), 0);

        // Strategy accounting reset
        assertEq(aaveStrategy.totalAssets(), 0);
    }

    /// @notice vault.getTotalBalance() includes both vault and strategy balances
    function testGetTotalBalanceIncludesStrategyFunds() public {
        uint256 initialVaultBalance = usdt.balanceOf(address(vault));

        vault.invest(address(usdt), INVEST_AMOUNT);

        // getTotalBalance = tokens still in vault + tokens in strategy
        uint256 expected = initialVaultBalance; // same total — invest doesn't lose tokens
        assertEq(vault.getTotalBalance(address(usdt)), expected);

        // After divest, still same total
        vault.divest(INVEST_AMOUNT);
        assertEq(vault.getTotalBalance(address(usdt)), expected);
    }

    /// @notice Partial divest works correctly
    function testPartialDivest() public {
        vault.invest(address(usdt), INVEST_AMOUNT);

        uint256 half = INVEST_AMOUNT / 2;
        vault.divest(half);

        assertEq(aaveStrategy.totalAssets(), INVEST_AMOUNT - half);
        assertEq(usdt.balanceOf(address(mockPool)), INVEST_AMOUNT - half);
    }

    // ================================================================
    // SECTION 3: Failure Isolation (try/catch)
    // ================================================================

    /// @notice When Aave fails: tokens return to vault, vault is unaffected
    function testAaveFailureReturnsTokensToVault() public {
        // Enable Aave failure mode
        mockPool.setRevert(true);

        uint256 vaultBalanceBefore = usdt.balanceOf(address(vault));

        // invest() will revert with clean error (tokens are back in vault)
        vm.expectRevert("Strategy deposit failed - tokens returned to vault");
        vault.invest(address(usdt), INVEST_AMOUNT);

        // Vault balance is UNCHANGED — tokens never left (revert undoes the transfer)
        assertEq(usdt.balanceOf(address(vault)), vaultBalanceBefore);

        // Strategy has nothing
        assertEq(aaveStrategy.totalAssets(), 0);
    }

    /// @notice Normal deposit/withdraw still works when Aave is broken
    function testVaultOperationsUnaffectedByAaveFailure() public {
        // First invest successfully
        vault.invest(address(usdt), INVEST_AMOUNT);

        // Now Aave breaks
        mockPool.setRevert(true);

        // Users can still deposit USDT normally (unrelated to strategy)
        usdt.approve(address(vault), 100 * 10 ** USDT_DECIMALS);
        vault.depositToken(address(usdt), 100 * 10 ** USDT_DECIMALS);
        assertEq(vault.tokenBalances(address(usdt), address(this)), 100 * 10 ** USDT_DECIMALS);

        // Users can still withdraw their own funds
        vault.withdrawToken(address(usdt), 100 * 10 ** USDT_DECIMALS);
        assertEq(vault.tokenBalances(address(usdt), address(this)), 0);
    }

    // ================================================================
    // SECTION 4: Emergency
    // ================================================================

    /// @notice emergencyDivest pulls all funds from strategy back to vault
    function testEmergencyDivest() public {
        vault.invest(address(usdt), INVEST_AMOUNT);

        uint256 vaultBalanceBefore = usdt.balanceOf(address(vault));

        // Admin calls emergency divest
        vault.emergencyDivest();

        assertEq(usdt.balanceOf(address(vault)), vaultBalanceBefore + INVEST_AMOUNT);
        assertEq(aaveStrategy.totalAssets(), 0);
    }

    /// @notice strategy.underlyingToken() returns the correct token address
    function testStrategyMetadata() public view {
        assertEq(aaveStrategy.underlyingToken(), address(usdt));
        assertEq(aaveStrategy.vault(), address(vault));
    }
}
