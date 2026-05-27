# VaultV3 Smart Contract Issues Report

**Contract**: `contracts/VaultV3.sol`
**Review type**: Manual logic review (post Day 7 Slither pass)
**Reviewer**: Engineering team
**Status**: Pending fix — ERC-4626 refactor planned

---

## Background

This report was triggered by a bug report from an external engineer identifying that yield accrued in Aave is permanently stranded in the vault and inaccessible to depositors. Investigation of the root cause revealed a broader set of issues in the current accounting model and surrounding logic.

The Day 7 Slither pass (`SECURITY_ANALYSIS.md`) covered ERC20 transfer safety and reentrancy ordering. The issues below are distinct and were not covered by that pass.

---

## Summary

| ID | Title | Severity | Status |
|---|---|---|---|
| V-01 | Principal-only accounting — yield permanently stranded | Critical | Open |
| V-02 | Share inflation attack on first deposit | Critical | Open |
| V-03 | Large withdrawal approval hash always mismatches | High | Open |
| V-04 | `invest()` and `divest()` bypass pause | High | Open |
| V-05 | `emergencyDivest()` missing `nonReentrant` | High | Open |
| V-06 | No slippage protection on `divest()` | Medium | Open |
| V-07 | No total deposit cap | Medium | Open |
| V-08 | Double event emission on role grants and pause | Low | Open |

---

## Findings

### V-01 — Principal-only accounting: yield permanently stranded

**Severity**: Critical

**Location**: `VaultV3.sol` — `tokenBalances`, `depositToken()`, `withdrawToken()`

**Description**

`tokenBalances[token][user]` records only the principal deposited. When funds are invested via `invest()`, Aave accrues interest and `AaveStrategy.totalAssets()` grows. After `divest()` returns the principal plus yield to the vault, the vault's real token balance (`balanceOf(address(this))`) exceeds the sum of all `tokenBalances` entries.

When a user calls `withdrawToken(token, principal + yield)`, the check at line 346 fails:

```solidity
require(tokenBalances[token][msg.sender] >= amount, "Insufficient token balance");
```

The user can only withdraw their original principal. The yield has no owner in the ledger and can never be withdrawn by anyone. It is permanently locked in the contract.

**Example**

1. User A deposits 100 USDC → `tokenBalances[USDC][A] = 100`
2. Treasurer calls `invest(USDC, 100)` → 100 USDC moves to Aave
3. Aave accrues interest → `strategy.totalAssets() = 105`
4. Treasurer calls `divest(105)` → 105 USDC returns to vault
5. User A calls `withdrawToken(USDC, 105)` → reverts (`100 >= 105` is false)
6. User A can only withdraw 100. The 5 USDC yield is permanently stranded.

**Fix**

Replace the principal ledger with share-based accounting (ERC-4626 pattern). On deposit, mint shares proportional to the current exchange rate. On withdrawal, burn shares and send the proportional fraction of total assets. Yield accrues automatically to all shareholders without any ledger update.

---

### V-02 — Share inflation attack on first deposit

**Severity**: Critical

**Location**: Will affect the ERC-4626 replacement for `depositToken()`

**Description**

This is a known attack against naive ERC-4626 implementations. When the vault is empty (`totalShares == 0`), the first depositor sets the exchange rate. An attacker can:

1. Deposit 1 wei → receive 1 share
2. Donate a large amount of tokens directly to the vault (bypassing `depositToken`) to inflate `totalAssets`
3. The next legitimate depositor's shares round down to 0 due to integer division, and they receive nothing

**Fix**

Use OpenZeppelin's ERC-4626 virtual offset (`_decimalsOffset()`), which adds a virtual 1 share and 1 asset to all calculations. This makes the attack economically infeasible without affecting normal operation. Alternatively, mint a fixed amount of dead shares to `address(0)` on the first deposit.

This must be addressed in the ERC-4626 implementation, not after.

---

### V-03 — Large withdrawal approval hash always mismatches

**Severity**: High

**Location**: `VaultV3.sol` lines 270–272, 382–384

**Description**

The approval hash is computed with `block.timestamp` in both `getWithdrawalRequestHash()` (called by the treasurer to approve) and `withdraw()` (called by the user to execute). Because `block.timestamp` differs between the approval transaction and the withdrawal transaction, the hashes never match. The large withdrawal approval mechanism is completely non-functional — any withdrawal above `largeWithdrawalThreshold` will always revert.

```solidity
// Line 270 — computed at withdrawal time
bytes32 requestHash = keccak256(abi.encodePacked(msg.sender, _amount, block.timestamp));

// Line 383 — computed at approval time (different block, different timestamp)
return keccak256(abi.encodePacked(user, amount, block.timestamp));
```

