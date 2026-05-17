# Day 22: HITL Interrupts + Multi-mode Streaming + Resume Flow — Complete

## Overview

Day 22 replaced the Day 21 `approvalGate` stub with a genuine `interrupt()` call, rewrote the streaming endpoint to emit token-by-token output via `streamEvents`, and wired a complete frontend resume flow — modal, approve/cancel handlers, and a new `/api/chat/resume` route. Before Day 22, the migration approval gate was a boolean flag with no real pause: the graph ran to completion and the frontend inferred "approval needed" from the intent shape. After Day 22, the graph genuinely checkpoints at `interrupt()`, the client receives a structured SSE `interrupt` event with the migration details, the risk modal appears with real action_data, and `Command({ resume: true|false })` resumes execution from the exact paused state — surviving server restarts via the existing `PostgresSaver` checkpointer.

---

## What We Built

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DAY 22 ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

BEFORE Day 22 (stub):
  migration query → migrationSubgraph → approvalGate (sets approvalStatus:'pending')
                                                      → formatIntent → END
  Client: infers "approval needed" from intent.action_data.type
  Modal: opens from client-side intent check, not from real server pause

AFTER Day 22 (real HITL):

  ┌──────────────────────────────────────────────────────────────────────┐
  │  POST /api/chat/stream  (SSE)                                        │
  │                                                                      │
  │  agent.streamEvents(input, { version: 'v2' })                       │
  │    → on_chain_start    → emit { type:'progress', node, message }    │
  │    → on_chat_model_stream (non-silent nodes only)                   │
  │                        → emit { type:'token', content, node }       │
  │    → on_chain_end:approvalGate with __interrupt__                   │
  │                        → emit { type:'interrupt', interrupt, cid }  │
  │                        → break (stream ends here, graph paused)     │
  │    → on_chain_end:formatIntent with intent                          │
  │                        → emit { type:'intent', intent, cid }        │
  │    → emit { type:'done' }                                           │
  └──────────────────────────────────────────────────────────────────────┘
                    │
          non-migration path          migration path
                    │                       │
                    ▼                       ▼
           intent displayed       CrossChainRiskModal opens
           (stream done)          (graph still paused in DB)
                                           │
                                    User: Approve / Cancel
                                           │
                                           ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  POST /api/chat/resume                                               │
  │                                                                      │
  │  agent.invoke(new Command({ resume: decision }), { thread_id })     │
  │    → interrupt() returns decision                                    │
  │    → approvalGate sets approvalStatus: 'approved' | 'rejected'      │
  │    → formatIntent → consolidateMemory → END                         │
  │    → returns { intent, approvalStatus, conversation_id }            │
  └──────────────────────────────────────────────────────────────────────┘

  SILENT_NODES (tokens filtered from stream):
    consolidateMemory, router, loadMemory, fetchMarket, checkAlerts

  NODE_PROGRESS labels (emitted on on_chain_start):
    fetchMarket, loadMemory, checkAlerts, router,
    yield, migration, alert, knowledge,
    formatIntent, consolidateMemory

  State channel written by approvalGate:
    approvalStatus: 'pending'   ← was set by stub (Day 21)
    approvalStatus: 'approved'  ← after resume=true   (Day 22)
    approvalStatus: 'rejected'  ← after resume=false  (Day 22)
