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

// Creates application tables if they don't exist.
// Called once during agent initialisation alongside PostgresSaver.setup().
export async function setupTables(): Promise<void> {
  const db = getDb()
  await db.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id          TEXT      PRIMARY KEY,
      user_address TEXT     NOT NULL,
      alert_type  TEXT      NOT NULL,
      chain       TEXT      NOT NULL,
      threshold   REAL,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      triggered_at TIMESTAMP,
      active      BOOLEAN   NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      thread_id       TEXT      PRIMARY KEY,
      user_address    TEXT      NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_user
      ON alerts(user_address, active);

    CREATE INDEX IF NOT EXISTS idx_conversations_user
      ON conversations(user_address);
  `)
}

// Verify connection — call once on startup
export async function verifyDbConnection(): Promise<void> {
  const db = getDb()
  const client = await db.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}
