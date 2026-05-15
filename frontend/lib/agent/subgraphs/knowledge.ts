import { StateGraph, START, END } from '@langchain/langgraph'
import { SystemMessage } from '@langchain/core/messages'
import { AgentState, type AgentStateType } from '../state'
import { KNOWLEDGE_PROMPT } from '../prompts'
import { chatLlm, renderMemoryFacts } from './_shared'

// Knowledge-only specialist subgraph.
// Fast path — single LLM call, no tools, no loop. Useful for "what is USDC?"
// or "how does Aave work?" — anything informational. Memory injection still
// runs so the agent can reference the user's prior preferences when relevant.

const llm = chatLlm()

async function knowledgeAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const sys = KNOWLEDGE_PROMPT.replace('{memoryFacts}', renderMemoryFacts(state.relevantMemories))
  const response = await llm.invoke([new SystemMessage(sys), ...state.messages])
  return { messages: [response] }
}

export const knowledgeSubgraph = new StateGraph(AgentState)
  .addNode('agent', knowledgeAgent)
  .addEdge(START, 'agent')
  .addEdge('agent', END)
  .compile()
