# Day 15: LangGraph AI Agent Core — Complete

## Overview

Day 15 replaced the Dify external service with a genuine LangGraph AI agent built entirely in TypeScript inside the Next.js backend. The AI layer evolved from a JSON translator (Dify formats backend decisions into words) to a real reasoning agent (calls tools, reads raw data, makes its own decisions). The vault-context API was refactored to return raw economics only — no decisions, no recommendations. The agent now owns all reasoning.

---

## What We Built

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DAY 15 ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘

BEFORE (Dify):
┌──────────┐     ┌──────────────┐     ┌──────────────────┐     ┌──────────┐
│ Frontend │────▶│ /api/chat    │────▶│ Dify (external)  │────▶│ Response │
└──────────┘     │              │     │                  │     └──────────┘
                 │ backend      │     │ formats backend  │
                 │ computes     │     │ decision into    │
                 │ everything   │     │ words only       │
                 └──────────────┘     └──────────────────┘
                 AI intelligence: 0%

AFTER (LangGraph):
┌──────────┐     ┌──────────────────────────────────────────────────────────┐
│ Frontend │────▶│                  LangGraph Agent                         │
└──────────┘     │                                                          │
                 │  START → agent node → shouldContinue?                   │
                 │               │              │                           │
                 │           tool_calls?    no tool_calls                  │
                 │               │              │                           │
                 │          tools node    formatIntent node                 │
                 │               │              │                           │
                 │          (loop back)        END                          │
                 │                                                          │
                 │  Tools available:                                        │
                 │  ├── get_market_data  → /api/vault-context (raw data)   │
                 │  └── get_user_positions → Base + Arbitrum contracts      │
                 │                                                          │
                 │  State persisted in PostgreSQL (Docker)                  │
                 └──────────────────────────────────────────────────────────┘
                 AI intelligence: agent reasons over raw numbers

┌─────────────────────────────────────────────────────────────────────────────┐
│                        /api/vault-context (refactored)                      │
│                                                                             │
│  Returns raw economics ONLY:                                                │
│  base.supplyApy, arbitrum.supplyApy, gas prices,                           │
│  netAdvantageUsd, breakevenDays, totalEstimatedCostUsd                     │
│                                                                             │
│  REMOVED: shouldSuggestMigration, recommendation, reasonCodes,             │
│           summaryReason, CrossChainReasonCode, buildSummaryReason()        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL (Docker)                                  │
│                                                                             │
│  LangGraph checkpoint tables (auto-created by PostgresSaver.setup())       │
│  User alerts table (Day 17)                                                 │
│  Conversations table (Day 17)                                               │
│                                                                             │
│  docker run vault-postgres -v vault-postgres-data:/var/lib/postgresql/data │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Missions Completed

| Task | Status | Key Achievement |
|------|--------|----------------|
| 15.1 Install dependencies | ✅ Complete | LangGraph + OpenAI + pg + checkpoint-postgres |
| 15.2 Agent graph structure | ✅ Complete | ReAct loop with PostgresSaver checkpointer |
| 15.3 Tool definitions | ✅ Complete | get_market_data + get_user_positions |
| 15.4 System prompt | ✅ Complete | Agent reasons from raw numbers, owns migration decisions |
| 15.5 Refactor vault-context | ✅ Complete | Removed all decision fields, raw data only |
| 15.6 Verification | ✅ Complete | Test route confirms agent initialises and responds |

---

## Agent File Structure

### `lib/agent/state.ts` — What the Agent Remembers

Defines the shared state object using LangGraph `Annotation.Root`. Every node reads from and writes to this state.

```typescript
AgentState = {
  messages,       // conversation history — uses messagesStateReducer (append)
  userId,         // wallet address — all other fields use (_, b) => b (overwrite)
  vaultContext,   // raw APY + gas data written by get_market_data tool
  userPositions,  // on-chain balances written by get_user_positions tool
  userHistory,    // Ponder transaction history (Day 16)
  alerts,         // stored monitoring alerts (Day 17)
  intent,         // final structured AIIntent returned to frontend
  requiresApproval // true when agent recommends cross_chain_migrate
}
```

**Key insight**: `Annotation` defines the merge rule per field. `messagesStateReducer` appends new messages. `(_, b) => b` overwrites with the latest value. Without this, LangGraph cannot merge state from parallel nodes.

### `lib/agent/tools.ts` — What the Agent Can Do

Two tools defined with `tool()` from `@langchain/core/tools` and Zod schemas:

| Tool | What it calls | What it returns |
|------|--------------|----------------|
| `get_market_data` | `/api/vault-context` internally | Base APY, Arbitrum APY, gas, netAdvantageUsd, breakevenDays |
| `get_user_positions` | VaultV3 contracts on Base + Arbitrum via viem | userVaultBalance, totalStrategyBalance, totalIdleInVault per chain |

The LLM never calls tools directly. It outputs a `tool_call` request. LangGraph's `ToolNode` intercepts it, executes the function, and feeds the result back as a `ToolMessage` in the messages array.

