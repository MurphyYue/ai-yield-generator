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
