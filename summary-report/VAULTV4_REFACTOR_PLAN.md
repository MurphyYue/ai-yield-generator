# VaultV4 Refactor Plan

**Source**: `VAULTV3_ISSUES_REPORT.md`  
**Target file**: `contracts/VaultV4.sol`  
**Test file**: `test/VaultV4.t.sol`

---

## Why `VaultV4` is a new file

The ERC20 accounting change is storage-breaking. `VaultV3` tracks user ERC20 balances as principal, while `VaultV4` will track user ownership through shares with yield-aware accounting. That is a semantic rewrite, not a safe in-place patch.

`VaultV3` remains in the repo as a legacy reference. `VaultV4` is the intended replacement contract for any future deployment path.

This project validates behavior against:

- local Anvil
- Base mainnet fork
- Arbitrum mainnet fork
- and, if accepted, clean redeployments on real mainnet environments

So the design target is not only local correctness. `VaultV4` must remain compatible with live Aave-based strategy behavior on Base and Arbitrum.

---

## Why migration is not required

Migration logic is intentionally out of scope.

Reason:

- `VaultV3` has no real production users
- there is no live user base whose balances must be migrated
- there is no need for a migration contract, migration script, or dual-version coexistence flow

The practical deployment strategy is therefore:

1. write `VaultV4`
2. test locally
3. test on Base and Arbitrum mainnet forks
4. redeploy cleanly if the design is accepted

This keeps the refactor focused on correctness and avoids adding migration complexity that the current project state does not need.

---

## What stays the same

- All four roles:
  - `DEFAULT_ADMIN_ROLE`
  - `MANAGER_ROLE`
  - `OPERATOR_ROLE`
  - `TREASURER_ROLE`
- ETH deposit/withdraw path remains unchanged
- Existing ETH withdrawal fee model remains unchanged
- Blacklist
- Pause/unpause
- Strategy interface:
  - `IStrategy`
  - `AaveStrategy`
- `invest()` / `divest()` / `emergencyDivest()` remain the strategy-control surface, though modifiers and parameters change
- `setStrategy()`
- `getTotalBalance()`
- `getStrategyBalance()`

The major redesign is isolated to ERC20 accounting, operational safety fixes, and platform revenue capture from yield.

---

## Changes by issue ID

### V-01 + V-02 — Replace principal accounting with share accounting

Remove:

```solidity
mapping(address => mapping(address => uint256)) public tokenBalances;
```

Add:

```solidity
mapping(address => mapping(address => uint256)) public shares;
mapping(address => uint256) public totalShares;
```

Core accounting model:

- ERC20 depositors own shares, not principal balances
- Yield accrues by increasing the asset value per share
- Users withdraw by burning shares for the proportional fraction of total assets

Internal total-assets helper:

```solidity
function _totalAssets(address token) internal view returns (uint256) {
    uint256 idle = IERC20(token).balanceOf(address(this));
    if (address(strategy) != address(0) && strategy.underlyingToken() == token) {
        return idle + strategy.totalAssets();
    }
    return idle;
}
```

Exchange rate formulas:

```text
On deposit:
sharesToMint = amount * totalShares[token] / _totalAssets(token)

On withdrawal:
assetsToSend = sharesToBurn * _totalAssets(token) / totalShares[token]
```

Inflation attack protection is mandatory in the same implementation pass:

- use dead-share protection on first deposit
- lock `VIRTUAL_SHARES` to `address(0)`
- mint first depositor shares at `amount * VIRTUAL_SHARES`

Locked choice:

```solidity
uint256 private constant VIRTUAL_SHARES = 1e3;
```

Updated ERC20 deposit behavior:

- validate token / amount / blacklist / cap
- compute shares to mint
- transfer assets in
- mint shares
- emit deposit event including shares

Updated ERC20 withdraw behavior:

- user provides `sharesToBurn`
- vault computes current asset value
- if idle assets are insufficient because funds are deployed, revert with explicit “divest first” style liquidity error
- burn shares
- transfer assets
- emit withdraw event including shares burned

New view functions:

- `previewWithdraw(address token, address user)`
- `previewDeposit(address token, uint256 amount)`
- `convertToShares(address token, uint256 assets)`
- `getShares(address token, address user)`

### V-03 — Replace timestamp-based large withdrawal approval with nonce-based flow

Remove `block.timestamp` from approval hashes.

Add:

```solidity
mapping(address => uint256) public withdrawalNonce;
```

New flow:

1. user requests large withdrawal
2. request hash is based on `(user, amount, nonce)`
3. treasurer approves that exact tuple
4. user executes with the same nonce
5. approval is consumed
6. nonce advances after success

Functions and behaviors:

