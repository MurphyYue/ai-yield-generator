import type { AgentStateType } from '../state'

// Parallel prep node: fetches live market context from /api/vault-context.
// Pure I/O — writes vaultContext channel so downstream nodes (alerts check,
// migration subgraph) don't have to re-fetch.

export async function fetchMarket(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (!state.userId) return {}
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resp = await fetch(`${appUrl}/api/vault-context`)
    if (!resp.ok) return {}
    const json = await resp.json()
    return json.success ? { vaultContext: json.data } : {}
  } catch {
    return {}
  }
}