```

---

## Subtasks Completed

| Subtask | Status | Key Achievement |
|---------|--------|-----------------|
| 22.1 Real interrupt() in approvalGate | ✅ Complete | Graph genuinely pauses; state checkpointed by PostgresSaver |
| 22.2 /api/chat/resume route | ✅ Complete | `Command({ resume })` re-enters paused graph from checkpoint |
| 22.3 Interrupt detection in /api/chat | ✅ Complete | `result.__interrupt__?.length` check; surfaces payload to client |
| 22.4 Rewrite streaming route (streamEvents) | ✅ Complete | `on_chat_model_stream` + `on_chain_start/end`, token filter, interrupt break |
| 22.5 Token streaming in AIPanel | ✅ Complete | Live `streamingText` bubble with cursor glyph |
| 22.6 CrossChainRiskModal with interrupt payload | ✅ Complete | Modal shows real route, delta APY, breakeven from action_data |
| 22.7 Resume flow wired to modal | ✅ Complete | `handleApproval(decision)` → POST resume → intent applied |
| 22.8 Verification script | ✅ Complete | `verify-day22.ts` covers knowledge/approve/reject paths |

---

## Subtask 22.1: Real interrupt() in Migration approvalGate

### The Problem

The Day 21 stub set `approvalStatus: 'pending'` and returned immediately. The graph ran to `END` without pausing — the client received a completed response and opened the modal as a UX embellishment on an already-committed intent. No real pause, no checkpointing, no durability. A server restart between the advisory and the user's approval would discard the intent entirely.

### The Solution

`interrupt()` from `@langchain/langgraph` pauses execution at the call site, serialises graph state to the `PostgresSaver` checkpoint, and exits the process invocation. When `Command({ resume: value })` arrives, LangGraph loads the checkpoint, re-enters `approvalGate` from the top, and `interrupt()` returns the resume value instead of pausing:

```typescript
// approvalGate — fires only for cross_chain_migrate intents
async function approvalGate(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const content = typeof last.content === 'string' ? last.content : ''
  if (!/cross_chain_migrate/i.test(content)) return {}   // no-op pass-through

  // Extract action_data for the modal — formatIntent runs after us, so we
  // do a lightweight parse here. Best-effort: modal degrades gracefully.
  const actionData = parseActionData(content)

  // Graph pauses here. The resume value (true|false) is returned by interrupt()
  // on the second invocation via Command({ resume }).
  const decision = interrupt({ question: 'Approve cross-chain migration?', details: actionData }) as boolean

  return { approvalStatus: decision ? 'approved' : 'rejected' }
}
```

### The Durability Guarantee

The checkpoint written when `interrupt()` fires includes the full `messages` array, `vaultContext`, `relevantMemories`, and all state channels up to that point. A server restart (kill the Next.js process) followed by a `POST /api/chat/resume` with the same `thread_id` will complete the graph correctly — no re-query to the LLM, no re-run of prep nodes.

### Key Insight

`interrupt()` is not a special node or branching edge — it is a function call inside any node body that signals the runtime to pause and save. The node re-executes from the top on resume, but `interrupt()` returns the resume value instead of pausing. This means approval logic lives in a single function with a single control flow, not split across a pre-interrupt node and a post-interrupt node. The caller writes the same node whether the decision is pending, approved, or rejected.

---

## Subtask 22.2: /api/chat/resume Route

### The Contract

```
POST /api/chat/resume
Body: { thread_id: string, user_id: string, decision: boolean }
Response (success): { success: true, intent, approvalStatus, conversation_id }
Response (error):   { error: string } with 400 or 500
```

### The Implementation

```typescript
const result = await agent.invoke(new Command({ resume: decision }), {
  configurable: { thread_id, user_id: user_id ?? '' },
})
```

No input messages, no userId in state — `Command({ resume })` tells LangGraph this is a continuation, not a new invocation. The agent loads the checkpoint for `thread_id`, finds the `__interrupt__` marker, calls the appropriate node with the resume value, and continues to `END`.

### Key Insight

**The resume route takes no new `messages`.** This is the crucial difference from a regular chat turn. `Command({ resume })` is the LangGraph primitive for re-entering a paused graph — it bypasses the normal input injection and goes straight to the interrupted node. Any route that passes new messages alongside `resume` would create an inconsistent state.

---

## Subtask 22.3: Interrupt Detection in /api/chat

### The Change

One check added after `agent.invoke(...)` completes. LangGraph surfaces interrupt calls in `result.__interrupt__` — an array of `{ value, when }` objects:

```typescript
if (result.__interrupt__?.length) {
  return NextResponse.json({
    success: true,
    interrupted: true,
    interrupt: result.__interrupt__[0].value,  // { question, details }
    conversation_id: thread_id,
  })
}
```

The non-streaming `/api/chat` route now handles migration correctly too. Previously it would return the stub's `approvalStatus: 'pending'` inside a complete response. Now it returns `{ interrupted: true, interrupt }` — the same signal the streaming route emits — so any non-streaming caller can implement the same approval flow.

---

## Subtask 22.4: Streaming Route Rewrite

### Before vs After

```
BEFORE:                             AFTER:
agent.stream(input, {               agent.streamEvents(input, {
  streamMode: 'updates'               version: 'v2'
})                                  })
  per-node state deltas only          granular lifecycle events
  no token streaming                  on_chat_model_stream  → tokens
  no interrupt detection              on_chain_start        → progress
  checks nodeName==='formatIntent'    on_chain_end          → interrupt + intent