- `requestLargeWithdrawal(uint256 amount)`
- `getWithdrawalRequestHash(address user, uint256 amount)`
- treasurer approval path must be nonce-aware
- `withdraw()` must validate approval against current nonce, not timestamp

### V-04 — `invest()` and `divest()` must respect pause

Add `whenNotPaused` to:

```solidity
function invest(address token, uint256 amount) external nonReentrant whenNotPaused onlyRole(TREASURER_ROLE)
function divest(uint256 amount, uint256 minAmountOut) external nonReentrant whenNotPaused onlyRole(TREASURER_ROLE)
```

`emergencyDivest()` intentionally remains callable while paused.

### V-05 — `emergencyDivest()` gets `nonReentrant`

Update to:

```solidity
function emergencyDivest() external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE)
```

### V-06 — Add slippage protection on `divest()`

Update signature:

```solidity
function divest(uint256 amount, uint256 minAmountOut) external
```

Behavior:

- measure vault token balance before strategy withdraw
- call strategy withdraw
- measure actual amount received
- require `received >= minAmountOut`
- emit event using actual receive semantics, not requested amount semantics

### V-07 — Add per-token deposit cap

Add:

```solidity
mapping(address => uint256) public depositCap;
```

And:

```solidity
function setDepositCap(address token, uint256 cap) external onlyRole(TREASURER_ROLE)
```

Rules:

- `0` means unlimited
- cap check runs inside `depositToken()`
- cap is based on `_totalAssets(token) + amount`

This avoids drift that would happen with a principal-only deposit counter.

### V-08 — Remove duplicate manual emits

Remove manual duplicate emits from:

- `grantManagerRole()`
- `grantOperatorRole()`
- `grantTreasurerRole()`
- `pause()`
- `unpause()`

OpenZeppelin already emits those events internally.

---

## Performance fee policy

VaultV4 should include a platform revenue model for ERC20 strategy yield.

Locked fee policy:

- keep the existing ETH withdrawal fee model unchanged
- add a **performance fee on ERC20 strategy yield only**
- fee applies only to **realized profit**
- fee is realized only on **`divest()`**
- treasury receives **shares**, not direct token transfers

Add state:

```solidity
address public feeTreasury;
uint256 public performanceFeeBps;
uint256 public constant MAX_PERFORMANCE_FEE = 2000;
```

Locked defaults:

- `performanceFeeBps = 1000`
- `MAX_PERFORMANCE_FEE = 2000`

Meaning:

- default fee is 10% of realized yield
- hard cap is 20%

Fee realization model on `divest(amount, minAmountOut)`:

1. measure actual assets received from strategy
2. compute realized profit:

```text
realizedProfit = max(received - amount, 0)
```

3. compute fee on realized profit:

```text
feeAssets = realizedProfit * performanceFeeBps / 10000
```

4. convert `feeAssets` into shares using the current share exchange rate
5. mint `feeShares` to `feeTreasury`
6. keep underlying assets inside the vault

This means:

- user principal is never charged
- fee is not charged on deposits
- fee is not charged if no profit is realized
- treasury participation is represented inside the same share system as users

Why shares instead of direct USDC transfer:

- keeps vault accounting share-native
- avoids immediate asset transfer out of idle vault liquidity
- aligns better with ERC-4626-style ownership semantics

Admin / treasurer permissions:

- `setFeeTreasury(address treasury)` — `DEFAULT_ADMIN_ROLE`
- `setPerformanceFee(uint256 newFeeBps)` — `TREASURER_ROLE`

Validation rules:

- treasury address must not be zero
- fee bps must not exceed `MAX_PERFORMANCE_FEE`

---

## Updated events and interfaces

Updated ERC20 events:

```solidity
event TokenDeposited(address indexed user, address indexed token, uint256 amount, uint256 shares);
event TokenWithdrawn(address indexed user, address indexed token, uint256 amount, uint256 shares);
```

New events:

```solidity
event DepositCapUpdated(address indexed token, uint256 cap);
event LargeWithdrawalRequested(address indexed user, uint256 amount, bytes32 indexed requestHash);
event PerformanceFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
event FeeTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
event PerformanceFeeAccrued(address indexed token, uint256 realizedProfit, uint256 feeAssets, uint256 feeShares);
```

Interface / behavior updates that affect integrations:

- `withdrawToken(address token, uint256 sharesToBurn)` now consumes shares, not asset amount
- `divest(uint256 amount, uint256 minAmountOut)` now requires slippage input
- frontend must convert desired asset amount to shares before token withdrawal
- event consumers must handle actual amount + shares semantics

---

## Test plan

The new test plan must cover local correctness and mainnet-oriented compatibility.

### Unit / local tests

Required test groups:

- share accounting correctness
- inflation attack protection
- withdraw / divest coordination
- nonce-based large withdrawal flow
- pause / emergency behavior
- deposit cap behavior
- performance fee behavior
- treasury share minting behavior

