# VaultV4 Refactor Plan

**Source**: `VAULTV3_ISSUES_REPORT.md`
**Target file**: `contracts/VaultV4.sol`
**Test file**: `test/VaultV4.t.sol`

---

## Why a new file, not a patch

The ERC-4626 change is storage-breaking. `tokenBalances[token][user]` is replaced by a shares mapping with a completely different semantic. Existing mainnet depositors on VaultV3 would need to migrate. A new contract file makes the versioning explicit, keeps VaultV3 as a reference, and follows standard DeFi practice (Aave V2→V3, Uniswap V2→V3).

---

## What stays the same

- All four roles: `DEFAULT_ADMIN_ROLE`, `MANAGER_ROLE`, `OPERATOR_ROLE`, `TREASURER_ROLE`
- ETH deposit/withdraw (unchanged — ETH is not yield-bearing in this vault)
- Blacklist, pause/unpause
- Strategy interface (`IStrategy`, `AaveStrategy` — no changes needed)
- `invest()` / `divest()` / `emergencyDivest()` — logic preserved, modifiers added
- `setStrategy()`, `getTotalBalance()`, `getStrategyBalance()`

---

## Changes by issue ID

### V-01 + V-02 — ERC-4626 share accounting (replaces `tokenBalances`)

This is the core change. Everything else is additive.

**Remove**
```solidity
mapping(address => mapping(address => uint256)) public tokenBalances;
```

**Add**
```solidity
// shares[token][user] — how many shares the user holds for a given token
mapping(address => mapping(address => uint256)) public shares;

// totalShares[token] — total shares outstanding for a given token
mapping(address => uint256) public totalShares;

// totalDeposited[token] — sum of all principal deposited (used for deposit cap)
mapping(address => uint256) public totalDeposited;
```

**Exchange rate formula**

```
assetsPerShare = totalAssets(token) / totalShares[token]

// On deposit:
sharesToMint = amount * totalShares[token] / totalAssets(token)
// (if totalShares == 0: sharesToMint = amount, bootstraps the rate at 1:1)

// On withdrawal:
assetsToSend = sharesToBurn * totalAssets(token) / totalShares[token]
```

`totalAssets(token)` = `IERC20(token).balanceOf(address(this))` + `strategy.totalAssets()` (if strategy token matches).

**Inflation attack protection (V-02)**

On the very first deposit (totalShares == 0), mint `amount * VIRTUAL_SHARES` shares and permanently lock `VIRTUAL_SHARES` of them to `address(0)`. This makes the cost of the inflation attack proportional to `VIRTUAL_SHARES`, which is set high enough to be economically infeasible.

```solidity
uint256 private constant VIRTUAL_SHARES = 1e3; // 1000 dead shares on first deposit
```

Alternatively, use OpenZeppelin's ERC-4626 `_decimalsOffset()` virtual offset if inheriting from their base. Either approach is acceptable.

**Updated `depositToken()`**
```solidity
function depositToken(address token, uint256 amount) external nonReentrant whenNotPaused {
    // existing checks: amount > 0, token != 0, not blacklisted, deposit cap

    uint256 supply = totalShares[token];
    uint256 assets = _totalAssets(token);

    uint256 sharesToMint;
    if (supply == 0) {
        sharesToMint = amount * VIRTUAL_SHARES;
        shares[token][address(0)] += VIRTUAL_SHARES; // dead shares
        totalShares[token] += VIRTUAL_SHARES;
    } else {
        sharesToMint = (amount * supply) / assets;
    }
    require(sharesToMint > 0, "Zero shares minted");

    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    shares[token][msg.sender] += sharesToMint;
    totalShares[token] += sharesToMint;
    totalDeposited[token] += amount;

    emit TokenDeposited(msg.sender, token, amount, sharesToMint);
}
```

