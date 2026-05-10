# Day 17-18: Alert System + Streaming Chat — Complete

## Overview

Days 17-18 completed the LangGraph agent's evolution from "stateless function" to "stateful production service". Day 17 added persistent monitoring alerts and proactive alert checking — the agent now remembers what users care about across sessions and warns them before answering questions. Day 18 ripped out the last Dify dependency, replaced `/api/chat` with native LangGraph invocation, and added Server-Sent Events streaming so users see node-level progress as the agent reasons.

---

## What We Built

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DAY 17-18 ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

BEFORE Day 17:
  Agent had only ephemeral state — no memory, no alerts, no persistence

AFTER Day 17 + 18:
┌──────────────────────────────────────────────────────────────────────────┐
│                       LangGraph Agent (4 nodes)                          │
│                                                                          │
│   START                                                                  │
│     │                                                                    │
│     ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ checkAlerts (NEW)                                               │  │
│   │   - Fetch live APY from /api/vault-context                      │  │
│   │   - Query armed alerts (active=TRUE AND triggered_at IS NULL)   │  │
│   │   - Compare current APY vs stored thresholds                    │  │
│   │   - Inject [SYSTEM ALERT] message if any alert triggered        │  │
│   │   - Consume fired alerts: triggered_at=NOW(), active=FALSE      │  │
│   └────────────────────────────┬────────────────────────────────────┘  │
│                                ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ agent (LLM)                                                     │  │
│   │   System prompt now includes: "User wallet: 0x...{userId}"      │  │
│   │   LLM picks tools: get_market_data | get_user_positions         │  │
│   │                    get_user_history | set_alert | get_alerts    │  │
│   └────────────────────────────┬────────────────────────────────────┘  │
│                                ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ tools (ToolNode) — executes selected tool, loops back to agent  │  │
│   └────────────────────────────┬────────────────────────────────────┘  │
│                                ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ formatIntent — parses JSON, sets requiresApproval flag          │  │
│   └────────────────────────────┬────────────────────────────────────┘  │
│                                ▼                                         │
│                                END                                       │
└──────────────────────────────────────────────────────────────────────────┘
                    │                          │
                    ▼                          ▼
┌───────────────────────────┐    ┌─────────────────────────────────────────┐
│   PostgreSQL (Docker)     │    │   /api/chat (LangGraph, no more Dify)   │
│                           │    │   /api/chat/stream (SSE — NEW)          │
│   Day 15 tables:          │    │                                         │
│     checkpoints           │    │   Stream emits typed events:            │
│     checkpoint_writes     │    │     init      → conversation_id         │
│   Day 17 tables (NEW):    │    │     progress  → node + message          │
│     alerts                │    │     intent    → final StrategyIntent    │
│     conversations         │    │     done                                │
│                           │    │     error                               │
└───────────────────────────┘    └─────────────────────────────────────────┘
                                                  │
                                                  ▼
                                  ┌─────────────────────────────────────┐
                                  │   AIPanel (consumes SSE)            │
                                  │                                     │
                                  │   • Connecting to advisor...        │
                                  │   • Checking your active alerts...  │
                                  │   • Reasoning over the data...      │
                                  │   • Fetching live market data...    │
                                  │   • Finalising recommendation...    │
                                  └─────────────────────────────────────┘
