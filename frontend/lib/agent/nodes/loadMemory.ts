import type { LangGraphRunnableConfig } from '@langchain/langgraph'
import type { AgentStateType } from '../state'
import type { MemoryFact } from '../memory'

// Parallel prep node: retrieves the user's top-K relevant memory facts via
// vector search. Uses the Store auto-injected by LangGraph at compile time
// (graph.ts passes `store` to compile()).
//
// Namespace: [userAddress, 'profile'] — partitions per user. The Postgres
// store table physically segregates rows by namespace, so cross-user reads
// are impossible even at the SQL level.

export async function loadMemory(
  state: AgentStateType,
  config: LangGraphRunnableConfig
): Promise<Partial<AgentStateType>> {
  const store = config.store
  if (!store || !state.userId) return { relevantMemories: [] }

  // Use the most recent human message as the semantic query.
  const lastHuman = [...state.messages].reverse().find((m) => m._getType?.() === 'human')
  const query =
    typeof lastHuman?.content === 'string' ? lastHuman.content : ''

  try {
    const hits = await store.search([state.userId.toLowerCase(), 'profile'], {
      query: query || undefined,
      limit: 5,
    })
    return {
      relevantMemories: hits
        .map((h) => h.value as unknown as MemoryFact)
        .filter((fact) => fact && typeof fact.value === 'string'),
    }
  } catch {
    return { relevantMemories: [] }
  }
}
