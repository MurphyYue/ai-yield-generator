import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages'
import type { LangGraphRunnableConfig } from '@langchain/langgraph'
import { EXTRACTION_PROMPT } from '../prompts'
import type { MemoryFact } from '../memory'
import type { AgentStateType } from '../state'

// Hot-path memory consolidation. Runs after every subgraph completes, before
// END. Uses a cheap model (gpt-4o-mini) — this is the docs' default pattern:
// memory is extracted in the hot path so it's available on the next turn.
//
// The model returns structured output: an array of facts to upsert and a list
// of keys to retract. Retraction only happens when the user explicitly
// contradicts a prior fact in this turn.
//
// IMPORTANT: this node may write nothing (empty upsert + empty retract_keys)
// when the turn contained no durable signal. That's fine — most turns add
// nothing new. The cost is one extraction call per turn (~$0.001).

const extractionSchema = z.object({
  upsert: z.array(
    z.object({
      key: z.string().describe('Stable identifier, e.g. risk_tolerance, preferred_chain'),
      value: z.string().describe('Concise fact value'),
      category: z.enum(['preference', 'behavior', 'decision']),
    })
  ),
  retract_keys: z.array(z.string()).describe('Keys of existing facts the user explicitly contradicted'),
})

const extractorLlm = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
  apiKey: process.env.OPENAI_EMBEDDINGS_API_KEY,
  configuration: { baseURL: process.env.OPENAI_EMBEDDINGS_API_BASE_URL },
}).withStructuredOutput(extractionSchema, { name: 'memory_update' })

function formatMessages(messages: BaseMessage[]): string {
  return messages
    .map((m) => {
      const role = m._getType?.() ?? 'message'
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      return `[${role}] ${content}`
    })
    .join('\n')
}

export async function consolidateMemory(
  state: AgentStateType,
  config: LangGraphRunnableConfig
): Promise<Partial<AgentStateType>> {
  const store = config.store
  if (!store || !state.userId) return {}

  try {
    const namespace: [string, string] = [state.userId.toLowerCase(), 'profile']

    const existing = await store.search(namespace)
    const existingText =
      existing
        .map((h) => {
          const f = h.value as unknown as MemoryFact
          return f?.key ? `${f.key}: ${f.value}` : ''
        })
        .filter(Boolean)
        .join('\n') || '(none)'

    // Look at the last 4 messages — enough to capture the user's turn plus
    // the agent's reply, but small enough to keep the extraction prompt cheap.
    const tail = state.messages.slice(-4)
    if (tail.length === 0) return {}

    const { upsert, retract_keys } = await extractorLlm.invoke([
      new SystemMessage(EXTRACTION_PROMPT),
      new HumanMessage(
        `Existing facts:\n${existingText}\n\nRecent conversation:\n${formatMessages(tail)}`
      ),
    ])

    for (const fact of upsert) {
      const stored: MemoryFact = {
        key: fact.key,
        value: fact.value,
        category: fact.category,
        confidence: 0.7,
        updatedAt: new Date().toISOString(),
      }
      await store.put(namespace, fact.key, stored as unknown as Record<string, unknown>)
    }

    for (const key of retract_keys) {
      await store.delete(namespace, key)
    }

    return {}
  } catch {
    // Memory writes are best-effort — never let an extraction failure block
    // the user-visible response.
    return {}
  }
}
