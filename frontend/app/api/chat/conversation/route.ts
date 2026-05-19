import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedAddress } from '@/lib/auth'
import { getDb } from '@/lib/agent/db'

// Returns the active thread_id for the authenticated wallet if created within
// the last 24 hours, or null if none / session window expired.
export async function GET(req: NextRequest) {
  let userAddress: string
  try {
    userAddress = await requireAuthenticatedAddress(req)
  } catch (resp) {
    return resp as Response
  }

  const result = await getDb().query(
    `SELECT thread_id FROM conversations
       WHERE user_address = $1
         AND last_message_at > NOW() - INTERVAL '24 hours'
       ORDER BY last_message_at DESC
       LIMIT 1`,
    [userAddress.toLowerCase()]
  )

  return NextResponse.json({ thread_id: result.rows[0]?.thread_id ?? null })
}

// Upserts the active thread for this wallet.
// Called by the client whenever a new thread_id is assigned.
export async function POST(req: NextRequest) {
  let userAddress: string
  try {
    userAddress = await requireAuthenticatedAddress(req)
  } catch (resp) {
    return resp as Response
  }

  const { thread_id } = await req.json()
  if (!thread_id) {
    return NextResponse.json({ error: 'thread_id required' }, { status: 400 })
  }

  await getDb().query(
    `INSERT INTO conversations (thread_id, user_address, last_message_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (thread_id) DO UPDATE SET last_message_at = NOW()`,
    [thread_id, userAddress.toLowerCase()]
  )

  return NextResponse.json({ success: true })
}
