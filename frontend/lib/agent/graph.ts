import { StateGraph, START, END } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { AgentState, AgentStateType } from './state'
import { agentTools } from './tools'
import { SYSTEM_PROMPT } from './prompts'
import { setupTables } from './db'
import type { AIIntent, StrategyIntent } from '@/lib/ai-intent'

// ─── LLM ──────────────────────────────────────────────────────────────────────

const llm = new ChatOpenAI({
  model: process.env.OPENAI_API_MODEL || 'gpt-5.2',
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_API_BASE_URL,
  },
}).bindTools(agentTools)

// ─── Nodes ────────────────────────────────────────────────────────────────────

// checkAlerts: runs first on every conversation turn.
// Fetches live APY and checks stored alerts before the user's question is answered.
// If alerts are triggered, injects a warning message so the agent surfaces it.
async function checkAlerts(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (!state.userId) return {}

  try {
    // Fetch current APY from vault-context to evaluate alert thresholds
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resp = await fetch(`${appUrl}/api/vault-context`)
    if (!resp.ok) return {}

    const json = await resp.json()
    if (!json.success) return {}

    const baseApy: number = json.data.base.supplyApy
    const arbitrumApy: number = json.data.arbitrum.supplyApy

    // Store vaultContext in state so agent node can reuse it without a second fetch
    const vaultContext = json.data

    // Check alerts via DB directly (not as a tool call — this runs before the LLM)
    const { getDb } = await import('./db')
    const db = getDb()
    // Only consider alerts that are armed (active) and have not fired yet (triggered_at IS NULL).
    // Once fired, alerts are auto-consumed so the user is not warned twice for the same breach.
    const result = await db.query(
      `SELECT * FROM alerts WHERE user_address = $1 AND active = TRUE AND triggered_at IS NULL`,
      [state.userId.toLowerCase()]
    )

    const triggered = result.rows.filter((alert) => {
      if (alert.alert_type === 'apy_threshold') {
        const current = alert.chain === 'base' ? baseApy : arbitrumApy
        return current < alert.threshold
      }
      return false
    })

    if (triggered.length === 0) {
      return { vaultContext }
    }

    // Mark fired alerts as consumed so we don't re-warn on subsequent turns.
    await db.query(
      `UPDATE alerts SET triggered_at = NOW(), active = FALSE WHERE id = ANY($1::text[])`,
      [triggered.map((a) => a.id)]
    )

    // Inject alert warnings as a system message so the agent surfaces them first
    const warnings = triggered
      .map((a) => `⚠️ ALERT TRIGGERED: ${a.chain} APY (${a.chain === 'base' ? baseApy.toFixed(2) : arbitrumApy.toFixed(2)}%) dropped below your ${a.threshold}% threshold.`)
      .join('\n')

    const alertMessage = new HumanMessage(`[SYSTEM ALERT]\n${warnings}`)

    return {
      vaultContext,
      alerts: triggered,
      messages: [alertMessage],
    }
  } catch {
    return {}
  }
}

// runAgent: LLM decides which tools to call or produces final answer
async function runAgent(state: AgentStateType) {
  const userContext = state.userId
    ? `\n\n## User Context\nThe current user's wallet address is: ${state.userId}\nWhen calling tools that need a wallet address (get_user_positions, get_user_history, set_alert, get_alerts), use this exact address.`
    : ''

  const response = await llm.invoke([
    new SystemMessage(SYSTEM_PROMPT + userContext),
    ...state.messages,
  ])
  return { messages: [response] }
}

// formatIntent: parses the LLM's final JSON output into a typed AIIntent
async function formatIntent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const last = state.messages[state.messages.length - 1] as AIMessage
  const content = typeof last.content === 'string' ? last.content : ''

  try {
    const cleaned = content
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/```\s*$/im, '')
      .trim()

    const parsed = JSON.parse(cleaned) as StrategyIntent
    const requiresApproval = parsed.action_data?.type === 'cross_chain_migrate'

    return { intent: parsed as AIIntent, requiresApproval }
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
    return { intent: fallback as AIIntent, requiresApproval: false }
  }
}

// ─── Routing ──────────────────────────────────────────────────────────────────

function shouldContinue(state: AgentStateType): string {
  const last = state.messages[state.messages.length - 1] as AIMessage
  if (last.tool_calls && last.tool_calls.length > 0) {
    return 'tools'
  }
  return 'formatIntent'
}

// ─── Graph ────────────────────────────────────────────────────────────────────

const toolNode = new ToolNode(agentTools)

const workflow = new StateGraph(AgentState)
  .addNode('checkAlerts', checkAlerts)
  .addNode('agent', runAgent)
  .addNode('tools', toolNode)
  .addNode('formatIntent', formatIntent)
  .addEdge(START, 'checkAlerts')       // always check alerts first
  .addEdge('checkAlerts', 'agent')
  .addConditionalEdges('agent', shouldContinue, {
    tools: 'tools',
    formatIntent: 'formatIntent',
  })
  .addEdge('tools', 'agent')
  .addEdge('formatIntent', END)

// ─── Singleton ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let agentInstance: any = null

async function buildAgent() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')

  const checkpointer = PostgresSaver.fromConnString(connectionString)
  await checkpointer.setup()   // creates LangGraph checkpoint tables
  await setupTables()          // creates alerts + conversations tables

  return workflow.compile({ checkpointer })
}

export async function getAgent() {
  if (!agentInstance) {
    agentInstance = await buildAgent()
  }
  return agentInstance
}