### `lib/agent/prompts.ts` — How the Agent Thinks

System prompt embedded directly (no RAG, no vector store). Contains:
- Role definition and tool usage instructions
- Migration decision rules the agent applies itself:
  - `principal >= 100 USDC`
  - `deltaApy > 0`
  - `netAdvantageUsd > 1`
  - `breakevenDays` within holding period
- Required JSON output format (`StrategyIntent`)
- Hard safety rules (never invent numbers, never say bridges are safe)

**Key insight**: `Aave_Strategy_Context.md` is small enough to inject directly into the system prompt. RAG is overkill for a single policy document — direct injection is simpler and more reliable.

### `lib/agent/db.ts` — Where the Agent Stores Persistent Data

Singleton PostgreSQL pool using `pg`. Shared across all requests. Used by:
- `PostgresSaver` (LangGraph) for conversation checkpoints
- Alert and conversation tables (Day 17)

### `lib/agent/graph.ts` — How the Agent Is Wired Together

ReAct pattern (Reason + Act):

```
START → agent node → tool_calls? → yes → tools node → agent node (loop)
                                 → no  → formatIntent node → END
```

Three nodes:
- **agent**: runs LLM with system prompt + full message history
- **tools**: `ToolNode` (prebuilt) executes tool calls, appends `ToolMessage` to messages
- **formatIntent**: parses LLM's final JSON output into typed `AIIntent`, sets `requiresApproval`

`PostgresSaver.fromConnString(DATABASE_URL)` + `checkpointer.setup()` creates checkpoint tables automatically and persists full state per `thread_id`.

---

## vault-context API Refactor

### What Was Removed

| Removed | Reason |
|---------|--------|
| `shouldSuggestMigration: boolean` | Backend was making the migration decision — agent's job |
| `recommendation: 'migrate' \| 'stay'` | Same — agent decides |
| `reasonCodes: CrossChainReasonCode[]` | Agent explains in natural language |
| `summaryReason: string` | Agent generates its own explanation |
| `CrossChainReasonCode` type | No longer needed |
| `buildSummaryReason()` function | No longer needed |
| `MIN_MIGRATION_PRINCIPAL_USD` constant | Moved to agent system prompt |
| `MIN_NET_ADVANTAGE_USD` constant | Moved to agent system prompt |

### What Remains

Raw economics the agent reasons over: `deltaApy`, `grossYieldAdvantageUsd`, `netAdvantageUsd`, `breakevenDays`, `totalEstimatedCostUsd`, `estimatedBridgeFeeUsd`, `destinationGasCostUsd`, `slippageEstimateUsd`.

### Also Updated

- `lib/agent/prompts.ts` — agent now applies migration rules itself from raw numbers
- `lib/agent/tools.ts` — tool description updated to reflect agent-driven decisions
- `docs/Aave_Strategy_Context.md` — removed all references to `shouldSuggestMigration`, `recommendation`, `reasonCodes`. Decision table now shows agent-computed conditions.
- `docs/DAY11_PHASE_BY_PHASE.md` and `docs/Dify_Day11_Prompt.md` — deleted (Dify era, no longer relevant)

---

## Problems Encountered & Solutions

| Problem | Root Cause | Solution | Architect Lesson |
|---------|-----------|----------|-----------------|
| `state.ts` Annotation type errors | LangGraph requires explicit `reducer` function for non-message fields | Added `reducer: (_, b) => b` for all overwrite fields | LangGraph state is not a plain object — every field needs a declared merge strategy |
| Circular type reference in `graph.ts` | `CompiledAgent` type alias referenced itself via `ReturnType` | Used `any` for singleton variable, let TypeScript infer return type | Avoid self-referential type aliases in TypeScript — use `any` or structural types |
| Old vault-context code appended after new code | Edit tool replaced only the import block, leaving original code intact | Used `head -188` to truncate file to new code only | Always verify file length after large edits — check for duplicate code |
| `state.ts` missing 4 fields vs plan | Initial implementation was minimal, plan had `vaultContext`, `userPositions`, `userHistory`, `alerts` | Added all missing fields with correct Annotation types | State schema should be defined completely upfront — partial state causes bugs in later nodes |
| `shouldSuggestMigration` still in tools.ts description | Tool description written before vault-context refactor | Updated description to reflect agent-driven decision model | Consistency across system prompt, tool descriptions, and API contract is critical |

---

## Statistics

```
┌─────────────────────────────────────────────────────┐
│                   DAY 15 STATISTICS                  │
├─────────────────────────────────────────────────────┤
│  New files created          5                        │
│  Files modified             3                        │
│  Files deleted              2                        │
│  Agent total lines          431                      │
│    state.ts                 73 lines                 │
│    tools.ts                 123 lines                │
│    prompts.ts               88 lines                 │
│    db.ts                    26 lines                 │
│    graph.ts                 121 lines                │
│  vault-context route        188 lines (was ~297)     │
│  New npm packages           4                        │
│    @langchain/langgraph     ^1.2.9                   │
│    @langchain/openai        ^1.4.4                   │
│    @langchain/langgraph-    ^1.0.1                   │
│      checkpoint-postgres                             │
│    pg                       ^8.20.0                  │
│  TypeScript errors          0                        │
│  Dify dependencies removed  1 (external service)    │
└─────────────────────────────────────────────────────┘
```

