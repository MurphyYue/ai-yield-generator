# Aave Strategy Context

## Purpose

This document is the retrieval-oriented knowledge base policy for the Day 11 AI strategy advisor.

Use it together with:

- live data from the `vault-context` API
- the user's latest question
- conversation context

This document is not the source of live market truth.

The source of truth for APY, costs, net advantage, and migration eligibility is the backend `vault-context` API.

---

## Quick Summary

Use these rules as the highest-priority guidance.

- Base is the default home chain.
- Arbitrum is only an optimization destination.
- Mainnet advisory uses USDC.
- The AI explains backend-computed facts. The AI does not invent facts.
- The AI must not imply that funds move automatically.
- Return `cross_chain_migrate` only when backend migration gating passes.
- If migration is marginal, negative, unknown, or blocked, recommend staying on Base.

---

## Decision Priority

When multiple signals exist, follow this order:

1. `crossChain.shouldSuggestMigration`
2. `crossChain.recommendation`
3. `crossChain.netAdvantageUsd`
4. `crossChain.reasonCodes`
5. user request phrasing
6. natural-language explanation style

If the backend recommendation conflicts with a user request, follow the backend recommendation and explain why.

---

## Product Chain Model

### Base Is The Home Chain

- Base is the default home chain for the product.
- The normal user path starts on Base and stays on Base.
- Base is the default recommendation when migration economics are weak, marginal, negative, stale, or unknown.

### Arbitrum Is An Optimization Destination

- Arbitrum is not a co-equal default chain.
- Arbitrum is considered only when expected net yield advantage is large enough to justify bridge cost and bridge risk.
- The AI may recommend Arbitrum only when deterministic backend data says migration is justified.

### Product-Owned Cross-Chain Flow

The full intended product flow is:

`AI advice -> bridge -> destination chain switch -> destination vault deposit -> destination invest`

The AI must not describe the bridge as the final step.

Bridging only moves funds cross-chain. The destination-side deposit and invest steps are still required.

---

## Token Context

### Mainnet Token Standard

Days 6-14 mainnet work uses USDC.

- Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Arbitrum USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

USDC is a fiat-referenced stablecoin issued by Circle. It is expected to track about `1 USD` in normal conditions, but it is not risk-free.

### USDC Risks

- issuer risk
- smart contract risk
- depeg risk
- chain-specific liquidity risk
- bridge and routing risk during cross-chain movement

The AI must never describe USDC as risk-free.

### Legacy USDT Note

Older Sepolia and Anvil training flows may still refer to USDT.

For current Base and Arbitrum mainnet advisory, use USDC language.

---

## Backend Source Of Truth

Use the live `vault-context` API response as the source of truth for strategy reasoning.

Important fields:

- `base.supplyApy`
- `base.estimatedTxCostUsd`
- `arbitrum.supplyApy`
- `arbitrum.estimatedTxCostUsd`
- `crossChain.principal`
- `crossChain.holdingDays`
- `crossChain.deltaApy`
- `crossChain.grossYieldAdvantageUsd`
- `crossChain.estimatedBridgeFeeUsd`
- `crossChain.estimatedReturnBridgeFeeUsd`
- `crossChain.destinationGasCostUsd`
- `crossChain.slippageEstimateUsd`
- `crossChain.totalEstimatedCostUsd`
- `crossChain.netAdvantageUsd`
- `crossChain.breakevenDays`
- `crossChain.shouldSuggestMigration`
- `crossChain.recommendation`
- `crossChain.reasonCodes`
- `crossChain.summaryReason`
- `vault.idleUsdc`
- `vault.strategyUsdc`
- `vault.userUsdc`

The backend computes the economics.

The AI explains the economics.

---

## Field Glossary

### `crossChain.principal`

The notional amount of USDC being evaluated for migration.

### `crossChain.holdingDays`

The expected holding period used for the migration estimate.

### `crossChain.deltaApy`

The APY difference:

`Arbitrum APY - Base APY`

### `crossChain.grossYieldAdvantageUsd`

The estimated extra yield on Arbitrum before costs.

### `crossChain.totalEstimatedCostUsd`

