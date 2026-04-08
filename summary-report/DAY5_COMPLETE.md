# Day 5: AI-Powered Strategy Advisory System - Complete

## Overview

Day 5 upgraded the AI layer from a stateless command parser into a wallet-bound strategy advisor. The system now combines:

- live market context from a backend truth API
- strategy policy from a Dify knowledge base
- multi-turn Dify Chatflow conversations
- frontend confirmation and pre-execution safety checks

This day was not about adding "AI chat" as a cosmetic feature. It was about building an advisory architecture that can reason over data, preserve identity, and stay separated from execution.

---

## What We Built

### 1. Vault Context API

Created a dedicated backend route to act as the truth provider for strategy advice.

**File:**
- `frontend/app/api/vault-context/route.ts`

**Supporting constants/ABI:**
- `frontend/lib/aave.ts`

**Responsibilities:**
- read Aave reserve data on Sepolia
- read gas price
- calculate advisory metrics like `netApy`
- expose vault context:
  - idle USDT
  - strategy balance
  - user USDT balance

This route became the numeric source of truth for the AI advisor.

---

### 2. Strategy Knowledge Base

Created a dedicated knowledge document for Dify retrieval.

**File:**
- `docs/Aave_Strategy_Context.md`

**Purpose:**
- define strategy policy
- define gas-friction logic
- define risk-profile thresholds
- explain approval / allowance concepts
- constrain the AI from making economically irrational recommendations

This transformed Dify from a generic model prompt into a retrieval-grounded advisor.

---

### 3. Chat API Upgrade for Advisory Mode

Updated the backend chat route to support Day 5 advisory responses while preserving compatibility with the existing frontend integration.

**File:**
- `frontend/app/api/chat/route.ts`

**Key changes:**
- stayed on Dify Chatflow via `chat-messages`
- passed `conversation_id` for multi-turn chat
- passed vault context inputs for advisory use
- parsed strategy-style JSON responses
- kept fallback handling for legacy deposit/withdraw intent responses
- later simplified the route to Chatflow-only after the Day 5 plan was corrected

---

### 4. Multi-turn Advisor UI

Extended the frontend AI panel to support advisory responses instead of only deposit/withdraw parsing.

**Files:**
- `frontend/components/AIPanel.tsx`
- `frontend/components/TransactionCard.tsx`
- `frontend/lib/ai-intent.ts`
- `frontend/components/VaultDashboard.tsx`
- `frontend/components/AdminPanel.tsx`

**Capabilities added:**
- strategy suggestion rendering
- intent-confirmed transaction card
- invest/divest transaction handoff
- AI-to-admin autofill for invest/divest amounts
- session re-check flow before execution

This made the AI output actionable without letting AI execute transactions directly.

---

### 5. Stable Dify User Identity

Fixed the multi-turn chat identity bug discovered during testing.

**Problem discovered:**
- first AI request worked
- second request failed with `404 Not Found`
- backend was sending a new random Dify `user` on every request while reusing the same `conversation_id`

**Fix implemented:**
- require wallet-connected `user_id`
- send wallet address as Dify `user`
- block AI usage when wallet is not connected

**Files:**
- `frontend/app/api/chat/route.ts`
- `frontend/components/AIPanel.tsx`

This aligned AI identity with the product's wallet-based financial workflow.

---

## Critical Architecture Decisions

### 1. Chatflow, Not Workflow

The original Day 5 plan incorrectly drifted toward Dify Workflow. After review, the architecture was corrected back to Dify Chatflow.

**Reason:**
- Chatflow supports `conversation_id`
- the product requires multi-turn memory for:
  - suggest
  - confirm
  - re-evaluate

**Lesson:**
Conversation memory was not an implementation detail. It was a core product requirement that determined the Dify architecture choice.

---

### 2. Truth Provider Pattern

The AI must not invent financial data.

To enforce that, the architecture was split into:

- backend truth route: `/api/vault-context`
- knowledge policy: `Aave_Strategy_Context.md`
- Dify reasoning layer
- frontend execution layer

This means:
- numbers come from code
- policy comes from retrieval
- AI combines them
- execution remains outside the AI

---

### 3. Advisory vs Execution Separation

The AI advisor may:
- recommend
- warn
- explain

The AI advisor may not:
- sign
- move funds
- trigger transactions directly

Execution stays in:
- frontend transaction controls
- wallet confirmation
- vault/strategy contracts

This is the correct separation for a financial product.

---

### 4. Wallet-Bound Identity

The advisor is not a general chatbot. It is part of a wallet-driven financial workflow.

