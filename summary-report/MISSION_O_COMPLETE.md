# Mission O Complete — Aave Strategy Architecture (Strategy Pattern)

## What We Built (4 Contract Files)

```
contracts/
├── IStrategy.sol          — interface (the "contract")
├── AaveStrategy.sol       — implementation (the "adapter")
├── mocks/
│   └── MockAavePool.sol   — test stand-in for Aave
└── VaultV3.sol            — updated with 5 new functions
```

**New VaultV3 functions:** `setStrategy()`, `invest()`, `divest()`, `emergencyDivest()`, `getTotalBalance()`, `getStrategyBalance()`, `getVaultTokenHoldings()`

**Test coverage:** 14 new tests in `test/AaveStrategy.t.sol` — all pass (63/63 total)

**Deployed (Anvil chain 31337) — final addresses after redeployment:**

| Contract | Address |
|---|---|
| MockERC20 (USDT) | `0x851356ae760d987E095750cCeb3bC6014560891C` |
| VaultV3 | `0xf5059a5D33d5853360D16C683c16e67980206f36` |
| MockAavePool | `0x95401dc811bb5740090279Ba06cfA8fcF6113778` |
| AaveStrategy | `0x998abeb3E57409262aE5b751f60747921B33613E` |

---

## The 3 Core Design Decisions

### 1. Interface Segregation — `IStrategy.sol`

```solidity
interface IStrategy {
    function deposit(uint256 amount) external returns (bool);
    function withdraw(uint256 amount) external returns (bool);
    function totalAssets() external view returns (uint256);
    function underlyingToken() external view returns (address);
    function emergencyWithdraw() external returns (bool);
}
```

`VaultV3` stores `IStrategy public strategy` — it only ever talks to this interface, never to `AaveStrategy` directly. To swap to Compound or Lido tomorrow: deploy a new contract implementing `IStrategy`, call `vault.setStrategy(newAddress)`. Zero vault code changes.

**Frontend analogy:** Exactly like a TypeScript interface or React component prop type. `VaultDashboard` doesn't care which panel renders — it just expects `onIntentParsed`. Same concept, different layer.

---

### 2. Permission Locking — `onlyVault` modifier

```solidity
modifier onlyVault() {
    require(msg.sender == vault, "AaveStrategy: caller is not the vault");
    _;
}

function deposit(uint256 amount) external onlyVault returns (bool) { ... }
function withdraw(uint256 amount) external onlyVault returns (bool) { ... }
```

The strategy is a **subordinate contract** — it has no independent authority. Only the Vault can move funds through it. Even the deployer cannot call `deposit()` directly.

Compare to Day 3's SoD:
- `onlyRole(TREASURER_ROLE)` — guards who inside the vault can trigger investment
- `onlyVault` — guards who outside the vault can touch the strategy

Two different layers, guarding the same funds at different boundaries.

---

### 3. Failure Isolation — `try/catch`

```solidity
function deposit(uint256 amount) external onlyVault returns (bool) {
    IERC20(token).approve(aavePool, amount);

    try IAavePool(aavePool).supply(token, amount, address(this), 0) {
        _depositedToPool += amount;
        emit Deposited(amount);
        return true;
    } catch {
        // Aave failed — return tokens to vault so nothing is lost
        IERC20(token).approve(aavePool, 0);
        IERC20(token).transfer(vault, amount);
        return false;
    }
}
```

If Aave is hacked, paused, or buggy → tokens return to vault, nothing is lost. Normal user `deposit()` / `withdraw()` in the vault are **completely unaffected**.

**Frontend analogy:** Wrapping a third-party API call in try/catch and showing a fallback UI. Identical principle, different layer.

---

## The Fund Flow

```
Treasurer calls vault.invest(USDT, 500)
    │
    ├─ vault transfers 500 USDT → strategy contract
    │
    └─ vault calls strategy.deposit(500)
            │
            ├─ strategy approves Aave pool
            │
            ├─ try: aavePool.supply(USDT, 500, strategy, 0)
            │       └─ SUCCESS: _depositedToPool += 500, return true
            │
            └─ catch: transfer 500 USDT back to vault, return false
                      └─ vault.invest() reverts: "Strategy deposit failed"
                         (tokens are back in vault — nothing lost)
```

---

## What a Web3 Architect Learns from This Mission

### 1. External calls are your biggest risk surface
Every `call()` to an external contract is a potential failure point AND a reentrancy vector. Pattern to internalize: **simulate → guard → execute → verify**. Never assume external calls succeed.

### 2. Interfaces are how you build upgradeable systems without proxy complexity
Proxy patterns (used by Aave itself) are complex and risky. For strategies, "swappable implementation behind a stable interface" is simpler: no proxy needed, just `setStrategy()`. This is the foundation of ERC-4626 vault standards.

