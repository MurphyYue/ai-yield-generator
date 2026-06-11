# VaultV4 Refactor Plan

**Source**: `summary-report/VAULTV3_ISSUES_REPORT.md`  
**Target file**: `contracts/VaultV4.sol`  
**Primary asset**: USDC only  
**Validation target**: Local Anvil, Base mainnet fork, Arbitrum mainnet fork, then clean mainnet redeploy if accepted

---

## Why `VaultV4` is a new file

`VaultV4` must be a new contract file because the accounting model is changing at the storage and interface level.

`VaultV3` uses:

- principal-only internal ledgers
- mixed ETH + ERC20 vault behavior
- custom token balance accounting that cannot represent yield ownership correctly

`VaultV4` will instead use a standard single-asset ERC-4626 vault model:

- one underlying asset per deployment
- one ERC20 share token
- standardized `deposit`, `mint`, `withdraw`, `redeem`, `preview*`, and `convert*` behavior
- yield represented through share price growth rather than user principal ledgers

This is not a safe in-place patch. It is a contract rewrite with different storage, different interfaces, and different product scope.

`VaultV3` remains in the repo as a legacy reference.

---

## Why migration is not required

Migration logic is intentionally out of scope.

Reason:

- `VaultV3` has no real production users
- there are no live balances that must be preserved onchain
- adding migration contracts or migration scripts would add complexity without solving a real production constraint

The deployment path is therefore:

1. write `VaultV4`
2. test locally
3. test on Base and Arbitrum mainnet forks
4. update deployment tooling
5. redeploy cleanly to mainnet environments if accepted

This project validates against real mainnet conditions, but there is no legacy user migration problem to solve.

---

## What stays the same

The following architectural choices stay the same:

- Base and Arbitrum remain the supported target chains
- Aave remains the yield strategy integration target
- `AaveStrategy.sol` and `IStrategy.sol` are expected to remain unchanged unless implementation proves otherwise
- role-based access control remains required
- pause / unpause remains required
- blacklist remains required if the product still wants operator-level exclusion controls
- large withdrawal approval remains required
- a vault-level treasurer role remains responsible for capital movement and fee configuration

The following product behavior is intentionally removed from V4:

- no multi-token vault model
- no ETH deposit / withdraw path
- no mixed “wallet for ETH + vault for ERC20” semantics

`VaultV4` is a USDC vault. That is the correct shape if the goal is dependable ERC-4626 accounting.

Interview note: this is the kind of scope simplification a senior engineer should defend clearly. If one vault mixes unrelated asset models, the surface area expands faster than the safety guarantees.

---

## Changes by issue ID

### V-01 — Replace principal-only accounting with full ERC-4626 accounting

Current root problem:

- `VaultV3` records ERC20 user balances as principal
- strategy yield increases total assets but does not increase user ledger balances
- yield becomes stranded because no user owns it in the ledger

`VaultV4` fix:

- inherit from OpenZeppelin `ERC4626`
- use USDC as the single underlying asset
- use ERC20 vault shares as the only ownership primitive
- implement `totalAssets()` as the sum of:
  - idle USDC held by the vault
  - USDC-equivalent assets reported by the strategy

Design consequence:

- users no longer own “principal balances”
- users own shares
- yield accrues automatically through exchange-rate growth

This eliminates the stranded-yield bug at the model level rather than patching it locally.

### V-02 — First-deposit inflation protection must come from proper ERC-4626 design

Current risk:

- a naive empty-vault share model allows the first depositor to manipulate the initial exchange rate

`VaultV4` fix:

- use OpenZeppelin ERC-4626 virtual-share / virtual-asset offset behavior
- do not implement custom dead-share math unless required by testing
- if a decimals offset override is needed, make it explicit and documented

Locked direction:

- inflation protection must come from the ERC-4626 design itself
- do not use a hand-rolled “virtual shares” layer if OpenZeppelin’s model already covers the invariant

Reason:

- this is exactly the kind of subtle accounting edge case where standards are more dependable than custom math

### V-03 — Replace timestamp-based large withdrawal approval with nonce-based approval

Current root problem:

- approval hashes include `block.timestamp`
- approval transaction and execution transaction necessarily occur in different blocks
- approvals mismatch and the feature is effectively broken

`VaultV4` fix:

- add user-specific withdrawal nonce state
- approval hash becomes `(user, receiver, owner, assets or shares, nonce)`
- treasurer approves an exact request
- execution consumes approval and advances the nonce

Design choice:

- tie the approval flow to ERC-4626 withdraw/redeem semantics
- prefer asset-based approval if the product thinks in USDC terms

### V-04 — `invest()` and `divest()` must respect pause

Current root problem:

- operational capital movement remains available while the vault is paused

`VaultV4` fix:

- gate `invest()` with `whenNotPaused`
- gate `divest()` with `whenNotPaused`
- keep emergency capital recovery callable while paused

### V-05 — `emergencyDivest()` must be `nonReentrant`

Current root problem:

- emergency fund recovery lacks the same reentrancy guard used elsewhere

`VaultV4` fix:

- `emergencyDivest()` must use `nonReentrant`

