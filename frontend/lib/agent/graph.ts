import { StateGraph, START, END } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { AgentState, AgentStateType } from './state'
import { agentTools } from './tools'
import { SYSTEM_PROMPT } from './prompts'
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

// ReAct agent: LLM decides which tools to call or produces final answer
async function runAgent(state: AgentStateType) {
  const response = await llm.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages,
  ])
  return { messages: [response] }
}

// Parse the final AI text response into a structured AIIntent
// The LLM is instructed to return JSON — extract and validate it here
async function formatIntent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const last = state.messages[state.messages.length - 1] as AIMessage
  const content = typeof last.content === 'string' ? last.content : ''

  try {
    // Strip markdown code fences if present
    const cleaned = content
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/```\s*$/im, '')
      .trim()

    const parsed = JSON.parse(cleaned) as StrategyIntent
    const requiresApproval = parsed.action_data?.type === 'cross_chain_migrate'

    return {
      intent: parsed as AIIntent,
      requiresApproval,
    }
  } catch {
    // Parsing failed — return a safe fallback intent
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

// After agent runs: continue tool loop or move to format response
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
  .addNode('agent', runAgent)
  .addNode('tools', toolNode)
  .addNode('formatIntent', formatIntent)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue, {
    tools: 'tools',
    formatIntent: 'formatIntent',
  })
  .addEdge('tools', 'agent')
  .addEdge('formatIntent', END)

// ─── Singleton ────────────────────────────────────────────────────────────────

// Keep one compiled agent per process — avoid re-initialising checkpointer on every request
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let agentInstance: any = null

async function buildAgent() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')

  const checkpointer = PostgresSaver.fromConnString(connectionString)
  // Creates LangGraph's internal checkpoint tables if they don't exist
  await checkpointer.setup()

  return workflow.compile({ checkpointer })
}

export async function getAgent() {
  if (!agentInstance) {
    agentInstance = await buildAgent()
  }
  return agentInstance
}
