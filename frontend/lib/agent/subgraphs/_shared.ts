// Shared utilities used by the four specialist subgraphs.

import { ChatOpenAI } from '@langchain/openai'
import type { MemoryFact } from '../memory'

// Build a ChatOpenAI client configured for chat completions (NOT embeddings).
// Centralised here so every subgraph reads the same env vars and applies the
// same defaults (temperature 0 for deterministic structured output).
export function chatLlm() {
  return new ChatOpenAI({
    model: process.env.OPENAI_API_MODEL || 'gpt-5.2',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: { baseURL: process.env.OPENAI_API_BASE_URL },
  })
}

// Render the user's relevantMemories as a bullet list to inject into a
// subgraph's system prompt via the `{memoryFacts}` placeholder.
export function renderMemoryFacts(facts: MemoryFact[]): string {
  if (!facts.length) return 'No prior history yet for this user.'
  return facts.map((f) => `- ${f.key}: ${f.value}`).join('\n')
}
