import { Pool } from 'pg'

// Singleton PostgreSQL pool — shared across the agent and alert tools
let pool: Pool | null = null

export function getDb(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    pool = new Pool({ connectionString })
  }
  return pool
}

// Verify connection on startup — call this once during agent initialisation
export async function verifyDbConnection(): Promise<void> {
  const db = getDb()
  const client = await db.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}
