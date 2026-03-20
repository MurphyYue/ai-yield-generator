# Risk Assessment Guide - VaultV3

## Overview

The VaultV3 implements a multi-layer risk assessment system that evaluates transactions at different stages to protect users and the protocol.

---

## Risk Assessment Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: AI Assessment                    │
│                    (Frontend → API → Dify)                  │
│                                                              │
│  User types "withdraw all ETH"                              │
│  → AI determines intent & calculates percentage             │
│  → Returns { amount: "100%", risk_level: calculated }      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 2: API Calculation                 │
│                    (app/api/chat/route.ts)                  │
│                                                              │
│  Convert "100%" → 10 ETH (using vault balance)            │
│  Calculate: 10/10 = 100% → HIGH risk                      │
│  Return: { amount: 10, risk_level: "high" }               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 3: UI Confirmation                │
│                    (AIPanel.tsx)                           │
│                                                              │
│  HIGH risk → Show confirmation modal                       │
│  MEDIUM risk → Show warning banner                          │
│  LOW risk → Proceed directly                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 4: Simulation                      │
│                    (useVault.ts - wagmi)                    │
│                                                              │
│  eth_call before wallet signature                            │
│  Catches: insufficient balance, paused, access denied       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 5: Contract                        │
│                    (VaultV3.sol)                            │
│                                                              │
│  AccessControl: Role-based permissions                       │
│  Pausable: Emergency circuit breaker                       │
│  ReentrancyGuard: Reentrancy protection                    │
│  Blacklist: Address blocking                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Risk Levels

### HIGH Risk

**Triggers:**
- Withdrawal ≥90% of vault balance
- Large absolute amounts (≥10 ETH or ≥10000 USDT)

**User Experience:**
- Confirmation modal appears
- User must click "Confirm & Continue"
- MetaMask popup only after confirmation

**Risk Reason Examples:**
- "Withdrawing 100% of ETH balance - near complete withdrawal"
- "Large withdrawal of 15 ETH - exceeds safe threshold"

### MEDIUM Risk

**Triggers:**
- Withdrawal ≥50% of vault balance
- Does not include large absolute amounts

**User Experience:**
- Warning banner displayed
- Single confirmation (no double confirmation)
- Transaction proceeds normally

**Risk Reason Examples:**
- "Withdrawing 60% of USDT balance - significant withdrawal"
- "Withdrawing 50% of ETH balance - significant withdrawal"

### LOW Risk

**Triggers:**
- Any deposit operation
- Withdrawal <50% of vault balance

**User Experience:**
- No warning or confirmation
- Direct transaction flow

**Risk Reason Examples:**
- "Deposit operation - putting funds into vault"
- "Withdrawing 30% of ETH balance - routine operation"

---

## Risk Calculation Logic

### Backend Calculation (API Route)

```typescript
function calculateRisk(
  action: string,
  amount: number,
  token: string,
  vaultBalance: number
): RiskAssessment {
  // Calculate percentage of vault balance
  const percentage = vaultBalance > 0 ? (amount / vaultBalance) * 100 : 0

  if (action === 'deposit') {
    return { risk_level: 'low', risk_reason: 'Deposit operation' }
  }

  if (action === 'withdraw') {
    // Check large absolute amounts first (priority)
    if ((token === 'ETH' && amount >= 10) ||
        (token === 'USDT' && amount >= 10000)) {
      return {
        risk_level: 'high',
        risk_reason: `Large withdrawal of ${amount} ${token} - exceeds safe threshold`
      }
    }

    // Check percentage-based risk
    if (percentage >= 90) {
      return {
        risk_level: 'high',
        risk_reason: `Withdrawing ${percentage.toFixed(0)}% of ${token} balance`
      }
    }

    if (percentage >= 50) {
      return {
        risk_level: 'medium',
        risk_reason: `Withdrawing ${percentage.toFixed(0)}% of ${token} balance`
      }
    }

    return {
      risk_level: 'low',
      risk_reason: `Withdrawing ${percentage.toFixed(0)}% of ${token} balance`
    }
  }

  return { risk_level: 'low', risk_reason: 'Unknown operation' }
}
```

### Percentage Calculation

```
percentage = (withdraw_amount / vault_balance) * 100

Examples:
- User has 10 ETH in vault
- User withdraws 5 ETH
- percentage = (5 / 10) * 100 = 50% → MEDIUM risk

- User has 1000 USDT in vault
- User withdraws 950 USDT
- percentage = (950 / 1000) * 100 = 95% → HIGH risk
```

---

