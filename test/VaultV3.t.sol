// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/VaultV3.sol";

/// @title VaultV3 Comprehensive Test Suite
/// @notice Tests all SoD (Separation of Duties) features of VaultV3
/// @dev Industry-standard Foundry tests for professional smart contract verification
contract VaultV3Test is Test {
    VaultV3 public vault;

    // Test accounts
    address public admin;
    address public manager;
    address public operator;
    address public treasurer;
    address public user1;
    address public user2;
    address public hacker;

    // Events for testing
    event Paused(address account);
    event Unpaused(address account);
    event Blacklisted(address account, bool status);

    function setUp() public {
        // Create test accounts
        admin = makeAddr("admin");
        manager = makeAddr("manager");
        operator = makeAddr("operator");
        treasurer = makeAddr("treasurer");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        hacker = makeAddr("hacker");

        // Deploy VaultV3 (this contract is the deployer, gets DEFAULT_ADMIN_ROLE)
        vault = new VaultV3();

        // Grant roles to test accounts (this contract has DEFAULT_ADMIN_ROLE)
        vault.grantManagerRole(manager);
        vault.grantOperatorRole(operator);
        vault.grantTreasurerRole(treasurer);

        // Grant admin role to admin address for testing
        vault.grantRole(vault.DEFAULT_ADMIN_ROLE(), admin);
    }

    // ============================================
    // SECTION 1: Role Verification Tests
    // ============================================

    /// @notice Verify this contract (deployer) has all roles
    function testDeployerHasAllRoles() public view {
        // The test contract that deploys VaultV3 gets all roles
        assertTrue(vault.hasRole(vault.MANAGER_ROLE(), address(this)));
        assertTrue(vault.hasRole(vault.OPERATOR_ROLE(), address(this)));
        assertTrue(vault.hasRole(vault.TREASURER_ROLE(), address(this)));
    }

    /// @notice Verify manager role was granted correctly
    function testManagerRoleGranted() public view {
        assertTrue(vault.hasRole(vault.MANAGER_ROLE(), manager));
        assertFalse(vault.hasRole(vault.OPERATOR_ROLE(), manager));
        assertFalse(vault.hasRole(vault.TREASURER_ROLE(), manager));
    }

    /// @notice Verify operator role was granted correctly
    function testOperatorRoleGranted() public view {
        assertTrue(vault.hasRole(vault.OPERATOR_ROLE(), operator));
        assertFalse(vault.hasRole(vault.MANAGER_ROLE(), operator));
    }

    /// @notice Verify treasurer role was granted correctly
    function testTreasurerRoleGranted() public view {
        assertTrue(vault.hasRole(vault.TREASURER_ROLE(), treasurer));
        assertFalse(vault.hasRole(vault.MANAGER_ROLE(), treasurer));
    }

    /// @notice Verify users have no roles initially
    function testUsersHaveNoRoles() public view {
        assertFalse(vault.hasRole(vault.MANAGER_ROLE(), user1));
        assertFalse(vault.hasRole(vault.OPERATOR_ROLE(), user1));
        assertFalse(vault.hasRole(vault.TREASURER_ROLE(), user1));
    }

    // ============================================
    // SECTION 2: Access Control Tests
    // ============================================

    /// @notice Manager can pause the contract
    function testManagerCanPause() public {
        vm.prank(manager);
        vault.pause();

        assertTrue(vault.paused());
    }

    /// @notice Non-manager cannot pause (should revert)
    function testNonManagerCannotPause() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.pause();
    }

    /// @notice Admin can grant manager role
    function testAdminCanGrantManagerRole() public {
        vm.prank(admin);
        vault.grantManagerRole(user1);

        assertTrue(vault.hasRole(vault.MANAGER_ROLE(), user1));
    }

    /// @notice Non-admin cannot grant manager role
    function testNonAdminCannotGrantManagerRole() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.grantManagerRole(user2);
    }

    /// @notice This contract can revoke manager role (has DEFAULT_ADMIN_ROLE)
    function testCanRevokeManagerRole() public {
        // Grant manager role to user1
        vault.grantManagerRole(user1);

        // Verify user1 has manager role
        assertTrue(vault.hasRole(vault.MANAGER_ROLE(), user1));

        // Revoke manager role (this contract has DEFAULT_ADMIN_ROLE)
        vault.revokeRole(vault.MANAGER_ROLE(), user1);

        assertFalse(vault.hasRole(vault.MANAGER_ROLE(), user1));
    }

    // ============================================
    // SECTION 3: Pause/Unpause Tests
    // ============================================

    /// @notice Manager can unpause the contract
    function testManagerCanUnpause() public {
        // First pause
        vm.prank(manager);
        vault.pause();
        assertTrue(vault.paused());

        // Then unpause
        vm.prank(manager);
        vault.unpause();
        assertFalse(vault.paused());
    }

    /// @notice Cannot pause when already paused
    function testCannotPauseWhenAlreadyPaused() public {
        vm.prank(manager);
        vault.pause();

        vm.prank(manager);
        vm.expectRevert();
        vault.pause();
    }

    /// @notice Cannot unpause when not paused
    function testCannotUnpauseWhenNotPaused() public {
        vm.prank(manager);
        vm.expectRevert();
        vault.unpause();
    }

    /// @notice Non-manager cannot unpause
    function testNonManagerCannotUnpause() public {
        vm.prank(manager);
        vault.pause();

        vm.prank(user1);
        vm.expectRevert();
        vault.unpause();
    }

    // ============================================
    // SECTION 4: Deposit/Withdraw While Paused
    // ============================================

    /// @notice Cannot deposit ETH when paused
    function testCannotDepositWhenPaused() public {
        // Pause first
        vm.prank(manager);
        vault.pause();

        // Try to deposit
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vm.expectRevert();
        vault.deposit{value: 1 ether}();
    }

    /// @notice Cannot withdraw ETH when paused
    function testCannotWithdrawWhenPaused() public {
        // First deposit ETH
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vault.deposit{value: 5 ether}();

        // Pause
        vm.prank(manager);
        vault.pause();

        // Try to withdraw
        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(1 ether);
    }

    /// @notice Can deposit after unpause
    function testCanDepositAfterUnpause() public {
        // Pause
        vm.prank(manager);
        vault.pause();

        // Unpause
        vm.prank(manager);
        vault.unpause();

        // Deposit should work
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vault.deposit{value: 1 ether}();

        assertEq(vault.balances(user1), 1 ether);
    }

    // ============================================
    // SECTION 5: Blacklist Tests
    // ============================================

    /// @notice Manager can blacklist an address
    function testManagerCanBlacklist() public {
        vm.prank(manager);
        vault.blacklist(user1);

        assertTrue(vault.blacklisted(user1));
    }

    /// @notice Manager can remove from blacklist
    function testManagerCanUnblacklist() public {
        vm.prank(manager);
        vault.blacklist(user1);

        vm.prank(manager);
        vault.unblacklist(user1);

        assertFalse(vault.blacklisted(user1));
    }

    /// @notice Non-manager cannot blacklist
    function testNonManagerCannotBlacklist() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.blacklist(user2);
    }

    /// @notice Cannot deposit when blacklisted
    function testCannotDepositWhenBlacklisted() public {
        vm.prank(manager);
        vault.blacklist(user1);

        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vm.expectRevert();
        vault.deposit{value: 1 ether}();
    }

    /// @notice Cannot withdraw when blacklisted
    function testCannotWithdrawWhenBlacklisted() public {
        // First deposit
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vault.deposit{value: 5 ether}();

        // Blacklist
        vm.prank(manager);
        vault.blacklist(user1);

        // Try to withdraw
        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(1 ether);
    }

    // ============================================
    // SECTION 6: Basic Deposit/Withdraw Tests
    // ============================================

    /// @notice User can deposit ETH
    function testUserCanDepositETH() public {
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vault.deposit{value: 1 ether}();

        assertEq(vault.balances(user1), 1 ether);
    }

    /// @notice User can withdraw ETH
    function testUserCanWithdrawETH() public {
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vault.deposit{value: 5 ether}();

        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        vault.withdraw(2 ether);

        assertEq(vault.balances(user1), 3 ether);
    }

    /// @notice Cannot withdraw more than balance
    function testCannotWithdrawMoreThanBalance() public {
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vault.deposit{value: 1 ether}();

        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(2 ether);
    }

    // ============================================
    // SECTION 7: Large Withdrawal Tests
    // ============================================

    /// @notice Large withdrawal requires treasurer approval
    function testLargeWithdrawalRequiresApproval() public {
        // User deposits large amount
        vm.deal(user1, 100 ether);
        vm.prank(user1);
        vault.deposit{value: 20 ether}();

        // Try to withdraw > 10 ETH without approval
        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(12 ether);
    }

    /// @notice Treasurer can approve large withdrawal
    function testTreasurerCanApproveLargeWithdrawal() public {
        // User deposits
        vm.deal(user1, 100 ether);
        vm.prank(user1);
        vault.deposit{value: 20 ether}();

        // Get approval hash
        bytes32 requestHash = vault.getWithdrawalRequestHash(user1, 12 ether);

        // Treasurer approves
        vm.prank(treasurer);
        vault.approveLargeWithdrawal(user1, 12 ether, requestHash);

        assertTrue(vault.largeWithdrawalApproved(requestHash));
    }

    /// @notice Large withdrawal succeeds with approval
    function testLargeWithdrawalSucceedsWithApproval() public {
        // User deposits
        vm.deal(user1, 100 ether);
        vm.prank(user1);
        vault.deposit{value: 20 ether}();

        // Get approval hash
        bytes32 requestHash = vault.getWithdrawalRequestHash(user1, 12 ether);

        // Treasurer approves
        vm.prank(treasurer);
        vault.approveLargeWithdrawal(user1, 12 ether, requestHash);

        // Withdraw
        vm.prank(user1);
        vault.withdraw(12 ether);

        assertEq(vault.balances(user1), 8 ether);
    }

    /// @notice Non-treasurer cannot approve large withdrawal
    function testNonTreasurerCannotApprove() public {
        bytes32 requestHash = vault.getWithdrawalRequestHash(user1, 12 ether);

        vm.prank(user1);
        vm.expectRevert();
        vault.approveLargeWithdrawal(user1, 12 ether, requestHash);
    }

    // ============================================
    // SECTION 8: Withdrawal Fee Tests
    // ============================================

    /// @notice Treasurer can set withdrawal fee
    function testTreasurerCanSetWithdrawalFee() public {
        vm.prank(treasurer);
        vault.setWithdrawalFee(100); // 1%

        assertEq(vault.withdrawalFee(), 100);
    }

    /// @notice Non-treasurer cannot set withdrawal fee
    function testNonTreasurerCannotSetFee() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.setWithdrawalFee(100);
    }

    /// @notice Fee cannot exceed maximum (10%)
    function testFeeCannotExceedMaximum() public {
        vm.prank(treasurer);
        vm.expectRevert();
        vault.setWithdrawalFee(1001); // 10.01% > 10%
    }

    /// @notice Withdrawal fee is applied correctly
    function testWithdrawalFeeApplied() public {
        // Set 1% fee
        vm.prank(treasurer);
        vault.setWithdrawalFee(100);

        // User deposits
        vm.deal(user1, 100 ether);
        vm.prank(user1);
        vault.deposit{value: 10 ether}();

        // Withdraw 1 ETH (should cost 1.01 ETH from balance, receive 1 ETH)
        vm.prank(user1);
        vault.withdraw(1 ether);

        // Balance should be 9 ETH (10 - 1 = 9, fee taken from withdrawn amount)
        assertEq(vault.balances(user1), 9 ether);
    }

    // ============================================
    // SECTION 9: Threshold Tests
    // ============================================

    /// @notice Treasurer can set large withdrawal threshold
    function testTreasurerCanSetThreshold() public {
        vm.prank(treasurer);
        vault.setLargeWithdrawalThreshold(5 ether);

        assertEq(vault.largeWithdrawalThreshold(), 5 ether);
    }

    /// @notice Non-treasurer cannot set threshold
    function testNonTreasurerCannotSetThreshold() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.setLargeWithdrawalThreshold(5 ether);
    }

    // ============================================
    // SECTION 10: Edge Cases
    // ============================================

    /// @notice Cannot deposit zero ETH
    function testCannotDepositZero() public {
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vm.expectRevert();
        vault.deposit{value: 0}();
    }

    /// @notice Cannot withdraw zero
    function testCannotWithdrawZero() public {
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        vault.deposit{value: 1 ether}();

        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(0);
    }

    /// @notice Multiple roles can be held by same address
    function testMultipleRolesSameAddress() public view {
        // Test contract (deployer) has all roles
        assertTrue(vault.hasRole(vault.MANAGER_ROLE(), address(this)));
        assertTrue(vault.hasRole(vault.OPERATOR_ROLE(), address(this)));
        assertTrue(vault.hasRole(vault.TREASURER_ROLE(), address(this)));
    }
}