Therefore:
- wallet connection is required to use AI
- wallet address becomes Dify `user`
- multi-turn state belongs to that wallet identity

This simplified identity design and made advisory state consistent with execution state.

---

## Important Debugging Learnings

### 1. Retrieval Failure Was a Retrieval Mode Problem

The Knowledge Retrieval node initially returned nothing.

**Cause:**
- retrieval was configured as `vector search`

**Fix:**
- switched to `Hybrid Search`

**Why it worked:**
The strategy document includes important exact terms such as:
- `idle USDT`
- `Allowance`
- `Gas Fee`
- `netApy`

Hybrid retrieval handled these terms better than pure semantic search.

---

### 2. Suspicious APY Was a Backend Truth-Source Problem

During testing, Dify returned a very high APY suggestion (~57%), which looked wrong.

**Investigation showed:**
- Dify was not hallucinating
- `/api/vault-context` was returning that high number
- the issue was caused by unbalanced utilization rate conditions on Sepolia
- the number was technically coming from live protocol data, but it was not representative of a normal stablecoin advisory environment

**Architectural lesson:**
Testnet protocol data can be technically valid while still being economically abnormal for product-facing advice.

This was a major Day 5 learning:
- protocol truth and product advisory truth are not always the same thing, especially on thinly used testnets

---

### 3. Dify `conversation_id` Requires Stable `user`

The second-turn 404 bug taught a concrete identity lesson:

- `conversation_id` is the thread id
- `user` is the owner identity of that thread

Reusing one while changing the other breaks continuity.

---

## Files Created / Modified

### New Files

- `frontend/lib/aave.ts`
- `frontend/app/api/vault-context/route.ts`
- `frontend/components/TransactionCard.tsx`
- `frontend/lib/ai-intent.ts`
- `docs/Aave_Strategy_Context.md`

### Modified Files

- `frontend/app/api/chat/route.ts`
- `frontend/components/AIPanel.tsx`
- `frontend/components/VaultDashboard.tsx`
- `frontend/components/AdminPanel.tsx`

---

## Validation

### Verified

- TypeScript check passed:
  - `npx tsc --noEmit`

### Manual validation completed

- Dify Chatflow configured manually
- Knowledge Retrieval fixed using `Hybrid Search`
- Chatflow returned structured strategy JSON
- multi-turn identity issue diagnosed and fixed

### Build limitation encountered

- Next production build inside sandbox hit a Turbopack environment restriction
- this was an execution-environment issue, not a confirmed application type error

---

## How the Day 5 System Now Works

1. user connects wallet
2. AI panel sends:

  - message
  - wallet-based user_id
  - conversation_id
  - vault context

  3. backend /api/chat sends that to Dify Chatflow
  4. Dify Chatflow:

  - calls /api/vault-context
  - retrieves policy from KB
  - reasons in LLM node
  - returns JSON answer

  5. frontend renders:

  - strategy suggestion
  - or intent confirmation
  - or transaction card

  6. transaction card re-checks current market context before execution
  7. frontend executes invest/divest through existing vault hooks

---

## What Day 5 Teaches You as an Architect

### 1. AI systems need explicit truth boundaries

If the AI is advisory and money is involved:
- AI cannot be trusted as a numeric source
- data must come from backend truth APIs

### 2. Retrieval quality is a systems problem

Bad retrieval is not only a prompt problem. It can be caused by:
- wrong query variable
- wrong retrieval mode
- weak chunking
- wrong knowledge base selection

### 3. Identity design matters for AI too

In a multi-turn system:
- conversation continuity is impossible without stable user identity

### 4. Product metrics need normalization

On-chain protocol values may be technically correct, but testnet market structure can still make them economically misleading for user-facing advice.

### 5. Advisory and execution should stay separate

This is one of the strongest financial UX patterns introduced in the project so far.

---

## What Is Still Not Production-Grade

Day 5 is a strong architecture milestone, but not yet fully production-grade.

### Remaining gaps

- Sepolia Aave advisory output still needs testnet-aware handling for abnormal utilization-driven rates
- Dify server secret handling should be hardened to server-only env usage
- malformed Dify JSON output handling can still be made stricter
- wallet-switch behavior should likely reset AI conversation state
- advisory thresholds should eventually be backed by explicit product policy, not only one knowledge document

---

## Conclusion

Day 5 transformed the project from:
- AI-assisted Web3 interaction

into:
- context-aware financial strategy advisory

This is the first day where the project clearly behaves like a financial product architecture instead of a feature demo.

The most important shift was not "adding AI." It was defining the boundaries between:

- truth
- policy
- reasoning
- identity
- execution

That separation is what makes the Day 5 system architecturally valuable.