```

### SSE Event Taxonomy

| Event type | Trigger | Payload |
|---|---|---|
| `init` | Immediately | `conversation_id` |
| `progress` | `on_chain_start` for named nodes | `{ node, message }` |
| `token` | `on_chat_model_stream` (non-silent) | `{ content, node }` |
| `interrupt` | `on_chain_end:approvalGate` with `__interrupt__` | `{ interrupt: { question, details }, conversation_id }` |
| `intent` | `on_chain_end:formatIntent` with intent | `{ intent, conversation_id }` |
| `done` | Stream close (normal path) | — |
| `error` | Caught exception | `{ message }` |

### Token Filtering

Five infrastructure nodes are in the `SILENT_NODES` set — their LLM output (extraction prompt, router reasoning) is never shown to the user:

```typescript
const SILENT_NODES = new Set([
  'consolidateMemory',  // extraction model reasoning
  'router',             // classification reasoning
  'loadMemory',         // no LLM call, just vector search
  'fetchMarket',        // no LLM call, just HTTP fetch
  'checkAlerts',        // no LLM call, DB query only
])
```

Tokens from `yield`, `migration`, `alert`, and `knowledge` subgraph LLM calls stream through.

---

## Subtask 22.5–22.7: Frontend — Token Streaming, Modal, Resume Flow

### Token Streaming Bubble

A new `streamingText` state accumulates `token` events while the subgraph LLM is responding. A live bubble renders with a block-cursor glyph. It disappears once the `intent` event arrives and the structured intent card takes over:

```
[AI Advisor]
• Reasoning over yield strategy...

Current USDC supply APY on Base is 4.2%. On Arbitrum the rate is
currently 7.1%, giving a delta of 2.9 percentage points. Given your
conservative risk profile and a 90-day horizon...▊
```

### HITL Modal Flow

```
SSE stream:  ...token...token...token → interrupt event → stream breaks

AIPanel:     setPendingInterrupt(event.interrupt)
             setProgressMessage('Waiting for your approval...')
             isLoading stays true — input blocked

             CrossChainRiskModal renders with:
               amount        = interruptDetails.amount
               source/target = interruptDetails.source_chain / target_chain
               delta APY     = interruptDetails.delta_apy
               breakeven     = interruptDetails.breakeven_days

User clicks "Approve & Proceed":
             handleApproval(true)
               → setPendingInterrupt(null)
               → POST /api/chat/resume { thread_id, user_id, decision: true }
               → response.intent applied to UI
               → migrationRiskAccepted = true  (CrossChainWidget renders)

User clicks "Stay On Base":
             handleApproval(false)
               → POST /api/chat/resume { thread_id, user_id, decision: false }
               → approvalStatus='rejected' shown in status field
