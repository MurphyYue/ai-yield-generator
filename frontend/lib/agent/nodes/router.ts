import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage } from '@langchain/core/messages'
import { ROUTER_PROMPT } from '../prompts'
import type { AgentStateType } from '../state'

// Convergence node: classifies the user's request into one of four
// specialist subgraphs using structured output. Runs after both prep
// branches complete (fetchMarket → checkAlerts and loadMemory).
//
// Why structured output: an enum'd Zod schema guarantees the LLM cannot
// return free text — the router either picks a valid route or the call
// fails. This is the docs' workflow-routing pattern, applied to choose
// between specialists rather than between fixed prompts.

const routeSchema = z.object({
  route: z
    .enum(['yield', 'migration', 'alert', 'knowledge'])
    .describe('Which specialist handles this request'),
  reasoning: z.string().describe('One-sentence justification'),
})

const routerLlm = new ChatOpenAI({
  model: process.env.OPENAI_API_MODEL || 'gpt-5.2',
  temperature: 0,
  apiKey: process.env.OPENAI_EMBEDDINGS_API_KEY,
  configuration: { baseURL: process.env.OPENAI_EMBEDDINGS_API_BASE_URL },
}).withStructuredOutput(routeSchema, { name: 'route' })

export async function routerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const { route } = await routerLlm.invoke([
    new SystemMessage(ROUTER_PROMPT),
    ...state.messages,
  ])
  return { route }
}

// Conditional edge resolver — reads the channel the routerNode just wrote.
// LangGraph calls this after routerNode completes, then dispatches to the
// matching subgraph node.
export function routerEdge(state: AgentStateType): 'yield' | 'migration' | 'alert' | 'knowledge' {
  return state.route
}