```

---

## Tasks Completed

| Day | Task | Status | Key Achievement |
|-----|------|--------|----------------|
| 17.1 | PostgreSQL tables for alerts | ✅ | `setupTables()` creates alerts + conversations + indexes idempotently |
| 17.2 | set_alert + get_alerts tools | ✅ | Agent can persist user-defined APY threshold alerts |
| 17.3 | PostgresSaver checkpoint persistence | ✅ | Wired in Day 15, verified Day 17 |
| 17.4 | checkAlerts node before agent | ✅ | Proactive APY threshold checking on every turn |
| 17.5 | Verification — tables, persistence, multi-turn | ✅ | All 5 verification items confirmed |
| 18.1 | Replace Dify with LangGraph in /api/chat | ✅ | 439 → 66 lines, agent invocation only |
| 18.2 | SSE streaming endpoint | ✅ | `/api/chat/stream` emits node-level progress |
| 18.3 | AIPanel consumes streaming endpoint | ✅ | Live progress messages during reasoning |
| 18.4 | Dify dependencies removed from code | ✅ | route.ts has zero Dify references; env vars deferred to Day 19 |
| 18.5 | Verification — multi-turn, intent shape, agent invocation | ✅ | Verified via two-turn conversation with same conversation_id |

---

## Day 17: Persistent Alert System

### Why It Was Needed

The Day 15-16 agent was stateless beyond conversation memory. It had no way to remember what a user cared about beyond the current chat. If a user said "alert me if Base APY drops below 3%", the agent could not act on it later — there was no storage, no listener, no proactive behaviour.

Real DeFi advisory products (Minara, Surf) feature monitoring as a core differentiator. An agent that only reacts when asked is a chatbot. An agent that proactively warns the user is an assistant.

### How It Works

**Schema (`db.ts:setupTables`):**

```sql
CREATE TABLE alerts (
  id           TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  alert_type   TEXT NOT NULL,
  chain        TEXT NOT NULL,
  threshold    REAL,
  created_at   TIMESTAMP DEFAULT NOW(),
  triggered_at TIMESTAMP,
  active       BOOLEAN DEFAULT TRUE
)
CREATE INDEX idx_alerts_user ON alerts(user_address, active)
```

The `active` flag and `triggered_at` timestamp form a tiny state machine: `(active=TRUE, triggered_at=NULL)` means "armed", `(active=FALSE, triggered_at=<ts>)` means "fired and consumed". Each alert fires exactly once.

**Two new tools (`tools.ts`):**

```typescript
set_alert({ walletAddress, alertType, chain, threshold })
get_alerts({ walletAddress, currentBaseApy, currentArbitrumApy })  // read-only
```

**checkAlerts node (`graph.ts`):**

The graph's first node is the canonical alert-firing path. It fetches live APY, queries only armed alerts (`active = TRUE AND triggered_at IS NULL`), injects a `[SYSTEM ALERT]` HumanMessage if any threshold is crossed, then atomically consumes the fired rows in a single batch UPDATE (`triggered_at = NOW(), active = FALSE`). The system prompt instructs the LLM to surface these alerts before answering the user's actual question.

**Why one-shot semantics**: re-warning the user every turn while APY stays below threshold is spammy. By consuming fired rows, the alert becomes a single, deliberate notification — exactly what production monitoring products do. The user can re-arm by calling `set_alert` again.

**Why the tool is read-only**: state mutation lives in one place (the node). The `get_alerts` tool exists for LLM-driven queries like "show me my alerts", but it does not write — that would create two parallel mutation paths and risk double-firing.

**Key insight**: The `checkAlerts` node runs even when the user asked something unrelated. If your APY threshold is breached and you ask "show my history", the agent warns you about the breach first, then answers your history question. This is what "proactive" means architecturally.

---

## Day 18: Streaming Chat + Dify Removal

### Why It Was Needed

`/api/chat/route.ts` was 439 lines of Dify-specific code: API key handling, request shape adaptation, response parsing, dual-format intent normalisation. None of it was needed once the LangGraph agent was the canonical reasoning engine.

Additionally, the agent's reasoning takes 5-10 seconds (multiple tool calls, multiple LLM hops). Without streaming, the user sees a frozen UI. With streaming, they see the agent working step by step.

### How It Works

**`/api/chat/route.ts` (rewrite, 439 → 66 lines):**

```typescript
const agent = await getAgent()
const thread_id = conversation_id || randomUUID()
const result = await agent.invoke(
  { messages: [new HumanMessage(message)], userId: user_id },
  { configurable: { thread_id, user_id } }
)
return NextResponse.json({ success: true, intent: result.intent, conversation_id: thread_id })
```

Same response shape as Dify route, so frontend works without changes.

**`/api/chat/stream/route.ts` (NEW):**

```typescript
const events = await agent.stream(input, { configurable, streamMode: 'updates' })
for await (const event of events) {
  const nodeName = Object.keys(event)[0]
  controller.enqueue(`data: ${JSON.stringify({ type: 'progress', node: nodeName, ... })}\n\n`)
}
```

Server-Sent Events (`text/event-stream`) emit one event per LangGraph node execution. The final intent is delivered as `type: 'intent'`.

**AIPanel.tsx — consumes SSE:**

```typescript
const reader = response.body.getReader()
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const events = (buffer + decoder.decode(value, { stream: true })).split('\n\n')
  for (const block of events) {
    const event = JSON.parse(block.slice(6))
    if (event.type === 'progress') setProgressMessage(event.message)
    else if (event.type === 'intent') parsedIntent = event.intent
  }
}
```

**Key insight**: The same agent runs both endpoints. The blocking endpoint awaits the final state; the streaming endpoint pipes intermediate states. Same code, different transport.

---

## Problems Encountered & Solutions

| Problem | Root Cause | Solution | Architect Lesson |
|---------|-----------|----------|-----------------|
| Agent called tools with `walletAddress: "0x"` | `configurable.user_id` is invisible to the LLM — only state messages are visible | Inject `state.userId` into the system prompt: `"User wallet: 0x..."` | LangGraph has two parallel state channels — `messages` (LLM-visible) and `configurable` (node-visible). Information that should affect LLM behaviour must flow through messages. |
| AIPanel showed false "unclear question" error on valid informational responses | Old logic flagged `action === 'unknown'` as parsing failure, but the agent legitimately uses `unknown` for non-actionable questions | Only show error when `strategy_logic` is empty AND action is unknown | An agent's classification of a query as informational is intelligent behaviour, not parser failure. UI must distinguish "no intent" from "deliberate non-action". |
| LangGraph state Annotation type errors with non-message fields | All annotated fields require an explicit `reducer` function — defaults alone are insufficient | Added `reducer: (_, b) => b` (last-write-wins) for `userId`, `vaultContext`, `userPositions`, `userHistory`, `alerts`, `intent`, `requiresApproval` | LangGraph state is not a plain object. Every field declares its own merge strategy. |
| Multi-turn memory needed verification across server restarts | Initial test only proved single-turn responses worked | Asked follow-up question with same `conversation_id`, observed agent reused context and applied current APY (not stale) | Conversation persistence is verified by the agent applying current data while remembering prior context — not just by data being in the DB. |
| 5+ Dify env vars referenced across the codebase | Removing them risked breaking unused-but-referenced config paths | Deferred env cleanup to Day 19 polish; code paths already removed | Distinguish between "code is gone" and "config is clean" — both matter, but at different times. |
| `triggered_at` was dead data — written but never read | Two parallel code paths queried alerts (`checkAlerts` node + `get_alerts` tool); only the tool wrote `triggered_at`, neither query filtered on it, so alerts re-fired every turn | Made `checkAlerts` the canonical mutation path: query `WHERE active = TRUE AND triggered_at IS NULL`, then batch-update `triggered_at = NOW(), active = FALSE` after firing. Demoted `get_alerts` tool to read-only. | "Write-only fields" are a classic stale-code smell — code that writes data nothing reads is worse than no code, because it implies an intent that isn't realised. State mutation should live in exactly one place. |

---

## Statistics

```
┌─────────────────────────────────────────────────────┐
│              DAY 17-18 STATISTICS                    │
├─────────────────────────────────────────────────────┤
│  Files modified                  6                   │
│  Files created (Day 18)          1 (stream route)    │
│                                                     │
│  Agent total lines               696                 │
│    state.ts                      73                  │
│    db.ts                         57 (+31 from Day 15)│
│    tools.ts                      291 (+99 alerts)    │
│    prompts.ts                    97                  │
│    graph.ts                      178 (+57 alerts)    │
│                                                     │
│  Agent tools (total)             5                   │
│    get_market_data               (Day 15)            │
│    get_user_positions            (Day 15)            │
│    get_user_history              (Day 16)            │
│    set_alert                     (Day 17 — NEW)      │
│    get_alerts                    (Day 17 — NEW)      │
│                                                     │
│  Agent graph nodes               4                   │
│    checkAlerts                   (Day 17 — NEW)      │
│    agent                         (Day 15)            │
│    tools                         (Day 15)            │
│    formatIntent                  (Day 15)            │
│                                                     │
│  PostgreSQL tables               4                   │
│    checkpoints                   (LangGraph, Day 15) │
│    checkpoint_writes             (LangGraph, Day 15) │
│    alerts                        (Day 17 — NEW)      │
│    conversations                 (Day 17 — NEW)      │
│                                                     │
│  /api/chat route                 439 → 66 lines      │
│  /api/chat/stream route          84 lines (NEW)      │
│  AIPanel SSE consumption         ~50 new lines       │
│  Dify code removed               373 lines           │
│                                                     │
│  TypeScript errors               0                   │
└─────────────────────────────────────────────────────┘
```

---

## Key Learnings

### 1. Proactive Agent Pattern (checkAlerts before agent)

**What**: A graph node that runs before the LLM, performing scheduled checks the user did not ask for.
**Why**: Real assistants notice things. A user asking about transaction history shouldn't have to also ask "by the way, did my alert trigger?" — the agent should know.
**How**: Place a non-LLM node at the start of the graph that injects findings as messages, so the LLM surfaces them in its response.

### 2. State Channel Separation in LangGraph

**What**: LangGraph provides two parallel state channels — `messages` (LLM-visible) and `configurable` + state fields (node-visible only).
**Why**: This separation lets you keep operational data (user_id, thread_id) out of the LLM's context window while still routing it to nodes that need it.
**How**: For data that should affect LLM behaviour, inject it into the system prompt or messages. For data that affects routing or DB calls, use state fields.

### 3. Same Agent, Two Transport Modes

**What**: One compiled LangGraph agent, two HTTP endpoints — blocking (`agent.invoke`) and streaming (`agent.stream`).
**Why**: Different UX needs. The blocking endpoint is simpler to consume. The streaming endpoint feels alive but is more complex to integrate.
**How**: `agent.stream(input, { streamMode: 'updates' })` yields one event per node execution. Wrap in a `ReadableStream` and emit as Server-Sent Events.

### 4. Idempotent Schema Setup at Startup

**What**: `setupTables()` runs `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` on every agent initialisation.
**Why**: No separate migration step needed. Fresh deployments self-bootstrap. Existing deployments are unaffected.
**How**: All schema statements use `IF NOT EXISTS` guards. Run alongside `PostgresSaver.setup()` in `buildAgent()`.

### 5. UI Error Differentiation

**What**: An agent returning `action: 'unknown'` is not the same as a parser failure.
**Why**: Modern LLMs deliberately classify informational questions as having no actionable intent. Treating that as a parsing error frustrates users.
**How**: Only show "unclear question" UI when both action is unknown AND `strategy_logic` is empty/short.

### 6. Alerts as One-Shot Consumable Rows

**What**: An alert is a tiny state machine over two columns: `(active=TRUE, triggered_at=NULL)` is armed, `(active=FALSE, triggered_at=<ts>)` is fired and consumed.
**Why**: Re-warning the user every turn while APY stays below threshold is spammy and indistinguishable from a bug. Production notification systems fire each alert exactly once.
**How**: One canonical mutation path (`checkAlerts` node) queries armed alerts and atomically consumes fired ones in a batch UPDATE. The `get_alerts` tool is read-only — state mutation never happens in two places.

---

## What Makes This Professional?

1. **Proactive monitoring is a real differentiator** — production DeFi advisory products do this. Building it on top of the existing graph (rather than as a separate cron service) demonstrates the architectural advantage of state-machine agents.

2. **Idempotent schema bootstrapping** — `IF NOT EXISTS` everywhere means fresh and existing deployments behave identically. No migration scripts, no manual setup steps. This is the modern "infrastructure as code" pattern.

3. **PostgreSQL as the single source of truth** — both LangGraph checkpoints and application-level alerts live in the same database. Backups, restores, and observability are unified.

4. **Streaming as a first-class transport** — production AI products stream because users expect to see progress. SSE is the simplest streaming mechanism that works with HTTP/1.1 and load balancers.

5. **Dify replaced surgically** — 439 lines of vendor code became 66 lines of native code. The frontend response shape stays identical, so nothing downstream broke. This is what "drop-in replacement" means.

6. **Two parallel chat routes** — `/api/chat` for backwards-compatible blocking calls, `/api/chat/stream` for new SSE consumers. No flag-day cutover; both work.

7. **State channel discipline** — the `userId` injection bug demonstrated and fixed. Every junior engineer hits this with LangGraph; documenting the fix in the system prompt is what a senior engineer does.

---

## Files Created / Modified

### New Files
- `frontend/app/api/chat/stream/route.ts` — SSE endpoint, 84 lines

### Modified Files (Day 17 — Alerts)
- `frontend/lib/agent/db.ts` — added `setupTables()` for alerts + conversations
- `frontend/lib/agent/tools.ts` — added `set_alert` and `get_alerts` tools (5 total)
- `frontend/lib/agent/graph.ts` — added `checkAlerts` node, wired START → checkAlerts → agent
- `frontend/lib/agent/prompts.ts` — updated tool count to 5, added alert behaviour instructions

### Modified Files (Day 18 — Streaming + Dify removal)
- `frontend/app/api/chat/route.ts` — rewrote from 439 lines (Dify) to 66 lines (LangGraph)
- `frontend/lib/agent/graph.ts` — injected `userId` into system prompt to fix tool calls
- `frontend/components/AIPanel.tsx` — consumes SSE stream, displays progress messages, fixed false error logic

### Verified
- PostgreSQL tables: `alerts`, `conversations`, `checkpoints`, `checkpoint_writes`
- Multi-turn memory: same `conversation_id` across two turns reused agent context
- Tool invocation: agent calls `get_user_positions` with the correct wallet address
- Streaming: AIPanel shows live progress events from each graph node

---

## Conclusion

The agent is now a stateful production service. It remembers conversations across server restarts, monitors user-defined APY thresholds, proactively warns about triggered alerts, and streams its reasoning steps to the frontend. The Dify dependency is gone. The agent has 5 tools and 4 graph nodes — a complete reasoning architecture for DeFi yield advisory. Day 19 remains: integration testing, README polish, demo video, and final cleanup.