### 3. Internal accounting vs. on-chain state
`_depositedToPool` is tracked as a private variable rather than querying Aave's aToken balance every time. This is a deliberate trade-off: cheaper reads, but requires careful accounting. In production (e.g., Yearn Finance), `totalAssets()` calls back to the protocol to get the real current value including accrued yield. That's the next evolution.

### 4. MockAavePool taught you a real professional skill
Every DeFi team writes mock contracts for dependencies. You can't run Aave locally — so you write a minimal stand-in with the same function signatures. The pattern: *same interface, fake state, controllable failure mode* (`setRevert(true)`). This is how Foundry tests catch real bugs before deployment.

### 5. Role separation across contract boundaries
- `invest()` requires `TREASURER_ROLE` inside the vault
- `deposit()` requires `onlyVault` inside the strategy

Two contracts, two layers of permission, protecting the same funds from different attack vectors. A single compromised key cannot drain funds unilaterally — this is defense in depth.

### 6. Why USDT only (not ETH)
Aave is an ERC20-based protocol. Native ETH must first be wrapped to WETH before Aave can accept it. Each `AaveStrategy` instance manages **one token** (set as `immutable` in constructor) — this follows Single Responsibility and makes auditing simpler. To add ETH yield: deploy a separate `AaveStrategy` pointing to WETH, plus a wrapping step.

---

## Files Created / Modified

| File | Change |
|---|---|
| `contracts/IStrategy.sol` | NEW — generic strategy interface |
| `contracts/AaveStrategy.sol` | NEW — Aave V3 adapter with try/catch |
| `contracts/mocks/MockAavePool.sol` | NEW — local test mock (toggleable failure) |
| `contracts/VaultV3.sol` | MODIFIED — added 7 strategy functions + events |
| `test/AaveStrategy.t.sol` | NEW — 14 tests (access control, happy path, failure isolation, emergency) |
| `script/Deploy.s.sol` | UPDATED — deploys all 4 contracts + registers strategy |
| `frontend/lib/vault.ts` | UPDATED — new contract addresses + 7 ABI entries |
| `frontend/hooks/useVault.ts` | UPDATED — `invest()`, `divest()`, `strategyBalance`, `vaultTokenHoldings`, refetch wiring |
| `frontend/components/AdminPanel.tsx` | UPDATED — Invest/Divest UI with correct balance display |

---

## Bug Found & Fixed Post-Implementation

### Problem: `getTotalBalance` misused as "In Aave" display

**Root cause:** `getTotalBalance(token)` in VaultV3 returns `vault ERC20 balance + strategy.totalAssets()` — the combined total. The AdminPanel was using this as the "In Aave" value.

After depositing 110 USDT (none yet invested):
- `getTotalBalance` = 110 (vault) + 0 (Aave) = **110**
- "In Aave" showed 110 — wrong

After investing 10 USDT:
- `getTotalBalance` = 100 (vault) + 10 (Aave) = **110** — sum never changes
- Both "Vault idle" and "In Aave" still showed 110 — both wrong

**Fix:** Added two dedicated view functions to VaultV3:

```solidity
// Returns ONLY what's in Aave (strategy.totalAssets())
function getStrategyBalance() external view returns (uint256) {
    if (address(strategy) == address(0)) return 0;
    return strategy.totalAssets();
}

// Returns vault's idle ERC20 holdings (decreases when invest() is called)
function getVaultTokenHoldings(address token) external view returns (uint256) {
    return IERC20(token).balanceOf(address(this));
}
```

AdminPanel now reads:
- **"Vault idle"** → `getVaultTokenHoldings()` — decreases when you invest
- **"In Aave"** → `getStrategyBalance()` — increases when you invest

**Lesson:** `getTotalBalance` = vault + Aave is useful for showing total AUM (assets under management), but is the wrong value for showing the individual breakdown. Always read the specific value you intend to display, not a derived aggregate.

### Problem: "Vault idle" not updating after deposit

**Root cause:** `refetchVaultTokenHoldings` was wired into the invest/divest `useEffect` but missed from the deposit/withdraw `useEffect`. Since depositing USDT also changes the vault's idle ERC20 balance, the refetch needed to be in both effects.

**Fix:** Added `refetchVaultTokenHoldings()` to the deposit/withdraw success handler:

```typescript
if (isDepositTokenSuccess || isWithdrawTokenSuccess || ...) {
  setTimeout(() => {
    refetchUsdtBalance()
    refetchVaultUsdtBalance()
    refetchUsdtAllowance()
    refetchVaultTokenHoldings()  // ← added
  }, 1000)
}
```

**Lesson:** Every balance displayed in the UI must have its refetch wired to every transaction that can change it. Map each piece of state to all its possible mutation sources — not just the "obvious" one.
