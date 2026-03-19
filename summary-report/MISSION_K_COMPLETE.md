# Mission K: AI Risk Assessment Engine - Complete

## Overview

Mission K implemented a semantic risk assessment system that evaluates transaction intents and enforces risk-based confirmation flows. This document summarizes the implementation steps and key architectural learnings.

---

## Implementation Steps

### Step 1: Update Dify Prompt for Percentage Support

**Change:** Extended the Dify prompt to support percentage expressions.

```
AMOUNT FORMATS:
- Exact number: Use the number directly (e.g., 1.5, 100, 0.5)
- Percentage: Use string format with % (e.g., "100%", "50%", "30%")
- "all/全部/所有" → "100%"
- "half/一半" → "50%"
```

**Why:** Dify cannot know user's balance, but it can understand semantic expressions like "all" and convert them to percentages.

### Step 2: Pass Vault Balances to API Route

**Change:** Frontend sends vault balances to the API for risk calculation.

```typescript
// AIPanel.tsx
body: JSON.stringify({
  message: message.trim(),
  vaultBalances: {
    ETH: parseFloat(vaultBalanceFormatted) || 0,
    USDT: parseFloat(vaultUsdtBalanceFormatted) || 0,
  }
})
```

**Why:** The API needs actual balance data to convert percentages to numbers and calculate risk.

### Step 3: API Route Converts Percentage to Number

**Change:** API converts Dify's percentage strings to actual numbers.

```typescript
// route.ts
function convertAmountToNumber(
  amount: number | string,
  token: string,
  vaultBalances: { ETH: number; USDT: number }
): number {
  if (typeof amount === 'string' && amount.includes('%')) {
    const percentage = parseFloat(amount.replace('%', ''))
    const vaultBalance = token === 'ETH' ? vaultBalances.ETH : vaultBalances.USDT
    return vaultBalance * (percentage / 100)
  }
  return typeof amount === 'number' ? amount : parseFloat(amount) || 0
}
```

**Why:** Keeps frontend simple - it always receives a number, never needs to parse percentages.

### Step 4: API Route Calculates Risk

**Change:** Risk is calculated in the backend based on percentage of vault balance.

```typescript
function calculateRisk(action, amount, token, vaultBalance) {
  const percentage = vaultBalance > 0 ? (amount / vaultBalance) * 100 : 0

  if (action === 'deposit') return { risk_level: 'low', ... }
  if (action === 'withdraw') {
    if (percentage >= 90) return { risk_level: 'high', ... }
    if (percentage >= 50) return { risk_level: 'medium', ... }
    return { risk_level: 'low', ... }
  }
}
```

**Why:** Centralized risk logic ensures consistency and easier testing.

### Step 5: Frontend Displays Risk-Based UI

**Change:** AIPanel shows different UI based on risk level.

- **HIGH Risk:** Shows confirmation modal with "Confirm & Continue" / "Cancel" buttons
- **MEDIUM Risk:** Shows yellow warning banner
- **LOW Risk:** Normal flow, no additional confirmation

**Why:** Protects users from accidentally executing dangerous transactions.

---

## Architectural Decisions Evolution

| Initial Plan | Problem | Final Decision | Benefit |
|--------------|---------|----------------|---------|
| Dify calculates risk | Dify doesn't know user's balance | Backend calculates risk | Accurate risk based on real data |
| Special values (-1, -2) for "all/half" | Limited vocabulary, magic numbers | Percentage strings ("100%") | Flexible, supports any percentage |
| `amount: number \| string` in types | Type inconsistency, parsing complexity | `amount: number` everywhere | Clean types, no runtime parsing |
| Frontend calculates risk | Risk fields come from different sources | API route calculates risk | Single source of truth |

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

User Input: "withdraw all USDT"
        │
        ▼
┌───────────────────┐
│  AIPanel.tsx      │  ─────────────────────────────────────────┐
│  (Frontend)       │                                          │
│                   │  Sends: {                                 │
│  vaultBalances:   │    message: "withdraw all USDT",          │
│  { ETH: 5,        │    vaultBalances: { ETH: 5, USDT: 1000 } │
│    USDT: 1000 }   │  }                                        │
└───────────────────┘                                          │
        │                                                      │
        ▼                                                      │