---

## Key Learnings

### 1. ReAct Pattern (Reason + Act)

**What**: The agent alternates between reasoning (LLM call) and acting (tool execution) in a loop until no more tool calls are needed.
**Why**: A single LLM call cannot gather real-time data. The loop lets the agent collect what it needs before forming a recommendation.
**How**: `shouldContinue()` router checks if the last message has `tool_calls`. If yes → tools node → back to agent. If no → formatIntent → END.

### 2. State Annotation vs Plain Objects

**What**: LangGraph state fields require explicit `Annotation` with a `reducer` function, not plain TypeScript interfaces.
**Why**: When multiple nodes write to the same field, LangGraph needs to know whether to append or overwrite.
**How**: `messagesStateReducer` for the messages array (append). `(_, b) => b` for all other fields (last-write-wins).

### 3. Backend Provides Facts, Agent Provides Decisions

**What**: The vault-context API returns raw numbers. The agent applies the migration rules itself.
**Why**: If the backend makes decisions, the AI is just a translator. Real intelligence requires the AI to reason over data.
**How**: Removed `shouldSuggestMigration` and `recommendation` from vault-context. Encoded the migration thresholds in the agent's system prompt.

### 4. PostgreSQL Checkpoint Persistence

**What**: `PostgresSaver` stores the full agent state (messages, intent, positions) in PostgreSQL keyed by `thread_id`.
**Why**: Without persistence, every API request starts a fresh conversation with no memory of previous turns.
**How**: `PostgresSaver.fromConnString(DATABASE_URL)` + `checkpointer.setup()` (auto-creates tables) + `workflow.compile({ checkpointer })`.

### 5. Singleton Agent Pattern

**What**: The compiled LangGraph agent is initialised once per process and reused across all requests.
**Why**: `PostgresSaver.setup()` is async and expensive. Re-running it on every request would be slow and create duplicate tables.
**How**: Module-level `let agentInstance = null`. `getAgent()` initialises on first call, returns cached instance on subsequent calls.

---

## What Makes This Professional?

1. **Agent owns decisions, backend owns data** — clean separation of concerns. The vault-context API is a pure data provider. The agent is the reasoning layer. Neither bleeds into the other's responsibility.

2. **ReAct pattern** — industry-standard agent architecture used by production AI systems. The agent gathers data before reasoning, not after.

3. **PostgreSQL-backed state persistence** — conversation memory survives server restarts. This is production-grade, not in-memory toy state.

4. **LLM-agnostic via LangGraph** — swapping from OpenAI to Anthropic or any other provider is a one-line change. The graph structure, tools, and state are provider-independent.

5. **Zod schemas on tools** — every tool input is validated at runtime. The LLM cannot pass malformed arguments to a tool.

6. **Hard safety rules in system prompt** — the agent is explicitly instructed never to invent numbers, never to recommend migration when economics don't justify it, and always to warn about bridge risks. Financial AI products require explicit safety constraints.

7. **Singleton with lazy initialisation** — the agent is compiled once, not on every request. This is the correct pattern for stateful services in serverless/Next.js environments.

---

## Files Created / Modified

### New Files (Agent)
- `frontend/lib/agent/state.ts` — AgentState with 8 annotated fields
- `frontend/lib/agent/tools.ts` — get_market_data + get_user_positions tools
- `frontend/lib/agent/prompts.ts` — system prompt with embedded strategy knowledge
- `frontend/lib/agent/db.ts` — PostgreSQL singleton pool
- `frontend/lib/agent/graph.ts` — LangGraph StateGraph with ReAct loop + PostgresSaver

### New Files (Temporary)
- `frontend/app/api/test-agent/route.ts` — verification test route (delete after Day 15)

### Modified Files
- `frontend/app/api/vault-context/route.ts` — removed all decision fields, raw data only
- `docs/Aave_Strategy_Context.md` — removed shouldSuggestMigration references, agent-driven decision table
- `.claude/commands/mission-summary.md` — new project-scoped skill for day summaries

### Deleted Files
- `docs/DAY11_PHASE_BY_PHASE.md` — Dify era, no longer relevant
- `docs/Dify_Day11_Prompt.md` — Dify era, no longer relevant

---

## Conclusion

Day 15 replaced the Dify external service with a genuine LangGraph AI agent that reasons over raw on-chain data and makes its own strategy decisions. The vault-context API is now a pure data provider — all migration logic, risk assessment, and recommendation generation belongs to the agent. Conversation state persists in PostgreSQL via LangGraph checkpoints, enabling true multi-turn memory across server restarts. The foundation is in place for Day 16 (Ponder transaction history) and Day 17 (alert system).