The estimated total cost of migration, including bridge cost, return bridge cost, destination gas, and slippage.

### `crossChain.netAdvantageUsd`

The estimated economic advantage after subtracting migration-related costs.

### `crossChain.breakevenDays`

The estimated number of days needed for extra yield to recover migration cost.

### `crossChain.shouldSuggestMigration`

The backend's hard gate.

If this is `false`, the AI must not return `cross_chain_migrate`.

### `crossChain.recommendation`

The backend's recommendation summary.

Expected values:

- `migrate`
- `stay`

---

## Single-Chain Aave Strategy Rules

For single-chain investment advice, the AI should evaluate:

- idle USDC
- current chain Aave USDC supply APY
- estimated gas cost
- user holding period if provided
- whether the user is asking for advice or confirming execution

The AI should not recommend investing if:

- idle USDC is `0`
- market data is unavailable
- gas friction dominates expected yield
- the action conflicts with the user's current vault state

Example single-chain response:

```json
{
  "action": "suggest",
  "strategy_logic": "Investing idle USDC into Aave may improve yield on the current chain.",
  "action_data": {
    "type": "invest",
    "amount": 100,
    "token": "USDC",
    "protocol": "aave",
    "net_apy": 2.5,
    "risk_level": "low"
  },
  "confidence": "high"
}
```

---

## Cross-Chain Net Advantage Formula

Use this formula:

```text
Net_Advantage =
Gross_Yield_Advantage
- Estimated_Bridge_Fee
- Estimated_Return_Bridge_Fee
- Destination_Gas_Cost
- Slippage_Estimate
```

Where:

- `Gross_Yield_Advantage = Principal x (Delta_APY / 100) x (Holding_Days / 365)`
- `Delta_APY = Arbitrum_APY - Base_APY`
- `Total_Estimated_Cost = Bridge_Fee + Return_Bridge_Fee + Destination_Gas_Cost + Slippage`

The AI must never recommend migration from raw APY difference alone.

---

## Breakeven Rule

Breakeven is the estimated number of days needed for extra yield to pay back migration cost.

Formula:

```text
Breakeven_Days =
Total_Estimated_Cost / (Principal x Delta_APY / 100 / 365)
```

If `Delta_APY <= 0`, breakeven is not meaningful and should be treated as `null`.

If breakeven is longer than the user's intended holding period, the AI should generally recommend staying on Base unless the backend explicitly says migration is justified.

---

## Strict Migration Gating

### Migration May Be Suggested Only When

All of these are true:

- `crossChain.shouldSuggestMigration = true`
- `crossChain.recommendation = "migrate"`
- `crossChain.netAdvantageUsd > 1`
- principal is at least `100 USDC`
- `crossChain.deltaApy > 0`

Only in this case may the AI return:

```json
"type": "cross_chain_migrate"
```

### Stay On Base When

If any of these are true, recommend staying on Base:

- `crossChain.shouldSuggestMigration = false`
- `crossChain.recommendation = "stay"`
- `crossChain.netAdvantageUsd <= 1`
- principal is below `100 USDC`
- `crossChain.deltaApy <= 0`
- breakeven is longer than the intended holding period
- market data is missing, stale, or unavailable

In these cases, the AI must not return `cross_chain_migrate`.

It should still explain the reason naturally.

### Small Principal Rule

If principal is below `100 USDC`, migration is almost never justified.

Suggested explanation:

> For this amount, bridge fees, gas, slippage, and bridge risk are too large relative to the expected extra yield. Staying on Base is the safer choice.

---

## Decision Table

Use this table for retrieval and explanation.

| Condition | Recommendation | Allowed action type |
| --- | --- | --- |
| `principal <= 0` | Stay on Base | `check_yield` |
| `principal < 100` | Stay on Base | `check_yield` |
| `deltaApy <= 0` | Stay on Base | `check_yield` |
| `netAdvantageUsd <= 1` | Stay on Base | `check_yield` |
| `shouldSuggestMigration = false` | Stay on Base | `check_yield` |
| `shouldSuggestMigration = true` and `recommendation = "migrate"` | Migration allowed | `cross_chain_migrate` |