**Updated `withdrawToken()`**
```solidity
function withdrawToken(address token, uint256 sharesToBurn) external nonReentrant whenNotPaused {
    require(sharesToBurn > 0, "Amount must be > 0");
    require(shares[token][msg.sender] >= sharesToBurn, "Insufficient shares");
    require(!blacklisted[msg.sender], "Address is blacklisted");

    uint256 assets = (sharesToBurn * _totalAssets(token)) / totalShares[token];
    require(IERC20(token).balanceOf(address(this)) >= assets, "Insufficient vault liquidity — divest first");

    shares[token][msg.sender] -= sharesToBurn;
    totalShares[token] -= sharesToBurn;

    IERC20(token).safeTransfer(msg.sender, assets);
    emit TokenWithdrawn(msg.sender, token, assets, sharesToBurn);
}
```

Note: if funds are currently deployed in Aave, the vault's idle balance may be less than `assets`. The error message tells the operator to call `divest()` first. This is intentional — it keeps the withdrawal path simple and avoids auto-divesting on every user withdrawal.

**New view functions**
```solidity
// How many tokens a user's shares are currently worth
function previewWithdraw(address token, address user) external view returns (uint256 assets);

// How many shares a deposit of `amount` would mint right now
function previewDeposit(address token, uint256 amount) external view returns (uint256 sharesToMint);

// User's share balance
function getShares(address token, address user) external view returns (uint256);
```

---

### V-03 — Large withdrawal hash: replace `block.timestamp` with nonce

**Remove**: `block.timestamp` from hash computation.

**Add**:
```solidity
mapping(address => uint256) public withdrawalNonce; // per-user nonce
```

**New flow**:
1. User calls `requestLargeWithdrawal(amount)` → increments their nonce, emits `LargeWithdrawalRequested(user, amount, nonce)`
2. Treasurer calls `approveLargeWithdrawal(user, amount, nonce)` → stores approval keyed by `keccak256(user, amount, nonce)`
3. User calls `withdraw(amount)` → recomputes hash with their current nonce, checks approval, deletes it, increments nonce

```solidity
// New request function (called by user)
function requestLargeWithdrawal(uint256 amount) external {
    uint256 nonce = withdrawalNonce[msg.sender];
    bytes32 requestHash = keccak256(abi.encodePacked(msg.sender, amount, nonce));
    emit LargeWithdrawalRequested(msg.sender, amount, requestHash);
}

// Hash helper (used by treasurer off-chain to compute what to approve)
function getWithdrawalRequestHash(address user, uint256 amount) external view returns (bytes32) {
    return keccak256(abi.encodePacked(user, amount, withdrawalNonce[user]));
}
```

---

### V-04 — `invest()` and `divest()` bypass pause

One-line fix each:

```solidity
function invest(address token, uint256 amount) external nonReentrant whenNotPaused onlyRole(TREASURER_ROLE)
function divest(uint256 amount, uint256 minAmountOut) external nonReentrant whenNotPaused onlyRole(TREASURER_ROLE)
```

`emergencyDivest()` intentionally keeps no pause check — it is the escape hatch.

---

### V-05 — `emergencyDivest()` missing `nonReentrant`

```solidity
function emergencyDivest() external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE)
```

---

### V-06 — No slippage protection on `divest()`

Add `minAmountOut` parameter:

```solidity
function divest(uint256 amount, uint256 minAmountOut) external nonReentrant whenNotPaused onlyRole(TREASURER_ROLE) {
    require(address(strategy) != address(0), "No strategy set");
    require(amount > 0, "Amount must be > 0");
    require(strategy.totalAssets() >= amount, "Insufficient strategy balance");

    address token = strategy.underlyingToken();
    uint256 balanceBefore = IERC20(token).balanceOf(address(this));

    bool success = strategy.withdraw(amount);
    require(success, "Strategy withdraw failed");

    uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;
    require(received >= minAmountOut, "Slippage: received less than minAmountOut");

    emit Divested(token, received);
}
```

---

### V-07 — No deposit cap

