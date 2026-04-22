# Day 11 Complete: AI Cross-Chain Advisory

## Mission Goal

Day 11 built the AI advisory layer for the Base-first, Arbitrum-optimized USDC yield product.

The mission goal was to prove that:

- the backend can produce deterministic cross-chain yield economics,
- Dify can explain those economics without becoming the source of truth,
- the frontend can display AI cross-chain advice,
- and `cross_chain_migrate` appears only when the backend says migration is economically justified.

Day 11 was advisory-only.

Bridge execution is intentionally deferred to Day 12-13.

---

## Business Meaning

This mission matters because AI in a DeFi product should not be allowed to invent financial decisions.

For a real user, the dangerous version of this product would be:

- AI sees a higher APY,
- AI recommends bridging,
- user pays bridge and gas costs,
- net return is negative.

Day 11 prevents that by separating responsibilities:

- backend computes deterministic economics,
- Dify explains those economics,
- frontend renders the resulting advisory,
- execution remains gated.

For your career goal as a Senior Web3 Full-stack Engineer specialized in DeFi, Day 11 demonstrates:

- backend financial decision modeling,
- AI product integration,
- prompt engineering under safety constraints,
- frontend intent rendering,
- and strong architecture boundaries between deterministic systems and language models.

---

## Architecture Meaning

Day 11 established the advisory architecture:

```text
Frontend question
  -> /api/chat
  -> Dify workflow
  -> /api/vault-context
  -> live Base + Arbitrum market data
  -> backend migration gate
  -> Dify explanation
  -> normalized frontend intent
```

The core architectural rule is:

```text
AI explains. Backend decides.
```

Dify is not allowed to decide migration profitability from natural language alone.

It must use backend-provided fields such as:

- `deltaApy`
- `netAdvantageUsd`
- `breakevenDays`
- `shouldSuggestMigration`
- `recommendation`
- `reasonCodes`

---

## What Changed

### 1. Added deterministic advisory fields to vault-context

**File**: [vault-context route](/Users/murphyyue/Projects/web3-projects/frontend/app/api/vault-context/route.ts)

The route now returns richer `crossChain` data:

- `breakevenDays`
- `shouldSuggestMigration`
- `recommendation`
- `reasonCodes`
- `summaryReason`

The backend migration gate is:

```text
principal >= 100
deltaApy > 0
netAdvantageUsd > 1
```

If any condition fails, the recommendation is:

```text
stay
```

### 2. Updated the AI strategy context document

**File**: [Aave_Strategy_Context.md](/Users/murphyyue/Projects/web3-projects/docs/Aave_Strategy_Context.md)

The document now defines:

- Base as the home chain,
- Arbitrum as optimization-only,
- mainnet USDC as the product token,
- net advantage formula,
- breakeven formula,
- strict migration thresholds,
- bridge risk warnings,
- and `cross_chain_migrate` output rules.

This is the Knowledge Base document for Dify.

### 3. Created a final production Dify prompt

**File**: [Dify_Day11_Prompt.md](/Users/murphyyue/Projects/web3-projects/docs/Dify_Day11_Prompt.md)

The final prompt package contains:

- one System Prompt,
- one User Prompt Template,
- HTTP Request node instructions,
- Knowledge Base instructions,
- expected output patterns,
- and verification prompts.

This removed ambiguity from earlier versions that had multiple prompt fragments and examples.

### 4. Created the Day 11 phase-by-phase guide

**File**: [DAY11_PHASE_BY_PHASE.md](/Users/murphyyue/Projects/web3-projects/docs/DAY11_PHASE_BY_PHASE.md)

This document explains:

- backend responsibility,
- Dify responsibility,
- frontend responsibility,
- exact setup phases,
- manual Dify verification prompts,
- and Day 11 acceptance criteria.

### 5. Extended the AI intent schema

**File**: [ai-intent.ts](/Users/murphyyue/Projects/web3-projects/frontend/lib/ai-intent.ts)

Added support for:

```text
cross_chain_migrate
```

And optional migration fields:

- `source_chain`
- `target_chain`
- `delta_apy`
- `net_advantage_usd`
- `breakeven_days`

### 6. Finished chat API integration

**File**: [chat route](/Users/murphyyue/Projects/web3-projects/frontend/app/api/chat/route.ts)

The chat route now:

- builds the correct `vault_context_url`,
- passes `principal` and `holding_days` into Dify,
- extracts principal and holding period from natural language,
- normalizes Dify JSON,
- accepts `cross_chain_migrate` only when the migration fields are valid,
- downgrades unsafe migration output to `none`.

This gives the backend a second safety layer even if Dify produces a bad response.

### 7. Added frontend advisory rendering

**File**: [AIPanel.tsx](/Users/murphyyue/Projects/web3-projects/frontend/components/AIPanel.tsx)

The AI panel now displays cross-chain advisory fields:

- Base -> Arbitrum route,
- delta APY,
- net advantage,
- breakeven days,
- Day 12-13 bridge execution placeholder.

It does not execute bridge actions.

That preserves the Day 11 boundary.

---

## How It Works

### Cross-chain advisory flow

1. User asks a question such as:

```text
Should I move 5000 USDC to Arbitrum for 90 days?
```

2. The frontend sends wallet and vault context to `/api/chat`.