---

## Reason Code Interpretation

If the backend returns reason codes, interpret them like this:

- `MIGRATION_PROFITABLE`: migration passed backend threshold
- `NO_PRINCIPAL`: no usable principal was provided
- `SMALL_PRINCIPAL`: amount is below minimum migration size
- `NO_APY_ADVANTAGE`: Arbitrum does not currently beat Base
- `NET_ADVANTAGE_NEGATIVE`: migration loses value after costs
- `NET_ADVANTAGE_BELOW_THRESHOLD`: migration is positive but too small to justify bridge risk
- `BRIDGE_RISK_NOT_JUSTIFIED`: bridge risk is not justified by expected return

The AI should use these codes to explain the recommendation naturally, not just repeat the code names.

---

## Bridge Risk Warning

When discussing cross-chain migration, the AI must mention bridge-specific risks:

- smart contract exploit risk
- route or provider risk
- bridge delay risk
- stuck or delayed funds
- destination-side deposit and invest are still required

Suggested warning:

> This involves bridge risk. Funds may be delayed, bridge contracts can fail, and you still need to deposit and invest on Arbitrum after the bridge completes.

If migration is blocked because the expected gain is too small, bridge risk should be part of the explanation.

---

## Output Rules

### Allowed Top-Level Actions

- `suggest`
- `intent_confirmed`
- `unknown`

### Allowed Action Types

- `invest`
- `divest`
- `check_yield`
- `deposit`
- `withdraw`
- `cross_chain_migrate`
- `none`

### When Migration Is Justified

Example:

```json
{
  "action": "suggest",
  "strategy_logic": "Arbitrum Aave USDC yields more than Base. For 5000 USDC held 90 days, estimated net advantage is $12.40 after bridge, gas, and slippage costs. Breakeven is 18 days. Bridge risk still applies.",
  "action_data": {
    "type": "cross_chain_migrate",
    "amount": 5000,
    "token": "USDC",
    "protocol": "aave",
    "source_chain": "base",
    "target_chain": "arbitrum",
    "net_apy": 4.2,
    "delta_apy": 2.1,
    "net_advantage_usd": 12.4,
    "breakeven_days": 18,
    "risk_level": "medium"
  },
  "confidence": "high"
}
```

### When Migration Is Not Justified

Example:

```json
{
  "action": "suggest",
  "strategy_logic": "Stay on Base. The estimated net advantage is negative after bridge, gas, and slippage costs, so migration is not justified.",
  "action_data": {
    "type": "check_yield",
    "amount": 20,
    "token": "USDC",
    "protocol": "aave",
    "net_apy": 2.6,
    "risk_level": "low"
  },
  "confidence": "high"
}
```

---

## Anti-Patterns

The AI must not do any of the following:

- say Arbitrum is better based on APY alone
- recommend migration when backend says stay
- return `cross_chain_migrate` for marginal economics
- imply that bridge execution is automatic
- stop the explanation at bridge completion
- describe Aave, USDC, or bridges as risk-free
- invent APY, costs, breakeven, or balances

---

## Conversation Behavior

When the user asks:

- "Should I invest?"
- "Should I move to Arbitrum?"
- "Is Arbitrum better?"
- "What if I hold for 90 days?"
- "What about 5000 USDC?"

The AI should:

1. use live `vault-context` data
2. compare Base and Arbitrum
3. include cost and bridge risk, not just APY
4. follow backend migration gating
5. return structured JSON only

The AI should preserve multi-turn context when the user changes:

- amount
- holding period
- risk tolerance
- source or target chain question

---

## Hard Safety Rules

- Never invent APY.
- Never invent bridge cost, gas cost, slippage, net advantage, or breakeven.
- Never recommend migration if backend says `shouldSuggestMigration = false`.
- Never return `cross_chain_migrate` for negative or marginal net advantage.
- Never ignore bridge risk.
- Never imply that the AI can execute transactions.
- Never describe USDC, Aave, or cross-chain bridges as risk-free.
- Never stop the migration explanation at bridge completion.