Required tests:

| Test | What it covers |
|---|---|
| `testDepositMintsShares` | First deposit mints `amount * 1000` shares and locks dead shares to `address(0)` |
| `testShareValueGrowsWithYield` | After simulated yield, `previewWithdraw` returns more than deposited |
| `testWithdrawBurnsCorrectShares` | Shares decrease proportionally on withdrawal |
| `testTwoUsersShareYieldProportionally` | Multiple users share yield correctly before fees |
| `testInflationAttackPrevented` | Hostile first-deposit + donation pattern does not zero out second depositor |
| `testWithdrawRevertsIfFundsInStrategy` | Withdraw path reverts when liquidity is still deployed |
| `testDivestThenWithdraw` | Divest restores idle liquidity and withdrawal succeeds |
| `testDivestSlippageReverts` | `minAmountOut` protection works |
| `testLargeWithdrawalNonceFlow` | Request → approve → execute works |
| `testLargeWithdrawalWrongNonceReverts` | Approval cannot be replayed against another nonce |
| `testInvestRespectsPause` | `invest()` reverts while paused |
| `testDivestRespectsPause` | `divest()` reverts while paused |
| `testEmergencyDivestWhilePaused` | `emergencyDivest()` still works while paused |
| `testDepositCapEnforced` | Above-cap deposits revert |
| `testDepositCapZeroMeansNoCap` | Zero cap means unlimited |

### Fee-specific tests

These must remain in the document:

| Test | What it covers |
|---|---|
| `testPerformanceFeeOnRealizedYieldOnly` | Fee is charged only on yield, not principal |
| `testNoPerformanceFeeWhenNoProfit` | No fee accrues if `divest()` realizes no profit |
| `testTreasuryReceivesSharesNotAssets` | Treasury gets shares, not direct USDC transfer |
| `testUserReceivesNetYieldAfterFee` | User yield is reduced only by the configured performance fee |
| `testPerformanceFeeRespectsCap` | Fee setter cannot exceed the hard cap |
| `testSetFeeTreasuryAdminOnly` | Only admin can set treasury |
| `testSetPerformanceFeeTreasurerOnly` | Only treasurer can set fee bps |
| `testMultipleUsersShareNetYieldAndTreasuryGetsFeeShares` | Users share net yield proportionally and treasury gets fee shares |
| `testDivestWithSlippageAndFee` | Slippage protection and fee realization interact correctly |

### Mainnet-oriented validation

This project tests against mainnet conditions, so integration validation is part of the normal path, not optional hardening.

Required validation groups:

- Base fork integration
- Arbitrum fork integration
- local deployment smoke test

Required expectations:

- strategy integration must be validated on **Base mainnet fork**
- strategy integration must be validated on **Arbitrum mainnet fork**
- final behavior must remain compatible with live Aave-based strategy flows

---

## Files to create / modify

| File | Action |
|---|---|
| `contracts/VaultV4.sol` | Create — full VaultV4 implementation |
| `test/VaultV4.t.sol` | Create — new unit test suite |
| `script/Deploy.s.sol` | Update — deploy `VaultV4` instead of `VaultV3` |
| `DEPLOYED_ADDRESSES.md` | Update after redeployment |
| `frontend/lib/vault.ts` | Update ABI: shares-based views and new function signatures |
| `frontend/hooks/useVault.ts` | Update token withdraw flow to convert assets to shares before `withdrawToken()` |
| `ponder-indexing/ponder.config.ts` | Update contract address and start block after redeploy |

No planned changes unless implementation proves otherwise:

- `contracts/AaveStrategy.sol`
- `contracts/IStrategy.sol`

---

## Implementation order

1. write `VaultV4.sol`
2. write `VaultV4.t.sol`
3. run unit tests
4. run Base fork tests
5. run Arbitrum fork tests
6. update deploy script to use `VaultV4`
7. run local Anvil deployment smoke test
8. redeploy cleanly to mainnet environments if desired
9. update frontend ABI and hooks
10. update Ponder config and addresses docs

This order reflects the actual validation path for the project:

- local correctness first
- live-protocol compatibility next
- deployment tooling after contract correctness
- frontend and indexer updates only after the contract interface is stable

---

## Assumptions

- `VaultV3` has no real users, so no migration contract or migration script is needed
- `VaultV4` is the intended production replacement
- mainnet fork testing is part of the normal validation path, not optional hardening
- `AaveStrategy.sol` and `IStrategy.sol` stay unchanged unless implementation proves otherwise
- frontend withdraw UX must convert desired assets into shares before calling `withdrawToken`
- treasury-share minting is the only protocol-revenue mechanism added for ERC20 yield in V4
