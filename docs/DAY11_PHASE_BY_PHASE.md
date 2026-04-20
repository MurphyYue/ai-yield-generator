# Day 11 Phase-By-Phase Guide: AI Cross-Chain Advisory

## Mission

Build a Dify-powered AI advisor that can explain whether a Base USDC position should stay on Base or migrate to Arbitrum for Aave yield optimization.

Day 11 is advisory only.

It must not execute a bridge transaction. Bridge execution belongs to Day 12-13.

---

## Architecture Boundary

### Backend Responsibility

The backend is the source of truth for deterministic facts:

- Base Aave USDC APY
- Arbitrum Aave USDC APY
- estimated gas costs
- estimated bridge costs
- estimated return bridge costs
- estimated slippage
- gross yield advantage
- net advantage
- breakeven days
- whether migration is allowed

The backend decides:

```text
shouldSuggestMigration = true | false
```

### AI Responsibility

Dify explains the backend result in human language.

Dify may return:

- `check_yield` when migration is not justified
- `cross_chain_migrate` only when the backend says migration is justified

Dify must not invent APY, costs, breakeven, or migration eligibility.

### Frontend Responsibility

The frontend:

- sends user message and wallet/vault context to `/api/chat`
- receives normalized AI intent
- renders cross-chain advisory
- blocks bridge execution until Day 12-13

---

## Phase 1: Backend Truth Route

### File

```text
frontend/app/api/vault-context/route.ts
```

### What It Does

The route reads both chains concurrently:

- Base
- Arbitrum

It returns:

```json
{
  "success": true,
  "data": {
    "base": {
      "chainId": 8453,
      "name": "Base",
      "token": "USDC",
      "supplyApy": 2.5,
      "estimatedTxCostUsd": 0.4
    },
    "arbitrum": {
      "chainId": 42161,
      "name": "Arbitrum",
      "token": "USDC",
      "supplyApy": 3.2,
      "estimatedTxCostUsd": 0.5
    },
    "crossChain": {
      "sourceChain": "base",
      "targetChain": "arbitrum",
      "principal": 500,
      "holdingDays": 30,
      "deltaApy": 0.7,
      "grossYieldAdvantageUsd": 0.287,
      "totalEstimatedCostUsd": 2.4,
      "netAdvantageUsd": -2.113,
      "breakevenDays": 251,
      "shouldSuggestMigration": false,
      "recommendation": "stay",
      "reasonCodes": ["NET_ADVANTAGE_NEGATIVE", "BRIDGE_RISK_NOT_JUSTIFIED"],
      "summaryReason": "Estimated net advantage is negative after bridge, gas, and slippage costs."
    }
  }
}
```

### Migration Gate

Migration is allowed only when all are true:

```text
principal >= 100
deltaApy > 0
netAdvantageUsd > 1
```

If any condition fails, the recommendation is `stay`.

---

## Phase 2: Knowledge Base Document

### File

```text
docs/Aave_Strategy_Context.md
```

### Upload To Dify

Upload this file into the Dify Knowledge Base.

### Required Knowledge

The document teaches Dify:

- Base is the home chain
- Arbitrum is only an optimization destination
- mainnet token is USDC
- AI must not recommend migration from raw APY alone
- AI must follow backend `shouldSuggestMigration`
- bridge risk must be mentioned
- `cross_chain_migrate` is forbidden for marginal or negative cases

---

## Phase 3: Dify Chatflow Setup

### Reference File

```text
docs/Dify_Day11_Prompt.md
```

### Dify Inputs

Configure Dify to receive these inputs from the frontend:

```json
{
  "vault_context_url": "https://YOUR_DOMAIN/api/vault-context?principal=500&holdingDays=30",
  "vault_idle_usdc": 0,
  "strategy_usdc": 0,
  "user_usdc_balance": 500,
  "principal": 500,
  "holding_days": 30,
  "source_chain": "base",
  "target_chain": "arbitrum"
}
```

### HTTP Request Node

Create an HTTP Request node:

```text
Method: GET
URL: {{vault_context_url}}
```

Expected output is the JSON from `/api/vault-context`.

### Knowledge Retrieval Node

Attach the Knowledge Base containing:

```text
docs/Aave_Strategy_Context.md
```

### LLM Node

Use the full prompt from:

```text
docs/Dify_Day11_Prompt.md
```

The LLM must return JSON only.

---

## Phase 4: Chat API Integration

### File

```text
frontend/app/api/chat/route.ts
```

### What It Does

The API route:

1. receives a user message from the frontend
2. extracts principal and holding period from the message when possible
3. builds a `/api/vault-context` URL
4. passes that URL into Dify as `vault_context_url`
5. passes `principal` and `holding_days` as Dify variables
6. normalizes the Dify JSON response
7. blocks unsafe `cross_chain_migrate` responses

### Server-Side Safety Check

Even if Dify incorrectly returns `cross_chain_migrate`, `/api/chat` only accepts it when:

```text
source_chain === "base"
target_chain === "arbitrum"
net_advantage_usd > 1
```

Otherwise it downgrades the action type to:

```text
none
```

---

## Phase 5: Frontend Advisory UI

### File

```text
frontend/components/AIPanel.tsx
```

### Day 11 Behavior

If the AI returns:

```text
action_data.type = "cross_chain_migrate"
```

the frontend displays:

- Base -> Arbitrum route
- delta APY
- net advantage
- breakeven days
- bridge execution placeholder

The UI must say:

```text
Bridge execution is intentionally disabled for Day 11.
Day 12-13 will add the guided flow:
bridge, switch to Arbitrum, deposit into the Arbitrum vault, then invest into Aave.
```

### Bridge Widget Rule

Do not render any bridge widget unless:

```text
action_data.type === "cross_chain_migrate"
```

For Day 11, even this case is display-only.

---

## Phase 6: Manual Dify Verification

Run these prompts in Dify and the frontend.

### Prompt 1

```text
Should I invest?
```

Expected:

- uses live vault context
- explains current Base and Arbitrum APY
- does not blindly recommend migration

### Prompt 2

```text
Should I move 20 USDC to Arbitrum for yield?
```

Expected:

- recommends staying on Base
- does not return `cross_chain_migrate`
- explains that bridge/gas/slippage risk dominates

### Prompt 3

```text
Should I move 5000 USDC to Arbitrum for 90 days?
```

Expected:

- may return `cross_chain_migrate` only if backend `shouldSuggestMigration` is true
- otherwise recommends staying on Base
- includes net advantage and breakeven days

### Prompt 4

```text
What if I hold it for 90 days?
```

Expected:

- preserves conversation context
- re-evaluates with 90 days
- still follows backend migration gate

---

## Acceptance Criteria

- `/api/vault-context` returns Base and Arbitrum APY data.
- `/api/vault-context` returns `crossChain.shouldSuggestMigration`.
- Dify uses `vault_context_url` instead of invented market data.
- Small principal, such as `20 USDC`, returns stay-on-Base advice.
- `cross_chain_migrate` appears only when backend economics justify it.
- Frontend can display cross-chain advisory.
- Frontend does not execute bridge actions on Day 11.