```solidity
// Configurable per token, set by TREASURER_ROLE. 0 = no cap.
mapping(address => uint256) public depositCap;

function setDepositCap(address token, uint256 cap) external onlyRole(TREASURER_ROLE) {
    depositCap[token] = cap;
    emit DepositCapUpdated(token, cap);
}
```

In `depositToken()`, add:
```solidity
if (depositCap[token] > 0) {
    require(totalDeposited[token] + amount <= depositCap[token], "Deposit cap reached");
}
```

---

### V-08 — Double event emission

Remove the manual `emit` lines from:
- `grantManagerRole()` (line 92)
- `grantOperatorRole()` (line 97)
- `grantTreasurerRole()` (line 103)
- `pause()` (line 116–117)
- `unpause()` (line 121–122)

OpenZeppelin already emits these internally.

---

## Updated event signatures

```solidity
// Updated — adds shares parameter
event TokenDeposited(address indexed user, address indexed token, uint256 amount, uint256 shares);
event TokenWithdrawn(address indexed user, address indexed token, uint256 amount, uint256 shares);

// New
event DepositCapUpdated(address indexed token, uint256 cap);
event LargeWithdrawalRequested(address indexed user, uint256 amount, bytes32 indexed requestHash);
```

---

## Test plan for `VaultV4.t.sol`

The existing `VaultV3.t.sol` tests cover roles, pause, blacklist, ETH deposit/withdraw, fees, and threshold — all of which carry over unchanged. The new test file should add:

| Test | What it covers |
|---|---|
| `testDepositMintsShares` | First deposit mints shares at 1:1 (minus dead shares) |
| `testShareValueGrowsWithYield` | After simulated yield, `previewWithdraw` returns more than deposited |
| `testWithdrawBurnsCorrectShares` | Shares decrease proportionally on withdrawal |
| `testTwoUsersShareYieldProportionally` | User A deposits 100, User B deposits 100, yield of 10 → each gets 5 |
| `testInflationAttackPrevented` | Attacker deposits 1 wei + donates large amount → second depositor still gets fair shares |
| `testWithdrawRevertsIfFundsInStrategy` | Funds in Aave → `withdrawToken` reverts with liquidity message |
| `testDivestThenWithdraw` | `divest()` → `withdrawToken()` succeeds |
| `testDivestSlippageReverts` | `divest()` with `minAmountOut` higher than received → reverts |
| `testLargeWithdrawalNonceFlow` | Full request → approve → execute flow works |
| `testLargeWithdrawalWrongNonceReverts` | Approval for nonce N cannot be used at nonce N+1 |
| `testInvestRespectsPause` | `invest()` reverts when paused |
| `testDivestRespectsPause` | `divest()` reverts when paused |
| `testEmergencyDivestWhilePaused` | `emergencyDivest()` succeeds even when paused |
| `testDepositCapEnforced` | Deposit above cap reverts |
| `testDepositCapZeroMeansNoCap` | Cap of 0 allows unlimited deposits |

---

## Files to create / modify

| File | Action |
|---|---|
| `contracts/VaultV4.sol` | Create — full rewrite based on this plan |
| `test/VaultV4.t.sol` | Create — new test suite (VaultV3.t.sol stays untouched) |
| `script/Deploy.s.sol` | Update to deploy VaultV4 instead of VaultV3 |
| `DEPLOYED_ADDRESSES.md` | Update after redeployment |
| `frontend/lib/vault.ts` | Update ABI import to VaultV4 |
| `ponder-indexing/ponder.config.ts` | Update contract address + startBlock |

`AaveStrategy.sol` and `IStrategy.sol` require **no changes**.

---

## Implementation order

1. Write `VaultV4.sol` — all V-01 through V-08 fixes in one pass
2. Write `VaultV4.t.sol` — unit tests, verify `forge test` passes
3. Run fork tests against Base and Arbitrum to confirm strategy integration
4. Update `Deploy.s.sol`
5. Deploy to Anvil, verify smoke test
6. Deploy to mainnet, update addresses
7. Update frontend ABI + Ponder config