### V-06 — `divest(amount, minAmountOut)` slippage protection

Current root problem:

- the vault accepts strategy withdrawals without checking actual received assets

`VaultV4` fix:

- `divest()` takes both `amount` and `minAmountOut`
- measure vault asset balance before the strategy withdraw
- measure received assets after the strategy withdraw
- revert if actual received amount is below `minAmountOut`

This is especially important because the product is tested against live mainnet integrations, not only mock behavior.

### V-07 — Per-asset deposit cap becomes a single-asset vault cap

Current root problem:

- the old design assumed per-token deposit caps
- V4 is no longer a multi-token vault

`VaultV4` fix:

- replace per-token `depositCap` with a single `depositCap` for the vault asset
- `0` means unlimited
- wire the cap into ERC-4626 deposit/mint gating
- expose it through `maxDeposit()` and `maxMint()` behavior

Because the vault is now single-asset, a global cap is simpler and more correct than a token-indexed mapping.

### V-08 — Remove duplicate manual event emission

Current root problem:

- role-grant and pause flows emit duplicate events on top of OpenZeppelin internal emits

`VaultV4` fix:

- rely on OpenZeppelin event emission
- remove manual duplicate emits for those inherited behaviors

---

## Performance fee policy

This refactor must include protocol revenue as a first-class design constraint.

Locked policy:

- keep the existing ETH withdrawal fee model out of scope because ETH is removed from `VaultV4`
- add a performance fee on ERC20 strategy yield only
- fee applies only to realized profit
- fee is realized only on `divest()`
- treasury receives shares, not direct asset transfers

### Required state

```solidity
address public feeTreasury;
uint256 public performanceFeeBps;
uint256 public constant MAX_PERFORMANCE_FEE = 2000;
```

Locked defaults:

- `performanceFeeBps = 1000`
- `MAX_PERFORMANCE_FEE = 2000`

Meaning:

- default performance fee is 10% of realized profit
- hard cap is 20%

### Fee realization model

The fee must be based on realized yield, not mark-to-market unrealized changes.

On `divest(amount, minAmountOut)`:

1. measure actual assets received from strategy
2. determine how much of the withdrawal corresponds to principal vs profit
3. compute realized profit
4. compute fee in asset terms
5. convert fee assets into vault shares using ERC-4626 conversion rules
6. mint fee shares to `feeTreasury`
7. leave the underlying USDC inside the vault

### Why treasury gets shares instead of direct USDC

- avoids draining idle liquidity immediately
- keeps accounting consistent with ERC-4626 ownership semantics
- lets protocol revenue participate in the same vault accounting model as users

### Critical implementation requirement

This part should not be hand-waved. A clean fee design needs explicit principal tracking for strategy capital.

Recommended minimal accounting:

```solidity
uint256 public strategyPrincipal;
```

Interpretation:

- `strategyPrincipal` tracks the vault asset amount that has been deployed as principal and not yet returned through divest
- unrealized gains are not added to `strategyPrincipal`
- realized profit on a divest is computed against the principal portion being unwound

This is the one place where extra vault-side accounting is still justified even in ERC-4626, because ERC-4626 does not itself define performance-fee realization semantics.

### Required permissions

- `setFeeTreasury(address)` — `DEFAULT_ADMIN_ROLE`
- `setPerformanceFee(uint256)` — `TREASURER_ROLE`

Validation:

- treasury cannot be zero address
- fee cannot exceed `MAX_PERFORMANCE_FEE`

Interview note: this is a strong interview discussion point. ERC-4626 solves ownership accounting, but it does not solve business-policy accounting like realized-fee logic. That still needs explicit design.

---

## Updated events and interfaces

`VaultV4` should expose standard ERC-4626 behavior instead of custom multi-token deposit/withdraw APIs.

### Core user-facing interface

Required standard functions:

- `deposit(uint256 assets, address receiver)`
- `mint(uint256 shares, address receiver)`
- `withdraw(uint256 assets, address receiver, address owner)`
- `redeem(uint256 shares, address receiver, address owner)`
- `totalAssets()`
- `convertToShares(uint256 assets)`
- `convertToAssets(uint256 shares)`
- `previewDeposit(uint256 assets)`
- `previewMint(uint256 shares)`
- `previewWithdraw(uint256 assets)`
- `previewRedeem(uint256 shares)`
- `maxDeposit(address receiver)`
- `maxMint(address receiver)`
- `maxWithdraw(address owner)`
- `maxRedeem(address owner)`

### Strategy control interface

Required vault-specific functions:

- `setStrategy(address strategy)`
- `invest(uint256 amount)`
- `divest(uint256 amount, uint256 minAmountOut)`
- `emergencyDivest()`
- `setDepositCap(uint256 cap)`
- `setFeeTreasury(address treasury)`
- `setPerformanceFee(uint256 newFeeBps)`
- `approveLargeWithdrawal(...)`

### New events

