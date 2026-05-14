import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store'
import { OpenAIEmbeddings } from '@langchain/openai'

export interface MemoryFact {
  key: string
  value: string
  category: 'preference' | 'behavior' | 'decision'
  confidence: number
  updatedAt: string
}

let storeInstance: PostgresStore | null = null

export async function getStore(): Promise<PostgresStore> {
  if (storeInstance) return storeInstance

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')

  const embed = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_EMBEDDINGS_API_KEY,
    configuration: { baseURL: process.env.OPENAI_EMBEDDINGS_API_BASE_URL },
  })

  storeInstance = PostgresStore.fromConnString(connectionString, {
    index: { embed, dims: 1536 },
  })
  await storeInstance.setup()

  return storeInstance
}
