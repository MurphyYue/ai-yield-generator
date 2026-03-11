 🐛 Bug Summary & Fix
                                                                                                                          
  Bug 1: Vault Balance Not Updating After Transactions      

  Problem:
  - After depositing ETH to the vault, the Vault Balance displayed 0 ETH
  - Even after reconnecting the wallet, it still showed 0

  Root Cause:
  1. Contract not deployed: Anvil was restarted, losing the deployed contract
  2. No auto-refetch: The hook didn't automatically refresh the balance after transactions completed

  Fix:
  1. Redeployed the Vault contract to a new address
  2. Added useEffect to automatically refetch balance after successful transactions:

  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess) {
      refetchVaultBalance()
    }
  }, [isDepositSuccess, isWithdrawSuccess, refetchVaultBalance])

  ---
  Bug 2: ReferenceError (Variable Initialization Order)

  Problem:
  Uncaught ReferenceError: Cannot access 'isDepositSuccess' before initialization

  Root Cause:
  - Added debug useEffect that referenced isDepositSuccess before it was declared
  - React hooks must follow the "Rules of Hooks" - hooks cannot be called conditionally or before all state is initialized

  Fix:
  - Moved the useEffect to run AFTER all the useWaitForTransactionReceipt hooks were called
  - Ensured all hook calls happen in the same order on every render

  ---
  Lesson Learned:

  When using React hooks (especially useEffect), always ensure:
  1. Hooks are called in the same order on every render
  2. Variables used in useEffect are declared BEFORE the effect runs
  3. The "Rules of Hooks" are followed (no conditional hooks)---

## Bug 3: ETH Balance Not Updating After Transactions (CIRCULAR DEPENDENCIES)

### Problem
- After depositing or withdrawing, ETH Balance didn't update
- Had to reconnect wallet to see the new balance
- Console showed: `useVaultBalance - shouldRefetch: false`

### Root Cause
- Attempted to coordinate two separate hooks (`useVaultBalance` and `useVaultContract`)
- This created circular dependencies and timing issues
- Boolean flags (`isDepositSuccess`) are only `true` for milliseconds, too fast for `useEffect` to catch
- Calling hooks within hooks violates React's Rules of Hooks

### Broken Approach
```typescript
// ❌ Circular dependency
export function useVaultBalance() {
  const { isDepositSuccess } = useVaultContract()  // Creates new instance
}

// Component
const { vaultBalance } = useVaultContract()  // Instance #1
const { ethBalance } = useVaultBalance()     // Creates Instance #2 again!
```

### Solution: Unified Hook
```typescript
// ✅ Single hook manages everything
export function useVault() {
  const ethBalance = useBalance(...)
  const vaultBalance = useReadContract(...)
  const { isSuccess } = useWaitForTransactionReceipt(...)

  useEffect(() => {
    if (isSuccess) {
      refetchEthBalance()    // Direct access, reliable
      refetchVaultBalance()  // Direct access, reliable
    }
  }, [isSuccess])
}
```

### Key Learnings: Circular Dependencies in React Hooks

**What Went Wrong:**
1. Multiple Hook Instances: Each hook call creates a new instance with its own state
2. State Synchronization: Different instances can't share state easily
3. Timing Issues: Boolean flags are only true for milliseconds, missed by useEffect
4. Race Conditions: By the time one hook reads state, it has already changed

**Why Unified Hook Works:**
- Single source of truth
- All state in same scope
- Direct access to all data
- Simple, predictable data flow

### Hook Coordination Strategies

**Strategy A: Unified Hook (Recommended for this case)** ✅
```typescript
const { ethBalance, vaultBalance, deposit } = useVault()
```
When to use: Tightly coupled data, shared triggers, simple feature scope

**Strategy B: Separate Hooks with Props** (More complex but modular)
```typescript
const vaultState = useVaultContract()
const ethBalance = useVaultBalance({ trigger: vaultState.transactionHash })
```
When to use: Large apps, reusable hooks, clear separation of concerns

**Strategy C: Context/State Management** (Global state)
```typescript
const VaultContext = createContext()
```
When to use: App-wide state, many components need same data

**NEVER: Call one hook inside another hook** ❌ (circular dependency)

### Resources
- [React's Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [wagmi Documentation](https://wagmi.sh/)
- [React Hook Patterns](https://usehooks.com/)

### Status
✅ Resolved with unified hook approach

### Time to Fix
~2 hours (including learning curve)

### Key Takeaway
When hooks need to coordinate state changes, unified hooks are simpler and more reliable than complex coordination mechanisms.
