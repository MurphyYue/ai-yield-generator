// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/VaultV3.sol";
import "../contracts/MockERC20.sol";

/// @title VaultV3 EIP-2612 Permit Test Suite
/// @notice Tests intent-based interactions with permit signatures
/// @dev Mission M: EIP-2612 Permit Testing
contract VaultV3PermitTest is Test {
    VaultV3 public vault;
    MockERC20 public usdt;

    // Test accounts
    address public owner;
    address public user1;
    uint256 public ownerPrivateKey;

    // Permit constants
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    function setUp() public {
        // Generate test private key (DO NOT use in production!)
        ownerPrivateKey = 0xA11CE;
        owner = vm.addr(ownerPrivateKey);
        user1 = makeAddr("user1");

        // Deploy contracts
        usdt = new MockERC20(1000000 * 10**6); // 1M USDT
        vault = new VaultV3();

        // Give owner some USDT
        usdt.transfer(owner, 10000 * 10**6); // 10,000 USDT
    }

    /// @dev Helper: Create EIP-2612 permit signature
    function createPermitSignature(
        address token,
        address ownerAddr,
        address spender,
        uint256 value,
        uint256 deadline,
        uint256 privateKey
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        // Get token info
        string memory name = MockERC20(token).name();
        uint256 nonce = MockERC20(token).nonces(ownerAddr);

        // Build domain separator
        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                token
            )
        );

        // Build permit struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                ownerAddr,
                spender,
                value,
                nonce,
                deadline
            )
        );

        // Build digest
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        // Sign
        (v, r, s) = vm.sign(privateKey, digest);
    }

    // ============================================
    // TEST 1: Basic Permit Deposit
    // ============================================

    function test_PermitDeposit_Basic() public {
        uint256 depositAmount = 1000 * 10**6; // 1,000 USDT
        uint256 deadline = block.timestamp + 1 hours;

        // Create permit signature
        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            depositAmount,
            deadline,
            ownerPrivateKey
        );

        // Verify initial state
        assertEq(usdt.balanceOf(owner), 10000 * 10**6, "Owner initial balance");
        assertEq(usdt.allowance(owner, address(vault)), 0, "Initial allowance should be 0");
        assertEq(vault.getTokenBalance(address(usdt), owner), 0, "Initial vault balance");

        // Execute permit deposit as owner (one transaction!)
        vm.prank(owner);
        vault.depositWithPermit(
            address(usdt),
            depositAmount,
            owner,
            deadline,
            v,
            r,
            s
        );

        // Verify final state
        assertEq(usdt.balanceOf(owner), 9000 * 10**6, "Owner balance after deposit");
        assertEq(vault.getTokenBalance(address(usdt), owner), depositAmount, "Vault balance should increase");
        assertEq(usdt.allowance(owner, address(vault)), 0, "Allowance should be 0 (used up)");
    }

    // ============================================
    // TEST 2: Permit vs Traditional Flow
    // ============================================

    function test_PermitDeposit_vsTraditionalFlow() public {
        uint256 depositAmount = 500 * 10**6; // 500 USDT

        // Traditional flow (2 transactions)
        vm.prank(owner);
        usdt.approve(address(vault), depositAmount);
        assertEq(usdt.allowance(owner, address(vault)), depositAmount, "Allowance after approve");

        vm.prank(owner);
        vault.depositToken(address(usdt), depositAmount);
        assertEq(vault.getTokenBalance(address(usdt), owner), depositAmount, "Balance after traditional deposit");

        // Reset state
        vm.prank(owner);
        vault.withdrawToken(address(usdt), depositAmount);
        assertEq(vault.getTokenBalance(address(usdt), owner), 0, "Balance after withdrawal");

        // Permit flow (1 transaction)
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            depositAmount,
            deadline,
            ownerPrivateKey
        );

        vm.prank(owner);
        vault.depositWithPermit(
            address(usdt),
            depositAmount,
            owner,
            deadline,
            v,
            r,
            s
        );

        assertEq(vault.getTokenBalance(address(usdt), owner), depositAmount, "Balance after permit deposit");
    }

    // ============================================
    // TEST 3: Gas Comparison
    // ============================================

    function test_PermitDeposit_GasComparison() public {
        uint256 depositAmount = 1000 * 10**6;

        // Measure gas: Traditional flow
        uint256 gasStart = gasleft();
        vm.prank(owner);
        usdt.approve(address(vault), depositAmount);
        vm.prank(owner);
        vault.depositToken(address(usdt), depositAmount);
        uint256 gasTraditional = gasStart - gasleft();

        // Reset state
        vm.prank(owner);
        vault.withdrawToken(address(usdt), depositAmount);

        // Measure gas: Permit flow
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            depositAmount,
            deadline,
            ownerPrivateKey
        );

        gasStart = gasleft();
        vm.prank(owner);
        vault.depositWithPermit(
            address(usdt),
            depositAmount,
            owner,
            deadline,
            v,
            r,
            s
        );
        uint256 gasPermit = gasStart - gasleft();

        // Log comparison
        console.log("Traditional flow gas:", gasTraditional);
        console.log("Permit flow gas:", gasPermit);
        console.log("Gas saved:", gasTraditional - gasPermit);
        console.log("Percentage saved:", ((gasTraditional - gasPermit) * 100) / gasTraditional, "%");

        // Permit should use less gas
        assertLt(gasPermit, gasTraditional, "Permit should be more gas efficient");
    }

    // ============================================
    // TEST 4: Security - Expired Deadline
    // ============================================

    function test_PermitDeposit_RevertIf_ExpiredDeadline() public {
        uint256 depositAmount = 1000 * 10**6;
        uint256 expiredDeadline = block.timestamp - 1; // Past deadline

        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            depositAmount,
            expiredDeadline,
            ownerPrivateKey
        );

        vm.prank(owner);
        vm.expectRevert("Permit expired");
        vault.depositWithPermit(
            address(usdt),
            depositAmount,
            owner,
            expiredDeadline,
            v,
            r,
            s
        );
    }

    // ============================================
    // TEST 5: Security - Invalid Signature
    // ============================================

    function test_PermitDeposit_RevertIf_InvalidSignature() public {
        uint256 depositAmount = 1000 * 10**6;
        uint256 deadline = block.timestamp + 1 hours;

        // Create valid signature
        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            depositAmount,
            deadline,
            ownerPrivateKey
        );

        // Tamper with signature
        bytes32 tamperedR = bytes32(uint256(r) + 1);

        vm.prank(owner);
        vm.expectRevert(); // Should revert with ECDSA error
        vault.depositWithPermit(
            address(usdt),
            depositAmount,
            owner,
            deadline,
            v,
            tamperedR,
            s
        );
    }

    // ============================================
    // TEST 6: Security - Wrong Owner
    // ============================================

    function test_PermitDeposit_RevertIf_WrongOwner() public {
        uint256 depositAmount = 1000 * 10**6;
        uint256 deadline = block.timestamp + 1 hours;

        // Sign with owner's key
        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            depositAmount,
            deadline,
            ownerPrivateKey
        );

        // Try to execute as different user (user1)
        vm.prank(user1);
        // This should still work because signature is valid for owner
        // But tokens will be transferred from owner, not user1
        vault.depositWithPermit(
            address(usdt),
            depositAmount,
            owner, // owner parameter matches signature
            deadline,
            v,
            r,
            s
        );

        // Verify owner's balance decreased, not user1's
        assertEq(usdt.balanceOf(owner), 9000 * 10**6, "Owner balance should decrease");
        assertEq(vault.getTokenBalance(address(usdt), owner), depositAmount, "Vault should credit owner");
    }

    // ============================================
    // TEST 7: Blacklist Protection
    // ============================================

    function test_PermitDeposit_RevertIf_Blacklisted() public {
        // Blacklist owner
        address manager = makeAddr("manager");
        vault.grantManagerRole(manager);
        vm.prank(manager);
        vault.blacklist(owner);

        uint256 depositAmount = 1000 * 10**6;
        uint256 deadline = block.timestamp + 1 hours;

        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            depositAmount,
            deadline,
            ownerPrivateKey
        );

        vm.prank(owner);
        vm.expectRevert("Address is blacklisted");
        vault.depositWithPermit(
            address(usdt),
            depositAmount,
            owner,
            deadline,
            v,
            r,
            s
        );
    }

    // ============================================
    // TEST 8: Pause Protection
    // ============================================

    function test_PermitDeposit_RevertIf_Paused() public {
        // Pause vault
        address manager = makeAddr("manager");
        vault.grantManagerRole(manager);
        vm.prank(manager);
        vault.pause();

        uint256 depositAmount = 1000 * 10**6;
        uint256 deadline = block.timestamp + 1 hours;

        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            depositAmount,
            deadline,
            ownerPrivateKey
        );

        vm.prank(owner);
        vm.expectRevert(); // EnforcedPause error
        vault.depositWithPermit(
            address(usdt),
            depositAmount,
            owner,
            deadline,
            v,
            r,
            s
        );
    }

    // ============================================
    // TEST 9: Multiple Permits (Nonce Increment)
    // ============================================

    function test_PermitDeposit_MultipleDeposits() public {
        uint256 depositAmount = 500 * 10**6;

        for (uint256 i = 0; i < 3; i++) {
            uint256 deadline = block.timestamp + 1 hours;
            (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
                address(usdt),
                owner,
                address(vault),
                depositAmount,
                deadline,
                ownerPrivateKey
            );

            vm.prank(owner);
            vault.depositWithPermit(
                address(usdt),
                depositAmount,
                owner,
                deadline,
                v,
                r,
                s
            );

            // Verify nonce increased
            assertEq(usdt.nonces(owner), i + 1, "Nonce should increment");
        }

        assertEq(vault.getTokenBalance(address(usdt), owner), depositAmount * 3, "Total deposited");
    }

    // ============================================
    // TEST 10: Edge Cases
    // ============================================

    function test_PermitDeposit_RevertIf_ZeroAmount() public {
        uint256 deadline = block.timestamp + 1 hours;

        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            0,
            deadline,
            ownerPrivateKey
        );

        vm.prank(owner);
        vm.expectRevert("Amount must be > 0");
        vault.depositWithPermit(
            address(usdt),
            0,
            owner,
            deadline,
            v,
            r,
            s
        );
    }

    function test_PermitDeposit_RevertIf_InsufficientBalance() public {
        uint256 depositAmount = 20000 * 10**6; // More than owner has
        uint256 deadline = block.timestamp + 1 hours;

        (uint8 v, bytes32 r, bytes32 s) = createPermitSignature(
            address(usdt),
            owner,
            address(vault),
            depositAmount,
            deadline,
            ownerPrivateKey
        );

        vm.prank(owner);
        vm.expectRevert(); // ERC20: transfer amount exceeds balance
        vault.depositWithPermit(
            address(usdt),
            depositAmount,
            owner,
            deadline,
            v,
            r,
            s
        );
    }
}
