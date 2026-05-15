import { StateGraph, START, END } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { AgentState, type AgentStateType } from '../state'
import { alertTools } from '../tools'
import { ALERT_PROMPT } from '../prompts'
import { chatLlm, renderMemoryFacts } from './_shared'

// Alert manager specialist subgraph.
// ReAct loop with only set_alert + get_alerts in the toolset. Smaller tool
// surface keeps the LLM focused on alert intents.

const llm = chatLlm().bindTools(alertTools)

async function alertAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const sys = ALERT_PROMPT.replace('{memoryFacts}', renderMemoryFacts(state.relevantMemories))
  const userContext = state.userId
    ? `\nThe current user's wallet address is ${state.userId}. Use this exact address when calling tools.`
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

export const alertSubgraph = new StateGraph(AgentState)
  .addNode('agent', alertAgent)
  .addNode('tools', new ToolNode(alertTools))
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue, ['tools', END])
  .addEdge('tools', 'agent')
  .compile()
