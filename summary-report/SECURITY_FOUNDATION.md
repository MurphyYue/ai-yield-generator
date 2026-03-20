# Mission E: Security Foundation - ERC20 Security Patterns

## 1. Approve/TransferFrom Security Pattern

### Why Pull Pattern is Safer

**Pull Pattern (ERC20 Standard)** - SECURE:
- User approves contract to spend tokens
- Contract pulls tokens via `transferFrom()`
- User maintains control and can revoke anytime
- Atomic: Either all succeeds or all fails

**Push Pattern (Direct Transfer)** - RISKY:
- Directly send tokens to contract
- If contract execution fails mid-way, funds lost
- No user control after transfer

### Allowance Mechanism

**Two-Step Process:**
1. `approve(spender, amount)` - Grant permission
2. `transferFrom(from, to, amount)` - Spender pulls tokens

**Benefits:**
- User control: Can increase/decrease/revoke anytime
- Limited exposure: Max loss = approved amount
- Audit trail: All approvals on-chain

### Approval Race Conditions

**Vulnerable Pattern:**
```solidity
token.approve(vault, newAmount);  // Can be front-run
```

**Safe Pattern:**
```solidity
// Use SafeERC20 from OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

SafeERC20.forceApprove(token, to, value);
```

## 2. Reentrancy Protection

### The DAO Hack (2016)

**Attack Flow:**
1. Attacker calls `withdraw()`
2. Vault sends ETH (via `call`)
3. Attacker's receive() triggers - calls `withdraw()` AGAIN
4. Vault sends ETH AGAIN (balance not yet updated)
5. Repeat until vault drained

**Loss:** 3.6 million ETH (~$70 million)

### The Fix: nonReentrant Modifier

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