3. `/api/chat` extracts:

- principal: `5000`
- holding days: `90`

4. `/api/chat` builds:

```text
/api/vault-context?principal=5000&holdingDays=90&...
```

5. Dify calls that URL through its HTTP Request node.

6. `/api/vault-context` reads live Base and Arbitrum Aave data and calculates:

- APY difference,
- gross yield advantage,
- estimated bridge cost,
- destination gas cost,
- slippage,
- total estimated cost,
- net advantage,
- breakeven days,
- migration eligibility.

7. Dify explains the backend result.

8. The frontend renders either:

- normal `check_yield` advice, or
- a display-only `cross_chain_migrate` advisory.

---

## Problems We Met And How We Solved Them

### Problem 1: Dify did not receive the updated vault-context URL

**Issue**

The chat route created a new URL with `principal` and `holdingDays`, but it did not pass that updated URL into Dify.

So Dify could evaluate using incomplete migration context.

**Solution**

Updated [chat route](/Users/murphyyue/Projects/web3-projects/frontend/app/api/chat/route.ts) so:

- `principal` and `holdingDays` are included in the actual `vault_context_url`,
- the same values are also passed as Dify inputs:
  - `principal`
  - `holding_days`

### Problem 2: Dify needed detailed production prompt guidance

**Issue**

The original prompt document contained several prompt fragments and examples.

This made it unclear which prompt should be used as the active LLM prompt.

**Solution**

Rewrote [Dify_Day11_Prompt.md](/Users/murphyyue/Projects/web3-projects/docs/Dify_Day11_Prompt.md) into one production prompt package:

- one System Prompt,
- one User Prompt Template,
- examples only as references.

### Problem 3: Dify returned `none` for a valid advisory question

**Issue**

For:

```text
Should I invest?
```

Dify returned a valid explanation but used:

```text
action_data.type = "none"
```

This was semantically too weak.

**Solution**

Tightened the prompt rules:

- valid advisory questions should return `check_yield`,
- `none` should not be used when the user asks an understandable advisory question,
- execution actions should be reserved for explicit user confirmation.

### Problem 4: Dify returned `action = "unknown"` while giving valid advice

**Issue**

Dify returned:

```text
action = "unknown"
```

even though:

- it understood the question,
- produced valid strategy logic,
- and returned `action_data.type = "check_yield"`.

**Solution**

Updated the prompt with a top-level action policy:

- use `suggest` for valid advisory responses,
- use `intent_confirmed` only for explicit execution confirmation,
- use `unknown` only when the request cannot be understood.

### Problem 5: Wallet USDC balance was wrong in AI context

**Issue**

The frontend sent:

```text
userUsdcBalance = vaultUsdtBalanceFormatted
```

That means the AI context used the vault balance as the wallet balance.

In live testing, the wallet had about `28.84 USDC`, but Dify received `1 USDC`.

**Solution**

Updated [AIPanel.tsx](/Users/murphyyue/Projects/web3-projects/frontend/components/AIPanel.tsx) to send:

```text
userUsdcBalance = usdtBalanceFormatted
```

The naming is legacy, but on Base and Arbitrum this value represents wallet USDC.

### Problem 6: Small positive idle balance was described as no principal

**Issue**

Dify treated `1 USDC` idle balance as if there was no meaningful principal.

That was imprecise.

**Solution**

Prompt was updated to distinguish:

- no principal,
- small but positive idle principal,
- meaningful principal.

For small positive balances, Dify should say:

```text
technically investable, but economically too small to matter after transaction friction
```

---

## Validation

### Build validation

Frontend production build passed:

```text
npm run build
```

The build produced non-blocking localStorage warnings during static generation, but completed successfully.

### Manual AI validation

Tested:

```text
Should I invest?
```

The AI response correctly saw:

- wallet USDC balance around `29`,
- idle vault USDC around `1`,
- Base APY around `3.4%`,
- Arbitrum APY lower than Base,
- no migration recommendation.

The remaining prompt issue around `action = "unknown"` was addressed in the final Dify prompt update.

### Expected Dify verification prompts

Use these after updating the prompt in Dify:

```text
Should I invest?
```

Expected:

- `action = "suggest"`
- `action_data.type = "check_yield"`
- no cross-chain migration

```text
Should I move 20 USDC to Arbitrum for yield?
```

Expected:

- stay on Base
- no `cross_chain_migrate`

```text
Should I move 5000 USDC to Arbitrum for 90 days?
```

Expected:

- return `cross_chain_migrate` only if backend `shouldSuggestMigration = true`

---

## Final Outcome

Day 11 completed the AI advisory layer.

The system now supports:

- live Base and Arbitrum yield context,
- deterministic migration economics,
- Dify-powered explanation,
- strict migration gating,
- frontend advisory rendering,
- no bridge execution until Day 12-13.

The main product boundary is now correct:

```text
Backend computes.
Dify explains.
Frontend displays.
User executes only when later execution flows are built.
```

---

## Day 12 Readiness

Day 12 can now build on a stable advisory contract:

- `cross_chain_migrate` is the frontend signal for bridge UI,
- bridge UI should render only when that intent appears,
- Base remains the home chain,
- Arbitrum activation should happen inside the guided migration flow,
- post-bridge flow must continue to destination deposit and invest.

