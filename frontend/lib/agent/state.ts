import { BaseMessage } from '@langchain/core/messages'
import { Annotation, messagesStateReducer } from '@langchain/langgraph'
import type { AIIntent } from '@/lib/ai-intent'
import type { MemoryFact } from './memory'

// Alert stored in PostgreSQL — checked at the start of every conversation
export interface Alert {
  id: string
  alertType: string          // "apy_threshold" | "position_change"
  chain: string              // "base" | "arbitrum"
  threshold: number | null   // e.g. 2.0 for APY below 2%
  createdAt: string
  triggeredAt: string | null
  active: boolean
}

// Agent state shared across all graph nodes (and propagated to subgraphs that
// share these channel names — see Day 21 plan).
export const AgentState = Annotation.Root({
  // Full conversation history — LangGraph appends messages automatically
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Wallet address — used for on-chain reads, DB lookups, and Store namespacing
  userId: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),

  // ─── Set by parallel prep nodes (Day 21) ─────────────────────────────────
  // Raw yield + gas data from both chains (written by fetchMarket node).
  // Stored separately so consolidateMemory can read without parsing messages.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vaultContext: Annotation<any | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Top-K user-profile facts surfaced for this turn (written by loadMemory node).
  // Subgraph system prompts inject these to personalise responses.
  relevantMemories: Annotation<MemoryFact[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),

  // Alerts that fired on this turn (written by checkAlerts node).
  // The system prompt surfaces these before answering the user's question.
  triggeredAlerts: Annotation<Alert[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),

  // ─── Set by router (Day 21) ──────────────────────────────────────────────
  // Which specialist subgraph handles this turn.
  route: Annotation<'yield' | 'migration' | 'alert' | 'knowledge'>({
    reducer: (_, b) => b,
    default: () => 'knowledge',
  }),

  // ─── Set by subgraphs / approvalGate (Day 22) ────────────────────────────
  // Structured intent extracted from the final agent response.
  // This is what the API route returns to the frontend.
  intent: Annotation<AIIntent | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Tri-state approval flag for the migration HITL flow.
  // 'pending'  — graph paused at interrupt(), client should render risk modal
  // 'approved' — user clicked Approve in modal, graph resumed and confirmed
  // 'rejected' — user clicked Cancel, graph resumed and downgraded to 'suggest'
  // null       — non-migration intent, no approval ever needed
  approvalStatus: Annotation<'pending' | 'approved' | 'rejected' | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
})

export type AgentStateType = typeof AgentState.State
