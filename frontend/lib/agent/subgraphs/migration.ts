import { StateGraph, START, END, interrupt } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { AgentState, type AgentStateType } from '../state'
import { migrationTools } from '../tools'
import { MIGRATION_PROMPT } from '../prompts'
import { chatLlm, renderMemoryFacts } from './_shared'

const llm = chatLlm().bindTools(migrationTools)

async function migrationAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const sys = MIGRATION_PROMPT.replace('{memoryFacts}', renderMemoryFacts(state.relevantMemories))
  const userContext = state.userId
    ? `\nThe current user's wallet address is ${state.userId}. Use this exact address when calling tools that need it.`
    : ''
  const response = await llm.invoke([
    new SystemMessage(sys + userContext),
    ...state.messages,
  ])
  return { messages: [response] }
}

function afterAgent(state: AgentStateType): 'tools' | 'approvalGate' {
  const last = state.messages[state.messages.length - 1] as AIMessage
  return last.tool_calls && last.tool_calls.length > 0 ? 'tools' : 'approvalGate'
}

// Genuine HITL gate for cross-chain migration.
// interrupt() checkpoints the graph and pauses until the client POSTs
// Command({ resume: true|false }) to /api/chat/resume.
// For non-migration intents this node is a no-op pass-through.
async function approvalGate(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const last = state.messages[state.messages.length - 1] as AIMessage
  const content = typeof last.content === 'string' ? last.content : ''
  if (!/cross_chain_migrate/i.test(content)) return {}

  // Parse action_data out of the pending intent JSON for the modal payload.
  // formatIntent runs after us in the parent graph, so we do a lightweight
  // extract here — only what the risk modal needs.
  let actionData: Record<string, unknown> = {}
  try {
    const cleaned = content
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/```\s*$/im, '')
      .trim()
    const parsed = JSON.parse(cleaned)
    actionData = parsed.action_data ?? {}
  } catch {
    // best-effort; modal degrades gracefully with empty details
  }

  // Graph pauses here. The resume value is the boolean the client sends back.
  const decision = interrupt({
    question: 'Approve cross-chain migration?',
    details: actionData,
  }) as boolean

  return {
    approvalStatus: decision ? ('approved' as const) : ('rejected' as const),
  }
}

export const migrationSubgraph = new StateGraph(AgentState)
  .addNode('agent', migrationAgent)
  .addNode('tools', new ToolNode(migrationTools))
  .addNode('approvalGate', approvalGate)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', afterAgent, ['tools', 'approvalGate'])
  .addEdge('tools', 'agent')
  .addEdge('approvalGate', END)
  .compile()
