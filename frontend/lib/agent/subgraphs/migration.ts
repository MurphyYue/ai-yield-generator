import { StateGraph, START, END } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { AgentState, type AgentStateType } from '../state'
import { migrationTools } from '../tools'
import { MIGRATION_PROMPT } from '../prompts'
import { chatLlm, renderMemoryFacts } from './_shared'

// Cross-chain migration specialist subgraph.
// ReAct loop ending in approvalGate. The gate runs only when the LLM has
// produced a final answer with a cross_chain_migrate intent — otherwise it
// is a no-op pass-through.
//
// Day 21 STUB: approvalGate sets approvalStatus: 'pending' and returns.
// Day 22 will replace this body with `interrupt()` that genuinely pauses
// the graph, surfaces the action_data to the client, and resumes via
// Command({ resume: boolean }) into approved/rejected.

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

// Day 21 stub — flags pending without truly pausing. Day 22 replaces this
// function body with an `interrupt({ question, details })` call.
async function approvalGate(state: AgentStateType): Promise<Partial<AgentStateType>> {
  // The actual intent JSON is parsed downstream by formatIntent; for now we
  // only flag pending approval if the agent's final message looks like a
  // migration intent. The stricter parse happens in the parent graph's
  // formatIntent (or in Day 22 by reading state.intent).
  const last = state.messages[state.messages.length - 1] as AIMessage
  const content = typeof last.content === 'string' ? last.content : ''
  const looksLikeMigration = /cross_chain_migrate/i.test(content)
  return looksLikeMigration ? { approvalStatus: 'pending' as const } : {}
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
