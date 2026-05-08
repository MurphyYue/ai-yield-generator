// TEMPORARY — delete after Day 17 verification is complete
import { NextResponse } from 'next/server'
import { HumanMessage } from '@langchain/core/messages'
import { getAgent } from '@/lib/agent/graph'
import { getDb } from '@/lib/agent/db'

export async function GET() {
  try {
    // Test 1: agent initialises (PostgresSaver + setupTables)
    const agent = await getAgent()

    // Test 2: verify tables exist in PostgreSQL
    const db = getDb()
    const tablesResult = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    const tables = tablesResult.rows.map((r: { table_name: string }) => r.table_name)

    // Test 3: agent runs with a strategy question
    const result = await agent.invoke(
      {
        messages: [new HumanMessage('What is the current Aave USDC yield on Base?')],
        userId: '0xtest',
      },
      { configurable: { thread_id: 'test-17', user_id: '0xtest' } }
    )

    // Test 4: set a test alert and read it back
    await db.query(
      `INSERT INTO alerts (id, user_address, alert_type, chain, threshold)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      ['test-alert-001', '0xtest', 'apy_threshold', 'base', 3.0]
    )
    const alertResult = await db.query(
      `SELECT * FROM alerts WHERE id = 'test-alert-001'`
    )

    return NextResponse.json({
      status: 'ok',
      checks: {
        agentInitialised: true,
        tables,
        hasAlertsTable: tables.includes('alerts'),
        hasConversationsTable: tables.includes('conversations'),
        alertPersisted: alertResult.rows.length === 1,
        intentParsed: result.intent !== null,
      },
      intent: result.intent,
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