**Fix**

Replace `block.timestamp` with a user-specific nonce. The user requests a withdrawal (incrementing their nonce), the treasurer approves the `(user, amount, nonce)` hash, and the user executes using the same nonce.

---

### V-04 — `invest()` and `divest()` bypass the pause

**Severity**: High

**Location**: `VaultV3.sol` lines 185, 205

**Description**

`depositToken()` and `withdrawToken()` are correctly gated by `whenNotPaused`. However, `invest()` and `divest()` — which move funds between the vault and Aave — have no pause check. During an emergency pause, users cannot deposit or withdraw, but the treasurer can still move funds into or out of Aave. This undermines the purpose of the pause mechanism.

**Fix**

Add `whenNotPaused` to both `invest()` and `divest()`. `emergencyDivest()` should remain unpausable by design (it is the escape hatch), which is already the case.

---

### V-05 — `emergencyDivest()` missing `nonReentrant`

**Severity**: High

**Location**: `VaultV3.sol` line 218

**Description**

Every other fund-moving function (`invest`, `divest`, `withdraw`, `withdrawToken`, `depositToken`) uses `nonReentrant`. `emergencyDivest()` does not. If the strategy's `emergencyWithdraw()` implementation makes an external call that re-enters the vault before returning, the vault's state could be manipulated.

```solidity
function emergencyDivest() external onlyRole(DEFAULT_ADMIN_ROLE) {
    // missing: nonReentrant
    require(address(strategy) != address(0), "No strategy set");
    bool success = strategy.emergencyWithdraw();
    require(success, "Emergency withdraw failed");
}
```

**Fix**

Add `nonReentrant` modifier.

---

### V-06 — No slippage protection on `divest()`

**Severity**: Medium

**Location**: `VaultV3.sol` line 205

**Description**

`divest(amount)` calls `strategy.withdraw(amount)` with no minimum amount out check. If the strategy receives fewer tokens than expected from Aave (due to rounding, a fee-on-transfer token, or a sandwich attack), the vault silently accepts the shortfall. The `Divested` event emits the requested `amount`, not the actual amount received.

**Fix**

Add a `minAmountOut` parameter to `divest()`. After the strategy withdraw, check that `IERC20(token).balanceOf(address(this))` increased by at least `minAmountOut`.

---

### V-07 — No total deposit cap

**Severity**: Medium

**Location**: `VaultV3.sol` — `depositToken()`

**Description**

There is no `maxDeposit` limit. Aave V3 enforces per-asset supply caps. If the vault accepts more deposits than it can deploy to Aave, the excess sits idle earning no yield while users expect yield. There is no mechanism to communicate this to depositors or to reject deposits that cannot be deployed.

**Fix**

Add a configurable `depositCap` (settable by `TREASURER_ROLE`). In `depositToken()`, check that the new total does not exceed the cap. This also maps cleanly to the ERC-4626 `maxDeposit()` view function.

---

### V-08 — Double event emission on role grants and pause

**Severity**: Low

**Location**: `VaultV3.sol` lines 92, 97, 103, 116–117, 121–122

**Description**

`grantManagerRole()`, `grantOperatorRole()`, and `grantTreasurerRole()` each call `grantRole()` (which emits `RoleGranted` internally via OpenZeppelin AccessControl) and then manually emit `RoleGranted` again. Every role grant produces two identical events.

The same pattern exists in `pause()` and `unpause()`: OpenZeppelin's `Pausable._pause()` and `_unpause()` already emit `Paused` and `Unpaused`, but the overrides emit them again manually.

**Fix**

Remove the manual `emit` lines in all five functions.

---

## Recommended Fix Order

1. **V-03** (large withdrawal hash) — isolated fix, no dependencies, unblocks a broken feature
2. **V-05** (emergencyDivest nonReentrant) — one-line fix
3. **V-08** (double events) — cleanup, no logic change
4. **V-04** (invest/divest not pausable) — one-line fix per function
5. **V-01 + V-02** (ERC-4626 refactor + inflation protection) — implement together; V-02 must be addressed within the V-01 fix
6. **V-06** (slippage on divest) — add parameter, update callers
7. **V-07** (deposit cap) — additive feature, implement last

Items 1–4 and 8 can be applied to the current contract immediately. Items 5–7 are part of the ERC-4626 refactor.

---

## Relationship to Previous Security Review

The Day 7 Slither pass (`SECURITY_ANALYSIS.md`) addressed ERC20 transfer safety (`SafeERC20`) and reentrancy ordering in `AaveStrategy`. The findings in this report are orthogonal — they concern accounting correctness, approval logic, and operational safety, none of which were in scope for the Slither pass.

Both reports should be read together for a complete picture of the contract's security posture.
