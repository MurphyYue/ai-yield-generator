# Role Matrix - VaultV3 Access Control

## Overview

This document provides a complete reference for all roles in the VaultV3 contract and their permissions.

---

## Role Hierarchy

```
DEFAULT_ADMIN_ROLE (0x00)
│
├── Grant/Revoke ALL roles
├── Cannot touch user funds
│
├── MANAGER_ROLE ──────────────────┐
│   ├── Pause/Unpause system      │
│   ├── Blacklist addresses      │
│   └── Cannot touch funds        │
│                                  │
├── OPERATOR_ROLE ────────────────┤
│   ├── Daily operations          │
│   ├── Routine transactions      │
│   └── Cannot modify parameters  │
│                                  │
└── TREASURER_ROLE ──────────────┘
    ├── Large withdrawal approval
    ├── Fee management
    └── Threshold settings
```

---

## Complete Permission Matrix

| Function | DEFAULT_ADMIN | MANAGER | OPERATOR | TREASURER | PUBLIC |
|----------|:-------------:|:-------:|:--------:|:---------:|:------:|
| **Role Management** |||||||
| grantManagerRole() | ✅ | ❌ | ❌ | ❌ | ❌ |
| grantOperatorRole() | ✅ | ❌ | ❌ | ❌ | ❌ |
| grantTreasurerRole() | ✅ | ❌ | ❌ | ❌ | ❌ |
| revokeRole() | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Risk Control** |||||||
| pause() | ✅ | ✅ | ❌ | ❌ | ❌ |
| unpause() | ✅ | ✅ | ❌ | ❌ | ❌ |
| blacklist() | ✅ | ✅ | ❌ | ❌ | ❌ |
| unblacklist() | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Fund Management** |||||||
| approveLargeWithdrawal() | ✅ | ❌ | ❌ | ✅ | ❌ |
| setWithdrawalFee() | ✅ | ❌ | ❌ | ✅ | ❌ |
| setLargeWithdrawalThreshold() | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Core Operations** |||||||
| deposit() | ❌ | ❌ | ❌ | ❌ | ✅ |
| withdraw() | ❌ | ❌ | ❌ | ❌ | ✅ |
| depositToken() | ❌ | ❌ | ❌ | ❌ | ✅ |
| withdrawToken() | ❌ | ❌ | ❌ | ❌ | ✅ |
| **View Functions** |||||||
| hasManagerRole() | ✅ | ✅ | ✅ | ✅ | ✅ |
| hasOperatorRole() | ✅ | ✅ | ✅ | ✅ | ✅ |
| hasTreasurerRole() | ✅ | ✅ | ✅ | ✅ | ✅ |
| getTokenBalance() | ✅ | ✅ | ✅ | ✅ | ✅ |
| paused() | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:** ✅ = Can execute | ❌ = Cannot execute

---

## Role Responsibilities

### DEFAULT_ADMIN_ROLE

**Purpose:** Root governance - can grant/revoke all other roles

**Key Characteristics:**
- Value: `0x00` (built-in)
- Admin of all custom roles
- Cannot touch user funds directly
- Should be held by multi-sig or governance contract in production

**Security Note:** If this key is lost, the system cannot be reconfigured. If compromised, attacker can grant themselves all roles.

### MANAGER_ROLE

**Purpose:** Risk control officer - system safety

**Can Execute:**
- `pause()` - Stop all operations in emergency
- `unpause()` - Resume normal operations
- `blacklist()` - Block malicious addresses
- `unblacklist()` - Unblock addresses

**Cannot:**
- Touch user funds
- Modify fees or thresholds
- Grant roles

**Use Cases:**
- Emergency shutdown during attack
- Block known attacker addresses
- Resume after incident

### OPERATOR_ROLE

**Purpose:** Daily operations - AI automation

**Can Execute:**
- All public deposit/withdraw operations

**Cannot:**
- Pause/resume system
- Modify parameters
- Approve large withdrawals
- Blacklist addresses

**Use Cases:**
- AI bot executing routine transactions
- Automated yield strategies
- Batch operations

### TREASURER_ROLE

**Purpose:** Fund officer - financial controls

**Can Execute:**
- `approveLargeWithdrawal()` - Approve large individual withdrawals
- `setWithdrawalFee()` - Configure withdrawal fees
- `setLargeWithdrawalThreshold()` - Set threshold for large withdrawals

**Cannot:**
- Pause/resume system
- Touch user funds directly
- Blacklist addresses

**Use Cases:**
- Approve large customer withdrawal (>$10 ETH equivalent)
- Adjust fee structure
- Modify risk thresholds

---

## onlyRole Pattern

### Basic Usage

```solidity
// Restrict function to specific role
function pause() external onlyRole(MANAGER_ROLE) whenNotPaused {
    _pause();
}
```

### Modifier Stacking

```solidity
// Multiple modifiers - all must pass
function withdraw(uint256 amount) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
    // ...
}
```

### Role Admin Check

By default, `onlyRole(X)` checks if caller has role X AND role X's admin role. Since all custom roles have DEFAULT_ADMIN_ROLE as admin, only DEFAULT_ADMIN can grant them.

---

## View Functions

All view functions are public (no role restriction):

```solidity
// Anyone can check if address has role
hasManagerRole(address account) → bool
hasOperatorRole(address account) → bool
hasTreasurerRole(address account) → bool

// Anyone can check system state
paused() → bool
blacklisted(address) → bool
withdrawalFee() → uint256
largeWithdrawalThreshold() → uint256
```

---

## Production Recommendations

### Key Management

| Role | Key Storage | Rationale |
|------|------------|----------|
| DEFAULT_ADMIN | Multi-sig (3/5) | Critical - can grant all roles |
| MANAGER | Multi-sig (2/3) | Emergency control |
| TREASURER | Hardware wallet | Financial oversight |
| OPERATOR | Application wallet | AI bot access |

### Role Assignment in Production

```
1. Deploy contract → Deployer gets all roles
2. Transfer DEFAULT_ADMIN → Multi-sig wallet
3. Assign OPERATOR → AI bot address
4. Assign TREASURER → CFO wallet
5. Assign MANAGER → Security team
6. Deployer should renounce personal roles
```

### Monitoring

Monitor these events for security:
- `RoleGranted` - New role assignments
- `RoleRevoked` - Role removal
- `Paused` - System emergency stop
- `Unpaused` - System resume
- `Blacklisted` - Address blocked

---

## Files

- Contract: `contracts/VaultV3.sol`
- Tests: `test/VaultV3.t.sol`
- Frontend: `frontend/hooks/useVault.ts`
