import { StateGraph, START, END } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { AgentState, type AgentStateType } from '../state'
import { yieldTools } from '../tools'
import { YIELD_PROMPT } from '../prompts'
import { chatLlm, renderMemoryFacts } from './_shared'

// Yield-strategy specialist subgraph.
// Standard ReAct loop: agent ⇄ tools. Shares the parent graph's `messages`
// channel, so it can be passed directly to addNode in the parent assembly
// without a wrapper function (per the docs' "shared state" pattern).

const llm = chatLlm().bindTools(yieldTools)

async function yieldAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const sys = YIELD_PROMPT.replace('{memoryFacts}', renderMemoryFacts(state.relevantMemories))
  const userContext = state.userId
    ? `\nThe current user's wallet address is ${state.userId}. Use this exact address when calling tools that need it.`
    : ''
  const response = await llm.invoke([
    new SystemMessage(sys + userContext),
    ...state.messages,
  ])
  return { messages: [response] }
}

function shouldContinue(state: AgentStateType): 'tools' | typeof END {
  const last = state.messages[state.messages.length - 1] as AIMessage
  return last.tool_calls && last.tool_calls.length > 0 ? 'tools' : END
}

export const yieldSubgraph = new StateGraph(AgentState)
  .addNode('agent', yieldAgent)
  .addNode('tools', new ToolNode(yieldTools))
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue, ['tools', END])
  .addEdge('tools', 'agent')
  .compile()