```

### CrossChainRiskModal Extension

The modal previously accepted only `amount`. It now also accepts `interruptDetails: InterruptDetails` and renders a live data grid from the interrupt payload:

```
┌─────────────────────────────────────────────────────────────────┐
│  Cross-Chain Risk Review                                         │
│  Review bridge risk before moving 1000.00 USDC                  │
│                                                                  │
│  Route               Delta APY         Breakeven                 │
│  base → arbitrum     +2.90%            18.4 days                 │
│                                                                  │
│  1. Bridge smart contracts and routing providers can fail...     │
│  2. Funds can be delayed, misrouted, or temporarily stuck...     │
│  ...                                                             │
│                                                                  │
│  [ Approve & Proceed ]          [ Stay On Base ]                 │
└─────────────────────────────────────────────────────────────────┘
```

Without `interruptDetails` (legacy or fallback path), the data grid is hidden and only the risk text and buttons render.

---

## Problems Encountered & Solutions

### Problem 1: approvalGate detects migration before formatIntent runs

**Symptom:** `approvalGate` needed to surface `action_data` to the modal (amount, chains, delta APY, breakeven). But `formatIntent` — which parses the LLM's JSON response — runs *after* `approvalGate` in the parent graph.

**Root Cause:** The graph topology is: subgraph → `formatIntent` → `consolidateMemory` → END. `approvalGate` is the last node inside the migration subgraph, so it runs before `formatIntent`. `state.intent` is `null` at that point.

**Solution:** Lightweight best-effort parse inside `approvalGate`. The same JSON cleanup (`strip backticks, JSON.parse`) used in `formatIntent` is applied inline. If it fails (malformed LLM output), `actionData` defaults to `{}` and the modal degrades to showing only the amount. Not ideal, but the graph does not fail.

**Architect Lesson:** In a linear graph, downstream nodes can't backfill upstream ones. If `approvalGate` had been placed after `formatIntent`, this problem wouldn't exist — but that would require moving it outside the subgraph into the parent, breaking the subgraph's self-contained design. The tradeoff: accept a small code duplication (lightweight parse in two places) to preserve clean subgraph boundaries.

### Problem 2: streamEvents vs stream() API differences

**Symptom:** The old route used `agent.stream(..., { streamMode: 'updates' })`. `streamEvents` has a different API: it doesn't take `streamMode`, requires `version: 'v2'`, and event shape is `{ event, name, data, metadata }` rather than `{ nodeName: update }`.

**Root Cause:** `stream()` and `streamEvents()` are different APIs on the compiled graph. `streamEvents` is the LangChain standard event callback format, richer than LangGraph's own `streamMode`.

**Solution:** Rewrote the route to use `streamEvents` with `version: 'v2'`. Event handling switches on `event.event` (e.g. `on_chat_model_stream`, `on_chain_start`, `on_chain_end`). Token metadata uses `event.metadata.langgraph_node` to identify which graph node the LLM call belongs to.

**Architect Lesson:** LangGraph exposes two streaming surfaces: its own `stream()` with `streamMode` options (coarser, state-delta oriented) and the LangChain `streamEvents()` (finer, lifecycle event oriented). Choose based on what you need: state diffs → `stream`; token-by-token + lifecycle hooks → `streamEvents`.

---

## Statistics

```
┌────────────────────────────────────────────────────────────┐
│                     DAY 22 STATISTICS                       │
├────────────────────────────────────────────────────────────┤
│  New TS files                │  2 (resume/route.ts,         │
│                              │   verify-day22.ts)           │
│  Modified TS files           │  6 (migration.ts,            │
│                              │   chat/route.ts,             │
│                              │   stream/route.ts,           │
│                              │   AIPanel.tsx,               │
│                              │   CrossChainRiskModal.tsx,   │
│                              │   ai-intent.ts)              │
│  Commits                     │  1 (6ded6d1)                 │
│  Lines changed (git stat)    │  +450 / -112                 │
│  SSE event types             │  7 (init, progress, token,   │
│                              │   interrupt, intent,         │
│                              │   done, error)               │
│  SILENT_NODES (token filter) │  5                           │
│  NODE_PROGRESS labels        │  10                          │
│  State variables in AIPanel  │  14                          │
│  Verification test cases     │  3 (knowledge, approve,      │
│                              │   reject)                    │
│  LangGraph primitives used   │  interrupt(), Command,       │
│                              │   streamEvents (v2)          │
│  Type-check errors           │  0                           │
└────────────────────────────────────────────────────────────┘
```

---

## Key Learnings

### 1. interrupt() as a Synchronous Yield Point

**What:** `interrupt(value)` is a function call inside a node body that pauses the graph, serialises state, and exits the current invocation. On resume, the node re-executes but `interrupt()` returns the resume value.

**Why:** This design means approval logic is self-contained in one function — the same node handles both the "should we ask?" decision and the "what did they decide?" result. No separate pre/post nodes needed.

**How:** Import `interrupt` from `@langchain/langgraph`. Call it anywhere in a node. Resume with `agent.invoke(new Command({ resume: value }), config)`. The checkpointer (PostgresSaver) makes the pause durable across server restarts.

### 2. streamEvents v2 for Token-level Streaming

**What:** `agent.streamEvents(input, { version: 'v2' })` emits fine-grained lifecycle events including per-token `on_chat_model_stream`, per-node `on_chain_start`/`on_chain_end`, and tool-call events.

**Why:** `stream({ streamMode: 'updates' })` only delivers state diffs per node completion. Token streaming requires the lower-level event surface.

**How:** Filter `on_chat_model_stream` events by `metadata.langgraph_node` against a `SILENT_NODES` set. Infrastructure nodes (router, consolidateMemory) run LLMs internally but their output should never reach the user's UI.

### 3. Command as the Resume Primitive

**What:** `new Command({ resume: value })` is the only correct way to continue a paused graph. It does not inject new messages — it signals to LangGraph that this invocation should re-enter the checkpointed state and return the resume value from the `interrupt()` call.

**Why:** Passing new messages alongside a resume would create a corrupted state — the graph would replay upstream nodes with new input, potentially re-running expensive LLM calls and invalidating the paused intent.

**How:** POST `/api/chat/resume` with `thread_id` + `decision`. Route calls `agent.invoke(new Command({ resume: decision }), { configurable: { thread_id } })`. No `messages` field in the input.

### 4. Node Topology Shapes What Data Is Available Where

**What:** `approvalGate` runs before `formatIntent` (it's inside the subgraph; `formatIntent` is in the parent). So `state.intent` is null when the gate fires.

**Why:** Subgraphs complete before parent graph post-processing nodes. That's the design of the parallel-prep + router + subgraph topology built on Day 21.

**How:** Accept the constraint, don't fight the topology. Lightweight best-effort JSON parse inside `approvalGate` is a reasonable trade for keeping subgraph boundaries clean. The modal degrades gracefully if parsing fails.

---

## What Makes This Professional?

1. **Genuine HITL, not a UI checkbox** — The graph checkpoint proves the pause is real: kill the server after `interrupt()` fires, restart it, POST `/api/chat/resume`, and execution continues from exactly where it stopped. That's the enterprise standard, not a boolean flag.
2. **Token streaming matches UX expectations** — Users see the LLM's reasoning appear character by character, not a spinner followed by a wall of text. Infrastructure LLM calls (router, memory extraction) are silenced to avoid confusion.
3. **Resume route is stateless** — `/api/chat/resume` carries no knowledge of the pending intent. It just forwards `Command({ resume })` and the checkpointer does the rest. The entire graph state lives in the DB, not in server memory.
4. **Modal data comes from the graph** — `interruptDetails` are extracted from the actual LLM response, not hardcoded UI text. Amount, chains, delta APY, and breakeven days are real values from the migration analysis.
5. **Non-migration paths are unchanged** — `approvalGate` returns early for non-migration intents. Token streaming, progress events, and intent emission all work identically for yield/alert/knowledge queries.
6. **TypeScript type coverage** — `StrategyIntent.approvalStatus` is declared on the frontend type, so the status badge (`APPROVED`/`REJECTED`/`PENDING`) has full compile-time safety with no casts.
7. **Checkpointer durability closes the trust gap** — Approval decisions are durable. If a user approves and the server crashes before the bridge widget renders, the `approvalStatus: 'approved'` is in the checkpoint. The frontend can recover the state by re-fetching the thread.

---

## Files Created/Modified

### Agent — Subgraphs
- `frontend/lib/agent/subgraphs/migration.ts` — MODIFIED — Real `interrupt()` in `approvalGate`, best-effort action_data parse (71 lines)

### API Routes
- `frontend/app/api/chat/resume/route.ts` — NEW — POST handler for `Command({ resume })` (36 lines)
- `frontend/app/api/chat/route.ts` — MODIFIED — `__interrupt__` detection, `interrupted: true` response shape (79 lines)
- `frontend/app/api/chat/stream/route.ts` — MODIFIED — Full rewrite to `streamEvents v2`; 7 SSE event types, token filter, interrupt break (130 lines)

### Frontend Components
- `frontend/components/AIPanel.tsx` — MODIFIED — `streamingText` bubble, `pendingInterrupt` state, `handleApproval()`, resume wired to modal (582 lines)
- `frontend/components/CrossChainRiskModal.tsx` — MODIFIED — `interruptDetails` prop, live data grid (route/deltaAPY/breakeven) (152 lines)

### Type Definitions
- `frontend/lib/ai-intent.ts` — MODIFIED — `approvalStatus` field added to `StrategyIntent` (39 lines)

### Verification Scripts
- `frontend/scripts/verify-day22.ts` — NEW — 3 test cases: knowledge (no interrupt), migration approve, migration reject (104 lines)

### Git Commits
- `6ded6d1` feat: implement human-in-the-loop (HITL) interrupt and resume flow for cross-chain migration

---

## Conclusion

Day 22 closes the HITL loop: the migration approval flow that started as a UI-only embellishment (Day 21 stub) is now a genuine distributed pause — the graph checkpoints at `interrupt()`, the checkpoint outlasts server restarts, and execution resumes from the exact saved state when the user decides. Combined with the token streaming rewrite, every LangGraph primitive the plan promised is now present: linear flow, branching, parallel execution, tool-call loops, subgraphs, HITL, and streaming. Day 23 is the final layer — SIWE authentication that closes the `user_id`-from-request-body trust gap and ties the per-user memory namespace to a cryptographically proven wallet address.