## Supported Commands

### English

| Command | Amount | Risk Level | Reason |
|---------|--------|------------|--------|
| "deposit 1 ETH" | 1 ETH | LOW | Deposit operation |
| "withdraw 0.5 ETH" | 0.5 ETH | LOW | 5% of balance |
| "withdraw all ETH" | 100% | HIGH | Complete withdrawal |
| "withdraw 50% ETH" | 50% | MEDIUM | Significant withdrawal |
| "withdraw 30% ETH" | 30% | LOW | Routine operation |
| "withdraw 10 ETH" | 10 ETH | HIGH | Large absolute amount |

### Chinese

| Command | Amount | Risk Level | Reason |
|---------|--------|------------|--------|
| "存入 100 USDT" | 100 USDT | LOW | Deposit operation |
| "提取 0.5 ETH" | 0.5 ETH | LOW | 5% of balance |
| "取出所有 ETH" | 100% | HIGH | Complete withdrawal |
| "提取 50% USDT" | 50% | MEDIUM | Significant withdrawal |

### Percentage Formats

| Input | Parsed as |
|-------|-----------|
| "all", "全部", "所有" | 100% |
| "half", "一半" | 50% |
| "30%" | 30% |
| "most", "大部分" | 80% |
| "some", "一些" | 20% |

---

## Simulation Errors

After risk assessment, simulation catches technical errors:

### Error Types

| Error Type | Message | Trigger |
|------------|---------|---------|
| `paused` | "System is paused. Contact admin to resume operations." | Contract is paused |
| `access_denied` | "Insufficient permissions for this operation." | Missing role |
| `insufficient_balance` | "Insufficient balance for this transaction" | Balance too low |
| `insufficient_allowance` | "Insufficient allowance. Please approve the token first." | ERC20 not approved |
| `revert` | "Transaction would fail. Please check your inputs." | Generic revert |
| `unknown` | "Transaction could not be simulated" | Unknown error |

### Simulation Flow

```
User clicks "Withdraw"
        │
        ▼
    Risk Check (HIGH/MEDIUM/LOW)
        │
        ├── HIGH → Wait for confirmation
        │
        ▼
    simulateContract (eth_call)
        │
        ├── Error → Show error, NO MetaMask popup
        │
        └── Success → Show MetaMask popup
```

---

## Risk Scenarios

### Scenario 1: Complete Withdrawal

```
User: "withdraw all USDT"
Vault Balance: 1000 USDT

Flow:
1. Dify returns: { amount: "100%", token: "USDT" }
2. API converts: 1000 * 100/100 = 1000
3. API calculates: 1000/1000 = 100% → HIGH risk
4. Frontend shows confirmation modal
5. User confirms
6. Simulation: eth_call succeeds
7. MetaMask popup → Execute
```

### Scenario 2: Insufficient Balance

```
User: "withdraw 5 ETH"
Vault Balance: 1 ETH

Flow:
1. API returns: { amount: 5, risk_level: "high" }
2. Risk confirmation shown
3. User confirms
4. Simulation: eth_call fails with "Insufficient balance"
5. Error shown, NO MetaMask popup
```

### Scenario 3: Paused System

```
Admin: pause()
User: attempts "deposit 1 ETH"

Flow:
1. Risk assessment: LOW risk
2. Simulation: eth_call fails with "EnforcedPause"
3. Error: "System is paused. Contact admin to resume operations."
4. NO MetaMask popup
```

---

## Configuration

### Risk Thresholds

Located in `app/api/chat/route.ts`:

```typescript
// Thresholds (can be adjusted)
const HIGH_RISK_PERCENTAGE = 90  // >=90% is HIGH
const MEDIUM_RISK_PERCENTAGE = 50  // >=50% is MEDIUM

// Large absolute amounts
const HIGH_ETH_AMOUNT = 10  // >=10 ETH is HIGH
const HIGH_USDT_AMOUNT = 10000  // >=10000 USDT is HIGH
```

### Future Enhancements

Potential improvements for the risk system:

1. **Time-based risk** - Detect unusual transaction timing
2. **Historical analysis** - Compare against user's past transactions
3. **Address reputation** - Check if contract address is known
4. **Slippage protection** - Warn about high slippage
5. **Multi-sig integration** - Require multiple approvals for HIGH risk

---

## Files

- API Route: `frontend/app/api/chat/route.ts`
- AI Panel: `frontend/components/AIPanel.tsx`
- Vault Hook: `frontend/hooks/useVault.ts`
- Contract: `contracts/VaultV3.sol`