```solidity
event StrategySet(address indexed strategy);
event Invested(uint256 amount);
event Divested(uint256 requestedAmount, uint256 receivedAmount);
event DepositCapUpdated(uint256 oldCap, uint256 newCap);
event LargeWithdrawalRequested(address indexed user, uint256 assets, uint256 nonce, bytes32 requestHash);
event LargeWithdrawalApproved(address indexed user, uint256 assets, uint256 nonce, bytes32 requestHash);
event FeeTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
event PerformanceFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
event PerformanceFeeAccrued(uint256 realizedProfit, uint256 feeAssets, uint256 feeShares);
```

Do not duplicate inherited OpenZeppelin role or pause events.

---

## Test plan

This project tests against mainnet conditions. That must be reflected directly in the test plan.

### Unit test groups

Required groups:

- share accounting correctness
- inflation attack protection
- withdraw / divest coordination
- nonce-based large withdrawal flow
- pause / emergency behavior
- deposit cap behavior
- performance fee behavior
- treasury share minting behavior

Required examples:

| Test | Purpose |
|---|---|
| `testDepositMints4626Shares` | Deposit mints ERC-4626 shares correctly |
| `testRedeemReturnsProRataAssets` | Redeem burns shares and returns proportional USDC |
| `testSharePriceGrowsAfterYield` | Strategy yield increases asset value per share |
| `testTwoUsersShareYieldProportionally` | Multiple users participate in yield proportionally |
| `testInflationAttackPrevented` | First-deposit manipulation is economically blocked |
| `testWithdrawRevertsIfIdleLiquidityInsufficient` | Withdraw fails if funds are still deployed and vault cannot source liquidity |
| `testDivestThenWithdrawSucceeds` | Divest restores liquidity and withdraw succeeds |
| `testDivestSlippageReverts` | `minAmountOut` protection works |
| `testLargeWithdrawalNonceFlow` | Request, approve, execute flow works |
| `testLargeWithdrawalReplayFails` | Approval cannot be replayed |
| `testInvestRespectsPause` | `invest()` is disabled while paused |
| `testDivestRespectsPause` | `divest()` is disabled while paused |
| `testEmergencyDivestWhilePaused` | emergency recovery remains callable |
| `testDepositCapEnforced` | deposits above cap revert |
| `testMaxDepositReflectsCap` | `maxDeposit()` reflects configured cap |

### Fee-specific tests

These are mandatory:

| Test | Purpose |
|---|---|
| `testPerformanceFeeOnRealizedYieldOnly` | Fee applies only to realized profit |
| `testNoPerformanceFeeWhenNoProfit` | No fee when divest realizes no gain |
| `testTreasuryReceivesSharesNotAssets` | Treasury receives shares, not direct USDC |
| `testUserReceivesNetYieldAfterFee` | Users receive yield minus performance fee |
| `testPerformanceFeeRespectsCap` | Fee setter cannot exceed the hard cap |
| `testSetFeeTreasuryAdminOnly` | Only admin can set treasury |
| `testSetPerformanceFeeTreasurerOnly` | Only treasurer can set fee |
| `testMultipleUsersShareNetYieldAndTreasuryGetsFeeShares` | Multi-user fee dilution remains proportional |
| `testDivestWithSlippageAndFee` | Slippage check and fee realization interact correctly |

### Mainnet-oriented validation

This is not optional hardening. It is part of the normal contract validation path.

Required validation targets:

- local Anvil
- Base mainnet fork
- Arbitrum mainnet fork

Required expectations:

- live Aave integration remains compatible on Base
- live Aave integration remains compatible on Arbitrum
- invest / divest / totalAssets behavior matches live protocol expectations
- deploy script and constructor wiring work cleanly in redeploy flow

---

## Files to create / modify

| File | Action |
|---|---|
| `contracts/VaultV4.sol` | Rewrite as a true OpenZeppelin ERC-4626 USDC vault |
| `test/VaultV4.t.sol` | Rewrite around ERC-4626 behavior and fee realization |
| `script/Deploy.s.sol` | Update to deploy `VaultV4` with single-asset USDC config |
| `frontend/lib/vault.ts` | Replace custom V3-style token ABI assumptions with ERC-4626 ABI |
| `frontend/hooks/useVault.ts` | Rewrite deposit / withdraw flow around `deposit`, `withdraw`, `redeem`, previews, and allowances |
| `frontend/app/` components using vault actions | Remove ETH-specific V4 assumptions |
| `ponder-indexing/` config and schema | Update addresses and event model after redeploy |
| `DEPLOYED_ADDRESSES.md` | Update after Base / Arbitrum redeploy |

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
9. update frontend ABI/hooks
10. update Ponder config and addresses docs

This order is correct for this project because mainnet-fork validation is part of the core acceptance path, not a later add-on.

---

## Assumptions

- `VaultV3` has no real users, so no migration contract or migration script is needed
- `VaultV4` is the intended production replacement
- `VaultV4` drops the multi-token model and removes ETH from scope
- `VaultV4` is a single-asset USDC ERC-4626 vault
- mainnet fork testing is part of the normal validation path
- Base and Arbitrum remain the supported deployment targets
- `AaveStrategy.sol` and `IStrategy.sol` stay unchanged unless implementation proves otherwise
- frontend UX should use native ERC-4626 asset/share semantics rather than custom token-balance semantics
- performance fee is the only new platform revenue mechanism introduced in V4