function withdraw(uint256 amount) external nonReentrant {
    // Update state FIRST
    balances[msg.sender] -= amount;

    // THEN transfer (external call)
    // If attacker calls back, modifier prevents re-entry
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

**How It Works:**
```solidity
bool private locked = false;

modifier nonReentrant() {
    require(!locked, "ReentrancyGuard: reentrant call");
    locked = true;  // Lock
    _;              // Execute function
    locked = false; // Unlock after complete
}
```

## 3. Why Direct Transfer Can Be Unsafe

### Problems with Direct Transfer

**1. No Atomicity:**
```solidity
// BAD: State changes can happen before transfer succeeds
balances[user] -= amount;
token.transfer(user, amount);  // If this fails, balance already deducted!
```

**2. No Allowance Check:**
```solidity
// BAD: Contract can spend ANY amount if approved
token.transferFrom(user, this, amount);  // User might not want this!
```

**3. Reentrancy Risk:**
```solidity
// BAD: External call before state update
token.transfer(user, amount);  // Attacker can re-enter here
balances[user] -= amount;
```

### Safe Pattern

```solidity
// GOOD: Pull pattern with reentrancy protection
function withdrawToken(address token, uint256 amount) external nonReentrant {
    // 1. Checks
    require(amount > 0, "Amount must be > 0");
    require(tokenBalances[token][msg.sender] >= amount, "Insufficient balance");

    // 2. Effects (update state FIRST)
    tokenBalances[token][msg.sender] -= amount;

    // 3. Interaction (external call LAST)
    bool success = IERC20(token).transfer(msg.sender, amount);
    require(success, "Token transfer failed");
}
```

## 4. Frontend Security Checklist

When building DeFi interfaces:

- [ ] Check allowance before deposit
- [ ] Show clear error messages (not raw contract errors)
- [ ] Simulate transactions before wallet signature
- [ ] Handle reverts gracefully
- [ ] Wait for confirmation before updating UI
- [ ] Validate amounts against balances

## 5. Key Learnings

### Security First Principles

1. **Checks-Effects-Interactions Pattern:**
   - Checks: Validate inputs
   - Effects: Update state
   - Interactions: Make external calls

2. **Pull Over Push:**
   - Pull: User grants permission, contract pulls
   - Push: Direct transfer, can fail

3. **Reentrancy Protection:**
   - Always use `nonReentrant` on functions with external calls
   - Update state BEFORE external calls

4. **Allowance Management:**
   - Check allowance before operations
   - Use SafeERC20 for approval changes
   - Allow users to revoke anytime

## Resources

- [OpenZeppelin ReentrancyGuard](https://docs.openzeppelin.com/contracts/api/utils#ReentrancyGuard)
- [ERC20 Standard](https://eips.ethereum.org/EIPS/eip-20)
- [The DAO Hack Explained](https://www.google.com/search?q=dao+hack+2016+explained)
- [Solidity by Example: Safe Remote Purchase](https://solidity-by-example.org/safe-remote-purchase/)

## Status

✅ Mission E Completed
- ✅ Understand approve/transferFrom security pattern
- ✅ Learned about allowance mechanism
- ✅ Understand approval race conditions
- ✅ Studied reentrancy protection
- ✅ Documented security best practices

## Next: Mission F

Next session: **AI Intent Layer** (14:00 - 16:30)
- Configure Dify Agent for natural language processing
- Build API route for intent parsing

---

## Day 3: Access Control & Governance (Extended)

### SoD (Separation of Duties) Pattern

**Why SoD?**

In traditional finance, no single person has complete control over a system. This prevents fraud and mistakes.

**VaultV3 Roles:**

| Role | Hash Value | Admin | Can Touch Money? | Key Functions |
|------|-----------|-------|------------------|----------------|
| DEFAULT_ADMIN_ROLE | `0x00` (built-in) | Self | ❌ No | grantRole(), revokeRole() |
| MANAGER_ROLE | `keccak256("MANAGER_ROLE")` | DEFAULT_ADMIN_ROLE | ❌ No | pause(), unpause(), blacklist() |
| OPERATOR_ROLE | `keccak256("OPERATOR_ROLE")` | DEFAULT_ADMIN_ROLE | ✅ Yes | Daily deposit/withdraw operations |
| TREASURER_ROLE | `keccak256("TREASURER_ROLE")` | DEFAULT_ADMIN_ROLE | ✅ Yes | approveLargeWithdrawal(), setWithdrawalFee() |

### AccessControl Hierarchy

```
DEFAULT_ADMIN_ROLE (0x00)
├── Can grant/revoke ALL roles
├── Cannot directly touch funds
│
├── MANAGER_ROLE
│   ├── Can pause/unpause system
│   ├── Can blacklist addresses
│   └── Cannot touch funds
│
├── OPERATOR_ROLE
│   ├── Can perform daily operations
│   └── Cannot modify system parameters
│
└── TREASURER_ROLE
    ├── Can approve large withdrawals
    └── Can set fees and thresholds
```

### Important: DEFAULT_ADMIN_ROLE

**NEVER REDEFINE DEFAULT_ADMIN_ROLE!**

```solidity
// ❌ WRONG - This will break AccessControl!
bytes32 public constant DEFAULT_ADMIN_ROLE = keccak256("DEFAULT_ADMIN_ROLE");

// ✅ CORRECT - DEFAULT_ADMIN_ROLE is built-in (value: 0x00)
// Just use it directly
function grantManagerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
    grantRole(MANAGER_ROLE, account);
}
```

### Role Checking

```solidity
// Check if address has role
function hasManagerRole(address account) external view returns (bool) {
    return hasRole(MANAGER_ROLE, account);
}
```

---

## Day 3: Circuit Breaker (Pausable)

### Why Circuit Breakers?

When bugs or attacks are discovered, you need a way to stop all operations quickly.

### How Pausable Works

```solidity
import "@openzeppelin/contracts/utils/Pausable.sol";

contract VaultV3 is Pausable {
    // Apply whenNotPaused modifier
    function deposit() public payable whenNotPaused {
        // ... normal logic
    }

    // Only manager can pause
    function pause() external onlyRole(MANAGER_ROLE) whenNotPaused {
        _pause();
    }

    function unpause() external onlyRole(MANAGER_ROLE) whenPaused {
        _unpause();
    }
}
```

### Modifier Behavior

| State | `whenNotPaused` | `whenPaused` |
|-------|-----------------|--------------|
| Not Paused | ✅ Passes | ❌ Reverts |
| Paused | ❌ Reverts | ✅ Passes |

### Frontend Integration

```typescript
// useVault.ts
const { data: isPaused } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'paused',
})

// SystemPausedBanner.tsx - Shows warning when paused
{isPaused && (
    <div className="bg-red-600 text-white p-4">
        System is currently paused. Contact admin.
    </div>
)}
```

---

## Day 3: Multi-Layer Security

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ AI Risk     │  │ Simulation  │  │ User Confirmation   │  │
│  │ Assessment  │  │ (eth_call)  │  │ (Double confirm)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   CONTRACT LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ AccessControl│  │  Pausable   │  │  ReentrancyGuard   │  │
│  │ (Roles)     │  │  (Pause)    │  │  (NonReentrant)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Blacklist   │  │ Withdrawal  │  │ Balance Checks     │  │
│  │ Mapping     │  │ Approval    │  │ (CEI Pattern)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Defense in Depth

Each layer catches different types of threats:

| Layer | Threat | Example |
|-------|--------|---------|
| AI Risk | User mistakes | "withdraw all" → HIGH warning |
| Simulation | Technical errors | Wrong token address, insufficient balance |
| User Confirm | Rash decisions | Double confirmation for HIGH risk |
| AccessControl | Unauthorized actions | Non-manager cannot pause |
| Pausable | System emergency | All ops stop when paused |
| ReentrancyGuard | Reentrancy attacks | Prevents recursive calls |
| Blacklist | Bad actors | Block specific addresses |

---

## Resources

- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/api/access#AccessControl)
- [OpenZeppelin Pausable](https://docs.openzeppelin.com/contracts/api/utils#Pausable)
- [SoD Pattern in Banking](https://en.wikipedia.org/wiki/Separation_of_duties)
- [VaultV3 Contract](file://../../contracts/VaultV3.sol)
