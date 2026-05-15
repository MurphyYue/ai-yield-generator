import { StateGraph, START, END } from '@langchain/langgraph'
import { AIMessage } from '@langchain/core/messages'
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'

import { AgentState, type AgentStateType } from './state'
import { setupTables } from './db'
import { getStore } from './memory'
import type { AIIntent, StrategyIntent } from '@/lib/ai-intent'

import { fetchMarket } from './nodes/fetchMarket'
import { loadMemory } from './nodes/loadMemory'
import { checkAlerts } from './nodes/checkAlerts'
import { routerNode, routerEdge } from './nodes/router'
import { consolidateMemory } from './nodes/consolidateMemory'

import { yieldSubgraph } from './subgraphs/yield'
import { migrationSubgraph } from './subgraphs/migration'
import { alertSubgraph } from './subgraphs/alert'
import { knowledgeSubgraph } from './subgraphs/knowledge'

// ─── formatIntent ──────────────────────────────────────────────────────────
// Final structural step: parses the last AIMessage as StrategyIntent JSON.
// This is what the API route returns to the frontend, so the schema stays
// even though Day 22 will add real interrupt-based approval to migration.
//
// Runs AFTER the chosen subgraph completes and BEFORE consolidateMemory.
// consolidateMemory needs to see the parsed intent so it can extract
// behavioural facts ("user committed to migrating", etc.) — that pairing
// is intentional.

async function formatIntent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const last = state.messages[state.messages.length - 1] as AIMessage
  const content = typeof last?.content === 'string' ? last.content : ''

  try {
    const cleaned = content
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/```\s*$/im, '')
      .trim()
    const parsed = JSON.parse(cleaned) as StrategyIntent
    // approvalStatus may have been set by migrationSubgraph's approvalGate;
    // if so, keep it. Otherwise, set 'pending' for cross_chain_migrate and
    // null for everything else.
    const approvalStatus =
      state.approvalStatus ??
      (parsed.action_data?.type === 'cross_chain_migrate' ? ('pending' as const) : null)
    return { intent: parsed as AIIntent, approvalStatus }
  } catch {
    const fallback: StrategyIntent = {
      action: 'unknown',
      strategy_logic: content || 'I was unable to parse a structured response. Please try again.',
      action_data: {
        type: 'none',
        amount: 0,
        token: 'USDC',
        protocol: 'aave',
        net_apy: 0,
        risk_level: 'low',
      },
      confidence: 'low',
    }
    return { intent: fallback as AIIntent, approvalStatus: null }
  }
}

// ─── Parent graph assembly ─────────────────────────────────────────────────

const workflow = new StateGraph(AgentState)
  // Prep nodes
  .addNode('fetchMarket', fetchMarket)
  .addNode('loadMemory', loadMemory)
  .addNode('checkAlerts', checkAlerts)
  // Router
  .addNode('router', routerNode)
  // Subgraphs (compiled, share parent state via shared channel names)
  .addNode('yield', yieldSubgraph)
  .addNode('migration', migrationSubgraph)
  .addNode('alert', alertSubgraph)
  .addNode('knowledge', knowledgeSubgraph)
  // Intent extraction + memory consolidation
  .addNode('formatIntent', formatIntent)
  .addNode('consolidateMemory', consolidateMemory)

  // Branch A starts at fetchMarket; branch B starts at loadMemory
  .addEdge(START, 'fetchMarket')
  .addEdge(START, 'loadMemory')
  // Branch A: sequential — checkAlerts reuses fetchMarket's vaultContext
  .addEdge('fetchMarket', 'checkAlerts')
  // Both branches converge at router
  .addEdge('checkAlerts', 'router')
  .addEdge('loadMemory', 'router')
  // Router dispatches to a specialist subgraph
  .addConditionalEdges('router', routerEdge, {
    yield: 'yield',
    migration: 'migration',
    alert: 'alert',
    knowledge: 'knowledge',
  })
  // Every subgraph funnels into formatIntent → consolidateMemory → END
  .addEdge('yield', 'formatIntent')
  .addEdge('migration', 'formatIntent')
  .addEdge('alert', 'formatIntent')
  .addEdge('knowledge', 'formatIntent')
  .addEdge('formatIntent', 'consolidateMemory')
  .addEdge('consolidateMemory', END)

// ─── Singleton ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let agentInstance: any = null

async function buildAgent() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')

  const checkpointer = PostgresSaver.fromConnString(connectionString)
  await checkpointer.setup()
  await setupTables()
  const store = await getStore()

  return workflow.compile({ checkpointer, store })
}

export async function getAgent() {
  if (!agentInstance) {
    agentInstance = await buildAgent()
  }
  return agentInstance
}