┌───────────────────┐                                          │
│  API Route        │  ◄───────────────────────────────────────┘
│  /api/chat        │
│                   │  Calls Dify with message
│                   │
│                   │  ◄── Dify returns: { amount: "100%", token: "USDT" }
│                   │
│                   │  Converts: 1000 * (100/100) = 1000 USDT
│                   │  Calculates risk: 100% = HIGH
│                   │
│                   │  Returns: {
│                   │    amount: 1000,
│                   │    risk_level: "high",
│                   │    risk_reason: "Withdrawing 100%..."
│                   │  }
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  AIPanel.tsx      │
│  (Frontend)       │
│                   │  Shows HIGH RISK confirmation modal
│                   │  User must click "Confirm & Continue"
│                   │  Then passes intent to DepositPanel/WithdrawPanel
└───────────────────┘
```

---

## Architectural Learnings

### 1. Single Source of Truth for Computed Fields

**Principle:** All computed/derived fields should come from a single source.

**Application:** `confidence` and `risk_level` both come from the API route, not split between Dify and frontend.

**Why it matters:** When fields come from different sources, debugging becomes harder and inconsistencies arise.

```
❌ Bad:  Dify → confidence, Frontend → risk_level
✅ Good: API Route → confidence + risk_level (using Dify + balance data)
```

### 2. Type Consistency Across Boundaries

**Principle:** Keep types consistent between frontend and backend.

**Application:** `amount` is `number` everywhere. The percentage-to-number conversion happens in the API, not the frontend.

**Why it matters:**
- No runtime type checking needed
- No string/number confusion bugs
- Cleaner code - no parsing logic scattered across components

```typescript
// ❌ Bad: Different types
// Backend: amount: number | string
// Frontend: amount: number | string

// ✅ Good: Same type, conversion happens once
// Dify returns: "100%"
// API converts to: 1000 (number)
// Frontend receives: 1000 (number)
```

### 3. Data Locality Determines Responsibility

**Principle:** Logic should live where the data it needs is available.

**Application:**
- Dify has NLP capability → Intent parsing (deposit/withdraw, token)
- Frontend has vault balances → Provides data to API
- API has both intent + balance → Risk calculation

**Why it matters:** Don't pass data around unnecessarily. Put logic where data converges.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Dify      │     │  Frontend   │     │  API Route  │
│             │     │             │     │             │
│ Has: NLP    │     │ Has: Balance│     │ Has: Both   │
│             │     │             │     │             │
│ Does: Parse │ ──► │ Does: Send  │ ──► │ Does: Calc  │
│ intent      │     │ balance     │     │ risk        │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 4. Conversion at the Boundary

**Principle:** Convert external formats to internal formats at the API boundary.

**Application:** Dify returns `"100%"`, API converts to `1000` before returning to frontend.

**Why it matters:**
- Frontend never needs to know about percentage format
- If Dify changes, only API needs updating
- Internal systems use consistent number format

### 5. Graceful Degradation for Unknown Context

**Principle:** When context (like balance) is unavailable, handle gracefully.

**Application:** If vault balances aren't provided, API still works with default (0) and calculates risk accordingly.

```typescript
const balances = vaultBalances || { ETH: 0, USDT: 0 }
```

### 6. Semantic Input → Structured Output

**Principle:** Allow human-friendly input, produce machine-friendly output.

**Application:** User types "withdraw all", system produces `{ amount: 1000, risk_level: "high" }`.

**Why it matters:** This is the core value of AI integration - bridging human intent and machine execution.

---

## Risk Assessment Logic

| Risk Level | Trigger | Reason |
|------------|---------|--------|
| **HIGH** | Withdrawal ≥90% of vault balance | Near complete withdrawal |
| **HIGH** | Large absolute amounts (≥10 ETH or ≥10000 USDT) | Exceeds safe threshold |
| **MEDIUM** | Withdrawal ≥50% of vault balance | Significant withdrawal |
| **LOW** | Any deposit | Deposits are safe operations |
| **LOW** | Withdrawal <50% of vault balance | Routine operation |

---

## Files Modified

| File | Changes |
|------|---------|
| `app/api/chat/route.ts` | Added risk calculation, percentage conversion |
| `components/AIPanel.tsx` | Pass vault balances, display risk warnings |
| `components/VaultDashboard.tsx` | Updated Intent interface |
| `components/DepositPanel.tsx` | Updated Intent interface |
| `components/WithdrawPanel.tsx` | Updated Intent interface |
| `todo.md` | Marked Mission K as complete |

---

## Testing Checklist

- [ ] "withdraw all USDT" → HIGH RISK (100%)
- [ ] "withdraw 50% ETH" → MEDIUM RISK (50%)
- [ ] "deposit 100 USDT" → LOW RISK (deposit)
- [ ] "取出所有 ETH" → HIGH RISK (Chinese support)
- [ ] "withdraw half USDT" → MEDIUM RISK (50%)

---

## Conclusion

Mission K demonstrates how to properly architect an AI-powered feature:

1. **Let AI do what it's good at** (NLP, intent parsing)
2. **Let backend do what requires data** (risk calculation)
3. **Keep types consistent** (conversion at boundary)
4. **Provide graceful degradation** (handle missing data)
5. **Enforce safety at UI level** (confirmation modals)

This pattern (AI → API conversion → Structured response) is reusable for many AI-integrated features.
