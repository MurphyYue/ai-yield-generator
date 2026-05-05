import { BaseMessage } from '@langchain/core/messages'
import { Annotation, messagesStateReducer } from '@langchain/langgraph'
import type { AIIntent } from '@/lib/ai-intent'

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

// Agent state shared across all graph nodes
export const AgentState = Annotation.Root({
  // Full conversation history — LangGraph appends messages automatically
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Wallet address — used for on-chain reads and DB lookups
  userId: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),

  // Raw yield + gas data from both chains (written by get_market_data tool)
  // Stored separately so checkAlerts and formatIntent can read without parsing messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vaultContext: Annotation<any | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Current on-chain vault balances (written by get_user_positions tool)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userPositions: Annotation<any | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Past transactions from Ponder GraphQL (written by get_user_history tool — Day 16)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userHistory: Annotation<any | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Active alerts for this user loaded from PostgreSQL (Day 17)
  alerts: Annotation<Alert[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),

  // Structured intent extracted from final agent response
  // This is what the API route returns to the frontend
  intent: Annotation<AIIntent | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Set to true when agent recommends cross_chain_migrate
  // Frontend shows risk modal before proceeding
  requiresApproval: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),
})

export type AgentStateType = typeof AgentState.State
